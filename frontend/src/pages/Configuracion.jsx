import { useState, useCallback } from 'react'
import { useTheme, THEMES } from '../context/ThemeContext'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { Palette, DollarSign, User, ArrowLeftRight, Lock, FileDown, Mail, Loader2 } from 'lucide-react'
import { startOfMonth, endOfMonth, format as fmtDate } from 'date-fns'
import { es } from 'date-fns/locale'

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-panel rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-brand-500" />
        <h3 className="font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ─── Conversor de moneda ──────────────────────────────────────────────────────
function Conversor() {
  const { currency, convert, rates } = useCurrency()
  const [amount, setAmount] = useState('')

  const others = CURRENCIES.filter(c => c.code !== currency)

  return (
    <div className="space-y-3">
      <p className="text-xs text-dim">Ingresá un monto en tu moneda y ves cuánto equivale en otras.</p>
      <input
        type="number"
        placeholder="Ej: 10000"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500"
      />
      {amount && parseFloat(amount) > 0 && (
        <div className="space-y-2">
          {others.map(c => {
            const val = convert(parseFloat(amount), c.code)
            if (val == null) return null
            const decimals = ['CLP', 'ARS', 'BRL'].includes(c.code) ? 0 : 2
            const formatted = val.toLocaleString(c.locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
            return (
              <div key={c.code} className="flex items-center justify-between bg-well rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.flag}</span>
                  <span className="text-xs text-dim">{c.code}</span>
                </div>
                <span className="text-ink font-semibold text-sm">{c.symbol}{formatted}</span>
              </div>
            )
          })}
          {!rates && <p className="text-xs text-dim text-center">Cargando tasas de cambio…</p>}
        </div>
      )}
    </div>
  )
}

// ─── Exportar PDF ─────────────────────────────────────────────────────────────
async function generarPDF(user, currency, fmt) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const inicio = startOfMonth(new Date()).toISOString().slice(0, 10)
  const fin    = endOfMonth(new Date()).toISOString().slice(0, 10)
  const mesLabel = fmtDate(new Date(), 'MMMM yyyy', { locale: es })

  const [{ data: txs }, { data: deudas }, { data: servicios }, { data: metas }] = await Promise.all([
    supabase.from('transacciones').select('*').eq('user_id', user.id).gte('fecha', inicio).lte('fecha', fin).order('fecha', { ascending: false }),
    supabase.from('deudas').select('*').eq('user_id', user.id).eq('pagado', false),
    supabase.from('servicios').select('*').eq('user_id', user.id).eq('activo', true),
    supabase.from('metas').select('*').eq('user_id', user.id),
  ])

  const ingresos = txs?.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0) ?? 0
  const gastos   = txs?.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0) ?? 0

  // Agrupar gastos por categoría
  const porCat = {}
  txs?.filter(t => t.tipo === 'gasto').forEach(t => {
    porCat[t.categoria] = (porCat[t.categoria] ?? 0) + t.monto
  })
  const catRows = Object.entries(porCat).sort((a, b) => b[1] - a[1])

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const cur = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]

  // Header
  doc.setFillColor(124, 106, 247)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen Financiero', 14, 13)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`${mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}  ·  ${user.email}`, 14, 21)

  doc.setTextColor(0, 0, 0)

  // Resumen del mes
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen del mes', 14, 38)

  autoTable(doc, {
    startY: 42,
    head: [['Concepto', 'Monto']],
    body: [
      ['Ingresos', `${cur.symbol}${ingresos.toLocaleString(cur.locale)}`],
      ['Gastos',   `${cur.symbol}${gastos.toLocaleString(cur.locale)}`],
      ['Balance',  `${cur.symbol}${(ingresos - gastos).toLocaleString(cur.locale)}`],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [124, 106, 247] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  })

  let y = doc.lastAutoTable.finalY + 8

  // Gastos por categoría
  if (catRows.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Gastos por categoría', 14, y + 6)
    autoTable(doc, {
      startY: y + 10,
      head: [['Categoría', 'Monto', '% del total']],
      body: catRows.map(([cat, monto]) => [
        cat,
        `${cur.symbol}${monto.toLocaleString(cur.locale)}`,
        gastos > 0 ? `${((monto / gastos) * 100).toFixed(0)}%` : '0%',
      ]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [40, 40, 60] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Deudas pendientes
  if (deudas?.length > 0) {
    if (y > 230) { doc.addPage(); y = 14 }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Deudas pendientes', 14, y + 6)
    autoTable(doc, {
      startY: y + 10,
      head: [['Descripción', 'Tipo', 'Monto']],
      body: deudas.map(d => [d.descripcion, d.tipo === 'debo' ? 'Debo' : 'Me deben', `${cur.symbol}${d.monto.toLocaleString(cur.locale)}`]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [40, 40, 60] },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Servicios activos
  if (servicios?.length > 0) {
    if (y > 230) { doc.addPage(); y = 14 }
    const totalServ = servicios.reduce((s, sv) => s + sv.monto, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Servicios activos — Total: ${cur.symbol}${totalServ.toLocaleString(cur.locale)}/mes`, 14, y + 6)
    autoTable(doc, {
      startY: y + 10,
      head: [['Servicio', 'Monto mensual', 'Vence día']],
      body: servicios.map(s => [s.nombre, `${cur.symbol}${s.monto.toLocaleString(cur.locale)}`, s.dia_vencimiento]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [40, 40, 60] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Metas
  if (metas?.length > 0) {
    if (y > 230) { doc.addPage(); y = 14 }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Metas de ahorro', 14, y + 6)
    autoTable(doc, {
      startY: y + 10,
      head: [['Meta', 'Objetivo', 'Actual', 'Progreso']],
      body: metas.map(m => [
        m.nombre,
        `${cur.symbol}${m.monto_objetivo.toLocaleString(cur.locale)}`,
        `${cur.symbol}${m.monto_actual.toLocaleString(cur.locale)}`,
        `${Math.min((m.monto_actual / m.monto_objetivo) * 100, 100).toFixed(0)}%`,
      ]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [40, 40, 60] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Finanzas Personal · Generado el ${fmtDate(new Date(), 'dd/MM/yyyy')} · Página ${i} de ${pageCount}`, 14, 290)
  }

  doc.save(`resumen-${fmtDate(new Date(), 'yyyy-MM')}.pdf`)
}

// ─── Configuracion principal ──────────────────────────────────────────────────
export default function Configuracion() {
  const { theme, setTheme } = useTheme()
  const { currency, format: fmt } = useCurrency()
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const [exportando, setExportando] = useState(false)
  const [emailReport, setEmailReport] = useState(null) // null = loading
  const [savingEmail, setSavingEmail] = useState(false)

  const cur = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]
  const initial = user?.email?.[0]?.toUpperCase() ?? '?'

  // Cargar preferencia de email al montar
  useState(() => {
    if (!user) return
    supabase.from('user_profiles').select('email_report').eq('id', user.id).single()
      .then(({ data }) => setEmailReport(data?.email_report ?? false))
  })

  async function toggleEmailReport(val) {
    setSavingEmail(true)
    const { error } = await supabase.from('user_profiles').update({ email_report: val }).eq('id', user.id)
    if (error) { toast('Error al guardar', 'error') }
    else { setEmailReport(val); toast(val ? 'Resumen mensual activado' : 'Resumen mensual desactivado') }
    setSavingEmail(false)
  }

  async function handleExport() {
    setExportando(true)
    try {
      await generarPDF(user, currency, fmt)
      toast('PDF descargado')
    } catch (e) {
      console.error(e)
      toast('Error al generar el PDF', 'error')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <h2 className="text-xl font-bold text-ink">Configuración</h2>

      {/* Temas */}
      <Section icon={Palette} title="Tema visual">
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={`rounded-xl p-3 border-2 text-left transition-all ${theme === t.id ? 'border-brand-500 scale-[1.02]' : 'border-line hover:border-dim'}`}
              style={{ background: t.preview[0] }}>
              <div className="flex gap-1.5 mb-2">
                <span className="w-4 h-4 rounded-full" style={{ background: t.preview[1] }} />
                <span className="w-4 h-4 rounded-full" style={{ background: t.preview[2] }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: t.id === 'light' ? '#0f172a' : '#f1f5f9' }}>{t.label}</p>
              {theme === t.id && <p className="text-xs mt-0.5" style={{ color: t.preview[2] }}>● Activo</p>}
            </button>
          ))}
        </div>
      </Section>

      {/* Moneda fija */}
      <Section icon={DollarSign} title="Moneda de cuenta">
        <div className="flex items-center gap-3 bg-well rounded-xl p-3.5">
          <span className="text-3xl">{cur.flag}</span>
          <div className="flex-1">
            <p className="text-ink font-semibold">{cur.name}</p>
            <p className="text-dim text-xs">{cur.symbol} · {cur.code}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-brand-500/10 text-brand-500 text-xs font-medium px-2.5 py-1 rounded-lg">
            <Lock size={11} />
            Fija
          </div>
        </div>
        <p className="text-xs text-dim">
          La moneda se elige al crear la cuenta y queda fija para mantener la integridad de tus datos. Todos los montos están registrados en {cur.code}.
        </p>
      </Section>

      {/* Conversor de referencia */}
      <Section icon={ArrowLeftRight} title="Conversor de referencia">
        <Conversor />
      </Section>

      {/* Exportar PDF */}
      <Section icon={FileDown} title="Exportar resumen">
        <p className="text-xs text-dim">Descargá un PDF con el resumen del mes actual: ingresos, gastos por categoría, deudas, servicios y metas.</p>
        <button
          onClick={handleExport}
          disabled={exportando}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
          {exportando ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
          {exportando ? 'Generando PDF…' : 'Descargar PDF del mes'}
        </button>
      </Section>

      {/* Resumen mensual por email */}
      <Section icon={Mail} title="Resumen mensual por email">
        <p className="text-xs text-dim">
          Recibí un resumen de tus finanzas al final de cada mes en <span className="text-ink font-medium">{user?.email}</span>.
        </p>
        <div className="flex items-center justify-between bg-well rounded-xl px-4 py-3">
          <div>
            <p className="text-ink text-sm font-medium">Enviar resumen mensual</p>
            <p className="text-dim text-xs mt-0.5">Último día de cada mes</p>
          </div>
          <button
            onClick={() => toggleEmailReport(!emailReport)}
            disabled={savingEmail || emailReport === null}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              emailReport ? 'bg-brand-500' : 'bg-line'
            } disabled:opacity-50`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
              emailReport ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        {emailReport && (
          <p className="text-xs text-income">✓ Activado — recibirás un email el último día del mes</p>
        )}
      </Section>

      {/* Perfil */}
      <Section icon={User} title="Perfil">
        <div className="flex items-center gap-3 bg-well rounded-xl p-3">
          <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 font-bold text-lg flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-ink text-sm font-medium truncate">{user?.email}</p>
            <p className="text-dim text-xs">{isAdmin ? 'Administrador' : 'Usuario'}</p>
          </div>
        </div>
      </Section>
    </div>
  )
}
