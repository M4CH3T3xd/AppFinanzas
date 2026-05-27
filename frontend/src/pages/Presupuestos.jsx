import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import { getCategoryMeta, COLOR_OPTIONS, ICON_OPTIONS } from '../lib/categoryMeta'
import { Plus, Trash2, Pencil, Check, AlertTriangle } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'
import BottomSheet from '../components/BottomSheet'

function CategoryIcon({ nombre, size = 36 }) {
  const meta = getCategoryMeta(nombre)
  const Icon = meta.icon
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: meta.color + '22', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={size - Math.round(size * 0.44)} style={{ color: meta.color }} />
    </div>
  )
}

function BarPresupuesto({ pct }) {
  const color = pct >= 100 ? '#ff4d6d' : pct >= 80 ? '#f59e0b' : pct >= 50 ? '#7c6af7' : '#00e676'
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--well)' }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, background: color, minWidth: pct > 0 ? 6 : 0 }} />
    </div>
  )
}

export default function Presupuestos() {
  const { user } = useAuth()
  const { format: fmt } = useCurrency()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const [presupuestos, setPresupuestos] = useState([])
  const [gastosPorCategoria, setGastosPorCategoria] = useState({})
  const [showForm, setShowForm] = useState(searchParams.get('nuevo') === '1')
  const [form, setForm] = useState({ categoria: '', limite: '', color: COLOR_OPTIONS[0], icon: 'tag' })
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal]     = useState('')

  useEffect(() => { if (user) { loadPresupuestos(); loadGastos() } }, [user])

  async function loadPresupuestos() {
    const { data } = await supabase.from('presupuestos').select('*').eq('user_id', user.id)
    setPresupuestos(data ?? [])
  }

  async function loadGastos() {
    const inicio = startOfMonth(new Date()).toISOString()
    const fin    = endOfMonth(new Date()).toISOString()
    const { data } = await supabase.from('transacciones').select('categoria,monto')
      .eq('user_id', user.id).eq('tipo', 'gasto').gte('fecha', inicio).lte('fecha', fin)
    const map = {}
    data?.forEach(t => { map[t.categoria] = (map[t.categoria] ?? 0) + t.monto })
    setGastosPorCategoria(map)
  }

  async function handleAdd(e) {
    e.preventDefault()
    const { error } = await supabase.from('presupuestos').insert({
      categoria: form.categoria,
      limite: form.limite ? parseFloat(form.limite) : null,
      user_id: user.id,
    })
    if (error) { toast(error.message, 'error'); return }
    toast('Presupuesto guardado')
    setShowForm(false)
    setForm({ categoria: '', limite: '', color: COLOR_OPTIONS[0], icon: 'tag' })
    loadPresupuestos()
  }

  async function handleDelete(id) {
    await supabase.from('presupuestos').delete().eq('id', id)
    setPresupuestos(prev => prev.filter(p => p.id !== id))
    toast('Presupuesto eliminado', 'warning')
  }

  async function saveEdit(id) {
    const val = parseFloat(editVal)
    if (!val || val <= 0) { setEditingId(null); return }
    const { error } = await supabase.from('presupuestos').update({ limite: val }).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    toast('Límite actualizado')
    setEditingId(null)
    loadPresupuestos()
  }

  // Resumen total
  const totalPresupuestado = presupuestos.reduce((s, p) => s + (p.limite ?? 0), 0)
  const totalGastado = presupuestos.reduce((s, p) => s + (gastosPorCategoria[p.categoria] ?? 0), 0)
  const pctTotal = totalPresupuestado > 0 ? Math.min((totalGastado / totalPresupuestado) * 100, 100) : 0
  const alertas = presupuestos.filter(p => {
    const g = gastosPorCategoria[p.categoria] ?? 0
    const pct = p.limite ? (g / p.limite) * 100 : 0
    return pct >= 80
  })

  return (
    <div className="space-y-4 pb-8">

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Presupuestos</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* Hero resumen */}
      {presupuestos.length > 0 && (
        <div className="bg-panel border border-line rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-dim mb-0.5">Total gastado este mes</p>
              <p className="text-2xl font-bold text-ink">{fmt(totalGastado)}</p>
              <p className="text-xs text-dim">de {fmt(totalPresupuestado)} presupuestado</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${pctTotal >= 100 ? 'text-expense' : pctTotal >= 80 ? 'text-yellow-400' : 'text-income'}`}>
                {pctTotal.toFixed(0)}%
              </p>
              <p className="text-xs text-dim">utilizado</p>
            </div>
          </div>
          <BarPresupuesto pct={pctTotal} />
        </div>
      )}

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="flex items-start gap-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-4 py-3">
          <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-yellow-400">Cerca del límite</p>
            <p className="text-xs text-dim mt-0.5">
              {alertas.map(p => p.categoria).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {presupuestos.map(p => {
          const gastado   = gastosPorCategoria[p.categoria] ?? 0
          const tieneLimit = p.limite != null && p.limite > 0
          const pct = tieneLimit ? (gastado / p.limite) * 100 : 0
          const superado = pct >= 100
          const cerca    = pct >= 80 && !superado
          const meta = getCategoryMeta(p.categoria)

          return (
            <div key={p.id}
              className={`bg-panel rounded-2xl border p-4 transition-colors ${
                superado ? 'border-expense/40' : cerca ? 'border-yellow-500/30' : 'border-line'
              }`}>
              <div className="flex items-center gap-3 mb-3">
                <CategoryIcon nombre={p.categoria} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink text-sm">{p.categoria}</p>
                    {superado && (
                      <span className="text-xs bg-expense/15 text-expense px-2 py-0.5 rounded-full font-medium">
                        Superado
                      </span>
                    )}
                    {cerca && (
                      <span className="text-xs bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                        ⚠ Cerca
                      </span>
                    )}
                  </div>

                  {/* Límite editable */}
                  {editingId === p.id ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                        autoFocus step="0.01"
                        className="w-28 bg-well border border-brand-500 rounded-lg px-2 py-1 text-xs text-ink focus:outline-none" />
                      <button type="button" onClick={() => saveEdit(p.id)}
                        className="p-1 rounded-lg bg-brand-500/20 text-brand-500 hover:bg-brand-500/30">
                        <Check size={13} />
                      </button>
                      <button type="button" onClick={() => setEditingId(null)}
                        className="text-xs text-dim hover:text-ink">✕</button>
                    </div>
                  ) : (
                    <p className="text-xs text-dim mt-0.5">
                      {fmt(gastado)}{tieneLimit ? ` / ${fmt(p.limite)}` : ' — sin límite'}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingId(p.id); setEditVal(p.limite ?? '') }}
                    className="p-1.5 rounded-lg text-dim hover:text-brand-500 hover:bg-brand-500/10 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className="p-1.5 rounded-lg text-dim hover:text-expense hover:bg-expense/10 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {tieneLimit && (
                <>
                  <BarPresupuesto pct={pct} />
                  <p className="text-xs text-dim mt-1.5">{Math.min(pct, 100).toFixed(0)}% utilizado</p>
                </>
              )}
            </div>
          )
        })}

        {presupuestos.length === 0 && (
          <p className="text-center text-dim py-12">Sin categorías configuradas</p>
        )}
      </div>

      {/* Form nueva categoría */}
      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title="Nueva categoría">
        <form onSubmit={handleAdd} className="space-y-3">
          <input type="text" placeholder="Nombre (ej: Comida, Alquiler…)" value={form.categoria}
            onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} required autoFocus
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />
          <div>
            <label className="text-xs text-dim mb-1 block">Límite mensual (opcional)</label>
            <input type="number" placeholder="Sin límite" value={form.limite}
              onChange={e => setForm(f => ({ ...f, limite: e.target.value }))} step="0.01"
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />
          </div>

          <div>
            <p className="text-xs text-dim mb-1.5">Color del ícono</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ background: c }}
                  className={`w-7 h-7 rounded-lg transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white/40' : ''}`} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-dim mb-1.5">Ícono</p>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(({ key, icon: Icon }) => (
                <button key={key} type="button" onClick={() => setForm(f => ({ ...f, icon: key }))}
                  style={{ background: form.color + (form.icon === key ? '40' : '18') }}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${form.icon === key ? 'ring-2 ring-white/30 scale-110' : ''}`}>
                  <Icon size={16} style={{ color: form.color }} />
                </button>
              ))}
            </div>
          </div>

          <button type="submit"
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl">
            Guardar
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
