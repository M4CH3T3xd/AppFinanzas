import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function OnboardingSetup() {
  const { user, completeOnboarding } = useAuth()
  const { setCurrency }              = useCurrency()

  const [step, setStep]           = useState(1)         // 1 = moneda, 2 = contraseña
  const [currency, setCurrencyL]  = useState('ARS')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleCurrencyNext() {
    setLoading(true)
    await setCurrency(currency)
    setLoading(false)
    setStep(2)
  }

  async function handleSetPassword(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Mínimo 6 caracteres')
    if (password !== confirm) return setError('Las contraseñas no coinciden')
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) return setError('No se pudo crear la contraseña. Intentá de nuevo.')
    completeOnboarding()
  }

  function handleSkipPassword() {
    completeOnboarding()
  }

  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'ahí'

  return (
    <div className="fixed inset-0 z-[200] bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Paso 1 — Moneda */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-3">👋</div>
              <h2 className="text-2xl font-bold text-ink">¡Hola, {displayName}!</h2>
              <p className="text-dim text-sm mt-2">Antes de empezar, elegí tu moneda. Podés cambiarla después en Configuración.</p>
            </div>

            <div>
              <p className="text-xs text-dim font-medium mb-3 uppercase tracking-wide">Tu moneda</p>
              <div className="grid grid-cols-2 gap-2">
                {CURRENCIES.map(c => (
                  <button key={c.code} type="button" onClick={() => setCurrencyL(c.code)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                      currency === c.code
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-line hover:border-dim bg-well'
                    }`}>
                    <span className="text-2xl">{c.flag}</span>
                    <div className="min-w-0">
                      <p className="text-ink text-xs font-semibold">{c.code}</p>
                      <p className="text-dim text-xs truncate">{c.name}</p>
                    </div>
                    {currency === c.code && <CheckCircle size={14} className="text-brand-500 ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleCurrencyNext} disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
              {loading ? 'Guardando...' : 'Siguiente →'}
            </button>
          </div>
        )}

        {/* Paso 2 — Contraseña */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="text-5xl mb-3">🔑</div>
              <h2 className="text-xl font-bold text-ink">¿Querés una contraseña?</h2>
              <p className="text-dim text-sm mt-2">
                Podés crear una contraseña para entrar con tu email además de Google. Es opcional.
              </p>
            </div>

            <form onSubmit={handleSetPassword} className="space-y-3">
              <div>
                <label className="block text-xs text-dim mb-1.5">Nueva contraseña</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required autoComplete="new-password"
                    className="w-full bg-well border border-line rounded-xl px-4 py-3 pr-11 text-ink focus:outline-none focus:border-brand-500"
                    placeholder="Mínimo 6 caracteres" />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-ink">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-dim mb-1.5">Confirmar contraseña</label>
                <input type={showPass ? 'text' : 'password'} value={confirm}
                  onChange={e => setConfirm(e.target.value)} required autoComplete="new-password"
                  className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-brand-500"
                  placeholder="Repetí la contraseña" />
              </div>

              {error && (
                <div className="bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
                  <p className="text-expense text-sm text-center">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {loading ? 'Guardando...' : 'Crear contraseña y entrar'}
              </button>
            </form>

            <button onClick={handleSkipPassword}
              className="w-full py-2.5 text-dim hover:text-ink text-sm transition-colors">
              Omitir, solo uso Google
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
