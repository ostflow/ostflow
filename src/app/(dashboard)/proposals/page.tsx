import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { fmt } from '@/lib/vat-logic'

export default async function ProposalsPage() {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) redirect('/login')

  const supabase = await createClient()
  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, proposal_number, proposal_date, valid_until, currency, total_try, total_usd, total_eur, total_gbp, customers(name)')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('proposal_number', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Teklifler</h1>
          <p className="text-sm text-zinc-500 mt-1">{proposals?.length ?? 0} teklif</p>
        </div>
        <Link
          href="/proposals/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Teklif
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        {!proposals || proposals.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-zinc-400 text-sm mb-4">Henüz teklif oluşturulmadı.</p>
            <Link
              href="/proposals/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              İlk Teklifi Oluştur
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">No</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Müşteri</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tarih</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Geçerlilik</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Toplam</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(proposals as unknown as Array<{
                id: string
                proposal_number: number
                proposal_date: string
                valid_until: string | null
                currency: string
                total_try: number
                total_usd: number
                total_eur: number
                total_gbp: number
                customers: { name: string } | null
              }>).map((p) => {
                const totalKey = `total_${p.currency.toLowerCase()}` as 'total_try'
                const totalVal = p[totalKey] ?? 0
                const now = new Date()
                const validUntil = p.valid_until ? new Date(p.valid_until) : null
                const isExpired = validUntil && validUntil < now

                return (
                  <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/proposals/${p.id}`} className="text-blue-600 font-semibold hover:underline text-sm">
                        #{String(p.proposal_number).padStart(4, '0')}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-700">{p.customers?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-zinc-500">
                      {new Date(p.proposal_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {validUntil ? (
                        <span className={isExpired ? 'text-red-500' : 'text-zinc-500'}>
                          {validUntil.toLocaleDateString('tr-TR')}
                          {isExpired && ' (Süresi doldu)'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-zinc-900 text-right">
                      {fmt(Number(totalVal), p.currency)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/dashboard/proposals/${p.id}`} className="text-xs text-zinc-500 hover:text-blue-600 font-medium transition-colors">
                        Görüntüle
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
