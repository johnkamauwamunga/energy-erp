// services/wetStockService.js
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

export const wetStockService = {
  // =====================
  // CORE RECONCILIATION OPERATIONS
  // =====================
  
  calculateWetStockReconciliation: async (shiftId) => {
    logger.info(`Calculating wet stock reconciliation for shift: ${shiftId}`);
    
    try {
      const response = await apiService.post(`/wetstock/shifts/${shiftId}/calculate`);
      return handleResponse(response, 'calculating wet stock reconciliation');
    } catch (error) {
      throw handleError(error, 'calculating wet stock reconciliation', 'Failed to calculate wet stock reconciliation');
    }
  },

  getWetStockReconciliation: async (shiftId) => {
    logger.info(`Fetching wet stock reconciliation for shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/wetstock/shifts/${shiftId}`);
      return handleResponse(response, 'fetching wet stock reconciliation');
    } catch (error) {
      throw handleError(error, 'fetching wet stock reconciliation', 'Failed to fetch wet stock reconciliation');
    }
  },

  resolveWetStockReconciliation: async (shiftId, resolutionData) => {
    logger.info(`Resolving wet stock reconciliation for shift: ${shiftId}`, resolutionData);
    
    try {
      const response = await apiService.patch(`/wetstock/shifts/${shiftId}/resolve`, resolutionData);
      return handleResponse(response, 'resolving wet stock reconciliation');
    } catch (error) {
      throw handleError(error, 'resolving wet stock reconciliation', 'Failed to resolve wet stock reconciliation');
    }
  },

  recalculateWetStockReconciliation: async (shiftId) => {
    logger.info(`Recalculating wet stock reconciliation for shift: ${shiftId}`);
    
    try {
      const response = await apiService.post(`/wetstock/shifts/${shiftId}/recalculate`);
      return handleResponse(response, 'recalculating wet stock reconciliation');
    } catch (error) {
      throw handleError(error, 'recalculating wet stock reconciliation', 'Failed to recalculate wet stock reconciliation');
    }
  },

  // =====================
  // QUERY & LISTING OPERATIONS
  // =====================

  getWetStockReconciliationsByStation: async (stationId, filters = {}) => {
    logger.info(`Fetching wet stock reconciliations for station: ${stationId}`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/wetstock/stations/${stationId}?${params.toString()}`;
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching wet stock reconciliations by station');
    } catch (error) {
      throw handleError(error, 'fetching wet stock reconciliations by station', 'Failed to fetch wet stock reconciliations');
    }
  },

  getWetStockReconciliationsByCompany: async (companyId, filters = {}) => {
    logger.info(`Fetching wet stock reconciliations for company: ${companyId}`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/wetstock/companies/${companyId}?${params.toString()}`;
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching wet stock reconciliations by company');
    } catch (error) {
      throw handleError(error, 'fetching wet stock reconciliations by company', 'Failed to fetch wet stock reconciliations');
    }
  },

  // =====================
  // ANALYTICS & DASHBOARD OPERATIONS
  // =====================

  getWetStockTrends: async (stationId, period = '30d') => {
    logger.info(`Fetching wet stock trends for station: ${stationId}, period: ${period}`);
    
    try {
      const response = await apiService.get(`/wetstock/stations/${stationId}/trends?period=${period}`);
      return handleResponse(response, 'fetching wet stock trends');
    } catch (error) {
      throw handleError(error, 'fetching wet stock trends', 'Failed to fetch wet stock trends');
    }
  },

  getReconciliationDashboard: async (stationId) => {
    logger.info(`Fetching reconciliation dashboard for station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/wetstock/stations/${stationId}/dashboard`);
      return handleResponse(response, 'fetching reconciliation dashboard');
    } catch (error) {
      throw handleError(error, 'fetching reconciliation dashboard', 'Failed to fetch reconciliation dashboard');
    }
  },

  // =====================
  // UTILITY & STATUS OPERATIONS
  // =====================

  getWetStockReconciliationStatus: async (shiftId) => {
    logger.info(`Fetching wet stock reconciliation status for shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/wetstock/shifts/${shiftId}/status`);
      return handleResponse(response, 'fetching wet stock reconciliation status');
    } catch (error) {
      throw handleError(error, 'fetching wet stock reconciliation status', 'Failed to fetch wet stock reconciliation status');
    }
  },

  validateWetStockData: async (shiftId) => {
    logger.info(`Validating wet stock data for shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/wetstock/shifts/${shiftId}/validate`);
      return handleResponse(response, 'validating wet stock data');
    } catch (error) {
      throw handleError(error, 'validating wet stock data', 'Failed to validate wet stock data');
    }
  },

  // =====================
  // BULK OPERATIONS
  // =====================

  bulkRecalculateReconciliations: async (stationId, bulkData) => {
    logger.info(`Bulk recalculating reconciliations for station: ${stationId}`, bulkData);
    
    try {
      const response = await apiService.post(`/wetstock/stations/${stationId}/bulk-recalculate`, bulkData);
      return handleResponse(response, 'bulk recalculating reconciliations');
    } catch (error) {
      throw handleError(error, 'bulk recalculating reconciliations', 'Failed to bulk recalculate reconciliations');
    }
  },

  // =====================
  // QUERY SERVICE INTEGRATION
  // =====================

  getWetStockReconciliations: async (filters = {}) => {
    logger.info('Fetching wet stock reconciliations with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/wetstock/query?${params.toString()}`;
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching wet stock reconciliations');
    } catch (error) {
      throw handleError(error, 'fetching wet stock reconciliations', 'Failed to fetch wet stock reconciliations');
    }
  },

  getWetStockStatistics: async (filters = {}) => {
    logger.info('Fetching wet stock statistics with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/wetstock/query/statistics?${params.toString()}`;
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching wet stock statistics');
    } catch (error) {
      throw handleError(error, 'fetching wet stock statistics', 'Failed to fetch wet stock statistics');
    }
  },

  getStationAnalytics: async (stationId, period = '30d') => {
    logger.info(`Fetching station analytics for station: ${stationId}, period: ${period}`);
    
    try {
      const response = await apiService.get(`/wetstock/query/stations/${stationId}/analytics?period=${period}`);
      return handleResponse(response, 'fetching station analytics');
    } catch (error) {
      throw handleError(error, 'fetching station analytics', 'Failed to fetch station analytics');
    }
  },

  getCompanyDashboard: async (companyId, period = '30d') => {
    logger.info(`Fetching company dashboard for company: ${companyId}, period: ${period}`);
    
    try {
      const response = await apiService.get(`/wetstock/query/companies/${companyId}/dashboard?period=${period}`);
      return handleResponse(response, 'fetching company dashboard');
    } catch (error) {
      throw handleError(error, 'fetching company dashboard', 'Failed to fetch company dashboard');
    }
  },

  generateWetStockReport: async (filters = {}) => {
    logger.info('Generating wet stock report with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/wetstock/query/reports?${params.toString()}`;
      const response = await apiService.get(url);
      return handleResponse(response, 'generating wet stock report');
    } catch (error) {
      throw handleError(error, 'generating wet stock report', 'Failed to generate wet stock report');
    }
  },

  exportWetStockReport: async (filters = {}, format = 'json') => {
    logger.info(`Exporting wet stock report in format: ${format}`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      params.append('format', format);
      
      const url = `/wetstock/query/reports/export?${params.toString()}`;
      const response = await apiService.get(url);
      return handleResponse(response, 'exporting wet stock report');
    } catch (error) {
      throw handleError(error, 'exporting wet stock report', 'Failed to export wet stock report');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validateCalculateReconciliation: (shiftId) => {
    const errors = [];

    if (!shiftId) {
      errors.push('Shift ID is required');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (shiftId && !uuidRegex.test(shiftId)) {
      errors.push('Invalid shift ID format');
    }

    return errors;
  },

  validateResolutionData: (resolutionData) => {
    const errors = [];

    if (!resolutionData.resolutionNotes?.trim()) {
      errors.push('Resolution notes are required');
    }

    if (resolutionData.resolutionNotes && resolutionData.resolutionNotes.length > 2000) {
      errors.push('Resolution notes cannot exceed 2000 characters');
    }

    if (resolutionData.adjustmentNotes && resolutionData.adjustmentNotes.length > 500) {
      errors.push('Adjustment notes cannot exceed 500 characters');
    }

    if (resolutionData.adjustmentAmount && Math.abs(resolutionData.adjustmentAmount) > 10000) {
      errors.push('Adjustment amount cannot exceed 10,000');
    }

    return errors;
  },

  validateBulkRecalculation: (bulkData) => {
    const errors = [];

    if (!bulkData.startDate) {
      errors.push('Start date is required');
    }

    if (!bulkData.endDate) {
      errors.push('End date is required');
    }

    if (bulkData.startDate && bulkData.endDate) {
      const start = new Date(bulkData.startDate);
      const end = new Date(bulkData.endDate);
      
      if (end <= start) {
        errors.push('End date must be after start date');
      }

      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        errors.push('Date range cannot exceed 1 year');
      }
    }

    if (bulkData.recalculateAll && bulkData.stationIds && bulkData.stationIds.length > 0) {
      errors.push('Cannot specify both recalculateAll and specific stationIds');
    }

    return errors;
  },

  validateQueryFilters: (filters) => {
    const errors = [];

    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      
      if (end <= start) {
        errors.push('End date must be after start date');
      }
    }

    if (filters.page && (filters.page < 1 || filters.page > 1000)) {
      errors.push('Page must be between 1 and 1000');
    }

    if (filters.limit && (filters.limit < 1 || filters.limit > 1000)) {
      errors.push('Limit must be between 1 and 1000');
    }

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (filters.companyId && !uuidRegex.test(filters.companyId)) {
      errors.push('Invalid company ID format');
    }

    if (filters.stationId && !uuidRegex.test(filters.stationId)) {
      errors.push('Invalid station ID format');
    }

    if (filters.shiftId && !uuidRegex.test(filters.shiftId)) {
      errors.push('Invalid shift ID format');
    }

    if (filters.tankId && !uuidRegex.test(filters.tankId)) {
      errors.push('Invalid tank ID format');
    }

    if (filters.productId && !uuidRegex.test(filters.productId)) {
      errors.push('Invalid product ID format');
    }

    return errors;
  },

  // =====================
  // DATA TRANSFORMATION UTILITIES
  // =====================

  formatReconciliationForDisplay: (reconciliation) => {
    if (!reconciliation) return null;
    
    const severityColor = {
      'NORMAL': 'success',
      'WARNING': 'warning',
      'CRITICAL': 'error'
    };

    const statusColor = {
      'PENDING': 'default',
      'IN_PROGRESS': 'info',
      'COMPLETED': 'success',
      'DISCREPANCY': 'warning',
      'UNDER_REVIEW': 'warning',
      'RESOLVED': 'success'
    };

    return {
      ...reconciliation,
      severityColor: severityColor[reconciliation.severity] || 'default',
      statusColor: statusColor[reconciliation.status] || 'default',
      totalVarianceDisplay: this.formatVolume(Math.abs(reconciliation.totalVariance)),
      variancePercentageDisplay: `${reconciliation.variancePercentage.toFixed(2)}%`,
      totalPumpDispensedDisplay: this.formatVolume(reconciliation.totalPumpDispensed),
      totalTankReductionDisplay: this.formatVolume(reconciliation.totalTankReduction),
      recordedAtDisplay: new Date(reconciliation.recordedAt).toLocaleDateString(),
      recordedByDisplay: reconciliation.recordedBy ? 
        `${reconciliation.recordedBy.firstName} ${reconciliation.recordedBy.lastName}` : 'Unknown',
      stationName: reconciliation.shift?.station?.name || 'Unknown Station',
      shiftNumber: reconciliation.shift?.shiftNumber || 'Unknown Shift',
      criticalTanks: reconciliation.summary?.criticalTanks || 0,
      warningTanks: reconciliation.summary?.warningTanks || 0,
      normalTanks: reconciliation.summary?.normalTanks || 0,
      totalTanks: reconciliation.summary?.totalTanks || 0
    };
  },

  formatTankReconciliationForDisplay: (tankReconciliation) => {
    if (!tankReconciliation) return null;
    
    const severityColor = {
      'NORMAL': 'success',
      'WARNING': 'warning',
      'CRITICAL': 'error'
    };

    return {
      ...tankReconciliation,
      severityColor: severityColor[tankReconciliation.severity] || 'default',
      openingVolumeDisplay: this.formatVolume(tankReconciliation.openingVolume),
      closingVolumeDisplay: this.formatVolume(tankReconciliation.closingVolume),
      tankReductionDisplay: this.formatVolume(tankReconciliation.tankReduction),
      totalOffloadedDisplay: this.formatVolume(tankReconciliation.totalOffloaded),
      adjustedReductionDisplay: this.formatVolume(tankReconciliation.adjustedReduction),
      totalPumpDispensedDisplay: this.formatVolume(tankReconciliation.totalPumpDispensed),
      varianceDisplay: this.formatVolume(Math.abs(tankReconciliation.variance)),
      variancePercentageDisplay: `${tankReconciliation.variancePercentage.toFixed(2)}%`,
      tankName: tankReconciliation.tank?.asset?.name || 'Unknown Tank',
      productName: tankReconciliation.tank?.product?.name || 'Unknown Product',
      isWithinToleranceDisplay: tankReconciliation.isWithinTolerance ? 'Within Tolerance' : 'Outside Tolerance',
      toleranceDisplay: `±${tankReconciliation.tolerancePercentage}%`,
      avgTemperatureDisplay: tankReconciliation.avgTemperature ? 
        `${tankReconciliation.avgTemperature.toFixed(1)}°C` : 'N/A',
      connectedPumpsCount: Array.isArray(tankReconciliation.connectedPumps) ? 
        tankReconciliation.connectedPumps.length : 0
    };
  },

  formatVolume: (volume) => {
    if (volume === null || volume === undefined) return 'N/A';
    
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)} kL`;
    } else {
      return `${volume.toFixed(2)} L`;
    }
  },

  formatStatisticsForDisplay: (statistics) => {
    if (!statistics) return null;

    return {
      ...statistics,
      avgVarianceDisplay: `${statistics.summary?.avgVariance?.toFixed(2)}%` || '0%',
      criticalRateDisplay: `${statistics.summary?.criticalRate?.toFixed(1)}%` || '0%',
      warningRateDisplay: `${statistics.summary?.warningRate?.toFixed(1)}%` || '0%',
      complianceRateDisplay: `${statistics.summary?.complianceRate?.toFixed(1)}%` || '0%',
      periodDisplay: statistics.period ? 
        `${new Date(statistics.period.startDate).toLocaleDateString()} - ${new Date(statistics.period.endDate).toLocaleDateString()}` : 'N/A'
    };
  },

  formatTrendsForDisplay: (trends) => {
    if (!trends) return null;

    return {
      ...trends,
      avgVariancePercentageDisplay: `${trends.avgVariancePercentage?.toFixed(2)}%` || '0%',
      criticalRateDisplay: `${trends.criticalRate?.toFixed(1)}%` || '0%',
      dailyAverages: trends.dailyAverages?.map(day => ({
        ...day,
        avgVarianceDisplay: `${day.avgVariance?.toFixed(2)}%` || '0%',
        dateDisplay: new Date(day.date).toLocaleDateString()
      })) || [],
      productPerformance: trends.productPerformance?.map(product => ({
        ...product,
        avgVarianceDisplay: `${product.avgVariance?.toFixed(2)}%` || '0%',
        criticalRateDisplay: `${product.criticalRate?.toFixed(1)}%` || '0%'
      })) || []
    };
  },

  formatDashboardForDisplay: (dashboard) => {
    if (!dashboard) return null;

    const statusColor = {
      'HEALTHY': 'success',
      'WARNING': 'warning',
      'CRITICAL': 'error',
      'NO_DATA': 'default'
    };

    return {
      ...dashboard,
      currentStatusColor: statusColor[dashboard.currentStatus] || 'default',
      performanceMetrics: {
        ...dashboard.performanceMetrics,
        avgVarianceDisplay: `${dashboard.performanceMetrics?.avgVariance?.toFixed(2)}%` || '0%',
        complianceRateDisplay: `${dashboard.performanceMetrics?.complianceRate?.toFixed(1)}%` || '0%',
        criticalRateDisplay: `${dashboard.performanceMetrics?.criticalRate?.toFixed(1)}%` || '0%',
        improvementTrendDisplay: dashboard.performanceMetrics?.improvementTrend ? 
          `${dashboard.performanceMetrics.improvementTrend > 0 ? '+' : ''}${dashboard.performanceMetrics.improvementTrend.toFixed(2)}%` : '0%'
      },
      recentIssues: dashboard.recentIssues?.map(issue => ({
        ...issue,
        varianceDisplay: this.formatVolume(Math.abs(issue.variance)),
        variancePercentageDisplay: `${issue.variancePercentage?.toFixed(2)}%` || '0%',
        recordedAtDisplay: new Date(issue.recordedAt).toLocaleDateString()
      })) || [],
      improvementAreas: dashboard.improvementAreas?.map(area => ({
        ...area,
        issueCountDisplay: `${area.issueCount} issues`
      })) || []
    };
  },

  // =====================
  // FILTER UTILITIES
  // =====================

  buildReconciliationFilters: (filters) => {
    const cleanFilters = {};
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        cleanFilters[key] = filters[key];
      }
    });

    return cleanFilters;
  },

  filterReconciliationsBySeverity: (reconciliations, severity) => {
    if (!Array.isArray(reconciliations)) return [];
    if (!severity) return reconciliations;
    
    return reconciliations.filter(reconciliation => reconciliation.severity === severity);
  },

  filterReconciliationsByStatus: (reconciliations, status) => {
    if (!Array.isArray(reconciliations)) return [];
    if (!status) return reconciliations;
    
    return reconciliations.filter(reconciliation => reconciliation.status === status);
  },

  filterReconciliationsByDateRange: (reconciliations, startDate, endDate) => {
    if (!Array.isArray(reconciliations)) return [];
    if (!startDate || !endDate) return reconciliations;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return reconciliations.filter(reconciliation => {
      const recordedAt = new Date(reconciliation.recordedAt);
      return recordedAt >= start && recordedAt <= end;
    });
  },

  // =====================
  // SEARCH UTILITIES
  // =====================

  searchReconciliations: (reconciliations, searchTerm) => {
    if (!Array.isArray(reconciliations)) return [];
    if (!searchTerm) return reconciliations;
    
    const term = searchTerm.toLowerCase();
    
    return reconciliations.filter(reconciliation => 
      reconciliation.shift?.shiftNumber?.toLowerCase().includes(term) ||
      reconciliation.shift?.station?.name?.toLowerCase().includes(term) ||
      reconciliation.recordedBy?.firstName?.toLowerCase().includes(term) ||
      reconciliation.recordedBy?.lastName?.toLowerCase().includes(term) ||
      reconciliation.notes?.toLowerCase().includes(term)
    );
  },

  searchTankReconciliations: (tankReconciliations, searchTerm) => {
    if (!Array.isArray(tankReconciliations)) return [];
    if (!searchTerm) return tankReconciliations;
    
    const term = searchTerm.toLowerCase();
    
    return tankReconciliations.filter(tankRec => 
      tankRec.tank?.asset?.name?.toLowerCase().includes(term) ||
      tankRec.tank?.product?.name?.toLowerCase().includes(term) ||
      tankRec.notes?.toLowerCase().includes(term)
    );
  },

  // =====================
  // SORTING UTILITIES
  // =====================

  sortReconciliations: (reconciliations, sortBy, sortOrder = 'desc') => {
    if (!Array.isArray(reconciliations)) return [];
    
    return [...reconciliations].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'recordedAt':
          aValue = new Date(a.recordedAt);
          bValue = new Date(b.recordedAt);
          break;
        case 'severity':
          const severityOrder = { 'CRITICAL': 3, 'WARNING': 2, 'NORMAL': 1 };
          aValue = severityOrder[a.severity] || 0;
          bValue = severityOrder[b.severity] || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'totalVariance':
          aValue = Math.abs(a.totalVariance);
          bValue = Math.abs(b.totalVariance);
          break;
        case 'variancePercentage':
          aValue = Math.abs(a.variancePercentage);
          bValue = Math.abs(b.variancePercentage);
          break;
        case 'station':
          aValue = a.shift?.station?.name || '';
          bValue = b.shift?.station?.name || '';
          break;
        case 'shift':
          aValue = a.shift?.shiftNumber || '';
          bValue = b.shift?.shiftNumber || '';
          break;
        default:
          aValue = new Date(a.recordedAt);
          bValue = new Date(b.recordedAt);
      }
      
      if (sortOrder === 'desc') {
        [aValue, bValue] = [bValue, aValue];
      }
      
      if (typeof aValue === 'string') {
        return aValue.localeCompare(bValue);
      }
      
      return aValue - bValue;
    });
  },

  sortTankReconciliations: (tankReconciliations, sortBy, sortOrder = 'desc') => {
    if (!Array.isArray(tankReconciliations)) return [];
    
    return [...tankReconciliations].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'tank':
          aValue = a.tank?.asset?.name || '';
          bValue = b.tank?.asset?.name || '';
          break;
        case 'product':
          aValue = a.tank?.product?.name || '';
          bValue = b.tank?.product?.name || '';
          break;
        case 'variance':
          aValue = Math.abs(a.variance);
          bValue = Math.abs(b.variance);
          break;
        case 'variancePercentage':
          aValue = Math.abs(a.variancePercentage);
          bValue = Math.abs(b.variancePercentage);
          break;
        case 'severity':
          const severityOrder = { 'CRITICAL': 3, 'WARNING': 2, 'NORMAL': 1 };
          aValue = severityOrder[a.severity] || 0;
          bValue = severityOrder[b.severity] || 0;
          break;
        case 'totalPumpDispensed':
          aValue = a.totalPumpDispensed;
          bValue = b.totalPumpDispensed;
          break;
        default:
          aValue = a.tank?.asset?.name || '';
          bValue = b.tank?.asset?.name || '';
      }
      
      if (sortOrder === 'desc') {
        [aValue, bValue] = [bValue, aValue];
      }
      
      if (typeof aValue === 'string') {
        return aValue.localeCompare(bValue);
      }
      
      return aValue - bValue;
    });
  },

  // =====================
  // DATA MAPPING UTILITIES
  // =====================

  mapResolutionToForm: (reconciliation) => {
    if (!reconciliation) return null;
    
    return {
      resolutionNotes: '',
      resolutionType: '',
      adjustmentAmount: 0,
      adjustmentNotes: ''
    };
  },

  mapFormToResolution: (formData) => {
    return {
      resolutionNotes: formData.resolutionNotes.trim(),
      resolutionType: formData.resolutionType || null,
      adjustmentAmount: formData.adjustmentAmount || 0,
      adjustmentNotes: formData.adjustmentNotes?.trim() || null
    };
  },

  mapBulkRecalculationToForm: () => {
    return {
      startDate: '',
      endDate: '',
      status: 'DISCREPANCY',
      severity: 'CRITICAL',
      stationIds: [],
      forceRecalculation: false,
      recalculateAll: false
    };
  },

  mapFormToBulkRecalculation: (formData) => {
    return {
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: formData.status,
      severity: formData.severity,
      stationIds: formData.stationIds || [],
      forceRecalculation: formData.forceRecalculation || false,
      recalculateAll: formData.recalculateAll || false
    };
  },

  // =====================
  // STATISTICS AND ANALYTICS
  // =====================

  calculateReconciliationStatistics: (reconciliations) => {
    if (!Array.isArray(reconciliations)) return null;
    
    const criticalCount = reconciliations.filter(rec => rec.severity === 'CRITICAL').length;
    const warningCount = reconciliations.filter(rec => rec.severity === 'WARNING').length;
    const normalCount = reconciliations.filter(rec => rec.severity === 'NORMAL').length;
    
    const totalVariance = reconciliations.reduce((sum, rec) => sum + Math.abs(rec.variancePercentage), 0);
    const avgVariance = reconciliations.length > 0 ? totalVariance / reconciliations.length : 0;
    
    return {
      totalReconciliations: reconciliations.length,
      criticalCount,
      warningCount,
      normalCount,
      criticalRate: reconciliations.length > 0 ? (criticalCount / reconciliations.length * 100) : 0,
      warningRate: reconciliations.length > 0 ? (warningCount / reconciliations.length * 100) : 0,
      normalRate: reconciliations.length > 0 ? (normalCount / reconciliations.length * 100) : 0,
      avgVariance,
      totalVarianceVolume: reconciliations.reduce((sum, rec) => sum + Math.abs(rec.totalVariance), 0)
    };
  },

  calculateTankPerformance: (tankReconciliations) => {
    if (!Array.isArray(tankReconciliations)) return null;
    
    const tankPerformance = {};
    
    tankReconciliations.forEach(tankRec => {
      const tankName = tankRec.tank?.asset?.name || 'Unknown Tank';
      const productName = tankRec.tank?.product?.name || 'Unknown Product';
      
      if (!tankPerformance[tankName]) {
        tankPerformance[tankName] = {
          tankName,
          productName,
          totalReconciliations: 0,
          totalVariance: 0,
          criticalCount: 0,
          warningCount: 0,
          normalCount: 0,
          totalVolume: 0
        };
      }
      
      tankPerformance[tankName].totalReconciliations++;
      tankPerformance[tankName].totalVariance += Math.abs(tankRec.variancePercentage);
      tankPerformance[tankName].totalVolume += tankRec.totalPumpDispensed;
      
      if (tankRec.severity === 'CRITICAL') tankPerformance[tankName].criticalCount++;
      else if (tankRec.severity === 'WARNING') tankPerformance[tankName].warningCount++;
      else tankPerformance[tankName].normalCount++;
    });

    return Object.values(tankPerformance).map(tank => ({
      ...tank,
      avgVariance: tank.totalVariance / tank.totalReconciliations,
      criticalRate: (tank.criticalCount / tank.totalReconciliations) * 100,
      warningRate: (tank.warningCount / tank.totalReconciliations) * 100,
      normalRate: (tank.normalCount / tank.totalReconciliations) * 100,
      performance: (tank.avgVariance < 1) ? 'EXCELLENT' : 
                   (tank.avgVariance < 3) ? 'GOOD' : 
                   (tank.avgVariance < 5) ? 'FAIR' : 'POOR'
    }));
  },

  // =====================
  // EXPORT/IMPORT UTILITIES
  // =====================

  exportReconciliationsToCSV: (reconciliations) => {
    if (!reconciliations || !reconciliations.length) return '';
    
    const headers = ['Date', 'Station', 'Shift', 'Total Variance', 'Variance %', 'Severity', 'Status', 'Pump Dispensed', 'Tank Reduction', 'Recorded By'];
    const rows = reconciliations.map(rec => [
      new Date(rec.recordedAt).toLocaleDateString(),
      rec.shift?.station?.name || 'N/A',
      rec.shift?.shiftNumber || 'N/A',
      this.formatVolume(Math.abs(rec.totalVariance)),
      `${rec.variancePercentage.toFixed(2)}%`,
      rec.severity,
      rec.status,
      this.formatVolume(rec.totalPumpDispensed),
      this.formatVolume(rec.totalTankReduction),
      rec.recordedBy ? `${rec.recordedBy.firstName} ${rec.recordedBy.lastName}` : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  },

  exportTankReconciliationsToCSV: (tankReconciliations) => {
    if (!tankReconciliations || !tankReconciliations.length) return '';
    
    const headers = ['Tank', 'Product', 'Opening Volume', 'Closing Volume', 'Pump Dispensed', 'Variance', 'Variance %', 'Severity', 'Temperature', 'Pumps Connected'];
    const rows = tankReconciliations.map(tankRec => [
      tankRec.tank?.asset?.name || 'N/A',
      tankRec.tank?.product?.name || 'N/A',
      this.formatVolume(tankRec.openingVolume),
      this.formatVolume(tankRec.closingVolume),
      this.formatVolume(tankRec.totalPumpDispensed),
      this.formatVolume(Math.abs(tankRec.variance)),
      `${tankRec.variancePercentage.toFixed(2)}%`,
      tankRec.severity,
      tankRec.avgTemperature ? `${tankRec.avgTemperature.toFixed(1)}°C` : 'N/A',
      Array.isArray(tankRec.connectedPumps) ? tankRec.connectedPumps.length : 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  },

  downloadReconciliationsCSV: (reconciliations, filename = 'wetstock_reconciliations.csv') => {
    const csvContent = this.exportReconciliationsToCSV(reconciliations);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  downloadTankReconciliationsCSV: (tankReconciliations, filename = 'tank_reconciliations.csv') => {
    const csvContent = this.exportTankReconciliationsToCSV(tankReconciliations);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  // =====================
  // CACHE AND STATE MANAGEMENT HELPERS
  // =====================

  generateReconciliationKey: (reconciliation) => {
    return `${reconciliation.id}-${reconciliation.updatedAt}`;
  },

  generateTankReconciliationKey: (tankReconciliation) => {
    return `${tankReconciliation.id}-${tankReconciliation.variancePercentage}`;
  },

  findReconciliationById: (reconciliations, reconciliationId) => {
    return reconciliations.find(rec => rec.id === reconciliationId);
  },

  findReconciliationsByShift: (reconciliations, shiftId) => {
    return reconciliations.filter(rec => rec.shiftId === shiftId);
  },

  findReconciliationsByStation: (reconciliations, stationId) => {
    return reconciliations.filter(rec => rec.shift?.stationId === stationId);
  },

  findTankReconciliationsByTank: (tankReconciliations, tankId) => {
    return tankReconciliations.filter(tankRec => tankRec.tankId === tankId);
  },

  findTankReconciliationsByProduct: (tankReconciliations, productId) => {
    return tankReconciliations.filter(tankRec => tankRec.productId === productId);
  },

  // =====================
  // BATCH OPERATIONS
  // =====================

  bulkCalculateReconciliations: async (shiftIds) => {
    logger.info('Bulk calculating wet stock reconciliations:', shiftIds);
    
    try {
      const results = [];
      
      for (const shiftId of shiftIds) {
        try {
          const result = await this.calculateWetStockReconciliation(shiftId);
          results.push({ success: true, data: result, shiftId });
        } catch (error) {
          results.push({ 
            success: false, 
            error: error.message,
            shiftId 
          });
        }
      }
      
      logger.info('Bulk calculation completed', {
        total: shiftIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
      
      return this.processBulkResults(results);
    } catch (error) {
      throw handleError(error, 'bulk calculating reconciliations', 'Failed to process bulk calculations');
    }
  },

  bulkResolveReconciliations: async (resolutionDataArray) => {
    logger.info('Bulk resolving wet stock reconciliations:', resolutionDataArray);
    
    try {
      const results = [];
      
      for (const resolutionData of resolutionDataArray) {
        try {
          const result = await this.resolveWetStockReconciliation(resolutionData.shiftId, resolutionData);
          results.push({ success: true, data: result, shiftId: resolutionData.shiftId });
        } catch (error) {
          results.push({ 
            success: false, 
            error: error.message,
            shiftId: resolutionData.shiftId 
          });
        }
      }
      
      logger.info('Bulk resolution completed', {
        total: resolutionDataArray.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
      
      return this.processBulkResults(results);
    } catch (error) {
      throw handleError(error, 'bulk resolving reconciliations', 'Failed to process bulk resolutions');
    }
  },

  processBulkResults: (results) => {
    const successful = results.filter(result => result.success);
    const failed = results.filter(result => !result.success);
    
    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: results.length > 0 ? (successful.length / results.length * 100).toFixed(1) + '%' : '0%',
      details: {
        successful: successful.map(s => s.data),
        failed: failed.map(f => ({
          shiftId: f.shiftId,
          error: f.error
        }))
      }
    };
  },

  // =====================
  // QUICK OPERATIONS
  // =====================

  quickCalculateReconciliation: async (shiftId) => {
    return await this.calculateWetStockReconciliation(shiftId);
  },

  quickResolveReconciliation: async (shiftId, resolutionNotes) => {
    const resolutionData = {
      resolutionNotes: resolutionNotes.trim(),
      resolutionType: 'OTHER'
    };

    return await this.resolveWetStockReconciliation(shiftId, resolutionData);
  },

  // =====================
  // DATA QUALITY CHECKS
  // =====================

  checkDataQuality: (reconciliation) => {
    const quality = {
      score: 100,
      issues: [],
      warnings: [],
      recommendations: []
    };

    // Check tank data completeness
    if (!reconciliation.tankReconciliations || reconciliation.tankReconciliations.length === 0) {
      quality.score -= 30;
      quality.issues.push('No tank reconciliation data available');
    } else {
      reconciliation.tankReconciliations.forEach((tankRec, index) => {
        if (!tankRec.openingVolume || !tankRec.closingVolume) {
          quality.score -= 10;
          quality.issues.push(`Tank ${index + 1}: Missing volume readings`);
        }

        if (Math.abs(tankRec.variancePercentage) > 5) {
          quality.score -= 15;
          quality.warnings.push(`Tank ${index + 1}: High variance (${tankRec.variancePercentage.toFixed(2)}%)`);
        }

        if (!tankRec.avgTemperature) {
          quality.score -= 5;
          quality.warnings.push(`Tank ${index + 1}: No temperature data`);
        }

        if (!Array.isArray(tankRec.connectedPumps) || tankRec.connectedPumps.length === 0) {
          quality.score -= 10;
          quality.issues.push(`Tank ${index + 1}: No connected pumps data`);
        }
      });
    }

    // Check overall reconciliation quality
    if (reconciliation.status === 'DISCREPANCY') {
      quality.score -= 20;
      quality.issues.push('Reconciliation has discrepancies that need resolution');
    }

    if (reconciliation.severity === 'CRITICAL') {
      quality.score -= 25;
      quality.issues.push('Critical variance detected - requires immediate attention');
    }

    if (reconciliation.severity === 'WARNING') {
      quality.score -= 10;
      quality.warnings.push('Warning level variance detected - review recommended');
    }

    // Ensure score doesn't go below 0
    quality.score = Math.max(0, quality.score);

    // Add quality rating
    if (quality.score >= 90) quality.rating = 'EXCELLENT';
    else if (quality.score >= 75) quality.rating = 'GOOD';
    else if (quality.score >= 60) quality.rating = 'FAIR';
    else quality.rating = 'POOR';

    // Generate recommendations based on issues
    if (quality.issues.length > 0) {
      quality.recommendations.push('Review and address all critical issues');
    }

    if (quality.warnings.length > 0) {
      quality.recommendations.push('Monitor warning items for potential improvements');
    }

    if (quality.score < 75) {
      quality.recommendations.push('Consider recalculation with additional validation checks');
    }

    return quality;
  },

  // =====================
  // PERFORMANCE METRICS
  // =====================

  calculatePerformanceMetrics: (reconciliations) => {
    if (!Array.isArray(reconciliations) || reconciliations.length === 0) {
      return {
        accuracy: 0,
        consistency: 0,
        reliability: 0,
        efficiency: 0
      };
    }

    const recentHalf = reconciliations.slice(0, Math.ceil(reconciliations.length / 2));
    const varianceValues = recentHalf.map(rec => Math.abs(rec.variancePercentage));
    
    // Accuracy: Higher score for lower variance
    const accuracy = Math.max(0, 100 - (varianceValues.reduce((a, b) => a + b, 0) / varianceValues.length));
    
    // Consistency: Lower standard deviation means higher consistency
    const consistency = this.calculateConsistency(varianceValues);
    
    // Reliability: Percentage of reconciliations without critical issues
    const reliability = (recentHalf.filter(rec => rec.severity === 'NORMAL').length / recentHalf.length) * 100;
    
    // Efficiency: Based on resolution time and data completeness
    const efficiency = this.calculateEfficiency(recentHalf);

    return {
      accuracy: Math.round(accuracy),
      consistency: Math.round(consistency),
      reliability: Math.round(reliability),
      efficiency: Math.round(efficiency),
      overall: Math.round((accuracy + consistency + reliability + efficiency) / 4)
    };
  },

  calculateConsistency: (varianceValues) => {
    if (varianceValues.length < 2) return 100;
    
    const mean = varianceValues.reduce((a, b) => a + b) / varianceValues.length;
    const variance = varianceValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / varianceValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation means higher consistency
    return Math.max(0, 100 - (stdDev * 10));
  },

  calculateEfficiency: (reconciliations) => {
    let efficiencyScore = 100;
    
    reconciliations.forEach(rec => {
      // Deduct points for unresolved discrepancies
      if (rec.status === 'DISCREPANCY' || rec.status === 'UNDER_REVIEW') {
        efficiencyScore -= 10;
      }
      
      // Deduct points for critical severity
      if (rec.severity === 'CRITICAL') {
        efficiencyScore -= 15;
      }
      
      // Deduct points for missing tank data
      if (!rec.tankReconciliations || rec.tankReconciliations.length === 0) {
        efficiencyScore -= 20;
      }
    });
    
    return Math.max(0, efficiencyScore / reconciliations.length);
  }
};

// Default export for convenience
export default wetStockService;