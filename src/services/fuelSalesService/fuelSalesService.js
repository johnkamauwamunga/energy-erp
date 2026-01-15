// src/services/fuelSalesService/fuelSalesService.js
import { apiService } from '../apiService';

// Enhanced logging utility
const logger = {
  debug: (...args) => console.log('🔍 [FuelSalesService]', ...args),
  info: (...args) => console.log('ℹ️ [FuelSalesService]', ...args),
  warn: (...args) => console.warn('⚠️ [FuelSalesService]', ...args),
  error: (...args) => console.error('❌ [FuelSalesService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  logger.debug(`${operation} response:`, response.data);
  
  if (response.data && response.data.success !== false) {
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

// Enhanced error handler
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
      throw new Error('You do not have permission to access this report');
    }
    
    if (status === 404) {
      throw new Error('Sales data not found for the specified criteria');
    }
    
    if (status === 400 && data && data.errors) {
      const errorMessages = data.errors.map(err => `${err.field}: ${err.message}`).join(', ');
      throw new Error(`Validation error: ${errorMessages}`);
    }
    
    if (data && data.message) {
      throw new Error(data.message);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

// ========== NORMALIZATION HELPER ==========

const normalizeApiResponse = (apiData, type, filters = {}) => {
  console.log(`🔄 Normalizing ${type} API response:`, apiData);
  
  // If it's already in the correct format with data property
  if (apiData && typeof apiData === 'object' && !Array.isArray(apiData) && apiData.data !== undefined) {
    console.log(`✅ ${type} response already normalized`);
    return apiData;
  }
  
  // If it's an array, create the expected structure
  if (Array.isArray(apiData)) {
    console.log(`🔄 Converting array to normalized ${type} response`);
    
    const response = {
      success: true,
      data: apiData,
      summary: {
        totalLiters: apiData.reduce((sum, item) => sum + (item.totalLiters || item.liters || 0), 0),
        totalRevenue: apiData.reduce((sum, item) => sum + (item.totalRevenue || item.revenue || 0), 0),
        totalTransactions: apiData.reduce((sum, item) => sum + (item.transactionCount || item.transactions || 0), 0),
        avgUnitPrice: 0,
        totalItems: apiData.length
      },
      meta: {
        reportType: `${type}_sales`,
        groupBy: filters.groupBy || 'product',
        aggregation: 'sum',
        filtersApplied: filters,
        generatedAt: new Date().toISOString(),
        dataSource: 'pump_meter_readings'
      },
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total: apiData.length,
        pages: Math.ceil(apiData.length / (filters.limit || 20)),
        hasNext: false,
        hasPrev: false
      }
    };
    
    // Calculate average unit price
    if (response.summary.totalLiters > 0) {
      response.summary.avgUnitPrice = response.summary.totalRevenue / response.summary.totalLiters;
    }
    
    // Add type-specific info
    switch (type) {
      case 'shift':
        response.summary.shiftInfo = {};
        if (filters.shiftId) {
          response.summary.shiftInfo.id = filters.shiftId;
        }
        break;
      case 'station':
        response.summary.stationInfo = { id: filters.stationId };
        break;
      case 'product':
        response.summary.productInfo = { id: filters.productId };
        break;
      case 'company':
        response.summary.companyInfo = { id: filters.companyId };
        break;
    }
    
    // Add date range if provided
    if (filters.startDate && filters.endDate) {
      response.summary.dateRange = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        days: Math.ceil((new Date(filters.endDate) - new Date(filters.startDate)) / (1000 * 60 * 60 * 24)) + 1
      };
    }
    
    console.log(`✅ Normalized ${type} response:`, response);
    return response;
  }
  
  // If it's an object without data property but has other properties
  if (apiData && typeof apiData === 'object' && !Array.isArray(apiData)) {
    console.log(`🔄 Normalizing object response for ${type}`);
    
    // Check if it has the success property (full response from backend)
    if (apiData.success !== undefined) {
      return apiData;
    }
    
    // Convert object to array if needed
    const dataArray = [];
    const keys = Object.keys(apiData);
    if (keys.length > 0 && typeof apiData[keys[0]] === 'object') {
      // Object of objects
      dataArray.push(...Object.values(apiData));
    } else {
      // Single object
      dataArray.push(apiData);
    }
    
    return normalizeApiResponse(dataArray, type, filters);
  }
  
  // Return empty structure for other cases
  console.warn(`⚠️ Empty response for ${type}, creating default structure`);
  return {
    success: true,
    data: [],
    summary: {
      totalLiters: 0,
      totalRevenue: 0,
      totalTransactions: 0,
      avgUnitPrice: 0,
      totalItems: 0
    },
    meta: {
      reportType: `${type}_sales`,
      groupBy: filters.groupBy || 'product',
      aggregation: 'sum',
      filtersApplied: filters,
      generatedAt: new Date().toISOString(),
      dataSource: 'api'
    },
    pagination: {
      page: filters.page || 1,
      limit: filters.limit || 20,
      total: 0,
      pages: 0,
      hasNext: false,
      hasPrev: false
    }
  };
};

// Helper to normalize field names in data
const normalizeDataFields = (dataArray, type) => {
  if (!Array.isArray(dataArray)) return dataArray;
  
  return dataArray.map(item => {
    const normalized = { ...item };
    
    // Normalize field names for consistency
    if ('liters' in item && !('totalLiters' in item)) {
      normalized.totalLiters = item.liters;
    }
    if ('revenue' in item && !('totalRevenue' in item)) {
      normalized.totalRevenue = item.revenue;
    }
    if ('unitPrice' in item && !('avgUnitPrice' in item)) {
      normalized.avgUnitPrice = item.unitPrice;
    }
    if ('transactions' in item && !('transactionCount' in item)) {
      normalized.transactionCount = item.transactions;
    }
    
    // Ensure ID exists
    if (!normalized.id) {
      normalized.id = item.productId || item.pumpId || item.stationId || 
                     item.companyId || item.period || Math.random().toString();
    }
    
    return normalized;
  });
};

// ========== FILTER BUILDER UTILITIES ==========

const fuelSalesFilters = {
  buildShiftFilters: (filters = {}) => {
    const {
      groupBy = 'product',
      page = 1,
      limit = 20,
      includeDetails = false,
      includePercentages = false,
      compareWithPrevious = false,
      sortBy = 'liters',
      sortOrder = 'desc'
    } = filters;

    return {
      page,
      limit,
      groupBy,
      includeDetails,
      includePercentages,
      compareWithPrevious,
      sortBy,
      sortOrder
    };
  },

  buildProductFilters: (filters = {}) => {
    const {
      startDate,
      endDate,
      stationId,
      page = 1,
      limit = 20,
      groupBy = 'day',
      includeStationBreakdown = false,
      includeTrendAnalysis = false,
      compareWith,
      sortBy = 'liters',
      sortOrder = 'desc'
    } = filters;

    const params = {
      page,
      limit,
      groupBy,
      includeStationBreakdown,
      includeTrendAnalysis,
      sortBy,
      sortOrder
    };

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (stationId) params.stationId = stationId;
    if (compareWith) params.compareWith = compareWith;

    return params;
  },

  buildStationFilters: (filters = {}) => {
    const {
      startDate,
      endDate,
      productId,
      page = 1,
      limit = 20,
      groupBy = 'day',
      includePumpPerformance = false,
      includeProductMix = false,
      sortBy = 'liters',
      sortOrder = 'desc'
    } = filters;

    const params = {
      page,
      limit,
      groupBy,
      includePumpPerformance,
      includeProductMix,
      sortBy,
      sortOrder
    };

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (productId) params.productId = productId;

    return params;
  },

  buildCompanyFilters: (filters = {}) => {
    const {
      startDate,
      endDate,
      page = 1,
      limit = 20,
      groupBy = 'station',
      includeStationComparison = false,
      includeProductPortfolio = false,
      sortBy = 'liters',
      sortOrder = 'desc'
    } = filters;

    const params = {
      page,
      limit,
      groupBy,
      includeStationComparison,
      includeProductPortfolio,
      sortBy,
      sortOrder
    };

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return params;
  },

  buildDailyFilters: (filters = {}) => {
    const {
      date,
      stationId,
      productId,
      page = 1,
      limit = 20,
      groupBy = 'product',
      compareWithPreviousDay = false,
      sortBy = 'liters',
      sortOrder = 'desc'
    } = filters;

    const params = {
      page,
      limit,
      groupBy,
      compareWithPreviousDay,
      sortBy,
      sortOrder
    };

    if (date) params.date = date;
    if (stationId) params.stationId = stationId;
    if (productId) params.productId = productId;

    return params;
  },

  buildRangeFilters: (filters = {}) => {
    const {
      startDate,
      endDate,
      companyId,
      stationIds = [],
      productIds = [],
      page = 1,
      limit = 20,
      groupBy = 'day',
      aggregation = 'sum',
      includeRanking = false,
      includeMarketShare = true,
      sortBy = 'liters',
      sortOrder = 'desc'
    } = filters;

    const params = {
      page,
      limit,
      groupBy,
      aggregation,
      includeRanking,
      includeMarketShare,
      sortBy,
      sortOrder
    };

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (companyId) params.companyId = companyId;
    if (stationIds.length > 0) params.stationIds = stationIds.join(',');
    if (productIds.length > 0) params.productIds = productIds.join(',');

    return params;
  },

  buildPerformanceFilters: (filters = {}) => {
    const {
      startDate,
      endDate,
      companyId,
      stationIds = [],
      productIds = [],
      page = 1,
      limit = 10,
      rankingBy = 'revenue',
      includeMetrics = true,
      includeProductBreakdown = false,
      includeStationPortfolio = false
    } = filters;

    const params = {
      page,
      limit,
      rankingBy
    };

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (companyId) params.companyId = companyId;
    if (stationIds.length > 0) params.stationIds = stationIds.join(',');
    if (productIds.length > 0) params.productIds = productIds.join(',');

    // Performance-specific flags
    if (includeMetrics !== undefined) params.includeMetrics = includeMetrics;
    if (includeProductBreakdown !== undefined) params.includeProductBreakdown = includeProductBreakdown;
    if (includeStationPortfolio !== undefined) params.includeStationPortfolio = includeStationPortfolio;

    return params;
  }
};

// ========== CALCULATION & FORMATTING UTILITIES ==========

const fuelSalesCalculations = {
  calculateGrowth: (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  },

  calculateMarketShare: (itemTotal, overallTotal) => {
    if (!overallTotal || overallTotal === 0) return 0;
    return (itemTotal / overallTotal) * 100;
  },

  formatCurrency: (amount, currency = 'KES') => {
    if (amount === null || amount === undefined) return `Ksh 0.00`;
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },

  formatVolume: (liters) => {
    if (liters === null || liters === undefined) return '0.0 L';
    if (liters >= 1000) {
      return `${(liters / 1000).toFixed(1)}k L`;
    }
    return `${liters.toFixed(1)} L`;
  },

  formatPercentage: (value) => {
    if (value === null || value === undefined) return '0.0%';
    return `${value.toFixed(1)}%`;
  }
};

const fuelSalesFormatters = {
  formatShiftData: (shiftData) => {
    if (!shiftData) return null;
    
    const normalizedData = {
      ...shiftData,
      data: normalizeDataFields(shiftData.data || [], 'shift')
    };
    
    const formatted = {
      ...normalizedData,
      summary: normalizedData.summary || {},
      shiftInfo: normalizedData.shiftInfo || normalizedData.summary?.shiftInfo || {},
      
      // Formatted values
      formattedTotalLiters: fuelSalesCalculations.formatVolume(normalizedData.summary?.totalLiters || 0),
      formattedTotalRevenue: fuelSalesCalculations.formatCurrency(normalizedData.summary?.totalRevenue || 0),
      formattedAvgUnitPrice: fuelSalesCalculations.formatCurrency(normalizedData.summary?.avgUnitPrice || 0),
      
      // Formatted dates
      formattedStartTime: normalizedData.shiftInfo?.startTime ? 
        new Date(normalizedData.shiftInfo.startTime).toLocaleString() : 'N/A',
      formattedEndTime: normalizedData.shiftInfo?.endTime ? 
        new Date(normalizedData.shiftInfo.endTime).toLocaleString() : 'N/A',
      
      // Mobile-friendly formats
      shortStartTime: normalizedData.shiftInfo?.startTime ? 
        new Date(normalizedData.shiftInfo.startTime).toLocaleDateString('en-KE') : 'N/A'
    };
    
    return formatted;
  },

  formatProductData: (productData) => {
    if (!productData) return null;
    
    const normalizedData = {
      ...productData,
      data: normalizeDataFields(productData.data || [], 'product')
    };
    
    const formatted = {
      ...normalizedData,
      summary: normalizedData.summary || {},
      productInfo: normalizedData.productInfo || normalizedData.summary?.productInfo || {},
      
      // Formatted values
      formattedTotalLiters: fuelSalesCalculations.formatVolume(normalizedData.summary?.totalLiters || 0),
      formattedTotalRevenue: fuelSalesCalculations.formatCurrency(normalizedData.summary?.totalRevenue || 0),
      formattedAvgUnitPrice: fuelSalesCalculations.formatCurrency(normalizedData.summary?.avgUnitPrice || 0),
      
      // Date range display
      formattedDateRange: normalizedData.summary?.dateRange ? 
        `${normalizedData.summary.dateRange.startDate} to ${normalizedData.summary.dateRange.endDate}` : 'N/A'
    };
    
    return formatted;
  },

  formatPerformanceData: (performanceData) => {
    if (!performanceData) return null;
    
    const normalizedData = {
      ...performanceData,
      data: normalizeDataFields(performanceData.data || [], 'performance')
    };
    
    const formatted = {
      ...normalizedData,
      summary: normalizedData.summary || {},
      
      // Format ranking items
      data: (normalizedData.data || []).map((item, index) => ({
        ...item,
        rank: item.rank || index + 1,
        formattedTotalLiters: fuelSalesCalculations.formatVolume(item.totalLiters || 0),
        formattedTotalRevenue: fuelSalesCalculations.formatCurrency(item.totalRevenue || 0),
        formattedAvgUnitPrice: fuelSalesCalculations.formatCurrency(item.avgUnitPrice || 0),
        formattedMarketShare: fuelSalesCalculations.formatPercentage(item.marketShareLiters || item.marketShareRevenue || 0),
        formattedGrowth: item.growth ? fuelSalesCalculations.formatPercentage(item.growth) : 'N/A',
        formattedDailyAvg: item.dailyAvgLiters ? 
          `${fuelSalesCalculations.formatVolume(item.dailyAvgLiters)}/day` : 'N/A'
      }))
    };
    
    return formatted;
  },

  formatForTable: (salesData, type) => {
    if (!salesData || !salesData.data) {
      console.warn(`No data to format for table (${type})`);
      return [];
    }
    
    const normalizedData = normalizeDataFields(salesData.data, type);
    
    console.log(`📊 Formatting ${type} data for table:`, normalizedData);
    
    switch (type) {
      case 'shift':
        return normalizedData.map(item => ({
          id: item.id || item.productId || Math.random().toString(),
          name: item.productName || item.pumpName || item.name || 'Unknown',
          period: item.period || salesData.shiftInfo?.shiftNumber || 'Shift',
          totalLiters: item.totalLiters || 0,
          totalRevenue: item.totalRevenue || 0,
          avgUnitPrice: item.avgUnitPrice || 0,
          transactionCount: item.transactionCount || 0,
          percentage: item.percentage || 0,
          productCode: item.productCode,
          productId: item.productId,
          // Formatted values
          formattedLiters: fuelSalesCalculations.formatVolume(item.totalLiters || 0),
          formattedRevenue: fuelSalesCalculations.formatCurrency(item.totalRevenue || 0),
          formattedUnitPrice: fuelSalesCalculations.formatCurrency(item.avgUnitPrice || 0)
        }));
        
      case 'performance':
        return normalizedData.map(item => ({
          id: item.id || item.productId || item.stationId || item.companyId || Math.random().toString(),
          name: item.productName || item.stationName || item.companyName || item.name || 'Unknown',
          rank: item.rank || 0,
          totalLiters: item.totalLiters || 0,
          totalRevenue: item.totalRevenue || 0,
          avgUnitPrice: item.avgUnitPrice || 0,
          marketShare: item.marketShareLiters || item.marketShareRevenue || 0,
          growth: item.growth || 0,
          efficiency: item.efficiency || 0,
          formattedLiters: fuelSalesCalculations.formatVolume(item.totalLiters || 0),
          formattedRevenue: fuelSalesCalculations.formatCurrency(item.totalRevenue || 0),
          formattedMarketShare: fuelSalesCalculations.formatPercentage(item.marketShareLiters || item.marketShareRevenue || 0),
          formattedGrowth: item.growth ? fuelSalesCalculations.formatPercentage(item.growth) : 'N/A'
        }));
        
      case 'station':
      case 'product':
      case 'daily':
      case 'range':
      case 'weekly':
      case 'monthly':
      case 'company':
        return normalizedData.map(item => ({
          id: item.id || item.period || Math.random().toString(),
          period: item.period || 'N/A',
          name: item.productName || item.stationName || item.name || 'N/A',
          totalLiters: item.totalLiters || 0,
          totalRevenue: item.totalRevenue || 0,
          avgUnitPrice: item.avgUnitPrice || 0,
          transactionCount: item.transactionCount || 0,
          formattedLiters: fuelSalesCalculations.formatVolume(item.totalLiters || 0),
          formattedRevenue: fuelSalesCalculations.formatCurrency(item.totalRevenue || 0),
          formattedUnitPrice: fuelSalesCalculations.formatCurrency(item.avgUnitPrice || 0)
        }));
        
      default:
        return normalizedData.map(item => ({
          id: item.id || item.period || Math.random().toString(),
          period: item.period || 'N/A',
          totalLiters: item.totalLiters || 0,
          totalRevenue: item.totalRevenue || 0,
          avgUnitPrice: item.avgUnitPrice || 0,
          transactionCount: item.transactionCount || 0,
          formattedLiters: fuelSalesCalculations.formatVolume(item.totalLiters || 0),
          formattedRevenue: fuelSalesCalculations.formatCurrency(item.totalRevenue || 0),
          formattedUnitPrice: fuelSalesCalculations.formatCurrency(item.avgUnitPrice || 0)
        }));
    }
  }
};

// ========== MAIN FUEL SALES SERVICE ==========

const FuelSalesService = {
  // ========== 1. SHIFT-LEVEL SALES ==========
  getShiftSales: async (shiftId, filters = {}) => {
    logger.info(`Fetching shift sales for shift: ${shiftId}`, filters);
    
    try {
      const params = fuelSalesFilters.buildShiftFilters(filters);
      const response = await apiService.get(`/fuel-sales/shift/${shiftId}`, { params });
      const apiData = handleResponse(response, 'fetching shift sales');

      console.log("📊 Shift sales API response:", apiData);
      
      // Normalize the API response
      const normalizedResult = normalizeApiResponse(apiData, 'shift', { shiftId, ...filters });
      
      const formatted = fuelSalesFormatters.formatShiftData(normalizedResult);
      const tableData = fuelSalesFormatters.formatForTable(normalizedResult, 'shift');
      
      console.log("✅ Shift sales normalized result:", {
        data: normalizedResult.data,
        tableData,
        summary: normalizedResult.summary
      });
      
      return {
        ...normalizedResult,
        formatted,
        tableData
      };
    } catch (error) {
      throw handleError(error, 'fetching shift sales', 'Failed to fetch shift sales data');
    }
  },

  // ========== 2. PRODUCT-LEVEL SALES ==========
  getProductSales: async (productId, filters = {}) => {
    logger.info(`Fetching product sales for product: ${productId}`, filters);
    
    try {
      const params = fuelSalesFilters.buildProductFilters(filters);
      const response = await apiService.get(`/fuel-sales/product/${productId}`, { params });
      const apiData = handleResponse(response, 'fetching product sales');

      console.log("📊 Product sales API response:", apiData);
      
      // Normalize the API response
      const normalizedResult = normalizeApiResponse(apiData, 'product', { productId, ...filters });
      
      const formatted = fuelSalesFormatters.formatProductData(normalizedResult);
      const tableData = fuelSalesFormatters.formatForTable(normalizedResult, 'product');
      
      return {
        ...normalizedResult,
        formatted,
        tableData
      };
    } catch (error) {
      throw handleError(error, 'fetching product sales', 'Failed to fetch product sales data');
    }
  },

  // ========== 3. STATION-LEVEL SALES ==========
  getStationSales: async (stationId, filters = {}) => {
    logger.info(`Fetching station sales for station: ${stationId}`, filters);
    
    try {
      const params = fuelSalesFilters.buildStationFilters(filters);
      const response = await apiService.get(`/fuel-sales/station/${stationId}`, { params });
      const apiData = handleResponse(response, 'fetching station sales');
      
      console.log("📊 Station sales API response:", apiData);
      
      // Normalize the API response
      const normalizedResult = normalizeApiResponse(apiData, 'station', { stationId, ...filters });
      
      const formatted = fuelSalesFormatters.formatProductData(normalizedResult);
      const tableData = fuelSalesFormatters.formatForTable(normalizedResult, 'station');
      
      return {
        ...normalizedResult,
        formatted,
        tableData
      };
    } catch (error) {
      throw handleError(error, 'fetching station sales', 'Failed to fetch station sales data');
    }
  },

  // ========== 4. COMPANY-LEVEL SALES ==========
  getCompanySales: async (companyId, filters = {}) => {
    logger.info(`Fetching company sales for company: ${companyId}`, filters);
    
    try {
      const params = fuelSalesFilters.buildCompanyFilters(filters);
      const response = await apiService.get(`/fuel-sales/company/${companyId}`, { params });
      const apiData = handleResponse(response, 'fetching company sales');
      
      console.log("📊 Company sales API response:", apiData);
      
      // Normalize the API response
      const normalizedResult = normalizeApiResponse(apiData, 'company', { companyId, ...filters });
      
      const formatted = fuelSalesFormatters.formatProductData(normalizedResult);
      const tableData = fuelSalesFormatters.formatForTable(normalizedResult, 'company');
      
      return {
        ...normalizedResult,
        formatted,
        tableData
      };
    } catch (error) {
      throw handleError(error, 'fetching company sales', 'Failed to fetch company sales data');
    }
  },

  // ========== 5. DAILY SALES ==========
  getDailySales: async (filters = {}) => {
    logger.info('Fetching daily sales', filters);
    
    try {
      const params = fuelSalesFilters.buildDailyFilters(filters);
      const response = await apiService.get('/fuel-sales/daily', { params });
      const apiData = handleResponse(response, 'fetching daily sales');
      
      console.log("📊 Daily sales API response:", apiData);
      
      // Normalize the API response
      const normalizedResult = normalizeApiResponse(apiData, 'daily', filters);
      
      const formatted = fuelSalesFormatters.formatProductData(normalizedResult);
      const tableData = fuelSalesFormatters.formatForTable(normalizedResult, 'daily');
      
      return {
        ...normalizedResult,
        formatted,
        tableData
      };
    } catch (error) {
      throw handleError(error, 'fetching daily sales', 'Failed to fetch daily sales data');
    }
  },

  // ========== 6. RANGE SALES ==========
  getRangeSales: async (filters = {}) => {
    logger.info('Fetching range sales', filters);
    
    try {
      const params = fuelSalesFilters.buildRangeFilters(filters);
      const response = await apiService.get('/fuel-sales/range', { params });
      const apiData = handleResponse(response, 'fetching range sales');
      
      console.log("📊 Range sales API response:", apiData);
      
      // Normalize the API response
      const normalizedResult = normalizeApiResponse(apiData, 'range', filters);
      
      const formatted = fuelSalesFormatters.formatProductData(normalizedResult);
      const tableData = fuelSalesFormatters.formatForTable(normalizedResult, 'range');
      
      return {
        ...normalizedResult,
        formatted,
        tableData
      };
    } catch (error) {
      throw handleError(error, 'fetching range sales', 'Failed to fetch range sales data');
    }
  },

  // ========== 7. WEEKLY SALES ==========
  getWeeklySales: async (filters = {}) => {
    logger.info('Fetching weekly sales', filters);
    
    try {
      const params = fuelSalesFilters.buildRangeFilters(filters);
      const response = await apiService.get('/fuel-sales/weekly', { params });
      const apiData = handleResponse(response, 'fetching weekly sales');
      
      console.log("📊 Weekly sales API response:", apiData);
      
      // Normalize the API response
      const normalizedResult = normalizeApiResponse(apiData, 'weekly', filters);
      
      const formatted = fuelSalesFormatters.formatProductData(normalizedResult);
      const tableData = fuelSalesFormatters.formatForTable(normalizedResult, 'weekly');
      
      return {
        ...normalizedResult,
        formatted,
        tableData
      };
    } catch (error) {
      throw handleError(error, 'fetching weekly sales', 'Failed to fetch weekly sales data');
    }
  },

  // ========== 8. MONTHLY SALES ==========
  getMonthlySales: async (filters = {}) => {
    logger.info('Fetching monthly sales', filters);
    
    try {
      const params = fuelSalesFilters.buildRangeFilters(filters);
      const response = await apiService.get('/fuel-sales/monthly', { params });
      const apiData = handleResponse(response, 'fetching monthly sales');
      
      console.log("📊 Monthly sales API response:", apiData);
      
      // Normalize the API response
      const normalizedResult = normalizeApiResponse(apiData, 'monthly', filters);
      
      const formatted = fuelSalesFormatters.formatProductData(normalizedResult);
      const tableData = fuelSalesFormatters.formatForTable(normalizedResult, 'monthly');
      
      return {
        ...normalizedResult,
        formatted,
        tableData
      };
    } catch (error) {
      throw handleError(error, 'fetching monthly sales', 'Failed to fetch monthly sales data');
    }
  },

  // ========== 9. PRODUCT PERFORMANCE ==========
  getProductPerformance: async (filters = {}) => {
    logger.info('Fetching product performance', filters);
    
    try {
      const params = fuelSalesFilters.buildPerformanceFilters(filters);
      const response = await apiService.get('/fuel-sales/products/performance', { params });
      const apiData = handleResponse(response, 'fetching product performance');
      
      console.log("📊 Product performance API response:", apiData);
      
      // Normalize the API response
      const normalizedResult = normalizeApiResponse(apiData, 'performance', filters);
      
      const formatted = fuelSalesFormatters.formatPerformanceData(normalizedResult);
      const tableData = fuelSalesFormatters.formatForTable(normalizedResult, 'performance');
      
      return {
        ...normalizedResult,
        formatted,
        tableData
      };
    } catch (error) {
      throw handleError(error, 'fetching product performance', 'Failed to fetch product performance data');
    }
  },

  // ========== 10. STATION PERFORMANCE ==========
  getStationPerformance: async (filters = {}) => {
    logger.info('Fetching station performance', filters);
    
    try {
      const params = fuelSalesFilters.buildPerformanceFilters(filters);
      const response = await apiService.get('/fuel-sales/stations/performance', { params });
      const apiData = handleResponse(response, 'fetching station performance');
      
      console.log("📊 Station performance API response:", apiData);
      
      // Normalize the API response
      const normalizedResult = normalizeApiResponse(apiData, 'performance', filters);
      
      const formatted = fuelSalesFormatters.formatPerformanceData(normalizedResult);
      const tableData = fuelSalesFormatters.formatForTable(normalizedResult, 'performance');
      
      return {
        ...normalizedResult,
        formatted,
        tableData
      };
    } catch (error) {
      throw handleError(error, 'fetching station performance', 'Failed to fetch station performance data');
    }
  },

  // ========== 11. COMPANY PERFORMANCE ==========
  getCompanyPerformance: async (filters = {}) => {
    logger.info('Fetching company performance', filters);
    
    try {
      const params = fuelSalesFilters.buildPerformanceFilters(filters);
      const response = await apiService.get('/fuel-sales/companies/performance', { params });
      const apiData = handleResponse(response, 'fetching company performance');
      
      console.log("📊 Company performance API response:", apiData);
      
      // Normalize the API response
      const normalizedResult = normalizeApiResponse(apiData, 'performance', filters);
      
      const formatted = fuelSalesFormatters.formatPerformanceData(normalizedResult);
      const tableData = fuelSalesFormatters.formatForTable(normalizedResult, 'performance');
      
      return {
        ...normalizedResult,
        formatted,
        tableData
      };
    } catch (error) {
      throw handleError(error, 'fetching company performance', 'Failed to fetch company performance data');
    }
  },

  // ========== CONVENIENCE METHODS ==========
  
  // Get sales summary for dashboard
  getDashboardSummary: async (period = 'today', stationId = null) => {
    logger.info(`Fetching dashboard summary for period: ${period}, station: ${stationId}`);
    
    try {
      let startDate, endDate;
      const today = new Date().toISOString().split('T')[0];
      
      switch (period) {
        case 'today':
          startDate = today;
          endDate = today;
          break;
        case 'yesterday':
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = yesterday.toISOString().split('T')[0];
          endDate = startDate;
          break;
        case 'week':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
          endDate = today;
          break;
        case 'month':
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo.toISOString().split('T')[0];
          endDate = today;
          break;
        default:
          startDate = today;
          endDate = today;
      }
      
      const filters = { startDate, endDate };
      if (stationId) filters.stationId = stationId;
      
      const response = await this.getRangeSales(filters);
      
      // Create dashboard summary from range sales
      const summary = {
        period: period,
        startDate: startDate,
        endDate: endDate,
        totalLiters: response.summary?.totalLiters || 0,
        totalRevenue: response.summary?.totalRevenue || 0,
        totalTransactions: response.summary?.totalTransactions || 0,
        avgUnitPrice: response.summary?.avgUnitPrice || 0,
        stationCount: response.summary?.stationInfo ? 1 : 0,
        
        // Formatted values
        formattedTotalLiters: fuelSalesCalculations.formatVolume(response.summary?.totalLiters || 0),
        formattedTotalRevenue: fuelSalesCalculations.formatCurrency(response.summary?.totalRevenue || 0),
        formattedAvgUnitPrice: fuelSalesCalculations.formatCurrency(response.summary?.avgUnitPrice || 0)
      };
      
      return summary;
    } catch (error) {
      throw handleError(error, 'fetching dashboard summary', 'Failed to fetch dashboard summary');
    }
  },

  // Get top performing products
  getTopProducts: async (limit = 5, period = 'month', stationId = null) => {
    logger.info(`Fetching top ${limit} products for period: ${period}`);
    
    try {
      const filters = {
        limit,
        rankingBy: 'revenue',
        includeMetrics: true
      };
      
      if (stationId) filters.stationIds = [stationId];
      
      // Set date range based on period
      const today = new Date().toISOString().split('T')[0];
      let startDate;
      
      switch (period) {
        case 'week':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
          break;
        case 'month':
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo.toISOString().split('T')[0];
          break;
        case 'quarter':
          const quarterAgo = new Date();
          quarterAgo.setMonth(quarterAgo.getMonth() - 3);
          startDate = quarterAgo.toISOString().split('T')[0];
          break;
        default:
          startDate = today;
      }
      
      filters.startDate = startDate;
      filters.endDate = today;
      
      const response = await this.getProductPerformance(filters);
      return response.data || [];
    } catch (error) {
      throw handleError(error, 'fetching top products', 'Failed to fetch top performing products');
    }
  },

  // Get sales trend data for charts
  getSalesTrend: async (period = 'month', stationId = null) => {
    logger.info(`Fetching sales trend for period: ${period}`);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      let startDate, groupBy;
      
      switch (period) {
        case 'week':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
          groupBy = 'day';
          break;
        case 'month':
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo.toISOString().split('T')[0];
          groupBy = 'day';
          break;
        case 'quarter':
          const quarterAgo = new Date();
          quarterAgo.setMonth(quarterAgo.getMonth() - 3);
          startDate = quarterAgo.toISOString().split('T')[0];
          groupBy = 'week';
          break;
        case 'year':
          const yearAgo = new Date();
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          startDate = yearAgo.toISOString().split('T')[0];
          groupBy = 'month';
          break;
        default:
          startDate = today;
          groupBy = 'day';
      }
      
      const filters = {
        startDate,
        endDate: today,
        groupBy,
        limit: 50
      };
      
      if (stationId) filters.stationId = stationId;
      
      const response = await this.getRangeSales(filters);
      
      // Format for chart data
      const chartData = (response.data || []).map(item => ({
        period: item.period,
        date: item.periodLabel || item.period,
        liters: item.totalLiters || 0,
        revenue: item.totalRevenue || 0,
        unitPrice: item.avgUnitPrice || 0,
        transactions: item.transactionCount || 0
      }));
      
      return {
        chartData,
        summary: response.summary,
        meta: response.meta
      };
    } catch (error) {
      throw handleError(error, 'fetching sales trend', 'Failed to fetch sales trend data');
    }
  },

  // Export sales data
  exportSalesData: async (endpoint, filters = {}, format = 'csv') => {
    logger.info(`Exporting sales data from ${endpoint} in ${format} format`);
    
    try {
      // Get the data first
      let response;
      switch (endpoint) {
        case 'product':
          response = await this.getProductPerformance(filters);
          break;
        case 'station':
          response = await this.getStationPerformance(filters);
          break;
        case 'range':
          response = await this.getRangeSales(filters);
          break;
        default:
          throw new Error('Invalid export endpoint');
      }
      
      // Convert to desired format
      if (format === 'csv') {
        return this.convertToCSV(response.data || []);
      } else if (format === 'excel') {
        return this.convertToExcel(response.data || []);
      } else if (format === 'json') {
        return JSON.stringify(response, null, 2);
      }
      
      throw new Error(`Unsupported export format: ${format}`);
    } catch (error) {
      throw handleError(error, 'exporting sales data', 'Failed to export sales data');
    }
  },

  // Helper methods for export
  convertToCSV: (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => 
      Object.values(item).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  },

  convertToExcel: (data) => {
    // This would typically use a library like xlsx
    logger.warn('Excel export requires xlsx library - returning CSV instead');
    return this.convertToCSV(data);
  }
};

// ========== SINGLE EXPORT AT THE END ==========

// Export default service
export default FuelSalesService;

// Export named utilities
export { 
  fuelSalesFilters, 
  fuelSalesCalculations, 
  fuelSalesFormatters 
};

