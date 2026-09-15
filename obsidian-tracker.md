---
title: "Next Tasks — Landscaping Site"
description: "Obsidian link-file for current build request (2026-09-14)."
---

# Landscaping Build — Johnson Rise & Shine

Linked: [[MEMORY.md]] | [[Business/supabase-config.md]]

## Request (user input 2026-09-14)
Build professional landscaping business site for Guyana.

## Key specs captured
- Brand: Johnson Rise & Shine
- WhatsApp: +592 699 2175 → wa.me/5926992175
- Services: 10 landscaping items (weeding, spraying, pruning, trimming, mulching, insecticides/fungicides, lawn grass planting, fertilizing, pressure washing, yard cleanup)
- Design: Forest green (#2d5016), light green (#8fbc8f), gold (#ffd700)
- Security: RLS all tables, CSRF, XSS prevention, rate limit (5/hr/IP), HTTPS, param queries
- WhatsApp form: 2 submit buttons (DB only; DB + WhatsApp click-to-chat with pre-filled message)
- Pages: Home, Services, Request Form, Admin Dashboard, Privacy/Terms, Cookie consent
- Tech: React/Next.js + Tailwind + Supabase + Zod + WhatsApp Click-to-Chat API
- Deliverables: source code, SQL migrations, .env.example, README, Postman collection, security audit checklist

## Subagent plan (per user request)
- [ ] Frontend Agent: UI/UX, responsive, forms, WhatsApp buttons, gallery, testimonials
- [ ] Backend Agent: Supabase schema, RLS policies, API routes, auth/admin
- [ ] Security Agent: RLS policies, input sanitization, CSRF/XSS, rate limit, audit log
- [ ] Integration Agent: WhatsApp click-to-chat, email notifications, map/services area

## Security checklist (from prompt)
- [ ] RLS enabled on all tables
- [ ] Input validation (client + server)
- [ ] XSS prevention (escape outputs)
- [ ] CSRF tokens
- [ ] Rate limiting (5/hour per IP)
- [ ] Parameterized queries
- [ ] Secure headers (Helmet)
- [ ] Env vars for secrets
- [ ] HTTPS only
- [ ] CORS configured
- [ ] Admin session timeout
- [ ] Audit logging
- [ ] Data encryption at rest (Supabase default)
- [ ] Secure cookie flags (HttpOnly, Secure, SameSite)

## Next action
Confirm agent spawn / workflow initiation; create `.env.example`; start SQL migrations.

---
## Status Update — 2026-09-14 (all agents complete)
- [x] Integration Agent: WhatsApp click-to-chat, email notify, autosave, float button
- [x] Backend Agent: 4 SQL migrations (RLS policies, indexes), security middleware
- [x] Security Agent: CSRF, XSS sanitize, rate limit (5/hr/IP), parameterized queries
- [x] Frontend Agent: 6 pages + 9 components + Tailwind + form validation + 2 submit buttons
- [x] Memory (Desktop/MEMORY.md): token reference + auth + project ID + no secret persistence
- [x] Obsidian tracker: this file links to memory and captures full spec + checklist
