-- Migration 005: Add missing verification token hash and timestamp columns
-- Live DB schema has: verification_token_hash, verification_expires_at, verified_at
-- Repository schema currently has: verification_token (single column)

-- Add missing columns to align repository schema with live DB
ALTER TABLE public.pending_service_requests ADD COLUMN verification_token_hash text;
ALTER TABLE public.pending_service_requests ADD COLUMN verification_expires_at timestamptz;
ALTER TABLE public.pending_service_requests ADD COLUMN verified_at timestamptz;

-- Create index on verification_token_hash for efficient lookups
CREATE INDEX IF NOT EXISTS idx_pending_service_requests_token_hash ON public.pending_service_requests(verification_token_hash);
