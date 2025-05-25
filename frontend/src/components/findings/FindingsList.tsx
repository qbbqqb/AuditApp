import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FindingsService, type FindingsFilters } from '../../services/findingsService';
import { BulkImport } from './BulkImport';
import type { Finding } from '../../types/findings';
import type { ImportResult } from '../../services/bulkImportService';
import { supabase } from '../../config/supabase';

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

  const severityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200'
  };

  const statusColors = {
    open: 'bg-blue-100 text-blue-800 border-blue-200',
    assigned: 'bg-purple-100 text-purple-800 border-purple-200',
    in_progress: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    completed_pending_approval: 'bg-amber-100 text-amber-800 border-amber-200',
    closed: 'bg-green-100 text-green-800 border-green-200',
    overdue: 'bg-red-100 text-red-800 border-red-200'
  };

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Debug Info - Temporarily hidden */}
      {false && debugInfo && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-bold text-sm mb-2">Debug Info:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Safety Findings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track and manage safety findings across all projects
          </p>
        </div>
        {user?.role === 'client_safety_manager' && (
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={() => setShowBulkImport(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Bulk Import
            </button>
            <Link
              to="/findings/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <span className="mr-2">+</span>
              New Finding
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Categories</option>
              <option value="fall_protection">Fall Protection</option>
              <option value="electrical_safety">Electrical Safety</option>
              <option value="ppe_compliance">PPE Compliance</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="equipment_safety">Equipment Safety</option>
              <option value="environmental">Environmental</option>
              <option value="fire_safety">Fire Safety</option>
              <option value="confined_space">Confined Space</option>
              <option value="chemical_safety">Chemical Safety</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search findings..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Findings List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {findings.map((finding) => (
            <li key={finding.id}>
              <Link
                to={`/findings/${finding.id}`}
                className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-medium text-indigo-600 truncate">
                        {finding.title}
                      </p>
                      <div className="flex items-center space-x-2 ml-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${severityColors[finding.severity]}`}>
                          {finding.severity.toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[finding.status]}`}>
                          {finding.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {isOverdue(finding.due_date, finding.status) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                            OVERDUE
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm text-gray-900">
                        {finding.description.length > 150 
                          ? `${finding.description.substring(0, 150)}...` 
                          : finding.description
                        }
                      </p>
                    </div>
                    
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <span className="mr-1">📍</span>
                          {finding.location}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <span className="mr-1">🏗️</span>
                          {finding.project?.name || 'Unknown Project'}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          Created: {formatDate(finding.created_at)} • 
                          Due: {formatDate(finding.due_date)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-2 sm:flex sm:justify-between">
                      <p className="text-sm text-gray-500">
                        Created by: {finding.created_by_profile?.first_name || 'Unknown'} {finding.created_by_profile?.last_name || 'User'}
                      </p>
                      {finding.assigned_to_profile && (
                        <p className="text-sm text-gray-500">
                          Assigned to: {finding.assigned_to_profile?.first_name || 'Unknown'} {finding.assigned_to_profile?.last_name || 'User'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {findings.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No findings found matching your criteria.</p>
          {user?.role === 'client_safety_manager' && (
            <Link
              to="/findings/new"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              Create First Finding
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default FindingsList; 