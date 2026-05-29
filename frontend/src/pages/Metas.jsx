import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import { Plus, Trash2, PlusCircle } from 'lucide-react'
import { format } from 'date-fns'
import BottomSheet from '../components/BottomSheet'

const EMOJIS = ['🎯','✈️','🏠','🚗','💻','📱','🎓','💍','🏋️','🌴','🛡️','🎸','🐶','👶','🏦','💎','🎁','⛵']

export default function Metas() {
  const { user } = useAuth()
  const { format: fmt } = useCurrency()
  const { toast } = useToast()
  const [metas, setMetas] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [showAporte, setShowAporte] = useState(null)
  const [aporteVal, setAporteVal] = useState('')
  const [form, setForm] = useState({ nombre: '', icono: '🎯', monto_objetivo: '', fecha_limite: '' })

  useEffect(() => { if (user) loadMetas() }, [user])

  async function loadMetas() {
    const { data } = await supabase.from('metas').select('*').eq('user_id', user.id).order('created_at')
    setMetas(data ?? [])
  }

  async function handleAdd(e) {
    e.preventDefault()
    const { error } = await supabase.from('metas').insert({
      nombre: form.nombre,
      icono: form.icono,
      monto_objetivo: parseFloat(form.monto_objetivo),
      monto_actual: 0,
      fecha_limite: form.fecha_limite || null,
      user_id: user.id,
    })
    if (error) { toast(error.message, 'error'); return }
    toast('Meta creada')
    setShowForm(false)
    setForm({ nombre: '', icono: '🎯', monto_objetivo: '', fecha_limite: '' })
    loadMetas()
  }

  async function handleAporte(meta) {
    const val = parseFloat(aporteVal)
    if (!val || val <= 0) return
    const nuevo = Math.min(meta.monto_actual + val, meta.monto_objetivo)
    const { error } = await supabase.from('metas').update({ monto_actual: nuevo }).eq('id', meta.id)
    if (error) { toast(error.message, 'error'); return }
    toast(nuevo >= meta.monto_objetivo ? '🎉 ¡Meta completada!' : 'Aporte registrado')
    setShowAporte(null)
    setAporteVal('')
    loadMetas()
  }

  async function handleDelete(id) {
    await supabase.from('metas').delete().eq('id', id)
    setMetas(prev => prev.filter(m => m.id !== id))
    toast('Meta eliminada', 'warning')
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Metas de ahorro</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={16} /> Nueva
        </button>
      </div>

      <div className="space-y-3">
        {metas.map(m => {
          const pct = m.monto_objetivo > 0 ? Math.min((m.monto_actual / m.monto_objetivo) * 100, 100) : 0
          const completada = pct >= 100
          const falta = m.monto_objetivo - m.monto_actual

          return (
            <div key={m.id} className={`bg-panel rounded-2xl border p-4 ${completada ? 'border-income/30' : 'border-line'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{m.icono}</span>
                  <div>
                    <p className="font-semibold text-ink text-sm">{m.nombre}</p>
                    {m.fecha_limite && (
                      <p className="text-xs text-dim">
                        hasta {format(new Date(m.fecha_limite + 'T12:00:00'), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!completada && (
                    <button onClick={() => { setShowAporte(m); setAporteVal('') }}
                      className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-500/10 transition-colors">
                      <PlusCircle size={18} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded-lg text-dim hover:text-expense transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="h-2 bg-well rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: completada ? 'var(--income)' : 'var(--brand-500)',
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-dim">
                  {fmt(m.monto_actual)} / {fmt(m.monto_objetivo)}
                </span>
                {completada
                  ? <span className="text-income font-semibold">✓ Completada</span>
                  : <span className={`font-medium ${pct >= 75 ? 'text-income' : 'text-dim'}`}>
                      {pct.toFixed(0)}% · falta {fmt(falta)}
                    </span>
                }
              </div>
            </div>
          )
        })}

        {metas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-well flex items-center justify-center text-2xl">🎯</div>
            <p className="text-dim text-sm">Sin metas definidas</p>
            <button onClick={() => setShowForm(true)}
              className="text-brand-500 text-sm font-medium hover:underline">
              Crear la primera
            </button>
          </div>
        )}
      </div>

      {/* Form nueva meta */}
      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title="Nueva meta">
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <button type="button" onClick={() => setShowEmojis(!showEmojis)}
              className="flex items-center gap-3 bg-well border border-line rounded-xl px-4 py-2.5 w-full hover:border-brand-500/50 transition-colors">
              <span className="text-2xl">{form.icono}</span>
              <span className="text-sm text-dim">Elegir ícono</span>
            </button>
            {showEmojis && (
              <div className="mt-2 bg-well border border-line rounded-xl p-3 grid grid-cols-9 gap-1">
                {EMOJIS.map(e => (
                  <button key={e} type="button"
                    onClick={() => { setForm(f => ({ ...f, icono: e })); setShowEmojis(false) }}
                    className={`text-xl p-1.5 rounded-lg hover:bg-panel transition-colors ${form.icono === e ? 'bg-brand-500/20 ring-1 ring-brand-500' : ''}`}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input type="text" placeholder="Nombre (ej: Vacaciones, Auto…)" value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />

          <input type="number" placeholder="Monto objetivo" value={form.monto_objetivo}
            onChange={e => setForm(f => ({ ...f, monto_objetivo: e.target.value }))} required step="0.01" min="1"
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink text-lg font-semibold focus:outline-none focus:border-brand-500" />

          <div>
            <label className="text-xs text-dim mb-1 block">Fecha límite (opcional)</label>
            <input type="date" value={form.fecha_limite}
              onChange={e => setForm(f => ({ ...f, fecha_limite: e.target.value }))}
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />
          </div>

          <button type="submit"
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl">
            Crear meta
          </button>
        </form>
      </BottomSheet>

      {/* Sheet aporte */}
      <BottomSheet open={!!showAporte} onClose={() => setShowAporte(null)} title={`Aportar a ${showAporte?.nombre}`}>
        <div className="space-y-3">
          <input type="number" placeholder="Monto a aportar" value={aporteVal}
            onChange={e => setAporteVal(e.target.value)} step="0.01" min="0"
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink text-lg font-semibold focus:outline-none focus:border-brand-500" />
          {showAporte && (
            <p className="text-xs text-dim text-center">
              Actual: {fmt(showAporte.monto_actual)} · Objetivo: {fmt(showAporte.monto_objetivo)}
            </p>
          )}
          <button onClick={() => handleAporte(showAporte)}
            disabled={!aporteVal || parseFloat(aporteVal) <= 0}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
            Registrar aporte
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
