-- Clean up existing SELECT policies to avoid conflicts
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view technician profiles" ON public.profiles;

-- Create new SELECT policy for profiles
-- Allows viewing technicians or own profile
CREATE POLICY "Anyone can view technician profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (user_type = 'technician' OR auth.uid() = id);

-- Clean up existing SELECT policies for technician_profiles
DROP POLICY IF EXISTS "Technician profiles viewable by everyone" ON public.technician_profiles;
DROP POLICY IF EXISTS "Anyone can view technician details" ON public.technician_profiles;

-- Create new SELECT policy for technician_profiles
-- Allows all authenticated users to view technician details
CREATE POLICY "Anyone can view technician details" 
ON public.technician_profiles FOR SELECT 
TO authenticated 
USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_profiles ENABLE ROW LEVEL SECURITY;