import { useState, useEffect } from 'react'
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
  const [rememberMe, setRememberMe] = useState(false)
  const [animated, setAnimated] = useState(false)
  const navigate = useNavigate()

  function switchMode(m) {
    setMode(m); setError(''); setSuccess(false)
    setConfirm(''); setStep(1)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    // Setear rememberMe ANTES de signInWithPassword para que el adaptador
    // de storage sepa dónde guardar la sesión en el momento de escribirla
    if (rememberMe) localStorage.setItem('rememberMe', 'true')
    else localStorage.removeItem('rememberMe')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
    } else {
      navigate('/', { replace: true })
    }
    setLoading(false)
  }

  async function handleGoogleLogin() {
    localStorage.setItem('rememberMe', 'true')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { currency } },
    })
    if (error) {
      setError(error.message)
    } else if (data.user) {
      // Intentar crear el perfil — puede fallar si email confirmation está activo (sin sesión todavía)
      // CurrencyContext lo crea correctamente al primer login usando los metadatos
      await supabase.from('user_profiles').upsert({
        id: data.user.id,
        email,
        role: 'usuario',
        currency,
      }, { onConflict: 'id' })
      localStorage.setItem('currency', currency)
      setSuccess(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setAnimated(true), 50)
      return () => clearTimeout(t)
    }
  }, [success])

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-canvas">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className={`transition-all duration-500 ease-out ${animated ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
            <div className="w-24 h-24 rounded-full bg-income/10 border-2 border-income/30 flex items-center justify-center mx-auto">
              <svg viewBox="0 0 52 52" className="w-12 h-12" fill="none">
                <circle cx="26" cy="26" r="25" stroke="var(--income)" strokeWidth="2"
                  className={`transition-all duration-700 delay-100 ${animated ? 'opacity-100' : 'opacity-0'}`}
                  strokeDasharray="157" strokeDashoffset={animated ? '0' : '157'}
                  style={{ transition: 'stroke-dashoffset 0.7s ease 0.1s' }}
                />
                <path d="M14 27l8 8 16-16" stroke="var(--income)" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="34" strokeDashoffset={animated ? '0' : '34'}
                  style={{ transition: 'stroke-dashoffset 0.5s ease 0.5s' }}
                />
              </svg>
            </div>
          </div>
          <div className={`transition-all duration-500 delay-300 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <h2 className="text-2xl font-bold text-ink">¡Cuenta creada!</h2>
            <p className="text-dim text-sm mt-3 leading-relaxed">
              Te enviamos un email de confirmación.<br />
              Revisá tu bandeja de entrada y hacé clic en el enlace para activar tu cuenta.
            </p>
          </div>
          <div className={`transition-all duration-500 delay-500 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <button onClick={() => switchMode('login')}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors">
              Ir al login
            </button>
          </div>
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
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-500" />
              <span className="text-dim text-sm">Recordarme</span>
            </label>

            {error && (
              <div className="bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
                <p className="text-expense text-sm text-center">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
              {loading ? 'Cargando...' : 'Ingresar'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-line" />
              <span className="text-dim text-xs">o</span>
              <div className="flex-1 h-px bg-line" />
            </div>

            <button type="button" onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-well border border-line hover:border-dim text-ink font-medium py-3 rounded-xl transition-colors">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
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
