import { useEffect, useRef, useState } from 'react'
import { clients as clientsApi, ApiError } from '../api'
import type { Client } from '../types'
import { useToasts } from '../store'
import { PageHeader } from '../core/components/layout/PageHeader'

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
  const [exportFormat, setExportFormat] = useState('csv')
  const [skip, setSkip] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
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

  const currentIds = list.map((c) => c.id)
  const allSelected = currentIds.length > 0 && currentIds.every((id) => selected.has(id))

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

  const batchDelete = async () => {
    const ids = [...selected]
    if (!ids.length || !confirm(`Excluir ${ids.length} clientes?`)) return
    setBatchBusy(true)
    try {
      await clientsApi.batchDelete(ids)
      push('success', `${ids.length} clientes excluídos`)
      setSelected(new Set())
      await load(skip, search)
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao excluir')
    } finally {
      setBatchBusy(false)
    }
  }

  const exportData = async () => {
    setBusyExport(true)
    try {
      await clientsApi.export(search, exportFormat)
      push('success', `Exportação concluída (${exportFormat.toUpperCase()})`)
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : `Erro ao exportar ${exportFormat.toUpperCase()}`)
    } finally {
      setBusyExport(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <PageHeader
        title="Clientes"
        description="Gerencie sua base de clientes, histórico e informações."
        actions={
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="w-48 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            />
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xlsx">XLSX</option>
            </select>
            <button
              onClick={exportData}
              disabled={busyExport}
              className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {busyExport ? 'Exportando...' : 'Exportar'}
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-ink hover:bg-surface dark:border-slate-600 dark:text-slate-100"
            >
              Importar
            </button>
          </div>
        }
      />

      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-brand-50 rounded-xl dark:bg-brand-700/20">
          <span className="text-sm font-medium text-ink">{selected.size} selecionados</span>
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
              <th className="text-left font-medium px-4 py-3">Nome</th>
              <th className="text-left font-medium px-4 py-3">Telefone</th>
              <th className="text-left font-medium px-4 py-3">Estado</th>
              <th className="text-left font-medium px-4 py-3">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-slate-300 border-t-brand-600 animate-spin align-middle mr-2" />
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {!loading &&
              list.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="w-10 px-2 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
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

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={(imported) => {
            push('success', `${imported} cliente(s) importado(s)`)
            setShowImport(false)
            load(0, '')
            setSkip(0)
          }}
        />
      )}
    </div>
  )
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: (n: number) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: { linha: number; erro: string }[] } | null>(null)

  const handle = async () => {
    if (!file) return
    setBusy(true)
    try {
      const res = await clientsApi.import(file)
      setResult(res)
      if (!res.errors?.length) onDone(res.imported)
    } catch (e) {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={onClose}>
      <div
        className="w-[480px] max-w-[92vw] bg-white rounded-2xl shadow-xl p-5 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink mb-1">Importar clientes</h2>
        <p className="text-xs text-muted mb-4">
          Formatos aceitos: <strong>CSV</strong> ou <strong>XLSX</strong>. As colunas são
          mapeadas automaticamente (nome, telefone, tipo, cidade, estado, etc).
        </p>

        {!result ? (
          <>
            <label className="block mb-4">
              <div className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center text-sm text-muted cursor-pointer hover:border-brand-400 transition">
                {file ? (
                  <span className="text-ink font-medium">{file.name}</span>
                ) : (
                  'Clique para selecionar um arquivo CSV ou XLSX'
                )}
              </div>
              <input
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted">
                Cancelar
              </button>
              <button
                onClick={handle}
                disabled={!file || busy}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {busy ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="text-lg font-bold text-emerald-600 mb-2">
              {result.imported} cliente(s) importado(s)
            </div>
            {result.errors?.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium text-red-600 mb-1">
                  {result.errors.length} erro(s):
                </div>
                {result.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className="text-xs text-muted">
                    Linha {e.linha}: {e.erro}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium">
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
