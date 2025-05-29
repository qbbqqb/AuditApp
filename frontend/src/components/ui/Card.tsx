import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  interactive?: boolean;
  loading?: boolean;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  elevated = false,
  interactive = false,
  loading = false,
  severity,
  onClick
}) => {
  const cardClasses = [
    'card',
    elevated ? 'card-elevated' : '',
    interactive ? 'interactive' : '',
    severity ? `severity-${severity}` : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={`${cardClasses} animate-fade-in`}
      onClick={interactive ? onClick : undefined}
      style={{ position: 'relative' }}
    >
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      )}
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`card-header ${className}`}>
    {children}
  </div>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`card-body ${className}`}>
    {children}
  </div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`card-footer ${className}`}>
    {children}
  </div>
); 