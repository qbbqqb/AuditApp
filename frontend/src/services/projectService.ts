import { supabase } from '../config/supabase'; // Adjust path as needed
import { Project, Profile, ProjectAssignment } from '../types/supabase'; // Adjust path as needed

// --- Admin Functions ---

/**
 * Creates a new project. (Admin only)
 */
export const createProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> => {
  try {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    
    const userId = session?.user?.id || user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Try using the admin function first
    try {
      const { data: functionData, error: functionError } = await supabase.rpc('create_project_admin', {
        project_name: projectData.name,
        project_description: projectData.description,
        project_client_company: projectData.client_company,
        project_contractor_company: projectData.contractor_company,
        project_start_date: projectData.start_date,
        project_end_date: projectData.end_date,
        project_is_active: projectData.is_active ?? true,
        creator_user_id: userId
      });
      
      if (!functionError && functionData && functionData.length > 0) {
        return functionData[0];
      }
    } catch (funcErr) {
      // Continue to fallback
    }
    
    // Fallback to direct insert
    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Error in createProject:', err);
    throw err;
  }
};

/**
 * Fetches all projects. (Admin only)
 * Enhanced with better error handling and debugging
 */
export const getAllProjects = async (): Promise<Project[]> => {
  try {
    // For regular users, this will be filtered by RLS policies
    // Only admins will see all projects, others will see only assigned projects
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
     
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (err) {
    console.error('Error in getAllProjects:', err);
    throw err;
  }
};

/**
 * Fetches a single project by its ID. (Admin or assigned user - RLS handles access)
 */
export const getProjectById = async (projectId: string): Promise<Project | null> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
};

/**
 * Updates an existing project. (Admin only)
 */
export const updateProject = async (projectId: string, updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Deletes a project. (Admin only)
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
  if (error) throw error;
};

/**
 * Assigns a user to a project. (Admin only)
 * Note: Your project_assignments table has its own id. This function assumes you want to create a new assignment.
 */
export const assignUserToProject = async (userId: string, projectId: string): Promise<ProjectAssignment> => {
  const { data, error } = await supabase
    .from('project_assignments')
    .insert({ user_id: userId, project_id: projectId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Removes a user from a project. (Admin only)
 */
export const removeUserFromProject = async (userId: string, projectId: string): Promise<void> => {
  const { error } = await supabase
    .from('project_assignments')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);
  if (error) throw error;
};

/**
 * Fetches all users assigned to a specific project. (Admin or assigned user - RLS handles access)
 * Returns profiles of assigned users.
 */
export const getUsersForProject = async (projectId: string): Promise<Profile[]> => {
  // Explicitly type the expected shape from Supabase when selecting related records
  type ProjectAssignmentWithProfile = ProjectAssignment & {
    profiles: Profile | null; // Supabase returns the related record or null if not found
  };

  const { data, error } = await supabase
    .from('project_assignments')
    .select('*, profiles (*)') // Select all from project_assignments and all from related profiles
    .eq('project_id', projectId);

  if (error) throw error;
  
  // Filter out any assignments where the profile might be null (e.g., due to RLS or data inconsistency)
  // and then map to the profile objects.
  return data
    ?.filter((item): item is ProjectAssignmentWithProfile & { profiles: Profile } => item.profiles !== null)
    .map(item => item.profiles) || [];
};

/**
 * Fetches all projects a specific user is assigned to. (Admin only for viewing others, or user for self)
 */
export const getProjectsForUser = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .rpc('get_user_projects', { user_id: userId }); // Calling your SQL function
  
  if (error) throw error;
  return data || [];
};

// --- Authenticated User Functions ---

/**
 * Fetches projects assigned to the currently authenticated user.
 * Uses the get_user_projects SQL function you created.
 */
export const getMyAssignedProjects = async (): Promise<Project[]> => {
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated.');

  const { data, error } = await supabase
    .rpc('get_user_projects', { user_id: user.id });

  if (error) throw error;
  return data || [];
}; 