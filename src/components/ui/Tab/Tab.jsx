import React from 'react';
import clsx from 'clsx';

const Tab = ({ 
  value, 
  icon: Icon, 
  children, 
  isActive, 
  onClick, 
  variant = 'default',
  className
}) => {
  return (
    <button
      value={value}
      onClick={onClick}
      className={clsx(
        "flex items-center px-4 py-2.5 text-sm font-medium transition-colors duration-200",
        variant === 'default' && [
          "border-b-2",
          isActive 
            ? "text-blue-600 border-blue-500" 
            : "text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300"
        ],
        variant === 'pills' && [
          "rounded-md",
          isActive 
            ? "bg-blue-100 text-blue-800" 
            : "text-gray-600 hover:bg-gray-100"
        ],
        className
      )}
    >
      {Icon && <Icon className={clsx("w-4 h-4", children ? "mr-2" : "")} />}
      {children}
    </button>
  );
};

export default Tab;