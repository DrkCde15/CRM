import { useEffect, useState } from 'react'
import { stats as statsApi } from '../api'
import type { Stats } from '../types'

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

  useEffect(() => {
    statsApi.get().then(setData)
  }, [])

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
          <div key={c.key} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${c.color} grid place-items-center text-white text-lg font-bold`}>
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
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-sm text-muted mb-1">Conversas hoje</div>
          <div className="text-2xl font-bold text-ink">{data.conversations_today}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-sm text-muted mb-1">Chamados hoje</div>
          <div className="text-2xl font-bold text-ink">{data.tickets_today}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
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
