export type FindingStatus = 
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed_pending_approval'
  | 'closed'
  | 'overdue';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export type FindingCategory = 
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

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  company?: string;
}

export interface Project {
  id: string;
  name: string;
  client_company: string;
  contractor_company: string;
}

export interface Evidence {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  description?: string;
  created_at: string;
  is_corrective_action: boolean;
  is_photo?: boolean;
  uploaded_by_profile: Profile;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  is_internal: boolean;
  user: Profile;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  location: string;
  severity: FindingSeverity;
  status: FindingStatus;
  category: FindingCategory;
  created_by: string;
  assigned_to?: string;
  project_id: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  regulatory_reference?: string;
  immediate_action_required: boolean;
  
  // Related data
  created_by_profile: Profile;
  assigned_to_profile?: Profile;
  project: Project;
  comments?: Comment[];
  evidence?: Evidence[];
} 