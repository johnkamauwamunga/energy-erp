// src/services/staff/staffAccountService.js
import { apiService } from '../apiService';

const STAFF_ACCOUNTS_BASE_URL = '/staff-accounts';

// Enhanced logging utility
const logger = {
  debug: (...args) => console.log('🔍 [StaffAccountService]', ...args),
  info: (...args) => console.log('ℹ️ [StaffAccountService]', ...args),
  warn: (...args) => console.warn('⚠️ [StaffAccountService]', ...args),
  error: (...args) => console.error('❌ [StaffAccountService]', ...args)
};

// Request/Response debugging utilities
const debugRequest = (method, url, data) => {
  logger.debug(`➡️ ${method} ${url}`, data || '');
};

const debugResponse = (method, url, response) => {
  logger.debug(`⬅️ ${method} ${url} Response:`, response);
};

// Enhanced response handler utility
const handleResponse = (response, operation) => {
  // Handle backend response structure: { success, message, data }
  if (response && response.success) {
    logger.debug(`${operation} successful`);
    return response.data; // Return the actual data payload
  }
  
  // Handle case where backend returns data directly
  if (response) {
    logger.debug(`${operation} successful (direct data)`);
    return response;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

// Enhanced error handler utility
const handleError = (error, operation, defaultMessage) => {
  logger.error(`Error during ${operation}:`, error);
  
  if (error.message && error.message.includes('401')) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Authentication failed. Please login again.');
  }
  
  if (error.message && error.message.includes('403')) {
    throw new Error('You do not have permission to perform this action');
  }
  
  if (error.message && error.message.includes('404')) {
    throw new Error('Requested resource not found');
  }
  
  if (error.message && error.message.includes('400')) {
    throw new Error(error.message);
  }
  
  if (error.message) {
    throw new Error(error.message);
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

// =====================
// FORMATTING UTILITIES
// =====================

const getPaymentScheduleLabel = (schedule) => {
  const labels = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    BI_WEEKLY: 'Bi-Weekly',
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly'
  };
  return labels[schedule] || schedule || 'Not Set';
};

const getPayrollMethodLabel = (method) => {
  const labels = {
    STATION_WALLET: 'Station Wallet',
    BANK_TRANSFER: 'Bank Transfer',
    MOBILE_MONEY: 'Mobile Money',
    CASH: 'Cash'
  };
  return labels[method] || method || 'Not Set';
};

const formatCurrency = (amount, currency = 'USD') => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// =====================
// VALIDATION UTILITIES
// =====================

const validateStaffAccount = (accountData) => {
  const errors = [];

  if (!accountData.userId) {
    errors.push('User is required');
  }

  if (!accountData.stationId) {
    errors.push('Station is required');
  }

  if (accountData.salaryAmount !== undefined && accountData.salaryAmount < 0) {
    errors.push('Salary amount must be positive');
  }

  if (accountData.creditLimit !== undefined && accountData.creditLimit < 0) {
    errors.push('Credit limit must be positive');
  }

  // Validate payroll method
  const validPayrollMethods = ['STATION_WALLET', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CASH'];
  if (accountData.payrollMethod && !validPayrollMethods.includes(accountData.payrollMethod)) {
    errors.push('Invalid payroll method');
  }

  // Validate payment schedule
  const validSchedules = ['DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY'];
  if (accountData.paymentSchedule && !validSchedules.includes(accountData.paymentSchedule)) {
    errors.push('Invalid payment schedule');
  }

  // Bank account validation if payroll method is BANK_TRANSFER
  if (accountData.payrollMethod === 'BANK_TRANSFER' && !accountData.bankAccountNumber) {
    errors.push('Bank account number is required for bank transfers');
  }

  // Mobile money validation if payroll method is MOBILE_MONEY
  if (accountData.payrollMethod === 'MOBILE_MONEY' && !accountData.mobileMoneyNumber) {
    errors.push('Mobile money number is required for mobile money payments');
  }

  return errors;
};

// =====================
// FORMATTING FUNCTIONS
// =====================

const formatStaffAccount = (account) => {
  if (!account) return null;
  
  return {
    ...account,
    // User information
    userDisplayName: account.user ? `${account.user.firstName} ${account.user.lastName}` : 'Unknown User',
    userEmail: account.user?.email || 'N/A',
    userPhone: account.user?.phoneNumber || 'N/A',
    
    // Station information
    stationDisplayName: account.station?.name || 'Unknown Station',
    stationLocation: account.station?.location || 'N/A',
    
    // Balance formatting
    currentBalanceDisplay: formatCurrency(account.currentBalance),
    currentBalanceColor: account.currentBalance < 0 ? 'error' : account.currentBalance > 0 ? 'success' : 'default',
    currentBalanceStatus: account.currentBalance < 0 ? 'Owes Station' : account.currentBalance > 0 ? 'Station Owes' : 'Settled',
    
    // Financial displays
    salaryAmountDisplay: account.salaryAmount ? formatCurrency(account.salaryAmount) : 'Not Set',
    creditLimitDisplay: account.creditLimit ? formatCurrency(account.creditLimit) : 'No Limit',
    
    // Shortage displays
    totalShortagesDisplay: formatCurrency(account.totalShortages || 0),
    totalAdvancesDisplay: formatCurrency(account.totalAdvances || 0),
    totalBonusesDisplay: formatCurrency(account.totalBonuses || 0),
    totalShortageDeductionsDisplay: formatCurrency(account.totalShortageDeductions || 0),
    
    // Status badges
    statusBadge: account.isActive ? 'success' : 'danger',
    statusColor: account.isActive ? 'success' : 'error',
    statusText: account.isActive ? 'Active' : 'Inactive',
    
    onHoldBadge: account.isOnHold ? 'warning' : 'default',
    onHoldColor: account.isOnHold ? 'warning' : 'default',
    onHoldText: account.isOnHold ? 'On Hold' : 'Normal',
    
    // Payment info
    paymentScheduleDisplay: getPaymentScheduleLabel(account.paymentSchedule),
    payrollMethodDisplay: getPayrollMethodLabel(account.payrollMethod),
    
    // Dates
    createdAtDisplay: formatDateTime(account.createdAt),
    updatedAtDisplay: formatDateTime(account.updatedAt),
    lastPaymentDateDisplay: account.lastPaymentDate ? formatDate(account.lastPaymentDate) : 'Never',
    lastShortageDateDisplay: account.lastShortageDate ? formatDate(account.lastShortageDate) : 'Never',
    lastDeductionDateDisplay: account.lastDeductionDate ? formatDate(account.lastDeductionDate) : 'Never',
    nextPaymentDateDisplay: account.nextPaymentDate ? formatDate(account.nextPaymentDate) : 'Not Set',
    
    // Quick status checks
    hasShortages: account.totalShortages > 0,
    hasAdvances: account.totalAdvances > 0,
    hasBonuses: account.totalBonuses > 0,
    isDueForPayment: account.nextPaymentDate ? new Date(account.nextPaymentDate) <= new Date() : false,
    
    // Display properties
    displayId: account.id ? account.id.substring(0, 8) : 'N/A',
    
    // Shortage ledger info
    shortageLedgerDisplay: account.shortageLedger ? {
      outstandingDisplay: formatCurrency(account.shortageLedger.netOutstanding || 0),
      deductedDisplay: formatCurrency(account.shortageLedger.totalDeductedAmount || 0),
      recordedCount: account.shortageLedger.totalShortagesRecorded || 0
    } : null,
    
    // Action flags
    canEdit: true,
    canDeactivate: account.isActive,
    canActivate: !account.isActive,
    canPutOnHold: !account.isOnHold,
    canRemoveFromHold: account.isOnHold
  };
};

const formatStaffAccountSummary = (summary) => {
  if (!summary) return null;
  
  return {
    ...summary,
    // Format totals
    totals: {
      ...summary.totals,
      totalPositiveBalanceDisplay: formatCurrency(summary.totals?.totalPositiveBalance || 0),
      totalNegativeBalanceDisplay: formatCurrency(summary.totals?.totalNegativeBalance || 0),
      averageBalanceDisplay: formatCurrency(summary.totals?.averageBalance || 0)
    },
    
    // Format by station
    byStation: Object.entries(summary.byStation || {}).reduce((acc, [stationName, data]) => {
      acc[stationName] = {
        ...data,
        totalBalanceDisplay: formatCurrency(data.totalBalance || 0),
        averageBalanceDisplay: formatCurrency(data.averageBalance || 0)
      };
      return acc;
    }, {}),
    
    // Format by payroll method
    byPayrollMethod: Object.entries(summary.byPayrollMethod || {}).reduce((acc, [method, data]) => {
      acc[method] = {
        ...data,
        methodDisplay: getPayrollMethodLabel(method)
      };
      return acc;
    }, {}),
    
    // Format high risk accounts
    highRiskAccounts: (summary.highRiskAccounts || []).map(account => ({
      ...account,
      balanceDisplay: formatCurrency(account.balance),
      creditLimitDisplay: formatCurrency(account.creditLimit),
      utilizationDisplay: `${Math.round(account.utilization * 100)}%`
    })),
    
    // Format upcoming payments
    upcomingPayments: (summary.upcomingPayments || []).map(payment => ({
      ...payment,
      salaryAmountDisplay: formatCurrency(payment.salaryAmount),
      nextPaymentDateDisplay: formatDate(payment.nextPaymentDate),
      paymentMethodDisplay: getPayrollMethodLabel(payment.paymentMethod)
    })),
    
    // Status indicators
    overallStatus: summary.totals?.totalNegativeBalance > 0 ? 'warning' : 'success',
    riskIndicator: summary.highRiskAccounts?.length > 0 ? 'warning' : 'success',
    paymentIndicator: summary.upcomingPayments?.length > 0 ? 'info' : 'default'
  };
};

const formatUserWithoutAccount = (user) => {
  if (!user) return null;
  
  return {
    ...user,
    // User information
    displayName: `${user.firstName} ${user.lastName}`,
    fullName: `${user.firstName} ${user.lastName}`,
    
    // Company info
    companyName: user.company?.name || 'N/A',
    
    // Station assignments
    stationAssignmentsDisplay: user.stationAssignments?.map(assignment => ({
      stationName: assignment.station?.name || 'Unknown',
      role: assignment.role,
      stationId: assignment.station?.id
    })) || [],
    
    // Status
    statusColor: user.status === 'ACTIVE' ? 'success' : 
                 user.status === 'INACTIVE' ? 'error' : 
                 user.status === 'PENDING' ? 'warning' : 'default',
    
    // Dates
    createdAtDisplay: formatDate(user.createdAt),
    
    // Action flags
    canCreateAccount: user.status === 'ACTIVE'
  };
};

// =====================
// MAIN SERVICE METHODS
// =====================

export const staffAccountService = {
  
  // ========== CREATE ACCOUNT ==========
  
  createStaffAccount: async (accountData) => {
    logger.info('Creating staff account:', accountData);
    debugRequest('POST', STAFF_ACCOUNTS_BASE_URL, accountData);
    
    try {
      const response = await apiService.post(STAFF_ACCOUNTS_BASE_URL, accountData);
      debugResponse('POST', STAFF_ACCOUNTS_BASE_URL, response);
      const account = handleResponse(response, 'creating staff account');
      return formatStaffAccount(account);
    } catch (error) {
      throw handleError(error, 'creating staff account', 'Failed to create staff account');
    }
  },

  // ========== GET ACCOUNTS ==========
  
  getStaffAccount: async (accountId) => {
    logger.info(`Fetching staff account: ${accountId}`);
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      const account = handleResponse(response, 'fetching staff account');
      return formatStaffAccount(account);
    } catch (error) {
      throw handleError(error, 'fetching staff account', 'Failed to fetch staff account');
    }
  },

  getStaffAccountByUser: async (userId, stationId = null) => {
    logger.info(`Fetching staff account for user: ${userId}`, { stationId });
    
    try {
      const params = new URLSearchParams();
      if (stationId) params.append('stationId', stationId);
      
      const url = `/users/${userId}/staff-account${params.toString() ? `?${params.toString()}` : ''}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      const account = handleResponse(response, 'fetching staff account by user');
      return formatStaffAccount(account);
    } catch (error) {
      throw handleError(error, 'fetching staff account by user', 'Failed to fetch staff account');
    }
  },

  getStaffAccountsByStation: async (stationId, filters = {}) => {
    logger.info(`Fetching staff accounts for station: ${stationId}`, filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `/stations/${stationId}/staff-accounts?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching staff accounts by station');
      
      if (result.accounts) {
        result.accounts = result.accounts.map(account => formatStaffAccount(account));
      }
      
      return result;
    } catch (error) {
      throw handleError(error, 'fetching staff accounts by station', 'Failed to fetch staff accounts');
    }
  },

  getStaffAccountsByCompany: async (companyId, filters = {}) => {
    logger.info(`Fetching staff accounts for company: ${companyId}`, filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `/companies/${companyId}/staff-accounts?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching staff accounts by company');
      
      if (result.accounts) {
        result.accounts = result.accounts.map(account => formatStaffAccount(account));
      }
      
      return result;
    } catch (error) {
      throw handleError(error, 'fetching staff accounts by company', 'Failed to fetch staff accounts');
    }
  },

  getAllStaffAccounts: async (filters = {}) => {
    logger.info('Fetching all staff accounts with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `${STAFF_ACCOUNTS_BASE_URL}?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching all staff accounts');
      
      if (result.accounts) {
        result.accounts = result.accounts.map(account => formatStaffAccount(account));
      }
      
      return result;
    } catch (error) {
      throw handleError(error, 'fetching all staff accounts', 'Failed to fetch staff accounts');
    }
  },

  // ========== USERS WITHOUT ACCOUNTS ==========
  
  getUsersWithoutAccounts: async (companyId, stationId = null) => {
    logger.info(`Fetching users without accounts for company: ${companyId}`, { stationId });
    
    try {
      const params = new URLSearchParams();
      if (stationId) params.append('stationId', stationId);
      
      const url = `/companies/${companyId}/users-without-accounts${params.toString() ? `?${params.toString()}` : ''}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const users = handleResponse(response, 'fetching users without accounts');
      return users.map(user => formatUserWithoutAccount(user));
    } catch (error) {
      throw handleError(error, 'fetching users without accounts', 'Failed to fetch users without accounts');
    }
  },

  // ========== UPDATE ACCOUNT ==========
  
  updateStaffAccount: async (accountId, updateData) => {
    logger.info(`Updating staff account: ${accountId}`, updateData);
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}`;
      debugRequest('PUT', url, updateData);
      const response = await apiService.put(url, updateData);
      debugResponse('PUT', url, response);
      const updatedAccount = handleResponse(response, 'updating staff account');
      return formatStaffAccount(updatedAccount);
    } catch (error) {
      throw handleError(error, 'updating staff account', 'Failed to update staff account');
    }
  },

  // ========== DELETE ACCOUNT ==========
  
  deleteStaffAccount: async (accountId) => {
    logger.info(`Deleting staff account: ${accountId}`);
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}`;
      debugRequest('DELETE', url);
      const response = await apiService.delete(url);
      debugResponse('DELETE', url, response);
      return handleResponse(response, 'deleting staff account');
    } catch (error) {
      throw handleError(error, 'deleting staff account', 'Failed to delete staff account');
    }
  },

  // ========== ACCOUNT STATUS MANAGEMENT ==========
  
  activateStaffAccount: async (accountId) => {
    logger.info(`Activating staff account: ${accountId}`);
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}/activate`;
      debugRequest('POST', url);
      const response = await apiService.post(url);
      debugResponse('POST', url, response);
      const account = handleResponse(response, 'activating staff account');
      return formatStaffAccount(account);
    } catch (error) {
      throw handleError(error, 'activating staff account', 'Failed to activate staff account');
    }
  },

  deactivateStaffAccount: async (accountId) => {
    logger.info(`Deactivating staff account: ${accountId}`);
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}/deactivate`;
      debugRequest('POST', url);
      const response = await apiService.post(url);
      debugResponse('POST', url, response);
      const account = handleResponse(response, 'deactivating staff account');
      return formatStaffAccount(account);
    } catch (error) {
      throw handleError(error, 'deactivating staff account', 'Failed to deactivate staff account');
    }
  },

  putAccountOnHold: async (accountId, reason = null) => {
    logger.info(`Putting staff account on hold: ${accountId}`, { reason });
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}/put-on-hold`;
      debugRequest('POST', url, { reason });
      const response = await apiService.post(url, { reason });
      debugResponse('POST', url, response);
      const account = handleResponse(response, 'putting account on hold');
      return formatStaffAccount(account);
    } catch (error) {
      throw handleError(error, 'putting account on hold', 'Failed to put account on hold');
    }
  },

  removeAccountFromHold: async (accountId) => {
    logger.info(`Removing staff account from hold: ${accountId}`);
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}/remove-from-hold`;
      debugRequest('POST', url);
      const response = await apiService.post(url);
      debugResponse('POST', url, response);
      const account = handleResponse(response, 'removing account from hold');
      return formatStaffAccount(account);
    } catch (error) {
      throw handleError(error, 'removing account from hold', 'Failed to remove account from hold');
    }
  },

  // ========== ACCOUNT SUMMARY ==========
  
  getStaffAccountSummary: async (stationId = null, companyId = null) => {
    logger.info('Fetching staff account summary:', { stationId, companyId });
    
    try {
      const params = new URLSearchParams();
      if (stationId) params.append('stationId', stationId);
      if (companyId) params.append('companyId', companyId);
      
      const url = `${STAFF_ACCOUNTS_BASE_URL}/summary${params.toString() ? `?${params.toString()}` : ''}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const summary = handleResponse(response, 'fetching staff account summary');
      return formatStaffAccountSummary(summary);
    } catch (error) {
      throw handleError(error, 'fetching staff account summary', 'Failed to fetch staff account summary');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================
  validateStaffAccount,

  // =====================
  // FORMATTING UTILITIES
  // =====================
  formatStaffAccount,
  formatStaffAccountSummary,
  formatUserWithoutAccount,
  
  // =====================
  // HELPER METHODS
  // =====================
  getPaymentScheduleLabel,
  getPayrollMethodLabel,
  formatCurrency,
  formatDate,
  formatDateTime
};