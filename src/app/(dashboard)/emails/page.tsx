import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { redirect } from 'next/navigation'
import { EmailsClient } from './_components/emails-client'

export type EmailListItem = {
  id: string
  subject: string
  from_address: string
  to_addresses: string[]
  sent_at: string | null
  created_at: string
  company: { id: string; name: string; domain: string } | null
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string }>
}) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) redirect('/login')

  const { company_id } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('emails')
    .select('id, subject, from_address, to_addresses, sent_at, created_at, company:companies(id, name, domain)')
    .eq('organization_id', organizationId)
    .order('sent_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (company_id) query = query.eq('company_id', company_id)

  const [{ data: emails }, { data: companies }] = await Promise.all([
    query,
    supabase
      .from('companies')
      .select('id, name, domain')
      .eq('organization_id', organizationId)
      .order('name')
      .limit(200),
  ])

  return (
    <EmailsClient
      emails={(emails ?? []) as unknown as EmailListItem[]}
      companies={(companies ?? []) as { id: string; name: string; domain: string }[]}
      selectedCompanyId={company_id}
    />
  )
}
