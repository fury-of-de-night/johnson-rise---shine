CREATE TABLE IF NOT EXISTS public.rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip text NOT NULL,
    count int NOT NULL DEFAULT 1,
    reset_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_reset ON public.rate_limits(ip, reset_at);
