import { ForgotPasswordForm } from './_components/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
      <div className="mb-8">
        <span className="text-blue-600 font-bold text-xl tracking-tight">Ostflow</span>
        <h1 className="text-2xl font-bold text-zinc-900 mt-2">Şifremi Sıfırla</h1>
        <p className="text-zinc-500 text-sm mt-1">
          E-posta adresinizi girin, size 8 haneli sıfırlama kodu göndereceğiz.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  )
}
