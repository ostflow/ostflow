import 'server-only'
import type { Proposal, Organization } from '@/types'
import { calcProposal } from '@/lib/vat-logic'
import { CURRENCY_SYMBOLS } from '@/lib/vat-logic'
import { t, formatDate, type Lang } from '@/lib/proposal-i18n'

function money(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency
  return `${sym}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function buildHtml(proposal: Proposal, org: Organization): string {
  const lang = proposal.language as Lang
  const currency = proposal.currency
  const items = proposal.proposal_items ?? []

  const calc = calcProposal(
    items.map(i => ({
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      line_discount_percent: Number(i.line_discount_percent),
      product_vat_rate: Number(i.product_vat_rate),
    })),
    proposal.vat_enabled,
    proposal.general_discount_type,
    proposal.general_discount_value != null ? Number(proposal.general_discount_value) : null,
  )

  const productName = (item: typeof items[0]) =>
    lang === 'en' && item.product_name_en ? item.product_name_en : item.product_name_tr

  const productDesc = (item: typeof items[0]) =>
    lang === 'en' && item.product_description_en
      ? item.product_description_en
      : item.product_description_tr

  const rows = items.map((item, idx) => {
    const lc = calc.lines[idx]
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <strong>${productName(item)}</strong>
          ${productDesc(item) ? `<br/><small>${productDesc(item)}</small>` : ''}
        </td>
        <td>${item.product_sku ?? ''}</td>
        <td>${item.product_unit ?? ''}</td>
        <td>${Number(item.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}</td>
        <td>${money(Number(item.unit_price), currency)}</td>
        <td>${Number(item.line_discount_percent) > 0 ? `%${item.line_discount_percent}` : '—'}</td>
        <td>${money(lc.line_net, currency)}</td>
        ${proposal.vat_enabled ? `<td>%${item.product_vat_rate}</td>` : ''}
      </tr>
    `
  }).join('')

  const showDiscount = calc.discount_amount > 0

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: white; }
  .page { padding: 40px 48px; max-width: 960px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 2px solid #2563eb; }
  .org-name { font-size: 20px; font-weight: 700; color: #2563eb; margin-bottom: 6px; }
  .org-info { color: #555; line-height: 1.7; }
  .proposal-meta { text-align: right; }
  .proposal-label { font-size: 22px; font-weight: 800; color: #2563eb; letter-spacing: 2px; margin-bottom: 12px; }
  .meta-table td { padding: 2px 0 2px 16px; }
  .meta-table .label { color: #777; text-align: right; }
  .meta-table .value { font-weight: 600; }
  .customer-section { background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; }
  .section-title { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #777; margin-bottom: 8px; }
  .customer-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
  .customer-detail { color: #555; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #2563eb; color: white; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; }
  td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  tr:nth-child(even) td { background: #f9fafb; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
  .totals-box { width: 300px; }
  .totals-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
  .totals-row.grand { border-top: 2px solid #2563eb; border-bottom: none; padding-top: 8px; margin-top: 4px; }
  .totals-row.grand .label { font-size: 13px; font-weight: 700; color: #2563eb; }
  .totals-row.grand .value { font-size: 14px; font-weight: 800; color: #2563eb; }
  .terms { margin-bottom: 24px; }
  .term-row { margin-bottom: 10px; }
  .term-label { font-weight: 700; font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase; color: #555; margin-bottom: 2px; }
  .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; color: #999; font-size: 10px; text-align: center; }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="org-name">${org.name}</div>
      <div class="org-info">
        ${org.address ? `${org.address}<br/>` : ''}
        ${org.phone ? `Tel: ${org.phone}${org.fax ? ` &nbsp;|&nbsp; Fax: ${org.fax}` : ''}<br/>` : ''}
        ${org.email ? `${org.email}<br/>` : ''}
        ${org.web ? `${org.web}<br/>` : ''}
        ${org.tax_number ? `${t(lang, 'tax_no')} ${org.tax_number}` : ''}
      </div>
    </div>
    <div class="proposal-meta">
      <div class="proposal-label">${t(lang, 'proposal')}</div>
      <table class="meta-table">
        <tr>
          <td class="label">${t(lang, 'proposal_no')}:</td>
          <td class="value">#${String(proposal.proposal_number).padStart(4, '0')}</td>
        </tr>
        <tr>
          <td class="label">${t(lang, 'date')}:</td>
          <td class="value">${formatDate(proposal.proposal_date, lang)}</td>
        </tr>
        ${proposal.valid_until ? `<tr>
          <td class="label">${t(lang, 'valid_until')}:</td>
          <td class="value">${formatDate(proposal.valid_until, lang)}</td>
        </tr>` : ''}
      </table>
    </div>
  </div>

  <!-- Customer -->
  ${proposal.customer ? `
  <div class="customer-section">
    <div class="section-title">${t(lang, 'bill_to')}</div>
    <div class="customer-name">${proposal.customer.name}</div>
    <div class="customer-detail">
      ${proposal.customer.address ? `${proposal.customer.address}<br/>` : ''}
      ${proposal.customer.phone ? `Tel: ${proposal.customer.phone}<br/>` : ''}
      ${proposal.customer.email ? `${proposal.customer.email}<br/>` : ''}
      ${proposal.customer.tax_number ? `${t(lang, 'tax_no')} ${proposal.customer.tax_number}` : ''}
    </div>
  </div>
  ` : ''}

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th style="width:32px">${t(lang, 'pos')}</th>
        <th>${t(lang, 'description')}</th>
        <th style="width:80px">${t(lang, 'sku')}</th>
        <th style="width:50px">${t(lang, 'unit')}</th>
        <th style="width:60px;text-align:right">${t(lang, 'quantity')}</th>
        <th style="width:90px;text-align:right">${t(lang, 'unit_price')}</th>
        <th style="width:50px;text-align:center">${t(lang, 'discount')}</th>
        <th style="width:100px;text-align:right">${t(lang, 'line_total')}</th>
        ${proposal.vat_enabled ? `<th style="width:50px;text-align:center">${t(lang, 'vat_rate')}</th>` : ''}
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span class="label">${t(lang, 'subtotal')}</span>
        <span class="value">${money(calc.subtotal, currency)}</span>
      </div>
      ${showDiscount ? `<div class="totals-row">
        <span class="label">${t(lang, 'discount_label')}</span>
        <span class="value">- ${money(calc.discount_amount, currency)}</span>
      </div>
      <div class="totals-row">
        <span class="label">${t(lang, 'net')}</span>
        <span class="value">${money(calc.net, currency)}</span>
      </div>` : ''}
      ${proposal.vat_enabled ? `<div class="totals-row">
        <span class="label">${t(lang, 'vat')}</span>
        <span class="value">${money(calc.vat, currency)}</span>
      </div>` : ''}
      <div class="totals-row grand">
        <span class="label">${t(lang, 'grand_total')}</span>
        <span class="value">${money(calc.grand_total, currency)}</span>
      </div>
    </div>
  </div>

  <!-- Terms -->
  ${proposal.notes || proposal.payment_terms || proposal.delivery_terms || proposal.delivery_time ? `
  <div class="terms">
    ${proposal.notes ? `<div class="term-row"><div class="term-label">${t(lang, 'notes')}</div><div>${proposal.notes}</div></div>` : ''}
    ${proposal.payment_terms ? `<div class="term-row"><div class="term-label">${t(lang, 'payment_terms')}</div><div>${proposal.payment_terms}</div></div>` : ''}
    ${proposal.delivery_terms ? `<div class="term-row"><div class="term-label">${t(lang, 'delivery_terms')}</div><div>${proposal.delivery_terms}</div></div>` : ''}
    ${proposal.delivery_time ? `<div class="term-row"><div class="term-label">${t(lang, 'delivery_time')}</div><div>${proposal.delivery_time}</div></div>` : ''}
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    ${org.name} &mdash; ${t(lang, 'proposal')} #${String(proposal.proposal_number).padStart(4, '0')}
  </div>
</div>
</body>
</html>`
}

export async function generateProposalPdf(proposal: Proposal, org: Organization): Promise<Buffer> {
  const html = buildHtml(proposal, org)

  let browser
  try {
    const isLambda = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL

    if (isLambda) {
      const chromium = (await import('@sparticuz/chromium')).default
      const puppeteer = await import('puppeteer-core')
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      })
    } else {
      const puppeteer = await import('puppeteer-core')
      browser = await puppeteer.launch({
        headless: true,
        executablePath:
          process.platform === 'win32'
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : process.platform === 'darwin'
            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            : '/usr/bin/google-chrome',
      })
    }

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
    })
    return Buffer.from(pdf)
  } finally {
    await browser?.close()
  }
}
