// services/pumpSalesService/pumpSalesService.js
import { apiService } from '../apiService';

class PumpSalesService {
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
  // SHIFT-LEVEL PUMP SALES
  // =====================

  /**
   * Get sales for a specific pump in a shift
   */
  getPumpSalesInShift = async (shiftId, pumpId) => {
    const cacheKey = `pump-sales-shift-${shiftId}-pump-${pumpId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/pump-sales/shift/${shiftId}/pump/${pumpId}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch pump sales in shift');
    }
  };

  /**
   * Get all pump sales in a shift
   */
  getAllPumpsSalesInShift = async (shiftId) => {
    const cacheKey = `all-pumps-sales-shift-${shiftId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/pump-sales/shift/${shiftId}/pumps`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch all pumps sales in shift');
    }
  };

  // =====================
  // STATION-LEVEL PUMP SALES
  // =====================

  /**
   * Get pump sales in a station (across all shifts)
   */
  getPumpSalesInStation = async (stationId, filters = {}) => {
    const cacheKey = `pump-sales-station-${stationId}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query 
        ? `/pump-sales/station/${stationId}/pumps?${query}`
        : `/pump-sales/station/${stationId}/pumps`;
      
      const response = await apiService.get(url);

             // Enhanced logging
      console.log("=== STATION LEVEL PRODUCT SALES STATION (JOHN) LEVEL DATA ===");
      console.log("Full response:", response);
      console.log("Response data:", response.data);
      console.log("Response structure:", JSON.stringify(response.data, null, 2));
      console.log("=========================================");
      
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch pump sales in station');
    }
  };

  // =====================
  // COMPANY-LEVEL PUMP SALES
  // =====================

  /**
   * Get pump sales across company (all stations)
   */
  getPumpSalesInCompany = async (companyId, filters = {}) => {
    const cacheKey = `pump-sales-company-${companyId}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query 
        ? `/pump-sales/company/${companyId}/pumps?${query}`
        : `/pump-sales/company/${companyId}/pumps`;
      
      const response = await apiService.get(url);

             // Enhanced logging
      console.log("=== STATION LEVEL PUMP SALES COMPANY LEVEL DATA ===");
      console.log("Full response:", response);
      console.log("Response data:", response.data);
      console.log("Response structure:", JSON.stringify(response.data, null, 2));
      console.log("=========================================");
      

      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch pump sales in company');
    }
  };

  // =====================
  // DATA FORMATTING UTILITIES
  // =====================

  formatPumpSalesInShift = (data) => {
    if (!data) return null;

    return {
      ...data,
      pump: this.formatPump(data.pump),
      shift: this.formatShift(data.shift),
      readings: this.formatReadings(data.readings),
      salesSummary: this.formatSalesSummary(data.salesSummary),
      variances: this.formatVariances(data.variances),
      performance: this.formatPerformance(data.performance)
    };
  };

  formatAllPumpsSalesInShift = (data) => {
    if (!data) return null;

    return {
      ...data,
      summary: this.formatShiftSummary(data.summary),
      pumps: data.pumps?.map(pump => this.formatPumpShiftData(pump)) || [],
      islands: data.islands?.map(island => this.formatIslandShiftData(island)) || [],
      products: data.products?.map(product => this.formatProductShiftData(product)) || []
    };
  };

  formatPumpSalesInStation = (data) => {
    if (!data) return null;

    return {
      ...data,
      summary: this.formatStationSummary(data.summary),
      pumps: data.pumps?.map(pump => this.formatPumpStationData(pump)) || [],
      periods: data.periods?.map(period => this.formatPeriodData(period)) || [],
      products: data.products?.map(product => this.formatProductStationData(product)) || []
    };
  };

  formatPumpSalesInCompany = (data) => {
    if (!data) return null;

    return {
      ...data,
      summary: this.formatCompanySummary(data.summary),
      pumps: data.pumps?.map(pump => this.formatPumpCompanyData(pump)) || [],
      stations: data.stations?.map(station => this.formatStationCompanyData(station)) || [],
      products: data.products?.map(product => this.formatProductCompanyData(product)) || []
    };
  };

  // =====================
  // INDIVIDUAL COMPONENT FORMATTERS
  // =====================

  formatPump = (pump) => {
    if (!pump) return null;

    return {
      ...pump,
      displayName: pump.asset?.name || `Pump ${pump.id}`,
      productDisplay: pump.product?.name || 'Unknown Product',
      islandDisplay: pump.island?.name || 'No Island',
      tankDisplay: pump.tank?.name || 'No Tank',
      connectionStatusDisplay: this.formatConnectionStatus(pump.connectionStatus),
      connectionStatusColor: this.getConnectionStatusColor(pump.connectionStatus)
    };
  };

  formatShift = (shift) => {
    if (!shift) return null;

    return {
      ...shift,
      displayName: `Shift ${shift.shiftNumber}`,
      periodDisplay: this.formatShiftPeriod(shift.startTime, shift.endTime),
      stationDisplay: shift.station?.name || 'Unknown Station',
      durationDisplay: this.calculateShiftDuration(shift.startTime, shift.endTime)
    };
  };

  formatReadings = (readings) => {
    return {
      start: readings.start ? this.formatReading(readings.start, 'START') : null,
      end: readings.end ? this.formatReading(readings.end, 'END') : null
    };
  };

  formatReading = (reading, type) => {
    return {
      ...reading,
      type,
      recordedByDisplay: reading.recordedBy 
        ? `${reading.recordedBy.firstName} ${reading.recordedBy.lastName}`
        : 'Unknown',
      recordedAtDisplay: this.formatDateTime(reading.recordedAt),
      electricMeterDisplay: this.formatNumber(reading.electricMeter),
      manualMeterDisplay: this.formatNumber(reading.manualMeter),
      cashMeterDisplay: this.formatNumber(reading.cashMeter),
      litersDispensedDisplay: this.formatNumber(reading.litersDispensed),
      salesValueDisplay: this.formatCurrency(reading.salesValue),
      unitPriceDisplay: this.formatCurrency(reading.unitPrice)
    };
  };

  formatSalesSummary = (summary) => {
    if (!summary) return null;

    return {
      ...summary,
      calculatedLitersDisplay: this.formatNumber(summary.calculatedLiters),
      recordedLitersDisplay: this.formatNumber(summary.recordedLiters),
      calculatedSalesValueDisplay: this.formatCurrency(summary.calculatedSalesValue),
      recordedSalesValueDisplay: this.formatCurrency(summary.recordedSalesValue),
      unitPriceDisplay: this.formatCurrency(summary.unitPrice),
      efficiencyDisplay: this.formatPercentage(summary.efficiency),
      efficiencyColor: this.getEfficiencyColor(summary.efficiency)
    };
  };

  formatVariances = (variances) => {
    if (!variances) return null;

    return {
      volume: {
        ...variances.volume,
        absoluteDisplay: this.formatNumber(variances.volume.absolute),
        percentageDisplay: this.formatPercentage(variances.volume.percentage),
        color: this.getVarianceColor(variances.volume.percentage)
      },
      value: {
        ...variances.value,
        absoluteDisplay: this.formatCurrency(variances.value.absolute),
        percentageDisplay: this.formatPercentage(variances.value.percentage),
        color: this.getVarianceColor(variances.value.percentage)
      }
    };
  };

  formatPerformance = (performance) => {
    if (!performance) return null;

    return {
      ...performance,
      withinToleranceDisplay: performance.isWithinTolerance ? 'Within Tolerance' : 'Outside Tolerance',
      withinToleranceColor: performance.isWithinTolerance ? 'success' : 'error',
      needsAttentionDisplay: performance.needsAttention ? 'Needs Attention' : 'Normal',
      needsAttentionColor: performance.needsAttention ? 'warning' : 'success'
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
      CONNECTED: 'Connected',
      DISCONNECTED: 'Disconnected',
      MAINTENANCE: 'Maintenance',
      OFFLINE: 'Offline'
    };
    return statusMap[status] || status;
  };

  getConnectionStatusColor = (status) => {
    const colorMap = {
      CONNECTED: 'success',
      DISCONNECTED: 'error',
      MAINTENANCE: 'warning',
      OFFLINE: 'default'
    };
    return colorMap[status] || 'default';
  };

  getEfficiencyColor = (efficiency) => {
    if (efficiency >= 0.95) return 'success';
    if (efficiency >= 0.90) return 'warning';
    return 'error';
  };

  getVarianceColor = (percentage) => {
    const absPercentage = Math.abs(percentage);
    if (absPercentage <= 2) return 'success';
    if (absPercentage <= 5) return 'warning';
    return 'error';
  };

  // =====================
  // DATA VALIDATION
  // =====================

  validateDateRange = (startDate, endDate) => {
    const errors = [];
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
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

  validateFilters = (filters) => {
    const errors = [];
    
    if (filters.startDate && !this.isValidDate(filters.startDate)) {
      errors.push('Invalid start date format');
    }
    
    if (filters.endDate && !this.isValidDate(filters.endDate)) {
      errors.push('Invalid end date format');
    }
    
    const dateErrors = this.validateDateRange(filters.startDate, filters.endDate);
    errors.push(...dateErrors);
    
    return errors;
  };

  isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  };

  // =====================
  // CACHE MANAGEMENT
  // =====================

  preloadPumpSalesData = async (shiftId) => {
    try {
      const [pumpSales, allPumpsSales] = await Promise.all([
        this.getAllPumpsSalesInShift(shiftId),
        this.getAllPumpsSalesInShift(shiftId)
      ]);
      return { pumpSales, allPumpsSales };
    } catch (error) {
      console.error('Failed to preload pump sales data:', error);
      throw error;
    }
  };

  clearPumpSalesCache = (shiftId = null, stationId = null, companyId = null) => {
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

  exportPumpSalesToCSV = (data, level = 'shift') => {
    let csvContent = '';
    
    switch (level) {
      case 'shift':
        csvContent = this.generateShiftCSV(data);
        break;
      case 'station':
        csvContent = this.generateStationCSV(data);
        break;
      case 'company':
        csvContent = this.generateCompanyCSV(data);
        break;
      default:
        throw new Error('Invalid export level');
    }
    
    return csvContent;
  };

  generateShiftCSV = (data) => {
    // Implement CSV generation for shift data
    const headers = ['Pump', 'Product', 'Liters', 'Sales Value', 'Unit Price', 'Efficiency'];
    const rows = data.pumps?.map(pump => [
      pump.pump?.displayName,
      pump.product?.name,
      pump.totalLiters,
      pump.totalSalesValue,
      pump.avgUnitPrice,
      pump.efficiency
    ]) || [];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  generateStationCSV = (data) => {
    // Implement CSV generation for station data
    const headers = ['Period', 'Total Liters', 'Total Sales', 'Pump Count', 'Avg Sales per Pump'];
    const rows = data.periods?.map(period => [
      period.period,
      period.totalLiters,
      period.totalSalesValue,
      period.pumpCount,
      period.avgSalesPerPump
    ]) || [];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  generateCompanyCSV = (data) => {
    // Implement CSV generation for company data
    const headers = ['Station', 'Total Liters', 'Total Sales', 'Pump Count', 'Efficiency'];
    const rows = data.stations?.map(station => [
      station.station?.name,
      station.totalLiters,
      station.totalSalesValue,
      station.pumpCount,
      station.efficiency
    ]) || [];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };
}

export const pumpSalesService = new PumpSalesService();
export default pumpSalesService;