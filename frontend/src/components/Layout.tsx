import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../store'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const links = [
    { to: '/inbox', label: 'Conversas' },
    { to: '/tickets', label: 'Chamados' },
    { to: '/appointments', label: 'Agendamentos' },
    { to: '/dashboard', label: 'Dashboard' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-8 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-brand-500 grid place-items-center text-white font-bold">C</span>
          <span className="font-semibold text-ink">CRM · Atendimento</span>
        </div>
        <nav className="flex gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-medium transition ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-muted hover:bg-surface'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="ml-auto text-sm text-muted hover:text-ink"
        >
          Sair
        </button>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
