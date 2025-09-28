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

// Validation utilities - UPDATED TO MATCH BACKEND SCHEMA
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
    if (!offloadData.documentRef) errors.push('Document reference is required');
    
    if (!offloadData.expectedQuantity || offloadData.expectedQuantity <= 0) {
      errors.push('Expected quantity must be positive');
    }
    
    if (!offloadData.unitPrice || offloadData.unitPrice <= 0) {
      errors.push('Unit price must be positive');
    }
    
    if (!offloadData.beforeDipReading) {
      errors.push('Before dip reading is required');
    } else {
      if (!offloadData.beforeDipReading.dipValue || offloadData.beforeDipReading.dipValue <= 0) {
        errors.push('Dip value must be positive');
      }
      if (!offloadData.beforeDipReading.volume || offloadData.beforeDipReading.volume <= 0) {
        errors.push('Dip volume must be positive');
      }
    }
    
    // Pump readings are optional at start (can be added later)
    if (offloadData.beforePumpReadings) {
      offloadData.beforePumpReadings.forEach((reading, index) => {
        if (!reading.pumpId) errors.push(`Pump ${index + 1}: Pump ID is required`);
        if (!reading.electricMeter && reading.electricMeter !== 0) {
          errors.push(`Pump ${index + 1}: Electric meter reading is required`);
        }
      });
    }
    
    if (!offloadData.startTime) errors.push('Start time is required');
    
    return { isValid: errors.length === 0, errors };
  },

  validateCompletionData: (completionData) => {
    const errors = [];
    
    if (!completionData.actualQuantity || completionData.actualQuantity <= 0) {
      errors.push('Actual quantity must be positive');
    }
    
    if (!completionData.afterDipReading) {
      errors.push('After dip reading is required');
    } else {
      if (!completionData.afterDipReading.dipValue || completionData.afterDipReading.dipValue <= 0) {
        errors.push('After dip value must be positive');
      }
      if (!completionData.afterDipReading.volume || completionData.afterDipReading.volume <= 0) {
        errors.push('After dip volume must be positive');
      }
    }
    
    if (!completionData.afterPumpReadings || completionData.afterPumpReadings.length === 0) {
      errors.push('At least one after pump reading is required');
    } else {
      completionData.afterPumpReadings.forEach((reading, index) => {
        if (!reading.pumpId) errors.push(`After Pump ${index + 1}: Pump ID is required`);
        if (!reading.electricMeter && reading.electricMeter !== 0) {
          errors.push(`After Pump ${index + 1}: Electric meter reading is required`);
        }
      });
    }
    
    if (!completionData.endTime) errors.push('End time is required');
    
    return { isValid: errors.length === 0, errors };
  }
};

// Calculation utilities - UPDATED FOR BACKEND COMPATIBILITY
export const offloadCalculations = {
  calculateVariance: (expected, actual) => actual - expected,
  
  calculateVariancePercentage: (expected, actual) => {
    if (expected === 0) return actual === 0 ? 0 : 100;
    return ((actual - expected) / expected) * 100;
  },

  calculateVolumeFromDip: (dipValue, tankCapacity) => {
    // Simple calculation - adjust based on your tank calibration
    return dipValue * (tankCapacity / 100);
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
  
  calculateTotalValue: (quantity, unitPrice) => quantity * unitPrice,
  
  calculateDipVolumeChange: (beforeVolume, afterVolume) => afterVolume - beforeVolume
};

// Main service - UPDATED TO MATCH BACKEND ENDPOINTS
export const fuelOffloadService = {
  // Start a new fuel offload - MATCHES BACKEND
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

  // Complete an offload - MATCHES BACKEND
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

  // Get offload by ID - MATCHES BACKEND
  getOffloadById: async (offloadId) => {
    logger.info(`Fetching offload: ${offloadId}`);
    
    try {
      const response = await apiService.get(`/fuel-offloads/${offloadId}`);
      return handleResponse(response, 'fetching offload');
    } catch (error) {
      throw handleError(error, 'fetching offload', 'Failed to fetch fuel offload');
    }
  },

  // Get paginated offloads with filtering - MATCHES BACKEND
  getOffloads: async (filters = {}) => {
    logger.info('Fetching offloads with filters:', filters);
    
    // Default parameters that match backend
    const defaultParams = {
      page: 1,
      limit: 20,
      sortBy: 'startTime',
      sortOrder: 'desc'
    };
    
    try {
      const response = await apiService.get('/fuel-offloads', { 
        params: { ...defaultParams, ...filters }
      });
      return handleResponse(response, 'fetching offloads');
    } catch (error) {
      throw handleError(error, 'fetching offloads', 'Failed to fetch fuel offloads');
    }
  },

  // Update offload - MATCHES BACKEND
  updateOffload: async (offloadId, updateData) => {
    logger.info(`Updating offload ${offloadId}:`, updateData);
    
    try {
      const response = await apiService.patch(`/fuel-offloads/${offloadId}`, updateData);
      return handleResponse(response, 'updating offload');
    } catch (error) {
      throw handleError(error, 'updating offload', 'Failed to update fuel offload');
    }
  },

  // Get offloads by purchase ID - NEW ENDPOINT
  getOffloadsByPurchase: async (purchaseId, filters = {}) => {
    logger.info(`Fetching offloads for purchase: ${purchaseId}`, filters);
    
    try {
      const response = await apiService.get(`/fuel-offloads/purchase/${purchaseId}`, {
        params: filters
      });
      return handleResponse(response, 'fetching offloads by purchase');
    } catch (error) {
      throw handleError(error, 'fetching offloads by purchase', 'Failed to fetch offloads for purchase');
    }
  },

  // Get offload summary for dashboard - MATCHES BACKEND
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

  // Get recent offloads - USING MAIN ENDPOINT WITH FILTERS
  getRecentOffloads: async (stationId = null, limit = 10) => {
    logger.info(`Fetching recent offloads for station: ${stationId || 'all'}`);
    
    const params = { 
      limit, 
      page: 1, 
      sortBy: 'startTime', 
      sortOrder: 'desc' 
    };
    
    if (stationId) params.stationId = stationId;
    
    try {
      const response = await apiService.get('/fuel-offloads', { params });
      return handleResponse(response, 'fetching recent offloads');
    } catch (error) {
      throw handleError(error, 'fetching recent offloads', 'Failed to fetch recent offloads');
    }
  },

  // Get offloads by station - USING MAIN ENDPOINT WITH STATION FILTER
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

  // Get offloads by tank - USING MAIN ENDPOINT WITH TANK FILTER
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
  }
};

// Data formatting utilities - UPDATED FOR BACKEND RESPONSE STRUCTURE
export const offloadFormatters = {
  formatOffloadForDisplay: (offload) => {
    if (!offload) return null;
    
    const variance = offloadCalculations.calculateVariance(offload.expectedQuantity, offload.actualQuantity);
    const variancePercentage = offloadCalculations.calculateVariancePercentage(offload.expectedQuantity, offload.actualQuantity);
    const totalValue = offload.totalValue || offloadCalculations.calculateTotalValue(offload.actualQuantity, offload.unitPrice);

    return {
      ...offload,
      // Calculations
      variance: variance,
      variancePercentage: variancePercentage.toFixed(2),
      totalValue: totalValue,
      
      // Formatted dates
      formattedStartTime: new Date(offload.startTime).toLocaleString(),
      formattedEndTime: offload.endTime ? new Date(offload.endTime).toLocaleString() : 'In Progress',
      formattedRecordedAt: offload.recordedAt ? new Date(offload.recordedAt).toLocaleString() : 'N/A',
      
      // Currency formatting
      totalValueFormatted: new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
      }).format(totalValue),
      
      unitPriceFormatted: new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
      }).format(offload.unitPrice || 0),
      
      // Status information
      statusBadge: getStatusBadge(offload.status),
      isCompleted: offload.status === 'SUCCESSFUL',
      isInProgress: offload.status === 'IN_PROGRESS',
      
      // Mobile-friendly formats
      shortStartTime: new Date(offload.startTime).toLocaleDateString('en-KE'),
      shortVehicle: offload.vehicleNumber?.replace(/\s/g, ''),
      shortProduct: offload.product?.name?.substring(0, 10) || 'N/A',
      shortStation: offload.tank?.asset?.station?.name?.split(' ')[0] || 'N/A',
      
      // Quick info for cards
      quickInfo: {
        product: offload.product?.name || 'Unknown Product',
        station: offload.tank?.asset?.station?.name || 'Unknown Station',
        supplier: offload.supplier?.name || 'Unknown Supplier',
        driver: offload.driverName || 'Unknown Driver'
      }
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
      expected: `${offload.expectedQuantity}L`,
      actual: `${offload.actualQuantity}L`,
      variance: `${offload.variance}L`,
      status: offload.status,
      startTime: new Date(offload.startTime).toLocaleDateString('en-KE'),
      
      // Mobile-optimized fields
      mobileSummary: `${offload.deliveryNoteNumber} • ${offload.vehicleNumber}`,
      mobileDetails: `${offload.product?.name} • ${offload.actualQuantity || 0}L`,
      mobileStatus: getStatusBadge(offload.status).label,
      
      // For quick actions
      canComplete: offload.status === 'IN_PROGRESS',
      canEdit: offload.status !== 'SUCCESSFUL'
    }));
  },

  // Format data for form submission
  formatForSubmission: (formData, isCompletion = false) => {
    if (isCompletion) {
      return {
        actualQuantity: parseFloat(formData.actualQuantity),
        afterDipReading: {
          dipValue: parseFloat(formData.afterDipReading.dipValue),
          volume: parseFloat(formData.afterDipReading.volume),
          temperature: formData.afterDipReading.temperature ? parseFloat(formData.afterDipReading.temperature) : null,
          waterLevel: formData.afterDipReading.waterLevel ? parseFloat(formData.afterDipReading.waterLevel) : null,
          density: formData.afterDipReading.density ? parseFloat(formData.afterDipReading.density) : null
        },
        afterPumpReadings: formData.afterPumpReadings.map(reading => ({
          pumpId: reading.pumpId,
          electricMeter: parseFloat(reading.electricMeter),
          manualMeter: reading.manualMeter ? parseFloat(reading.manualMeter) : null,
          cashMeter: reading.cashMeter ? parseFloat(reading.cashMeter) : null
        })),
        endTime: formData.endTime || new Date().toISOString(),
        notes: formData.notes || null,
        driverSignature: formData.driverSignature || null
      };
    }

    // Start offload format
    return {
      purchaseId: formData.purchaseId,
      tankId: formData.tankId,
      shiftId: formData.shiftId,
      transporterName: formData.transporterName,
      vehicleNumber: formData.vehicleNumber,
      driverName: formData.driverName,
      driverContact: formData.driverContact || null,
      waybillNumber: formData.waybillNumber || null,
      deliveryNoteNumber: formData.deliveryNoteNumber,
      expectedQuantity: parseFloat(formData.expectedQuantity),
      density: formData.density ? parseFloat(formData.density) : null,
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      waterContent: formData.waterContent ? parseFloat(formData.waterContent) : null,
      unitPrice: parseFloat(formData.unitPrice),
      taxAmount: formData.taxAmount ? parseFloat(formData.taxAmount) : null,
      transportationCost: formData.transportationCost ? parseFloat(formData.transportationCost) : null,
      supplierInvoice: formData.supplierInvoice || null,
      documentRef: formData.documentRef,
      beforeDipReading: {
        dipValue: parseFloat(formData.beforeDipReading.dipValue),
        volume: parseFloat(formData.beforeDipReading.volume),
        temperature: formData.beforeDipReading.temperature ? parseFloat(formData.beforeDipReading.temperature) : null,
        waterLevel: formData.beforeDipReading.waterLevel ? parseFloat(formData.beforeDipReading.waterLevel) : null,
        density: formData.beforeDipReading.density ? parseFloat(formData.beforeDipReading.density) : null
      },
      beforePumpReadings: (formData.beforePumpReadings || []).map(reading => ({
        pumpId: reading.pumpId,
        electricMeter: parseFloat(reading.electricMeter),
        manualMeter: reading.manualMeter ? parseFloat(reading.manualMeter) : null,
        cashMeter: reading.cashMeter ? parseFloat(reading.cashMeter) : null
      })),
      startTime: formData.startTime || new Date().toISOString()
    };
  }
};

// Helper function for status badges - UPDATED FOR BACKEND STATUSES
const getStatusBadge = (status) => {
  const statusConfig = {
    'PENDING': { color: 'gray', label: 'Pending', variant: 'secondary' },
    'IN_PROGRESS': { color: 'blue', label: 'In Progress', variant: 'warning' },
    'SUCCESSFUL': { color: 'green', label: 'Completed', variant: 'success' },
    'PARTIAL': { color: 'orange', label: 'Partial', variant: 'warning' },
    'FAILED': { color: 'red', label: 'Failed', variant: 'error' }
  };
  
  return statusConfig[status] || { color: 'gray', label: status, variant: 'secondary' };
};

// Export default service
export default fuelOffloadService;