import { useAuth, useTheme } from '../../../store'
import { Avatar } from '../ui/Avatar'
import { Sun, Moon, Search } from 'lucide-react'

interface TopbarProps {
  title: string
  onSearchClick?: () => void
}

export function Topbar({ title, onSearchClick }: TopbarProps) {
  const { user } = useAuth()
  const { dark, toggleDark } = useTheme()

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-6 gap-4 sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-ink dark:text-slate-100">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface text-muted text-sm hover:bg-slate-200/60 dark:bg-slate-700 dark:hover:bg-slate-600 transition w-56"
        >
          <Search size={15} />
          <span className="text-xs">Pesquisar...</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-muted">
            Ctrl+K
          </kbd>
        </button>

        <button
          onClick={toggleDark}
          className="grid place-items-center w-9 h-9 rounded-xl text-muted hover:bg-surface dark:text-slate-300 dark:hover:bg-slate-700 transition"
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {user && <Avatar name={user.name} size="sm" />}
      </div>
    </header>
  )
}
