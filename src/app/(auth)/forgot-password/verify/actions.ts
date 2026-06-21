'use server'

import { createClient } from '@/lib/supabase/server'

export async function verifyResetOtp(
  email: string,
  token: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type: 'recovery', email, token })
  if (error) return { error: 'Geçersiz veya süresi dolmuş kod.' }
  return {}
}
