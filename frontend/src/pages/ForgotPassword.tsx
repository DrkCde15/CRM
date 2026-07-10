import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth, ApiError } from '../api'
import { useToasts } from '../store'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { push } = useToasts()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await auth.forgotPassword(email)
      setSent(true)
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao enviar e-mail')
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
          <h1 className="text-lg font-semibold text-ink">Recuperar senha</h1>
        </div>
        {sent ? (
          <div className="text-sm text-muted space-y-4">
            <p>
              Se o e-mail existir, enviamos as instruções de redefinição. Verifique sua caixa de
              entrada.
            </p>
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-4">
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
            <label className="block text-sm text-muted mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-5 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              placeholder="voce@empresa.com"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
            <p className="text-sm text-muted mt-4 text-center">
              <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
                Voltar ao login
              </Link>
            </p>
          </>
        )}
      </form>
    </div>
  )
}
