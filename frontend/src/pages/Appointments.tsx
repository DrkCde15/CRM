import { useEffect, useState } from 'react'
import { appointments as apptsApi, ApiError } from '../api'
import type { Appointment } from '../types'
import { useToasts } from '../store'

function fmt(ts: string) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Appointments() {
  const [list, setList] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const { push } = useToasts()

  useEffect(() => {
    apptsApi
      .list()
      .then(setList)
      .catch((e) => push('error', e instanceof ApiError ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [push])

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-lg font-semibold text-ink mb-4">Agendamentos</h1>
      {loading && <p className="text-sm text-muted mb-4">Carregando...</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!loading && list.length === 0 && <p className="text-sm text-muted">Nenhum agendamento.</p>}
        {list.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-ink">{a.name || '—'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-muted dark:bg-slate-700 dark:text-slate-300">
                {a.status}
              </span>
            </div>
            <div className="text-sm text-muted">{a.servico}</div>
            <div className="text-xs text-muted mt-2">{fmt(a.data_hora)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
