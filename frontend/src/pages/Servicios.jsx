import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../context/CurrencyContext'
import { Plus, Trash2, Check, Bell } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import BottomSheet from '../components/BottomSheet'

const EMOJIS = ['📦','📱','🏠','⚡','💧','🌐','🎬','🎵','🏋️','🚗','🏥','📺','☁️','🔒','🐾','📧','🎓','💼']

const CATEGORIAS = ['Streaming', 'Utilities', 'Salud', 'Transporte', 'Software', 'Educación', 'Hogar', 'Otro']

function diasHastaVencimiento(dia) {
  if (!dia) return null
  const hoy = new Date()
  const vence = new Date(hoy.getFullYear(), hoy.getMonth(), dia)
  if (vence < hoy) vence.setMonth(vence.getMonth() + 1)
  const diff = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
  return diff
}

function pagadoEsteMes(ultimoPago) {
  if (!ultimoPago) return false
  const pago = new Date(ultimoPago)
  const hoy = new Date()
  return pago.getMonth() === hoy.getMonth() && pago.getFullYear() === hoy.getFullYear()
}

export default function Servicios() {
  const { user } = useAuth()
  const { format: fmt } = useCurrency()
  const { toast } = useToast()
  const [servicios, setServicios] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [form, setForm] = useState({
    nombre: '', monto: '', icono: '📦', dia_vencimiento: '', categoria: 'Otro', activo: true
  })

  useEffect(() => { if (user) loadServicios() }, [user])

  async function loadServicios() {
    const { data } = await supabase
      .from('servicios')
      .select('*')
      .eq('user_id', user.id)
      .order('dia_vencimiento', { ascending: true, nullsFirst: false })
    setServicios(data ?? [])
  }

  async function handleAdd(e) {
    e.preventDefault()
    await supabase.from('servicios').insert({
      nombre: form.nombre,
      monto: parseFloat(form.monto),
      icono: form.icono,
      dia_vencimiento: form.dia_vencimiento ? parseInt(form.dia_vencimiento) : null,
      categoria: form.categoria,
      activo: true,
      user_id: user.id,
    })
    toast('Servicio guardado')
    setShowForm(false)
    setForm({ nombre: '', monto: '', icono: '📦', dia_vencimiento: '', categoria: 'Otro', activo: true })
    loadServicios()
  }

  async function togglePagado(s) {
    const yaEstaMes = pagadoEsteMes(s.ultimo_pago)
    const nuevaFecha = yaEstaMes ? null : new Date().toISOString().slice(0, 10)
    await supabase.from('servicios').update({ ultimo_pago: nuevaFecha }).eq('id', s.id)
    toast(yaEstaMes ? 'Marcado como pendiente' : 'Marcado como pagado')
    loadServicios()
  }

  async function handleDelete(id) {
    await supabase.from('servicios').delete().eq('id', id)
    setServicios(prev => prev.filter(s => s.id !== id))
    toast('Servicio eliminado', 'warning')
  }

  const activos = servicios.filter(s => s.activo)
  const totalMensual = activos.reduce((sum, s) => sum + s.monto, 0)
  const pagadosEsteMes = activos.filter(s => pagadoEsteMes(s.ultimo_pago)).length
  const proximosAVencer = activos.filter(s => {
    const dias = diasHastaVencimiento(s.dia_vencimiento)
    return dias !== null && dias <= 5 && !pagadoEsteMes(s.ultimo_pago)
  })

  return (
    <div className="space-y-4 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Servicios</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* Resumen total */}
      {activos.length > 0 && (
        <div className="bg-panel border border-line rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-dim mb-0.5">Total fijo mensual</p>
            <p className="text-2xl font-bold text-ink">{fmt(totalMensual)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-dim mb-0.5">Pagados este mes</p>
            <p className="text-sm font-semibold text-green-400">{pagadosEsteMes} / {activos.length}</p>
          </div>
        </div>
      )}

      {/* Alerta de próximos a vencer */}
      {proximosAVencer.length > 0 && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-4 py-3">
          <Bell size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-yellow-400">Próximos a vencer</p>
            <p className="text-xs text-dim mt-0.5">
              {proximosAVencer.map(s => `${s.icono} ${s.nombre}`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {servicios.map(s => {
          const dias = diasHastaVencimiento(s.dia_vencimiento)
          const esPagado = pagadoEsteMes(s.ultimo_pago)
          const urgente = dias !== null && dias <= 5 && !esPagado

          return (
            <div key={s.id}
              className={`bg-panel rounded-2xl px-4 py-3 flex items-center gap-3 transition-opacity ${esPagado ? 'opacity-60' : ''}`}>

              {/* Check de pagado */}
              <button onClick={() => togglePagado(s)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  esPagado ? 'border-brand-500 bg-brand-500' : 'border-line hover:border-brand-500'
                }`}>
                {esPagado && <Check size={14} className="text-white" />}
              </button>

              <span className="text-xl flex-shrink-0">{s.icono}</span>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${esPagado ? 'line-through text-dim' : 'text-ink'}`}>
                  {s.nombre}
                </p>
                <p className="text-xs text-dim">
                  {s.categoria}
                  {s.dia_vencimiento && (
                    <span className={urgente ? 'text-yellow-400 ml-1' : 'ml-1'}>
                      · vence día {s.dia_vencimiento}
                      {dias !== null && !esPagado && (
                        dias === 0 ? ' (hoy)' : ` (${dias}d)`
                      )}
                    </span>
                  )}
                </p>
              </div>

              <p className="font-semibold text-sm text-ink flex-shrink-0">{fmt(s.monto)}</p>

              <button onClick={() => handleDelete(s.id)} className="text-dim hover:text-red-400 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          )
        })}

        {servicios.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-well flex items-center justify-center text-2xl">📦</div>
            <p className="text-dim text-sm">Sin servicios registrados</p>
            <button onClick={() => setShowForm(true)}
              className="text-brand-500 text-sm font-medium hover:underline">
              Agregar el primero
            </button>
          </div>
        )}
      </div>

      {/* Formulario */}
      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title="Nuevo servicio">
        <form onSubmit={handleAdd} className="space-y-3">

          {/* Emoji picker */}
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

          <input type="text" placeholder="Nombre (ej: Netflix, Luz, Gimnasio…)" value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />

          <input type="number" placeholder="Monto mensual" value={form.monto}
            onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} required step="0.01" min="0"
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink text-lg font-semibold focus:outline-none focus:border-brand-500" />

          <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500">
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div>
            <label className="text-xs text-dim mb-1 block">Día de vencimiento (opcional)</label>
            <input type="number" placeholder="ej: 15" value={form.dia_vencimiento}
              onChange={e => setForm(f => ({ ...f, dia_vencimiento: e.target.value }))}
              min="1" max="31"
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />
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
