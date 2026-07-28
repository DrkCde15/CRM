import { useEffect, useState } from 'react'
import { webhooksApi } from '../api'
import { useToasts } from '../store'
import { PageHeader } from '../core/components/layout/PageHeader'

interface Webhook {
  id: number
  name: string
  url: string
  events: string
  active: boolean
}

const EVENT_OPTIONS = ['ticket.created', 'ticket.updated', 'ticket.closed', 'message.received', 'client.created']

export default function Webhooks() {
  const [list, setList] = useState<Webhook[]>([])
  const [editing, setEditing] = useState<Partial<Webhook> | null>(null)
  const { push } = useToasts()

  const load = async () => {
    try {
      setList(await webhooksApi.list())
    } catch {
      push('error', 'Erro ao carregar webhooks')
    }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!editing) return
    try {
      if (editing.id) {
        await webhooksApi.update(editing.id, editing)
      } else {
        await webhooksApi.create(editing as { name: string; url: string; events: string })
      }
      setEditing(null)
      await load()
      push('success', editing.id ? 'Webhook atualizado' : 'Webhook criado')
    } catch {
      push('error', 'Erro ao salvar webhook')
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Excluir este webhook?')) return
    try {
      await webhooksApi.remove(id)
      await load()
      push('success', 'Webhook excluído')
    } catch {
      push('error', 'Erro ao excluir')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader
        title="Webhooks"
        description="Configure notificações e integrações via webhooks."
        actions={
          <button
            onClick={() => setEditing({ name: '', url: '', events: 'ticket.created', active: true })}
            className="px-3 py-1.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            Novo webhook
          </button>
        }
      />
      <div className="space-y-3">
        {list.length === 0 && <p className="text-sm text-muted text-center py-8">Nenhum webhook cadastrado.</p>}
        {list.map((w) => (
          <div key={w.id} className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${w.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-ink truncate">{w.name || w.url}</div>
                <div className="text-xs text-muted truncate">{w.url}</div>
                <div className="text-[10px] text-muted mt-0.5">Eventos: {w.events}</div>
              </div>
              <button onClick={() => setEditing(w)} className="px-3 py-1.5 rounded-xl text-xs font-medium text-brand-600">Editar</button>
              <button onClick={() => remove(w.id)} className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-600">Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={() => setEditing(null)}>
          <div className="w-[480px] max-w-[92vw] bg-white rounded-2xl shadow-xl p-5 dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-ink mb-4">{editing.id ? 'Editar' : 'Novo'} webhook</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Nome</label>
                <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">URL</label>
                <input value={editing.url || ''} onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Eventos</label>
                <select value={editing.events || ''} onChange={(e) => setEditing({ ...editing, events: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600">
                  {EVENT_OPTIONS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sm text-muted">Cancelar</button>
              <button onClick={save} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
