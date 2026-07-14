import { useEffect, useRef, useState } from 'react'
import { clients as clientsApi } from '../api'
import { ApiError } from '../api'
import type { Client } from '../types'
import { useToasts } from '../store'

const PAGE = 50

const tipoLabel: Record<string, string> = { empresa: 'Empresa', pessoa: 'Pessoa' }

function tipoTxt(v?: string | null) {
  if (!v) return '—'
  return tipoLabel[v] || v
}

export default function Clients() {
  const [list, setList] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busyExport, setBusyExport] = useState(false)
  const [skip, setSkip] = useState(0)
  const { push } = useToasts()
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = async (s: number, term: string) => {
    setLoading(true)
    try {
      const data = await clientsApi.search(term, s, PAGE)
      setList(data.items)
      setTotal(data.total)
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(0, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSearchChange = (value: string) => {
    setSearch(value)
    setSkip(0)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      load(0, value)
    }, 300)
  }

  const exportCsv = async () => {
    setBusyExport(true)
    try {
      await clientsApi.export(search)
      push('success', 'Exportação iniciada')
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao exportar CSV')
    } finally {
      setBusyExport(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-lg font-semibold text-ink">Clientes</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
          />
          <button
            onClick={exportCsv}
            disabled={busyExport}
            className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {busyExport ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="text-left font-medium px-4 py-3">#</th>
              <th className="text-left font-medium px-4 py-3">Nome</th>
              <th className="text-left font-medium px-4 py-3">Telefone</th>
              <th className="text-left font-medium px-4 py-3">Estado</th>
              <th className="text-left font-medium px-4 py-3">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-slate-300 border-t-brand-600 animate-spin align-middle mr-2" />
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {!loading &&
              list.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="px-4 py-3 text-muted">{c.id}</td>
                  <td className="px-4 py-3 text-ink font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted">{c.phone}</td>
                  <td className="px-4 py-3 text-muted">{c.estado}</td>
                  <td className="px-4 py-3 text-muted">
                    {tipoTxt(c.tipo) !== '—' ? (
                      <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-700/30 dark:text-violet-300">
                        {tipoTxt(c.tipo)}
                      </span>
                    ) : (
                      '—'
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
          onClick={() => {
            const s = Math.max(0, skip - PAGE)
            setSkip(s)
            load(s, search)
          }}
          className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-surface text-sm dark:border-slate-600 dark:hover:bg-slate-700"
        >
          Anterior
        </button>
        <span className="text-xs text-muted">{total} no total</span>
        <button
          disabled={skip + PAGE >= total}
          onClick={() => {
            const s = skip + PAGE
            setSkip(s)
            load(s, search)
          }}
          className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-surface text-sm dark:border-slate-600 dark:hover:bg-slate-700"
        >
          Próxima
        </button>
      </div>
    </div>
  )
}
