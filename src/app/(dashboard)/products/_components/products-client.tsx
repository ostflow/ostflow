'use client'

import { useState } from 'react'
import type { Product } from '@/types'
import { ProductForm } from './product-form'
import { CURRENCY_SYMBOLS } from '@/lib/vat-logic'

export function ProductsClient({ products }: { products: Product[] }) {
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const filtered = products.filter((p) =>
    p.name_tr.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Ürünler</h1>
          <p className="text-sm text-zinc-500 mt-1">{products.length} aktif ürün</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Ürün
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="px-5 py-3 border-b border-zinc-100">
          <input
            type="search"
            placeholder="Ara: ad, stok kodu, kategori…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-400 text-sm">
            {search ? 'Arama sonucu bulunamadı.' : 'Henüz ürün eklenmemiş.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Ürün</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">SKU / Kategori</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">KDV</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">TRY</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">USD</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">EUR</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-zinc-900 text-sm">{p.name_tr}</div>
                    {p.name_en && <div className="text-xs text-zinc-400">{p.name_en}</div>}
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-500">
                    {p.sku && <div className="font-mono text-xs">{p.sku}</div>}
                    {p.category && <div className="text-xs text-zinc-400">{p.category}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">%{p.vat_rate}</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-700 text-right font-mono">
                    {CURRENCY_SYMBOLS.TRY}{Number(p.price_try).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-700 text-right font-mono">
                    {CURRENCY_SYMBOLS.USD}{Number(p.price_usd).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-700 text-right font-mono">
                    {CURRENCY_SYMBOLS.EUR}{Number(p.price_eur).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setEditing(p)} className="text-xs text-zinc-500 hover:text-blue-600 font-medium transition-colors">
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
        <ProductForm
          editing={editing ?? undefined}
          onClose={() => { setAdding(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
