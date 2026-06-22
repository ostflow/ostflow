import { NextResponse } from 'next/server'
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET } from '@/lib/r2'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'

export async function POST(req: Request) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileName, fileSize } = await req.json() as { fileName: string; fileSize: number }
  if (!fileName) return NextResponse.json({ error: 'fileName required' }, { status: 400 })

  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (!['pst', 'ost'].includes(ext)) {
    return NextResponse.json({ error: 'Sadece .pst ve .ost dosyaları desteklenir.' }, { status: 400 })
  }

  const r2Key = `archives/${organizationId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  // Create multipart upload in R2
  const cmd = new CreateMultipartUploadCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
    ContentType: 'application/octet-stream',
  })
  const { UploadId } = await r2.send(cmd)
  if (!UploadId) return NextResponse.json({ error: 'R2 multipart init failed' }, { status: 500 })

  // Insert archives record
  const admin = createAdminClient()
  const { data: archive, error } = await admin
    .from('archives')
    .insert({
      organization_id: organizationId,
      uploaded_by: user.id,
      file_name: fileName,
      r2_key: r2Key,
      size_bytes: fileSize ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !archive) return NextResponse.json({ error: error?.message ?? 'DB insert failed' }, { status: 500 })

  return NextResponse.json({ archiveId: archive.id, uploadId: UploadId, r2Key })
}
