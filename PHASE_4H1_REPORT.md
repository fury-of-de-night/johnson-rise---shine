# Phase 4H.1 — End-to-End Reference Integration Trace + Local Validation

**Date:** 2026-10-09
**Scope:** Read-only inspection (no SQL execution, no DB state changes, no file edits, no Vercel deploy, no live requests).

---

## Executive Summary

The **data flow for the customer reference is CORRECT end-to-end** — the same 14-character `JRS-XXXXXXXXXX` value generated at anonymous submission is atomically written to the registry, preserved through the pending row, and copied intact into `service_requests` on promotion. There is **no data-integrity defect** and the reference is identical across registry, pending request, and promoted service request.

One **UI-only defect** was found: the admin promotion success message displays "Ref: OK" instead of the actual reference because the promotion endpoint returns no `customerRef` field.

---

## Priority 1: Customer Reference Data Flow Trace

### Hop 1 — Anonymous submission: reference generation
**File:** `pages/api/verify-recaptcha.ts` (lines 112-116)
```ts
customerRef = generateSecureCustomerRef();
```
The server generates the reference with `crypto.randomInt` over a 36-char alphabet (`[A-Z0-9]`), formatted `JRS-` + 10 chars via `src/lib/security.ts`. **PASS** — server-controlled generation, never client-trusted.

### Hop 2 — Atomic registry + pending insert
**File:** `pages/api/verify-recaptcha.ts` (lines 121-128), RPC 010 `create_pending_service_request`
```ts
const { data: rpcPendingId, error: rpcError } = await supabaseAdmin.rpc(
  'create_pending_service_request', { p_customer_ref: customerRef, ... }
);
```
- RPC is `SECURITY DEFINER` with `SET search_path = ''` (line 19-20 of 010).
- Format guard: `IF p_customer_ref !~ '^JRS-[A-Z0-9]{10}$'` raises exception (010:26).
- Registry insert uses PK conflict + `ON CONFLICT DO NOTHING` + `IF NOT FOUND THEN RAISE EXCEPTION 'Customer reference collision: %'` — single transaction, no partial state.
- Retry loop (up to 5 attempts) regenerates and re-attempts on collision (verify-recaptcha:107-110).
**PASS** — the `customerRef` used in the pending insert is exactly the one generated.

### Hop 3 — Client receives reference
**File:** `pages/request.tsx`, line 188:
```ts
setRefNumber(verifyData.customerRef || 'JRS-?')
```
`verify-recaptcha.ts` returns `{ success, score, pendingId, customerRef }` (line 143), so the browser displays the server-generated reference on the confirmation screen. **PASS** — matches Hop 2 exactly.

### Hop 4 — Admin pending table shows reference
**File:** `pages/admin/index.tsx`, `loadData()` (lines 86-95):
```ts
.select('id, customer_ref, customer_name, phone, email, address, service_type, description, whatsapp_confirmed, created_at')
...
ref: r.customer_ref ? ('PENDING-' + r.customer_ref) : ...,
customerRef: r.customer_ref || null,
```
Reads `customer_ref` directly from `pending_service_requests`. **PASS** — derived from the DB row stored by Hop 2.

### Hop 5 — Promotion preserves the reference
**File:** migration 009 `promote_pending_service_request` (lines 39-47):
```ts
INSERT INTO public.service_requests (customer_name, phone, email, address, service_type, description, status, customer_ref)
SELECT customer_name, phone, email, address, service_type, description, 'pending', customer_ref
FROM public.pending_service_requests WHERE id = p_pending_id
RETURNING id INTO v_new_request_id;
```
- `SELECT status, customer_ref INTO ... WHERE id = ... FOR UPDATE` (009:26-30) locks the row before reading.
- `customer_ref` is selected from the pending row and inserted verbatim into `service_requests`.
- Registry updated: `SET status = 'promoted' WHERE customer_ref = v_customer_ref` (009:54-57).
- Fail-closed: `IF private.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden...'` (009:20).
**PASS** — reference copied byte-for-byte; registry advances to `promoted`.

### Hop 6 — Admin service table shows the reference
**File:** `pages/admin/index.tsx`, `loadData()` (lines 69-77):
```ts
.select('*')
setRequests(srData.map((r: any) => ({
  id: r.id,
  ref: r.customer_ref || 'JRS-',
  ...
})))
```
Loads `service_requests.customer_ref` directly from the DB after promotion. **PASS** — displays the same value promoted by Hop 5.

### Hop 7 — Promotion endpoint response **DOES NOT** include the reference
**File:** `pages/api/promote-request.ts` (lines 96-99):
```ts
// Note: promotion RPC (009) preserves customer_ref; this endpoint
// does not retrieve it separately to keep scope narrow. Admin UI
// should rely on the registry reference shown in the pending table.
return res.status(200).json({ success: true, serviceRequestId: newRequestId });
```
The response contains only `success` and `serviceRequestId`. **FAIL for the success message path** (see defect below).

### Hop 8 — Admin promotion success message
**File:** `pages/admin/index.tsx`, line 233:
```ts
setPromotionSuccess(`Request confirmed (Ref: ${data.customerRef || (data.customer_ref ? 'OK-ref' : 'OK')})`);
```
Evaluates to `${data.customerRef || (data.customer_ref ? 'OK-ref' : 'OK')}`. Since `promote-request.ts` sends neither `customerRef` nor `customer_ref`, the message **always renders "Ref: OK"**. **FAIL** — displays an incorrect placeholder instead of the actual reference.

---

## Priority 2: Local Validation

| Check | Command | Result |
|---|---|---|
| Type checking | `npx tsc --noEmit` | **PASS** — no output, no type errors |
| Production build | `npm run build` | **PASS** — "Compiled successfully", 10 static pages + 2 dynamic API routes, no errors |

---

## Identified Integration Defect

**Type:** UI-only display defect. No data-integrity issue.

**Location:** `pages/admin/index.tsx` line 233, root cause `pages/api/promote-request.ts` line 99.

**Behavior:** After clicking "Promote" on a pending request, the admin success banner shows "Request confirmed (Ref: OK)" instead of "Request confirmed (Ref: JRS-XXXXXXXXXX)". The pending row is correctly removed from the pending table, and the promoted row's `customer_ref` is correctly shown in the service requests table after `loadData()` refreshes.

**Why it fails:** The promotion response (`{ success, serviceRequestId }`) contains no reference field, so the ternary in line 233 falls through both `data.customerRef` and `data.customer_ref` to the literal `'OK'`.

**Smallest proposed fix (not applied):** Extend the promotion endpoint to return the reference:
```ts
return res.status(200).json({ success: true, serviceRequestId: newRequestId, customerRef: pending.customer_ref });
```
This requires fetching `customer_ref` from `pending_service_requests` (it is no longer readable from the RPC return value since 009 returns only `uuid`). The two minimal alternatives that keep this branch narrow are:
1. **API-side** (preferred): query `SELECT customer_ref FROM pending_service_requests WHERE id = $1` and add `customerRef` to the response → line 233 then displays the actual ref.
2. **UI-side** (no endpoint change): change line 233 to drop the reference from the success banner entirely, since `loadData()` already refreshes and shows the ref in the service table (`setPromotionSuccess('Request confirmed successfully')`).

I recommend option 1 because it preserves the informative UX without touching the admin page's rendering logic. The fix is a 3-4 line change to `pages/api/promote-request.ts`.

---

## Reference Consistency Conclusion

| Stage | Location | Same 14-char value? |
|---|---|---|
| Generation | `verify-recaptcha.ts` | Yes — server-generated |
| Registry | `customer_reference_registry` PK | Yes — atomic insert with collision retry |
| Pending row | `pending_service_requests.customer_ref` | Yes — inserted in same RPC tx |
| Client confirmation | `request.tsx` (`verifyData.customerRef`) | Yes — echoed from server |
| Admin pending table | `admin/index.tsx` (line 94) | Yes — DB-derived |
| Promoted row | `service_requests.customer_ref` | Yes — verbatim copy from pending |
| Admin service table | `admin/index.tsx` (line 77) | Yes — DB-derived |

**Only** the promotion-success banner deviates, and it shows a static fallback string, not a different reference value.

---

## Recommendation

The application integration is sound for production deployment from a data-flow standpoint. The only outstanding item is the cosmetic success-banner bug.

**Next action (wait for approval):** Apply the 3-4 line fix to `pages/api/promote-request.ts` to include `customerRef` in the promotion response (option 1 above), then re-run `npm run build` and redeploy. Do you approve?
