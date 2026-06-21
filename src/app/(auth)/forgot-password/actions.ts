'use server'

import { createClient } from '@/lib/supabase/server'

export async function requestPasswordReset(
  email: string
): Promise<{ success: true }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) console.error('[requestPasswordReset]', error.message)

  return { success: true }
}
