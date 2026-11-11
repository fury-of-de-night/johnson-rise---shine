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
   - `NEXT_PUBLIC_SUPABASE_URL=https://szqtawhbmbldbievrtadh.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_or_publishable_key>`
   - `SUPABASE_URL=https://szqtawhbmbldbievrtadh.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=<service_role_key>`
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<v3_site_key>`
   - `RECAPTCHA_SECRET_KEY=<v3_secret_key>`
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

## Testing branch configuration and checks

Use Node.js 20 or newer and `npm ci`. Configure these variables separately for
Vercel Preview and Production; never copy credential values into source files:

- `NEXT_PUBLIC_SUPABASE_URL`: public Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public anon/publishable key, **never** a service-role key.
- `SUPABASE_URL`: server project URL (falls back to the public URL).
- `SUPABASE_SERVICE_ROLE_KEY`: server-only privileged key.
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: public reCAPTCHA v3 site key.
- `RECAPTCHA_SECRET_KEY`: server-only reCAPTCHA secret.

Public variables are embedded at build time; redeploy after changing them.
Authorize the preview hostname in reCAPTCHA and the password-recovery redirect
in Supabase Auth settings. Do not assume production settings apply to Preview.
The variable names above supersede the older Quick Start examples.

Run `node --test tests/request-api.test.cjs` and
`npx tsc --noEmit --incremental false`. Browser regression checks use Playwright
and a Chromium installation: start the dev server on port 3002 with
`NEXT_PUBLIC_RECAPTCHA_SITE_KEY=local-browser-fixture npm run dev -- --port 3002`,
then run `node tests/request-browser.cjs` (set `CHROMIUM_PATH` if necessary).
These browser checks intercept CAPTCHA and submission calls; they do not write
to Supabase. Playwright must be available in the development environment.
Run `npm run build` with the real public Supabase configuration before release.

### Database work still requiring review

No migration files or live database objects were changed by the application fixes.
The limiter now checks database errors, rejects ambiguous duplicate active rows,
and uses conditional updates to prevent lost increments on an existing row.
It still cannot serialize simultaneous first-row inserts without a database
constraint or atomic RPC. Durable submission idempotency likewise requires a
reviewed database contract. The form prevents repeat clicks and blocks retries
after an uncertain response in the current page; reloading is not durable
duplicate protection. Do not treat these as complete concurrency guarantees.

Inspect the actual schema, RLS, function definitions, existing duplicate rows,
and migration history before proposing database changes. Do not run historical
migrations or remove objects simply because files appear obsolete. The approved
customer-reference creation and promotion RPCs remain in use.
