'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { calcProposal, fmt, CURRENCY_SYMBOLS } from '@/lib/vat-logic'
import { deleteProposal } from '../actions'
import { ProposalForm } from './proposal-form'
import type { Proposal, Customer, Product, Organization } from '@/types'

type Props = {
  proposal: Proposal
  customers: Customer[]
  products: Product[]
  org: Organization
}

export function ProposalView({ proposal, customers, products, org }: Props) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const [sendModal, setSendModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [toEmail, setToEmail] = useState(proposal.customer?.email ?? '')
  const [emailBody, setEmailBody] = useState('')

  const items = proposal.proposal_items ?? []
  const currency = proposal.currency

  const calc = calcProposal(
    items.map((i) => ({
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      line_discount_percent: Number(i.line_discount_percent),
      product_vat_rate: Number(i.product_vat_rate),
    })),
    proposal.vat_enabled,
    proposal.general_discount_type,
    proposal.general_discount_value != null ? Number(proposal.general_discount_value) : null,
  )

  async function handleDelete() {
    const ok = await confirm({ message: 'Bu teklifi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', variant: 'danger' })
    if (!ok) return
    const result = await deleteProposal(proposal.id)
    if ('error' in result) { toast.error(result.error); return }
    toast.success('Teklif silindi.')
    router.push('/proposals')
  }

  async function handleDownloadPdf() {
    window.open(`/api/proposals/${proposal.id}/pdf`, '_blank')
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toEmail, body: emailBody }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Gönderim başarısız.')
      toast.success('Teklif email ile gönderildi.')
      setSendModal(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu.')
    } finally {
      setSending(false)
    }
  }

  if (editing) {
    return (
      <ProposalForm
        customers={customers}
        products={products}
        editing={proposal}
      />
    )
  }

  const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/proposals" className="text-zinc-400 hover:text-zinc-600 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900">
              Teklif #{String(proposal.proposal_number).padStart(4, '0')}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <span>{new Date(proposal.proposal_date).toLocaleDateString('tr-TR')}</span>
            {proposal.valid_until && (
              <span>Geçerlilik: {new Date(proposal.valid_until).toLocaleDateString('tr-TR')}</span>
            )}
            <span className="font-medium text-zinc-700">{proposal.customer?.name ?? '—'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            PDF İndir
          </button>
          <button
            onClick={() => setSendModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Email Gönder
          </button>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Düzenle
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
          >
            Sil
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {/* Proposal meta */}
        <div className="grid grid-cols-3 gap-6 p-6 border-b border-zinc-100">
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Müşteri</div>
            <div className="font-semibold text-zinc-900">{proposal.customer?.name ?? '—'}</div>
            {proposal.customer?.email && <div className="text-sm text-zinc-500">{proposal.customer.email}</div>}
            {proposal.customer?.phone && <div className="text-sm text-zinc-500">{proposal.customer.phone}</div>}
            {proposal.customer?.address && <div className="text-sm text-zinc-400 mt-1">{proposal.customer.address}</div>}
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Teklif Bilgileri</div>
            <div className="text-sm space-y-1">
              <div className="flex gap-3">
                <span className="text-zinc-500">Tarih:</span>
                <span className="text-zinc-900">{new Date(proposal.proposal_date).toLocaleDateString('tr-TR')}</span>
              </div>
              {proposal.valid_until && (
                <div className="flex gap-3">
                  <span className="text-zinc-500">Geçerlilik:</span>
                  <span className="text-zinc-900">{new Date(proposal.valid_until).toLocaleDateString('tr-TR')}</span>
                </div>
              )}
              <div className="flex gap-3">
                <span className="text-zinc-500">Para Birimi:</span>
                <span className="text-zinc-900">{currency}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-zinc-500">KDV:</span>
                <span className="text-zinc-900">{proposal.vat_enabled ? 'Dahil' : 'Hariç'}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Genel Toplam</div>
            <div className="text-3xl font-bold text-blue-600">{fmt(calc.grand_total, currency)}</div>
          </div>
        </div>

        {/* Items table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 w-8">#</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Ürün / Açıklama</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-500 w-16">Birim</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 w-24">Birim Fiyat</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 w-20">Miktar</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 w-16">İsk%</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 w-28">Net Tutar</th>
                {proposal.vat_enabled && <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 w-24">KDV</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const lc = calc.lines[idx]
                return (
                  <tr key={item.id} className="border-b border-zinc-50">
                    <td className="px-5 py-3 text-xs text-zinc-400">{idx + 1}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-sm text-zinc-900">{item.product_name_tr}</div>
                      {item.product_description_tr && <div className="text-xs text-zinc-400 mt-0.5">{item.product_description_tr}</div>}
                      {item.product_sku && <div className="text-xs text-zinc-300 font-mono">{item.product_sku}</div>}
                    </td>
                    <td className="px-5 py-3 text-center text-sm text-zinc-500">{item.product_unit ?? ''}</td>
                    <td className="px-5 py-3 text-right text-sm text-zinc-700">{fmt(Number(item.unit_price), currency)}</td>
                    <td className="px-5 py-3 text-right text-sm text-zinc-700">{Number(item.quantity).toLocaleString('tr-TR', { maximumFractionDigits: 4 })}</td>
                    <td className="px-5 py-3 text-right text-sm text-zinc-500">
                      {Number(item.line_discount_percent) > 0 ? `%${item.line_discount_percent}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-zinc-900">{fmt(lc?.line_net ?? 0, currency)}</td>
                    {proposal.vat_enabled && (
                      <td className="px-5 py-3 text-right text-sm text-zinc-500">
                        %{item.product_vat_rate} · {fmt(lc?.line_vat ?? 0, currency)}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end px-6 py-4 border-t border-zinc-100">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Ara Toplam</span>
              <span>{fmt(calc.subtotal, currency)}</span>
            </div>
            {calc.discount_amount > 0 && (
              <>
                <div className="flex justify-between text-zinc-600">
                  <span>İndirim</span>
                  <span>- {fmt(calc.discount_amount, currency)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Net Toplam</span>
                  <span>{fmt(calc.net, currency)}</span>
                </div>
              </>
            )}
            {proposal.vat_enabled && (
              <div className="flex justify-between text-zinc-600">
                <span>KDV</span>
                <span>{fmt(calc.vat, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-zinc-900 text-base pt-2 border-t border-zinc-200">
              <span>GENEL TOPLAM</span>
              <span className="text-blue-600">{fmt(calc.grand_total, currency)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        {(proposal.notes || proposal.payment_terms || proposal.delivery_terms || proposal.delivery_time) && (
          <div className="px-6 py-4 border-t border-zinc-100 grid grid-cols-2 gap-4 text-sm">
            {proposal.notes && (
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Notlar</div>
                <div className="text-zinc-600 whitespace-pre-wrap">{proposal.notes}</div>
              </div>
            )}
            <div className="space-y-2">
              {proposal.payment_terms && (
                <div>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-0.5">Ödeme Koşulları</div>
                  <div className="text-zinc-600">{proposal.payment_terms}</div>
                </div>
              )}
              {proposal.delivery_terms && (
                <div>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-0.5">Teslimat Koşulları</div>
                  <div className="text-zinc-600">{proposal.delivery_terms}</div>
                </div>
              )}
              {proposal.delivery_time && (
                <div>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-0.5">Teslimat Süresi</div>
                  <div className="text-zinc-600">{proposal.delivery_time}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Send Email Modal */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSendModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="font-semibold text-zinc-900">Teklif Gönder</h2>
              <button onClick={() => setSendModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSendEmail} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Alıcı Email *</label>
                <input
                  type="email"
                  required
                  className={inp}
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="ornek@firma.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Email Mesajı (opsiyonel)</label>
                <textarea
                  className={`${inp} resize-none`}
                  rows={4}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Merhaba, ekteki teklifimizi incelemenizi rica ederiz…"
                />
              </div>
              <p className="text-xs text-zinc-400">Teklif PDF olarak email&apos;e eklenerek gönderilecektir.</p>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setSendModal(false)} className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors">
                  İptal
                </button>
                <button type="submit" disabled={sending} className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50">
                  {sending ? 'Gönderiliyor…' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
