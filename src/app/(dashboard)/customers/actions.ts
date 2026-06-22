'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { LIMITS, EMAIL_REGEX, PHONE_REGEX } from '@/lib/limits'

export type CustomerFormData = {
  name: string
  email: string
  phone: string
  tax_number: string
  address: string
  country: string
  preferred_currency: string
  preferred_language: string
}

type ActionResult = { error: string } | { success: true }

function validate(data: CustomerFormData): string | null {
  if (!data.name.trim()) return 'Müşteri adı zorunludur.'
  if (data.name.length > LIMITS.customer.name) return `İsim en fazla ${LIMITS.customer.name} karakter olabilir.`
  if (data.email && !EMAIL_REGEX.test(data.email)) return 'Geçersiz email adresi.'
  if (data.phone && !PHONE_REGEX.test(data.phone)) return 'Geçersiz telefon numarası.'
  if (!['TRY', 'USD', 'EUR', 'GBP'].includes(data.preferred_currency)) return 'Geçersiz para birimi.'
  if (!['tr', 'en'].includes(data.preferred_language)) return 'Geçersiz dil seçimi.'
  return null
}

export async function createCustomer(data: CustomerFormData): Promise<ActionResult> {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return { error: 'Oturum bulunamadı.' }

  const err = validate(data)
  if (err) return { error: err }

  const supabase = await createClient()
  const { error } = await supabase.from('customers').insert({
    organization_id: organizationId,
    created_by: user.id,
    name: data.name.trim(),
    email: data.email.trim() || null,
    phone: data.phone.trim() || null,
    tax_number: data.tax_number.trim() || null,
    address: data.address.trim() || null,
    country: data.country.trim() || null,
    preferred_currency: data.preferred_currency,
    preferred_language: data.preferred_language,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/customers')
  return { success: true }
}

export async function updateCustomer(id: string, data: CustomerFormData): Promise<ActionResult> {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return { error: 'Oturum bulunamadı.' }

  const err = validate(data)
  if (err) return { error: err }

  const supabase = await createClient()
  const { error } = await supabase
    .from('customers')
    .update({
      name: data.name.trim(),
      email: data.email.trim() || null,
      phone: data.phone.trim() || null,
      tax_number: data.tax_number.trim() || null,
      address: data.address.trim() || null,
      country: data.country.trim() || null,
      preferred_currency: data.preferred_currency,
      preferred_language: data.preferred_language,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/customers')
  return { success: true }
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return { error: 'Oturum bulunamadı.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('customers')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/customers')
  return { success: true }
}
