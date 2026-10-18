# PHASE 4 OVERNIGHT AUDIT

## Activity Log

### [2026-10-07 00:05]

#### Action
Created the audit document and began investigation setup.

#### Command / Tool
Write tool to create PHASE4_OVERNIGHT_AUDIT.md

#### Purpose
Initialize the handoff document with activity log structure.

#### Result
Document created at /home/trojan/Desktop/TrojanVault/Business/PHASE4_OVERNIGHT_AUDIT.md

#### Evidence
File path: /home/trojan/Desktop/TrojanVault/Business/PHASE4_OVERNIGHT_AUDIT.md

#### Interpretation
Starting the overnight audit as instructed.

#### Safety
Read-only document creation. No system changes.

---Subagent confirmed: project szqtawhbmldbievrtadh (JohnsonRisenShine, ACTIVE_HEALTHY). Tables: service_requests, audit_logs, services_ref, admin_users, pending_service_requests. All with RLS enabled. Key functions: private.is_admin() (SECURITY DEFINER), public.promote_pending_service_request (SECURITY DEFINER, FOR UPDATE, auth+admin, copies to service_requests, deletes pending, returns UUID). Duplicate private version of promotion existing (includes whatsapp_confirmed). Policies: INSERT enforces validation/pending state; SELECT restricted to admins via is_admin. No database modifications made.

---
## [2026-10-07 00:15] — Subagent DB Schema Report

### Action
Read the completed agent output (ad486fe1dbfa464e6).

### Source
Agent report file (not shown to user): /tmp/claude-.../tasks/ad486fe1dbfa464e6.output

### Result
- Project: szqtawhbmldbievrtadh (JohnsonRisenShine), ACTIVE_HEALTHY, sa-east-1, Postgres 17.6.1.166.
- Tables (all with RLS enabled): pending_service_requests, service_requests, admin_users, audit_logs, services_ref.
- Function: public.promote_pending_service_request (SECURITY DEFINER): requires auth.uid(), checks private.is_admin(), uses FOR UPDATE, inserts into service_requests, deletes pending, returns new UUID.
- Duplicate private version also exists (slightly different: includes whatsapp_confirmed).
- Policies: pending_service_requests INSERT has validation constraints; SELECT restricted to admins via private.is_admin().

### Safety
Read-only agent execution. No SQL mutations performed.


---
## [2026-10-07 00:30] — Manual Migration / Source Inspection

### Action
Read repository migrations and relevant source files directly (subagent failed due to API rate limits, no harm; read-only inspection continued manually).

### Files Inspected (Read-Only)
- migrations/001_service_requests.sql
- migrations/005_pending_service_requests.sql
- pages/request.tsx (submit flow, reference logic, disposable check, scroll helper)
- pages/admin/index.tsx (pending table, promotion flow, scrollToError)
- pages/api/verify-recaptcha.ts (insert, disposable check position)
- pages/api/promote-request.ts (auth flow preserved)
- src/lib/disposable-blocklist.ts (confirmed isDisposableEmail export)
- .env.example, package.json

### Results / Evidence
- Migration 001 creates service_requests (id uuid PK DEFAULT gen_random_uuid(), status, created_at/updated_at); RLS enabled; anon_insert policy on public.service_requests; admin_select/update/delete policies.
- No `customer_ref` column exists in service_requests or pending_service_requests in repository migrations.
- Migration 005 (pending_service_requests) aligns repo to live DB by adding verification_token_hash, verification_expires_at, verified_at; creates index on token hash.
- Live DB also has audit_logs, services_ref tables (not directly used by request/promotion flow).
- verify-recaptcha.ts inserts at line 89 (pending_service_requests.insert) — AFTER the server-side disposable check added by Phase 3A (before line 83-89). Good: disposable blocked before DB insert.
- Client-side disposable check at request.tsx line 175 remains (after server success).
- Customer reference in request.tsx derived from:
  - Client: `ref = 'JRS-' + Date.now() + '-' + Math.random()` (line 111) — only for WhatsApp message link; NOT the reference shown to user.
  - User reference shown: `refNumber = 'JRS-' + String(verifyData.pendingId).slice(0, 8).toUpperCase()` (line 187). So user sees truncated pending UUID.
  - Admin pending table: `customerRef = 'JRS-' + (r.id ? String(r.id).slice(0, 8).toUpperCase() : '')` (line 95). Admin also sees truncated pending UUID.
- After promotion: service_requests gets NEW UUID (`v_new_request_id` from RPC). Pending row deleted. There is NO persistent `customer_ref` linking the old pending UUID to the new service_requests UUID.
- Promotion RPC uses FOR UPDATE, checks auth.uid() and is_admin(), copies selected columns (no whatsapp_confirmed in public version; duplicate private version includes it), deletes pending row, returns new UUID.
- Auth flow preserved: browser sends Bearer token from supabase.auth.getSession(); server validates with createClient using user's access token; calls RPC as user.

### Safety
All read-only. No SQL executed. No file modifications. No deploy.

---
## [2026-10-07 01:00] — Final Summary (Terminal Output Equivalent)

1. Investigation completed: YES (read-only DB inspection via Supabase MCP + manual file reads)
2. Markdown report path: /home/trojan/Desktop/TrojanVault/Business/PHASE4_OVERNIGHT_AUDIT.md
3. Files inspected: ~10 source + 5 migrations + .env/package + live DB (3 tables, 2 functions)
4. DB objects inspected: pending_service_requests, service_requests, admin_users (columns, RLS, policies), promote_pending_service_request, private.is_admin
5. Important findings:
   - Phase 3A disposable fix present and correct (before insert)
   - Customer reference mismatch confirmed (pending UUID -> promotion -> new service UUID, no customer_ref column)
   - Login/auth/promotion flow preserved
   - No customer_ref column exists; no persistent reference mechanism
6. Unknowns:
   - Exact current RLS policies (verified via subagent summary but not fully printed)
   - Whether live admin_users table matches expected schema (verified via subagent)
   - Whether a duplicate private promotion function should be removed (noted, not acted on)
7. Modified: NO source/edit changes made tonight (only audit file created). Pre-existing Phase 2/3A modifications remain unaltered.
8. Deployed: NO
9. Committed: NO
10. NO DATABASE/DEPLOYMENT CHANGES WERE MADE.

---
## 32. AI HANDOFF (For ChatGPT / Next Session)

**Current State:**
- Working site (https://johnson-rise-shine.vercel.app/)
- Local repo at /home/trojan/Desktop/TrojanVault/Business
- Phase 3A fixes applied (disposable block, scroll helpers)
- Phase 2 admin/table fixes applied
- Phase 3A audit document created (PHASE4_OVERNIGHT_AUDIT.md)
- No customer_ref implemented; not authorized

**Confirmed Facts:**
- Live Supabase: szqtawhbmldbievrtadh (JohnsonRisenShine), ACTIVE_HEALTHY, Postgres 17.6
- Tables: pending_service_requests, service_requests, admin_users, audit_logs, services_ref (all RLS enabled)
- Promotion RPC (public): SECURITY DEFINER; requires auth + admin; locks row; inserts service_requests; deletes pending; returns new UUID
- Client reference shown = truncated pending UUID (8 chars of UUID); admin shows same
- After promotion: new service_requests UUID; old pending UUID lost; no linking column
- Auth: Bearer token from supabase.auth.getSession() -> server-scoped client -> RPC
- Disposable check server-side present (before insert) and client-side preserved

**Confirmed Bugs / Design Gaps:**
- customer_ref does not survive promotion (root cause documented)
- Duplicate promotion function exists (private version with whatsapp_confirmed)
- No persistent customer-facing reference mechanism
- Reference shown to user is derived from internal DB UUID (potential enumeration if exposed without auth)

**Live DB vs Repo Differences (Not Fixed Tonight):**
- Migration 005 shows repo was updated to match live DB (verification_token_hash, verification_expires_at, verified_at added; index created)
- No customer_ref migration exists (deferred)

**Security Constraints (Must NOT Change):**
- Do NOT change promote-request auth (Bearer token flow working)
- Do NOT replace user auth with service-role
- Do NOT weaken RLS or admin authorization
- Do NOT expose full UUIDs to unauthenticated users
- Do NOT implement lookup endpoint without authorization + rate limits
- Do NOT modify promotion RPC

**Recommended Next Action:**
Wait for separate authorization to implement Phase 3 (database/customer_ref). Recommended design (NOT implemented):
- Add `customer_ref text UNIQUE NOT NULL DEFAULT ...` to both pending_service_requests and service_requests (or generate via DB default/function)
- Modify promotion RPC to carry the existing customer_ref into service_requests
- Modify request.tsx to show the persistent customer_ref (instead of deriving from UUID)
- Consider using independent random public reference (e.g., alphanumeric 8-char) rather than UUID slice for privacy/enumeration risk

**What ChatGPT Should Verify:**
- Confirm live DB has no customer_ref column (check information_schema.columns)
- Confirm promotion RPC still uses FOR UPDATE and deletes pending row
- Confirm auth flow still uses Bearer header (not cookie-only)
- Confirm RLS policies unchanged

**What Must NOT Be Assumed:**
- Do NOT assume live DB matches repo exactly (check migrations vs db)
- Do NOT assume customer_ref exists (it does not)
- Do NOT assume promotion is idempotent (it relies on FOR UPDATE + delete; no duplicate-check mechanism visible beyond row lock)
- Do NOT assume reference shown to user survives promotion (it does not)

---
END OF PHASE 4 OVERNIGHT AUDIT

---
# FINAL SECOND-PASS FINDINGS (Read-Only Verification Complete)

## A. Live Schema — Verified (LIVE VERIFIED via SQL)

- pending_service_requests: 14 columns (id uuid PK; customer_name, phone, email, address, service_type NOT NULL; description, status, whatsapp_confirmed, created_at, updated_at; verification_token_hash, verification_expires_at, verified_at). NO customer_ref.
- service_requests: 10 columns (id uuid PK; customer_name, address, service_type NOT NULL; phone, email, description, status, created_at, updated_at). NO customer_ref. No whatsapp_confirmed (deliberately excluded by promotion RPC).
- admin_users: 6 columns (user_id uuid PK; email, role NOT NULL; full_name, created_at; last_login optional). No customer_ref.

## B. Live RLS — Verified (LIVE VERIFIED via pg_policies)

- pending_service_requests:
  - SELECT: admin only (authenticated + is_admin())
  - INSERT: anon allowed; with_check validates name length (2-120 chars), status='pending', whatsapp_confirmed=false, token/expires/verified ALL NULL.
- service_requests:
  - SELECT: admin only
  - UPDATE: admin only
  - INSERT: authenticated users only; with_check status='pending'
  - NO anon SELECT/UPDATE; NO DELETE visible.

## C. Live Promotion Functions — Verified (LIVE VERIFIED via subagent + SQL partial)

- public.promote_pending_service_request(uuid) -> uuid: SECURITY DEFINER (postgres), search_path='', requires auth.uid() and private.is_admin(), FOR UPDATE lock, inserts service_requests (no whatsapp_confirmed), deletes pending row, returns new UUID.
- private.is_admin() -> boolean: SECURITY DEFINER, checks admin_users by auth.uid(), roles 'admin'/'super_admin'.
- DUPLICATE private promotion function noted (includes whatsapp_confirmed) — NOT MODIFIED. Application calls unqualified 'promote_pending_service_request' which resolves to public version.

## D. Live admin_users — Verified (LIVE VERIFIED)

- Columns: user_id (PK), email (NOT NULL), full_name, role ('admin' default), created_at, last_login.
- Role values: 'admin' default; 'super_admin' supported by is_admin logic.
- No PII exposed; no actual user rows queried.

## E. Actual Application Reference Flow (CODE VERIFIED)

| File | Line | Behavior | Uses internal UUID? | Uses public reference? |
| pages/request.tsx | 111 | Client-side WhatsApp link uses temp JRS-+Date+random | Yes (temp only) | No |
| pages/request.tsx | 187 | User sees: 'JRS-' + first 8 chars of pending UUID | Yes | Partial |
| pages/admin/index.tsx | 95 | Admin sees: 'PENDING-...' + truncated UUID (pending) OR 'JRS-...' (service) | Yes (derived) | Partial |
| pages/admin/index.tsx | 363 | Confirm button displays truncated UUID as customerRef | Yes (derived) | Partial |

After promotion: pending UUID deleted; new service_requests UUID shown. Reference continuity BROKEN.

## F. Tracking/Lookup Findings (CODE VERIFIED)

- No public lookup/tracking endpoint exists.
- No API route for retrieving request by reference.
- Admin has only internal SELECT (via is_admin) and promotion.
- Customer must rely on saved reference + WhatsApp contact; no automated tracking.

## G. customer_ref Design Analysis (INFERRED / PROPOSED ONLY — NOT IMPLEMENTED)

Requirements if implemented:
- Must be persistent across promotion (pending -> service).
- Should be public, non-enumerable, non-auth credential.
- Should NOT reveal internal UUIDs.
- Must work with RLS (anon INSERT for pending; admin SELECT for pending; auth INSERT for service; admin SELECT/UPDATE for service).

Options:
A. JRS- + 8 chars UUID (current): collides easily? Low collision (2^32 for 8 hex chars). Predictable from UUID. Not fully independent.
B. Independent random 8-char alphanumeric (recommended): collision probability ~1/(62^8) ≈ 5e-15; low enumeration risk; user-friendly; can be DB-generated or app-generated.
C. Longer random reference: lower collision but longer for user.

Recommendation (PROPOSED ONLY — NOT IMPLEMENTED):
- Option B (independent random alphanumeric) is preferred for privacy and independence from UUID.
- Should be UNIQUE and indexed.
- Generation: PostgreSQL DEFAULT or application-level (before insert). If DB-side, use random() or a custom function; if app-level, generate before insert to ensure consistency.
- Must be backfilled only if needed (new column nullable initially, then non-null after migration).

Security considerations:
- Must NOT become lookup/auth mechanism without rate limiting.
- Customer reference should be combined with name/phone confirmation for any future lookup.
- No authentication should rely solely on customer_ref.

## H. Security Analysis (CODE + DB VERIFIED)

- Auth preserved: Bearer token flow intact.
- Promotion requires admin role (is_admin).
- Disposable email blocked before DB insert (Phase 3A fix verified).
- Rate limit exists (verify-recaptcha API uses rate_limits table, 5/hour limit per IP).
- No exposure of verification_token_hash or raw tokens.
- No customer lookup endpoint = lower exposure risk.
- Adding customer_ref increases surface area: requires rate limit, authorization, and confirmation checks for any lookup endpoint.

## I. Repository vs Live DB Differences (VERIFIED)

- Migration 005 aligns repo to live DB for verification token hash/expires/verified.
- Migration 001 defines service_requests (no customer_ref).
- Migration 007 defines promotion RPC (matches live public function).
- Duplicate private promotion function exists in DB but not in repo (potential leftover from earlier version); NOT MODIFIED.
- No repository migration creates customer_ref (as expected; deferred).

## J. Remaining Unknowns (EXPLICITLY LISTED)

- Whether the duplicate private promotion function should eventually be removed (requires authorization to drop DB objects).
- Whether a future lookup endpoint will require name + reference confirmation, reference only, or additional verification.
- Whether customer_ref should be generated by DB default or application (design question, not unknown in evidence).
- Whether the existing customer saves reference in localStorage (request.tsx does save form data; does not explicitly save refNumber after submit — verified by inspection: no setItem for refNumber). This is a minor user experience gap but not a security issue.
- Whether audit_logs table has any reference tracking (not inspected in detail; could be checked in future pass if needed).

## K. Proposed Next Phase (DESIGN ONLY — NOT IMPLEMENTED)

DO NOT PROCEED WITHOUT EXPLICIT AUTHORIZATION.

Proposed steps:
1. Design final customer_ref format (recommend Option B: independent random 8-char alphanumeric, prefixed JRS-).
2. Prepare SQL migration (add nullable column to both tables, add index, set DEFAULT later or backfill).
3. Modify promotion RPC to include customer_ref in service_requests insert.
4. Modify application: request creation to generate/store customer_ref; admin pending/service views to display it; promotion to preserve it.
5. Add rate-limited lookup endpoint (optional, requires separate authorization and design review).
6. Add tests (as listed in audit): submit -> ref generated -> admin sees same -> promotion preserves -> service_requests shows same -> duplicate promotion safe -> unauthorized promotion blocked.
7. Implement customer confirmation mechanism (name + reference or phone + reference) for any lookup.

All above: NOT IMPLEMENTED. Only design proposal documented.

---

## AI HANDOFF — UPDATED (For ChatGPT / Next Session)

Refer to previous AI HANDOFF in this same file; add these verified updates:
- customer_ref column: NOT PRESENT in ANY live table (VERIFIED LIVE).
- RLS policies: verified exactly; anon INSERT has strict validation constraints (name length, pending status, false whatsapp, null token/expires/verified).
- Promotion functions: public version used; duplicate private version exists (not removed).
- Reference flow: broken at promotion (no persistence mechanism).
- Tracking endpoint: does NOT exist.
- All Phase 3A changes preserved; audit document is the ONLY file modified in this session.
