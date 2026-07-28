import { AppShell } from './AppShell'

interface LegacyLayoutAdapterProps {
  title?: string
  children: React.ReactNode
}

export function LegacyLayoutAdapter({ title, children }: LegacyLayoutAdapterProps) {
  return <AppShell title={title}>{children}</AppShell>
}
