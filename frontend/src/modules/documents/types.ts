export interface Document {
  id: number
  company_id: number
  name: string
  type: 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt'
  size: number
  status: 'processing' | 'ready' | 'error'
  summary?: string
  created_at: string
  updated_at: string
}

export interface DocumentAnalysis {
  id: number
  document_id: number
  summary: string
  key_points: string[]
  entities: { name: string; type: string; count: number }[]
  questions: { question: string; answer: string }[]
}
