import { supabase } from '../config/supabase'; // Adjust path as needed
import { Profile } from '../types/supabase'; // Adjust path as needed

// --- Admin Functions ---

/**
 * Fetches all users with their profiles. (Admin only)
 */
export const getAllUsersWithProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*');
  if (error) throw error;
  return data || [];
};

/**
 * Fetches a single user's profile by their ID. (Admin or user themselves - RLS handles access)
 */
export const getUserProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId) // In your 'profiles' table, the PK is 'id', which references auth.users.id
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
};

/**
 * Updates a user's profile. (Admin only for updating role or other users' profiles)
 * For non-admin users, a separate function `updateMyProfile` should be used for their own profile.
 */
export const updateUserProfile = async (userId: string, profileData: Partial<Profile>): Promise<Profile> => {
  // Ensure that if 'role' is part of profileData, it is a valid UserRole.
  // This is more for type safety at the service layer if profileData comes from less strictly typed sources.
  // The database also has a CHECK constraint on the 'role' column.
  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// --- Authenticated User Functions ---

/**
 * Fetches the profile of the currently authenticated user.
 */
export const getCurrentUserProfile = async (): Promise<Profile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Not strictly an error if called when no user is logged in, 
    // could return null or throw, depending on expected usage.
    // For now, let's assume it implies no profile if no user.
    return null;
  }
  return getUserProfile(user.id);
};

/**
 * Allows an authenticated user to update their own profile information.
 * Role changes are not allowed through this function.
 */
export type ProfileUpdatePayload = Omit<Partial<Profile>, 'id' | 'role' | 'email' | 'created_at' | 'updated_at'>;
export const updateMyProfile = async (profileData: ProfileUpdatePayload): Promise<Profile> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated.');

  // Ensure `id` and `role` are not in the payload from the client if they somehow get there.
  const { id, role, email, created_at, updated_at, ...restOfProfileData } = profileData as Partial<Profile>;

  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .update(restOfProfileData) 
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return updatedProfile;
}; 