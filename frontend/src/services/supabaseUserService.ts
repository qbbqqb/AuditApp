import { supabase } from '../config/supabase';
import { Profile } from '../types/supabase';

interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  company: string;
  phone?: string;
}

/**
 * Creates a new user directly via Supabase (Admin only)
 * This is a simplified approach that works without a backend
 */
export const createUserDirect = async (userData: CreateUserRequest): Promise<Profile> => {
  try {
    // Get the current user's session to verify admin access
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    // Verify current user is admin
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || currentProfile?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    // For now, we'll use a workaround since we can't use admin functions from the client
    // We'll create a temporary user via the auth signup and then update their profile
    
    // Step 1: Create auth user via signup (this will require email confirmation)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          company: userData.company,
          phone: userData.phone
        }
      }
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create user');
    }

    // Step 2: Since we can't directly create the profile (RLS prevents it), 
    // we'll need to use a different approach
    
    // For now, return a success message indicating the user needs to confirm their email
    throw new Error(`User creation initiated. The user must confirm their email at ${userData.email} before their account becomes active. Once confirmed, you can edit their profile to assign the correct role.`);

  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Alternative: Create user via SQL function (requires database function)
 */
export const createUserViaFunction = async (userData: CreateUserRequest): Promise<Profile> => {
  try {
    // Call a custom database function that can create users with admin privileges
    const { data, error } = await supabase.rpc('admin_create_user', {
      user_email: userData.email,
      user_password: userData.password,
      user_first_name: userData.first_name,
      user_last_name: userData.last_name,
      user_role: userData.role,
      user_company: userData.company,
      user_phone: userData.phone
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error creating user via function:', error);
    throw error;
  }
}; 