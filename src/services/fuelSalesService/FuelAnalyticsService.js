// src/services/fuelSalesService/FuelAnalyticsService.js
import { apiService } from '../apiService';
import dayjs from 'dayjs';

// ========== LOGGER CONFIGURATION ==========
const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLogLevel = process.env.NODE_ENV === 'development' ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN;

const logger = {
  debug: (...args) => {
    if (currentLogLevel <= LOG_LEVEL.DEBUG) {
      console.log('🔍 [FuelAnalyticsService]', ...args);
    }
  },
  info: (...args) => {
    if (currentLogLevel <= LOG_LEVEL.INFO) {
      console.log('ℹ️ [FuelAnalyticsService]', ...args);
    }
  },
  warn: (...args) => {
    if (currentLogLevel <= LOG_LEVEL.WARN) {
      console.warn('⚠️ [FuelAnalyticsService]', ...args);
    }
  },
  error: (...args) => {
    if (currentLogLevel <= LOG_LEVEL.ERROR) {
      console.error('❌ [FuelAnalyticsService]', ...args);
    }
  }
};

// ========== RESPONSE HANDLER ==========
const handleResponse = (response, operation) => {
  logger.debug(`${operation} response status:`, response.status);
  
  if (response.data?.success === false) {
    const error = new Error(response.data.error?.message || 'API request failed');
    error.code = response.data.error?.code;
    error.details = response.data.error?.details;
    error.statusCode = response.status;
    throw error;
  }
  
  return response.data || response;
};

// ========== ERROR HANDLER ==========
const handleError = (error, operation, defaultMessage) => {
  logger.error(`Error during ${operation}:`, {
    message: error.message,
    code: error.code,
    status: error.response?.status,
    data: error.response?.data
  });
  
  const enhancedError = new Error(error.message || defaultMessage || 'An unexpected error occurred');
  enhancedError.originalError = error;
  enhancedError.operation = operation;
  enhancedError.code = error.code;
  
  if (error.response) {
    const { status, data } = error.response;
    enhancedError.statusCode = status;
    enhancedError.serverMessage = data?.message;
    enhancedError.serverErrorCode = data?.error?.code;
    
    // Handle specific status codes
    if (status === 401) {
      enhancedError.message = 'Session expired. Please login again.';
      enhancedError.redirectTo = '/login';
      // Clear auth tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    } else if (status === 403) {
      enhancedError.message = data?.message || 'You do not have permission to access this analytics';
    } else if (status === 404) {
      enhancedError.message = data?.message || 'Analytics data not found';
    } else if (status === 400) {
      enhancedError.message = data?.message || 'Invalid request parameters';
      enhancedError.validationErrors = data?.error?.details;
    } else if (status >= 500) {
      enhancedError.message = 'Server error. Please try again later.';
    }
  } else if (error.request) {
    enhancedError.message = 'Network error. Please check your connection and try again.';
    enhancedError.isNetworkError = true;
  }
  
  throw enhancedError;
};

// ========== CACHE MANAGER ==========
const createCacheManager = () => {
  const CACHE_KEYS = {
    COMPANY_DASHBOARD: 'fuel_analytics_company_dashboard',
    STATION_DASHBOARD: 'fuel_analytics_station_dashboard',
    PUMP_PERFORMANCE: 'fuel_analytics_pump_performance',
    SHIFT_DETAILS: 'fuel_analytics_shift_details',
    PRODUCT_PERFORMANCE: 'fuel_analytics_product_performance',
    SALES_TREND: 'fuel_analytics_sales_trend',
    REAL_TIME: 'fuel_analytics_real_time'
  };

  return {
    get: (key) => {
      try {
        const item = sessionStorage.getItem(key);
        if (!item) return null;
        
        const cached = JSON.parse(item);
        
        if (cached.expiresAt && new Date() > new Date(cached.expiresAt)) {
          sessionStorage.removeItem(key);
          return null;
        }
        
        logger.debug(`Cache hit: ${key}`);
        return cached.data;
      } catch (error) {
        logger.warn(`Cache read error for ${key}:`, error);
        return null;
      }
    },
    
    set: (key, data, ttlMinutes = 5) => {
      try {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);
        
        const cacheItem = {
          data,
          expiresAt: expiresAt.toISOString(),
          cachedAt: new Date().toISOString(),
          ttlMinutes
        };
        
        sessionStorage.setItem(key, JSON.stringify(cacheItem));
        logger.debug(`Cache set: ${key} (TTL: ${ttlMinutes}min)`);
      } catch (error) {
        logger.warn(`Cache write error for ${key}:`, error);
      }
    },
    
    clear: (key) => {
      sessionStorage.removeItem(key);
      logger.debug(`Cache cleared: ${key}`);
    },
    
    clearAll: () => {
      Object.keys(CACHE_KEYS).forEach(key => {
        sessionStorage.removeItem(CACHE_KEYS[key]);
      });
      logger.debug('All fuel analytics cache cleared');
    },
    
    clearPattern: (pattern) => {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.includes(pattern)) {
          sessionStorage.removeItem(key);
        }
      });
      logger.debug(`Cache cleared for pattern: ${pattern}`);
    }
  };
};

const cache = createCacheManager();

// ========== COMMON UTILITIES ==========
const commonUtils = {
  formatCurrency: (amount, currency = 'KES') => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return currency === 'KES' ? 'Ksh 0.00' : '$0.00';
    }
    
    if (currency === 'KES') {
      const formatted = new Intl.NumberFormat('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
      return `Ksh ${formatted}`;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },

  formatVolume: (liters) => {
    if (liters === null || liters === undefined || isNaN(liters)) {
      return '0.0 L';
    }
    
    if (liters >= 1000000) {
      return `${(liters / 1000000).toFixed(2)}M L`;
    } else if (liters >= 1000) {
      return `${(liters / 1000).toFixed(1)}k L`;
    }
    return `${liters.toFixed(1)} L`;
  },

  formatPercentage: (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  },

  calculateGrowth: (current, previous) => {
    if (previous === null || previous === undefined || previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  },

  calculateMarketShare: (itemTotal, overallTotal) => {
    if (!overallTotal || overallTotal === 0) return 0;
    return (itemTotal / overallTotal) * 100;
  },

  validateDateRange: (startDate, endDate) => {
    if (!startDate || !endDate) return { isValid: true };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, error: 'Invalid date format' };
    }
    
    if (start > end) {
      return { isValid: false, error: 'Start date cannot be after end date' };
    }
    
    // Check if date range is too large (e.g., > 2 years)
    const maxDays = 730; // 2 years
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > maxDays) {
      return { 
        isValid: false, 
        error: `Date range too large. Maximum is ${maxDays} days` 
      };
    }
    
    return { isValid: true };
  },

  formatDataForDisplay: (data, type) => {
    if (!data || !Array.isArray(data)) return [];
    
    switch (type) {
      case 'company_dashboard':
        return data.map(item => ({
          id: item.stationId || item.productId || item.period || `item-${Date.now()}-${Math.random()}`,
          name: item.stationName || item.productName || item.period || 'Unknown',
          type: item.stationId ? 'station' : item.productId ? 'product' : 'period',
          totalLiters: item.totalLiters || item.liters || 0,
          totalRevenue: item.totalRevenue || item.revenue || 0,
          avgUnitPrice: item.avgUnitPrice || 0,
          transactionCount: item.transactionCount || 0,
          shiftCount: item.shiftCount || 0,
          location: item.location,
          products: item.products || [],
          formattedLiters: commonUtils.formatVolume(item.totalLiters || item.liters || 0),
          formattedRevenue: commonUtils.formatCurrency(item.totalRevenue || item.revenue || 0),
          formattedUnitPrice: commonUtils.formatCurrency(item.avgUnitPrice || 0)
        }));
        
      case 'station_dashboard':
        return data.map(item => ({
          id: item.productId || item.pumpId || item.shiftId || item.period || `item-${Date.now()}-${Math.random()}`,
          name: item.productName || item.pumpName || item.shiftNumber?.toString() || item.period || 'Unknown',
          type: item.productId ? 'product' : item.pumpId ? 'pump' : item.shiftId ? 'shift' : 'period',
          totalLiters: item.totalLiters || item.liters || 0,
          totalRevenue: item.totalRevenue || item.revenue || 0,
          avgUnitPrice: item.avgUnitPrice || 0,
          transactionCount: item.transactionCount || 0,
          marketShare: item.marketShare || 0,
          efficiency: item.efficiency || item.efficiencyScore || 0,
          rank: item.rank,
          stationLabel: item.stationLabel,
          islandCode: item.islandCode,
          supervisor: item.supervisor,
          duration: item.duration,
          formattedLiters: commonUtils.formatVolume(item.totalLiters || item.liters || 0),
          formattedRevenue: commonUtils.formatCurrency(item.totalRevenue || item.revenue || 0),
          formattedUnitPrice: commonUtils.formatCurrency(item.avgUnitPrice || 0),
          formattedMarketShare: commonUtils.formatPercentage(item.marketShare || 0),
          formattedEfficiency: `${(item.efficiency || item.efficiencyScore || 0).toFixed(1)}%`
        }));
        
      case 'pump_performance':
        return data.map(item => ({
          id: item.pumpId || `pump-${Date.now()}-${Math.random()}`,
          rank: item.rank || 0,
          pumpName: item.pumpName || `Pump ${item.pumpId?.substring(0, 8) || 'Unknown'}`,
          stationLabel: item.stationLabel,
          productName: item.productName || 'Unknown Product',
          productCode: item.productCode,
          islandCode: item.islandCode,
          totalLiters: item.totalLiters || item.liters || 0,
          totalRevenue: item.totalRevenue || item.revenue || 0,
          avgUnitPrice: item.avgUnitPrice || 0,
          transactionCount: item.transactionCount || 0,
          dailyAverage: item.dailyAverage || 0,
          utilizationRate: item.utilizationRate || 0,
          efficiencyScore: item.efficiencyScore || 0,
          formattedLiters: commonUtils.formatVolume(item.totalLiters || item.liters || 0),
          formattedRevenue: commonUtils.formatCurrency(item.totalRevenue || item.revenue || 0),
          formattedUnitPrice: commonUtils.formatCurrency(item.avgUnitPrice || 0),
          formattedDailyAverage: commonUtils.formatVolume(item.dailyAverage || 0),
          formattedUtilization: commonUtils.formatPercentage(item.utilizationRate || 0),
          formattedEfficiency: `${(item.efficiencyScore || 0).toFixed(1)}%`
        }));
        
      case 'trend_data':
        return data.map(item => ({
          period: item.period,
          date: item.period ? new Date(item.period).toLocaleDateString() : 'Unknown',
          value: item.value || 0,
          totalLiters: item.totalLiters || item.liters || 0,
          totalRevenue: item.totalRevenue || item.revenue || 0,
          transactionCount: item.transactionCount || 0,
          products: item.products || [],
          formattedValue: commonUtils.formatCurrency(item.value || 0),
          formattedLiters: commonUtils.formatVolume(item.totalLiters || item.liters || 0),
          formattedRevenue: commonUtils.formatCurrency(item.totalRevenue || item.revenue || 0)
        }));
        
      default:
        return data;
    }
  }
};

// ========== FILTER BUILDERS (Updated to match backend schemas) ==========
const filterBuilders = {
  buildCompanyDashboardFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    stationIds: filters.stationIds ? (Array.isArray(filters.stationIds) ? filters.stationIds.join(',') : filters.stationIds) : undefined,
    productIds: filters.productIds ? (Array.isArray(filters.productIds) ? filters.productIds.join(',') : filters.productIds) : undefined,
    shiftStatus: filters.shiftStatus,
    readingType: filters.readingType || 'END',
    page: filters.page || 1,
    limit: filters.limit || 50,
    sortBy: filters.sortBy || 'recordedAt',
    sortOrder: filters.sortOrder || 'desc',
    groupBy: filters.groupBy || 'station',
    includeTrends: filters.includeTrends !== false,
    includeComparison: filters.includeComparison || false,
    ...(filters.compareWith && { compareWith: filters.compareWith })
  }),

  buildCompanyTrendsFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    stationIds: filters.stationIds ? (Array.isArray(filters.stationIds) ? filters.stationIds.join(',') : filters.stationIds) : undefined,
    productIds: filters.productIds ? (Array.isArray(filters.productIds) ? filters.productIds.join(',') : filters.productIds) : undefined,
    period: filters.period || 'daily',
    dataPoints: filters.dataPoints || 30,
    metric: filters.metric || 'revenue',
    chartType: filters.chartType || 'line'
  }),

  buildCompanyComparisonFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    stationIds: filters.stationIds ? (Array.isArray(filters.stationIds) ? filters.stationIds.join(',') : filters.stationIds) : undefined,
    productIds: filters.productIds ? (Array.isArray(filters.productIds) ? filters.productIds.join(',') : filters.productIds) : undefined,
    metric: filters.metric || 'revenue',
    compareStations: filters.compareStations ? (Array.isArray(filters.compareStations) ? filters.compareStations.join(',') : filters.compareStations) : undefined,
    compareProducts: filters.compareProducts ? (Array.isArray(filters.compareProducts) ? filters.compareProducts.join(',') : filters.compareProducts) : undefined,
    comparePeriods: filters.comparePeriods ? (Array.isArray(filters.comparePeriods) ? filters.comparePeriods.join(',') : filters.comparePeriods) : undefined
  }),

  buildStationDashboardFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    productIds: filters.productIds ? (Array.isArray(filters.productIds) ? filters.productIds.join(',') : filters.productIds) : undefined,
    pumpIds: filters.pumpIds ? (Array.isArray(filters.pumpIds) ? filters.pumpIds.join(',') : filters.pumpIds) : undefined,
    shiftIds: filters.shiftIds ? (Array.isArray(filters.shiftIds) ? filters.shiftIds.join(',') : filters.shiftIds) : undefined,
    shiftStatus: filters.shiftStatus,
    readingType: filters.readingType || 'END',
    page: filters.page || 1,
    limit: filters.limit || 50,
    sortBy: filters.sortBy || 'recordedAt',
    sortOrder: filters.sortOrder || 'desc',
    groupBy: filters.groupBy || 'product',
    includeDetails: filters.includeDetails || false,
    includeForecast: filters.includeForecast || false
  }),

  buildStationTrendsFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    productIds: filters.productIds ? (Array.isArray(filters.productIds) ? filters.productIds.join(',') : filters.productIds) : undefined,
    shiftStatus: filters.shiftStatus,
    period: filters.period || 'daily',
    granularity: filters.granularity || 'day',
    metric: filters.metric || 'revenue'
  }),

  buildPumpPerformanceFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    productIds: filters.productIds ? (Array.isArray(filters.productIds) ? filters.productIds.join(',') : filters.productIds) : undefined,
    shiftStatus: filters.shiftStatus,
    readingType: filters.readingType || 'END',
    page: filters.page || 1,
    limit: filters.limit || 50,
    sortBy: filters.sortBy || 'recordedAt',
    sortOrder: filters.sortOrder || 'desc',
    rankingMetric: filters.rankingMetric || 'liters',
    includeDetails: filters.includeDetails !== false,
    minLiters: filters.minLiters,
    maxLiters: filters.maxLiters
  }),

  buildShiftDetailFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    stationIds: filters.stationIds ? (Array.isArray(filters.stationIds) ? filters.stationIds.join(',') : filters.stationIds) : undefined,
    productIds: filters.productIds ? (Array.isArray(filters.productIds) ? filters.productIds.join(',') : filters.productIds) : undefined,
    pumpIds: filters.pumpIds ? (Array.isArray(filters.pumpIds) ? filters.pumpIds.join(',') : filters.pumpIds) : undefined,
    shiftStatus: filters.shiftStatus,
    readingType: filters.readingType || 'END',
    includePumpDetails: filters.includePumpDetails !== false,
    includeProductSummary: filters.includeProductSummary !== false,
    exportFormat: filters.exportFormat
  }),

  buildProductPerformanceFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    stationIds: filters.stationIds ? (Array.isArray(filters.stationIds) ? filters.stationIds.join(',') : filters.stationIds) : undefined,
    shiftStatus: filters.shiftStatus,
    readingType: filters.readingType || 'END',
    page: filters.page || 1,
    limit: filters.limit || 50,
    sortBy: filters.sortBy || 'recordedAt',
    sortOrder: filters.sortOrder || 'desc',
    includeStationBreakdown: filters.includeStationBreakdown || false,
    includeTrendAnalysis: filters.includeTrendAnalysis || false,
    compareAcross: filters.compareAcross
  }),

  buildPumpDetailsFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    stationIds: filters.stationIds ? (Array.isArray(filters.stationIds) ? filters.stationIds.join(',') : filters.stationIds) : undefined,
    shiftStatus: filters.shiftStatus,
    readingType: filters.readingType || 'END',
    includeHistory: filters.includeHistory !== false
  }),

  buildStationProductsFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    shiftStatus: filters.shiftStatus,
    readingType: filters.readingType || 'END',
    page: filters.page || 1,
    limit: filters.limit || 50,
    sortBy: filters.sortBy || 'recordedAt',
    sortOrder: filters.sortOrder || 'desc',
    includeStationBreakdown: filters.includeStationBreakdown || false
  }),

  buildStationShiftsFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    shiftStatus: filters.shiftStatus,
    readingType: filters.readingType || 'END',
    page: filters.page || 1,
    limit: filters.limit || 50,
    sortBy: filters.sortBy || 'recordedAt',
    sortOrder: filters.sortOrder || 'desc'
  }),

  buildRealTimeFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    stationIds: filters.stationIds ? (Array.isArray(filters.stationIds) ? filters.stationIds.join(',') : filters.stationIds) : undefined,
    productIds: filters.productIds ? (Array.isArray(filters.productIds) ? filters.productIds.join(',') : filters.productIds) : undefined,
    shiftStatus: filters.shiftStatus,
    readingType: filters.readingType || 'END',
    lastHours: filters.lastHours || 24,
    updateInterval: filters.updateInterval || 60
  }),

  buildExportFilters: (filters = {}) => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    stationIds: filters.stationIds ? (Array.isArray(filters.stationIds) ? filters.stationIds.join(',') : filters.stationIds) : undefined,
    productIds: filters.productIds ? (Array.isArray(filters.productIds) ? filters.productIds.join(',') : filters.productIds) : undefined,
    shiftStatus: filters.shiftStatus,
    readingType: filters.readingType || 'END',
    format: filters.format || 'json',
    includeAllFields: filters.includeAllFields || false,
    compression: filters.compression || false
  }),

  buildYesterdayFilters: (filters = {}) => ({
    companyId: filters.companyId,
    stationId: filters.stationId
  })
};

// ========== COMPANY ANALYTICS SERVICE ==========
const CompanyAnalyticsService = {
  // 1. Company Dashboard - Main overview
  getDashboard: async (companyId, filters = {}) => {
    logger.info(`Fetching company dashboard for company: ${companyId}`, filters);
    
    const cacheKey = `company_dashboard_${companyId}_${JSON.stringify(filters)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const params = filterBuilders.buildCompanyDashboardFilters(filters);
      const response = await apiService.get(`/fuel-analytics/company/${companyId}/dashboard`, { params });
      const data = handleResponse(response, 'fetching company dashboard');
      
      const formattedData = commonUtils.formatDataForDisplay(data.data || data, 'company_dashboard');
      
      const result = {
        ...data,
        formattedData,
        summary: data.summary || {
          totalLiters: formattedData.reduce((sum, item) => sum + item.totalLiters, 0),
          totalRevenue: formattedData.reduce((sum, item) => sum + item.totalRevenue, 0),
          totalTransactions: formattedData.reduce((sum, item) => sum + (item.transactionCount || 0), 0),
          avgUnitPrice: formattedData.reduce((sum, item) => sum + item.totalLiters, 0) > 0 ? 
                       formattedData.reduce((sum, item) => sum + item.totalRevenue, 0) / 
                       formattedData.reduce((sum, item) => sum + item.totalLiters, 0) : 0
        }
      };
      
      cache.set(cacheKey, result, 5);
      return result;
    } catch (error) {
      throw handleError(error, 'fetching company dashboard', 'Failed to fetch company dashboard');
    }
  },

  // 2. Company Trends - Time-based analysis
  getTrends: async (companyId, filters = {}) => {
    logger.info(`Fetching company trends for company: ${companyId}`, filters);
    
    try {
      const params = filterBuilders.buildCompanyTrendsFilters(filters);
      const response = await apiService.get(`/fuel-analytics/company/${companyId}/trends`, { params });
      const data = handleResponse(response, 'fetching company trends');
      
      return {
        ...data,
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'trend_data'),
        analysis: data.analysis || {}
      };
    } catch (error) {
      throw handleError(error, 'fetching company trends', 'Failed to fetch company trends');
    }
  },

  // 3. Company Comparison - Compare stations/products
  getComparison: async (companyId, filters = {}) => {
    logger.info(`Fetching company comparison for company: ${companyId}`, filters);
    
    try {
      const params = filterBuilders.buildCompanyComparisonFilters(filters);
      const response = await apiService.get(`/fuel-analytics/company/${companyId}/compare`, { params });
      const data = handleResponse(response, 'fetching company comparison');
      
      return {
        ...data,
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'company_dashboard'),
        comparisonSummary: data.comparisonSummary || {}
      };
    } catch (error) {
      throw handleError(error, 'fetching company comparison', 'Failed to fetch company comparison');
    }
  },

  // 4. Company Stations Overview
  getStationsOverview: async (companyId, filters = {}) => {
    logger.info(`Fetching stations overview for company: ${companyId}`, filters);
    
    try {
      const params = {
        ...filterBuilders.buildCompanyDashboardFilters(filters),
        groupBy: 'station',
        limit: 100
      };
      
      const response = await apiService.get(`/fuel-analytics/company/${companyId}/dashboard`, { params });
      const data = handleResponse(response, 'fetching stations overview');
      
      return {
        ...data,
        stations: data.data?.filter(item => item.stationId) || [],
        stationCount: data.data?.filter(item => item.stationId).length || 0,
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'company_dashboard')
      };
    } catch (error) {
      throw handleError(error, 'fetching stations overview', 'Failed to fetch stations overview');
    }
  },

  // 5. Company Products Overview
  getProductsOverview: async (companyId, filters = {}) => {
    logger.info(`Fetching products overview for company: ${companyId}`, filters);
    
    try {
      const params = {
        ...filterBuilders.buildCompanyDashboardFilters(filters),
        groupBy: 'product',
        limit: 100
      };
      
      const response = await apiService.get(`/fuel-analytics/company/${companyId}/dashboard`, { params });
      const data = handleResponse(response, 'fetching products overview');
      
      return {
        ...data,
        products: data.data?.filter(item => item.productId) || [],
        productCount: data.data?.filter(item => item.productId).length || 0,
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'company_dashboard')
      };
    } catch (error) {
      throw handleError(error, 'fetching products overview', 'Failed to fetch products overview');
    }
  },

  // 6. Quick Access - Today
  getTodaySales: async (companyId, filters = {}) => {
    logger.info(`Fetching today's sales for company: ${companyId}`);
    
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const params = {
        ...filterBuilders.buildCompanyDashboardFilters(filters),
        startDate: today,
        endDate: today,
        groupBy: 'station'
      };
      
      const response = await apiService.get(`/fuel-analytics/company/${companyId}/dashboard`, { params });
      const data = handleResponse(response, 'fetching today sales');
      
      return {
        ...data,
        date: today,
        period: 'today',
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'company_dashboard')
      };
    } catch (error) {
      throw handleError(error, 'fetching today sales', 'Failed to fetch today sales');
    }
  },

  // 7. Quick Access - Yesterday
  getYesterdaySales: async (companyId, filters = {}) => {
    logger.info(`Fetching yesterday's sales for company: ${companyId}`);
    
    try {
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      const params = {
        ...filterBuilders.buildCompanyDashboardFilters(filters),
        startDate: yesterday,
        endDate: yesterday,
        groupBy: 'station'
      };
      
      const response = await apiService.get(`/fuel-analytics/company/${companyId}/dashboard`, { params });
      const data = handleResponse(response, 'fetching yesterday sales');
      
      return {
        ...data,
        date: yesterday,
        period: 'yesterday',
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'company_dashboard')
      };
    } catch (error) {
      throw handleError(error, 'fetching yesterday sales', 'Failed to fetch yesterday sales');
    }
  },

  // 8. Quick Access - This Week
  getThisWeekSales: async (companyId, filters = {}) => {
    logger.info(`Fetching this week's sales for company: ${companyId}`);
    
    try {
      const startOfWeek = dayjs().startOf('week').format('YYYY-MM-DD');
      const endOfWeek = dayjs().endOf('week').format('YYYY-MM-DD');
      
      const params = {
        ...filterBuilders.buildCompanyDashboardFilters(filters),
        startDate: startOfWeek,
        endDate: endOfWeek,
        groupBy: 'day'
      };
      
      const response = await apiService.get(`/fuel-analytics/company/${companyId}/dashboard`, { params });
      const data = handleResponse(response, 'fetching week sales');
      
      return {
        ...data,
        dateRange: { startDate: startOfWeek, endDate: endOfWeek },
        period: 'this_week',
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'company_dashboard')
      };
    } catch (error) {
      throw handleError(error, 'fetching week sales', 'Failed to fetch week sales');
    }
  },

  // 9. Quick Access - This Month
  getThisMonthSales: async (companyId, filters = {}) => {
    logger.info(`Fetching this month's sales for company: ${companyId}`);
    
    try {
      const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
      
      const params = {
        ...filterBuilders.buildCompanyDashboardFilters(filters),
        startDate: startOfMonth,
        endDate: endOfMonth,
        groupBy: 'day'
      };
      
      const response = await apiService.get(`/fuel-analytics/company/${companyId}/dashboard`, { params });
      const data = handleResponse(response, 'fetching month sales');
      
      return {
        ...data,
        dateRange: { startDate: startOfMonth, endDate: endOfMonth },
        period: 'this_month',
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'company_dashboard')
      };
    } catch (error) {
      throw handleError(error, 'fetching month sales', 'Failed to fetch month sales');
    }
  },

  // 10. Export Data
  exportData: async (companyId, filters = {}) => {
    logger.info(`Exporting data for company: ${companyId}`, filters);
    
    try {
      const params = filterBuilders.buildExportFilters(filters);
      const response = await apiService.get('/fuel-analytics/export', { 
        params: { ...params, companyId },
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const extension = params.format === 'csv' ? '.csv' : 
                       params.format === 'excel' ? '.xlsx' : 
                       params.format === 'pdf' ? '.pdf' : '.json';
      const filename = `company_${companyId}_analytics_${dayjs().format('YYYY-MM-DD_HH-mm')}${extension}`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { 
        success: true, 
        filename,
        format: params.format,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw handleError(error, 'exporting data', 'Failed to export data');
    }
  },

  // 11. Get Company Summary
  getSummary: async (companyId, filters = {}) => {
    logger.info(`Fetching summary for company: ${companyId}`);
    
    try {
      const dashboardData = await CompanyAnalyticsService.getDashboard(companyId, {
        ...filters,
        groupBy: 'station',
        limit: 1
      });
      
      return {
        companyId,
        summary: dashboardData.summary,
        stationCount: dashboardData.data?.filter(item => item.stationId).length || 0,
        productCount: dashboardData.data?.filter(item => item.productId).length || 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw handleError(error, 'fetching company summary', 'Failed to fetch company summary');
    }
  }
};

// ========== STATION ANALYTICS SERVICE ==========
const StationAnalyticsService = {
  // 1. Station Dashboard - Main station overview
  getDashboard: async (stationId, filters = {}) => {
    logger.info(`Fetching station dashboard for station: ${stationId}`, filters);
    
    const cacheKey = `station_dashboard_${stationId}_${JSON.stringify(filters)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const params = filterBuilders.buildStationDashboardFilters(filters);
      const response = await apiService.get(`/fuel-analytics/station/${stationId}/dashboard`, { params });
      const data = handleResponse(response, 'fetching station dashboard');
      
      const formattedData = commonUtils.formatDataForDisplay(data.data || data, 'station_dashboard');
      
      const result = {
        ...data,
        formattedData,
        summary: data.summary || {
          totalLiters: formattedData.reduce((sum, item) => sum + item.totalLiters, 0),
          totalRevenue: formattedData.reduce((sum, item) => sum + item.totalRevenue, 0),
          totalTransactions: formattedData.reduce((sum, item) => sum + (item.transactionCount || 0), 0),
          avgUnitPrice: formattedData.reduce((sum, item) => sum + item.totalLiters, 0) > 0 ? 
                       formattedData.reduce((sum, item) => sum + item.totalRevenue, 0) / 
                       formattedData.reduce((sum, item) => sum + item.totalLiters, 0) : 0
        }
      };
      
      cache.set(cacheKey, result, 5);
      return result;
    } catch (error) {
      throw handleError(error, 'fetching station dashboard', 'Failed to fetch station dashboard');
    }
  },

  // 2. Station Trends - Time-based station analysis
  getTrends: async (stationId, filters = {}) => {
    logger.info(`Fetching station trends for station: ${stationId}`, filters);
    
    try {
      const params = filterBuilders.buildStationTrendsFilters(filters);
      const response = await apiService.get(`/fuel-analytics/station/${stationId}/trends`, { params });
      const data = handleResponse(response, 'fetching station trends');
      
      return {
        ...data,
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'trend_data'),
        analysis: data.analysis || {}
      };
    } catch (error) {
      throw handleError(error, 'fetching station trends', 'Failed to fetch station trends');
    }
  },

  // 3. Pump Performance - Ranking and efficiency
  getPumpPerformance: async (stationId, filters = {}) => {
    logger.info(`Fetching pump performance for station: ${stationId}`, filters);
    
    const cacheKey = `pump_performance_${stationId}_${JSON.stringify(filters)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const params = filterBuilders.buildPumpPerformanceFilters(filters);
      const response = await apiService.get(`/fuel-analytics/station/${stationId}/pumps/performance`, { params });
      const data = handleResponse(response, 'fetching pump performance');
      
      const formattedData = commonUtils.formatDataForDisplay(data.data || data, 'pump_performance');
      
      const result = {
        ...data,
        formattedData,
        summary: data.summary || {
          totalPumps: formattedData.length,
          totalLiters: formattedData.reduce((sum, item) => sum + item.totalLiters, 0),
          totalRevenue: formattedData.reduce((sum, item) => sum + item.totalRevenue, 0),
          avgEfficiency: formattedData.reduce((sum, item) => sum + (item.efficiencyScore || 0), 0) / formattedData.length || 0
        }
      };
      
      cache.set(cacheKey, result, 5);
      return result;
    } catch (error) {
      throw handleError(error, 'fetching pump performance', 'Failed to fetch pump performance');
    }
  },

  // 4. Station Products - Product performance at station
  getProducts: async (stationId, filters = {}) => {
    logger.info(`Fetching station products for station: ${stationId}`, filters);
    
    try {
      const params = filterBuilders.buildStationProductsFilters(filters);
      const response = await apiService.get(`/fuel-analytics/station/${stationId}/products`, { params });
      const data = handleResponse(response, 'fetching station products');
      
      const formattedData = commonUtils.formatDataForDisplay(data.data || data, 'station_dashboard');
      
      return {
        ...data,
        formattedData,
        productSummary: data.productSummary || {
          productCount: formattedData.length,
          topProduct: formattedData[0],
          bottomProduct: formattedData[formattedData.length - 1]
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching station products', 'Failed to fetch station products');
    }
  },

  // 5. Station Shifts - All shifts for this station
  getShifts: async (stationId, filters = {}) => {
    logger.info(`Fetching station shifts for station: ${stationId}`, filters);
    
    try {
      const params = filterBuilders.buildStationShiftsFilters(filters);
      const response = await apiService.get(`/fuel-analytics/station/${stationId}/shifts`, { params });
      const data = handleResponse(response, 'fetching station shifts');
      
      const formattedData = commonUtils.formatDataForDisplay(data.data || data, 'station_dashboard');
      
      return {
        ...data,
        formattedData,
        shiftSummary: data.shiftSummary || {
          shiftCount: formattedData.length,
          activeShifts: formattedData.filter(shift => shift.status === 'OPEN').length,
          closedShifts: formattedData.filter(shift => shift.status === 'CLOSED').length
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching station shifts', 'Failed to fetch station shifts');
    }
  },

  // 6. Quick Access - Today
  getTodaySales: async (stationId, filters = {}) => {
    logger.info(`Fetching today's sales for station: ${stationId}`);
    
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const params = {
        ...filterBuilders.buildStationDashboardFilters(filters),
        startDate: today,
        endDate: today,
        groupBy: 'product'
      };
      
      const response = await apiService.get(`/fuel-analytics/station/${stationId}/dashboard`, { params });
      const data = handleResponse(response, 'fetching today sales');
      
      return {
        ...data,
        date: today,
        period: 'today',
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'station_dashboard')
      };
    } catch (error) {
      throw handleError(error, 'fetching today sales', 'Failed to fetch today sales');
    }
  },

  // 7. Quick Access - Yesterday
  getYesterdaySales: async (stationId, filters = {}) => {
    logger.info(`Fetching yesterday's sales for station: ${stationId}`);
    
    try {
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      const params = {
        ...filterBuilders.buildStationDashboardFilters(filters),
        startDate: yesterday,
        endDate: yesterday,
        groupBy: 'product'
      };
      
      const response = await apiService.get(`/fuel-analytics/station/${stationId}/dashboard`, { params });
      const data = handleResponse(response, 'fetching yesterday sales');
      
      return {
        ...data,
        date: yesterday,
        period: 'yesterday',
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'station_dashboard')
      };
    } catch (error) {
      throw handleError(error, 'fetching yesterday sales', 'Failed to fetch yesterday sales');
    }
  },

  // 8. Quick Access - This Week
  getThisWeekSales: async (stationId, filters = {}) => {
    logger.info(`Fetching this week's sales for station: ${stationId}`);
    
    try {
      const startOfWeek = dayjs().startOf('week').format('YYYY-MM-DD');
      const endOfWeek = dayjs().endOf('week').format('YYYY-MM-DD');
      
      const params = {
        ...filterBuilders.buildStationDashboardFilters(filters),
        startDate: startOfWeek,
        endDate: endOfWeek,
        groupBy: 'day'
      };
      
      const response = await apiService.get(`/fuel-analytics/station/${stationId}/dashboard`, { params });
      const data = handleResponse(response, 'fetching week sales');
      
      return {
        ...data,
        dateRange: { startDate: startOfWeek, endDate: endOfWeek },
        period: 'this_week',
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'station_dashboard')
      };
    } catch (error) {
      throw handleError(error, 'fetching week sales', 'Failed to fetch week sales');
    }
  },

  // 9. Quick Access - This Month
  getThisMonthSales: async (stationId, filters = {}) => {
    logger.info(`Fetching this month's sales for station: ${stationId}`);
    
    try {
      const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
      
      const params = {
        ...filterBuilders.buildStationDashboardFilters(filters),
        startDate: startOfMonth,
        endDate: endOfMonth,
        groupBy: 'day'
      };
      
      const response = await apiService.get(`/fuel-analytics/station/${stationId}/dashboard`, { params });
      const data = handleResponse(response, 'fetching month sales');
      
      return {
        ...data,
        dateRange: { startDate: startOfMonth, endDate: endOfMonth },
        period: 'this_month',
        formattedData: commonUtils.formatDataForDisplay(data.data || data, 'station_dashboard')
      };
    } catch (error) {
      throw handleError(error, 'fetching month sales', 'Failed to fetch month sales');
    }
  },

  // 10. Export Data
  exportData: async (stationId, filters = {}) => {
    logger.info(`Exporting data for station: ${stationId}`, filters);
    
    try {
      const params = filterBuilders.buildExportFilters(filters);
      const response = await apiService.get('/fuel-analytics/export', { 
        params: { ...params, stationId },
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const extension = params.format === 'csv' ? '.csv' : 
                       params.format === 'excel' ? '.xlsx' : 
                       params.format === 'pdf' ? '.pdf' : '.json';
      const filename = `station_${stationId}_analytics_${dayjs().format('YYYY-MM-DD_HH-mm')}${extension}`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { 
        success: true, 
        filename,
        format: params.format,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw handleError(error, 'exporting station data', 'Failed to export station data');
    }
  },

  // 11. Get Station Summary
  getSummary: async (stationId, filters = {}) => {
    logger.info(`Fetching summary for station: ${stationId}`);
    
    try {
      const dashboardData = await StationAnalyticsService.getDashboard(stationId, {
        ...filters,
        groupBy: 'product',
        limit: 5
      });
      
      const pumpData = await StationAnalyticsService.getPumpPerformance(stationId, {
        ...filters,
        limit: 5
      });
      
      return {
        stationId,
        summary: dashboardData.summary,
        topProducts: dashboardData.formattedData?.slice(0, 3) || [],
        topPumps: pumpData.formattedData?.slice(0, 3) || [],
        productCount: dashboardData.formattedData?.length || 0,
        pumpCount: pumpData.formattedData?.length || 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw handleError(error, 'fetching station summary', 'Failed to fetch station summary');
    }
  },

  // 12. Get Station Overview (All in one)
  getOverview: async (stationId, filters = {}) => {
    logger.info(`Fetching overview for station: ${stationId}`);
    
    try {
      const [dashboard, trends, pumps, products] = await Promise.all([
        StationAnalyticsService.getDashboard(stationId, { ...filters, groupBy: 'product', limit: 5 }),
        StationAnalyticsService.getTrends(stationId, { ...filters, period: 'weekly', metric: 'revenue' }),
        StationAnalyticsService.getPumpPerformance(stationId, { ...filters, limit: 5 }),
        StationAnalyticsService.getProducts(stationId, { ...filters, limit: 5 })
      ]);
      
      return {
        stationId,
        dashboard,
        trends,
        pumpPerformance: pumps,
        products,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw handleError(error, 'fetching station overview', 'Failed to fetch station overview');
    }
  }
};

// ========== SHIFT ANALYTICS SERVICE ==========
const ShiftAnalyticsService = {
  // 1. Shift Details - Complete breakdown
  getDetails: async (shiftId, filters = {}) => {
    logger.info(`Fetching shift details for shift: ${shiftId}`, filters);
    
    const cacheKey = `shift_details_${shiftId}_${JSON.stringify(filters)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const params = filterBuilders.buildShiftDetailFilters(filters);
      const response = await apiService.get(`/fuel-analytics/shift/${shiftId}`, { params });
      const data = handleResponse(response, 'fetching shift details');
      
      const result = {
        ...data,
        shiftInfo: data.data?.shiftInfo || {
          shiftId,
          shiftNumber: data.data?.shiftNumber,
          stationName: data.data?.stationName,
          supervisor: data.data?.supervisor,
          startTime: data.data?.startTime,
          endTime: data.data?.endTime,
          status: data.data?.status,
          duration: data.data?.duration
        },
        totals: data.data?.totals || {},
        pumpSales: data.data?.pumpSales || [],
        productSales: data.data?.productSales || []
      };
      
      cache.set(cacheKey, result, 10);
      return result;
    } catch (error) {
      throw handleError(error, 'fetching shift details', 'Failed to fetch shift details');
    }
  },

  // 2. Shift Pumps - Pump-level view
  getPumps: async (shiftId, filters = {}) => {
    logger.info(`Fetching shift pumps for shift: ${shiftId}`, filters);
    
    try {
      const params = {
        ...filterBuilders.buildShiftDetailFilters(filters),
        includePumpDetails: true,
        includeProductSummary: false
      };
      
      const response = await apiService.get(`/fuel-analytics/shift/${shiftId}/pumps`, { params });
      const data = handleResponse(response, 'fetching shift pumps');
      
      return {
        ...data,
        pumpSales: data.data?.pumpSales || [],
        totals: data.data?.totals || {}
      };
    } catch (error) {
      throw handleError(error, 'fetching shift pumps', 'Failed to fetch shift pumps');
    }
  },

  // 3. Shift Products - Product-level view
  getProducts: async (shiftId, filters = {}) => {
    logger.info(`Fetching shift products for shift: ${shiftId}`, filters);
    
    try {
      const params = {
        ...filterBuilders.buildShiftDetailFilters(filters),
        includePumpDetails: false,
        includeProductSummary: true
      };
      
      const response = await apiService.get(`/fuel-analytics/shift/${shiftId}/products`, { params });
      const data = handleResponse(response, 'fetching shift products');
      
      return {
        ...data,
        productSales: data.data?.productSales || [],
        totals: data.data?.totals || {}
      };
    } catch (error) {
      throw handleError(error, 'fetching shift products', 'Failed to fetch shift products');
    }
  }
};

// ========== PRODUCT ANALYTICS SERVICE ==========
const ProductAnalyticsService = {
  // 1. Product Performance - Across stations
  getPerformance: async (productId, filters = {}) => {
    logger.info(`Fetching product performance for product: ${productId}`, filters);
    
    const cacheKey = `product_performance_${productId}_${JSON.stringify(filters)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const params = filterBuilders.buildProductPerformanceFilters(filters);
      const response = await apiService.get(`/fuel-analytics/product/${productId}/performance`, { params });
      const data = handleResponse(response, 'fetching product performance');
      
      const formattedData = commonUtils.formatDataForDisplay(data.data || data, 'company_dashboard');
      
      const result = {
        ...data,
        formattedData,
        productInfo: data.productInfo || {
          productId,
          productName: 'Unknown Product',
          productCode: null,
          type: null
        },
        summary: data.summary || {
          totalStations: formattedData.filter(item => item.stationId).length,
          totalLiters: formattedData.reduce((sum, item) => sum + item.totalLiters, 0),
          totalRevenue: formattedData.reduce((sum, item) => sum + item.totalRevenue, 0)
        }
      };
      
      cache.set(cacheKey, result, 5);
      return result;
    } catch (error) {
      throw handleError(error, 'fetching product performance', 'Failed to fetch product performance');
    }
  }
};

// ========== PUMP ANALYTICS SERVICE ==========
const PumpAnalyticsService = {
  // 1. Pump Details - Individual pump
  getDetails: async (pumpId, filters = {}) => {
    logger.info(`Fetching pump details for pump: ${pumpId}`, filters);
    
    try {
      const params = filterBuilders.buildPumpDetailsFilters(filters);
      const response = await apiService.get(`/fuel-analytics/pump/${pumpId}`, { params });
      const data = handleResponse(response, 'fetching pump details');
      
      return {
        ...data,
        pumpInfo: data.data?.pumpInfo || {
          pumpId,
          pumpName: `Pump ${pumpId.substring(0, 8)}`,
          stationInfo: null
        },
        performance: data.data?.performance || {},
        stationInfo: data.data?.stationInfo
      };
    } catch (error) {
      throw handleError(error, 'fetching pump details', 'Failed to fetch pump details');
    }
  }
};

// ========== UTILITY SERVICES ==========
const AnalyticsUtilityService = {
  // 1. Clear Cache
  clearCache: async () => {
    logger.info('Clearing analytics cache');
    
    try {
      const response = await apiService.post('/fuel-analytics/cache/clear');
      const data = handleResponse(response, 'clearing cache');
      
      // Clear frontend cache too
      cache.clearAll();
      
      return data;
    } catch (error) {
      throw handleError(error, 'clearing cache', 'Failed to clear cache');
    }
  },

  // 2. Health Check
  checkHealth: async () => {
    logger.info('Checking fuel analytics API health');
    
    try {
      const response = await apiService.get('/fuel-analytics/health');
      return handleResponse(response, 'health check');
    } catch (error) {
      throw handleError(error, 'health check', 'Fuel analytics API is not responding');
    }
  },

  // 3. System Status
  getSystemStatus: async () => {
    logger.info('Fetching system status');
    
    try {
      const response = await apiService.get('/fuel-analytics/status');
      return handleResponse(response, 'system status');
    } catch (error) {
      throw handleError(error, 'fetching system status', 'Failed to fetch system status');
    }
  },

  // 4. Validate Filters
  validateFilters: (filters) => {
    const errors = [];
    
    // Validate date range
    if (filters.startDate && filters.endDate) {
      const validation = commonUtils.validateDateRange(filters.startDate, filters.endDate);
      if (!validation.isValid) {
        errors.push(validation.error);
      }
    }
    
    // Validate numeric filters
    if (filters.page && filters.page < 1) {
      errors.push('Page must be at least 1');
    }
    
    if (filters.limit && (filters.limit < 1 || filters.limit > 500)) {
      errors.push('Limit must be between 1 and 500');
    }
    
    if (filters.lastHours && (filters.lastHours < 1 || filters.lastHours > 720)) {
      errors.push('Last hours must be between 1 and 720');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// ========== COMMON METHODS FOR ALL LEVELS ==========

const getRealTimeSales = async (filters = {}) => {
  logger.info('Fetching real-time sales', filters);
  
  try {
    const params = filterBuilders.buildRealTimeFilters(filters);
    const response = await apiService.get('/fuel-analytics/realtime', { params });
    const data = handleResponse(response, 'fetching real-time sales');
    
    return {
      ...data,
      lastUpdated: new Date().toISOString(),
      updateInterval: filters.updateInterval || 60
    };
  } catch (error) {
    throw handleError(error, 'fetching real-time sales', 'Failed to fetch real-time sales');
  }
};

const getYesterdaySales = async (filters = {}) => {
  logger.info('Fetching yesterday sales', filters);
  
  try {
    const params = filterBuilders.buildYesterdayFilters(filters);
    const response = await apiService.get('/fuel-analytics/yesterday', { params });
    const data = handleResponse(response, 'fetching yesterday sales');
    
    return {
      ...data,
      period: 'yesterday',
      formattedData: commonUtils.formatDataForDisplay(data.data || data, 'company_dashboard')
    };
  } catch (error) {
    throw handleError(error, 'fetching yesterday sales', 'Failed to fetch yesterday sales');
  }
};

// ========== DEFAULT EXPORT (Legacy Support) ==========
const FuelAnalyticsService = {
  // Company Level
  getCompanyDashboard: CompanyAnalyticsService.getDashboard,
  getCompanyTrends: CompanyAnalyticsService.getTrends,
  getCompanyComparison: CompanyAnalyticsService.getComparison,
  getCompanyStationsOverview: CompanyAnalyticsService.getStationsOverview,
  getCompanyProductsOverview: CompanyAnalyticsService.getProductsOverview,
  getCompanySummary: CompanyAnalyticsService.getSummary,
  getCompanyExport: CompanyAnalyticsService.exportData,
  
  // Station Level
  getStationDashboard: StationAnalyticsService.getDashboard,
  getStationTrends: StationAnalyticsService.getTrends,
  getPumpPerformance: StationAnalyticsService.getPumpPerformance,
  getStationProducts: StationAnalyticsService.getProducts,
  getStationShifts: StationAnalyticsService.getShifts,
  getStationSummary: StationAnalyticsService.getSummary,
  getStationOverview: StationAnalyticsService.getOverview,
  getStationExport: StationAnalyticsService.exportData,
  
  // Shift Level
  getShiftDetails: ShiftAnalyticsService.getDetails,
  getShiftPumps: ShiftAnalyticsService.getPumps,
  getShiftProducts: ShiftAnalyticsService.getProducts,
  
  // Product Level
  getProductPerformance: ProductAnalyticsService.getPerformance,
  
  // Pump Level
  getPumpDetails: PumpAnalyticsService.getDetails,
  
  // Quick Access
  getTodaySales: async (filters = {}) => {
    if (filters.companyId) {
      return CompanyAnalyticsService.getTodaySales(filters.companyId, filters);
    } else if (filters.stationId) {
      return StationAnalyticsService.getTodaySales(filters.stationId, filters);
    }
    throw new Error('Either companyId or stationId is required');
  },
  
  getYesterdaySales: getYesterdaySales,
  
  getThisWeekSales: async (filters = {}) => {
    if (filters.companyId) {
      return CompanyAnalyticsService.getThisWeekSales(filters.companyId, filters);
    } else if (filters.stationId) {
      return StationAnalyticsService.getThisWeekSales(filters.stationId, filters);
    }
    throw new Error('Either companyId or stationId is required');
  },
  
  getThisMonthSales: async (filters = {}) => {
    if (filters.companyId) {
      return CompanyAnalyticsService.getThisMonthSales(filters.companyId, filters);
    } else if (filters.stationId) {
      return StationAnalyticsService.getThisMonthSales(filters.stationId, filters);
    }
    throw new Error('Either companyId or stationId is required');
  },
  
  getRealTimeSales: getRealTimeSales,
  
  // Utility
  clearCache: AnalyticsUtilityService.clearCache,
  checkHealth: AnalyticsUtilityService.checkHealth,
  getSystemStatus: AnalyticsUtilityService.getSystemStatus,
  validateFilters: AnalyticsUtilityService.validateFilters,
  
  // Export
  exportData: async (filters = {}) => {
    if (filters.companyId) {
      return CompanyAnalyticsService.exportData(filters.companyId, filters);
    } else if (filters.stationId) {
      return StationAnalyticsService.exportData(filters.stationId, filters);
    }
    throw new Error('Either companyId or stationId is required');
  },
  
  // Utility functions
  formatCurrency: commonUtils.formatCurrency,
  formatVolume: commonUtils.formatVolume,
  formatPercentage: commonUtils.formatPercentage,
  calculateGrowth: commonUtils.calculateGrowth
};

// Export everything without duplicate names
export default FuelAnalyticsService;

// Named exports (removed 'export' from individual service declarations above)
export {
  CompanyAnalyticsService,
  StationAnalyticsService,
  ShiftAnalyticsService,
  ProductAnalyticsService,
  PumpAnalyticsService,
  AnalyticsUtilityService,
  filterBuilders as fuelAnalyticsFilters,
  commonUtils as fuelAnalyticsUtils,
  logger as fuelAnalyticsLogger,
  cache as fuelAnalyticsCache
};