import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { redirect } from 'next/navigation'
import { SettingsClient } from './_components/settings-client'

export type OrgSettings = {
  id: string
  name: string
  tax_number: string | null
  address: string | null
  phone: string | null
  fax: string | null
  email: string | null
  web: string | null
  subscription_status: 'free' | 'active' | 'past_due' | 'canceled'
  subscription_tier: 'free' | 'pro' | 'enterprise'
  subscription_ends_at: string | null
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>
}) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) redirect('/login')

  const { billing } = await searchParams
  const supabase = await createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, tax_number, address, phone, fax, email, web, subscription_status, subscription_tier, subscription_ends_at')
    .eq('id', organizationId)
    .single()

  if (!org) redirect('/login')

  return (
    <SettingsClient
      org={org as OrgSettings}
      billingMessage={billing ?? null}
      userEmail={user.email ?? ''}
    />
  )
}
