import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Target, CreditCard, Repeat, ShieldCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../context/CurrencyContext'
import SideDrawer from './SideDrawer'

const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Inicio' },
  { to: '/transacciones', icon: ArrowLeftRight,  label: 'Movimientos' },
  { to: '/presupuestos',  icon: Target,          label: 'Presupuestos' },
  { to: '/deudas',        icon: CreditCard,      label: 'Deudas' },
  { to: '/servicios',     icon: Repeat,          label: 'Servicios' },
]

function SideNavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
         ${isActive ? 'bg-brand-500/15 text-brand-500' : 'text-dim hover:text-ink hover:bg-well'}`
      }>
      <Icon size={20} className="flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

function Avatar({ onClick, avatarUrl, initial }) {
  return (
    <button onClick={onClick}
      className="w-9 h-9 rounded-full overflow-hidden bg-brand-500 flex items-center justify-center text-white font-bold text-base hover:ring-2 hover:ring-brand-500/50 transition-all flex-shrink-0">
      {avatarUrl
        ? <img src={avatarUrl} alt="perfil" className="w-full h-full object-cover" />
        : initial
      }
    </button>
  )
}

export default function Layout() {
  const { isAdmin, user, profile } = useAuth()
  const { getCurrency } = useCurrency()
  const navigate = useNavigate()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const cur         = getCurrency()
  const initial     = (profile?.apodo || profile?.nombre || user?.email || '?')[0].toUpperCase()
  const displayName = profile?.apodo || profile?.nombre || user?.email?.split('@')[0]

  return (
    <div className="flex flex-col md:flex-row h-screen bg-canvas overflow-hidden">

      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-56 bg-panel border-r border-line fixed h-full z-10">
        <div className="px-4 py-5">
          <span className="font-bold text-xl text-brand-500">💰 Finanzas</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => <SideNavItem key={item.to} {...item} end={item.to === '/'} />)}
          {isAdmin && <SideNavItem to="/admin" icon={ShieldCheck} label="Admin" />}
        </nav>
        <div className="px-3 pb-4">
          <button onClick={() => setDrawerOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-well transition-colors text-left">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="perfil" className="w-full h-full object-cover" />
                : initial
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-ink text-xs font-medium truncate">{displayName}</p>
              <p className="text-dim text-xs">{cur.flag} {cur.code}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Área principal ── */}
      <div className="flex flex-col flex-1 md:ml-56 h-full overflow-hidden">

        {/* Header móvil */}
        <header className="flex-shrink-0 flex md:hidden items-center justify-between px-4 py-3 bg-panel border-b border-line">
          <span className="font-bold text-lg text-brand-500">💰 Finanzas</span>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) =>
                `p-2 rounded-lg transition-colors ${isActive ? 'text-brand-500' : 'text-dim hover:text-ink'}`}>
                <ShieldCheck size={20} />
              </NavLink>
            )}
            <Avatar onClick={() => setDrawerOpen(true)} avatarUrl={profile?.avatar_url} initial={initial} />
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-4 pb-20 w-full max-w-2xl mx-auto md:max-w-none md:pb-4">
          <Outlet />
        </main>

        {/* Bottom nav móvil */}
        <nav className="flex-shrink-0 flex md:hidden bg-panel border-t border-line"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} replace
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${isActive ? 'text-brand-500' : 'text-dim hover:text-ink'}`
              }>
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
