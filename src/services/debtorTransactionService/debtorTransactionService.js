import { apiService } from '../apiService';

const logger = {
  debug: (...args) => console.log('🔍 [DebtorService]', ...args),
  info: (...args) => console.log('ℹ️ [DebtorService]', ...args),
  warn: (...args) => console.warn('⚠️ [DebtorService]', ...args),
  error: (...args) => console.error('❌ [DebtorService]', ...args)
};

const handleResponse = (response, operation) => {
  console.log("Debtor API Response:", response.data);
  
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

export const debtorTransactionService = {
  // ==================== DEBTOR ACCOUNTS ENDPOINTS ====================

  /**
   * Get all debtor accounts for a station
   */
  getDebtorAccounts: async (stationId) => {
    logger.info(`Fetching debtor accounts for station: ${stationId}`);
    
    try {
      // CHANGED: Updated endpoint to match route mounting
      const response = await apiService.get(`/debtor-transactions/station/${stationId}/accounts`);
      return handleResponse(response, 'fetching debtor accounts');
    } catch (error) {
      throw handleError(error, 'fetching debtor accounts', 'Failed to fetch debtor accounts');
    }
  },

  /**
   * Get transactions for specific debtor account
   */
  getDebtorTransactions: async (stationId, debtorId, filters = {}) => {
    logger.info(`Fetching transactions for debtor ${debtorId} at station ${stationId}`);
    
    try {
      // CHANGED: Updated endpoint to match route mounting
      const response = await apiService.get(`/debtor-transactions/station/${stationId}/debtor/${debtorId}/transactions`, {
        params: filters
      });
      return handleResponse(response, 'fetching debtor transactions');
    } catch (error) {
      throw handleError(error, 'fetching debtor transactions', 'Failed to fetch debtor transactions');
    }
  },

  /**
   * Create new debtor transaction
   */
  createDebtorTransaction: async (stationId, transactionData) => {
    logger.info(`Creating debtor transaction for station ${stationId}:`, transactionData);
    
    try {
      // CHANGED: Updated endpoint to match route mounting
      const response = await apiService.post(`/debtor-transactions/station/${stationId}/transactions`, transactionData);
      return handleResponse(response, 'creating debtor transaction');
    } catch (error) {
      throw handleError(error, 'creating debtor transaction', 'Failed to create debtor transaction');
    }
  },

  /**
   * Settle debtor transaction
   */
  settleDebtorTransaction: async (transactionId, settlementData) => {
    logger.info(`Settling debtor transaction ${transactionId}:`, settlementData);
    
    try {
      // CHANGED: Updated endpoint to match route mounting
      const response = await apiService.patch(`/debtor-transactions/transactions/${transactionId}/settle`, settlementData);
      return handleResponse(response, 'settling debtor transaction');
    } catch (error) {
      throw handleError(error, 'settling debtor transaction', 'Failed to settle debtor transaction');
    }
  },

  // ==================== DEBTOR ANALYSIS UTILITIES ====================

  /**
   * Calculate debtor account metrics
   */
  calculateDebtorMetrics: (debtorData) => {
    if (!debtorData) return null;

    const { accounts, summary } = debtorData;

    const totalOutstanding = summary?.totalOutstanding || 0;
    const accountsWithDebt = summary?.accountsWithDebt || 0;
    const totalAccounts = summary?.totalAccounts || 0;

    const averageDebtPerAccount = accountsWithDebt > 0 ? totalOutstanding / accountsWithDebt : 0;
    const debtPercentage = totalAccounts > 0 ? (accountsWithDebt / totalAccounts) * 100 : 0;

    return {
      totalOutstanding,
      accountsWithDebt,
      totalAccounts,
      averageDebtPerAccount,
      debtPercentage,
      healthyAccounts: totalAccounts - accountsWithDebt
    };
  },

  /**
   * Analyze debtor trends
   */
  analyzeDebtorTrends: (currentData, previousData) => {
    if (!currentData || !previousData) return null;

    const currentMetrics = debtorService.calculateDebtorMetrics(currentData);
    const previousMetrics = debtorService.calculateDebtorMetrics(previousData);

    const outstandingTrend = currentMetrics.totalOutstanding - previousMetrics.totalOutstanding;
    const outstandingTrendPercentage = previousMetrics.totalOutstanding > 0 
      ? (outstandingTrend / previousMetrics.totalOutstanding) * 100 
      : 0;

    const accountsTrend = currentMetrics.accountsWithDebt - previousMetrics.accountsWithDebt;

    return {
      outstanding: {
        current: currentMetrics.totalOutstanding,
        previous: previousMetrics.totalOutstanding,
        trend: outstandingTrend,
        trendPercentage: outstandingTrendPercentage,
        direction: outstandingTrend >= 0 ? 'increasing' : 'decreasing'
      },
      accounts: {
        current: currentMetrics.accountsWithDebt,
        previous: previousMetrics.accountsWithDebt,
        trend: accountsTrend,
        direction: accountsTrend >= 0 ? 'increasing' : 'decreasing'
      }
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
    const debitTransactions = transactions.filter(t => t.type === 'DEBIT');
    const creditTransactions = transactions.filter(t => t.type === 'CREDIT');

    // Calculate average transaction amounts
    const avgDebit = debitTransactions.length > 0 
      ? debitTransactions.reduce((sum, t) => sum + t.amount, 0) / debitTransactions.length 
      : 0;
    
    const avgCredit = creditTransactions.length > 0 
      ? creditTransactions.reduce((sum, t) => sum + t.amount, 0) / creditTransactions.length 
      : 0;

    // Find most active periods
    const transactionsByHour = transactions.reduce((acc, transaction) => {
      const hour = new Date(transaction.transactionDate).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const peakHour = Object.entries(transactionsByHour)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      transactionCount: transactions.length,
      debitCount: debitTransactions.length,
      creditCount: creditTransactions.length,
      totalDebit: summary?.totalDebit || 0,
      totalCredit: summary?.totalCredit || 0,
      netBalance: summary?.netBalance || 0,
      averageDebit: avgDebit,
      averageCredit: avgCredit,
      peakActivity: peakHour ? { hour: peakHour[0], count: peakHour[1] } : null,
      outstandingTransactions: summary?.outstandingTransactions || 0
    };
  },

  // ==================== VISUALIZATION UTILITIES ====================

  /**
   * Format debtor data for charts
   */
  formatDebtorDataForCharts: (debtorData) => {
    const metrics = debtorService.calculateDebtorMetrics(debtorData);
    if (!metrics) return null;

    // Debt distribution by category
    const categoryData = debtorData.summary?.byCategory || {};
    const categoryChartData = {
      labels: Object.keys(categoryData),
      datasets: [
        {
          label: 'Total Debt',
          data: Object.values(categoryData).map(cat => cat.total),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
        }
      ]
    };

    // Accounts status chart
    const accountsChartData = {
      labels: ['Accounts with Debt', 'Healthy Accounts'],
      datasets: [
        {
          data: [metrics.accountsWithDebt, metrics.healthyAccounts],
          backgroundColor: ['#FF6384', '#36A2EB']
        }
      ]
    };

    return {
      categoryChartData,
      accountsChartData,
      metrics
    };
  },

  /**
   * Format transaction data for charts
   */
  formatTransactionDataForCharts: (transactionsData) => {
    const patterns = debtorService.analyzeTransactionPatterns(transactionsData);
    if (!patterns) return null;

    // Transaction type distribution
    const typeChartData = {
      labels: ['Debit Transactions', 'Credit Transactions'],
      datasets: [
        {
          data: [patterns.debitCount, patterns.creditCount],
          backgroundColor: ['#FF6384', '#36A2EB']
        }
      ]
    };

    // Amount distribution
    const amountChartData = {
      labels: ['Total Debit', 'Total Credit', 'Net Balance'],
      datasets: [
        {
          label: 'Amount',
          data: [patterns.totalDebit, patterns.totalCredit, Math.abs(patterns.netBalance)],
          backgroundColor: ['#FF6384', '#36A2EB', patterns.netBalance >= 0 ? '#4BC0C0' : '#FF6384']
        }
      ]
    };

    return {
      typeChartData,
      amountChartData,
      patterns
    };
  },

  // ==================== REPORTING UTILITIES ====================

  /**
   * Generate debtor aging report
   */
  generateAgingReport: (transactionsData) => {
    if (!transactionsData || !transactionsData.transactions) return null;

    const now = new Date();
    const outstandingTransactions = transactionsData.transactions.filter(t => t.status === 'OUTSTANDING');

    const agingBuckets = {
      current: 0,      // 0-30 days
      overdue31: 0,    // 31-60 days
      overdue61: 0,    // 61-90 days
      overdue91: 0     // 90+ days
    };

    outstandingTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.transactionDate);
      const daysOutstanding = Math.floor((now - transactionDate) / (1000 * 60 * 60 * 24));

      if (daysOutstanding <= 30) {
        agingBuckets.current += transaction.amount;
      } else if (daysOutstanding <= 60) {
        agingBuckets.overdue31 += transaction.amount;
      } else if (daysOutstanding <= 90) {
        agingBuckets.overdue61 += transaction.amount;
      } else {
        agingBuckets.overdue91 += transaction.amount;
      }
    });

    const totalOutstanding = Object.values(agingBuckets).reduce((sum, amount) => sum + amount, 0);

    return {
      agingBuckets,
      totalOutstanding,
      transactionCount: outstandingTransactions.length,
      averageAge: outstandingTransactions.length > 0 
        ? outstandingTransactions.reduce((sum, t) => {
            const days = Math.floor((now - new Date(t.transactionDate)) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / outstandingTransactions.length
        : 0
    };
  },

  /**
   * Export debtor data to CSV
   */
  exportDebtorDataToCSV: (debtorData, transactionsData) => {
    const metrics = debtorService.calculateDebtorMetrics(debtorData);
    const agingReport = debtorService.generateAgingReport(transactionsData);
    if (!metrics || !agingReport) return '';

    const csvRows = [];

    // Header
    csvRows.push('Debtor Management Report');
    csvRows.push(`Generated,${new Date().toLocaleString()}`);
    csvRows.push('');

    // Summary Section
    csvRows.push('Debtor Summary');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Accounts,${metrics.totalAccounts}`);
    csvRows.push(`Accounts with Debt,${metrics.accountsWithDebt}`);
    csvRows.push(`Healthy Accounts,${metrics.healthyAccounts}`);
    csvRows.push(`Total Outstanding,$${metrics.totalOutstanding.toFixed(2)}`);
    csvRows.push(`Average Debt per Account,$${metrics.averageDebtPerAccount.toFixed(2)}`);
    csvRows.push(`Debt Percentage,${metrics.debtPercentage.toFixed(2)}%`);
    csvRows.push('');

    // Aging Report
    csvRows.push('Aging Report');
    csvRows.push('Period,Amount,Percentage');
    csvRows.push(`Current (0-30 days),$${agingReport.agingBuckets.current.toFixed(2)},${(agingReport.agingBuckets.current / agingReport.totalOutstanding * 100).toFixed(2)}%`);
    csvRows.push(`31-60 days,$${agingReport.agingBuckets.overdue31.toFixed(2)},${(agingReport.agingBuckets.overdue31 / agingReport.totalOutstanding * 100).toFixed(2)}%`);
    csvRows.push(`61-90 days,$${agingReport.agingBuckets.overdue61.toFixed(2)},${(agingReport.agingBuckets.overdue61 / agingReport.totalOutstanding * 100).toFixed(2)}%`);
    csvRows.push(`90+ days,$${agingReport.agingBuckets.overdue91.toFixed(2)},${(agingReport.agingBuckets.overdue91 / agingReport.totalOutstanding * 100).toFixed(2)}%`);
    csvRows.push(`Total Outstanding,$${agingReport.totalOutstanding.toFixed(2)},100%`);
    csvRows.push('');

    // Account Details
    csvRows.push('Account Details');
    csvRows.push('Debtor Name,Category,Current Debt,Status');
    debtorData.accounts.forEach(account => {
      const status = account.currentDebt > 0 ? 'ACTIVE DEBT' : 'CLEAR';
      csvRows.push([
        account.debtor.name,
        account.debtor.category?.name || 'N/A',
        `$${account.currentDebt.toFixed(2)}`,
        status
      ].join(','));
    });

    return csvRows.join('\n');
  },

  // ==================== VALIDATION UTILITIES ====================

  /**
   * Validate debtor transaction data
   */
  validateDebtorTransaction: (transactionData) => {
    const errors = [];

    if (!transactionData.debtorId) {
      errors.push('Debtor ID is required');
    }
    if (!transactionData.type) {
      errors.push('Transaction type is required');
    }
    if (!transactionData.amount || transactionData.amount <= 0) {
      errors.push('Valid amount is required');
    }
    if (!transactionData.description) {
      errors.push('Description is required');
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

  // ==================== NOTIFICATION UTILITIES ====================

  /**
   * Check for critical debtor situations
   */
  checkCriticalSituations: (debtorData) => {
    const alerts = [];

    const metrics = debtorService.calculateDebtorMetrics(debtorData);

    // High total debt alert
    if (metrics.totalOutstanding > 100000) { // Example threshold
      alerts.push({
        type: 'HIGH_TOTAL_DEBT',
        message: `Total outstanding debt is high: $${metrics.totalOutstanding.toFixed(2)}`,
        severity: 'warning'
      });
    }

    // High debt percentage alert
    if (metrics.debtPercentage > 50) {
      alerts.push({
        type: 'HIGH_DEBT_PERCENTAGE',
        message: `${metrics.debtPercentage.toFixed(2)}% of accounts have outstanding debt`,
        severity: 'warning'
      });
    }

    // Individual high debt accounts
    debtorData.accounts.forEach(account => {
      if (account.currentDebt > 50000) { // Example threshold
        alerts.push({
          type: 'HIGH_INDIVIDUAL_DEBT',
          message: `${account.debtor.name} has high debt: $${account.currentDebt.toFixed(2)}`,
          severity: 'critical',
          accountId: account.id
        });
      }
    });

    return alerts;
  }
};

export default debtorTransactionService;