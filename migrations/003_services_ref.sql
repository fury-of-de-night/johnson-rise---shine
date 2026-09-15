-- 003_services_ref: landscaping service reference catalogue
CREATE TABLE IF NOT EXISTS public.services_ref (
    id serial PRIMARY KEY,
    service_name text NOT NULL UNIQUE,
    category text NOT NULL CHECK (category IN ('lawn_care','hardscaping','irrigation','tree_service','clean_up')),
    base_price numeric(10,2),
    estimated_duration_hours int,
    description text,
    active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_srv_category ON public.services_ref(category);
CREATE INDEX IF NOT EXISTS idx_srv_active ON public.services_ref(active) WHERE active = true;
