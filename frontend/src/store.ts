import { create } from 'zustand'
import type { User } from './types'
import { auth } from './api'

interface AuthState {
  token: string | null
  user: User | null
  setToken: (t: string) => void
  setUser: (u: User | null) => void
  loadUser: () => Promise<void>
  logout: () => void
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem('crm_token'),
  user: null,
  setToken: (t) => {
    localStorage.setItem('crm_token', t)
    set({ token: t })
  },
  setUser: (u) => set({ user: u }),
  loadUser: async () => {
    try {
      const u = await auth.me()
      set({ user: u })
    } catch {
      set({ user: null })
    }
  },
  logout: () => {
    localStorage.removeItem('crm_token')
    set({ token: null, user: null })
  },
}))

interface ThemeState {
  dark: boolean
  toggleDark: () => void
}

export const useTheme = create<ThemeState>((set) => ({
  dark: localStorage.getItem('crm_dark') === '1',
  toggleDark: () =>
    set((s) => {
      const dark = !s.dark
      localStorage.setItem('crm_dark', dark ? '1' : '0')
      document.documentElement.classList.toggle('dark', dark)
      return { dark }
    }),
}))

export interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

interface ToastState {
  toasts: Toast[]
  push: (type: Toast['type'], message: string) => void
  dismiss: (id: number) => void
}

let toastId = 0

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message) => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
