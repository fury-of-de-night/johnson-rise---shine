# Johnson Rise & Shine — Landscaping Services (Guyana)

Production website for landscaping business in Guyana. Brand colors: Forest green (#2d5016), Light green (#8fbc8f), Gold (#ffd700).

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (NO live token committed)
cp .env.example .env.local
# Fill .env.local with your Supabase keys (injected at runtime)

# 3. Run migrations (Supabase project: szqtawhbmbldbievrtadh)
# Import SQL files from migrations/ into Supabase SQL editor, or use CLI:
# supabase db reset --db-url="postgresql://..."

# 4. Start development server
npm run dev
```

## Project Structure

```
Business/
├── migrations/           # Supabase SQL migrations (RLS policies included)
├── src/lib/
│   ├── security.ts       # CSRF, XSS sanitize, rate limit
│   ├── supabase.ts       # Client setup (env-based)
│   ├── whatsapp.ts       # wa.me link generator
│   └── form-autosave.ts  # localStorage form persistence
├── src/pages/
│   ├── index.tsx         # Homepage
│   ├── services.tsx      # Services listing
│   ├── request.tsx       # Service request form (2 submit buttons)
│   ├── admin/index.tsx   # Admin dashboard
│   ├── privacy.tsx       # Privacy Policy
│   └── terms.tsx         # Terms of Service
├── src/components/
│   ├── Header.tsx, Footer.tsx
│   ├── ServiceCard.tsx
│   ├── RequestForm.tsx
│   ├── WhatsAppFloatButton.tsx
│   ├── CookieBanner.tsx
│   └── HeroSection.tsx
├── supabase/
│   └── functions/email-notify/  # Email notification edge function
├── .env.example           # Environment variables (NO secrets)
├── README.md              # This file
├── SECURITY_AUDIT.md      # Security checklist & verification
└── POSTMAN_COLLECTION.json # API test collection
```

## Supabase Setup

1. Project reference: `szqtawhbmbldbievrtadh` (URL: `https://szqtawhbmbldbievrtadh.supabase.co`)
2. Create `.env.local` from `.env.example`:
   - `SUPABASE_URL=https://szqtawhbmbldbievrtadh.supabase.co`
   - `SUPABASE_ANON_KEY=<anon_key>`
   - `SUPABASE_SERVICE_ROLE_KEY=<service_role_key>`
   - `ADMIN_EMAIL=<your_admin_email>`
3. Apply migrations in order (001 → 004) via Supabase dashboard SQL editor or CLI.

## WhatsApp Integration

Business number: `+592 699 2175`. Click-to-chat links:
- Quick chat: `https://wa.me/5926992175`
- Pre-filled service request: `https://wa.me/5926992175?text=<encoded_message>`

The "Submit & Continue on WhatsApp" button saves the request to the database and opens WhatsApp with a pre-filled professional message including customer name, phone, address, services, preferred date, and property details.

## Security Measures Implemented

- Row Level Security (RLS) enabled on ALL tables (`service_requests`, `audit_logs`, `services_ref`, `admin_users`)
- Public users: INSERT only on `service_requests`
- Admin users: SELECT/UPDATE/DELETE on `service_requests`; SELECT on `audit_logs`
- Client-side and server-side input sanitization (XSS escape: `< > " ' &`)
- CSRF token generation and validation middleware
- Rate limiting: max 5 submissions/hour per IP
- Parameterized queries (Supabase `.from().insert()` — no raw SQL concatenation)
- Environment variables for all secrets (token injected at runtime only — NOT persisted to disk)
- HTTPS enforcement (production deployment)
- Secure cookie flags: HttpOnly, Secure, SameSite=Strict
- Form honeypot field for spam protection
- Audit logging for admin actions

## Deployment

Deploy to Vercel or Netlify:
```bash
npm run build
npm run start
```
Ensure `.env.local` is configured in deployment settings, not committed to version control.

## WhatsApp Setup

No official WhatsApp Business API required. Uses WhatsApp Click-to-Chat (`wa.me`) links with URL-encoded pre-filled messages. Works on desktop (WhatsApp Web) and mobile (WhatsApp app) automatically.

## Compliance

- Privacy Policy (`/privacy`): GDPR-style, data retention (2 years), right to deletion, secure storage notice
- Terms of Service (`/terms`): Service agreement
- Cookie Consent (`CookieBanner` component): Granular controls with localStorage persistence
- TCPA-style WhatsApp consent recorded (`whatsapp_opt_in` boolean in DB)
- Guyana Electronic Transactions Act compliance (secure data handling)

## Admin Access

- Login: `/admin` via Supabase Auth
- Role-based access: admin role verified against `admin_users` table
- Dashboard features: filter by status, mark completed, export CSV, WhatsApp quick-reply buttons per request, audit log visibility

## Postman Collection

See `POSTMAN_COLLECTION.json` for API endpoints:
- POST `/api/requests`
- GET `/api/admin/requests`
- PATCH `/api/admin/requests/[id]`
- GET `/api/csrf`
- GET `/api/export/csv`
