import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../context/CurrencyContext'
import { Plus, Trash2, TrendingUp, TrendingDown, X } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import BottomSheet from '../components/BottomSheet'

const DEFAULT_CATS = ['Comida', 'Transporte', 'Salud', 'Educación', 'Entretenimiento', 'Hogar', 'Sueldo', 'Freelance', 'Otro']

const EMPTY_FORM = {
  monto: '', descripcion: '', categoria: DEFAULT_CATS[0],
  tipo: 'gasto', fecha: new Date().toISOString().slice(0, 10)
}

const PERIODS = [
  { id: 'mes',      label: 'Este mes' },
  { id: 'anterior', label: 'Mes ant.' },
  { id: 'todo',     label: 'Todo' },
]

export default function Transacciones() {
  const { user } = useAuth()
  const { format: fmt } = useCurrency()
  const [txs, setTxs] = useState([])
  const [categorias, setCategorias] = useState(DEFAULT_CATS)
  const [showForm, setShowForm] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [saving, setSaving] = useState(false)

  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterPeriod, setFilterPeriod] = useState('mes')
  const [filterCategoria, setFilterCategoria] = useState('')

  useEffect(() => {
    if (user) { loadTxs(); loadCategorias() }
  }, [user, filterTipo, filterPeriod, filterCategoria])

  async function loadCategorias() {
    const stored = JSON.parse(localStorage.getItem('categorias_custom') ?? '[]')
    const { data } = await supabase.from('presupuestos').select('categoria').eq('user_id', user.id)
    const merged = [...new Set([...stored, ...(data?.map(p => p.categoria) ?? []), ...DEFAULT_CATS])]
    setCategorias(merged)
  }

  async function loadTxs() {
    let q = supabase.from('transacciones').select('*').eq('user_id', user.id)
    if (filterTipo !== 'todos') q = q.eq('tipo', filterTipo)
    if (filterCategoria) q = q.eq('categoria', filterCategoria)
    if (filterPeriod === 'mes') {
      q = q.gte('fecha', format(startOfMonth(new Date()), 'yyyy-MM-dd'))
           .lte('fecha', format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    } else if (filterPeriod === 'anterior') {
      const prev = subMonths(new Date(), 1)
      q = q.gte('fecha', format(startOfMonth(prev), 'yyyy-MM-dd'))
           .lte('fecha', format(endOfMonth(prev), 'yyyy-MM-dd'))
    }
    const { data } = await q.order('fecha', { ascending: false }).limit(100)
    setTxs(data ?? [])
  }

  function openNew() { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true) }

  function openEdit(tx) {
    if (deleteMode) return
    setEditingId(tx.id)
    setForm({ monto: tx.monto, descripcion: tx.descripcion || '', categoria: tx.categoria, tipo: tx.tipo, fecha: tx.fecha })
    setShowForm(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, monto: parseFloat(form.monto), user_id: user.id }
    if (editingId) {
      await supabase.from('transacciones').update(payload).eq('id', editingId)
    } else {
      await supabase.from('transacciones').insert(payload)
    }
    // Primero recargamos la lista, luego cerramos el form
    await loadTxs()
    setSaving(false)
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleDelete(id) {
    await supabase.from('transacciones').delete().eq('id', id)
    setTxs(prev => prev.filter(t => t.id !== id))
  }

  async function handleAddCategory(e) {
    e.preventDefault()
    if (!newCat.trim()) return
    const stored = JSON.parse(localStorage.getItem('categorias_custom') ?? '[]')
    localStorage.setItem('categorias_custom', JSON.stringify([...new Set([newCat.trim(), ...stored])]))
    setCategorias(prev => [...new Set([newCat.trim(), ...prev])])
    setForm(f => ({ ...f, categoria: newCat.trim() }))
    setNewCat('')
    setShowCatForm(false)
  }

  // Agrupar por fecha
  const grouped = txs.reduce((acc, tx) => {
    if (!acc[tx.fecha]) acc[tx.fecha] = []
    acc[tx.fecha].push(tx)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const totalIngresos = txs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0)
  const totalGastos   = txs.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0)

  return (
    <div className="space-y-3 pb-24">

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-ink">Movimientos</h2>
        </div>
        <button
          onClick={() => setDeleteMode(v => !v)}
          className={`p-2 rounded-xl transition-colors ${deleteMode ? 'bg-red-500/20 text-red-400' : 'bg-well text-dim hover:text-ink'}`}>
          <Trash2 size={18} />
        </button>
      </div>

      {deleteMode && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          <span className="text-xs text-red-400 flex-1">Tocá un movimiento para eliminarlo</span>
          <button onClick={() => setDeleteMode(false)} className="text-dim hover:text-ink">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {[['todos', 'Todos'], ['ingreso', '↑ Ingresos'], ['gasto', '↓ Gastos']].map(([v, label]) => (
            <button key={v} onClick={() => setFilterTipo(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
                filterTipo === v
                  ? v === 'ingreso' ? 'bg-green-500 text-white'
                  : v === 'gasto'   ? 'bg-red-500 text-white'
                  : 'bg-brand-500 text-white'
                  : 'bg-well text-dim hover:text-ink'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex bg-well rounded-xl p-0.5 flex-shrink-0">
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setFilterPeriod(p.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  filterPeriod === p.id ? 'bg-panel text-ink shadow-sm' : 'text-dim hover:text-ink'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}
            className="flex-1 bg-well border border-line rounded-xl px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-brand-500 min-w-0">
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Resumen */}
      {txs.length > 0 && (
        <div className="flex items-center gap-3 text-xs px-1">
          <span className="text-dim">{txs.length} mov.</span>
          <span className="flex-1 border-t border-line" />
          {filterTipo !== 'gasto' && totalIngresos > 0 && (
            <span className="text-green-400 font-medium">+{fmt(totalIngresos)}</span>
          )}
          {filterTipo !== 'ingreso' && totalGastos > 0 && (
            <span className="text-red-400 font-medium">−{fmt(totalGastos)}</span>
          )}
        </div>
      )}

      {/* Lista agrupada por fecha */}
      <div className="space-y-4">
        {sortedDates.map(fecha => {
          const dayItems = grouped[fecha]
          const dayTotal = dayItems.reduce((s, t) => t.tipo === 'ingreso' ? s + t.monto : s - t.monto, 0)
          return (
            <div key={fecha}>
              {/* Separador de fecha */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-dim capitalize">
                  {format(new Date(fecha + 'T12:00:00'), "EEE d MMM", { locale: es })}
                </span>
                <div className="flex-1 h-px bg-line" />
                <span className={`text-xs font-medium ${dayTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {dayTotal >= 0 ? '+' : ''}{fmt(dayTotal)}
                </span>
              </div>

              {/* Ítems del día */}
              <div className="space-y-1.5">
                {dayItems.map(tx => (
                  <div key={tx.id}
                    onClick={() => deleteMode ? handleDelete(tx.id) : openEdit(tx)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-colors ${
                      deleteMode
                        ? 'bg-panel hover:bg-red-900/30 active:bg-red-900/50'
                        : 'bg-panel hover:bg-well'
                    }`}>
                    <div className={`p-2 rounded-xl flex-shrink-0 ${tx.tipo === 'ingreso' ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                      {tx.tipo === 'ingreso'
                        ? <TrendingUp size={16} className="text-green-400" />
                        : <TrendingDown size={16} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {tx.descripcion || tx.categoria}
                      </p>
                      {tx.descripcion && (
                        <p className="text-xs text-dim truncate">{tx.categoria}</p>
                      )}
                    </div>
                    <p className={`font-semibold text-sm flex-shrink-0 ${tx.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.tipo === 'ingreso' ? '+' : '−'}{fmt(tx.monto)}
                    </p>
                    {deleteMode && <Trash2 size={14} className="text-red-400 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {txs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-well flex items-center justify-center text-2xl">📭</div>
            <p className="text-dim text-sm">Sin movimientos para este filtro</p>
            <button onClick={openNew}
              className="text-brand-500 text-sm font-medium hover:underline">
              Agregar el primero
            </button>
          </div>
        )}
      </div>

      {/* FAB simple */}
      <button
        onClick={openNew}
        className="fixed bottom-20 right-4 md:bottom-8 z-30 w-14 h-14 rounded-full bg-brand-500 shadow-lg shadow-brand-500/25 flex items-center justify-center active:scale-95 transition-transform hover:bg-brand-600">
        <Plus size={26} className="text-white" />
      </button>

      {/* Bottom sheet: nuevo / editar */}
      <BottomSheet
        open={showForm}
        onClose={() => { if (!saving) { setShowForm(false); setEditingId(null) } }}
        title={editingId ? 'Editar movimiento' : 'Nuevo movimiento'}
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex gap-2">
            {['gasto', 'ingreso'].map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tipo: t }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  form.tipo === t
                    ? t === 'gasto' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                    : 'bg-well text-dim'
                }`}>
                {t === 'gasto' ? '↓ Gasto' : '↑ Ingreso'}
              </button>
            ))}
          </div>

          <input type="number" placeholder="Monto" value={form.monto}
            onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} required step="0.01" min="0"
            autoFocus
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500 text-lg font-semibold" />

          <input type="text" placeholder="Descripción (opcional)" value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />

          <div className="space-y-2">
            <select value={form.categoria}
              onChange={e => { if (e.target.value === '__nueva__') setShowCatForm(true); else setForm(f => ({ ...f, categoria: e.target.value })) }}
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500">
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__nueva__">＋ Nueva categoría</option>
            </select>
            {showCatForm && (
              <form onSubmit={handleAddCategory} className="flex gap-2 p-3 bg-well rounded-xl border border-brand-500/40">
                <input type="text" placeholder="Nombre de categoría" value={newCat}
                  onChange={e => setNewCat(e.target.value)} required autoFocus
                  className="flex-1 bg-transparent text-ink text-sm focus:outline-none placeholder:text-dim" />
                <button type="submit" className="text-brand-500 text-sm font-medium">Crear</button>
                <button type="button" onClick={() => setShowCatForm(false)} className="text-dim text-sm">✕</button>
              </form>
            )}
          </div>

          <input type="date" value={form.fecha}
            onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />

          <button type="submit" disabled={saving}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors">
            {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
