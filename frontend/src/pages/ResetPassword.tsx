import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { auth, ApiError } from '../api'
import { useToasts } from '../store'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { push } = useToasts()
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      push('error', 'As senhas não coincidem')
      return
    }
    setLoading(true)
    try {
      await auth.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Não foi possível redefinir')
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
          <img src="/logo.png" alt="Convexo" className="w-9 h-9 rounded-xl object-contain" />
          <h1 className="text-lg font-semibold text-ink">Nova senha</h1>
        </div>
        {done ? (
          <p className="text-sm text-muted">Senha redefinida! Redirecionando ao login...</p>
        ) : !token ? (
          <div className="text-sm text-muted space-y-4">
            <p>Link de redefinição inválido ou ausente.</p>
            <Link to="/forgot-password" className="text-brand-600 hover:text-brand-700 font-medium">
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <>
            <label className="block text-sm text-muted mb-1">Nova senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mb-4 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              placeholder="Mín. 8, maiúscula, minúscula e número"
            />
            <label className="block text-sm text-muted mb-1">Confirmar senha</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full mb-5 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              placeholder="••••••"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition disabled:opacity-60"
            >
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
          </>
        )}
        <p className="text-sm text-muted mt-4 text-center">
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
            Voltar ao login
          </Link>
        </p>
      </form>
    </div>
  )
}
