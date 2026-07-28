import { useEffect, useState } from 'react'
import { workflowsApi } from '../api'
import { useToasts } from '../store'
import { PageHeader } from '../core/components/layout/PageHeader'

interface Workflow {
  id: number
  name: string
  event: string
  conditions: Record<string, unknown> | null
  actions: Record<string, unknown> | unknown[]
  active: boolean
  created_at: string | null
}

const EVENT_LABELS: Record<string, string> = {
  'ticket.created': 'Chamado criado',
  'ticket.updated': 'Chamado atualizado',
  'ticket.closed': 'Chamado fechado',
  'message.received': 'Mensagem recebida',
}

const EVENTS = Object.keys(EVENT_LABELS)

const defaultActions: Record<string, { type: string; value: string }[]> = {
  'change_status': [{ type: 'change_status', value: 'andamento' }],
}

export default function WorkflowsPage() {
  const [list, setList] = useState<Workflow[]>([])
  const [editing, setEditing] = useState<Partial<Workflow> | null>(null)
  const { push } = useToasts()

  const load = async () => {
    try {
      setList(await workflowsApi.list())
    } catch {
      push('error', 'Erro ao carregar workflows')
    }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!editing) return
    try {
      if (editing.id) {
        await workflowsApi.update(editing.id, editing)
      } else {
        await workflowsApi.create(editing as { name: string; event: string; actions: Record<string, unknown> | unknown[] })
      }
      setEditing(null)
      await load()
      push('success', editing.id ? 'Workflow atualizado' : 'Workflow criado')
    } catch {
      push('error', 'Erro ao salvar workflow')
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Excluir este workflow?')) return
    try {
      await workflowsApi.remove(id)
      await load()
      push('success', 'Workflow excluído')
    } catch {
      push('error', 'Erro ao excluir workflow')
    }
  }

  const toggleActive = async (wf: Workflow) => {
    try {
      await workflowsApi.update(wf.id, { active: !wf.active })
      await load()
    } catch {
      push('error', 'Erro ao alterar status')
    }
  }

  if (!list.length && !editing) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-lg font-semibold text-ink">Workflows</h1>
          <button
            onClick={() => setEditing({ name: '', event: 'ticket.created', conditions: null, actions: [{ type: 'change_status', value: 'andamento' }], active: true })}
            className="ml-auto px-3 py-1.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            Novo workflow
          </button>
        </div>
        <p className="text-sm text-muted">Nenhum workflow cadastrado. Crie regras automáticas para chamados e mensagens.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader
        title="Workflows"
        description="Automatize processos e ações com fluxos inteligentes."
        actions={
          <button
            onClick={() => setEditing({ name: '', event: 'ticket.created', conditions: null, actions: [{ type: 'change_status', value: 'andamento' }], active: true })}
            className="px-3 py-1.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            Novo workflow
          </button>
        }
      />

      <div className="grid gap-3">
        {list.map((wf) => (
          <div
            key={wf.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleActive(wf)}
                className={`w-10 h-6 rounded-full transition-colors ${
                  wf.active ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
                } relative`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    wf.active ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-ink truncate">{wf.name}</div>
                <div className="text-xs text-muted">
                  {EVENT_LABELS[wf.event] || wf.event}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(wf)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-700/20"
                >
                  Editar
                </button>
                <button
                  onClick={() => remove(wf.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-700/20"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <WorkflowEditor
          initial={editing}
          onSave={save}
          onClose={() => setEditing(null)}
          onChange={(patch) => setEditing((e) => (e ? { ...e, ...patch } : e))}
        />
      )}
    </div>
  )
}

function WorkflowEditor({
  initial,
  onSave,
  onClose,
  onChange,
}: {
  initial: Partial<Workflow>
  onSave: () => void
  onClose: () => void
  onChange: (p: Partial<Workflow>) => void
}) {
  const actionsArr = Array.isArray(initial.actions) ? initial.actions : [initial.actions]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={onClose}>
      <div
        className="w-[520px] max-w-[92vw] bg-white rounded-2xl shadow-xl p-5 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink mb-4">
          {initial.id ? 'Editar workflow' : 'Novo workflow'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted block mb-1">Nome</label>
            <input
              value={initial.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600"
              placeholder="Ex: Chamado WhatsApp → andamento"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Evento</label>
            <select
              value={initial.event || 'ticket.created'}
              onChange={(e) => onChange({ event: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600"
            >
              {EVENTS.map((ev) => (
                <option key={ev} value={ev}>{EVENT_LABELS[ev]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">
              Condições <span className="text-muted/60">(opcional)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={(initial.conditions as any)?.field || ''}
                onChange={(e) =>
                  onChange({ conditions: { ...(initial.conditions as any || {}), field: e.target.value } })
                }
                className="px-2 py-2 rounded-lg border border-slate-200 text-xs dark:bg-slate-700 dark:border-slate-600"
              >
                <option value="">Campo</option>
                <option value="tipo">Tipo</option>
                <option value="status">Status</option>
              </select>
              <select
                value={(initial.conditions as any)?.op || 'eq'}
                onChange={(e) =>
                  onChange({ conditions: { ...(initial.conditions as any || {}), op: e.target.value } })
                }
                className="px-2 py-2 rounded-lg border border-slate-200 text-xs dark:bg-slate-700 dark:border-slate-600"
              >
                <option value="eq">=</option>
                <option value="neq">≠</option>
                <option value="contains">contém</option>
              </select>
              <input
                value={(initial.conditions as any)?.value || ''}
                onChange={(e) =>
                  onChange({ conditions: { ...(initial.conditions as any || {}), value: e.target.value } })
                }
                placeholder="Valor"
                className="px-2 py-2 rounded-lg border border-slate-200 text-xs dark:bg-slate-700 dark:border-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Ações</label>
            {actionsArr.map((act: any, i: number) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <select
                  value={act.type}
                  onChange={(e) => {
                    const newActions = [...actionsArr]
                    newActions[i] = { ...newActions[i] as any, type: e.target.value, value: 'andamento' }
                    onChange({ actions: newActions })
                  }}
                  className="flex-1 px-2 py-2 rounded-lg border border-slate-200 text-xs dark:bg-slate-700 dark:border-slate-600"
                >
                  <option value="change_status">Alterar status</option>
                  <option value="webhook">Disparar webhook</option>
                </select>
                {act.type === 'change_status' && (
                  <select
                    value={act.value}
                    onChange={(e) => {
                      const newActions = [...actionsArr]
                      newActions[i] = { ...newActions[i] as any, value: e.target.value }
                      onChange({ actions: newActions })
                    }}
                    className="flex-1 px-2 py-2 rounded-lg border border-slate-200 text-xs dark:bg-slate-700 dark:border-slate-600"
                  >
                    <option value="aberto">Aberto</option>
                    <option value="andamento">Em andamento</option>
                    <option value="resolvido">Resolvido</option>
                    <option value="fechado">Fechado</option>
                  </select>
                )}
                {act.type === 'webhook' && (
                  <input
                    value={act.value || ''}
                    onChange={(e) => {
                      const newActions = [...actionsArr]
                      newActions[i] = { ...newActions[i] as any, value: e.target.value }
                      onChange({ actions: newActions })
                    }}
                    placeholder="Nome do evento"
                    className="flex-1 px-2 py-2 rounded-lg border border-slate-200 text-xs dark:bg-slate-700 dark:border-slate-600"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted">
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
