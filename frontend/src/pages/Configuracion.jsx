import { useTheme, THEMES } from '../context/ThemeContext'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { Palette, DollarSign, User, RefreshCw } from 'lucide-react'

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

export default function Configuracion() {
  const { theme, setTheme } = useTheme()
  const { currency, setCurrency, rates, format: fmt } = useCurrency()

  const usdRate = rates?.ARS ? (1 / rates.ARS).toFixed(6) : '—'

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

      {/* Divisas */}
      <Section icon={DollarSign} title="Divisa">
        <p className="text-xs text-dim">Las conversiones se actualizan cada hora usando tasas del mercado.</p>
        <div className="space-y-2">
          {CURRENCIES.map(c => {
            let rateText = ''
            if (c.code !== 'ARS' && rates?.ARS && rates?.[c.code]) {
              const rate = rates[c.code] / rates.ARS
              rateText = `1 ARS ≈ ${rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${c.code}`
            }
            return (
              <button key={c.code} onClick={() => setCurrency(c.code)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${currency === c.code ? 'border-brand-500 bg-brand-500/10' : 'border-line hover:border-dim'}`}>
                <span className="text-2xl">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-ink text-sm font-medium">{c.name}</p>
                  <p className="text-dim text-xs">{c.symbol} · {c.code}{rateText ? ` · ${rateText}` : ''}</p>
                </div>
                {currency === c.code && <span className="text-brand-500 text-xs font-semibold">Activa</span>}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-dim">
          <RefreshCw size={11} />
          <span>Caché de tasas: 1 hora · Fuente: open.er-api.com</span>
        </div>
      </Section>

      {/* Perfil */}
      <Section icon={User} title="Perfil">
        <p className="text-dim text-xs">Próximamente — foto de perfil y nombre personalizado</p>
        <div className="flex items-center gap-3 bg-well rounded-xl p-3">
          <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 font-bold text-lg flex-shrink-0">
            M
          </div>
          <div className="min-w-0">
            <p className="text-ink text-sm font-medium truncate">mch501010@gmail.com</p>
            <p className="text-dim text-xs">Administrador</p>
          </div>
        </div>
      </Section>
    </div>
  )
}
