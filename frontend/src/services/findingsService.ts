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

    try {
      // Get user info from multiple sources
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      const userId = session?.user?.id || user?.id;
      
      // Try the fallback function first if we have a user ID
      if (userId) {
        try {
          const { data: functionData, error: functionError } = await supabase.rpc('get_findings_with_relations_for_user', {
            user_id: userId,
            limit_count: limit,
            offset_count: from
          });
          
          if (!functionError && functionData) {
            // The function returns a JSON array directly
            let parsedData = Array.isArray(functionData) ? functionData : [];
            
            // Apply client-side filters if needed
            let filteredData = parsedData;
            
            if (filters.status) {
              filteredData = filteredData.filter((f: any) => f.status === filters.status);
            }
            if (filters.severity) {
              filteredData = filteredData.filter((f: any) => f.severity === filters.severity);
            }
            if (filters.category) {
              filteredData = filteredData.filter((f: any) => f.category === filters.category);
            }
            if (filters.search) {
              const searchLower = filters.search.toLowerCase();
              filteredData = filteredData.filter((f: any) => 
                f.title?.toLowerCase().includes(searchLower) ||
                f.description?.toLowerCase().includes(searchLower) ||
                f.location?.toLowerCase().includes(searchLower)
              );
            }
            
            // For the function approach, we don't have exact count, so estimate
            const estimatedCount = filteredData.length;
            
            return {
              data: (filteredData as unknown as Finding[]) || [],
              count: estimatedCount,
              page,
              limit,
              totalPages: Math.ceil(estimatedCount / limit)
            };
          }
        } catch (funcErr) {
          // Continue to fallback
        }
      }
      
      // Fallback to RLS query if function approach fails
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
        throw new Error(`Failed to fetch findings: ${error.message}`);
      }

      return {
        data: (data as unknown as Finding[]) || [],
        count: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Fetches all findings across all projects. (Admin only)
   * Uses enhanced functions to bypass RLS issues.
   */
  static async getAllFindings_admin(pagination: PaginationOptions = {}): Promise<FindingsResponse> {
    const { page = 1, limit = 100 } = pagination;
    const from = (page - 1) * limit;

    try {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      const userId = session?.user?.id || user?.id;
      
      // Try the enhanced function first
      if (userId) {
        try {
          const { data: functionData, error: functionError } = await supabase.rpc('get_findings_with_relations_for_user', {
            user_id: userId,
            limit_count: limit,
            offset_count: from
          });
          
          if (!functionError && functionData) {
            let parsedData = Array.isArray(functionData) ? functionData : [];
            
            return {
              data: (parsedData as unknown as Finding[]) || [],
              count: parsedData.length,
              page,
              limit,
              totalPages: Math.ceil(parsedData.length / limit)
            };
          }
        } catch (funcErr) {
          // Continue to fallback
        }
      }
      
      // Fallback to RLS query
      const { data, error, count } = await supabase
        .from('findings')
        .select(this.baseSelectQueryWithRelations, { count: 'exact' })
        .range(from, from + limit - 1)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to fetch all findings (admin): ${error.message}`);
      }
      
      return {
        data: (data as unknown as Finding[]) || [],
        count: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get a single finding by ID with all related data
   */
  static async getFinding(id: string): Promise<Finding | null> {
    try {
      // Get user info for the enhanced function
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      const userId = session?.user?.id || user?.id;
      
      // Try the enhanced function first if we have a user ID
      if (userId) {
        try {
          const { data: functionData, error: functionError } = await supabase.rpc('get_finding_by_id_for_user', {
            finding_id: id,
            user_id: userId
          });
          
          if (!functionError && functionData) {
            // Add is_photo property to evidence
            const finding = functionData as Finding;
            if (finding.evidence) {
              finding.evidence = finding.evidence.map((e: any) => ({
                ...e,
                is_photo: e.file_type && ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(e.file_type)
              }));
            }
            
            return finding;
          }
        } catch (funcErr) {
          // Continue to fallback
        }
      }
      
      // Fallback to RLS query
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
        if (error.code === 'PGRST116') {
          return null;
        }
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
    } catch (err) {
      throw err;
    }
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