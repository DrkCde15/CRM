import { useEffect, useState } from 'react'
import { appointments as apptsApi, clients, ApiError } from '../api'
import type { Appointment, Client } from '../types'
import { useToasts } from '../store'
import { registerRealtime } from '../realtime'
import { PageHeader } from '../core/components/layout/PageHeader'
import { Modal } from '../core/components/ui/Modal'

const WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function fmt(ts: string) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dayKeyOfDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayKey(ts: string) {
  return dayKeyOfDate(new Date(ts))
}

function toLocalInput(ts?: string) {
  const d = ts ? new Date(ts) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function monthMatrix(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const startDow = (first.getDay() + 6) % 7 // segunda = 0
  const start = new Date(year, month, 1 - startDow)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }
  return cells
}

export default function Appointments() {
  const [list, setList] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [clientsList, setClientsList] = useState<Client[]>([])
  const [clientId, setClientId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [servico, setServico] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [observacao, setObservacao] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const { push } = useToasts()

  useEffect(() => {
    const refresh = () =>
      apptsApi
        .list()
        .then(setList)
        .catch((e) => push('error', e instanceof ApiError ? e.message : 'Erro ao carregar'))
        .finally(() => setLoading(false))
    refresh()
    const unsub = registerRealtime('appointments', refresh)
    clients.list().then((d) => setClientsList(d.items)).catch(() => {})
    return unsub
  }, [push])

  const byDay = new Map<string, Appointment[]>()
  for (const a of list) {
    const k = dayKey(a.data_hora)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k)!.push(a)
  }

  const filtered = selectedDay ? byDay.get(selectedDay) || [] : list
  const todayKey = dayKeyOfDate(new Date())
  const cells = monthMatrix(viewDate.getFullYear(), viewDate.getMonth())

  const openCreate = () => {
    setClientId('')
    setName('')
    setServico('')
    setObservacao('')
    setDataHora(selectedDay ? `${selectedDay}T09:00` : toLocalInput())
    setCreating(true)
  }

  const save = async () => {
    if (!dataHora) {
      push('error', 'Informe a data e hora')
      return
    }
    setSaving(true)
    try {
      await apptsApi.create(clientId === '' ? null : clientId, {
        name: name.trim(),
        servico: servico.trim(),
        data_hora: new Date(dataHora).toISOString(),
        observacao: observacao.trim(),
      })
      setCreating(false)
      push('success', 'Agendamento criado')
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao criar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <PageHeader
        title="Agendamentos"
        description="Organize compromissos, reuniões e visitas."
        actions={
          <button
            onClick={openCreate}
            className="px-3 py-1.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            Novo agendamento
          </button>
        }
      />
      {loading && <p className="text-sm text-muted mb-4">Carregando...</p>}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewDate(new Date())}
              className="px-2 py-1 rounded-lg text-xs text-muted hover:bg-surface dark:hover:bg-slate-700"
            >
              Hoje
            </button>
            <button
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="w-7 h-7 rounded-lg text-muted hover:bg-surface dark:hover:bg-slate-700"
              aria-label="Mês anterior"
            >
              ‹
            </button>
            <button
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="w-7 h-7 rounded-lg text-muted hover:bg-surface dark:hover:bg-slate-700"
              aria-label="Próximo mês"
            >
              ›
            </button>
            <span className="font-medium text-ink dark:text-slate-100 capitalize">
              {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              className="px-2 py-1 rounded-lg text-xs text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-700/20"
            >
              Ver todos
            </button>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted mb-1">
          {WEEK.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const key = dayKeyOfDate(d)
            const inMonth = d.getMonth() === viewDate.getMonth()
            const isToday = key === todayKey
            const isSelected = key === selectedDay
            const count = byDay.get(key)?.length || 0
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(isSelected ? null : key)}
                className={[
                  'aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition',
                  inMonth ? 'text-ink dark:text-slate-100' : 'text-slate-300 dark:text-slate-600',
                  isSelected
                    ? 'bg-brand-600 text-white'
                    : isToday
                      ? 'bg-brand-50 dark:bg-brand-700/30 ring-1 ring-brand-300 dark:ring-brand-600'
                      : 'hover:bg-surface dark:hover:bg-slate-700',
                ].join(' ')}
              >
                <span>{d.getDate()}</span>
                {count > 0 && (
                  <span
                    className={['mt-0.5 h-1.5 w-1.5 rounded-full', isSelected ? 'bg-white' : 'bg-brand-500'].join(' ')}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-muted">
            {selectedDay ? 'Nenhum agendamento neste dia.' : 'Nenhum agendamento.'}
          </p>
        )}
        {filtered.map((a) => (
          <div
            key={a.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700"
          >
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

      <Modal open={creating} onClose={() => setCreating(false)} title="Novo agendamento">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted block mb-1">Cliente (opcional)</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            >
              <option value="">— Sem cliente —</option>
              {clientsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Nome *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Reunião de alinhamento"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Serviço</label>
            <input
              value={servico}
              onChange={(e) => setServico(e.target.value)}
              placeholder="Ex: Apresentação"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Data e hora *</label>
            <input
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Observação</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => setCreating(false)}
              className="px-4 py-2 rounded-xl text-sm text-muted"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
