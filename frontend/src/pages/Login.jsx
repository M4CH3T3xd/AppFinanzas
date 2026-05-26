import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function switchMode(m) {
    setMode(m)
    setError('')
    setSuccess(false)
    setConfirm('')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    else navigate('/')
    setLoading(false)
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    if (password !== confirm) return setError('Las contraseñas no coinciden')
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else if (data.user) {
      await supabase.from('user_profiles').insert({ id: data.user.id, email, role: 'usuario' })
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
            <p className="text-dim text-sm mt-2">Revisá tu email para confirmar tu cuenta antes de ingresar.</p>
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

        {/* Tabs login / registro */}
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

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-3">
          <div>
            <label className="block text-xs text-dim mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              autoComplete="email"
              className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-brand-500 transition-colors"
              placeholder="tu@email.com" />
          </div>

          <div>
            <label className="block text-xs text-dim mb-1.5">Contraseña</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full bg-well border border-line rounded-xl px-4 py-3 pr-11 text-ink focus:outline-none focus:border-brand-500 transition-colors"
                placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-ink transition-colors">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs text-dim mb-1.5">Confirmar contraseña</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="Repetí la contraseña"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors mt-1">
            {loading ? 'Cargando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}
