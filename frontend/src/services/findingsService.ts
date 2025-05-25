import { supabase } from '../config/supabase';
import type { Finding, FindingStatus, FindingSeverity, FindingCategory } from '../types/findings';

export interface FindingsFilters {
  status?: FindingStatus;
  severity?: FindingSeverity;
  category?: FindingCategory;
  search?: string;
  projectId?: string;
  assignedTo?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface FindingsResponse {
  data: Finding[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type CreateFindingServicePayload = Omit<Finding, 'id' | 'created_at' | 'updated_at' | 'closed_at' | 'status' | 'created_by' | 'created_by_profile' | 'assigned_to_profile' | 'project' | 'comments' | 'evidence'> & { status?: Finding['status'] };
export type UpdateFindingServicePayload = Partial<Omit<Finding, 'id' | 'created_by' | 'project_id' | 'created_at' | 'updated_at' | 'created_by_profile' | 'assigned_to_profile' | 'project' | 'comments' | 'evidence'> >;

export class FindingsService {
  
  private static baseSelectQueryWithRelations = `
    id, title, description, location, severity, status, category, created_by, assigned_to, project_id, due_date, created_at, updated_at, closed_at, regulatory_reference, immediate_action_required,
    created_by_profile:profiles!findings_created_by_fkey(
      id,
      first_name,
      last_name,
      role,
      company
    ),
    assigned_to_profile:profiles!findings_assigned_to_fkey(
      id,
      first_name,
      last_name,
      role,
      company
    ),
    project:projects!inner(
      id,
      name,
      client_company,
      contractor_company
    )
  `;

  /**
   * Get findings with filters and pagination
   */
  static async getFindings(
    filters: FindingsFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<FindingsResponse> {
    const { page = 1, limit = 10 } = pagination;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('findings')
      .select(this.baseSelectQueryWithRelations, { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching findings:', error);
      throw new Error(`Failed to fetch findings: ${error.message}`);
    }

    return {
      data: (data as unknown as Finding[]) || [],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  /**
   * Fetches all findings across all projects. (Admin only)
   * RLS policies should restrict this to admin users.
   */
  static async getAllFindings_admin(pagination: PaginationOptions = {}): Promise<FindingsResponse> {
    const { page = 1, limit = 100 } = pagination;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('findings')
      .select(this.baseSelectQueryWithRelations, { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all findings (admin):', error);
      throw new Error(`Failed to fetch all findings (admin): ${error.message}`);
    }
    
    return {
      data: (data as unknown as Finding[]) || [],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  /**
   * Get a single finding by ID with all related data
   */
  static async getFinding(id: string): Promise<Finding | null> {
    const selectQueryWithCommentsAndEvidence = `
      ${this.baseSelectQueryWithRelations},
      comments(
        id,
        content,
        created_at,
        is_internal,
        user:profiles!comments_user_id_fkey(
          id,
          first_name,
          last_name,
          role
        )
      ),
      evidence(
        id,
        file_name,
        file_type,
        file_size,
        description,
        created_at,
        is_corrective_action,
        uploaded_by_profile:profiles!evidence_uploaded_by_fkey(
          id,
          first_name,
          last_name,
          role
        )
      )
    `;
    const { data, error } = await supabase
      .from('findings')
      .select(selectQueryWithCommentsAndEvidence)
      .eq('id', id)
      .single<Finding>();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching finding by ID:', error);
      throw new Error(`Failed to fetch finding: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const finding = data;
    if (finding.evidence) {
      finding.evidence = finding.evidence.map((e: any) => ({
        ...e,
        is_photo: e.file_type && ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(e.file_type)
      }));
    }
    return finding;
  }

  /**
   * Create a new finding
   */
  static async createFinding(findingData: CreateFindingServicePayload): Promise<Finding> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated. Cannot create finding.');
    }

    const payload = {
      ...findingData,
      created_by: user.id,
      status: findingData.status || 'open'
    };

    const { data, error } = await supabase
      .from('findings')
      .insert(payload)
      .select(this.baseSelectQueryWithRelations)
      .single<Finding>();

    if (error) {
      console.error('Error creating finding:', error);
      throw new Error(`Failed to create finding: ${error.message}`);
    }
    if (!data) throw new Error('Failed to create finding, no data returned.');
    return data;
  }

  /**
   * Update a finding
   */
  static async updateFinding(id: string, updates: UpdateFindingServicePayload): Promise<Finding> {
    const { data, error } = await supabase
      .from('findings')
      .update(updates)
      .eq('id', id)
      .select(this.baseSelectQueryWithRelations)
      .single<Finding>();

    if (error) {
      console.error('Error updating finding:', error);
      throw new Error(`Failed to update finding: ${error.message}`);
    }
    if (!data) throw new Error('Failed to update finding, no data returned.');
    return data;
  }

  /**
   * Delete a finding
   */
  static async deleteFinding(id: string): Promise<void> {
    const { error } = await supabase
      .from('findings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting finding:', error);
      throw new Error(`Failed to delete finding: ${error.message}`);
    }
  }

  /**
   * Add a comment to a finding
   */
  static async addComment(
    findingId: string, 
    content: string, 
    isInternal: boolean = false
  ): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated. Cannot add comment.');
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        finding_id: findingId,
        content,
        is_internal: isInternal,
        user_id: user.id
      })
      .select('*, user:profiles!comments_user_id_fkey(id, first_name, last_name, role)')
      .single();
    
    if (error) {
      console.error('Error adding comment:', error);
      throw new Error(`Failed to add comment: ${error.message}`);
    }
    return data;
  }

  /**
   * Get overdue findings for current user
   */
  static async getOverdueFindings(): Promise<Finding[]> {
    const { data, error } = await supabase
      .from('findings')
      .select(this.baseSelectQueryWithRelations)
      .lt('due_date', new Date().toISOString())
      .not('status', 'in', '("closed", "completed_pending_approval")');

    if (error) {
      console.error('Error fetching overdue findings:', error);
      throw new Error(`Failed to fetch overdue findings: ${error.message}`);
    }
    return (data as unknown as Finding[]) || [];
  }

  /**
   * Bulk update finding statuses
   */
  static async bulkUpdateStatus(
    findingIds: string[], 
    status: FindingStatus
  ): Promise<void> {
    const { error } = await supabase
      .from('findings')
      .update({ status })
      .in('id', findingIds);

    if (error) {
      console.error('Error bulk updating finding status:', error);
      throw new Error(`Failed to bulk update finding status: ${error.message}`);
    }
  }

  /**
   * Get findings summary for dashboard
   */
  static async getDashboardSummary() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc('get_dashboard_metrics', { user_id: user.id });
    
    if (error) {
      console.error('Error fetching dashboard summary:', error);
      return null;
    }
    return data && data.length > 0 ? data[0] : null;
  }

  /**
   * Subscribe to finding changes
   */
  static subscribeToFindings(callback: (payload: any) => void): () => Promise<"ok" | "timed out" | "error"> {
    const channel = supabase.channel('public:findings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'findings' }, callback)
      .subscribe();
    
    return async () => await supabase.removeChannel(channel);
  }

  /**
   * Subscribe to comments changes for a specific finding
   */
  static subscribeToComments(findingId: string, callback: (payload: any) => void): () => Promise<"ok" | "timed out" | "error"> {
    const channel = supabase.channel(`public:comments:finding_id=eq.${findingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `finding_id=eq.${findingId}` },
        callback
      )
      .subscribe();
    return async () => await supabase.removeChannel(channel);
  }
} 