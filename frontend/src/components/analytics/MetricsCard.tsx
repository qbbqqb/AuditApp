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
  const colorStyles = {
    blue: {
      background: 'var(--color-primary-light)',
      color: 'var(--color-primary)'
    },
    green: {
      background: 'var(--color-success-light)',
      color: 'var(--color-success)'
    },
    red: {
      background: 'var(--color-danger-light)',
      color: 'var(--color-danger)'
    },
    yellow: {
      background: 'var(--color-warning-light)',
      color: 'var(--color-warning)'
    },
    purple: {
      background: 'var(--color-info-light)',
      color: 'var(--color-info)'
    }
  };

  if (loading) {
    return (
      <div
        className="overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ padding: 'var(--space-6)' }}>
          <div className="animate-pulse">
            <div className="flex items-center gap-4">
              <div
                style={{
                  height: '3rem',
                  width: '3rem',
                  backgroundColor: 'var(--color-background-secondary)',
                  borderRadius: 'var(--radius-lg)'
                }}
              />
              <div className="flex-1">
                <div
                  style={{
                    height: '1rem',
                    backgroundColor: 'var(--color-background-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    width: '75%',
                    marginBottom: 'var(--space-2)'
                  }}
                />
                <div
                  style={{
                    height: '2rem',
                    backgroundColor: 'var(--color-background-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    width: '50%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden transition-all"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        transition: 'all var(--transition-smooth)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'var(--color-border-light)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      <div style={{ padding: 'var(--space-6)' }}>
        <div className="flex items-start gap-4">
          {icon && (
            <div className="flex-shrink-0">
              <div
                style={{
                  width: '3rem',
                  height: '3rem',
                  backgroundColor: colorStyles[color].background,
                  color: colorStyles[color].color,
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}
              >
                {icon}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <dl>
              <dt
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-1)',
                  letterSpacing: 'var(--letter-spacing-wide)',
                  textTransform: 'uppercase'
                }}
              >
                {title}
              </dt>
              <dd className="flex items-baseline flex-wrap gap-2">
                <div
                  style={{
                    fontSize: 'var(--font-size-3xl)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-text-primary)',
                    lineHeight: 'var(--line-height-tight)'
                  }}
                >
                  {value}
                </div>
                {trend && (
                  <div
                    className="flex items-baseline gap-1"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: trend.isPositive ? 'var(--color-success)' : 'var(--color-danger)'
                    }}
                  >
                    <span className="sr-only">{trend.isPositive ? 'Increased' : 'Decreased'} by</span>
                    {trend.value > 0 ? '+' : ''}{trend.value}%
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 'var(--font-weight-normal)'
                      }}
                    >
                      {trend.period}
                    </span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
        {description && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                lineHeight: 'var(--line-height-relaxed)'
              }}
            >
              {description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsCard; 