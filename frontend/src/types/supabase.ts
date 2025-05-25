import { supabase } from '../config/supabase'; // Adjust path as needed

// Placeholder Types (Ideally, generate these from your Supabase schema)
// npx supabase gen types typescript --project-id <your-project-id> --schema public > src/types/supabase.ts

export type UserRole = 
  | 'admin'
  | 'client_safety_manager'
  | 'client_project_manager' 
  | 'gc_ehs_officer'
  | 'gc_project_manager'
  | 'gc_site_director';

export interface Profile {
  id: string; // UUID, references auth.users(id)
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  company: string;
  phone?: string;
  avatar_url?: string;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
  is_active: boolean;
}

export interface Project {
  id: string; // UUID
  name: string;
  description?: string;
  client_company: string;
  contractor_company: string;
  start_date: string; // DATE
  end_date?: string; // DATE
  is_active: boolean;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
  // created_by is not in your projects table schema but was in my previous suggestion - removing for now
}

export interface ProjectAssignment {
  id: string; // UUID
  project_id: string; // UUID
  user_id: string; // UUID, references profiles(id)
  assigned_at: string; // TIMESTAMPTZ
}

// Add other types like Finding, Evidence, Comment as needed, ensuring they match your schema

export interface Finding {
  id: string; // UUID
  title: string;
  description: string;
  location: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'assigned' | 'in_progress' | 'completed_pending_approval' | 'closed' | 'overdue';
  category: 
    | 'fall_protection' 
    | 'electrical_safety' 
    | 'ppe_compliance' 
    | 'housekeeping' 
    | 'equipment_safety' 
    | 'environmental' 
    | 'fire_safety' 
    | 'confined_space' 
    | 'chemical_safety' 
    | 'other';
  created_by: string; // UUID, references profiles(id)
  assigned_to?: string; // UUID, references profiles(id)
  project_id: string; // UUID, references projects(id) - NOT NULL in your schema
  due_date: string; // TIMESTAMPTZ
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
  closed_at?: string; // TIMESTAMPTZ
  regulatory_reference?: string;
  immediate_action_required: boolean;
  // Add enriched data fields to make it compatible with EnrichedFinding
  created_by_profile?: Partial<Profile> | null;
  assigned_to_profile?: Partial<Profile> | null;
  project?: Partial<Project> | null;
  comments?: any[];
  evidence?: any[];
} 