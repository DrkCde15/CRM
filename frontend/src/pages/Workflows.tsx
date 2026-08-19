import { useEffect, useState } from 'react'
import { workflowsApi } from '../api'
import { ApiError } from '../api'
import { useToasts } from '../store'
import { PageHeader } from '../core/components/layout/PageHeader'
import { MessageSquare, Ticket, User, Webhook, Bot, Workflow, type LucideIcon } from 'lucide-react'

interface Workflow {
  id?: number
  name: string
  event: string
  conditions: Record<string, unknown> | null
  actions: Record<string, unknown>[] | Record<string, unknown>
  active: boolean
  created_at?: string | null
}

interface WorkflowSchema {
  events: { value: string; label: string }[]
  conditionFields: { value: string; label: string; type: string }[]
  operators: { value: string; label: string }[]
  actionTypes: { value: string; label: string; params: { key: string; label: string; type: string }[] }[]
}

const EVENT_ICONS: Record<string, LucideIcon> = {
  'ticket.created': Ticket,
  'message.received': MessageSquare,
  'message.user': MessageSquare,
  'user.message': MessageSquare,
  'webhook.received': Webhook,
}

function getEventIcon(event: string): LucideIcon {
  if (EVENT_ICONS[event]) return EVENT_ICONS[event]
  const e = event.toLowerCase()
  if (e.includes('message') || e.includes('msg') || e.includes('chat')) return MessageSquare
  if (e.includes('ticket')) return Ticket
  if (e.includes('user')) return User
  if (e.includes('webhook')) return Webhook
  if (e.includes('bot')) return Bot
  return Workflow
}

export default function WorkflowsPage() {
  const [list, setList] = useState<Workflow[]>([])
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [schema, setSchema] = useState<WorkflowSchema | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const { push } = useToasts()

  const load = async () => {
    try {
      setList(await workflowsApi.list())
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao carregar workflows')
    }
  }

  const loadSchema = async () => {
    try {
      setSchema(await workflowsApi.schema())
    } catch {
      setSchema({
        events: [{ value: 'ticket.created', label: 'Chamado criado' }],
        conditionFields: [{ value: 'tipo', label: 'Tipo', type: 'text' }],
        operators: [{ value: 'equals', label: '=' }],
        actionTypes: [{ value: 'change_status', label: 'Alterar status', params: [{ key: 'value', label: 'Valor', type: 'text' }] }],
      })
    }
  }

  useEffect(() => { load(); loadSchema() }, [])

  const save = async () => {
    if (!editing) return
    try {
      if (editing.id) {
        await workflowsApi.update(editing.id, editing)
      } else {
        await workflowsApi.create(editing)
      }
      setEditing(null)
      await load()
      push('success', editing.id ? 'Workflow atualizado' : 'Workflow criado')
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao salvar workflow')
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Excluir este workflow?')) return
    try {
      await workflowsApi.remove(id)
      await load()
      push('success', 'Workflow excluído')
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao excluir workflow')
    }
  }

  const toggleActive = async (wf: Workflow) => {
    if (wf.id == null || togglingId === wf.id) return
    const id = wf.id
    const prev = wf.active
    const nextVal = !prev

    // Atualização otimista: feedback visual imediato.
    setTogglingId(id)
    setList((prevList) => prevList.map((x) => (x.id === id ? { ...x, active: nextVal } : x)))

    try {
      await workflowsApi.update(id, { active: nextVal })
    } catch (e) {
      // Reverte o estado local em caso de erro na API.
      setList((prevList) => prevList.map((x) => (x.id === id ? { ...x, active: prev } : x)))
      push('error', e instanceof ApiError ? e.message : 'Erro ao alterar status')
    } finally {
      setTogglingId(null)
    }
  }

  const newWorkflow = (): Workflow => ({
    name: '',
    event: schema?.events[0]?.value || 'ticket.created',
    conditions: { field: '', op: 'equals', value: '' },
    actions: [{ type: 'change_status', value: 'andamento' }],
    active: true,
  })

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader
        title="Workflow Builder"
        description="Automatize processos: escolha um evento, condições e ações."
        actions={
          <button
            onClick={() => setEditing(newWorkflow())}
            className="px-3 py-1.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            Novo workflow
          </button>
        }
      />

      {list.length === 0 && !editing && (
        <p className="text-sm text-muted">Nenhum workflow cadastrado. Crie regras automáticas para chamados e mensagens.</p>
      )}

      <div className="grid gap-3">
        {list.map((wf) => (
          <div key={wf.id} className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleActive(wf)}
                disabled={togglingId === wf.id}
                aria-label={wf.active ? 'Desativar workflow' : 'Ativar workflow'}
                aria-checked={wf.active}
                role="switch"
                className={`flex h-6 w-11 shrink-0 items-center overflow-hidden rounded-full px-0.5 transition-colors ${wf.active ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'} ${togglingId === wf.id ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
              >
                <span className={`h-5 w-5 shrink-0 rounded-full bg-white shadow transition-all ${wf.active ? 'ml-auto' : 'ml-0'}`} />
              </button>
              {(() => {
                const Icon = getEventIcon(wf.event)
                return (
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-700/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <Icon size={18} />
                  </div>
                )
              })()}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-ink truncate">{wf.name}</div>
                <div className="text-xs text-muted">
                  {schema?.events.find((e) => e.value === wf.event)?.label || wf.event}
                  {' · '}
                  {Array.isArray(wf.actions) ? wf.actions.length : 1} ação(ões)
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(wf)} className="px-3 py-1.5 rounded-xl text-xs font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-700/20">
                  Editar
                </button>
                <button onClick={() => remove(wf.id!)} className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-700/20">
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && schema && (
        <WorkflowEditor
          initial={editing}
          schema={schema}
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
  schema,
  onSave,
  onClose,
  onChange,
}: {
  initial: Workflow
  schema: WorkflowSchema
  onSave: () => void
  onClose: () => void
  onChange: (p: Partial<Workflow>) => void
}) {
  const actionsArr = (Array.isArray(initial.actions) ? initial.actions : initial.actions ? [initial.actions] : []) as Record<string, any>[]
  const cond = (initial.conditions || {}) as Record<string, any>

  const setAction = (i: number, patch: Record<string, unknown>) => {
    const next = actionsArr.map((a, idx) => (idx === i ? { ...a, ...patch } : a))
    onChange({ actions: next })
  }

  const addAction = () => {
    const first = schema.actionTypes[0]?.value || 'change_status'
    onChange({ actions: [...actionsArr, { type: first }] })
  }

  const removeAction = (i: number) => {
    onChange({ actions: actionsArr.filter((_, idx) => idx !== i) })
  }

  const setCond = (patch: Record<string, unknown>) => onChange({ conditions: { ...cond, ...patch } })

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-[560px] max-w-[94vw] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-5 dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ink dark:text-slate-100 mb-4">{initial.id ? 'Editar workflow' : 'Novo workflow'}</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted block mb-1">Nome</label>
            <input
              value={initial.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              placeholder="Ex: Chamado WhatsApp → andamento"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Quando</span>
            <select
              value={initial.event}
              onChange={(e) => onChange({ event: e.target.value })}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            >
              {schema.events.map((ev) => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
            </select>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-ink dark:text-slate-100">Condições (opcional)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select value={cond.field || ''} onChange={(e) => setCond({ field: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200 text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
                <option value="">Campo</option>
                {schema.conditionFields.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select value={cond.op || 'equals'} onChange={(e) => setCond({ op: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200 text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
                {schema.operators.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input value={cond.value || ''} onChange={(e) => setCond({ value: e.target.value })} placeholder="Valor" className="px-2 py-2 rounded-lg border border-slate-200 text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-ink dark:text-slate-100">Ações</span>
              <button onClick={addAction} className="text-xs font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-700/20 px-2 py-1 rounded-lg">
                + Adicionar ação
              </button>
            </div>
            <div className="space-y-2">
              {actionsArr.map((act, i) => {
                const typeDef = schema.actionTypes.find((t) => t.value === act.type) || schema.actionTypes[0]
                return (
                  <div key={i} className="rounded-lg border border-slate-100 dark:border-slate-700 p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <select
                        value={act.type}
                        onChange={(e) => {
                          const val = e.target.value
                          const def = schema.actionTypes.find((t) => t.value === val)
                          const base: Record<string, unknown> = { type: val }
                          if (def) {
                            for (const p of def.params) base[p.key] = ''
                          }
                          setAction(i, base)
                        }}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                      >
                        {schema.actionTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <button onClick={() => removeAction(i)} className="text-xs text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-700/20">
                        Remover
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(typeDef?.params || []).map((p) => (
                        <input
                          key={p.key}
                          value={act[p.key] || ''}
                          onChange={(e) => setAction(i, { [p.key]: e.target.value })}
                          placeholder={p.label}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
              {actionsArr.length === 0 && <p className="text-xs text-muted">Nenhuma ação. Adicione ao menos uma.</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted">Cancelar</button>
          <button onClick={onSave} className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">Salvar</button>
        </div>
      </div>
    </div>
  )
}
