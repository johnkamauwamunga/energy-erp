import React from 'react';
import clsx from 'clsx';

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  className,
  action,
  actionLabel = "Take action",
  onAction,
  size = "md" // sm, md, lg
}) => {
  const sizeStyles = {
    sm: {
      icon: 'w-8 h-8',
      title: 'text-lg',
      description: 'text-sm'
    },
    md: {
      icon: 'w-12 h-12',
      title: 'text-xl',
      description: 'text-base'
    },
    lg: {
      icon: 'w-16 h-16',
      title: 'text-2xl',
      description: 'text-lg'
    }
  };

  return (
    <div className={clsx(
      'flex flex-col items-center justify-center text-center p-8',
      className
    )}>
      {Icon && (
        <div className={clsx(
          'rounded-full bg-gray-100 p-3 mb-4',
          sizeStyles[size].icon
        )}>
          <Icon className="w-full h-full text-gray-400" />
        </div>
      )}
      
      {title && (
        <h3 className={clsx(
          'font-semibold text-gray-900 mb-2',
          sizeStyles[size].title
        )}>
          {title}
        </h3>
      )}
      
      {description && (
        <p className={clsx(
          'text-gray-600 max-w-md mx-auto mb-4',
          sizeStyles[size].description
        )}>
          {description}
        </p>
      )}
      
      {action && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {actionLabel}
        </button>
      )}
      
      {action && React.isValidElement(action) && action}
    </div>
  );
};

export default EmptyState;