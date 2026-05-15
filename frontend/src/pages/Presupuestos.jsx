import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../context/CurrencyContext'
import { Plus, Trash2 } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'
import BottomSheet from '../components/BottomSheet'

export default function Presupuestos() {
  const { user } = useAuth()
  const { format: fmt } = useCurrency()
  const [searchParams] = useSearchParams()
  const [presupuestos, setPresupuestos] = useState([])
  const [gastosPorCategoria, setGastosPorCategoria] = useState({})
  const [showForm, setShowForm] = useState(searchParams.get('nuevo') === '1')
  const [form, setForm] = useState({ categoria: '', limite: '' })

  useEffect(() => { if (user) { loadPresupuestos(); loadGastos() } }, [user])

  async function loadPresupuestos() {
    const { data } = await supabase.from('presupuestos').select('*').eq('user_id', user.id)
    setPresupuestos(data ?? [])
  }

  async function loadGastos() {
    const inicio = startOfMonth(new Date()).toISOString()
    const fin = endOfMonth(new Date()).toISOString()
    const { data } = await supabase.from('transacciones').select('categoria,monto')
      .eq('user_id', user.id).eq('tipo', 'gasto').gte('fecha', inicio).lte('fecha', fin)
    const map = {}
    data?.forEach(t => { map[t.categoria] = (map[t.categoria] ?? 0) + t.monto })
    setGastosPorCategoria(map)
  }

  async function handleAdd(e) {
    e.preventDefault()
    await supabase.from('presupuestos').insert({
      categoria: form.categoria,
      limite: form.limite ? parseFloat(form.limite) : null,
      user_id: user.id
    })
    setShowForm(false)
    setForm({ categoria: '', limite: '' })
    loadPresupuestos()
  }

  async function handleDelete(id) {
    await supabase.from('presupuestos').delete().eq('id', id)
    setPresupuestos(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Presupuestos</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      <div className="space-y-3">
        {presupuestos.map(p => {
          const gastado = gastosPorCategoria[p.categoria] ?? 0
          const tieneLimit = p.limite != null && p.limite > 0
          const pct = tieneLimit ? Math.min((gastado / p.limite) * 100, 100) : 0
          const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-brand-500'
          return (
            <div key={p.id} className="bg-panel rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-ink">{p.categoria}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-dim">
                    {fmt(gastado)}{tieneLimit ? ` / ${fmt(p.limite)}` : ''}
                  </span>
                  <button onClick={() => handleDelete(p.id)} className="text-dim hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {tieneLimit ? (
                <>
                  {/* Track */}
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--well)' }}>
                    {/* Fill — mínimo 4px para que sea visible */}
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.max(pct, pct > 0 ? 1 : 0)}%`, minWidth: gastado > 0 ? '8px' : '0' }}
                    />
                  </div>
                  <p className="text-xs text-dim mt-1.5">
                    {pct.toFixed(0)}% utilizado
                    {pct >= 90 && <span className="text-red-400 ml-1">⚠ Límite alcanzado</span>}
                  </p>
                </>
              ) : (
                <div className="h-2 rounded-full" style={{ background: 'var(--well)' }}>
                  <div className="h-full w-full rounded-full opacity-20 bg-brand-500" />
                </div>
              )}
            </div>
          )
        })}
        {presupuestos.length === 0 && <p className="text-center text-dim py-12">Sin categorías configuradas</p>}
      </div>

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
          <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl">
            Guardar
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
