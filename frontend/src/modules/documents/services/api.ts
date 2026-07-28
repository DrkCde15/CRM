import api from '../../../api'

export const documentsApi = {
  list: async () => {
    const { data } = await api.get('/documents')
    return data
  },
  upload: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/documents/upload', form)
    return data
  },
  get: async (id: number) => {
    const { data } = await api.get(`/documents/${id}`)
    return data
  },
  delete: async (id: number) => {
    await api.delete(`/documents/${id}`)
  },
  analyze: async (id: number) => {
    const { data } = await api.post(`/documents/${id}/analyze`)
    return data
  },
  ask: async (id: number, question: string) => {
    const { data } = await api.post(`/documents/${id}/ask`, { question })
    return data
  },
}
