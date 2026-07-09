export interface User {
  id: number
  email: string
  name: string
  role: string
  created_at: string
}

export interface Client {
  id: number
  phone: string
  name: string
  estado: string
  created_at: string
}

export interface Conversation {
  id: number
  client_id: number
  message: string
  response: string
  type: string
  created_at: string
}

export interface Ticket {
  id: number
  client_id: number
  titulo: string
  descricao: string
  tipo: string
  status: string
  taky_task_id: number | null
  created_at: string
}

export interface Appointment {
  id: number
  client_id: number
  name: string
  servico: string
  data_hora: string
  observacao: string
  status: string
  created_at: string
}

export interface Stats {
  total_clients: number
  total_conversations: number
  total_tickets: number
  total_appointments: number
  conversations_today: number
  tickets_today: number
  tickets_by_status: Record<string, number>
}
