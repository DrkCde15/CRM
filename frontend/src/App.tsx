import { useEffect, lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './core/components/layout/AppShell'
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
import Workflows from './pages/Workflows'
import CalendarSettings from './pages/CalendarSettings'
import SLAPage from './pages/SLA'
import Companies from './pages/Companies'
import Webhooks from './pages/Webhooks'
import Automations from './pages/Automations'
import Chatbot from './pages/Chatbot'
import Plugins from './pages/Plugins'
import Logs from './pages/Logs'
import Profile from './pages/Profile'
import { useAuth } from './store'
import { ensureConnected } from './realtime'
import { PageSpinner } from './core/components/ui/Spinner'

const AIChat = lazy(() => import('./modules/ai/pages/AIChat'))
const Agents = lazy(() => import('./modules/ai/pages/Agents'))
const MCPConfig = lazy(() => import('./modules/ai/pages/MCPConfig'))
const Documents = lazy(() => import('./modules/documents/pages/Documents'))

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <AppShell>{children}</AppShell>
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
  const loadUser = useAuth((s) => s.loadUser)

  useEffect(() => {
    if (token) {
      ensureConnected()
      loadUser()
    }
  }, [token, loadUser])

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

      <Route
        path="/ai"
        element={
          <Protected>
            <LazyPage component={AIChat} />
          </Protected>
        }
      />
      <Route
        path="/ai/agents"
        element={
          <Protected>
            <LazyPage component={Agents} />
          </Protected>
        }
      />
      <Route
        path="/ai/mcp"
        element={
          <Protected>
            <LazyPage component={MCPConfig} />
          </Protected>
        }
      />
      <Route
        path="/documents"
        element={
          <Protected>
            <LazyPage component={Documents} />
          </Protected>
        }
      />

      <Route
        path="/workflows"
        element={
          <Protected>
            <Workflows />
          </Protected>
        }
      />
      <Route
        path="/calendar"
        element={
          <Protected>
            <CalendarSettings />
          </Protected>
        }
      />
      <Route
        path="/sla"
        element={
          <Protected>
            <SLAPage />
          </Protected>
        }
      />
      <Route
        path="/companies"
        element={
          <Protected>
            <Companies />
          </Protected>
        }
      />
      <Route
        path="/webhooks"
        element={
          <Protected>
            <Webhooks />
          </Protected>
        }
      />
      <Route
        path="/automations"
        element={
          <Protected>
            <Automations />
          </Protected>
        }
      />
      <Route
        path="/plugins"
        element={
          <Protected>
            <Plugins />
          </Protected>
        }
      />
      <Route
        path="/logs"
        element={
          <Protected>
            <Logs />
          </Protected>
        }
      />
      <Route
        path="/profile"
        element={
          <Protected>
            <Profile />
          </Protected>
        }
      />
      <Route
        path="/ai/chatbot"
        element={
          <Protected>
            <Chatbot />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/inbox" replace />} />
    </Routes>
  )
}
