export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  company: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export type UserRole = 
  | 'client_safety_manager'
  | 'client_project_manager'
  | 'gc_ehs_officer'
  | 'gc_project_manager'
  | 'gc_site_director';

export interface Finding {
  id: string;
  title: string;
  description: string;
  location: string;
  severity: FindingSeverity;
  status: FindingStatus;
  created_by: string;
  assigned_to?: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  project_id: string;
  category: FindingCategory;
  regulatory_reference?: string;
  immediate_action_required: boolean;
}

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export type FindingStatus = 
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed_pending_approval'
  | 'closed'
  | 'overdue';

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

export interface Evidence {
  id: string;
  finding_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description?: string;
  created_at: string;
  is_corrective_action: boolean;
}

export interface Comment {
  id: string;
  finding_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_internal: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  finding_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  sent_at: string;
  email_sent: boolean;
}

export type NotificationType = 
  | 'new_finding'
  | 'status_update'
  | 'deadline_reminder'
  | 'overdue_alert'
  | 'escalation'
  | 'comment_added'
  | 'evidence_submitted';

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_company: string;
  contractor_company: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'insert' | 'update' | 'delete';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id: string;
  timestamp: string;
}

export interface EmailTemplate {
  type: NotificationType;
  subject: string;
  body: string;
  variables: string[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Request types
export interface CreateFindingRequest {
  title: string;
  description: string;
  location: string;
  severity: FindingSeverity;
  category: FindingCategory;
  project_id: string;
  assigned_to?: string;
  due_date?: string;
  regulatory_reference?: string;
  immediate_action_required?: boolean;
}

export interface UpdateFindingRequest {
  title?: string;
  description?: string;
  location?: string;
  severity?: FindingSeverity;
  category?: FindingCategory;
  assigned_to?: string;
  due_date?: string;
  status?: FindingStatus;
  regulatory_reference?: string;
  immediate_action_required?: boolean;
  closed_at?: string;
}

export interface AddCommentRequest {
  content: string;
  is_internal?: boolean;
}

export interface CreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  company: string;
  phone?: string;
  password: string;
}

// Dashboard types
export interface DashboardStats {
  total_findings: number;
  open_findings: number;
  overdue_findings: number;
  closed_this_month: number;
  average_closure_time: number;
  findings_by_severity: Record<FindingSeverity, number>;
  findings_by_status: Record<FindingStatus, number>;
  findings_by_category: Record<FindingCategory, number>;
  contractor_performance: ContractorPerformance[];
}

export interface ContractorPerformance {
  contractor: string;
  total_findings: number;
  closed_findings: number;
  average_closure_time: number;
  overdue_count: number;
  compliance_score: number;
}

export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  status?: FindingStatus[];
  severity?: FindingSeverity[];
  category?: FindingCategory[];
  project_id?: string;
  assigned_to?: string;
  created_by?: string;
} 