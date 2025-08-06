import React from 'react';
import clsx from 'clsx';

const Tabs = ({ 
  value, 
  onChange, 
  children, 
  className,
  variant = 'default' // 'default' or 'pills'
}) => {
  return (
    <div className={clsx(
      "flex",
      variant === 'default' && "border-b border-gray-200",
      variant === 'pills' && "space-x-2",
      className
    )}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            isActive: child.props.value === value,
            onClick: () => onChange(child.props.value),
            variant
          });
        }
        return child;
      })}
    </div>
  );
};

export default Tabs;