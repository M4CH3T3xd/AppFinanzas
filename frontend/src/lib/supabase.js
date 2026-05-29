import { createClient } from '@supabase/supabase-js'

// Con "Recordarme" OFF la sesión usa sessionStorage → muere al cerrar la app,
// evitando el blank screen al reabrir desde task manager.
// Con "Recordarme" ON usa localStorage → persiste entre cierres.
const storage = localStorage.getItem('rememberMe') === 'true'
  ? localStorage
  : sessionStorage

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storage, autoRefreshToken: true, persistSession: true } }
)
