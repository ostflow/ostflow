'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import type { CompanyRow } from '../page'
import type { Customer } from '@/types'

type Props = {
  companies: CompanyRow[]
  customers: Pick<Customer, 'id' | 'name'>[]
}

type LinkModal = { companyId: string; companyName: string }

export function CompaniesClient({ companies, customers }: Props) {
  const [search, setSearch] = useState('')
  const [linkModal, setLinkModal] = useState<LinkModal | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [linking, setLinking] = useState(false)
  const [custSearch, setCustSearch] = useState('')
  const toast = useToast()
  const router = useRouter()

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.domain.toLowerCase().includes(search.toLowerCase())
  )

  async function handleLink(companyId: string, customerId: string | null) {
    setLinking(true)
    const res = await fetch('/api/link-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, customerId }),
    })
    setLinking(false)
    if (!res.ok) { toast.error('Eşleştirme başarısız.'); return }
    toast.success(customerId ? 'Firma müşteriyle eşleştirildi.' : 'Eşleştirme kaldırıldı.')
    setLinkModal(null)
    setSelectedCustomerId('')
    router.refresh()
  }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(custSearch.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Firmalar</h1>
          <p className="text-sm text-zinc-500 mt-1">{companies.length} firma · Email arşivinden çıkarıldı</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="px-5 py-3 border-b border-zinc-100">
          <input
            type="search"
            placeholder="Ara: firma adı veya domain…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-400 text-sm">
            {search ? 'Arama sonucu bulunamadı.' : 'Henüz firma yok. PST/OST arşivi yükleyin.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Firma</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Domain</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">CRM Müşteri</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/companies/${c.id}`} className="font-medium text-sm text-zinc-900 hover:text-blue-600 transition-colors">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-400 font-mono">{c.domain}</td>
                  <td className="px-5 py-3 text-sm text-zinc-500 text-right">{c.email_count}</td>
                  <td className="px-5 py-3 text-sm">
                    {c.customer ? (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-700">{c.customer.name}</span>
                        <button
                          onClick={() => handleLink(c.id, null)}
                          className="text-xs text-zinc-300 hover:text-red-500 transition-colors"
                          title="Eşleştirmeyi kaldır"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setLinkModal({ companyId: c.id, companyName: c.name })}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        + Müşteriyle Eşleştir
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {c.customer_id ? (
                      <Link
                        href={`/proposals/new?customer_id=${c.customer_id}`}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium border border-emerald-200 hover:bg-emerald-50 px-2 py-1 rounded-md transition-colors"
                      >
                        Teklif Oluştur
                      </Link>
                    ) : (
                      <Link href={`/companies/${c.id}`} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                        Detay
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Link modal */}
      {linkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setLinkModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div>
                <h2 className="font-semibold text-zinc-900 text-sm">Müşteriyle Eşleştir</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{linkModal.companyName}</p>
              </div>
              <button onClick={() => setLinkModal(null)} className="text-zinc-400 hover:text-zinc-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
                {filteredCustomers.length === 0 ? (
                  <div className="px-4 py-6 text-center text-zinc-400 text-xs">Müşteri bulunamadı.</div>
                ) : (
                  filteredCustomers.map((cu) => (
                    <button
                      key={cu.id}
                      onClick={() => setSelectedCustomerId(cu.id)}
                      className={`w-full text-left px-4 py-2.5 text-sm border-b border-zinc-50 transition-colors ${
                        selectedCustomerId === cu.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      {cu.name}
                    </button>
                  ))
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setLinkModal(null)} className="flex-1 px-3 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                  İptal
                </button>
                <button
                  disabled={!selectedCustomerId || linking}
                  onClick={() => handleLink(linkModal.companyId, selectedCustomerId)}
                  className="flex-1 px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
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
