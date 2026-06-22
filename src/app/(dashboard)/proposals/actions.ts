'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'
import { calcProposal } from '@/lib/vat-logic'
import { getLatestRates, buildTotals } from '@/lib/exchange-rates'
import type { Currency } from '@/types'

export type ProposalItemInput = {
  product_id: string
  product_sku: string
  product_name_tr: string
  product_name_en: string
  product_description_tr: string
  product_description_en: string
  product_unit: string
  product_vat_rate: number
  unit_price: number
  quantity: number
  line_discount_percent: number
}

export type ProposalInput = {
  customer_id: string
  proposal_date: string
  valid_until: string
  currency: Currency
  language: 'tr' | 'en'
  vat_enabled: boolean
  general_discount_type: 'percent' | 'fixed' | ''
  general_discount_value: string
  notes: string
  payment_terms: string
  delivery_terms: string
  delivery_time: string
  items: ProposalItemInput[]
}

type ActionResult = { error: string } | { proposalId: string }

async function computeAndSave(
  orgId: string,
  userId: string,
  data: ProposalInput,
  existingId?: string,
): Promise<ActionResult> {
  const supabase = await createClient()

  const discountType = data.general_discount_type || null
  const discountValue = data.general_discount_value ? parseFloat(data.general_discount_value) : null

  const calc = calcProposal(
    data.items.map((i) => ({
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      line_discount_percent: Number(i.line_discount_percent),
      product_vat_rate: Number(i.product_vat_rate),
    })),
    data.vat_enabled,
    discountType as 'percent' | 'fixed' | null,
    discountValue,
  )

  let rates = {}
  try {
    rates = await getLatestRates()
  } catch {
    // Use 1:1 if no rates available
  }

  const totals = buildTotals(calc.grand_total, data.currency, rates)

  if (existingId) {
    // Update proposal
    const { error: propErr } = await supabase
      .from('proposals')
      .update({
        customer_id: data.customer_id || null,
        proposal_date: data.proposal_date,
        valid_until: data.valid_until || null,
        currency: data.currency,
        language: data.language,
        vat_enabled: data.vat_enabled,
        general_discount_type: discountType,
        general_discount_value: discountValue,
        notes: data.notes || null,
        payment_terms: data.payment_terms || null,
        delivery_terms: data.delivery_terms || null,
        delivery_time: data.delivery_time || null,
        ...totals,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingId)
      .eq('organization_id', orgId)

    if (propErr) return { error: propErr.message }

    // Delete old items and re-insert
    await supabase.from('proposal_items').delete().eq('proposal_id', existingId)

    if (data.items.length > 0) {
      const { error: itemsErr } = await supabase.from('proposal_items').insert(
        data.items.map((item, idx) => ({
          proposal_id: existingId,
          product_id: item.product_id || null,
          position: idx,
          product_sku: item.product_sku || null,
          product_name_tr: item.product_name_tr,
          product_name_en: item.product_name_en || null,
          product_description_tr: item.product_description_tr || null,
          product_description_en: item.product_description_en || null,
          product_unit: item.product_unit || null,
          product_vat_rate: Number(item.product_vat_rate),
          unit_price: Number(item.unit_price),
          quantity: Number(item.quantity),
          line_discount_percent: Number(item.line_discount_percent),
        }))
      )
      if (itemsErr) return { error: itemsErr.message }
    }

    revalidatePath('/dashboard/proposals')
    revalidatePath(`/dashboard/proposals/${existingId}`)
    return { proposalId: existingId }
  }

  // Create new proposal — get next proposal_number
  const { data: numData } = await supabase.rpc('next_proposal_number', { p_org_id: orgId })
  const proposalNumber = (numData as number | null) ?? 1

  const { data: newProposal, error: propErr } = await supabase
    .from('proposals')
    .insert({
      organization_id: orgId,
      created_by: userId,
      customer_id: data.customer_id || null,
      proposal_number: proposalNumber,
      proposal_date: data.proposal_date,
      valid_until: data.valid_until || null,
      currency: data.currency,
      language: data.language,
      vat_enabled: data.vat_enabled,
      general_discount_type: discountType,
      general_discount_value: discountValue,
      notes: data.notes || null,
      payment_terms: data.payment_terms || null,
      delivery_terms: data.delivery_terms || null,
      delivery_time: data.delivery_time || null,
      ...totals,
    })
    .select('id')
    .single()

  if (propErr || !newProposal) return { error: propErr?.message ?? 'Teklif oluşturulamadı.' }

  if (data.items.length > 0) {
    const { error: itemsErr } = await supabase.from('proposal_items').insert(
      data.items.map((item, idx) => ({
        proposal_id: newProposal.id,
        product_id: item.product_id || null,
        position: idx,
        product_sku: item.product_sku || null,
        product_name_tr: item.product_name_tr,
        product_name_en: item.product_name_en || null,
        product_description_tr: item.product_description_tr || null,
        product_description_en: item.product_description_en || null,
        product_unit: item.product_unit || null,
        product_vat_rate: Number(item.product_vat_rate),
        unit_price: Number(item.unit_price),
        quantity: Number(item.quantity),
        line_discount_percent: Number(item.line_discount_percent),
      }))
    )
    if (itemsErr) return { error: itemsErr.message }
  }

  revalidatePath('/dashboard/proposals')
  return { proposalId: newProposal.id }
}

export async function createProposal(data: ProposalInput): Promise<ActionResult> {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return { error: 'Oturum bulunamadı.' }
  return computeAndSave(organizationId, user.id, data)
}

export async function updateProposal(id: string, data: ProposalInput): Promise<ActionResult> {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return { error: 'Oturum bulunamadı.' }
  return computeAndSave(organizationId, user.id, data, id)
}

export async function deleteProposal(id: string): Promise<{ error: string } | { success: true }> {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return { error: 'Oturum bulunamadı.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('proposals')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/proposals')
  return { success: true }
}
