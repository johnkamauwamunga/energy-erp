// TabPanel.jsx
import React from 'react';
import clsx from 'clsx';

const TabPanel = ({ 
  value, 
  tabId, 
  children, 
  className,
  ...props 
}) => {
  if (value !== tabId) return null;
  
  return (
    <div 
      className={clsx("tab-panel", className)}
      role="tabpanel"
      aria-labelledby={`tab-${tabId}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default TabPanel;