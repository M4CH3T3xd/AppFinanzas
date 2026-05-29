import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { CurrencyProvider } from './context/CurrencyContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

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
