import { useEffect, useState } from 'react'
import { emailChannel, ApiError } from '../api'
import type { EmailAccount } from '../types'
import { useAuth, useToasts } from '../store'
import { PageHeader } from '../core/components/layout/PageHeader'

export default function Channels() {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <PageHeader title="Canais" description="Gerencie canais de atendimento." />
        <p className="text-sm text-muted">Acesso restrito a administradores.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader title="Canais" description="Gerencie canais de atendimento." />
      <EmailSection />
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

