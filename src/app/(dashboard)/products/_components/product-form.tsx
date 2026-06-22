'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { createProduct, updateProduct, deleteProduct, type ProductFormData } from '../actions'
import type { Product } from '@/types'

const VAT_RATES = ['0', '1', '10', '20']
const UNITS = ['Adet', 'Kg', 'Lt', 'm²', 'm³', 'mt', 'Ton', 'Set', 'Paket', 'Kutu', 'Takım', 'Saat']

const EMPTY: ProductFormData = {
  sku: '',
  category: '',
  unit: 'Adet',
  vat_rate: '20',
  name_tr: '',
  name_en: '',
  description_tr: '',
  description_en: '',
  price_try: '0',
  price_usd: '0',
  price_eur: '0',
  price_gbp: '0',
}

function toForm(p: Product): ProductFormData {
  return {
    sku: p.sku ?? '',
    category: p.category ?? '',
    unit: p.unit ?? 'Adet',
    vat_rate: String(p.vat_rate),
    name_tr: p.name_tr,
    name_en: p.name_en ?? '',
    description_tr: p.description_tr ?? '',
    description_en: p.description_en ?? '',
    price_try: String(p.price_try),
    price_usd: String(p.price_usd),
    price_eur: String(p.price_eur),
    price_gbp: String(p.price_gbp),
  }
}

export function ProductForm({ editing, onClose }: { editing?: Product; onClose: () => void }) {
  const [form, setForm] = useState<ProductFormData>(editing ? toForm(editing) : EMPTY)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'tr' | 'en'>('tr')
  const toast = useToast()
  const confirm = useConfirm()

  function set(key: keyof ProductFormData, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = editing ? await updateProduct(editing.id, form) : await createProduct(form)
    setLoading(false)
    if ('error' in result) { toast.error(result.error); return }
    toast.success(editing ? 'Ürün güncellendi.' : 'Ürün eklendi.')
    onClose()
  }

  async function handleDelete() {
    if (!editing) return
    const ok = await confirm({ message: 'Bu ürünü silmek istediğinize emin misiniz?', variant: 'danger' })
    if (!ok) return
    setLoading(true)
    const result = await deleteProduct(editing.id)
    setLoading(false)
    if ('error' in result) { toast.error(result.error); return }
    toast.success('Ürün silindi.')
    onClose()
  }

  const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-zinc-400 transition-colors'
  const lbl = 'block text-xs font-medium text-zinc-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">{editing ? 'Ürün Düzenle' : 'Yeni Ürün'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Stok Kodu</label>
              <input className={inp} value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="SKU-001" />
            </div>
            <div>
              <label className={lbl}>Kategori</label>
              <input className={inp} value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Kategori" />
            </div>
            <div>
              <label className={lbl}>Birim</label>
              <select className={inp} value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>KDV Oranı (%)</label>
            <div className="flex gap-2 flex-wrap">
              {VAT_RATES.map((r) => (
                <label key={r} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="vat_rate"
                    value={r}
                    checked={form.vat_rate === r}
                    onChange={() => set('vat_rate', r)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-zinc-700">%{r}</span>
                </label>
              ))}
              <label className="flex items-center gap-1.5">
                <span className="text-sm text-zinc-500">Özel:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="w-16 px-2 py-1 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={VAT_RATES.includes(form.vat_rate) ? '' : form.vat_rate}
                  onChange={(e) => set('vat_rate', e.target.value)}
                  placeholder="—"
                />
              </label>
            </div>
          </div>

          {/* Language tabs */}
          <div>
            <div className="flex gap-1 mb-3">
              {(['tr', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setTab(l)}
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${tab === l ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
                >
                  {l === 'tr' ? '🇹🇷 Türkçe' : '🇬🇧 English'}
                </button>
              ))}
            </div>
            {tab === 'tr' ? (
              <div className="space-y-3">
                <div>
                  <label className={lbl}>Ürün Adı (TR) *</label>
                  <input className={inp} value={form.name_tr} onChange={(e) => set('name_tr', e.target.value)} placeholder="Ürün adı" required />
                </div>
                <div>
                  <label className={lbl}>Açıklama (TR)</label>
                  <textarea className={`${inp} resize-none`} rows={2} value={form.description_tr} onChange={(e) => set('description_tr', e.target.value)} placeholder="Ürün açıklaması" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className={lbl}>Product Name (EN)</label>
                  <input className={inp} value={form.name_en} onChange={(e) => set('name_en', e.target.value)} placeholder="Product name" />
                </div>
                <div>
                  <label className={lbl}>Description (EN)</label>
                  <textarea className={`${inp} resize-none`} rows={2} value={form.description_en} onChange={(e) => set('description_en', e.target.value)} placeholder="Product description" />
                </div>
              </div>
            )}
          </div>

          {/* Prices */}
          <div>
            <label className={`${lbl} mb-2`}>Fiyatlar</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'price_try' as const, label: 'TRY (₺)', symbol: '₺' },
                { key: 'price_usd' as const, label: 'USD ($)', symbol: '$' },
                { key: 'price_eur' as const, label: 'EUR (€)', symbol: '€' },
                { key: 'price_gbp' as const, label: 'GBP (£)', symbol: '£' },
              ].map(({ key, label: pl, symbol }) => (
                <div key={key} className="relative">
                  <label className={lbl}>{pl}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">{symbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`${inp} pl-7`}
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {editing && (
              <button type="button" onClick={handleDelete} disabled={loading} className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                Sil
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors">
                İptal
              </button>
              <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
                {loading ? 'Kaydediliyor…' : editing ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
