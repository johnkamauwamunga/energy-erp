import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [ShiftReadingService]', ...args),
  info: (...args) => console.log('ℹ️ [ShiftReadingService]', ...args),
  warn: (...args) => console.warn('⚠️ [ShiftReadingService]', ...args),
  error: (...args) => console.error('❌ [ShiftReadingService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  console.log(`API Response for ${operation}:`, response);
  
  if (response && response.success !== undefined) {
    logger.debug(`${operation} successful`);
    return response;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

// Error handler utility
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
    
    if (status === 400 && data.errors) {
      const errorMessages = data.errors.map(err => err.message).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    
    if (data && data.message) {
      throw new Error(data.message);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  } else if (error.message) {
    throw error;
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

export const shiftReadingService = {
  // ==================== SHIFT READING SUMMARY ENDPOINTS ====================

  /**
   * Get pump readings summary for a specific shift
   * @param {string} shiftId - The shift ID
   * @returns {Promise} Pump readings summary with shift data
   */
  getPumpReadingsSummary: async (shiftId) => {
    logger.info(`Getting pump readings summary for shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shift-readings/shifts/${shiftId}/pump-readings-summary`);
      return handleResponse(response, 'fetching pump readings summary');
    } catch (error) {
      throw handleError(error, 'fetching pump readings summary', 'Failed to fetch pump readings summary');
    }
  },

  /**
   * Get tank readings summary for a specific shift
   * @param {string} shiftId - The shift ID
   * @returns {Promise} Tank readings summary with shift data
   */
  getTankReadingsSummary: async (shiftId) => {
    logger.info(`Getting tank readings summary for shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shift-readings/shifts/${shiftId}/tank-readings-summary`);
      return handleResponse(response, 'fetching tank readings summary');
    } catch (error) {
      throw handleError(error, 'fetching tank readings summary', 'Failed to fetch tank readings summary');
    }
  },

  /**
   * Get complete readings summary (pumps + tanks) for a specific shift
   * @param {string} shiftId - The shift ID
   * @returns {Promise} Complete readings summary with pump and tank data
   */
  getCompleteReadingsSummary: async (shiftId) => {
    logger.info(`Getting complete readings summary for shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shift-readings/shifts/${shiftId}/complete-readings-summary`);
      return handleResponse(response, 'fetching complete readings summary');
    } catch (error) {
      throw handleError(error, 'fetching complete readings summary', 'Failed to fetch complete readings summary');
    }
  },

  // ==================== STATION-LEVEL READING ENDPOINTS ====================

  /**
   * Get readings for all shifts in a station with date filtering
   * @param {string} stationId - The station ID
   * @param {Object} filters - Filter options
   * @param {string} filters.startDate - Start date for filtering
   * @param {string} filters.endDate - End date for filtering
   * @param {number} filters.page - Page number for pagination
   * @param {number} filters.limit - Items per page
   * @returns {Promise} Station shifts readings with pagination
   */
  getStationShiftsReadings: async (stationId, filters = {}) => {
    logger.info(`Getting station shifts readings for station: ${stationId}`, filters);
    
    try {
      const response = await apiService.get(`/shift-readings/stations/${stationId}/shifts-readings`, {
        params: filters
      });
      return handleResponse(response, 'fetching station shifts readings');
    } catch (error) {
      throw handleError(error, 'fetching station shifts readings', 'Failed to fetch station shifts readings');
    }
  },

  /**
   * Get pump readings summary for a specific shift in a station
   * @param {string} stationId - The station ID
   * @param {string} shiftId - The shift ID
   * @returns {Promise} Pump readings summary
   */
  getStationPumpReadingsSummary: async (stationId, shiftId) => {
    logger.info(`Getting station pump readings summary for station: ${stationId}, shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shift-readings/stations/${stationId}/shifts/${shiftId}/pump-readings-summary`);
      return handleResponse(response, 'fetching station pump readings summary');
    } catch (error) {
      throw handleError(error, 'fetching station pump readings summary', 'Failed to fetch station pump readings summary');
    }
  },

  /**
   * Get tank readings summary for a specific shift in a station
   * @param {string} stationId - The station ID
   * @param {string} shiftId - The shift ID
   * @returns {Promise} Tank readings summary
   */
  getStationTankReadingsSummary: async (stationId, shiftId) => {
    logger.info(`Getting station tank readings summary for station: ${stationId}, shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shift-readings/stations/${stationId}/shifts/${shiftId}/tank-readings-summary`);
      return handleResponse(response, 'fetching station tank readings summary');
    } catch (error) {
      throw handleError(error, 'fetching station tank readings summary', 'Failed to fetch station tank readings summary');
    }
  },

  // ==================== DATA PROCESSING & UTILITY METHODS ====================

  /**
   * Format shift data for display
   * @param {Object} shiftData - Raw shift data from API
   * @returns {Object} Formatted shift data
   */
  formatShiftData: (shiftData) => {
    if (!shiftData) return null;
    
    return {
      id: shiftData.id,
      shiftNumber: shiftData.shiftNumber,
      status: shiftData.status,
      startTime: new Date(shiftData.startTime),
      endTime: shiftData.endTime ? new Date(shiftData.endTime) : null,
      station: shiftData.station,
      supervisor: shiftData.supervisor
    };
  },

  /**
   * Calculate shift duration
   * @param {Date|string} startTime - Shift start time
   * @param {Date|string} endTime - Shift end time
   * @returns {string} Formatted duration (e.g., "8h 30m")
   */
  calculateShiftDuration: (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  },

  /**
   * Format pump reading for display
   * @param {Object} pumpData - Raw pump data from API
   * @returns {Object} Formatted pump data
   */
  formatPumpReading: (pumpData) => {
    if (!pumpData) return null;
    
    const { pumpInfo, readings } = pumpData;
    const calculated = readings.calculated;
    
    return {
      id: pumpInfo.id,
      name: pumpInfo.name,
      stationLabel: pumpInfo.stationLabel,
      product: pumpInfo.product,
      island: pumpInfo.island,
      tank: pumpInfo.tank,
      readings: {
        start: {
          electricMeter: readings.startReading.electricMeter,
          manualMeter: readings.startReading.manualMeter,
          cashMeter: readings.startReading.cashMeter,
          recordedAt: new Date(readings.startReading.recordedAt),
          recordedBy: readings.startReading.recordedBy
        },
        end: {
          electricMeter: readings.endReading.electricMeter,
          manualMeter: readings.endReading.manualMeter,
          cashMeter: readings.endReading.cashMeter,
          litersDispensed: readings.endReading.litersDispensed,
          salesValue: readings.endReading.salesValue,
          unitPrice: readings.endReading.unitPrice,
          recordedAt: new Date(readings.endReading.recordedAt),
          recordedBy: readings.endReading.recordedBy
        }
      },
      calculated: {
        litersDispensed: calculated.litersDispensed,
        salesValue: calculated.salesValue,
        unitPrice: calculated.unitPrice,
        electricDifferential: calculated.electricDifferential,
        manualDifferential: calculated.manualDifferential,
        cashDifferential: calculated.cashDifferential
      },
      formatted: {
        litersDispensed: `${calculated.litersDispensed.toLocaleString()} L`,
        salesValue: `$${calculated.salesValue.toLocaleString()}`,
        unitPrice: `$${calculated.unitPrice.toFixed(2)}`,
        electricDifferential: `${calculated.electricDifferential.toLocaleString()} L`,
        cashDifferential: `$${calculated.cashDifferential.toLocaleString()}`
      }
    };
  },

  /**
   * Format tank reading for display
   * @param {Object} tankData - Raw tank data from API
   * @returns {Object} Formatted tank data
   */
  formatTankReading: (tankData) => {
    if (!tankData) return null;
    
    const { tankInfo, readings } = tankData;
    const calculated = readings.calculated;
    
    return {
      id: tankInfo.id,
      name: tankInfo.name,
      stationLabel: tankInfo.stationLabel,
      product: tankInfo.product,
      capacity: tankInfo.capacity,
      currentVolume: tankInfo.currentVolume,
      pumps: tankInfo.pumps,
      readings: {
        start: {
          dipValue: readings.startReading.dipValue,
          volume: readings.startReading.volume,
          currentVolume: readings.startReading.currentVolume,
          temperature: readings.startReading.temperature,
          waterLevel: readings.startReading.waterLevel,
          density: readings.startReading.density,
          recordedAt: new Date(readings.startReading.recordedAt),
          recordedBy: readings.startReading.recordedBy,
          isVerified: readings.startReading.isVerified
        },
        end: {
          dipValue: readings.endReading.dipValue,
          volume: readings.endReading.volume,
          currentVolume: readings.endReading.currentVolume,
          temperature: readings.endReading.temperature,
          waterLevel: readings.endReading.waterLevel,
          density: readings.endReading.density,
          recordedAt: new Date(readings.endReading.recordedAt),
          recordedBy: readings.endReading.recordedBy,
          isVerified: readings.endReading.isVerified
        }
      },
      calculated: {
        volumeReduction: calculated.volumeReduction,
        percentageReduction: calculated.percentageReduction,
        temperatureChange: calculated.temperatureChange,
        waterLevelChange: calculated.waterLevelChange,
        densityChange: calculated.densityChange
      },
      formatted: {
        volumeReduction: `${calculated.volumeReduction.toLocaleString()} L`,
        percentageReduction: `${calculated.percentageReduction.toFixed(2)}%`,
        currentVolume: `${tankInfo.currentVolume.toLocaleString()} L`,
        capacity: `${tankInfo.capacity.toLocaleString()} L`,
        utilization: `${((tankInfo.currentVolume / tankInfo.capacity) * 100).toFixed(1)}%`
      }
    };
  },

  /**
   * Calculate overall variance analysis
   * @param {Object} completeSummary - Complete readings summary from API
   * @returns {Object} Variance analysis
   */
  calculateVarianceAnalysis: (completeSummary) => {
    if (!completeSummary || !completeSummary.summary || !completeSummary.summary.overall) {
      return null;
    }
    
    const { overall } = completeSummary.summary;
    
    return {
      pumpLiters: overall.totalPumpLitersDispensed,
      tankReduction: overall.totalTankVolumeReduction,
      variance: overall.variance,
      variancePercentage: overall.variancePercentage,
      severity: overall.varianceSeverity,
      formatted: {
        pumpLiters: `${overall.totalPumpLitersDispensed.toLocaleString()} L`,
        tankReduction: `${overall.totalTankVolumeReduction.toLocaleString()} L`,
        variance: `${overall.variance.toLocaleString()} L`,
        variancePercentage: `${overall.variancePercentage.toFixed(2)}%`
      },
      analysis: getVarianceAnalysis(overall.variancePercentage)
    };
  },

  /**
   * Get product breakdown summary
   * @param {Object} summary - Summary data from API
   * @param {string} type - 'pumps' or 'tanks'
   * @returns {Array} Formatted product breakdown
   */
  getProductBreakdown: (summary, type = 'pumps') => {
    if (!summary || !summary[type]) return [];
    
    const breakdown = summary[type].productBreakdown || [];
    
    return breakdown.map(product => ({
      name: product.productName,
      total: type === 'pumps' ? product.totalLiters : product.totalReduction,
      sales: product.totalSales || 0,
      count: product.pumpCount || product.tankCount,
      unit: type === 'pumps' ? 'L' : 'L',
      formatted: {
        total: type === 'pumps' 
          ? `${product.totalLiters.toLocaleString()} L`
          : `${product.totalReduction.toLocaleString()} L`,
        sales: product.totalSales ? `$${product.totalSales.toLocaleString()}` : 'N/A'
      }
    }));
  },

  /**
   * Generate shift readings report data
   * @param {Object} completeData - Complete readings data from API
   * @returns {Object} Report data for display/export
   */
  generateReadingsReport: (completeData) => {
    if (!completeData || !completeData.data) return null;
    
    const { shiftData, pumpsData, tanksData, summary } = completeData.data;
    
    const formattedShiftData = shiftReadingService.formatShiftData(shiftData);
    const formattedPumps = pumpsData.map(pump => shiftReadingService.formatPumpReading(pump));
    const formattedTanks = tanksData.map(tank => shiftReadingService.formatTankReading(tank));
    const varianceAnalysis = shiftReadingService.calculateVarianceAnalysis(completeData.data);
    const pumpProducts = shiftReadingService.getProductBreakdown(summary, 'pumps');
    const tankProducts = shiftReadingService.getProductBreakdown(summary, 'tanks');
    
    return {
      shift: formattedShiftData,
      pumps: {
        data: formattedPumps,
        summary: {
          total: summary.pumps.totalPumps,
          totalLiters: summary.pumps.totalLitersDispensed,
          totalSales: summary.pumps.totalSalesValue,
          avgPrice: summary.pumps.avgUnitPrice,
          formatted: {
            totalLiters: `${summary.pumps.totalLitersDispensed.toLocaleString()} L`,
            totalSales: `$${summary.pumps.totalSalesValue.toLocaleString()}`,
            avgPrice: `$${summary.pumps.avgUnitPrice.toFixed(2)}`
          }
        },
        products: pumpProducts
      },
      tanks: {
        data: formattedTanks,
        summary: {
          total: summary.tanks.totalTanks,
          totalReduction: summary.tanks.totalVolumeReduction,
          formatted: {
            totalReduction: `${summary.tanks.totalVolumeReduction.toLocaleString()} L`
          }
        },
        products: tankProducts
      },
      overall: {
        variance: varianceAnalysis,
        duration: shiftReadingService.calculateShiftDuration(shiftData.startTime, shiftData.endTime)
      }
    };
  },

  /**
   * Export shift readings to CSV format
   * @param {Object} reportData - Report data from generateReadingsReport
   * @returns {string} CSV formatted data
   */
  exportReadingsToCSV: (reportData) => {
    if (!reportData) return '';
    
    const { shift, pumps, tanks, overall } = reportData;
    const csvRows = [];
    
    // Header
    csvRows.push('Shift Readings Report');
    csvRows.push(`Shift Number,${shift.shiftNumber}`);
    csvRows.push(`Station,${shift.station.name}`);
    csvRows.push(`Company,${shift.station.company}`);
    csvRows.push(`Supervisor,${shift.supervisor ? `${shift.supervisor.firstName} ${shift.supervisor.lastName}` : 'N/A'}`);
    csvRows.push(`Start Time,${shift.startTime.toLocaleString()}`);
    csvRows.push(`End Time,${shift.endTime ? shift.endTime.toLocaleString() : 'N/A'}`);
    csvRows.push(`Duration,${overall.duration}`);
    csvRows.push(`Status,${shift.status}`);
    csvRows.push('');
    
    // Pump Summary
    csvRows.push('Pump Summary');
    csvRows.push('Total Pumps,Total Liters,Total Sales,Average Price');
    csvRows.push(`${pumps.summary.total},${pumps.summary.formatted.totalLiters},${pumps.summary.formatted.totalSales},${pumps.summary.formatted.avgPrice}`);
    csvRows.push('');
    
    // Tank Summary
    csvRows.push('Tank Summary');
    csvRows.push('Total Tanks,Total Volume Reduction');
    csvRows.push(`${tanks.summary.total},${tanks.summary.formatted.totalReduction}`);
    csvRows.push('');
    
    // Variance Analysis
    if (overall.variance) {
      csvRows.push('Variance Analysis');
      csvRows.push('Pump Liters,Tank Reduction,Variance,Variance Percentage,Severity');
      csvRows.push(`${overall.variance.formatted.pumpLiters},${overall.variance.formatted.tankReduction},${overall.variance.formatted.variance},${overall.variance.formatted.variancePercentage},${overall.variance.severity}`);
      csvRows.push('');
    }
    
    // Pump Details
    csvRows.push('Pump Details');
    csvRows.push('Pump Name,Product,Liters Dispensed,Sales Value,Unit Price,Electric Differential,Cash Differential');
    pumps.data.forEach(pump => {
      csvRows.push(`${pump.name},${pump.product?.name || 'N/A'},${pump.formatted.litersDispensed},${pump.formatted.salesValue},${pump.formatted.unitPrice},${pump.formatted.electricDifferential},${pump.formatted.cashDifferential}`);
    });
    csvRows.push('');
    
    // Tank Details
    csvRows.push('Tank Details');
    csvRows.push('Tank Name,Product,Capacity,Current Volume,Volume Reduction,Percentage Reduction,Utilization');
    tanks.data.forEach(tank => {
      csvRows.push(`${tank.name},${tank.product?.name || 'N/A'},${tank.formatted.capacity},${tank.formatted.currentVolume},${tank.formatted.volumeReduction},${tank.formatted.percentageReduction},${tank.formatted.utilization}`);
    });
    
    return csvRows.join('\n');
  },

  /**
   * Prepare filters for station shifts readings
   * @param {Object} rawFilters - Raw filter object
   * @returns {Object} Prepared filters for API
   */
  prepareStationFilters: (rawFilters = {}) => {
    const filters = { ...rawFilters };
    
    // Convert dates to ISO string if they're Date objects
    if (filters.startDate instanceof Date) {
      filters.startDate = filters.startDate.toISOString();
    }
    
    if (filters.endDate instanceof Date) {
      filters.endDate = filters.endDate.toISOString();
    }
    
    // Ensure page and limit are numbers
    if (filters.page) {
      filters.page = Number(filters.page);
    }
    
    if (filters.limit) {
      filters.limit = Number(filters.limit);
    }
    
    return filters;
  },

  /**
   * Validate shift ID
   * @param {string} shiftId - Shift ID to validate
   * @returns {boolean} True if valid
   */
  validateShiftId: (shiftId) => {
    if (!shiftId) return false;
    
    // UUID validation pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(shiftId);
  },

  /**
   * Get severity color for variance
   * @param {string} severity - Severity level (NORMAL, WARNING, CRITICAL)
   * @returns {string} Color class/token
   */
  getVarianceColor: (severity) => {
    const colors = {
      'NORMAL': 'success',
      'WARNING': 'warning',
      'CRITICAL': 'error'
    };
    
    return colors[severity] || 'default';
  },

  /**
   * Get status color for shift
   * @param {string} status - Shift status
   * @returns {string} Color class/token
   */
  getShiftStatusColor: (status) => {
    const colors = {
      'OPEN': 'success',
      'CLOSED': 'primary',
      'UNDER_REVIEW': 'warning',
      'APPROVED': 'info'
    };
    
    return colors[status] || 'default';
  }
};

// Helper function for variance analysis
function getVarianceAnalysis(variancePercentage) {
  const absVariance = Math.abs(variancePercentage);
  
  if (absVariance <= 0.5) {
    return {
      level: 'NORMAL',
      message: 'Variance is within acceptable limits',
      description: 'Pump sales and tank reductions are well-matched'
    };
  } else if (absVariance <= 1.0) {
    return {
      level: 'WARNING',
      message: 'Minor variance detected',
      description: 'Review recommended for quality control'
    };
  } else if (absVariance <= 3.0) {
    return {
      level: 'CONCERN',
      message: 'Significant variance detected',
      description: 'Investigation required - check for leaks or measurement errors'
    };
  } else {
    return {
      level: 'CRITICAL',
      message: 'Critical variance detected',
      description: 'Immediate investigation required - possible major leak or data error'
    };
  }
}

export default shiftReadingService;