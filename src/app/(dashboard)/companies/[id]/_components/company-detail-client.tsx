'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import type { EmailRow } from '../page'
import type { Customer } from '@/types'

type Company = {
  id: string
  domain: string
  name: string
  customer_id: string | null
  customer: { id: string; name: string } | null
}

type Props = {
  company: Company
  emails: EmailRow[]
  customers: Pick<Customer, 'id' | 'name'>[]
}

export function CompanyDetailClient({ company, emails, customers }: Props) {
  const [selectedEmail, setSelectedEmail] = useState<EmailRow | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [custSearch, setCustSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [linking, setLinking] = useState(false)
  const toast = useToast()
  const router = useRouter()

  async function handleLink(customerId: string | null) {
    setLinking(true)
    const res = await fetch('/api/link-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: company.id, customerId }),
    })
    setLinking(false)
    if (!res.ok) { toast.error('İşlem başarısız.'); return }
    toast.success(customerId ? 'Müşteriyle eşleştirildi.' : 'Eşleştirme kaldırıldı.')
    setShowLinkModal(false)
    router.refresh()
  }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(custSearch.toLowerCase())
  )

  return (
    <div className="grid grid-cols-5 gap-5">
      {/* Email list */}
      <div className="col-span-2 bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <span className="text-sm font-semibold text-zinc-700">Emailler ({emails.length})</span>
          {!company.customer_id ? (
            <button
              onClick={() => setShowLinkModal(true)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Müşteriyle Eşleştir
            </button>
          ) : (
            <button
              onClick={() => handleLink(null)}
              className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
            >
              Eşleştirmeyi kaldır
            </button>
          )}
        </div>
        {emails.length === 0 ? (
          <div className="px-4 py-8 text-center text-zinc-400 text-sm">Email bulunamadı.</div>
        ) : (
          <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
            {emails.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedEmail(e)}
                className={`w-full text-left px-4 py-3 border-b border-zinc-50 hover:bg-zinc-50 transition-colors ${
                  selectedEmail?.id === e.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="text-xs font-medium text-zinc-800 truncate">{e.subject || '(Konu yok)'}</div>
                <div className="text-xs text-zinc-400 truncate mt-0.5">{e.from_address}</div>
                <div className="text-xs text-zinc-300 mt-0.5">
                  {e.sent_at ? new Date(e.sent_at).toLocaleDateString('tr-TR') : '—'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Email detail */}
      <div className="col-span-3 bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {!selectedEmail ? (
          <div className="flex items-center justify-center h-full min-h-64 text-zinc-400 text-sm">
            Görüntülemek için bir email seçin.
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900 text-sm mb-2">{selectedEmail.subject || '(Konu yok)'}</h3>
              <div className="space-y-1 text-xs text-zinc-500">
                <div><span className="font-medium">Gönderen:</span> {selectedEmail.from_address}</div>
                {selectedEmail.to_addresses?.length > 0 && (
                  <div><span className="font-medium">Alıcı:</span> {selectedEmail.to_addresses.join(', ')}</div>
                )}
                {selectedEmail.sent_at && (
                  <div><span className="font-medium">Tarih:</span> {new Date(selectedEmail.sent_at).toLocaleString('tr-TR')}</div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-sm text-zinc-600 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                <EmailBodyLoader emailId={selectedEmail.id} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Link customer modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <h2 className="font-semibold text-zinc-900 text-sm">Müşteriyle Eşleştir</h2>
              <button onClick={() => setShowLinkModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4">
              <input
                autoFocus
                type="search"
                placeholder="Müşteri ara…"
                value={custSearch}
                onChange={(e) => { setCustSearch(e.target.value); setSelectedCustomerId('') }}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              />
              <div className="max-h-48 overflow-y-auto border border-zinc-100 rounded-lg">
                {filteredCustomers.map((cu) => (
                  <button
                    key={cu.id}
                    onClick={() => setSelectedCustomerId(cu.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm border-b border-zinc-50 transition-colors ${
                      selectedCustomerId === cu.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-zinc-50'
                    }`}
                  >
                    {cu.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowLinkModal(false)} className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50">
                  İptal
                </button>
                <button
                  disabled={!selectedCustomerId || linking}
                  onClick={() => handleLink(selectedCustomerId)}
                  className="flex-1 px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {linking ? 'Eşleştiriliyor…' : 'Eşleştir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmailBodyLoader({ emailId }: { emailId: string }) {
  const [body, setBody] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!body && !loading) {
    setLoading(true)
    fetch(`/api/emails/${emailId}/body`)
      .then((r) => r.json())
      .then((j) => setBody(j.body ?? ''))
      .catch(() => setBody('Email içeriği yüklenemedi.'))
      .finally(() => setLoading(false))
  }

  if (loading) return <span className="text-zinc-400">Yükleniyor…</span>
  return <>{body ?? ''}</>
}
