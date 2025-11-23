// services/debtTransferService.js
import { apiService } from '../apiService';

const logger = {
  debug: (...args) => console.log('🔍 [DebtTransferService]', ...args),
  info: (...args) => console.log('ℹ️ [DebtTransferService]', ...args),
  warn: (...args) => console.warn('⚠️ [DebtTransferService]', ...args),
  error: (...args) => console.error('❌ [DebtTransferService]', ...args)
};

const handleResponse = (response, operation) => {
  console.log("Debt Transfer API Response:", response.data);
  
  if (response.data) {
    logger.debug(`${operation} successful`);
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

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

export const debtTransferService = {
  // ==================== DEBTOR MANAGEMENT ====================

  /**
   * Search debtors across all stations
   */
  searchDebtors: async (searchCriteria) => {
    logger.info('Searching debtors:', searchCriteria);
    
    try {
      const response = await apiService.get('/debt-transfer/debtors/search', {
        params: searchCriteria
      });
      return handleResponse(response, 'searching debtors');
    } catch (error) {
      throw handleError(error, 'searching debtors', 'Failed to search debtors');
    }
  },

  /**
   * Get detailed debtor profile
   */
  getDebtorProfile: async (debtorId) => {
    logger.info(`Fetching debtor profile: ${debtorId}`);
    
    try {
      const response = await apiService.get(`/debt-transfer/debtors/${debtorId}`);
      return handleResponse(response, 'fetching debtor profile');
    } catch (error) {
      throw handleError(error, 'fetching debtor profile', 'Failed to fetch debtor profile');
    }
  },

  // ==================== TRANSACTIONS & TRANSFERS ====================

  /**
   * Get debtor transactions with filtering
   */
  getDebtorTransactions: async (filters = {}) => {
    logger.info('Fetching debtor transactions with filters:', filters);
    
    try {
      const response = await apiService.get('/debt-transfer/transactions', {
        params: filters
      });
      return handleResponse(response, 'fetching debtor transactions');
    } catch (error) {
      throw handleError(error, 'fetching debtor transactions', 'Failed to fetch debtor transactions');
    }
  },

  /**
   * Get account transfers with comprehensive filters
   */
  getAccountTransfers: async (filters = {}) => {
    logger.info('Fetching account transfers with filters:', filters);
    
    try {
      const response = await apiService.get('/debt-transfer/transfers', {
        params: filters
      });
      return handleResponse(response, 'fetching account transfers');
    } catch (error) {
      throw handleError(error, 'fetching account transfers', 'Failed to fetch account transfers');
    }
  },

  /**
   * Get single transfer with full details
   */
  getTransferById: async (transferId) => {
    logger.info(`Fetching transfer: ${transferId}`);
    
    try {
      const response = await apiService.get(`/debt-transfer/transfers/${transferId}`);
      return handleResponse(response, 'fetching transfer details');
    } catch (error) {
      throw handleError(error, 'fetching transfer details', 'Failed to fetch transfer details');
    }
  },

  // ==================== DEBT SETTLEMENT METHODS ====================

  /**
   * Process cash debt settlement
   */
  processCashSettlement: async (settlementData) => {
    logger.info('Processing cash debt settlement:', settlementData);
    
    try {
      const response = await apiService.post('/debt-transfer/settlements/cash', settlementData);
      return handleResponse(response, 'processing cash settlement');
    } catch (error) {
      throw handleError(error, 'processing cash settlement', 'Failed to process cash settlement');
    }
  },

  /**
   * Process electronic debt transfer
   */
  processElectronicTransfer: async (transferData) => {
    logger.info('Processing electronic debt transfer:', transferData);
    
    try {
      const response = await apiService.post('/debt-transfer/transfers/electronic', transferData);
      return handleResponse(response, 'processing electronic transfer');
    } catch (error) {
      throw handleError(error, 'processing electronic transfer', 'Failed to process electronic transfer');
    }
  },

  /**
   * Process bank deposit debt settlement
   */
  processBankSettlement: async (settlementData) => {
    logger.info('Processing bank debt settlement:', settlementData);
    
    try {
      const response = await apiService.post('/debt-transfer/settlements/bank', settlementData);
      return handleResponse(response, 'processing bank settlement');
    } catch (error) {
      throw handleError(error, 'processing bank settlement', 'Failed to process bank settlement');
    }
  },

  // ==================== TRANSFER MANAGEMENT ====================

  /**
   * Update transfer details
   */
  updateTransfer: async (transferId, updateData) => {
    logger.info(`Updating transfer ${transferId}:`, updateData);
    
    try {
      const response = await apiService.put(`/debt-transfer/transfers/${transferId}`, updateData);
      return handleResponse(response, 'updating transfer');
    } catch (error) {
      throw handleError(error, 'updating transfer', 'Failed to update transfer');
    }
  },

  /**
   * Delete transfer (only pending)
   */
  deleteTransfer: async (transferId) => {
    logger.info(`Deleting transfer: ${transferId}`);
    
    try {
      const response = await apiService.delete(`/debt-transfer/transfers/${transferId}`);
      return handleResponse(response, 'deleting transfer');
    } catch (error) {
      throw handleError(error, 'deleting transfer', 'Failed to delete transfer');
    }
  },

  // ==================== UTILITY METHODS ====================

  /**
   * Get available payment methods
   */
  getPaymentMethods: async () => {
    logger.info('Fetching available payment methods');
    
    try {
      const response = await apiService.get('/debt-transfer/payment-methods');
      return handleResponse(response, 'fetching payment methods');
    } catch (error) {
      throw handleError(error, 'fetching payment methods', 'Failed to fetch payment methods');
    }
  },

  /**
   * Get bank accounts for settlement
   */
  getBankAccounts: async () => {
    logger.info('Fetching bank accounts');
    
    try {
      const response = await apiService.get('/debt-transfer/bank-accounts');
      return handleResponse(response, 'fetching bank accounts');
    } catch (error) {
      throw handleError(error, 'fetching bank accounts', 'Failed to fetch bank accounts');
    }
  },

  // ==================== REMOVED ENDPOINTS (Not in backend) ====================

  // The following endpoints were removed because they don't exist in your backend:
  // - getDebtorDebtBreakdown
  // - processCrossStationSettlement 
  // - reverseSettlement
  // - writeOffDebt
  // - getCompanyDebtorsSummary
  // - getDebtAgingReport
  // - getSettlementActivityReport
  // - validatePaymentReference

  // ==================== ANALYSIS & UTILITIES ====================

  /**
   * Calculate settlement metrics
   */
  calculateSettlementMetrics: (settlementData) => {
    if (!settlementData) return null;

    const { transactions, summary } = settlementData;

    const totalSettlements = summary?.totalSettlements || 0;
    const totalAmount = summary?.totalAmount || 0;
    const averageSettlement = totalSettlements > 0 ? totalAmount / totalSettlements : 0;

    // Group by settlement type
    const settlementsByType = transactions?.reduce((acc, transaction) => {
      const type = transaction.transferCategory || 'UNKNOWN';
      acc[type] = (acc[type] || 0) + Math.abs(transaction.amount);
      return acc;
    }, {}) || {};

    // Settlement frequency by day
    const settlementsByDay = transactions?.reduce((acc, transaction) => {
      const day = new Date(transaction.transactionDate).toLocaleDateString();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      totalSettlements,
      totalAmount,
      averageSettlement,
      settlementsByType,
      settlementsByDay,
      mostActiveDay: Object.entries(settlementsByDay).sort(([,a], [,b]) => b - a)[0] || null
    };
  },

  /**
   * Analyze debtor settlement patterns
   */
  analyzeDebtorSettlementPatterns: (debtorData, transactionsData) => {
    if (!debtorData || !transactionsData) return null;

    const metrics = debtTransferService.calculateSettlementMetrics(transactionsData);
    const debtorMetrics = {
      totalDebt: debtorData.totalOutstandingDebt || 0,
      activeDebtors: debtorData.totalActiveDebtors || 0,
      averageDebtPerDebtor: debtorData.averageDebtPerDebtor || 0
    };

    const settlementEfficiency = debtorMetrics.totalDebt > 0 
      ? (metrics.totalAmount / debtorMetrics.totalDebt) * 100 
      : 0;

    return {
      metrics,
      debtorMetrics,
      settlementEfficiency,
      healthScore: Math.min(100, Math.max(0, 100 - (debtorMetrics.averageDebtPerDebtor / 1000) * 10)), // Simple scoring
      recommendation: settlementEfficiency < 30 ? 'Increase collection efforts' : 
                     settlementEfficiency < 60 ? 'Maintain current collection strategy' : 
                     'Excellent collection performance'
    };
  },

  /**
   * Format settlement data for charts
   */
  formatSettlementDataForCharts: (transactionsData) => {
    const metrics = debtTransferService.calculateSettlementMetrics(transactionsData);
    if (!metrics) return null;

    // Settlement type distribution
    const typeChartData = {
      labels: Object.keys(metrics.settlementsByType),
      datasets: [
        {
          label: 'Settlement Amount',
          data: Object.values(metrics.settlementsByType),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
        }
      ]
    };

    // Settlement timeline
    const timelineChartData = {
      labels: Object.keys(metrics.settlementsByDay),
      datasets: [
        {
          label: 'Settlements per Day',
          data: Object.values(metrics.settlementsByDay),
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: true
        }
      ]
    };

    return {
      typeChartData,
      timelineChartData,
      metrics
    };
  },

  /**
   * Generate settlement insights
   */
  generateSettlementInsights: (debtorData, transactionsData) => {
    const analysis = debtTransferService.analyzeDebtorSettlementPatterns(debtorData, transactionsData);
    if (!analysis) return null;

    const insights = [];

    // High debt insight
    if (analysis.debtorMetrics.totalDebt > 100000) {
      insights.push({
        type: 'HIGH_TOTAL_DEBT',
        title: 'High Total Debt',
        message: `Total outstanding debt is $${analysis.debtorMetrics.totalDebt.toLocaleString()}`,
        severity: 'warning',
        suggestion: 'Consider implementing stricter credit policies'
      });
    }

    // Low settlement efficiency insight
    if (analysis.settlementEfficiency < 30) {
      insights.push({
        type: 'LOW_SETTLEMENT_EFFICIENCY',
        title: 'Low Collection Rate',
        message: `Only ${analysis.settlementEfficiency.toFixed(1)}% of debt is being collected`,
        severity: 'critical',
        suggestion: 'Review collection processes and follow-up procedures'
      });
    }

    // High average debt insight
    if (analysis.debtorMetrics.averageDebtPerDebtor > 5000) {
      insights.push({
        type: 'HIGH_AVERAGE_DEBT',
        title: 'High Average Debt',
        message: `Average debt per debtor is $${analysis.debtorMetrics.averageDebtPerDebtor.toLocaleString()}`,
        severity: 'warning',
        suggestion: 'Monitor high-debt accounts closely'
      });
    }

    // Positive insight for good performance
    if (analysis.settlementEfficiency > 80) {
      insights.push({
        type: 'EXCELLENT_PERFORMANCE',
        title: 'Excellent Collection Performance',
        message: 'Debt collection efficiency is outstanding',
        severity: 'success',
        suggestion: 'Maintain current collection strategies'
      });
    }

    return {
      insights,
      analysis,
      healthScore: analysis.healthScore,
      recommendation: analysis.recommendation
    };
  },

  // ==================== VALIDATION UTILITIES ====================

  /**
   * Validate cash settlement data
   */
  validateCashSettlement: (settlementData) => {
    const errors = [];

    if (!settlementData.debtorId) {
      errors.push('Debtor selection is required');
    }
    if (!settlementData.amount || settlementData.amount <= 0) {
      errors.push('Valid settlement amount is required');
    }
    if (!settlementData.stationId) {
      errors.push('Station selection is required');
    }
    if (!settlementData.shiftId) {
      errors.push('Shift information is required');
    }

    return errors;
  },

  /**
   * Validate electronic transfer data
   */
  validateElectronicTransfer: (transferData) => {
    const errors = [];

    if (!transferData.debtorId) {
      errors.push('Payer debtor selection is required');
    }
    if (!transferData.targetDebtorId) {
      errors.push('Payment method selection is required');
    }
    if (!transferData.amount || transferData.amount <= 0) {
      errors.push('Valid transfer amount is required');
    }
    if (!transferData.stationId) {
      errors.push('Station selection is required');
    }
    if (!transferData.shiftId) {
      errors.push('Shift information is required');
    }

    return errors;
  },

  /**
   * Validate bank settlement data
   */
  validateBankSettlement: (settlementData) => {
    const errors = [];

    if (!settlementData.debtorId) {
      errors.push('Debtor selection is required');
    }
    if (!settlementData.amount || settlementData.amount <= 0) {
      errors.push('Valid settlement amount is required');
    }
    if (!settlementData.bankAccountId) {
      errors.push('Bank account selection is required');
    }
    if (!settlementData.stationId) {
      errors.push('Station selection is required');
    }
    if (!settlementData.shiftId) {
      errors.push('Shift information is required');
    }
    if (!settlementData.transactionMode) {
      errors.push('Transaction mode is required');
    }

    return errors;
  },

  /**
   * Format settlement for submission
   */
  formatSettlementForSubmission: (rawData, settlementType) => {
    const baseData = {
      ...rawData,
      amount: Number(rawData.amount),
      description: rawData.description || `${settlementType} settlement`
    };

    // Add type-specific formatting
    switch (settlementType) {
      case 'CASH':
        return {
          ...baseData,
          paymentType: 'CASH'
        };
      case 'ELECTRONIC':
        return {
          ...baseData,
          paymentType: 'ELECTRONIC'
        };
      case 'BANK':
        return {
          ...baseData,
          paymentType: 'BANK'
        };
      default:
        return baseData;
    }
  },

  // ==================== EXPORT UTILITIES ====================

  /**
   * Export settlement report to CSV
   */
  exportSettlementReport: (transactionsData, reportType = 'detailed') => {
    if (!transactionsData || !transactionsData.transactions) return '';

    const csvRows = [];

    // Header
    csvRows.push('Debt Settlement Report');
    csvRows.push(`Report Type,${reportType}`);
    csvRows.push(`Generated,${new Date().toLocaleString()}`);
    csvRows.push('');

    if (reportType === 'summary') {
      // Summary report
      const metrics = debtTransferService.calculateSettlementMetrics(transactionsData);
      
      csvRows.push('Settlement Summary');
      csvRows.push('Metric,Value');
      csvRows.push(`Total Settlements,${metrics.totalSettlements}`);
      csvRows.push(`Total Amount,$${metrics.totalAmount.toFixed(2)}`);
      csvRows.push(`Average Settlement,$${metrics.averageSettlement.toFixed(2)}`);
      csvRows.push('');
      
      csvRows.push('Settlement by Type');
      csvRows.push('Type,Amount,Percentage');
      Object.entries(metrics.settlementsByType).forEach(([type, amount]) => {
        const percentage = (amount / metrics.totalAmount * 100).toFixed(2);
        csvRows.push(`${type},$${amount.toFixed(2)},${percentage}%`);
      });
    } else {
      // Detailed report
      csvRows.push('Detailed Settlement Transactions');
      csvRows.push('Date,Debtor,Station,Amount,Type,Description,Recorded By');
      
      transactionsData.transactions.forEach(transaction => {
        csvRows.push([
          new Date(transaction.transactionDate).toLocaleDateString(),
          transaction.stationDebtorAccount?.debtor?.name || 'N/A',
          transaction.stationDebtorAccount?.station?.name || 'N/A',
          `$${Math.abs(transaction.amount).toFixed(2)}`,
          transaction.type,
          transaction.description,
          `${transaction.recordedBy?.firstName} ${transaction.recordedBy?.lastName}`
        ].join(','));
      });
    }

    return csvRows.join('\n');
  },

  // ==================== NOTIFICATION UTILITIES ====================

  /**
   * Check for settlement alerts
   */
  checkSettlementAlerts: (debtorData, transactionsData) => {
    const alerts = [];
    const analysis = debtTransferService.analyzeDebtorSettlementPatterns(debtorData, transactionsData);

    if (!analysis) return alerts;

    // Low settlement activity alert
    const recentSettlements = transactionsData.transactions?.filter(t => {
      const transactionDate = new Date(t.transactionDate);
      const daysAgo = (new Date() - transactionDate) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7; // Last 7 days
    }).length || 0;

    if (recentSettlements === 0) {
      alerts.push({
        type: 'NO_RECENT_SETTLEMENTS',
        title: 'No Recent Settlements',
        message: 'No debt settlements recorded in the past 7 days',
        severity: 'warning',
        action: 'Review collection processes'
      });
    }

    // High debt concentration alert
    const stationBreakdown = debtorData.stationBreakdown || [];
    const highestDebtStation = stationBreakdown.sort((a, b) => b.totalDebt - a.totalDebt)[0];
    
    if (highestDebtStation && highestDebtStation.totalDebt > 50000) {
      alerts.push({
        type: 'HIGH_STATION_DEBT',
        title: 'High Debt Concentration',
        message: `${highestDebtStation.stationName} has $${highestDebtStation.totalDebt.toLocaleString()} in outstanding debt`,
        severity: 'warning',
        action: 'Focus collection efforts on this station'
      });
    }

    return alerts;
  }
};

export default debtTransferService;