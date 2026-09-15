-- 001_service_requests: service request table with RLS (anon insert, admin full access)
CREATE TABLE IF NOT EXISTS public.service_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name text NOT NULL,
    phone text,
    email text,
    address text NOT NULL,
    service_type text NOT NULL,
    description text,
    status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sr_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_sr_created ON public.service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sr_customer ON public.service_requests(customer_name);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_insert ON public.service_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY admin_select ON public.service_requests FOR SELECT TO admin USING (true);
CREATE POLICY admin_update ON public.service_requests FOR UPDATE TO admin USING (true) WITH CHECK (true);
CREATE POLICY admin_delete ON public.service_requests FOR DELETE TO admin USING (true);
