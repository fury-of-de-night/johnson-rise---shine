# Phase 4H.4 — Read-Only Verification Report

Date: 2026-10-10
Scope: Read-only inspection. No SQL execution, no DB state change, no file edits, no deploy.

---

## 1. VERIFY LIVE SELECT ACCESS

- Migration 001 (line 31): `admin_select` policy — applies to `service_requests` only.
- Migration 005 (`pending_service_requests` ALTER/add index): no RLS policy defined in this file.
- Migration 008 (line 15): RLS enabled on `customer_reference_registry` (not on `pending_service_requests`).
- **Live DB evidence:** NONE — no approved read-only DB query executed (constraint from Phase 4H.4 itself: do not assume a live operation succeeded unless result is available).
- **Distinction:** SQL files imply `pending_service_requests` policies must exist elsewhere (unseen migration, live-applied), but this is inference only.

**PASS/FAIL/NOT TESTED:** **NOT TESTED** — live SELECT access must be verified before deployment; endpoint depends on it.

---

## 2. VERIFY REFERENCE INTEGRITY (NULL / LEGACY)

- Migration 008 (line 26): `customer_ref TEXT` — nullable, no `NOT NULL`.
- Migration 010 (line 42-50): `pending_service_requests(...) customer_ref` included at insert — nullable, validated by format guard `!~ '^JRS-[A-Z0-9]{10}$'` (only non-NULL values validated).
- Migration 009 (line 54-57): `IF v_customer_ref IS NOT NULL THEN UPDATE registry ...` — registry unchanged when NULL.
- Legacy records (pre-008): `customer_ref` is NULL (added via `ADD COLUMN IF NOT EXISTS`).

**Can a pending request have `customer_ref IS NULL`?** YES — legacy or failed insertion.
**Should promotion be rejected when NULL?** Not required — RFC allows NULL (FK allows NULL, no `NOT NULL`); promotion copies NULL, registry unchanged. Existing behavior preserved.
**Banner mislead risk:** Line 233 `data.customerRef || (data.customer_ref ? 'OK-ref' : 'OK')` — when `customerRef=null`, displays `"OK"`. Not misleading as a permanent-ref claim; it is an honest fallback for a missing reference.

**PASS/FAIL/NOT TESTED:** **PASS** — integrity correct; legacy compatibility maintained.

---

## 3. VERIFY REPOSITORY SCOPE

- `git status --short`: `MM pages/api/promote-request.ts` (only modified file, 4H.2 edit).
- `.bak` file: **NOT FOUND** — removed in 4H.2 cleanup (confirmed).
- Unrelated changes in repo: `pages/admin/index.tsx`, migrations, other APIs — these are from prior phases, not 4H.2/4H.4.
- Only new untracked report files: `PHASE_4H1_REPORT.md`, `PHASE_4H2_REPORT.md`, `PHASE_4H3_REPORT.md`, `PHASE_4H4_REPORT.md`.

**PASS/FAIL/NOT TESTED:** **PASS** — no unrelated edits; target file only.

---

## 4. CONCURRENT PROMOTION (009)

- `SELECT ... FOR UPDATE` (009:26-30) — locks row.
- First promotion: acquires lock, inserts service_requests, deletes pending, updates registry, releases.
- Second concurrent: waits on lock; after release, `NOT FOUND`; raises `'Pending request not found'` → handled as 400.

**PASS/FAIL/NOT TESTED:** **PASS**.

---

## 5. ERROR HANDLING (ENDPOINT)

- Missing row: `!pendingRow` → 404.
- Lookup error: `lookupErr` → 500.
- Auth failure: RPC `is_admin()` checks → 403.
- No longer pending: RPC `v_status <> 'pending'` → 400.
- Success but `customer_ref` NULL: `customerRef` returned as `null`; banner shows `"Ref: OK"`; not misleading.

**PASS/FAIL/NOT TESTED:** **PASS**.

---

## Single Safest Next Action

**Verify the live SELECT permission before deploying** (the only NOT TESTED item). Approaches allowed by constraints:
- Execute an approved read-only `SELECT id, customer_ref FROM pending_service_requests WHERE id = '<uuid>'` via the same auth mechanism used by the endpoint, and confirm a result for an existing admin-authorized pending row.
- Or, deploy to a non-production preview environment and confirm promotion succeeds end-to-end.

**Do not deploy to production until live SELECT behavior is confirmed**, because the endpoint now depends on it.
