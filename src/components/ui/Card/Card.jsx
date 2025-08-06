import React from 'react';
import clsx from 'clsx';

const Card = ({ 
  children, 
  className, 
  title, 
  icon: Icon, 
  titleClass,
  headerClass,
  bodyClass,
  actions,  // ✅ Add actions prop
  ...props 
}) => {
  return (
    <div 
      className={clsx(
        'bg-white rounded-xl shadow-md overflow-hidden',
        className
      )}
      {...props}
    >
      {(title || actions) && (
        <div className={clsx(
          'px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center',
          headerClass
        )}>
          <div className="flex items-center">
            {Icon && <Icon className="w-5 h-5 mr-2 text-gray-600" />}
            {title && (
              <h3 className={clsx('text-lg font-semibold text-gray-900', titleClass)}>
                {title}
              </h3>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={clsx('p-4', bodyClass)}>
        {children}
      </div>
    </div>
  );
};

export default Card;
