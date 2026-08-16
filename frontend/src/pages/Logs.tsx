import { useEffect, useState, Fragment } from 'react'
import { logsApi } from '../api'
import { ApiError } from '../api'
import { useToasts } from '../store'
import { PageHeader } from '../core/components/layout/PageHeader'

interface LogItem {
  id: number
  level: string
  action: string
  entity: string | null
  entity_id: string | null
  user_id: number | null
  details: Record<string, unknown> | null
  created_at: string | null
}

const levelColor: Record<string, string> = {
  info: 'bg-brand-100 text-brand-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
}

const LEVELS = ['', 'info', 'warning', 'error']

export default function Logs() {
  const [items, setItems] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [level, setLevel] = useState('')
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [expanded, setExpanded] = useState<number | null>(null)
  const { push } = useToasts()

  const LIMIT = 50

  const load = async (nextOffset = 0, replace = true) => {
    setLoading(true)
    try {
      const data = await logsApi.list({ level: level || undefined, search: search || undefined, limit: LIMIT, offset: nextOffset })
      setTotal(data.total)
      setItems((prev) => (replace ? (data.items as LogItem[]) : [...prev, ...(data.items as LogItem[])]))
      setOffset(nextOffset)
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao carregar logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyFilters = () => load(0)
  const clearFilters = () => { setLevel(''); setSearch(''); setTimeout(() => load(0), 0) }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <PageHeader title="Logs" description="Auditoria de ações de usuários e erros do sistema." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l ? l : 'Todos os níveis'}</option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          placeholder="Buscar por ação ou entidade..."
          className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        />
        <button
          onClick={applyFilters}
          className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
        >
          Filtrar
        </button>
        <button
          onClick={clearFilters}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm dark:border-slate-600 dark:hover:bg-slate-700"
        >
          Limpar
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="text-left font-medium px-4 py-3">Nível</th>
              <th className="text-left font-medium px-4 py-3">Ação</th>
              <th className="text-left font-medium px-4 py-3">Entidade</th>
              <th className="text-left font-medium px-4 py-3">Usuário</th>
              <th className="text-left font-medium px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">Nenhum log encontrado.</td>
              </tr>
            )}
            {items.map((l) => (
              <Fragment key={l.id}>
                <tr className="border-t border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-surface dark:hover:bg-slate-700/40" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${levelColor[l.level] || 'bg-slate-100 text-slate-500'}`}>{l.level}</span>
                  </td>
                  <td className="px-4 py-3 text-ink dark:text-slate-100 font-medium">{l.action}</td>
                  <td className="px-4 py-3 text-muted">{l.entity}{l.entity_id ? ` #${l.entity_id}` : ''}</td>
                  <td className="px-4 py-3 text-muted">{l.user_id ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '—'}</td>
                </tr>
                {expanded === l.id && l.details && (
                  <tr className="border-t border-slate-100 dark:border-slate-700 bg-surface/50">
                    <td colSpan={5} className="px-4 py-3">
                      <pre className="text-xs text-muted whitespace-pre-wrap break-all">{JSON.stringify(l.details, null, 2)}</pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted">{total} registros</span>
        {items.length < total && (
          <button
            onClick={() => load(offset + LIMIT, false)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm disabled:opacity-40 hover:bg-surface dark:border-slate-600 dark:hover:bg-slate-700"
          >
            {loading ? 'Carregando...' : 'Carregar mais'}
          </button>
        )}
      </div>
    </div>
  )
}
