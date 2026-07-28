export type Provider = 'groq' | 'openai' | 'anthropic' | 'gemini' | 'ollama'

export interface Agent {
  id: string
  name: string
  description: string
  icon: string
  provider: Provider
  model: string
  systemPrompt: string
  temperature: number
  tools: string[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface MCPClient {
  id: string
  name: string
  serverUrl: string
  image: string
  containerName: string
  containerId: string
  type: 'github' | 'gitlab' | 'postgresql' | 'mysql' | 'redis' | 'google_drive' | 'gmail' | 'outlook' | 'notion' | 'jira' | 'custom'
  port: number
  status: 'running' | 'stopped' | 'error'
  enabled: boolean
  envVars: Record<string, string>
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  agent?: string
  metadata?: Record<string, any>
}

export interface ChatConversation {
  id: string
  title: string
  agent?: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface AITool {
  id: string
  name: string
  description: string
  category: 'query' | 'document' | 'email' | 'calendar' | 'crm' | 'analytics' | 'automation'
  enabled: boolean
}

export interface AIInsight {
  id: string
  type: 'summary' | 'alert' | 'suggestion' | 'prediction'
  title: string
  description: string
  module: string
  priority: 'low' | 'medium' | 'high'
  createdAt: string
}