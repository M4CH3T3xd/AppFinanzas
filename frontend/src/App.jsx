import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transacciones from './pages/Transacciones'
import Presupuestos from './pages/Presupuestos'
import Deudas from './pages/Deudas'
import Admin from './pages/Admin'
import Servicios from './pages/Servicios'
import Metas from './pages/Metas'
import Configuracion from './pages/Configuracion'
import Perfil from './pages/Perfil'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-dim">Cargando...</div>
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-dim">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="transacciones"  element={<Transacciones />} />
          <Route path="presupuestos"   element={<Presupuestos />} />
          <Route path="servicios"      element={<Servicios />} />
          <Route path="metas"          element={<Metas />} />
          <Route path="deudas"         element={<Deudas />} />
          <Route path="configuracion"  element={<Configuracion />} />
          <Route path="perfil"         element={<Perfil />} />
          <Route path="admin"          element={<AdminRoute><Admin /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  )
}
