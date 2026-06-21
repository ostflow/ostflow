import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { SignupForm } from './_components/signup-form'

type InviteRow = {
  organization_id: string
  expires_at: string
  used_at: string | null
}

type OrgRow = {
  name: string | null
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams

  if (invite) {
    const admin = createAdminClient()

    const { data: inviteRow } = await admin
      .from('organization_invites')
      .select('organization_id, expires_at, used_at')
      .eq('token', invite)
      .single()

    const inv = inviteRow as InviteRow | null
    const isExpired = !inv || !!inv.used_at || new Date(inv.expires_at) <= new Date()

    if (isExpired) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-zinc-900 mb-1">Geçersiz Davet Linki</h1>
          <p className="text-sm text-zinc-500 mb-6">
            Bu davet linki geçersiz veya süresi dolmuş. Yeni bir davet linki için yöneticinizle iletişime geçin.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Giriş Yap
          </Link>
        </div>
      )
    }

    const { data: orgRow } = await admin
      .from('organizations')
      .select('name')
      .eq('id', inv.organization_id)
      .single()

    const orgName = (orgRow as OrgRow | null)?.name ?? ''

    return (
      <SignupForm
        inviteData={{ token: invite, orgName }}
      />
    )
  }

  return <SignupForm />
}
