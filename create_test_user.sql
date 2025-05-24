-- Create a test user for development/testing
-- This should be run in your Supabase SQL editor

-- First, create the auth user
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('password123', gen_salt('bf')),
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    ''
) ON CONFLICT (email) DO NOTHING;

-- Then create the profile for this user
INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    company,
    phone,
    is_active
) 
SELECT 
    u.id,
    'admin@example.com',
    'Admin',
    'User',
    'client_safety_manager',
    'Test Company',
    '+1234567890',
    true
FROM auth.users u 
WHERE u.email = 'admin@example.com'
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    company = EXCLUDED.company,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active; 