import { useEffect, useState } from 'react'
import { clients } from '../api'
import type { Client, Conversation } from '../types'
import ChatBubble from '../components/ChatBubble'

const PAGE = 50

export default function Inbox() {
  const [list, setList] = useState<Client[]>([])
  const [selected, setSelected] = useState<Client | null>(null)
  const [thread, setThread] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [skip, setSkip] = useState(0)
  const [total, setTotal] = useState(0)

  const loadClients = async (s: number) => {
    const data = await clients.list(s, PAGE)
    setList(data.items)
    setTotal(data.total)
    setLoading(false)
    if (!selected && data.items.length) setSelected(data.items[0])
  }

  const loadThread = async (id: number) => {
    setThread(await clients.conversations(id))
  }

  useEffect(() => {
    loadClients(skip)
    const t = setInterval(() => loadClients(skip), 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip])

  useEffect(() => {
    if (!selected) return
    loadThread(selected.id)
    const t = setInterval(() => loadThread(selected.id), 4000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)] grid grid-cols-[320px_1fr]">
      <aside className="border-r border-slate-200 bg-white overflow-y-auto flex flex-col dark:bg-slate-800 dark:border-slate-700">
        <div className="p-4 text-sm font-semibold text-ink border-b border-slate-100 dark:border-slate-700">
          Conversas
        </div>
        {loading && <p className="p-4 text-sm text-muted">Carregando...</p>}
        {!loading && list.length === 0 && (
          <p className="p-4 text-sm text-muted">Nenhuma conversa ainda.</p>
        )}
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-surface transition dark:border-slate-700 ${
              selected?.id === c.id ? 'bg-brand-50 dark:bg-brand-700/20' : ''
            }`}
          >
            <div className="text-sm font-medium text-ink truncate">
              {c.name || c.phone.replace('@s.whatsapp.net', '')}
            </div>
            <div className="text-xs text-muted">{c.estado}</div>
          </button>
        ))}
        <div className="mt-auto p-3 flex items-center justify-between border-t border-slate-100 text-sm dark:border-slate-700">
          <button
            disabled={skip === 0}
            onClick={() => setSkip(Math.max(0, skip - PAGE))}
            className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-surface dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Anterior
          </button>
          <span className="text-xs text-muted">{total} no total</span>
          <button
            disabled={skip + PAGE >= total}
            onClick={() => setSkip(skip + PAGE)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-surface dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Próxima
          </button>
        </div>
      </aside>

      <section className="flex flex-col bg-surface">
        {!selected ? (
          <div className="grid place-items-center text-muted text-sm flex-1">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <div className="px-6 py-4 bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
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
