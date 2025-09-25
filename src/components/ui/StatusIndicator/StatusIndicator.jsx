import React from 'react';
import clsx from 'clsx';

const StatusIndicator = ({
  status = 'default', // 'success', 'warning', 'error', 'default', 'loading'
  size = 'md', // 'sm', 'md', 'lg'
  pulse = false,
  className,
  children,
  ...props
}) => {
  const statusStyles = {
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    error: 'bg-red-400',
    default: 'bg-gray-400',
    loading: 'bg-blue-400'
  };

  const sizeStyles = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className={clsx('inline-flex items-center', className)} {...props}>
      <span
        className={clsx(
          'rounded-full',
          statusStyles[status],
          sizeStyles[size],
          pulse && 'animate-pulse'
        )}
      />
      {children && (
        <span className={clsx(
          'ml-2 text-sm font-medium',
          status === 'success' && 'text-green-700',
          status === 'warning' && 'text-yellow-700',
          status === 'error' && 'text-red-700',
          status === 'default' && 'text-gray-700',
          status === 'loading' && 'text-blue-700'
        )}>
          {children}
        </span>
      )}
    </div>
  );
};

// Convenience components
StatusIndicator.Success = (props) => <StatusIndicator status="success" {...props} />;
StatusIndicator.Warning = (props) => <StatusIndicator status="warning" {...props} />;
StatusIndicator.Error = (props) => <StatusIndicator status="error" {...props} />;
StatusIndicator.Loading = (props) => <StatusIndicator status="loading" pulse {...props} />;
StatusIndicator.Default = (props) => <StatusIndicator status="default" {...props} />;

export default StatusIndicator;