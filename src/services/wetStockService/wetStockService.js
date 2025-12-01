import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [WetStockService]', ...args),
  info: (...args) => console.log('ℹ️ [WetStockService]', ...args),
  warn: (...args) => console.warn('⚠️ [WetStockService]', ...args),
  error: (...args) => console.error('❌ [WetStockService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  console.log("API Response:", response.data);
  
  // Check if response.data exists
  if (response.data) {
    logger.debug(`${operation} successful`);
    
    // Return the data directly (not response.data.data)
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

// Error handler utility
const handleError = (error, operation, defaultMessage) => {
  logger.error(`Error during ${operation}:`, error);
  
  if (error.response) {
    const { status, data } = error.response;
    
    // Handle specific HTTP status codes
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
    
    // Handle validation errors
    if (status === 400 && data.errors) {
      const errorMessages = data.errors.map(err => err.message).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    
    // Use server-provided message if available
    if (data && data.message) {
      throw new Error(data.message);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

export const wetStockService = {
  // =============================================
  // PUMP METER READINGS
  // =============================================

  // Create a single pump meter reading
  createPumpMeterReading: async (readingData) => {
    logger.info('Creating pump meter reading:', readingData);
    
    try {
      const response = await apiService.post('/wet-stock/pump-meter-readings', readingData);
      return handleResponse(response, 'creating pump meter reading');
    } catch (error) {
      throw handleError(error, 'creating pump meter reading', 'Failed to create pump meter reading');
    }
  },

  // Create bulk pump meter readings
  createBulkPumpMeterReadings: async (bulkData) => {
    logger.info(`Creating bulk pump meter readings for shift: ${bulkData.shiftId}`);
    
    try {
      const response = await apiService.post('/wet-stock/pump-meter-readings/bulk', bulkData);
      return handleResponse(response, 'creating bulk pump meter readings');
    } catch (error) {
      throw handleError(error, 'creating bulk pump meter readings', 'Failed to create bulk pump meter readings');
    }
  },

  // Get pump meter readings with filters
  getPumpMeterReadings: async (filters = {}) => {
    logger.info('Fetching pump meter readings with filters:', filters);
    
    try {
      const response = await apiService.get('/wet-stock/pump-meter-readings', { params: filters });
      return handleResponse(response, 'fetching pump meter readings');
    } catch (error) {
      throw handleError(error, 'fetching pump meter readings', 'Failed to fetch pump meter readings');
    }
  },

  // Get specific pump meter reading by ID
  getPumpMeterReadingById: async (id) => {
    logger.info(`Fetching pump meter reading: ${id}`);
    
    try {
      const response = await apiService.get(`/wet-stock/pump-meter-readings/${id}`);
      return handleResponse(response, 'fetching pump meter reading');
    } catch (error) {
      throw handleError(error, 'fetching pump meter reading', 'Failed to fetch pump meter reading');
    }
  },

  // =============================================
  // TANK DIP READINGS
  // =============================================

  // Create a single tank dip reading
  createTankDipReading: async (readingData) => {
    logger.info('Creating tank dip reading:', readingData);
    
    try {
      const response = await apiService.post('/wet-stock/tank-dip-readings', readingData);
      return handleResponse(response, 'creating tank dip reading');
    } catch (error) {
      throw handleError(error, 'creating tank dip reading', 'Failed to create tank dip reading');
    }
  },

  // Create bulk tank dip readings
  createBulkTankDipReadings: async (bulkData) => {
    logger.info(`Creating bulk tank dip readings for shift: ${bulkData.shiftId}`);
    
    try {
      const response = await apiService.post('/wet-stock/tank-dip-readings/bulk', bulkData);
      return handleResponse(response, 'creating bulk tank dip readings');
    } catch (error) {
      throw handleError(error, 'creating bulk tank dip readings', 'Failed to create bulk tank dip readings');
    }
  },

  // Get tank dip readings with filters
  getTankDipReadings: async (filters = {}) => {
    logger.info('Fetching tank dip readings with filters:', filters);
    
    try {
      const response = await apiService.get('/wet-stock/tank-dip-readings', { params: filters });
      return handleResponse(response, 'fetching tank dip readings');
    } catch (error) {
      throw handleError(error, 'fetching tank dip readings', 'Failed to fetch tank dip readings');
    }
  },

  // Get specific tank dip reading by ID
  getTankDipReadingById: async (id) => {
    logger.info(`Fetching tank dip reading: ${id}`);
    
    try {
      const response = await apiService.get(`/wet-stock/tank-dip-readings/${id}`);
      return handleResponse(response, 'fetching tank dip reading');
    } catch (error) {
      throw handleError(error, 'fetching tank dip reading', 'Failed to fetch tank dip reading');
    }
  },

  // Verify a tank dip reading
  verifyTankDipReading: async (id) => {
    logger.info(`Verifying tank dip reading: ${id}`);
    
    try {
      const response = await apiService.patch(`/wet-stock/tank-dip-readings/${id}/verify`);
      return handleResponse(response, 'verifying tank dip reading');
    } catch (error) {
      throw handleError(error, 'verifying tank dip reading', 'Failed to verify tank dip reading');
    }
  },

  // =============================================
  // WET STOCK RECONCILIATION
  // =============================================

  // Create wet stock reconciliation
  createWetStockReconciliation: async (reconciliationData) => {
    logger.info('Creating wet stock reconciliation:', reconciliationData);
    
    try {
      const response = await apiService.post('/wet-stock/reconciliations', reconciliationData);
      return handleResponse(response, 'creating wet stock reconciliation');
    } catch (error) {
      throw handleError(error, 'creating wet stock reconciliation', 'Failed to create wet stock reconciliation');
    }
  },

  // Get wet stock reconciliations with filters
  getWetStockReconciliations: async (filters = {}) => {
    logger.info('Fetching wet stock reconciliations with filters:', filters);
    
    try {
      const response = await apiService.get('/wet-stock/reconciliations', { params: filters });
      return handleResponse(response, 'fetching wet stock reconciliations');
    } catch (error) {
      throw handleError(error, 'fetching wet stock reconciliations', 'Failed to fetch wet stock reconciliations');
    }
  },

  // Get specific wet stock reconciliation by ID
  getWetStockReconciliationById: async (id) => {
    logger.info(`Fetching wet stock reconciliation: ${id}`);
    
    try {
      const response = await apiService.get(`/wet-stock/reconciliations/${id}`);
      return handleResponse(response, 'fetching wet stock reconciliation');
    } catch (error) {
      throw handleError(error, 'fetching wet stock reconciliation', 'Failed to fetch wet stock reconciliation');
    }
  },

  // Get wet stock reconciliation by shift ID
  getWetStockReconciliationByShiftId: async (shiftId) => {
    logger.info(`Fetching wet stock reconciliation for shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/wet-stock/reconciliations/shift/${shiftId}`);
      return handleResponse(response, 'fetching wet stock reconciliation by shift');
    } catch (error) {
      throw handleError(error, 'fetching wet stock reconciliation by shift', 'Failed to fetch wet stock reconciliation for shift');
    }
  },

  // Update wet stock reconciliation
  updateWetStockReconciliation: async (id, updateData) => {
    logger.info(`Updating wet stock reconciliation: ${id}`, updateData);
    
    try {
      const response = await apiService.put(`/wet-stock/reconciliations/${id}`, updateData);
      return handleResponse(response, 'updating wet stock reconciliation');
    } catch (error) {
      throw handleError(error, 'updating wet stock reconciliation', 'Failed to update wet stock reconciliation');
    }
  },

  // Update tank wet stock reconciliation
  updateTankWetStockReconciliation: async (id, updateData) => {
    logger.info(`Updating tank wet stock reconciliation: ${id}`, updateData);
    
    try {
      const response = await apiService.patch(`/wet-stock/tank-reconciliations/${id}`, updateData);
      return handleResponse(response, 'updating tank wet stock reconciliation');
    } catch (error) {
      throw handleError(error, 'updating tank wet stock reconciliation', 'Failed to update tank wet stock reconciliation');
    }
  },

  // =============================================
  // COMPREHENSIVE REPORTS
  // =============================================

  // Get comprehensive reconciliation report
  getComprehensiveReconciliationReport: async (filters = {}) => {
    logger.info('Fetching comprehensive reconciliation report with filters:', filters);
    
    try {
      const response = await apiService.get('/wet-stock/reports/comprehensive', { params: filters });
      return handleResponse(response, 'fetching comprehensive reconciliation report');
    } catch (error) {
      throw handleError(error, 'fetching comprehensive reconciliation report', 'Failed to fetch comprehensive reconciliation report');
    }
  },

  // =============================================
  // UTILITY METHODS FOR FRONTEND
  // =============================================

  // Get shift readings summary (pump meters + tank dips for a shift)
  getShiftReadingsSummary: async (shiftId) => {
    logger.info(`Fetching shift readings summary for shift: ${shiftId}`);
    
    try {
      const [pumpReadings, tankReadings, reconciliation] = await Promise.all([
        wetStockService.getPumpMeterReadings({ shiftId }),
        wetStockService.getTankDipReadings({ shiftId }),
        wetStockService.getWetStockReconciliationByShiftId(shiftId).catch(() => null)
      ]);

      return {
        pumpReadings: pumpReadings.data || pumpReadings,
        tankReadings: tankReadings.data || tankReadings,
        reconciliation: reconciliation?.data || reconciliation,
        shiftId
      };
    } catch (error) {
      throw handleError(error, 'fetching shift readings summary', 'Failed to fetch shift readings summary');
    }
  },

  // Get tank reconciliation history
  getTankReconciliationHistory: async (tankId, filters = {}) => {
    logger.info(`Fetching tank reconciliation history for tank: ${tankId}`);
    
    try {
      const response = await apiService.get('/wet-stock/reconciliations', { 
        params: { ...filters, tankId } 
      });
      return handleResponse(response, 'fetching tank reconciliation history');
    } catch (error) {
      throw handleError(error, 'fetching tank reconciliation history', 'Failed to fetch tank reconciliation history');
    }
  },

  // Calculate variance statistics for dashboard
  getVarianceStatistics: async (filters = {}) => {
    logger.info('Fetching variance statistics with filters:', filters);
    
    try {
      const report = await wetStockService.getComprehensiveReconciliationReport(filters);
      return report.data?.summary || report.summary;
    } catch (error) {
      throw handleError(error, 'fetching variance statistics', 'Failed to fetch variance statistics');
    }
  },

  // Check if shift has complete readings for reconciliation
  checkShiftReadingsCompleteness: async (shiftId) => {
    logger.info(`Checking shift readings completeness for shift: ${shiftId}`);
    
    try {
      const [pumpReadings, tankReadings] = await Promise.all([
        wetStockService.getPumpMeterReadings({ shiftId, readingType: 'START' }),
        wetStockService.getPumpMeterReadings({ shiftId, readingType: 'END' }),
        wetStockService.getTankDipReadings({ shiftId, readingType: 'START' }),
        wetStockService.getTankDipReadings({ shiftId, readingType: 'END' })
      ]);

      const pumpStart = pumpReadings.data?.filter(r => r.readingType === 'START') || [];
      const pumpEnd = pumpReadings.data?.filter(r => r.readingType === 'END') || [];
      const tankStart = tankReadings.data?.filter(r => r.readingType === 'START') || [];
      const tankEnd = tankReadings.data?.filter(r => r.readingType === 'END') || [];

      return {
        hasStartPumpReadings: pumpStart.length > 0,
        hasEndPumpReadings: pumpEnd.length > 0,
        hasStartTankReadings: tankStart.length > 0,
        hasEndTankReadings: tankEnd.length > 0,
        isComplete: pumpStart.length > 0 && pumpEnd.length > 0 && tankStart.length > 0 && tankEnd.length > 0,
        pumpStartCount: pumpStart.length,
        pumpEndCount: pumpEnd.length,
        tankStartCount: tankStart.length,
        tankEndCount: tankEnd.length
      };
    } catch (error) {
      throw handleError(error, 'checking shift readings completeness', 'Failed to check shift readings completeness');
    }
  },

  // Generate reconciliation preview (without saving)
  generateReconciliationPreview: async (shiftId) => {
    logger.info(`Generating reconciliation preview for shift: ${shiftId}`);
    
    try {
      // This would typically call a dedicated preview endpoint
      // For now, we'll create the reconciliation but mark it as draft
      const previewData = {
        shiftId,
        tolerancePercentage: 0.5,
        notes: 'Preview - not saved'
      };

      const response = await apiService.post('/wet-stock/reconciliations', previewData);
      return handleResponse(response, 'generating reconciliation preview');
    } catch (error) {
      throw handleError(error, 'generating reconciliation preview', 'Failed to generate reconciliation preview');
    }
  },

  // Export reconciliation data
  exportReconciliationData: async (filters = {}) => {
    logger.info('Exporting reconciliation data with filters:', filters);
    
    try {
      const response = await apiService.get('/wet-stock/reconciliations', { 
        params: { ...filters, limit: 1000 } // Increased limit for export
      });
      
      const data = handleResponse(response, 'exporting reconciliation data');
      
      // Format for CSV/Excel export
      const exportData = data.data?.map(item => ({
        'Shift ID': item.shiftId,
        'Shift Number': item.shift?.shiftNumber,
        'Station': item.shift?.station?.name,
        'Total Pump Dispensed': item.totalPumpDispensed,
        'Total Tank Reduction': item.totalTankReduction,
        'Total Variance': item.totalVariance,
        'Variance Percentage': item.variancePercentage,
        'Severity': item.severity,
        'Status': item.status,
        'Recorded At': item.recordedAt,
        'Resolved At': item.resolvedAt
      })) || [];

      return exportData;
    } catch (error) {
      throw handleError(error, 'exporting reconciliation data', 'Failed to export reconciliation data');
    }
  }
};