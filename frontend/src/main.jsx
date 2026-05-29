import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { CurrencyProvider } from './context/CurrencyContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import './index.css'
// Fuerza recarga cuando Android Chrome restaura la app desde memoria (bfcache)
// en vez de cargarla fresca — evita el blank screen al reabrir desde task manager
window.addEventListener('pageshow', (event) => {
  if (event.persisted) window.location.reload()
})

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
