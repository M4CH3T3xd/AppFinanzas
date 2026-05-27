import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { useTheme, THEMES } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { startOfMonth, endOfMonth, format as fmtDate } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  User, Settings, ArrowLeftRight, FileDown, LogOut,
  ChevronDown, Loader2, Mail, Lock, Palette, AlertTriangle,
} from 'lucide-react'

// ─── Sección acordeón ────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-line last:border-0">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-well/40 transition-colors">
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-brand-500 flex-shrink-0" />
          <span className="text-ink font-medium text-sm">{title}</span>
        </div>
        <ChevronDown size={16} className={`text-dim transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 space-y-3">{children}</div>}
    </div>
  )
}

// ─── Conversor de moneda ─────────────────────────────────────────────────────
function Conversor() {
  const { currency, convert, rates } = useCurrency()
  const [amount, setAmount] = useState('')
  const others = CURRENCIES.filter(c => c.code !== currency)

  return (
    <div className="space-y-3">
      <p className="text-xs text-dim">Ingresá un monto en tu moneda y ves cuánto equivale en otras.</p>
      <input
        type="number" placeholder="Ej: 10000" value={amount}
        onChange={e => setAmount(e.target.value)}
        className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500"
      />
      {amount && parseFloat(amount) > 0 && (
        <div className="space-y-2">
          {others.map(c => {
            const val = convert(parseFloat(amount), c.code)
            if (val == null) return null
            const dec = ['CLP', 'ARS', 'BRL'].includes(c.code) ? 0 : 2
            return (
              <div key={c.code} className="flex items-center justify-between bg-well rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.flag}</span>
                  <span className="text-xs text-dim">{c.code}</span>
                </div>
                <span className="text-ink font-semibold text-sm">
                  {c.symbol}{val.toLocaleString(c.locale, { minimumFractionDigits: dec, maximumFractionDigits: dec })}
                </span>
              </div>
            )
          })}
          {!rates && <p className="text-xs text-dim text-center">Cargando tasas…</p>}
        </div>
      )}
    </div>
  )
}

// ─── Generador de PDF ────────────────────────────────────────────────────────
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
  const porCat = {}
  txs?.filter(t => t.tipo === 'gasto').forEach(t => { porCat[t.categoria] = (porCat[t.categoria] ?? 0) + t.monto })
  const catRows = Object.entries(porCat).sort((a, b) => b[1] - a[1])
  const cur = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setFillColor(124, 106, 247)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18); doc.setFont('helvetica', 'bold')
  doc.text('Resumen Financiero', 14, 13)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(`${mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}  ·  ${user.email}`, 14, 21)
  doc.setTextColor(0, 0, 0)

  doc.setFontSize(12); doc.setFont('helvetica', 'bold')
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
  if (catRows.length > 0) {
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text('Gastos por categoría', 14, y + 6)
    autoTable(doc, {
      startY: y + 10,
      head: [['Categoría', 'Monto', '%']],
      body: catRows.map(([cat, monto]) => [cat, `${cur.symbol}${monto.toLocaleString(cur.locale)}`, gastos > 0 ? `${((monto / gastos) * 100).toFixed(0)}%` : '0%']),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [40, 40, 60] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (deudas?.length > 0) {
    if (y > 230) { doc.addPage(); y = 14 }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
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

  if (servicios?.length > 0) {
    if (y > 230) { doc.addPage(); y = 14 }
    const totalServ = servicios.reduce((s, sv) => s + sv.monto, 0)
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text(`Servicios activos — ${cur.symbol}${totalServ.toLocaleString(cur.locale)}/mes`, 14, y + 6)
    autoTable(doc, {
      startY: y + 10,
      head: [['Servicio', 'Monto', 'Día']],
      body: servicios.map(s => [s.nombre, `${cur.symbol}${s.monto.toLocaleString(cur.locale)}`, s.dia_vencimiento]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [40, 40, 60] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (metas?.length > 0) {
    if (y > 230) { doc.addPage(); y = 14 }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text('Metas de ahorro', 14, y + 6)
    autoTable(doc, {
      startY: y + 10,
      head: [['Meta', 'Objetivo', 'Actual', '%']],
      body: metas.map(m => [m.nombre, `${cur.symbol}${m.monto_objetivo.toLocaleString(cur.locale)}`, `${cur.symbol}${m.monto_actual.toLocaleString(cur.locale)}`, `${Math.min((m.monto_actual / m.monto_objetivo) * 100, 100).toFixed(0)}%`]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [40, 40, 60] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150)
    doc.text(`Finanzas Personal · ${fmtDate(new Date(), 'dd/MM/yyyy')} · Pág ${i}/${pages}`, 14, 290)
  }
  doc.save(`resumen-${fmtDate(new Date(), 'yyyy-MM')}.pdf`)
}

// ─── ProfileSheet principal ──────────────────────────────────────────────────
export default function ProfileSheet({ onClose }) {
  const { user, isAdmin } = useAuth()
  const { currency, format: fmt } = useCurrency()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  const [confirmLogout, setConfirmLogout] = useState(false)
  const [exportando, setExportando]       = useState(false)
  const [emailReport, setEmailReport]     = useState(null)
  const [savingEmail, setSavingEmail]     = useState(false)

  const cur     = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]
  const initial = user?.email?.[0]?.toUpperCase() ?? '?'

  useEffect(() => {
    if (!user) return
    supabase.from('user_profiles').select('email_report').eq('id', user.id).single()
      .then(({ data }) => setEmailReport(data?.email_report ?? false))
  }, [user])

  async function toggleEmailReport(val) {
    setSavingEmail(true)
    const { error } = await supabase.from('user_profiles').update({ email_report: val }).eq('id', user.id)
    if (error) toast('Error al guardar', 'error')
    else { setEmailReport(val); toast(val ? 'Resumen mensual activado' : 'Resumen mensual desactivado') }
    setSavingEmail(false)
  }

  async function handleExport() {
    setExportando(true)
    try { await generarPDF(user, currency, fmt); toast('PDF descargado') }
    catch (e) { console.error(e); toast('Error al generar el PDF', 'error') }
    finally { setExportando(false) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    sessionStorage.clear()
    localStorage.removeItem('currency')
    window.location.href = '/login'
  }

  return (
    <div className="overflow-y-auto max-h-[85vh]">

      {/* Header de perfil */}
      <div className="flex items-center gap-4 px-5 py-5 border-b border-line bg-well/30">
        <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="text-ink font-semibold truncate">{user?.email}</p>
          <p className="text-dim text-xs mt-0.5">{isAdmin ? 'Administrador' : 'Usuario'} · {cur.flag} {cur.code}</p>
        </div>
      </div>

      {/* ── Configuración de perfil ── */}
      <Section icon={User} title="Configuración de perfil">
        <div className="bg-well rounded-xl p-3.5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-dim">Email</span>
            <span className="text-xs text-ink font-medium truncate ml-4 max-w-[180px]">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-dim">Rol</span>
            <span className="text-xs text-ink font-medium">{isAdmin ? 'Administrador' : 'Usuario'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-dim">Moneda</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink font-medium">{cur.flag} {cur.code}</span>
              <Lock size={10} className="text-brand-500" />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Ajustes de la app ── */}
      <Section icon={Palette} title="Ajustes de la app">
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={`rounded-xl p-3 border-2 text-left transition-all ${theme === t.id ? 'border-brand-500 scale-[1.02]' : 'border-line hover:border-dim'}`}
              style={{ background: t.preview[0] }}>
              <div className="flex gap-1.5 mb-2">
                <span className="w-3.5 h-3.5 rounded-full" style={{ background: t.preview[1] }} />
                <span className="w-3.5 h-3.5 rounded-full" style={{ background: t.preview[2] }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: t.id === 'light' ? '#0f172a' : '#f1f5f9' }}>{t.label}</p>
              {theme === t.id && <p className="text-xs mt-0.5" style={{ color: t.preview[2] }}>● Activo</p>}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Conversor de moneda ── */}
      <Section icon={ArrowLeftRight} title="Conversor de moneda">
        <Conversor />
      </Section>

      {/* ── Exportar resumen ── */}
      <Section icon={FileDown} title="Exportar resumen">
        <p className="text-xs text-dim">PDF del mes actual con ingresos, gastos, deudas, servicios y metas.</p>
        <button onClick={handleExport} disabled={exportando}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
          {exportando ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
          {exportando ? 'Generando…' : 'Descargar PDF del mes'}
        </button>

        <div className="flex items-center justify-between bg-well rounded-xl px-4 py-3 mt-1">
          <div>
            <p className="text-ink text-sm font-medium">Resumen mensual por email</p>
            <p className="text-dim text-xs mt-0.5">Último día de cada mes</p>
          </div>
          <button
            onClick={() => toggleEmailReport(!emailReport)}
            disabled={savingEmail || emailReport === null}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${emailReport ? 'bg-brand-500' : 'bg-line'} disabled:opacity-50`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${emailReport ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {emailReport && <p className="text-xs text-income">✓ Activado</p>}
      </Section>

      {/* ── Cerrar sesión ── */}
      <div className="px-5 py-5">
        {confirmLogout ? (
          <div className="bg-expense/10 border border-expense/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-expense flex-shrink-0" />
              <p className="text-sm font-semibold text-expense">¿Seguro que querés salir?</p>
            </div>
            <p className="text-xs text-dim">Se cerrará la sesión en este dispositivo.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmLogout(false)}
                className="flex-1 py-2.5 rounded-xl bg-well text-dim text-sm font-medium hover:text-ink transition-colors">
                Cancelar
              </button>
              <button onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-expense text-white text-sm font-semibold hover:bg-red-500 transition-colors">
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmLogout(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-expense/30 text-expense hover:bg-expense/10 text-sm font-medium transition-colors">
            <LogOut size={16} />
            Cerrar sesión
          </button>
        )}
      </div>

    </div>
  )
}
