import React, { useState, useEffect } from 'react';
import { 
  analyticsService, 
  CategoryAnalytics, 
  PerformanceAnalytics, 
  RiskAssessment, 
  ComplianceMetrics 
} from '../../services/analyticsService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

const AdvancedAnalytics: React.FC = () => {
  const [categoryData, setCategoryData] = useState<CategoryAnalytics[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceAnalytics[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const loadAdvancedAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - (selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90));

      const [categories, performance, risk, compliance] = await Promise.all([
        analyticsService.getCategoryAnalytics(dateFrom),
        analyticsService.getPerformanceAnalytics(dateFrom),
        analyticsService.getRiskAssessment(),
        analyticsService.getComplianceMetrics(dateFrom)
      ]);

      setCategoryData(categories);
      setPerformanceData(performance);
      setRiskAssessment(risk);
      setComplianceMetrics(compliance);
    } catch (err) {
      console.error('Error loading advanced analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvancedAnalytics();
  }, [selectedTimeRange]);

  const exportAnalytics = async () => {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - (selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90));
      
      const data = await analyticsService.exportAnalytics(dateFrom, new Date(), 'summary');
      
      // Create and download the export
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting analytics:', err);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600 mt-1">Deep insights into safety performance and compliance</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <button
            onClick={exportAnalytics}
            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
          >
            Export Data
          </button>
          
          <button
            onClick={loadAdvancedAnalytics}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Compliance & Risk Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Compliance Metrics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Overview</h3>
          {complianceMetrics && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Compliance Status</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getComplianceStatusColor(complianceMetrics.compliance_status)}`}>
                  {complianceMetrics.compliance_status.charAt(0).toUpperCase() + complianceMetrics.compliance_status.slice(1)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{complianceMetrics.compliance_score}%</div>
                  <div className="text-sm text-gray-500">Compliance Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{complianceMetrics.on_time_closure_rate}%</div>
                  <div className="text-sm text-gray-500">On-time Closure</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Regulatory Findings</span>
                  <span>{complianceMetrics.regulatory_findings} ({complianceMetrics.regulatory_percentage}%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Overdue Findings</span>
                  <span className="text-red-600">{complianceMetrics.overdue_findings}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pending Immediate Actions</span>
                  <span className="text-orange-600">{complianceMetrics.pending_immediate_actions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Closure Time</span>
                  <span>{complianceMetrics.avg_closure_time_days} days</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Risk Assessment */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Assessment</h3>
          {riskAssessment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{riskAssessment.overall_risk_score}</div>
                  <div className="text-sm text-gray-500">Overall Risk Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{riskAssessment.immediate_attention_required}</div>
                  <div className="text-sm text-gray-500">Immediate Actions</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Highest Risk Category</div>
                <div className="text-lg font-semibold text-red-600">{riskAssessment.highest_risk_category}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Risk by Category</div>
                <div className="space-y-1">
                  {riskAssessment.risk_by_category.slice(0, 3).map((category) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{category.category.replace('_', ' ')}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getRiskLevelColor(category.risk_level)}`}>
                        {category.risk_level} ({category.risk_score})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Analysis */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Findings by Category</h3>
        {categoryData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bar Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Total Findings by Category</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_findings" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Distribution by Category</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => `${category.replace('_', ' ')}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total_findings"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No category data available for the selected time range
          </div>
        )}
      </div>

      {/* Performance Analytics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Team Performance</h3>
        {performanceData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Performance Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Efficiency Scores</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="efficiency_score" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Table */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Top Performers</h4>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Closed</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {performanceData.slice(0, 5).map((user) => (
                      <tr key={user.user_id}>
                        <td className="px-3 py-2 text-sm text-gray-900">{user.name}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{user.assigned_findings}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{user.closed_findings}</td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            user.completion_rate >= 80 ? 'bg-green-100 text-green-800' :
                            user.completion_rate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {user.completion_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No performance data available for the selected time range
          </div>
        )}
      </div>

      {/* Category Risk Radar */}
      {riskAssessment && riskAssessment.risk_by_category.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Profile by Category</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={riskAssessment.risk_by_category}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 10]} />
              <Radar
                name="Risk Score"
                dataKey="risk_score"
                stroke="#EF4444"
                fill="#EF4444"
                fillOpacity={0.3}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalytics; 