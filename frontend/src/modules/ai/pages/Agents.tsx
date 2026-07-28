import { useState, useEffect } from 'react'
import { Bot, Settings, Power, PowerOff, MessageSquare } from 'lucide-react'
import { cn } from '../../../core/utils/cn'
import { Card, CardContent } from '../../../core/components/ui/Card'
import { Badge } from '../../../core/components/ui/Badge'
import { Button } from '../../../core/components/ui/Button'
import { aiApi } from '../services/api'
import type { Agent } from '../types'

const agentIcons: Record<string, string> = {
  'comercial': '💼',
  'atendimento': '💬',
  'financeiro': '💰',
  'marketing': '📢',
  'rh': '👥',
  'administrativo': '📋',
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    aiApi.agents().then(setAgents)
  }, [])

  const toggleAgent = async (agent: Agent) => {
    await aiApi.updateAgent(agent.id, { enabled: !agent.enabled })
    setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, enabled: !a.enabled } : a))
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink dark:text-slate-100">Agentes</h1>
          <p className="text-sm text-muted mt-1">Gerencie seus assistentes de IA especializados</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} hover className="relative overflow-hidden">
            <CardContent>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-700/20 flex items-center justify-center text-lg">
                    {agentIcons[agent.id] || <Bot size={20} className="text-brand-600" />}
                  </div>
                  <div>
                    <div className="font-semibold text-ink dark:text-slate-100">{agent.name}</div>
                    <Badge variant={agent.enabled ? 'success' : 'default'} size="sm">
                      {agent.enabled ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => toggleAgent(agent)}
                  className={cn(
                    'p-2 rounded-lg transition',
                    agent.enabled
                      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-700/20'
                      : 'text-muted bg-surface dark:bg-slate-700',
                  )}
                >
                  {agent.enabled ? <Power size={16} /> : <PowerOff size={16} />}
                </button>
              </div>
              <p className="text-sm text-muted mb-3 line-clamp-2">{agent.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {agent.tools.map((tool) => (
                  <span key={tool} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px] text-muted">
                    {tool}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>{agent.provider}</span>
                <span>·</span>
                <span className="truncate">{agent.model}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-20 text-muted text-sm">
          Nenhum agente configurado. Configure os agentes nas configurações do sistema.
        </div>
      )}
    </div>
  )
}