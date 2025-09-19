import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { ChevronDown, X } from 'lucide-react';

const MultiSelect = ({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select options',
  className = '',
  disabled = false,
  label = '',
  error = '',
  required = false,
  isLoading = false,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    
    if (onChange) {
      // Create a synthetic event to match the single select interface
      const syntheticEvent = {
        target: {
          value: newValue,
          name: props.name
        }
      };
      onChange(syntheticEvent);
    }
  };

  const removeOption = (optionValue, e) => {
    e.stopPropagation();
    const newValue = value.filter(v => v !== optionValue);
    
    if (onChange) {
      const syntheticEvent = {
        target: {
          value: newValue,
          name: props.name
        }
      };
      onChange(syntheticEvent);
    }
  };

  const clearAll = (e) => {
    e.stopPropagation();
    if (onChange) {
      const syntheticEvent = {
        target: {
          value: [],
          name: props.name
        }
      };
      onChange(syntheticEvent);
    }
  };

  // Get selected options for display
  const selectedOptions = options.filter(option => value.includes(option.value));

  return (
    <div className={clsx('w-full relative', className)} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div
        className={clsx(
          'w-full min-h-10 p-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer',
          error ? 'border-red-300' : 'border-gray-300',
          isOpen && 'ring-2 ring-blue-500 border-blue-500'
        )}
        onClick={handleToggle}
      >
        <div className="flex flex-wrap gap-1">
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            selectedOptions.map(option => (
              <span
                key={option.value}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {option.label}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeOption(option.value, e)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        
        {value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={clearAll}
            className="absolute right-8 top-3 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        
        <div className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <ChevronDown className={clsx('h-4 w-4 transition-transform', isOpen && 'transform rotate-180')} />
        </div>
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-2 text-center text-gray-500">Loading options...</div>
          ) : options.length === 0 ? (
            <div className="p-2 text-center text-gray-500">No options available</div>
          ) : (
            options.map(option => (
              <div
                key={option.value}
                className={clsx(
                  'p-2 cursor-pointer hover:bg-blue-50',
                  value.includes(option.value) && 'bg-blue-100'
                )}
                onClick={() => handleSelect(option.value)}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value.includes(option.value)}
                    readOnly
                    className="mr-2"
                  />
                  <span>{option.label}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default MultiSelect;