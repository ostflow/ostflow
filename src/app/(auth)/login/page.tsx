'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email veya şifre hatalı.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
      <div className="mb-8">
        <span className="text-blue-600 font-bold text-xl tracking-tight">Ostflow</span>
        <h1 className="text-2xl font-bold text-zinc-900 mt-2">Giriş Yap</h1>
        <p className="text-zinc-500 text-sm mt-1">Hesabınıza erişmek için bilgilerinizi girin.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="ornek@firma.com"
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent hover:border-zinc-400 transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              Şifre
            </label>
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
              Şifremi unuttum
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent hover:border-zinc-400 transition-colors"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Hesabın yok mu?{' '}
        <Link href="/signup" className="text-blue-600 font-medium hover:underline">
          Kayıt ol
        </Link>
      </p>
    </div>
  )
}
