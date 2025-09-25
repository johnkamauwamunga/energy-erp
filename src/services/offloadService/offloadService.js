// src/services/fuelOffloadService.js
import { apiService } from './apiService';

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

// Validation utilities
export const offloadValidators = {
  validateOffloadData: (offloadData) => {
    const errors = [];
    
    if (!offloadData.purchaseId) errors.push('Purchase ID is required');
    if (!offloadData.tankId) errors.push('Tank ID is required');
    if (!offloadData.shiftId) errors.push('Shift ID is required');
    if (!offloadData.deliveryNoteNumber) errors.push('Delivery note number is required');
    if (!offloadData.vehicleNumber) errors.push('Vehicle number is required');
    if (!offloadData.driverName) errors.push('Driver name is required');
    if (!offloadData.transporterName) errors.push('Transporter name is required');
    
    if (!offloadData.beforeDipReading || !offloadData.beforeDipReading.dipValue) {
      errors.push('Before dip reading with dip value is required');
    }
    
    if (!offloadData.beforePumpReadings || offloadData.beforePumpReadings.length === 0) {
      errors.push('At least one pump reading is required');
    }
    
    if (!offloadData.unitPrice || offloadData.unitPrice <= 0) {
      errors.push('Unit price must be positive');
    }
    
    return { isValid: errors.length === 0, errors };
  },

  validateCompletionData: (completionData) => {
    const errors = [];
    
    if (!completionData.actualQuantity || completionData.actualQuantity <= 0) {
      errors.push('Actual quantity must be positive');
    }
    
    if (!completionData.afterDipReading || !completionData.afterDipReading.dipValue) {
      errors.push('After dip reading with dip value is required');
    }
    
    if (!completionData.afterPumpReadings || completionData.afterPumpReadings.length === 0) {
      errors.push('At least one after pump reading is required');
    }
    
    return { isValid: errors.length === 0, errors };
  }
};

// Calculation utilities
export const offloadCalculations = {
  calculateVariancePercentage: (expected, actual) => {
    if (expected === 0) return actual === 0 ? 0 : 100;
    return ((actual - expected) / expected) * 100;
  },

  calculateVolumeFromDip: (dipValue, tankCapacity) => dipValue * (tankCapacity / 100),
  
  calculateSalesDuringOffload: (beforeReadings, afterReadings) => {
    let totalSales = 0;
    beforeReadings.forEach(beforeReading => {
      const afterReading = afterReadings.find(after => after.pumpId === beforeReading.pumpId);
      if (afterReading && beforeReading.electricMeter != null && afterReading.electricMeter != null) {
        const sales = afterReading.electricMeter - beforeReading.electricMeter;
        totalSales += Math.max(sales, 0);
      }
    });
    return totalSales;
  }
};

// Main service
export const fuelOffloadService = {
  // Start a new fuel offload
  startOffload: async (offloadData) => {
    logger.info('Starting fuel offload:', offloadData);
    
    const validation = offloadValidators.validateOffloadData(offloadData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    try {
      const response = await apiService.post('/fuel-offloads', offloadData);
      return handleResponse(response, 'starting fuel offload');
    } catch (error) {
      throw handleError(error, 'starting fuel offload', 'Failed to start fuel offload');
    }
  },

  // Complete an offload
  completeOffload: async (offloadId, completionData) => {
    logger.info(`Completing offload ${offloadId}:`, completionData);
    
    const validation = offloadValidators.validateCompletionData(completionData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    try {
      const response = await apiService.post(`/fuel-offloads/${offloadId}/complete`, completionData);
      return handleResponse(response, 'completing fuel offload');
    } catch (error) {
      throw handleError(error, 'completing fuel offload', 'Failed to complete fuel offload');
    }
  },

  // Get offload by ID
  getOffloadById: async (offloadId) => {
    logger.info(`Fetching offload: ${offloadId}`);
    
    try {
      const response = await apiService.get(`/fuel-offloads/${offloadId}`);
      return handleResponse(response, 'fetching offload');
    } catch (error) {
      throw handleError(error, 'fetching offload', 'Failed to fetch fuel offload');
    }
  },

  // Get paginated offloads with advanced filtering
  getOffloads: async (filters = {}) => {
    logger.info('Fetching offloads with filters:', filters);
    
    try {
      const response = await apiService.get('/fuel-offloads', { 
        params: {
          page: 1,
          limit: 50, // Increased for better mobile scrolling
          sortBy: 'startTime',
          sortOrder: 'desc',
          ...filters
        }
      });
      return handleResponse(response, 'fetching offloads');
    } catch (error) {
      throw handleError(error, 'fetching offloads', 'Failed to fetch fuel offloads');
    }
  },

  // Update offload
  updateOffload: async (offloadId, updateData) => {
    logger.info(`Updating offload ${offloadId}:`, updateData);
    
    try {
      const response = await apiService.patch(`/fuel-offloads/${offloadId}`, updateData);
      return handleResponse(response, 'updating offload');
    } catch (error) {
      throw handleError(error, 'updating offload', 'Failed to update fuel offload');
    }
  },

  // Delete offload
  deleteOffload: async (offloadId) => {
    logger.info(`Deleting offload: ${offloadId}`);
    
    try {
      const response = await apiService.delete(`/fuel-offloads/${offloadId}`);
      return handleResponse(response, 'deleting offload');
    } catch (error) {
      throw handleError(error, 'deleting offload', 'Failed to delete fuel offload');
    }
  },

  // Get offloads by station
  getOffloadsByStation: async (stationId, filters = {}) => {
    logger.info(`Fetching offloads for station: ${stationId}`, filters);
    
    try {
      const response = await apiService.get('/fuel-offloads', {
        params: { ...filters, stationId }
      });
      return handleResponse(response, 'fetching offloads by station');
    } catch (error) {
      throw handleError(error, 'fetching offloads by station', 'Failed to fetch offloads for station');
    }
  },

  // Get offloads by tank
  getOffloadsByTank: async (tankId, filters = {}) => {
    logger.info(`Fetching offloads for tank: ${tankId}`, filters);
    
    try {
      const response = await apiService.get('/fuel-offloads', {
        params: { ...filters, tankId }
      });
      return handleResponse(response, 'fetching offloads by tank');
    } catch (error) {
      throw handleError(error, 'fetching offloads by tank', 'Failed to fetch offloads for tank');
    }
  },

  // Get offload summary for dashboard
  getOffloadSummary: async (filters = {}) => {
    logger.info('Fetching offload summary:', filters);
    
    try {
      const response = await apiService.get('/fuel-offloads/summary/dashboard', {
        params: filters
      });
      return handleResponse(response, 'fetching offload summary');
    } catch (error) {
      throw handleError(error, 'fetching offload summary', 'Failed to fetch offload summary');
    }
  },

  // Get recent offloads
  getRecentOffloads: async (stationId = null) => {
    logger.info(`Fetching recent offloads for station: ${stationId || 'all'}`);
    
    try {
      const params = { 
        limit: 10, 
        page: 1, 
        sortBy: 'startTime', 
        sortOrder: 'desc' 
      };
      
      if (stationId) params.stationId = stationId;
      
      const response = await apiService.get('/fuel-offloads', { params });
      return handleResponse(response, 'fetching recent offloads');
    } catch (error) {
      throw handleError(error, 'fetching recent offloads', 'Failed to fetch recent offloads');
    }
  },

  // Verify offload
  verifyOffload: async (offloadId, verificationData) => {
    logger.info(`Verifying offload ${offloadId}:`, verificationData);
    
    try {
      const response = await apiService.post(`/fuel-offloads/${offloadId}/verify`, verificationData);
      return handleResponse(response, 'verifying offload');
    } catch (error) {
      throw handleError(error, 'verifying offload', 'Failed to verify offload');
    }
  }
};

// Data formatting utilities
export const offloadFormatters = {
  formatOffloadForDisplay: (offload) => {
    if (!offload) return null;
    
    const variancePercentage = offload.expectedQuantity > 0 
      ? offloadCalculations.calculateVariancePercentage(offload.expectedQuantity, offload.actualQuantity)
      : 0;

    return {
      ...offload,
      formattedStartTime: new Date(offload.startTime).toLocaleString(),
      formattedEndTime: offload.endTime ? new Date(offload.endTime).toLocaleString() : 'In Progress',
      variancePercentage: variancePercentage.toFixed(2),
      statusBadge: getStatusBadge(offload.status),
      totalValueFormatted: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(offload.totalValue || 0),
      // Mobile-friendly short formats
      shortStartTime: new Date(offload.startTime).toLocaleDateString(),
      shortVehicle: offload.vehicleNumber?.replace(/\s/g, ''),
      shortStation: offload.tank?.asset?.station?.name?.split(' ')[0] || 'N/A'
    };
  },

  formatForMobileTable: (offloads) => {
    return offloads.map(offload => ({
      id: offload.id,
      deliveryNote: offload.deliveryNoteNumber,
      vehicle: offload.vehicleNumber,
      driver: offload.driverName,
      product: offload.product?.name,
      station: offload.tank?.asset?.station?.name,
      expected: offload.expectedQuantity,
      actual: offload.actualQuantity,
      variance: offload.variance,
      status: offload.status,
      startTime: new Date(offload.startTime).toLocaleDateString(),
      // Mobile-optimized fields
      mobileSummary: `${offload.deliveryNoteNumber} • ${offload.vehicleNumber}`,
      mobileDetails: `${offload.product?.name} • ${offload.actualQuantity}L`
    }));
  }
};

// Helper function for status badges
const getStatusBadge = (status) => {
  const statusConfig = {
    'IN_PROGRESS': { color: 'blue', label: 'In Progress', variant: 'warning' },
    'SUCCESSFUL': { color: 'green', label: 'Completed', variant: 'success' },
    'FAILED': { color: 'red', label: 'Failed', variant: 'error' },
    'CANCELLED': { color: 'gray', label: 'Cancelled', variant: 'secondary' },
    'PARTIAL': { color: 'orange', label: 'Partial', variant: 'warning' }
  };
  
  return statusConfig[status] || { color: 'gray', label: status, variant: 'secondary' };
};

export default fuelOffloadService;