import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { auth } from '../api'
import { ApiError } from '../api'
import type { User } from '../types'
import { useAuth } from '../store'
import { useToasts } from '../store'

export default function Users() {
  const { user } = useAuth()
  const { push } = useToasts()
  const [list, setList] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'agent'>('agent')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    try {
      setList(await auth.users())
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (user && user.role !== 'admin') return <Navigate to="/inbox" replace />

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await auth.register({ name, email, password, role })
      push('success', 'Usuário criado')
      setName('')
      setEmail('')
      setPassword('')
      setRole('agent')
      await load()
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Erro ao criar usuário')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-lg font-semibold text-ink mb-4">Usuários</h1>

      <form
        onSubmit={create}
        className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 grid grid-cols-2 gap-3 dark:bg-slate-800 dark:border-slate-700"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          className="px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'admin' | 'agent')}
          className="px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
        >
          <option value="agent">Usuário normal</option>
          <option value="admin">Administrador</option>
        </select>
        <button
          type="submit"
          disabled={creating}
          className="col-span-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-60"
        >
          {creating ? 'Criando...' : 'Criar usuário'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="text-left font-medium px-4 py-3">Nome</th>
                <th className="text-left font-medium px-4 py-3">E-mail</th>
                <th className="text-left font-medium px-4 py-3">Perfil</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="px-4 py-3 text-ink">{u.name || '—'}</td>
                  <td className="px-4 py-3 text-ink">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}
                    >
                      {u.role === 'admin' ? 'Admin' : 'Agente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
