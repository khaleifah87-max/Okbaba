INSERT INTO public.profiles (id, full_name, user_type, location)
VALUES ('04d60648-e843-4413-9d7a-df0c8e82f2a0', 'Khaleifah', 'customer', 'Dubai')
ON CONFLICT (id) DO NOTHING;