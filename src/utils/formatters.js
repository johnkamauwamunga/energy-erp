// src/utils/formatters.js
export const formatCurrency = (amount, currency = 'KES') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount || 0);
};

export const formatDate = (dateString, includeTime = false) => {
  const date = new Date(dateString);
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('en-US', options);
};

export const formatNumber = (number) => {
  return new Intl.NumberFormat('en-US').format(number || 0);
};