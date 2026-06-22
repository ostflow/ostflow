import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'

export async function POST(req: Request) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyId, customerId } = await req.json() as { companyId: string; customerId: string | null }
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('companies')
    .update({ customer_id: customerId ?? null })
    .eq('id', companyId)
    .eq('organization_id', organizationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
