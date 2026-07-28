import { useEffect, useRef, useState } from 'react'
import addNotification from 'react-push-notification'
import { tickets as ticketsApi } from '../api'
import { ApiError } from '../api'
import type { Ticket } from '../types'
import { useToasts } from '../store'
import { registerRealtime } from '../realtime'
import { PageHeader } from '../core/components/layout/PageHeader'

const PAGE = 50

const statusColor: Record<string, string> = {
  aberto: 'bg-amber-100 text-amber-700',
  enviado_taky: 'bg-brand-100 text-brand-700',
  fechado: 'bg-slate-100 text-slate-500',
}

const statusList = ['aberto', 'andamento', 'fechado']

export default function Tickets() {
  const [list, setList] = useState<Ticket[]>([])
  const [busy, setBusy] = useState<number | null>(null)
  const [skip, setSkip] = useState(0)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const { push } = useToasts()
  const knownIds = useRef<Set<number> | null>(null)

  const currentIds = list.map((t) => t.id)
  const allSelected = currentIds.length > 0 && currentIds.every((id) => selected.has(id))

  const load = async (s: number) => {
    try {
      const data = await ticketsApi.list(s, PAGE)
      setList(data.items)
      setTotal(data.total)
      setSelected(new Set())
      const ids = new Set(data.items.map((t) => t.id))
      if (knownIds.current === null) {
        knownIds.current = ids
      } else {
        for (const t of data.items) {
          if (!knownIds.current.has(t.id)) {
            addNotification({
              title: `Novo chamado #${t.id}`,
              message: t.titulo,
              native: true,
            })
            push('info', `Novo chamado #${t.id}: ${t.titulo}`)
          }
        }
        knownIds.current = ids
      }
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao carregar chamados')
    }
  }

  useEffect(() => {
    load(skip)
    return registerRealtime('tickets', () => load(skip))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip])

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(currentIds))
    }
  }

  const batchStatus = async (status: string) => {
    const ids = [...selected]
    if (!ids.length) return
    setBatchBusy(true)
    try {
      await ticketsApi.batchStatus(ids, status)
      push('success', `${ids.length} chamados alterados para "${status}"`)
      await load(skip)
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao alterar status')
    } finally {
      setBatchBusy(false)
    }
  }

  const batchDelete = async () => {
    const ids = [...selected]
    if (!ids.length || !confirm(`Excluir ${ids.length} chamados?`)) return
    setBatchBusy(true)
    try {
      await ticketsApi.batchDelete(ids)
      push('success', `${ids.length} chamados excluídos`)
      await load(skip)
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao excluir')
    } finally {
      setBatchBusy(false)
    }
  }

  const sendToTaky = async (id: number) => {
    setBusy(id)
    try {
      await ticketsApi.push(id)
      await load(skip)
      push('success', 'Chamado enviado')
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao enviar chamado')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <PageHeader title="Chamados" description="Acompanhe tickets, suporte e solicitações." />

      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-brand-50 rounded-xl dark:bg-brand-700/20">
          <span className="text-sm font-medium text-ink">{selected.size} selecionados</span>
          <select
            onChange={(e) => { const v = e.target.value; if (v) batchStatus(v) }}
            disabled={batchBusy}
            value=""
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Alterar status...</option>
            {statusList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={batchDelete}
            disabled={batchBusy}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="w-10 px-2 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="text-left font-medium px-4 py-3">#</th>
              <th className="text-left font-medium px-4 py-3">Título</th>
              <th className="text-left font-medium px-4 py-3">Tipo</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-right font-medium px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Nenhum chamado.
                </td>
              </tr>
            )}
            {list.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="w-10 px-2 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggleOne(t.id)}
                    className="rounded border-slate-300"
                  />
                </td>
                <td className="px-4 py-3 text-muted">{t.id}</td>
                <td className="px-4 py-3 text-ink">
                  <div className="font-medium">{t.titulo}</div>
                  <div className="text-xs text-muted line-clamp-1">{t.descricao}</div>
                </td>
                <td className="px-4 py-3 text-muted">{t.tipo}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[t.status] || 'bg-slate-100 text-slate-500'}`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {t.taky_task_id ? (
                    <span className="text-xs text-brand-700">No Taky #{t.taky_task_id}</span>
                  ) : (
                    <button
                      onClick={() => sendToTaky(t.id)}
                      disabled={busy === t.id}
                      className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium disabled:opacity-50"
                    >
                      {busy === t.id ? '...' : 'Enviar ao Taky'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          disabled={skip === 0}
          onClick={() => setSkip(Math.max(0, skip - PAGE))}
          className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-surface text-sm dark:border-slate-600 dark:hover:bg-slate-700"
        >
          Anterior
        </button>
        <span className="text-xs text-muted">{total} no total</span>
        <button
          disabled={skip + PAGE >= total}
          onClick={() => setSkip(skip + PAGE)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-surface text-sm dark:border-slate-600 dark:hover:bg-slate-700"
        >
          Próxima
        </button>
      </div>
    </div>
  )
}
