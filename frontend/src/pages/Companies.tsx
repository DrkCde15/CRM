import { useEffect, useState } from 'react'
import { companiesApi } from '../api'
import { useToasts } from '../store'
import { PageHeader } from '../core/components/layout/PageHeader'

interface Company {
  id: number
  name: string
  sso_provider: string | null
  created_at: string | null
}

interface CompanyStats {
  users: number
  clients: number
  tickets: number
  conversations: number
}

export default function Companies() {
  const [list, setList] = useState<Company[]>([])
  const [statsMap, setStatsMap] = useState<Record<number, CompanyStats>>({})
  const [editing, setEditing] = useState<Company | null>(null)
  const [editName, setEditName] = useState('')
  const { push } = useToasts()

  const load = async () => {
    try {
      const companies = await companiesApi.list()
      setList(companies)
      for (const c of companies) {
        try {
          const s = await companiesApi.stats(c.id)
          setStatsMap((m) => ({ ...m, [c.id]: s }))
        } catch {}
      }
    } catch {
      push('error', 'Erro ao carregar empresas')
    }
  }
  useEffect(() => { load() }, [])

  const saveName = async () => {
    if (!editing) return
    try {
      await companiesApi.update(editing.id, { name: editName })
      setEditing(null)
      await load()
      push('success', 'Nome atualizado')
    } catch {
      push('error', 'Erro ao atualizar')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader title="Empresas" description="Gerencie múltiplas empresas e configurações de tenant." />

      <div className="space-y-3">
        {list.map((c) => {
          const s = statsMap[c.id]
          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 grid place-items-center font-bold text-sm dark:bg-brand-700/30 dark:text-brand-300">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-ink">{c.name}</div>
                  <div className="text-xs text-muted">ID: {c.id} · Criada em {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '—'}</div>
                  {c.sso_provider && <div className="text-[10px] text-muted mt-0.5">SSO: {c.sso_provider}</div>}
                </div>
                {s && (
                  <div className="flex gap-4 text-xs text-muted">
                    <span>{s.users} usuários</span>
                    <span>{s.clients} clientes</span>
                    <span>{s.tickets} chamados</span>
                    <span>{s.conversations} conversas</span>
                  </div>
                )}
                <button
                  onClick={() => { setEditing(c); setEditName(c.name) }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-700/20"
                >
                  Editar
                </button>
              </div>
            </div>
          )
        })}
        {list.length === 0 && (
          <p className="text-sm text-muted text-center py-8">Nenhuma empresa encontrada.</p>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={() => setEditing(null)}>
          <div
            className="w-[400px] max-w-[92vw] bg-white rounded-2xl shadow-xl p-5 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-ink mb-4">Editar empresa #{editing.id}</h2>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 mb-4"
              placeholder="Nome da empresa"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sm text-muted">Cancelar</button>
              <button onClick={saveName} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
