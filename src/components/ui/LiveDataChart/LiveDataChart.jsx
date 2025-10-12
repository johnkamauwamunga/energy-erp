// components/ui/LiveDataChart.jsx
import React, { useState, useEffect, useRef } from 'react';

const LiveDataChart = ({ 
  data = [],
  width = 400,
  height = 200,
  color = '#3b82f6',
  strokeWidth = 2,
  showGrid = true,
  className = ''
}) => {
  const [animatedData, setAnimatedData] = useState([]);
  const svgRef = useRef();

  useEffect(() => {
    if (data.length > 0) {
      setAnimatedData(data);
    }
  }, [data]);

  const maxValue = Math.max(...animatedData.map(item => item.value), 1);
  const minValue = Math.min(...animatedData.map(item => item.value), 0);
  const valueRange = maxValue - minValue;

  const getX = (index) => 20 + (index * (width - 40)) / (animatedData.length - 1);
  const getY = (value) => height - 40 - ((value - minValue) / valueRange) * (height - 60);

  const generatePath = () => {
    if (animatedData.length === 0) return '';
    
    let path = `M ${getX(0)} ${getY(animatedData[0].value)}`;
    
    for (let i = 1; i < animatedData.length; i++) {
      path += ` L ${getX(i)} ${getY(animatedData[i].value)}`;
    }
    
    return path;
  };

  const generateAreaPath = () => {
    if (animatedData.length === 0) return '';
    
    let path = `M ${getX(0)} ${getY(animatedData[0].value)}`;
    
    for (let i = 1; i < animatedData.length; i++) {
      path += ` L ${getX(i)} ${getY(animatedData[i].value)}`;
    }
    
    path += ` L ${getX(animatedData.length - 1)} ${height - 40}`;
    path += ` L ${getX(0)} ${height - 40}`;
    path += ' Z';
    
    return path;
  };

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      <svg 
        ref={svgRef}
        width={width} 
        height={height} 
        className="w-full"
      >
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

        {/* Area fill */}
        <path
          d={generateAreaPath()}
          fill={color}
          opacity="0.2"
        />

        {/* Line */}
        <path
          d={generatePath()}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          className="transition-all duration-500"
        />

        {/* Data points */}
        {animatedData.map((item, index) => (
          <circle
            key={index}
            cx={getX(index)}
            cy={getY(item.value)}
            r="3"
            fill={color}
            className="transition-all duration-300"
          />
        ))}

        {/* Axes */}
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

        {/* X-axis labels */}
        {animatedData.filter((_, i) => i % Math.ceil(animatedData.length / 5) === 0).map((item, index) => (
          <text
            key={index}
            x={getX(index * Math.ceil(animatedData.length / 5))}
            y={height - 20}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            {item.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default LiveDataChart;