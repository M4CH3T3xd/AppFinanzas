import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../context/CurrencyContext'
import { Plus, Check, Trash2, Lock } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { format } from 'date-fns'
import BottomSheet from '../components/BottomSheet'

const EMOJIS = ['💳','🏠','🚗','📱','🎓','🏥','✈️','🍽️','💼','👤','🏦','💰','📦','🎮','👗','⚡','🔧','🐾']

export default function Deudas() {
  const { user } = useAuth()
  const { format: fmt } = useCurrency()
  const { toast } = useToast()
  const [deudas, setDeudas] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [form, setForm] = useState({ descripcion: '', monto: '', tipo: 'debo', vencimiento: '', icono: '💳' })

  useEffect(() => { if (user) loadDeudas() }, [user])

  async function loadDeudas() {
    const { data } = await supabase.from('deudas').select('*').eq('user_id', user.id)
      .order('pagado').order('vencimiento', { ascending: true, nullsFirst: false })
    setDeudas(data ?? [])
  }

  async function handleAdd(e) {
    e.preventDefault()
    await supabase.from('deudas').insert({
      descripcion: form.descripcion,
      monto: parseFloat(form.monto),
      tipo: form.tipo,
      vencimiento: form.vencimiento || null,
      icono: form.icono,
      pagado: false,
      user_id: user.id
    })
    toast('Deuda guardada')
    setShowForm(false)
    setForm({ descripcion: '', monto: '', tipo: 'debo', vencimiento: '', icono: '💳' })
    loadDeudas()
  }

  async function togglePagado(id, pagado) {
    await supabase.from('deudas').update({ pagado: !pagado }).eq('id', id)
    toast(pagado ? 'Marcada como pendiente' : 'Marcada como pagada')
    loadDeudas()
  }

  async function handleDelete(id) {
    await supabase.from('deudas').delete().eq('id', id)
    setDeudas(prev => prev.filter(d => d.id !== id))
    toast('Deuda eliminada', 'warning')
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Deudas</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={16} /> Nueva
        </button>
      </div>

      <div className="space-y-2">
        {deudas.map(d => (
          <div key={d.id} className={`bg-panel rounded-2xl px-4 py-3 flex items-center gap-3 transition-opacity ${d.pagado ? 'opacity-50' : ''}`}>
            <button onClick={() => togglePagado(d.id, d.pagado)}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${d.pagado ? 'border-brand-500 bg-brand-500' : 'border-line hover:border-brand-500'}`}>
              {d.pagado && <Check size={14} className="text-white" />}
            </button>
            <span className="text-xl flex-shrink-0">{d.icono ?? '💳'}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${d.pagado ? 'line-through text-dim' : 'text-ink'}`}>{d.descripcion}</p>
              <p className="text-xs text-dim">
                {d.tipo === 'debo' ? '⬆ Debo' : '⬇ Me deben'}
                {d.vencimiento ? ` · vence ${format(new Date(d.vencimiento), 'dd/MM/yyyy')}` : ''}
              </p>
            </div>
            <p className={`font-semibold text-sm flex-shrink-0 ${d.tipo === 'debo' ? 'text-red-400' : 'text-green-400'}`}>
              {fmt(d.monto)}
            </p>
            <button onClick={() => handleDelete(d.id)} className="text-dim hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {deudas.length === 0 && <p className="text-center text-dim py-12">Sin deudas registradas</p>}
      </div>

      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title="Nueva deuda">
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-2">
            {['debo', 'me deben'].map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tipo: t }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${form.tipo === t ? 'bg-brand-500 text-white' : 'bg-well text-dim'}`}>
                {t}
              </button>
            ))}
          </div>

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

          <input type="text" placeholder="Descripción / A quién" value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} required
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />

          <input type="number" placeholder="Monto" value={form.monto}
            onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} required step="0.01"
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />

          <div>
            <label className="text-xs text-dim mb-1 block">Vencimiento (opcional)</label>
            <input type="date" value={form.vencimiento}
              onChange={e => setForm(f => ({ ...f, vencimiento: e.target.value }))}
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />
          </div>

          {/* Campos futuros: cuotas y tasa */}
          <div className="rounded-xl border border-line p-3 space-y-2 opacity-50">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={13} className="text-dim" />
              <span className="text-xs text-dim font-medium">Próximamente</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-dim block mb-1">Cuotas</label>
                <input disabled placeholder="ej: 12" className="w-full bg-well rounded-lg px-3 py-2 text-sm text-dim cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs text-dim block mb-1">Tasa de interés (%)</label>
                <input disabled placeholder="ej: 5.5" className="w-full bg-well rounded-lg px-3 py-2 text-sm text-dim cursor-not-allowed" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl">
            Guardar
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
