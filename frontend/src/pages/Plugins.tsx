import { useEffect, useState } from 'react'
import {
  MessageCircle, Mail, Send, Sparkles, Workflow, Calendar, FileText, Bell, Webhook,
  type LucideIcon, Boxes,
} from 'lucide-react'
import { pluginsApi } from '../api'
import { ApiError } from '../api'
import { useToasts } from '../store'
import { PageHeader } from '../core/components/layout/PageHeader'

const ICONS: Record<string, LucideIcon> = {
  MessageCircle, Mail, Send, Sparkles, Workflow, Calendar, FileText, Bell, Webhook,
}

interface PluginItem {
  key: string
  name: string
  description: string
  category: string
  icon: string | null
  version: string | null
  enabled: boolean
  config: Record<string, string>
  configSchema: { key: string; label: string; type: string; options?: string[]; placeholder?: string }[]
}

export default function Plugins() {
  const [items, setItems] = useState<PluginItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PluginItem | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const { push } = useToasts()

  const load = async () => {
    setLoading(true)
    try {
      const data = await pluginsApi.list()
      setItems(data as PluginItem[])
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao carregar plugins')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggle = async (p: PluginItem) => {
    try {
      const updated = await pluginsApi.update(p.key, { enabled: !p.enabled })
      setItems((prev) => prev.map((x) => (x.key === p.key ? { ...x, enabled: (updated as PluginItem).enabled } : x)))
      push('success', `${p.name} ${!p.enabled ? 'ativado' : 'desativado'}`)
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao alterar plugin')
    }
  }

  const openConfig = (p: PluginItem) => {
    setEditing(p)
    setForm({ ...p.config })
  }

  const saveConfig = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const updated = await pluginsApi.update(editing.key, { enabled: editing.enabled, config: form })
      setItems((prev) => prev.map((x) => (x.key === editing.key ? { ...x, ...(updated as PluginItem) } : x)))
      push('success', 'Configuração salva')
      setEditing(null)
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const categories = Array.from(new Set(items.map((p) => p.category)))

  return (
    <div className="max-w-5xl mx-auto p-6">
      <PageHeader title="Plugins" description="Integrações disponíveis para conectar ao seu CRM." />

      {loading && <p className="text-sm text-muted">Carregando...</p>}

      {categories.map((cat) => (
        <div key={cat} className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2">{cat}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.filter((p) => p.category === cat).map((p) => {
              const Icon = p.icon ? (ICONS[p.icon] || Boxes) : Boxes
              return (
                <div key={p.key} className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-700/20 flex items-center justify-center text-brand-600 shrink-0">
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-ink dark:text-slate-100 truncate">{p.name}</h3>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input type="checkbox" className="sr-only peer" checked={p.enabled} onChange={() => toggle(p)} />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:bg-brand-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                        </label>
                      </div>
                      <p className="text-xs text-muted mt-1 line-clamp-2">{p.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {p.enabled ? 'Ativo' : 'Inativo'}
                        </span>
                        <button
                          onClick={() => openConfig(p)}
                          className="text-xs font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-700/20 px-2 py-1 rounded-lg"
                        >
                          Configurar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div
            className="w-[520px] max-w-[94vw] bg-white rounded-2xl shadow-xl p-5 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink dark:text-slate-100">Configurar {editing.name}</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-muted hover:bg-surface dark:hover:bg-slate-700">✕</button>
            </div>

            <label className="flex items-center gap-2 mb-4 text-sm">
              <input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />
              Plugin ativo
            </label>

            {editing.configSchema.length === 0 && (
              <p className="text-sm text-muted mb-4">Este plugin não possui configurações adicionais.</p>
            )}

            <div className="space-y-3">
              {editing.configSchema.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-muted mb-1">{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      value={form[f.key] || ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                    >
                      <option value="">Selecione...</option>
                      {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      value={form[f.key] || ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      rows={3}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                    />
                  ) : (
                    <input
                      type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'}
                      value={form[f.key] || ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm dark:border-slate-600 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={saveConfig}
                disabled={saving}
                className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
