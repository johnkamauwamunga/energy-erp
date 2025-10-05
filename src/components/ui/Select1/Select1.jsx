import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, Check, Search, X } from 'lucide-react';

const Select1 = ({
  options = [],
  value = '',
  onChange,
  onBlur,
  placeholder = 'Select an option',
  className = '',
  selectClass = '',
  disabled = false,
  label = '',
  error = '',
  required = false,
  icon: Icon = null,
  loading = false,
  searchable = false,
  clearable = false,
  size = 'md',
  variant = 'default',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectRef = useRef(null);
  const searchInputRef = useRef(null);
  const listboxRef = useRef(null);

  const sizeClasses = {
    sm: 'py-1 px-3 text-sm',
    md: 'py-2 px-3 text-base',
    lg: 'py-3 px-4 text-lg'
  };

  const variantClasses = {
    default: {
      base: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
      error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
      disabled: 'bg-gray-100 text-gray-500'
    },
    filled: {
      base: 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-blue-500 focus:bg-white',
      error: 'border-red-200 bg-red-50 focus:border-red-500 focus:ring-red-500 focus:bg-white',
      disabled: 'bg-gray-100 text-gray-500'
    }
  };

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const options = listboxRef.current.querySelectorAll('[role="option"]');
      if (options[highlightedIndex]) {
        options[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleToggle = () => {
    if (disabled || loading) return;
    setIsOpen(!isOpen);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleSelect = (optionValue, optionLabel) => {
    if (onChange) {
      const event = {
        target: { value: optionValue, name: props.name },
        selectedLabel: optionLabel
      };
      onChange(event);
    }
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      const event = {
        target: { value: '', name: props.name },
        selectedLabel: ''
      };
      onChange(event);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(
            filteredOptions[highlightedIndex].value,
            filteredOptions[highlightedIndex].label
          );
        }
        break;
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(
            filteredOptions[highlightedIndex].value,
            filteredOptions[highlightedIndex].label
          );
        }
        break;
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(0);
  };

  const getDisplayValue = () => {
    if (searchable && isOpen) return searchTerm;
    return selectedOption ? selectedOption.label : '';
  };

  return (
    <div className={clsx('w-full relative', className)} ref={selectRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Input/Trigger */}
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${props.id || 'select'}-listbox`}
          className={clsx(
            'w-full border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors cursor-pointer',
            sizeClasses[size],
            disabled && variantClasses[variant].disabled,
            error ? variantClasses[variant].error : variantClasses[variant].base,
            selectClass
          )}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              {Icon && (
                <Icon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              )}
              
              {searchable && isOpen ? (
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full bg-transparent outline-none"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder={placeholder}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={clsx(
                  'truncate',
                  !value && 'text-gray-400'
                )}>
                  {selectedOption ? selectedOption.label : placeholder}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1 ml-2">
              {clearable && value && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              
              {loading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <ChevronDown className={clsx(
                  'h-4 w-4 text-gray-400 transition-transform',
                  isOpen && 'rotate-180'
                )} />
              )}
            </div>
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            id={`${props.id || 'select'}-listbox`}
            role="listbox"
            ref={listboxRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-sm">
                {searchTerm ? 'No options found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={value === option.value}
                  className={clsx(
                    'px-3 py-2 cursor-pointer transition-colors flex items-center justify-between',
                    value === option.value && 'bg-blue-50 text-blue-700',
                    index === highlightedIndex && 'bg-gray-100',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !option.disabled && handleSelect(option.value, option.label)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-center">
                    {option.icon && (
                      <option.icon className="h-4 w-4 mr-2 text-gray-400" />
                    )}
                    <span className={clsx(
                      option.disabled && 'text-gray-400'
                    )}>
                      {option.label}
                    </span>
                  </div>
                  
                  {value === option.value && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
export default Select1;