'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { LIMITS } from '@/lib/limits'

export type ProductFormData = {
  sku: string
  category: string
  unit: string
  vat_rate: string
  name_tr: string
  name_en: string
  description_tr: string
  description_en: string
  price_try: string
  price_usd: string
  price_eur: string
  price_gbp: string
}

type ActionResult = { error: string } | { success: true }

function validate(data: ProductFormData): string | null {
  if (!data.name_tr.trim()) return 'Ürün adı (TR) zorunludur.'
  if (data.name_tr.length > LIMITS.product.name_tr) return `İsim en fazla ${LIMITS.product.name_tr} karakter.`
  const vat = parseFloat(data.vat_rate)
  if (isNaN(vat) || vat < 0 || vat > 100) return 'Geçersiz KDV oranı.'
  const prices = [data.price_try, data.price_usd, data.price_eur, data.price_gbp]
  for (const p of prices) {
    const n = parseFloat(p)
    if (isNaN(n) || n < 0) return 'Geçersiz fiyat değeri.'
  }
  return null
}

export async function createProduct(data: ProductFormData): Promise<ActionResult> {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return { error: 'Oturum bulunamadı.' }

  const err = validate(data)
  if (err) return { error: err }

  const supabase = await createClient()
  const { error } = await supabase.from('products').insert({
    organization_id: organizationId,
    created_by: user.id,
    sku: data.sku.trim() || null,
    category: data.category.trim() || null,
    unit: data.unit.trim() || null,
    vat_rate: parseFloat(data.vat_rate),
    name_tr: data.name_tr.trim(),
    name_en: data.name_en.trim() || null,
    description_tr: data.description_tr.trim() || null,
    description_en: data.description_en.trim() || null,
    price_try: parseFloat(data.price_try) || 0,
    price_usd: parseFloat(data.price_usd) || 0,
    price_eur: parseFloat(data.price_eur) || 0,
    price_gbp: parseFloat(data.price_gbp) || 0,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/products')
  return { success: true }
}

export async function updateProduct(id: string, data: ProductFormData): Promise<ActionResult> {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return { error: 'Oturum bulunamadı.' }

  const err = validate(data)
  if (err) return { error: err }

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({
      sku: data.sku.trim() || null,
      category: data.category.trim() || null,
      unit: data.unit.trim() || null,
      vat_rate: parseFloat(data.vat_rate),
      name_tr: data.name_tr.trim(),
      name_en: data.name_en.trim() || null,
      description_tr: data.description_tr.trim() || null,
      description_en: data.description_en.trim() || null,
      price_try: parseFloat(data.price_try) || 0,
      price_usd: parseFloat(data.price_usd) || 0,
      price_eur: parseFloat(data.price_eur) || 0,
      price_gbp: parseFloat(data.price_gbp) || 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/products')
  return { success: true }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return { error: 'Oturum bulunamadı.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/products')
  return { success: true }
}
