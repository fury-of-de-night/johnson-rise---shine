-- Migration 010 (REVISED): Atomic SECURITY DEFINER function for registry + pending creation
-- NOT EXECUTED — design-only proposal requiring authorization before execution.
-- Performs BOTH registry insert and pending_service_requests insert in ONE DB transaction.

CREATE OR REPLACE FUNCTION public.create_pending_service_request(
  p_customer_ref TEXT,
  p_customer_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_address TEXT,
  p_service_type TEXT,
  p_description TEXT,
  p_whatsapp_confirmed BOOLEAN DEFAULT false,
  p_verification_token_hash TEXT DEFAULT NULL,
  p_verification_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pending_id UUID;
BEGIN
  -- 1. Validate reference format (36-char uppercase alphanumeric, JRS- prefix, 10 chars)
  IF p_customer_ref IS NULL OR p_customer_ref !~ '^JRS-[A-Z0-9]{10}$' THEN
    RAISE EXCEPTION 'Invalid customer reference format: %', p_customer_ref;
  END IF;

  -- 2. Atomic registry + pending insert (single DB transaction / single function call)
  -- Registry owns namespace via PRIMARY KEY; conflict rolls back entirely.
  INSERT INTO public.customer_reference_registry (customer_ref, status)
  VALUES (p_customer_ref, 'pending')
  ON CONFLICT (customer_ref) DO NOTHING;

  IF NOT FOUND THEN
    -- Conflict = duplicate reference; the caller (service-role server) retries with new value.
    RAISE EXCEPTION 'Customer reference collision: %', p_customer_ref;
  END IF;

  -- Insert pending row with the same validated customer_ref
  INSERT INTO public.pending_service_requests (
    customer_name, phone, email, address, service_type, description,
    status, whatsapp_confirmed, customer_ref,
    verification_token_hash, verification_expires_at
  ) VALUES (
    p_customer_name, p_phone, p_email, p_address, p_service_type, p_description,
    'pending', p_whatsapp_confirmed, p_customer_ref,
    p_verification_token_hash, p_verification_expires_at
  )
  RETURNING id INTO v_pending_id;

  RETURN v_pending_id;
END;
$$;

-- Security: PostgreSQL grants EXECUTE to PUBLIC by default on new functions.
-- Explicitly revoke from all non-server roles; grant only to the verified
-- server-side backend role that calls this via supabaseAdmin (service_role).
-- Full 10-parameter signature:
-- (p_customer_ref, p_customer_name, p_phone, p_email, p_address, p_service_type,
--  p_description, p_whatsapp_confirmed, p_verification_token_hash, p_verification_expires_at)
REVOKE EXECUTE ON FUNCTION public.create_pending_service_request(
  text, text, text, text, text, text, text, boolean, text, timestamp with time zone
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_pending_service_request(
  text, text, text, text, text, text, text, boolean, text, timestamp with time zone
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_pending_service_request(
  text, text, text, text, text, text, text, boolean, text, timestamp with time zone
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_service_request(
  text, text, text, text, text, text, text, boolean, text, timestamp with time zone
) TO service_role;
