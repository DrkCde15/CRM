import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

export function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className={cn(
          'bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto animate-scale-in',
          {
            'w-full max-w-sm': size === 'sm',
            'w-full max-w-md': size === 'md',
            'w-full max-w-lg': size === 'lg',
            'w-full max-w-2xl': size === 'xl',
            'w-full max-w-5xl': size === 'full',
          },
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-ink dark:text-slate-100">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface dark:hover:bg-slate-700 transition"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className={cn('p-5', !title && 'pt-5')}>{children}</div>
      </div>
    </div>
  )
}