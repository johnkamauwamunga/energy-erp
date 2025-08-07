// src/ui/Progress.jsx
import React from 'react';

const Progress = ({ value, className = '', color = 'primary' }) => {
  // Define color classes
  const colorClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600',
  };

  // Ensure value is between 0 and 100
  const progressValue = Math.min(100, Math.max(0, value));
  
  return (
    <div className={`w-full h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div 
        className={`h-full rounded-full transition-all duration-300 ease-in-out ${colorClasses[color] || colorClasses.primary}`}
        style={{ width: `${progressValue}%` }}
      />
    </div>
  );
};

export default Progress;