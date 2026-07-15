import { useEffect, useState } from 'react'
import { inbox as inboxApi, clients, emailChannel, websiteChat, canned } from '../api'
import { registerRealtime } from '../realtime'
import type {
  Conversation,
  CannedResponse,
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

const tipoLabel: Record<string, string> = { empresa: 'Empresa', pessoa: 'Pessoa' }

function tipoTxt(v?: string | null) {
  if (!v) return null
  return tipoLabel[v] || v
}

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
  const [includeArchived, setIncludeArchived] = useState(false)
  const [list, setList] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [selected, setSelected] = useState<InboxItem | null>(null)
  const [detail, setDetail] = useState<Detail>(null)
  const [reply, setReply] = useState('')

  const [quick, setQuick] = useState<CannedResponse[]>([])
  const [macros, setMacros] = useState<CannedResponse[]>([])
  const [showMgr, setShowMgr] = useState(false)

  const loadCanned = async () => {
    setQuick(await canned.list('quick_reply'))
    setMacros(await canned.list('macro'))
  }

  const load = async (ch: string, archived: boolean) => {
    setLoading(true)
    try {
      setList(await inboxApi.list(ch || undefined, archived))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(channel, includeArchived)
    loadCanned()
    return registerRealtime('inbox', () => load(channel, includeArchived))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, includeArchived])

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

  const markRead = async (id: number) => {
    setBusyId(id)
    try {
      await inboxApi.markRead(id)
      await load(channel, includeArchived)
    } finally {
      setBusyId(null)
    }
  }
  const toggleArchive = async (item: InboxItem) => {
    setBusyId(item.conversation_id)
    try {
      if (item.archived) await inboxApi.unarchive(item.conversation_id)
      else await inboxApi.archive(item.conversation_id)
      await load(channel, includeArchived)
    } finally {
      setBusyId(null)
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
          <button
            onClick={() => setShowMgr(true)}
            title="Gerenciar respostas rápidas e macros"
            className="ml-auto px-3 py-1.5 rounded-xl text-xs font-medium bg-surface text-muted hover:bg-surface/70 dark:bg-slate-700 dark:text-slate-300"
          >
            ⚡ Respostas
          </button>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 text-xs text-muted dark:border-slate-700">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-slate-300"
          />
          Incluir arquivadas
        </label>
        {loading && (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-slate-300 border-t-brand-600 animate-spin" />
            Carregando...
          </div>
        )}
        {!loading && list.length === 0 && (
          <p className="p-4 text-sm text-muted text-center">Nenhuma conversa encontrada.</p>
        )}
        {list.map((it) => {
          const unread = it.channel === 'whatsapp' && it.read === false
          const tt = tipoTxt(it.client_tipo)
          return (
            <button
              key={`${it.channel}-${it.conversation_id}`}
              onClick={() => openItem(it)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-surface transition dark:border-slate-700 ${
                unread ? 'bg-brand-50/60 dark:bg-brand-700/10' : ''
              } ${
                selected?.conversation_id === it.conversation_id && selected?.channel === it.channel
                  ? 'bg-brand-50 dark:bg-brand-700/20'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{CHANNELS.find((c) => c.key === it.channel)?.icon}</span>
                {unread && (
                  <span
                    title="Não lida"
                    className="w-2 h-2 rounded-full bg-brand-600 shrink-0"
                  />
                )}
                <span
                  className={`text-sm truncate flex-1 ${
                    unread ? 'font-bold text-ink dark:text-slate-100' : 'font-medium text-ink dark:text-slate-100'
                  }`}
                >
                  {it.subject || '(sem assunto)'}
                </span>
                {tt && (
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-700/30 dark:text-violet-300">
                    {tt}
                  </span>
                )}
                {it.status && (
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-muted dark:bg-slate-700">
                    {it.status}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted truncate mt-0.5">{it.last_message}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-[10px] text-muted">{fmt(it.last_at)}</div>
                {it.channel === 'whatsapp' && !it.read && (
                  <button
                    disabled={busyId === it.conversation_id}
                    onClick={(e) => {
                      e.stopPropagation()
                      markRead(it.conversation_id)
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Marcar como lida
                  </button>
                )}
                {it.channel === 'whatsapp' && (
                  <button
                    disabled={busyId === it.conversation_id}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleArchive(it)
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 text-muted hover:bg-surface dark:border-slate-600 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    {it.archived ? 'Desarquivar' : 'Arquivar'}
                  </button>
                )}
              </div>
            </button>
          )
        })}
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
            <ReplyBox value={reply} onChange={setReply} onSend={sendReply} quick={quick} macros={macros} />
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
            <ReplyBox value={reply} onChange={setReply} onSend={sendReply} quick={quick} macros={macros} />
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
            <ReplyBox value={reply} onChange={setReply} onSend={sendReply} quick={quick} macros={macros} />
          </>
        )}
      </section>

      {showMgr && (
        <CannedManager
          onClose={() => setShowMgr(false)}
          onChanged={loadCanned}
        />
      )}
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
  quick,
  macros,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  quick: CannedResponse[]
  macros: CannedResponse[]
}) {
  const [open, setOpen] = useState(false)
  const insert = (text: string) => {
    onChange(value ? `${value}\n${text}` : text)
    setOpen(false)
  }
  return (
    <div className="p-4 bg-white border-t border-slate-200 flex gap-2 relative dark:bg-slate-800 dark:border-slate-700">
      {open && (
        <div className="absolute bottom-16 left-4 right-4 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg dark:bg-slate-700 dark:border-slate-600">
          {quick.length > 0 && (
            <div className="px-3 pt-2 pb-1 text-[11px] uppercase text-muted">Respostas rápidas</div>
          )}
          {quick.map((q) => (
            <button
              key={q.id}
              onClick={() => insert(q.content)}
              className="w-full text-left px-3 py-2 hover:bg-surface text-sm dark:hover:bg-slate-600"
            >
              <div className="font-medium">{q.title}</div>
              <div className="text-xs text-muted truncate">{q.content}</div>
            </button>
          ))}
          {macros.length > 0 && (
            <div className="px-3 pt-2 pb-1 text-[11px] uppercase text-muted border-t border-slate-100 dark:border-slate-600">Macros</div>
          )}
          {macros.map((m) => (
            <button
              key={m.id}
              onClick={() => insert(m.content)}
              className="w-full text-left px-3 py-2 hover:bg-surface text-sm dark:hover:bg-slate-600"
            >
              <div className="font-medium">{m.title}</div>
              <div className="text-xs text-muted truncate">{m.content}</div>
            </button>
          ))}
          {quick.length === 0 && macros.length === 0 && (
            <div className="px-3 py-3 text-sm text-muted">Nenhuma resposta cadastrada.</div>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Inserir resposta rápida / macro"
        className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
      >
        ⚡
      </button>
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

function CannedManager({
  onClose,
  onChanged,
}: {
  onClose: () => void
  onChanged: () => void
}) {
  const [tab, setTab] = useState<'quick_reply' | 'macro'>('quick_reply')
  const [items, setItems] = useState<CannedResponse[]>([])
  const [editing, setEditing] = useState<CannedResponse | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [err, setErr] = useState('')

  const reload = async () => {
    setItems(await canned.list(tab))
  }
  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const startNew = () => {
    setEditing(null)
    setTitle('')
    setContent('')
    setErr('')
  }
  const startEdit = (it: CannedResponse) => {
    setEditing(it)
    setTitle(it.title)
    setContent(it.content)
    setErr('')
  }
  const save = async () => {
    if (!title.trim() || !content.trim()) {
      setErr('Preencha título e conteúdo.')
      return
    }
    try {
      if (editing) await canned.update(tab, editing.id, { title, content })
      else await canned.create({ kind: tab, title, content })
      startNew()
      await reload()
      onChanged()
    } catch {
      setErr('Falha ao salvar.')
    }
  }
  const remove = async (id: number) => {
    await canned.remove(tab, id)
    await reload()
    onChanged()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={onClose}>
      <div
        className="w-[640px] max-w-[92vw] max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-5 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-ink">Respostas rápidas & Macros</h2>
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => { setTab('quick_reply'); startNew() }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                tab === 'quick_reply' ? 'bg-brand-600 text-white' : 'bg-surface text-muted dark:bg-slate-700'
              }`}
            >
              Respostas rápidas
            </button>
            <button
              onClick={() => { setTab('macro'); startNew() }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                tab === 'macro' ? 'bg-brand-600 text-white' : 'bg-surface text-muted dark:bg-slate-700'
              }`}
            >
              Macros
            </button>
          </div>
          <button onClick={onClose} className="ml-2 text-muted">✕</button>
        </div>

        <div className="grid grid-cols-[1fr_280px] gap-4">
          <div className="space-y-2">
            {items.length === 0 && (
              <p className="text-sm text-muted">Nenhum item cadastrado.</p>
            )}
            {items.map((it) => (
              <div
                key={it.id}
                className="border border-slate-200 rounded-xl p-3 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-ink">{it.title}</span>
                  <div className="ml-auto flex gap-2 text-xs">
                    <button onClick={() => startEdit(it)} className="text-brand-600">Editar</button>
                    <button onClick={() => remove(it.id)} className="text-red-600">Excluir</button>
                  </div>
                </div>
                <p className="text-xs text-muted mt-1 whitespace-pre-wrap">{it.content}</p>
              </div>
            ))}
          </div>

          <div className="border border-slate-200 rounded-xl p-3 h-fit dark:border-slate-700">
            <div className="text-sm font-medium mb-2 text-ink">
              {editing ? 'Editar' : 'Novo'} {tab === 'quick_reply' ? 'resposta rápida' : 'macro'}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título"
              className="w-full px-3 py-2 mb-2 rounded-lg border border-slate-200 text-sm dark:bg-slate-700 dark:border-slate-600"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Conteúdo da mensagem"
              className="w-full px-3 py-2 mb-2 rounded-lg border border-slate-200 text-sm h-28 dark:bg-slate-700 dark:border-slate-600"
            />
            {err && <div className="text-xs text-red-600 mb-2">{err}</div>}
            <div className="flex gap-2">
              <button
                onClick={save}
                className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
              >
                Salvar
              </button>
              {editing && (
                <button onClick={startNew} className="px-3 py-2 rounded-lg text-sm text-muted">
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
