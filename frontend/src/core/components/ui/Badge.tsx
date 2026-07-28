import { type HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
}

export function Badge({ className, variant = 'default', size = 'sm', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        {
          'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300': variant === 'default',
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-700/30 dark:text-emerald-300': variant === 'success',
          'bg-amber-100 text-amber-700 dark:bg-amber-700/30 dark:text-amber-300': variant === 'warning',
          'bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300': variant === 'danger',
          'bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300': variant === 'info',
        },
        {
          'px-2 py-0.5 text-[11px]': size === 'sm',
          'px-3 py-1 text-xs': size === 'md',
        },
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}