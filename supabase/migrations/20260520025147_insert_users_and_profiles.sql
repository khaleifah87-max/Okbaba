DO $$
DECLARE
  uid1 uuid := uuid_generate_v4();
  uid2 uuid := uuid_generate_v4();
  uid3 uuid := uuid_generate_v4();
  uid4 uuid := uuid_generate_v4();
  uid5 uuid := uuid_generate_v4();
  uid6 uuid := uuid_generate_v4();
BEGIN
  -- Insert into auth.users (needed for FK constraint on profiles)
  INSERT INTO auth.users (id, email, aud, role, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, instance_id, created_at, updated_at)
  VALUES 
    (uid1, 'mohammed@example.com', 'authenticated', 'authenticated', now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Mohammed Al Rashidi', 'sub', uid1), '00000000-0000-0000-0000-000000000000', now(), now()),
    (uid2, 'ahmed@example.com', 'authenticated', 'authenticated', now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Ahmed Al Zaabi', 'sub', uid2), '00000000-0000-0000-0000-000000000000', now(), now()),
    (uid3, 'khalid@example.com', 'authenticated', 'authenticated', now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Khalid Al Mansoori', 'sub', uid3), '00000000-0000-0000-0000-000000000000', now(), now()),
    (uid4, 'omar@example.com', 'authenticated', 'authenticated', now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Omar Al Hamdan', 'sub', uid4), '00000000-0000-0000-0000-000000000000', now(), now()),
    (uid5, 'saeed@example.com', 'authenticated', 'authenticated', now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Saeed Al Marzouqi', 'sub', uid5), '00000000-0000-0000-0000-000000000000', now(), now()),
    (uid6, 'yusuf@example.com', 'authenticated', 'authenticated', now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Yusuf Al Nuaimi', 'sub', uid6), '00000000-0000-0000-0000-000000000000', now(), now());

  -- 1. Mohammed Al Rashidi
  INSERT INTO public.profiles (id, full_name, user_type, location, phone)
  VALUES (uid1, 'Mohammed Al Rashidi', 'technician', 'Dubai', '+971501111111');
  
  INSERT INTO public.technician_profiles (id, profession, rating, total_reviews, hourly_rate, is_available, is_verified, bio)
  VALUES (uid1, 'plumber', 4.8, 45, 80, true, true, 'خبير في السباكة المنزلية وتسريب المياه. خبرة ١٠ سنوات.');

  -- 2. Ahmed Al Zaabi
  INSERT INTO public.profiles (id, full_name, user_type, location, phone)
  VALUES (uid2, 'Ahmed Al Zaabi', 'technician', 'Abu Dhabi', '+971502222222');
  
  INSERT INTO public.technician_profiles (id, profession, rating, total_reviews, hourly_rate, is_available, is_verified, bio)
  VALUES (uid2, 'electrician', 4.6, 32, 70, true, true, 'فني كهرباء معتمد، متخصص في التمديدات الكهربائية والصيانة.');

  -- 3. Khalid Al Mansoori
  INSERT INTO public.profiles (id, full_name, user_type, location, phone)
  VALUES (uid3, 'Khalid Al Mansoori', 'technician', 'Sharjah', '+971503333333');
  
  INSERT INTO public.technician_profiles (id, profession, rating, total_reviews, hourly_rate, is_available, is_verified, bio)
  VALUES (uid3, 'acTechnician', 4.9, 78, 90, false, true, 'صيانة وإصلاح جميع أنواع المكيفات، خدمة سريعة وموثوقة.');

  -- 4. Omar Al Hamdan
  INSERT INTO public.profiles (id, full_name, user_type, location, phone)
  VALUES (uid4, 'Omar Al Hamdan', 'technician', 'Dubai', '+971504444444');
  
  INSERT INTO public.technician_profiles (id, profession, rating, total_reviews, hourly_rate, is_available, is_verified, bio)
  VALUES (uid4, 'cleaner', 4.5, 15, 50, true, true, 'خدمات تنظيف عميقة للمنازل والمكاتب بأحدث الأدوات.');

  -- 5. Saeed Al Marzouqi
  INSERT INTO public.profiles (id, full_name, user_type, location, phone)
  VALUES (uid5, 'Saeed Al Marzouqi', 'technician', 'Ajman', '+971505555555');
  
  INSERT INTO public.technician_profiles (id, profession, rating, total_reviews, hourly_rate, is_available, is_verified, bio)
  VALUES (uid5, 'carpenter', 4.7, 24, 75, true, true, 'تصميم وتصليح الأثاث الخشبي، دقة في العمل وسرعة في الإنجاز.');

  -- 6. Yusuf Al Nuaimi
  INSERT INTO public.profiles (id, full_name, user_type, location, phone)
  VALUES (uid6, 'Yusuf Al Nuaimi', 'technician', 'Fujairah', '+971506666666');
  
  INSERT INTO public.technician_profiles (id, profession, rating, total_reviews, hourly_rate, is_available, is_verified, bio)
  VALUES (uid6, 'plumber', 4.3, 12, 65, true, true, 'متخصص في تركيب وصيانة أطقم الحمامات والمطابخ.');
END $$;