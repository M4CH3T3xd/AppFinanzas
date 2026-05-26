import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const CurrencyContext = createContext()

export const CURRENCIES = [
  { code: 'CLP', symbol: '$',   name: 'Peso Chileno',   flag: '🇨🇱', locale: 'es-CL' },
  { code: 'PEN', symbol: 'S/',  name: 'Sol Peruano',    flag: '🇵🇪', locale: 'es-PE' },
  { code: 'ARS', symbol: '$',   name: 'Peso Argentino', flag: '🇦🇷', locale: 'es-AR' },
  { code: 'USD', symbol: 'US$', name: 'Dólar',          flag: '🇺🇸', locale: 'en-US' },
]

const CACHE_KEY = 'fx_rates'
const CACHE_TTL = 3_600_000

async function fetchRates() {
  const cached = localStorage.getItem(CACHE_KEY)
  if (cached) {
    const { rates, ts } = JSON.parse(cached)
    if (Date.now() - ts < CACHE_TTL) return rates
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await res.json()
    if (data.result === 'success') {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, ts: Date.now() }))
      return data.rates
    }
  } catch (_) {}
  return { ARS: 1050, USD: 1, CLP: 890, PEN: 3.72 }
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'CLP')
  const [rates, setRates] = useState(null)

  useEffect(() => { fetchRates().then(setRates) }, [])
  useEffect(() => { localStorage.setItem('currency', currency) }, [currency])

  const format = useCallback((amount) => {
    if (amount == null) return ''
    const cur = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]
    const decimals = ['CLP', 'ARS'].includes(currency) ? 0 : 2
    return `${cur.symbol}${Math.abs(amount).toLocaleString(cur.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`
  }, [currency])

  const getCurrency = useCallback(
    () => CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0],
    [currency]
  )

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, format, getCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
