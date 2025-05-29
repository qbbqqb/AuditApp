import React, { useState, useEffect } from 'react';
// import { Card, CardBody, CardHeader, Button, Select, MultiSelect, DateRangePicker } from '../ui';
// import { reportsService, ReportConfig, ReportPreview } from '../../services/reportsService';
// import { FindingSeverity, FindingStatus, FindingCategory } from '../../types/findings';
import { useAuth } from '../../contexts/AuthContext';
// import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
// import {
//   ChartBarIcon,
//   DocumentArrowDownIcon,
//   EyeIcon,
//   CalendarIcon,
//   FunnelIcon,
//   TableCellsIcon,
//   ChartPieIcon,
//   PresentationChartLineIcon,
//   ChartBarSquareIcon
// } from '@heroicons/react/24/outline';

interface ReportBuilderConfig {
  id?: string;
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
  groupBy: string[];
  columns: string[];
  chartType: 'table' | 'bar' | 'line' | 'pie' | 'area';
  exportFormat: 'pdf' | 'excel' | 'csv';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    enabled: boolean;
  };
}

interface Project {
  id: string;
  name: string;
  client_company: string;
}

// interface User {
//   id: string;
//   first_name: string;
//   last_name: string;
//   email: string;
//   role: string;
// }

interface ReportBuilderProps {
  onReportGenerated?: (reportData: any) => void;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({ onReportGenerated }) => {
  const { user, session } = useAuth();
  // const navigate = useNavigate(); // Unused but may be needed later
  const [reportConfig, setReportConfig] = useState<ReportBuilderConfig>({
    name: '',
    description: '',
    dataSource: 'findings',
    filters: {
      dateRange: {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      severity: [],
      status: [],
      category: [],
      projectId: [],
      assignedTo: []
    },
    groupBy: [],
    columns: ['title', 'severity', 'status', 'created_at', 'due_date'],
    chartType: 'table',
    exportFormat: 'pdf'
  });

  const [projects, setProjects] = useState<Project[]>([]);
  // const [users, setUsers] = useState<User[]>([]); // Unused but may be needed later
  const [savedReports, setSavedReports] = useState<ReportBuilderConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchProjects();
    // fetchUsers(); // Commented out as unused
    fetchSavedReports();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_company, contractor_company')
        .order('name');
      
      if (error) {
        console.error('Error fetching projects:', error);
      } else {
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  // const fetchUsers = async () => {
  //   // TODO: Implement user list endpoint
  //   // setUsers([]);
  // };

  const fetchSavedReports = async () => {
    // TODO: Implement saved reports endpoint
    setSavedReports([]);
  };

  const availableColumns = {
    findings: [
      { id: 'title', label: 'Title' },
      { id: 'description', label: 'Description' },
      { id: 'location', label: 'Location' },
      { id: 'severity', label: 'Severity' },
      { id: 'status', label: 'Status' },
      { id: 'category', label: 'Category' },
      { id: 'created_at', label: 'Created Date' },
      { id: 'due_date', label: 'Due Date' },
      { id: 'project_name', label: 'Project' },
      { id: 'created_by', label: 'Created By' },
      { id: 'assigned_to', label: 'Assigned To' },
      { id: 'regulatory_reference', label: 'Regulatory Reference' }
    ],
    projects: [
      { id: 'name', label: 'Project Name' },
      { id: 'client_company', label: 'Client Company' },
      { id: 'contractor_company', label: 'Contractor' },
      { id: 'start_date', label: 'Start Date' },
      { id: 'end_date', label: 'End Date' },
      { id: 'findings_count', label: 'Total Findings' },
      { id: 'open_findings', label: 'Open Findings' },
      { id: 'health_score', label: 'Health Score' }
    ],
    analytics: [
      { id: 'date', label: 'Date' },
      { id: 'total_findings', label: 'Total Findings' },
      { id: 'new_findings', label: 'New Findings' },
      { id: 'closed_findings', label: 'Closed Findings' },
      { id: 'overdue_findings', label: 'Overdue Findings' },
      { id: 'completion_rate', label: 'Completion Rate' }
    ],
    combined: [
      { id: 'project_name', label: 'Project' },
      { id: 'finding_title', label: 'Finding' },
      { id: 'severity', label: 'Severity' },
      { id: 'days_to_resolve', label: 'Days to Resolve' },
      { id: 'compliance_score', label: 'Compliance Score' }
    ]
  };

  const severityOptions = ['critical', 'high', 'medium', 'low'];
  const statusOptions = ['open', 'assigned', 'in_progress', 'completed_pending_approval', 'closed', 'overdue'];
  // const categoryOptions = [ // Commented out as unused
  //   'fall_protection', 'electrical_safety', 'ppe_compliance', 'housekeeping',
  //   'equipment_safety', 'environmental', 'fire_safety', 'confined_space',
  //   'chemical_safety', 'other'
  // ];

  const handleConfigChange = (field: string, value: any) => {
    setReportConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFilterChange = (filterType: string, value: any) => {
    setReportConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: value
      }
    }));
  };

  const generatePreview = async () => {
    if (!session?.access_token) {
      console.error('No authentication token available');
      return;
    }

    console.log('Current user:', user);
    console.log('Report config being sent:', reportConfig);

    setLoading(true);
    try {
      let currentSession = session;
      
      // Try the request with current token
      let response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/reports/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportConfig)
      });

      // If unauthorized, try to refresh the session
      if (response.status === 401) {
        console.log('Token expired, refreshing session...');
        const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
        
        if (error || !refreshedSession) {
          console.error('Failed to refresh session:', error);
          // Redirect to login or show error
          return;
        }
        
        currentSession = refreshedSession;
        
        // Retry the request with new token
        response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/reports/preview`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reportConfig)
        });
      }

      if (response.ok) {
        const data = await response.json();
        console.log('Preview response data:', data);
        setPreviewData(data.data || []);
        setShowPreview(true);
      } else {
        const errorText = await response.text();
        console.error('Failed to generate preview:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!session?.access_token) {
      console.error('No authentication token available');
      return;
    }

    setLoading(true);
    try {
      let currentSession = session;
      
      // Try the request with current token
      let response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportConfig)
      });

      // If unauthorized, try to refresh the session
      if (response.status === 401) {
        console.log('Token expired, refreshing session...');
        const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
        
        if (error || !refreshedSession) {
          console.error('Failed to refresh session:', error);
          return;
        }
        
        currentSession = refreshedSession;
        
        // Retry the request with new token
        response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/reports/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reportConfig)
        });
      }

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportConfig.name || 'report'}.${reportConfig.exportFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to generate report:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async () => {
    // TODO: Implement save report functionality
    console.log('Saving report config:', reportConfig);
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary">Advanced Report Builder</h1>
        <p className="mt-2 text-sm text-secondary">
          Create custom reports with advanced filtering, grouping, and export options
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Report Info */}
          <div className="bg-surface shadow-base rounded-lg p-6 border border-default">
            <h2 className="text-lg font-medium text-primary mb-4">Report Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Report Name *
                </label>
                <input
                  type="text"
                  value={reportConfig.name}
                  onChange={(e) => handleConfigChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary placeholder-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Monthly Safety Report"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Data Source *
                </label>
                <select
                  value={reportConfig.dataSource}
                  onChange={(e) => handleConfigChange('dataSource', e.target.value)}
                  className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="findings">Findings</option>
                  <option value="projects">Projects</option>
                  <option value="analytics">Analytics</option>
                  <option value="combined">Combined Data</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-primary mb-2">
                Description
              </label>
              <textarea
                value={reportConfig.description}
                onChange={(e) => handleConfigChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary placeholder-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Detailed description of what this report includes"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="bg-surface shadow-base rounded-lg p-6 border border-default">
            <h2 className="text-lg font-medium text-primary mb-4">Filters</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={reportConfig.filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...reportConfig.filters.dateRange,
                    start: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={reportConfig.filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...reportConfig.filters.dateRange,
                    end: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {reportConfig.dataSource === 'findings' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Severity
                  </label>
                  <select
                    multiple
                    value={reportConfig.filters.severity}
                    onChange={(e) => handleFilterChange('severity', 
                      Array.from(e.target.selectedOptions, option => option.value)
                    )}
                    className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    size={4}
                  >
                    {severityOptions.map(severity => (
                      <option key={severity} value={severity}>
                        {severity.charAt(0).toUpperCase() + severity.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Status
                  </label>
                  <select
                    multiple
                    value={reportConfig.filters.status}
                    onChange={(e) => handleFilterChange('status', 
                      Array.from(e.target.selectedOptions, option => option.value)
                    )}
                    className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    size={4}
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-primary mb-2">
                Projects
              </label>
              <select
                multiple
                value={reportConfig.filters.projectId}
                onChange={(e) => handleFilterChange('projectId', 
                  Array.from(e.target.selectedOptions, option => option.value)
                )}
                className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                size={3}
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} - {project.client_company}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Columns & Display */}
          <div className="bg-surface shadow-base rounded-lg p-6 border border-default">
            <h2 className="text-lg font-medium text-primary mb-4">Columns & Display</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Columns to Include
                </label>
                <select
                  multiple
                  value={reportConfig.columns}
                  onChange={(e) => handleConfigChange('columns', 
                    Array.from(e.target.selectedOptions, option => option.value)
                  )}
                  className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  size={8}
                >
                  {availableColumns[reportConfig.dataSource]?.map(column => (
                    <option key={column.id} value={column.id}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-primary mb-2">
                    Chart Type
                  </label>
                  <select
                    value={reportConfig.chartType}
                    onChange={(e) => handleConfigChange('chartType', e.target.value)}
                    className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="table">Table</option>
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="area">Area Chart</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Export Format
                  </label>
                  <select
                    value={reportConfig.exportFormat}
                    onChange={(e) => handleConfigChange('exportFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Panel */}
        <div className="space-y-6">
          <div className="bg-surface shadow-base rounded-lg p-6 border border-default">
            <h2 className="text-lg font-medium text-primary mb-4">Actions</h2>
            
            <div className="space-y-3">
              <button
                onClick={generatePreview}
                disabled={loading || !reportConfig.name}
                className="w-full px-4 py-2 border border-default rounded-md text-sm font-medium text-secondary bg-surface hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Generating...' : 'Preview Report'}
              </button>

              <button
                onClick={generateReport}
                disabled={loading || !reportConfig.name}
                className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Generate & Download
              </button>

              <button
                onClick={saveReport}
                disabled={loading || !reportConfig.name}
                className="w-full px-4 py-2 border border-default rounded-md text-sm font-medium text-secondary bg-surface hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Report Template
              </button>
            </div>
          </div>

          {/* Saved Reports */}
          <div className="bg-surface shadow-base rounded-lg p-6 border border-default">
            <h2 className="text-lg font-medium text-primary mb-4">Saved Reports</h2>
            
            {savedReports.length === 0 ? (
              <p className="text-sm text-secondary">No saved reports yet</p>
            ) : (
              <div className="space-y-2">
                {savedReports.map((report, index) => (
                  <div key={index} className="p-3 border border-default rounded-md bg-surface">
                    <h3 className="text-sm font-medium text-primary">{report.name}</h3>
                    <p className="text-xs text-secondary mt-1">{report.description}</p>
                    <button
                      onClick={() => setReportConfig(report)}
                      className="text-xs text-info hover:text-info-hover mt-2 transition-colors"
                    >
                      Load Template
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {showPreview && previewData.length > 0 && (
        <div className="mt-8 bg-surface shadow-base rounded-lg p-6 border border-default">
          <h2 className="text-lg font-medium text-primary mb-4">Report Preview</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary">
                <tr>
                  {reportConfig.columns.map(column => (
                    <th key={column} className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                      {availableColumns[reportConfig.dataSource]?.find(c => c.id === column)?.label || column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {previewData.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    {reportConfig.columns.map(column => (
                      <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                        {row[column] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {previewData.length > 10 && (
            <p className="mt-4 text-sm text-secondary">
              Showing first 10 rows of {previewData.length} total results
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportBuilder; 