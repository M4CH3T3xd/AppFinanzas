import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Target, CreditCard, ShieldCheck, LogOut, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/',               icon: LayoutDashboard, label: 'Inicio' },
  { to: '/transacciones',  icon: ArrowLeftRight,  label: 'Movimientos' },
  { to: '/presupuestos',   icon: Target,          label: 'Presupuestos' },
  { to: '/deudas',         icon: CreditCard,      label: 'Deudas' },
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

export default function Layout() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-canvas">

      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-56 bg-panel border-r border-line fixed h-full z-10">
        <div className="px-4 py-5 font-bold text-xl text-brand-500">💰 Finanzas</div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => <SideNavItem key={item.to} {...item} end={item.to === '/'} />)}
          {isAdmin && <SideNavItem to="/admin" icon={ShieldCheck} label="Admin" />}
        </nav>
        <div className="px-3 pb-4 space-y-1">
          <SideNavItem to="/configuracion" icon={Settings} label="Configuración" />
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dim hover:text-red-400 hover:bg-well transition-colors w-full">
            <LogOut size={20} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* ── Área principal ── */}
      <div className="flex flex-col flex-1 md:ml-56 min-h-screen">

        {/* Header móvil */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 bg-panel border-b border-line">
          <span className="font-bold text-lg text-brand-500">💰 Finanzas</span>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) =>
                `p-2 rounded-lg transition-colors ${isActive ? 'text-brand-500' : 'text-dim hover:text-ink'}`}>
                <ShieldCheck size={20} />
              </NavLink>
            )}
            <NavLink to="/configuracion" className={({ isActive }) =>
              `p-2 rounded-lg transition-colors ${isActive ? 'text-brand-500' : 'text-dim hover:text-ink'}`}>
              <Settings size={20} />
            </NavLink>
            <button onClick={handleLogout} className="p-2 rounded-lg text-dim hover:text-red-400 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 w-full max-w-2xl mx-auto md:max-w-none">
          <Outlet />
        </main>

        {/* Bottom nav móvil */}
        <nav className="flex md:hidden bg-panel border-t border-line safe-bottom">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${isActive ? 'text-brand-500' : 'text-dim hover:text-ink'}`
              }>
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
