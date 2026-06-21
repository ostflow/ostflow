import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'
import './globals.css'

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Ostflow',
  description: 'Teklif ve CRM yönetim platformu',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${font.variable} h-full`}>
      <body className="h-full antialiased font-sans">
        <ToastProvider><ConfirmProvider>{children}</ConfirmProvider></ToastProvider>
      </body>
    </html>
  )
}
