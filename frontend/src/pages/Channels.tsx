import { useEffect, useState } from 'react'
import { emailChannel, websiteChat, ApiError } from '../api'
import type { EmailAccount, WidgetConfig } from '../types'
import { useAuth, useToasts } from '../store'

export default function Channels() {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-lg font-semibold text-ink mb-2">Canais</h1>
        <p className="text-sm text-muted">Acesso restrito a administradores.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 grid gap-8">
      <h1 className="text-lg font-semibold text-ink">Canais de atendimento</h1>
      <EmailSection />
      <WidgetSection />
    </div>
  )
}

function EmailSection() {
  const { push } = useToasts()
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [form, setForm] = useState({
    provider: 'gmail',
    email: '',
    password: '',
    display_name: '',
    google_script_url: '',
    google_script_secret: '',
  })

  const load = () => emailChannel.accounts().then(setAccounts).catch(() => setAccounts([]))
  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    try {
      await emailChannel.create(form)
      setForm({
        provider: 'gmail',
        email: '',
        password: '',
        display_name: '',
        google_script_url: '',
        google_script_secret: '',
      })
      await load()
      push('success', 'Conta de e-mail adicionada')
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao salvar')
    }
  }

  const sync = async (id: number) => {
    try {
      await emailChannel.sync(id)
      push('success', 'Sincronização iniciada')
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao sincronizar')
    }
  }

  const remove = async (id: number) => {
    await emailChannel.remove(id)
    load()
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 dark:bg-slate-800 dark:border-slate-700">
      <h2 className="font-semibold text-ink mb-3">E-mail (IMAP/SMTP)</h2>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <select
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value })}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        >
          <option value="gmail">Gmail</option>
          <option value="outlook">Outlook / Office 365</option>
          <option value="imap">IMAP personalizado</option>
        </select>
        <input
          placeholder="E-mail (ex: vendas@empresa.com)"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        />
        <input
          type="password"
          placeholder="Senha / App password (SMTP)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        />
        <input
          placeholder="Nome de exibição"
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        />
        <input
          placeholder="Google Script URL (opcional)"
          value={form.google_script_url}
          onChange={(e) => setForm({ ...form, google_script_url: e.target.value })}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        />
        <input
          type="password"
          placeholder="Segredo do Google Script (opcional)"
          value={form.google_script_secret}
          onChange={(e) => setForm({ ...form, google_script_secret: e.target.value })}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        />
      </div>
      <button
        onClick={save}
        className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
      >
        Adicionar conta
      </button>

      <div className="mt-5 flex flex-col gap-2">
        {accounts.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700"
          >
            <div className="flex-1">
              <div className="text-sm font-medium text-ink">{a.email}</div>
              <div className="text-xs text-muted">
                {a.provider} · {a.active ? 'ativo' : 'inativo'}
              </div>
            </div>
            <button
              onClick={() => sync(a.id)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-surface dark:border-slate-600 dark:hover:bg-slate-700"
            >
              Sincronizar
            </button>
            <button
              onClick={() => remove(a.id)}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
            >
              Remover
            </button>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="text-sm text-muted">Nenhuma conta configurada.</p>
        )}
      </div>
    </section>
  )
}

function WidgetSection() {
  const { push } = useToasts()
  const [configs, setConfigs] = useState<WidgetConfig[]>([])
  const [form, setForm] = useState({
    name: 'Convexo',
    primary_color: '#059669',
    welcome_message: 'Olá! Como podemos ajudar?',
    position: 'right',
    theme: 'light',
  })

  const load = () => websiteChat.configs().then(setConfigs).catch(() => setConfigs([]))
  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    try {
      await websiteChat.createConfig(form)
      await load()
      push('success', 'Widget configurado')
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao salvar')
    }
  }

  const copyEmbed = (token: string) => {
    const snippet = `<script src="https://cdn.convexo.com/widget.js"></script>\n<div id="convexo-chat" data-token="${token}"></div>`
    navigator.clipboard?.writeText(snippet)
    push('info', 'Script de incorporação copiado')
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 dark:bg-slate-800 dark:border-slate-700">
      <h2 className="font-semibold text-ink mb-3">Widget de chat (Website)</h2>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <input
          placeholder="Nome"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        />
        <input
          type="color"
          value={form.primary_color}
          onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
          className="px-3 py-1 rounded-xl border border-slate-200 dark:bg-slate-700 dark:border-slate-600"
        />
        <input
          placeholder="Mensagem inicial"
          value={form.welcome_message}
          onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        />
        <select
          value={form.position}
          onChange={(e) => setForm({ ...form, position: e.target.value })}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        >
          <option value="right">Direita</option>
          <option value="left">Esquerda</option>
        </select>
        <select
          value={form.theme}
          onChange={(e) => setForm({ ...form, theme: e.target.value })}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        >
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </select>
      </div>
      <button
        onClick={save}
        className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
      >
        Criar widget
      </button>

      <div className="mt-5 flex flex-col gap-2">
        {configs.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700"
          >
            <div
              className="w-8 h-8 rounded-lg"
              style={{ background: c.primary_color }}
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-ink">{c.name}</div>
              <div className="text-xs text-muted">
                {c.position} · {c.theme} · token: {c.api_token.slice(0, 8)}…
              </div>
            </div>
            <button
              onClick={() => copyEmbed(c.api_token)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-surface dark:border-slate-600 dark:hover:bg-slate-700"
            >
              Copiar script
            </button>
          </div>
        ))}
        {configs.length === 0 && (
          <p className="text-sm text-muted">Nenhum widget configurado.</p>
        )}
      </div>
    </section>
  )
}
