export const LIMITS = {
  customer: {
    name: 75,
    tax_number: 20,
    address: 100,
    phone: 20,
    email: 50,
    emails_max_count: 10,
  },
  product: {
    sku: 20,
    category: 20,
    name_tr: 50,
    name_en: 50,
    description_tr: 250,
    description_en: 250,
    price_max: 999_999_999.99,
  },
  proposal: {
    notes: 500,
    notes_max_lines: 7,
    payment_terms: 50,
    delivery_terms: 50,
    delivery_time: 60,
    quantity_min: 0.001,
    discount_percent_max: 100,
  },
  organization: {
    name: 125,
    tax_number: 20,
    address: 200,
    phone: 20,
    fax: 20,
    email: 50,
    web: 50,
  },
  profile: {
    full_name: 50,
    display_name: 50,
  },
} as const

export const PHONE_REGEX = /^[+0-9 ]*$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
