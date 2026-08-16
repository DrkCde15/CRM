import { useEffect, useState } from 'react'
import { auth, ApiError } from '../api'
import { useAuth, useToasts } from '../store'
import { Avatar } from '../core/components/ui/Avatar'
import { Button } from '../core/components/ui/Button'
import { Card, CardContent, CardHeader } from '../core/components/ui/Card'
import { Input } from '../core/components/ui/Input'

export default function Profile() {
  const { user, setUser, loadUser } = useAuth()
  const { push } = useToasts()

  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  // Garante que os dados do usuário autenticado estejam carregados.
  useEffect(() => {
    if (user) return
    loadUser()
      .catch(() => push('error', 'Não foi possível carregar os dados do perfil'))
      .finally(() => {
        if (!useAuth.getState().user) setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Preenche o formulário com os dados reais assim que o usuário chega.
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setLoading(false)
    }
  }, [user])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    try {
      const updated = await auth.updateProfile({ name, email })
      setUser(updated)
      push('success', 'Perfil atualizado com sucesso')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao atualizar perfil'
      push('error', msg)
    } finally {
      setProfileSaving(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (next !== confirm) {
      push('error', 'A nova senha e a confirmação não coincidem')
      return
    }
    setPwSaving(true)
    try {
      await auth.updateProfile({ current_password: current, new_password: next })
      push('success', 'Senha alterada com sucesso')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao alterar senha'
      push('error', msg)
    } finally {
      setPwSaving(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 text-muted">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Carregando perfil…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={user.name || user.email || '?'} size="lg" />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-ink dark:text-slate-100 truncate">
            {user.name}
          </h1>
          <p className="text-sm text-muted truncate">{user.email}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 capitalize">
            {user.role}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Dados do perfil</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <Input
              id="name"
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
            <Input
              id="email"
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
            />
            <div className="flex justify-end">
              <Button type="submit" loading={profileSaving}>
                Salvar perfil
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Alterar senha</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <Input
              id="current"
              label="Senha atual"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
            />
            <Input
              id="next"
              label="Nova senha"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Mín. 8 caracteres, com maiúscula, minúscula e número"
            />
            <Input
              id="confirm"
              label="Confirmar nova senha"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
            <div className="flex justify-end">
              <Button type="submit" loading={pwSaving} disabled={!current || !next || !confirm}>
                Alterar senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
