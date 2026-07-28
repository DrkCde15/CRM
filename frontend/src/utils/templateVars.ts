export const TEMPLATE_VARS = [
  { token: '{{cliente.nome}}', label: 'Nome do cliente' },
  { token: '{{cliente.telefone}}', label: 'Telefone do cliente' },
  { token: '{{agente.nome}}', label: 'Nome do agente' },
  { token: '{{data}}', label: 'Data (curta)' },
  { token: '{{hora}}', label: 'Hora atual' },
  { token: '{{hoje}}', label: 'Data completa' },
  { token: '{{empresa}}', label: 'Nome da empresa' },
]

export function resolveTemplateVars(
  text: string,
  ctx: {
    clientName?: string | null
    clientPhone?: string | null
    userName?: string | null
    companyName?: string | null
  },
): string {
  const now = new Date()
  const dataCurta = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
  const hoje = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return text
    .replace(/\{\{cliente\.nome\}\}/g, ctx.clientName || 'Cliente')
    .replace(/\{\{cliente\.telefone\}\}/g, ctx.clientPhone || '')
    .replace(/\{\{cliente\}\}/g, ctx.clientName || 'Cliente')
    .replace(/\{\{agente\.nome\}\}/g, ctx.userName || 'Agente')
    .replace(/\{\{agente\}\}/g, ctx.userName || 'Agente')
    .replace(/\{\{empresa\}\}/g, ctx.companyName || '')
    .replace(/\{\{data\}\}/g, dataCurta)
    .replace(/\{\{hora\}\}/g, hora)
    .replace(/\{\{hoje\}\}/g, hoje)
}
