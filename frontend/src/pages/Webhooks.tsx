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
  secret?: string
}

const EVENT_OPTIONS = [
  { value: 'ticket.created', label: 'Ticket criado' },
  { value: 'ticket.updated', label: 'Ticket atualizado' },
  { value: 'ticket.closed', label: 'Ticket fechado' },
  { value: 'message.received', label: 'Mensagem recebida' },
  { value: 'client.created', label: 'Cliente criado' },
]

export default function Webhooks() {
  const [list, setList] = useState<Webhook[]>([])
  const [editing, setEditing] = useState<Partial<Webhook> | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const { push } = useToasts()

  const load = async () => {
    try {
      setList(await webhooksApi.list())
    } catch {
      push('error', 'Erro ao carregar webhooks')
    }
  }
  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing({ name: '', url: '', events: '', active: true })
    setSelectedEvents(['ticket.created'])
  }

  const openEdit = (w: Webhook) => {
    setEditing(w)
    setSelectedEvents(w.events ? w.events.split(',').map(s => s.trim()).filter(Boolean) : [])
  }

  const toggleEvent = (ev: string) => {
    setSelectedEvents(prev =>
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
    )
  }

  const save = async () => {
    if (!editing) return
    const body = {
      name: editing.name || '',
      url: editing.url || '',
      events: selectedEvents.join(','),
      active: editing.active ?? true,
    }
    try {
      if (editing.id) {
        await webhooksApi.update(editing.id, body)
      } else {
        await webhooksApi.create(body)
      }
      setEditing(null)
      setSelectedEvents([])
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
        description="Configure notificações e integrações em tempo real via webhooks. Cada webhook recebe uma assinatura HMAC-SHA256 no header X-Webhook-Signature."
        actions={
          <button
            onClick={openNew}
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
              <span className={`w-2 h-2 rounded-full shrink-0 ${w.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-ink truncate">{w.name || w.url}</div>
                <div className="text-xs text-muted truncate">{w.url}</div>
                <div className="text-[10px] text-muted mt-0.5">
                  Eventos: {w.events || '(nenhum)'}
                  {w.secret ? ` · Assinatura: habilitada` : ''}
                </div>
              </div>
              <button onClick={() => openEdit(w)} className="px-3 py-1.5 rounded-xl text-xs font-medium text-brand-600">Editar</button>
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
                <label className="text-xs text-muted block mb-1.5">Eventos</label>
                <div className="space-y-1.5">
                  {EVENT_OPTIONS.map((ev) => (
                    <label key={ev.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(ev.value)}
                        onChange={() => toggleEvent(ev.value)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-ink">{ev.label}</span>
                      <code className="text-[10px] text-muted ml-auto">{ev.value}</code>
                    </label>
                  ))}
                </div>
              </div>
              {editing.id && editing.secret && (
                <div>
                  <label className="text-xs text-muted block mb-1">Segredo (HMAC)</label>
                  <div className="flex gap-2">
                    <input readOnly value={editing.secret}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-muted bg-slate-50 dark:bg-slate-700 dark:border-slate-600" />
                    <button onClick={() => { navigator.clipboard.writeText(editing.secret || ''); push('success', 'Copiado') }}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-brand-600 border border-slate-200 hover:bg-slate-50 dark:border-slate-600">
                      Copiar
                    </button>
                  </div>
                  <p className="text-[10px] text-muted mt-1">
                    Enviado no header <code className="text-brand-600">X-Webhook-Signature</code> (HMAC-SHA256 do body).
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => { setEditing(null); setSelectedEvents([]) }} className="px-4 py-2 rounded-xl text-sm text-muted">Cancelar</button>
              <button onClick={save} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
