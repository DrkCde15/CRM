import { useState, useEffect } from 'react'
import { Bot, Save, RefreshCw, MessageSquare, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../core/components/layout/PageHeader'
import api from '../api'
import { useToasts } from '../store'

interface ChatbotConfig {
  enabled: boolean
  welcomeMessage: string
  systemPrompt: string
  fallbackMessage: string
  flows: {
    appointments: boolean
    tickets: boolean
    meetings: boolean
  }
}

const DEFAULTS: ChatbotConfig = {
  enabled: true,
  welcomeMessage: 'Olá! 👋 Bem-vindo(a)! Eu sou o assistente virtual. Escolha uma opção abaixo:\n\n1 - Informações\n2 - Agendar\n3 - Falar com atendente\n4 - Abrir chamado\n5 - Agendar reunião\n0 - Menu inicial',
  systemPrompt: 'Você é um assistente virtual de uma empresa de desenvolvimento de software. Você vende sites, aplicativos web, aplicativos mobile, automações, APIs e integrações. Responda de forma educada e profissional. Se o cliente fugir do assunto, gentilmente traga de volta.',
  fallbackMessage: 'Desculpe, não entendi. Pode repetir? Digite 0 para voltar ao menu inicial.',
  flows: { appointments: true, tickets: true, meetings: true },
}

function ChatbotPage() {
  const [cfg, setCfg] = useState<ChatbotConfig>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { push } = useToasts()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/config')
      if (data.enabled !== undefined) setCfg({
        enabled: data.enabled === 'true' || data.enabled === true,
        welcomeMessage: data.welcomeMessage || DEFAULTS.welcomeMessage,
        systemPrompt: data.systemPrompt || DEFAULTS.systemPrompt,
        fallbackMessage: data.fallbackMessage || DEFAULTS.fallbackMessage,
        flows: typeof data.flows === 'string' ? JSON.parse(data.flows) : data.flows || DEFAULTS.flows,
      })
    } catch { /* use defaults */ }
    setLoading(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/api/config/chatbot_enabled', { value: String(cfg.enabled) })
      await api.put('/api/config/chatbot_welcomeMessage', { value: cfg.welcomeMessage })
      await api.put('/api/config/chatbot_systemPrompt', { value: cfg.systemPrompt })
      await api.put('/api/config/chatbot_fallbackMessage', { value: cfg.fallbackMessage })
      await api.put('/api/config/chatbot_flows', { value: JSON.stringify(cfg.flows) })
      push('success', 'Configurações salvas')
    } catch {
      push('error', 'Erro ao salvar')
    }
    setSaving(false)
  }

  const toggleFlow = (key: keyof ChatbotConfig['flows']) => {
    setCfg(prev => ({ ...prev, flows: { ...prev.flows, [key]: !prev.flows[key] } }))
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-center py-20 text-muted">
          <RefreshCw size={20} className="animate-spin mr-2" />
          Carregando...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <PageHeader
        title="Chatbot"
        description="Configure o assistente virtual de atendimento automático."
        actions={
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        }
      />

      <div className="space-y-6">
        {/* Status toggle */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${cfg.enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <Bot size={20} className={cfg.enabled ? 'text-green-600' : 'text-muted'} />
              </div>
              <div>
                <h3 className="font-medium text-ink dark:text-slate-100">Chatbot ativo</h3>
                <p className="text-sm text-muted">Quando ativo, novos contatos são recebidos pelo assistente virtual.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.enabled}
                onChange={(e) => setCfg(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500" />
            </label>
          </div>
        </div>

        {/* Welcome message */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <MessageSquare size={18} className="text-muted" />
            <h3 className="font-medium text-ink dark:text-slate-100">Mensagem de boas-vindas</h3>
          </div>
          <textarea
            value={cfg.welcomeMessage}
            onChange={(e) => setCfg(prev => ({ ...prev, welcomeMessage: e.target.value }))}
            rows={5}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-ink dark:text-slate-100 resize-y"
          />
        </div>

        {/* System prompt */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <Bot size={18} className="text-muted" />
            <h3 className="font-medium text-ink dark:text-slate-100">Personalidade da IA</h3>
          </div>
          <p className="text-xs text-muted mb-2">Instruções de sistema para o modelo de IA.</p>
          <textarea
            value={cfg.systemPrompt}
            onChange={(e) => setCfg(prev => ({ ...prev, systemPrompt: e.target.value }))}
            rows={5}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-ink dark:text-slate-100 resize-y font-mono"
          />
        </div>

        {/* Fallback */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={18} className="text-muted" />
            <h3 className="font-medium text-ink dark:text-slate-100">Mensagem de fallback</h3>
          </div>
          <p className="text-xs text-muted mb-2">Quando a IA não consegue processar a mensagem.</p>
          <textarea
            value={cfg.fallbackMessage}
            onChange={(e) => setCfg(prev => ({ ...prev, fallbackMessage: e.target.value }))}
            rows={2}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-ink dark:text-slate-100 resize-y"
          />
        </div>

        {/* Flows */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="font-medium text-ink dark:text-slate-100 mb-3">Fluxos disponíveis</h3>
          <p className="text-xs text-muted mb-3">Quais fluxos de atendimento automático estão habilitados.</p>
          <div className="space-y-2">
            {[
              { key: 'appointments' as const, label: 'Agendamentos', desc: 'Permite que clientes agendem horários' },
              { key: 'tickets' as const, label: 'Chamados', desc: 'Permite que clientes abram chamados de suporte' },
              { key: 'meetings' as const, label: 'Reuniões', desc: 'Permite que clientes agendem reuniões' },
            ].map((flow) => (
              <label key={flow.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-ink dark:text-slate-100">{flow.label}</p>
                  <p className="text-xs text-muted">{flow.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={cfg.flows[flow.key]}
                  onChange={() => toggleFlow(flow.key)}
                  className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatbotPage
