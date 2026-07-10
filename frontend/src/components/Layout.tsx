import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth, useTheme } from '../store'
import Toaster from './Toaster'

function ThemeToggle() {
  const { dark, toggleDark } = useTheme()
  return (
    <button
      onClick={toggleDark}
      aria-label="Alternar tema"
      title={dark ? 'Modo claro' : 'Modo escuro'}
      className="grid place-items-center w-9 h-9 rounded-xl text-muted hover:bg-surface dark:text-slate-300 dark:hover:bg-slate-700 transition"
    >
      {dark ? (
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
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
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
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout, user, loadUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user === null) loadUser()
  }, [user, loadUser])

  const links = [
    { to: '/inbox', label: 'Conversas' },
    { to: '/tickets', label: 'Chamados' },
    { to: '/appointments', label: 'Agendamentos' },
    { to: '/dashboard', label: 'Dashboard' },
  ]
  if (user?.role === 'admin') {
    links.push({ to: '/users', label: 'Usuários' })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-8 sticky top-0 z-10 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-brand-500 grid place-items-center text-white font-bold">
            C
          </span>
          <span className="font-semibold text-ink dark:text-slate-100">CRM · Atendimento</span>
        </div>
        <nav className="flex gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-300'
                    : 'text-muted hover:bg-surface dark:text-slate-300 dark:hover:bg-slate-700'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="text-sm text-muted hover:text-ink dark:text-slate-300 dark:hover:text-white"
          >
            Sair
          </button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Toaster />
    </div>
  )
}
