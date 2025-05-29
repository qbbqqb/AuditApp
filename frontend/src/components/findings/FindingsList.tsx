import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FindingsService, type FindingsFilters } from '../../services/findingsService';
import { BulkImport } from './BulkImport';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Button, 
  StatusIndicator, 
  SeverityIndicator,
  SkeletonCard 
} from '../ui';
import type { Finding } from '../../types/findings';
import type { ImportResult } from '../../services/bulkImportService';
import { supabase } from '../../config/supabase';
import { 
  PlusIcon, 
  FunnelIcon, 
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const FindingsList: React.FC = () => {
  const { user } = useAuth();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<FindingsFilters>({});
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Debug authentication state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      setDebugInfo({
        contextUser: user,
        authUser: authUser,
        session: session,
        userIdFromContext: user?.id,
        userIdFromAuth: authUser?.id,
        userIdFromSession: session?.user?.id,
        userRole: user?.role,
        userEmail: user?.email,
        sessionExists: !!session,
        userExists: !!authUser
      });
    };
    
    checkAuth();
  }, [user]);

  const fetchFindings = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await FindingsService.getFindings(
        filters,
        { page: currentPage, limit: 10 }
      );

      console.log('FindingsList received response:', response);
      console.log('FindingsList received data:', response.data);
      if (response.data && response.data.length > 0) {
        console.log('First finding in component:', response.data[0]);
        console.log('First finding project:', response.data[0].project);
        console.log('First finding created_by_profile:', response.data[0].created_by_profile);
      }

      setFindings(response.data);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error('Error in fetchFindings:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  const handleFilterChange = (key: keyof FindingsFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'closed') return false;
    return new Date(dueDate) < new Date();
  };

  // Helper function to map finding status to StatusIndicator compatible types
  const mapStatusForIndicator = (findingStatus: string, isOverdue: boolean) => {
    if (isOverdue) return 'overdue' as any; // Handle overdue separately
    
    switch (findingStatus) {
      case 'open':
      case 'assigned':
        return 'open';
      case 'in_progress':
        return 'in_progress';
      case 'completed_pending_approval':
        return 'resolved';
      case 'closed':
        return 'closed';
      default:
        return 'open';
    }
  };

  const handleImportComplete = (result: ImportResult) => {
    // Refresh the findings list after successful import
    fetchFindings();
    setShowBulkImport(false);
    
    // Show success message
    if (result.successful_imports > 0) {
      setError(''); // Clear any existing errors
      // You could add a success toast here
    }
  };

  if (loading) {
    return (
      <div className="container-padding">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <div className="h-8 w-48 bg-muted rounded-lg animate-pulse mb-2"></div>
              <div className="h-4 w-72 bg-muted rounded animate-pulse"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-24 bg-muted rounded-lg animate-pulse"></div>
              <div className="h-10 w-24 bg-muted rounded-lg animate-pulse"></div>
            </div>
          </div>
          
          {/* Filters Skeleton */}
          <SkeletonCard />
          
          {/* Findings Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-padding space-y-6">
      {/* Debug Info - Temporarily hidden */}
      {false && debugInfo && (
        <Card className="bg-info-50 border-info-200">
          <CardHeader>
            <h3 className="font-bold text-sm text-info">Debug Info:</h3>
          </CardHeader>
          <CardBody>
            <pre className="text-xs overflow-auto text-info-700">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardBody>
        </Card>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Safety Findings</h1>
          <p className="text-secondary">
            Track and manage safety findings across all projects
          </p>
        </div>
        {user?.role === 'client_safety_manager' && (
          <div className="flex gap-3">
            <Button
              onClick={() => setShowBulkImport(true)}
              variant="secondary"
              size="sm"
              className="transition-transform hover:scale-105"
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Link to="/findings/new">
              <Button
                variant="primary"
                size="sm"
                className="transition-transform hover:scale-105"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Finding
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-danger-200 bg-danger-50">
          <CardBody>
            <div className="flex items-start space-x-4">
              <ExclamationTriangleIcon className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-danger mb-1">Error</h3>
                <p className="text-sm text-danger-700">{error}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-primary">Filters</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-default rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed_pending_approval">Pending Approval</option>
                <option value="closed">Closed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Severity
              </label>
              <select
                value={filters.severity || ''}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-default rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Category
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-default rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All Categories</option>
                <option value="structural">Structural</option>
                <option value="electrical">Electrical</option>
                <option value="ppe">PPE</option>
                <option value="environmental">Environmental</option>
                <option value="procedural">Procedural</option>
                <option value="equipment">Equipment</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Project
              </label>
              <select
                value={filters.projectId || ''}
                onChange={(e) => handleFilterChange('projectId', e.target.value)}
                className="w-full px-3 py-2 border border-default rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All Projects</option>
                {/* Project options would be loaded dynamically */}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Findings List */}
      {findings.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <InformationCircleIcon className="h-16 w-16 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-primary mb-2">No findings found</h3>
            <p className="text-secondary mb-6">
              {Object.keys(filters).some(key => filters[key as keyof FindingsFilters])
                ? "Try adjusting your filters to see more results."
                : "Create your first safety finding to get started."}
            </p>
            {user?.role === 'client_safety_manager' && (
              <Link to="/findings/new">
                <Button variant="primary">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Finding
                </Button>
              </Link>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {findings.map((finding) => (
            <Card key={finding.id} className="hover:shadow-lg transition-shadow duration-300">
              <CardBody>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Link
                          to={`/findings/${finding.id}`}
                          className="text-lg font-semibold text-primary hover:text-blue-600 transition-colors"
                        >
                          {finding.title}
                        </Link>
                        <p className="text-sm text-secondary mt-1 line-clamp-2">
                          {finding.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-secondary">Location:</span>
                        <span className="text-primary font-medium">{finding.location}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-secondary">Created:</span>
                        <span className="text-primary">{formatDate(finding.created_at)}</span>
                      </div>

                      {finding.due_date && (
                        <div className="flex items-center space-x-2">
                          <span className="text-secondary">Due:</span>
                          <span className={`font-medium ${
                            isOverdue(finding.due_date, finding.status) 
                              ? 'text-danger' 
                              : 'text-primary'
                          }`}>
                            {formatDate(finding.due_date)}
                          </span>
                        </div>
                      )}

                      {finding.project?.name && (
                        <div className="flex items-center space-x-2">
                          <span className="text-secondary">Project:</span>
                          <span className="text-primary font-medium">{finding.project.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex flex-wrap gap-2">
                      <SeverityIndicator severity={finding.severity} />
                      <StatusIndicator 
                        status={mapStatusForIndicator(finding.status, isOverdue(finding.due_date, finding.status))} 
                      />
                    </div>
                    
                    <Link to={`/findings/${finding.id}`}>
                      <Button variant="secondary" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="text-sm text-secondary">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="secondary"
                  size="sm"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  variant="secondary"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImport
          onImportComplete={handleImportComplete}
          onClose={() => setShowBulkImport(false)}
        />
      )}
    </div>
  );
};

export default FindingsList; 