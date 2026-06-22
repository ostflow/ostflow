'use client'

import { useState, useRef, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'

const CHUNK_SIZE = 5 * 1024 * 1024 // 5 MB (R2 minimum part size)

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; fileName: string; progress: number }
  | { phase: 'processing'; archiveId: string }
  | { phase: 'done'; archiveId: string }
  | { phase: 'error'; message: string }

export function UploadZone({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<UploadState>({ phase: 'idle' })
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const abortRef = useRef<{ uploadId: string; archiveId: string; r2Key: string } | null>(null)

  const upload = useCallback(async (file: File) => {
    if (!file.name.match(/\.(pst|ost)$/i)) {
      toast.error('Sadece .pst ve .ost dosyaları desteklenir.')
      return
    }

    setState({ phase: 'uploading', fileName: file.name, progress: 0 })

    // 1. Init
    let initData: { archiveId: string; uploadId: string; r2Key: string }
    try {
      const res = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Init başarısız')
      }
      initData = await res.json()
    } catch (e: unknown) {
      setState({ phase: 'error', message: e instanceof Error ? e.message : 'Başlatma hatası' })
      return
    }

    const { archiveId, uploadId, r2Key } = initData
    abortRef.current = { uploadId, archiveId, r2Key }

    // 2. Upload parts
    const totalParts = Math.ceil(file.size / CHUNK_SIZE)
    const completedParts: { PartNumber: number; ETag: string }[] = []

    try {
      for (let i = 0; i < totalParts; i++) {
        const partNumber = i + 1
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)

        // Get presigned URL
        const partRes = await fetch('/api/upload/part', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId, r2Key, partNumber }),
        })
        if (!partRes.ok) throw new Error('Presigned URL alınamadı')
        const { url } = await partRes.json() as { url: string }

        // PUT chunk to R2
        const putRes = await fetch(url, { method: 'PUT', body: chunk })
        if (!putRes.ok) throw new Error(`Part ${partNumber} yüklenemedi`)

        const etag = putRes.headers.get('ETag') ?? ''
        completedParts.push({ PartNumber: partNumber, ETag: etag })

        setState({ phase: 'uploading', fileName: file.name, progress: Math.round((partNumber / totalParts) * 100) })
      }
    } catch (e: unknown) {
      // Abort
      await fetch('/api/upload/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archiveId, uploadId, r2Key }),
      }).catch(() => {})
      setState({ phase: 'error', message: e instanceof Error ? e.message : 'Yükleme hatası' })
      return
    }

    // 3. Complete
    try {
      const res = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archiveId, uploadId, r2Key, parts: completedParts }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Tamamlama başarısız')
      }
    } catch (e: unknown) {
      setState({ phase: 'error', message: e instanceof Error ? e.message : 'Tamamlama hatası' })
      return
    }

    abortRef.current = null
    setState({ phase: 'processing', archiveId })
    toast.success('Dosya yüklendi! Parser işleniyor…')
    setTimeout(() => {
      setState({ phase: 'done', archiveId })
      onDone()
    }, 2000)
  }, [toast, onDone])

  function handleFiles(files: FileList | null) {
    if (!files?.length) return
    upload(files[0])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  if (state.phase !== 'idle') {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
        {state.phase === 'uploading' && (
          <>
            <div className="text-sm font-medium text-zinc-700 mb-1">{state.fileName}</div>
            <div className="w-full bg-zinc-100 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <div className="text-xs text-zinc-500">Yükleniyor… %{state.progress}</div>
          </>
        )}
        {state.phase === 'processing' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-zinc-600">Parser işliyor…</div>
          </div>
        )}
        {state.phase === 'done' && (
          <div className="text-emerald-600 font-medium text-sm">✓ Yükleme tamamlandı</div>
        )}
        {state.phase === 'error' && (
          <div className="space-y-3">
            <div className="text-red-600 text-sm font-medium">Hata: {state.message}</div>
            <button
              onClick={() => setState({ phase: 'idle' })}
              className="text-sm text-zinc-500 hover:text-zinc-700 underline"
            >
              Tekrar dene
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`bg-white rounded-xl border-2 border-dashed transition-colors p-12 text-center cursor-pointer ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 hover:border-zinc-300'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pst,.ost"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium text-zinc-700">PST veya OST dosyası sürükleyin</div>
          <div className="text-xs text-zinc-400 mt-1">ya da tıklayarak seçin</div>
        </div>
        <div className="text-xs text-zinc-400 bg-zinc-50 px-3 py-1.5 rounded-full">
          .pst · .ost · Maksimum boyut: 5 GB
        </div>
      </div>
    </div>
  )
}
