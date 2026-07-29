import { useState, useEffect } from 'react'
import { Plus, Server, Trash2, Power, PowerOff, RotateCcw } from 'lucide-react'
import { Card, CardContent } from '../../../core/components/ui/Card'
import { Badge } from '../../../core/components/ui/Badge'
import { Button } from '../../../core/components/ui/Button'
import { Modal } from '../../../core/components/ui/Modal'
import { Input } from '../../../core/components/ui/Input'
import { aiApi } from '../services/api'
import type { MCPClient } from '../types'
import { PageHeader } from '../../../core/components/layout/PageHeader'

const mcpIcons: Record<string, string> = {
  github: '🐙', gitlab: '🦊', postgresql: '🐘', mysql: '🐬',
  redis: '🔴', google_drive: '📁', gmail: '📧', outlook: '📨',
  notion: '📝', jira: '🔧', custom: '🔌',
}

const statusColor: Record<string, string> = {
  running: 'bg-emerald-500',
  stopped: 'bg-slate-300',
  error: 'bg-red-500',
}

export default function MCPConfig() {
  const [clients, setClients] = useState<MCPClient[]>([])
  const [showNew, setShowNew] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => setClients(await aiApi.mcpClients())

  const doDelete = async (id: string) => {
    if (!confirm('Excluir este servidor MCP?')) return
    setBusy(id)
    try {
      await aiApi.deleteMCPClient(id)
      await load()
    } finally { setBusy(null) }
  }

  const doToggle = async (client: MCPClient) => {
    setBusy(client.id)
    try {
      await aiApi.updateMCPClient(client.id, { enabled: !client.enabled })
      await load()
    } finally { setBusy(null) }
  }

  const doRestart = async (id: string) => {
    setBusy(id)
    try {
      await aiApi.restartMCPClient(id)
      await load()
    } finally { setBusy(null) }
  }

  const editing = clients.find((c) => c.id === editId) || null

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader
        title="Servidores MCP"
        description="Gerencie servidores de contexto via Docker ou URL externa."
        actions={
          <Button onClick={() => { setEditId(null); setShowNew(true) }}>
            <Plus size={16} />
            Novo servidor
          </Button>
        }
      />

      <div className="grid gap-3">
        {clients.map((client) => (
          <Card key={client.id}>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface dark:bg-slate-700 flex items-center justify-center text-lg shrink-0">
                  {mcpIcons[client.type] || <Server size={18} className="text-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${statusColor[client.status] || 'bg-slate-300'}`} />
                    <span className="font-medium text-ink dark:text-slate-100">{client.name}</span>
                    <Badge variant={client.enabled ? 'success' : 'default'} size="sm">
                      {client.enabled ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted mt-0.5 truncate">
                    {client.image && `📦 ${client.image}`}
                    {client.image && client.serverUrl && ' · '}
                    {client.serverUrl && `🔗 ${client.serverUrl}`}
                    {client.containerName && ` · 🐳 ${client.containerName}`}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {client.status === 'running' && (
                    <button onClick={() => doRestart(client.id)}
                      disabled={busy === client.id}
                      className="p-2 rounded-lg text-muted hover:bg-surface dark:hover:bg-slate-700 disabled:opacity-40"
                      title="Reiniciar container">
                      <RotateCcw size={15} />
                    </button>
                  )}
                  <button onClick={() => doToggle(client)}
                    disabled={busy === client.id}
                    className="p-2 rounded-lg text-muted hover:bg-surface dark:hover:bg-slate-700 disabled:opacity-40"
                    title={client.enabled ? 'Desativar' : 'Ativar'}>
                    {client.enabled ? <PowerOff size={15} /> : <Power size={15} />}
                  </button>
                  <button onClick={() => { setEditId(client.id); setShowNew(true) }}
                    className="p-2 rounded-lg text-muted hover:bg-surface dark:hover:bg-slate-700"
                    title="Editar">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                  <button onClick={() => doDelete(client.id)}
                    disabled={busy === client.id}
                    className="p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-700/20 disabled:opacity-40"
                    title="Excluir">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {clients.length === 0 && (
        <div className="text-center py-20 text-muted text-sm">
          Nenhum servidor MCP configurado.
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title={editing ? 'Editar Servidor MCP' : 'Novo Servidor MCP'}>
        <MCPForm
          initial={editing}
          onDone={() => { setShowNew(false); setEditId(null); load() }}
          onCancel={() => { setShowNew(false); setEditId(null) }}
        />
      </Modal>
    </div>
  )
}

function MCPForm({ initial, onDone, onCancel }: { initial: MCPClient | null; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name || '')
  const [type, setType] = useState(initial?.type || 'custom')
  const [image, setImage] = useState(initial?.image || '')
  const [port, setPort] = useState(initial?.port || 3000)
  const [serverUrl, setServerUrl] = useState(initial?.serverUrl || '')
  const [envKeys, setEnvKeys] = useState<string[]>(
    initial ? Object.keys(initial.envVars || {}) : []
  )
  const [envVals, setEnvVals] = useState<Record<string, string>>(initial?.envVars || {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addEnv = () => {
    setEnvKeys([...envKeys, ''])
  }
  const updateEnvKey = (i: number, k: string) => {
    const newKeys = [...envKeys]
    newKeys[i] = k
    setEnvKeys(newKeys)
  }
  const updateEnvVal = (k: string, v: string) => {
    setEnvVals({ ...envVals, [k]: v })
  }
  const removeEnv = (i: number) => {
    const newKeys = envKeys.filter((_, idx) => idx !== i)
    setEnvKeys(newKeys)
  }

  const handle = async () => {
    if (!name) { setError('Nome é obrigatório'); return }
    setSaving(true)
    setError('')
    try {
      const body: any = { name, type, image, port, serverUrl, envVars: envVals }
      if (initial) {
        await aiApi.updateMCPClient(initial.id, body)
      } else {
        await aiApi.createMCPClient(body)
      }
      onDone()
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Meu servidor" />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-ink dark:text-slate-100">Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-ink dark:text-slate-100">
          <option value="github">GitHub</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="redis">Redis</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <Input label="Imagem Docker (opcional)" value={image} onChange={(e) => setImage(e.target.value)}
        placeholder="ex: ghcr.io/my-org/mcp-server:latest" />

      <Input label="Porta" type="number" value={String(port)} onChange={(e) => setPort(parseInt(e.target.value) || 0)}
        placeholder="3000" />

      <Input label="URL do Servidor (opcional se usar Docker)" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)}
        placeholder="https://meu-servidor-mcp.com" />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-ink dark:text-slate-100">Variáveis de ambiente</label>
          <button onClick={addEnv} className="text-xs text-brand-600 hover:text-brand-700">+ Adicionar</button>
        </div>
        {envKeys.map((k, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input value={k} onChange={(e) => updateEnvKey(i, e.target.value)}
              placeholder="CHAVE"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input value={envVals[k] || ''} onChange={(e) => updateEnvVal(k, e.target.value)}
              placeholder="valor"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600" />
            <button onClick={() => removeEnv(i)} className="px-2 text-muted hover:text-red-500">✕</button>
          </div>
        ))}
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-700/20 px-3 py-2 rounded-lg">{error}</div>}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handle} loading={saving} disabled={!name}>
          {initial ? 'Salvar' : 'Adicionar'}
        </Button>
      </div>
    </div>
  )
}
