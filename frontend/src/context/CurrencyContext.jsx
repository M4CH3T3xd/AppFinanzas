import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const CurrencyContext = createContext()

export const CURRENCIES = [
  { code: 'ARS', symbol: '$',   name: 'Peso Argentino', flag: '🇦🇷', locale: 'es-AR' },
  { code: 'CLP', symbol: '$',   name: 'Peso Chileno',   flag: '🇨🇱', locale: 'es-CL' },
  { code: 'PEN', symbol: 'S/',  name: 'Sol Peruano',    flag: '🇵🇪', locale: 'es-PE' },
  { code: 'USD', symbol: 'US$', name: 'Dólar',          flag: '🇺🇸', locale: 'en-US' },
  { code: 'EUR', symbol: '€',   name: 'Euro',           flag: '🇪🇺', locale: 'es-ES' },
  { code: 'BRL', symbol: 'R$',  name: 'Real Brasileño', flag: '🇧🇷', locale: 'pt-BR' },
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
  return { ARS: 1050, USD: 1, CLP: 890, PEN: 3.72, EUR: 0.92, BRL: 5.1 }
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('currency') || 'ARS')
  const [rates, setRates] = useState(null)

  useEffect(() => { fetchRates().then(setRates) }, [])

  // Sync currency with user profile
  useEffect(() => {
    async function syncFromProfile(session) {
      if (!session?.user) return
      const { data } = await supabase
        .from('user_profiles')
        .select('currency')
        .eq('id', session.user.id)
        .single()
      if (data?.currency) {
        setCurrencyState(data.currency)
        localStorage.setItem('currency', data.currency)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => syncFromProfile(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      syncFromProfile(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const setCurrency = useCallback(async (code) => {
    setCurrencyState(code)
    localStorage.setItem('currency', code)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await supabase.from('user_profiles').update({ currency: code }).eq('id', session.user.id)
    }
  }, [])

  const format = useCallback((amount) => {
    if (amount == null) return ''
    const cur = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]
    const decimals = ['CLP', 'ARS', 'BRL'].includes(currency) ? 0 : 2
    return `${cur.symbol}${Math.abs(amount).toLocaleString(cur.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`
  }, [currency])

  // Convert amount to another currency using exchange rates
  const convert = useCallback((amount, toCurrency) => {
    if (!rates || !amount) return null
    const cur = CURRENCIES.find(c => c.code === currency)
    const target = CURRENCIES.find(c => c.code === toCurrency)
    if (!cur || !target) return null
    // Convert from base currency to USD, then to target
    const rateBase = rates[currency] ?? 1
    const rateTarget = rates[toCurrency] ?? 1
    return (amount / rateBase) * rateTarget
  }, [rates, currency])

  const getCurrency = useCallback(
    () => CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0],
    [currency]
  )

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, format, convert, getCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
