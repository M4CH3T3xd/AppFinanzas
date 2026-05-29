import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import { getCategoryMeta, saveCustomCategoryMeta, COLOR_OPTIONS, ICON_OPTIONS } from '../lib/categoryMeta'
import { Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import BottomSheet from '../components/BottomSheet'

const DEFAULT_CATS = ['Comida','Transporte','Salud','Educación','Entretenimiento','Hogar','Sueldo','Freelance','Otro']

const PERIODS = [
  { id: 'mes',      label: 'Este mes' },
  { id: 'anterior', label: 'Mes ant.' },
  { id: 'todo',     label: 'Todo' },
]

function CategoryIcon({ nombre, size = 36 }) {
  const meta = getCategoryMeta(nombre)
  const Icon = meta.icon
  const pad = Math.round(size * 0.28)
  return (
    <div style={{
      width: size, height: size,
      borderRadius: size * 0.3,
      background: meta.color + '22',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={size - pad * 2} style={{ color: meta.color }} />
    </div>
  )
}

function CategoryChip({ nombre, selected, onClick }) {
  const meta = getCategoryMeta(nombre)
  const Icon = meta.icon
  return (
    <button type="button" onClick={onClick}
      style={selected ? { background: meta.color + '22', borderColor: meta.color + '80' } : {}}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap border transition-all flex-shrink-0 ${
        selected ? 'border-2 scale-105' : 'bg-well border-transparent hover:border-line'
      }`}>
      <div style={{ background: meta.color + '30', borderRadius: 6, padding: 3 }}>
        <Icon size={12} style={{ color: meta.color }} />
      </div>
      <span className="text-xs font-medium text-ink">{nombre}</span>
    </button>
  )
}

const makeEmptyForm = () => ({
  monto: '', descripcion: '', categoria: DEFAULT_CATS[0],
  tipo: 'gasto', fecha: new Date().toISOString().slice(0, 10),
})

export default function Transacciones() {
  const { user } = useAuth()
  const { format: fmt } = useCurrency()
  const { toast } = useToast()

  const [txs, setTxs]     = useState([])
  const [categorias, setCategorias] = useState(DEFAULT_CATS)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(makeEmptyForm())
  const [editingId, setEditingId]   = useState(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [showDetalle, setShowDetalle] = useState(false)

  // Nueva categoría
  const [showNewCat, setShowNewCat]   = useState(false)
  const [newCatNombre, setNewCatNombre] = useState('')
  const [newCatColor, setNewCatColor]   = useState(COLOR_OPTIONS[0])
  const [newCatIcon, setNewCatIcon]     = useState('tag')

  const [filterTipo,      setFilterTipo]      = useState('todos')
  const [filterPeriod,    setFilterPeriod]    = useState('mes')
  const [filterCategoria, setFilterCategoria] = useState('')

  useEffect(() => { if (user) { loadTxs(); loadCategorias() } }, [user, filterTipo, filterPeriod, filterCategoria])

  async function loadCategorias() {
    const stored = JSON.parse(localStorage.getItem('categorias_custom') ?? '[]')
    const { data } = await supabase.from('presupuestos').select('categoria').eq('user_id', user.id)
    const merged = [...new Set([...DEFAULT_CATS, ...stored, ...(data?.map(p => p.categoria) ?? [])])]
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
    const { data, error } = await q.order('fecha', { ascending: false }).limit(200)
    if (error) { toast(error.message, 'error'); return }
    setTxs(data ?? [])
  }

  function openNew() {
    setEditingId(null); setForm(makeEmptyForm()); setShowDetalle(false); setShowForm(true)
  }

  function openEdit(tx) {
    if (deleteMode) return
    setEditingId(tx.id)
    setForm({ monto: tx.monto, descripcion: tx.descripcion || '', categoria: tx.categoria, tipo: tx.tipo, fecha: tx.fecha })
    setShowDetalle(false)
    setShowForm(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, monto: parseFloat(form.monto), user_id: user.id }
    let error
    if (editingId) {
      ;({ error } = await supabase.from('transacciones').update(payload).eq('id', editingId))
    } else {
      ;({ error } = await supabase.from('transacciones').insert(payload))
    }
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast(editingId ? 'Movimiento actualizado' : 'Movimiento guardado')
    await loadTxs()
    setShowForm(false); setEditingId(null); setForm(makeEmptyForm())
  }

  async function handleDelete(id) {
    await supabase.from('transacciones').delete().eq('id', id)
    setTxs(prev => prev.filter(t => t.id !== id))
    toast('Movimiento eliminado', 'warning')
  }

  function handleAddCategory() {
    if (!newCatNombre.trim()) return
    const nombre = newCatNombre.trim()
    saveCustomCategoryMeta(nombre, newCatIcon, newCatColor)
    const stored = JSON.parse(localStorage.getItem('categorias_custom') ?? '[]')
    localStorage.setItem('categorias_custom', JSON.stringify([...new Set([nombre, ...stored])]))
    setCategorias(prev => [...new Set([nombre, ...prev])])
    setForm(f => ({ ...f, categoria: nombre }))
    setNewCatNombre(''); setShowNewCat(false)
  }

  const grouped = txs.reduce((acc, tx) => {
    if (!acc[tx.fecha]) acc[tx.fecha] = []
    acc[tx.fecha].push(tx); return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const totalIngresos = txs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0)
  const totalGastos   = txs.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0)

  return (
    <div className="space-y-3 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Movimientos</h2>
        <button onClick={() => setDeleteMode(v => !v)}
          className={`p-2 rounded-xl transition-colors ${deleteMode ? 'bg-expense/20 text-expense' : 'bg-well text-dim hover:text-ink'}`}>
          <Trash2 size={18} />
        </button>
      </div>

      {deleteMode && (
        <div className="flex items-center gap-2 bg-expense/10 border border-expense/20 rounded-xl px-3 py-2">
          <span className="text-xs text-expense flex-1">Tocá un movimiento para eliminarlo</span>
          <button onClick={() => setDeleteMode(false)}><X size={14} className="text-dim" /></button>
        </div>
      )}

      {/* Resumen destacado */}
      {txs.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-panel border border-line rounded-2xl p-3.5">
            <p className="text-xs text-dim mb-1">Ingresos</p>
            <p className="text-income font-bold text-lg">+{fmt(totalIngresos)}</p>
          </div>
          <div className="bg-panel border border-line rounded-2xl p-3.5">
            <p className="text-xs text-dim mb-1">Gastos</p>
            <p className="text-expense font-bold text-lg">−{fmt(totalGastos)}</p>
          </div>
        </div>
      )}

      {/* Filtros — período */}
      <div className="flex gap-2 items-center">
        <div className="flex bg-well rounded-xl p-0.5">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setFilterPeriod(p.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filterPeriod === p.id ? 'bg-panel text-ink shadow-sm' : 'text-dim hover:text-ink'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-1 overflow-x-auto pb-0.5 hide-scrollbar">
          {[['todos', 'Todos'], ['ingreso', 'Ingresos'], ['gasto', 'Gastos']].map(([v, label]) => (
            <button key={v} onClick={() => setFilterTipo(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
                filterTipo === v
                  ? v === 'ingreso' ? 'bg-income/20 text-income'
                  : v === 'gasto'   ? 'bg-expense/20 text-expense'
                  : 'bg-brand-500/20 text-brand-500'
                  : 'bg-well text-dim hover:text-ink'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro categoría — chips con icono */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        <button onClick={() => setFilterCategoria('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0 transition-colors ${
            !filterCategoria ? 'bg-brand-500/20 text-brand-500' : 'bg-well text-dim hover:text-ink'
          }`}>
          Todas
        </button>
        {categorias.map(cat => {
          const meta = getCategoryMeta(cat)
          const Icon = meta.icon
          return (
            <button key={cat} onClick={() => setFilterCategoria(filterCategoria === cat ? '' : cat)}
              style={filterCategoria === cat ? { background: meta.color + '22', borderColor: meta.color + '60' } : {}}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium flex-shrink-0 transition-all border ${
                filterCategoria === cat ? 'border' : 'bg-well border-transparent hover:border-line'
              }`}>
              <Icon size={12} style={{ color: meta.color }} />
              <span className="text-ink">{cat}</span>
            </button>
          )
        })}
      </div>

      {/* Lista agrupada */}
      <div className="space-y-4">
        {sortedDates.map(fecha => {
          const dayItems = grouped[fecha]
          const dayTotal = dayItems.reduce((s, t) => t.tipo === 'ingreso' ? s + t.monto : s - t.monto, 0)
          return (
            <div key={fecha}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-dim capitalize">
                  {format(new Date(fecha + 'T12:00:00'), 'EEE d MMM', { locale: es })}
                </span>
                <div className="flex-1 h-px bg-line" />
                <span className={`text-xs font-semibold ${dayTotal >= 0 ? 'text-income' : 'text-expense'}`}>
                  {dayTotal >= 0 ? '+' : ''}{fmt(dayTotal)}
                </span>
              </div>
              <div className="space-y-1.5">
                {dayItems.map(tx => (
                  <div key={tx.id}
                    onClick={() => deleteMode ? handleDelete(tx.id) : openEdit(tx)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-colors ${
                      deleteMode ? 'bg-panel hover:bg-expense/10' : 'bg-panel hover:bg-well'
                    }`}>
                    <CategoryIcon nombre={tx.categoria} size={38} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {tx.descripcion || tx.categoria}
                      </p>
                      {tx.descripcion && (
                        <p className="text-xs text-dim truncate">{tx.categoria}</p>
                      )}
                    </div>
                    <p className={`font-semibold text-sm flex-shrink-0 ${tx.tipo === 'ingreso' ? 'text-income' : 'text-expense'}`}>
                      {tx.tipo === 'ingreso' ? '+' : '−'}{fmt(tx.monto)}
                    </p>
                    {deleteMode && <Trash2 size={14} className="text-expense flex-shrink-0" />}
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
            <button onClick={openNew} className="text-brand-500 text-sm font-medium hover:underline">
              Agregar el primero
            </button>
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={openNew}
        className="fixed bottom-20 right-4 md:bottom-8 z-30 w-14 h-14 rounded-full bg-brand-500 shadow-lg shadow-brand-500/25 flex items-center justify-center active:scale-95 transition-transform hover:bg-brand-600">
        <Plus size={26} className="text-white" />
      </button>

      {/* Form */}
      <BottomSheet open={showForm}
        onClose={() => { if (!saving) { setShowForm(false); setEditingId(null) } }}
        title={editingId ? 'Editar movimiento' : 'Nuevo movimiento'}>
        <form onSubmit={handleSave} className="space-y-4">

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {['gasto', 'ingreso'].map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tipo: t }))}
                className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                  form.tipo === t
                    ? t === 'gasto'
                      ? 'bg-expense/20 text-expense ring-2 ring-expense/40'
                      : 'bg-income/20 text-income ring-2 ring-income/40'
                    : 'bg-well text-dim hover:text-ink'
                }`}>
                {t === 'gasto' ? '↓ Gasto' : '↑ Ingreso'}
              </button>
            ))}
          </div>

          {/* Monto */}
          <input type="number" placeholder="0.00" value={form.monto}
            onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
            required step="0.01" min="0"
            className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink text-2xl font-bold text-center focus:outline-none focus:border-brand-500" />

          {/* Categorías — chips con icono */}
          <div>
            <p className="text-xs text-dim mb-2">Categoría</p>
            <div className="flex flex-wrap gap-2">
              {categorias.map(cat => (
                <CategoryChip key={cat} nombre={cat}
                  selected={form.categoria === cat}
                  onClick={() => setForm(f => ({ ...f, categoria: cat }))} />
              ))}
              <button type="button" onClick={() => setShowNewCat(v => !v)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-well text-dim hover:text-ink border border-dashed border-line text-xs">
                <Plus size={12} /> Nueva
              </button>
            </div>

            {showNewCat && (
              <div className="mt-3 bg-well border border-line rounded-xl p-3 space-y-3">
                <input type="text" placeholder="Nombre de la categoría" value={newCatNombre}
                  onChange={e => setNewCatNombre(e.target.value)}
                  className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand-500" />

                <div>
                  <p className="text-xs text-dim mb-1.5">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c} type="button" onClick={() => setNewCatColor(c)}
                        style={{ background: c }}
                        className={`w-7 h-7 rounded-lg transition-transform ${newCatColor === c ? 'scale-125 ring-2 ring-white/50' : ''}`} />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-dim mb-1.5">Ícono</p>
                  <div className="flex flex-wrap gap-2">
                    {ICON_OPTIONS.map(({ key, icon: Icon }) => (
                      <button key={key} type="button" onClick={() => setNewCatIcon(key)}
                        style={{ background: newCatColor + (newCatIcon === key ? '40' : '15') }}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${newCatIcon === key ? 'ring-2' : ''}`}
                        {...(newCatIcon === key ? { style: { background: newCatColor + '40', '--tw-ring-color': newCatColor } } : { style: { background: newCatColor + '15' } })}>
                        <Icon size={16} style={{ color: newCatColor }} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={handleAddCategory}
                    disabled={!newCatNombre.trim()}
                    className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg">
                    Crear
                  </button>
                  <button type="button" onClick={() => setShowNewCat(false)}
                    className="px-3 py-2 bg-well rounded-lg text-dim text-sm">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Detalles colapsables */}
          <button type="button" onClick={() => setShowDetalle(v => !v)}
            className="flex items-center gap-1.5 text-xs text-dim hover:text-ink transition-colors">
            {showDetalle ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showDetalle ? 'Ocultar detalles' : 'Agregar descripción y fecha'}
          </button>

          {showDetalle && (
            <div className="space-y-3">
              <input type="text" placeholder="Descripción (opcional)" value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />
              <input type="date" value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500" />
            </div>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors">
            {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
