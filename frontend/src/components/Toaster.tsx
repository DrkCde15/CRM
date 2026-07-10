import { useToasts } from '../store'

const styles: Record<string, string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-slate-700',
}

export default function Toaster() {
  const { toasts, dismiss } = useToasts()
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`${styles[t.type]} text-white text-sm px-4 py-3 rounded-xl shadow-lg cursor-pointer max-w-xs`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
