// services/productSalesService/productSalesService.js
import { apiService } from '../apiService';

class ProductSalesService {
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
  // SHIFT-LEVEL PRODUCT SALES
  // =====================

  /**
   * Get sales for a specific product in a shift
   */
  getProductSalesInShift = async (shiftId, productId) => {
    const cacheKey = `product-sales-shift-${shiftId}-product-${productId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/product-sales/shift/${shiftId}/product/${productId}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch product sales in shift');
    }
  };

  /**
   * Get sales for all products in a shift
   */
  getAllProductsSalesInShift = async (shiftId) => {
    const cacheKey = `all-products-sales-shift-${shiftId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/product-sales/shift/${shiftId}/products`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch all products sales in shift');
    }
  };

  // =====================
  // STATION-LEVEL PRODUCT SALES
  // =====================

  /**
   * Get all products sales in a station (across all shifts)
   */
  getAllProductsSalesInStation = async (stationId, filters = {}) => {
    const cacheKey = `all-products-sales-station-${stationId}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query 
        ? `/product-sales/station/${stationId}/products/all?${query}`
        : `/product-sales/station/${stationId}/products/all`;
      
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch all products sales in station');
    }
  };

  /**
   * Get periodic product sales in a station
   */
  getPeriodicProductSalesInStation = async (stationId, filters = {}) => {
    const cacheKey = `periodic-products-sales-station-${stationId}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query 
        ? `/product-sales/station/${stationId}/products/periodic?${query}`
        : `/product-sales/station/${stationId}/products/periodic`;
      
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch periodic product sales in station');
    }
  };

  /**
   * Get station product sales dashboard
   */
  getStationProductSalesDashboard = async (stationId, filters = {}) => {
    const cacheKey = `station-dashboard-${stationId}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query 
        ? `/product-sales/station/${stationId}/dashboard?${query}`
        : `/product-sales/station/${stationId}/dashboard`;
      
      const response = await apiService.get(url);

          // Enhanced logging
      console.log("=== STATION LEVEL PRODUCT SALES STATION LEVEL DATA ===");
      console.log("Full response:", response);
      console.log("Response data:", response.data);
      console.log("Response structure:", JSON.stringify(response.data, null, 2));
      console.log("=========================================");
      

      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch station product sales dashboard');
    }
  };

  // =====================
  // PERIOD-BASED SALES ANALYTICS
  // =====================

  /**
   * Get product sales by period (daily, weekly, monthly, yearly)
   */
  getProductSalesByPeriod = async (companyId, period = 'month', filters = {}) => {
    const cacheKey = `product-sales-period-${companyId}-${period}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery({ period, ...filters });
      const url = `/product-sales/company/${companyId}/products/period?${query}`;
      
      const response = await apiService.get(url);

         // Enhanced logging
      console.log("=== STATION LEVEL PRODUCT SALES DATA ===");
      console.log("Full response:", response);
      console.log("Response data:", response.data);
      console.log("Response structure:", JSON.stringify(response.data, null, 2));
      console.log("=========================================");
      

      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch product sales by period');
    }
  };

  /**
   * Get pump sales by period
   */
  getPumpSalesByPeriod = async (companyId, period = 'month', filters = {}) => {
    const cacheKey = `pump-sales-period-${companyId}-${period}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery({ period, ...filters });
      const url = `/product-sales/company/${companyId}/pumps/period?${query}`;
      
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch pump sales by period');
    }
  };

  // =====================
  // DASHBOARD & OVERVIEW
  // =====================

  /**
   * Get comprehensive sales dashboard
   */
  getSalesDashboard = async (companyId, period = 'month') => {
    const cacheKey = `sales-dashboard-${companyId}-${period}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/product-sales/company/${companyId}/dashboard?period=${period}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch sales dashboard');
    }
  };

  /**
   * Get best performers
   */
  getBestPerformers = async (companyId, period = 'month') => {
    const cacheKey = `best-performers-${companyId}-${period}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/product-sales/company/${companyId}/best-performers?period=${period}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch best performers');
    }
  };

  // =====================
  // DATA FORMATTING UTILITIES
  // =====================

  formatProductSalesInShift = (data) => {
    if (!data) return null;

    return {
      ...data,
      product: this.formatProduct(data.product),
      shift: this.formatShift(data.shift),
      salesSummary: this.formatProductSalesSummary(data.salesSummary),
      pumpBreakdown: data.pumpBreakdown?.map(pump => this.formatPumpBreakdown(pump)) || [],
      allReadings: data.allReadings?.map(reading => this.formatReading(reading)) || []
    };
  };

  formatAllProductsSalesInShift = (data) => {
    if (!data) return null;

    return {
      ...data,
      shift: this.formatShift(data.shift),
      overallTotals: this.formatOverallTotals(data.overallTotals),
      productSales: data.productSales?.map(product => this.formatProductShiftSales(product)) || []
    };
  };

  formatProductSalesByPeriod = (data) => {
    if (!data) return null;

    return {
      ...data,
      summary: this.formatPeriodSummary(data.summary),
      periods: data.periods?.map(period => this.formatPeriodData(period)) || [],
      products: data.products?.map(product => this.formatProductPeriodData(product)) || [],
      stations: data.stations?.map(station => this.formatStationPeriodData(station)) || []
    };
  };

  formatPumpSalesByPeriod = (data) => {
    if (!data) return null;

    return {
      ...data,
      summary: this.formatPumpPeriodSummary(data.summary),
      pumps: data.pumps?.map(pump => this.formatPumpPeriodData(pump)) || [],
      periods: data.periods?.map(period => this.formatPeriodData(period)) || []
    };
  };

  formatSalesDashboard = (data) => {
    if (!data) return null;

    return {
      ...data,
      overview: this.formatDashboardOverview(data.overview),
      bestPerformers: this.formatBestPerformers(data.bestPerformers),
      productPerformance: this.formatProductPerformance(data.productPerformance),
      stationPerformance: this.formatStationPerformance(data.stationPerformance),
      pumpPerformance: this.formatPumpPerformance(data.pumpPerformance),
      recentActivity: data.recentActivity?.map(activity => this.formatRecentActivity(activity)) || [],
      periodTrends: data.periodTrends?.map(trend => this.formatPeriodTrend(trend)) || []
    };
  };

  // =====================
  // INDIVIDUAL COMPONENT FORMATTERS
  // =====================

  formatProduct = (product) => {
    if (!product) return null;

    return {
      ...product,
      displayName: product.name,
      typeDisplay: this.formatProductType(product.type),
      unitDisplay: this.formatProductUnit(product.unit),
      colorDisplay: product.colorCode ? `#${product.colorCode}` : '#666666',
      octaneDisplay: product.octaneRating ? `${product.octaneRating} RON` : 'N/A'
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

  formatProductSalesSummary = (summary) => {
    if (!summary) return null;

    return {
      ...summary,
      totalLitersDisplay: this.formatNumber(summary.totalLiters),
      totalSalesValueDisplay: this.formatCurrency(summary.totalSalesValue),
      avgUnitPriceDisplay: this.formatCurrency(summary.avgUnitPrice),
      readingCountDisplay: `${summary.readingCount} reading${summary.readingCount !== 1 ? 's' : ''}`,
      pumpCountDisplay: `${summary.pumpCount} pump${summary.pumpCount !== 1 ? 's' : ''}`
    };
  };

  formatOverallTotals = (totals) => {
    if (!totals) return null;

    return {
      ...totals,
      totalLitersDisplay: this.formatNumber(totals.totalLiters),
      totalSalesValueDisplay: this.formatCurrency(totals.totalSalesValue),
      productCountDisplay: `${totals.productCount} product${totals.productCount !== 1 ? 's' : ''}`,
      totalReadingCountDisplay: `${totals.totalReadingCount} reading${totals.totalReadingCount !== 1 ? 's' : ''}`,
      totalPumpCountDisplay: `${totals.totalPumpCount} pump${totals.totalPumpCount !== 1 ? 's' : ''}`
    };
  };

  formatPumpBreakdown = (pump) => {
    if (!pump) return null;

    return {
      ...pump,
      pump: this.formatPump(pump.pump),
      electricMeterDisplay: this.formatNumber(pump.electricMeter),
      manualMeterDisplay: this.formatNumber(pump.manualMeter),
      cashMeterDisplay: this.formatNumber(pump.cashMeter),
      litersDispensedDisplay: this.formatNumber(pump.litersDispensed),
      salesValueDisplay: this.formatCurrency(pump.salesValue),
      unitPriceDisplay: this.formatCurrency(pump.unitPrice),
      recordedAtDisplay: this.formatDateTime(pump.recordedAt),
      recordedByDisplay: pump.recordedBy 
        ? `${pump.recordedBy.firstName} ${pump.recordedBy.lastName}`
        : 'Unknown'
    };
  };

  formatReading = (reading) => {
    if (!reading) return null;

    return {
      ...reading,
      electricMeterDisplay: this.formatNumber(reading.electricMeter),
      manualMeterDisplay: this.formatNumber(reading.manualMeter),
      cashMeterDisplay: this.formatNumber(reading.cashMeter),
      litersDispensedDisplay: this.formatNumber(reading.litersDispensed),
      salesValueDisplay: this.formatCurrency(reading.salesValue),
      unitPriceDisplay: this.formatCurrency(reading.unitPrice),
      recordedAtDisplay: this.formatDateTime(reading.recordedAt)
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

  formatProductType = (type) => {
    const typeMap = {
      'FUEL': 'Fuel',
      'LUBRICANT': 'Lubricant',
      'ADDITIVE': 'Additive',
      'OTHER': 'Other'
    };
    return typeMap[type] || type;
  };

  formatProductUnit = (unit) => {
    const unitMap = {
      'LITER': 'Liter',
      'GALLON': 'Gallon',
      'BARREL': 'Barrel',
      'KILOGRAM': 'Kilogram'
    };
    return unitMap[unit] || unit;
  };

  formatPump = (pump) => {
    if (!pump) return null;

    return {
      ...pump,
      displayName: pump.asset?.name || `Pump ${pump.id}`,
      islandDisplay: pump.island?.name || 'No Island',
      tankDisplay: pump.tank?.name || 'No Tank'
    };
  };

  // =====================
  // DASHBOARD SPECIFIC FORMATTERS
  // =====================

  formatDashboardOverview = (overview) => {
    if (!overview) return null;

    return {
      ...overview,
      totalRevenueDisplay: this.formatCurrency(overview.totalRevenue),
      totalLitersDisplay: this.formatNumber(overview.totalLiters),
      totalShiftsDisplay: `${overview.totalShifts} shift${overview.totalShifts !== 1 ? 's' : ''}`,
      totalStationsDisplay: `${overview.totalStations} station${overview.totalStations !== 1 ? 's' : ''}`,
      totalProductsDisplay: `${overview.totalProducts} product${overview.totalProducts !== 1 ? 's' : ''}`,
      totalPumpsDisplay: `${overview.totalPumps} pump${overview.totalPumps !== 1 ? 's' : ''}`,
      avgEfficiencyDisplay: this.formatPercentage(overview.avgEfficiency * 100)
    };
  };

  formatBestPerformers = (performers) => {
    if (!performers) return null;

    return {
      topProducts: performers.topProducts?.map(product => ({
        ...product,
        product: this.formatProduct(product.product),
        totalLitersDisplay: this.formatNumber(product.totalLiters),
        totalRevenueDisplay: this.formatCurrency(product.totalRevenue),
        shiftCountDisplay: `${product.shiftCount} shift${product.shiftCount !== 1 ? 's' : ''}`
      })) || [],
      topStations: performers.topStations?.map(station => ({
        ...station,
        station: this.formatStation(station.station),
        totalLitersDisplay: this.formatNumber(station.totalLiters),
        totalRevenueDisplay: this.formatCurrency(station.totalRevenue),
        shiftCountDisplay: `${station.shiftCount} shift${station.shiftCount !== 1 ? 's' : ''}`
      })) || []
    };
  };

  formatStation = (station) => {
    if (!station) return null;

    return {
      ...station,
      displayName: station.name,
      locationDisplay: station.location || 'No location'
    };
  };

  // =====================
  // DATA VALIDATION
  // =====================

  validatePeriodFilters = (filters) => {
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

  // =====================
  // CACHE MANAGEMENT
  // =====================

  preloadProductSalesData = async (shiftId) => {
    try {
      const [productSales, allProductsSales] = await Promise.all([
        this.getAllProductsSalesInShift(shiftId),
        this.getAllProductsSalesInShift(shiftId)
      ]);
      return { productSales, allProductsSales };
    } catch (error) {
      console.error('Failed to preload product sales data:', error);
      throw error;
    }
  };

  clearProductSalesCache = (shiftId = null, stationId = null, companyId = null) => {
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

  exportProductSalesToCSV = (data, level = 'shift') => {
    let csvContent = '';
    
    switch (level) {
      case 'shift':
        csvContent = this.generateShiftProductCSV(data);
        break;
      case 'period':
        csvContent = this.generatePeriodProductCSV(data);
        break;
      case 'dashboard':
        csvContent = this.generateDashboardCSV(data);
        break;
      default:
        throw new Error('Invalid export level');
    }
    
    return csvContent;
  };

  generateShiftProductCSV = (data) => {
    const headers = ['Product', 'Total Liters', 'Total Sales', 'Avg Unit Price', 'Pump Count'];
    const rows = data.productSales?.map(product => [
      product.product.name,
      product.salesSummary.totalLiters,
      product.salesSummary.totalSalesValue,
      product.salesSummary.avgUnitPrice,
      product.salesSummary.pumpCount
    ]) || [];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  generatePeriodProductCSV = (data) => {
    const headers = ['Period', 'Total Liters', 'Total Sales', 'Shift Count', 'Avg Sales per Shift'];
    const rows = data.periods?.map(period => [
      period.period,
      period.totalLiters,
      period.totalSalesValue,
      period.shiftCount,
      period.avgSalesPerShift
    ]) || [];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  generateDashboardCSV = (data) => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Revenue', data.overview.totalRevenue],
      ['Total Liters', data.overview.totalLiters],
      ['Total Shifts', data.overview.totalShifts],
      ['Total Stations', data.overview.totalStations],
      ['Total Products', data.overview.totalProducts]
    ];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };
}

export const productSalesService = new ProductSalesService();
export default productSalesService;