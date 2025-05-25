import React, { useState, useEffect } from 'react';
import MetricsCard from '../analytics/MetricsCard';
import TrendChart from '../analytics/TrendChart';
import HealthScore from '../analytics/HealthScore';
import { analyticsService, DashboardMetrics, TrendData, ProjectHealth, RecentActivity } from '../../services/analyticsService';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [projectHealth, setProjectHealth] = useState<ProjectHealth[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [metricsData, trendsData, healthData, activityData] = await Promise.all([
        analyticsService.getDashboardMetrics(),
        analyticsService.getTrendData(30),
        analyticsService.getProjectHealth(),
        analyticsService.getRecentActivity(10)
      ]);

      setMetrics(metricsData);
      setTrendData(trendsData);
      setProjectHealth(healthData);
      setRecentActivity(activityData);
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
    
    const subscription = analyticsService.subscribeToAnalyticsUpdates(() => {
      loadAnalyticsData();
    });
    
    const interval = setInterval(loadAnalyticsData, 5 * 60 * 1000);
    
    return () => {
      analyticsService.unsubscribeFromAnalyticsUpdates(subscription);
      clearInterval(interval);
    };
  }, [user]);

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={loadAnalyticsData}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Safety Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time overview of your safety audit system</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAnalyticsData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Total Findings"
          value={metrics?.total_findings || 0}
          description="All safety findings"
          loading={loading}
          color="blue"
          trend={metrics ? {
            value: metrics.weekly_trend,
            isPositive: metrics.weekly_trend >= 0,
            period: 'vs last week'
          } : undefined}
          icon={
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <MetricsCard
          title="Open Findings"
          value={metrics?.open_findings || 0}
          description="Requiring attention"
          loading={loading}
          color="yellow"
          icon={
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          }
        />

        <MetricsCard
          title="Critical Findings"
          value={metrics?.critical_findings || 0}
          description="High priority items"
          loading={loading}
          color="red"
          icon={
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          }
        />

        <MetricsCard
          title="Completion Rate"
          value={`${metrics?.completion_rate || 0}%`}
          description="Findings resolved"
          loading={loading}
          color="green"
          icon={
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          }
        />
      </div>

      {/* Charts and Health Score Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <div className="xl:col-span-2">
          <TrendChart
            data={trendData.map(item => ({
              date: item.date,
              newFindings: item.new_findings,
              closedFindings: item.closed_findings,
              overdueFindings: 0 // We don't track overdue in trends currently
            }))}
            title="30-Day Findings Trend"
            type="line"
            loading={loading}
          />
        </div>

        {/* Project Health Score */}
        <div>
          <HealthScore
            score={metrics?.health_score || 100}
            title="Overall Health Score"
            loading={loading}
          />
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricsCard
          title="Immediate Actions"
          value={metrics?.immediate_action_required || 0}
          description="Requiring immediate attention"
          loading={loading}
          color="red"
          icon={
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          }
        />

        <MetricsCard
          title="Avg Resolution Time"
          value={`${metrics?.avg_resolution_days || 0} days`}
          description="Time to closure"
          loading={loading}
          color="purple"
          icon={
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          }
        />
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="flow-root">
              <ul className="-mb-8">
                {recentActivity.slice(0, 5).map((activity, activityIdx) => (
                  <li key={activityIdx}>
                    <div className="relative pb-8">
                      {activityIdx !== recentActivity.slice(0, 5).length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                            activity.activity_type === 'Finding Created' ? 'bg-blue-500' :
                            activity.activity_type === 'Finding Closed' ? 'bg-green-500' :
                            activity.activity_type === 'Comment Added' ? 'bg-gray-500' :
                            'bg-gray-500'
                          }`}>
                            {activity.activity_type === 'Finding Created' && (
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                            )}
                            {activity.activity_type === 'Finding Closed' && (
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            {activity.activity_type === 'Comment Added' && (
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                              </svg>
                            )}
                        </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">{activity.user_name}</span>{' '}
                              {activity.description}
                            </p>
                      </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {new Date(activity.created_at).toLocaleDateString()}
                      </div>
                    </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Project Health Summary */}
      {projectHealth.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Project Health Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectHealth.slice(0, 6).map((project) => (
                <div key={project.project_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{project.project_name}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      project.health_score >= 90 ? 'bg-green-100 text-green-800' :
                      project.health_score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {project.health_score}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Total Findings:</span>
                      <span>{project.total_findings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Open:</span>
                      <span>{project.open_findings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Critical:</span>
                      <span>{project.critical_findings}</span>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 