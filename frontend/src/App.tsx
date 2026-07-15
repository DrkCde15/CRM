import { useEffect } from 'react'
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

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
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
      <Route path="*" element={<Navigate to="/inbox" replace />} />
    </Routes>
  )
}
