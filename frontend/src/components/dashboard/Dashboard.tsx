import React, { useState, useEffect } from 'react';
import MetricsCard from '../analytics/MetricsCard';
import TrendChart from '../analytics/TrendChart';
import HealthScore from '../analytics/HealthScore';
import { Card, CardBody, CardHeader, Button, Skeleton, SkeletonCard } from '../ui';
import { analyticsService, DashboardMetrics, TrendData, RecentActivity } from '../../services/analyticsService';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  // const [projectHealth, setProjectHealth] = useState<ProjectHealth[]>([]); // Unused but may be needed later
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [metricsData, trendsData, , activityData] = await Promise.all([
        analyticsService.getDashboardMetrics(),
        analyticsService.getTrendData(30),
        analyticsService.getProjectHealth(), // This data is not currently used but kept for future implementation
        analyticsService.getRecentActivity(10)
      ]);

      setMetrics(metricsData);
      setTrendData(trendsData);
      // setProjectHealth(healthData); // Commented out as unused
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
      <div className="container-padding">
        <Card className="border-danger-200 bg-danger-50">
          <CardBody>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-6 w-6 text-danger" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-danger mb-2">Error Loading Dashboard</h3>
                <p className="text-secondary mb-4">{error}</p>
                <Button 
                  onClick={loadAnalyticsData}
                  variant="secondary"
                  size="sm"
                  className="border-danger-300 text-danger hover:bg-danger-50"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
          <div>
            <h1
              style={{
                fontSize: 'var(--font-size-4xl)',
                fontWeight: 'var(--font-weight-extrabold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-2)',
                letterSpacing: 'var(--letter-spacing-tight)',
                lineHeight: 'var(--line-height-tight)'
              }}
            >
              Safety Dashboard
            </h1>
            <p
              style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-secondary)',
                lineHeight: 'var(--line-height-relaxed)'
              }}
            >
              Real-time overview of your safety audit system
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={loadAnalyticsData}
              disabled={loading}
              variant="secondary"
              size="md"
              className="transition-transform hover:scale-105"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          ) : (
            <>
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
                icon={<ChartBarIcon className="h-5 w-5" />}
              />

              <MetricsCard
                title="Open Findings"
                value={metrics?.open_findings || 0}
                description="Requiring attention"
                loading={loading}
                color="yellow"
                icon={<ExclamationTriangleIcon className="h-5 w-5" />}
              />

              <MetricsCard
                title="Critical Findings"
                value={metrics?.critical_findings || 0}
                description="High priority items"
                loading={loading}
                color="red"
                icon={<ExclamationCircleIcon className="h-5 w-5" />}
              />

              <MetricsCard
                title="Completion Rate"
                value={`${metrics?.completion_rate || 0}%`}
                description="Findings resolved"
                loading={loading}
                color="green"
                icon={<CheckCircleIcon className="h-5 w-5" />}
              />
            </>
          )}
        </div>

        {/* Charts and Health Score Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Trend Chart */}
          <div className="xl:col-span-2">
            {loading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardBody>
                  <Skeleton className="h-64 w-full" />
                </CardBody>
              </Card>
            ) : (
              <TrendChart
                data={trendData.map(item => ({
                  date: item.date,
                  newFindings: item.new_findings,
                  closedFindings: item.closed_findings,
                  overdueFindings: 0
                }))}
                title="30-Day Findings Trend"
                type="line"
                loading={loading}
              />
            )}
          </div>

          {/* Project Health Score */}
          <div>
            {loading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardBody className="text-center">
                  <Skeleton className="h-32 w-32 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </CardBody>
              </Card>
            ) : (
              <HealthScore
                score={metrics?.health_score || 100}
                title="Overall Health Score"
                loading={loading}
              />
            )}
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          ) : (
            <>
              <MetricsCard
                title="Immediate Actions"
                value={metrics?.immediate_action_required || 0}
                description="Requiring immediate attention"
                loading={loading}
                color="red"
                icon={<ClockIcon className="h-5 w-5" />}
              />

              <MetricsCard
                title="Overdue Items"
                value={metrics?.overdue_findings || 0}
                description="Past due date"
                loading={loading}
                color="yellow"
                icon={<ExclamationTriangleIcon className="h-5 w-5" />}
              />

              <MetricsCard
                title="This Week"
                value={metrics?.findings_this_week || 0}
                description="New findings this week"
                loading={loading}
                color="blue"
                icon={<ChartBarIcon className="h-5 w-5" />}
              />
            </>
          )}
        </div>

        {/* Recent Activity and Project Summary */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-primary">Recent Activity</h3>
              <p className="text-sm text-secondary">Latest updates from your projects</p>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <ChartBarIcon className="h-12 w-12 text-tertiary mx-auto mb-4" />
                  <p className="text-secondary">No recent activity to display</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-surface-hover transition-colors border border-default">
                      <div className="flex-shrink-0">
                        <div className="h-3 w-3 bg-primary rounded-full mt-1.5"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-primary font-medium mb-1">{activity.description}</p>
                            <p className="text-xs text-secondary mb-1">
                              {new Date(activity.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            <p className="text-xs text-tertiary">By: {activity.user_name}</p>
                          </div>
                          <div className="ml-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                              ${activity.activity_type === 'Finding Created' ? 'bg-info-light text-info' :
                                activity.activity_type === 'Finding Closed' ? 'bg-success-light text-success' :
                                'bg-warning-light text-warning'}`}
                            >
                              {activity.activity_type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Active Projects Summary */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-primary">Active Projects</h3>
              <p className="text-sm text-secondary">Current project overview</p>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border border-default rounded-lg">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-2/3 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mock active projects data */}
                  <div className="flex items-center justify-between p-3 border border-default rounded-lg hover:bg-surface-hover transition-colors">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-primary">Residential Housing Development</h4>
                      <p className="text-xs text-secondary">Client: Hometown Developers</p>
                      <p className="text-xs text-tertiary">5 open findings</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-light text-success">
                        Active
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-default rounded-lg hover:bg-surface-hover transition-colors">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-primary">Demo Construction Project</h4>
                      <p className="text-xs text-secondary">Client: ABC Corp</p>
                      <p className="text-xs text-tertiary">3 open findings</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-light text-success">
                        Active
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-default rounded-lg hover:bg-surface-hover transition-colors">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-primary">Industrial Warehouse Expansion</h4>
                      <p className="text-xs text-secondary">Client: LogiCorp Industries</p>
                      <p className="text-xs text-tertiary">2 open findings</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-info-light text-info">
                        Completed
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-default">
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Total Projects:</span>
                      <span className="font-medium text-primary">5</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-secondary">Active:</span>
                      <span className="font-medium text-success">2</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-secondary">Completed:</span>
                      <span className="font-medium text-info">3</span>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 