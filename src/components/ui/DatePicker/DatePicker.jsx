// src/ui/DatePicker.jsx
import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DatePicker = ({ className = '', ...props }) => {
  return (
    <ReactDatePicker
      className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      dateFormat="MM/dd/yyyy"
      {...props}
    />
  );
};

export default DatePicker;