// services/shiftService.js
import { apiService } from '../apiService';
import { assetService } from '../assetService/assetService';

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
  // ASSET DISCOVERY METHODS
  // =====================

  /**
   * Get complete asset structure for shift planning
   */
  async getStationAssets(stationId) {
    logger.info(`Fetching station assets: ${stationId}`);
    
    try {
      debugRequest('GET', `/assets/station/${stationId}`);
      const response = await apiService.get(`/assets/station/${stationId}`);
      debugResponse('GET', `/assets/station/${stationId}`, response);
      return handleResponse(response, 'fetching station assets');
    } catch (error) {
      throw handleError(error, 'fetching station assets', 'Failed to fetch station assets');
    }
  },

  /**
   * Get pumps connected to specific islands via AssetAttachmentType.PUMP_TO_ISLAND
   */
  async getIslandPumps(islandIds) {
    logger.info(`Fetching pumps for ${islandIds.length} islands`);
    
    try {
      const results = await Promise.all(
        islandIds.map(async (islandId) => {
          debugRequest('GET', `/assets/island/${islandId}/pumps`);
          const response = await apiService.get(`/assets/island/${islandId}/pumps`);
          debugResponse('GET', `/assets/island/${islandId}/pumps`, response);
          return handleResponse(response, `fetching pumps for island ${islandId}`);
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
            // Add island to existing pump's source islands
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
    } catch (error) {
      throw handleError(error, 'fetching island pumps', 'Failed to fetch island pumps');
    }
  },

  /**
   * Get tanks connected to specific pumps via AssetAttachmentType.TANK_TO_PUMP
   */
  async getPumpTanks(pumpIds) {
    logger.info(`Fetching tanks for ${pumpIds.length} pumps`);
    
    try {
      debugRequest('POST', '/assets/pumps/tanks', { pumpIds });
      const response = await apiService.post('/assets/pumps/tanks', { pumpIds });
      debugResponse('POST', '/assets/pumps/tanks', response);
      return handleResponse(response, 'fetching pump tanks');
    } catch (error) {
      throw handleError(error, 'fetching pump tanks', 'Failed to fetch pump tanks');
    }
  },

  /**
   * Get complete asset chain for shift opening
   */
  async getCompleteAssetChain(islandIds) {
    logger.info(`Building complete asset chain for ${islandIds.length} islands`);
    
    try {
      // Step 1: Get pumps connected to islands
      const pumpsResult = await this.getIslandPumps(islandIds);
      
      // Step 2: Get tanks connected to those pumps
      const pumpIds = pumpsResult.pumps.map(pump => pump.id);
      const tanksResult = await this.getPumpTanks(pumpIds);
      
      // Step 3: Build asset chain with relationships
      const assetChain = {
        islands: pumpsResult.islands,
        pumps: pumpsResult.pumps,
        tanks: tanksResult.tanks,
        relationships: {
          islandToPump: pumpsResult.pumps.reduce((acc, pump) => {
            pump.sourceIslands.forEach(islandId => {
              if (!acc[islandId]) acc[islandId] = [];
              acc[islandId].push(pump.id);
            });
            return acc;
          }, {}),
          pumpToTank: tanksResult.tanks.reduce((acc, tank) => {
            tank.connectedPumps.forEach(pumpId => {
              if (!acc[pumpId]) acc[pumpId] = [];
              acc[pumpId].push(tank.id);
            });
            return acc;
          }, {})
        },
        summary: {
          islands: islandIds.length,
          pumps: pumpsResult.pumps.length,
          tanks: tanksResult.tanks.length
        }
      };
      
      logger.info(`✅ Asset chain built: ${assetChain.summary.islands} islands, ${assetChain.summary.pumps} pumps, ${assetChain.summary.tanks} tanks`);
      return assetChain;
    } catch (error) {
      throw handleError(error, 'building asset chain', 'Failed to build asset chain');
    }
  },

  /**
   * Get non-fuel products for station
   */
  async getStationNonFuelProducts(stationId) {
    logger.info(`Fetching non-fuel products for station: ${stationId}`);
    
    try {
      debugRequest('GET', `/assets/station/${stationId}/non-fuel`);
      const response = await apiService.get(`/assets/station/${stationId}/non-fuel`);
      debugResponse('GET', `/assets/station/${stationId}/non-fuel`, response);
      return handleResponse(response, 'fetching station non-fuel products');
    } catch (error) {
      throw handleError(error, 'fetching station non-fuel products', 'Failed to fetch non-fuel products');
    }
  },

  // =====================
  // SHIFT CREATION & OPENING
  // =====================

  /**
   * Create a new shift (basic record)
   */
  async createShift(shiftData) {
    logger.info('Creating shift:', shiftData);
    
    try {
      debugRequest('POST', '/shifts', shiftData);
      const response = await apiService.post('/shifts', shiftData);
      debugResponse('POST', '/shifts', response);
      return handleResponse(response, 'creating shift');
    } catch (error) {
      throw handleError(error, 'creating shift', 'Failed to create shift');
    }
  },

  /**
   * Open shift with readings and assignments
   */
  async openShift(shiftId, openingData) {
    logger.info(`Opening shift ${shiftId}:`, openingData);
    
    try {
      debugRequest('POST', `/shifts/${shiftId}/open`, openingData);
      const response = await apiService.post(`/shifts/${shiftId}/open`, openingData);
      debugResponse('POST', `/shifts/${shiftId}/open`, response);
      return handleResponse(response, 'opening shift');
    } catch (error) {
      throw handleError(error, 'opening shift', 'Failed to open shift');
    }
  },

  /**
   * Complete shift creation flow with asset discovery
   */
  async createAndOpenShift(completeData) {
    logger.info('Starting complete shift creation flow');
    
    try {
      const { shiftData, islandIds, openingData } = completeData;
      
      // Step 1: Create basic shift
      logger.info('Step 1: Creating basic shift');
      const shift = await this.createShift(shiftData);
      
      // Step 2: Discover assets for selected islands
      logger.info('Step 2: Discovering assets for islands');
      const assetChain = await this.getCompleteAssetChain(islandIds);
      
      // Step 3: Open shift with readings and assignments
      logger.info('Step 3: Opening shift with readings');
      const openingPayload = {
        shiftId: shift.id,
        recordedById: openingData.recordedById,
        islandAssignments: openingData.islandAssignments,
        pumpReadings: openingData.pumpReadings,
        tankReadings: openingData.tankReadings
      };
      
      const openedShift = await this.openShift(shift.id, openingPayload);
      
      return {
        shift: openedShift.shift,
        assetChain: openedShift.assetChain,
        readings: openedShift.readings,
        assignments: openedShift.assignments,
        openingCheck: openedShift.openingCheck
      };
    } catch (error) {
      throw handleError(error, 'creating and opening shift', 'Failed to create and open shift');
    }
  },

  // =====================
  // SHIFT CLOSING
  // =====================

  /**
   * Close shift with all required data
   */
  async closeShift(shiftId, closingData) {
    logger.info(`Closing shift ${shiftId}:`, closingData);
    
    try {
      debugRequest('POST', `/shifts/${shiftId}/close`, closingData);
      const response = await apiService.post(`/shifts/${shiftId}/close`, closingData);
      debugResponse('POST', `/shifts/${shiftId}/close`, response);
      return handleResponse(response, 'closing shift');
    } catch (error) {
      throw handleError(error, 'closing shift', 'Failed to close shift');
    }
  },

  /**
   * Get shift closing summary
   */
  async getShiftClosingSummary(shiftId) {
    logger.info(`Fetching closing summary for shift: ${shiftId}`);
    
    try {
      debugRequest('GET', `/shifts/${shiftId}/closing-summary`);
      const response = await apiService.get(`/shifts/${shiftId}/closing-summary`);
      debugResponse('GET', `/shifts/${shiftId}/closing-summary`, response);
      return handleResponse(response, 'fetching shift closing summary');
    } catch (error) {
      throw handleError(error, 'fetching shift closing summary', 'Failed to fetch closing summary');
    }
  },

  /**
   * Validate shift can be closed
   */
  async validateShiftClosing(shiftId) {
    logger.info(`Validating shift for closing: ${shiftId}`);
    
    try {
      // This would typically call a validation endpoint
      // For now, we'll simulate by checking if shift exists and is open
      const shift = await this.getShiftById(shiftId);
      
      if (shift.status !== 'OPEN') {
        throw new Error(`Shift cannot be closed. Current status: ${shift.status}`);
      }
      
      // Check if shift has opening readings
      if (!shift.pumpMeterReadings || shift.pumpMeterReadings.length === 0) {
        throw new Error('Shift has no opening pump readings');
      }
      
      if (!shift.tankDipReadings || shift.tankDipReadings.length === 0) {
        throw new Error('Shift has no opening tank readings');
      }
      
      return {
        isValid: true,
        shift,
        requirements: {
          hasOpeningReadings: true,
          isOpen: true,
          hasMinimumDuration: true
        }
      };
    } catch (error) {
      throw handleError(error, 'validating shift closing', 'Failed to validate shift closing');
    }
  },

  // =====================
  // SHIFT QUERIES
  // =====================

  async getShiftById(shiftId) {
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

  async getShifts(filters = {}) {
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

  async getOpenShifts(stationId) {
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

  // =====================
  // VALIDATION UTILITIES
  // =====================

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
  },

  validateShiftOpening(openingData, assetChain) {
    const errors = [];
    const warnings = [];
    
    if (!openingData.recordedById) errors.push('Recorded by user ID is required');
    if (!openingData.islandAssignments || openingData.islandAssignments.length === 0) {
      errors.push('At least one island assignment is required');
    }
    if (!openingData.pumpReadings || openingData.pumpReadings.length === 0) {
      errors.push('At least one pump reading is required');
    }
    if (!openingData.tankReadings || openingData.tankReadings.length === 0) {
      errors.push('At least one tank reading is required');
    }
    
    // Asset-based validation if assetChain is provided
    if (assetChain) {
      const providedPumpIds = openingData.pumpReadings.map(r => r.pumpId);
      const providedTankIds = openingData.tankReadings.map(r => r.tankId);
      
      // Check for missing pumps
      assetChain.pumps.forEach(pump => {
        if (!providedPumpIds.includes(pump.id)) {
          warnings.push(`No reading provided for pump: ${pump.asset?.name || pump.id}`);
        }
      });
      
      // Check for missing tanks
      assetChain.tanks.forEach(tank => {
        if (!providedTankIds.includes(tank.id)) {
          warnings.push(`No reading provided for tank: ${tank.asset?.name || tank.id}`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  validateShiftClosing(closingData) {
    const errors = [];
    
    if (!closingData.recordedById) errors.push('Recorded by user ID is required');
    if (!closingData.endTime) errors.push('End time is required');
    if (!closingData.pumpReadings || closingData.pumpReadings.length === 0) {
      errors.push('At least one pump reading is required');
    }
    if (!closingData.tankReadings || closingData.tankReadings.length === 0) {
      errors.push('At least one tank reading is required');
    }
    if (!closingData.islandCollections || closingData.islandCollections.length === 0) {
      errors.push('At least one island collection is required');
    }
    if (!closingData.stationCollection) errors.push('Station collection is required');
    if (!closingData.stationCollection.countedById) {
      errors.push('Station collection counted by user ID is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // =====================
  // DATA TRANSFORMATION UTILITIES
  // =====================

  transformFrontendToBackendOpening(frontendData) {
    return {
      shiftId: frontendData.shiftId,
      recordedById: frontendData.recordedById,
      islandAssignments: frontendData.islandAssignments,
      pumpReadings: frontendData.pumpReadings,
      tankReadings: frontendData.tankReadings
    };
  },

  transformFrontendToBackendClosing(frontendData) {
    return {
      shiftId: frontendData.shiftId,
      recordedById: frontendData.recordedById,
      endTime: frontendData.endTime,
      pumpReadings: frontendData.pumpReadings,
      tankReadings: frontendData.tankReadings,
      islandCollections: frontendData.islandCollections,
      stationCollection: frontendData.stationCollection,
      nonFuelStocks: frontendData.nonFuelStocks || [],
      closingNotes: frontendData.closingNotes,
      hasIssues: frontendData.hasIssues,
      issuesDescription: frontendData.issuesDescription
    };
  },

  // =====================
  // TEMPLATE GENERATORS
  // =====================

  createShiftTemplate(stationId, supervisorId) {
    const now = new Date();
    
    return {
      stationId,
      supervisorId,
      shiftNumber: this.generateShiftNumber(),
      startTime: now.toISOString(),
      priceListId: null
    };
  },

  createOpeningDataTemplate(shiftId, recordedById, islandIds = [], assetChain = null) {
    const template = {
      shiftId,
      recordedById,
      islandAssignments: [],
      pumpReadings: [],
      tankReadings: []
    };

    // Auto-populate island assignments
    islandIds.forEach(islandId => {
      template.islandAssignments.push({
        islandId,
        attendantId: '', // Will be filled by user
        assignmentType: 'PRIMARY'
      });
    });

    // Auto-populate pump readings if asset chain is provided
    if (assetChain) {
      assetChain.pumps.forEach(pump => {
        template.pumpReadings.push({
          pumpId: pump.id,
          electricMeter: 0,
          manualMeter: 0,
          cashMeter: 0,
          litersDispensed: 0,
          salesValue: 0,
          unitPrice: pump.product?.currentPrice || 0
        });
      });

      // Auto-populate tank readings
      assetChain.tanks.forEach(tank => {
        template.tankReadings.push({
          tankId: tank.id,
          dipValue: 0,
          volume: tank.currentVolume || 0,
          temperature: 25,
          waterLevel: 0,
          density: tank.product?.density || 0.85
        });
      });
    }

    return template;
  },

  createClosingDataTemplate(shiftId, recordedById) {
    const now = new Date();
    
    return {
      shiftId,
      recordedById,
      endTime: now.toISOString(),
      pumpReadings: [],
      tankReadings: [],
      islandCollections: [],
      stationCollection: {
        countedById: recordedById,
        cashAmount: 0,
        mobileMoneyAmount: 0,
        visaAmount: 0,
        mastercardAmount: 0,
        debtAmount: 0,
        otherAmount: 0
      },
      nonFuelStocks: [],
      closingNotes: '',
      hasIssues: false,
      issuesDescription: ''
    };
  },

  // =====================
  // UTILITY METHODS
  // =====================

  generateShiftNumber() {
    // In a real app, this would come from the backend or be based on existing shifts
    return Math.floor(1000 + Math.random() * 9000);
  },

  calculateShiftDuration(startTime, endTime) {
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

  formatShiftStatus(status) {
    const statusMap = {
      'OPEN': { label: 'Open', color: 'success', variant: 'success' },
      'CLOSED': { label: 'Closed', color: 'secondary', variant: 'secondary' },
      'UNDER_REVIEW': { label: 'Under Review', color: 'warning', variant: 'warning' },
      'APPROVED': { label: 'Approved', color: 'info', variant: 'info' }
    };
    
    return statusMap[status] || { label: status, color: 'default', variant: 'default' };
  },

  calculateVariance(expected, actual) {
    return {
      amount: actual - expected,
      percentage: expected > 0 ? ((actual - expected) / expected) * 100 : 0
    };
  }
};

export default shiftService;