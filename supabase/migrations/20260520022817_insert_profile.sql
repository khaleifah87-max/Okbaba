INSERT INTO public.profiles (id, full_name, user_type, location, phone)
VALUES ('2071f341-3c87-4f1f-a838-25a8aa8c2547', 'Phone User', 'customer', 'Dubai', '971559696976')
ON CONFLICT (id) DO NOTHING;