// components/ui/Tooltip.jsx
import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

const Tooltip = ({ 
  children, 
  content, 
  placement = 'top',
  delay = 200,
  interactive = false,
  className,
  maxWidth = 300,
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);
  let timeout;

  const showTooltip = () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current?.getBoundingClientRect();
        
        let top = 0;
        let left = 0;

        switch (placement) {
          case 'top':
            top = rect.top - (tooltipRect?.height || 0) - 8;
            left = rect.left + rect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + 8;
            left = rect.left + rect.width / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2;
            left = rect.left - (tooltipRect?.width || 0) - 8;
            break;
          case 'right':
            top = rect.top + rect.height / 2;
            left = rect.right + 8;
            break;
          default:
            top = rect.top - (tooltipRect?.height || 0) - 8;
            left = rect.left + rect.width / 2;
        }

        setPosition({ top, left });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeout) clearTimeout(timeout);
    setIsVisible(false);
  };

  // Handle click outside for interactive tooltips
  useEffect(() => {
    if (!interactive || !isVisible) return;

    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        hideTooltip();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [interactive, isVisible]);

  return (
    <div className={clsx('relative inline-block', className)} {...props}>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={interactive ? undefined : hideTooltip}
        onClick={interactive ? showTooltip : undefined}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={clsx(
            'fixed z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm',
            'transform -translate-x-1/2',
            {
              'top-0 left-0': placement === 'top',
              'bottom-0 left-0': placement === 'bottom',
              'top-1/2 left-0 transform -translate-y-1/2': placement === 'left',
              'top-1/2 left-full transform -translate-y-1/2': placement === 'right',
            }
          )}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxWidth: `${maxWidth}px`,
          }}
          onMouseEnter={interactive ? showTooltip : undefined}
          onMouseLeave={interactive ? hideTooltip : undefined}
        >
          {content}
          
          {/* Tooltip arrow */}
          <div
            className={clsx(
              'absolute w-2 h-2 bg-gray-900 transform rotate-45',
              {
                'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2': placement === 'top',
                'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2': placement === 'bottom',
                'right-0 top-1/2 -translate-y-1/2 translate-x-1/2': placement === 'left',
                'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2': placement === 'right',
              }
            )}
          />
        </div>
      )}
    </div>
  );
};

// Variant for different styles
Tooltip.Info = ({ children, content, ...props }) => (
  <Tooltip 
    content={
      <div className="flex items-center space-x-2">
        <InfoIcon className="w-4 h-4 text-blue-400" />
        <span>{content}</span>
      </div>
    }
    {...props}
  >
    {children}
  </Tooltip>
);

Tooltip.Warning = ({ children, content, ...props }) => (
  <Tooltip 
    content={
      <div className="flex items-center space-x-2">
        <AlertTriangleIcon className="w-4 h-4 text-yellow-400" />
        <span>{content}</span>
      </div>
    }
    {...props}
  >
    {children}
  </Tooltip>
);

Tooltip.Error = ({ children, content, ...props }) => (
  <Tooltip 
    content={
      <div className="flex items-center space-x-2">
        <AlertCircleIcon className="w-4 h-4 text-red-400" />
        <span>{content}</span>
      </div>
    }
    {...props}
  >
    {children}
  </Tooltip>
);

Tooltip.Success = ({ children, content, ...props }) => (
  <Tooltip 
    content={
      <div className="flex items-center space-x-2">
        <CheckCircleIcon className="w-4 h-4 text-green-400" />
        <span>{content}</span>
      </div>
    }
    {...props}
  >
    {children}
  </Tooltip>
);

// Icon components (you can replace these with your actual icons)
const InfoIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

const AlertTriangleIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const AlertCircleIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

export default Tooltip;