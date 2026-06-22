import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single()

  const orgId = (profile as { organization_id: string | null; full_name: string | null } | null)?.organization_id
  const fullName = (profile as { organization_id: string | null; full_name: string | null } | null)?.full_name ?? ''

  let orgName = 'Organizasyon'
  if (orgId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()
    orgName = (org as { name: string } | null)?.name ?? orgName
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar orgName={orgName} userName={(fullName || user.email?.split('@')[0]) ?? 'Kullanıcı'} />
      <main className="pl-56 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
