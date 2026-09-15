CREATE TABLE IF NOT EXISTS public.pending_service_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name text NOT NULL,
    phone text,
    email text,
    address text NOT NULL,
    service_type text NOT NULL,
    description text,
    status text DEFAULT 'pending',
    whatsapp_confirmed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    verification_token text
);
ALTER TABLE public.pending_service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS anon_insert_pending ON public.pending_service_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS anon_select_pending ON public.pending_service_requests FOR SELECT TO anon USING (true);
CREATE INDEX IF NOT EXISTS idx_pending_created ON public.pending_service_requests(created_at DESC);
