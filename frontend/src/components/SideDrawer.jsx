import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { supabase } from '../lib/supabase'
import { useState } from 'react'
import { X, User, Settings, ArrowLeftRight, FileDown, LogOut, AlertTriangle, ChevronRight } from 'lucide-react'

const menuItems = [
  { icon: User,            label: 'Mi perfil',         sub: 'Foto, nombre y apodo', to: '/perfil' },
  { icon: Settings,        label: 'Ajustes',            sub: 'Tema y apariencia',    to: '/perfil#ajustes' },
  { icon: ArrowLeftRight,  label: 'Conversor',          sub: 'Equivalencias de moneda', to: '/perfil#conversor' },
  { icon: FileDown,        label: 'Exportar resumen',   sub: 'PDF del mes',          to: '/perfil#exportar' },
]

export default function SideDrawer({ open, onClose }) {
  const navigate  = useNavigate()
  const { user, profile, isAdmin } = useAuth()
  const { getCurrency } = useCurrency()
  const [confirmLogout, setConfirmLogout] = useState(false)

  const cur         = getCurrency()
  const initial     = (profile?.apodo || profile?.nombre || user?.email || '?')[0].toUpperCase()
  const displayName = profile?.apodo || profile?.nombre || user?.email?.split('@')[0]

  function go(to) {
    onClose()
    navigate(to)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    sessionStorage.clear()
    localStorage.removeItem('currency')
    window.location.href = '/login'
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-72 z-50 flex flex-col bg-panel border-l border-line transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-line flex-shrink-0">
          <h3 className="font-semibold text-ink">Cuenta</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-well flex items-center justify-center text-dim hover:text-ink transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Perfil mini */}
        <button onClick={() => go('/perfil')} className="flex items-center gap-3 px-5 py-4 hover:bg-well/50 transition-colors border-b border-line flex-shrink-0">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              : initial
            }
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-ink font-semibold text-sm truncate">{displayName}</p>
            <p className="text-dim text-xs truncate">{user?.email}</p>
            <p className="text-dim text-xs mt-0.5">{cur.flag} {cur.code} · {isAdmin ? 'Admin' : 'Usuario'}</p>
          </div>
          <ChevronRight size={16} className="text-dim flex-shrink-0" />
        </button>

        {/* Opciones */}
        <nav className="flex-1 overflow-y-auto py-2">
          {menuItems.map(({ icon: Icon, label, sub, to }) => (
            <button key={to} onClick={() => go(to)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-well/50 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-brand-500" />
              </div>
              <div className="min-w-0">
                <p className="text-ink text-sm font-medium">{label}</p>
                <p className="text-dim text-xs">{sub}</p>
              </div>
              <ChevronRight size={14} className="text-dim ml-auto flex-shrink-0" />
            </button>
          ))}
        </nav>

        {/* Cerrar sesión */}
        <div className="px-5 py-4 border-t border-line flex-shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {confirmLogout ? (
            <div className="bg-expense/10 border border-expense/20 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-expense flex-shrink-0" />
                <p className="text-sm font-semibold text-expense">¿Seguro que querés salir?</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmLogout(false)}
                  className="flex-1 py-2 rounded-xl bg-well text-dim text-xs font-medium hover:text-ink transition-colors">
                  Cancelar
                </button>
                <button onClick={handleLogout}
                  className="flex-1 py-2 rounded-xl bg-expense text-white text-xs font-semibold transition-colors">
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmLogout(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-expense/30 text-expense hover:bg-expense/10 text-sm font-medium transition-colors">
              <LogOut size={15} />
              Cerrar sesión
            </button>
          )}
        </div>
      </div>
    </>
  )
}
