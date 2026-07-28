import { useState, useEffect, useRef } from 'react'
import { Send, Plus, MessageSquare, Trash2, Bot, Sparkles } from 'lucide-react'
import { cn } from '../../../core/utils/cn'
import { Button } from '../../../core/components/ui/Button'
import { formatDate } from '../../../core/utils/format'
import { aiApi } from '../services/api'
import type { ChatConversation, ChatMessage } from '../types'
import { PageHeader } from '../../../core/components/layout/PageHeader'

export default function AIChat() {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agent, setAgent] = useState('assistente')
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeConv = conversations.find((c) => c.id === activeId)

  useEffect(() => {
    aiApi.conversations().then(setConversations)
  }, [])

  useEffect(() => {
    if (activeId) aiApi.conversation(activeId).then((c) => setMessages(c.messages || []))
    else setMessages([])
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const newChat = async () => {
    setInput('')
    setActiveId(null)
    setMessages([])
  }

  const send = async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await aiApi.chat(activeId || '', text, agent)
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toISOString(),
        agent: agent,
      }
      setMessages((prev) => [...prev, assistantMsg])

      if (res.conversation_id && res.conversation_id !== activeId) {
        setActiveId(res.conversation_id)
        const convs = await aiApi.conversations()
        setConversations(convs)
      }
    } catch {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const deleteConv = async (id: string) => {
    await aiApi.deleteConversation(id)
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) { setActiveId(null); setMessages([]) }
  }

  const agents = [
    { id: 'assistente', label: 'Assistente Geral' },
    { id: 'comercial', label: 'Assistente Comercial' },
    { id: 'atendimento', label: 'Assistente de Atendimento' },
    { id: 'financeiro', label: 'Assistente Financeiro' },
    { id: 'marketing', label: 'Assistente de Marketing' },
  ]

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 pt-6 pb-0 shrink-0">
        <PageHeader title="Mochi AI" description="Converse com a inteligência artificial da plataforma." />
      </div>
      <div className="flex-1 flex">
      <aside className="w-72 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
        <div className="p-3 border-b border-slate-100 dark:border-slate-700">
          <Button onClick={newChat} className="w-full">
            <Plus size={16} />
            Nova conversa
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition group',
                activeId === conv.id
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-300'
                  : 'text-ink dark:text-slate-100 hover:bg-surface dark:hover:bg-slate-700',
              )}
            >
              <MessageSquare size={16} className="shrink-0 text-muted" />
              <span className="truncate flex-1 text-left">{conv.title || 'Nova conversa'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConv(conv.id) }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted hover:text-red-500 transition"
              >
                <Trash2 size={14} />
              </button>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted text-center">Nenhuma conversa ainda</p>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {messages.length === 0 && !loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-700/20 flex items-center justify-center mb-4">
              <Bot size={32} className="text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-xl font-semibold text-ink dark:text-slate-100 mb-2">Mochi AI</h2>
            <p className="text-sm text-muted max-w-md mb-6">
              Seu assistente inteligente. Pergunte sobre clientes, analise dados, gere documentos e muito mais.
            </p>
            <div className="flex gap-2">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAgent(a.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-medium transition',
                    agent === a.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-surface text-muted hover:bg-surface/70 dark:bg-slate-700 dark:text-slate-300',
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
            <div className="flex items-center gap-2 px-1 mb-4">
              <Sparkles size={16} className="text-brand-600" />
              <span className="text-sm font-medium text-ink dark:text-slate-100">
                {agents.find((a) => a.id === agent)?.label || 'Assistente'}
              </span>
            </div>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3 animate-fade-in',
                  msg.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-700/30 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-brand-600 dark:text-brand-400" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[70%] px-4 py-3 rounded-2xl text-sm',
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-tr-sm'
                      : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-ink dark:text-slate-100 rounded-tl-sm',
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className="text-[10px] text-muted mt-1 text-right">{formatDate(msg.timestamp)}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-700/30 flex items-center justify-center">
                  <Bot size={16} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-ink dark:text-slate-100"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-ink dark:text-slate-100 outline-none focus:border-brand-500"
            />
            <Button onClick={send} loading={loading} disabled={!input.trim()}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}