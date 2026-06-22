import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { fmt } from '@/lib/vat-logic'

export default async function DashboardPage() {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) redirect('/login')

  const supabase = await createClient()

  const [
    { count: totalProposals },
    { count: totalCustomers },
    { count: totalProducts },
    { data: recentProposals },
  ] = await Promise.all([
    supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true),
    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true),
    supabase
      .from('proposals')
      .select('id, proposal_number, proposal_date, currency, total_try, total_usd, total_eur, total_gbp, customers(name)')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: 'Toplam Teklif', value: totalProposals ?? 0, href: '/proposals', color: 'blue' },
    { label: 'Aktif Müşteri', value: totalCustomers ?? 0, href: '/customers', color: 'emerald' },
    { label: 'Ürün Kataloğu', value: totalProducts ?? 0, href: '/products', color: 'violet' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">Genel bakış ve son aktiviteler</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-sm transition-all"
          >
            <div className="text-3xl font-bold text-zinc-900 mb-1">{s.value.toLocaleString('tr-TR')}</div>
            <div className="text-sm text-zinc-500">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Recent Proposals */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Son Teklifler</h2>
          <Link href="/proposals/new" className="text-sm text-blue-600 hover:underline font-medium">
            + Yeni Teklif
          </Link>
        </div>
        {recentProposals && recentProposals.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">No</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Müşteri</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tarih</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {(recentProposals as unknown as Array<{
                id: string
                proposal_number: number
                proposal_date: string
                currency: string
                total_try: number
                total_usd: number
                total_eur: number
                total_gbp: number
                customers: { name: string } | null
              }>).map((p) => {
                const totalKey = `total_${p.currency.toLowerCase()}` as 'total_try'
                const totalVal = p[totalKey] ?? 0
                return (
                  <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/proposals/${p.id}`} className="text-blue-600 font-medium hover:underline text-sm">
                        #{String(p.proposal_number).padStart(4, '0')}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-700">{p.customers?.name ?? '—'}</td>
                    <td className="px-6 py-3 text-sm text-zinc-500">
                      {new Date(p.proposal_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-900 font-semibold text-right">
                      {fmt(Number(totalVal), p.currency)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-zinc-400 text-sm mb-4">Henüz teklif oluşturulmadı.</p>
            <Link
              href="/proposals/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              İlk Teklifi Oluştur
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
