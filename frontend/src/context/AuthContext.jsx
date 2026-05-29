import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const loadingResolvedRef    = useRef(false)

  async function fetchRole(userId) {
    const cached = sessionStorage.getItem(`role_${userId}`)
    if (cached) { setRole(cached) }
    const { data } = await supabase
      .from('user_profiles')
      .select('role, nombre, apodo, avatar_url')
      .eq('id', userId).single()
    const r = data?.role ?? 'usuario'
    sessionStorage.setItem(`role_${userId}`, r)
    setRole(r)
    setProfile({ nombre: data?.nombre ?? null, apodo: data?.apodo ?? null, avatar_url: data?.avatar_url ?? null })
    // Actualizar last_seen para el indicador de actividad en Admin
    supabase.from('user_profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId)
      .then(() => {})
  }

  async function refreshProfile(userId) {
    sessionStorage.removeItem(`role_${userId}`)
    await fetchRole(userId)
  }

  async function logout() {
    await supabase.auth.signOut()
    sessionStorage.clear()
    localStorage.removeItem('currency')
    localStorage.removeItem('rememberMe')
  }

  function resolveLoading() {
    if (!loadingResolvedRef.current) {
      loadingResolvedRef.current = true
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) await fetchRole(session.user.id).catch(() => {})
      resolveLoading()
    }).catch(() => resolveLoading())

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchRole(session.user.id).catch(() => {})
      } else {
        sessionStorage.clear()
        setRole(null)
      }
      // Resolver loading también desde aquí para evitar race condition con OAuth
      resolveLoading()
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: role === 'admin', profile, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
