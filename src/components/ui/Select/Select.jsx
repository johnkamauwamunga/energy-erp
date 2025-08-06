import React from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

const Select = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option',
  className = '',
  selectClass = '',
  disabled = false,
  label = '',
  error = '',
  required = false,
  icon: Icon = null,
  ...props
}) => {
  const handleChange = (e) => {
    if (onChange) onChange(e);
  };

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        
        <select
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={clsx(
            'w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
            error ? 'border-red-300' : 'border-gray-300',
            selectClass
          )}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select;