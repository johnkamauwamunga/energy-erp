// components/ui/DonutChart.jsx
import React from 'react';

const DonutChart = ({ 
  data = [], 
  width = 200, 
  height = 200,
  innerRadius = 0.6,
  className = '' 
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 10;
  const innerRadiusValue = radius * innerRadius;

  let currentAngle = 0;

  const getCoordinates = (angle, isInner = false) => {
    const rad = (angle * Math.PI) / 180;
    const r = isInner ? innerRadiusValue : radius;
    return {
      x: centerX + r * Math.cos(rad),
      y: centerY + r * Math.sin(rad)
    };
  };

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      <svg width={width} height={height} className="w-full">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const angle = (item.value / total) * 360;
          
          const startOuter = getCoordinates(currentAngle);
          const endOuter = getCoordinates(currentAngle + angle);
          const startInner = getCoordinates(currentAngle, true);
          const endInner = getCoordinates(currentAngle + angle, true);
          
          const largeArc = angle > 180 ? 1 : 0;
          
          const pathData = [
            `M ${startInner.x} ${startInner.y}`,
            `L ${startOuter.x} ${startOuter.y}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
            `L ${endInner.x} ${endInner.y}`,
            `A ${innerRadiusValue} ${innerRadiusValue} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
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
            </g>
          );
        })}

        {/* Center text */}
        <text
          x={centerX}
          y={centerY - 5}
          textAnchor="middle"
          className="text-lg font-bold fill-gray-800"
        >
          {total}
        </text>
        <text
          x={centerX}
          y={centerY + 15}
          textAnchor="middle"
          className="text-xs fill-gray-500"
        >
          Total
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: item.color || `hsl(${index * 60}, 70%, 60%)` }}
            />
            <span className="text-xs text-gray-600">
              {item.label}
            </span>
            <span className="text-xs font-medium text-gray-800">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;