import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, MessageSquare, Users, FileText, Ticket, Calendar, Bot, Command } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useDebounce } from '../../hooks/useDebounce'

interface SearchResult {
  id: string
  type: 'client' | 'lead' | 'company' | 'ticket' | 'conversation' | 'file' | 'user' | 'task' | 'product'
  label: string
  description?: string
  path: string
}

const typeIcons: Record<string, React.ReactNode> = {
  client: <Users size={14} />,
  lead: <Users size={14} />,
  company: <Users size={14} />,
  ticket: <Ticket size={14} />,
  conversation: <MessageSquare size={14} />,
  file: <FileText size={14} />,
  user: <Users size={14} />,
  task: <Calendar size={14} />,
  product: <Bot size={14} />,
}

const actions = [
  { id: 'go-inbox', label: 'Ir para Conversas', icon: <MessageSquare size={14} />, path: '/inbox' },
  { id: 'go-clients', label: 'Ir para Clientes', icon: <Users size={14} />, path: '/clients' },
  { id: 'go-tickets', label: 'Ir para Chamados', icon: <Ticket size={14} />, path: '/tickets' },
  { id: 'go-ai', label: 'Abrir Mochi AI', icon: <Bot size={14} />, path: '/ai' },
  { id: 'go-docs', label: 'Abrir Documentos', icon: <FileText size={14} />, path: '/documents' },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  const allItems = query.trim()
    ? [...actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase())), ...results.map((r) => ({ id: r.id, label: r.label, icon: typeIcons[r.type] || <Search size={14} />, path: r.path }))]
    : actions

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      setResults(await res.json())
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (debouncedQuery) search(debouncedQuery) }, [debouncedQuery, search])

  useEffect(() => {
    if (open) { setQuery(''); setResults([]); setSelectedIndex(0); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && allItems[selectedIndex]) {
        window.location.href = allItems[selectedIndex].path
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, allItems, selectedIndex, onClose])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-command-palette]')) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', onClick), 0)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] animate-fade-in">
      <div className="fixed inset-0 bg-black/40" />
      <div
        data-command-palette
        className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-in"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search size={18} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            placeholder="Pesquise clientes, tickets, conversas, arquivos..."
            className="flex-1 bg-transparent text-sm text-ink dark:text-slate-100 outline-none placeholder:text-muted"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-muted">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted">
              <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-brand-600 animate-spin" />
              Pesquisando...
            </div>
          )}
          {!loading && allItems.length === 0 && (
            <div className="px-3 py-6 text-sm text-muted text-center">Nenhum resultado encontrado</div>
          )}
          {allItems.map((item, i) => (
            <button
              key={item.id}
              onClick={() => { window.location.href = item.path; onClose() }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition',
                i === selectedIndex
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-300'
                  : 'text-ink dark:text-slate-100 hover:bg-surface dark:hover:bg-slate-700',
              )}
            >
              <span className="text-muted shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-muted">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700">↑↓</kbd> Navegar</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700">↵</kbd> Selecionar</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700">ESC</kbd> Fechar</span>
        </div>
      </div>
    </div>
  )
}
