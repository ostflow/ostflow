'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function completeInviteSignup(
  token: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadı' }

  const { data: invite } = await admin
    .from('organization_invites')
    .select('id, organization_id, expires_at, used_at')
    .eq('token', token)
    .is('used_at', null)
    .single()

  if (!invite || new Date(invite.expires_at) <= new Date()) {
    return { error: 'Geçersiz veya süresi dolmuş davet linki' }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const currentOrgId = (profile as { organization_id: string | null } | null)
    ?.organization_id

  if (currentOrgId && currentOrgId !== invite.organization_id) {
    return { error: 'Bu kullanıcı zaten başka bir şirkete bağlı. Davetiye için farklı bir e-posta kullanın veya mevcut hesabınızdan çıkış yapın.' }
  }

  const dummyOrgId = currentOrgId
  const now = new Date().toISOString()

  const { error: profileError } = await admin
    .from('profiles')
    .update({ organization_id: invite.organization_id, role: 'staff' })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  if (dummyOrgId && dummyOrgId !== invite.organization_id) {
    await admin.from('organizations').delete().eq('id', dummyOrgId)
  }

  await admin
    .from('organization_invites')
    .update({ used_at: now, used_by: user.id })
    .eq('id', invite.id)

  return { success: true }
}
