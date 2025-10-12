// components/ui/PieChart.jsx
import React from 'react';

const PieChart = ({ 
  data = [], 
  width = 200, 
  height = 200, 
  className = '' 
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 10;

  let currentAngle = 0;

  const getCoordinates = (angle) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad)
    };
  };

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      <svg width={width} height={height} className="w-full">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const angle = (item.value / total) * 360;
          
          const start = getCoordinates(currentAngle);
          const end = getCoordinates(currentAngle + angle);
          
          const largeArc = angle > 180 ? 1 : 0;
          
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${start.x} ${start.y}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
            'Z'
          ].join(' ');

          currentAngle += angle;

          return (
            <g key={index}>
              <path
                d={pathData}
                fill={item.color || `hsl(${index * 60}, 70%, 60%)`}
                className="transition-all duration-300 hover:opacity-80"
              />
              
              {/* Label in the center for the largest segment */}
              {index === 0 && (
                <text
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  className="text-sm font-bold fill-gray-800"
                >
                  {total}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: item.color || `hsl(${index * 60}, 70%, 60%)` }}
            />
            <span className="text-xs text-gray-600">
              {item.label}: {((item.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;