import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'
import { CURRENCIES } from '../context/CurrencyContext'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [step, setStep] = useState(1) // signup: 1=datos, 2=moneda
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [currency, setCurrency] = useState('ARS')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function switchMode(m) {
    setMode(m); setError(''); setSuccess(false)
    setConfirm(''); setStep(1)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    else navigate('/')
    setLoading(false)
  }

  function handleNextStep(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    if (password !== confirm) return setError('Las contraseñas no coinciden')
    setStep(2)
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else if (data.user) {
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        email,
        role: 'usuario',
        currency,
      })
      localStorage.setItem('currency', currency)
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-canvas">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="text-6xl">✅</div>
          <div>
            <h2 className="text-xl font-bold text-ink">¡Cuenta creada!</h2>
            <p className="text-dim text-sm mt-2">
              Revisá tu email para confirmar tu cuenta antes de ingresar.
            </p>
          </div>
          <button onClick={() => switchMode('login')}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Ir al login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-canvas">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-ink">Finanzas Personal</h1>
          <p className="text-dim text-sm mt-1">Controlá tu plata, sin complicaciones</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-well rounded-xl p-1 mb-6">
          {[['login', 'Ingresar'], ['signup', 'Registrarse']].map(([m, label]) => (
            <button key={m} onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m ? 'bg-panel text-ink shadow-sm' : 'text-dim hover:text-ink'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs text-dim mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                autoComplete="email"
                className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-brand-500"
                placeholder="tu@email.com" />
            </div>
            <div>
              <label className="block text-xs text-dim mb-1.5">Contraseña</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                  className="w-full bg-well border border-line rounded-xl px-4 py-3 pr-11 text-ink focus:outline-none focus:border-brand-500"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-ink">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
                <p className="text-expense text-sm text-center">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
              {loading ? 'Cargando...' : 'Ingresar'}
            </button>
          </form>
        )}

        {/* SIGNUP — Paso 1: datos */}
        {mode === 'signup' && step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-3">
            <div>
              <label className="block text-xs text-dim mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                autoComplete="email"
                className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-brand-500"
                placeholder="tu@email.com" />
            </div>
            <div>
              <label className="block text-xs text-dim mb-1.5">Contraseña</label>
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
            <button type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors">
              Siguiente →
            </button>
          </form>
        )}

        {/* SIGNUP — Paso 2: moneda */}
        {mode === 'signup' && step === 2 && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-ink font-semibold">¿Cuál es tu moneda?</p>
              <p className="text-dim text-xs mt-1">
                Todos tus montos se guardarán en esta moneda. Podés ver equivalencias después, pero los datos siempre serán en la moneda que elijas ahora.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map(c => (
                <button key={c.code} type="button" onClick={() => setCurrency(c.code)}
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
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
                <p className="text-expense text-sm text-center">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 bg-well hover:bg-panel text-dim py-3 rounded-xl font-medium transition-colors">
                ← Atrás
              </button>
              <button type="submit" disabled={loading}
                className="flex-2 flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {loading ? 'Creando...' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
