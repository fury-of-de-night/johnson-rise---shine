# CUSTOMER REFERENCE DESIGN (Phase 4B)

**Status:** PARTIALLY IMPLEMENTED LOCALLY — NOT DEPLOYED, NOT EXECUTED AGAINST PRODUCTION.
Source files and proposed migrations have been created locally; no SQL has been executed against the live Supabase database, no deployment, no env changes.

## IMPLEMENTED LOCALLY (not deployed)
- `src/lib/security.ts`: `generateSecureCustomerRef()` — 36-char uppercase alphanumeric set (`A-Z0-9`), `crypto.randomInt(36)` (unbiased, no modulo), 10 iterations, one append per iteration, returns `JRS-` + 10 chars = 14 chars total.
- `pages/api/verify-recaptcha.ts`: generates `customer_ref` server-side, performs atomic registry + pending insert via `.rpc('create_pending_service_request', ...)`, retries up to 5 attempts on collision, returns `customerRef`.
- `pages/request.tsx`: displays server-provided `verifyData.customerRef`; WhatsApp message uses same ref; no UUID-derived new references.
- `pages/admin/index.tsx`: pending/service tables display persisted `customer_ref`; promotion success message uses `customer_ref`, not internal UUID.

## PROPOSED / NOT EXECUTED
- `migrations/008_customer_ref_registry.sql` — registry + nullable columns + partial unique indexes (proposal only).
- `migrations/009_promote_customer_ref.sql` — promotion RPC preserves `customer_ref` (proposal only).
- `migrations/010_create_pending_service_request.sql` — atomic `SECURITY DEFINER` function (registry + pending in one transaction) (proposal only).
- Legacy backfill of existing pending rows (design-only; not executed).
- Historical `service_requests` rows left NULL (no false linkage).

## NEEDS FUTURE AUTHORIZATION
- Execution of 008/009/010 against the live database.
- Separate admin-user provisioning (`e85a1a64-...`) — not mixed into this phase.

---

### Phase 4B Revision — Architectural Corrections (added 2026-10-07)

1. **Why separate UNIQUE constraints are NOT global uniqueness.** Two independent `UNIQUE` indexes on `pending_service_requests(customer_ref)` and `service_requests(customer_ref)` enforce uniqueness only within each table. They do not prevent the same value from appearing in both tables simultaneously. The design's previous claim that "atomic promotion + individual constraints" guarantees global uniqueness is incorrect under concurrency (see subagent review — critical finding).
2. **Recommended global-uniqueness architecture: Shared Reference Registry (`customer_reference_registry`).** A single authoritative table (`customer_ref PRIMARY KEY`) owns the namespace. Pending and service tables reference it (FK or direct value with registry insert/delete). The registry row is created at generation time and preserved through promotion (updated to point at promoted service or kept as the persistent identity record). This is the only design that actually guarantees global uniqueness.
3. **Why selected / alternatives rejected:**
   - Separate per-table UNIQUE + atomic promotion: REJECTED — does not prevent concurrent insert into pending of a value that was just promoted (or vice versa); relies solely on transaction ordering without cross-table enforcement.
   - DB allocator/sequence: REJECTED — generates sequential IDs (not independent public references); does not solve cross-table namespace ownership.
   - Registry: SELECTED — single namespace, simple query, future lookup endpoint can use it directly, promotion copies from registry rather than from deleted pending row.
4. **Recommended reference length: 10-character alphanumeric (`JRS-` + 10 chars = 14 chars total, ~51.7 bits entropy — 36^10 ≈ 3.656e15).** 8-char (36^8) reaches ~20% collision at 10M references; 10-char stays <0.01% at 10M. Alphabet: `A-Z0-9` (36 chars, NOT Base62).
5. **Updated collision calculations (birthday bound `P ≈ 1 - exp(-n(n-1)/(2N))`):**

| Length | N (space) | Entropy | 1k | 10k | 100k | 1M | 10M |
|---|---|---|---|---|---|---|---|
| 8-char (62^8) | 2.18e14 | ~47.4 | 2.3e-09 | 2.3e-07 | 2.3e-05 | 2.3e-03 | **2.05e-01** |
| 10-char (36^10) | 3.66e15 | ~51.7 | 6.0e-13 | 6.0e-11 | 6.0e-09 | 6.0e-07 | 6.0e-05 |

6. **Legacy-reference handling (preserved).** Existing pending rows keep their truncated-UUID reference (`JRS-` + first 8 hex of UUID) — backfill with same visible value so existing customers are not disconnected. New rows use independent 10-char alphanumeric. Mixed format acceptable for continuity.
7. **Historical promoted-request handling (unchanged).** Existing `service_requests` remain with `customer_ref = NULL` (do not invent false linkage); document gap clearly.
8. **Migration sequence revised (registry first):** (1) Create `customer_reference_registry`; (2) Add nullable `customer_ref` to both tables; (3) Generate + insert registry rows; (4) Backfill pending; (5) Add FK/index; (6) Update promotion RPC to preserve registry reference; (7) Enforce NOT NULL after validation; (8) Update application display.

### Independent subagent review (read-only)
Subagent `a6ad76d8392dddbc4` reviewed this document read-only. Confirmed findings: CRITICAL — separate UNIQUE indexes do not enforce cross-table uniqueness; concurrent insert during promotion can violate namespace; CRITICAL — "atomic promotion sufficient" claim incorrect; MAJOR — legacy UUID backfill collision risk; MAJOR — duplicate promotion RPC unaddressed; MINOR — `pgcrypto` unverified; MINOR — 8-char enumeration / display-update gaps. Document updated accordingly; no implementation made.

---

# 1. Executive Summary

This document proposes a permanent `customer_ref` architecture for the Johnson Rise & Shine site. The core problem (verified by `PHASE4_OVERNIGHT_AUDIT.md`): the reference shown to a customer is derived from `pending_service_requests.id` (first 8 hex chars of UUID, prefixed `JRS-`). After promotion, the promotion RPC (`public.promote_pending_service_request`) creates a new `service_requests` row with a different UUID and deletes the pending row. There is currently no persistent `customer_ref` column in either table. The user sees a broken reference after promotion.

Recommendation (design only):
- Add an independent, random 10-character alphanumeric reference (`customer_ref`) to both `pending_service_requests` and `service_requests`, backed by a `customer_reference_registry` (PK `customer_ref`) that owns the global namespace. Registry entry preserved through promotion; promotion updates reference rather than relying solely on deleted row copy.
- Generate securely via application-level random generation before database insert.
- Preserve the reference through promotion (RPC copies it).
- Maintain `UNIQUE` indexes on `pending_service_requests.customer_ref` and `service_requests.customer_ref` as SECONDARY defensive constraints (protect against inconsistent writes). They are NOT the global uniqueness mechanism; the registry PK is.
- Handle legacy references by backfilling existing pending rows with their current visible reference (truncated UUID) to avoid disconnecting existing customers.
- Do NOT add a public lookup endpoint in this phase.

---

## 2. Verified Current-State Findings

All findings below were read-only verified. They reference specific files and lines.

### Schema (LIVE VERIFIED via SQL on `szqtawhbmldbievrtadh`)

- `pending_service_requests`: 14 columns. PK: `id uuid DEFAULT gen_random_uuid()`. Columns: `customer_name`, `phone`, `email`, `address`, `service_type` (NOT NULL); `description`, `status`, `whatsapp_confirmed`, `created_at`, `updated_at`; `verification_token_hash`, `verification_expires_at`, `verified_at` (nullable). **No `customer_ref` column exists.**
- `service_requests`: 10 columns. PK: `id uuid DEFAULT gen_random_uuid()`. Columns: `customer_name`, `address`, `service_type` (NOT NULL); `phone`, `email`, `description`, `status`, `created_at`, `updated_at`. No `whatsapp_confirmed`. **No `customer_ref` column exists.**
- `admin_users`: 6 columns. PK: `user_id uuid`. Columns: `email`, `full_name`, `role` (default `'admin'`), `created_at`, `last_login`. **No `customer_ref`.**

### RLS Policies (LIVE VERIFIED via `pg_policies`)

- `pending_service_requests`:
  - SELECT policy (`Allow admins to view pending`): roles `{authenticated}`, qual `(SELECT private.is_admin() AS is_admin)`.
  - INSERT policy (`Allow public pending inserts`): roles `{anon}`, with_check validates `customer_name` length (2–120), `status='pending'`, `whatsapp_confirmed=false`, `verification_token_hash IS NULL`, `verification_expires_at IS NULL`, `verified_at IS NULL`.
- `service_requests`:
  - SELECT (`Admins can view`): `{authenticated}` + `is_admin()`.
  - UPDATE (`Admins can update`): same.
  - INSERT (`Authenticated users can create`): `{authenticated}` + `with_check (status='pending')`.
  - **No anon INSERT policy** on `service_requests`.

### Promotion RPC (LIVE VERIFIED + subagent output + code inspection)

- `public.promote_pending_service_request(uuid) -> uuid`:
  - `SECURITY DEFINER`, owner `postgres`, `search_path=''`.
  - Requires `auth.uid() NOT NULL` and `private.is_admin() = true`.
  - Uses `PERFORM 1 FROM pending_service_requests WHERE id = p_pending_id FOR UPDATE`.
  - Checks row exists and `status = 'pending'`.
  - Copies `customer_name`, `phone`, `email`, `address`, `service_type`, `description`, `status='pending'` into `service_requests`.
  - **Does NOT copy `whatsapp_confirmed`.**
  - Deletes the pending row in the same transaction.
  - Returns the new `service_requests.id`.
- `private.is_admin()`:
  - `SECURITY DEFINER`.
  - `EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role IN ('admin','super_admin'))`.
- A duplicate private promotion function exists (includes `whatsapp_confirmed`) — **NOT modified**, documented only.

### Reference Flow (CODE VERIFIED)

- `pages/request.tsx:111`: temporary reference for WhatsApp link only (`JRS-` + timestamp + random).
- `pages/request.tsx:187`: user-facing reference: `'JRS-' + String(pendingId).slice(0, 8).toUpperCase()` (derived from `pending_service_requests.id`).
- `pages/admin/index.tsx:95`: admin pending table displays `customerRef` derived the same way (`'JRS-' + truncated UUID`).
- `pages/admin/index.tsx:363`: Confirm button displays truncated UUID as reference.
- After promotion (`pages/admin/index.tsx:233` and RPC): new `service_requests.id` returned; `pending_service_requests` row deleted. The reference shown to admin after promotion is derived from the new service UUID (`service_requests.id` truncated), not the original pending UUID.
- **Result:** customer reference continuity broken at promotion.

### Tracking / Lookup (CODE VERIFIED)

- No public lookup endpoint exists. Search of `pages/`, `src/` shows no route accepting a reference number.
- Only admin internal SELECT (via `is_admin`) and promotion API exist.
- Customer relies on saved reference + manual WhatsApp follow-up.

---

## 3. Reference Format and Collision Analysis

### Assumptions
- References are public identifiers only, not authentication credentials.
- We evaluate collision probability for random generation over the reference space.
- Birthday approximation: `P(collision) ≈ 1 - exp(-n(n-1)/(2N))`.

### Candidates Compared

| Option | Space Size (N) | Entropy (bits) | P(collision) n=1,000 | P(collision) n=10,000 | P(collision) n=100,000 | P(collision) n=1,000,000 |
|---|---|---|---|---|---|---|
| A — 8-hex UUID-derived (current) | 4,294,967,296 (16^8) | ~32 | 1.16e-04 | 1.16e-02 | 6.88e-01 | ~1.00 |
| B — 8-char alphanumeric (LEGACY NEW FORMAT ONLY — do NOT generate new) | 218,340,105,584,896 (62^8) | ~47.4 | ... |
| C — 10-char alphanumeric (AUTHORITY) | 3.66e15 (36^10) | ~51.7 | 5.95e-13 | 5.96e-11 | 5.96e-09 | 5.96e-07 |
| D — 8-char Crockford Base32 (no confusing chars) | 32^8 ≈ 1.10e+12 | ~40 | 4.55e-07 | 4.55e-05 | 4.55e-03 | ~0.50 |

### Usability Assessment

- **A (current)**: Predictable (derived from UUID); vulnerable to enumeration; not independent from internal ID; user-friendly format but security gap.
- **B (8-char)**: LEGACY NEW FORMAT ONLY. Used only for existing references already shown to customers; all NEW references MUST use 10-char. Do not generate new 8-char references.
- **C (10-char alphanumeric)**: AUTHORITY — 10 random 36-char uppercase alphanumeric chars (`[A-Z0-9]{10}`). `36^10` ≈ 3.66e+15; ~52.3 bits; format `JRS-` + 10 chars = 14 chars total (e.g., `JRS-A3K9M7QP4R`). Note: the set size is 36 (uppercase letters + digits), not 62.
- **D (Crockford)**: Removes confusing characters; slightly smaller space but still very large; slightly more complex generation.

**Recommendation (PROPOSAL ONLY — NOT IMPLEMENTED): Option C — 10-character alphanumeric (`[A-Z0-9]{10}`, 14 chars total with `JRS-` prefix). Option B (8-char) is LEGACY FORMAT ONLY — do not generate new 8-char references.**

- Format: `JRS-` + 10 random 36-char uppercase alphanumeric characters = 14 chars total (e.g., `JRS-A3K9M7QP4R`). Alphabet: `A-Z` + `0-9` (36 chars). Not Base62.
- Entropy: ~51.7 bits (`36^10` ≈ 3.656e15). At 100,000 refs: P(collision) ≈ 6e-09. At 1M: ≈ 6e-07. At 10M: ≈ 6e-05.
- Not an authentication token; must not be used for authorization. Independent of UUID.
- Legacy references (`JRS-` + 8 UUID hex chars) preserved for existing pending requests ONLY.

---

## 4. Secure Generation and Uniqueness

### Generation Options Evaluated

**A. Server-side application generation (`pages/api/verify-recaptcha.ts`)**
- Before `pending_service_requests.insert()`, generate `customer_ref` securely (e.g., `crypto.randomBytes` or secure random alphanumeric builder).
- Pass it as part of the insert payload.
- Pros: simple, fits current architecture, reference available immediately for customer response.
- Cons: requires application server availability; concurrent instances could generate same value (collision must be handled with retry or DB constraint).

**B. PostgreSQL default / function**
- If `pgcrypto` or `gen_random_bytes()` is available, a DB-side default could generate it.
- **VERIFICATION STATUS:** Not fully verified in this session. Subagent reported DB functions but did not confirm `pgcrypto` availability. If unavailable, this approach requires extension installation (requires authorization and may not be available on hosted Supabase).
- If available, advantage: generation is transactional with insert; can enforce uniqueness at DB level.
- If unavailable, we rely on application-side generation with DB UNIQUE constraint + retry.

**C. Shared reference registry / sequence**
- A separate `service_references` table or sequence could enforce global uniqueness.
- Additional complexity; over-engineered for this business. Not recommended unless database-level uniqueness across both tables is a strict requirement.

### Recommended Design (PROPOSAL ONLY) — Revised with Registry

**Architecture: Shared Reference Registry (`customer_reference_registry`)**

- Registry table (conceptual — simplified): `customer_ref TEXT PRIMARY KEY`, `created_at`, `status` (`pending` / `promoted`). The registry owns the namespace; `pending_service_requests.customer_ref` and `service_requests.customer_ref` reference the registry value. Request IDs are NOT stored in registry (avoids circular update at promotion; audit uses table joins instead).
- `pending_service_requests.customer_ref` → `TEXT UNIQUE NOT NULL`, references registry value (enforced by application; DB-level FK optional).
- `service_requests.customer_ref` → `TEXT UNIQUE NOT NULL`, same registry value preserved at promotion.
- Registry row inserted at generation time (before pending insert), `status='pending'`. At promotion: registry `status` updated to `'promoted'`; registry row NOT deleted; `customer_ref` preserved. Audit/tracking uses `pending_service_requests.id` / `service_requests.id` joins to registry by `customer_ref`, not registry-stored IDs (simpler, avoids promotion-update cycle on registry).
- This eliminates the cross-table uniqueness gap: registry PK enforces one reference globally; both service and pending reference the same registry value; concurrent inserts attempt registry insert first (fails if duplicate) before inserting into pending/service.
- Generation remains application-level (`crypto.randomBytes` → alphanumeric 10 chars) with retry (max 5 attempts) and registry-level uniqueness enforcement.

**Migration revised:**
1. Create registry; 2. Add nullable `customer_ref` to both tables; 3. Generate + insert registry rows; 4. Backfill pending (preserve truncated UUID as registry value for continuity); 5. Add registry FK/indexes; 6. Update promotion RPC (copy registry value, not deleted pending UUID); 7. Enforce NOT NULL; 8. Update app display.

**Note on previous claim (corrected):** The original statement "separate UNIQUE constraints + atomic promotion maintains global uniqueness" was incorrect. The registry is required for true global uniqueness.


## 4.5 Anonymous Submission Transaction Sequence (NEW)

For a NEW anonymous customer submission, the sequence must be:

1. Client validates form (same as today) + reCAPTCHA executed.
2. Server (`verify-recaptcha.ts`): rate limit → reCAPTCHA verify → disposable check.
3. Server generates secure 10-char `customer_ref` (`crypto.randomBytes` → alphanumeric; max 5 retries).
4. **Proposed mechanism (NOT IMPLEMENTED):** Call a `SECURITY DEFINER` database function (e.g., `public.create_customer_reference`) that:
   - Accepts the generated `customer_ref` (TEXT) and `pending_service_requests.id` (after pending insert, or passes pending row data);
   - Enforces `search_path=''` (same as promotion RPC);
   - Checks `customer_ref` format (matches `^JRS-[A-Z0-9]{10}$`);
   - Inserts into `customer_reference_registry` (`customer_ref`, `created_at`, `status='pending'`);
   - Returns the registry row (confirms creation, no exposure of other registry entries);
   - Uses `ON CONFLICT (customer_ref) DO NOTHING` or raises (collision handled by server retry before next call).
5. After registry insertion succeeds, server inserts into `pending_service_requests` with the same `customer_ref`.
6. Server responds `{ success: true, customerRef: 'JRS-...' }` to client.
7. Client displays preserved reference; no derivation from UUID.

**Why a SECURITY DEFINER function:** Anonymous clients (`anon` role) have INSERT on `pending_service_requests` but must NOT receive broad INSERT access to the registry namespace. The function acts as a trusted gate: it creates only the requested reference (validated format), never exposes other registry rows, and uses secured search_path. The anonymous user calls it through the server-side `verify-recaptcha` endpoint (which uses service-role DB access), not directly from the browser.

**Why not direct anon INSERT to registry:** Would expose namespace to arbitrary insertion/manipulation; breaks RLS principle.

**Transaction / atomicity:** Registry insert + pending insert should occur in a single database transaction. Since the application server (`verify-recaptcha`) uses `supabaseAdmin` (service role), it can execute both inserts in the same `.rpc()` or multi-statement SQL call (or through the proposed `SECURITY DEFINER` function that inserts registry and receives the reference back). The design proposes this mechanism; execution deferred until authorization.

**Collision handling (design only):**
- Server generates `customer_ref` (10-char 36-char uppercase alphanumeric, `crypto.randomInt(36)` with unbiased selection) — 5 retries max.
- Before registry insert: function attempts registry PK insert; if conflict (`ON CONFLICT` or exception), server retries with new value (max 5 total attempts).
- Registry PK provides the actual uniqueness guarantee; random generation makes collision extraordinarily unlikely (`P < 6e-05` at 10M references).
- After 5 retries, server returns 500 error (no false success).

**Legacy reference interaction (design only):**
- Existing pending rows: backfill `pending_service_requests.customer_ref` with preserved truncated UUID value (`'JRS-' || SUBSTRING(id::text,1,8)`).
- Registry insertion for legacy rows: each legacy reference must also have a registry row (same `customer_ref` value, `status='pending'` or `'promoted'` if service exists). Backfill checks registry first: if `customer_ref` already exists (collision with another legacy row or new reference), skip or document conflict — design notes collision probability of truncated UUID overlap is non-zero but verified by audit as minimal for current dataset.
- New references (`10-char` independent) must never overlap legacy truncated-UUID format (different length; format validated by function prevents insertion of 8-char value as new reference).

---
---

## 5. Existing Data and Migration Strategy

**VERIFICATION STATUS:** Read-only inspection confirms no `customer_ref` column exists. Live DB tables confirmed active. Migration design below is proposed only.

### Design Assumptions (Verified / Unverified)

- **Confirmed:** No `customer_ref` column exists in either table.
- **Confirmed:** Existing references shown to users are truncated UUIDs (8 hex chars of `pending_service_requests.id`).
- **Unknown:** Whether any existing pending rows have been shown to customers (likely yes; audit confirms working site). We assume some customers have saved references.
- **Proposal:** Existing pending references should be preserved by backfilling with the same truncated UUID value the user already received. This avoids disconnecting existing customers.
- **Proposal:** Existing promoted service rows do NOT have recoverable references (the original pending UUID is lost). For promoted rows, either leave `customer_ref` NULL or backfill with the truncated service UUID (even though the user may have the old pending reference). This is a known gap: promoted rows before the fix cannot fully recover the original reference from current schema. The design recommends documenting this limitation rather than inventing a false backfill.

### Migration Design (PROPOSAL ONLY — NOT EXECUTED)

**Stage 1 — Add column (backwards-compatible)**
```sql
-- PROPOSAL ONLY
ALTER TABLE public.pending_service_requests
ADD COLUMN IF NOT EXISTS customer_ref TEXT;

ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS customer_ref TEXT;
```
Both columns must start `NULL` (nullable) to avoid breaking existing rows.

**Stage 2 — Backfill pending rows (preserve legacy references)**
```sql
-- PROPOSAL ONLY — for pending_service_requests only
UPDATE public.pending_service_requests
SET customer_ref = 'JRS-' || SUBSTRING(id::text, 1, 8)
WHERE customer_ref IS NULL AND id IS NOT NULL;
```
This preserves the reference the user already received (truncated UUID format). Note: the format differs from future independent references; the format change is acceptable since the reference remains consistent for that customer.

**Stage 3 — Handle service_requests (optional)**
```sql
-- PROPOSAL ONLY — optional; only for consistency if needed
UPDATE public.service_requests
SET customer_ref = 'JRS-' || SUBSTRING(id::text, 1, 8)
WHERE customer_ref IS NULL AND id IS NOT NULL;
```
This assigns the truncated service UUID to promoted rows. The original customer reference (pending UUID) is lost. This must be clearly documented. A safer approach is to leave promoted `service_requests` rows with `NULL` initially and handle them separately.

**Stage 4 — Establish uniqueness constraints**
```sql
-- PROPOSAL ONLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_customer_ref
ON public.pending_service_requests(customer_ref)
WHERE customer_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_customer_ref
ON public.service_requests(customer_ref)
WHERE customer_ref IS NOT NULL;
```
Note: separate partial unique indexes are SECONDARY defensive constraints only — they protect against inconsistent writes but do NOT provide global uniqueness (confirmed: concurrent insert can violate namespace). The registry (`customer_reference_registry`) is the sole global uniqueness mechanism. Per-table indexes are kept for defense-in-depth only.

**Stage 5 — Enforce NOT NULL (after validation)**
Only after confirming all rows have valid, non-colliding references:
```sql
-- PROPOSAL ONLY — only after backfill validated
ALTER TABLE public.pending_service_requests
ALTER COLUMN customer_ref SET NOT NULL;

ALTER TABLE public.service_requests
ALTER COLUMN customer_ref SET NOT NULL;
```
**Not implemented.**

**Stage 6 — Update promotion RPC**
Modify `public.promote_pending_service_request(p_pending_id uuid)` to copy `customer_ref` from pending row into the service_requests insert:
```sql
-- PROPOSAL ONLY — change to INSERT in RPC
INSERT INTO public.service_requests (
  customer_name, phone, email, address, service_type, description,
  status, customer_ref
) SELECT ... customer_ref FROM pending_service_requests ...
```
Not executed.

**Rollback considerations:** Once a reference is given to a customer, changing it is disruptive. The design recommends a nullable start and a staged approach so rollback to NULL is possible if needed. Once references are assigned to live customers, rollback requires customer notification and does not restore the original connection.

---

## 6. Promotion RPC and Security

### Verified Behavior

- `public.promote_pending_service_request` requires `auth.uid() NOT NULL` and `private.is_admin() = true`.
- Uses `FOR UPDATE` to prevent concurrent promotion.
- Atomic (same transaction): inserts `service_requests`, deletes `pending_service_requests`.
- Does NOT copy `whatsapp_confirmed`. Does NOT copy any reference field (currently none exists).
- Returns `service_requests.id` (new UUID).

### Proposed Change (PROPOSAL ONLY — NOT IMPLEMENTED)

Modify the public promotion function to include `customer_ref` in the `INSERT` into `service_requests`, selecting it from the pending row:

```sql
-- PROPOSAL ONLY — concept for RPC update
-- In the INSERT SELECT, add customer_ref to both column list and SELECT source
INSERT INTO public.service_requests (
  customer_name, phone, email, address, service_type, description,
  status, customer_ref
)
SELECT
  customer_name, phone, email, address, service_type, description,
  'pending', customer_ref
FROM public.pending_service_requests
WHERE id = p_pending_id;
```

The `DELETE` remains unchanged. The `RETURNING id` remains the new UUID (`service_requests.id`). The `customer_ref` is preserved through promotion.

**Security constraints preserved:**
- `SECURITY DEFINER`, `search_path=''`, `FOR UPDATE`, auth check, admin check unchanged.
- No service-role authorization added.
- RLS unchanged.
- No new lookup endpoint added.

### Duplicate Private Function

A private promotion function (includes `whatsapp_confirmed`) exists in the live DB but is not referenced by the application (the app uses the unqualified name `promote_pending_service_request`, which resolves to `public.`). This introduces maintenance risk: future database changes might inadvertently modify the private version or change resolution order. **This design document does NOT propose modifying or removing the duplicate function.** A separate authorization phase is required to drop or reconcile it.

---

## 7. Application Changes to Propose

### `pages/api/verify-recaptcha.ts` (PROPOSAL ONLY — NOT IMPLEMENTED)

Before the `pending_service_requests.insert()` call (line 89 in current source), generate and include `customer_ref`:

```typescript
// PROPOSAL ONLY — illustrative only, not executed
const customerRef = 'JRS-' + generateSecureAlphanumeric(10);
```

Pass `customer_ref: customerRef` in the `.insert()` payload.

Keep existing order: rate limit check → reCAPTCHA verification → disposable email check → insert.

### `pages/request.tsx` (PROPOSAL ONLY — NOT IMPLEMENTED)

After a successful server response, instead of deriving `refNumber` from `verifyData.pendingId`, read it from the server response:

```typescript
// PROPOSAL ONLY — illustrative
setRefNumber(verifyData.customerRef || verifyData.pendingId); // with appropriate formatting
```

The server (`verify-recaptcha`) must return the same `customer_ref` it inserted. The WhatsApp temporary reference (`line 111`) should remain separate and independent to avoid changing the WhatsApp link behavior unexpectedly.

Keep existing validation, scroll behavior (`scrollToFirstError`), disposable email rejection, submission state, and error handling.

### `pages/admin/index.tsx` (PROPOSAL ONLY — NOT IMPLEMENTED)

Modify the pending table (`line 95`) and confirmed service table (`line 78`) to display `r.customerRef` instead of deriving from UUID. Modify promotion success message (`line 221`) to show the preserved `customer_ref` rather than a truncated new UUID.

Keep working Confirm button (`line 359`), admin auth flow (`handleLogin`), error scrolling (`scrollToError`), 60-second refresh (`useEffect` interval), and CSV export.

---

## 8. Security and RLS Considerations

- `customer_ref` must not become an authentication mechanism. It is an identifier only.
- A future lookup feature (if authorized in a separate phase) must require confirmation (name + reference, or phone + reference) and must be rate-limited. No lookup feature is proposed in this design.
- RLS policies on `pending_service_requests` must not change to expose references to anon users. The current SELECT policy (`authenticated` + `is_admin()`) is appropriate. The INSERT policy (`anon`) allows the new `customer_ref` field without risk since it does not expose other records.
- `service_requests` SELECT remains admin-only; INSERT remains `authenticated` with `status='pending'` check. `customer_ref` insertion via promotion (authenticated admin call to RPC) complies with current policies.
- Unique constraints prevent duplicate references but do not provide authorization. Authorization must remain through the existing Bearer-token auth and admin check.

---

## 9. Testing and Verification Plan (PROPOSED ONLY — NOT EXECUTED)

The following tests should be executed only after an explicit future authorization to implement:

1. Customer submits request → `pending_service_requests` row created with `customer_ref`.
2. Customer receives reference matching DB value.
3. Admin sees same `customer_ref` in pending table.
4. Admin promotes request → promotion succeeds.
5. `service_requests` row contains same `customer_ref`.
6. Pending row deleted; no duplicate reference exists in both tables.
7. Internal `service_requests.id` remains different from `pending_service_requests.id` (verified by comparison).
8. Duplicate promotion attempt fails safely (`FOR UPDATE` + status check).
9. Unauthorized promotion attempt (non-admin) returns error; no DB mutation.
10. Concurrent submissions: unique constraint prevents duplicate references; application retries or handles safely.
11. Backfill: existing pending rows receive consistent legacy references; no duplicate values created.
12. Existing promoted rows: either backfilled with truncated service UUID or left NULL; no false linkage.
13. Disposable email blocked before insert (`customer_ref` must not be generated for rejected submissions).
14. Rate limit remains effective (`customer_ref` does not bypass it).
15. No secrets leaked in responses; `customer_ref` only returned to authorized users.
16. Normal production flow continues without interruption.

---

## 10. Rollback and Deployment Sequencing

**Not executed.** Proposed sequence for future authorization:

1. **Preparation:** Confirm `pgcrypto` availability (or rely on app-level generation).
2. **Migration Step 1:** Add nullable `customer_ref` columns to both tables (backwards-compatible).
3. **Backfill Step:** Backfill existing `pending_service_requests` with preserved truncated UUID references.
4. **Migration Step 2:** Add partial unique indexes.
5. **Migration Step 3:** Update promotion RPC.
6. **Migration Step 4 (optional):** Backfill promoted rows or set `NOT NULL` (only after validation).
7. **Application Update:** Modify `verify-recaptcha.ts`, `request.tsx`, `admin/index.tsx`, promotion message.
8. **Testing:** Execute proposed tests (section 9).
9. **Deployment:** Standard Vercel deployment; no special configuration changes required.
10. **Rollback:** Since `customer_ref` is nullable initially, rollback can revert to NULL for new rows; existing customer references given to users cannot be silently revoked. Document rollback limitations clearly.

---

## 11. Unverified Assumptions and Decisions Requiring Approval

- **UNVERIFIED:** Whether `pgcrypto` extension is installed and whether `gen_random_bytes()` is available. Subagent did not confirm extension status. Design assumes app-level generation (does not require DB extension), with DB-side generation noted as conditional.
- **UNVERIFIED:** Whether any existing customers have saved a reference based on the truncated UUID format and whether they would expect the same reference after promotion. Audit confirms working site; we assume yes.
- **UNVERIFIED:** Whether any other insert path to `pending_service_requests` exists outside `verify-recaptcha.ts`. Search confirmed only that path.
- **DECISION NEEDED:** Whether promoted `service_requests` rows should backfill with their truncated UUID or remain NULL. Recommendation: leave NULL to avoid false linkage; clearly document this gap.
- **DECISION NEEDED:** Whether a future public lookup endpoint is required. This design explicitly excludes it (out of scope for Phase 4B).
- **DECISION NEEDED:** Whether the duplicate private promotion function (`include whatsapp_confirmed`) requires removal. This design does not modify it. A separate authorization phase is required.
- **DECISION NEEDED:** Whether the `customer_ref` format should change from the current truncated UUID (for legacy pending rows) to the new independent format. Recommendation: legacy rows preserve their existing visible reference; new rows use new format. This creates two reference formats in the system, which is acceptable for continuity.

---

## 12. Phased Implementation Checklist (Future Phase — Not Executed)

Only to be executed with separate authorization:

- [ ] Confirm `pgcrypto` / DB-side random function availability (optional, not required for app-level design).
- [ ] Create SQL migration: add `customer_ref` columns (nullable).
- [ ] Create SQL backfill: preserve legacy references in pending rows.
- [ ] Create SQL unique partial indexes.
- [ ] Modify promotion RPC (design only documented; execution deferred).
- [ ] Modify `pages/api/verify-recaptcha.ts` (generate + include reference).
- [ ] Modify `pages/request.tsx` (display server-provided reference).
- [ ] Modify `pages/admin/index.tsx` (display same reference before/after promotion; update promotion success message).
- [ ] Run proposed tests.
- [ ] Deploy.

---

## 13. References and Evidence Index

- `pages/request.tsx`: reference generation (`line 111`: temporary WhatsApp ref; `line 187`: user-visible truncated UUID), submit flow, validation, scroll helper.
- `pages/admin/index.tsx`: admin pending table (`line 95`: `customerRef` derived from UUID; `line 363`: Confirm button), service_requests display (`line 78`: `r.ref` from UUID), promotion flow (`line 202`: `promotePending` with Bearer token), auto-refresh (`line 111`).
- `pages/api/verify-recaptcha.ts`: reCAPTCHA verification, rate limit (`line 34`), disposable check (`line 83`), DB insert (`line 89`).
- `pages/api/promote-request.ts`: auth validation (`line 62`), user-scoped client (`line 55`), promotion call (`line 78`).
- `migrations/001_service_requests.sql`: service_requests schema (no `customer_ref`).
- `migrations/005_pending_service_requests.sql`: pending schema alignment (token hash, expires, verified; no `customer_ref`).
- `migrations/007_promote_pending_service_request.sql`: promotion RPC definition (copies selected columns; excludes `whatsapp_confirmed`).
- `PHASE4_OVERNIGHT_AUDIT.md`: second-pass verification (live DB schema, RLS, promotion functions, admin_users schema).
- Live DB (`szqtawhbmldbievrtadh`, Postgres 17.6.1.166): schema verified via SQL; RLS policies via `pg_policies`; promotion function definition via `pg_proc` (subagent verified); no `customer_ref` column present.
- `src/lib/disposable-blocklist.ts`: `isDisposableEmail()` export (`line 8874`).

---

## 14. Security Summary

- Reference format (`JRS-` + 10 random alphanumeric chars): not authentication token; independent of UUID; ~59.5 bits entropy; collision P at 10M ≈ 6e-05.
- Generation: application-level (`crypto.randomBytes` → alphanumeric 10 chars) with retry; DB-side (`pgcrypto`) conditional/unverified.
- Uniqueness: shared `customer_reference_registry` table (PK `customer_ref`) owns namespace; both `pending_service_requests` and `service_requests` reference it. Registry never deleted. This guarantees global uniqueness; separate table UNIQUE indexes alone do NOT.
- Authorization: unchanged (Bearer-token auth, `is_admin()` check, `FOR UPDATE` lock, RLS preserved).
- Authorization: unchanged (Bearer-token auth, `is_admin()` check, `FOR UPDATE` lock).
- RLS: unchanged; `customer_ref` insertion complies with existing policies.
- No public lookup endpoint added; no authorization bypass; no service-role shortcut.
- No customer personal data exposed; no secrets in design document; no secret values printed.

---

## 15. Final Statement

This is a design-only proposal (`CUSTOMER_REF_DESIGN.md`) for Phase 4B. It provides a complete architecture for a persistent, secure customer reference system, including reference format analysis, collision calculations, secure generation strategy, migration design, promotion RPC change proposal, application change proposal, and security analysis. Nothing in this document has been implemented. No source files were edited. No database schema or data was changed. No deployment occurred. The promotion RPC, authentication flow, RLS, and existing application behavior remain untouched.

**Next action:** Wait for explicit authorization before creating any SQL migration, editing any source file, or deploying any change.
