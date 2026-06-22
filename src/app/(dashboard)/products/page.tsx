import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { redirect } from 'next/navigation'
import type { Product } from '@/types'
import { ProductsClient } from './_components/products-client'

export default async function ProductsPage() {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) redirect('/login')

  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name_tr')

  return <ProductsClient products={(products ?? []) as Product[]} />
}
