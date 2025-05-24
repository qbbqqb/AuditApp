import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

interface DashboardMetrics {
  totalFindings: number;
  openFindings: number;
  overdueFindings: number;
  completionRate: number;
  criticalFindings: number;
  averageResolutionTime: number;
  projectHealthScore: number;
}

interface TrendData {
  date: string;
  newFindings: number;
  closedFindings: number;
  overdueFindings: number;
}

interface ProjectHealth {
  projectId: string;
  projectName: string;
  totalFindings: number;
  openFindings: number;
  overdueFindings: number;
  healthScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

// GET /api/analytics/dashboard - Get main dashboard metrics
export const getDashboardMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Development mode fallback
    if (process.env.NODE_ENV === 'development' && userId === 'dev-admin-id') {
      const mockMetrics: DashboardMetrics = {
        totalFindings: 15,
        openFindings: 8,
        overdueFindings: 3,
        completionRate: 73,
        criticalFindings: 2,
        averageResolutionTime: 4,
        projectHealthScore: 85
      };

      res.json({
        success: true,
        data: mockMetrics,
        message: 'Dashboard metrics retrieved successfully (development mode)'
      });
      return;
    }

    // Get current date
    const now = new Date().toISOString();

    // Base query for findings
    let findingsQuery = supabase
      .from('findings')
      .select(`
        id,
        status,
        severity,
        created_at,
        due_date,
        updated_at,
        project_id
      `);

    // Role-based filtering
    if (userRole !== 'client_safety_manager') {
      findingsQuery = findingsQuery.eq('assigned_to', userId);
    }

    const { data: findings, error: findingsError } = await findingsQuery;

    if (findingsError) {
      res.status(500).json({
        success: false,
        message: 'Error fetching findings data'
      });
      return;
    }

    // Calculate metrics
    const totalFindings = findings?.length || 0;
    const openFindings = findings?.filter(f => 
      ['open', 'assigned', 'in_progress'].includes(f.status)
    ).length || 0;
    
    const overdueFindings = findings?.filter(f => 
      f.status !== 'closed' && new Date(f.due_date) < new Date(now)
    ).length || 0;

    const closedFindings = findings?.filter(f => f.status === 'closed').length || 0;
    const completionRate = totalFindings > 0 ? Math.round((closedFindings / totalFindings) * 100) : 0;

    const criticalFindings = findings?.filter(f => 
      f.severity === 'critical' && f.status !== 'closed'
    ).length || 0;

    // Calculate average resolution time
    const closedFindingsWithDates = findings?.filter(f => 
      f.status === 'closed' && f.created_at && f.updated_at
    ) || [];

    let averageResolutionTime = 0;
    if (closedFindingsWithDates.length > 0) {
      const totalResolutionTime = closedFindingsWithDates.reduce((sum, finding) => {
        const created = new Date(finding.created_at);
        const updated = new Date(finding.updated_at);
        return sum + (updated.getTime() - created.getTime());
      }, 0);
      
      averageResolutionTime = Math.round(totalResolutionTime / (closedFindingsWithDates.length * 24 * 60 * 60 * 1000)); // Days
    }

    // Calculate project health score (0-100)
    let projectHealthScore = 100;
    if (totalFindings > 0) {
      const overduePercent = (overdueFindings / totalFindings) * 100;
      const criticalPercent = (criticalFindings / totalFindings) * 100;
      
      projectHealthScore = Math.max(0, Math.round(100 - (overduePercent * 2) - (criticalPercent * 1.5)));
    }

    const metrics: DashboardMetrics = {
      totalFindings,
      openFindings,
      overdueFindings,
      completionRate,
      criticalFindings,
      averageResolutionTime,
      projectHealthScore
    };

    res.json({
      success: true,
      data: metrics,
      message: 'Dashboard metrics retrieved successfully'
    });

  } catch (error) {
    console.error('Error in getDashboardMetrics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// GET /api/analytics/trends - Get trend data for charts
export const getTrendData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { days = 30 } = req.query;

    // Development mode fallback
    if (process.env.NODE_ENV === 'development' && userId === 'dev-admin-id') {
      const mockTrendData: TrendData[] = [];
      const today = new Date();
      
      for (let i = Number(days) - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        mockTrendData.push({
          date: date.toISOString().split('T')[0],
          newFindings: Math.floor(Math.random() * 5) + 1,
          closedFindings: Math.floor(Math.random() * 4),
          overdueFindings: Math.floor(Math.random() * 2)
        });
      }

      res.json({
        success: true,
        data: mockTrendData,
        message: 'Trend data retrieved successfully (development mode)'
      });
      return;
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    // Generate date array
    const dateArray: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateArray.push(d.toISOString().split('T')[0]);
    }

    // Get findings data
    let findingsQuery = supabase
      .from('findings')
      .select('created_at, updated_at, status, due_date')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (userRole !== 'client_safety_manager') {
      findingsQuery = findingsQuery.eq('assigned_to', userId);
    }

    const { data: findings, error } = await findingsQuery;

    if (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching trend data'
      });
      return;
    }

    // Process trend data
    const trendData: TrendData[] = dateArray.map(date => {
      const dayStart = new Date(date + 'T00:00:00.000Z');
      const dayEnd = new Date(date + 'T23:59:59.999Z');

      const newFindings = findings?.filter(f => {
        const createdDate = new Date(f.created_at);
        return createdDate >= dayStart && createdDate <= dayEnd;
      }).length || 0;

      const closedFindings = findings?.filter(f => {
        const updatedDate = new Date(f.updated_at);
        return f.status === 'closed' && updatedDate >= dayStart && updatedDate <= dayEnd;
      }).length || 0;

      const overdueFindings = findings?.filter(f => {
        const dueDate = new Date(f.due_date);
        return f.status !== 'closed' && dueDate >= dayStart && dueDate <= dayEnd;
      }).length || 0;

      return {
        date,
        newFindings,
        closedFindings,
        overdueFindings
      };
    });

    res.json({
      success: true,
      data: trendData,
      message: 'Trend data retrieved successfully'
    });

  } catch (error) {
    console.error('Error in getTrendData:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// GET /api/analytics/projects - Get project health data
export const getProjectHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Development mode fallback
    if (process.env.NODE_ENV === 'development' && userId === 'dev-admin-id') {
      const mockProjectHealth: ProjectHealth[] = [
        {
          projectId: 'project-1',
          projectName: 'Construction Site Alpha',
          totalFindings: 8,
          openFindings: 3,
          overdueFindings: 1,
          healthScore: 85,
          trend: 'improving'
        },
        {
          projectId: 'project-2',
          projectName: 'Office Building Beta',
          totalFindings: 5,
          openFindings: 2,
          overdueFindings: 0,
          healthScore: 92,
          trend: 'stable'
        },
        {
          projectId: 'project-3',
          projectName: 'Industrial Complex Gamma',
          totalFindings: 12,
          openFindings: 6,
          overdueFindings: 2,
          healthScore: 68,
          trend: 'declining'
        }
      ];

      res.json({
        success: true,
        data: mockProjectHealth,
        message: 'Project health data retrieved successfully (development mode)'
      });
      return;
    }

    // Get projects with their findings
    let projectsQuery = supabase
      .from('projects')
      .select(`
        id,
        name,
        client_company,
        created_at,
        findings (
          id,
          status,
          severity,
          created_at,
          due_date
        )
      `);

    const { data: projects, error } = await projectsQuery;

    if (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching project data'
      });
      return;
    }

    // Calculate health metrics for each project
    const projectHealth: ProjectHealth[] = projects?.map(project => {
      const findings = project.findings || [];
      const totalFindings = findings.length;
      
      const openFindings = findings.filter(f => 
        ['open', 'assigned', 'in_progress'].includes(f.status)
      ).length;
      
      const overdueFindings = findings.filter(f => 
        f.status !== 'closed' && new Date(f.due_date) < new Date()
      ).length;

      // Calculate health score (0-100)
      let healthScore = 100;
      if (totalFindings > 0) {
        const overduePercent = (overdueFindings / totalFindings) * 100;
        const openPercent = (openFindings / totalFindings) * 100;
        
        healthScore = Math.max(0, Math.round(100 - (overduePercent * 2) - (openPercent * 0.5)));
      }

      // Determine trend (simplified - could be enhanced with historical data)
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (overdueFindings > totalFindings * 0.3) {
        trend = 'declining';
      } else if (overdueFindings === 0 && openFindings < totalFindings * 0.2) {
        trend = 'improving';
      }

      return {
        projectId: project.id,
        projectName: project.name,
        totalFindings,
        openFindings,
        overdueFindings,
        healthScore,
        trend
      };
    }) || [];

    res.json({
      success: true,
      data: projectHealth,
      message: 'Project health data retrieved successfully'
    });

  } catch (error) {
    console.error('Error in getProjectHealth:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// GET /api/analytics/overdue - Get overdue items
export const getOverdueItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Development mode fallback
    if (process.env.NODE_ENV === 'development' && userId === 'dev-admin-id') {
      const mockOverdueItems = [
        {
          id: 'finding-1',
          title: 'Missing Safety Barriers',
          severity: 'high',
          daysOverdue: 3,
          projectName: 'Construction Site Alpha',
          assignedTo: 'John Smith'
        },
        {
          id: 'finding-2',
          title: 'Improper Ladder Setup',
          severity: 'medium',
          daysOverdue: 1,
          projectName: 'Office Building Beta',
          assignedTo: 'Jane Doe'
        },
        {
          id: 'finding-3',
          title: 'Exposed Electrical Wiring',
          severity: 'critical',
          daysOverdue: 5,
          projectName: 'Industrial Complex Gamma',
          assignedTo: 'Mike Johnson'
        }
      ];

      res.json({
        success: true,
        data: mockOverdueItems,
        message: 'Overdue items retrieved successfully (development mode)'
      });
      return;
    }

    // Get overdue findings
    let overdueQuery = supabase
      .from('findings')
      .select(`
        id,
        title,
        severity,
        due_date,
        created_at,
        projects:project_id (name),
        assigned_profile:assigned_to (first_name, last_name)
      `)
      .lt('due_date', new Date().toISOString())
      .neq('status', 'closed');

    // Role-based filtering
    if (userRole !== 'client_safety_manager') {
      overdueQuery = overdueQuery.eq('assigned_to', userId);
    }

    const { data: overdueItems, error } = await overdueQuery;

    if (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching overdue items'
      });
      return;
    }

    // Process overdue items
    const processedItems = overdueItems?.map(item => {
      const project = item.projects as any;
      const assignedProfile = item.assigned_profile as any;
      
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: item.id,
        title: item.title,
        severity: item.severity,
        daysOverdue,
        projectName: project?.name || '',
        assignedTo: assignedProfile ? 
          `${assignedProfile.first_name} ${assignedProfile.last_name}` : 'Unassigned'
      };
    }) || [];

    res.json({
      success: true,
      data: processedItems,
      message: 'Overdue items retrieved successfully'
    });

  } catch (error) {
    console.error('Error in getOverdueItems:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 