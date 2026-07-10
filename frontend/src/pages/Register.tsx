import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth, ApiError } from '../api'
import { useToasts } from '../store'
import { passwordErrors } from '../utils/validation'

const roles = [
  { value: 'admin', label: 'Administrador', desc: 'Acesso total e gestão de usuários' },
  { value: 'agent', label: 'Usuário normal', desc: 'Atendimento e operação do CRM' },
]

export default function Register() {
  const { push } = useToasts()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('agent')
  const [loading, setLoading] = useState(false)

  const pwErrors = passwordErrors(password)
  const match = password === confirm && confirm !== ''
  const valid = pwErrors.length === 0 && match

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setLoading(true)
    try {
      await auth.register({ name, email, password, role })
      push('success', 'Conta criada. Faça login.')
      navigate('/login')
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Não foi possível criar a conta')
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
          <h1 className="text-lg font-semibold text-ink">Criar conta</h1>
        </div>
        <label className="block text-sm text-muted mb-1">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
          placeholder="Seu nome"
        />
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
          className="w-full mb-2 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
          placeholder="••••••"
        />
        {password && (
          <ul className="mb-3 text-xs space-y-0.5">
            {pwErrors.map((err) => (
              <li key={err} className="text-red-500">
                • {err}
              </li>
            ))}
            {pwErrors.length === 0 && <li className="text-emerald-600">• Senha válida</li>}
          </ul>
        )}
        <label className="block text-sm text-muted mb-1">Confirmar senha</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
          placeholder="••••••"
        />
        {confirm && !match && <p className="text-xs text-red-500 mb-3">As senhas não coincidem</p>}
        <label className="block text-sm text-muted mb-2">Tipo de conta</label>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {roles.map((r) => (
            <button
              type="button"
              key={r.value}
              onClick={() => setRole(r.value)}
              className={`text-left rounded-xl border p-3 transition ${
                role === r.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-700/20'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
              }`}
            >
              <div className="text-sm font-medium text-ink">{r.label}</div>
              <div className="text-xs text-muted mt-0.5">{r.desc}</div>
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={loading || !valid}
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
