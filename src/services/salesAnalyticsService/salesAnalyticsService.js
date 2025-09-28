import { apiService } from '../apiService';

// Enhanced logging utility
const logger = {
  debug: (...args) => console.log('🔍 [SalesAnalyticsService]', ...args),
  info: (...args) => console.log('ℹ️ [SalesAnalyticsService]', ...args),
  warn: (...args) => console.warn('⚠️ [SalesAnalyticsService]', ...args),
  error: (...args) => console.error('❌ [SalesAnalyticsService]', ...args)
};

// Request/Response debugging utilities
const debugRequest = (method, url, data) => {
  logger.debug(`➡️ ${method} ${url}`, data || '');
};

const debugResponse = (method, url, response) => {
  logger.debug(`⬅️ ${method} ${url} Response:`, response.data);
};

// Enhanced response handler utility
const handleResponse = (response, operation) => {
  // Handle nested success structure from backend
  if (response.data && response.data.success) {
    logger.debug(`${operation} successful`);
    return response.data.data; // Return the actual data payload
  }
  
  // Handle case where backend returns data directly
  if (response.data) {
    logger.debug(`${operation} successful (direct data)`);
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

// Enhanced error handler utility
const handleError = (error, operation, defaultMessage) => {
  logger.error(`Error during ${operation}:`, error);
  
  if (error.response) {
    const { status, data } = error.response;
    
    if (status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      throw new Error('Authentication failed. Please login again.');
    }
    
    if (status === 403) {
      throw new Error('You do not have permission to perform this action');
    }
    
    if (status === 404) {
      throw new Error('Requested resource not found');
    }
    
    if (status === 400) {
      // Handle backend validation errors
      if (data.message) {
        throw new Error(data.message);
      }
      if (data.errors) {
        const errorMessages = Array.isArray(data.errors) 
          ? data.errors.map(err => err.message || err).join(', ')
          : JSON.stringify(data.errors);
        throw new Error(`Validation failed: ${errorMessages}`);
      }
    }
    
    // Handle backend error format
    if (data && data.message) {
      throw new Error(data.message);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

export const salesAnalyticsService = {
  // =====================
  // SHIFT-LEVEL ANALYTICS
  // =====================
  
  getShiftSales: async (shiftId) => {
    logger.info(`Fetching shift sales for shift: ${shiftId}`);
    
    try {
      debugRequest('GET', `/analytics/sales/shifts/${shiftId}/sales`);
      const response = await apiService.get(`/analytics/sales/shifts/${shiftId}/sales`);
      debugResponse('GET', `/analytics/sales/shifts/${shiftId}/sales`, response);
      return handleResponse(response, 'fetching shift sales');
    } catch (error) {
      throw handleError(error, 'fetching shift sales', 'Failed to fetch shift sales');
    }
  },

  // =====================
  // ISLAND-LEVEL ANALYTICS
  // =====================

  getIslandSales: async (islandId, period, periodType = 'DAILY') => {
    logger.info(`Fetching island sales for island: ${islandId}`, { period, periodType });
    
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      params.append('periodType', periodType);
      
      const url = `/analytics/sales/islands/${islandId}/sales?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching island sales');
    } catch (error) {
      throw handleError(error, 'fetching island sales', 'Failed to fetch island sales');
    }
  },

  // =====================
  // STATION-LEVEL ANALYTICS
  // =====================

  getStationSales: async (stationId, period, periodType = 'DAILY') => {
    logger.info(`Fetching station sales for station: ${stationId}`, { period, periodType });
    
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      params.append('periodType', periodType);
      
      const url = `/analytics/sales/stations/${stationId}/sales?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching station sales');
    } catch (error) {
      throw handleError(error, 'fetching station sales', 'Failed to fetch station sales');
    }
  },

  // =====================
  // COMPANY-LEVEL ANALYTICS
  // =====================

  getCompanySales: async (period, periodType = 'MONTHLY') => {
    logger.info('Fetching company sales', { period, periodType });
    
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      params.append('periodType', periodType);
      
      const url = `/analytics/sales/company/sales?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching company sales');
    } catch (error) {
      throw handleError(error, 'fetching company sales', 'Failed to fetch company sales');
    }
  },

  // =====================
  // PRODUCT PERFORMANCE
  // =====================

  getProductPerformance: async (productId, period, periodType = 'MONTHLY') => {
    logger.info(`Fetching product performance for product: ${productId}`, { period, periodType });
    
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      params.append('periodType', periodType);
      
      const url = `/analytics/sales/products/${productId}/performance?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching product performance');
    } catch (error) {
      throw handleError(error, 'fetching product performance', 'Failed to fetch product performance');
    }
  },

  // =====================
  // COMPARATIVE ANALYTICS
  // =====================

  getSalesComparison: async (options = {}) => {
    logger.info('Fetching sales comparison', options);
    
    try {
      const {
        periodType = 'MONTHLY',
        compareWith = 'PREVIOUS_PERIOD',
        customStart,
        customEnd 
      } = options;

      const params = new URLSearchParams();
      params.append('periodType', periodType);
      params.append('compareWith', compareWith);
      if (customStart) params.append('customStart', customStart);
      if (customEnd) params.append('customEnd', customEnd);
      
      const url = `/analytics/sales/sales/comparison?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching sales comparison');
    } catch (error) {
      throw handleError(error, 'fetching sales comparison', 'Failed to fetch sales comparison');
    }
  },

  // =====================
  // TREND ANALYSIS
  // =====================

  getSalesTrends: async (options = {}) => {
    logger.info('Fetching sales trends', options);
    
    try {
      const {
        periodType = 'MONTHLY',
        dataPoints = 12 
      } = options;

      const params = new URLSearchParams();
      params.append('periodType', periodType);
      params.append('dataPoints', dataPoints.toString());
      
      const url = `/analytics/sales/sales/trends?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching sales trends');
    } catch (error) {
      throw handleError(error, 'fetching sales trends', 'Failed to fetch sales trends');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validateAnalyticsPeriod: (period, periodType) => {
    const errors = [];

    if (!periodType) {
      errors.push('Period type is required');
    }

    if (period) {
      const periodDate = new Date(period);
      if (isNaN(periodDate.getTime())) {
        errors.push('Invalid period date format');
      }
    }

    const validPeriodTypes = ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
    if (periodType && !validPeriodTypes.includes(periodType)) {
      errors.push(`Invalid period type. Must be one of: ${validPeriodTypes.join(', ')}`);
    }

    return errors;
  },

  // =====================
  // UTILITY METHODS
  // =====================

  formatAnalyticsData: (analyticsData) => {
    if (!analyticsData) return null;
    
    return {
      ...analyticsData,
      formattedTotalSales: this.formatCurrency(analyticsData.totalSales),
      formattedGrowthRate: analyticsData.growthRate ? `${analyticsData.growthRate.toFixed(2)}%` : '0%',
      growthIndicator: analyticsData.growthRate > 0 ? 'positive' : analyticsData.growthRate < 0 ? 'negative' : 'neutral',
      formattedPeriod: this.formatAnalyticsPeriod(analyticsData.period, analyticsData.periodType),
      calculatedAtFormatted: this.formatDateTime(analyticsData.calculatedAt)
    };
  },

  formatAnalyticsPeriod: (period, periodType) => {
    if (!period) return 'Current Period';
    
    const periodDate = new Date(period);
    
    switch (periodType) {
      case 'HOURLY':
        return periodDate.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      
      case 'DAILY':
        return periodDate.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      
      case 'WEEKLY':
        const startOfWeek = new Date(periodDate);
        startOfWeek.setDate(periodDate.getDate() - periodDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      case 'MONTHLY':
        return periodDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long'
        });
      
      case 'QUARTERLY':
        const quarter = Math.floor(periodDate.getMonth() / 3) + 1;
        return `Q${quarter} ${periodDate.getFullYear()}`;
      
      case 'YEARLY':
        return periodDate.getFullYear().toString();
      
      default:
        return periodDate.toLocaleDateString();
    }
  },

  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  },

  formatPercentage: (value) => {
    return `${value?.toFixed(2) || '0.00'}%`;
  },

  formatDateTime: (dateTime) => {
    if (!dateTime) return 'N/A';
    
    return new Date(dateTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  calculatePerformanceMetrics: (currentData, previousData) => {
    if (!currentData || !previousData) return null;
    
    const growthRate = previousData.totalSales > 0 
      ? ((currentData.totalSales - previousData.totalSales) / previousData.totalSales) * 100 
      : 0;
    
    const averageTransactionChange = previousData.avgTransactionValue > 0
      ? ((currentData.avgTransactionValue - previousData.avgTransactionValue) / previousData.avgTransactionValue) * 100
      : 0;
    
    return {
      growthRate,
      averageTransactionChange,
      absoluteGrowth: currentData.totalSales - previousData.totalSales,
      performance: growthRate > 5 ? 'EXCELLENT' : growthRate > 0 ? 'GOOD' : growthRate > -5 ? 'STABLE' : 'POOR'
    };
  },

  // =====================
  // CHART DATA PREPARATION
  // =====================

  prepareSalesTrendChartData: (trendsData) => {
    if (!trendsData || !Array.isArray(trendsData)) return null;
    
    return {
      labels: trendsData.map(trend => this.formatAnalyticsPeriod(trend.period, 'MONTHLY')),
      datasets: [
        {
          label: 'Total Sales',
          data: trendsData.map(trend => trend.totalSales),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }
      ]
    };
  },

  prepareProductPerformanceChartData: (productData) => {
    if (!productData || !Array.isArray(productData)) return null;
    
    return {
      labels: productData.map(product => product.productName),
      datasets: [
        {
          label: 'Revenue',
          data: productData.map(product => product.totalRevenue),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  },

  preparePaymentMethodChartData: (paymentBreakdown) => {
    if (!paymentBreakdown) return null;
    
    const methods = ['cash', 'mobileMoney', 'visa', 'mastercard', 'debt', 'other'];
    const labels = ['Cash', 'Mobile Money', 'Visa', 'Mastercard', 'Debt', 'Other'];
    const colors = [
      'rgba(75, 192, 192, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(255, 99, 132, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(201, 203, 207, 0.8)'
    ];
    
    return {
      labels,
      datasets: [
        {
          data: methods.map(method => paymentBreakdown[`${method}Amount`] || 0),
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace('0.8', '1')),
          borderWidth: 1
        }
      ]
    };
  },

  preparePeakHoursChartData: (peakHoursData) => {
    if (!peakHoursData || !Array.isArray(peakHoursData)) return null;
    
    return {
      labels: peakHoursData.map(hour => hour.hour),
      datasets: [
        {
          label: 'Sales by Hour',
          data: peakHoursData.map(hour => hour.sales),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  },

  // =====================
  // EXPORT UTILITIES
  // =====================

  exportSalesReport: async (options = {}) => {
    logger.info('Exporting sales report', options);
    
    try {
      const params = new URLSearchParams();
      Object.keys(options).forEach(key => {
        if (options[key] !== undefined && options[key] !== null && options[key] !== '') {
          params.append(key, options[key]);
        }
      });
      
      const url = `/analytics/sales/export?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url, { responseType: 'blob' });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      logger.info('Sales report exported successfully');
      return true;
    } catch (error) {
      throw handleError(error, 'exporting sales report', 'Failed to export sales report');
    }
  },

  // =====================
  // BATCH ANALYTICS
  // =====================

  getMultipleStationAnalytics: async (stationIds, period, periodType = 'MONTHLY') => {
    logger.info('Fetching multiple station analytics', { stationIds, period, periodType });
    
    try {
      const promises = stationIds.map(stationId =>
        this.getStationSales(stationId, period, periodType)
      );
      
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);
      
      return {
        successful,
        failed,
        total: stationIds.length,
        successCount: successful.length,
        failureCount: failed.length
      };
    } catch (error) {
      throw handleError(error, 'fetching multiple station analytics', 'Failed to fetch multiple station analytics');
    }
  },

  // =====================
  // REAL-TIME ANALYTICS
  // =====================

  subscribeToRealTimeSales: (stationId, callback) => {
    // This would typically use WebSockets or Server-Sent Events
    // For now, we'll simulate with setInterval
    logger.info(`Subscribing to real-time sales for station: ${stationId}`);
    
    const interval = setInterval(async () => {
      try {
        const salesData = await this.getStationSales(stationId, new Date(), 'HOURLY');
        callback(salesData);
      } catch (error) {
        logger.error('Error in real-time sales subscription:', error);
      }
    }, 30000); // Update every 30 seconds
    
    return () => {
      clearInterval(interval);
      logger.info(`Unsubscribed from real-time sales for station: ${stationId}`);
    };
  }
};

export default salesAnalyticsService;