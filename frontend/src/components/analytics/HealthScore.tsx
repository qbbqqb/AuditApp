import React from 'react';

interface HealthScoreProps {
  score: number; // 0-100
  title: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  loading?: boolean;
}

const HealthScore: React.FC<HealthScoreProps> = ({
  score,
  title,
  size = 'md',
  showDetails = true,
  loading = false
}) => {
  // Determine health level and colors
  const getHealthLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: 'green' };
    if (score >= 75) return { level: 'Good', color: 'blue' };
    if (score >= 60) return { level: 'Fair', color: 'yellow' };
    if (score >= 40) return { level: 'Poor', color: 'orange' };
    return { level: 'Critical', color: 'red' };
  };

  const health = getHealthLevel(score);

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-24 h-24',
      circle: 'w-20 h-20',
      text: 'text-lg',
      strokeWidth: 4
    },
    md: {
      container: 'w-32 h-32',
      circle: 'w-28 h-28',
      text: 'text-xl',
      strokeWidth: 6
    },
    lg: {
      container: 'w-40 h-40',
      circle: 'w-36 h-36',
      text: 'text-2xl',
      strokeWidth: 8
    }
  };

  const config = sizeConfig[size];

  // Color configurations
  const colorConfig = {
    green: {
      stroke: '#10b981',
      background: '#dcfce7',
      text: 'text-green-700'
    },
    blue: {
      stroke: '#3b82f6',
      background: '#dbeafe',
      text: 'text-blue-700'
    },
    yellow: {
      stroke: '#f59e0b',
      background: '#fef3c7',
      text: 'text-yellow-700'
    },
    orange: {
      stroke: '#f97316',
      background: '#fed7aa',
      text: 'text-orange-700'
    },
    red: {
      stroke: '#ef4444',
      background: '#fecaca',
      text: 'text-red-700'
    }
  };

  const colors = colorConfig[health.color as keyof typeof colorConfig];

  // Calculate circle parameters
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  if (loading) {
    return (
      <div className="bg-surface p-6 rounded-lg shadow-base border border-default">
        <h3 className="text-lg font-medium text-primary mb-4">{title}</h3>
        <div className="animate-pulse flex justify-center">
          <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface p-6 rounded-lg shadow-base border border-default">
      <h3 className="text-lg font-medium text-primary mb-4">{title}</h3>
      
      <div className="flex items-center justify-center">
        <div className="relative">
          {/* Background circle */}
          <svg className={config.container} viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#e5e7eb"
              strokeWidth={config.strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={colors.stroke}
              strokeWidth={config.strokeWidth}
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          {/* Score text overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`${config.text} font-bold text-primary`}>
                {Math.round(score)}
              </div>
              <div className="text-xs text-gray-500">
                /100
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 text-center">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors.text}`}
               style={{ backgroundColor: colors.background }}>
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              {health.level === 'Excellent' && (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              )}
              {health.level === 'Good' && (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              )}
              {(health.level === 'Fair' || health.level === 'Poor') && (
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              )}
              {health.level === 'Critical' && (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              )}
            </svg>
            {health.level}
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            {health.level === 'Excellent' && 'Outstanding safety performance'}
            {health.level === 'Good' && 'Strong safety performance'}
            {health.level === 'Fair' && 'Moderate safety performance'}
            {health.level === 'Poor' && 'Below average safety performance'}
            {health.level === 'Critical' && 'Immediate attention required'}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthScore; 