import axios from 'axios'
import type { Appointment, Client, Conversation, Stats, Ticket } from './types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const auth = {
  login: async (email: string, password: string) => {
    const form = new URLSearchParams({ username: email, password })
    const { data } = await api.post('/auth/login', form)
    return data.access_token as string
  },
  register: async (body: { email: string; name: string; password: string; role?: string }) => {
    const { data } = await api.post('/auth/register', body)
    return data as { id: number; email: string; name: string; role: string }
  },
}

export const clients = {
  list: async () => (await api.get<Client[]>('/clients')).data,
  conversations: async (id: number) =>
    (await api.get<Conversation[]>(`/clients/${id}/conversations`)).data,
}

export const tickets = {
  list: async () => (await api.get<Ticket[]>('/tickets')).data,
  push: async (id: number) => (await api.post(`/tickets/${id}/push`)).data,
}

export const appointments = {
  list: async () => (await api.get<Appointment[]>('/appointments')).data,
}

export const stats = {
  get: async () => (await api.get<Stats>('/stats')).data,
}

export default api
