import { useEffect, useState } from 'react'
import { tickets as ticketsApi } from '../api'
import type { Ticket } from '../types'

const statusColor: Record<string, string> = {
  aberto: 'bg-amber-100 text-amber-700',
  enviado_taky: 'bg-brand-100 text-brand-700',
  fechado: 'bg-slate-100 text-slate-500',
}

export default function Tickets() {
  const [list, setList] = useState<Ticket[]>([])
  const [busy, setBusy] = useState<number | null>(null)

  const load = async () => setList(await ticketsApi.list())

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const push = async (id: number) => {
    setBusy(id)
    await ticketsApi.push(id)
    await load()
    setBusy(null)
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-lg font-semibold text-ink mb-4">Chamados</h1>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="text-left font-medium px-4 py-3">#</th>
              <th className="text-left font-medium px-4 py-3">Título</th>
              <th className="text-left font-medium px-4 py-3">Tipo</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-right font-medium px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Nenhum chamado.
                </td>
              </tr>
            )}
            {list.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-muted">{t.id}</td>
                <td className="px-4 py-3 text-ink">
                  <div className="font-medium">{t.titulo}</div>
                  <div className="text-xs text-muted line-clamp-1">{t.descricao}</div>
                </td>
                <td className="px-4 py-3 text-muted">{t.tipo}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[t.status] || 'bg-slate-100 text-slate-500'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {t.taky_task_id ? (
                    <span className="text-xs text-brand-700">No Taky #{t.taky_task_id}</span>
                  ) : (
                    <button
                      onClick={() => push(t.id)}
                      disabled={busy === t.id}
                      className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium disabled:opacity-50"
                    >
                      {busy === t.id ? '...' : 'Enviar ao Taky'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
