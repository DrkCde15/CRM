import { useEffect, useState } from 'react'
import { clients } from '../api'
import type { Client, Conversation } from '../types'
import ChatBubble from '../components/ChatBubble'

export default function Inbox() {
  const [list, setList] = useState<Client[]>([])
  const [selected, setSelected] = useState<Client | null>(null)
  const [thread, setThread] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const loadClients = async () => {
    const data = await clients.list()
    setList(data)
    setLoading(false)
    if (!selected && data.length) setSelected(data[0])
  }

  const loadThread = async (id: number) => {
    setThread(await clients.conversations(id))
  }

  useEffect(() => {
    loadClients()
    const t = setInterval(loadClients, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selected) return
    loadThread(selected.id)
    const t = setInterval(() => loadThread(selected.id), 4000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)] grid grid-cols-[320px_1fr]">
      <aside className="border-r border-slate-200 bg-white overflow-y-auto">
        <div className="p-4 text-sm font-semibold text-ink border-b border-slate-100">Conversas</div>
        {loading && <p className="p-4 text-sm text-muted">Carregando...</p>}
        {!loading && list.length === 0 && (
          <p className="p-4 text-sm text-muted">Nenhuma conversa ainda.</p>
        )}
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-surface transition ${
              selected?.id === c.id ? 'bg-brand-50' : ''
            }`}
          >
            <div className="text-sm font-medium text-ink truncate">
              {c.name || c.phone.replace('@s.whatsapp.net', '')}
            </div>
            <div className="text-xs text-muted">{c.estado}</div>
          </button>
        ))}
      </aside>

      <section className="flex flex-col bg-surface">
        {!selected ? (
          <div className="grid place-items-center text-muted text-sm flex-1">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <div className="px-6 py-4 bg-white border-b border-slate-200">
              <div className="font-medium text-ink">
                {selected.name || selected.phone.replace('@s.whatsapp.net', '')}
              </div>
              <div className="text-xs text-muted">{selected.phone}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
              {thread.map((m) => (
                <ChatBubble key={m.id} item={m} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
