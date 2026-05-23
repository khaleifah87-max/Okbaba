ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolver_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS resolution_notes text;

-- Add constraint to prevent self-reporting
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS no_self_report;
ALTER TABLE public.reports ADD CONSTRAINT no_self_report CHECK (reporter_id <> reported_user_id);