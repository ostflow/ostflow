export const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const
export const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

export type LineInput = {
  quantity: number
  unit_price: number
  line_discount_percent: number
  product_vat_rate: number
}

export type LineCalc = {
  line_net: number
  line_vat: number
  line_total: number
}

export type ProposalCalc = {
  subtotal: number
  discount_amount: number
  net: number
  vat: number
  grand_total: number
  lines: LineCalc[]
}

export function calcProposal(
  items: LineInput[],
  vatEnabled: boolean,
  discountType: 'percent' | 'fixed' | null,
  discountValue: number | null,
): ProposalCalc {
  const lines: LineCalc[] = items.map((item) => {
    const line_net = round4(item.quantity * item.unit_price * (1 - item.line_discount_percent / 100))
    return { line_net, line_vat: 0, line_total: line_net }
  })

  const subtotal = round4(lines.reduce((s, l) => s + l.line_net, 0))

  let discount_amount = 0
  if (discountType === 'percent' && discountValue != null && discountValue > 0) {
    discount_amount = round4(subtotal * discountValue / 100)
  } else if (discountType === 'fixed' && discountValue != null && discountValue > 0) {
    discount_amount = round4(discountValue)
  }

  const net = round4(subtotal - discount_amount)
  const discount_ratio = subtotal > 0 ? net / subtotal : 1

  let total_vat = 0
  if (vatEnabled) {
    for (let i = 0; i < lines.length; i++) {
      const net_line = round4(lines[i].line_net * discount_ratio)
      const vat = round4(net_line * items[i].product_vat_rate / 100)
      lines[i].line_vat = vat
      lines[i].line_total = round4(net_line + vat)
      total_vat += vat
    }
    total_vat = round4(total_vat)
  }

  const grand_total = round4(net + total_vat)

  return { subtotal, discount_amount, net, vat: total_vat, grand_total, lines }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

export function fmt(amount: number, currency: string, decimals = 2): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency
  return `${sym}${amount.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function fmtNum(amount: number, decimals = 2): string {
  return amount.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
