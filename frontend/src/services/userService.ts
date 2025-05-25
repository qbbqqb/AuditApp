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

// Note: ApiResponse and BACKEND_URL kept for potential future backend integration

/**
 * Creates a new user via database function (Admin only)
 */
export const createUser = async (userData: CreateUserRequest): Promise<Profile> => {
  try {
    // Get the current user's session token
    const { data: { session } } = await import('../config/supabase').then(m => m.supabase.auth.getSession());
    
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    // Use the database function for user creation
    const { supabase } = await import('../config/supabase');
    const { data, error } = await supabase.rpc('admin_create_user', {
      user_email: userData.email,
      user_password: userData.password,
      user_first_name: userData.first_name,
      user_last_name: userData.last_name,
      user_role: userData.role,
      user_company: userData.company,
      user_phone: userData.phone || null
    });

    if (error) {
      throw new Error(error.message || 'Failed to create user');
    }

    if (!data) {
      throw new Error('No user data returned from database function');
    }

    return data as Profile;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Sends a password reset email to a user
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    const { supabase } = await import('../config/supabase');
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error sending password reset:', error);
    throw error;
  }
}; 