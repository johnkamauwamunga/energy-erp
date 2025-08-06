// src/utils/helpers.js

/**
 * Format a date string to a human-readable format
 * @param {string|Date} date - The date to format (ISO string or Date object)
 * @returns {string} Formatted date (e.g., "Aug 5, 2025")
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(dateObj);
};

/**
 * Format a date with time
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date with time (e.g., "Aug 5, 2025, 10:30 AM")
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(dateObj);
};

/**
 * Format currency amount for Kenyan Shillings
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted currency string (e.g., "Ksh 1,234.56")
 */
export const formatCurrency = (amount) => {
  // Handle null/undefined/empty
  if (amount === null || amount === undefined || amount === '') return 'Ksh 0.00';
  
  // Convert to number if it's a string
  const numberValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle invalid numbers
  if (isNaN(numberValue)) return 'Ksh 0.00';
  
  // Format as Kenyan currency
  return 'Ksh ' + numberValue.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Format currency amount without symbol
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted amount string (e.g., "1,234.56")
 */
export const formatAmount = (amount) => {
  // Handle null/undefined/empty
  if (amount === null || amount === undefined || amount === '') return '0.00';
  
  // Convert to number if it's a string
  const numberValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle invalid numbers
  if (isNaN(numberValue)) return '0.00';
  
  // Format as plain number with 2 decimals
  return numberValue.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};