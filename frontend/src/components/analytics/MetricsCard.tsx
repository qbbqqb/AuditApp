import React from 'react';

interface MetricsCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  loading?: boolean;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  color = 'blue',
  loading = false
}) => {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    purple: 'border-purple-200 bg-purple-50 text-purple-700'
  };

  if (loading) {
    return (
      <div className="bg-surface overflow-hidden shadow-base rounded-lg border border-default">
        <div className="p-5">
          <div className="animate-pulse">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface overflow-hidden shadow-base rounded-lg hover:shadow-md transition-all duration-200 border border-default">
      <div className="p-5">
        <div className="flex items-center">
          {icon && (
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 ${colorClasses[color]} rounded-md flex items-center justify-center`}>
                {icon}
              </div>
            </div>
          )}
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-secondary truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-primary">{value}</div>
                {trend && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    trend.isPositive ? 'text-success' : 'text-danger'
                  }`}>
                    <span className="sr-only">{trend.isPositive ? 'Increased' : 'Decreased'} by</span>
                    {trend.value > 0 ? '+' : ''}{trend.value}%
                    <span className="ml-1 text-xs text-secondary">{trend.period}</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
        {description && (
          <div className="mt-2">
            <p className="text-sm text-secondary">{description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsCard; 