-- Migration 009: Update promotion RPC to preserve customer_ref (design-only proposal; NOT executed against live DB without authorization)
-- The promotion function copies customer_ref from the pending row into service_requests,
-- deletes the pending row, and advances the registry lifecycle status to 'promoted'.
-- Authorization is fail-closed: NULL from private.is_admin() is treated as forbidden.

CREATE OR REPLACE FUNCTION public.promote_pending_service_request(p_pending_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_new_request_id uuid;
    v_status text;
    v_customer_ref text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: must be authenticated';
    END IF;
    IF private.is_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'Forbidden: admin role required';
    END IF;

    -- Lock the pending row and read status + customer_ref in one pass so the
    -- status check cannot race with a concurrent promotion.
    SELECT status, customer_ref
      INTO v_status, v_customer_ref
      FROM public.pending_service_requests
     WHERE id = p_pending_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending request not found';
    END IF;
    IF v_status <> 'pending' THEN
        RAISE EXCEPTION 'Request is no longer pending';
    END IF;

    INSERT INTO public.service_requests (
        customer_name, phone, email, address, service_type, description,
        status, customer_ref
    )
    SELECT
        customer_name, phone, email, address, service_type, description,
        'pending', customer_ref
    FROM public.pending_service_requests
    WHERE id = p_pending_id
    RETURNING id INTO v_new_request_id;

    DELETE FROM public.pending_service_requests WHERE id = p_pending_id;

    -- Advance the registry lifecycle status. The registry row is permanent
    -- (never deleted); this marks the reference as promoted.
    IF v_customer_ref IS NOT NULL THEN
        UPDATE public.customer_reference_registry
           SET status = 'promoted'
         WHERE customer_ref = v_customer_ref;
    END IF;

    RETURN v_new_request_id;
END;
$$;

-- The admin endpoint (pages/api/promote-request.ts) calls this RPC as the
-- authenticated user via a Bearer token, so EXECUTE is granted to
-- 'authenticated' only. Default PUBLIC / anon execution is revoked to close
-- the anonymous-callable privileged write path.
REVOKE EXECUTE ON FUNCTION public.promote_pending_service_request(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.promote_pending_service_request(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.promote_pending_service_request(uuid) TO authenticated;