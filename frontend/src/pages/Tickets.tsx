import { useEffect, useState } from 'react'
import { tickets as ticketsApi } from '../api'
import { ApiError } from '../api'
import type { Ticket } from '../types'
import { useToasts } from '../store'

const PAGE = 50

const statusColor: Record<string, string> = {
  aberto: 'bg-amber-100 text-amber-700',
  enviado_taky: 'bg-brand-100 text-brand-700',
  fechado: 'bg-slate-100 text-slate-500',
}

export default function Tickets() {
  const [list, setList] = useState<Ticket[]>([])
  const [busy, setBusy] = useState<number | null>(null)
  const [skip, setSkip] = useState(0)
  const [total, setTotal] = useState(0)
  const { push } = useToasts()

  const load = async (s: number) => {
    try {
      const data = await ticketsApi.list(s, PAGE)
      setList(data.items)
      setTotal(data.total)
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao carregar chamados')
    }
  }

  useEffect(() => {
    load(skip)
    const t = setInterval(() => load(skip), 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip])

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
      <h1 className="text-lg font-semibold text-ink mb-4">Chamados</h1>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
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
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Nenhum chamado.
                </td>
              </tr>
            )}
            {list.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 dark:border-slate-700">
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
