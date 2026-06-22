'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadZone } from './upload-zone'
import type { Archive } from '../page'

const STATUS_LABELS: Record<Archive['status'], string> = {
  pending: 'Bekliyor',
  processing: 'İşleniyor',
  done: 'Tamamlandı',
  error: 'Hata',
}

const STATUS_COLORS: Record<Archive['status'], string> = {
  pending: 'bg-zinc-100 text-zinc-600',
  processing: 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function UploadPageClient({ archives }: { archives: Archive[] }) {
  const router = useRouter()
  const [list, setList] = useState(archives)

  function handleDone() {
    // Refresh to get updated archives list
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Arşiv Yükle</h1>
        <p className="text-sm text-zinc-500 mt-1">
          PST veya OST email arşivini yükleyin. Parser otomatik olarak email ve firma verilerini çıkarır.
        </p>
      </div>

      <div className="mb-8">
        <UploadZone onDone={handleDone} />
      </div>

      {list.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200">
          <div className="px-5 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-700">Yüklenen Arşivler</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Dosya</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Boyut</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Yükleme Tarihi</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Durum</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} className="border-b border-zinc-50">
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-zinc-800">{a.file_name}</div>
                    {a.error_message && (
                      <div className="text-xs text-red-500 mt-0.5">{a.error_message}</div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-500">{formatBytes(a.size_bytes)}</td>
                  <td className="px-5 py-3 text-sm text-zinc-500">
                    {new Date(a.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                      {a.status === 'processing' && (
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse" />
                      )}
                      {STATUS_LABELS[a.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
