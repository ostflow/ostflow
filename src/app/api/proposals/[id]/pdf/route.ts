import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { generateProposalPdf } from '@/lib/generate-pdf'
import type { Proposal, Organization } from '@/types'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const [{ data: proposal }, { data: org }] = await Promise.all([
    admin
      .from('proposals')
      .select('*, customer:customers(*), proposal_items(*)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single(),
    admin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single(),
  ])

  if (!proposal || !org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const sorted = {
    ...proposal,
    proposal_items: proposal.proposal_items
      ? [...proposal.proposal_items].sort((a, b) => a.position - b.position)
      : [],
  }

  try {
    const pdf = await generateProposalPdf(sorted as Proposal, org as Organization)
    const filename = `teklif-${String(proposal.proposal_number).padStart(4, '0')}.pdf`

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (err: unknown) {
    console.error('[pdf]', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
