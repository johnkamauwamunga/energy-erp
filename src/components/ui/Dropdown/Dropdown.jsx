// ui/Dropdown.js
import React, { useState, useRef, useEffect } from 'react';

const Dropdown = ({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select an option",
  required = false, 
  className = "", 
  error, 
  icon: Icon 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue) => {
    if (onChange) {
      // Create a synthetic event to match the Input component's interface
      const syntheticEvent = {
        target: {
          value: optionValue,
          name: label // You might want to pass a name prop for forms
        }
      };
      onChange(syntheticEvent);
    }
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`mb-4 ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Dropdown Trigger */}
        <button
          type="button"
          className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-10 py-2 border ${
            error ? 'border-red-300' : 'border-gray-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex items-center justify-between`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center">
            {Icon && (
              <Icon className="h-5 w-5 text-gray-400 mr-2" />
            )}
            <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          
          {/* Chevron Icon */}
          <svg 
            className={`h-5 w-5 text-gray-400 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">No options available</div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                    option.value === value ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Dropdown;