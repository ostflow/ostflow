import 'server-only'

import type { User } from '@supabase/supabase-js'
import { createClient } from './server'

export type OrganizationContext = {
  user: User | null
  organizationId: string | null
}

export async function getCurrentOrganizationServer(): Promise<OrganizationContext> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, organizationId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  return {
    user,
    organizationId: (profile as { organization_id: string | null } | null)?.organization_id ?? null,
  }
}
