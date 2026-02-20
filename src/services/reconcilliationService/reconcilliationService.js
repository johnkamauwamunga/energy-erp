// src/services/reconciliationService.js
import { apiService } from '../apiService';

class ReconciliationService {
  constructor() {
    this.basePath = '/reconcilliations';
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
    this.pendingRequests = new Map(); // For request deduplication
    
    this.logger = {
      debug: (...args) => console.log('🔍 [ReconciliationService]', ...args),
      info: (...args) => console.log('ℹ️ [ReconciliationService]', ...args),
      warn: (...args) => console.warn('⚠️ [ReconciliationService]', ...args),
      error: (...args) => console.error('❌ [ReconciliationService]', ...args)
    };

    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      cacheEnabled: true,
      deduplicateRequests: true
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
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Handle arrays
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, value);
        }
      }
    });
    return params.toString();
  }

  #getCacheKey(endpoint, params = {}) {
    return `${endpoint}-${JSON.stringify(params)}`;
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

  async #deduplicateRequest(key, requestFn) {
    if (!this.config.deduplicateRequests) {
      return requestFn();
    }

    const pending = this.pendingRequests.get(key);
    if (pending) {
      this.logger.debug(`Deduplicating request: ${key}`);
      return pending;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  async #retryOperation(operation, retries = this.config.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        const isServerError = error.response?.status >= 500 || error.code === 'ECONNABORTED';
        
        if (isServerError && i < retries - 1) {
          const delay = this.config.retryDelay * Math.pow(2, i); // Exponential backoff
          this.logger.warn(`Retrying operation (${i + 1}/${retries}) after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }

  // ==================== SHIFT RECONCILIATION ====================

  /**
   * Get complete shift reconciliation data
   * GET /reconciliation/shifts/:shiftId
   */
  async getShiftReconciliation(shiftId, options = {}, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = this.#getCacheKey(`shift-${shiftId}`, options);
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching shift reconciliation: ${shiftId}`, options);
      
      const queryParams = this.#buildQueryParams({
        includeOffloads: options.includeOffloads,
        includePumpDetails: options.includePumpDetails,
        calculateVariances: options.calculateVariances
      });

      const response = await apiService.get(
        `${this.basePath}/shifts/${shiftId}${queryParams ? `?${queryParams}` : ''}`
      );
      
      const data = this.#handleResponse(response, 'Shift reconciliation fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift reconciliation fetch', 'Failed to fetch shift reconciliation');
    });
  }

  /**
   * Get shifts by date range with reconciliation data
   * GET /reconciliation/shifts
   */
  async getShiftsByDateRange(filters = {}, forceRefresh = false) {
    const requestKey = this.#getCacheKey('shifts-range', filters);
    
    return this.#deduplicateRequest(requestKey, async () => {
      return this.#retryOperation(async () => {
        const cacheKey = this.#getCacheKey('shifts-range', filters);
        
        if (!forceRefresh) {
          const cached = this.#getCached(cacheKey);
          if (cached) return cached;
        }

        this.logger.info('Fetching shifts by date range:', filters);
        
        const queryParams = this.#buildQueryParams({
          stationId: filters.stationId,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          period: filters.period,
          status: filters.status,
          limit: filters.limit,
          offset: filters.offset,
          includeDetails: filters.includeDetails
        });

        const response = await apiService.get(`${this.basePath}/shifts?${queryParams}`);
        
        const data = this.#handleResponse(response, 'Shifts fetch');
        this.#setCached(cacheKey, data);
        return data;
      }).catch(error => {
        throw this.#handleError(error, 'Shifts fetch', 'Failed to fetch shifts');
      });
    });
  }

  /**
   * Get reconciliation summary for dashboard
   * GET /reconciliation/summary
   */
  async getReconciliationSummary(filters = {}, forceRefresh = false) {
    const requestKey = this.#getCacheKey('summary', filters);
    
    return this.#deduplicateRequest(requestKey, async () => {
      return this.#retryOperation(async () => {
        const cacheKey = this.#getCacheKey('summary', filters);
        
        if (!forceRefresh) {
          const cached = this.#getCached(cacheKey);
          if (cached) return cached;
        }

        this.logger.info('Fetching reconciliation summary:', filters);
        
        const queryParams = this.#buildQueryParams({
          stationId: filters.stationId,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          period: filters.period,
          groupBy: filters.groupBy
        });

        const response = await apiService.get(`${this.basePath}/summary?${queryParams}`);
        
        const data = this.#handleResponse(response, 'Summary fetch');
        this.#setCached(cacheKey, data);
        return data;
      }).catch(error => {
        throw this.#handleError(error, 'Summary fetch', 'Failed to fetch reconciliation summary');
      });
    });
  }

  /**
   * Get tank reconciliation history
   * GET /reconciliation/tanks/:tankId
   */
  async getTankReconciliationHistory(tankId, filters = {}, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = this.#getCacheKey(`tank-${tankId}`, filters);
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching tank reconciliation history: ${tankId}`, filters);
      
      const queryParams = this.#buildQueryParams({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        period: filters.period
      });

      const response = await apiService.get(
        `${this.basePath}/tanks/${tankId}${queryParams ? `?${queryParams}` : ''}`
      );
      
      const data = this.#handleResponse(response, 'Tank history fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Tank history fetch', 'Failed to fetch tank reconciliation history');
    });
  }

  // ==================== EXPORT FUNCTIONS ====================

  /**
   * Export shift reconciliation data
   * GET /reconciliation/export/:shiftId
   */
  async exportShiftReconciliation(shiftId, format = 'csv') {
    return this.#retryOperation(async () => {
      this.logger.info(`Exporting shift reconciliation: ${shiftId} as ${format}`);
      
      if (format === 'csv') {
        const response = await apiService.get(
          `${this.basePath}/export/${shiftId}?format=csv`,
          { responseType: 'blob' }
        );
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `reconciliation_shift_${shiftId}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        return { success: true, message: 'Export completed successfully' };
      }
      
      if (format === 'json') {
        const response = await apiService.get(`${this.basePath}/export/${shiftId}?format=json`);
        return this.#handleResponse(response, 'Export fetch');
      }

      throw new Error(`Unsupported export format: ${format}`);
    }).catch(error => {
      throw this.#handleError(error, 'Export', 'Failed to export reconciliation data');
    });
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Health check endpoint
   * GET /reconciliation/health
   */
  async checkHealth() {
    return this.#retryOperation(async () => {
      this.logger.debug('Checking reconciliation service health');
      
      const response = await apiService.get(`${this.basePath}/health`);
      return this.#handleResponse(response, 'Health check');
    }).catch(error => {
      this.logger.error('Health check failed:', error);
      return {
        success: false,
        message: 'Reconciliation service is unavailable',
        timestamp: new Date().toISOString()
      };
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
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
    this.logger.info('Cache cleared' + (pattern ? ` for pattern: ${pattern}` : ''));
  }

  cancelPendingRequests(pattern = null) {
    if (pattern) {
      for (const [key, promise] of this.pendingRequests.entries()) {
        if (key.includes(pattern)) {
          // Note: This doesn't actually cancel the request, just removes from tracking
          this.pendingRequests.delete(key);
        }
      }
    } else {
      this.pendingRequests.clear();
    }
    this.logger.info('Pending requests cleared');
  }

  // ==================== DATA TRANSFORMERS ====================

  /**
   * Transform raw shift data for UI consumption
   */
  transformShiftData(shiftData) {
    if (!shiftData) return null;

    return {
      ...shiftData,
      reconciliation: {
        ...shiftData.reconciliation,
        summary: {
          ...shiftData.reconciliation?.summary,
          // Add computed fields
          reconciliationRate: this.calculateReconciliationRate(shiftData),
          hasIssues: this.checkForIssues(shiftData),
          issues: this.getIssues(shiftData)
        }
      },
      display: {
        formattedDuration: this.formatDuration(shiftData.shift?.duration),
        formattedDateRange: this.formatDateRange(
          shiftData.shift?.startTime,
          shiftData.shift?.endTime
        ),
        statusBadge: this.getStatusBadge(shiftData.shift?.status)
      }
    };
  }

  /**
   * Calculate reconciliation rate for a shift
   */
  calculateReconciliationRate(shiftData) {
    if (!shiftData?.reconciliation?.tanks) return 0;
    
    const tanks = shiftData.reconciliation.tanks;
    const reconciledTanks = tanks.filter(t => {
      const status = t.variances?.reconciliationStatus;
      return status === 'EXCELLENT' || status === 'GOOD';
    }).length;
    
    return tanks.length ? (reconciledTanks / tanks.length * 100).toFixed(1) : 0;
  }

  /**
   * Check if shift has issues
   */
  checkForIssues(shiftData) {
    return shiftData?.verification?.alerts?.length > 0 || 
           shiftData?.verification?.missingReadings?.length > 0;
  }

  /**
   * Get issues summary
   */
  getIssues(shiftData) {
    const issues = [];
    
    if (shiftData?.verification?.alerts?.length) {
      issues.push(...shiftData.verification.alerts);
    }
    
    if (shiftData?.verification?.missingReadings?.length) {
      issues.push({
        type: 'MISSING_READINGS',
        severity: 'HIGH',
        message: `${shiftData.verification.missingReadings.length} missing readings`
      });
    }
    
    return issues;
  }

  /**
   * Format duration
   */
  formatDuration(hours) {
    if (!hours) return 'N/A';
    
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    
    return `${h}h ${m}m`;
  }

  /**
   * Format date range
   */
  formatDateRange(start, end) {
    if (!start) return 'N/A';
    
    const startDate = new Date(start);
    const formattedStart = startDate.toLocaleString();
    
    if (!end) return `${formattedStart} - Ongoing`;
    
    const endDate = new Date(end);
    const formattedEnd = endDate.toLocaleString();
    
    return `${formattedStart} - ${formattedEnd}`;
  }

  /**
   * Get status badge configuration
   */
  getStatusBadge(status) {
    const badges = {
      OPEN: { label: 'Open', color: 'blue', variant: 'outline' },
      CLOSED: { label: 'Closed', color: 'green', variant: 'solid' },
      VERIFIED: { label: 'Verified', color: 'purple', variant: 'solid' },
      RECONCILED: { label: 'Reconciled', color: 'emerald', variant: 'solid' },
      DISCREPANCY: { label: 'Has Discrepancy', color: 'red', variant: 'solid' }
    };
    
    return badges[status] || { label: status, color: 'gray', variant: 'outline' };
  }

  /**
   * Format variance with color indication
   */
  formatVariance(variance) {
    if (variance === null || variance === undefined) {
      return { value: 'N/A', color: 'gray' };
    }
    
    const absVariance = Math.abs(variance);
    const value = variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2);
    
    let color = 'green';
    if (absVariance > 100) color = 'red';
    else if (absVariance > 30) color = 'yellow';
    else if (absVariance > 10) color = 'blue';
    
    return { value, color };
  }

  /**
   * Group shifts by date
   */
  groupShiftsByDate(shifts) {
    if (!shifts?.length) return {};
    
    return shifts.reduce((groups, shift) => {
      const date = new Date(shift.shift?.startTime || shift.startTime).toLocaleDateString();
      
      if (!groups[date]) {
        groups[date] = [];
      }
      
      groups[date].push(shift);
      return groups;
    }, {});
  }

  /**
   * Calculate trends over time
   */
  calculateTrends(history) {
    if (!history?.length) return null;
    
    const values = history.map(h => h.variance || 0);
    
    // Calculate moving average
    const movingAverage = values.map((_, i, arr) => {
      const start = Math.max(0, i - 2);
      const end = i + 1;
      const slice = arr.slice(start, end);
      return slice.reduce((sum, v) => sum + v, 0) / slice.length;
    });
    
    // Determine trend direction
    const recentAvg = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const previousAvg = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
    
    const direction = Math.abs(recentAvg) < Math.abs(previousAvg) ? 'improving' : 'worsening';
    
    return {
      movingAverage,
      direction,
      stability: this.calculateStability(values),
      outliers: this.findOutliers(values)
    };
  }

  /**
   * Calculate stability of values
   */
  calculateStability(values) {
    if (values.length < 2) return 'unknown';
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const cv = (stdDev / Math.abs(mean)) * 100; // Coefficient of variation
    
    if (cv < 10) return 'very stable';
    if (cv < 20) return 'stable';
    if (cv < 30) return 'moderately stable';
    return 'unstable';
  }

  /**
   * Find outliers in values
   */
  findOutliers(values) {
    if (values.length < 4) return [];
    
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values
      .map((v, i) => ({ value: v, index: i }))
      .filter(item => item.value < lowerBound || item.value > upperBound);
  }
}

// Create singleton instance
export const reconciliationService = new ReconciliationService();

// ==================== CONSTANTS ====================

export const RECONCILIATION_STATUS = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  ACCEPTABLE: 'ACCEPTABLE',
  INVESTIGATE: 'INVESTIGATE',
  NO_DATA: 'NO_DATA'
};

export const SHIFT_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  VERIFIED: 'VERIFIED',
  RECONCILED: 'RECONCILED',
  DISCREPANCY: 'DISCREPANCY'
};

export const READING_TYPE = {
  START: 'START',
  END: 'END',
  OFFLOAD_BEFORE: 'OFFLOAD_BEFORE',
  OFFLOAD_AFTER: 'OFFLOAD_AFTER',
  MANUAL: 'MANUAL',
  VERIFICATION: 'VERIFICATION'
};

export const TANK_OFFLOAD_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  VERIFIED: 'VERIFIED',
  DISCREPANCY: 'DISCREPANCY',
  CANCELLED: 'CANCELLED'
};

export const PERIOD_OPTIONS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year',
  CUSTOM: 'custom'
};

export const GROUP_BY_OPTIONS = {
  SHIFT: 'shift',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month'
};

export const ALERT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export const ALERT_TYPES = {
  HIGH_VARIANCE: 'HIGH_VARIANCE',
  VOLUME_INCREASE: 'VOLUME_INCREASE',
  MISSING_READINGS: 'MISSING_READINGS',
  OFFLOAD_DISCREPANCY: 'OFFLOAD_DISCREPANCY',
  LONG_SHIFT: 'LONG_SHIFT',
  INCOMPLETE_RECONCILIATION: 'INCOMPLETE_RECONCILIATION'
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Create a reconciliation report
 */
export const createReconciliationReport = (shiftData) => {
  if (!shiftData) return null;
  
  return {
    shiftNumber: shiftData.shift?.shiftNumber,
    date: new Date(shiftData.shift?.startTime).toLocaleDateString(),
    stationName: shiftData.shift?.station?.name,
    supervisor: shiftData.shift?.supervisor?.name,
    
    summary: {
      totalTanks: shiftData.reconciliation?.summary?.totalTanks,
      reconciledTanks: shiftData.reconciliation?.summary?.tanksWithCompleteData,
      reconciliationRate: shiftData.reconciliation?.summary?.reconciliationRate,
      totalVariance: shiftData.reconciliation?.summary?.totals?.variance,
      totalDispensed: shiftData.reconciliation?.summary?.totals?.dispensed,
      totalOffloads: shiftData.reconciliation?.summary?.offloadSummary?.totalOffloads
    },
    
    issues: shiftData.verification?.alerts || [],
    
    missingReadings: shiftData.verification?.missingReadings || [],
    
    tankDetails: shiftData.reconciliation?.tanks?.map(tank => ({
      name: tank.tank?.name,
      product: tank.tank?.product?.name,
      startVolume: tank.readings?.start?.volume,
      endVolume: tank.readings?.end?.volume,
      dispensed: tank.variances?.totalDispensed,
      offloadVolume: tank.variances?.offloadVolume,
      variance: tank.variances?.variance,
      variancePercentage: tank.variances?.variancePercentage,
      status: tank.variances?.reconciliationStatus
    })),
    
    generatedAt: new Date().toISOString(),
    generatedBy: 'system'
  };
};

/**
 * Validate reconciliation filters
 */
export const validateReconciliationFilters = (filters) => {
  const errors = [];
  
  if (filters.fromDate && filters.toDate) {
    const from = new Date(filters.fromDate);
    const to = new Date(filters.toDate);
    
    if (from > to) {
      errors.push('From date cannot be after to date');
    }
    
    const diffDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      errors.push('Date range cannot exceed 90 days');
    }
  }
  
  if (filters.limit && (filters.limit < 1 || filters.limit > 100)) {
    errors.push('Limit must be between 1 and 100');
  }
  
  if (filters.offset && filters.offset < 0) {
    errors.push('Offset must be a positive number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default reconciliationService;