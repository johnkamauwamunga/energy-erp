import React from 'react';
import clsx from 'clsx';
import { User } from 'lucide-react';

const Avatar = ({
  src,
  alt,
  name,
  size = 'md', // 'sm', 'md', 'lg', 'xl', '2xl'
  shape = 'circle', // 'circle', 'rounded', 'square'
  status, // 'online', 'offline', 'away', 'busy'
  icon: Icon,
  className,
  ...props
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-20 h-20 text-xl'
  };

  // Shape classes
  const shapeClasses = {
    circle: 'rounded-full',
    rounded: 'rounded-lg',
    square: 'rounded-none'
  };

  // Status classes
  const statusClasses = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500'
  };

  // Generate initials from name
  const getInitials = (nameString) => {
    if (!nameString) return '';
    
    return nameString
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  // Generate background color based on name for consistency
  const getBackgroundColor = (nameString) => {
    if (!nameString) return 'bg-gray-400';
    
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    
    const index = nameString.length % colors.length;
    return colors[index];
  };

  const renderContent = () => {
    if (src) {
      return (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={clsx(
            'object-cover w-full h-full',
            shapeClasses[shape]
          )}
        />
      );
    }

    if (name) {
      return (
        <span className="font-semibold text-white">
          {getInitials(name)}
        </span>
      );
    }

    if (Icon) {
      return <Icon className="w-1/2 h-1/2 text-white" />;
    }

    return <User className="w-1/2 h-1/2 text-white" />;
  };

  return (
    <div className={clsx('relative inline-flex', className)} {...props}>
      <div
        className={clsx(
          'inline-flex items-center justify-center flex-shrink-0',
          'bg-gray-400 text-white font-medium select-none',
          sizeClasses[size],
          shapeClasses[shape],
          !src && name && getBackgroundColor(name)
        )}
      >
        {renderContent()}
      </div>

      {/* Status Indicator */}
      {status && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 block border-2 border-white',
            'rounded-full',
            statusClasses[status],
            size === 'sm' || size === 'md' ? 'w-2 h-2' : 'w-3 h-3',
            size === 'lg' && '-mr-0.5 -mb-0.5',
            size === 'xl' && '-mr-0.5 -mb-0.5',
            size === '2xl' && '-mr-1 -mb-1'
          )}
        />
      )}
    </div>
  );
};

export default Avatar;