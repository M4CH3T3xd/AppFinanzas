import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../context/CurrencyContext'
import { TrendingUp, TrendingDown, AlertCircle, ArrowRight, Repeat, Target } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuth()
  const { format: fmt, getCurrency } = useCurrency()
  const cur = getCurrency()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const hoy = new Date()
    const inicio    = format(startOfMonth(hoy), 'yyyy-MM-dd')
    const fin       = format(endOfMonth(hoy), 'yyyy-MM-dd')
    const prevMes   = subMonths(hoy, 1)
    const inicioAnt = format(startOfMonth(prevMes), 'yyyy-MM-dd')
    const finAnt    = format(endOfMonth(prevMes), 'yyyy-MM-dd')

    const [txMesRes, txAntRes, deudasRes, srvsRes, metasRes, recientesRes] = await Promise.all([
      supabase.from('transacciones').select('monto,tipo,categoria').eq('user_id', user.id).gte('fecha', inicio).lte('fecha', fin),
      supabase.from('transacciones').select('monto,tipo').eq('user_id', user.id).gte('fecha', inicioAnt).lte('fecha', finAnt),
      supabase.from('deudas').select('monto').eq('user_id', user.id).eq('pagado', false),
      supabase.from('servicios').select('monto').eq('user_id', user.id).eq('activo', true),
      supabase.from('metas').select('*').eq('user_id', user.id).limit(3),
      supabase.from('transacciones').select('monto,tipo,categoria,descripcion,fecha').eq('user_id', user.id).order('fecha', { ascending: false }).limit(5),
    ])

    const txMes = txMesRes.data ?? []
    const ingresos = txMes.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0)
    const gastos   = txMes.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0)
    const balance  = ingresos - gastos

    const txAnt = txAntRes.data ?? []
    const ingAnt = txAnt.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0)
    const gasAnt = txAnt.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0)
    const balAnt = ingAnt - gasAnt
    const vsAnterior = balAnt !== 0 ? ((balance - balAnt) / Math.abs(balAnt)) * 100 : null

    const catMap = {}
    txMes.filter(t => t.tipo === 'gasto').forEach(t => {
      catMap[t.categoria] = (catMap[t.categoria] ?? 0) + t.monto
    })
    const topCategorias = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4)

    setData({
      ingresos, gastos, balance, vsAnterior,
      topCategorias,
      totalDeudas:   deudasRes.data?.reduce((s, d) => s + d.monto, 0) ?? 0,
      totalServicios: srvsRes.data?.reduce((s, s2) => s + s2.monto, 0) ?? 0,
      metas: metasRes.error ? [] : (metasRes.data ?? []),
      recientes: recientesRes.data ?? [],
    })
    setLoading(false)
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 20) return 'Buenas tardes'
    return 'Buenas noches'
  })()
  const mesActual = format(new Date(), 'MMMM yyyy', { locale: es })

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 bg-panel rounded-3xl" />
        <div className="h-40 bg-panel rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 bg-panel rounded-2xl" />
          <div className="h-20 bg-panel rounded-2xl" />
        </div>
        <div className="h-36 bg-panel rounded-2xl" />
      </div>
    )
  }

  const { ingresos, gastos, balance, vsAnterior, topCategorias, totalDeudas, totalServicios, metas, recientes } = data
  const maxCat = topCategorias[0]?.[1] ?? 1

  return (
    <div className="space-y-3 pb-6">

      {/* Saludo */}
      <div>
        <p className="text-dim text-sm">{greeting}</p>
        <h2 className="text-xl font-bold text-ink capitalize">{mesActual}</h2>
      </div>

      {/* Hero — Balance */}
      <div className="relative overflow-hidden rounded-3xl bg-panel border border-line p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-brand-500/5 pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between mb-1">
            <p className="text-dim text-xs">{cur.flag} {cur.code}</p>
            {vsAnterior !== null && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                vsAnterior >= 0
                  ? 'bg-income/10 text-income'
                  : 'bg-expense/10 text-expense'
              }`}>
                {vsAnterior >= 0 ? '▲' : '▼'} {Math.abs(vsAnterior).toFixed(0)}% vs mes ant.
              </span>
            )}
          </div>
          <p className={`text-5xl font-bold tracking-tight mb-5 ${balance >= 0 ? 'text-ink' : 'text-expense'}`}>
            {fmt(balance)}
          </p>
          <div className="flex gap-6">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <TrendingUp size={13} className="text-income" />
                <span className="text-xs text-dim">Ingresos</span>
              </div>
              <p className="text-income font-semibold text-sm">{fmt(ingresos)}</p>
            </div>
            <div className="w-px bg-line" />
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <TrendingDown size={13} className="text-expense" />
                <span className="text-xs text-dim">Gastos</span>
              </div>
              <p className="text-expense font-semibold text-sm">{fmt(gastos)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gastos por categoría */}
      {topCategorias.length > 0 && (
        <div className="bg-panel rounded-2xl border border-line p-4">
          <p className="text-sm font-semibold text-ink mb-3">Gastos por categoría</p>
          <div className="space-y-2.5">
            {topCategorias.map(([cat, monto]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-dim">{cat}</span>
                  <span className="text-ink font-medium">{fmt(monto)}</span>
                </div>
                <div className="h-1.5 bg-well rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(monto / maxCat) * 100}%`,
                      background: 'var(--expense)',
                      opacity: 0.6 + 0.4 * (monto / maxCat),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Servicios + Deudas */}
      {(totalServicios > 0 || totalDeudas > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {totalServicios > 0 && (
            <button onClick={() => navigate('/servicios')}
              className="bg-panel border border-line rounded-2xl p-4 text-left hover:border-brand-500/40 transition-colors">
              <div className="flex items-center gap-1.5 mb-2">
                <Repeat size={14} className="text-brand-500" />
                <span className="text-xs text-dim">Servicios</span>
              </div>
              <p className="text-ink font-bold">{fmt(totalServicios)}</p>
              <p className="text-xs text-dim mt-0.5">este mes</p>
            </button>
          )}
          {totalDeudas > 0 && (
            <button onClick={() => navigate('/deudas')}
              className="bg-panel border border-line rounded-2xl p-4 text-left hover:border-expense/40 transition-colors">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle size={14} className="text-expense" />
                <span className="text-xs text-dim">Deudas</span>
              </div>
              <p className="text-expense font-bold">{fmt(totalDeudas)}</p>
              <p className="text-xs text-dim mt-0.5">pendiente</p>
            </button>
          )}
        </div>
      )}

      {/* Metas */}
      {metas.length > 0 && (
        <div className="bg-panel rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Target size={15} className="text-brand-500" />
              <p className="text-sm font-semibold text-ink">Metas de ahorro</p>
            </div>
            <button onClick={() => navigate('/metas')} className="text-xs text-dim hover:text-ink flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {metas.map(m => {
              const pct = m.monto_objetivo > 0 ? Math.min((m.monto_actual / m.monto_objetivo) * 100, 100) : 0
              return (
                <div key={m.id}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-ink font-medium">{m.icono} {m.nombre}</span>
                    <span className="text-dim">{fmt(m.monto_actual)} / {fmt(m.monto_objetivo)}</span>
                  </div>
                  <div className="h-1.5 bg-well rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-income"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-dim mt-1">{pct.toFixed(0)}% completado</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Últimos movimientos */}
      {recientes.length > 0 && (
        <div className="bg-panel rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink">Últimos movimientos</p>
            <button onClick={() => navigate('/transacciones')} className="text-xs text-dim hover:text-ink flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {recientes.map(tx => (
              <div key={tx.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  tx.tipo === 'ingreso' ? 'bg-income/10' : 'bg-expense/10'
                }`}>
                  {tx.tipo === 'ingreso'
                    ? <TrendingUp size={14} className="text-income" />
                    : <TrendingDown size={14} className="text-expense" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{tx.descripcion || tx.categoria}</p>
                  <p className="text-xs text-dim">
                    {format(new Date(tx.fecha + 'T12:00:00'), 'EEE d MMM', { locale: es })}
                  </p>
                </div>
                <p className={`text-sm font-semibold flex-shrink-0 ${tx.tipo === 'ingreso' ? 'text-income' : 'text-expense'}`}>
                  {tx.tipo === 'ingreso' ? '+' : '−'}{fmt(tx.monto)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {recientes.length === 0 && topCategorias.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-full bg-well flex items-center justify-center text-2xl">💰</div>
          <p className="text-dim text-sm text-center">Aún no hay movimientos este mes.<br/>Agregá tu primer ingreso o gasto.</p>
          <button onClick={() => navigate('/transacciones')}
            className="mt-1 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Agregar movimiento
          </button>
        </div>
      )}

    </div>
  )
}
