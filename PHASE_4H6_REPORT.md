# Phase 4H.6 — Implementation Completion Report

**Date:** 2026-10-18
**Role:** Takeover agent. Read-only audit followed by safe, minimal local code fixes.
**Scope:** Resume from Phase 4H.5. No production SQL execution, no deployment, no schema mutation, no push.

---

## 1. Starting State

**Phase:** 4H.5 (last confirmed handover 2026-10-10).
**Repository:** `/home/trojan/Desktop/TrojanVault/Business`
**Git state at intake:**
- Staged (`git diff --cached`): `CUSTOMER_REF_DESIGN.md`, `PHASE4_OVERNIGHT_AUDIT.md`, `migrations/008`, `migrations/009`, `migrations/010`, `pages/admin/index.tsx`, `pages/api/promote-request.ts`, `pages/api/verify-recaptcha.ts`, `pages/request.tsx`, `src/lib/security.ts`, `tsconfig.tsbuildinfo`.
- Unstaged (`git diff`): `migrations/010_create_pending_service_request.sql`, `pages/api/promote-request.ts`, `tsconfig.tsbuildinfo`.
- Untracked: `PHASE_4H1_REPORT.md`, `PHASE_4H4_REPORT.md`, `PHASE_4H5_REPORT.md`, `supabase/.temp/linked-project.json`.

**Confirmed outstanding work from 4H.5:**
- Live SELECT permission for `pending_service_requests` by authenticated admin: `NOT TESTED`.
- Admin success banner displayed literal `"OK"` for legacy null-reference promotions.
- Migration 010 REVOKE/GRANT parameter signatures were incorrect (9 args listed, function has 10).

---

## 2. Findings

### A. Migration 010 — REVOKE/GRANT signature bug (DEFECT — HIGH)

**File:** `migrations/010_create_pending_service_request.sql`, lines 60–73 (before fix)

The `create_pending_service_request` function takes 10 parameters:
```
(p_customer_ref TEXT, p_customer_name TEXT, p_phone TEXT, p_email TEXT,
 p_address TEXT, p_service_type TEXT, p_description TEXT,
 p_whatsapp_confirmed BOOLEAN, p_verification_token_hash TEXT,
 p_verification_expires_at TIMESTAMPTZ)
```
The REVOKE and GRANT statements listed only **9 type tokens** — omitting `text` for `p_customer_ref`. PostgreSQL resolves function privileges by exact signature. If executed as written, all four REVOKE/GRANT statements would fail with "function not found" errors, leaving the function executable by PUBLIC (the PostgreSQL default). This would expose the atomic creation RPC to anonymous callers — a security defect.

**Severity:** Execution of the migration as-written would silently leave the function unsecured. The function body is not yet deployed, so no live exposure exists today. The bug is in the pending migration.

### B. Admin success banner — misleading fallback (DEFECT — LOW)

**File:** `pages/admin/index.tsx`, line 233 (before fix)

```js
setPromotionSuccess(`Request confirmed (Ref: ${data.customerRef || (data.customer_ref ? 'OK-ref' : 'OK')})`);
```

When `data.customerRef` is null (legacy pre-008 request), the display fell back to the literal string `"OK"`. This string could be misinterpreted by an admin as a valid reference identifier. The backend's `promote-request.ts` correctly returns `customerRef: null` for legacy requests — the bug is in the UI presentation only.

### C. Live SELECT permission on `pending_service_requests` (NOT TESTED — ongoing)

The `CUSTOMER_REF_DESIGN.md` (live-verified 2026-10-07) states:
> SELECT policy (`Allow admins to view pending`): roles `{authenticated}`, qual `(SELECT private.is_admin() AS is_admin)`.

This policy was verified live via `pg_policies`. No migration file defines it explicitly — it exists in the live DB, either through the Supabase dashboard or an earlier migration not captured locally.

The endpoint's pre-promotion lookup (`supabaseUser.from('pending_service_requests').select('customer_ref').eq('id', pendingId).maybeSingle()`) requires that this policy return the row for an authenticated admin. Based on the live-verified `pg_policies` evidence, the policy exists and covers the `authenticated` role with the correct `is_admin()` guard.

**Classification: PARTIALLY VERIFIED (live `pg_policies` inspection from prior phase) — cannot re-verify without an approved live DB query or a preview-environment promotion test.**

### D. Migrations 008/009/010 — not deployed (BLOCKER — DEPLOYMENT)

All three migrations are `NOT EXECUTED` per their headers and `CUSTOMER_REF_DESIGN.md`. The live DB does not have `customer_reference_registry`, `customer_ref` columns on either table, the `create_pending_service_request` RPC, or the updated `promote_pending_service_request` RPC. The current intake flow (`verify-recaptcha.ts`) already calls `create_pending_service_request` — this will fail at runtime until migrations 008/009/010 are applied.

**The code is ahead of the schema.** Migrations must be applied before the feature is live.

### E. Promotion RPC — version mismatch (INFORMATIONAL)

Migration 007 (`promote_pending_service_request`) is the deployed version. It does NOT copy `customer_ref`. Migration 009 is the proposed update that adds `customer_ref` copying and registry advancement. Both are local — the live DB has the 007 version. Until 009 is applied, promotion will not copy `customer_ref`.

---

## 3. Changes Made

### File: `migrations/010_create_pending_service_request.sql`

**Why:** The four REVOKE/GRANT statements listed 9 parameter types instead of 10. Executing this as written would fail to restrict the function, leaving it callable by PUBLIC.

**Change:** Added the missing leading `text` for `p_customer_ref` to all four statements. Added inline comments naming the full 10-parameter list for future maintainability.

**Before (line 61, repeated 4×):**
```sql
REVOKE EXECUTE ON FUNCTION public.create_pending_service_request(
  text, text, text, text, text, text, boolean, text, timestamp with time zone
) FROM PUBLIC;
```

**After:**
```sql
-- Full 10-parameter signature:
-- (p_customer_ref, p_customer_name, p_phone, p_email, p_address, p_service_type,
--  p_description, p_whatsapp_confirmed, p_verification_token_hash, p_verification_expires_at)
REVOKE EXECUTE ON FUNCTION public.create_pending_service_request(
  text, text, text, text, text, text, text, boolean, text, timestamp with time zone
) TO service_role;
```

### File: `pages/admin/index.tsx`

**Why:** The promotion success banner displayed the literal string `"OK"` when `data.customerRef` was null (legacy requests without a customer_ref). This is misleading — an admin could read `"Ref: OK"` as a valid reference code.

**Change:** Replaced the fallback string logic with a semantically correct conditional. When a real reference exists, display it. When no reference is present, display a neutral factual message.

**Before (line 233):**
```js
setPromotionSuccess(`Request confirmed (Ref: ${data.customerRef || (data.customer_ref ? 'OK-ref' : 'OK')})`);
```

**After (lines 233–237):**
```js
// data.customerRef is the JRS-XXXXXXXXXX reference from the promoted pending row.
// Legacy requests (pre-008) have no customer_ref; show a neutral confirmation instead
// of the literal string 'OK', which could be mistaken for a valid reference value.
const displayRef = data.customerRef ? `Ref: ${data.customerRef}` : 'request confirmed (no reference on file)';
setPromotionSuccess(`Request confirmed — ${displayRef}`);
```

---

## 4. Security and Data Integrity

| Check | Status | Evidence |
|---|---|---|
| Admin-only RPC (`promote_pending_service_request`) | PASS | Both 007 and 009 require `auth.uid() IS NOT NULL` and `private.is_admin() IS NOT TRUE` raises exception |
| Concurrent promotion protection | PASS | `FOR UPDATE` row lock in RPC (007 + 009) |
| Re-promotion of non-pending row | PASS | `v_status <> 'pending'` check raises exception |
| Anonymous intake uses service-role server only | PASS | `verify-recaptcha.ts` uses `SUPABASE_SERVICE_ROLE_KEY` never exposed to browser |
| reCAPTCHA token discarded server-side | PASS | Token verified then discarded; `pendingId` and `customerRef` returned |
| Customer ref generated server-side | PASS | `generateSecureCustomerRef()` in `security.ts` uses `crypto.randomInt` (unbiased) |
| Verification token never returned to browser | PASS | Only `pendingId` and `customerRef` returned to client |
| Legacy null `customer_ref` promotable | PASS | FK allows NULL; RPC 009 skips registry update when NULL; endpoint returns `customerRef: null` |
| `customer_ref` preserved through promotion | DEPENDENT | Requires migration 009 to be applied; 007 (deployed) does NOT copy it |
| REVOKE signature correctness (010) | FIXED | Was 9 params, now 10 params — matches function definition |
| Success banner does not invent reference | FIXED | Was `"OK"`, now `"request confirmed (no reference on file)"` |

---

## 5. Verification Results

| Command | Result |
|---|---|
| `npx tsc --noEmit` (before changes) | PASS — no output |
| `npx tsc --noEmit` (after changes) | PASS — no output |
| `npm run build` | NOT TESTED — build process consistently trips sandbox timeout; tsc pass is the closest available static check |

---

## 6. Live Database Verification

| Check | Classification |
|---|---|
| Authenticated admin can SELECT from `pending_service_requests` | PARTIALLY VERIFIED — live `pg_policies` from prior phase showed correct policy; actual query not re-executed |
| Migration 008 applied (registry + columns) | NOT TESTED — file marked NOT EXECUTED; no approved live schema inspection |
| Migration 009 applied (updated promotion RPC) | NOT TESTED — same |
| Migration 010 applied (create_pending_service_request RPC) | NOT TESTED — same |
| Promotion end-to-end flow in live or preview environment | NOT TESTED |

---

## 7. Git Status

### Staged (`git diff --cached --name-only`)
- `CUSTOMER_REF_DESIGN.md` — prior phase documentation
- `PHASE4_OVERNIGHT_AUDIT.md` — prior phase documentation
- `migrations/008_customer_ref_registry.sql` — prior phase design
- `migrations/009_promote_customer_ref.sql` — prior phase design
- `migrations/010_create_pending_service_request.sql` — prior phase design + 4H.6 REVOKE/GRANT fix
- `pages/admin/index.tsx` — prior phase implementation + 4H.6 banner fix
- `pages/api/promote-request.ts` — prior phase implementation
- `pages/api/verify-recaptcha.ts` — prior phase implementation
- `pages/request.tsx` — prior phase implementation
- `src/lib/security.ts` — prior phase implementation
- `tsconfig.tsbuildinfo` — build artifact

### Unstaged (`git diff --name-only`)
- `migrations/010_create_pending_service_request.sql` — 4H.6 REVOKE/GRANT fix (both staged and unstaged due to prior `MM` state)
- `pages/admin/index.tsx` — 4H.6 banner fix (same reason)
- `pages/api/promote-request.ts` — prior phase 4H.2 unstaged change
- `tsconfig.tsbuildinfo` — build artifact

### Untracked
- `PHASE_4H1_REPORT.md`, `PHASE_4H4_REPORT.md`, `PHASE_4H5_REPORT.md` — prior phase reports
- `PHASE_4H6_REPORT.md` — this report
- `supabase/.temp/linked-project.json` — Supabase CLI temp file

**No staged or unstaged changes were reset, discarded, or overwritten.**

---

## 8. Documentation Updated

| File | Update |
|---|---|
| `migrations/010_create_pending_service_request.sql` | Corrected REVOKE/GRANT signatures; added inline parameter-name comments |
| `pages/admin/index.tsx` | Fixed success banner fallback; added inline comment |
| `PHASE_4H6_REPORT.md` | This report (new file) |

---

## 9. Remaining Blockers

1. **Migrations 008/009/010 not applied to live DB.** The intake flow already calls `create_pending_service_request` — this will throw a DB error at runtime until 010 is applied. The promotion flow will not copy `customer_ref` until 009 is applied. The data model changes (columns, registry, FKs) in 008 are prerequisites for both.
   - **Required action:** Owner authorization + `supabase db push` or manual SQL execution (in order: 008 → 009 → 010) in a staging environment first, then production.
   
2. **Live SELECT permission re-verification.** The `pg_policies` evidence from prior phases is sufficient to be confident, but a smoke test promotion in a preview environment would close this fully.

3. **GitHub remote token rotation.** Prior MEMORY.md note: `.git/config` remote URL embeds a `gho_` OAuth token in plaintext. This must be rotated and replaced with SSH or a credential helper before any push.

---

## 10. Deployment Recommendation

**NO-GO**

**Reasons:**
- Migrations 008/009/010 are not applied. The server code already calls new RPCs that do not exist in the live schema. Any submission attempt will return a 500 error.
- No preview-environment promotion smoke test has been run.
- GitHub remote token must be rotated before any push.

**When ready for GO:**
1. Rotate GitHub remote token.
2. Apply migrations 008 → 009 → 010 to a staging/preview Supabase project.
3. Run a full end-to-end promotion test in staging.
4. If passing, apply migrations to production.
5. Deploy to Vercel.

---

## 11. Next Action

**Smallest safe next action:** Apply migrations 008 → 009 → 010 to the linked Supabase preview project (not production) via `supabase db push` or the Supabase SQL editor. Verify that:
- `customer_reference_registry` table exists.
- `customer_ref` column exists on both `pending_service_requests` and `service_requests`.
- `create_pending_service_request` RPC returns a UUID when called with a valid customer ref.
- `promote_pending_service_request` copies `customer_ref` into `service_requests` and advances the registry status to `'promoted'`.

This requires explicit owner authorization before execution.
