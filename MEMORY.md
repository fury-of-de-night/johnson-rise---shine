## 🔍 Recent Learnings
- Project szqtawhbmbldbievrtadh: backend agent delivered SQL migrations (001-004) with RLS, security.ts (CSRF/xss/rate 5/hr), .env.example (no real values)
=== Memory update ===

- 2026-09-14: Built full frontend (10 pages/components): homepage, services, request form (with validation, honeypot, localStorage, 2 submit buttons + WA link), admin login/dashboard (filter, complete, CSV, audit), privacy (GDPR-style, 2yr retention), terms, Header, Footer, ServiceCard, RequestForm, Hero, CookieBanner, WhatsAppFloat verified, tailwind config + globals.css with brand colors (#2d5016, #8fbc8f, #ffd700). No live tokens embedded; references .env.example.
- 2026-09-14: audit_logs RLS standardized to same admin check as service_requests (app_metadata.role = admin claim path); service_requests 001 policies unchanged.
