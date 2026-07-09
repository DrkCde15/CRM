import { create } from 'zustand'

interface AuthState {
  token: string | null
  setToken: (t: string) => void
  logout: () => void
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem('crm_token'),
  setToken: (t) => {
    localStorage.setItem('crm_token', t)
    set({ token: t })
  },
  logout: () => {
    localStorage.removeItem('crm_token')
    set({ token: null })
  },
}))
