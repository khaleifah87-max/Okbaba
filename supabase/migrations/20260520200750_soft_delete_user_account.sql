-- Function to soft-delete a user account
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Anonymize profile data
  UPDATE public.profiles
  SET 
    full_name = 'Deleted User',
    phone = NULL,
    avatar_url = NULL,
    location = NULL
  WHERE id = auth.uid();
  
  -- Cancel all pending bookings
  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE (customer_id = auth.uid() OR technician_id = auth.uid())
    AND status IN ('pending', 'accepted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;