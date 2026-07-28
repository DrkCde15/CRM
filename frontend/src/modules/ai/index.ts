import { lazy } from 'react'
import type { Module } from '../../core/types/module'

const AIChat = lazy(() => import('./pages/AIChat'))
const Agents = lazy(() => import('./pages/Agents'))
const MCPConfig = lazy(() => import('./pages/MCPConfig'))

export const aiModule: Module = {
  id: 'ai',
  name: 'Mochi AI',
  description: 'Assistente inteligente, agentes e integração MCP',
  icon: 'Bot',
  order: 10,
  routes: [
    { path: '/ai', element: AIChat },
    { path: '/ai/agents', element: Agents },
    { path: '/ai/mcp', element: MCPConfig },
  ],
}