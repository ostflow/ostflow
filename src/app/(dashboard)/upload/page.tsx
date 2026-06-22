import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { redirect } from 'next/navigation'
import { UploadPageClient } from './_components/upload-page-client'

export default async function UploadPage() {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) redirect('/login')

  const supabase = await createClient()
  const { data: archives } = await supabase
    .from('archives')
    .select('id, file_name, size_bytes, status, error_message, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(20)

  return <UploadPageClient archives={(archives ?? []) as Archive[]} />
}

export type Archive = {
  id: string
  file_name: string
  size_bytes: number | null
  status: 'pending' | 'processing' | 'done' | 'error'
  error_message: string | null
  created_at: string
}
