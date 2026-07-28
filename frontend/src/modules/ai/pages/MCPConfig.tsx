import { useState, useEffect } from 'react'
import { Plus, Server, Trash2, Power, PowerOff } from 'lucide-react'
import { Card, CardContent } from '../../../core/components/ui/Card'
import { Badge } from '../../../core/components/ui/Badge'
import { Button } from '../../../core/components/ui/Button'
import { Modal } from '../../../core/components/ui/Modal'
import { Input } from '../../../core/components/ui/Input'
import { aiApi } from '../services/api'
import type { MCPClient } from '../types'

const mcpIcons: Record<string, string> = {
  github: '🐙', gitlab: '🦊', postgresql: '🐘', mysql: '🐬',
  redis: '🔴', google_drive: '📁', gmail: '📧', outlook: '📨',
  notion: '📝', jira: '🔧', custom: '🔌',
}

export default function MCPConfig() {
  const [clients, setClients] = useState<MCPClient[]>([])
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', serverUrl: '', type: 'custom' as MCPClient['type'] })

  useEffect(() => {
    aiApi.mcpClients().then(setClients)
  }, [])

  const createClient = async () => {
    await aiApi.createMCPClient(form)
    setClients(await aiApi.mcpClients())
    setShowNew(false)
    setForm({ name: '', serverUrl: '', type: 'custom' })
  }

  const toggleClient = async (client: MCPClient) => {
    await aiApi.updateMCPClient(client.id, { enabled: !client.enabled })
    setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, enabled: !c.enabled } : c))
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink dark:text-slate-100">Servidores MCP</h1>
          <p className="text-sm text-muted mt-1">Gerencie servidores de contexto e APIs externas</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus size={16} />
          Novo servidor
        </Button>
      </div>

      <div className="grid gap-3">
        {clients.map((client) => (
          <Card key={client.id}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface dark:bg-slate-700 flex items-center justify-center text-lg">
                    {mcpIcons[client.type] || <Server size={18} className="text-muted" />}
                  </div>
                  <div>
                    <div className="font-medium text-ink dark:text-slate-100">{client.name}</div>
                    <div className="text-xs text-muted">{client.serverUrl}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={client.enabled ? 'success' : 'default'}>
                    {client.enabled ? 'Conectado' : 'Desconectado'}
                  </Badge>
                  <button
                    onClick={() => toggleClient(client)}
                    className="p-2 rounded-lg text-muted hover:bg-surface dark:hover:bg-slate-700"
                  >
                    {client.enabled ? <PowerOff size={15} /> : <Power size={15} />}
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

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Novo Servidor MCP">
        <div className="space-y-4">
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Meu servidor"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-ink dark:text-slate-100">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as MCPClient['type'] })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-ink dark:text-slate-100"
            >
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="redis">Redis</option>
              <option value="google_drive">Google Drive</option>
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook</option>
              <option value="notion">Notion</option>
              <option value="jira">Jira</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <Input
            label="URL do Servidor"
            value={form.serverUrl}
            onChange={(e) => setForm({ ...form, serverUrl: e.target.value })}
            placeholder="https://meu-servidor-mcp.com"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={createClient} disabled={!form.name || !form.serverUrl}>Adicionar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}