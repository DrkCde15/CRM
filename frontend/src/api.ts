import axios, { type AxiosError } from 'axios'
import type {
  Appointment,
  CannedResponse,
  Client,
  Conversation,
  EmailAccount,
  EmailConversation,
  GatewayStatus,
  InboxItem,
  NotificationList,
  Paginated,
  Stats,
  Ticket,
  User,
} from './types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ detail?: string }>) => {
    const detail = err.response?.data?.detail || err.message || 'Erro de conexão'
    return Promise.reject(new ApiError(detail, err.response?.status || 0))
  },
)

export const auth = {
  login: async (email: string, password: string) => {
    const form = new URLSearchParams({ username: email, password })
    const { data } = await api.post('/auth/login', form)
    return data.access_token as string
  },
  register: async (body: { email: string; name: string; password: string; role?: string }) => {
    const { data } = await api.post('/auth/register', body)
    return data as User
  },
  me: async () => (await api.get<User>('/auth/me')).data,
  users: async () => (await api.get<User[]>('/auth/users')).data,
  forgotPassword: async (email: string) =>
    (await api.post('/auth/forgot-password', { email })).data,
  resetPassword: async (token: string, password: string) =>
    (await api.post('/auth/reset-password', { token, password })).data,
}

export const clients = {
  list: async (skip = 0, limit = 50) =>
    (await api.get<Paginated<Client>>('/clients', { params: { skip, limit } })).data,
  search: async (search: string, skip = 0, limit = 50) =>
    (await api.get<Paginated<Client>>('/clients', { params: { skip, limit, search } })).data,
  export: async (search = '', format = 'csv') => {
    const ext = format === 'xlsx' ? 'xlsx' : format
    const { data } = await api.get<Blob>('/clients/export', {
      params: { search, formato: format },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `clientes.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
  import: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return (await api.post('/clients/import', fd)).data
  },
  batchDelete: async (ids: number[]) =>
    (await api.post('/clients/batch/delete', { ids })).data,
  conversations: async (id: number) =>
    (await api.get<Conversation[]>(`/clients/${id}/conversations`)).data,
}

export const tickets = {
  list: async (skip = 0, limit = 50) =>
    (await api.get<Paginated<Ticket>>('/tickets', { params: { skip, limit } })).data,
  push: async (id: number) => (await api.post(`/tickets/${id}/push`)).data,
  batchStatus: async (ids: number[], status: string) =>
    (await api.post('/tickets/batch/status', { ids, status })).data,
  batchDelete: async (ids: number[]) =>
    (await api.post('/tickets/batch/delete', { ids })).data,
}

export const appointments = {
  list: async () => (await api.get<Appointment[]>('/appointments')).data,
}

export const stats = {
  get: async () => (await api.get<Stats>('/stats')).data,
}

export const notifications = {
  list: async () => (await api.get<NotificationList>('/notifications')).data,
  markRead: async (id: number) => (await api.post(`/notifications/${id}/read`)).data,
  markAllRead: async () => (await api.post('/notifications/read-all')).data,
}

export const inbox = {
  list: async (channel?: string, includeArchived = false) =>
    (await api.get<InboxItem[]>('/inbox', {
      params: { ...(channel ? { channel } : {}), ...(includeArchived ? { include_archived: true } : {}) },
    })).data,
  channels: async () => (await api.get<Record<string, unknown>>('/inbox/channels')).data,
  markRead: async (id: number) =>
    (await api.patch<{ ok: boolean; read: boolean }>(`/inbox/whatsapp/${id}/read`)).data,
  archive: async (id: number) =>
    (await api.patch<{ ok: boolean; archived: boolean }>(`/inbox/whatsapp/${id}/archive`)).data,
  unarchive: async (id: number) =>
    (await api.patch<{ ok: boolean; archived: boolean }>(`/inbox/whatsapp/${id}/unarchive`)).data,
  gatewayStatus: async () => (await api.get<GatewayStatus>('/inbox/gateway-status')).data,
}

export const emailChannel = {
  accounts: async () => (await api.get<EmailAccount[]>('/email/accounts')).data,
  create: async (body: Partial<EmailAccount> & { password?: string }) =>
    (await api.post<EmailAccount>('/email/accounts', body)).data,
  update: async (id: number, body: Partial<EmailAccount> & { password?: string }) =>
    (await api.put<EmailAccount>(`/email/accounts/${id}`, body)).data,
  remove: async (id: number) => (await api.delete(`/email/accounts/${id}`)).data,
  conversations: async (skip = 0, limit = 50) =>
    (await api.get<Paginated<EmailConversation>>('/email/conversations', {
      params: { skip, limit },
    })).data,
  conversation: async (id: number) =>
    (await api.get<EmailConversation>(`/email/conversations/${id}`)).data,
  send: async (body: {
    conversation_id?: number
    account_id?: number
    to: string
    subject?: string
    body_html?: string
    body_text?: string
    cc?: string
    bcc?: string
    in_reply_to?: string
  }) => (await api.post('/email/send', body)).data,
  sync: async (id: number) => (await api.post(`/email/sync/${id}`)).data,
  syncAll: async () => (await api.post('/email/sync')).data,
}

export const canned = {
  list: async (kind: 'quick_reply' | 'macro') =>
    (await api.get<CannedResponse[]>(kind === 'quick_reply' ? '/quick-replies' : '/macros'))
      .data,
  create: async (body: { kind: 'quick_reply' | 'macro'; title: string; content: string }) =>
    (
      await api.post<CannedResponse>(
        body.kind === 'quick_reply' ? '/quick-replies' : '/macros',
        body,
      )
    ).data,
  update: async (
    kind: 'quick_reply' | 'macro',
    id: number,
    body: { title?: string; content?: string },
  ) =>
    (
      await api.put<CannedResponse>(
        `${kind === 'quick_reply' ? '/quick-replies' : '/macros'}/${id}`,
        body,
      )
    ).data,
  remove: async (kind: 'quick_reply' | 'macro', id: number) =>
    (await api.delete(`${kind === 'quick_reply' ? '/quick-replies' : '/macros'}/${id}`)).data,
}

export const calendarApi = {
  listJobs: async () => (await api.get('/calendar/jobs')).data,
  createJob: async (body: { name: string; task_type: string; interval_minutes: number; config?: any }) =>
    (await api.post('/calendar/jobs', body)).data,
  updateJob: async (id: number, body: any) =>
    (await api.put(`/calendar/jobs/${id}`, body)).data,
  deleteJob: async (id: number) =>
    (await api.delete(`/calendar/jobs/${id}`)).data,
  runNow: async (id: number) =>
    (await api.post(`/calendar/jobs/${id}/run-now`)).data,
}

export const companiesApi = {
  list: async () => (await api.get('/companies')).data,
  get: async (id: number) => (await api.get(`/companies/${id}`)).data,
  stats: async (id: number) => (await api.get(`/companies/${id}/stats`)).data,
  update: async (id: number, body: any) => (await api.put(`/companies/${id}`, body)).data,
}

export const slaApi = {
  listRules: async () => (await api.get('/sla/rules')).data,
  createRule: async (body: any) => (await api.post('/sla/rules', body)).data,
  updateRule: async (id: number, body: any) => (await api.put(`/sla/rules/${id}`, body)).data,
  deleteRule: async (id: number) => (await api.delete(`/sla/rules/${id}`)).data,
  check: async () => (await api.post('/sla/check')).data,
  breached: async () => (await api.get('/sla/breached')).data,
}

export const webhooksApi = {
  list: async () => (await api.get('/webhooks')).data,
  create: async (body: { name: string; url: string; events: string }) =>
    (await api.post('/webhooks', body)).data,
  update: async (id: number, body: any) =>
    (await api.put(`/webhooks/${id}`, body)).data,
  remove: async (id: number) =>
    (await api.delete(`/webhooks/${id}`)).data,
}

export const workflowsApi = {
  list: async () => (await api.get('/workflows')).data,
  create: async (body: { name: string; event: string; conditions?: any; actions: any }) =>
    (await api.post('/workflows', body)).data,
  update: async (id: number, body: any) =>
    (await api.put(`/workflows/${id}`, body)).data,
  remove: async (id: number) =>
    (await api.delete(`/workflows/${id}`)).data,
}

export default api
