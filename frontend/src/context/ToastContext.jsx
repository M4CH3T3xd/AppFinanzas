import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

const ToastContext = createContext()

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
}

const STYLES = {
  success: 'bg-panel border-brand-500/40 text-ink',
  error:   'bg-panel border-expense/40 text-ink',
  warning: 'bg-panel border-yellow-500/40 text-ink',
}

const ICON_COLORS = {
  success: 'text-income',
  error:   'text-expense',
  warning: 'text-yellow-400',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 md:bottom-8 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map(t => {
          const Icon = ICONS[t.type]
          return (
            <div key={t.id}
              className={`toast-enter flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-sm font-medium pointer-events-auto ${STYLES[t.type]}`}>
              <Icon size={16} className={`flex-shrink-0 ${ICON_COLORS[t.type]}`} />
              {t.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
