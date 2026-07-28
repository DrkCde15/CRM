import { useEffect, lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Inbox from './pages/Inbox'
import Clients from './pages/Clients'
import Tickets from './pages/Tickets'
import Appointments from './pages/Appointments'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Channels from './pages/Channels'
import { useAuth } from './store'
import { ensureConnected } from './realtime'
import { AppShell } from './core/components/layout/AppShell'
import { PageSpinner } from './core/components/ui/Spinner'

const AIChat = lazy(() => import('./modules/ai/pages/AIChat'))
const Agents = lazy(() => import('./modules/ai/pages/Agents'))
const MCPConfig = lazy(() => import('./modules/ai/pages/MCPConfig'))
const Documents = lazy(() => import('./modules/documents/pages/Documents'))

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function ModuleShell({ title, children }: { title?: string; children: React.ReactNode }) {
  const token = useAuth((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <AppShell title={title}>{children}</AppShell>
}

function LazyPage({ component: Component }: { component: React.LazyExoticComponent<React.ComponentType> }) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Component />
    </Suspense>
  )
}

export default function App() {
  const token = useAuth((s) => s.token)

  useEffect(() => {
    if (token) ensureConnected()
  }, [token])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to="/inbox" replace />} />
      <Route
        path="/inbox"
        element={
          <Protected>
            <Inbox />
          </Protected>
        }
      />
      <Route
        path="/clients"
        element={
          <Protected>
            <Clients />
          </Protected>
        }
      />
      <Route
        path="/tickets"
        element={
          <Protected>
            <Tickets />
          </Protected>
        }
      />
      <Route
        path="/appointments"
        element={
          <Protected>
            <Appointments />
          </Protected>
        }
      />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/channels"
        element={
          <Protected>
            <Channels />
          </Protected>
        }
      />
      <Route
        path="/users"
        element={
          <Protected>
            <Users />
          </Protected>
        }
      />

      {/* New Module Routes */}
      <Route
        path="/ai"
        element={
          <ModuleShell title="Mochi AI">
            <LazyPage component={AIChat} />
          </ModuleShell>
        }
      />
      <Route
        path="/ai/agents"
        element={
          <ModuleShell title="Agentes">
            <LazyPage component={Agents} />
          </ModuleShell>
        }
      />
      <Route
        path="/ai/mcp"
        element={
          <ModuleShell title="Servidores MCP">
            <LazyPage component={MCPConfig} />
          </ModuleShell>
        }
      />
      <Route
        path="/documents"
        element={
          <ModuleShell title="Documentos">
            <LazyPage component={Documents} />
          </ModuleShell>
        }
      />

      <Route path="*" element={<Navigate to="/inbox" replace />} />
    </Routes>
  )
}
