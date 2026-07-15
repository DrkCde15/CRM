import { useEffect, useState } from 'react'
import { stats as statsApi, ApiError } from '../api'
import type { Stats } from '../types'
import { useToasts } from '../store'
import { registerRealtime } from '../realtime'

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

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-ink">{value}</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<Stats | null>(null)
  const { push } = useToasts()

  useEffect(() => {
    const refresh = () =>
      statsApi
        .get()
        .then(setData)
        .catch((e) => push('error', e instanceof ApiError ? e.message : 'Erro ao carregar'))
    refresh()
    return registerRealtime('stats', refresh)
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
        <h2 className="text-sm font-semibold text-ink mb-1">Conversas por canal</h2>
        <p className="text-xs text-muted mb-4">Distribuição de conversas por canal (proporcional ao máximo).</p>
        {(() => {
          const ch = data.channels
          const values = {
            WhatsApp: ch.whatsapp.conversations,
            'E-mail': ch.email.conversations,
            Website: ch.website.conversations,
          }
          const max = Math.max(1, ...Object.values(values))
          const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500']
          return (
            <div className="space-y-3">
              {Object.entries(values).map(([label, value], i) => (
                <Bar
                  key={label}
                  label={`${label} · ${value} conversas`}
                  value={Math.round((value / max) * 100)}
                  color={colors[i]}
                />
              ))}
              <div className="flex flex-wrap gap-4 text-[11px] text-muted pt-1">
                <span>💬 WhatsApp: {ch.whatsapp.messages} mensagens</span>
                <span>✉️ E-mail: {ch.email.messages} mensagens</span>
                <span>🌐 Website: {ch.website.messages} mensagens</span>
                <span>
                  🌐 Website: {ch.website.open} abertas · {ch.website.closed} fechadas
                </span>
              </div>
            </div>
          )
        })()}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-8 dark:bg-slate-800 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-ink mb-3">Chamados convertidos (e-mail/chat)</h2>
        <div className="text-2xl font-bold text-ink">{data.tickets_converted}</div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-ink mb-1">Chamados por status</h2>
        <p className="text-xs text-muted mb-4">Quantidade de chamados por status (proporcional ao máximo).</p>
        {(() => {
          const entries = Object.entries(data.tickets_by_status)
          const max = Math.max(1, ...entries.map(([, c]) => c))
          const colors: Record<string, string> = {
            aberto: 'bg-amber-500',
            andamento: 'bg-brand-500',
            resolvido: 'bg-emerald-500',
            fechado: 'bg-slate-400',
          }
          return (
            <div className="space-y-3">
              {entries.map(([status, count]) => (
                <Bar
                  key={status}
                  label={statusLabels[status] || status}
                  value={Math.round((count / max) * 100)}
                  color={colors[status] || 'bg-brand-500'}
                />
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
