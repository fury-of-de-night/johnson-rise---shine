-- Migration 007: Atomic promotion function for pending service requests
-- Replaces broken version: fixes column mismatch (whatsapp_confirmed),
-- PERFORM syntax, RETURNING clause, search_path hardening.

-- Drop existing function if present (from broken migration or manual creation)
DROP FUNCTION IF EXISTS public.promote_pending_service_request(uuid);

CREATE OR REPLACE FUNCTION public.promote_pending_service_request(p_pending_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_new_request_id uuid;
BEGIN
    -- 1. Must be an authenticated user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: must be authenticated';
    END IF;

    -- 2. Must be an admin (admin or super_admin in admin_users)
    IF private.is_admin() = false THEN
        RAISE EXCEPTION 'Forbidden: admin role required';
    END IF;

    -- 3. Lock the pending row FOR UPDATE to prevent concurrent promotion
    PERFORM 1
    FROM public.pending_service_requests
    WHERE id = p_pending_id
    FOR UPDATE;

    -- 4. Verify the row exists and has status = 'pending'
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending request not found: %', p_pending_id;
    END IF;

    IF (
        SELECT status
        FROM public.pending_service_requests
        WHERE id = p_pending_id
    ) <> 'pending' THEN
        RAISE EXCEPTION 'Request is no longer pending';
    END IF;

    -- 5. Copy to service_requests (only columns that exist in service_requests).
    --    whatsapp_confirmed is NOT in service_requests — intentionally excluded.
    INSERT INTO public.service_requests (
        customer_name,
        phone,
        email,
        address,
        service_type,
        description,
        status
    )
    SELECT
        customer_name,
        phone,
        email,
        address,
        service_type,
        description,
        'pending'
    FROM public.pending_service_requests
    WHERE id = p_pending_id
    RETURNING id INTO v_new_request_id;

    -- 6. Delete the pending row (same transaction — atomic with the INSERT)
    DELETE FROM public.pending_service_requests
    WHERE id = p_pending_id;

    -- 7. Return the new service_requests row ID
    RETURN v_new_request_id;
END;
$$;

-- Grant execute to authenticated role only (not anon)
GRANT EXECUTE ON FUNCTION public.promote_pending_service_request(uuid) TO authenticated;
