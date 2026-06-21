'use client'

import { useEffect, useRef, useState, KeyboardEvent, ClipboardEvent } from 'react'

type OtpInputProps = {
  length?: number
  onComplete: (code: string) => void
  error?: boolean
  disabled?: boolean
  resetKey?: number
}

export function OtpInput({
  length = 8,
  onComplete,
  error = false,
  disabled = false,
  resetKey = 0,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setDigits(Array(length).fill(''))
    inputs.current[0]?.focus()
  }, [resetKey, length])

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < length - 1) {
      inputs.current[index + 1]?.focus()
    }
    if (digit && index === length - 1) {
      const code = next.join('')
      if (code.length === length) onComplete(code)
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    const next = Array(length).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    inputs.current[Math.min(pasted.length, length - 1)]?.focus()
    if (pasted.length === length) onComplete(pasted)
  }

  const boxClass = (i: number) =>
    [
      'w-11 h-14 text-center text-xl font-semibold rounded-lg border bg-white text-zinc-900',
      'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors',
      error
        ? 'border-red-400'
        : digits[i]
          ? 'border-blue-400'
          : 'border-zinc-300 hover:border-zinc-400',
      disabled ? 'opacity-60 cursor-not-allowed' : '',
    ].join(' ')

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          autoFocus={i === 0}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={boxClass(i)}
        />
      ))}
    </div>
  )
}
