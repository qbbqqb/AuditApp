-- Simple test user creation for Supabase
-- Run this in your Supabase SQL Editor

-- Option 1: Use Supabase's built-in auth.signup function (recommended)
SELECT auth.signup(
  'admin@example.com',
  'password123',
  '{"first_name": "Admin", "last_name": "User", "role": "client_safety_manager", "company": "Test Company"}'::jsonb
);

-- Option 2: If you need to insert directly, first create auth user then profile
-- (Only use if Option 1 doesn't work)

-- INSERT INTO auth.users (
--     id,
--     instance_id,
--     aud,
--     role,
--     email,
--     encrypted_password,
--     email_confirmed_at,
--     raw_app_meta_data,
--     raw_user_meta_data,
--     created_at,
--     updated_at
-- ) VALUES (
--     gen_random_uuid(),
--     '00000000-0000-0000-0000-000000000000',
--     'authenticated',
--     'authenticated', 
--     'admin@example.com',
--     crypt('password123', gen_salt('bf')),
--     now(),
--     '{"provider": "email", "providers": ["email"]}'::jsonb,
--     '{}'::jsonb,
--     now(),
--     now()
-- ) ON CONFLICT (email) DO NOTHING;

-- Then create the profile
-- INSERT INTO public.profiles (
--     id,
--     email,
--     first_name,
--     last_name,
--     role,
--     company,
--     phone,
--     is_active
-- ) 
-- SELECT 
--     u.id,
--     'admin@example.com',
--     'Admin',
--     'User',
--     'client_safety_manager',
--     'Test Company',
--     '+1234567890',
--     true
-- FROM auth.users u 
-- WHERE u.email = 'admin@example.com'
-- ON CONFLICT (id) DO UPDATE SET
--     first_name = EXCLUDED.first_name,
--     last_name = EXCLUDED.last_name,
--     role = EXCLUDED.role,
--     company = EXCLUDED.company; 