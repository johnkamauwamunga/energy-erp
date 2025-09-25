import React from 'react';
import clsx from 'clsx';

const SearchInput = ({
  value,
  onChange,
  placeholder = "Search...",
  icon: Icon,
  className,
  inputClassName,
  iconClassName,
  disabled = false,
  onClear,
  ...props
}) => {
  return (
    <div className={clsx(
      'relative rounded-md shadow-sm',
      className
    )}>
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className={clsx(
            'h-4 w-4 text-gray-400',
            iconClassName
          )} />
        </div>
      )}
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx(
          'block w-full rounded-md border border-gray-300 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
          Icon ? 'pl-10' : 'pl-3',
          onClear ? 'pr-10' : 'pr-3',
          disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900',
          inputClassName
        )}
        {...props}
      />
      
      {onClear && value && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            type="button"
            onClick={onClear}
            className="h-4 w-4 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchInput;