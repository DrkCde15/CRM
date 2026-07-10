import axios, { type AxiosError } from 'axios'
import type {
  Appointment,
  Client,
  Conversation,
  NotificationList,
  Paginated,
  Stats,
  Ticket,
  User,
} from './types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
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
  conversations: async (id: number) =>
    (await api.get<Conversation[]>(`/clients/${id}/conversations`)).data,
}

export const tickets = {
  list: async (skip = 0, limit = 50) =>
    (await api.get<Paginated<Ticket>>('/tickets', { params: { skip, limit } })).data,
  push: async (id: number) => (await api.post(`/tickets/${id}/push`)).data,
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

export default api
