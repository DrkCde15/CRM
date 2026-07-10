import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Inbox from './pages/Inbox'
import Tickets from './pages/Tickets'
import Appointments from './pages/Appointments'
import Dashboard from './pages/Dashboard'
import { useAuth } from './store'

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Navigate to="/inbox" replace />} />
      <Route path="/inbox" element={<Protected><Inbox /></Protected>} />
      <Route path="/tickets" element={<Protected><Tickets /></Protected>} />
      <Route path="/appointments" element={<Protected><Appointments /></Protected>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="*" element={<Navigate to="/inbox" replace />} />
    </Routes>
  )
}
