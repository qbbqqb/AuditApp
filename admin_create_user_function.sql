-- Admin User Creation Function
-- This function allows admins to create users with proper authentication and profile setup
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION admin_create_user(
  user_email TEXT,
  user_password TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_role TEXT,
  user_company TEXT,
  user_phone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  new_profile profiles%ROWTYPE;
  current_user_role TEXT;
BEGIN
  -- Check if the current user is an admin
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;
  
  -- Validate required fields
  IF user_email IS NULL OR user_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  IF user_password IS NULL OR user_password = '' THEN
    RAISE EXCEPTION 'Password is required';
  END IF;
  
  IF user_first_name IS NULL OR user_first_name = '' THEN
    RAISE EXCEPTION 'First name is required';
  END IF;
  
  IF user_last_name IS NULL OR user_last_name = '' THEN
    RAISE EXCEPTION 'Last name is required';
  END IF;
  
  IF user_role IS NULL OR user_role = '' THEN
    RAISE EXCEPTION 'Role is required';
  END IF;
  
  IF user_company IS NULL OR user_company = '' THEN
    RAISE EXCEPTION 'Company is required';
  END IF;
  
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RAISE EXCEPTION 'User with email % already exists', user_email;
  END IF;
  
  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Insert into auth.users table
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(), -- Email confirmed immediately
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );
  
  -- Insert into profiles table
  INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    company,
    phone,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    user_email,
    user_first_name,
    user_last_name,
    user_role::user_role,
    user_company,
    user_phone,
    true,
    NOW(),
    NOW()
  ) RETURNING * INTO new_profile;
  
  -- Return the created profile as JSON
  RETURN row_to_json(new_profile);
  
EXCEPTION
  WHEN OTHERS THEN
    -- Clean up auth user if profile creation fails
    DELETE FROM auth.users WHERE id = new_user_id;
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users (RLS will handle admin check)
GRANT EXECUTE ON FUNCTION admin_create_user TO authenticated; 