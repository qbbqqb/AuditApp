import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  modern?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  modern = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const baseClasses = modern ? 'btn-modern' : 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: modern 
      ? 'btn-primary' 
      : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 hover:border-gray-400 focus:ring-gray-500',
    success: 'bg-green-600 hover:bg-green-700 text-white border border-green-600 hover:border-green-700 focus:ring-green-500',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white border border-yellow-500 hover:border-yellow-600 focus:ring-yellow-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-600 hover:border-red-700 focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border border-transparent hover:border-gray-300 focus:ring-gray-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-sm rounded-md',
    lg: 'px-6 py-3 text-base rounded-lg',
    xl: 'px-8 py-4 text-lg rounded-lg'
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';
  const fullWidthClass = fullWidth ? 'w-full' : '';

  const buttonClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    (disabled || loading) ? disabledClasses : '',
    fullWidthClass,
    className
  ].filter(Boolean).join(' ');

  const renderIcon = () => {
    if (loading) {
      return <div className="spinner w-4 h-4" />;
    }
    return icon;
  };

  const iconElement = renderIcon();

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {iconElement && iconPosition === 'left' && (
        <span className={children ? 'mr-2' : ''}>{iconElement}</span>
      )}
      
      {children}
      
      {iconElement && iconPosition === 'right' && (
        <span className={children ? 'ml-2' : ''}>{iconElement}</span>
      )}
    </button>
  );
};

// Specialized button variants
export const IconButton: React.FC<Omit<ButtonProps, 'children'> & { 
  icon: React.ReactNode; 
  'aria-label': string;
}> = ({ icon, size = 'md', ...props }) => {
  const iconSizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
    xl: 'p-4'
  };

  return (
    <Button
      {...props}
      size={size}
      className={`${iconSizes[size]} !px-0 ${props.className || ''}`}
    >
      {icon}
    </Button>
  );
};

export const LoadingButton: React.FC<ButtonProps & { loadingText?: string }> = ({
  loading,
  loadingText,
  children,
  ...props
}) => (
  <Button loading={loading} {...props}>
    {loading && loadingText ? loadingText : children}
  </Button>
);

export const FloatingActionButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}> = ({ 
  icon, 
  onClick, 
  className = '', 
  position = 'bottom-right' 
}) => {
  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6'
  };

  return (
    <button
      onClick={onClick}
      className={`
        ${positionClasses[position]}
        w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full
        shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200
        flex items-center justify-center z-50 ${className}
      `}
    >
      {icon}
    </button>
  );
}; 