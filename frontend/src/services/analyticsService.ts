import { supabase } from '../config/supabase';

// ============================================================================
// ANALYTICS INTERFACES
// ============================================================================

export interface DashboardMetrics {
  total_findings: number;
  open_findings: number;
  overdue_findings: number;
  critical_findings: number;
  closed_findings: number;
  immediate_action_required: number;
  completion_rate: number;
  avg_resolution_days: number;
  findings_this_week: number;
  findings_last_week: number;
  weekly_trend: number;
  health_score: number;
}

export interface TrendData {
  date: string;
  new_findings: number;
  closed_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  net_findings: number;
}

export interface CategoryAnalytics {
  category: string;
  total_findings: number;
  closed_findings: number;
  critical_findings: number;
  open_findings: number;
  overdue_findings: number;
  completion_rate: number;
  avg_resolution_days: number;
  risk_score: number;
}

export interface PerformanceAnalytics {
  user_id: string;
  name: string;
  role: string;
  assigned_findings: number;
  closed_findings: number;
  created_findings: number;
  overdue_findings: number;
  completion_rate: number;
  avg_resolution_days: number;
  efficiency_score: number;
}

export interface ProjectHealth {
  project_id: string;
  project_name: string;
  client_company: string;
  contractor_company: string;
  start_date: string;
  end_date: string;
  total_findings: number;
  closed_findings: number;
  open_findings: number;
  critical_findings: number;
  overdue_findings: number;
  recent_findings: number;
  completion_rate: number;
  avg_resolution_days: number;
  health_score: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface RecentActivity {
  activity_type: 'Finding Created' | 'Finding Closed' | 'Comment Added';
  description: string;
  user_name: string;
  created_at: string;
}

export interface RiskAssessment {
  risk_by_category: Array<{
    category: string;
    total_findings: number;
    open_findings: number;
    overdue_findings: number;
    immediate_action_findings: number;
    max_severity_score: number;
    recent_findings: number;
    risk_score: number;
    risk_level: 'critical' | 'high' | 'medium' | 'low';
  }>;
  overall_risk_score: number;
  highest_risk_category: string;
  total_open_risks: number;
  immediate_attention_required: number;
}

export interface ComplianceMetrics {
  total_findings: number;
  regulatory_findings: number;
  regulatory_percentage: number;
  on_time_closure_rate: number;
  overdue_findings: number;
  pending_immediate_actions: number;
  avg_closure_time_days: number;
  recent_findings: number;
  compliance_score: number;
  compliance_status: 'excellent' | 'good' | 'fair' | 'poor';
}

// ============================================================================
// ANALYTICS SERVICE CLASS
// ============================================================================

class AnalyticsService {
  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<DashboardMetrics> {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_metrics', {
        date_from: dateFrom?.toISOString(),
        date_to: dateTo?.toISOString()
      });

      if (error) {
        console.error('Error fetching dashboard metrics:', error);
        throw new Error(`Failed to fetch dashboard metrics: ${error.message}`);
      }

      return data || {
        total_findings: 0,
        open_findings: 0,
        overdue_findings: 0,
        critical_findings: 0,
        closed_findings: 0,
        immediate_action_required: 0,
        completion_rate: 0,
        avg_resolution_days: 0,
        findings_this_week: 0,
        findings_last_week: 0,
        weekly_trend: 0,
        health_score: 100
      };
    } catch (error) {
      console.error('Error in getDashboardMetrics:', error);
      throw error;
    }
  }

  /**
   * Get trend data for charts
   */
  async getTrendData(daysBack: number = 30): Promise<TrendData[]> {
    try {
      const { data, error } = await supabase.rpc('get_analytics_trends', {
        days_back: daysBack
      });

      if (error) {
        console.error('Error fetching trend data:', error);
        throw new Error(`Failed to fetch trend data: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTrendData:', error);
      throw error;
    }
  }

  /**
   * Get category-based analytics
   */
  async getCategoryAnalytics(dateFrom?: Date): Promise<CategoryAnalytics[]> {
    try {
      const { data, error } = await supabase.rpc('get_category_analytics', {
        date_from: dateFrom?.toISOString()
      });

      if (error) {
        console.error('Error fetching category analytics:', error);
        throw new Error(`Failed to fetch category analytics: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCategoryAnalytics:', error);
      throw error;
    }
  }

  /**
   * Get performance analytics for users
   */
  async getPerformanceAnalytics(dateFrom?: Date): Promise<PerformanceAnalytics[]> {
    try {
      const { data, error } = await supabase.rpc('get_performance_analytics', {
        date_from: dateFrom?.toISOString()
      });

      if (error) {
        console.error('Error fetching performance analytics:', error);
        throw new Error(`Failed to fetch performance analytics: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPerformanceAnalytics:', error);
      throw error;
    }
  }

  /**
   * Get project health metrics
   */
  async getProjectHealth(): Promise<ProjectHealth[]> {
    try {
      const { data, error } = await supabase.rpc('get_project_health');

      if (error) {
        console.error('Error fetching project health:', error);
        throw new Error(`Failed to fetch project health: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProjectHealth:', error);
      throw error;
    }
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(limitCount: number = 20): Promise<RecentActivity[]> {
    try {
      const { data, error } = await supabase.rpc('get_recent_activity', {
        limit_count: limitCount
      });

      if (error) {
        console.error('Error fetching recent activity:', error);
        throw new Error(`Failed to fetch recent activity: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecentActivity:', error);
      throw error;
    }
  }

  /**
   * Get risk assessment analytics
   */
  async getRiskAssessment(projectId?: string): Promise<RiskAssessment> {
    try {
      const { data, error } = await supabase.rpc('get_risk_assessment', {
        project_id: projectId
      });

      if (error) {
        console.error('Error fetching risk assessment:', error);
        throw new Error(`Failed to fetch risk assessment: ${error.message}`);
      }

      return data || {
        risk_by_category: [],
        overall_risk_score: 0,
        highest_risk_category: '',
        total_open_risks: 0,
        immediate_attention_required: 0
      };
    } catch (error) {
      console.error('Error in getRiskAssessment:', error);
      throw error;
    }
  }

  /**
   * Get compliance metrics
   */
  async getComplianceMetrics(dateFrom?: Date): Promise<ComplianceMetrics> {
    try {
      const { data, error } = await supabase.rpc('get_compliance_metrics', {
        date_from: dateFrom?.toISOString()
      });

      if (error) {
        console.error('Error fetching compliance metrics:', error);
        throw new Error(`Failed to fetch compliance metrics: ${error.message}`);
      }

      return data || {
        total_findings: 0,
        regulatory_findings: 0,
        regulatory_percentage: 0,
        on_time_closure_rate: 0,
        overdue_findings: 0,
        pending_immediate_actions: 0,
        avg_closure_time_days: 0,
        recent_findings: 0,
        compliance_score: 100,
        compliance_status: 'excellent'
      };
    } catch (error) {
      console.error('Error in getComplianceMetrics:', error);
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    dateFrom?: Date,
    dateTo?: Date,
    exportType: 'summary' | 'detailed' = 'summary'
  ): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_analytics_export', {
        date_from: dateFrom?.toISOString(),
        date_to: dateTo?.toISOString(),
        export_type: exportType
      });

      if (error) {
        console.error('Error exporting analytics:', error);
        throw new Error(`Failed to export analytics: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in exportAnalytics:', error);
      throw error;
    }
  }

  /**
   * Refresh analytics materialized views
   */
  async refreshAnalyticsViews(): Promise<void> {
    try {
      const { error } = await supabase.rpc('refresh_analytics_views');

      if (error) {
        console.error('Error refreshing analytics views:', error);
        throw new Error(`Failed to refresh analytics views: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in refreshAnalyticsViews:', error);
      throw error;
    }
  }

  /**
   * Set up real-time subscriptions for analytics updates
   */
  subscribeToAnalyticsUpdates(callback: () => void) {
    const subscription = supabase
      .channel('analytics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'findings'
        },
        () => {
          // Debounce the callback to avoid too many updates
          setTimeout(callback, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'evidence'
        },
        () => {
          setTimeout(callback, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments'
        },
        () => {
          setTimeout(callback, 1000);
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromAnalyticsUpdates(subscription: any) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();