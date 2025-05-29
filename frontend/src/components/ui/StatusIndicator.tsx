import React from 'react';
import { 
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type StatusType = 'open' | 'in_progress' | 'resolved' | 'closed';

interface SeverityIndicatorProps {
  severity: SeverityLevel;
  showIcon?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

interface StatusIndicatorProps {
  status: StatusType;
  showIcon?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const severityConfig = {
  critical: {
    icon: ExclamationTriangleIcon,
    text: 'Critical',
    class: 'severity-critical'
  },
  high: {
    icon: ExclamationCircleIcon,
    text: 'High',
    class: 'severity-high'
  },
  medium: {
    icon: InformationCircleIcon,
    text: 'Medium',
    class: 'severity-medium'
  },
  low: {
    icon: CheckCircleIcon,
    text: 'Low',
    class: 'severity-low'
  }
};

const statusConfig = {
  open: {
    icon: PlayIcon,
    text: 'Open',
    class: 'status-open'
  },
  in_progress: {
    icon: ArrowPathIcon,
    text: 'In Progress',
    class: 'status-in-progress'
  },
  resolved: {
    icon: CheckCircleIcon,
    text: 'Resolved',
    class: 'status-resolved'
  },
  closed: {
    icon: CheckCircleIcon,
    text: 'Closed',
    class: 'status-closed'
  }
};

export const SeverityIndicator: React.FC<SeverityIndicatorProps> = ({
  severity,
  showIcon = true,
  showText = true,
  size = 'md',
  animated = false,
  className = ''
}) => {
  const config = severityConfig[severity];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const animationClass = animated ? 'animate-pulse' : '';
  
  return (
    <span className={`
      status-indicator ${config.class} ${sizeClasses[size]} ${animationClass} ${className}
    `}>
      {showIcon && <Icon className={`${iconSizes[size]} ${showText ? 'mr-1' : ''}`} />}
      {showText && config.text}
    </span>
  );
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  showIcon = true,
  showText = true,
  size = 'md',
  animated = false,
  className = ''
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const animationClass = animated ? 'animate-pulse' : '';
  
  return (
    <span className={`
      status-indicator ${config.class} ${sizeClasses[size]} ${animationClass} ${className}
    `}>
      {showIcon && <Icon className={`${iconSizes[size]} ${showText ? 'mr-1' : ''}`} />}
      {showText && config.text}
    </span>
  );
};

// Priority Badge Component
interface PriorityBadgeProps {
  priority: number; // 1-5 scale
  showNumber?: boolean;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showNumber = true,
  className = ''
}) => {
  const getSeverityFromPriority = (p: number): SeverityLevel => {
    if (p >= 4) return 'critical';
    if (p >= 3) return 'high';
    if (p >= 2) return 'medium';
    return 'low';
  };

  const severity = getSeverityFromPriority(priority);
  
  if (showNumber) {
    return (
      <span className={`
        status-indicator ${severityConfig[severity].class} text-sm px-3 py-1 ${className}
      `}>
        <span className="font-bold">{priority}</span>
      </span>
    );
  }
  
  return (
    <SeverityIndicator
      severity={severity}
      showText={false}
      showIcon={true}
      className={className}
    />
  );
};

// Progress Indicator Component
interface ProgressIndicatorProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  animated?: boolean;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  percentage,
  size = 'md',
  showPercentage = true,
  color = 'primary',
  animated = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  };

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-secondary">Progress</span>
          <span className="text-sm text-primary font-medium">{percentage}%</span>
        </div>
      )}
      <div className={`bg-secondary rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-500 ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}; 