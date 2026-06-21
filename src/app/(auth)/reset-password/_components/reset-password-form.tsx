'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent hover:border-zinc-400 transition-colors'

export function ResetPasswordForm() {
  const router = useRouter()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.')
      return
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('Şifre güncellenemedi. Lütfen tekrar deneyin.')
      setLoading(false)
      return
    }

    toast.success('Şifreniz güncellendi.')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Yeni Şifre
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          maxLength={100}
          autoComplete="new-password"
          placeholder="En az 6 karakter"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Şifre Tekrar
        </label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          maxLength={100}
          autoComplete="new-password"
          placeholder="Şifreyi tekrar girin"
          className={inputClass}
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
        {loading ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
      </button>
    </form>
  )
}
