import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, TrendingDown, TrendingUp, CreditCard } from 'lucide-react'

function getSessionStatus(lastSeen) {
  if (!lastSeen) return 'inactive'
  const diff = (Date.now() - new Date(lastSeen).getTime()) / 1000 / 60 // minutos
  if (diff < 15) return 'active'
  if (diff < 120) return 'recent'
  return 'inactive'
}

const STATUS_DOT = {
  active:   { color: 'bg-income',          label: 'Activo ahora' },
  recent:   { color: 'bg-yellow-400',      label: 'Activo reciente' },
  inactive: { color: 'bg-dim/40',          label: 'Inactivo' },
}

export default function Admin() {
  const [usuarios, setUsuarios] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [datos, setDatos] = useState(null)

  useEffect(() => { loadUsuarios() }, [])

  async function loadUsuarios() {
    const { data } = await supabase.from('user_profiles').select('*')
    setUsuarios(data ?? [])
  }

  async function loadDatosUsuario(userId) {
    setSeleccionado(userId)
    const [{ data: txs }, { data: deudas }] = await Promise.all([
      supabase.from('transacciones').select('*').eq('user_id', userId).order('fecha', { ascending: false }).limit(20),
      supabase.from('deudas').select('*').eq('user_id', userId),
    ])
    const ingresos = txs?.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0) ?? 0
    const gastos = txs?.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0) ?? 0
    setDatos({ txs: txs ?? [], deudas: deudas ?? [], ingresos, gastos })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users size={20} className="text-brand-500" />
        <h2 className="text-xl font-bold text-ink">Panel Admin</h2>
      </div>

      <div className="space-y-2">
        {usuarios.map(u => {
          const status = getSessionStatus(u.last_seen)
          const dot    = STATUS_DOT[status]
          return (
            <button key={u.id} onClick={() => loadDatosUsuario(u.id)}
              className={`w-full text-left bg-panel rounded-2xl px-4 py-3 transition-colors border-2 ${seleccionado === u.id ? 'border-brand-500' : 'border-transparent hover:bg-well'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-ink truncate">{u.email}</p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${dot.color} ${status === 'active' ? 'animate-pulse' : ''}`} />
                  <span className="text-xs text-dim">{dot.label}</span>
                </div>
              </div>
              <p className="text-xs text-dim capitalize mt-0.5">{u.role ?? 'usuario'}</p>
            </button>
          )
        })}
        {usuarios.length === 0 && <p className="text-center text-dim py-8">Sin usuarios registrados</p>}
      </div>

      {datos && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-panel rounded-2xl p-3 flex items-center gap-3">
              <TrendingUp size={18} className="text-green-400" />
              <div>
                <p className="text-xs text-dim">Ingresos</p>
                <p className="font-bold text-green-400">${datos.ingresos.toLocaleString('es-AR')}</p>
              </div>
            </div>
            <div className="bg-panel rounded-2xl p-3 flex items-center gap-3">
              <TrendingDown size={18} className="text-red-400" />
              <div>
                <p className="text-xs text-dim">Gastos</p>
                <p className="font-bold text-red-400">${datos.gastos.toLocaleString('es-AR')}</p>
              </div>
            </div>
          </div>
          <div className="bg-panel rounded-2xl p-4">
            <p className="text-sm font-semibold text-ink mb-2 flex items-center gap-1"><CreditCard size={15}/> Últimas transacciones</p>
            <div className="space-y-2">
              {datos.txs.slice(0, 5).map(t => (
                <div key={t.id} className="flex justify-between text-sm">
                  <span className="text-dim truncate">{t.descripcion || t.categoria}</span>
                  <span className={t.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'}>
                    {t.tipo === 'ingreso' ? '+' : '-'}${t.monto.toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
              {datos.txs.length === 0 && <p className="text-xs text-dim">Sin movimientos</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
