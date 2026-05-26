import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../context/CurrencyContext'
import { TrendingUp, TrendingDown, AlertCircle, ArrowRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'

const CustomTooltip = ({ active, payload, label }) => {
  const { format: fmt } = useCurrency()
  if (!active || !payload?.length) return null
  return (
    <div className="bg-well border border-line rounded-xl p-3 text-xs shadow-xl">
      <p className="text-dim mb-1.5 font-medium">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.dataKey === 'ingresos' ? '↑' : '↓'} {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { format: fmt, getCurrency } = useCurrency()
  const cur = getCurrency()
  const navigate = useNavigate()

  const [stats, setStats] = useState({ ingresos: 0, gastos: 0, balance: 0, deudas: 0 })
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const inicio = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const fin    = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    const desde  = format(subDays(new Date(), 29), 'yyyy-MM-dd')

    const [{ data: txMes }, { data: deudas }, { data: txSerie }] = await Promise.all([
      supabase.from('transacciones').select('monto,tipo').eq('user_id', user.id).gte('fecha', inicio).lte('fecha', fin),
      supabase.from('deudas').select('monto').eq('user_id', user.id).eq('pagado', false),
      supabase.from('transacciones').select('fecha,monto,tipo').eq('user_id', user.id).gte('fecha', desde).order('fecha'),
    ])

    const ingresos = txMes?.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0) ?? 0
    const gastos   = txMes?.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0) ?? 0
    setStats({
      ingresos,
      gastos,
      balance: ingresos - gastos,
      deudas: deudas?.reduce((s, d) => s + d.monto, 0) ?? 0,
    })

    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() })
    setChartData(days.map(day => {
      const d = format(day, 'yyyy-MM-dd')
      const dayTxs = txSerie?.filter(t => t.fecha === d) ?? []
      return {
        fecha: format(day, 'dd/MM'),
        ingresos: dayTxs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0),
        gastos:   dayTxs.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0),
      }
    }))
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
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 bg-panel rounded-2xl" />
          <div className="h-20 bg-panel rounded-2xl" />
        </div>
        <div className="h-56 bg-panel rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Saludo */}
      <div>
        <p className="text-dim text-sm">{greeting}</p>
        <h2 className="text-xl font-bold text-ink capitalize">{mesActual}</h2>
      </div>

      {/* Hero — Balance */}
      <div className="relative overflow-hidden rounded-3xl bg-panel border border-line p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-dim text-xs mb-1">Balance del mes · {cur.flag} {cur.code}</p>
          <p className={`text-5xl font-bold tracking-tight mb-4 ${stats.balance >= 0 ? 'text-ink' : 'text-red-400'}`}>
            {fmt(stats.balance)}
          </p>
          <div className="flex gap-6">
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp size={13} className="text-green-400" />
                <span className="text-xs text-dim">Ingresos</span>
              </div>
              <p className="text-green-400 font-semibold">{fmt(stats.ingresos)}</p>
            </div>
            <div className="w-px bg-line" />
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingDown size={13} className="text-red-400" />
                <span className="text-xs text-dim">Gastos</span>
              </div>
              <p className="text-red-400 font-semibold">{fmt(stats.gastos)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Deudas pendientes */}
      {stats.deudas > 0 && (
        <button onClick={() => navigate('/deudas')}
          className="w-full flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-4 py-3 hover:bg-yellow-500/15 transition-colors">
          <AlertCircle size={18} className="text-yellow-400 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-xs text-dim">Deudas pendientes</p>
            <p className="text-yellow-400 font-semibold text-sm">{fmt(stats.deudas)}</p>
          </div>
          <ArrowRight size={16} className="text-dim" />
        </button>
      )}

      {/* Gráfico */}
      <div className="bg-panel rounded-2xl border border-line p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-ink">Últimos 30 días</p>
          <div className="flex gap-3">
            <span className="flex items-center gap-1.5 text-xs text-dim">
              <span className="w-3 h-0.5 bg-green-400 rounded inline-block" />Ingresos
            </span>
            <span className="flex items-center gap-1.5 text-xs text-dim">
              <span className="w-3 h-0.5 bg-red-400 rounded inline-block" />Gastos
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="fecha"
              tick={{ fill: 'var(--dim)', fontSize: 10 }}
              axisLine={false} tickLine={false}
              interval={Math.floor(chartData.length / 5)}
            />
            <YAxis tick={{ fill: 'var(--dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--line)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="ingresos" stroke="#22c55e" strokeWidth={2}
              fill="url(#gI)" dot={false} activeDot={{ r: 4, fill: '#22c55e', stroke: 'var(--panel)', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2}
              fill="url(#gG)" dot={false} activeDot={{ r: 4, fill: '#ef4444', stroke: 'var(--panel)', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
