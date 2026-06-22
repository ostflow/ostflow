'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EmailListItem } from '../page'

type Props = {
  emails: EmailListItem[]
  companies: { id: string; name: string; domain: string }[]
  selectedCompanyId?: string
}

export function EmailsClient({ emails, companies, selectedCompanyId }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<EmailListItem | null>(null)
  const [body, setBody] = useState<string | null>(null)
  const [bodyLoading, setBodyLoading] = useState(false)
  const router = useRouter()

  const filtered = emails.filter((e) =>
    e.subject?.toLowerCase().includes(search.toLowerCase()) ||
    e.from_address.toLowerCase().includes(search.toLowerCase())
  )

  async function selectEmail(email: EmailListItem) {
    setSelected(email)
    setBody(null)
    setBodyLoading(true)
    try {
      const res = await fetch(`/api/emails/${email.id}/body`)
      const j = await res.json()
      setBody(j.body ?? '')
    } catch {
      setBody('Email içeriği yüklenemedi.')
    } finally {
      setBodyLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Emailler</h1>
          <p className="text-sm text-zinc-500 mt-1">{emails.length} email</p>
        </div>
      </div>

      <div className="flex gap-5 h-[calc(100vh-180px)]">
        {/* Left: filters + list */}
        <div className="w-80 flex flex-col gap-3">
          {/* Company filter */}
          {companies.length > 0 && (
            <select
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedCompanyId ?? ''}
              onChange={(e) => {
                const val = e.target.value
                router.push(val ? `/emails?company_id=${val}` : '/emails')
              }}
            >
              <option value="">Tüm firmalar</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.domain})</option>
              ))}
            </select>
          )}

          <input
            type="search"
            placeholder="Konu veya gönderen ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex-1 bg-white rounded-xl border border-zinc-200 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-400 text-sm">Email bulunamadı.</div>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.id}
                  onClick={() => selectEmail(e)}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-50 hover:bg-zinc-50 transition-colors ${
                    selected?.id === e.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="text-xs font-medium text-zinc-800 truncate">{e.subject || '(Konu yok)'}</div>
                  <div className="text-xs text-zinc-400 truncate mt-0.5">{e.from_address}</div>
                  <div className="flex items-center justify-between mt-1">
                    {e.company && (
                      <span className="text-xs text-blue-500">{e.company.domain}</span>
                    )}
                    <span className="text-xs text-zinc-300 ml-auto">
                      {e.sent_at ? new Date(e.sent_at).toLocaleDateString('tr-TR') : '—'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div className="flex-1 bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
              Görüntülemek için bir email seçin.
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-zinc-100">
                <h2 className="font-semibold text-zinc-900 mb-2">{selected.subject || '(Konu yok)'}</h2>
                <div className="space-y-1 text-xs text-zinc-500">
                  <div><span className="font-medium w-16 inline-block">Gönderen:</span> {selected.from_address}</div>
                  {selected.to_addresses?.length > 0 && (
                    <div><span className="font-medium w-16 inline-block">Alıcı:</span> {selected.to_addresses.slice(0, 3).join(', ')}{selected.to_addresses.length > 3 ? ` +${selected.to_addresses.length - 3} daha` : ''}</div>
                  )}
                  <div>
                    <span className="font-medium w-16 inline-block">Tarih:</span>
                    {selected.sent_at ? new Date(selected.sent_at).toLocaleString('tr-TR') : '—'}
                  </div>
                  {selected.company && (
                    <div><span className="font-medium w-16 inline-block">Firma:</span> {selected.company.name}</div>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {bodyLoading ? (
                  <div className="text-zinc-400 text-sm">Yükleniyor…</div>
                ) : (
                  <pre className="text-xs text-zinc-600 whitespace-pre-wrap font-sans leading-relaxed">
                    {body}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
