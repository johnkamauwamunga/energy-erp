import { apiService } from '../apiService';

class TankReconciliationService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  // =====================
  // CORE UTILITIES
  // =====================

  handleResponse = (response) => {
    if (response.data?.success) {
      return response.data.data;
    }
    return response.data;
  };

  handleError = (error, defaultMessage) => {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    if (error.message) {
      throw new Error(error.message);
    }
    throw new Error(defaultMessage);
  };

  buildQuery = (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    return params.toString();
  };

  clearCache = (pattern) => {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  };

  // =====================
  // SHIFT-LEVEL TANK RECONCILIATION
  // =====================

  /**
   * Get tank reconciliation for a specific tank in a shift
   */
  getTankReconciliationInShift = async (shiftId, tankId) => {
    const cacheKey = `tank-reconciliation-shift-${shiftId}-tank-${tankId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/tank-reconciliation/shift/${shiftId}/tank/${tankId}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch tank reconciliation in shift');
    }
  };

  /**
   * Get all tanks reconciliation in a shift
   */
  getAllTanksReconciliationInShift = async (shiftId) => {
    const cacheKey = `all-tanks-reconciliation-shift-${shiftId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/tank-reconciliation/shift/${shiftId}/tanks`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch all tanks reconciliation in shift');
    }
  };

  // =====================
  // STATION-LEVEL TANK RECONCILIATION
  // =====================

  /**
   * Get tank reconciliation in a station
   */
//   getTankReconciliationInStation = async (stationId, filters = {}) => {
//     const cacheKey = `tank-reconciliation-station-${stationId}-${JSON.stringify(filters)}`;
//     const cached = this.cache.get(cacheKey);
//     if (cached) return cached;

//     try {
//       const query = this.buildQuery(filters);
//       const url = query 
//         ? `/tank-reconciliation/station/${stationId}/tanks?${query}`
//         : `/tank-reconciliation/station/${stationId}/tanks`;
      
//       const response = await apiService.get(url);
//       console.log("station level reconcilliatin data ",response);
//       const data = this.handleResponse(response);
//       this.cache.set(cacheKey, data);
//       return data;
//     } catch (error) {
//       throw this.handleError(error, 'Failed to fetch tank reconciliation in station');
//     }
//   };

getTankReconciliationInStation = async (stationId, filters = {}) => {
    const cacheKey = `tank-reconciliation-station-${stationId}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query 
        ? `/tank-reconciliation/station/${stationId}/tanks?${query}`
        : `/tank-reconciliation/station/${stationId}/tanks`;
      
      const response = await apiService.get(url);
      
      // Enhanced logging
      console.log("=== STATION LEVEL RECONCILIATION DATA ===");
      console.log("Full response:", response);
      console.log("Response data:", response.data);
      console.log("Response structure:", JSON.stringify(response.data, null, 2));
      console.log("=========================================");
      
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch tank reconciliation in station');
    }
};

  /**
   * Get wet stock reconciliation in a station
   */
  getWetStockReconciliationInStation = async (stationId, filters = {}) => {
    const cacheKey = `wet-stock-reconciliation-station-${stationId}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query 
        ? `/tank-reconciliation/wet-stock/station/${stationId}?${query}`
        : `/tank-reconciliation/wet-stock/station/${stationId}`;
      
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch wet stock reconciliation in station');
    }
  };

  // =====================
  // COMPANY-LEVEL TANK RECONCILIATION
  // =====================

  /**
   * Get tank reconciliation across company
   */
  getTankReconciliationInCompany = async (companyId, filters = {}) => {
    const cacheKey = `tank-reconciliation-company-${companyId}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query 
        ? `/tank-reconciliation/company/${companyId}/tanks?${query}`
        : `/tank-reconciliation/company/${companyId}/tanks`;
      
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch tank reconciliation in company');
    }
  };

  /**
   * Get wet stock reconciliation across company
   */
  getWetStockReconciliationInCompany = async (companyId, filters = {}) => {
    const cacheKey = `wet-stock-reconciliation-company-${companyId}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query 
        ? `/tank-reconciliation/wet-stock/company/${companyId}?${query}`
        : `/tank-reconciliation/wet-stock/company/${companyId}`;
      
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch wet stock reconciliation in company');
    }
  };

  // =====================
  // RECONCILIATION MANAGEMENT
  // =====================

  /**
   * Update reconciliation status
   */
  updateReconciliationStatus = async (reconciliationId, statusData) => {
    try {
      const response = await apiService.patch(
        `/tank-reconciliation/wet-stock/${reconciliationId}/status`,
        statusData
      );
      const data = this.handleResponse(response);
      
      // Clear relevant cache
      this.clearCache('reconciliation');
      this.clearCache('wet-stock');
      
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to update reconciliation status');
    }
  };

  /**
   * Get wet stock reconciliation for a specific shift
   */
  getWetStockReconciliation = async (shiftId) => {
    const cacheKey = `wet-stock-reconciliation-shift-${shiftId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/tank-reconciliation/wet-stock/shift/${shiftId}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch wet stock reconciliation');
    }
  };

  // =====================
  // DATA FORMATTING UTILITIES
  // =====================

  formatTankReconciliationInShift = (data) => {
    if (!data) return null;

    return {
      ...data,
      tank: this.formatTank(data.tank),
      shift: this.formatShift(data.shift),
      dipReadings: this.formatDipReadings(data.dipReadings),
      connectedPumps: data.connectedPumps?.map(pump => this.formatConnectedPump(pump)) || [],
      reconciliation: this.formatReconciliationSummary(data.reconciliation),
      performance: this.formatPerformanceMetrics(data.performance)
    };
  };

  formatAllTanksReconciliationInShift = (data) => {
    if (!data) return null;

    return {
      ...data,
      shift: this.formatShift(data.shift),
      overallReconciliation: this.formatOverallReconciliation(data.overallReconciliation),
      tankReconciliations: data.tankReconciliations?.map(tank => this.formatTankShiftReconciliation(tank)) || [],
      summary: this.formatShiftSummary(data.summary)
    };
  };

  formatTankReconciliationInStation = (data) => {
    if (!data) return null;

    return {
      ...data,
      summary: this.formatStationSummary(data.summary),
      tanks: data.tanks?.map(tank => this.formatTankStationReconciliation(tank)) || [],
      periods: data.periods?.map(period => this.formatPeriodData(period)) || [],
      recentReconciliations: data.recentReconciliations?.map(rec => this.formatRecentReconciliation(rec)) || []
    };
  };

  formatWetStockReconciliation = (data) => {
    if (!data) return null;

    return {
      ...data,
      shift: this.formatShift(data.shift),
      wetStockReconciliation: this.formatWetStockData(data.wetStockReconciliation),
      summary: this.formatWetStockSummary(data.summary)
    };
  };

  formatTankReconciliationInCompany = (data) => {
    if (!data) return null;

    return {
      ...data,
      summary: this.formatCompanySummary(data.summary),
      stations: data.stations?.map(station => this.formatStationReconciliation(station)) || [],
      tanks: data.tanks?.map(tank => this.formatTankCompanyReconciliation(tank)) || [],
      products: data.products?.map(product => this.formatProductReconciliation(product)) || []
    };
  };

  // =====================
  // INDIVIDUAL COMPONENT FORMATTERS
  // =====================

  formatTank = (tank) => {
    if (!tank) return null;

    return {
      ...tank,
      displayName: tank.asset?.name || `Tank ${tank.id}`,
      productDisplay: tank.product?.name || 'No Product',
      capacityDisplay: this.formatNumber(tank.capacity) + ' L',
      currentVolumeDisplay: this.formatNumber(tank.currentVolume) + ' L',
      utilizationDisplay: this.formatPercentage((tank.currentVolume / tank.capacity) * 100)
    };
  };

  formatShift = (shift) => {
    if (!shift) return null;

    return {
      ...shift,
      displayName: `Shift ${shift.shiftNumber}`,
      periodDisplay: this.formatShiftPeriod(shift.startTime, shift.endTime),
      stationDisplay: shift.station?.name || 'Unknown Station',
      durationDisplay: this.calculateShiftDuration(shift.startTime, shift.endTime),
      supervisorDisplay: shift.supervisor 
        ? `${shift.supervisor.firstName} ${shift.supervisor.lastName}`
        : 'Unknown'
    };
  };

  formatDipReadings = (readings) => {
    if (!readings) return null;

    return {
      start: readings.start ? this.formatDipReading(readings.start) : null,
      end: readings.end ? this.formatDipReading(readings.end) : null
    };
  };

  formatDipReading = (reading) => {
    if (!reading) return null;

    return {
      ...reading,
      volumeDisplay: this.formatNumber(reading.volume) + ' L',
      dipValueDisplay: this.formatNumber(reading.dipValue),
      temperatureDisplay: reading.temperature ? this.formatNumber(reading.temperature) + '°C' : 'N/A',
      waterLevelDisplay: reading.waterLevel ? this.formatNumber(reading.waterLevel) + ' cm' : 'N/A',
      recordedAtDisplay: this.formatDateTime(reading.recordedAt),
      recordedByDisplay: reading.recordedBy 
        ? `${reading.recordedBy.firstName} ${reading.recordedBy.lastName}`
        : 'Unknown'
    };
  };

  formatConnectedPump = (pump) => {
    if (!pump) return null;

    return {
      ...pump,
      pump: this.formatPump(pump.pump),
      totalDispensedDisplay: this.formatNumber(pump.totalDispensed) + ' L',
      hasReadingsDisplay: pump.hasReadings ? 'Complete' : 'Incomplete',
      statusDisplay: pump.hasReadings ? 'success' : 'warning'
    };
  };

  formatPump = (pump) => {
    if (!pump) return null;

    return {
      ...pump,
      displayName: pump.asset?.name || `Pump ${pump.id}`,
      productDisplay: pump.product?.name || 'No Product',
      islandDisplay: pump.island?.name || 'No Island',
      connectionStatusDisplay: this.formatConnectionStatus(pump.connectionStatus),
      connectionStatusColor: this.getConnectionStatusColor(pump.connectionStatus)
    };
  };

  formatReconciliationSummary = (summary) => {
    if (!summary) return null;

    return {
      ...summary,
      openingVolumeDisplay: this.formatNumber(summary.openingVolume) + ' L',
      closingVolumeDisplay: this.formatNumber(summary.closingVolume) + ' L',
      tankReductionDisplay: this.formatNumber(summary.tankReduction) + ' L',
      totalPumpDispensedDisplay: this.formatNumber(summary.totalPumpDispensed) + ' L',
      varianceDisplay: this.formatNumber(summary.variance) + ' L',
      variancePercentageDisplay: this.formatPercentage(summary.variancePercentage),
      severityDisplay: this.formatSeverity(summary.severity),
      severityColor: this.getSeverityColor(summary.severity),
      isWithinToleranceDisplay: summary.isWithinTolerance ? 'Yes' : 'No',
      toleranceDisplay: summary.tolerance 
        ? `${this.formatPercentage(summary.tolerance.percentage)} or ${this.formatNumber(summary.tolerance.volume)}L`
        : 'N/A'
    };
  };

  formatPerformanceMetrics = (performance) => {
    if (!performance) return null;

    return {
      ...performance,
      efficiencyDisplay: this.formatPercentage(performance.efficiency),
      needsAttentionDisplay: performance.needsAttention ? 'Yes' : 'No',
      attentionColor: performance.needsAttention ? 'red' : 'green'
    };
  };

  // =====================
  // HELPER FORMATTERS
  // =====================

  formatCurrency = (amount, currency = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  formatNumber = (number) => {
    return new Intl.NumberFormat('en-KE').format(number || 0);
  };

  formatPercentage = (number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format((number || 0) / 100);
  };

  formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-KE');
  };

  formatShiftPeriod = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.toLocaleDateString()} ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`;
  };

  calculateShiftDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = (end - start) / (1000 * 60 * 60); // hours
    return `${duration.toFixed(1)} hours`;
  };

  formatConnectionStatus = (status) => {
    const statusMap = {
      'FULLY_CONNECTED': 'Fully Connected',
      'PARTIAL': 'Partial',
      'DISCONNECTED': 'Disconnected'
    };
    return statusMap[status] || status;
  };

  getConnectionStatusColor = (status) => {
    const colorMap = {
      'FULLY_CONNECTED': 'green',
      'PARTIAL': 'orange',
      'DISCONNECTED': 'red'
    };
    return colorMap[status] || 'default';
  };

  formatSeverity = (severity) => {
    const severityMap = {
      'CRITICAL': 'Critical',
      'WARNING': 'Warning',
      'NORMAL': 'Normal'
    };
    return severityMap[severity] || severity;
  };

  getSeverityColor = (severity) => {
    const colorMap = {
      'CRITICAL': 'red',
      'WARNING': 'orange',
      'NORMAL': 'green'
    };
    return colorMap[severity] || 'default';
  };

  formatReconciliationStatus = (status) => {
    const statusMap = {
      'PENDING': 'Pending',
      'IN_PROGRESS': 'In Progress',
      'COMPLETED': 'Completed',
      'DISCREPANCY': 'Discrepancy',
      'RESOLVED': 'Resolved'
    };
    return statusMap[status] || status;
  };

  getReconciliationStatusColor = (status) => {
    const colorMap = {
      'PENDING': 'blue',
      'IN_PROGRESS': 'orange',
      'COMPLETED': 'green',
      'DISCREPANCY': 'red',
      'RESOLVED': 'purple'
    };
    return colorMap[status] || 'default';
  };

  // =====================
  // CACHE MANAGEMENT
  // =====================

  preloadTankReconciliationData = async (shiftId) => {
    try {
      const [tankReconciliation, allTanksReconciliation] = await Promise.all([
        this.getAllTanksReconciliationInShift(shiftId),
        this.getWetStockReconciliation(shiftId)
      ]);
      return { tankReconciliation, allTanksReconciliation };
    } catch (error) {
      console.error('Failed to preload tank reconciliation data:', error);
      throw error;
    }
  };

  clearTankReconciliationCache = (shiftId = null, stationId = null, companyId = null) => {
    if (shiftId) {
      this.clearCache(`shift-${shiftId}`);
    }
    if (stationId) {
      this.clearCache(`station-${stationId}`);
    }
    if (companyId) {
      this.clearCache(`company-${companyId}`);
    }
    if (!shiftId && !stationId && !companyId) {
      this.clearCache();
    }
  };

  // =====================
  // EXPORT UTILITIES
  // =====================

  exportTankReconciliationToCSV = (data, level = 'shift') => {
    let csvContent = '';
    
    switch (level) {
      case 'shift':
        csvContent = this.generateShiftReconciliationCSV(data);
        break;
      case 'station':
        csvContent = this.generateStationReconciliationCSV(data);
        break;
      case 'company':
        csvContent = this.generateCompanyReconciliationCSV(data);
        break;
      default:
        throw new Error('Invalid export level');
    }
    
    return csvContent;
  };

  generateShiftReconciliationCSV = (data) => {
    const headers = ['Tank', 'Product', 'Opening Volume', 'Closing Volume', 'Tank Reduction', 'Pump Dispensed', 'Variance', 'Variance %', 'Severity'];
    const rows = data.tankReconciliations?.map(tank => [
      tank.tank.asset?.name,
      tank.tank.product?.name,
      tank.reconciliation.openingVolume,
      tank.reconciliation.closingVolume,
      tank.reconciliation.tankReduction,
      tank.reconciliation.totalPumpDispensed,
      tank.reconciliation.variance,
      tank.reconciliation.variancePercentage,
      tank.reconciliation.severity
    ]) || [];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  generateStationReconciliationCSV = (data) => {
    const headers = ['Tank', 'Product', 'Total Variance', 'Total Pump Dispensed', 'Total Tank Reduction', 'Shift Count', 'Avg Variance', 'Efficiency'];
    const rows = data.tanks?.map(tank => [
      tank.tank.asset?.name,
      tank.tank.product?.name,
      tank.totalVariance,
      tank.totalPumpDispensed,
      tank.totalTankReduction,
      tank.shiftCount,
      tank.avgVariance,
      tank.efficiency
    ]) || [];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  generateCompanyReconciliationCSV = (data) => {
    const headers = ['Station', 'Total Tanks', 'Total Variance', 'Avg Variance', 'Efficiency', 'Critical Count'];
    const rows = data.stations?.map(station => [
      station.station.name,
      station.tankCount,
      station.totalVariance,
      station.avgVariance,
      station.efficiency,
      station.criticalCount
    ]) || [];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // =====================
  // DATA VALIDATION
  // =====================

  validateReconciliationFilters = (filters) => {
    const errors = [];
    
    if (filters.startDate && !this.isValidDate(filters.startDate)) {
      errors.push('Invalid start date format');
    }
    
    if (filters.endDate && !this.isValidDate(filters.endDate)) {
      errors.push('Invalid end date format');
    }
    
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      
      if (start > end) {
        errors.push('Start date cannot be after end date');
      }
      
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 365) {
        errors.push('Date range cannot exceed 1 year');
      }
    }
    
    return errors;
  };

  isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  };
}

export const tankReconciliationService = new TankReconciliationService();
export default tankReconciliationService;