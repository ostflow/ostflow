import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: unknown) {
    console.error('[stripe/webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  async function updateOrg(orgId: string, updates: Record<string, unknown>) {
    await admin.from('organizations').update(updates).eq('id', orgId)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.organization_id
      const tier = session.metadata?.tier ?? 'pro'
      if (orgId) {
        await updateOrg(orgId, { subscription_status: 'active', subscription_tier: tier })
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const orgId = sub.metadata?.organization_id
      if (orgId) {
        const status = sub.status === 'active' ? 'active'
          : sub.status === 'past_due' ? 'past_due'
          : 'canceled'
        const endsAt = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null
        await updateOrg(orgId, {
          subscription_status: status,
          subscription_ends_at: endsAt,
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const orgId = sub.metadata?.organization_id
      if (orgId) {
        await updateOrg(orgId, {
          subscription_status: 'canceled',
          subscription_tier: 'free',
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice
      const customerId = inv.customer as string
      const { data: orgs } = await admin
        .from('organizations')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .limit(1)
      if (orgs?.[0]) {
        await updateOrg(orgs[0].id, { subscription_status: 'past_due' })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
