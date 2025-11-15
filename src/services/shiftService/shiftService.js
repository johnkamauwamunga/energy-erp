import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [ShiftService]', ...args),
  info: (...args) => console.log('ℹ️ [ShiftService]', ...args),
  warn: (...args) => console.warn('⚠️ [ShiftService]', ...args),
  error: (...args) => console.error('❌ [ShiftService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  console.log("API Response:", response.data);
  
  if (response.data) {
    logger.debug(`${operation} successful`);
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
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

export const shiftService = {
  // ==================== SHIFT CREATION & OPENING ====================

  /**
   * Create a new shift (basic info only)
   */
  createShift: async (shiftData) => {
    logger.info('Creating shift:', shiftData);
    
    try {
      const response = await apiService.post('/shifts', shiftData);
      return handleResponse(response, 'creating shift');
    } catch (error) {
      throw handleError(error, 'creating shift', 'Failed to create shift');
    }
  },

  /**
   * Open a shift with island assignments and initial readings
   */
  openShift: async (shiftId, openData) => {
    logger.info(`Opening shift ${shiftId}:`, openData);
    
    try {
      const response = await apiService.post(`/shifts/${shiftId}/open`, openData);
      return handleResponse(response, 'opening shift');
    } catch (error) {
      throw handleError(error, 'opening shift', 'Failed to open shift');
    }
  },

  /**
   * Close a shift with all required data
   */
  closeShift: async (shiftId, closeData) => {
    logger.info(`Closing shift ${shiftId}:`, closeData);
    
    try {
      const response = await apiService.post(`/shifts/${shiftId}/close`, closeData);
      return handleResponse(response, 'closing shift');
    } catch (error) {
      throw handleError(error, 'closing shift', 'Failed to close shift');
    }
  },

  // ==================== SHIFT QUERY ENDPOINTS ====================

  /**
   * Get all shifts with filtering and pagination
   */
  getAllShifts: async (filters = {}) => {
    logger.info('Fetching all shifts with filters:', filters);
    
    try {
      const response = await apiService.get('/shifts', { params: filters });
      return handleResponse(response, 'fetching all shifts');
    } catch (error) {
      throw handleError(error, 'fetching all shifts', 'Failed to fetch shifts');
    }
  },

  /**
   * Get current open shift for a station
   */
  getCurrentShift: async (stationId) => {
    logger.info(`Fetching current shift for station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/shifts/current/${stationId}`);
      return handleResponse(response, 'fetching current shift');
    } catch (error) {
      throw handleError(error, 'fetching current shift', 'Failed to fetch current shift');
    }
  },

  /**
   * Get open shift for a station
   */
  getOpenShift: async (stationId) => {
    logger.info(`Fetching open shift for station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/shifts/stations/${stationId}/open-shift`);
      console.log("the shift bit response ",response);
      return handleResponse(response, 'fetching open shift');
    } catch (error) {
      throw handleError(error, 'fetching open shift', 'Failed to fetch open shift');
    }
  },

  /**
   * Get open shift with full details including attendants and readings
   */
  getOpenShiftFullDetails: async (stationId) => {
    logger.info(`Fetching open shift full details for station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/shifts/stations/${stationId}/open-shift-full`);
      return handleResponse(response, 'fetching open shift full details');
    } catch (error) {
      throw handleError(error, 'fetching open shift full details', 'Failed to fetch open shift details');
    }
  },

  /**
   * Get the most recent closed shift with all readings and data
   */
  getPreviousClosedShift: async (stationId) => {
    logger.info(`Fetching previous closed shift for station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/shifts/stations/${stationId}/previous-shift`);
      return handleResponse(response, 'fetching previous closed shift');
    } catch (error) {
      throw handleError(error, 'fetching previous closed shift', 'Failed to fetch previous shift');
    }
  },

  // ==================== SHIFT DETAIL ENDPOINTS ====================

  /**
   * Get shift details by ID
   */
  getShiftById: async (shiftId) => {
    logger.info(`Fetching shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}`);
      return handleResponse(response, 'fetching shift by ID');
    } catch (error) {
      throw handleError(error, 'fetching shift by ID', 'Failed to fetch shift');
    }
  },

  /**
   * Get comprehensive shift status
   */
  getShiftStatus: async (shiftId) => {
    logger.info(`Fetching shift status: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}/status`);
      return handleResponse(response, 'fetching shift status');
    } catch (error) {
      throw handleError(error, 'fetching shift status', 'Failed to fetch shift status');
    }
  },

  /**
   * Get complete shift data with all related information
   */
  getShiftCompleteData: async (shiftId) => {
    logger.info(`Fetching complete shift data: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}/complete`);
      return handleResponse(response, 'fetching complete shift data');
    } catch (error) {
      throw handleError(error, 'fetching complete shift data', 'Failed to fetch complete shift data');
    }
  },

  // ==================== SALES & REPORTING ENDPOINTS ====================

  /**
   * Get shift sales breakdown by product
   */
  getShiftSalesByProduct: async (shiftId) => {
    logger.info(`Fetching shift sales by product: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}/sales-by-product`);
      return handleResponse(response, 'fetching shift sales by product');
    } catch (error) {
      throw handleError(error, 'fetching shift sales by product', 'Failed to fetch shift sales by product');
    }
  },

  /**
   * Get pump sales details for a shift
   */
  getPumpSalesByShift: async (shiftId) => {
    logger.info(`Fetching pump sales for shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}/pump-sales`);
      return handleResponse(response, 'fetching pump sales by shift');
    } catch (error) {
      throw handleError(error, 'fetching pump sales by shift', 'Failed to fetch pump sales');
    }
  },

  /**
   * Get detailed product sales report
   */
  getProductSalesReport: async (shiftId) => {
    logger.info(`Fetching product sales report: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}/product-sales-report`);
      return handleResponse(response, 'fetching product sales report');
    } catch (error) {
      throw handleError(error, 'fetching product sales report', 'Failed to fetch product sales report');
    }
  },

  // ==================== RECONCILIATION ENDPOINTS ====================

  /**
   * Get comprehensive reconciliation report
   */
  getReconciliationReport: async (shiftId) => {
    logger.info(`Fetching reconciliation report: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}/reconciliation-report`);
      return handleResponse(response, 'fetching reconciliation report');
    } catch (error) {
      throw handleError(error, 'fetching reconciliation report', 'Failed to fetch reconciliation report');
    }
  },

  /**
   * Get wet stock reconciliation report
   */
  getWetStockReport: async (shiftId) => {
    logger.info(`Fetching wet stock report: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}/wet-stock-report`);
      return handleResponse(response, 'fetching wet stock report');
    } catch (error) {
      throw handleError(error, 'fetching wet stock report', 'Failed to fetch wet stock report');
    }
  },

  /**
   * Generate wet stock reconciliation report with filters
   */
  generateWetStockReport: async (filters) => {
    logger.info('Generating wet stock report with filters:', filters);
    
    try {
      const response = await apiService.get('/shifts/wet-stock-report', { params: filters });
      return handleResponse(response, 'generating wet stock report');
    } catch (error) {
      throw handleError(error, 'generating wet stock report', 'Failed to generate wet stock report');
    }
  },

  // ==================== PUMP & TANK READING ENDPOINTS ====================

  /**
   * Get single pump with last END reading
   */
  getPumpWithLastEndReading: async (pumpId) => {
    logger.info(`Fetching pump with last END reading: ${pumpId}`);
    
    try {
      const response = await apiService.get(`/shifts/pumps/${pumpId}/last-reading`);
      return handleResponse(response, 'fetching pump with last END reading');
    } catch (error) {
      throw handleError(error, 'fetching pump with last END reading', 'Failed to fetch pump reading');
    }
  },

  /**
   * Get single tank with last END reading
   */
  getTankWithLastEndReading: async (tankId) => {
    logger.info(`Fetching tank with last END reading: ${tankId}`);
    
    try {
      const response = await apiService.get(`/shifts/tanks/${tankId}/last-reading`);
      return handleResponse(response, 'fetching tank with last END reading');
    } catch (error) {
      throw handleError(error, 'fetching tank with last END reading', 'Failed to fetch tank reading');
    }
  },

  /**
   * Get multiple pumps with their last END readings
   */
  getMultiplePumpsWithLastEndReadings: async (pumpIds) => {
    logger.info(`Fetching last END readings for ${pumpIds.length} pumps`);
    
    try {
      const response = await apiService.post('/shifts/pumps/bulk-last-readings', { pumpIds });
      return handleResponse(response, 'fetching multiple pumps with last END readings');
    } catch (error) {
      throw handleError(error, 'fetching multiple pumps with last END readings', 'Failed to fetch pump readings');
    }
  },

  /**
   * Get multiple tanks with their last END readings
   */
  getMultipleTanksWithLastEndReadings: async (tankIds) => {
    logger.info(`Fetching last END readings for ${tankIds.length} tanks`);
    
    try {
      const response = await apiService.post('/shifts/tanks/bulk-last-readings', { tankIds });
      return handleResponse(response, 'fetching multiple tanks with last END readings');
    } catch (error) {
      throw handleError(error, 'fetching multiple tanks with last END readings', 'Failed to fetch tank readings');
    }
  },

  /**
   * Get all pumps for a station with their last END readings
   */
  getStationPumpsWithLastEndReadings: async (stationId) => {
    logger.info(`Fetching all pumps with last END readings for station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/shifts/stations/${stationId}/pumps-last-readings`);
      return handleResponse(response, 'fetching station pumps with last END readings');
    } catch (error) {
      throw handleError(error, 'fetching station pumps with last END readings', 'Failed to fetch station pumps');
    }
  },

  /**
   * Get all tanks for a station with their last END readings
   */
  getStationTanksWithLastEndReadings: async (stationId) => {
    logger.info(`Fetching all tanks with last END readings for station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/shifts/stations/${stationId}/tanks-last-readings`);
      return handleResponse(response, 'fetching station tanks with last END readings');
    } catch (error) {
      throw handleError(error, 'fetching station tanks with last END readings', 'Failed to fetch station tanks');
    }
  },

  // ==================== ANALYSIS ENDPOINTS ====================

  /**
   * Get detailed pump readings analysis
   */
  getPumpReadingsAnalysis: async (shiftId) => {
    logger.info(`Fetching pump readings analysis: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}/pump-analysis`);
      return handleResponse(response, 'fetching pump readings analysis');
    } catch (error) {
      throw handleError(error, 'fetching pump readings analysis', 'Failed to fetch pump analysis');
    }
  },

  /**
   * Get detailed tank readings analysis
   */
  getTankReadingsAnalysis: async (shiftId) => {
    logger.info(`Fetching tank readings analysis: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}/tank-analysis`);
      return handleResponse(response, 'fetching tank readings analysis');
    } catch (error) {
      throw handleError(error, 'fetching tank readings analysis', 'Failed to fetch tank analysis');
    }
  },

  /**
   * Get pump sales analysis by product and island
   */
  getPumpSalesAnalysis: async (shiftId) => {
    logger.info(`Fetching pump sales analysis: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}/pump-sales-analysis`);
      return handleResponse(response, 'fetching pump sales analysis');
    } catch (error) {
      throw handleError(error, 'fetching pump sales analysis', 'Failed to fetch pump sales analysis');
    }
  },

  // ==================== UTILITY METHODS ====================

  /**
   * Validate shift data before submission
   */
  validateShiftData: (data, operation) => {
    const errors = [];
    
    switch (operation) {
      case 'create':
        if (!data.stationId) errors.push('Station ID is required');
        if (!data.supervisorId) errors.push('Supervisor ID is required');
        break;
        
      case 'open':
        if (!data.shiftId) errors.push('Shift ID is required');
        if (!data.islandAssignments || data.islandAssignments.length === 0) {
          errors.push('At least one island assignment is required');
        }
        if (!data.pumpReadings || data.pumpReadings.length === 0) {
          errors.push('At least one pump reading is required');
        }
        if (!data.tankReadings || data.tankReadings.length === 0) {
          errors.push('At least one tank reading is required');
        }
        break;
        
      case 'close':
        if (!data.shiftId) errors.push('Shift ID is required');
        if (!data.endTime) errors.push('End time is required');
        if (!data.pumpReadings || data.pumpReadings.length === 0) {
          errors.push('At least one pump END reading is required');
        }
        if (!data.tankReadings || data.tankReadings.length === 0) {
          errors.push('At least one tank END reading is required');
        }
        if (!data.islandCollections || data.islandCollections.length === 0) {
          errors.push('At least one island collection is required');
        }
        break;
    }
    
    return errors;
  },

  /**
   * Format shift data for API submission
   */
  formatShiftData: (rawData, operation) => {
    const formatted = { ...rawData };
    
    switch (operation) {
      case 'open':
        // Ensure proper data types for readings
        if (formatted.pumpReadings) {
          formatted.pumpReadings = formatted.pumpReadings.map(reading => ({
            ...reading,
            electricMeter: Number(reading.electricMeter),
            manualMeter: reading.manualMeter ? Number(reading.manualMeter) : undefined,
            cashMeter: reading.cashMeter ? Number(reading.cashMeter) : undefined,
            litersDispensed: reading.litersDispensed ? Number(reading.litersDispensed) : undefined,
            salesValue: reading.salesValue ? Number(reading.salesValue) : undefined,
            unitPrice: reading.unitPrice ? Number(reading.unitPrice) : undefined,
            productId: reading.productId // Include productId for backend
          }));
        }
        
        if (formatted.tankReadings) {
          formatted.tankReadings = formatted.tankReadings.map(reading => ({
            ...reading,
            dipValue: Number(reading.dipValue),
            volume: Number(reading.volume),
            temperature: reading.temperature ? Number(reading.temperature) : undefined,
            waterLevel: reading.waterLevel ? Number(reading.waterLevel) : undefined,
            density: reading.density ? Number(reading.density) : undefined
          }));
        }
        break;
        
      case 'close':
        // Format closing data with new debtor collections structure
        if (formatted.pumpReadings) {
          formatted.pumpReadings = formatted.pumpReadings.map(reading => ({
            ...reading,
            electricMeter: Number(reading.electricMeter),
            manualMeter: reading.manualMeter ? Number(reading.manualMeter) : undefined,
            cashMeter: reading.cashMeter ? Number(reading.cashMeter) : undefined,
            litersDispensed: reading.litersDispensed ? Number(reading.litersDispensed) : undefined,
            salesValue: reading.salesValue ? Number(reading.salesValue) : undefined,
            unitPrice: reading.unitPrice ? Number(reading.unitPrice) : undefined,
            productId: reading.productId // Include productId for backend
          }));
        }
        
        if (formatted.tankReadings) {
          formatted.tankReadings = formatted.tankReadings.map(reading => ({
            ...reading,
            dipValue: Number(reading.dipValue),
            volume: Number(reading.volume),
            temperature: reading.temperature ? Number(reading.temperature) : undefined,
            waterLevel: reading.waterLevel ? Number(reading.waterLevel) : undefined,
            density: reading.density ? Number(reading.density) : undefined
          }));
        }
        
        if (formatted.islandCollections) {
          formatted.islandCollections = formatted.islandCollections.map(collection => ({
            islandId: collection.islandId,
            attendantId: collection.attendantId,
            cashAmount: Number(collection.cashAmount),
            receiptsAmount: Number(collection.receiptsAmount || 0),
            expectedCashAmount: Number(collection.expectedCashAmount),
            debtorCollections: collection.debtorCollections?.map(debt => ({
              debtorId: debt.debtorId,
              amount: Number(debt.amount)
            })) || [],
            expensesAmount: Number(collection.expensesAmount || 0),
            shortageAmount: Number(collection.shortageAmount || 0),
            overageAmount: Number(collection.overageAmount || 0)
          }));
        }
        
        if (formatted.nonFuelStocks) {
          formatted.nonFuelStocks = formatted.nonFuelStocks.map(stock => ({
            ...stock,
            closingStock: Number(stock.closingStock),
            returnedQty: Number(stock.returnedQty || 0)
          }));
        }
        break;
    }
    
    return formatted;
  },

  /**
   * Calculate shift duration
   */
  calculateShiftDuration: (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  },

  /**
   * Check if shift can be closed
   */
  canCloseShift: (shiftData) => {
    if (!shiftData) return false;
    
    const hasStartReadings = shiftData.pumpMeterReadings?.some(r => r.readingType === 'START') &&
                            shiftData.tankDipReadings?.some(r => r.readingType === 'START');
    
    const hasAssignments = shiftData.shiftIslandAttendant?.length > 0;
    
    return hasStartReadings && hasAssignments;
  },

  /**
   * Get shift status color
   */
  getStatusColor: (status) => {
    const colors = {
      'OPEN': 'success',
      'CLOSED': 'primary',
      'UNDER_REVIEW': 'warning',
      'APPROVED': 'info'
    };
    
    return colors[status] || 'default';
  },

  /**
   * Get variance severity color
   */
  getVarianceSeverityColor: (severity) => {
    const colors = {
      'NORMAL': 'success',
      'WARNING': 'warning',
      'CRITICAL': 'error'
    };
    
    return colors[severity] || 'default';
  },

  // ==================== READING UTILITY METHODS ====================

  /**
   * Extract last reading from pump/tank data
   */
  extractLastReading: (assetData) => {
    if (!assetData || !assetData.lastEndReading) {
      return null;
    }
    
    return assetData.lastEndReading;
  },

  /**
   * Check if asset has previous readings
   */
  hasPreviousReadings: (assetData) => {
    return assetData && assetData.lastEndReading !== null;
  },

  /**
   * Format reading value for display
   */
  formatReadingValue: (value, type = 'meter') => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (type) {
      case 'meter':
        return value.toLocaleString();
      case 'volume':
        return `${value.toLocaleString()} L`;
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'temperature':
        return `${value}°C`;
      case 'density':
        return value.toFixed(3);
      default:
        return value.toString();
    }
  },

  /**
   * Prepare reading data for shift opening
   */
  prepareOpeningReadings: (assetsWithReadings, readingType = 'START') => {
    const readings = [];
    
    assetsWithReadings.forEach(asset => {
      if (asset.lastEndReading) {
        // Use last END reading as reference for START reading
        readings.push({
          pumpId: asset.pump?.id || asset.tank?.id,
          electricMeter: asset.lastEndReading.electricMeter || 0,
          manualMeter: asset.lastEndReading.manualMeter || 0,
          cashMeter: asset.lastEndReading.cashMeter || 0,
          litersDispensed: 0, // Reset for new shift
          salesValue: 0, // Reset for new shift
          unitPrice: asset.lastEndReading.unitPrice || 0,
          productId: asset.lastEndReading.productId || asset.pump?.productId,
          readingType
        });
      }
    });
    
    return readings;
  },

  /**
   * Calculate sales from START and END readings
   */
  calculateSalesFromReadings: (startReadings, endReadings) => {
    const sales = {};
    
    endReadings.forEach(endReading => {
      const startReading = startReadings.find(sr => sr.pumpId === endReading.pumpId);
      
      if (startReading) {
        const electricLiters = (endReading.electricMeter || 0) - (startReading.electricMeter || 0);
        const manualLiters = (endReading.manualMeter || 0) - (startReading.manualMeter || 0);
        const cashLiters = (endReading.cashMeter || 0) - (startReading.cashMeter || 0);
        
        // Use electric meter as primary, fallback to others
        const litersDispensed = electricLiters > 0 ? electricLiters : 
                               manualLiters > 0 ? manualLiters : cashLiters;
        
        const salesValue = endReading.salesValue || (litersDispensed * (endReading.unitPrice || 0));
        
        sales[endReading.pumpId] = {
          litersDispensed: Math.max(0, litersDispensed),
          salesValue: Math.max(0, salesValue),
          unitPrice: endReading.unitPrice || 0,
          meterDifferentials: {
            electric: electricLiters,
            manual: manualLiters,
            cash: cashLiters
          }
        };
      }
    });
    
    return sales;
  },

  /**
   * Calculate cash variance for collections
   */
  calculateCashVariance: (expectedCash, actualCash) => {
    const variance = actualCash - expectedCash;
    const variancePercentage = expectedCash > 0 ? (variance / expectedCash) * 100 : 0;
    
    return {
      variance,
      variancePercentage,
      severity: Math.abs(variancePercentage) <= 1 ? 'NORMAL' : 
                Math.abs(variancePercentage) <= 3 ? 'WARNING' : 'CRITICAL'
    };
  },

  /**
   * Format collection data for display
   */
  formatCollectionData: (collection) => {
    const totalCashCollected = collection.cashAmount + collection.receiptsAmount;
    const totalAdjustments = collection.expensesAmount + collection.shortageAmount - collection.overageAmount;
    const totalDebtsIncurred = collection.totalDebtsIncurred || 0;
    const grandTotal = totalCashCollected + totalDebtsIncurred - totalAdjustments;
    
    return {
      ...collection,
      totalCashCollected,
      totalAdjustments,
      grandTotal,
      formatted: {
        cashAmount: `$${collection.cashAmount.toFixed(2)}`,
        receiptsAmount: `$${collection.receiptsAmount.toFixed(2)}`,
        totalCashCollected: `$${totalCashCollected.toFixed(2)}`,
        totalAdjustments: `$${totalAdjustments.toFixed(2)}`,
        totalDebtsIncurred: `$${totalDebtsIncurred.toFixed(2)}`,
        grandTotal: `$${grandTotal.toFixed(2)}`,
        variance: `$${collection.cashVariance?.toFixed(2) || '0.00'}`
      }
    };
  },

  /**
   * Generate shift summary report
   */
  generateShiftSummary: (shiftData) => {
    if (!shiftData) return null;
    
    const fuelSales = shiftData.sales?.fuel || {};
    const nonFuelSales = shiftData.sales?.nonFuel || {};
    const collections = shiftData.collections || {};
    
    return {
      shiftInfo: {
        shiftNumber: shiftData.shift?.shiftNumber,
        station: shiftData.shift?.station?.name,
        supervisor: shiftData.shift?.supervisor 
          ? `${shiftData.shift.supervisor.firstName} ${shiftData.shift.supervisor.lastName}`
          : 'N/A',
        duration: shiftData.shift?.startTime && shiftData.shift?.endTime 
          ? this.calculateShiftDuration(shiftData.shift.startTime, shiftData.shift.endTime)
          : 'N/A',
        status: shiftData.shift?.status
      },
      salesSummary: {
        fuel: {
          liters: fuelSales.totalLiters || 0,
          revenue: fuelSales.totalRevenue || 0,
          avgPrice: fuelSales.totalLiters > 0 ? (fuelSales.totalRevenue / fuelSales.totalLiters) : 0
        },
        nonFuel: {
          units: nonFuelSales.totalUnits || 0,
          revenue: nonFuelSales.totalRevenue || 0
        },
        totalRevenue: (fuelSales.totalRevenue || 0) + (nonFuelSales.totalRevenue || 0)
      },
      collectionSummary: {
        totalCash: collections.shiftCollection?.totalCashCollected || 0,
        totalDebts: collections.shiftCollection?.totalDebtsIncurred || 0,
        cashVariance: collections.shiftCollection?.cashVariance || 0,
        variancePercentage: collections.shiftCollection?.variancePercentage || 0
      },
      reconciliation: {
        wetStockStatus: shiftData.reconciliation?.wetStock?.status || 'PENDING',
        overallVariance: shiftData.reconciliation?.wetStockSummary?.overallVariance || 0,
        tankCount: shiftData.reconciliation?.wetStockSummary?.tankSummary?.totalTanks || 0
      }
    };
  },

  /**
   * Export shift data to CSV format
   */
  exportShiftToCSV: (shiftData) => {
    const summary = this.generateShiftSummary(shiftData);
    if (!summary) return '';
    
    const csvRows = [];
    
    // Header
    csvRows.push('Shift Summary Report');
    csvRows.push(`Shift Number,${summary.shiftInfo.shiftNumber}`);
    csvRows.push(`Station,${summary.shiftInfo.station}`);
    csvRows.push(`Supervisor,${summary.shiftInfo.supervisor}`);
    csvRows.push(`Duration,${summary.shiftInfo.duration}`);
    csvRows.push(`Status,${summary.shiftInfo.status}`);
    csvRows.push('');
    
    // Sales Summary
    csvRows.push('Sales Summary');
    csvRows.push('Category,Liters/Units,Revenue,Average Price');
    csvRows.push(`Fuel,${summary.salesSummary.fuel.liters},$${summary.salesSummary.fuel.revenue.toFixed(2)},$${summary.salesSummary.fuel.avgPrice.toFixed(2)}`);
    csvRows.push(`Non-Fuel,${summary.salesSummary.nonFuel.units},$${summary.salesSummary.nonFuel.revenue.toFixed(2)},N/A`);
    csvRows.push(`Total Revenue,,$${summary.salesSummary.totalRevenue.toFixed(2)},`);
    csvRows.push('');
    
    // Collection Summary
    csvRows.push('Collection Summary');
    csvRows.push(`Total Cash Collected,$${summary.collectionSummary.totalCash.toFixed(2)}`);
    csvRows.push(`Total Debts,$${summary.collectionSummary.totalDebts.toFixed(2)}`);
    csvRows.push(`Cash Variance,$${summary.collectionSummary.cashVariance.toFixed(2)}`);
    csvRows.push(`Variance Percentage,${summary.collectionSummary.variancePercentage.toFixed(2)}%`);
    
    return csvRows.join('\n');
  }
};

export default shiftService;