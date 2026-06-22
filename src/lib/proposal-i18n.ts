export type Lang = 'tr' | 'en'

export const i18n = {
  tr: {
    proposal: 'TEKLİF',
    proposal_no: 'Teklif No',
    date: 'Tarih',
    valid_until: 'Geçerlilik',
    customer: 'MÜŞTERİ',
    bill_to: 'Alıcı',
    tax_no: 'V.K.N.',
    pos: '#',
    description: 'Açıklama',
    sku: 'Stok Kodu',
    unit: 'Birim',
    quantity: 'Miktar',
    unit_price: 'Birim Fiyat',
    discount: 'İsk. %',
    line_total: 'Tutar',
    vat_rate: 'K.D.V. %',
    subtotal: 'Ara Toplam',
    discount_label: 'İndirim',
    net: 'Net Toplam',
    vat: 'K.D.V.',
    grand_total: 'GENEL TOPLAM',
    notes: 'Notlar',
    payment_terms: 'Ödeme Koşulları',
    delivery_terms: 'Teslimat Koşulları',
    delivery_time: 'Teslimat Süresi',
    prepared_by: 'Hazırlayan',
    page: 'Sayfa',
  },
  en: {
    proposal: 'PROPOSAL',
    proposal_no: 'Proposal No',
    date: 'Date',
    valid_until: 'Valid Until',
    customer: 'CUSTOMER',
    bill_to: 'Bill To',
    tax_no: 'Tax No.',
    pos: '#',
    description: 'Description',
    sku: 'SKU',
    unit: 'Unit',
    quantity: 'Quantity',
    unit_price: 'Unit Price',
    discount: 'Disc. %',
    line_total: 'Amount',
    vat_rate: 'VAT %',
    subtotal: 'Subtotal',
    discount_label: 'Discount',
    net: 'Net Total',
    vat: 'VAT',
    grand_total: 'GRAND TOTAL',
    notes: 'Notes',
    payment_terms: 'Payment Terms',
    delivery_terms: 'Delivery Terms',
    delivery_time: 'Delivery Time',
    prepared_by: 'Prepared By',
    page: 'Page',
  },
} as const

export type I18nKeys = keyof typeof i18n.tr

export function t(lang: Lang, key: I18nKeys): string {
  return i18n[lang][key]
}

export function formatDate(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
