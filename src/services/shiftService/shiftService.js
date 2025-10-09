// services/shiftService.js
import { apiService } from '../apiService';

class ShiftService {
  constructor() {
    this.basePath = '/shift';
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
    
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
    if (response.data?.success) {
      this.logger.debug(`${operation} successful`);
      return response.data.data || response.data;
    }
    
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
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
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

  // ==================== SHIFT CREATION ====================

  async createShift(shiftData) {
    return this.#retryOperation(async () => {
      // Create a clean, serializable payload to avoid circular references
      const cleanShiftData = {
        stationId: shiftData.stationId,
        supervisorId: shiftData.supervisorId,
        shiftNumber: shiftData.shiftNumber,
        startTime: shiftData.startTime,
        priceListId: shiftData.priceListId
      };

      this.logger.info('Creating shift:', cleanShiftData);
      
      const response = await apiService.post(this.basePath, cleanShiftData);
      this.clearCache('shifts');
      return this.#handleResponse(response, 'Shift creation');
    }).catch(error => {
      throw this.#handleError(error, 'Shift creation', 'Failed to create shift');
    });
  }

  async openShift(shiftId, openingData) {
    return this.#retryOperation(async () => {
      this.logger.info(`Opening shift ${shiftId}:`, openingData);
      
      const response = await apiService.post(`${this.basePath}/${shiftId}/open`, openingData);
      return this.#handleResponse(response, 'Shift opening');
    }).catch(error => {
      throw this.#handleError(error, 'Shift opening', 'Failed to open shift');
    });
  }

  // ==================== SHIFT STATUS & DIAGNOSTICS ====================

  /**
   * GET CURRENT OPEN SHIFT FOR STATION
   * Fetches the currently open shift for a given station
   */
  async getCurrentOpenShift(stationId, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `current-open-shift-${stationId}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching current open shift for station: ${stationId}`);
      const response = await apiService.get(`${this.basePath}/station/${stationId}/current`);
      
      const data = this.#handleResponse(response, 'Current open shift fetch');
      
      // Only cache if we actually found an open shift
      if (data) {
        this.#setCached(cacheKey, data);
      }
      
      return data;
    }).catch(error => {
      // Don't throw error for 404 - just return null
      if (error.message.includes('No open shift found') || error.response?.status === 404) {
        this.logger.info(`No open shift found for station ${stationId}`);
        return null;
      }
      throw this.#handleError(error, 'Current open shift fetch', 'Failed to fetch current open shift');
    });
  }

  /**
   * CHECK SHIFT OPENING STATUS
   * Verifies if all opening checks are completed for a shift
   */
  async checkShiftOpeningStatus(shiftId, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `opening-status-${shiftId}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Checking opening status for shift: ${shiftId}`);
      const response = await apiService.get(`${this.basePath}/${shiftId}/opening-status`);
      
      const data = this.#handleResponse(response, 'Shift opening status check');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift opening status check', 'Failed to check shift opening status');
    });
  }

  async closeShift(shiftId, closingData) {
    return this.#retryOperation(async () => {
      this.logger.info(`Closing shift ${shiftId}:`, closingData);
      
      const response = await apiService.post(`${this.basePath}/${shiftId}/close`, closingData);
      return this.#handleResponse(response, 'Shift closing');
    }).catch(error => {
      throw this.#handleError(error, 'Shift closing', 'Failed to close shift');
    });
  }

  // ==================== SHIFT QUERIES ====================

  async getShiftById(shiftId, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `shift-${shiftId}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching shift: ${shiftId}`);
      const response = await apiService.get(`${this.basePath}/${shiftId}`);
      
      const data = this.#handleResponse(response, 'Shift fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift fetch', 'Failed to fetch shift');
    });
  }

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
   * GET ALL SHIFTS (COMPREHENSIVE LIST)
   * Fetches all shifts with detailed information for reporting/analytics
   * Uses the /list/all endpoint for comprehensive shift data
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
      const response = await apiService.get(`${this.basePath}/list/all?${queryParams}`);
      
      const data = this.#handleResponse(response, 'Comprehensive shifts fetch');
      this.#setCached(cacheKey, data);
      
      this.logger.info(`Retrieved ${data.shifts?.length || 0} shifts from comprehensive list`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Comprehensive shifts fetch', 'Failed to fetch comprehensive shift list');
    });
  }

  async getOpenShifts(stationId, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `open-shifts-${stationId}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching open shifts for station: ${stationId}`);
      const response = await apiService.get(`${this.basePath}/open/${stationId}`);
      
      const data = this.#handleResponse(response, 'Open shifts fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Open shifts fetch', 'Failed to fetch open shifts');
    });
  }

  // ==================== ASSET METHODS ====================

  async getStationAssets(stationId, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `station-assets-${stationId}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching station assets: ${stationId}`);
      const response = await apiService.get(`/assets/station/${stationId}`);
      
      const data = this.#handleResponse(response, 'Station assets fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Station assets fetch', 'Failed to fetch station assets');
    });
  }

  async getIslandPumps(islandIds) {
    return this.#retryOperation(async () => {
      this.logger.info(`Fetching pumps for ${islandIds.length} islands`);
      
      const results = await Promise.all(
        islandIds.map(async (islandId) => {
          const response = await apiService.get(`/assets/island/${islandId}/pumps`);
          return this.#handleResponse(response, `Pumps for island ${islandId} fetch`);
        })
      );
      
      // Combine and deduplicate pumps
      const pumpMap = new Map();
      results.forEach(result => {
        result.pumps.forEach(pump => {
          if (!pumpMap.has(pump.id)) {
            pumpMap.set(pump.id, {
              ...pump,
              sourceIslands: [result.island.id]
            });
          } else {
            const existingPump = pumpMap.get(pump.id);
            existingPump.sourceIslands.push(result.island.id);
          }
        });
      });
      
      return {
        pumps: Array.from(pumpMap.values()),
        islands: results.map(r => r.island),
        summary: {
          totalPumps: pumpMap.size,
          totalIslands: islandIds.length
        }
      };
    }).catch(error => {
      throw this.#handleError(error, 'Island pumps fetch', 'Failed to fetch island pumps');
    });
  }

  async getPumpTanks(pumpIds) {
    return this.#retryOperation(async () => {
      this.logger.info(`Fetching tanks for ${pumpIds.length} pumps`);
      
      const response = await apiService.post('/assets/pumps/tanks', { pumpIds });
      return this.#handleResponse(response, 'Pump tanks fetch');
    }).catch(error => {
      throw this.#handleError(error, 'Pump tanks fetch', 'Failed to fetch pump tanks');
    });
  }

  // ==================== UTILITY METHODS ====================

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Configuration updated:', this.config);
  }

  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
    this.logger.info('Cache cleared' + (pattern ? ` for pattern: ${pattern}` : ''));
  }

  /**
   * BUILD SHIFT FILTERS
   * Enhanced filter builder for comprehensive shift queries
   * Provides a clean, consistent way to build filter objects
   */
  buildShiftFilters(options = {}) {
    const {
      stationId,
      supervisorId,
      status,
      startDate,
      endDate,
      shiftType,
      dateRange,
      includeDetails = true,
      pagination = { page: 1, limit: 50 },
      sorting = { sortBy: 'startTime', sortOrder: 'desc' }
    } = options;

    const filters = {
      stationId,
      supervisorId,
      status,
      startDate,
      endDate,
      shiftType,
      includeDetails,
      ...pagination,
      ...sorting
    };

    // Handle date range if provided
    if (dateRange) {
      filters.startDate = dateRange.start;
      filters.endDate = dateRange.end;
    }

    // Clean up undefined values
    return Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined && value !== null && value !== '')
    );
  }

  /**
   * Get shifts by date range with pagination
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
   * Get shifts by status with comprehensive details
   */
  async getShiftsByStatus(status, options = {}) {
    const filters = this.buildShiftFilters({
      status,
      ...options
    });
    
    return this.getAllShifts(filters, options.forceRefresh);
  }

  /**
   * Get shifts by station with comprehensive details
   */
  async getShiftsByStation(stationId, options = {}) {
    const filters = this.buildShiftFilters({
      stationId,
      ...options
    });
    
    return this.getAllShifts(filters, options.forceRefresh);
  }

  // Validation helpers
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

// Add new constants for opening checks
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