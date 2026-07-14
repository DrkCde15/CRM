import { useEffect, useState } from 'react'
import { stats as statsApi, ApiError } from '../api'
import type { Stats } from '../types'
import { useToasts } from '../store'

const cards = [
  { key: 'total_clients', label: 'Clientes', color: 'bg-violet-500' },
  { key: 'total_conversations', label: 'Conversas', color: 'bg-blue-500' },
  { key: 'total_tickets', label: 'Chamados', color: 'bg-amber-500' },
  { key: 'total_appointments', label: 'Agendamentos', color: 'bg-emerald-500' },
] as const

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  andamento: 'Em andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
}

export default function Dashboard() {
  const [data, setData] = useState<Stats | null>(null)
  const { push } = useToasts()

  useEffect(() => {
    statsApi
      .get()
      .then(setData)
      .catch((e) => push('error', e instanceof ApiError ? e.message : 'Erro ao carregar'))
  }, [push])

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-lg font-semibold text-ink mb-4">Dashboard</h1>
        <p className="text-sm text-muted">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-lg font-semibold text-ink mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div
            key={c.key}
            className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 dark:bg-slate-800 dark:border-slate-700"
          >
            <div
              className={`w-10 h-10 rounded-xl ${c.color} grid place-items-center text-white text-lg font-bold`}
            >
              {data[c.key]}
            </div>
            <div>
              <div className="text-xl font-bold text-ink">{data[c.key]}</div>
              <div className="text-xs text-muted">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700">
          <div className="text-sm text-muted mb-1">Conversas hoje</div>
          <div className="text-2xl font-bold text-ink">{data.conversations_today}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700">
          <div className="text-sm text-muted mb-1">Chamados hoje</div>
          <div className="text-2xl font-bold text-ink">{data.tickets_today}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-8 dark:bg-slate-800 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-ink mb-3">Conversas por canal</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <span>💬</span> WhatsApp
            </div>
            <div className="text-xs text-muted mt-1">
              {data.channels.whatsapp.conversations} conversas · {data.channels.whatsapp.messages} mensagens
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <span>✉️</span> E-mail
            </div>
            <div className="text-xs text-muted mt-1">
              {data.channels.email.conversations} conversas · {data.channels.email.messages} mensagens
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <span>🌐</span> Website
            </div>
            <div className="text-xs text-muted mt-1">
              {data.channels.website.conversations} conversas · {data.channels.website.messages} mensagens
            </div>
            <div className="text-xs text-muted">
              {data.channels.website.open} abertas · {data.channels.website.closed} fechadas
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-8 dark:bg-slate-800 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-ink mb-3">Chamados convertidos (e-mail/chat)</h2>
        <div className="text-2xl font-bold text-ink">{data.tickets_converted}</div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-ink mb-3">Chamados por status</h2>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(data.tickets_by_status).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              <span className="text-muted">{statusLabels[status] || status}:</span>
              <span className="font-semibold text-ink">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
