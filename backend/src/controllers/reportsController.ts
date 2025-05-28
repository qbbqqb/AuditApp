import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

interface ReportConfig {
  name: string;
  description: string;
  dataSource: 'findings' | 'projects' | 'analytics' | 'combined';
  filters: {
    dateRange: {
      start: string;
      end: string;
    };
    severity: string[];
    status: string[];
    category: string[];
    projectId: string[];
    assignedTo: string[];
  };
  columns: string[];
  chartType: 'table' | 'bar' | 'line' | 'pie' | 'area';
  exportFormat: 'pdf' | 'excel' | 'csv';
}

// Generate report preview
export const previewReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const reportConfig: ReportConfig = req.body;
    console.log('Report config:', JSON.stringify(reportConfig, null, 2));
    console.log('User ID:', userId, 'Role:', userRole);
    console.log('Auth token available:', !!authToken);
    console.log('Auth token length:', authToken?.length || 0);
    console.log('Auth token starts with:', authToken?.substring(0, 20) + '...');
    
    const data = await generateReportData(reportConfig, userId, userRole, authToken);
    console.log('Generated data length:', data.length);
    console.log('First few rows:', data.slice(0, 2));
    
    res.json({
      success: true,
      data: data.slice(0, 10), // Preview first 10 rows
      totalRows: data.length
    });
  } catch (error) {
    console.error('Error generating report preview:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate report preview' 
    });
  }
};

// Generate and download report
export const generateReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const reportConfig: ReportConfig = req.body;
    const data = await generateReportData(reportConfig, userId, userRole, authToken);

    switch (reportConfig.exportFormat) {
      case 'pdf':
        await generatePDFReport(res, reportConfig, data);
        break;
      case 'excel':
        await generateExcelReport(res, reportConfig, data);
        break;
      case 'csv':
        generateCSVReport(res, reportConfig, data);
        break;
      default:
        res.status(400).json({ 
          success: false, 
          message: 'Unsupported export format' 
        });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate report' 
    });
  }
};

// Generate report data based on configuration
async function generateReportData(config: ReportConfig, userId: string, userRole: string, authToken?: string): Promise<any[]> {
  try {
    switch (config.dataSource) {
      case 'findings':
        return await generateFindingsData(config, userId, userRole, authToken);
      case 'projects':
        return await generateProjectsData(config, userId, userRole);
      case 'analytics':
        return await generateAnalyticsData(config, userId, userRole);
      case 'combined':
        return await generateCombinedData(config, userId, userRole);
      default:
        return [];
    }
  } catch (error) {
    console.error('Error generating report data:', error);
    return [];
  }
}

// Generate findings data
async function generateFindingsData(config: ReportConfig, userId: string, userRole: string, authToken?: string): Promise<any[]> {
  // Create a user-specific Supabase client using the session token from the request
  let supabaseClient;
  if (authToken) {
    // Create client with user's session token
    supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      }
    );
  } else {
    // Fallback to admin client (but this might not work with placeholder key)
    console.log('No auth token provided, this might fail...');
    supabaseClient = supabaseAdmin;
  }

  console.log('Using auth token for query:', !!authToken);

  let query = supabaseClient
    .from('findings')
    .select(`
      id,
      title,
      description,
      location,
      severity,
      status,
      category,
      created_at,
      updated_at,
      due_date,
      regulatory_reference,
      immediate_action_required,
      project_id,
      created_by,
      assigned_to
    `);

  // Apply date filters
  if (config.filters.dateRange.start) {
    const startDate = config.filters.dateRange.start + 'T00:00:00.000Z';
    query = query.gte('created_at', startDate);
    console.log('Applied start date filter:', startDate);
  }
  if (config.filters.dateRange.end) {
    const endDate = config.filters.dateRange.end + 'T23:59:59.999Z';
    query = query.lte('created_at', endDate);
    console.log('Applied end date filter:', endDate);
  }

  // Apply other filters
  if (config.filters.severity.length > 0) {
    query = query.in('severity', config.filters.severity);
  }
  if (config.filters.status.length > 0) {
    query = query.in('status', config.filters.status);
  }
  if (config.filters.projectId.length > 0) {
    query = query.in('project_id', config.filters.projectId);
  }

  // Apply role-based filtering
  // Management roles can see all findings, individual workers only see their own
  const managementRoles = ['admin', 'client_safety_manager', 'gc_project_manager', 'gc_ehs_officer'];
  
  if (!managementRoles.includes(userRole)) {
    console.log('Applying role-based filtering for user:', userId, 'role:', userRole);
    query = query.or(`created_by.eq.${userId},assigned_to.eq.${userId}`);
  } else {
    console.log('Management user, no role-based filtering applied for role:', userRole);
  }

  console.log('Executing findings query...');
  console.log('Query filters applied:');
  console.log('- Date range:', config.filters.dateRange);
  console.log('- Severity filters:', config.filters.severity);
  console.log('- Status filters:', config.filters.status);
  console.log('- Project filters:', config.filters.projectId);
  
  // Let's also test a simple query first to make sure basic access works
  console.log('Testing basic query first...');
  const { data: testData, error: testError } = await supabaseClient
    .from('findings')
    .select('id, title, created_at')
    .limit(1);
  
  console.log('Basic query result:', testData?.length || 0, 'error:', testError);
  
  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching findings:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return [];
  }

  console.log('Raw findings data length:', data?.length || 0);
  console.log('Sample data:', data?.slice(0, 1));

  // Transform data to match expected format (simplified for now)
  return data?.map(finding => {
    return {
      ...finding,
      project_name: 'Project Name', // Placeholder
      client_company: 'Client Company', // Placeholder
      contractor_company: 'Contractor Company', // Placeholder
      created_by: 'Created By', // Placeholder
      assigned_to: 'Assigned To' // Placeholder
    };
  }) || [];
}

// Generate projects data
async function generateProjectsData(config: ReportConfig, userId: string, userRole: string): Promise<any[]> {
  let query = supabaseAdmin
    .from('projects')
    .select(`
      id,
      name,
      description,
      client_company,
      contractor_company,
      start_date,
      end_date,
      created_at,
      findings(id, status, severity, due_date)
    `);

  // Apply date filters
  if (config.filters.dateRange.start) {
    query = query.gte('created_at', config.filters.dateRange.start);
  }
  if (config.filters.dateRange.end) {
    query = query.lte('created_at', config.filters.dateRange.end);
  }

  // Apply project filter
  if (config.filters.projectId.length > 0) {
    query = query.in('id', config.filters.projectId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  // Calculate project metrics
  return data?.map(project => {
    const findings = project.findings || [];
    const totalFindings = findings.length;
    const openFindings = findings.filter(f => 
      ['open', 'assigned', 'in_progress'].includes(f.status)
    ).length;
    const closedFindings = findings.filter(f => f.status === 'closed').length;
    const overdueFindings = findings.filter(f => 
      f.status !== 'closed' && new Date(f.due_date) < new Date()
    ).length;
    
    const completionRate = totalFindings > 0 ? 
      Math.round((closedFindings / totalFindings) * 100) : 100;
    
    const healthScore = totalFindings === 0 ? 100 :
      Math.max(0, Math.round(100 - (overdueFindings / totalFindings) * 50));

    return {
      ...project,
      findings_count: totalFindings,
      open_findings: openFindings,
      closed_findings: closedFindings,
      overdue_findings: overdueFindings,
      completion_rate: completionRate,
      health_score: healthScore
    };
  }) || [];
}

// Generate analytics data
async function generateAnalyticsData(config: ReportConfig, userId: string, userRole: string): Promise<any[]> {
  const startDate = new Date(config.filters.dateRange.start);
  const endDate = new Date(config.filters.dateRange.end);
  
  // Generate date array
  const dateArray: string[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dateArray.push(d.toISOString().split('T')[0]);
  }

  // Get findings data
  let query = supabaseAdmin
    .from('findings')
    .select('created_at, updated_at, status, due_date')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  // Apply role-based filtering for analytics
  const managementRoles = ['admin', 'client_safety_manager', 'gc_project_manager', 'gc_ehs_officer'];
  
  if (!managementRoles.includes(userRole)) {
    query = query.or(`created_by.eq.${userId},assigned_to.eq.${userId}`);
  }

  const { data: findings, error } = await query;

  if (error) {
    console.error('Error fetching analytics data:', error);
    return [];
  }

  // Process trend data
  return dateArray.map(date => {
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

    const totalFindings = findings?.filter(f => 
      new Date(f.created_at) <= dayEnd
    ).length || 0;

    const completionRate = totalFindings > 0 ? 
      Math.round((findings?.filter(f => 
        f.status === 'closed' && new Date(f.created_at) <= dayEnd
      ).length || 0) / totalFindings * 100) : 0;

    return {
      date,
      new_findings: newFindings,
      closed_findings: closedFindings,
      overdue_findings: overdueFindings,
      total_findings: totalFindings,
      completion_rate: completionRate
    };
  });
}

// Generate combined data
async function generateCombinedData(config: ReportConfig, userId: string, userRole: string): Promise<any[]> {
  let query = supabaseAdmin
    .from('findings')
    .select(`
      title,
      severity,
      status,
      created_at,
      due_date,
      updated_at,
      projects:project_id(name)
    `);

  // Apply date filters
  if (config.filters.dateRange.start) {
    query = query.gte('created_at', config.filters.dateRange.start);
  }
  if (config.filters.dateRange.end) {
    query = query.lte('created_at', config.filters.dateRange.end);
  }

  // Apply role-based filtering for combined data
  const managementRoles = ['admin', 'client_safety_manager', 'gc_project_manager', 'gc_ehs_officer'];
  
  if (!managementRoles.includes(userRole)) {
    query = query.or(`created_by.eq.${userId},assigned_to.eq.${userId}`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching combined data:', error);
    return [];
  }

  return data?.map(finding => {
    const project = finding.projects as any;
    const daysToResolve = finding.status === 'closed' && finding.updated_at ? 
      Math.round((new Date(finding.updated_at).getTime() - new Date(finding.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 
      null;

    const complianceScore = finding.status === 'overdue' || 
      (new Date(finding.due_date) < new Date() && !['closed', 'completed_pending_approval'].includes(finding.status)) ? 0 :
      finding.status === 'closed' ? 100 :
      finding.severity === 'critical' ? 20 :
      finding.severity === 'high' ? 40 :
      finding.severity === 'medium' ? 60 : 80;

    return {
      project_name: project?.name || '',
      finding_title: finding.title,
      severity: finding.severity,
      status: finding.status,
      created_at: finding.created_at,
      due_date: finding.due_date,
      days_to_resolve: daysToResolve,
      compliance_score: complianceScore
    };
  }) || [];
}

// PDF Report Generation
async function generatePDFReport(res: Response, config: ReportConfig, data: any[]): Promise<void> {
  const doc = new PDFDocument();
  
  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${config.name || 'report'}.pdf"`);
  
  // Pipe PDF to response
  doc.pipe(res);
  
  // Add title
  doc.fontSize(20).text(config.name || 'Safety Report', 50, 50);
  doc.fontSize(12).text(config.description || '', 50, 80);
  
  // Add metadata
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 110);
  doc.text(`Date Range: ${config.filters.dateRange.start} to ${config.filters.dateRange.end}`, 50, 125);
  doc.text(`Total Records: ${data.length}`, 50, 140);
  
  // Add data table
  let yPosition = 170;
  const pageHeight = 750;
  const rowHeight = 20;
  
  // Headers
  const headers = config.columns;
  let xPosition = 50;
  const colWidth = (500) / headers.length;
  
  doc.fontSize(10).fillColor('black');
  headers.forEach(header => {
    doc.text(header.replace('_', ' ').toUpperCase(), xPosition, yPosition, { width: colWidth });
    xPosition += colWidth;
  });
  
  yPosition += rowHeight;
  doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
  yPosition += 5;
  
  // Data rows
  data.forEach((row, index) => {
    if (yPosition > pageHeight) {
      doc.addPage();
      yPosition = 50;
    }
    
    xPosition = 50;
    headers.forEach(header => {
      const value = row[header] || '';
      const displayValue = typeof value === 'string' ? value.substring(0, 20) : String(value);
      doc.text(displayValue, xPosition, yPosition, { width: colWidth });
      xPosition += colWidth;
    });
    yPosition += rowHeight;
  });
  
  doc.end();
}

// Excel Report Generation
async function generateExcelReport(res: Response, config: ReportConfig, data: any[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');
  
  // Add headers
  const headers = config.columns.map(col => ({
    header: col.replace('_', ' ').toUpperCase(),
    key: col,
    width: 15
  }));
  
  worksheet.columns = headers;
  
  // Add data
  data.forEach(row => {
    worksheet.addRow(row);
  });
  
  // Style the header
  worksheet.getRow(1).eachCell((cell: ExcelJS.Cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });
  
  // Set response headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${config.name || 'report'}.xlsx"`);
  
  // Write to response
  await workbook.xlsx.write(res);
  res.end();
}

// CSV Report Generation
function generateCSVReport(res: Response, config: ReportConfig, data: any[]): void {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${config.name || 'report'}.csv"`);
  
  // Headers
  const headers = config.columns.join(',');
  res.write(headers + '\n');
  
  // Data
  data.forEach(row => {
    const values = config.columns.map(col => {
      const value = row[col] || '';
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    res.write(values.join(',') + '\n');
  });
  
  res.end();
} 