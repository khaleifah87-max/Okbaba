-- Update user_type check constraint
ALTER TABLE public.profiles DROP CONSTRAINT profiles_user_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check 
  CHECK (user_type IN ('customer', 'technician', 'admin', 'support', 'finance'));

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text, -- 'user', 'booking', 'report', etc.
  target_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_note text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);