import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../api'

const roles = [
  { value: 'admin', label: 'Administrador', desc: 'Acesso total e gestão de usuários' },
  { value: 'agent', label: 'Usuário normal', desc: 'Atendimento e operação do CRM' },
]

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('agent')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.register({ name, email, password, role })
      navigate('/login')
    } catch {
      setError('Não foi possível criar a conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-9 h-9 rounded-xl bg-brand-500 grid place-items-center text-white font-bold">C</span>
          <h1 className="text-lg font-semibold text-ink">Criar conta</h1>
        </div>
        <label className="block text-sm text-muted mb-1">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm"
          placeholder="Seu nome"
        />
        <label className="block text-sm text-muted mb-1">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm"
          placeholder="voce@empresa.com"
        />
        <label className="block text-sm text-muted mb-1">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm"
          placeholder="••••••"
        />
        <label className="block text-sm text-muted mb-2">Tipo de conta</label>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {roles.map((r) => (
            <button
              type="button"
              key={r.value}
              onClick={() => setRole(r.value)}
              className={`text-left rounded-xl border p-3 transition ${
                role === r.value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-sm font-medium text-ink">{r.label}</div>
              <div className="text-xs text-muted mt-0.5">{r.desc}</div>
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition disabled:opacity-60"
        >
          {loading ? 'Criando...' : 'Criar conta'}
        </button>
        <p className="text-sm text-muted mt-4 text-center">
          Já tem conta?{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  )
}
