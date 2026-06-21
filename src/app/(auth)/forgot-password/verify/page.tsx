import { redirect } from 'next/navigation'
import { OtpForm } from './_components/otp-form'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { email } = await searchParams
  const emailStr = typeof email === 'string' ? email : ''
  if (!emailStr) redirect('/forgot-password')

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
      <div className="mb-8">
        <span className="text-blue-600 font-bold text-xl tracking-tight">Ostflow</span>
        <h1 className="text-2xl font-bold text-zinc-900 mt-2">Doğrulama Kodu</h1>
        <p className="text-zinc-500 text-sm mt-1">
          <span className="font-medium text-zinc-700">{emailStr}</span> adresine gönderilen 8 haneli kodu girin.
        </p>
      </div>
      <OtpForm email={emailStr} />
    </div>
  )
}
