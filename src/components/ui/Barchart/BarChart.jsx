// components/ui/BarChart.jsx
import React from 'react';

const BarChart = ({ 
  data = [], 
  width = 400, 
  height = 200, 
  color = '#3b82f6',
  showGrid = true,
  showValues = true,
  className = ''
}) => {
  const maxValue = Math.max(...data.map(item => item.value), 1);
  const barWidth = (width - 40) / data.length;

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      <svg width={width} height={height} className="w-full">
        {/* Grid lines */}
        {showGrid && [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
          <line
            key={index}
            x1={20}
            y1={height - 40 - (height - 60) * ratio}
            x2={width - 20}
            y2={height - 40 - (height - 60) * ratio}
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        ))}

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = ((item.value / maxValue) * (height - 60));
          const x = 20 + index * barWidth + barWidth * 0.1;
          const y = height - 40 - barHeight;
          
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth * 0.8}
                height={barHeight}
                fill={color}
                opacity="0.7"
                className="transition-all duration-300 hover:opacity-100"
              />
              
              {/* Value labels */}
              {showValues && (
                <text
                  x={x + barWidth * 0.4}
                  y={y - 5}
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-600"
                >
                  {item.value}
                </text>
              )}

              {/* X-axis labels */}
              <text
                x={x + barWidth * 0.4}
                y={height - 20}
                textAnchor="middle"
                className="text-xs fill-gray-500"
              >
                {item.label}
              </text>
            </g>
          );
        })}

        {/* Y-axis */}
        <line
          x1={20}
          y1={20}
          x2={20}
          y2={height - 40}
          stroke="#374151"
          strokeWidth="2"
        />
        <line
          x1={20}
          y1={height - 40}
          x2={width - 20}
          y2={height - 40}
          stroke="#374151"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

export default BarChart;