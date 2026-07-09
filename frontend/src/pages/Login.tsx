import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../api'
import { useAuth } from '../store'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setToken = useAuth((s) => s.setToken)
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = await auth.login(email, password)
      setToken(token)
      navigate('/inbox')
    } catch {
      setError('Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-9 h-9 rounded-xl bg-brand-500 grid place-items-center text-white font-bold">C</span>
          <h1 className="text-lg font-semibold text-ink">Entrar no CRM</h1>
        </div>
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
          className="w-full mb-5 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm"
          placeholder="••••••"
        />
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition disabled:opacity-60"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
