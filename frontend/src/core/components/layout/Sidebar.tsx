import { NavLink } from 'react-router-dom'
import { useAuth, useTheme } from '../../../store'
import { cn } from '../../utils/cn'
import {
  MessageSquare, Users, Ticket, Calendar, LayoutDashboard,
  Settings, Bot, FileText, Activity, UserCircle,
  Globe, Workflow, Gauge, Building2, Webhook,
  Sun, Moon, X, LogOut, type LucideIcon,
} from 'lucide-react'

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  adminOnly?: boolean
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Clientes', path: '/clients', icon: Users },
  { label: 'Conversas', path: '/inbox', icon: MessageSquare },
  { label: 'Chamados', path: '/tickets', icon: Ticket },
  { label: 'Agendamentos', path: '/appointments', icon: Calendar },
]

const aiNav: NavItem[] = [
  { label: 'Mochi AI', path: '/ai', icon: Bot },
  { label: 'Agentes', path: '/ai/agents', icon: Activity },
  { label: 'Servidores MCP', path: '/ai/mcp', icon: Globe },
  { label: 'Chatbot', path: '/ai/chatbot', icon: MessageSquare },
]

const toolsNav: NavItem[] = [
  { label: 'Documentos', path: '/documents', icon: FileText },
  { label: 'Automações', path: '/automations', icon: Workflow },
]

const adminNav: NavItem[] = [
  { label: 'Canais', path: '/channels', icon: Settings, adminOnly: true },
  { label: 'Webhooks', path: '/webhooks', icon: Webhook, adminOnly: true },
  { label: 'SLA', path: '/sla', icon: Gauge, adminOnly: true },
  { label: 'Tarefas', path: '/calendar', icon: Calendar, adminOnly: true },
  { label: 'Usuários', path: '/users', icon: UserCircle, adminOnly: true },
  { label: 'Empresas', path: '/companies', icon: Building2, adminOnly: true },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const user = useAuth((s) => s.user)
  const { dark, toggleDark } = useTheme()
  const { logout } = useAuth()

  return (
    <>
      {/* Mobile sidebar - slide in */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo + Close */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <img src="/logo.png" alt="Mochi" className="w-8 h-8 rounded-xl object-contain" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-ink dark:text-slate-100">Mochi</span>
            <span className="text-[10px] text-muted block leading-tight">Plataforma Inteligente</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-muted hover:bg-surface dark:hover:bg-slate-800 transition" aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
          <NavGroup title="Principal" items={mainNav} />
          <NavGroup title="Inteligência Artificial" items={aiNav} />
          <NavGroup title="Ferramentas" items={toolsNav} />
          <NavGroup title="Administração" items={adminNav} />
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-3 flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted hover:text-ink hover:bg-surface dark:hover:bg-slate-800 transition flex-1"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            <span className="text-xs">{dark ? 'Modo claro' : 'Modo escuro'}</span>
          </button>
          {user && (
            <button
              onClick={() => { logout(); onClose() }}
              className="p-2 rounded-xl text-muted hover:text-red-500 hover:bg-surface dark:hover:bg-slate-800 transition"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  const user = useAuth((s) => s.user)
  const filtered = items.filter((item) => !item.adminOnly || user?.role === 'admin')
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
          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden group',
          isActive
            ? 'text-brand-700 dark:text-brand-300'
            : 'text-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-100',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active indicator bar */}
          <span
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full transition-all duration-300',
              isActive ? 'bg-brand-500 scale-y-100' : 'scale-y-0',
            )}
          />

          {/* Hover bg */}
          <span
            className={cn(
              'absolute inset-0 rounded-xl transition-all duration-200',
              isActive
                ? 'bg-brand-50 dark:bg-brand-700/20'
                : 'group-hover:bg-surface dark:group-hover:bg-slate-800/50',
            )}
          />

          <Icon size={18} className="shrink-0 relative z-10" />
          <span className="relative z-10">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}
