-- Stripe abonelik alanları organizations tablosuna ekleniyor

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id  text,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'free'
    CHECK (subscription_status IN ('free', 'active', 'past_due', 'canceled')),
  ADD COLUMN IF NOT EXISTS subscription_tier   text NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_stripe_customer_id_idx
  ON organizations (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
