import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage          from './pages/AuthPage'
import AdminDashboard    from './pages/AdminDashboard'
import ManagerDashboard  from './pages/ManagerDashboard'
import FieldDashboard    from './pages/FieldDashboard'
import NewTransportPage  from './pages/NewTransportPage'
import AlertToast        from './components/AlertToast'

// Redirect to the correct dashboard based on role
function roleHome(user) {
  if (!user) return '/'
  if (user.role === 'admin')   return '/admin'
  if (user.role === 'manager') return '/manager'
  return `/field/${user.id}`
}

function ProtectedRoute({ children, role }) {
  const { currentUser, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#94a3b8',fontSize:14 }}>
      Loading…
    </div>
  )
  if (!currentUser) return <Navigate to="/" replace />
  // Admin can access any manager route
  const allowed = !role || currentUser.role === role || (currentUser.role === 'admin' && role === 'manager')
  if (!allowed) return <Navigate to={roleHome(currentUser)} replace />
  return children
}

function AppRoutes() {
  const { currentUser } = useAuth()
  return (
    <>
      <AlertToast />
      <Routes>
        <Route path="/"
          element={currentUser ? <Navigate to={roleHome(currentUser)} replace /> : <AuthPage />}
        />
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/manager" element={
          <ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>
        } />
        <Route path="/manager/new-transport" element={
          <ProtectedRoute role="manager"><NewTransportPage /></ProtectedRoute>
        } />
        <Route path="/field/:id" element={
          <ProtectedRoute role="operator"><FieldDashboard /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
