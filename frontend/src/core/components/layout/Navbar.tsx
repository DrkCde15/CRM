import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, LogOut, Menu, Moon, Sun, User as UserIcon } from 'lucide-react'
import { useAuth, useTheme } from '../../../store'
import { notifications as notifApi } from '../../../api'
import { registerRealtime } from '../../../realtime'
import { Avatar } from '../ui/Avatar'
import { Dropdown } from '../ui/Dropdown'
import type { AppNotification } from '../../../types'

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'agora'
  const m = Math.floor(diff / 60)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

interface NavbarProps {
  onToggleSidebar: () => void
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth()
  const { dark, toggleDark } = useTheme()
  const navigate = useNavigate()

  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const data = await notifApi.list()
      setItems(data.items)
      setUnread(data.unread_count)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load()
    const off = registerRealtime('notifications', load)
    return off
  }, [])

  useEffect(() => {
    if (!bellOpen) return
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [bellOpen])

  const openNotif = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await notifApi.markRead(n.id)
      } catch {
        /* ignore */
      }
      setUnread((u) => Math.max(0, u - 1))
    }
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    if (n.link) navigate(n.link)
    setBellOpen(false)
  }

  const markAll = async () => {
    try {
      await notifApi.markAllRead()
    } catch {
      /* ignore */
    }
    setUnread(0)
    setItems((prev) => prev.map((x) => ({ ...x, read: true })))
  }

  const userMenu = [
    {
      label: 'Perfil',
      icon: <UserIcon size={16} />,
      onClick: () => navigate('/profile'),
    },
    {
      label: 'Sair',
      icon: <LogOut size={16} />,
      danger: true,
      onClick: () => {
        logout()
        navigate('/login')
      },
    },
  ]

  return (
    <header className="h-14 shrink-0 flex items-center gap-2 px-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:px-6">
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 rounded-xl text-muted hover:bg-surface dark:hover:bg-slate-800 transition"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <img src="/logo.png" alt="Mochi" className="lg:hidden w-7 h-7 rounded-lg object-contain" />
      <span className="lg:hidden text-sm font-semibold text-ink dark:text-slate-100">Mochi</span>

      <div className="flex-1" />

      <button
        onClick={toggleDark}
        className="p-2 rounded-xl text-muted hover:bg-surface dark:hover:bg-slate-800 transition"
        aria-label="Alternar tema"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="relative" ref={bellRef}>
        <button
          onClick={() => setBellOpen((o) => !o)}
          className="relative p-2 rounded-xl text-muted hover:bg-surface dark:hover:bg-slate-800 transition"
          aria-label="Notificações"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {bellOpen && (
          <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-sm font-semibold text-ink dark:text-slate-100">Notificações</span>
              {unread > 0 && (
                <button
                  onClick={markAll}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  <Check size={13} /> Marcar lidas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted">Nenhuma notificação</div>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openNotif(n)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700/60 transition hover:bg-surface dark:hover:bg-slate-700/50 ${
                      n.read ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink dark:text-slate-100 truncate">{n.title}</p>
                        <p className="text-xs text-muted line-clamp-2">{n.body}</p>
                        <p className="text-[11px] text-muted mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <Dropdown
        align="right"
        trigger={
          <div className="flex items-center gap-2 p-1 rounded-xl hover:bg-surface dark:hover:bg-slate-800 transition cursor-pointer">
            <Avatar name={user?.name || user?.email || '?'} size="sm" />
            <span className="hidden md:block text-sm text-ink dark:text-slate-100 max-w-[140px] truncate">
              {user?.name || user?.email}
            </span>
          </div>
        }
        items={userMenu}
      />
    </header>
  )
}
