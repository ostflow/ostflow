import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { CompanyDetailClient } from './_components/company-detail-client'
import type { Customer } from '@/types'

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) redirect('/login')

  const { id } = await params
  const supabase = await createClient()

  const [{ data: company }, { data: emails }, { data: customers }] = await Promise.all([
    supabase
      .from('companies')
      .select('id, domain, name, customer_id, customer:customers(id, name)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single(),
    supabase
      .from('emails')
      .select('id, subject, from_address, to_addresses, body_type, sent_at, created_at')
      .eq('company_id', id)
      .eq('organization_id', organizationId)
      .order('sent_at', { ascending: false })
      .limit(50),
    supabase
      .from('customers')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name'),
  ])

  if (!company) notFound()

  type RawCompany = {
    id: string
    domain: string
    name: string
    customer_id: string | null
    customer: { id: string; name: string }[] | null
  }
  const raw = company as unknown as RawCompany
  const co = { ...raw, customer: raw.customer?.[0] ?? null }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/companies" className="text-zinc-400 hover:text-zinc-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900">{co.name}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span className="font-mono">{co.domain}</span>
            {co.customer && (
              <>
                <span>·</span>
                <span className="text-blue-600">{co.customer.name}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {co.customer_id ? (
            <Link
              href={`/proposals/new?customer_id=${co.customer_id}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Teklif Oluştur
            </Link>
          ) : null}
        </div>
      </div>

      <CompanyDetailClient
        company={co}
        emails={(emails ?? []) as EmailRow[]}
        customers={(customers ?? []) as Pick<Customer, 'id' | 'name'>[]}
      />
    </div>
  )
}

export type EmailRow = {
  id: string
  subject: string
  from_address: string
  to_addresses: string[]
  body_type: 'html' | 'text'
  sent_at: string | null
  created_at: string
}
