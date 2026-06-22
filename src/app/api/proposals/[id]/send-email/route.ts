import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { generateProposalPdf } from '@/lib/generate-pdf'
import type { Proposal, Organization } from '@/types'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { to: string; body?: string }

  if (!body.to) return NextResponse.json({ error: 'to email required' }, { status: 400 })

  const supabase = await createClient()
  const [{ data: proposal }, { data: org }] = await Promise.all([
    supabase
      .from('proposals')
      .select('*, customer:customers(*), proposal_items(*)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single(),
    supabase
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

  let pdfBuffer: Buffer | null = null
  let pdfError: string | null = null
  try {
    pdfBuffer = await generateProposalPdf(sorted as Proposal, org as Organization)
  } catch (e) {
    pdfError = e instanceof Error ? e.message : 'PDF generation failed'
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@ostflow.com'
  const fromName = (org as Organization).name || process.env.RESEND_FROM_NAME || 'Ostflow'
  const proposalNo = `#${String(proposal.proposal_number).padStart(4, '0')}`
  const subject = `Teklif ${proposalNo} — ${(org as Organization).name}`

  const emailBody = body.body?.trim() ||
    `Sayın ${proposal.customer?.name ?? 'Değerli Müşteri'},\n\nTeklifimizi ekte bulabilirsiniz.\n\nSaygılarımızla,\n${fromName}`

  const attachments = pdfBuffer
    ? [
        {
          filename: `teklif-${String(proposal.proposal_number).padStart(4, '0')}.pdf`,
          content: pdfBuffer,
        },
      ]
    : []

  const { data: sendData, error: sendError } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: [body.to],
    subject,
    text: emailBody,
    attachments,
  })

  // Log to proposal_email_logs
  await supabase.from('proposal_email_logs').insert({
    proposal_id: id,
    organization_id: organizationId,
    sent_by: user.id,
    to_emails: [body.to],
    cc_emails: [],
    bcc_emails: [],
    subject,
    body: emailBody,
    attach_pdf: !!pdfBuffer,
    status: sendError ? 'failed' : 'sent',
    resend_message_id: sendData?.id ?? null,
    error_message: sendError?.message ?? pdfError ?? null,
  })

  if (sendError) return NextResponse.json({ error: sendError.message }, { status: 500 })
  return NextResponse.json({ ok: true, messageId: sendData?.id })
}
