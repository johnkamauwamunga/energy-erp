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
      debugRequest('GET', `/analytics/shifts/${shiftId}/sales`);
      const response = await apiService.get(`/analytics/shifts/${shiftId}/sales`);
      debugResponse('GET', `/analytics/shifts/${shiftId}/sales`, response);
      return handleResponse(response, 'fetching shift sales');
    } catch (error) {
      throw handleError(error, 'fetching shift sales', 'Failed to fetch shift sales');
    }
  },

  getShiftCollections: async (shiftId) => {
    logger.info(`Fetching shift collections for shift: ${shiftId}`);
    
    try {
      debugRequest('GET', `/analytics/shifts/${shiftId}/collections`);
      const response = await apiService.get(`/analytics/shifts/${shiftId}/collections`);
      debugResponse('GET', `/analytics/shifts/${shiftId}/collections`, response);
      return handleResponse(response, 'fetching shift collections');
    } catch (error) {
      throw handleError(error, 'fetching shift collections', 'Failed to fetch shift collections');
    }
  },

  // =====================
  // STATION-LEVEL ANALYTICS
  // =====================

  getStationSales: async (stationId, period, periodType = 'DAILY') => {
    logger.info(`Fetching station sales for station: ${stationId}`, { period, periodType });
    
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period.toISOString());
      params.append('periodType', periodType);
      
      const url = `/analytics/stations/${stationId}/sales?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching station sales');
    } catch (error) {
      throw handleError(error, 'fetching station sales', 'Failed to fetch station sales');
    }
  },

  getStationSalesByRange: async (stationId, startDate, endDate, periodType = 'DAILY') => {
    logger.info(`Fetching station sales by range for station: ${stationId}`, { startDate, endDate, periodType });
    
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      params.append('periodType', periodType);
      
      const url = `/analytics/stations/${stationId}/sales/range?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching station sales by range');
    } catch (error) {
      throw handleError(error, 'fetching station sales by range', 'Failed to fetch station sales by range');
    }
  },

  getStationPaymentAnalysis: async (stationId, period, periodType = 'MONTHLY') => {
    logger.info(`Fetching payment analysis for station: ${stationId}`, { period, periodType });
    
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period.toISOString());
      params.append('periodType', periodType);
      
      const url = `/analytics/stations/${stationId}/payment-analysis?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching station payment analysis');
    } catch (error) {
      throw handleError(error, 'fetching station payment analysis', 'Failed to fetch payment analysis');
    }
  },

  // =====================
  // COMPANY-LEVEL ANALYTICS
  // =====================

  getCompanySales: async (period, periodType = 'MONTHLY') => {
    logger.info('Fetching company sales', { period, periodType });
    
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period.toISOString());
      params.append('periodType', periodType);
      
      const url = `/analytics/company/sales?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching company sales');
    } catch (error) {
      throw handleError(error, 'fetching company sales', 'Failed to fetch company sales');
    }
  },

  getCompanySalesByRange: async (startDate, endDate, periodType = 'DAILY') => {
    logger.info('Fetching company sales by range', { startDate, endDate, periodType });
    
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      params.append('periodType', periodType);
      
      const url = `/analytics/company/sales/range?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching company sales by range');
    } catch (error) {
      throw handleError(error, 'fetching company sales by range', 'Failed to fetch company sales by range');
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
        stationId,
        customStart,
        customEnd 
      } = options;

      const params = new URLSearchParams();
      params.append('periodType', periodType);
      params.append('compareWith', compareWith);
      if (stationId) params.append('stationId', stationId);
      if (customStart) params.append('customStart', customStart.toISOString());
      if (customEnd) params.append('customEnd', customEnd.toISOString());
      
      const url = `/analytics/sales/comparison?${params.toString()}`;
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
        dataPoints = 12,
        stationId
      } = options;

      const params = new URLSearchParams();
      params.append('periodType', periodType);
      params.append('dataPoints', dataPoints.toString());
      if (stationId) params.append('stationId', stationId);
      
      const url = `/analytics/sales/trends?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching sales trends');
    } catch (error) {
      throw handleError(error, 'fetching sales trends', 'Failed to fetch sales trends');
    }
  },

  // =====================
  // PRODUCT PERFORMANCE
  // =====================

  getProductPerformance: async (productId, period, periodType = 'MONTHLY') => {
    logger.info(`Fetching product performance for product: ${productId}`, { period, periodType });
    
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period.toISOString());
      params.append('periodType', periodType);
      
      const url = `/analytics/products/${productId}/performance?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching product performance');
    } catch (error) {
      throw handleError(error, 'fetching product performance', 'Failed to fetch product performance');
    }
  },

  getProductPerformanceByStation: async (productId, period, periodType = 'MONTHLY') => {
    logger.info(`Fetching product performance by station for product: ${productId}`, { period, periodType });
    
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period.toISOString());
      params.append('periodType', periodType);
      
      const url = `/analytics/products/${productId}/performance/stations?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching product performance by station');
    } catch (error) {
      throw handleError(error, 'fetching product performance by station', 'Failed to fetch product performance by station');
    }
  },

  // =====================
  // PAYMENT ANALYSIS
  // =====================

  getPaymentAnalysis: async (period, periodType = 'MONTHLY') => {
    logger.info('Fetching payment analysis', { period, periodType });
    
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period.toISOString());
      params.append('periodType', periodType);
      
      const url = `/analytics/analysis/payment-methods?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching payment analysis');
    } catch (error) {
      throw handleError(error, 'fetching payment analysis', 'Failed to fetch payment analysis');
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

    const validPeriodTypes = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
    if (periodType && !validPeriodTypes.includes(periodType)) {
      errors.push(`Invalid period type. Must be one of: ${validPeriodTypes.join(', ')}`);
    }

    return errors;
  },

  validateDateRange: (startDate, endDate) => {
    const errors = [];

    if (!startDate) {
      errors.push('Start date is required');
    }

    if (!endDate) {
      errors.push('End date is required');
    }

    if (startDate && endDate && startDate > endDate) {
      errors.push('Start date must be before end date');
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
      formattedTotalRevenue: this.formatCurrency(analyticsData.totalRevenue),
      formattedTotalCollections: this.formatCurrency(analyticsData.totalCollections),
      formattedVariance: this.formatCurrency(analyticsData.variance),
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

  formatCurrency: (amount, currency = 'USD') => {
    if (amount === null || amount === undefined) return 'N/A';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  },

  formatPercentage: (value) => {
    if (value === null || value === undefined) return '0.00%';
    return `${value.toFixed(2)}%`;
  },

  formatNumber: (value) => {
    if (value === null || value === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(value);
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
    
    const revenueGrowth = previousData.totalRevenue > 0 
      ? ((currentData.totalRevenue - previousData.totalRevenue) / previousData.totalRevenue) * 100 
      : 0;
    
    const volumeGrowth = previousData.totalQuantity > 0
      ? ((currentData.totalQuantity - previousData.totalQuantity) / previousData.totalQuantity) * 100
      : 0;
    
    return {
      revenueGrowth,
      volumeGrowth,
      absoluteGrowth: currentData.totalRevenue - previousData.totalRevenue,
      performance: revenueGrowth > 5 ? 'EXCELLENT' : revenueGrowth > 0 ? 'GOOD' : revenueGrowth > -5 ? 'STABLE' : 'POOR'
    };
  },

  // =====================
  // CHART DATA PREPARATION
  // =====================

  prepareSalesTrendChartData: (trendsData) => {
    if (!trendsData || !Array.isArray(trendsData.trends)) return null;
    
    return {
      labels: trendsData.trends.map(trend => this.formatAnalyticsPeriod(trend.period, 'MONTHLY')),
      datasets: [
        {
          label: 'Total Sales',
          data: trendsData.trends.map(trend => trend.totalSales || trend.totalRevenue),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
          fill: true
        }
      ]
    };
  },

  prepareProductPerformanceChartData: (productData) => {
    if (!productData || !Array.isArray(productData.productBreakdown)) return null;
    
    const topProducts = productData.productBreakdown.slice(0, 5);
    
    return {
      labels: topProducts.map(product => product.productName),
      datasets: [
        {
          label: 'Revenue',
          data: topProducts.map(product => product.totalRevenue),
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
          borderWidth: 2
        }
      ]
    };
  },

  preparePaymentMethodChartData: (paymentData) => {
    if (!paymentData || !paymentData.summary) return null;
    
    const { summary } = paymentData;
    
    return {
      labels: ['Cash', 'Electronic', 'Debt', 'Other'],
      datasets: [
        {
          data: [
            summary.cash.amount,
            summary.electronic.amount,
            summary.debt.amount,
            summary.other.amount
          ],
          backgroundColor: [
            'rgba(75, 192, 192, 0.8)',    // Cash - Teal
            'rgba(54, 162, 235, 0.8)',    // Electronic - Blue
            'rgba(255, 159, 64, 0.8)',    // Debt - Orange
            'rgba(201, 203, 207, 0.8)'    // Other - Gray
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(201, 203, 207, 1)'
          ],
          borderWidth: 2
        }
      ]
    };
  },

  prepareStationComparisonChartData: (comparisonData) => {
    if (!comparisonData || !Array.isArray(comparisonData.stationPerformance)) return null;
    
    const topStations = comparisonData.stationPerformance.slice(0, 6);
    
    return {
      labels: topStations.map(station => station.stationName),
      datasets: [
        {
          label: 'Total Revenue',
          data: topStations.map(station => station.totalRevenue),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  },

  prepareGrowthComparisonChartData: (comparisonData) => {
    if (!comparisonData || !comparisonData.currentPeriod || !comparisonData.previousPeriod) return null;
    
    return {
      labels: ['Previous Period', 'Current Period'],
      datasets: [
        {
          label: 'Total Revenue',
          data: [
            comparisonData.previousPeriod.totalRevenue,
            comparisonData.currentPeriod.totalRevenue
          ],
          backgroundColor: [
            'rgba(201, 203, 207, 0.8)',
            'rgba(75, 192, 192, 0.8)'
          ],
          borderColor: [
            'rgba(201, 203, 207, 1)',
            'rgba(75, 192, 192, 1)'
          ],
          borderWidth: 2
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
          if (options[key] instanceof Date) {
            params.append(key, options[key].toISOString());
          } else {
            params.append(key, options[key]);
          }
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
  // HEALTH CHECK
  // =====================

  getAnalyticsHealth: async () => {
    logger.info('Checking analytics service health');
    
    try {
      const response = await apiService.get('/analytics/health');
      return handleResponse(response, 'health check');
    } catch (error) {
      throw handleError(error, 'health check', 'Analytics service is unavailable');
    }
  },

  // =====================
  // CACHING UTILITIES
  // =====================

  cache: {
    set: (key, data, ttl = 5 * 60 * 1000) => { // 5 minutes default
      const item = {
        data,
        expiry: Date.now() + ttl
      };
      localStorage.setItem(`analytics_cache_${key}`, JSON.stringify(item));
    },

    get: (key) => {
      const itemStr = localStorage.getItem(`analytics_cache_${key}`);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      if (Date.now() > item.expiry) {
        localStorage.removeItem(`analytics_cache_${key}`);
        return null;
      }

      return item.data;
    },

    clear: (pattern = 'analytics_cache_') => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(pattern)) {
          localStorage.removeItem(key);
        }
      });
    }
  }
};

export default salesAnalyticsService;