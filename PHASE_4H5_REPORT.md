# Phase 4H.5 — Read-Only Verification Report

Date: 2026-10-10 | Read-only only. Zero edits, zero SQL writes.

---

## 1. LIVE SELECT ACCESS (Task 1)

**VERDICT: NOT TESTED**

Evidence source: only SQL-file inspection (no executed DB query, per restriction 5).
- Endpoint (`pages/api/promote-request.ts` 78-85): uses user-scoped `supabaseUser.from('pending_service_requests').select('customer_ref').eq('id',pendingId)`.
- Migration 001 (line 31): `admin_select` applies to `service_requests` only — not `pending_service_requests`.
- Migration 005: ALTER/index only; no RLS policy defined for pending table.
- Migration 008: registry RLS only.
- No file defines admin SELECT policy on `pending_service_requests`; must exist live (applied earlier or via supabase db push) — but unverified.
- **Reason for inability:** No approved read-only DB method executed; service-role query disallowed as proof (restriction 4); production query requires approval (restriction 5); no preview admin session available (restriction 3).
- **What is needed:** Either (a) approved read-only `SELECT id, customer_ref FROM pending_service_requests WHERE id = '<uuid>'` via an authenticated admin client, or (b) end-to-end promotion test in preview environment.

---

## 2. MIGRATION / POLICY REVIEW (Task 2)

**Migration 003 (`003_services_ref.sql`)** — unrelated to `pending_service_requests` (service-ref table, not pending requests).
**Migration 005 (`005_pending_service_requests.sql`)** — ADD COLUMN (token hash, expires, verified_at) + index; zero policy definitions.
**Migration 001 (`001_service_requests.sql`, line 19-33)** — RLS enabled; `admin_select` for service_requests.
**Migration 008 (`008_customer_ref_registry.sql`)** — registry RLS; FK/indexes added; no pending-table policies.
**Migration 009/010** — RPC authorization only.

Distinction: file evidence = migration-only; live DB state = unverified (no query executed).

---

## 3. APPROVED READ-ONLY METHOD (Task 3)

Available but not executed:
- MCP `mcp__plugin_supabase_supabase__execute_sql` (read-only `SELECT`) — requires approval; restriction 5 states "do not run production query without approval".
- Preview environment endpoint test — no preview deploy executed; restriction forbids deploy.
- **Result:** method exists; authorization to execute against live data not granted this phase.

---

## 4. GIT STATE — STAGED VS UNSTAGED (Task 6)

Staged (`git diff --cached --name-only`): 10 files (design docs, migrations 008/009/010, admin/index, APIs, src/lib/security, tsconfig build info).
Unstaged (`git diff --name-only`): 1 file — `pages/api/promote-request.ts` (only Phase 4H.2 change — lookup block + return line).
No alterations made by this phase.

---

## 5. .BAK FILE (Task 7)

Status: **NONE** (cleaned during Phase 4H.2; confirmed with `ls`). Zero backup artifacts left.

---

## 6. ADMIN SUCCESS BANNER (Task 8)

Line 233 (`pages/admin/index.tsx`): `setPromotionSuccess(`Request confirmed (Ref: ${data.customerRef || ...})`);`
- If `customerRef` absent (current response before this phase): displays literal `OK`.
- With 4H.2 fix: returns `customerRef`; banner displays actual `JRS-...`.
- **No UI edit made; banner behavior unchanged in this phase; depends only on endpoint response.**

---

## 7. MISSING `customer_ref` — LEGACY / NULL (Task 9)

**Valid:** YES.
- Column `customer_ref` added by 008 (`TEXT`, no `NOT NULL`); legacy rows = NULL.
- RPC 009 (line 54-57): updates registry only `IF v_customer_ref IS NOT NULL`; promotion of NULL-ref rows permitted.
- Endpoint (line 95): `const customerRef = pendingRow.customer_ref || null`; handles NULL gracefully.
- **Safest minimal follow-up:** document that promotions without a reference show `"Ref: OK"`; no code change required (existing fallback already correct; changing it to reject promotion would break legacy compatibility).

---

## 8. DEPLOYMENT RECOMMENDATION

**DO NOT DEPLOY until live SELECT access is verified** (only blocker: 4H.3/4H.4/4H.5 all show NOT TESTED).
After verification, deploy is safe — all other checks PASS.

---

## Single Safest Next Action

Approve execution of an approved read-only SELECT (`SELECT id, customer_ref FROM pending_service_requests WHERE id = '<test-id>'`) through the authenticated admin client's scope (or approve a preview-environment promotion smoke test). Once confirmed PASS, deploy.
