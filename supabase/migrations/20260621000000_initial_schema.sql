-- ============================================================
-- Ostflow — Birleşik İlk Şema
-- Tekliflix (teklif/CRM) + Inboxyl (email arşiv) birleşimi
-- Tüm tablolar organization_id ile izole edilmiştir (org-scoped RLS)
-- ============================================================

-- ── ENUMs ────────────────────────────────────────────────────────────────────

CREATE TYPE archive_status AS ENUM ('pending', 'processing', 'done', 'error');

CREATE TYPE activity_type AS ENUM (
  'Ziyaret', 'Toplantı', 'Fuar', 'Telefon', 'WhatsApp', 'Diğer'
);

-- ── ORGANIZATIONS ─────────────────────────────────────────────────────────────

CREATE TABLE organizations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  logo_url      text,
  tax_number    text,
  address       text,
  phone         text,
  fax           text,
  email         text,
  web           text,
  is_onboarded  boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── PROFILES ─────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid        REFERENCES organizations(id) ON DELETE SET NULL,
  full_name       text,
  role            text        NOT NULL DEFAULT 'owner'
                              CHECK (role IN ('owner', 'admin', 'staff')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── ORGANIZATION INVITES ──────────────────────────────────────────────────────

CREATE TABLE organization_invites (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token           text        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at         timestamptz,
  used_by         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read invites"
  ON organization_invites FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Org admins manage invites"
  ON organization_invites FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ── CUSTOMERS ─────────────────────────────────────────────────────────────────

CREATE TABLE customers (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  name                text        NOT NULL,
  email               text,
  emails              text[]      NOT NULL DEFAULT '{}',
  phone               text,
  tax_number          text,
  address             text,
  country             text,
  preferred_currency  text        NOT NULL DEFAULT 'TRY'
                                  CHECK (preferred_currency IN ('TRY', 'USD', 'EUR', 'GBP')),
  preferred_language  text        NOT NULL DEFAULT 'tr'
                                  CHECK (preferred_language IN ('tr', 'en')),
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage customers"
  ON customers FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX customers_organization_id_idx ON customers (organization_id);
CREATE INDEX customers_name_idx ON customers (organization_id, name);

-- ── PRODUCTS ──────────────────────────────────────────────────────────────────

CREATE TABLE products (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  sku             text,
  category        text,
  unit            text,
  vat_rate        numeric(5,2) NOT NULL DEFAULT 0,
  name_tr         text        NOT NULL,
  name_en         text,
  description_tr  text,
  description_en  text,
  price_try       numeric(15,4) NOT NULL DEFAULT 0,
  price_usd       numeric(15,4) NOT NULL DEFAULT 0,
  price_eur       numeric(15,4) NOT NULL DEFAULT 0,
  price_gbp       numeric(15,4) NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage products"
  ON products FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX products_organization_id_idx ON products (organization_id);

-- ── PROPOSALS ─────────────────────────────────────────────────────────────────

CREATE TABLE proposals (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by              uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id             uuid        REFERENCES customers(id) ON DELETE SET NULL,
  proposal_number         integer     NOT NULL,
  proposal_date           date        NOT NULL DEFAULT CURRENT_DATE,
  valid_until             date,
  currency                text        NOT NULL DEFAULT 'TRY'
                                      CHECK (currency IN ('TRY', 'USD', 'EUR', 'GBP')),
  language                text        NOT NULL DEFAULT 'tr'
                                      CHECK (language IN ('tr', 'en')),
  vat_enabled             boolean     NOT NULL DEFAULT true,
  general_discount_type   text        CHECK (general_discount_type IN ('percent', 'fixed')),
  general_discount_value  numeric(15,4),
  notes                   text,
  payment_terms           text,
  delivery_terms          text,
  delivery_time           text,
  total_try               numeric(15,4) NOT NULL DEFAULT 0,
  total_usd               numeric(15,4) NOT NULL DEFAULT 0,
  total_eur               numeric(15,4) NOT NULL DEFAULT 0,
  total_gbp               numeric(15,4) NOT NULL DEFAULT 0,
  is_active               boolean     NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, proposal_number)
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage proposals"
  ON proposals FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX proposals_organization_id_idx ON proposals (organization_id);
CREATE INDEX proposals_customer_id_idx ON proposals (customer_id);

-- Auto-increment proposal number per organization
CREATE OR REPLACE FUNCTION next_proposal_number(p_org_id uuid)
RETURNS integer
LANGUAGE sql
AS $$
  SELECT COALESCE(MAX(proposal_number), 0) + 1
  FROM proposals
  WHERE organization_id = p_org_id;
$$;

-- ── PROPOSAL ITEMS ────────────────────────────────────────────────────────────

CREATE TABLE proposal_items (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id             uuid        NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  product_id              uuid        REFERENCES products(id) ON DELETE SET NULL,
  position                integer     NOT NULL DEFAULT 0,
  product_sku             text,
  product_name_tr         text        NOT NULL,
  product_name_en         text,
  product_description_tr  text,
  product_description_en  text,
  product_unit            text,
  product_vat_rate        numeric(5,2) NOT NULL DEFAULT 0,
  unit_price              numeric(15,4) NOT NULL DEFAULT 0,
  quantity                numeric(15,4) NOT NULL DEFAULT 1,
  line_discount_percent   numeric(5,2) NOT NULL DEFAULT 0
);

ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage proposal items"
  ON proposal_items FOR ALL
  USING (
    proposal_id IN (
      SELECT id FROM proposals
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    proposal_id IN (
      SELECT id FROM proposals
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE INDEX proposal_items_proposal_id_idx ON proposal_items (proposal_id);

-- ── EXCHANGE RATES ────────────────────────────────────────────────────────────

CREATE TABLE exchange_rates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency   text        NOT NULL,
  target_currency text        NOT NULL,
  rate            numeric(18,6) NOT NULL,
  source          text        NOT NULL DEFAULT 'frankfurter',
  fetched_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base_currency, target_currency, fetched_at)
);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users read exchange rates"
  ON exchange_rates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX exchange_rates_pair_idx ON exchange_rates (base_currency, target_currency, fetched_at DESC);

-- ── EXCHANGE RATE OVERRIDES ───────────────────────────────────────────────────

CREATE TABLE exchange_rate_overrides (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  base_currency   text        NOT NULL,
  target_currency text        NOT NULL,
  rate            numeric(18,6) NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, base_currency, target_currency)
);

ALTER TABLE exchange_rate_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage rate overrides"
  ON exchange_rate_overrides FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ── PROPOSAL EMAIL LOGS ───────────────────────────────────────────────────────

CREATE TABLE proposal_email_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id       uuid        NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sent_by           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  to_emails         text[]      NOT NULL DEFAULT '{}',
  cc_emails         text[]      NOT NULL DEFAULT '{}',
  bcc_emails        text[]      NOT NULL DEFAULT '{}',
  subject           text,
  body              text,
  attach_pdf        boolean     NOT NULL DEFAULT true,
  status            text        NOT NULL DEFAULT 'sent'
                                CHECK (status IN ('sent', 'failed')),
  resend_message_id text,
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proposal_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read email logs"
  ON proposal_email_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX proposal_email_logs_proposal_id_idx ON proposal_email_logs (proposal_id);
CREATE INDEX proposal_email_logs_org_id_idx ON proposal_email_logs (organization_id);

-- ── PROPOSAL TEMPLATES ────────────────────────────────────────────────────────

CREATE TABLE proposal_templates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type            text        NOT NULL CHECK (type IN ('notes', 'payment_terms', 'delivery_terms')),
  language        text        NOT NULL DEFAULT 'tr' CHECK (language IN ('tr', 'en')),
  content         text        NOT NULL,
  is_default      boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage proposal templates"
  ON proposal_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ── ARCHIVES (inboxyl — org-scoped) ──────────────────────────────────────────

CREATE TABLE archives (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name       text        NOT NULL,
  r2_key          text        NOT NULL,
  status          archive_status NOT NULL DEFAULT 'pending',
  size_bytes      bigint,
  error_message   text,
  processed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage archives"
  ON archives FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX archives_organization_id_idx ON archives (organization_id);

-- ── COMPANIES (inboxyl — org-scoped, customer_id FK eklendi) ─────────────────

CREATE TABLE companies (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id     uuid        REFERENCES customers(id) ON DELETE SET NULL,
  domain          text        NOT NULL,
  name            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, domain)
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage companies"
  ON companies FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX companies_organization_id_idx ON companies (organization_id);
CREATE INDEX companies_customer_id_idx ON companies (customer_id);

-- ── EMAILS (inboxyl — org-scoped) ────────────────────────────────────────────

CREATE TABLE emails (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  archive_id      uuid        NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  company_id      uuid        REFERENCES companies(id) ON DELETE SET NULL,
  subject         text        NOT NULL DEFAULT '',
  from_address    text        NOT NULL,
  to_addresses    text[]      NOT NULL DEFAULT '{}',
  body            text        NOT NULL DEFAULT '',
  body_type       text        NOT NULL DEFAULT 'text' CHECK (body_type IN ('html', 'text')),
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage emails"
  ON emails FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX emails_organization_id_idx ON emails (organization_id);
CREATE INDEX emails_company_id_idx ON emails (company_id);
CREATE INDEX emails_archive_id_idx ON emails (archive_id);

-- ── ACTIVITIES (inboxyl — org-scoped) ────────────────────────────────────────

CREATE TABLE activities (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id      uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity_type   activity_type NOT NULL,
  custom_type     text,
  notes           text,
  occurred_at     timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage activities"
  ON activities FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX activities_organization_id_idx ON activities (organization_id);
CREATE INDEX activities_company_id_idx ON activities (company_id);
CREATE INDEX activities_occurred_at_idx ON activities (occurred_at DESC);

-- ── ATTACHMENTS (inboxyl — org-scoped) ───────────────────────────────────────

CREATE TABLE attachments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id        uuid        NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name       text        NOT NULL,
  r2_key          text        NOT NULL,
  size_bytes      bigint      NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage attachments"
  ON attachments FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX attachments_email_id_idx ON attachments (email_id);
CREATE INDEX attachments_organization_id_idx ON attachments (organization_id);

-- ── TRIGGER: Yeni kullanıcı kaydında org + profil oluştur ─────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_full_name text;
BEGIN
  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    'Yeni Organizasyon'
  );
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  INSERT INTO organizations (name)
  VALUES (v_org_name)
  RETURNING id INTO v_org_id;

  INSERT INTO profiles (id, organization_id, full_name, role)
  VALUES (NEW.id, v_org_id, v_full_name, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
