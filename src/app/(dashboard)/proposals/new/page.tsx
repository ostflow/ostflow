import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { redirect } from 'next/navigation'
import type { Customer, Product } from '@/types'
import { ProposalForm } from '../_components/proposal-form'

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string }>
}) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) redirect('/login')

  const params = await searchParams
  const supabase = await createClient()

  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name_tr'),
  ])

  return (
    <ProposalForm
      customers={(customers ?? []) as Customer[]}
      products={(products ?? []) as Product[]}
    />
  )
}
