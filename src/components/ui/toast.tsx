'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  type: ToastType
  message: string
  exiting: boolean
}

type ToastAPI = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastAPI | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 200)
  }, [])

  const add = useCallback(
    (type: ToastType, message: string) => {
      const id = Math.random().toString(36).slice(2, 10)
      setToasts((prev) => [...prev, { id, type, message, exiting: false }])
      setTimeout(() => dismiss(id), 3000)
    },
    [dismiss],
  )

  const api = useMemo<ToastAPI>(
    () => ({
      success: (m) => add('success', m),
      error: (m) => add('error', m),
      info: (m) => add('info', m),
    }),
    [add],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastPortal toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastPortal({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || toasts.length === 0) return null
  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  )
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: string) => void
}) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const cfg = {
    success: {
      bg: 'bg-emerald-600',
      icon: (
        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-red-600',
      icon: (
        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-blue-600',
      icon: (
        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      ),
    },
  }[toast.type]

  const visible = entered && !toast.exiting

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-[380px] ${cfg.bg} text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg transition-all duration-200 ease-out ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}
    >
      {cfg.icon}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Kapat"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity -mr-0.5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function useToast(): ToastAPI {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used within ToastProvider')
  return api
}
