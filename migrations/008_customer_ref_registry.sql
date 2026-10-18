-- Phase 4B: customer_reference_registry (design-only proposal NOT executed)
-- Registry is the GLOBAL, PERMANENT uniqueness authority for customer references
-- (namespace "JRS-XXXXXXXXXX"). It is not deleted at any point in the lifecycle.
-- RLS is enabled and default PUBLIC privileges are revoked, so only the
-- server-side backend role (service_role) can access it directly.

CREATE TABLE IF NOT EXISTS public.customer_reference_registry (
  customer_ref TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','promoted'))
);

-- Enable RLS so that non-bypass roles (anon / authenticated / customers)
-- cannot see or write registry rows directly.
ALTER TABLE public.customer_reference_registry ENABLE ROW SECURITY;

-- Revoke the default PUBLIC table privileges on a freshly created table so
-- that anonymous/unauthenticated clients cannot insert or query the registry.
REVOKE ALL ON public.customer_reference_registry FROM PUBLIC;

-- Only the server-side backend role has direct access (used by the atomic
-- creation RPC and by the admin promotion update). service_role bypasses RLS.
GRANT ALL ON public.customer_reference_registry TO service_role;

ALTER TABLE public.pending_service_requests
  ADD COLUMN IF NOT EXISTS customer_ref TEXT;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS customer_ref TEXT;

-- Foreign keys enforce that every non-NULL customer_ref references a reserved
-- registry entry, preserving referential integrity. Legacy rows remain NULL
-- and are unaffected by the constraint.
ALTER TABLE public.pending_service_requests
  ADD CONSTRAINT IF NOT EXISTS fk_pending_service_requests_customer_ref
  FOREIGN KEY (customer_ref)
  REFERENCES public.customer_reference_registry (customer_ref)
  ON DELETE NO ACTION;

ALTER TABLE public.service_requests
  ADD CONSTRAINT IF NOT EXISTS fk_service_requests_customer_ref
  FOREIGN KEY (customer_ref)
  REFERENCES public.customer_reference_registry (customer_ref)
  ON DELETE NO ACTION;

-- Partial unique indexes guarantee uniqueness of non-NULL customer_ref within
-- each request table (registry PK is the global uniqueness source).
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_customer_ref
  ON public.pending_service_requests(customer_ref) WHERE customer_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_customer_ref
  ON public.service_requests(customer_ref) WHERE customer_ref IS NOT NULL;
