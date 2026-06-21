'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type DialogOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string | null
  variant?: 'default' | 'danger'
}

type DialogState = DialogOptions & { resolve: (value: boolean) => void }

type ConfirmFn = (opts: DialogOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const confirm = useCallback(
    (opts: DialogOptions): Promise<boolean> =>
      new Promise((resolve) => setDialog({ ...opts, resolve })),
    [],
  )

  useEffect(() => {
    if (!dialog) return
    const d = dialog
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        d.resolve(false)
        setDialog(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog])

  function close(result: boolean) {
    dialog?.resolve(result)
    setDialog(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => close(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            {dialog.title && (
              <h2 className="text-base font-semibold text-zinc-900 mb-2">{dialog.title}</h2>
            )}
            <p className="text-sm text-zinc-600 whitespace-pre-line">{dialog.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              {dialog.cancelText !== null && (
                <button
                  onClick={() => close(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  {dialog.cancelText ?? 'İptal'}
                </button>
              )}
              <button
                autoFocus
                onClick={() => close(true)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  dialog.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {dialog.confirmText ?? 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext)
  if (!fn) throw new Error('useConfirm must be used within ConfirmProvider')
  return fn
}
