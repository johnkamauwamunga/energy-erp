// services/bankingService/bankingService.js
import { apiService } from '../apiService';

class BankingService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  // =====================
  // CORE UTILITIES
  // =====================

  handleResponse = (response) => {
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || 'Request failed');
  };

  handleError = (error, defaultMessage) => {
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
  // STATION LEVEL BANKING (Deposits)
  // =====================

  /**
   * Create bank deposit from station wallet
   */
  createBankDeposit = async (depositData) => {
    try {
      const response = await apiService.post('/banking/deposits', depositData);
      this.clearCache('transactions');
      this.clearCache('wallets');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to create bank deposit');
    }
  };

  /**
   * Get current station's wallet
   */
  getCurrentStationWallet = async () => {
    const cacheKey = 'current-station-wallet';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get('/banking/wallets/current');
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch current station wallet');
    }
  };

  // =====================
  // COMPANY LEVEL BANKING (Withdrawals & Management)
  // =====================

  /**
   * Create bank withdrawal (company admins only)
   */
  createBankWithdrawal = async (withdrawalData) => {
    try {
      const response = await apiService.post('/banking/withdrawals', withdrawalData);
      this.clearCache('transactions');
      this.clearCache('bank-accounts');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to create bank withdrawal');
    }
  };

  /**
   * Get company banking summary
   */
  getCompanyBankingSummary = async () => {
    const cacheKey = 'company-banking-summary';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get('/banking/company/summary');
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch company banking summary');
    }
  };

  /**
   * Get company banking statistics
   */
  getBankingStats = async (period = 'monthly') => {
    const cacheKey = `banking-stats-${period}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/banking/company/stats?period=${period}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch banking statistics');
    }
  };

  // =====================
  // UNIVERSAL BANKING OPERATIONS
  // =====================

  /**
   * Get bank transactions with filters
   */
  getBankTransactions = async (filters = {}) => {
    const cacheKey = `bank-transactions-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query 
        ? `/banking/transactions?${query}`
        : '/banking/transactions';
      
      const response = await apiService.get(url);

      // Enhanced logging
      console.log("=== BANKING TRANSACTIONS DATA ===");
      console.log("Full response:", response);
      console.log("Response data:", response.data);
      console.log("Response structure:", JSON.stringify(response.data, null, 2));
      console.log("=================================");

      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch bank transactions');
    }
  };

  /**
   * Get specific bank transaction by ID
   */
  getBankTransactionById = async (transactionId) => {
    const cacheKey = `bank-transaction-${transactionId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/banking/transactions/${transactionId}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch bank transaction');
    }
  };

  /**
   * Get specific station wallet
   */
  getStationWallet = async (stationId) => {
    const cacheKey = `station-wallet-${stationId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/banking/wallets/${stationId}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch station wallet');
    }
  };

  /**
   * Update bank transaction
   */
  updateBankTransaction = async (transactionId, updateData) => {
    try {
      const response = await apiService.patch(`/banking/transactions/${transactionId}`, updateData);
      this.clearCache('transactions');
      this.clearCache(`bank-transaction-${transactionId}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to update bank transaction');
    }
  };

  /**
   * Delete bank transaction
   */
  deleteBankTransaction = async (transactionId) => {
    try {
      const response = await apiService.delete(`/banking/transactions/${transactionId}`);
      this.clearCache('transactions');
      this.clearCache(`bank-transaction-${transactionId}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete bank transaction');
    }
  };

  // =====================
  // REPORTS & ANALYTICS
  // =====================

  /**
   * Get banking transactions report
   */
  getBankTransactionsReport = async (filters = {}, format = 'json') => {
    try {
      const query = this.buildQuery({ ...filters, format });
      const url = query 
        ? `/banking/reports/transactions?${query}`
        : '/banking/reports/transactions';
      
      const response = await apiService.get(url);
      
      if (format === 'csv') {
        return response; // Return raw CSV text
      }
      
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to generate bank transactions report');
    }
  };

  /**
   * Get daily banking summary
   */
  getDailyBankingSummary = async (date = null) => {
    const cacheKey = `daily-banking-summary-${date || 'today'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = date ? `?date=${date}` : '';
      const response = await apiService.get(`/banking/reports/daily-summary${query}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch daily banking summary');
    }
  };

  /**
   * Get bank account balances
   */
  getBankAccountBalances = async () => {
    const cacheKey = 'bank-account-balances';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get('/banking/bank-accounts/balances');
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch bank account balances');
    }
  };

  // =====================
  // DATA FORMATTING UTILITIES
  // =====================

  formatBankTransaction = (transaction) => {
    if (!transaction) return null;

    return {
      ...transaction,
      displayType: this.formatTransactionType(transaction.transactionType),
      displayMode: this.formatTransactionMode(transaction.transactionMode),
      displayStatus: this.formatTransactionStatus(transaction.status),
      amountDisplay: this.formatCurrency(transaction.amount),
      previousBalanceDisplay: this.formatCurrency(transaction.previousBalance),
      newBalanceDisplay: this.formatCurrency(transaction.newBalance),
      transactionDateDisplay: this.formatDateTime(transaction.transactionDate),
      valueDateDisplay: this.formatDateTime(transaction.valueDate),
      approvedAtDisplay: this.formatDateTime(transaction.approvedAt),
      bankAccountDisplay: transaction.bankAccount 
        ? `${transaction.bankAccount.bank.name} - ${transaction.bankAccount.accountNumber}`
        : 'Unknown Account',
      stationDisplay: transaction.station?.name || 'Company Level',
      recordedByDisplay: transaction.recordedBy 
        ? `${transaction.recordedBy.firstName} ${transaction.recordedBy.lastName}`
        : 'Unknown',
      approvedByDisplay: transaction.approvedBy 
        ? `${transaction.approvedBy.firstName} ${transaction.approvedBy.lastName}`
        : 'Pending',
      typeColor: this.getTransactionTypeColor(transaction.transactionType),
      statusColor: this.getTransactionStatusColor(transaction.status)
    };
  };

  formatStationWallet = (wallet) => {
    if (!wallet) return null;

    return {
      ...wallet,
      openingBalanceDisplay: this.formatCurrency(wallet.openingBalance),
      currentBalanceDisplay: this.formatCurrency(wallet.currentBalance),
      todaysInflowDisplay: this.formatCurrency(wallet.todaysInflow),
      todaysOutflowDisplay: this.formatCurrency(wallet.todaysOutflow),
      minBalanceDisplay: this.formatCurrency(wallet.minBalance),
      maxBalanceDisplay: this.formatCurrency(wallet.maxBalance),
      lastUpdatedDisplay: this.formatDateTime(wallet.lastUpdated),
      balanceStatus: this.getWalletBalanceStatus(wallet),
      stationDisplay: wallet.station?.name || 'Unknown Station'
    };
  };

  formatCompanyBankingSummary = (summary) => {
    if (!summary) return null;

    return {
      ...summary,
      totalDepositsDisplay: this.formatCurrency(summary.totalDeposits),
      totalWithdrawalsDisplay: this.formatCurrency(summary.totalWithdrawals),
      netFlowDisplay: this.formatCurrency(summary.netFlow),
      stationBreakdown: summary.stationBreakdown?.map(station => ({
        ...station,
        totalDepositsDisplay: this.formatCurrency(station.totalDeposits),
        totalWithdrawalsDisplay: this.formatCurrency(station.totalWithdrawals),
        netFlowDisplay: this.formatCurrency(station.netFlow)
      })),
      bankAccountBreakdown: summary.bankAccountBreakdown?.map(account => ({
        ...account,
        totalDepositsDisplay: this.formatCurrency(account.totalDeposits),
        totalWithdrawalsDisplay: this.formatCurrency(account.totalWithdrawals),
        currentBalanceDisplay: this.formatCurrency(account.currentBalance)
      }))
    };
  };

  formatBankAccountBalance = (account) => {
    if (!account) return null;

    return {
      ...account,
      currentBalanceDisplay: this.formatCurrency(account.currentBalance),
      lastTransactionDisplay: this.formatDateTime(account.lastTransaction),
      balanceStatus: this.getAccountBalanceStatus(account.currentBalance)
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

  formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-KE');
  };

  formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE');
  };

  formatTransactionType = (type) => {
    const typeMap = {
      DEPOSIT: 'Deposit',
      WITHDRAWAL: 'Withdrawal',
      TRANSFER: 'Transfer'
    };
    return typeMap[type] || type;
  };


  formatTransactionMode = (mode) => {
  const modeMap = {
    CASH: 'Cash',
    CHEQUE: 'Cheque',
    MPESA: 'M-Pesa',
    EFT: 'Electronic Fund Transfer',
    RTGS: 'RTGS',
    INTERNAL_TRANSFER: 'Internal Transfer'
  };
  return modeMap[mode] || mode;
};

  formatTransactionStatus = (status) => {
    const statusMap = {
      PENDING: 'Pending',
      COMPLETED: 'Completed',
      FAILED: 'Failed',
      CANCELLED: 'Cancelled'
    };
    return statusMap[status] || status;
  };

  getTransactionTypeColor = (type) => {
    const colorMap = {
      DEPOSIT: 'success',
      WITHDRAWAL: 'error',
      TRANSFER: 'warning'
    };
    return colorMap[type] || 'default';
  };

  getTransactionStatusColor = (status) => {
    const colorMap = {
      PENDING: 'warning',
      COMPLETED: 'success',
      FAILED: 'error',
      CANCELLED: 'default'
    };
    return colorMap[status] || 'default';
  };

  getWalletBalanceStatus = (wallet) => {
    if (wallet.minBalance && wallet.currentBalance < wallet.minBalance) {
      return { status: 'low', message: 'Below minimum balance' };
    }
    if (wallet.maxBalance && wallet.currentBalance > wallet.maxBalance) {
      return { status: 'high', message: 'Above maximum balance' };
    }
    return { status: 'normal', message: 'Within limits' };
  };

  getAccountBalanceStatus = (balance) => {
    if (balance < 0) return { status: 'negative', color: 'error' };
    if (balance < 10000) return { status: 'low', color: 'warning' };
    return { status: 'healthy', color: 'success' };
  };

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validateDepositData = (data) => {
    const errors = [];

    if (!data.amount || data.amount <= 0) {
      errors.push('Amount must be positive');
    }

    if (!data.bankAccountId) {
      errors.push('Bank account is required');
    }

    if (!data.transactionMode) {
      errors.push('Transaction mode is required');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Description too long (max 500 characters)');
    }

    return errors;
  };

  validateWithdrawalData = (data) => {
    const errors = [];

    if (!data.amount || data.amount <= 0) {
      errors.push('Amount must be positive');
    }

    if (!data.bankAccountId) {
      errors.push('Bank account is required');
    }

    if (!data.transactionMode) {
      errors.push('Transaction mode is required');
    }

    if (!data.description) {
      errors.push('Description is required');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Description too long (max 500 characters)');
    }

    return errors;
  };

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

  // =====================
  // CACHE MANAGEMENT
  // =====================

  preloadBankingData = async () => {
    try {
      const [transactions, wallet, summary] = await Promise.all([
        this.getBankTransactions({ page: 1, limit: 10 }),
        this.getCurrentStationWallet(),
        this.getCompanyBankingSummary()
      ]);
      return { transactions, wallet, summary };
    } catch (error) {
      console.error('Failed to preload banking data:', error);
      throw error;
    }
  };

  clearBankingCache = (type = null) => {
    if (type === 'transactions') {
      this.clearCache('transactions');
    } else if (type === 'wallets') {
      this.clearCache('wallet');
    } else if (type === 'summary') {
      this.clearCache('summary');
    } else {
      this.clearCache();
    }
  };

  // =====================
  // EXPORT UTILITIES
  // =====================

  exportBankTransactionsToCSV = async (filters = {}) => {
    try {
      const csvData = await this.getBankTransactionsReport(filters, 'csv');
      return csvData;
    } catch (error) {
      throw this.handleError(error, 'Failed to export bank transactions');
    }
  };

  generateTransactionCSV = (transactions) => {
    const headers = ['Date', 'Type', 'Amount', 'Bank Account', 'Station', 'Reference', 'Status', 'Description'];
    const rows = transactions.map(transaction => [
      this.formatDate(transaction.transactionDate),
      this.formatTransactionType(transaction.transactionType),
      transaction.amount,
      transaction.bankAccount?.accountNumber || '',
      transaction.station?.name || 'Company',
      transaction.referenceNumber || '',
      this.formatTransactionStatus(transaction.status),
      transaction.description || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // =====================
  // NOTIFICATION UTILITIES
  // =====================

  getTransactionNotification = (transaction) => {
    const type = transaction.transactionType;
    const amount = this.formatCurrency(transaction.amount);
    
    const messages = {
      DEPOSIT: `Deposit of ${amount} completed successfully`,
      WITHDRAWAL: `Withdrawal of ${amount} processed`,
      TRANSFER: `Transfer of ${amount} completed`
    };

    return {
      title: `Bank ${this.formatTransactionType(type)}`,
      message: messages[type] || `Transaction of ${amount} completed`,
      type: type === 'DEPOSIT' ? 'success' : 'info'
    };
  };

  getBalanceAlert = (wallet) => {
    const balanceStatus = this.getWalletBalanceStatus(wallet);
    
    if (balanceStatus.status === 'low') {
      return {
        title: 'Low Balance Alert',
        message: `Station wallet balance (${this.formatCurrency(wallet.currentBalance)}) is below minimum threshold`,
        type: 'warning'
      };
    }
    
    if (balanceStatus.status === 'high') {
      return {
        title: 'High Balance Alert',
        message: `Station wallet balance (${this.formatCurrency(wallet.currentBalance)}) is above maximum threshold`,
        type: 'info'
      };
    }

    return null;
  };
}

export const bankingService = new BankingService();
export default bankingService;