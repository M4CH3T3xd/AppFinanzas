import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LogOut, X, AlertTriangle, ArrowLeft } from 'lucide-react'
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

// Evita que usuarios logueados vean el login al presionar atrás
function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/" replace /> : children
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-dim">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function BackExitHandler() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const location         = useLocation()
  const [showDialog, setShowDialog] = useState(false)
  const sentinelRef      = useRef(false)
  const restoringRef     = useRef(false)

  // Ignorar popstate los 300ms después de volver del fondo (bfcache race condition)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        restoringRef.current = true
        setTimeout(() => { restoringRef.current = false }, 300)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Push sentinel solo al llegar al Dashboard — nunca al montar ni en tabs
  useEffect(() => {
    if (location.pathname === '/' && user && !sentinelRef.current) {
      window.history.pushState({ sentinel: true }, '')
      sentinelRef.current = true
    }
    if (location.pathname !== '/') {
      sentinelRef.current = false
    }
  }, [location.pathname, user])

  useEffect(() => {
    const onPopState = () => {
      if (restoringRef.current) return
      if (!user) return

      if (location.pathname !== '/') {
        navigate('/', { replace: true })
        sentinelRef.current = false
        return
      }

      // En Dashboard: re-push sentinel para el próximo back, luego mostrar diálogo
      window.history.pushState({ sentinel: true }, '')
      sentinelRef.current = true
      setShowDialog(true)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [user, location.pathname, navigate])

  async function handleLogout() {
    setShowDialog(false)
    await logout()
    navigate('/login', { replace: true })
  }

  function handleSalir() {
    setShowDialog(false)
  }

  function handleCancelar() {
    setShowDialog(false)
  }

  if (!showDialog) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-panel rounded-3xl overflow-hidden shadow-2xl border border-line">
        <div className="px-6 pt-6 pb-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-brand-500" />
          </div>
          <h3 className="text-lg font-bold text-ink">¿Qué querés hacer?</h3>
          <p className="text-dim text-sm mt-1">Presionaste el botón de salir</p>
        </div>
        <div className="px-4 pb-6 pt-4 space-y-2.5">
          <button onClick={handleSalir}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-well hover:bg-line transition-colors">
            <div className="flex items-center gap-3">
              <ArrowLeft size={18} className="text-ink" />
              <div className="text-left">
                <p className="text-ink font-semibold text-sm">Salir de la app</p>
                <p className="text-dim text-xs">Minimiza o cierra la aplicación</p>
              </div>
            </div>
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-expense/10 hover:bg-expense/20 transition-colors border border-expense/20">
            <div className="flex items-center gap-3">
              <LogOut size={18} className="text-expense" />
              <div className="text-left">
                <p className="text-expense font-semibold text-sm">Cerrar sesión</p>
                <p className="text-dim text-xs">Salir de tu cuenta</p>
              </div>
            </div>
          </button>
          <button onClick={handleCancelar}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-dim hover:text-ink transition-colors text-sm font-medium">
            <X size={16} />
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  // Forzar reload cuando Chrome restaura la página desde bfcache (back-forward cache)
  // Evita la pantalla en blanco al volver del fondo en Android PWA
  useEffect(() => {
    const onPageShow = (e) => { if (e.persisted) window.location.reload() }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  return (
    <AuthProvider>
    <HashRouter>
      <BackExitHandler />
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
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
    </HashRouter>
    </AuthProvider>
  )
}
