import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Currency } from '@/types'

export type RateMap = Record<string, Record<string, number>>

export async function fetchAndStoreRates(): Promise<{ stored: number }> {
  const res = await fetch('https://api.frankfurter.app/latest?base=USD&symbols=TRY,EUR,GBP', {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`)

  const json = await res.json() as { rates: Record<string, number> }
  const { TRY: usdToTry, EUR: usdToEur, GBP: usdToGbp } = json.rates

  // Cross-rates for TRY, USD, EUR, GBP
  const rawPairs: Array<{ base: string; target: string; rate: number }> = [
    // USD base
    { base: 'USD', target: 'TRY', rate: usdToTry },
    { base: 'USD', target: 'EUR', rate: usdToEur },
    { base: 'USD', target: 'GBP', rate: usdToGbp },
    // TRY base
    { base: 'TRY', target: 'USD', rate: 1 / usdToTry },
    { base: 'TRY', target: 'EUR', rate: usdToEur / usdToTry },
    { base: 'TRY', target: 'GBP', rate: usdToGbp / usdToTry },
    // EUR base
    { base: 'EUR', target: 'TRY', rate: usdToTry / usdToEur },
    { base: 'EUR', target: 'USD', rate: 1 / usdToEur },
    { base: 'EUR', target: 'GBP', rate: usdToGbp / usdToEur },
    // GBP base
    { base: 'GBP', target: 'TRY', rate: usdToTry / usdToGbp },
    { base: 'GBP', target: 'USD', rate: 1 / usdToGbp },
    { base: 'GBP', target: 'EUR', rate: usdToEur / usdToGbp },
  ].map(p => ({ ...p, rate: Math.round(p.rate * 1000000) / 1000000 }))

  const admin = createAdminClient()
  const fetchedAt = new Date().toISOString()

  const { error } = await admin.from('exchange_rates').insert(
    rawPairs.map(p => ({
      base_currency: p.base,
      target_currency: p.target,
      rate: p.rate,
      source: 'frankfurter',
      fetched_at: fetchedAt,
    }))
  )

  if (error) throw new Error(`DB insert error: ${error.message}`)
  return { stored: rawPairs.length }
}

export async function getLatestRates(): Promise<RateMap> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('exchange_rates')
    .select('base_currency, target_currency, rate, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(48)

  const rates: RateMap = {}
  if (!data) return rates

  for (const row of data) {
    if (!rates[row.base_currency]) rates[row.base_currency] = {}
    if (rates[row.base_currency][row.target_currency] === undefined) {
      rates[row.base_currency][row.target_currency] = Number(row.rate)
    }
  }
  return rates
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: RateMap,
): number {
  if (from === to) return amount
  const rate = rates[from]?.[to]
  if (!rate) return amount
  return Math.round(amount * rate * 10000) / 10000
}

export function buildTotals(
  grandTotal: number,
  currency: Currency,
  rates: RateMap,
) {
  const currencies: Currency[] = ['TRY', 'USD', 'EUR', 'GBP']
  const result: Record<string, number> = {}
  for (const c of currencies) {
    result[`total_${c.toLowerCase()}`] = convertCurrency(grandTotal, currency, c, rates)
  }
  return result as { total_try: number; total_usd: number; total_eur: number; total_gbp: number }
}
