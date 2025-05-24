import { supabase } from '../config/supabase';
import type { Finding, FindingStatus, FindingSeverity, FindingCategory, Evidence } from '../types/findings';

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

export class FindingsService {
  
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
      .select(`
        *,
        created_by_profile:profiles!findings_created_by_fkey(
          first_name,
          last_name,
          role
        ),
        assigned_to_profile:profiles!findings_assigned_to_fkey(
          first_name,
          last_name,
          role
        ),
        project:projects(
          id,
          name,
          client_company,
          contractor_company
        )
      `, { count: 'exact' })
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
      throw new Error(`Failed to fetch findings: ${error.message}`);
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  /**
   * Get a single finding by ID with all related data
   */
  static async getFinding(id: string): Promise<Finding> {
    const { data, error } = await supabase
      .from('findings')
      .select(`
        *,
        created_by_profile:profiles!findings_created_by_fkey(
          first_name,
          last_name,
          role,
          company
        ),
        assigned_to_profile:profiles!findings_assigned_to_fkey(
          first_name,
          last_name,
          role,
          company
        ),
        project:projects(
          id,
          name,
          client_company,
          contractor_company
        ),
        comments(
          id,
          content,
          created_at,
          is_internal,
          user:profiles(
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
            first_name,
            last_name,
            role
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch finding: ${error.message}`);
    }

    if (!data) {
      throw new Error('Finding not found');
    }

    // Add computed properties
    const finding = data as Finding;
    
    // Add is_photo property to evidence
    if (finding.evidence) {
      finding.evidence = finding.evidence.map((e: Evidence) => ({
        ...e,
        is_photo: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(e.file_type)
      }));
    }

    return finding;
  }

  /**
   * Create a new finding
   */
  static async createFinding(findingData: Partial<Finding>): Promise<Finding> {
    const { data, error } = await supabase
      .from('findings')
      .insert({
        ...findingData,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        created_by_profile:profiles!findings_created_by_fkey(
          first_name,
          last_name,
          role
        ),
        project:projects(
          id,
          name,
          client_company,
          contractor_company
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create finding: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a finding
   */
  static async updateFinding(id: string, updates: Partial<Finding>): Promise<Finding> {
    const updateData = { ...updates };
    
    // Set closed_at when status changes to closed
    if (updates.status === 'closed' && !updates.closed_at) {
      updateData.closed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('findings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        created_by_profile:profiles!findings_created_by_fkey(
          first_name,
          last_name,
          role
        ),
        assigned_to_profile:profiles!findings_assigned_to_fkey(
          first_name,
          last_name,
          role
        ),
        project:projects(
          id,
          name,
          client_company,
          contractor_company
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update finding: ${error.message}`);
    }

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
  ): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .insert({
        finding_id: findingId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        content,
        is_internal: isInternal
      });

    if (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }

  /**
   * Get overdue findings for current user
   */
  static async getOverdueFindings(): Promise<Finding[]> {
    const { data, error } = await supabase
      .from('findings')
      .select(`
        *,
        created_by_profile:profiles!findings_created_by_fkey(
          first_name,
          last_name,
          role
        ),
        assigned_to_profile:profiles!findings_assigned_to_fkey(
          first_name,
          last_name,
          role
        ),
        project:projects(
          name,
          client_company,
          contractor_company
        )
      `)
      .lt('due_date', new Date().toISOString())
      .neq('status', 'closed')
      .order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch overdue findings: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Bulk update finding statuses
   */
  static async bulkUpdateStatus(
    findingIds: string[], 
    status: FindingStatus
  ): Promise<void> {
    const updateData: any = { status };
    
    // Set closed_at when status changes to closed
    if (status === 'closed') {
      updateData.closed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('findings')
      .update(updateData)
      .in('id', findingIds);

    if (error) {
      throw new Error(`Failed to bulk update findings: ${error.message}`);
    }
  }

  /**
   * Get findings summary for dashboard
   */
  static async getDashboardSummary() {
    const { data, error } = await supabase
      .rpc('get_dashboard_metrics');

    if (error) {
      throw new Error(`Failed to fetch dashboard metrics: ${error.message}`);
    }

    return data?.[0] || {
      total_findings: 0,
      open_findings: 0,
      overdue_findings: 0,
      critical_findings: 0,
      completion_rate: 0,
      avg_resolution_days: 0
    };
  }

  /**
   * Subscribe to finding changes
   */
  static subscribeToFindings(callback: (payload: any) => void) {
    return supabase
      .channel('findings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'findings'
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to comments changes for a specific finding
   */
  static subscribeToComments(findingId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`comments-${findingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `finding_id=eq.${findingId}`
        },
        callback
      )
      .subscribe();
  }
} 