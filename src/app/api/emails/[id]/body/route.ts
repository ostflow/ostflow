import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: email } = await admin
    .from('emails')
    .select('body, body_type')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ body: email.body, body_type: email.body_type })
}
