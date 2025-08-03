import React from 'react';

const StatsCard = ({ title, value, icon: Icon, color = 'blue', trend }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600'
  };

  const trendColor = trend > 0 ? 'text-green-600' : 'text-red-600';
  const trendIcon = trend > 0 ? '▲' : '▼';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      {trend !== undefined && (
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${trendColor}`}>
            {trendIcon} {Math.abs(trend)}%
          </span>
          <span className="text-xs text-gray-500 ml-2">from last month</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;