import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from './_components/reset-password-form'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
      <div className="mb-8">
        <span className="text-blue-600 font-bold text-xl tracking-tight">Ostflow</span>
        <h1 className="text-2xl font-bold text-zinc-900 mt-2">Yeni Şifre Belirle</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Hesabınız için yeni bir şifre oluşturun.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  )
}
