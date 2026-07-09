import type { Conversation } from '../types'

function fmt(ts: string) {
  const d = new Date(ts)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function ChatBubble({ item }: { item: Conversation }) {
  return (
    <div className="flex flex-col gap-2">
      {item.message && (
        <div className="self-start max-w-[75%] bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-ink">
          {item.message}
          <div className="text-[10px] text-muted mt-1 text-right">{fmt(item.created_at)}</div>
        </div>
      )}
      {item.response && (
        <div className="self-end max-w-[75%] bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
          {item.response}
        </div>
      )}
    </div>
  )
}
