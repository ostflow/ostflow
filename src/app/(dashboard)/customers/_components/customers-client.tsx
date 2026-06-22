'use client'

import { useState } from 'react'
import type { Customer } from '@/types'
import { CustomerForm } from './customer-form'

const CURRENCY_FLAGS: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' }

export function CustomersClient({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Müşteriler</h1>
          <p className="text-sm text-zinc-500 mt-1">{customers.length} aktif müşteri</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Müşteri
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="px-5 py-3 border-b border-zinc-100">
          <input
            type="search"
            placeholder="Ara: isim, email, telefon…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-400 text-sm">
            {search ? 'Arama sonucu bulunamadı.' : 'Henüz müşteri eklenmemiş.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Müşteri</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">İletişim</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Vergi No</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Para Birimi</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-zinc-900 text-sm">{c.name}</div>
                    {c.country && <div className="text-xs text-zinc-400">{c.country}</div>}
                  </td>
                  <td className="px-5 py-3 text-sm">
                    {c.email && <div className="text-zinc-600">{c.email}</div>}
                    {c.phone && <div className="text-zinc-400 text-xs">{c.phone}</div>}
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-500">{c.tax_number ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full">
                      {CURRENCY_FLAGS[c.preferred_currency]} {c.preferred_currency}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setEditing(c)}
                      className="text-xs text-zinc-500 hover:text-blue-600 font-medium transition-colors"
                    >
                      Düzenle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(adding || editing) && (
        <CustomerForm
          editing={editing ?? undefined}
          onClose={() => { setAdding(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
