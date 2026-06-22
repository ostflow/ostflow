import { NextResponse } from 'next/server'
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET } from '@/lib/r2'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'

type Part = { PartNumber: number; ETag: string }

export async function POST(req: Request) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { archiveId, uploadId, r2Key, parts } = await req.json() as {
    archiveId: string
    uploadId: string
    r2Key: string
    parts: Part[]
  }

  if (!archiveId || !uploadId || !r2Key || !parts?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!r2Key.startsWith(`archives/${organizationId}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Complete multipart upload in R2
  const cmd = new CompleteMultipartUploadCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
    },
  })

  try {
    await r2.send(cmd)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'R2 complete failed' }, { status: 500 })
  }

  const admin = createAdminClient()

  // Update archive status to processing
  await admin
    .from('archives')
    .update({ status: 'processing' })
    .eq('id', archiveId)
    .eq('organization_id', organizationId)

  // Retrieve file_name for the parser
  const { data: archive } = await admin
    .from('archives')
    .select('file_name')
    .eq('id', archiveId)
    .single()

  // Trigger parser service
  const parserUrl = process.env.PARSER_SERVICE_URL
  const parserSecret = process.env.PARSER_SECRET

  if (parserUrl && parserSecret && archive) {
    try {
      await fetch(`${parserUrl}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-parser-secret': parserSecret,
        },
        body: JSON.stringify({
          archive_id: archiveId,
          organization_id: organizationId,
          r2_key: r2Key,
          file_name: (archive as { file_name: string }).file_name,
        }),
      })
    } catch (err) {
      // Parser webhook failure is non-fatal — status stays 'processing'
      console.error('[upload/complete] parser webhook failed:', err)
    }
  }

  return NextResponse.json({ ok: true, archiveId })
}
