import { NavLink } from 'react-router-dom'
import {
  MessageSquare, Users, Ticket, Calendar, LayoutDashboard,
  Settings, Bot, FileText, Zap, Activity, UserCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../utils/cn'

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  module?: string
  adminOnly?: boolean
}

const mainNav: NavItem[] = [
  { label: 'Conversas', path: '/inbox', icon: MessageSquare, module: 'inbox' },
  { label: 'Clientes', path: '/clients', icon: Users, module: 'crm' },
  { label: 'Chamados', path: '/tickets', icon: Ticket, module: 'tickets' },
  { label: 'Agendamentos', path: '/appointments', icon: Calendar, module: 'appointments' },
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, module: 'dashboard' },
]

const aiNav: NavItem[] = [
  { label: 'Mochi AI', path: '/ai', icon: Bot, module: 'ai' },
  { label: 'Agentes', path: '/ai/agents', icon: Activity, module: 'ai' },
]

const toolsNav: NavItem[] = [
  { label: 'Documentos', path: '/documents', icon: FileText, module: 'documents' },
  { label: 'Automações', path: '/automations', icon: Zap, module: 'automations' },
]

const adminNav: NavItem[] = [
  { label: 'Canais', path: '/channels', icon: Settings, module: 'channels', adminOnly: true },
  { label: 'Usuários', path: '/users', icon: UserCircle, module: 'users', adminOnly: true },
]

export function Sidebar() {
  return (
    <aside className="w-60 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
          C
        </div>
        <div>
          <span className="font-semibold text-ink dark:text-slate-100">Mochi</span>
          <span className="text-[10px] text-muted block leading-tight">Plataforma Inteligente</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
        <NavGroup title="Principal" items={mainNav} />
        <NavGroup title="Inteligência Artificial" items={aiNav} />
        <NavGroup title="Ferramentas" items={toolsNav} />
        <NavGroup title="Administração" items={adminNav} />
      </nav>
    </aside>
  )
}

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  const userRole = localStorage.getItem('crm_role') || 'agent'
  const filtered = items.filter((item) => !item.adminOnly || userRole === 'admin')

  if (filtered.length === 0) return null

  return (
    <div>
      <div className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {title}
      </div>
      <div className="space-y-0.5">
        {filtered.map((item) => (
          <NavItemComponent key={item.path} item={item} />
        ))}
      </div>
    </div>
  )
}

function NavItemComponent({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/ai'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition',
          isActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-300'
            : 'text-muted hover:text-ink hover:bg-surface dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800',
        )
      }
    >
      <Icon size={18} className="shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  )
}
