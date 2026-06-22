import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { redirect } from 'next/navigation'
import type { Customer } from '@/types'
import { CustomersClient } from './_components/customers-client'

export default async function CustomersPage() {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) redirect('/login')

  const supabase = await createClient()
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name')

  return <CustomersClient customers={(customers ?? []) as Customer[]} />
}
