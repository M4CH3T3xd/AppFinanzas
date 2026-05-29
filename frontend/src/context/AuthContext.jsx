import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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
  }

  async function refreshProfile(userId) {
    sessionStorage.removeItem(`role_${userId}`)
    await fetchRole(userId)
  }

  useEffect(() => {
    // Lee la sesión desde el storage configurado en supabase.js
    // (sessionStorage si no hay rememberMe, localStorage si lo hay)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) await fetchRole(session.user.id).catch(() => {})
      setLoading(false)
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchRole(session.user.id).catch(() => {})
      } else {
        sessionStorage.clear()
        setRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: role === 'admin', profile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
