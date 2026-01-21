// src/services/staff/staffAccountService.js - COMPLETE FIXED VERSION
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
  logger.debug(`${operation} response:`, response);
  
  // Check for error response
  if (response && response.success === false) {
    throw new Error(response.message || `Failed to ${operation}`);
  }
  
  // Backend returns { success, message, data, ... }
  if (response && response.success === true) {
    logger.debug(`${operation} successful`);
    return response.data || response;
  }
  
  // If no success field but has data (fallback)
  if (response && response.data !== undefined) {
    logger.debug(`${operation} successful (data field)`);
    return response.data;
  }
  
  // Direct data response (some endpoints return array or object directly)
  if (response) {
    logger.debug(`${operation} successful (direct)`);
    return response;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

// Enhanced error handler utility
const handleError = (error, operation, defaultMessage) => {
  logger.error(`Error during ${operation}:`, error);
  
  let errorMessage = defaultMessage || 'An unexpected error occurred';
  
  if (error.response) {
    // Axios error response
    const { data, status } = error.response;
    
    if (status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      errorMessage = 'Authentication failed. Please login again.';
    } else if (status === 403) {
      errorMessage = 'You do not have permission to perform this action';
    } else if (status === 404) {
      errorMessage = 'Requested resource not found';
    } else if (status === 400) {
      errorMessage = data?.message || data?.error || 'Bad request';
      
      if (data?.errors && Array.isArray(data.errors)) {
        const validationMessages = data.errors.map(err => `${err.field}: ${err.message}`).join(', ');
        errorMessage = validationMessages;
      }
    } else if (data?.message) {
      errorMessage = data.message;
    } else if (data?.error) {
      errorMessage = data.error;
    }
  } else if (error.message) {
    errorMessage = error.message;
  }
  
  throw new Error(errorMessage);
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
    STAFF_WALLET: 'Staff Wallet',
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
// QUERY PARAM BUILDER
// =====================

const buildQueryParams = (filters) => {
  if (!filters || Object.keys(filters).length === 0) return '';
  
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'boolean') {
        params.append(key, value.toString());
      } else if (value instanceof Date) {
        params.append(key, value.toISOString());
      } else if (Array.isArray(value)) {
        // Handle array parameters
        value.forEach(item => params.append(`${key}[]`, item));
      } else {
        params.append(key, value.toString());
      }
    }
  });
  
  const paramString = params.toString();
  return paramString ? `?${paramString}` : '';
};

// =====================
// VALIDATION
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

  if (accountData.creditLimit !== undefined && accountData.creditLimit > 100000) {
    errors.push('Credit limit cannot exceed 100,000');
  }

  if (accountData.salaryAmount !== undefined && accountData.salaryAmount > 500000) {
    errors.push('Salary amount cannot exceed 500,000');
  }

  const validPayrollMethods = ['STAFF_WALLET', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CASH'];
  if (accountData.payrollMethod && !validPayrollMethods.includes(accountData.payrollMethod)) {
    errors.push('Invalid payroll method');
  }

  const validSchedules = ['DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY'];
  if (accountData.paymentSchedule && !validSchedules.includes(accountData.paymentSchedule)) {
    errors.push('Invalid payment schedule');
  }

  if (accountData.payrollMethod === 'BANK_TRANSFER' && !accountData.bankAccountNumber) {
    errors.push('Bank account number is required for bank transfers');
  }

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
  
  const creditLimit = account.creditLimit || 5000;
  const utilization = account.currentBalance < 0 ? 
    (Math.abs(account.currentBalance) / creditLimit) * 100 : 0;
  
  return {
    ...account,
    // User information
    userDisplayName: account.user ? `${account.user.firstName} ${account.user.lastName}` : 'Unknown User',
    userEmail: account.user?.email || 'N/A',
    
    // Station information
    stationDisplayName: account.station?.name || 'Unknown Station',
    stationLocation: account.station?.location || 'N/A',
    
    // Company information
    companyName: account.company?.name || 'N/A',
    
    // Balance formatting
    currentBalanceDisplay: formatCurrency(account.currentBalance),
    currentBalanceColor: account.currentBalance < 0 ? 'error' : account.currentBalance > 0 ? 'success' : 'default',
    currentBalanceStatus: account.currentBalance < 0 ? 'Owes Station' : account.currentBalance > 0 ? 'Station Owes' : 'Settled',
    
    // Financial displays
    salaryAmountDisplay: account.salaryAmount ? formatCurrency(account.salaryAmount) : 'Not Set',
    creditLimitDisplay: formatCurrency(creditLimit),
    availableCredit: formatCurrency(creditLimit + Math.min(account.currentBalance, 0)),
    creditUtilization: `${utilization.toFixed(1)}%`,
    creditUtilizationColor: utilization > 70 ? 'error' : utilization > 40 ? 'warning' : 'success',
    
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
    nextPaymentDateDisplay: account.nextPaymentDate ? formatDate(account.nextPaymentDate) : 'Not Set',
    daysUntilPayment: account.nextPaymentDate ? 
      Math.ceil((new Date(account.nextPaymentDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
    
    // Quick status checks
    hasShortages: (account.totalShortages || 0) > 0,
    hasAdvances: (account.totalAdvances || 0) > 0,
    hasBonuses: (account.totalBonuses || 0) > 0,
    isDueForPayment: account.nextPaymentDate ? new Date(account.nextPaymentDate) <= new Date() : false,
    
    // Display properties
    displayId: account.id ? account.id.substring(0, 8) : 'N/A',
    
    // Shortage ledger info
    shortageLedgerDisplay: account.shortageLedger ? {
      outstandingDisplay: formatCurrency(account.shortageLedger.netOutstanding || 0),
      deductedDisplay: formatCurrency(account.shortageLedger.totalDeductedAmount || 0),
      recordedCount: account.shortageLedger.totalShortagesRecorded || 0
    } : null,
    
    // Action flags (based on business rules from backend)
    canEdit: true,
    canDeactivate: account.isActive && account.currentBalance >= -100,
    canActivate: !account.isActive,
    canPutOnHold: !account.isOnHold && account.isActive,
    canRemoveFromHold: account.isOnHold,
    canDelete: account.currentBalance === 0 && 
               (account.totalShortages || 0) === 0 && 
               (!account.transactions || account.transactions.length === 0) &&
               (!account.salaryPayments || account.salaryPayments.length === 0),
    canReceiveAdvance: account.isActive && !account.isOnHold && utilization < 80,
    canReceiveSalary: account.isActive && !account.isOnHold && account.currentBalance >= 0
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
      averageBalanceDisplay: formatCurrency(summary.totals?.averageBalance || 0),
      totalCreditLimitDisplay: formatCurrency(summary.totals?.totalCreditLimit || 0),
      creditUtilizationDisplay: `${(summary.totals?.creditUtilization || 0).toFixed(1)}%`
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
      utilizationDisplay: `${Math.round(account.utilization)}%`,
      utilizationColor: account.utilization > 90 ? 'error' : account.utilization > 70 ? 'warning' : 'info'
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
    displayName: `${user.firstName} ${user.lastName}`,
    fullName: `${user.firstName} ${user.lastName}`,
    companyName: user.company?.name || 'N/A',
    
    stationAssignmentsDisplay: user.stationAssignments?.map(assignment => ({
      stationName: assignment.station?.name || 'Unknown',
      role: assignment.role,
      stationId: assignment.station?.id
    })) || [],
    
    statusColor: user.status === 'ACTIVE' ? 'success' : 
                 user.status === 'INACTIVE' ? 'error' : 
                 user.status === 'PENDING' ? 'warning' : 'default',
    
    createdAtDisplay: formatDate(user.createdAt),
    canCreateAccount: user.status === 'ACTIVE' && user.isActive
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
    const url= `${STAFF_ACCOUNTS_BASE_URL}/staff-accounts`;
    try {
      const response = await apiService.post(url, accountData);
      debugResponse('POST', url, response);
      const account = handleResponse(response, 'creating staff account');
      return formatStaffAccount(account);
    } catch (error) {
      throw handleError(error, 'creating staff account', 'Failed to create staff account');
    }
  },

  // ========== GET ACCOUNTS ==========
  
  getStaffAccount: async (accountId, options = {}) => {
    logger.info(`Fetching staff account: ${accountId}`, { options });
    
    try {
      const queryParams = buildQueryParams(options);
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}${queryParams}`;
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
      
      // Updated to match backend endpoint: GET /api/staff-accounts/by-user/:userId
      const url = `${STAFF_ACCOUNTS_BASE_URL}/by-user/${userId}${params.toString() ? `?${params.toString()}` : ''}`;
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
      const queryParams = buildQueryParams(filters);
      // Fixed URL to match backend: GET /api/staff-accounts/station/:stationId
     //  const url = `${STAFF_ACCOUNTS_BASE_URL}/stations/${stationId}/staff-accounts${queryParams}`;
      const url = `${STAFF_ACCOUNTS_BASE_URL}/stations/${stationId}/staff-accounts`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching staff accounts by station');
      
      // Handle different response formats
      if (Array.isArray(result)) {
        return {
          accounts: result.map(account => formatStaffAccount(account)),
          pagination: {
            page: 1,
            limit: result.length,
            total: result.length,
            pages: 1
          }
        };
      } else if (result.accounts) {
        return {
          ...result,
          accounts: result.accounts.map(account => formatStaffAccount(account))
        };
      }
      
      return result;
    } catch (error) {
      throw handleError(error, 'fetching staff accounts by station', 'Failed to fetch staff accounts');
    }
  },

  getStaffAccountsByCompany: async (companyId, filters = {}) => {
    logger.info(`Fetching staff accounts for company: ${companyId}`, filters);
    
    try {
      const queryParams = buildQueryParams(filters);
      // Updated to match backend: GET /api/staff-accounts/company/:companyId
      const url = `${STAFF_ACCOUNTS_BASE_URL}/company/${companyId}${queryParams}`;
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
      const queryParams = buildQueryParams(filters);
      const url = `${STAFF_ACCOUNTS_BASE_URL}${queryParams}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching all staff accounts');
      
      if (result.accounts) {
        result.accounts = result.accounts.map(account => formatStaffAccount(account));
      } else if (Array.isArray(result)) {
        return {
          accounts: result.map(account => formatStaffAccount(account)),
          pagination: {
            page: 1,
            limit: result.length,
            total: result.length,
            pages: 1
          }
        };
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
      
      // Updated to match backend: GET /api/staff-accounts/users-without-accounts
      const url = `${STAFF_ACCOUNTS_BASE_URL}/companies/${companyId}/users-without-accounts`;
      debugRequest('GET', url);
      console.log("users without accounts url:", url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
        console.log("users without accounts response:", response);
      
      const users = handleResponse(response, 'fetching users without accounts');
      return Array.isArray(users) ? users.map(user => formatUserWithoutAccount(user)) : [];
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
  
  deleteStaffAccount: async (accountId, reason = null) => {
    logger.info(`Deleting staff account: ${accountId}`, { reason });
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}`;
      const data = { reason };
      debugRequest('DELETE', url, data);
      const response = await apiService.delete(url, { data });
      debugResponse('DELETE', url, response);
      const deletedAccount = handleResponse(response, 'deleting staff account');
      return formatStaffAccount(deletedAccount);
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

  deactivateStaffAccount: async (accountId, reason = null) => {
    logger.info(`Deactivating staff account: ${accountId}`, { reason });
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}/deactivate`;
      const data = reason ? { reason } : {};
      debugRequest('POST', url, data);
      const response = await apiService.post(url, data);
      debugResponse('POST', url, response);
      const account = handleResponse(response, 'deactivating staff account');
      return formatStaffAccount(account);
    } catch (error) {
      throw handleError(error, 'deactivating staff account', 'Failed to deactivate staff account');
    }
  },

  putAccountOnHold: async (accountId, reason) => {
    logger.info(`Putting staff account on hold: ${accountId}`, { reason });
    
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason is required when putting account on hold');
    }
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}/put-on-hold`;
      const data = { reason };
      debugRequest('POST', url, data);
      const response = await apiService.post(url, data);
      debugResponse('POST', url, response);
      const account = handleResponse(response, 'putting account on hold');
      return formatStaffAccount(account);
    } catch (error) {
      throw handleError(error, 'putting account on hold', 'Failed to put account on hold');
    }
  },

  removeAccountFromHold: async (accountId, reason = null) => {
    logger.info(`Removing staff account from hold: ${accountId}`, { reason });
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}/remove-from-hold`;
      const data = reason ? { reason } : {};
      debugRequest('POST', url, data);
      const response = await apiService.post(url, data);
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

  // ========== ADDITIONAL METHODS ==========
  
  getStaffBalance: async (accountId) => {
    logger.info(`Fetching staff balance for account: ${accountId}`);
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/${accountId}/balance`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching staff balance');
    } catch (error) {
      throw handleError(error, 'fetching staff balance', 'Failed to fetch staff balance');
    }
  },

  bulkUpdateCreditLimits: async (updates) => {
    logger.info('Bulk updating credit limits:', { count: updates.length });
    
    if (updates.length > 50) {
      throw new Error('Cannot update more than 50 accounts at once');
    }
    
    try {
      const url = `${STAFF_ACCOUNTS_BASE_URL}/bulk/credit-limits`;
      debugRequest('POST', url, { updates });
      const response = await apiService.post(url, { updates });
      debugResponse('POST', url, response);
      return handleResponse(response, 'bulk updating credit limits');
    } catch (error) {
      throw handleError(error, 'bulk updating credit limits', 'Failed to update credit limits');
    }
  },

  getAccountStatistics: async (companyId, startDate, endDate) => {
    logger.info(`Fetching account statistics for company: ${companyId}`, { startDate, endDate });
    
    try {
      const params = new URLSearchParams();
      params.append('companyId', companyId);
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      
      const url = `${STAFF_ACCOUNTS_BASE_URL}/statistics${params.toString() ? `?${params.toString()}` : ''}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching account statistics');
    } catch (error) {
      throw handleError(error, 'fetching account statistics', 'Failed to fetch account statistics');
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
  formatDateTime,
  buildQueryParams
};