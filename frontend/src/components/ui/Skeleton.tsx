import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height
}) => (
  <div 
    className={`skeleton ${className}`}
    style={{ 
      width: width || '100%', 
      height: height || '1rem',
      borderRadius: 'var(--radius-sm)'
    }}
  />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = ''
}) => (
  <div className={className}>
    {Array.from({ length: lines }).map((_, index) => (
      <div 
        key={index}
        className="skeleton skeleton-text"
        style={{
          width: index === lines - 1 ? '60%' : '100%'
        }}
      />
    ))}
  </div>
);

export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`skeleton skeleton-avatar ${sizeClasses[size]} ${className}`} />
  );
};

export const SkeletonButton: React.FC<{ className?: string }> = ({
  className = ''
}) => (
  <div className={`skeleton skeleton-button ${className}`} />
);

export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = ''
}) => (
  <div className={`card ${className}`}>
    <div className="card-body">
      <div className="flex items-start space-x-4">
        <SkeletonAvatar />
        <div className="flex-1">
          <SkeletonText lines={3} />
          <div className="mt-4 flex space-x-2">
            <SkeletonButton />
            <SkeletonButton />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => (
  <div className={`card ${className}`}>
    <div className="card-body">
      {/* Table Header */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} height="1.5rem" />
        ))}
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={`row-${rowIndex}`}
          className="grid gap-4 mb-3" 
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({
  items = 5,
  className = ''
}) => (
  <div className={className}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="card mb-4">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <SkeletonAvatar size="sm" />
            <div className="flex-1">
              <Skeleton height="1.25rem" width="60%" className="mb-2" />
              <SkeletonText lines={2} />
            </div>
            <div className="flex space-x-2">
              <SkeletonButton />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
); 