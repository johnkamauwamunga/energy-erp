import { apiService } from './apiService';

const logger = {
  debug: (...args) => console.log('🔍 [StationAccountService]', ...args),
  info: (...args) => console.log('ℹ️ [StationAccountService]', ...args),
  warn: (...args) => console.warn('⚠️ [StationAccountService]', ...args),
  error: (...args) => console.error('❌ [StationAccountService]', ...args)
};

const handleResponse = (response, operation) => {
  console.log("Station Account API Response:", response.data);
  
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

export const stationAccountService = {
  // ==================== STATION WALLET ENDPOINTS ====================

  /**
   * Get station wallet information
   */
  getStationWallet: async (stationId) => {
    logger.info(`Fetching station wallet for station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/station-accounts/station/${stationId}/wallet`);
      return handleResponse(response, 'fetching station wallet');
    } catch (error) {
      throw handleError(error, 'fetching station wallet', 'Failed to fetch station wallet');
    }
  },

  /**
   * Get wallet transactions with filters
   */
  getWalletTransactions: async (stationId, filters = {}) => {
    logger.info(`Fetching wallet transactions for station ${stationId}:`, filters);
    
    try {
      const response = await apiService.get(`/station-accounts/station/${stationId}/transactions`, {
        params: filters
      });
      return handleResponse(response, 'fetching wallet transactions');
    } catch (error) {
      throw handleError(error, 'fetching wallet transactions', 'Failed to fetch wallet transactions');
    }
  },

  /**
   * Get station financial summary
   */
  getStationFinancialSummary: async (stationId, period = 'daily') => {
    logger.info(`Fetching financial summary for station ${stationId}, period: ${period}`);
    
    try {
      const response = await apiService.get(`/station-accounts/station/${stationId}/summary`, {
        params: { period }
      });
      return handleResponse(response, 'fetching financial summary');
    } catch (error) {
      throw handleError(error, 'fetching financial summary', 'Failed to fetch financial summary');
    }
  },

  /**
   * Create wallet transaction
   */
  createWalletTransaction: async (stationId, transactionData) => {
    logger.info(`Creating wallet transaction for station ${stationId}:`, transactionData);
    
    try {
      const response = await apiService.post(`/station-accounts/station/${stationId}/transactions`, transactionData);
      return handleResponse(response, 'creating wallet transaction');
    } catch (error) {
      throw handleError(error, 'creating wallet transaction', 'Failed to create wallet transaction');
    }
  },

  // ==================== FINANCIAL ANALYSIS UTILITIES ====================

  /**
   * Calculate wallet metrics
   */
  calculateWalletMetrics: (walletData) => {
    if (!walletData) return null;

    const { currentBalance, openingBalance, todaysInflow, todaysOutflow } = walletData;

    const netFlow = todaysInflow - todaysOutflow;
    const balanceChange = currentBalance - openingBalance;
    const balanceChangePercentage = openingBalance > 0 ? (balanceChange / openingBalance) * 100 : 0;

    return {
      currentBalance,
      openingBalance,
      todaysInflow,
      todaysOutflow,
      netFlow,
      balanceChange,
      balanceChangePercentage,
      isPositive: netFlow >= 0,
      efficiency: todaysInflow > 0 ? (netFlow / todaysInflow) * 100 : 0
    };
  },

  /**
   * Analyze financial health
   */
  analyzeFinancialHealth: (financialSummary) => {
    if (!financialSummary) return null;

    const { wallet, sales, breakdown, debtors } = financialSummary;

    // Cash flow health
    const cashFlowHealth = wallet.currentBalance > (wallet.minBalance || 0) ? 'healthy' : 'low';

    // Collection efficiency
    const collectionEfficiency = sales.collectionRate >= 95 ? 'excellent' :
                                sales.collectionRate >= 90 ? 'good' :
                                sales.collectionRate >= 85 ? 'fair' : 'poor';

    // Debt management
    const debtToSalesRatio = sales.totalSales > 0 ? (debtors.totalOutstanding / sales.totalSales) * 100 : 0;
    const debtHealth = debtToSalesRatio <= 10 ? 'healthy' :
                      debtToSalesRatio <= 20 ? 'moderate' : 'high';

    return {
      cashFlow: {
        status: cashFlowHealth,
        currentBalance: wallet.currentBalance,
        minBalance: wallet.minBalance || 0,
        recommendation: cashFlowHealth === 'low' ? 'Consider cash replenishment' : 'Adequate cash balance'
      },
      collections: {
        status: collectionEfficiency,
        rate: sales.collectionRate,
        recommendation: collectionEfficiency === 'poor' ? 'Improve collection processes' : 'Collections are efficient'
      },
      debt: {
        status: debtHealth,
        ratio: debtToSalesRatio,
        totalOutstanding: debtors.totalOutstanding,
        recommendation: debtHealth === 'high' ? 'Focus on debt recovery' : 'Debt levels are manageable'
      },
      overallHealth: cashFlowHealth === 'healthy' && collectionEfficiency !== 'poor' && debtHealth !== 'high' 
        ? 'healthy' : 'needs_attention'
    };
  },

  // ==================== TRANSACTION ANALYSIS ====================

  /**
   * Analyze transaction patterns
   */
  analyzeTransactionPatterns: (transactionsData) => {
    if (!transactionsData || !transactionsData.transactions) return null;

    const { transactions, summary } = transactionsData;

    // Group transactions by type
    const transactionsByType = transactions.reduce((acc, transaction) => {
      const type = transaction.type;
      if (!acc[type]) {
        acc[type] = { count: 0, total: 0, transactions: [] };
      }
      acc[type].count += 1;
      acc[type].total += transaction.amount;
      acc[type].transactions.push(transaction);
      return acc;
    }, {});

    // Calculate daily patterns
    const transactionsByDay = transactions.reduce((acc, transaction) => {
      const day = new Date(transaction.transactionDate).toLocaleDateString();
      if (!acc[day]) {
        acc[day] = { count: 0, inflow: 0, outflow: 0 };
      }
      acc[day].count += 1;
      if (transaction.amount > 0) {
        acc[day].inflow += transaction.amount;
      } else {
        acc[day].outflow += Math.abs(transaction.amount);
      }
      return acc;
    }, {});

    return {
      byType: transactionsByType,
      byDay: transactionsByDay,
      summary: {
        totalTransactions: summary.transactionCount,
        totalInflow: summary.totalInflow,
        totalOutflow: summary.totalOutflow,
        netFlow: summary.netFlow,
        averageTransaction: summary.transactionCount > 0 ? 
          (summary.totalInflow + summary.totalOutflow) / summary.transactionCount : 0
      }
    };
  },

  // ==================== VISUALIZATION UTILITIES ====================

  /**
   * Format financial data for charts
   */
  formatFinancialDataForCharts: (financialSummary) => {
    const health = stationAccountService.analyzeFinancialHealth(financialSummary);
    if (!health) return null;

    // Cash flow chart
    const cashFlowData = {
      labels: ['Opening Balance', 'Inflow', 'Outflow', 'Current Balance'],
      datasets: [
        {
          label: 'Amount',
          data: [
            financialSummary.wallet.openingBalance,
            financialSummary.wallet.todaysInflow,
            financialSummary.wallet.todaysOutflow,
            financialSummary.wallet.currentBalance
          ],
          backgroundColor: ['#36A2EB', '#4BC0C0', '#FF6384', '#9966FF']
        }
      ]
    };

    // Revenue breakdown chart
    const revenueData = {
      labels: ['Cash Sales', 'Electronic Payments', 'Total'],
      datasets: [
        {
          label: 'Amount',
          data: [
            financialSummary.breakdown.cash,
            financialSummary.breakdown.debts,
            financialSummary.sales.totalCollections
          ],
          backgroundColor: ['#FF6384', '#36A2EB', '#4BC0C0']
        }
      ]
    };

    return {
      cashFlowData,
      revenueData,
      health
    };
  },

  /**
   * Format transaction data for charts
   */
  formatTransactionDataForCharts: (transactionsData) => {
    const patterns = stationAccountService.analyzeTransactionPatterns(transactionsData);
    if (!patterns) return null;

    // Transaction type distribution
    const typeChartData = {
      labels: Object.keys(patterns.byType),
      datasets: [
        {
          label: 'Transaction Count',
          data: Object.values(patterns.byType).map(type => type.count),
          backgroundColor: '#36A2EB'
        },
        {
          label: 'Total Amount',
          data: Object.values(patterns.byType).map(type => Math.abs(type.total)),
          backgroundColor: '#FF6384'
        }
      ]
    };

    // Daily flow chart
    const dailyChartData = {
      labels: Object.keys(patterns.byDay),
      datasets: [
        {
          label: 'Daily Inflow',
          data: Object.values(patterns.byDay).map(day => day.inflow),
          backgroundColor: '#4BC0C0'
        },
        {
          label: 'Daily Outflow',
          data: Object.values(patterns.byDay).map(day => day.outflow),
          backgroundColor: '#FF6384'
        }
      ]
    };

    return {
      typeChartData,
      dailyChartData,
      patterns
    };
  },

  // ==================== REPORTING UTILITIES ====================

  /**
   * Generate financial report
   */
  generateFinancialReport: (financialSummary, transactionsData) => {
    const health = stationAccountService.analyzeFinancialHealth(financialSummary);
    const patterns = stationAccountService.analyzeTransactionPatterns(transactionsData);

    return {
      summary: {
        station: financialSummary.station,
        period: financialSummary.period,
        dateRange: financialSummary.dateRange
      },
      financials: {
        wallet: financialSummary.wallet,
        sales: financialSummary.sales,
        breakdown: financialSummary.breakdown,
        debtors: financialSummary.debtors
      },
      health,
      patterns,
      generatedAt: new Date().toLocaleString()
    };
  },

  /**
   * Export financial data to CSV
   */
  exportFinancialDataToCSV: (financialSummary, transactionsData) => {
    const health = stationAccountService.analyzeFinancialHealth(financialSummary);
    if (!health) return '';

    const csvRows = [];

    // Header
    csvRows.push('Station Financial Report');
    csvRows.push(`Station,${financialSummary.station?.name || 'N/A'}`);
    csvRows.push(`Period,${financialSummary.period}`);
    csvRows.push(`Generated,${new Date().toLocaleString()}`);
    csvRows.push('');

    // Financial Summary
    csvRows.push('Financial Summary');
    csvRows.push('Category,Amount');
    csvRows.push(`Opening Balance,$${financialSummary.wallet.openingBalance.toFixed(2)}`);
    csvRows.push(`Today's Inflow,$${financialSummary.wallet.todaysInflow.toFixed(2)}`);
    csvRows.push(`Today's Outflow,$${financialSummary.wallet.todaysOutflow.toFixed(2)}`);
    csvRows.push(`Current Balance,$${financialSummary.wallet.currentBalance.toFixed(2)}`);
    csvRows.push(`Total Sales,$${financialSummary.sales.totalSales.toFixed(2)}`);
    csvRows.push(`Total Collections,$${financialSummary.sales.totalCollections.toFixed(2)}`);
    csvRows.push(`Collection Rate,${financialSummary.sales.collectionRate.toFixed(2)}%`);
    csvRows.push(`Cash Collections,$${financialSummary.breakdown.cash.toFixed(2)}`);
    csvRows.push(`Electronic Collections,$${financialSummary.breakdown.debts.toFixed(2)}`);
    csvRows.push(`Outstanding Debt,$${financialSummary.debtors.totalOutstanding.toFixed(2)}`);
    csvRows.push('');

    // Health Assessment
    csvRows.push('Financial Health Assessment');
    csvRows.push('Aspect,Status,Recommendation');
    csvRows.push(`Cash Flow,${health.cashFlow.status},${health.cashFlow.recommendation}`);
    csvRows.push(`Collections,${health.collections.status},${health.collections.recommendation}`);
    csvRows.push(`Debt Management,${health.debt.status},${health.debt.recommendation}`);
    csvRows.push(`Overall Health,${health.overallHealth},`);
    csvRows.push('');

    // Recent Transactions
    if (transactionsData && transactionsData.transactions) {
      csvRows.push('Recent Transactions (Last 10)');
      csvRows.push('Date,Type,Amount,Description,Balance');
      transactionsData.transactions.slice(0, 10).forEach(transaction => {
        csvRows.push([
          new Date(transaction.transactionDate).toLocaleDateString(),
          transaction.type,
          `$${transaction.amount.toFixed(2)}`,
          transaction.description,
          `$${transaction.newBalance.toFixed(2)}`
        ].join(','));
      });
    }

    return csvRows.join('\n');
  },

  // ==================== VALIDATION UTILITIES ====================

  /**
   * Validate wallet transaction data
   */
  validateWalletTransaction: (transactionData) => {
    const errors = [];

    if (!transactionData.type) {
      errors.push('Transaction type is required');
    }
    if (!transactionData.amount || transactionData.amount <= 0) {
      errors.push('Valid amount is required');
    }
    if (!transactionData.description) {
      errors.push('Description is required');
    }

    // Validate specific transaction types
    if (transactionData.type === 'BANK_DEPOSIT' && !transactionData.shiftCollectionId) {
      errors.push('Shift collection reference is required for bank deposits');
    }

    return errors;
  },

  /**
   * Format transaction for submission
   */
  formatTransactionForSubmission: (rawData) => {
    return {
      ...rawData,
      amount: Number(rawData.amount),
      transactionDate: rawData.transactionDate || new Date().toISOString()
    };
  },

  // ==================== ALERT UTILITIES ====================

  /**
   * Check for financial alerts
   */
  checkFinancialAlerts: (financialSummary) => {
    const alerts = [];

    const health = stationAccountService.analyzeFinancialHealth(financialSummary);

    // Low cash balance alert
    if (financialSummary.wallet.currentBalance < (financialSummary.wallet.minBalance || 5000)) {
      alerts.push({
        type: 'LOW_CASH_BALANCE',
        message: `Cash balance is low: $${financialSummary.wallet.currentBalance.toFixed(2)}`,
        severity: 'warning'
      });
    }

    // Poor collection rate alert
    if (financialSummary.sales.collectionRate < 85) {
      alerts.push({
        type: 'POOR_COLLECTION_RATE',
        message: `Collection rate is low: ${financialSummary.sales.collectionRate.toFixed(2)}%`,
        severity: 'warning'
      });
    }

    // High debt alert
    if (health.debt.status === 'high') {
      alerts.push({
        type: 'HIGH_DEBT_LEVEL',
        message: `Debt-to-sales ratio is high: ${health.debt.ratio.toFixed(2)}%`,
        severity: 'warning'
      });
    }

    return alerts;
  },

  /**
   * Calculate cash requirements
   */
  calculateCashRequirements: (financialSummary, upcomingExpenses = 0) => {
    const currentBalance = financialSummary.wallet.currentBalance;
    const minBalance = financialSummary.wallet.minBalance || 5000;
    const requiredCash = Math.max(0, minBalance + upcomingExpenses - currentBalance);

    return {
      currentBalance,
      minBalance,
      upcomingExpenses,
      requiredCash,
      status: requiredCash > 0 ? 'REQUIRES_REPLENISHMENT' : 'SUFFICIENT'
    };
  }
};

export default stationAccountService;