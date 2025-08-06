import React from 'react';
import clsx from 'clsx';

const Badge = ({ 
  variant = 'default', // 'default', 'primary', 'success', 'warning', 'danger', 'info'
  size = 'md', // 'sm', 'md', 'lg'
  pill = false,
  icon: Icon,
  className,
  children,
  ...props
}) => {
  const variantClasses = {
    default: "bg-gray-100 text-gray-800",
    primary: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-indigo-100 text-indigo-800",
    cosmic: "bg-purple-100 text-purple-800"
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1"
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium",
        variantClasses[variant],
        sizeClasses[size],
        pill ? "rounded-full" : "rounded-md",
        className
      )}
      {...props}
    >
      {Icon && <Icon className={clsx(children ? "mr-1.5" : "", sizeClasses[size].includes('text-xs') ? "w-3 h-3" : "w-4 h-4")} />}
      {children}
    </span>
  );
};

export default Badge;