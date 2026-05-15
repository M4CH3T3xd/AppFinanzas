import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const THEMES = [
  { id: 'dark',  label: 'Oscuro',       preview: ['#020617','#0f172a','#22c55e'] },
  { id: 'mono',  label: 'Minimalista',  preview: ['#0a0a0a','#141414','#e5e5e5'] },
  { id: 'pink',  label: 'Rosa',         preview: ['#18070f','#2d0f1e','#ec4899'] },
  { id: 'light', label: 'Claro',        preview: ['#f8fafc','#ffffff','#22c55e'] },
]

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
