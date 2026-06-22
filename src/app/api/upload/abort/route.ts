import { NextResponse } from 'next/server'
import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET } from '@/lib/r2'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'

export async function POST(req: Request) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { archiveId, uploadId, r2Key } = await req.json() as {
    archiveId: string
    uploadId: string
    r2Key: string
  }

  if (!uploadId || !r2Key) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  try {
    await r2.send(new AbortMultipartUploadCommand({ Bucket: R2_BUCKET, Key: r2Key, UploadId: uploadId }))
  } catch {
    // Ignore R2 abort errors
  }

  if (archiveId) {
    const admin = createAdminClient()
    await admin
      .from('archives')
      .update({ status: 'error', error_message: 'Upload iptal edildi.' })
      .eq('id', archiveId)
      .eq('organization_id', organizationId)
  }

  return NextResponse.json({ ok: true })
}
