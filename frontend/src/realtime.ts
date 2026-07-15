const base = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const wsBase = base.replace(/^http/, 'ws')

const handlers = new Map<string, () => void>()
let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function token(): string | null {
  return localStorage.getItem('crm_token')
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    ensureConnected()
  }, 3000)
}

export function ensureConnected() {
  const t = token()
  if (!t) return
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }

  const ws = new WebSocket(`${wsBase}/ws?token=${t}`)
  socket = ws

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'refresh' && msg.resource) {
        handlers.get(msg.resource)?.()
      }
    } catch {
      /* ignore malformed messages */
    }
  }

  ws.onclose = () => {
    socket = null
    if (token()) scheduleReconnect()
  }

  ws.onerror = () => {
    ws.close()
  }
}

export function registerRealtime(resource: string, cb: () => void): () => void {
  handlers.set(resource, cb)
  ensureConnected()
  return () => {
    handlers.delete(resource)
  }
}
