'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { requestPasswordReset } from '../actions'

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent hover:border-zinc-400 transition-colors'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await requestPasswordReset(email)
    router.push(`/forgot-password/verify?email=${encodeURIComponent(email)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
          E-posta
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={50}
          autoComplete="email"
          placeholder="ornek@firma.com"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
      >
        {loading ? 'Gönderiliyor…' : 'Kod Gönder'}
      </button>

      <p className="text-center">
        <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Giriş sayfasına dön
        </Link>
      </p>
    </form>
  )
}
