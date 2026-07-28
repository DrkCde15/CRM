import { NavLink } from 'react-router-dom'
import { Workflow, Gauge, Webhook, Calendar, ArrowRight, type LucideIcon } from 'lucide-react'
import { PageHeader } from '../core/components/layout/PageHeader'
import { cn } from '../core/utils/cn'

interface AutomationCard {
  title: string
  description: string
  path: string
  icon: LucideIcon
  color: string
}

const cards: AutomationCard[] = [
  {
    title: 'Workflows',
    description: 'Automatize processos com fluxos condicionais e ações inteligentes.',
    path: '/workflows',
    icon: Workflow,
    color: 'bg-violet-500',
  },
  {
    title: 'SLA',
    description: 'Defina acordos de nível de serviço e monitore violações.',
    path: '/sla',
    icon: Gauge,
    color: 'bg-amber-500',
  },
  {
    title: 'Webhooks',
    description: 'Configure notificações e integrações em tempo real.',
    path: '/webhooks',
    icon: Webhook,
    color: 'bg-blue-500',
  },
  {
    title: 'Calendário',
    description: 'Sincronize compromissos com Google Calendar.',
    path: '/calendar',
    icon: Calendar,
    color: 'bg-emerald-500',
  },
]

export default function Automations() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <PageHeader title="Automações" description="Configure fluxos automáticos e integrações." />

      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <NavLink
              key={card.path}
              to={card.path}
              className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-brand-200 transition-all duration-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-brand-600"
            >
              <div className="flex items-start gap-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', card.color)}>
                  <Icon size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink dark:text-slate-100 mb-1">{card.title}</h3>
                  <p className="text-sm text-muted">{card.description}</p>
                </div>
                <ArrowRight size={18} className="text-muted group-hover:text-brand-600 transition-colors shrink-0 mt-2" />
              </div>
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
