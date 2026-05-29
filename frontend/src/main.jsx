import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { CurrencyProvider } from './context/CurrencyContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { supabase } from './lib/supabase.js'
import './index.css'

// HashRouter cambia el hash sincrónicamente al montar, antes de que Supabase
// pueda leer el access_token del hash de forma asíncrona.
// Solución: si hay tokens OAuth en el hash, dejar que Supabase los procese
// ANTES de montar React, y limpiar el hash para que HashRouter vea #/
;(async () => {
  const hash = window.location.hash
  if (hash.includes('access_token') || hash.includes('error_description')) {
    await supabase.auth.getSession()
    window.history.replaceState(null, '', window.location.pathname + '#/')
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ThemeProvider>
        <CurrencyProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </React.StrictMode>
  )
})()
