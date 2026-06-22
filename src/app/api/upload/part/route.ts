import { NextResponse } from 'next/server'
import { UploadPartCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2, R2_BUCKET } from '@/lib/r2'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'

export async function POST(req: Request) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { uploadId, r2Key, partNumber } = await req.json() as {
    uploadId: string
    r2Key: string
    partNumber: number
  }

  if (!uploadId || !r2Key || !partNumber) {
    return NextResponse.json({ error: 'uploadId, r2Key, partNumber required' }, { status: 400 })
  }

  // Ensure r2Key belongs to this org
  if (!r2Key.startsWith(`archives/${organizationId}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cmd = new UploadPartCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
    UploadId: uploadId,
    PartNumber: partNumber,
  })

  const url = await getSignedUrl(r2, cmd, { expiresIn: 3600 })
  return NextResponse.json({ url })
}
