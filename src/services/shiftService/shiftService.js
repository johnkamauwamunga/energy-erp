import { apiService } from '../apiService';

// Enhanced logging utility
const logger = {
  debug: (...args) => console.log('🔍 [ShiftService]', ...args),
  info: (...args) => console.log('ℹ️ [ShiftService]', ...args),
  warn: (...args) => console.warn('⚠️ [ShiftService]', ...args),
  error: (...args) => console.error('❌ [ShiftService]', ...args)
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

export const shiftService = {
  // =====================
  // SHIFT OPENING METHODS
  // =====================
  
  createShift: async (shiftData) => {
    logger.info('Creating shift:', shiftData);
    debugRequest('POST', '/shifts', shiftData);
    
    try {
      const response = await apiService.post('/shifts', shiftData);
      debugResponse('POST', '/shifts', response);
      return handleResponse(response, 'creating shift');
    } catch (error) {
      throw handleError(error, 'creating shift', 'Failed to create shift');
    }
  },

  getShiftPreCreationData: async (stationId) => {
    logger.info(`Fetching shift pre-creation data for station: ${stationId}`);
    
    try {
      debugRequest('GET', `/shifts/pre-creation/${stationId}`);
      const response = await apiService.get(`/shifts/pre-creation/${stationId}`);
      debugResponse('GET', `/shifts/pre-creation/${stationId}`, response);
      return handleResponse(response, 'fetching shift pre-creation data');
    } catch (error) {
      throw handleError(error, 'fetching shift pre-creation data', 'Failed to fetch shift pre-creation data');
    }
  },

  validateShiftOpening: async (stationId) => {
    logger.info(`Validating shift opening for station: ${stationId}`);
    
    try {
      debugRequest('GET', `/shifts/validate-opening/${stationId}`);
      const response = await apiService.get(`/shifts/validate-opening/${stationId}`);
      debugResponse('GET', `/shifts/validate-opening/${stationId}`, response);
      return handleResponse(response, 'validating shift opening');
    } catch (error) {
      throw handleError(error, 'validating shift opening', 'Failed to validate shift opening');
    }
  },

  // =====================
  // SHIFT CLOSING METHODS
  // =====================

  closeShift: async (shiftId, closingData) => {
    logger.info(`Closing shift: ${shiftId}`, closingData);
    
    try {
      debugRequest('PATCH', `/shifts/${shiftId}/close`, closingData);
      const response = await apiService.patch(`/shifts/${shiftId}/close`, closingData);
      debugResponse('PATCH', `/shifts/${shiftId}/close`, response);
      return handleResponse(response, 'closing shift');
    } catch (error) {
      throw handleError(error, 'closing shift', 'Failed to close shift');
    }
  },

  validateShiftClosing: async (shiftId) => {
    logger.info(`Validating shift closing for shift: ${shiftId}`);
    
    try {
      debugRequest('GET', `/shifts/${shiftId}/validate-closing`);
      const response = await apiService.get(`/shifts/${shiftId}/validate-closing`);
      debugResponse('GET', `/shifts/${shiftId}/validate-closing`, response);
      return handleResponse(response, 'validating shift closing');
    } catch (error) {
      throw handleError(error, 'validating shift closing', 'Failed to validate shift closing');
    }
  },

  // =====================
  // CRUD & QUERY METHODS
  // =====================

  getShiftById: async (shiftId) => {
    logger.info(`Fetching shift: ${shiftId}`);
    
    try {
      debugRequest('GET', `/shifts/${shiftId}`);
      const response = await apiService.get(`/shifts/${shiftId}`);
      debugResponse('GET', `/shifts/${shiftId}`, response);
      return handleResponse(response, 'fetching shift');
    } catch (error) {
      throw handleError(error, 'fetching shift', 'Failed to fetch shift');
    }
  },

  getShiftByNumber: async (stationId, shiftNumber) => {
    logger.info(`Fetching shift ${shiftNumber} for station: ${stationId}`);
    
    try {
      debugRequest('GET', `/shifts/${stationId}/${shiftNumber}`);
      const response = await apiService.get(`/shifts/${stationId}/${shiftNumber}`);
      debugResponse('GET', `/shifts/${stationId}/${shiftNumber}`, response);
      return handleResponse(response, 'fetching shift by number');
    } catch (error) {
      throw handleError(error, 'fetching shift by number', 'Failed to fetch shift by number');
    }
  },

  getShifts: async (filters = {}) => {
    logger.info('Fetching shifts with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/shifts?${params.toString()}` : '/shifts';
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching shifts');
    } catch (error) {
      throw handleError(error, 'fetching shifts', 'Failed to fetch shifts');
    }
  },

  getOpenShifts: async (stationId) => {
    logger.info(`Fetching open shifts for station: ${stationId}`);
    
    try {
      debugRequest('GET', `/shifts/open/${stationId}`);
      const response = await apiService.get(`/shifts/open/${stationId}`);
      debugResponse('GET', `/shifts/open/${stationId}`, response);
      return handleResponse(response, 'fetching open shifts');
    } catch (error) {
      throw handleError(error, 'fetching open shifts', 'Failed to fetch open shifts');
    }
  },

  getShiftReport: async (shiftId) => {
    logger.info(`Fetching shift report for shift: ${shiftId}`);
    
    try {
      debugRequest('GET', `/shifts/${shiftId}/report`);
      const response = await apiService.get(`/shifts/${shiftId}/report`);
      debugResponse('GET', `/shifts/${shiftId}/report`, response);
      return handleResponse(response, 'fetching shift report');
    } catch (error) {
      throw handleError(error, 'fetching shift report', 'Failed to fetch shift report');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validateShiftOpeningData: (shiftData) => {
    const errors = [];

    if (!shiftData.startTime) {
      errors.push('Start time is required');
    }

    if (!shiftData.stationId) {
      errors.push('Station is required');
    }

    if (!shiftData.islands || !Array.isArray(shiftData.islands) || shiftData.islands.length === 0) {
      errors.push('At least one island is required');
    } else {
      shiftData.islands.forEach((island, index) => {
        if (!island.islandId) {
          errors.push(`Island ${index + 1}: Island ID is required`);
        }

        if (!island.attendants || island.attendants.length === 0) {
          errors.push(`Island ${index + 1}: At least one attendant is required`);
        }

        // Validate pump readings if pumps exist
        if (island.pumps && Array.isArray(island.pumps)) {
          island.pumps.forEach((pump, pumpIndex) => {
            if (!pump.pumpId) {
              errors.push(`Island ${index + 1}, Pump ${pumpIndex + 1}: Pump ID is required`);
            }
            if (pump.electricMeter === undefined || pump.electricMeter === null) {
              errors.push(`Island ${index + 1}, Pump ${pumpIndex + 1}: Electric meter reading is required`);
            }
            if (pump.manualMeter === undefined || pump.manualMeter === null) {
              errors.push(`Island ${index + 1}, Pump ${pumpIndex + 1}: Manual meter reading is required`);
            }
            if (pump.cashMeter === undefined || pump.cashMeter === null) {
              errors.push(`Island ${index + 1}, Pump ${pumpIndex + 1}: Cash meter reading is required`);
            }
          });
        }

        // Validate non-fuel products if they exist
        if (island.nonFuelProducts && Array.isArray(island.nonFuelProducts)) {
          island.nonFuelProducts.forEach((product, productIndex) => {
            if (!product.productId) {
              errors.push(`Island ${index + 1}, Product ${productIndex + 1}: Product ID is required`);
            }
            if (product.openingStock === undefined || product.openingStock === null || product.openingStock < 0) {
              errors.push(`Island ${index + 1}, Product ${productIndex + 1}: Valid opening stock is required`);
            }
          });
        }
      });
    }

    return errors;
  },

  validateShiftClosingData: (closingData) => {
    const errors = [];

    if (!closingData.endTime) {
      errors.push('End time is required');
    }

    if (!closingData.islands || !Array.isArray(closingData.islands) || closingData.islands.length === 0) {
      errors.push('At least one island is required');
    } else {
      closingData.islands.forEach((island, index) => {
        if (!island.islandId) {
          errors.push(`Island ${index + 1}: Island ID is required`);
        }

        // Validate collections
        if (!island.collections) {
          errors.push(`Island ${index + 1}: Collections data is required`);
        } else {
          const collections = island.collections;
          if (collections.cashAmount === undefined || collections.cashAmount === null || collections.cashAmount < 0) {
            errors.push(`Island ${index + 1}: Valid cash amount is required`);
          }
          if (collections.mobileMoneyAmount === undefined || collections.mobileMoneyAmount === null || collections.mobileMoneyAmount < 0) {
            errors.push(`Island ${index + 1}: Valid mobile money amount is required`);
          }
          if (collections.visaAmount === undefined || collections.visaAmount === null || collections.visaAmount < 0) {
            errors.push(`Island ${index + 1}: Valid visa amount is required`);
          }
          if (collections.mastercardAmount === undefined || collections.mastercardAmount === null || collections.mastercardAmount < 0) {
            errors.push(`Island ${index + 1}: Valid mastercard amount is required`);
          }
          if (collections.debtAmount === undefined || collections.debtAmount === null || collections.debtAmount < 0) {
            errors.push(`Island ${index + 1}: Valid debt amount is required`);
          }
          if (collections.otherAmount === undefined || collections.otherAmount === null || collections.otherAmount < 0) {
            errors.push(`Island ${index + 1}: Valid other amount is required`);
          }
        }

        // Validate closing pump readings if pumps exist
        if (island.pumps && Array.isArray(island.pumps)) {
          island.pumps.forEach((pump, pumpIndex) => {
            if (!pump.pumpId) {
              errors.push(`Island ${index + 1}, Pump ${pumpIndex + 1}: Pump ID is required`);
            }
            if (pump.electricMeter === undefined || pump.electricMeter === null) {
              errors.push(`Island ${index + 1}, Pump ${pumpIndex + 1}: Electric meter reading is required`);
            }
            if (pump.manualMeter === undefined || pump.manualMeter === null) {
              errors.push(`Island ${index + 1}, Pump ${pumpIndex + 1}: Manual meter reading is required`);
            }
            if (pump.cashMeter === undefined || pump.cashMeter === null) {
              errors.push(`Island ${index + 1}, Pump ${pumpIndex + 1}: Cash meter reading is required`);
            }
          });
        }

        // Validate closing non-fuel stock if products exist
        if (island.nonFuelProducts && Array.isArray(island.nonFuelProducts)) {
          island.nonFuelProducts.forEach((product, productIndex) => {
            if (!product.productId) {
              errors.push(`Island ${index + 1}, Product ${productIndex + 1}: Product ID is required`);
            }
            if (product.closingStock === undefined || product.closingStock === null || product.closingStock < 0) {
              errors.push(`Island ${index + 1}, Product ${productIndex + 1}: Valid closing stock is required`);
            }
          });
        }
      });
    }

    return errors;
  },

  // =====================
  // UTILITY METHODS
  // =====================

  calculateShiftDuration: (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    
    return {
      hours: Math.floor(durationMs / (1000 * 60 * 60)),
      minutes: Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60)),
      totalHours: (durationMs / (1000 * 60 * 60)).toFixed(2)
    };
  },

  formatShiftStatus: (status) => {
    const statusMap = {
      'OPEN': { label: 'Open', color: 'success', variant: 'success' },
      'CLOSED': { label: 'Closed', color: 'secondary', variant: 'secondary' },
      'UNDER_REVIEW': { label: 'Under Review', color: 'warning', variant: 'warning' },
      'APPROVED': { label: 'Approved', color: 'info', variant: 'info' }
    };
    
    return statusMap[status] || { label: status, color: 'default', variant: 'default' };
  },

  calculateIslandTotalCollection: (collections) => {
    if (!collections) return 0;
    
    return (collections.cashAmount || 0) +
           (collections.mobileMoneyAmount || 0) +
           (collections.visaAmount || 0) +
           (collections.mastercardAmount || 0) +
           (collections.debtAmount || 0) +
           (collections.otherAmount || 0);
  },

  calculateVariance: (expected, actual) => {
    return {
      amount: actual - expected,
      percentage: expected > 0 ? ((actual - expected) / expected) * 100 : 0
    };
  },

  formatShiftForDisplay: (shift) => {
    if (!shift) return null;
    
    const duration = shift.endTime 
      ? this.calculateShiftDuration(shift.startTime, shift.endTime)
      : null;
    
    const totalSales = shift.analytics?.totalSales || 0;
    const totalCollections = shift.shiftCollection?.totalCollected || 0;
    const variance = this.calculateVariance(totalSales, totalCollections);
    
    return {
      ...shift,
      displayStatus: this.formatShiftStatus(shift.status),
      duration,
      totalSales: this.formatCurrency(totalSales),
      totalCollections: this.formatCurrency(totalCollections),
      variance: {
        amount: this.formatCurrency(variance.amount),
        percentage: `${variance.percentage.toFixed(2)}%`,
        isPositive: variance.amount >= 0
      },
      formattedStartTime: this.formatDateTime(shift.startTime),
      formattedEndTime: shift.endTime ? this.formatDateTime(shift.endTime) : 'Ongoing',
      supervisorName: shift.supervisor ? 
        `${shift.supervisor.firstName} ${shift.supervisor.lastName}` : 'Unknown'
    };
  },

  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
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

  // =====================
  // BATCH OPERATIONS
  // =====================

  batchCloseShifts: async (shiftsData) => {
    logger.info('Batch closing shifts:', shiftsData.length);
    
    try {
      const promises = shiftsData.map(({ shiftId, closingData }) => 
        this.closeShift(shiftId, closingData)
      );
      
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);
      
      return {
        successful,
        failed,
        total: shiftsData.length,
        successCount: successful.length,
        failureCount: failed.length
      };
    } catch (error) {
      throw handleError(error, 'batch closing shifts', 'Failed to batch close shifts');
    }
  },

  // =====================
  // SHIFT TEMPLATES
  // =====================

  createShiftTemplate: (stationId, supervisorId) => {
    const now = new Date();
    const startTime = new Date(now.getTime() - (30 * 60 * 1000)); // 30 minutes ago
    
    return {
      startTime: startTime.toISOString(),
      stationId,
      supervisorId,
      islands: []
    };
  },

  createIslandTemplate: (islandId) => {
    return {
      islandId,
      pumps: [],
      attendants: [],
      nonFuelProducts: []
    };
  },

  createPumpReadingTemplate: (pumpId) => {
    return {
      pumpId,
      electricMeter: 0,
      manualMeter: 0,
      cashMeter: 0
    };
  },

  createNonFuelProductTemplate: (productId) => {
    return {
      productId,
      openingStock: 0
    };
  },

  createClosingDataTemplate: (shiftId) => {
    const now = new Date();
    
    return {
      endTime: now.toISOString(),
      islands: []
    };
  },

  createIslandClosingTemplate: (islandId) => {
    return {
      islandId,
      pumps: [],
      nonFuelProducts: [],
      collections: {
        cashAmount: 0,
        mobileMoneyAmount: 0,
        visaAmount: 0,
        mastercardAmount: 0,
        debtAmount: 0,
        otherAmount: 0
      }
    };
  },

  createClosingPumpReadingTemplate: (pumpId) => {
    return {
      pumpId,
      electricMeter: 0,
      manualMeter: 0,
      cashMeter: 0
    };
  },

  createClosingNonFuelProductTemplate: (productId) => {
    return {
      productId,
      closingStock: 0
    };
  }
};

export default shiftService;