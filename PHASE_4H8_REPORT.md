# Phase 4H.8 — Confirm Staging Target and Prepare Execution Report

**Date:** 2026-10-18  
**Repository:** `/home/trojan/Desktop/TrojanVault/Business/`  
**Primary Supabase Project Reference:** `szqtawhbmldbievrtadh`  
**Phase Objective:** Confirm staging target, validate migration SQL, and prepare a safe, explicit execution plan. (No database modifications executed).

---

## 1. Confirmed Staging Project Reference

- **Status:** **`NOT FOUND`**
- **Evidence Used:**
  - Local Supabase CLI metadata (`supabase/.temp/linked-project.json`) points only to the primary project reference `szqtawhbmldbievrtadh` (named "JohnsonRisenShine").
  - Running `supabase status` in the project directory returned `Not linked.` and failed to inspect container health.
  - No separate staging project reference, configuration file, or local environment variable was found.
- **Owner Action Required:** The owner must create a separate staging Supabase project in the Supabase dashboard, copy the primary database schema (without production data) to it, and provide the staging project reference (`ref`) and an access token for CLI authentication.

---

## 2. Migration Audit Results

- **Migration 008 (`008_customer_ref_registry.sql`):** Establishes the registry table, nullable `customer_ref` columns, foreign keys, partial unique indexes, and correct RLS access rules.
- **Migration 009 (`009_promote_customer_ref.sql`):** Correctly updates the promotion RPC to preserve the customer reference, lock pending rows, and update the registry status.
- **Migration 010 (`010_create_pending_service_request.sql`):** Features valid 10-parameter function signatures, correct `REVOKE`/`GRANT` syntax, appropriate `SECURITY DEFINER` settings, and strict server-only execution permissions.
- **Consistency & Compatibility:** The sequence is logically sound, does not rely on undocumented remote schema changes, and preserves legacy compatibility for null-reference requests.
- **Remaining Defects:** None. All three files are syntactically and logically correct.

---

## 3. Exact Staging Migration Commands (With Safeguards)

Before executing any command, the owner must verify the staging project reference locally and via the CLI:

```bash
# 1. Verify the active project reference matches the staging target
supabase projects list | grep <STAGING_PROJECT_REF>

# 2. Link the CLI to the staging project
supabase link --project-ref <STAGING_PROJECT_REF>

# 3. Verify the linked reference before applying any migration
supabase status | grep "Project ref"
```

**Migration Application Sequence (Staging Only):**
```bash
# Apply migrations in strict order
supabase migration up --db-url "$STAGING_DB_URL" --migration-file 008_customer_ref_registry.sql
supabase migration up --db-url "$STAGING_DB_URL" --migration-file 009_promote_customer_ref.sql
supabase migration up --db-url "$STAGING_DB_URL" --migration-file 010_create_pending_service_request.sql
```
*(Note: `$STAGING_DB_URL` must be explicitly set to the staging project's connection string, never the primary project's connection string).*

---

## 4. Verification and Recovery Plan

### Verification Steps
1. **Schema Verification:** Confirm `customer_reference_registry` table, nullable `customer_ref` columns, foreign keys, partial indexes, and RLS are active.
2. **Privilege Verification:** Confirm `service_role` has `EXECUTE` on `create_pending_service_request` and `authenticated` has `EXECUTE` on `promote_pending_service_request`.
3. **Anonymous Intake Test:** Submit a synthetic request via `pages/request.tsx` and verify successful creation in `pending_service_requests` with a valid 14-character `customer_ref`.
4. **Admin Promotion Test:** Log in as an administrator, view pending requests, and invoke promotion. Verify the reference is preserved in `service_requests` and registry status updates to `'promoted'`.
5. **Concurrency & Duplicate Handling:** Attempt concurrent promotions on the same request and verify only one succeeds.
6. **Legacy Null-Reference Test:** Promote a request with a null `customer_ref` and verify it succeeds without registry updates.
7. **Error Handling & Recovery:** Verify clean module unloading and default sink restoration on application close or `SIGINT`.

### Recovery Steps
If any migration step or test fails, halt immediately, inspect error output, and restore the staging database snapshot.

---

## 5. Remaining Owner Actions

1. Create a separate staging Supabase project and copy the primary schema (without production data).
2. Provide the staging project reference and database connection string.
3. Explicitly authorize the staging migration execution.

---

## 6. Statement of Safety

**No database changes, migrations, or schema modifications were executed during this phase.** The repository state remains fully preserved.