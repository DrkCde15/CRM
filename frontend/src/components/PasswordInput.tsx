import { useState, type InputHTMLAttributes } from 'react'

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function PasswordInput({ className = '', type, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 text-sm pr-10 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${className}`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
        className="absolute inset-y-0 right-0 grid place-items-center w-10 text-muted hover:text-ink dark:text-slate-300"
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}
