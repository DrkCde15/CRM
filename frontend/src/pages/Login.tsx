import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth, ApiError } from '../api'
import { useAuth } from '../store'
import { useToasts } from '../store'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const setToken = useAuth((s) => s.setToken)
  const { push } = useToasts()
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = await auth.login(email, password)
      setToken(token)
      navigate('/inbox')
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-8 shadow-sm dark:bg-slate-800 dark:border-slate-700"
      >
        <div className="flex items-center gap-2 mb-6">
          <span className="w-9 h-9 rounded-xl bg-brand-500 grid place-items-center text-white font-bold">
            C
          </span>
          <h1 className="text-lg font-semibold text-ink">Entrar no CRM</h1>
        </div>
        <label className="block text-sm text-muted mb-1">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
          placeholder="voce@empresa.com"
        />
        <label className="block text-sm text-muted mb-1">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-5 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
          placeholder="••••••"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition disabled:opacity-60"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="text-sm text-muted mt-4 text-center">
          Não tem conta?{' '}
          <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">
            Criar conta
          </Link>
        </p>
        <p className="text-sm text-muted mt-2 text-center">
          <Link to="/forgot-password" className="text-brand-600 hover:text-brand-700 font-medium">
            Esqueci minha senha
          </Link>
        </p>
      </form>
    </div>
  )
}
