import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notifications as notificationsApi, ApiError } from '../api'
import { useToasts } from '../store'
import type { NotificationList } from '../types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.floor(h / 24)} d`
}

export default function NotificationBell() {
  const [data, setData] = useState<NotificationList>({ items: [], unread_count: 0 })
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { push } = useToasts()

  const load = useCallback(async () => {
    try {
      setData(await notificationsApi.list())
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao carregar notificações')
    }
  }, [push])

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const markRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id)
      setData((d) => ({
        ...d,
        unread_count: Math.max(0, d.unread_count - 1),
        items: d.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }))
    } catch {
      /* ignore */
    }
  }

  const openItem = (id: number, link: string | null) => {
    setOpen(false)
    if (link) navigate(link)
    markRead(id)
  }

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead()
      setData((d) => ({ ...d, unread_count: 0, items: d.items.map((n) => ({ ...n, read: true })) }))
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificações"
        title="Notificações"
        className="relative grid place-items-center w-9 h-9 rounded-xl text-muted hover:bg-surface dark:text-slate-300 dark:hover:bg-slate-700 transition"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {data.unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold grid place-items-center">
            {data.unread_count > 99 ? '99+' : data.unread_count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg z-20 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <span className="font-semibold text-sm text-ink dark:text-slate-100">Notificações</span>
            {data.unread_count > 0 && (
              <button
                onClick={markAll}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          {data.items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">Nenhuma notificação.</div>
          ) : (
            <ul>
              {data.items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openItem(n.id, n.link)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-surface dark:border-slate-700 dark:hover:bg-slate-700 transition ${
                      n.read ? '' : 'bg-brand-50/40 dark:bg-brand-700/10'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink dark:text-slate-100 truncate">
                          {n.title}
                        </div>
                        {n.body && <div className="text-xs text-muted line-clamp-2">{n.body}</div>}
                        <div className="text-[11px] text-muted mt-0.5">{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
