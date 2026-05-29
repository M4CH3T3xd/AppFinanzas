import { createClient } from '@supabase/supabase-js'

// Adaptador dinámico: decide el storage en cada operación según el flag rememberMe.
// Esto soluciona el bug donde el cliente se inicializaba con sessionStorage ANTES
// de que el usuario marcara "Recordarme", guardando la sesión en el lugar incorrecto.
const dynamicStorage = {
  getItem: (key) => {
    const store = localStorage.getItem('rememberMe') === 'true' ? localStorage : sessionStorage
    return store.getItem(key)
  },
  setItem: (key, value) => {
    const store = localStorage.getItem('rememberMe') === 'true' ? localStorage : sessionStorage
    store.setItem(key, value)
  },
  removeItem: (key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storage: dynamicStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
)
