// services/shiftService.js
import { apiService } from '../apiService';

class ShiftService {
  constructor() {
    this.basePath = '/shift';
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000;
    
    this.logger = {
      debug: (...args) => console.log('🔍 [ShiftService]', ...args),
      info: (...args) => console.log('ℹ️ [ShiftService]', ...args),
      warn: (...args) => console.warn('⚠️ [ShiftService]', ...args),
      error: (...args) => console.error('❌ [ShiftService]', ...args)
    };

    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      cacheEnabled: true
    };
  }

  // ==================== CORE UTILITIES ====================

  #handleResponse(response, operation) {
    // Handle the nested success/data structure from your API
    if (response.data?.success) {
      this.logger.debug(`${operation} successful`);
      return response.data; // Return entire response data including success, message, data
    }
    
    // If no success flag but data exists, return it directly
    if (response.data) {
      this.logger.debug(`${operation} successful (direct data)`);
      return response.data;
    }
    
    this.logger.warn(`Unexpected response structure for ${operation}`);
    throw new Error('Invalid response format from server');
  }

  #handleError(error, operation, defaultMessage) {
    this.logger.error(`${operation} failed:`, error);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    if (error.request) {
      throw new Error('Network error. Please check your connection.');
    }

    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          throw new Error('Authentication failed. Please login again.');
        
        case 403:
          throw new Error('You do not have permission to perform this action.');
        
        case 404:
          throw new Error('Requested resource not found.');
        
        case 400:
        case 422:
          return this.#handleValidationError(data);
        
        case 429:
          throw new Error('Too many requests. Please try again later.');
        
        case 500:
          throw new Error('Server error. Please try again later.');
        
        default:
          if (data?.message) throw new Error(data.message);
      }
    }

    throw new Error(defaultMessage || 'An unexpected error occurred');
  }

  #handleValidationError(data) {
    if (data.message) throw new Error(data.message);
    if (data.errors) {
      const errorMessages = Array.isArray(data.errors) 
        ? data.errors.map(err => err.message || err).join(', ')
        : JSON.stringify(data.errors);
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    throw new Error('Validation failed');
  }

  #buildQueryParams(filters = {}) {
    const params = new URLSearchParams();
    
    // Enhanced parameter building for complex filters
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      
      if (value !== undefined && value !== null && value !== '') {
        // Handle arrays (e.g., statuses, stationIds)
        if (Array.isArray(value)) {
          value.forEach(item => params.append(`${key}[]`, item));
        } 
        // Handle dates
        else if (value instanceof Date) {
          params.append(key, value.toISOString());
        }
        // Handle objects (stringify if needed)
        else if (typeof value === 'object') {
          params.append(key, JSON.stringify(value));
        }
        // Handle primitives
        else {
          params.append(key, value);
        }
      }
    });
    
    return params.toString();
  }

  #getCached(key) {
    if (!this.config.cacheEnabled) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`Cache hit: ${key}`);
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  #setCached(key, data) {
    if (this.config.cacheEnabled) {
      this.cache.set(key, { data, timestamp: Date.now() });
    }
  }

  async #retryOperation(operation, retries = this.config.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (error.response?.status >= 500 && i < retries - 1) {
          this.logger.warn(`Retrying operation (${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (i + 1)));
          continue;
        }
        throw error;
      }
    }
  }

  // ==================== COMPREHENSIVE SHIFT DATA FETCHING ====================

  /**
   * GET ALL SHIFTS WITH COMPLETE RELATIONSHIPS
   * Enhanced version that properly handles the nested API response structure
   */
  async getAllShifts(filters = {}, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `all-shifts-${JSON.stringify(filters)}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info('Fetching comprehensive shift list with filters:', filters);
      
      const queryParams = this.#buildQueryParams(filters);
      const url = `${this.basePath}/list/all${queryParams ? `?${queryParams}` : ''}`;
      
      this.logger.debug(`API URL: ${url}`);
      
      const response = await apiService.get(url);
      const data = this.#handleResponse(response, 'Comprehensive shifts fetch');
      
      // Cache the complete response including success, message, data, pagination, summary
      this.#setCached(cacheKey, data);
      
      this.logger.info(`Retrieved ${data.data?.shifts?.length || 0} shifts with complete relationships`);
      return data; // Return the full API response structure
    }).catch(error => {
      throw this.#handleError(error, 'Comprehensive shifts fetch', 'Failed to fetch comprehensive shift list');
    });
  }

  /**
   * GET SHIFTS WITH PAGINATION AND FILTERS
   * For list views where you need pagination
   */
  async getShifts(filters = {}, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `shifts-${JSON.stringify(filters)}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info('Fetching shifts with filters:', filters);
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(`${this.basePath}?${queryParams}`);
      
      const data = this.#handleResponse(response, 'Shifts fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shifts fetch', 'Failed to fetch shifts');
    });
  }

  /**
   * GET SHIFT BY ID WITH ALL RELATIONSHIPS
   * Enhanced to handle the complete nested data structure
   */
  async getShiftById(shiftId, options = {}, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const { includeRelations = true } = options;
      const cacheKey = `shift-${shiftId}-${includeRelations}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching shift ${shiftId} with relations: ${includeRelations}`);
      
      const queryParams = includeRelations ? '?includeRelations=true' : '';
      const response = await apiService.get(`${this.basePath}/${shiftId}${queryParams}`);
      
      const data = this.#handleResponse(response, 'Shift fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift fetch', 'Failed to fetch shift');
    });
  }

  // ==================== ENHANCED FILTER BUILDERS ====================

  /**
   * BUILD COMPREHENSIVE SHIFT FILTERS
   * Enhanced for the list/all endpoint requirements
   */
  buildShiftFilters(options = {}) {
    const {
      // Basic filters
      stationId,
      supervisorId,
      status,
      startDate,
      endDate,
      shiftNumber,
      
      // Date range options
      dateRange,
      
      // Pagination
      page = 1,
      limit = 50,
      
      // Sorting
      sortBy = 'startTime',
      sortOrder = 'desc',
      
      // Include options
      includeDetails = true,
      includeRelations = true,
      
      // Advanced filters
      statuses, // Array of statuses
      stationIds, // Array of station IDs
      shiftNumbers, // Array of shift numbers
      
      // Date presets
      datePreset // 'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'
    } = options;

    const filters = {
      stationId,
      supervisorId,
      status,
      startDate,
      endDate,
      shiftNumber,
      page,
      limit,
      sortBy,
      sortOrder,
      includeDetails,
      includeRelations,
      statuses,
      stationIds,
      shiftNumbers
    };

    // Handle date range presets
    if (datePreset) {
      const dateRange = this.#buildDateRange(datePreset);
      filters.startDate = dateRange.start;
      filters.endDate = dateRange.end;
    }
    
    // Handle explicit date range
    if (dateRange) {
      filters.startDate = dateRange.start;
      filters.endDate = dateRange.end;
    }

    // Clean up undefined values and empty arrays
    return Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => {
        if (value === undefined || value === null || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      })
    );
  }

  #buildDateRange(preset) {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastWeek':
        start.setDate(now.getDate() - now.getDay() - 7);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - now.getDay() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        start.setMonth(now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  // ==================== SPECIALIZED QUERIES ====================

  /**
   * Get shifts by date range with comprehensive data
   */
  async getShiftsByDateRange(startDate, endDate, options = {}) {
    const filters = this.buildShiftFilters({
      startDate,
      endDate,
      ...options
    });
    
    return this.getAllShifts(filters, options.forceRefresh);
  }

  /**
   * Get shifts by status with comprehensive data
   */
  async getShiftsByStatus(status, options = {}) {
    const filters = this.buildShiftFilters({
      status,
      ...options
    });
    
    return this.getAllShifts(filters, options.forceRefresh);
  }

  /**
   * Get shifts by station with comprehensive data
   */
  async getShiftsByStation(stationId, options = {}) {
    const filters = this.buildShiftFilters({
      stationId,
      ...options
    });
    
    return this.getAllShifts(filters, options.forceRefresh);
  }

  /**
   * Get shifts with financial summaries
   */
  async getShiftsWithFinancials(options = {}) {
    const filters = this.buildShiftFilters({
      includeDetails: true,
      includeRelations: true,
      ...options
    });
    
    return this.getAllShifts(filters, options.forceRefresh);
  }

  // ==================== DATA TRANSFORMERS ====================

  /**
   * Transform shift data for frontend consumption
   */
  transformShiftData(apiResponse) {
    if (!apiResponse) return null;

    // Handle the nested data structure
    const responseData = apiResponse.data || apiResponse;
    
    if (!responseData.shifts) return apiResponse;

    const transformedShifts = responseData.shifts.map(shift => ({
      // Basic shift info
      ...shift,
      
      // Flatten frequently accessed relationships
      stationName: shift.station?.name,
      supervisorName: shift.supervisor ? `${shift.supervisor.firstName} ${shift.supervisor.lastName}` : null,
      companyName: shift.station?.company?.name,
      
      // Financial summary
      totalRevenue: shift.sales?.[0]?.totalRevenue || 0,
      totalCollections: shift.shiftCollection?.totalCollected || 0,
      
      // Status indicators
      hasDiscrepancies: shift.reconciliation?.status === 'DISCREPANCY',
      isFullyReconciled: shift.reconciliation?.status === 'RECONCILED',
      
      // Quick access to key metrics
      metrics: {
        fuelSales: shift.sales?.[0]?.totalFuelRevenue || 0,
        nonFuelSales: shift.sales?.[0]?.totalNonFuelRevenue || 0,
        cashCollected: shift.shiftCollection?.cashAmount || 0,
        mobileMoneyCollected: shift.shiftCollection?.mobileMoneyAmount || 0,
        totalAttendants: shift.shiftIslandAttedant?.length || 0,
        totalPumps: this.#getUniquePumpsCount(shift.meterReadings || [])
      },
      
      // Opening check status
      openingStatus: shift.shiftOpeningCheck?.[0] || null,
      
      // Reconciliation status
      reconciliationStatus: shift.reconciliation?.status || 'PENDING'
    }));

    return {
      ...apiResponse,
      data: {
        ...responseData,
        shifts: transformedShifts
      }
    };
  }

  #getUniquePumpsCount(meterReadings) {
    const pumpIds = new Set();
    meterReadings.forEach(reading => {
      if (reading.pumpId) pumpIds.add(reading.pumpId);
    });
    return pumpIds.size;
  }

  /**
   * Extract summary data for dashboards
   */
  extractShiftSummary(apiResponse) {
    if (!apiResponse?.data) return null;

    const { shifts, pagination, summary } = apiResponse.data;
    
    return {
      totalShifts: pagination?.totalCount || shifts?.length || 0,
      financialSummary: summary?.financials || {
        totalRevenue: shifts.reduce((sum, shift) => sum + (shift.sales?.[0]?.totalRevenue || 0), 0),
        totalCollections: shifts.reduce((sum, shift) => sum + (shift.shiftCollection?.totalCollected || 0), 0)
      },
      statusBreakdown: summary?.byStatus || this.#calculateStatusBreakdown(shifts),
      qualityMetrics: summary?.quality || {
        shiftsWithVariances: shifts.filter(shift => shift.reconciliation?.status === 'DISCREPANCY').length,
        variancePercentage: 0
      }
    };
  }

  #calculateStatusBreakdown(shifts) {
    const breakdown = {
      OPEN: 0,
      CLOSED: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0
    };
    
    shifts.forEach(shift => {
      if (breakdown.hasOwnProperty(shift.status)) {
        breakdown[shift.status]++;
      }
    });
    
    return breakdown;
  }

  // ==================== CACHE MANAGEMENT ====================

  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
      this.logger.info(`Cache cleared for pattern: ${pattern}`);
    } else {
      this.cache.clear();
      this.logger.info('All cache cleared');
    }
  }

  // Clear specific cache types
  clearShiftsCache() {
    this.clearCache('shifts');
  }

  clearShiftCache(shiftId) {
    for (const key of this.cache.keys()) {
      if (key.includes(`shift-${shiftId}`)) {
        this.cache.delete(key);
      }
    }
  }

  // ==================== CONFIGURATION ====================

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Configuration updated:', this.config);
  }

  // ==================== VALIDATION HELPERS ====================

  validateShiftCreation(shiftData) {
    const errors = [];
    
    if (!shiftData.stationId) errors.push('Station ID is required');
    if (!shiftData.supervisorId) errors.push('Supervisor ID is required');
    if (!shiftData.shiftNumber || shiftData.shiftNumber <= 0) errors.push('Valid shift number is required');
    if (!shiftData.startTime) errors.push('Start time is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  generateShiftNumber() {
    return Math.floor(1000 + Math.random() * 9000);
  }

  formatShiftStatus(status) {
    const statusMap = {
      'OPEN': { label: 'Open', color: 'success', variant: 'success' },
      'CLOSED': { label: 'Closed', color: 'secondary', variant: 'secondary' },
      'UNDER_REVIEW': { label: 'Under Review', color: 'warning', variant: 'warning' },
      'APPROVED': { label: 'Approved', color: 'info', variant: 'info' }
    };
    
    return statusMap[status] || { label: status, color: 'default', variant: 'default' };
  }
}

// Create singleton instance
export const shiftService = new ShiftService();

// Export constants
export const SHIFT_STATUS = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED'
};

export const SHIFT_TYPES = {
  REGULAR: 'REGULAR',
  OVERTIME: 'OVERTIME',
  HOLIDAY: 'HOLIDAY',
  SPECIAL: 'SPECIAL'
};

export const OPENING_CHECKS = {
  HAS_INITIAL_METER_READINGS: 'hasInitialMeterReadings',
  HAS_INITIAL_DIP_READINGS: 'hasInitialDipReadings',
  HAS_ATTENDANTS_ASSIGNED: 'hasAttendantsAssigned',
  HAS_NO_OPEN_SHIFTS: 'hasNoOpenShifts',
  HAS_VALID_PRICING: 'hasValidPricing',
  HAS_ASSETS_CONNECTED: 'hasAssetsConnected'
};

export const SHIFT_READINESS = {
  READY: 'READY',
  NOT_READY: 'NOT_READY',
  PARTIALLY_READY: 'PARTIALLY_READY',
  UNAVAILABLE: 'UNAVAILABLE'
};

export default shiftService;