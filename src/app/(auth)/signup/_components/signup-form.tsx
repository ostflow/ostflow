'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LIMITS } from '@/lib/limits'
import { blockEnter } from '@/lib/form-helpers'
import { completeInviteSignup } from '../actions'

type InviteData = {
  token: string
  orgName: string
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent hover:border-zinc-400 transition-colors disabled:bg-zinc-50 disabled:text-zinc-500 disabled:cursor-not-allowed'

export function SignupForm({ inviteData }: { inviteData?: InviteData }) {
  const [form, setForm] = useState({
    organizationName: inviteData?.orgName ?? '',
    fullName: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [emailExists, setEmailExists] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEmailExists(false)
    setLoading(true)

    const supabase = createClient()
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          organization_name: form.organizationName,
          full_name: form.fullName,
          invite_token: inviteData?.token,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (signUpData.user?.identities?.length === 0) {
      setEmailExists(true)
      setLoading(false)
      return
    }

    if (inviteData) {
      const result = await completeInviteSignup(inviteData.token)
      if ('error' in result) {
        setError(result.error)
        setLoading(false)
        return
      }
    }

    window.location.href = `/signup/verify?email=${encodeURIComponent(form.email)}`
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
      <div className="mb-8">
        <span className="text-blue-600 font-bold text-xl tracking-tight">Ostflow</span>
        <h1 className="text-2xl font-bold text-zinc-900 mt-2">Hesap Oluştur</h1>
        {inviteData ? (
          <p className="text-zinc-500 text-sm mt-1">
            <span className="font-medium text-zinc-700">{inviteData.orgName}</span> ekibine katılmak üzeresiniz.
          </p>
        ) : (
          <p className="text-zinc-500 text-sm mt-1">Ücretsiz başlayın, hemen kullanmaya başlayın.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="organizationName" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Firma Adı
          </label>
          <input
            id="organizationName"
            name="organizationName"
            type="text"
            value={form.organizationName}
            onChange={handleChange}
            onKeyDown={blockEnter}
            required
            disabled={!!inviteData}
            maxLength={LIMITS.organization.name}
            placeholder="Firma A.Ş."
            className={inputClass}
          />
          {inviteData && (
            <p className="mt-1 text-xs text-zinc-400">Davet ile kayıt olurken firma adı otomatik gelir.</p>
          )}
        </div>

        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Ad Soyad
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={form.fullName}
            onChange={handleChange}
            onKeyDown={blockEnter}
            required
            maxLength={LIMITS.profile.full_name}
            placeholder="Ali Veli"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            onKeyDown={blockEnter}
            required
            autoComplete="email"
            maxLength={LIMITS.organization.email}
            placeholder="ornek@firma.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Şifre
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={6}
            maxLength={100}
            className={inputClass}
          />
        </div>

        {emailExists && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 space-y-2">
            <p>Bu e-posta adresi zaten kayıtlı. Mevcut hesabınızla giriş yapabilirsiniz.</p>
            <Link href="/login" className="inline-block font-medium underline underline-offset-2">
              Giriş Sayfasına Git →
            </Link>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 mt-1"
        >
          {loading ? 'Hesap oluşturuluyor…' : inviteData ? 'Ekibe Katıl' : 'Kayıt Ol'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Zaten hesabın var mı?{' '}
        <Link href="/login" className="text-blue-600 font-medium hover:underline">
          Giriş yap
        </Link>
      </p>
    </div>
  )
}
