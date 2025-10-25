// src/services/fuelOffloadService.js
import { apiService } from '../apiService';

// Enhanced logging utility
const logger = {
  debug: (...args) => console.log('🔍 [FuelOffloadService]', ...args),
  info: (...args) => console.log('ℹ️ [FuelOffloadService]', ...args),
  warn: (...args) => console.warn('⚠️ [FuelOffloadService]', ...args),
  error: (...args) => console.error('❌ [FuelOffloadService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  logger.debug(`${operation} response:`, response.data);
  
  if (response.data && response.data.success !== false) {
    return response.data.data || response.data;
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
      throw new Error('You do not have permission to perform this action');
    }
    
    if (status === 404) {
      throw new Error('Requested resource not found');
    }
    
    if (status === 400 && data && data.message) {
      throw new Error(data.message);
    }
    
    if (data && data.message) {
      throw new Error(data.message);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

// Validation utilities - UPDATED TO MATCH BACKEND SCHEMA EXACTLY
export const offloadValidators = {
  validateFuelOffloadData: (offloadData) => {
    const errors = [];
    
    // Required fields from backend schema
    if (!offloadData.purchaseId) errors.push('Purchase ID is required');
    if (!offloadData.stationId) errors.push('Station ID is required');
    
    // Tank offloads validation
    if (!offloadData.tankOffloads || offloadData.tankOffloads.length === 0) {
      errors.push('At least one tank offload is required');
    } else {
      offloadData.tankOffloads.forEach((tankOffload, index) => {
        if (!tankOffload.tankId) errors.push(`Tank ${index + 1}: Tank ID is required`);
        if (!tankOffload.expectedVolume || tankOffload.expectedVolume <= 0) {
          errors.push(`Tank ${index + 1}: Expected volume must be positive`);
        }
        if (!tankOffload.actualVolume || tankOffload.actualVolume <= 0) {
          errors.push(`Tank ${index + 1}: Actual volume must be positive`);
        }
        if (!tankOffload.dipBefore) {
          errors.push(`Tank ${index + 1}: Before dip reading is required`);
        }
        if (!tankOffload.dipAfter) {
          errors.push(`Tank ${index + 1}: After dip reading is required`);
        }
      });
    }
    
    // Total volumes
    if (!offloadData.totalExpectedVolume || offloadData.totalExpectedVolume <= 0) {
      errors.push('Total expected volume must be positive');
    }
    if (!offloadData.totalActualVolume || offloadData.totalActualVolume <= 0) {
      errors.push('Total actual volume must be positive');
    }
    
    return { isValid: errors.length === 0, errors };
  },

  validatePurchaseReceivingCompletion: (completionData) => {
    const errors = [];
    
    if (!completionData.purchaseId) errors.push('Purchase ID is required');
    if (!completionData.stationId) errors.push('Station ID is required');
    if (!completionData.totalReceivedVolume || completionData.totalReceivedVolume <= 0) {
      errors.push('Total received volume must be positive');
    }
    if (!completionData.offloadIds || completionData.offloadIds.length === 0) {
      errors.push('At least one offload ID is required');
    }
    
    return { isValid: errors.length === 0, errors };
  }
};

// Calculation utilities
export const offloadCalculations = {
  calculateVariance: (expected, actual) => actual - expected,
  
  calculateVariancePercentage: (expected, actual) => {
    if (expected === 0) return actual === 0 ? 0 : 100;
    return ((actual - expected) / expected) * 100;
  },

  calculateSalesDuringOffload: (beforeReadings, afterReadings) => {
    let totalSales = 0;
    if (!beforeReadings || !afterReadings) return totalSales;
    
    beforeReadings.forEach(beforeReading => {
      const afterReading = afterReadings.find(after => after.pumpId === beforeReading.pumpId);
      if (afterReading && beforeReading.electricMeter != null && afterReading.electricMeter != null) {
        const sales = afterReading.electricMeter - beforeReading.electricMeter;
        totalSales += Math.max(sales, 0);
      }
    });
    return totalSales;
  },
  
  calculateDipVolumeChange: (beforeVolume, afterVolume) => afterVolume - beforeVolume
};

// Main service - UPDATED TO MATCH BACKEND ENDPOINTS EXACTLY
export const fuelOffloadService = {
  // Create fuel offload - MATCHES BACKEND createFuelOffload ENDPOINT
  createFuelOffload: async (offloadData) => {
    logger.info('Creating fuel offload:', offloadData);
    
    const validation = offloadValidators.validateFuelOffloadData(offloadData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    try {
      // Format data to match backend schema exactly
      const formattedData = offloadFormatters.formatForCreate(offloadData);
      const response = await apiService.post('/offloads/create', formattedData);
      return handleResponse(response, 'creating fuel offload');
    } catch (error) {
      throw handleError(error, 'creating fuel offload', 'Failed to create fuel offload');
    }
  },

  // Complete purchase receiving - MATCHES BACKEND completePurchaseReceiving ENDPOINT
  completePurchaseReceiving: async (completionData) => {
    logger.info('Completing purchase receiving:', completionData);
    
    const validation = offloadValidators.validatePurchaseReceivingCompletion(completionData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    try {
      const response = await apiService.post('/offloads/purchase-receiving/complete', completionData);
      return handleResponse(response, 'completing purchase receiving');
    } catch (error) {
      throw handleError(error, 'completing purchase receiving', 'Failed to complete purchase receiving');
    }
  },

  // Get fuel offloads by purchase - MATCHES BACKEND getFuelOffloadsByPurchase ENDPOINT
  getFuelOffloadsByPurchase: async (purchaseId, stationId) => {
    logger.info(`Fetching offloads for purchase: ${purchaseId}, station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/offloads/purchases/${purchaseId}/offloads`, {
        params: { stationId }
      });
      return handleResponse(response, 'fetching offloads by purchase');
    } catch (error) {
      throw handleError(error, 'fetching offloads by purchase', 'Failed to fetch offloads for purchase');
    }
  },

  // Get purchase receiving status - MATCHES BACKEND getPurchaseReceivingStatus ENDPOINT
  getPurchaseReceivingStatus: async (purchaseId, stationId) => {
    logger.info(`Fetching receiving status for purchase: ${purchaseId}, station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/offloads/purchases/${purchaseId}/receiving-status`, {
        params: { stationId }
      });
      return handleResponse(response, 'fetching purchase receiving status');
    } catch (error) {
      throw handleError(error, 'fetching purchase receiving status', 'Failed to fetch purchase receiving status');
    }
  },

  // Update purchase status - MATCHES BACKEND updatePurchaseStatus ENDPOINT
  updatePurchaseStatus: async (purchaseId, statusData) => {
    logger.info(`Updating purchase status: ${purchaseId}`, statusData);
    
    try {
      const response = await apiService.patch(`/offloads/purchases/${purchaseId}/status`, statusData);
      return handleResponse(response, 'updating purchase status');
    } catch (error) {
      throw handleError(error, 'updating purchase status', 'Failed to update purchase status');
    }
  },

  // Get offload by ID
  getOffloadById: async (offloadId) => {
    logger.info(`Fetching offload: ${offloadId}`);
    
    try {
      // Note: This endpoint might not exist in your backend, you may need to add it
      const response = await apiService.get(`/offloads/${offloadId}`);
      return handleResponse(response, 'fetching offload');
    } catch (error) {
      throw handleError(error, 'fetching offload', 'Failed to fetch fuel offload');
    }
  },

  // Get offloads with filtering
  getOffloads: async (filters = {}) => {
    logger.info('Fetching offloads with filters:', filters);
    
    try {
      // Note: This endpoint might not exist in your backend, you may need to add it
      // const response = await apiService.get('/offloads', { 
      const response = await apiService.get(`/offloads/purchases/fc14caa1-d580-4968-881d-f24bbd303050/offloads`, {
        params: filters
      });
      return handleResponse(response, 'fetching offloads');
    } catch (error) {
      throw handleError(error, 'fetching offloads', 'Failed to fetch fuel offloads');
    }
  },

  // Get offloads by station
  getOffloadsByStation: async (stationId, filters = {}) => {
    logger.info(`Fetching offloads for station: ${stationId}`, filters);
    
    try {
      // Note: This endpoint might not exist in your backend, you may need to add it
      const response = await apiService.get(`/offloads/station/${stationId}`, {
        params: filters
      });
      return handleResponse(response, 'fetching offloads by station');
    } catch (error) {
      throw handleError(error, 'fetching offloads by station', 'Failed to fetch offloads for station');
    }
  },

  // Get recent offloads
  getRecentOffloads: async (stationId = null, limit = 10) => {
    logger.info(`Fetching recent offloads for station: ${stationId || 'all'}`);
    
    const params = { 
      limit, 
      page: 1, 
      sortBy: 'createdAt', 
      sortOrder: 'desc' 
    };
    
    if (stationId) params.stationId = stationId;
    
    try {
      const response = await apiService.get('/offloads', { params });
      return handleResponse(response, 'fetching recent offloads');
    } catch (error) {
      throw handleError(error, 'fetching recent offloads', 'Failed to fetch recent offloads');
    }
  }
};

// Data formatting utilities - UPDATED TO MATCH BACKEND SCHEMA EXACTLY
export const offloadFormatters = {
  formatOffloadForDisplay: (offload) => {
    if (!offload) return null;
    
    // Use backend-calculated values if available
    const variance = offload.variance !== undefined ? offload.variance : 0;
    const totalExpected = offload.totalExpectedVolume || offload.expectedVolume || 0;
    const totalActual = offload.totalActualVolume || offload.actualVolume || 0;
    
    const variancePercentage = offloadCalculations.calculateVariancePercentage(
      totalExpected, 
      totalActual
    );

    // Map backend status to display values
    const statusDisplay = {
      'COMPLETED': { label: 'Completed', color: 'green', variant: 'success' },
      'IN_PROGRESS': { label: 'In Progress', color: 'blue', variant: 'processing' },
      'DRAFT': { label: 'Draft', color: 'gray', variant: 'default' },
      'CANCELLED': { label: 'Cancelled', color: 'red', variant: 'error' }
    };

    const statusInfo = statusDisplay[offload.status] || { label: offload.status, color: 'gray', variant: 'secondary' };

    return {
      ...offload,
      // Calculations
      variance: variance,
      variancePercentage: variancePercentage.toFixed(2),
      
      // Status information
      statusDisplay: statusInfo.label,
      statusColor: statusInfo.color,
      statusVariant: statusInfo.variant,
      isCompleted: offload.status === 'COMPLETED',
      isInProgress: offload.status === 'IN_PROGRESS',
      
      // Formatted dates
      formattedCreatedAt: offload.createdAt ? new Date(offload.createdAt).toLocaleString() : 'N/A',
      
      // Quick info for display
      purchaseNumber: offload.purchase?.purchaseNumber || 'N/A',
      supplierName: offload.purchase?.supplier?.name || 'Unknown Supplier',
      stationName: offload.station?.name || 'Unknown Station',
      
      // Mobile-friendly formats
      shortCreatedAt: offload.createdAt ? new Date(offload.createdAt).toLocaleDateString('en-KE') : 'N/A',
      
      // Quick info for cards
      quickInfo: {
        purchase: offload.purchase?.purchaseNumber || 'N/A',
        station: offload.station?.name || 'Unknown Station',
        supplier: offload.purchase?.supplier?.name || 'Unknown Supplier',
        tanks: offload.tankOffloads?.length || 0
      }
    };
  },

  formatForMobileTable: (offloads) => {
    return offloads.map(offload => {
      const formatted = offloadFormatters.formatOffloadForDisplay(offload);
      
      return {
        id: offload.id,
        purchaseNumber: formatted.purchaseNumber,
        supplier: formatted.supplierName,
        station: formatted.stationName,
        expected: `${offload.totalExpectedVolume || 0}L`,
        actual: `${offload.totalActualVolume || 0}L`,
        variance: `${formatted.variance}L`,
        status: formatted.statusDisplay,
        createdAt: formatted.shortCreatedAt,
        
        // Mobile-optimized fields
        mobileSummary: `${formatted.purchaseNumber} • ${formatted.supplierName}`,
        mobileDetails: `${offload.totalActualVolume || 0}L • ${formatted.statusDisplay}`,
        
        // For quick actions
        canComplete: offload.status === 'IN_PROGRESS',
        canEdit: offload.status !== 'COMPLETED' && offload.status !== 'CANCELLED'
      };
    });
  },

  // Format data for create submission - MATCHES createFuelOffloadSchema EXACTLY
  formatForCreate: (formData) => {
    return {
      purchaseId: formData.purchaseId,
      stationId: formData.stationId,
      shiftId: formData.shiftId || null, // Optional
      tankOffloads: (formData.tankOffloads || []).map(tankOffload => ({
        tankId: tankOffload.tankId,
        expectedVolume: parseFloat(tankOffload.expectedVolume || 0),
        actualVolume: parseFloat(tankOffload.actualVolume || 0),
        dipBefore: {
          dipValue: parseFloat(tankOffload.dipBefore?.dipValue || 0),
          volume: parseFloat(tankOffload.dipBefore?.volume || 0),
          temperature: tankOffload.dipBefore?.temperature ? parseFloat(tankOffload.dipBefore.temperature) : null,
          waterLevel: tankOffload.dipBefore?.waterLevel ? parseFloat(tankOffload.dipBefore.waterLevel) : null,
          density: tankOffload.dipBefore?.density ? parseFloat(tankOffload.dipBefore.density) : null
        },
        dipAfter: {
          dipValue: parseFloat(tankOffload.dipAfter?.dipValue || 0),
          volume: parseFloat(tankOffload.dipAfter?.volume || 0),
          temperature: tankOffload.dipAfter?.temperature ? parseFloat(tankOffload.dipAfter.temperature) : null,
          waterLevel: tankOffload.dipAfter?.waterLevel ? parseFloat(tankOffload.dipAfter.waterLevel) : null,
          density: tankOffload.dipAfter?.density ? parseFloat(tankOffload.dipAfter.density) : null
        },
        pumpReadingsBefore: (tankOffload.pumpReadingsBefore || []).map(reading => ({
          pumpId: reading.pumpId,
          electricMeter: parseFloat(reading.electricMeter || 0),
          manualMeter: reading.manualMeter ? parseFloat(reading.manualMeter) : null,
          cashMeter: reading.cashMeter ? parseFloat(reading.cashMeter) : null,
          litersDispensed: reading.litersDispensed ? parseFloat(reading.litersDispensed) : null,
          salesValue: reading.salesValue ? parseFloat(reading.salesValue) : null,
          unitPrice: reading.unitPrice ? parseFloat(reading.unitPrice) : null
        })),
        pumpReadingsAfter: (tankOffload.pumpReadingsAfter || []).map(reading => ({
          pumpId: reading.pumpId,
          electricMeter: parseFloat(reading.electricMeter || 0),
          manualMeter: reading.manualMeter ? parseFloat(reading.manualMeter) : null,
          cashMeter: reading.cashMeter ? parseFloat(reading.cashMeter) : null,
          litersDispensed: reading.litersDispensed ? parseFloat(reading.litersDispensed) : null,
          salesValue: reading.salesValue ? parseFloat(reading.salesValue) : null,
          unitPrice: reading.unitPrice ? parseFloat(reading.unitPrice) : null
        })),
        density: tankOffload.density ? parseFloat(tankOffload.density) : null,
        temperature: tankOffload.temperature ? parseFloat(tankOffload.temperature) : null
      })),
      totalExpectedVolume: parseFloat(formData.totalExpectedVolume || 0),
      totalActualVolume: parseFloat(formData.totalActualVolume || 0),
      notes: formData.notes || null
    };
  },

  // Format for purchase receiving completion - MATCHES completePurchaseReceivingSchema
  formatForPurchaseReceiving: (formData) => {
    return {
      purchaseId: formData.purchaseId,
      stationId: formData.stationId,
      totalReceivedVolume: parseFloat(formData.totalReceivedVolume || 0),
      offloadIds: formData.offloadIds || []
    };
  },

  // Format for purchase status update - MATCHES updatePurchaseStatusSchema
  formatForStatusUpdate: (formData) => {
    return {
      status: formData.status,
      deliveryStatus: formData.deliveryStatus || null
    };
  }
};

// Export default service
export default fuelOffloadService;