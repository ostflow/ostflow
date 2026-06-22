'use client'

import { useState, useCallback, useId } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { calcProposal, fmt, CURRENCY_SYMBOLS } from '@/lib/vat-logic'
import { createProposal, updateProposal, type ProposalInput, type ProposalItemInput } from '../actions'
import type { Customer, Product, Proposal } from '@/types'

type FormItem = ProposalItemInput & { _key: string }

function newItem(): FormItem {
  return {
    _key: Math.random().toString(36).slice(2),
    product_id: '',
    product_sku: '',
    product_name_tr: '',
    product_name_en: '',
    product_description_tr: '',
    product_description_en: '',
    product_unit: '',
    product_vat_rate: 20,
    unit_price: 0,
    quantity: 1,
    line_discount_percent: 0,
  }
}

function itemFromProduct(product: Product, currency: string): Omit<FormItem, '_key'> {
  const priceKey = `price_${currency.toLowerCase()}` as 'price_try'
  return {
    product_id: product.id,
    product_sku: product.sku ?? '',
    product_name_tr: product.name_tr,
    product_name_en: product.name_en ?? '',
    product_description_tr: product.description_tr ?? '',
    product_description_en: product.description_en ?? '',
    product_unit: product.unit ?? '',
    product_vat_rate: Number(product.vat_rate),
    unit_price: Number(product[priceKey]) || 0,
    quantity: 1,
    line_discount_percent: 0,
  }
}

const TODAY = new Date().toISOString().split('T')[0]
const DEFAULT_VALID = new Date(Date.now() + 30 * 86400 * 1000).toISOString().split('T')[0]

type Props = {
  customers: Customer[]
  products: Product[]
  editing?: Proposal
}

export function ProposalForm({ customers, products, editing }: Props) {
  const router = useRouter()
  const toast = useToast()
  const uid = useId()

  const [customer_id, setCustomerId] = useState(editing?.customer_id ?? '')
  const [proposal_date, setProposalDate] = useState(editing?.proposal_date ?? TODAY)
  const [valid_until, setValidUntil] = useState(editing?.valid_until ?? DEFAULT_VALID)
  const [currency, setCurrency] = useState<string>(editing?.currency ?? 'TRY')
  const [language, setLanguage] = useState<string>(editing?.language ?? 'tr')
  const [vat_enabled, setVatEnabled] = useState(editing?.vat_enabled ?? true)
  const [discount_type, setDiscountType] = useState(editing?.general_discount_type ?? '')
  const [discount_value, setDiscountValue] = useState(String(editing?.general_discount_value ?? ''))
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [payment_terms, setPaymentTerms] = useState(editing?.payment_terms ?? '')
  const [delivery_terms, setDeliveryTerms] = useState(editing?.delivery_terms ?? '')
  const [delivery_time, setDeliveryTime] = useState(editing?.delivery_time ?? '')
  const [items, setItems] = useState<FormItem[]>(
    editing?.proposal_items?.length
      ? editing.proposal_items.map((i) => ({
          _key: i.id,
          product_id: i.product_id ?? '',
          product_sku: i.product_sku ?? '',
          product_name_tr: i.product_name_tr,
          product_name_en: i.product_name_en ?? '',
          product_description_tr: i.product_description_tr ?? '',
          product_description_en: i.product_description_en ?? '',
          product_unit: i.product_unit ?? '',
          product_vat_rate: Number(i.product_vat_rate),
          unit_price: Number(i.unit_price),
          quantity: Number(i.quantity),
          line_discount_percent: Number(i.line_discount_percent),
        }))
      : [newItem()]
  )
  const [loading, setLoading] = useState(false)
  const [productPickerIdx, setProductPickerIdx] = useState<number | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')

  const setItem = useCallback((idx: number, updates: Partial<FormItem>) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...updates } : it))
  }, [])

  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx))

  const addItem = () => setItems((p) => [...p, newItem()])

  function selectProduct(idx: number, product: Product) {
    const base = itemFromProduct(product, currency)
    setItems((p) => p.map((it, i) => i === idx ? { ...it, ...base } : it))
    setProductPickerIdx(null)
    setPickerSearch('')
  }

  const calc = calcProposal(
    items.map((i) => ({
      quantity: Number(i.quantity) || 0,
      unit_price: Number(i.unit_price) || 0,
      line_discount_percent: Number(i.line_discount_percent) || 0,
      product_vat_rate: Number(i.product_vat_rate) || 0,
    })),
    vat_enabled,
    (discount_type as 'percent' | 'fixed') || null,
    discount_value ? parseFloat(discount_value) : null,
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) { toast.error('En az bir ürün satırı ekleyin.'); return }
    if (!customer_id) { toast.error('Müşteri seçmelisiniz.'); return }

    setLoading(true)
    const input: ProposalInput = {
      customer_id,
      proposal_date,
      valid_until,
      currency: currency as 'TRY',
      language: language as 'tr',
      vat_enabled,
      general_discount_type: discount_type as 'percent' | 'fixed' | '',
      general_discount_value: discount_value,
      notes,
      payment_terms,
      delivery_terms,
      delivery_time,
      items: items.map(({ _key, ...rest }) => rest),
    }

    const result = editing
      ? await updateProposal(editing.id, input)
      : await createProposal(input)

    setLoading(false)

    if ('error' in result) { toast.error(result.error); return }
    toast.success(editing ? 'Teklif güncellendi.' : 'Teklif oluşturuldu.')
    router.push(`/proposals/${result.proposalId}`)
  }

  const inp = 'px-3 py-2 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-zinc-400 transition-colors'
  const lbl = 'block text-xs font-medium text-zinc-600 mb-1'

  const filteredProducts = products.filter((p) =>
    p.name_tr.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">
          {editing ? `Teklif #${String(editing.proposal_number).padStart(4, '0')} Düzenle` : 'Yeni Teklif'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header card */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Teklif Bilgileri</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={lbl}>Müşteri *</label>
              <select className={`${inp} w-full`} value={customer_id} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">Müşteri seçin…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Para Birimi</label>
                <select className={`${inp} w-full`} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {['TRY', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Dil</label>
                <select className={`${inp} w-full`} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Teklif Tarihi</label>
              <input type="date" className={`${inp} w-full`} value={proposal_date} onChange={(e) => setProposalDate(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Geçerlilik Tarihi</label>
              <input type="date" className={`${inp} w-full`} value={valid_until} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vat_enabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-zinc-700">KDV Hesapla</span>
              </label>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">Ürün / Hizmet Satırları</h2>
            <button
              type="button"
              onClick={addItem}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Satır Ekle
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 w-8">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500">Ürün / Açıklama</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 w-16">Birim</th>
                  {vat_enabled && <th className="text-center px-4 py-2.5 text-xs font-semibold text-zinc-500 w-16">KDV%</th>}
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500 w-24">Birim Fiyat</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500 w-20">Miktar</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500 w-18">İsk%</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500 w-28">Toplam</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const lc = calc.lines[idx]
                  return (
                    <tr key={item._key} className="border-b border-zinc-50">
                      <td className="px-4 py-2 text-xs text-zinc-400">{idx + 1}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex gap-2 mb-1">
                              <input
                                className={`${inp} flex-1 text-xs py-1.5`}
                                placeholder="Ürün adı"
                                value={item.product_name_tr}
                                onChange={(e) => setItem(idx, { product_name_tr: e.target.value })}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => { setProductPickerIdx(idx); setPickerSearch('') }}
                                className="px-2 py-1.5 text-xs border border-zinc-200 rounded-md text-zinc-500 hover:border-blue-300 hover:text-blue-600 transition-colors whitespace-nowrap"
                              >
                                Katalogdan
                              </button>
                            </div>
                            {item.product_sku && (
                              <div className="text-xs text-zinc-400 font-mono">{item.product_sku}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          className={`${inp} w-full text-xs py-1.5`}
                          placeholder="Adet"
                          value={item.product_unit}
                          onChange={(e) => setItem(idx, { product_unit: e.target.value })}
                        />
                      </td>
                      {vat_enabled && (
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            className={`${inp} w-full text-xs py-1.5 text-center`}
                            value={item.product_vat_rate}
                            onChange={(e) => setItem(idx, { product_vat_rate: Number(e.target.value) })}
                          />
                        </td>
                      )}
                      <td className="px-4 py-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                            {CURRENCY_SYMBOLS[currency] ?? currency}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={`${inp} w-full text-xs py-1.5 pl-5 text-right`}
                            value={item.unit_price}
                            onChange={(e) => setItem(idx, { unit_price: Number(e.target.value) })}
                            required
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          className={`${inp} w-full text-xs py-1.5 text-right`}
                          value={item.quantity}
                          onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })}
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className={`${inp} w-full text-xs py-1.5 text-right`}
                          value={item.line_discount_percent}
                          onChange={(e) => setItem(idx, { line_discount_percent: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-sm font-medium text-zinc-800">
                          {fmt(lc?.line_net ?? 0, currency)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-zinc-300 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end px-6 py-4 border-t border-zinc-100">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Ara Toplam</span>
                <span className="font-medium">{fmt(calc.subtotal, currency)}</span>
              </div>

              {/* General Discount */}
              <div className="flex items-center gap-2 py-1">
                <span className="text-zinc-500 shrink-0">Genel İndirim</span>
                <select
                  className="text-xs border border-zinc-200 rounded-md px-1 py-0.5 focus:outline-none"
                  value={discount_type}
                  onChange={(e) => setDiscountType(e.target.value)}
                >
                  <option value="">Yok</option>
                  <option value="percent">%</option>
                  <option value="fixed">Sabit</option>
                </select>
                {discount_type && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="text-xs border border-zinc-200 rounded-md px-2 py-0.5 w-20 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={discount_value}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0"
                  />
                )}
                {calc.discount_amount > 0 && (
                  <span className="text-zinc-600 ml-auto font-medium">- {fmt(calc.discount_amount, currency)}</span>
                )}
              </div>

              {calc.discount_amount > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>Net Toplam</span>
                  <span className="font-medium">{fmt(calc.net, currency)}</span>
                </div>
              )}

              {vat_enabled && (
                <div className="flex justify-between text-zinc-600">
                  <span>KDV</span>
                  <span className="font-medium">{fmt(calc.vat, currency)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-zinc-900 text-base pt-2 border-t border-zinc-200">
                <span>GENEL TOPLAM</span>
                <span className="text-blue-600">{fmt(calc.grand_total, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Notlar ve Koşullar</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Notlar</label>
              <textarea
                className={`${inp} w-full resize-none`}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Teklif notları…"
                maxLength={500}
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Ödeme Koşulları</label>
                <input className={`${inp} w-full`} value={payment_terms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Ör: Peşin / 30 gün vadeli" />
              </div>
              <div>
                <label className={lbl}>Teslimat Koşulları</label>
                <input className={`${inp} w-full`} value={delivery_terms} onChange={(e) => setDeliveryTerms(e.target.value)} placeholder="Ör: EXW İstanbul" />
              </div>
              <div>
                <label className={lbl}>Teslimat Süresi</label>
                <input className={`${inp} w-full`} value={delivery_time} onChange={(e) => setDeliveryTime(e.target.value)} placeholder="Ör: 2-3 iş günü" />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor…' : editing ? 'Güncelle' : 'Teklif Oluştur'}
          </button>
        </div>
      </form>

      {/* Product picker modal */}
      {productPickerIdx !== null && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setProductPickerIdx(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900 mb-3">Ürün Seç</h3>
              <input
                autoFocus
                type="search"
                placeholder="Ürün adı veya SKU ara…"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredProducts.length === 0 ? (
                <div className="px-5 py-8 text-center text-zinc-400 text-sm">Ürün bulunamadı.</div>
              ) : (
                filteredProducts.map((p) => {
                  const priceKey = `price_${currency.toLowerCase()}` as 'price_try'
                  const price = Number(p[priceKey]) || 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectProduct(productPickerIdx, p)}
                      className="w-full text-left px-5 py-3 border-b border-zinc-50 hover:bg-blue-50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-sm text-zinc-900">{p.name_tr}</div>
                        <div className="text-xs text-zinc-400">{p.sku ?? ''} {p.category ? `· ${p.category}` : ''}</div>
                      </div>
                      <div className="text-sm font-semibold text-zinc-700 shrink-0">
                        {CURRENCY_SYMBOLS[currency] ?? currency}{price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
