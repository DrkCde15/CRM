import api from '../../../api'

export const aiApi = {
  chat: async (conversationId: string, message: string, agent?: string) => {
    const { data } = await api.post('/ai/chat', { conversation_id: conversationId, message, agent })
    return data
  },
  conversations: async () => {
    const { data } = await api.get('/ai/conversations')
    return data
  },
  conversation: async (id: string) => {
    const { data } = await api.get(`/ai/conversations/${id}`)
    return data
  },
  deleteConversation: async (id: string) => {
    await api.delete(`/ai/conversations/${id}`)
  },
  agents: async () => {
    const { data } = await api.get('/ai/agents')
    return data
  },
  updateAgent: async (id: string, body: Partial<import('../types').Agent>) => {
    const { data } = await api.put(`/ai/agents/${id}`, body)
    return data
  },
  mcpClients: async () => {
    const { data } = await api.get('/ai/mcp')
    return data
  },
  createMCPClient: async (body: Partial<import('../types').MCPClient>) => {
    const { data } = await api.post('/ai/mcp', body)
    return data
  },
  updateMCPClient: async (id: string, body: Partial<import('../types').MCPClient>) => {
    const { data } = await api.put(`/ai/mcp/${id}`, body)
    return data
  },
  insights: async () => {
    const { data } = await api.get('/ai/insights')
    return data
  },
  analyze: async (text: string) => {
    const { data } = await api.post('/ai/analyze', { text })
    return data
  },
  suggest: async (context: string[], channel = 'email') => {
    const { data } = await api.post('/ai/suggest', { context, channel })
    return data.suggestions as string[]
  },
}