'use server'

import { createClient } from '@/lib/supabase/server'

export async function verifySignupOtp(
  email: string,
  token: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type: 'email', email, token })
  if (error) return { error: 'Geçersiz veya süresi dolmuş kod.' }
  return {}
}

export async function resendSignupCode(email: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  if (error) return { error: error.message }
  return {}
}
