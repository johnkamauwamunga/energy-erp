// src/services/cumulativeReadingsService.js
import { apiService } from '../apiService';

class CumulativeReadingsService {
  constructor() {
    this.basePath = '/cumulative-readings';
    this.cache = new Map();
    this.CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache
    
    this.logger = {
      debug: (...args) => console.log('🔍 [CumulativeReadings]', ...args),
      info: (...args) => console.log('ℹ️ [CumulativeReadings]', ...args),
      warn: (...args) => console.warn('⚠️ [CumulativeReadings]', ...args),
      error: (...args) => console.error('❌ [CumulativeReadings]', ...args)
    };

    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 45000,
      cacheEnabled: true
    };

    this.pendingRequests = new Map();
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
    
    throw new Error('Invalid response format from server');
  }

  #handleError(error, operation, defaultMessage) {
    this.logger.error(`${operation} failed:`, error);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Try narrowing your date range.');
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
          throw new Error('You do not have permission to view these readings.');
        
        case 404:
          throw new Error('Tank or readings not found.');
        
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
        if (typeof value === 'boolean') {
          params.append(key, value.toString());
        } else {
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

  async #deduplicateRequest(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      this.logger.debug(`Deduplicating request: ${key}`);
      return this.pendingRequests.get(key);
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
        const isServerError = error.response?.status >= 500;
        const isNetworkError = !error.response;
        
        if ((isServerError || isNetworkError) && i < retries - 1) {
          const delay = this.config.retryDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }

  // ==================== MAIN API METHODS ====================

  /**
   * Get tank with its connected pumps, offloads, and ALL shift readings
   * Returns data structured exactly as: TANK -> PRODUCT, PUMPS, SHIFTS
   * @param {string} tankId - Tank UUID
   * @param {Object} options - Query options
   */
  async getTankWithAllReadings(tankId, options = {}, forceRefresh = false) {
    const requestKey = `tank-readings-${tankId}-${JSON.stringify(options)}`;
    
    return this.#deduplicateRequest(requestKey, async () => {
      return this.#retryOperation(async () => {
        const cacheKey = `${requestKey}`;
        
        if (!forceRefresh) {
          const cached = this.#getCached(cacheKey);
          if (cached) return cached;
        }

        this.logger.info(`Fetching cumulative readings for tank: ${tankId}`, options);

        const queryParams = this.#buildQueryParams({
          fromDate: options.fromDate,
          toDate: options.toDate,
          limit: options.limit || 30,
          offset: options.offset || 0,
          includeVerifiedOnly: options.includeVerifiedOnly || false,
          includeOffloads: options.includeOffloads !== false
        });

        const response = await apiService.get(
          `${this.basePath}/tanks/${tankId}/readings?${queryParams}`,
          { timeout: this.config.timeout }
        );
        
        const rawData = this.#handleResponse(response, 'Cumulative readings fetch');
        
        // Transform to our desired hierarchical structure
        const transformedData = this.#transformToHierarchy(rawData);
        
        this.#setCached(cacheKey, transformedData);
        return transformedData;
      });
    }).catch(error => {
      throw this.#handleError(error, 'Cumulative readings fetch', 'Failed to fetch tank readings');
    });
  }

  /**
   * Get tank readings for a specific shift
   */
  async getTankReadingsByShift(tankId, shiftId, forceRefresh = false) {
    const requestKey = `shift-readings-${tankId}-${shiftId}`;
    
    return this.#deduplicateRequest(requestKey, async () => {
      return this.#retryOperation(async () => {
        const cacheKey = `${requestKey}`;
        
        if (!forceRefresh) {
          const cached = this.#getCached(cacheKey);
          if (cached) return cached;
        }

        this.logger.info(`Fetching readings for tank ${tankId}, shift ${shiftId}`);

        const response = await apiService.get(
          `${this.basePath}/tanks/${tankId}/readings/shifts/${shiftId}`
        );
        
        const rawData = this.#handleResponse(response, 'Shift readings fetch');
        
        // For single shift, wrap in the same hierarchy structure
        const transformedData = this.#transformSingleShift(rawData);
        
        this.#setCached(cacheKey, transformedData);
        return transformedData;
      });
    }).catch(error => {
      throw this.#handleError(error, 'Shift readings fetch', 'Failed to fetch shift readings');
    });
  }

  /**
   * Get summary statistics
   */
  async getTankReadingsSummary(tankId, dateRange = {}, forceRefresh = false) {
    const requestKey = `tank-summary-${tankId}-${JSON.stringify(dateRange)}`;
    
    return this.#deduplicateRequest(requestKey, async () => {
      return this.#retryOperation(async () => {
        const cacheKey = `${requestKey}`;
        
        if (!forceRefresh) {
          const cached = this.#getCached(cacheKey);
          if (cached) return cached;
        }

        const queryParams = this.#buildQueryParams(dateRange);
        const response = await apiService.get(
          `${this.basePath}/tanks/${tankId}/readings/summary?${queryParams}`
        );
        
        const data = this.#handleResponse(response, 'Summary fetch');
        
        this.#setCached(cacheKey, data);
        return data;
      });
    }).catch(error => {
      throw this.#handleError(error, 'Summary fetch', 'Failed to fetch tank summary');
    });
  }

  /**
   * Get all offloads for a specific tank
   */
  async getTankOffloads(tankId, options = {}, forceRefresh = false) {
    const requestKey = `tank-offloads-${tankId}-${JSON.stringify(options)}`;
    
    return this.#deduplicateRequest(requestKey, async () => {
      return this.#retryOperation(async () => {
        const cacheKey = `${requestKey}`;
        
        if (!forceRefresh) {
          const cached = this.#getCached(cacheKey);
          if (cached) return cached;
        }

        const queryParams = this.#buildQueryParams({
          fromDate: options.fromDate,
          toDate: options.toDate,
          limit: options.limit || 20,
          offset: options.offset || 0
        });

        const response = await apiService.get(
          `${this.basePath}/tanks/${tankId}/offloads?${queryParams}`
        );
        
        const rawData = this.#handleResponse(response, 'Offloads fetch');
        const transformedData = this.#transformOffloadDates(rawData);
        
        this.#setCached(cacheKey, transformedData);
        return transformedData;
      });
    }).catch(error => {
      throw this.#handleError(error, 'Offloads fetch', 'Failed to fetch offloads');
    });
  }

  // ==================== DATA TRANSFORMATION ====================

  /**
   * Transform backend response to match the desired hierarchy:
   * TANK -> PRODUCT, PUMPS, SHIFTS
   */
  #transformToHierarchy(data) {
    if (!data) return null;

    // Create pump lookup map for quick access
    const pumpMap = new Map();
    data.connectedPumps?.forEach(pumpConnection => {
      pumpMap.set(pumpConnection.pump.id, {
        ...pumpConnection.pump,
        connectionId: pumpConnection.connectionId,
        connectedAt: pumpConnection.connectedAt ? new Date(pumpConnection.connectedAt) : null
      });
    });

    // Transform each shift to have proper pump readings grouped
    const transformedShifts = data.shifts?.map(shift => this.#transformShift(shift, pumpMap)) || [];

    // Calculate shift-based statistics
    const shiftStats = this.#calculateShiftStatistics(transformedShifts);

    return {
      // TANK (one)
      tank: {
        id: data.tank.id,
        assetId: data.tank.assetId,
        name: data.tank.name,
        stationLabel: data.tank.stationLabel,
        stationId: data.tank.stationId,
        capacity: data.tank.capacity,
        maxCapacity: data.tank.maxCapacity,
        currentVolume: data.tank.currentVolume,
        workingCapacity: data.tank.workingCapacity,
        deadStock: data.tank.deadStock,
        status: data.tank.status,
        highLevelAlert: data.tank.highLevelAlert,
        lowLevelAlert: data.tank.lowLevelAlert,
        calibrationTable: data.tank.calibrationTable,
        
        // PRODUCT (one) - nested under tank
        product: data.tank.product ? {
          id: data.tank.product.id,
          name: data.tank.product.name,
          fuelCode: data.tank.product.fuelCode,
          type: data.tank.product.type,
          density: data.tank.product.density
        } : null
      },

      // CONNECTED PUMPS (many) - at tank level
      connectedPumps: Array.from(pumpMap.values()),

      // SHIFTS (many) - each with its own readings
      shifts: transformedShifts,

      // Offloads at tank level (for quick access)
      offloads: data.offloads?.map(offload => this.#transformOffloadDates(offload)) || [],

      // Metadata
      pumpCount: data.pumpCount || transformedShifts[0]?.pumps?.length || 0,
      offloadCount: data.offloadCount || data.offloads?.length || 0,
      
      // Pagination info
      pagination: data.pagination || {
        limit: 30,
        offset: 0,
        totalShifts: transformedShifts.length,
        hasMore: false
      },

      // Summary statistics
      summary: {
        ...data.summary,
        shiftStatistics: shiftStats
      }
    };
  }

  /**
   * Transform a single shift with all its readings
   */
  #transformShift(shift, pumpMap) {
    if (!shift) return null;

    // Group pump readings by pump
    const pumpsWithReadings = (shift.pumps || []).map(pumpData => {
      const pumpInfo = pumpMap.get(pumpData.pumpId) || {
        id: pumpData.pumpId,
        name: pumpData.pumpName,
        stationLabel: pumpData.stationLabel
      };

      // Transform all readings for this pump
      const readings = (pumpData.readings || []).map(reading => ({
        id: reading.id,
        readingType: reading.readingType,
        electricMeter: reading.electricMeter,
        manualMeter: reading.manualMeter,
        cashMeter: reading.cashMeter,
        litersDispensed: reading.litersDispensed,
        salesValue: reading.salesValue,
        unitPrice: reading.unitPrice,
        recordedAt: reading.recordedAt ? new Date(reading.recordedAt) : null,
        recordedBy: reading.recordedBy,
        product: reading.product
      }));

      return {
        pump: pumpInfo,
        readings: {
          // Explicitly separate START and END readings
          start: readings.find(r => r.readingType === 'START') || null,
          end: readings.find(r => r.readingType === 'END') || null,
          all: readings // Keep all readings if needed
        },
        dispensed: pumpData.dispensed || {
          liters: null,
          electricMeter: null,
          manualMeter: null,
          cashMeter: null,
          salesValue: null,
          unitPrice: null
        }
      };
    });

    return {
      shift: {
        id: shift.shift?.id,
        shiftNumber: shift.shift?.shiftNumber,
        startTime: shift.shift?.startTime ? new Date(shift.shift?.startTime) : null,
        endTime: shift.shift?.endTime ? new Date(shift.shift?.endTime) : null,
        status: shift.shift?.status,
        supervisor: shift.shift?.supervisor
      },
      
      // TANK READINGS (2 per shift)
      tankReadings: {
        start: shift.tankReadings?.start ? {
          id: shift.tankReadings.start.id,
          dipValue: shift.tankReadings.start.dipValue,
          volume: shift.tankReadings.start.volume,
          currentVolume: shift.tankReadings.start.currentVolume,
          temperature: shift.tankReadings.start.temperature,
          waterLevel: shift.tankReadings.start.waterLevel,
          density: shift.tankReadings.start.density,
          recordedAt: shift.tankReadings.start.recordedAt ? new Date(shift.tankReadings.start.recordedAt) : null,
          recordedBy: shift.tankReadings.start.recordedBy,
          isVerified: shift.tankReadings.start.isVerified,
          verifiedAt: shift.tankReadings.start.verifiedAt ? new Date(shift.tankReadings.start.verifiedAt) : null,
          notes: shift.tankReadings.start.notes
        } : null,
        
        end: shift.tankReadings?.end ? {
          id: shift.tankReadings.end.id,
          dipValue: shift.tankReadings.end.dipValue,
          volume: shift.tankReadings.end.volume,
          currentVolume: shift.tankReadings.end.currentVolume,
          temperature: shift.tankReadings.end.temperature,
          waterLevel: shift.tankReadings.end.waterLevel,
          density: shift.tankReadings.end.density,
          recordedAt: shift.tankReadings.end.recordedAt ? new Date(shift.tankReadings.end.recordedAt) : null,
          recordedBy: shift.tankReadings.end.recordedBy,
          isVerified: shift.tankReadings.end.isVerified,
          verifiedAt: shift.tankReadings.end.verifiedAt ? new Date(shift.tankReadings.end.verifiedAt) : null,
          notes: shift.tankReadings.end.notes
        } : null,
        
        decrease: shift.tankReadings?.decrease || null
      },

      // PUMP READINGS (2 per pump)
      pumps: pumpsWithReadings,

      // OFFLOADS (0 or many)
      offloads: shift.offloads?.map(offload => this.#transformOffloadDates(offload)) || [],
      
      offloadSummary: shift.offloadSummary || {
        count: 0,
        totalVolume: 0,
        hasOffload: false
      },

      // Shift summary
      summary: shift.summary || {
        tankDecrease: null,
        totalOffloadVolume: 0,
        adjustedDecrease: null,
        totalDispensed: 0,
        variance: null,
        variancePercentage: null,
        reconciliationStatus: 'NO_DATA',
        hasReadings: false
      }
    };
  }

  /**
   * Transform a single shift response to match the hierarchy
   */
  #transformSingleShift(data) {
    if (!data) return null;

    // Create a pump map from the data
    const pumpMap = new Map();
    data.pumps?.forEach(pumpData => {
      pumpMap.set(pumpData.pump.id, pumpData.pump);
    });

    // Create a shift object in the same format as the multi-shift response
    const shiftData = {
      shift: data.shift,
      tankReadings: data.tankReadings,
      pumps: data.pumps?.map(pump => ({
        pumpId: pump.pump.id,
        pumpName: pump.pump.name,
        stationLabel: pump.pump.stationLabel,
        readings: [
          pump.readings?.start,
          pump.readings?.end
        ].filter(Boolean),
        start: pump.readings?.start,
        end: pump.readings?.end,
        dispensed: pump.dispensed
      })),
      offloads: data.offloads,
      offloadSummary: {
        count: data.offloads?.length || 0,
        totalVolume: data.offloads?.reduce((sum, o) => sum + (o.actualVolume || 0), 0) || 0,
        hasOffload: (data.offloads?.length || 0) > 0
      },
      summary: data.summary
    };

    return {
      tank: data.tank,
      connectedPumps: Array.from(pumpMap.values()),
      shifts: [this.#transformShift(shiftData, pumpMap)],
      offloads: data.offloads?.map(o => this.#transformOffloadDates(o)) || [],
      pumpCount: data.pumps?.length || 0,
      offloadCount: data.offloads?.length || 0,
      pagination: {
        limit: 1,
        offset: 0,
        totalShifts: 1,
        hasMore: false
      },
      summary: {
        ...data.summary,
        shiftStatistics: this.#calculateShiftStatistics([shiftData])
      }
    };
  }

  /**
   * Calculate statistics across shifts
   */
  #calculateShiftStatistics(shifts) {
    if (!shifts || shifts.length === 0) {
      return {
        averageVariance: 0,
        bestShift: null,
        worstShift: null,
        shiftsWithOffloads: 0,
        shiftsWithReadings: 0,
        reconciliationBreakdown: {
          EXCELLENT: 0,
          GOOD: 0,
          ACCEPTABLE: 0,
          INVESTIGATE: 0,
          CRITICAL: 0,
          NO_DATA: 0
        }
      };
    }

    let totalVariance = 0;
    let shiftsWithVariance = 0;
    let bestShift = null;
    let worstShift = null;
    let shiftsWithOffloads = 0;
    let shiftsWithReadings = 0;

    const reconciliationBreakdown = {
      EXCELLENT: 0,
      GOOD: 0,
      ACCEPTABLE: 0,
      INVESTIGATE: 0,
      CRITICAL: 0,
      NO_DATA: 0
    };

    shifts.forEach(shift => {
      const summary = shift.summary;
      
      if (summary?.hasReadings) {
        shiftsWithReadings++;
        
        // Track variance
        if (summary.variance !== null && summary.variance !== undefined) {
          const absVariance = Math.abs(summary.variance);
          totalVariance += absVariance;
          shiftsWithVariance++;

          // Track best/worst shifts (by variance percentage)
          const variancePct = Math.abs(parseFloat(summary.variancePercentage) || 0);
          
          if (!bestShift || variancePct < bestShift.variancePct) {
            bestShift = {
              shiftNumber: shift.shift?.shiftNumber,
              variance: summary.variance,
              variancePercentage: summary.variancePercentage,
              shiftId: shift.shift?.id
            };
            bestShift.variancePct = variancePct;
          }
          
          if (!worstShift || variancePct > worstShift.variancePct) {
            worstShift = {
              shiftNumber: shift.shift?.shiftNumber,
              variance: summary.variance,
              variancePercentage: summary.variancePercentage,
              shiftId: shift.shift?.id
            };
            worstShift.variancePct = variancePct;
          }
        }

        // Track reconciliation status
        if (summary.reconciliationStatus) {
          reconciliationBreakdown[summary.reconciliationStatus] = 
            (reconciliationBreakdown[summary.reconciliationStatus] || 0) + 1;
        }
      }

      // Track offloads
      if (shift.offloadSummary?.hasOffload) {
        shiftsWithOffloads++;
      }
    });

    return {
      averageVariance: shiftsWithVariance > 0 ? totalVariance / shiftsWithVariance : 0,
      bestShift: bestShift ? {
        shiftNumber: bestShift.shiftNumber,
        variance: bestShift.variance,
        variancePercentage: bestShift.variancePercentage,
        shiftId: bestShift.shiftId
      } : null,
      worstShift: worstShift ? {
        shiftNumber: worstShift.shiftNumber,
        variance: worstShift.variance,
        variancePercentage: worstShift.variancePercentage,
        shiftId: worstShift.shiftId
      } : null,
      shiftsWithOffloads,
      shiftsWithReadings,
      reconciliationBreakdown
    };
  }

  /**
   * Transform offload dates
   */
  #transformOffloadDates(offload) {
    if (!offload) return offload;

    if (Array.isArray(offload)) {
      return offload.map(o => this.#transformOffloadDates(o));
    }

    return {
      ...offload,
      deliveryTime: offload.deliveryTime ? new Date(offload.deliveryTime) : null,
      createdAt: offload.createdAt ? new Date(offload.createdAt) : null,
      shift: offload.shift ? {
        ...offload.shift,
        startTime: offload.shift.startTime ? new Date(offload.shift.startTime) : null,
        endTime: offload.shift.endTime ? new Date(offload.shift.endTime) : null
      } : null,
      dipReadings: offload.dipReadings?.map(d => ({
        ...d,
        recordedAt: d.recordedAt ? new Date(d.recordedAt) : null
      }))
    };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get reconciliation status color class
   */
  getReconciliationStatusColor(status) {
    const colors = {
      EXCELLENT: 'text-green-600 bg-green-100',
      GOOD: 'text-blue-600 bg-blue-100',
      ACCEPTABLE: 'text-yellow-600 bg-yellow-100',
      INVESTIGATE: 'text-orange-600 bg-orange-100',
      CRITICAL: 'text-red-600 bg-red-100',
      NO_DATA: 'text-gray-600 bg-gray-100'
    };
    return colors[status] || colors.NO_DATA;
  }

  /**
   * Format volume with unit
   */
  formatVolume(volume, locale = 'en-US') {
    if (volume === null || volume === undefined) return '—';
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(volume) + ' L';
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Clear cache
   */
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
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Configuration updated:', this.config);
  }
}

// Create singleton instance
export const cumulativeReadingsService = new CumulativeReadingsService();

// Export constants
export const RECONCILIATION_STATUS = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  ACCEPTABLE: 'ACCEPTABLE',
  INVESTIGATE: 'INVESTIGATE',
  CRITICAL: 'CRITICAL',
  NO_DATA: 'NO_DATA'
};

export const READING_TYPES = {
  START: 'START',
  END: 'END',
  OFFLOAD_BEFORE: 'OFFLOAD_BEFORE',
  OFFLOAD_AFTER: 'OFFLOAD_AFTER'
};

export const OFFLOAD_STATUS = {
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED'
};

export default cumulativeReadingsService;