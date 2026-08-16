import { AppShell } from './AppShell'

interface LegacyLayoutAdapterProps {
  children: React.ReactNode
}

export function LegacyLayoutAdapter({ children }: LegacyLayoutAdapterProps) {
  return <AppShell>{children}</AppShell>
}
