// src/ui/DatePicker.jsx
import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DatePicker = ({ 
  value, 
  onChange, 
  className = '', 
  placeholderText = "Select date and time",
  showTimeSelect = true,
  dateFormat = "MM/dd/yyyy h:mm aa",
  ...props 
}) => {
  return (
    <ReactDatePicker
      selected={value ? new Date(value) : null}
      onChange={onChange}
      className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      placeholderText={placeholderText}
      showTimeSelect={showTimeSelect}
      timeFormat="HH:mm"
      timeIntervals={15}
      timeCaption="Time"
      dateFormat={dateFormat}
      isClearable
      {...props}
    />
  );
};

export default DatePicker;