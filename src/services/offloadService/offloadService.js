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
  validateOffloadData: (offloadData) => {
    const errors = [];
    
    // Required fields from backend schema
    if (!offloadData.purchaseId) errors.push('Purchase ID is required');
    if (!offloadData.productId) errors.push('Product ID is required'); // NEW: Required by backend
    if (!offloadData.stationId) errors.push('Station ID is required'); // NEW: Required by backend
    if (!offloadData.tankId) errors.push('Tank ID is required');
    if (!offloadData.shiftId) errors.push('Shift ID is required');
    if (!offloadData.deliveryNoteNumber) errors.push('Delivery note number is required');
    if (!offloadData.vehicleNumber) errors.push('Vehicle number is required');
    if (!offloadData.driverName) errors.push('Driver name is required');
    if (!offloadData.transporterName) errors.push('Transporter name is required');
    if (!offloadData.documentRef) errors.push('Document reference is required');
    
    // Quantities and pricing
    if (!offloadData.expectedQuantity || offloadData.expectedQuantity <= 0) {
      errors.push('Expected quantity must be positive');
    }
    
    if (!offloadData.unitPrice || offloadData.unitPrice <= 0) {
      errors.push('Unit price must be positive');
    }
    
    // Dip reading validation
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
    
    // Pump readings are optional at start
    if (offloadData.beforePumpReadings) {
      offloadData.beforePumpReadings.forEach((reading, index) => {
        if (!reading.pumpId) errors.push(`Pump ${index + 1}: Pump ID is required`);
        if (reading.electricMeter === undefined || reading.electricMeter === null) {
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
        if (reading.electricMeter === undefined || reading.electricMeter === null) {
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

// Main service - UPDATED TO MATCH BACKEND ENDPOINTS EXACTLY
export const fuelOffloadService = {
  // Start a new fuel offload - MATCHES BACKEND SCHEMA
  startOffload: async (offloadData) => {
    logger.info('Starting fuel offload:', offloadData);
    
    const validation = offloadValidators.validateOffloadData(offloadData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    try {
      // Format data to match backend schema exactly
      const formattedData = offloadFormatters.formatForSubmission(offloadData, false);
      const response = await apiService.post('/fuel-offloads', formattedData);
      return handleResponse(response, 'starting fuel offload');
    } catch (error) {
      throw handleError(error, 'starting fuel offload', 'Failed to start fuel offload');
    }
  },

  // Complete an offload - MATCHES BACKEND SCHEMA
  completeOffload: async (offloadId, completionData) => {
    logger.info(`Completing offload ${offloadId}:`, completionData);
    
    const validation = offloadValidators.validateCompletionData(completionData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    try {
      // Format data to match backend schema exactly
      const formattedData = offloadFormatters.formatForSubmission(completionData, true);
      const response = await apiService.post(`/fuel-offloads/${offloadId}/complete`, formattedData);
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

  // Get paginated offloads with filtering - MATCHES BACKEND QUERY SCHEMA
  getOffloads: async (filters = {}) => {
    logger.info('Fetching offloads with filters:', filters);
    
    // Default parameters that match backend schema
    const defaultParams = {
      page: 1,
      limit: 20,
      sortBy: 'startTime',
      sortOrder: 'desc'
    };
    
    // Map frontend filters to backend query parameters
    const backendFilters = {
      ...defaultParams,
      ...filters,
      // Convert date formats if needed
      startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
      endDate: filters.endDate ? new Date(filters.endDate).toISOString() : undefined
    };
    
    // Remove undefined values
    Object.keys(backendFilters).forEach(key => {
      if (backendFilters[key] === undefined || backendFilters[key] === '') {
        delete backendFilters[key];
      }
    });
    
    try {
      const response = await apiService.get('/fuel-offloads', { 
        params: backendFilters
      });
      return handleResponse(response, 'fetching offloads');
    } catch (error) {
      throw handleError(error, 'fetching offloads', 'Failed to fetch fuel offloads');
    }
  },

  // Update offload - MATCHES BACKEND UPDATE SCHEMA
  updateOffload: async (offloadId, updateData) => {
    logger.info(`Updating offload ${offloadId}:`, updateData);
    
    try {
      const response = await apiService.patch(`/fuel-offloads/${offloadId}`, updateData);
      return handleResponse(response, 'updating offload');
    } catch (error) {
      throw handleError(error, 'updating offload', 'Failed to update fuel offload');
    }
  },

  // Get offloads by purchase ID - MATCHES BACKEND ENDPOINT
  getOffloadsByPurchase: async (purchaseId, filters = {}) => {
    logger.info(`Fetching offloads for purchase: ${purchaseId}`, filters);
    
    try {
      const response = await apiService.get(`/fuel-offloads/purchase/${purchaseId}`, {
        params: { ...filters, page: 1, limit: 100 } // Default to get all for a purchase
      });
      return handleResponse(response, 'fetching offloads by purchase');
    } catch (error) {
      throw handleError(error, 'fetching offloads by purchase', 'Failed to fetch offloads for purchase');
    }
  },

  // Get offloads by supplier - NEW ENDPOINT
  getOffloadsBySupplier: async (supplierId, filters = {}) => {
    logger.info(`Fetching offloads for supplier: ${supplierId}`, filters);
    
    try {
      const response = await apiService.get(`/fuel-offloads/supplier/${supplierId}`, {
        params: filters
      });
      return handleResponse(response, 'fetching offloads by supplier');
    } catch (error) {
      throw handleError(error, 'fetching offloads by supplier', 'Failed to fetch offloads by supplier');
    }
  },

  // Get offloads by station - NEW ENDPOINT
  getOffloadsByStation: async (stationId, filters = {}) => {
    logger.info(`Fetching offloads for station: ${stationId}`, filters);
    
    try {
      const response = await apiService.get(`/fuel-offloads/station/${stationId}`, {
        params: filters
      });
      return handleResponse(response, 'fetching offloads by station');
    } catch (error) {
      throw handleError(error, 'fetching offloads by station', 'Failed to fetch offloads for station');
    }
  },

  // Get offloads by product - NEW ENDPOINT
  getOffloadsByProduct: async (productId, filters = {}) => {
    logger.info(`Fetching offloads for product: ${productId}`, filters);
    
    try {
      const response = await apiService.get(`/fuel-offloads/product/${productId}`, {
        params: filters
      });
      return handleResponse(response, 'fetching offloads by product');
    } catch (error) {
      throw handleError(error, 'fetching offloads by product', 'Failed to fetch offloads by product');
    }
  },

  // Get offload summary for dashboard - MATCHES BACKEND ENDPOINT
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

  // Get offload analytics - NEW ENDPOINT
  getOffloadAnalytics: async (filters = {}) => {
    logger.info('Fetching offload analytics:', filters);
    
    try {
      const response = await apiService.get('/fuel-offloads/analytics/summary', {
        params: filters
      });
      return handleResponse(response, 'fetching offload analytics');
    } catch (error) {
      throw handleError(error, 'fetching offload analytics', 'Failed to fetch offload analytics');
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
  }
};

// Data formatting utilities - UPDATED FOR BACKEND RESPONSE STRUCTURE
export const offloadFormatters = {
  formatOffloadForDisplay: (offload) => {
    if (!offload) return null;
    
    // Use backend-calculated values if available, otherwise calculate
    const variance = offload.variance !== undefined ? offload.variance : 
                    offloadCalculations.calculateVariance(offload.expectedQuantity, offload.actualQuantity);
    
    const variancePercentage = offloadCalculations.calculateVariancePercentage(
      offload.expectedQuantity, 
      offload.actualQuantity
    );
    
    const totalValue = offload.totalValue || 
                      offloadCalculations.calculateTotalValue(offload.actualQuantity, offload.unitPrice);

    // Map backend status to display values
    const statusDisplay = {
      'UNLOADING': { label: 'Unloading', color: 'blue', variant: 'warning' },
      'FULLY_ACCEPTED': { label: 'Fully Accepted', color: 'green', variant: 'success' },
      'PARTIALLY_ACCEPTED': { label: 'Partially Accepted', color: 'orange', variant: 'warning' },
      'REJECTED': { label: 'Rejected', color: 'red', variant: 'error' }
    };

    const statusInfo = statusDisplay[offload.status] || { label: offload.status, color: 'gray', variant: 'secondary' };

    return {
      ...offload,
      // Calculations
      variance: variance,
      variancePercentage: variancePercentage.toFixed(2),
      totalValue: totalValue,
      
      // Status information
      statusDisplay: statusInfo.label,
      statusColor: statusInfo.color,
      statusVariant: statusInfo.variant,
      isCompleted: offload.status === 'FULLY_ACCEPTED' || offload.status === 'PARTIALLY_ACCEPTED',
      isInProgress: offload.status === 'UNLOADING',
      
      // Formatted dates
      formattedStartTime: offload.startTime ? new Date(offload.startTime).toLocaleString() : 'N/A',
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
      
      // Quick info for display
      productName: offload.product?.name || offload.purchaseItem?.product?.name || 'Unknown Product',
      stationName: offload.tank?.asset?.station?.name || offload.purchaseItem?.station?.name || 'Unknown Station',
      supplierName: offload.supplier?.name || 'Unknown Supplier',
      
      // Mobile-friendly formats
      shortStartTime: offload.startTime ? new Date(offload.startTime).toLocaleDateString('en-KE') : 'N/A',
      shortVehicle: offload.vehicleNumber?.replace(/\s/g, '') || 'N/A',
      
      // Quick info for cards
      quickInfo: {
        product: offload.product?.name || offload.purchaseItem?.product?.name || 'Unknown Product',
        station: offload.tank?.asset?.station?.name || offload.purchaseItem?.station?.name || 'Unknown Station',
        supplier: offload.supplier?.name || 'Unknown Supplier',
        driver: offload.driverName || 'Unknown Driver'
      }
    };
  },

  formatForMobileTable: (offloads) => {
    return offloads.map(offload => {
      const formatted = offloadFormatters.formatOffloadForDisplay(offload);
      
      return {
        id: offload.id,
        deliveryNote: offload.deliveryNoteNumber,
        vehicle: offload.vehicleNumber,
        driver: offload.driverName,
        product: formatted.productName,
        station: formatted.stationName,
        expected: `${offload.expectedQuantity}L`,
        actual: `${offload.actualQuantity || 0}L`,
        variance: `${formatted.variance}L`,
        status: formatted.statusDisplay,
        startTime: formatted.shortStartTime,
        
        // Mobile-optimized fields
        mobileSummary: `${offload.deliveryNoteNumber} • ${offload.vehicleNumber}`,
        mobileDetails: `${formatted.productName} • ${offload.actualQuantity || 0}L`,
        mobileStatus: formatted.statusDisplay,
        
        // For quick actions
        canComplete: offload.status === 'UNLOADING',
        canEdit: offload.status !== 'FULLY_ACCEPTED' && offload.status !== 'REJECTED'
      };
    });
  },

  // Format data for form submission - UPDATED TO MATCH BACKEND SCHEMA EXACTLY
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
        afterPumpReadings: (formData.afterPumpReadings || []).map(reading => ({
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

    // Start offload format - MATCHES FuelOffloadCreateSchema EXACTLY
    return {
      purchaseId: formData.purchaseId,
      productId: formData.productId, // REQUIRED by backend
      stationId: formData.stationId, // REQUIRED by backend
      tankId: formData.tankId,
      shiftId: formData.shiftId,
      
      // Delivery information
      transporterName: formData.transporterName,
      vehicleNumber: formData.vehicleNumber,
      driverName: formData.driverName,
      driverContact: formData.driverContact || null,
      waybillNumber: formData.waybillNumber || null,
      deliveryNoteNumber: formData.deliveryNoteNumber,
      
      // Quantities
      expectedQuantity: parseFloat(formData.expectedQuantity),
      
      // Quality control
      density: formData.density ? parseFloat(formData.density) : null,
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      waterContent: formData.waterContent ? parseFloat(formData.waterContent) : null,
      
      // Financials
      unitPrice: parseFloat(formData.unitPrice),
      taxAmount: formData.taxAmount ? parseFloat(formData.taxAmount) : null,
      transportationCost: formData.transportationCost ? parseFloat(formData.transportationCost) : null,
      
      // Documentation
      supplierInvoice: formData.supplierInvoice || null,
      documentRef: formData.documentRef,
      
      // Pre-offload readings
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

// Export default service
export default fuelOffloadService;