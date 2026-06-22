import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { redirect } from 'next/navigation'
import { CompaniesClient } from './_components/companies-client'
import type { Customer } from '@/types'

export type CompanyRow = {
  id: string
  domain: string
  name: string
  customer_id: string | null
  created_at: string
  email_count: number
  customer: Pick<Customer, 'id' | 'name'> | null
}

export default async function CompaniesPage() {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) redirect('/login')

  const supabase = await createClient()

  const [{ data: companies }, { data: customers }] = await Promise.all([
    supabase
      .from('companies')
      .select('id, domain, name, customer_id, created_at, customer:customers(id, name), emails(count)')
      .eq('organization_id', organizationId)
      .order('name'),
    supabase
      .from('customers')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name'),
  ])

  type RawCompany = {
    id: string
    domain: string
    name: string
    customer_id: string | null
    created_at: string
    customer: { id: string; name: string }[] | null
    emails: { count: number }[]
  }

  const rows: CompanyRow[] = ((companies ?? []) as unknown as RawCompany[]).map((c) => ({
    id: c.id,
    domain: c.domain,
    name: c.name,
    customer_id: c.customer_id,
    created_at: c.created_at,
    email_count: c.emails?.[0]?.count ?? 0,
    customer: c.customer?.[0] ?? null,
  }))

  return <CompaniesClient companies={rows} customers={(customers ?? []) as Pick<Customer, 'id' | 'name'>[]} />
}
