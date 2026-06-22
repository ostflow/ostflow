export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP'
export type Language = 'tr' | 'en'
export type UserRole = 'owner' | 'admin' | 'staff'

export type Organization = {
  id: string
  name: string
  logo_url: string | null
  tax_number: string | null
  address: string | null
  phone: string | null
  fax: string | null
  email: string | null
  web: string | null
  is_onboarded: boolean
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  organization_id: string | null
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export type Customer = {
  id: string
  organization_id: string
  created_by: string | null
  name: string
  email: string | null
  emails: string[]
  phone: string | null
  tax_number: string | null
  address: string | null
  country: string | null
  preferred_currency: Currency
  preferred_language: Language
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Product = {
  id: string
  organization_id: string
  created_by: string | null
  sku: string | null
  category: string | null
  unit: string | null
  vat_rate: number
  name_tr: string
  name_en: string | null
  description_tr: string | null
  description_en: string | null
  price_try: number
  price_usd: number
  price_eur: number
  price_gbp: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ProposalItem = {
  id: string
  proposal_id: string
  product_id: string | null
  position: number
  product_sku: string | null
  product_name_tr: string
  product_name_en: string | null
  product_description_tr: string | null
  product_description_en: string | null
  product_unit: string | null
  product_vat_rate: number
  unit_price: number
  quantity: number
  line_discount_percent: number
}

export type Proposal = {
  id: string
  organization_id: string
  created_by: string | null
  customer_id: string | null
  proposal_number: number
  proposal_date: string
  valid_until: string | null
  currency: Currency
  language: Language
  vat_enabled: boolean
  general_discount_type: 'percent' | 'fixed' | null
  general_discount_value: number | null
  notes: string | null
  payment_terms: string | null
  delivery_terms: string | null
  delivery_time: string | null
  total_try: number
  total_usd: number
  total_eur: number
  total_gbp: number
  is_active: boolean
  created_at: string
  updated_at: string
  customer?: Pick<Customer, 'id' | 'name' | 'email' | 'phone' | 'tax_number' | 'address'>
  proposal_items?: ProposalItem[]
}

export type ExchangeRate = {
  id: string
  base_currency: string
  target_currency: string
  rate: number
  source: string
  fetched_at: string
}
