'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OtpInput } from '@/components/ui/otp-input'
import { verifyResetOtp } from '../actions'

export function OtpForm({ email }: { email: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const router = useRouter()

  async function handleComplete(code: string) {
    setLoading(true)
    setError(null)
    const result = await verifyResetOtp(email, code)
    if (result.error) {
      setError(result.error)
      setResetKey((k) => k + 1)
      setLoading(false)
    } else {
      router.push('/reset-password')
    }
  }

  return (
    <div className="space-y-6">
      <OtpInput
        onComplete={handleComplete}
        error={!!error}
        disabled={loading}
        resetKey={resetKey}
      />

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <p className="text-center text-sm text-zinc-500">
        Kod gelmedi mi?{' '}
        <a href="/forgot-password" className="text-blue-600 hover:underline">
          Tekrar gönder
        </a>
      </p>
    </div>
  )
}
