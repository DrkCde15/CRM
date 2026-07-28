import { type ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  badge?: number
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition',
            active === tab.id
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-surface text-muted hover:bg-surface/70 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.badge !== undefined && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}