import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentOrganizationServer } from '@/lib/supabase/get-organization-server'

const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO ?? '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? '',
}

export async function POST(req: Request) {
  const { user, organizationId } = await getCurrentOrganizationServer()
  if (!user || !organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tier } = await req.json() as { tier: 'pro' | 'enterprise' }
  const priceId = PRICE_IDS[tier]
  if (!priceId) return NextResponse.json({ error: 'Invalid tier or price not configured' }, { status: 400 })

  const admin = createAdminClient()
  const { data: org } = await admin
    .from('organizations')
    .select('name, email, stripe_customer_id')
    .eq('id', organizationId)
    .single()

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const orgData = org as { name: string; email: string | null; stripe_customer_id: string | null }

  // Get or create Stripe customer
  let customerId = orgData.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: orgData.name,
      email: orgData.email ?? user.email ?? undefined,
      metadata: { organization_id: organizationId },
    })
    customerId = customer.id
    await admin
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', organizationId)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/settings?billing=success`,
    cancel_url: `${siteUrl}/settings?billing=canceled`,
    metadata: { organization_id: organizationId, tier },
    subscription_data: {
      metadata: { organization_id: organizationId, tier },
    },
  })

  return NextResponse.json({ url: session.url })
}
