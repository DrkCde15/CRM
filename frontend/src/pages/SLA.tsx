import { useEffect, useState } from 'react'
import { slaApi } from '../api'
import { useToasts } from '../store'
import { PageHeader } from '../core/components/layout/PageHeader'

interface SLARule {
  id: number
  name: string
  priority: string
  max_response_hours: number
  max_resolution_hours: number
  escalate_after_hours: number
  escalate_action: string
  active: boolean
}

interface Breached {
  id: number
  titulo: string
  status: string
  created_at: string | null
}

export default function SLAPage() {
  const [rules, setRules] = useState<SLARule[]>([])
  const [breached, setBreached] = useState<Breached[]>([])
  const [editing, setEditing] = useState<Partial<SLARule> | null>(null)
  const { push } = useToasts()

  const load = async () => {
    try {
      setRules(await slaApi.listRules())
      setBreached(await slaApi.breached())
    } catch {
      push('error', 'Erro ao carregar SLA')
    }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!editing) return
    try {
      if (editing.id) {
        await slaApi.updateRule(editing.id, editing)
      } else {
        await slaApi.createRule(editing)
      }
      setEditing(null)
      await load()
      push('success', editing.id ? 'Regra atualizada' : 'Regra criada')
    } catch {
      push('error', 'Erro ao salvar regra')
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Excluir esta regra?')) return
    try {
      await slaApi.deleteRule(id)
      await load()
      push('success', 'Regra excluída')
    } catch {
      push('error', 'Erro ao excluir')
    }
  }

  const runCheck = async () => {
    try {
      await slaApi.check()
      await load()
      push('success', 'Verificação SLA concluída')
    } catch {
      push('error', 'Erro na verificação')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader
        title="SLA"
        description="Defina acordos de nível de serviço para chamados."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={runCheck}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm text-ink hover:bg-surface dark:border-slate-600 dark:text-slate-100"
            >
              Verificar agora
            </button>
            <button
              onClick={() => setEditing({ name: '', priority: 'media', max_response_hours: 24, max_resolution_hours: 72, escalate_after_hours: 0, escalate_action: '', active: true })}
              className="px-3 py-1.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              Nova regra
            </button>
          </div>
        }
      />

      {breached.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 dark:bg-red-700/20 dark:border-red-600">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
            🚨 {breached.length} chamado(s) com SLA violado
          </h2>
          <div className="space-y-1">
            {breached.map((t) => (
              <div key={t.id} className="text-xs text-red-600 dark:text-red-300">
                #{t.id} {t.titulo} ({t.status})
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {rules.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${r.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-ink">{r.name}</div>
                <div className="text-xs text-muted">
                  Prioridade: {r.priority} · Resposta: {r.max_response_hours}h · Resolução: {r.max_resolution_hours}h
                  {r.escalate_after_hours > 0 && ` · Escalar após ${r.escalate_after_hours}h`}
                </div>
              </div>
              <button onClick={() => setEditing(r)} className="px-3 py-1.5 rounded-xl text-xs font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-700/20">
                Editar
              </button>
              <button onClick={() => remove(r.id)} className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-700/20">
                Excluir
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <p className="text-sm text-muted text-center py-8">Nenhuma regra SLA configurada.</p>
        )}
      </div>

      {editing && (
        <SLARuleEditor
          initial={editing}
          onSave={save}
          onClose={() => setEditing(null)}
          onChange={(p) => setEditing((e) => (e ? { ...e, ...p } : e))}
        />
      )}
    </div>
  )
}

function SLARuleEditor({
  initial, onSave, onClose, onChange,
}: {
  initial: Partial<SLARule>
  onSave: () => void
  onClose: () => void
  onChange: (p: Partial<SLARule>) => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={onClose}>
      <div className="w-[460px] max-w-[92vw] bg-white rounded-2xl shadow-xl p-5 dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ink mb-4">{initial.id ? 'Editar regra' : 'Nova regra'}</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted block mb-1">Nome</label>
            <input value={initial.name || ''} onChange={(e) => onChange({ name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Prioridade</label>
            <select value={initial.priority || 'media'} onChange={(e) => onChange({ priority: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600">
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted block mb-1">Resposta (horas)</label>
              <input type="number" value={initial.max_response_hours ?? 24} onChange={(e) => onChange({ max_response_hours: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Resolução (horas)</label>
              <input type="number" value={initial.max_resolution_hours ?? 72} onChange={(e) => onChange({ max_resolution_hours: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted block mb-1">Escalar após (h)</label>
              <input type="number" value={initial.escalate_after_hours ?? 0} onChange={(e) => onChange({ escalate_after_hours: +e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Ação de escalada</label>
              <select value={initial.escalate_action || ''} onChange={(e) => onChange({ escalate_action: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="">Nenhuma</option>
                <option value="change_status_andamento">Mover para andamento</option>
                <option value="change_status_aberto">Reabrir</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted">Cancelar</button>
          <button onClick={onSave} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium">Salvar</button>
        </div>
      </div>
    </div>
  )
}
