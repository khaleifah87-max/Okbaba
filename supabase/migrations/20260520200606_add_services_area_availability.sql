ALTER TABLE public.technician_profiles 
  ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS service_area jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;