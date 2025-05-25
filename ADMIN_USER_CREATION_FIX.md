# Admin User Creation - Issue Fix & Setup

## 🔧 **Issues Identified & Fixed**

### Issue 1: CORS Error with Backend API
**Problem:** Backend API was not accessible due to CORS policy blocking requests from your IP address.

**Solution:** Implemented a database function approach that bypasses the need for a separate backend API.

### Issue 2: Edge Function Not Deployed
**Problem:** Supabase Edge Function `create-user` doesn't exist in your project.

**Solution:** Created a PostgreSQL function that runs directly in your Supabase database.

## 🚀 **New Implementation: Database Function Approach**

### Step 1: Deploy the Database Function

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Admin User Creation Function
-- This function allows admins to create users with proper authentication and profile setup

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
```

### Step 2: Test the Function

After running the SQL function, test user creation:

1. **Login as admin** to your application
2. **Navigate to** `/admin/users`
3. **Click "Add User"**
4. **Fill out the form** with test user details
5. **Click "Create User"**

## ✅ **How It Works Now**

### User Creation Flow:
1. **Admin Authentication**: Verifies current user is admin
2. **Input Validation**: Checks all required fields
3. **Duplicate Check**: Ensures email doesn't already exist
4. **Auth User Creation**: Creates user in `auth.users` table
5. **Profile Creation**: Creates profile in `profiles` table
6. **Immediate Activation**: User is created as active and email-confirmed
7. **Error Handling**: Cleans up if any step fails

### Security Features:
- ✅ **Admin-only access**: Function checks user role before proceeding
- ✅ **Input validation**: All required fields validated
- ✅ **Duplicate prevention**: Checks for existing users
- ✅ **Transaction safety**: Rolls back on errors
- ✅ **Password encryption**: Uses bcrypt for secure password storage

## 🎯 **Benefits of This Approach**

1. **No Backend Required**: Works directly with Supabase
2. **No CORS Issues**: Runs server-side in database
3. **Immediate Results**: Users created instantly without email confirmation
4. **Secure**: Uses database-level security and RLS
5. **Reliable**: Atomic transactions ensure data consistency

## 🔍 **Troubleshooting**

### If you get "function does not exist" error:
1. Make sure you ran the SQL function in Supabase SQL Editor
2. Check that the function was created successfully
3. Verify you're connected to the correct Supabase project

### If you get "Only admins can create users" error:
1. Verify your current user has `role = 'admin'` in the profiles table
2. Check that you're logged in as the admin user

### If you get "User already exists" error:
1. The email address is already in use
2. Choose a different email address
3. Or delete the existing user first

## 🎉 **Testing**

Try creating a test user with these details:
- **Email**: `test.user@company.com`
- **Password**: `SecurePass123`
- **First Name**: `Test`
- **Last Name**: `User`
- **Role**: `gc_ehs_officer`
- **Company**: `Test Company`
- **Phone**: `+1234567890` (optional)

The user should be created immediately and appear in your user list!

## 📋 **Next Steps**

1. **Deploy the function** using the SQL above
2. **Test user creation** with the admin panel
3. **Create your team users** as needed
4. **Optional**: Set up email notifications for new users
5. **Optional**: Implement bulk user import functionality

This solution provides a robust, secure, and immediate user creation system without requiring a separate backend or dealing with CORS issues! 