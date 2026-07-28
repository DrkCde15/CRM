import { useEffect, useState } from 'react'
import { calendarApi } from '../api'
import { useToasts } from '../store'
import { PageHeader } from '../core/components/layout/PageHeader'

interface ScheduledJob {
  id: number
  name: string
  task_type: string
  task_type_label: string
  interval_minutes: number
  active: boolean
  last_run_at: string | null
  created_at: string | null
}

const TASK_TYPES = [
  { value: 'sla_check', label: 'Verificação de SLA' },
  { value: 'appointment_reminder', label: 'Lembrete de agendamentos' },
  { value: 'cleanup', label: 'Limpeza de dados' },
]

export default function CalendarSettings() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<ScheduledJob | null>(null)
  const [runBusy, setRunBusy] = useState<number | null>(null)
  const { push } = useToasts()

  const load = async () => {
    try {
      setJobs(await calendarApi.listJobs())
    } catch {
      push('error', 'Erro ao carregar tarefas')
    }
  }
  useEffect(() => { load() }, [])

  const doRunNow = async (id: number) => {
    setRunBusy(id)
    try {
      await calendarApi.runNow(id)
      push('success', 'Tarefa executada')
      await load()
    } catch (e: any) {
      push('error', e?.response?.data?.detail || 'Erro ao executar')
    } finally {
      setRunBusy(null)
    }
  }

  const doDelete = async (id: number) => {
    if (!confirm('Excluir esta tarefa?')) return
    try {
      await calendarApi.deleteJob(id)
      await load()
      push('success', 'Tarefa excluída')
    } catch {
      push('error', 'Erro ao excluir')
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <PageHeader
        title="Tarefas Agendadas"
        description="Gerencie tarefas automáticas executadas em segundo plano."
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="px-3 py-1.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            Nova tarefa
          </button>
        }
      />

      {jobs.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center dark:bg-slate-800 dark:border-slate-700">
          <div className="text-3xl mb-2">⏰</div>
          <p className="text-sm text-muted">
            Nenhuma tarefa agendada. Crie tarefas como verificação de SLA ou limpeza de dados.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {jobs.map((j) => (
          <div
            key={j.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${j.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-ink">{j.name}</div>
                <div className="text-xs text-muted">
                  {j.task_type_label} · a cada {j.interval_minutes} min
                  {j.last_run_at && ` · última execução: ${new Date(j.last_run_at).toLocaleString('pt-BR')}`}
                </div>
              </div>
              <button
                onClick={() => doRunNow(j.id)}
                disabled={runBusy === j.id}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-ink hover:bg-surface disabled:opacity-50 dark:border-slate-600 dark:text-slate-100"
              >
                {runBusy === j.id ? 'Executando...' : 'Executar'}
              </button>
              <button
                onClick={() => setEditing(j)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-brand-600"
              >
                Editar
              </button>
              <button
                onClick={() => doDelete(j.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {(showNew || editing) && (
        <JobModal
          job={editing}
          onClose={() => { setShowNew(false); setEditing(null) }}
          onDone={() => { setShowNew(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function JobModal({ job, onClose, onDone }: { job: ScheduledJob | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(job?.name || '')
  const [taskType, setTaskType] = useState(job?.task_type || 'sla_check')
  const [intervalMin, setIntervalMin] = useState(job?.interval_minutes || 60)
  const [active, setActive] = useState(job?.active ?? true)
  const [busy, setBusy] = useState(false)
  const { push } = useToasts()

  const handle = async () => {
    if (!name) { push('error', 'Preencha o nome da tarefa'); return }
    setBusy(true)
    try {
      if (job) {
        await calendarApi.updateJob(job.id, { name, task_type: taskType, interval_minutes: intervalMin, active })
      } else {
        await calendarApi.createJob({ name, task_type: taskType, interval_minutes: intervalMin })
      }
      push('success', job ? 'Tarefa atualizada' : 'Tarefa criada')
      onDone()
    } catch (e: any) {
      push('error', e?.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={onClose}>
      <div
        className="w-[460px] max-w-[92vw] bg-white rounded-2xl shadow-xl p-5 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink mb-4">{job ? 'Editar' : 'Nova'} tarefa agendada</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted block mb-1">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600"
              placeholder="Ex: Verificar SLA" />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Tipo</label>
            <select value={taskType} onChange={(e) => setTaskType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600">
              {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Intervalo (minutos)</label>
            <input type="number" value={intervalMin} onChange={(e) => setIntervalMin(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>

          {job && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={active} onChange={(e) => setActive(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600" />
              <label htmlFor="active" className="text-sm text-muted">Ativo</label>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted">Cancelar</button>
          <button onClick={handle} disabled={busy}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50">
            {busy ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
