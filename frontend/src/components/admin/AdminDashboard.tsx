import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

import { getAllUsersWithProfiles } from '../../services/profileService';
import { getAllProjects } from '../../services/projectService';
import { FindingsService } from '../../services/findingsService';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  activeProjects: number;
  totalFindings: number;
  openFindings: number;
  systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalFindings: 0,
    openFindings: 0,
    systemHealth: 'good'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAdminStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Check if user is admin after hooks are called
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="bg-surface p-8 rounded-lg shadow-md border border-default">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-primary">Access Denied</h3>
            <p className="mt-1 text-sm text-secondary">
              You must be an administrator to access this area.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:opacity-90 transition-opacity"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const loadAdminStats = async () => {
    try {
      setLoading(true);

      // Get user stats using our service
      const userStats = await getAllUsersWithProfiles();

      // Get project stats using our service
      const projectStats = await getAllProjects();

      // Get finding stats using our service (admin can see all findings)
      const findingResponse = await FindingsService.getAllFindings_admin({ limit: 1000 });
      const findingStats = findingResponse.data;

      const newStats = {
        totalUsers: userStats.length,
        activeUsers: userStats.filter(u => u.is_active).length,
        totalProjects: projectStats.length,
        activeProjects: projectStats.filter(p => p.is_active).length,
        totalFindings: findingStats.length,
        openFindings: findingStats.filter(f => f.status !== 'closed').length,
        systemHealth: 'good' as const // TODO: Calculate based on metrics
      };

      setStats(newStats);
    } catch (error) {
      console.error('Error loading admin stats:', error);
      // Set default stats on error
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalProjects: 0,
        activeProjects: 0,
        totalFindings: 0,
        openFindings: 0,
        systemHealth: 'poor'
      });
    } finally {
      setLoading(false);
    }
  };

  const adminCards = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: (
        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      stats: `${stats.activeUsers}/${stats.totalUsers} active`,
      action: () => navigate('/admin/users'),
      color: 'blue'
    },
    {
      title: 'Project Management',
      description: 'Create and manage projects',
      icon: (
        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      stats: `${stats.activeProjects}/${stats.totalProjects} active`,
      action: () => navigate('/admin/projects'),
      color: 'green'
    },
    {
      title: 'Project Assignments',
      description: 'Assign users to projects',
      icon: (
        <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      stats: `Manage user access`,
      action: () => navigate('/admin/assignments'),
      color: 'orange'
    },
    {
      title: 'System Analytics',
      description: 'View system performance and usage',
      icon: (
        <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      stats: `${stats.openFindings} open findings`,
      action: () => navigate('/admin/analytics'),
      color: 'purple'
    },
    {
      title: 'System Settings',
      description: 'Configure application settings',
      icon: (
        <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      stats: `System: ${stats.systemHealth}`,
      action: () => navigate('/admin/settings'),
      color: 'gray'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <span className="mt-2 text-secondary">Loading admin dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
              <p className="mt-2 text-sm text-secondary">
                Manage users, projects, and system settings for the Health & Safety Audit Application
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/admin/projects')}
                className="bg-success text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-all duration-200 shadow-base"
              >
                Manage Projects
              </button>
              <button
                onClick={loadAdminStats}
                disabled={loading}
                className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all duration-200 shadow-base"
              >
                {loading ? 'Refreshing...' : 'Refresh Stats'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface overflow-hidden shadow-base rounded-lg border border-default">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-secondary truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-primary">{stats.totalUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface overflow-hidden shadow-base rounded-lg border border-default">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-secondary truncate">Active Projects</dt>
                    <dd className="text-lg font-medium text-primary">{stats.activeProjects}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface overflow-hidden shadow-base rounded-lg border border-default">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-secondary truncate">Open Findings</dt>
                    <dd className="text-lg font-medium text-primary">{stats.openFindings}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface overflow-hidden shadow-base rounded-lg border border-default">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    stats.systemHealth === 'excellent' ? 'bg-success-light' :
                    stats.systemHealth === 'good' ? 'bg-info-light' :
                    stats.systemHealth === 'fair' ? 'bg-warning-light' : 'bg-danger-light'
                  }`}>
                    <div className={`h-3 w-3 rounded-full ${
                      stats.systemHealth === 'excellent' ? 'bg-success' :
                      stats.systemHealth === 'good' ? 'bg-info' :
                      stats.systemHealth === 'fair' ? 'bg-warning' : 'bg-danger'
                    }`}></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-secondary truncate">System Health</dt>
                    <dd className="text-lg font-medium text-primary capitalize">{stats.systemHealth}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* No Projects Warning */}
        {stats.totalProjects === 0 && (
          <div className="mb-6 bg-warning-light border border-warning rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-warning">No Projects Found</h3>
                <div className="mt-2 text-sm text-warning">
                  <p>No projects are currently available. This could be due to:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>No projects have been created yet</li>
                    <li>Database permissions need to be configured</li>
                  </ul>
                  <p className="mt-2">
                    <button
                      onClick={() => navigate('/admin/projects')}
                      className="font-medium text-warning underline hover:opacity-80 transition-opacity"
                    >
                      Go to Project Management
                    </button>
                    {' '}to create projects manually.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {adminCards.map((card, index) => (
            <div
              key={index}
              className="border border-default rounded-lg p-6 cursor-pointer transition-all duration-200 bg-surface hover:bg-surface-hover shadow-base hover:shadow-md"
              onClick={card.action}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {card.icon}
                    <h3 className="ml-3 text-lg font-medium text-primary">{card.title}</h3>
                  </div>
                  <p className="text-sm text-secondary mb-3">{card.description}</p>
                  <div className="text-sm font-medium text-tertiary">{card.stats}</div>
                </div>
                <div className="ml-4">
                  <svg className="h-5 w-5 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity Section */}
        <div className="mt-8">
          <div className="bg-surface shadow-base rounded-lg border border-default">
            <div className="px-6 py-4 border-b border-default">
              <h3 className="text-lg font-medium text-primary">Recent System Activity</h3>
              <p className="text-sm text-secondary mt-1">Latest updates from your projects</p>
            </div>
            <div className="p-6">
              <div className="text-center text-secondary py-8">
                <svg className="mx-auto h-12 w-12 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <p className="mt-2 text-sm">Activity logging coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 