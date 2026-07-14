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
  tipo?: string | null
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
  channels: {
    whatsapp: { conversations: number; messages: number }
    email: { conversations: number; messages: number }
    website: { conversations: number; messages: number; open: number; closed: number }
  }
  tickets_converted: number
}

export interface EmailAccount {
  id: number
  company_id: number
  provider: string
  email: string
  display_name: string
  smtp_host: string
  smtp_port: number
  imap_host: string
  imap_port: number
  username: string
  google_script_url: string
  active: boolean
  created_at: string
}

export interface EmailMessage {
  id: number
  conversation_id: number
  sender: string
  recipient: string
  cc: string
  bcc: string
  body_html: string
  body_text: string
  attachments: { filename: string; content_type: string; size: number; path: string }[]
  message_id: string
  in_reply_to: string
  direction: string
  created_at: string
}

export interface EmailConversation {
  id: number
  client_id: number | null
  ticket_id: number | null
  subject: string
  thread_id: string
  account_id: number
  created_at: string
  messages: EmailMessage[]
}

export interface WebsiteMessage {
  id: number
  conversation_id: number
  sender: string
  message: string
  attachments: { filename: string }[]
  created_at: string
}

export interface WebsiteConversation {
  id: number
  visitor_id: number
  ticket_id: number | null
  assigned_user: number | null
  status: string
  started_at: string
  closed_at: string | null
  messages: WebsiteMessage[]
}

export interface WidgetConfig {
  id: number
  company_id: number
  name: string
  logo_url: string
  primary_color: string
  welcome_message: string
  agent_avatar_url: string
  business_hours: Record<string, unknown>
  position: string
  language: string
  icon_url: string
  theme: string
  api_token: string
  created_at: string
  updated_at: string
}

export interface InboxItem {
  channel: 'whatsapp' | 'email' | 'website'
  conversation_id: number
  subject: string
  last_message: string
  last_at: string | null
  status: string
  client_id?: number | null
  ticket_id?: number | null
  client_tipo?: string | null
  read: boolean
  archived: boolean
}

export interface GatewayStatus {
  connected: boolean
  detail: string
}

export interface CannedResponse {
  id: number
  company_id: number
  kind: 'quick_reply' | 'macro'
  title: string
  content: string
  created_at: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

export interface AppNotification {
  id: number
  title: string
  body: string
  link: string | null
  read: boolean
  created_at: string
}

export interface NotificationList {
  items: AppNotification[]
  unread_count: number
}
