'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import type { OrgSettings } from '../page'

type Props = {
  org: OrgSettings
  billingMessage: string | null
  userEmail: string
}

const TIER_LABELS: Record<string, string> = {
  free: 'Ücretsiz',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

const STATUS_BADGES: Record<string, string> = {
  free: 'bg-zinc-100 text-zinc-600',
  active: 'bg-emerald-100 text-emerald-700',
  past_due: 'bg-yellow-100 text-yellow-700',
  canceled: 'bg-red-100 text-red-700',
}

export function SettingsClient({ org, billingMessage, userEmail }: Props) {
  const [form, setForm] = useState({
    name: org.name ?? '',
    tax_number: org.tax_number ?? '',
    address: org.address ?? '',
    phone: org.phone ?? '',
    fax: org.fax ?? '',
    email: org.email ?? '',
    web: org.web ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [tab, setTab] = useState<'general' | 'billing'>('general')
  const toast = useToast()

  function set(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('organizations')
      .update({
        name: form.name.trim(),
        tax_number: form.tax_number.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        fax: form.fax.trim() || null,
        email: form.email.trim() || null,
        web: form.web.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', org.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Ayarlar kaydedildi.')
  }

  async function handleUpgrade(tier: 'pro' | 'enterprise') {
    setUpgrading(true)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    })
    const json = await res.json()
    setUpgrading(false)
    if (!res.ok || !json.url) {
      toast.error(json.error ?? 'Ödeme sayfası açılamadı.')
      return
    }
    window.location.href = json.url
  }

  const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-zinc-400 transition-colors'
  const lbl = 'block text-xs font-medium text-zinc-600 mb-1'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Ayarlar</h1>
      </div>

      {billingMessage === 'success' && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">
          Aboneliğiniz başarıyla aktive edildi. Teşekkürler!
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-100 p-1 rounded-lg w-fit">
        {(['general', 'billing'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t === 'general' ? 'Genel' : 'Abonelik'}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4 max-w-xl">
          <div>
            <label className={lbl}>Firma Adı *</label>
            <input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Vergi No</label>
              <input className={inp} value={form.tax_number} onChange={(e) => set('tax_number', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input type="email" className={inp} value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Telefon</label>
              <input className={inp} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Faks</label>
              <input className={inp} value={form.fax} onChange={(e) => set('fax', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={lbl}>Web Sitesi</label>
            <input className={inp} value={form.web} onChange={(e) => set('web', e.target.value)} placeholder="https://firmaniz.com" />
          </div>
          <div>
            <label className={lbl}>Adres</label>
            <textarea className={`${inp} resize-none`} rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      )}

      {tab === 'billing' && (
        <div className="max-w-2xl space-y-4">
          {/* Current plan */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-zinc-900">Mevcut Plan</h2>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGES[org.subscription_status]}`}>
                {TIER_LABELS[org.subscription_tier]}
                {org.subscription_status === 'past_due' && ' · Ödeme Gecikti'}
                {org.subscription_status === 'canceled' && ' · İptal Edildi'}
              </span>
            </div>
            <div className="text-sm text-zinc-500">Hesap: {userEmail}</div>
            {org.subscription_ends_at && (
              <div className="text-sm text-zinc-400 mt-1">
                Geçerlilik: {new Date(org.subscription_ends_at).toLocaleDateString('tr-TR')}
              </div>
            )}
          </div>

          {/* Plans */}
          {org.subscription_tier === 'free' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  tier: 'pro' as const,
                  name: 'Pro',
                  price: '₺490/ay',
                  features: ['Sınırsız teklif', '5 kullanıcı', '10 GB arşiv', 'PDF + email gönderim', 'Öncelikli destek'],
                },
                {
                  tier: 'enterprise' as const,
                  name: 'Enterprise',
                  price: '₺1.490/ay',
                  features: ['Sınırsız her şey', 'Sınırsız kullanıcı', '100 GB arşiv', 'Özel entegrasyonlar', 'SLA desteği'],
                },
              ].map((plan) => (
                <div key={plan.tier} className="bg-white rounded-xl border-2 border-zinc-200 hover:border-blue-300 p-6 transition-colors">
                  <div className="font-bold text-zinc-900 text-lg mb-1">{plan.name}</div>
                  <div className="text-blue-600 font-semibold text-xl mb-4">{plan.price}</div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-zinc-600">
                        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade(plan.tier)}
                    disabled={upgrading}
                    className="w-full py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {upgrading ? 'Yönlendiriliyor…' : `${plan.name} Planına Geç`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
