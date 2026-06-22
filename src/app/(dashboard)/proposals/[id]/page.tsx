import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { redirect, notFound } from 'next/navigation'
import type { Proposal, Customer, Product, Organization } from '@/types'
import { ProposalView } from '../_components/proposal-view'

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) redirect('/login')

  const { id } = await params
  const supabase = await createClient()

  const [{ data: proposal }, { data: customers }, { data: products }, { data: org }] = await Promise.all([
    supabase
      .from('proposals')
      .select('*, customer:customers(*), proposal_items(*)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single(),
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
    supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single(),
  ])

  if (!proposal) notFound()

  // Sort items by position
  const sorted = { ...proposal }
  if (sorted.proposal_items) {
    sorted.proposal_items = [...sorted.proposal_items].sort((a, b) => a.position - b.position)
  }

  return (
    <ProposalView
      proposal={sorted as Proposal}
      customers={(customers ?? []) as Customer[]}
      products={(products ?? []) as Product[]}
      org={org as Organization}
    />
  )
}
