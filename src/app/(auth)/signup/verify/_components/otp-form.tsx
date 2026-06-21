'use client'

import { useState } from 'react'
import { OtpInput } from '@/components/ui/otp-input'
import { useToast } from '@/components/ui/toast'
import { verifySignupOtp, resendSignupCode } from '../actions'

export function SignupOtpForm({ email }: { email: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [resending, setResending] = useState(false)
  const toast = useToast()

  async function handleComplete(code: string) {
    setLoading(true)
    setError(null)
    const result = await verifySignupOtp(email, code)
    if (result.error) {
      setError(result.error)
      setResetKey((k) => k + 1)
      setLoading(false)
    } else {
      toast.success('E-posta adresiniz doğrulandı, hoş geldiniz!')
      window.location.href = '/onboarding'
    }
  }

  async function handleResend() {
    setResending(true)
    const result = await resendSignupCode(email)
    setResending(false)
    if (result.error) {
      toast.error('Kod gönderilemedi, lütfen tekrar deneyin.')
    } else {
      toast.info('Doğrulama kodu tekrar gönderildi.')
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
        <button
          type="button"
          disabled={resending}
          onClick={handleResend}
          className="text-blue-600 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {resending ? 'Gönderiliyor…' : 'Tekrar gönder'}
        </button>
      </p>
    </div>
  )
}
