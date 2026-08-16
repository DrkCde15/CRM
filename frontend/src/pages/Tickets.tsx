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

const prioridadeColor: Record<string, string> = {
  alta: 'bg-red-100 text-red-700',
  media: 'bg-amber-100 text-amber-700',
  baixa: 'bg-emerald-100 text-emerald-700',
}

const sentimentoColor: Record<string, string> = {
  positivo: 'bg-emerald-100 text-emerald-700',
  neutro: 'bg-slate-100 text-slate-500',
  negativo: 'bg-red-100 text-red-700',
}

const statusList = ['aberto', 'andamento', 'fechado']

export default function Tickets() {
  const [list, setList] = useState<Ticket[]>([])
  const [busy, setBusy] = useState<number | null>(null)
  const [skip, setSkip] = useState(0)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const [detail, setDetail] = useState<Ticket | null>(null)
  const [reply, setReply] = useState('')
  const [alternatives, setAlternatives] = useState<string[]>([])
  const [replyLoading, setReplyLoading] = useState(false)
  const [classifLoading, setClassifLoading] = useState(false)
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

  const openDetail = (t: Ticket) => {
    setDetail(t)
    setReply('')
    setAlternatives([])
  }

  const closeDetail = () => setDetail(null)

  const gerarResposta = async () => {
    if (!detail) return
    setReplyLoading(true)
    try {
      const r = await ticketsApi.suggestReply(detail.id)
      setReply(r.reply)
      setAlternatives(r.alternatives || [])
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao gerar resposta')
    } finally {
      setReplyLoading(false)
    }
  }

  const classificar = async () => {
    if (!detail) return
    setClassifLoading(true)
    try {
      const r = await ticketsApi.classify(detail.id)
      const updated: Ticket = { ...detail, categoria: r.categoria, prioridade: r.prioridade, sentimento: r.sentimento, resumo: r.resumo }
      setDetail(updated)
      setList((prev) => prev.map((t) => (t.id === detail.id ? updated : t)))
      push('success', 'Ticket classificado')
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao classificar')
    } finally {
      setClassifLoading(false)
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
                  <button
                    onClick={() => openDetail(t)}
                    className="text-left font-medium hover:text-brand-600 hover:underline"
                  >
                    {t.titulo}
                  </button>
                  <div className="text-xs text-muted line-clamp-1">{t.descricao}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.categoria && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-100 text-brand-700">
                        {t.categoria}
                      </span>
                    )}
                    {t.prioridade && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${prioridadeColor[t.prioridade] || 'bg-slate-100 text-slate-500'}`}>
                        {t.prioridade}
                      </span>
                    )}
                  </div>
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

      {detail && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={closeDetail} />
          <div className="w-[520px] max-w-[94vw] h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-ink dark:text-slate-100">Chamado #{detail.id}</h2>
                <p className="text-sm text-muted">{detail.titulo}</p>
                <div className="mt-1 flex gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[detail.status] || 'bg-slate-100 text-slate-500'}`}>{detail.status}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">{detail.tipo}</span>
                </div>
              </div>
              <button onClick={closeDetail} className="p-1.5 rounded-lg text-muted hover:bg-surface dark:hover:bg-slate-700">✕</button>
            </div>

            <section className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Classificação (IA)</h3>
                <button
                  onClick={classificar}
                  disabled={classifLoading}
                  className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium disabled:opacity-50"
                >
                  {classifLoading ? 'Classificando...' : 'Classificar com IA'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs text-muted">Categoria:</span>
                {detail.categoria ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">{detail.categoria}</span>
                ) : <span className="text-xs text-muted">—</span>}
                <span className="text-xs text-muted ml-2">Prioridade:</span>
                {detail.prioridade ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prioridadeColor[detail.prioridade] || 'bg-slate-100 text-slate-500'}`}>{detail.prioridade}</span>
                ) : <span className="text-xs text-muted">—</span>}
                <span className="text-xs text-muted ml-2">Sentimento:</span>
                {detail.sentimento ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sentimentoColor[detail.sentimento] || 'bg-slate-100 text-slate-500'}`}>{detail.sentimento}</span>
                ) : <span className="text-xs text-muted">—</span>}
              </div>
              {detail.resumo && (
                <p className="text-xs text-muted bg-surface dark:bg-slate-700/40 rounded-lg p-2">Resumo: {detail.resumo}</p>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-ink dark:text-slate-100">Resposta</h3>
                <button
                  onClick={gerarResposta}
                  disabled={replyLoading}
                  className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium disabled:opacity-50"
                >
                  {replyLoading ? 'Gerando...' : 'Gerar resposta (IA)'}
                </button>
              </div>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={6}
                placeholder="Escreva ou gere uma resposta com IA..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              />
              {alternatives.length > 0 && (
                <div className="mt-2 space-y-1">
                  <span className="text-xs text-muted">Alternativas:</span>
                  {alternatives.map((alt, i) => (
                    <button
                      key={i}
                      onClick={() => setReply(alt)}
                      className="block w-full text-left text-xs px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-surface dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-200"
                    >
                      {alt}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
