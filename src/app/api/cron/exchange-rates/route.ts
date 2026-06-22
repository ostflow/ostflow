import { NextResponse } from 'next/server'
import { fetchAndStoreRates } from '@/lib/exchange-rates'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await fetchAndStoreRates()
    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/exchange-rates]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
