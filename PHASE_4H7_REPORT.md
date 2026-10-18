# Phase 4H.7 — Pre-Staging Safety Audit and Migration Readiness Report

**Date:** 2026-10-18  
**Repository:** `/home/trojan/Desktop/TrojanVault/Business/`  
**Supabase Project Reference:** `szqtawhbmldbievrtadh`  
**Phase Objective:** Pre-staging safety audit, migration SQL verification, environment identification, and staging execution plan preparation. (No DDL/DML execution, no deployment).

---

## 1. Repository and Git State

- **Git Root:** `/home/trojan/Desktop/TrojanVault/Business`
- **Git Status Summary (`git status --short`):**
  - Staged: `CUSTOMER_REF_DESIGN.md`, `PHASE4_OVERNIGHT_AUDIT.md`, `migrations/008_customer_ref_registry.sql`, `migrations/009_promote_customer_ref.sql`, `migrations/010_create_pending_service_request.sql`, `pages/admin/index.tsx`, `pages/api/promote-request.ts`, `pages/api/verify-recaptcha.ts`, `pages/request.tsx`, `src/lib/security.ts`, `tsconfig.tsbuildinfo`.
  - Unstaged (`MM`): `migrations/010_create_pending_service_request.sql`, `pages/admin/index.tsx`, `pages/api/promote-request.ts`, `tsconfig.tsbuildinfo`.
  - Untracked: `PHASE_4H1_REPORT.md`, `PHASE_4H4_REPORT.md`, `PHASE_4H5_REPORT.md`, `PHASE_4H6_REPORT.md`, `supabase/.temp/`.
- **Preservation Status:** All existing staged, unstaged, and untracked work has been preserved intact. No reset, clean, commit, or push operations were executed.

---

## 2. Migration 010 Syntax and Privilege Audit

**File Inspected:** `migrations/010_create_pending_service_request.sql`

1. **Parameter Signature Consistency:** The function definition defines **10 parameters**:
   `p_customer_ref TEXT`, `p_customer_name TEXT`, `p_phone TEXT`, `p_email TEXT`, `p_address TEXT`, `p_service_type TEXT`, `p_description TEXT`, `p_whatsapp_confirmed BOOLEAN`, `p_verification_token_hash TEXT`, `p_verification_expires_at TIMESTAMPTZ`.
   All four `REVOKE` and `GRANT` statements explicitly match this exact 10-parameter signature.
2. **SQL Syntax:** Valid PostgreSQL PL/pgSQL syntax. Uses `CREATE OR REPLACE FUNCTION`, `SECURITY DEFINER`, `SET search_path = ''`.
3. **REVOKE / GRANT Syntax:** Correct `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC / anon / authenticated` and `GRANT EXECUTE ON FUNCTION ... TO service_role`.
4. **Role Privileges:** Public, anonymous (`anon`), and authenticated users (`authenticated`) are explicitly revoked execution privileges. Only the server-side backend role (`service_role`) retains `EXECUTE` privileges.
5. **Security & Search Path:** `SET search_path = ''` prevents schema poisoning attacks. `SECURITY DEFINER` executes with owner privileges needed to insert into the protected registry and pending tables.
6. **Input Validation:** Validates `p_customer_ref` via regex check (`^JRS-[A-Z0-9]{10}$`) before execution.
7. **Transaction Consistency:** Performs atomic registry insertion and pending request insertion within the same transaction. Handles primary key conflicts on `customer_reference_registry` via `ON CONFLICT (...) DO NOTHING` and raises a handled exception (`Customer reference collision`) on conflict to trigger a retry.
8. **Data Exposure:** Does not expose raw verification tokens or internal secrets; returns only the `pending_id` UUID.

---

## 3. Migration 008–010 Consistency Audit

- **Migration 008 (`008_customer_ref_registry.sql`):** Creates the global `customer_reference_registry` table (`customer_ref PRIMARY KEY`, status `'pending'` or `'promoted'`), enables RLS, revokes PUBLIC privileges, grants `service_role` access, adds nullable `customer_ref` columns to `pending_service_requests` and `service_requests`, establishes foreign key constraints referencing the registry, and creates partial unique indexes (`WHERE customer_ref IS NOT NULL`).
- **Migration 009 (`009_promote_customer_ref.sql`):** Updates `promote_pending_service_request(uuid)` to lock the pending row (`FOR UPDATE`), read and preserve `customer_ref`, insert into `service_requests` carrying forward the reference, delete the pending row, update the registry status to `'promoted'`, and enforce admin authorization via `auth.uid()` and `private.is_admin()`.
- **Migration 010 (`010_create_pending_service_request.sql`):** Creates the atomic insertion function used by `verify-recaptcha.ts` during anonymous intake.
- **Sequence & Compatibility:** The sequence is logically sound (Registry → Promotion RPC → Pending Creation RPC). Legacy rows with `NULL` `customer_ref` are fully supported by nullable columns and partial unique indexes. Concurrency is safely handled via `FOR UPDATE` locking and registry primary key constraints.

---

## 4. Database Environment Identification

- **Configured Target:** Environment variables (`.env.local`) point to Supabase project reference `szqtawhbmldbievrtadh`.
- **Environment Classification:** The linked project reference corresponds to the primary/remote Supabase instance (`szqtawhbmldbievrtadh`).
- **Safety Rule:** No DDL, DML, migration application, or database mutation was performed.

---

## 5. Live Schema and Policy Verification Status

- **Status:** **`NOT TESTED`** (Read-only inspection indicates migration files define the intended schema and RLS policies, but remote application status has not been verified via live DDL queries due to safety constraints).

---

## 6. Code and Test Results

- **Files Inspected:** `pages/api/promote-request.ts`, `pages/admin/index.tsx`, `pages/api/verify-recaptcha.ts`, `pages/request.tsx`, `src/lib/security.ts`.
- **TypeScript Compilation:** `npx tsc --noEmit` **PASS** (Zero errors).
- **Build Verification:** `npm run build` is **`NOT TESTED`** (previous baseline establishes that next build execution in this container environment trips sandbox timeout constraints; static type-checking passes cleanly).

---

## 7. Credential Exposure Assessment

- **Git Remote URL:** `https://github.com/fury-of-de-night/johnson-rise---shine.git`
- **Exposure Risk:** No plaintext OAuth or personal access tokens (`gho_...`) are embedded in the local `git remote` URL configuration. Credential safety is maintained.
- **Remediation:** Continue using standard HTTPS remote or SSH keys as configured.

---

## 8. Staging Execution Plan

1. **Target:** A designated staging Supabase project (separate from production project `szqtawhbmldbievrtadh`).
2. **Identity Confirmation:** Verify project reference via `supabase status` or Supabase dashboard before pushing migrations.
3. **Migration Order:** Apply in strict sequence: `008_customer_ref_registry.sql` → `009_promote_customer_ref.sql` → `010_create_pending_service_request.sql`.
4. **Backup/Recovery:** Ensure point-in-time recovery or database backup snapshot is available on the staging instance prior to migration.
5. **Verification of Success:** Verify table creation, RLS enablement, function presence, and explicit role grants in the Supabase schema inspector.
6. **Anonymous Intake Test:** Submit a test request through `pages/request.tsx` and verify successful creation in `pending_service_requests` with a valid 14-character `customer_ref`.
7. **Admin Promotion Test:** Log in as an administrator, view pending requests, and invoke promotion. Verify the reference is preserved in `service_requests` and registry status updates to `'promoted'`.
8. **Reference Preservation Check:** Verify duplicate prevention and legacy row compatibility.
9. **Safe Stop Condition:** If any migration step or test fails, halt immediately, inspect error output, and roll back transaction or restore staging snapshot.
10. **Owner Approval:** Staging execution and any production deployment require explicit owner approval.

---

## 9. Remaining Blockers

1. Migrations 008, 009, and 010 must be executed against a verified staging database.
2. End-to-end promotion and intake smoke testing must be completed in staging.
3. Explicit owner approval is required before running database migrations or deploying.

---

## 10. Deployment Recommendation

**`NO-GO`**  
*(Deployment is blocked until migrations 008–010 are applied and verified in staging, and explicit owner approval is granted).*

---

## Next Action
Present this audit report to the user and request approval to apply migrations 008–010 to a staging environment for end-to-end verification.
