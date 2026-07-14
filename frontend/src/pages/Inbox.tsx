import { useEffect, useState } from 'react'
import { inbox as inboxApi, clients, emailChannel, websiteChat } from '../api'
import type {
  Conversation,
  EmailConversation,
  InboxItem,
  WebsiteMessage,
} from '../types'

const CHANNELS: { key: string; label: string; icon: string }[] = [
  { key: '', label: 'Todos', icon: '📥' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { key: 'email', label: 'E-mail', icon: '✉️' },
  { key: 'website', label: 'Website', icon: '🌐' },
]

type Detail =
  | { kind: 'whatsapp'; items: Conversation[] }
  | { kind: 'email'; conv: EmailConversation }
  | { kind: 'website'; items: WebsiteMessage[] }
  | null

function fmt(ts: string | null) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Inbox() {
  const [channel, setChannel] = useState('')
  const [list, setList] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<InboxItem | null>(null)
  const [detail, setDetail] = useState<Detail>(null)
  const [reply, setReply] = useState('')

  const load = async (ch: string) => {
    setLoading(true)
    try {
      setList(await inboxApi.list(ch || undefined))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(channel)
    const t = setInterval(() => load(channel), 6000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel])

  const openItem = async (item: InboxItem) => {
    setSelected(item)
    setReply('')
    if (item.channel === 'whatsapp' && item.client_id) {
      setDetail({ kind: 'whatsapp', items: await clients.conversations(item.client_id) })
    } else if (item.channel === 'email') {
      setDetail({ kind: 'email', conv: await emailChannel.conversation(item.conversation_id) })
    } else if (item.channel === 'website') {
      setDetail({ kind: 'website', items: await websiteChat.history(item.conversation_id) })
    }
  }

  const sendReply = async () => {
    if (!reply.trim() || !selected || !detail) return
    const text = reply.trim()
    setReply('')
    if (detail.kind === 'email' && detail.conv.messages.length) {
      const last = detail.conv.messages[detail.conv.messages.length - 1]
      const to = last.sender
      await emailChannel.send({
        conversation_id: detail.conv.id,
        to,
        subject: detail.conv.subject,
        body_text: text,
        in_reply_to: last.message_id,
      })
      setDetail({ kind: 'email', conv: await emailChannel.conversation(detail.conv.id) })
    } else if (detail.kind === 'website') {
      await websiteChat.send(selected.conversation_id, text)
      setDetail({ kind: 'website', items: await websiteChat.history(selected.conversation_id) })
    }
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)] grid grid-cols-[340px_1fr]">
      <aside className="border-r border-slate-200 bg-white overflow-y-auto flex flex-col dark:bg-slate-800 dark:border-slate-700">
        <div className="p-3 flex gap-1 flex-wrap border-b border-slate-100 dark:border-slate-700">
          {CHANNELS.map((c) => (
            <button
              key={c.key}
              onClick={() => setChannel(c.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                channel === c.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface text-muted hover:bg-surface/70 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        {loading && <p className="p-4 text-sm text-muted">Carregando...</p>}
        {!loading && list.length === 0 && (
          <p className="p-4 text-sm text-muted">Nenhuma conversa neste canal.</p>
        )}
        {list.map((it) => (
          <button
            key={`${it.channel}-${it.conversation_id}`}
            onClick={() => openItem(it)}
            className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-surface transition dark:border-slate-700 ${
              selected?.conversation_id === it.conversation_id && selected?.channel === it.channel
                ? 'bg-brand-50 dark:bg-brand-700/20'
                : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{CHANNELS.find((c) => c.key === it.channel)?.icon}</span>
              <span className="text-sm font-medium text-ink truncate flex-1">
                {it.subject || '(sem assunto)'}
              </span>
              {it.status && (
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-muted dark:bg-slate-700">
                  {it.status}
                </span>
              )}
            </div>
            <div className="text-xs text-muted truncate mt-0.5">{it.last_message}</div>
            <div className="text-[10px] text-muted mt-0.5">{fmt(it.last_at)}</div>
          </button>
        ))}
      </aside>

      <section className="flex flex-col bg-surface">
        {!selected || !detail ? (
          <div className="grid place-items-center text-muted text-sm flex-1">
            Selecione uma conversa
          </div>
        ) : detail.kind === 'whatsapp' ? (
          <>
            <Header title={selected.subject} sub={selected.last_message} />
            <Thread>
              {detail.items.map((m) => (
                <Bubble key={m.id} who={m.response ? 'agent' : 'client'} text={m.response || m.message} ts={m.created_at} />
              ))}
            </Thread>
            <ReplyBox value={reply} onChange={setReply} onSend={sendReply} />
          </>
        ) : detail.kind === 'email' ? (
          <>
            <Header title={detail.conv.subject} sub={`${detail.conv.messages.length} mensagens`} />
            <Thread>
              {detail.conv.messages.map((m) => (
                <Bubble
                  key={m.id}
                  who={m.direction === 'outbound' ? 'agent' : 'client'}
                  text={m.body_text || m.body_html.replace(/<[^>]+>/g, '')}
                  ts={m.created_at}
                  meta={m.direction === 'outbound' ? `Para: ${m.recipient}` : `De: ${m.sender}`}
                />
              ))}
            </Thread>
            <ReplyBox value={reply} onChange={setReply} onSend={sendReply} />
          </>
        ) : (
          <>
            <Header title={`Chat #${detail.items.length ? selected.conversation_id : ''}`} sub={`${detail.items.length} mensagens`} />
            <Thread>
              {detail.items.map((m) => (
                <Bubble
                  key={m.id}
                  who={m.sender === 'agent' ? 'agent' : 'client'}
                  text={m.message}
                  ts={m.created_at}
                />
              ))}
            </Thread>
            <ReplyBox value={reply} onChange={setReply} onSend={sendReply} />
          </>
        )}
      </section>
    </div>
  )
}

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="px-6 py-4 bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
      <div className="font-medium text-ink truncate">{title}</div>
      <div className="text-xs text-muted truncate">{sub}</div>
    </div>
  )
}

function Thread({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">{children}</div>
}

function Bubble({
  who,
  text,
  ts,
  meta,
}: {
  who: 'agent' | 'client'
  text: string
  ts: string
  meta?: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${who === 'agent' ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 text-sm rounded-2xl ${
          who === 'agent'
            ? 'bg-brand-600 text-white rounded-tr-sm'
            : 'bg-white border border-slate-200 text-ink rounded-tl-sm dark:bg-slate-700 dark:text-slate-100'
        }`}
      >
        {text}
      </div>
      <div className="text-[10px] text-muted">
        {meta ? `${meta} · ` : ''}
        {fmt(ts)}
      </div>
    </div>
  )
}

function ReplyBox({
  value,
  onChange,
  onSend,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
}) {
  return (
    <div className="p-4 bg-white border-t border-slate-200 flex gap-2 dark:bg-slate-800 dark:border-slate-700">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSend()}
        placeholder="Responder..."
        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
      />
      <button
        onClick={onSend}
        className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
      >
        Enviar
      </button>
    </div>
  )
}
