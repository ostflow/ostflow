'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { createCustomer, updateCustomer, deleteCustomer, type CustomerFormData } from '../actions'
import type { Customer } from '@/types'

const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP']
const LANGUAGES = [{ value: 'tr', label: 'Türkçe' }, { value: 'en', label: 'English' }]
const COUNTRIES = ['Türkiye', 'Almanya', 'Fransa', 'İngiltere', 'ABD', 'İtalya', 'İspanya', 'Hollanda', 'Diğer']

const EMPTY: CustomerFormData = {
  name: '',
  email: '',
  phone: '',
  tax_number: '',
  address: '',
  country: '',
  preferred_currency: 'TRY',
  preferred_language: 'tr',
}

function toForm(c: Customer): CustomerFormData {
  return {
    name: c.name,
    email: c.email ?? '',
    phone: c.phone ?? '',
    tax_number: c.tax_number ?? '',
    address: c.address ?? '',
    country: c.country ?? '',
    preferred_currency: c.preferred_currency,
    preferred_language: c.preferred_language,
  }
}

type Props = {
  editing?: Customer
  onClose: () => void
}

export function CustomerForm({ editing, onClose }: Props) {
  const [form, setForm] = useState<CustomerFormData>(editing ? toForm(editing) : EMPTY)
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const confirm = useConfirm()

  function set(key: keyof CustomerFormData, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = editing
      ? await updateCustomer(editing.id, form)
      : await createCustomer(form)
    setLoading(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }
    toast.success(editing ? 'Müşteri güncellendi.' : 'Müşteri eklendi.')
    onClose()
  }

  async function handleDelete() {
    if (!editing) return
    const ok = await confirm({ message: 'Bu müşteriyi silmek istediğinize emin misiniz?', variant: 'danger' })
    if (!ok) return
    setLoading(true)
    const result = await deleteCustomer(editing.id)
    setLoading(false)
    if ('error' in result) { toast.error(result.error); return }
    toast.success('Müşteri silindi.')
    onClose()
  }

  const input = 'w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-zinc-400 transition-colors'
  const label = 'block text-xs font-medium text-zinc-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">{editing ? 'Müşteri Düzenle' : 'Yeni Müşteri'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={label}>Müşteri Adı *</label>
            <input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Firma veya şahıs adı" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Email</label>
              <input className={input} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="ornek@firma.com" />
            </div>
            <div>
              <label className={label}>Telefon</label>
              <input className={input} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+90 555 000 00 00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Vergi No</label>
              <input className={input} value={form.tax_number} onChange={(e) => set('tax_number', e.target.value)} placeholder="1234567890" />
            </div>
            <div>
              <label className={label}>Ülke</label>
              <select className={input} value={form.country} onChange={(e) => set('country', e.target.value)}>
                <option value="">Seçiniz</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Adres</label>
            <textarea
              className={`${input} resize-none`}
              rows={2}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Adres"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Tercih Edilen Para Birimi</label>
              <select className={input} value={form.preferred_currency} onChange={(e) => set('preferred_currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Teklif Dili</label>
              <select className={input} value={form.preferred_language} onChange={(e) => set('preferred_language', e.target.value)}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {editing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Sil
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-zinc-600 border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Kaydediliyor…' : editing ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
