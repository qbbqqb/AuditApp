import { supabase } from '../config/supabase';
import { FindingSeverity, FindingStatus, FindingCategory } from '../types/findings';

export interface ReportConfig {
  title: string;
  description?: string;
  projectIds: string[];
  dateRange: {
    start: string;
    end: string;
  };
  severities: FindingSeverity[];
  statuses: FindingStatus[];
  categories: FindingCategory[];
  includeEvidence: boolean;
  includeComments: boolean;
  format: 'pdf' | 'excel' | 'csv';
}

export interface ReportPreview {
  totalFindings: number;
  findingsBySeverity: Record<FindingSeverity, number>;
  findingsByStatus: Record<FindingStatus, number>;
  findingsByCategory: Record<FindingCategory, number>;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface GeneratedReport {
  id: string;
  title: string;
  downloadUrl: string;
  createdAt: string;
  config: ReportConfig;
}

class ReportsService {
  async previewReport(config: ReportConfig): Promise<ReportPreview> {
    try {
      // Build the query based on the configuration
      let query = supabase
        .from('findings')
        .select('id, severity, status, category, created_at');

      // Add filters based on config
      if (config.projectIds.length > 0) {
        query = query.in('project_id', config.projectIds);
      }

      if (config.dateRange.start) {
        query = query.gte('created_at', config.dateRange.start);
      }

      if (config.dateRange.end) {
        query = query.lte('created_at', config.dateRange.end);
      }

      if (config.severities.length > 0) {
        query = query.in('severity', config.severities);
      }

      if (config.statuses.length > 0) {
        query = query.in('status', config.statuses);
      }

      if (config.categories.length > 0) {
        query = query.in('category', config.categories);
      }

      const { data: findings, error } = await query;

      if (error) {
        throw new Error(`Failed to preview report: ${error.message}`);
      }

      // Calculate statistics
      const findingsBySeverity: Record<FindingSeverity, number> = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };

      const findingsByStatus: Record<FindingStatus, number> = {
        open: 0,
        assigned: 0,
        in_progress: 0,
        completed_pending_approval: 0,
        closed: 0,
        overdue: 0
      };

      const findingsByCategory: Record<FindingCategory, number> = {
        fall_protection: 0,
        electrical_safety: 0,
        ppe_compliance: 0,
        housekeeping: 0,
        equipment_safety: 0,
        environmental: 0,
        fire_safety: 0,
        confined_space: 0,
        chemical_safety: 0,
        other: 0
      };

      findings?.forEach(finding => {
        findingsBySeverity[finding.severity as FindingSeverity]++;
        findingsByStatus[finding.status as FindingStatus]++;
        findingsByCategory[finding.category as FindingCategory]++;
      });

      return {
        totalFindings: findings?.length || 0,
        findingsBySeverity,
        findingsByStatus,
        findingsByCategory,
        dateRange: config.dateRange
      };
    } catch (error) {
      console.error('Error previewing report:', error);
      throw error;
    }
  }

  async generateReport(config: ReportConfig): Promise<GeneratedReport> {
    try {
      // For now, we'll create a simple implementation
      // In a real app, this would typically involve calling a backend service
      // that generates the actual report file
      
      const reportId = `report_${Date.now()}`;
      const mockDownloadUrl = `#download-${reportId}`;
      
      return {
        id: reportId,
        title: config.title,
        downloadUrl: mockDownloadUrl,
        createdAt: new Date().toISOString(),
        config
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  async getReportHistory(): Promise<GeneratedReport[]> {
    try {
      // In a real implementation, this would fetch from a reports table
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching report history:', error);
      throw error;
    }
  }
}

export const reportsService = new ReportsService(); 