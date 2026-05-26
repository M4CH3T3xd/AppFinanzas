import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../context/CurrencyContext'
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

function StatCard({ label, value, icon: Icon, bgClass, textClass, sub }) {
  const { format: fmt } = useCurrency()
  return (
    <div className="bg-panel rounded-2xl p-4 flex items-center gap-3">
      <div className={`p-3 rounded-xl flex-shrink-0 ${bgClass}`}>
        <Icon size={20} className={textClass} />
      </div>
      <div className="min-w-0">
        <p className="text-dim text-xs">{label}</p>
        <p className="text-lg font-bold text-ink truncate">{fmt(value)}</p>
        {sub != null && (
          <p className={`text-xs ${sub >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {sub >= 0 ? '+' : ''}{fmt(sub)} vs mes ant.
          </p>
        )}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  const { format: fmt } = useCurrency()
  if (!active || !payload?.length) return null
  return (
    <div className="bg-well border border-line rounded-xl p-3 text-xs shadow-xl">
      <p className="text-dim mb-1.5 font-medium">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.dataKey === 'ingresos' ? '↑ Ingresos' : '↓ Gastos'}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { getCurrency } = useCurrency()
  const cur = getCurrency()

  const [stats, setStats] = useState({ ingresos: 0, gastos: 0, balance: 0, deudas: 0 })
  const [chartData, setChartData] = useState([])

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
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
  }

  const mesActual = format(new Date(), 'MMMM yyyy', { locale: es })
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 20) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-dim text-sm">{greeting}</p>
          <h2 className="text-xl font-bold text-ink capitalize">{mesActual}</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-well px-3 py-1.5 rounded-xl text-xs text-dim">
          <span>{cur.flag}</span>
          <span>{cur.code}</span>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Ingresos"  value={stats.ingresos} icon={TrendingUp}   bgClass="bg-green-500/15"  textClass="text-green-400" />
        <StatCard label="Gastos"    value={stats.gastos}   icon={TrendingDown} bgClass="bg-red-500/15"    textClass="text-red-400" />
        <StatCard
          label="Balance"
          value={stats.balance}
          icon={Wallet}
          bgClass={stats.balance >= 0 ? 'bg-brand-500/15' : 'bg-orange-500/15'}
          textClass={stats.balance >= 0 ? 'text-brand-500' : 'text-orange-400'}
        />
        <StatCard label="Deudas pendientes" value={stats.deudas} icon={AlertCircle} bgClass="bg-yellow-500/15" textClass="text-yellow-400" />
      </div>

      {/* Gráfico */}
      <div className="bg-panel rounded-2xl p-4">
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
                <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="fecha"
              tick={{ fill: 'var(--dim)', fontSize: 10 }}
              axisLine={false} tickLine={false}
              interval={Math.floor(chartData.length / 5)}
            />
            <YAxis
              tick={{ fill: 'var(--dim)', fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
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
