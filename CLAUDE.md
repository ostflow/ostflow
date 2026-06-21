# Ostflow

Tekliflix (teklif yönetimi) + Inboxyl (e-posta CRM) birleştirilerek oluşturulan SaaS platformu.

## Mimari

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4
- **Veritabanı & Auth**: Supabase (PostgreSQL + Auth)
- **Email**: Resend (teklif gönderimleri)
- **PDF**: Puppeteer Core + @sparticuz/chromium (serverless PDF oluşturma)
- **Dosya Depolama**: Cloudflare R2 (PST/OST arşivleri, email ekleri)
- **Faturalama**: Stripe (abonelik yönetimi)
- **Döviz**: Frankfurter API (günlük otomatik güncelleme, Vercel Cron)
- **Deployment**: Vercel

## Tenant Modeli

**Org bazlı multi-tenant.** Her kullanıcı bir `organization`'a aittir. Tüm veriler `organization_id` ile izole edilir (RLS). Bir org'a birden fazla kullanıcı eklenebilir (invite sistemi).

- `profiles.role`: `'owner'` | `'admin'` | `'staff'`
- Yeni kayıt → otomatik org oluşturma (DB trigger)
- Davet linki ile ekip üyesi ekleme

## Klasör Yapısı

```
src/
├── app/
│   ├── (auth)/              # Auth sayfaları (login, signup/OTP, reset-password)
│   ├── (dashboard)/         # Korumalı dashboard sayfaları
│   │   ├── dashboard/       # Ana dashboard (teklif stats + arşiv özeti)
│   │   ├── customers/       # Müşteri yönetimi
│   │   ├── products/        # Ürün kataloğu
│   │   ├── proposals/       # Teklif hazırlama
│   │   ├── companies/       # Email arşiv firmaları
│   │   ├── emails/          # Arşiv email görüntüleyici
│   │   ├── upload/          # PST/OST arşiv yükleme
│   │   └── settings/        # Org ayarları, mail, döviz, ekip, billing
│   ├── api/
│   │   ├── upload/          # R2 multipart upload (init/part/complete/abort)
│   │   ├── stripe/          # Stripe checkout & webhook
│   │   ├── cron/            # Döviz kuru güncelleme (günlük 06:00 UTC)
│   │   ├── inbound-email/   # Gelen email webhook
│   │   └── merge-companies/ # Firma birleştirme
│   └── page.tsx             # Landing page
├── lib/
│   ├── supabase/            # client.ts, server.ts, middleware.ts, admin.ts, get-organization-*.ts
│   ├── stripe/              # Stripe instance
│   ├── r2.ts                # Cloudflare R2 S3 client
│   ├── limits.ts            # Alan uzunluk sabitleri
│   ├── form-helpers.ts      # blockEnter yardımcısı
│   └── ...                  # generate-pdf, exchange-rates, vat-logic, proposal-i18n, ...
├── components/
│   └── ui/                  # otp-input, toast, confirm-dialog, ...
└── types/
parser-service/              # Python FastAPI PST/OST parser (değişmeden inboxyl'den)
supabase/
└── migrations/              # Birleşik DB migration dosyaları
```

## Veritabanı Tabloları

### Tekliflix kökenli (org-scoped)
- `organizations` — tenant ana tablosu
- `organization_invites` — ekip davet linkleri
- `profiles` — kullanıcı profilleri (organization_id, role)
- `customers` — müşteri kaydı
- `products` — ürün kataloğu (çok dilli, çok para birimli)
- `proposals` + `proposal_items` — teklifler ve satır kalemleri
- `proposal_email_logs` — email gönderim geçmişi
- `proposal_templates` — şablon metinler
- `exchange_rates` + `exchange_rate_overrides` — döviz kurları

### Inboxyl kökenli (org-scoped olarak adapt edilmiş)
- `archives` — PST/OST dosyaları (R2'de saklanır)
- `companies` — email arşivinden çıkarılan firmalar; `customer_id` FK ile customers'a bağlanabilir
- `emails` — parse edilmiş email mesajları
- `activities` — el ile girilen müşteri aktiviteleri (ziyaret, toplantı, vb.)
- `attachments` — email ekleri (R2'de saklanır)

### Kritik Bağlantı: `companies.customer_id`
Email arşivindeki bir firmayı CRM müşterisiyle eşleştirmek için nullable FK.
"Firma → Teklif Oluştur" özelliğinin temelini oluşturur.

## Auth Akışı

1. `/signup` — email + şifre + firma adı + ad soyad
2. OTP doğrulama (`/signup/verify`) — 8 haneli kod, Supabase email
3. DB trigger: `organizations` + `profiles` (role: owner) otomatik oluşturulur
4. `/onboarding` — ilk kurulum (org bilgileri)
5. `/login` — email + şifre → `/dashboard`
6. `/forgot-password` → OTP → `/reset-password`
7. Davet linki: `/signup?invite=<token>` → mevcut org'a katıl (role: staff)

## Ortam Değişkenleri

`.env.example` dosyasına bakın.

## Yeni Özellik: Firma → Teklif Akışı

`/dashboard/companies/[id]` sayfasında "Teklif Oluştur" butonu:
- `companies.customer_id` dolu → doğrudan `/dashboard/proposals/new?customer_id=...`
- `customer_id` boş → modal: mevcut müşteriyle eşleştir veya yeni oluştur
- Eşleştirme `/api/link-company` endpoint'i ile kaydedilir
