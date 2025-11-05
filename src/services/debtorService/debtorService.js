import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [DebtorService]', ...args),
  info: (...args) => console.log('ℹ️ [DebtorService]', ...args),
  warn: (...args) => console.warn('⚠️ [DebtorService]', ...args),
  error: (...args) => console.error('❌ [DebtorService]', ...args)
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

export const debtorService = {
  // =====================
  // DEBTOR CRUD OPERATIONS
  // =====================
  
  createDebtor: async (debtorData) => {
    logger.info('Creating debtor:', debtorData);
    
    try {
      const response = await apiService.post('/debtors', debtorData);
      return handleResponse(response, 'creating debtor');
    } catch (error) {
      throw handleError(error, 'creating debtor', 'Failed to create debtor');
    }
  },

  getDebtors: async (filters = {}) => {
    logger.info('Fetching debtors with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/debtors?${params.toString()}` : '/debtors';
      const response = await apiService.get(url);
      console.log("the debtors are ",response)
      return handleResponse(response, 'fetching debtors');
    } catch (error) {
      throw handleError(error, 'fetching debtors', 'Failed to fetch debtors');
    }
  },

  getDebtorById: async (debtorId) => {
    logger.info(`Fetching debtor: ${debtorId}`);
    
    try {
      const response = await apiService.get(`/debtors/${debtorId}`);
      return handleResponse(response, 'fetching debtor');
    } catch (error) {
      throw handleError(error, 'fetching debtor', 'Failed to fetch debtor');
    }
  },

  updateDebtor: async (debtorId, updateData) => {
    logger.info(`Updating debtor ${debtorId}:`, updateData);
    
    try {
      const response = await apiService.patch(`/debtors/${debtorId}`, updateData);
      return handleResponse(response, 'updating debtor');
    } catch (error) {
      throw handleError(error, 'updating debtor', 'Failed to update debtor');
    }
  },

  searchDebtors: async (searchTerm) => {
    logger.info(`Searching debtors: ${searchTerm}`);
    
    try {
      if (!searchTerm || searchTerm.length < 2) {
        return { data: [] };
      }
      
      const response = await apiService.get(`/debtors/search?search=${encodeURIComponent(searchTerm)}`);
      return handleResponse(response, 'searching debtors');
    } catch (error) {
      throw handleError(error, 'searching debtors', 'Failed to search debtors');
    }
  },

  // =====================
  // DEBT OPERATIONS
  // =====================

  recordFuelDebt: async (debtData) => {
    logger.info('Recording fuel debt:', debtData);
    
    try {
      const response = await apiService.post('/debtors/record-fuel-debt', debtData);
      return handleResponse(response, 'recording fuel debt');
    } catch (error) {
      throw handleError(error, 'recording fuel debt', 'Failed to record fuel debt');
    }
  },

  recordDebtPayment: async (paymentData) => {
    logger.info('Recording debt payment:', paymentData);
    
    try {
      const response = await apiService.post('/debtors/record-payment', paymentData);
      return handleResponse(response, 'recording debt payment');
    } catch (error) {
      throw handleError(error, 'recording debt payment', 'Failed to record debt payment');
    }
  },

  writeOffDebt: async (writeOffData) => {
    logger.info('Writing off debt:', writeOffData);
    
    try {
      const response = await apiService.post('/debtors/write-off', writeOffData);
      return handleResponse(response, 'writing off debt');
    } catch (error) {
      throw handleError(error, 'writing off debt', 'Failed to write off debt');
    }
  },

  // =====================
  // STATION DEBT OPERATIONS
  // =====================

  getStationDebtors: async (stationId) => {
    logger.info(`Fetching station debtors for station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/debtors/station/${stationId}`);
      return handleResponse(response, 'fetching station debtors');
    } catch (error) {
      throw handleError(error, 'fetching station debtors', 'Failed to fetch station debtors');
    }
  },

  // =====================
  // TRANSACTION HISTORY
  // =====================

  getDebtorTransactions: async (debtorId, filters = {}) => {
    logger.info(`Fetching transactions for debtor ${debtorId}:`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/debtors/${debtorId}/transactions?${params.toString()}`;
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching debtor transactions');
    } catch (error) {
      throw handleError(error, 'fetching debtor transactions', 'Failed to fetch debtor transactions');
    }
  },

  // =====================
  // REPORTS & ANALYTICS
  // =====================

  getDebtorStatistics: async (stationId = null) => {
    logger.info('Fetching debtor statistics', stationId ? `for station: ${stationId}` : '');
    
    try {
      const url = stationId ? `/debtors/reports/statistics?stationId=${stationId}` : '/debtors/reports/statistics';
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching debtor statistics');
    } catch (error) {
      throw handleError(error, 'fetching debtor statistics', 'Failed to fetch debtor statistics');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validateCreateDebtor: (debtorData) => {
    const errors = [];

    if (!debtorData.name?.trim()) {
      errors.push('Debtor name is required');
    }

    if (!debtorData.phone?.trim()) {
      errors.push('Phone number is required');
    }

    if (debtorData.name && debtorData.name.length > 200) {
      errors.push('Debtor name cannot exceed 200 characters');
    }

    if (debtorData.phone && debtorData.phone.length > 20) {
      errors.push('Phone number cannot exceed 20 characters');
    }

    if (debtorData.contactPerson && debtorData.contactPerson.length > 100) {
      errors.push('Contact person name cannot exceed 100 characters');
    }

    if (debtorData.email && !this.isValidEmail(debtorData.email)) {
      errors.push('Invalid email address format');
    }

    return errors;
  },

  validateFuelDebt: (debtData) => {
    const errors = [];

    if (!debtData.debtorPhone?.trim()) {
      errors.push('Debtor phone is required');
    }

    if (!debtData.debtorName?.trim()) {
      errors.push('Debtor name is required');
    }

    if (!debtData.stationId) {
      errors.push('Station selection is required');
    }

    if (!debtData.shiftId) {
      errors.push('Shift reference is required');
    }

    if (!debtData.amount || debtData.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (debtData.amount > 1000000) {
      errors.push('Amount cannot exceed 1,000,000');
    }

    if (!debtData.vehiclePlate?.trim()) {
      errors.push('Vehicle plate is required');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (debtData.stationId && !uuidRegex.test(debtData.stationId)) {
      errors.push('Invalid station ID format');
    }

    if (debtData.shiftId && !uuidRegex.test(debtData.shiftId)) {
      errors.push('Invalid shift ID format');
    }

    return errors;
  },

  validateDebtPayment: (paymentData) => {
    const errors = [];

    if (!paymentData.stationDebtorAccountId) {
      errors.push('Debtor account selection is required');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Valid payment amount is required');
    }

    if (paymentData.amount > 1000000) {
      errors.push('Payment amount cannot exceed 1,000,000');
    }

    if (!paymentData.paymentMethod) {
      errors.push('Payment method is required');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (paymentData.stationDebtorAccountId && !uuidRegex.test(paymentData.stationDebtorAccountId)) {
      errors.push('Invalid debtor account ID format');
    }

    return errors;
  },

  validateWriteOff: (writeOffData) => {
    const errors = [];

    if (!writeOffData.stationDebtorAccountId) {
      errors.push('Debtor account selection is required');
    }

    if (!writeOffData.amount || writeOffData.amount <= 0) {
      errors.push('Valid write-off amount is required');
    }

    if (writeOffData.amount > 1000000) {
      errors.push('Write-off amount cannot exceed 1,000,000');
    }

    if (!writeOffData.reason?.trim()) {
      errors.push('Write-off reason is required');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (writeOffData.stationDebtorAccountId && !uuidRegex.test(writeOffData.stationDebtorAccountId)) {
      errors.push('Invalid debtor account ID format');
    }

    return errors;
  },

  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // =====================
  // DATA TRANSFORMATION UTILITIES
  // =====================

  formatDebtorForDisplay: (debtor) => {
    if (!debtor) return null;
    
    const totalDebt = debtor.totalDebt || debtor.stationAccounts?.reduce((sum, account) => sum + account.currentDebt, 0) || 0;
    const statusColor = totalDebt > 0 ? 'warning' : 'success';
    
    return {
      ...debtor,
      displayName: debtor.name || 'Unknown Debtor',
      phoneDisplay: debtor.phone || 'No Phone',
      contactInfo: debtor.contactPerson || 'No Contact',
      emailDisplay: debtor.email || 'No Email',
      totalDebt: this.formatCurrency(totalDebt),
      totalStations: debtor.totalStations || debtor.stationAccounts?.length || 0,
      status: totalDebt > 0 ? 'Owes Money' : 'Paid Up',
      statusColor: statusColor,
      lastActivity: this.getLastActivityDate(debtor),
      isActive: debtor.isActive !== false
    };
  },

  formatStationDebtorForDisplay: (stationDebtor) => {
    if (!stationDebtor) return null;
    
    const currentDate = new Date();
    const overdueAmount = stationDebtor.transactions
      ?.filter(t => t.dueDate && new Date(t.dueDate) < currentDate)
      ?.reduce((sum, t) => sum + t.amount, 0) || 0;
    
    return {
      ...stationDebtor,
      debtorName: stationDebtor.debtor?.name || 'Unknown Debtor',
      stationName: stationDebtor.station?.name || 'Unknown Station',
      balanceDisplay: this.formatCurrency(stationDebtor.currentDebt),
      overdueDisplay: this.formatCurrency(overdueAmount),
      status: stationDebtor.currentDebt > 0 ? 'Active' : 'Settled',
      statusColor: stationDebtor.currentDebt > 0 ? 
        (overdueAmount > 0 ? 'error' : 'warning') : 'success',
      lastTransaction: stationDebtor.lastTransaction ? 
        new Date(stationDebtor.lastTransaction).toLocaleDateString() : 'Never'
    };
  },

  formatTransactionForDisplay: (transaction) => {
    if (!transaction) return null;
    
    const isPayment = transaction.type === 'PAYMENT_RECEIVED';
    const isWriteOff = transaction.type === 'DEBT_WRITE_OFF';
    const amountColor = isPayment || isWriteOff ? 'success' : 'error';
    const amountPrefix = isPayment || isWriteOff ? '-' : '+';
    
    const daysOverdue = transaction.dueDate ? this.calculateDaysOverdue(transaction.dueDate) : 0;
    
    return {
      ...transaction,
      debtorName: transaction.stationDebtorAccount?.debtor?.name || 'Unknown Debtor',
      stationName: transaction.stationDebtorAccount?.station?.name || 'Unknown Station',
      amountDisplay: `${amountPrefix}${this.formatCurrency(Math.abs(transaction.amount))}`,
      amountColor: amountColor,
      debtAfterDisplay: this.formatCurrency(transaction.debtAfter),
      typeDisplay: this.formatTransactionType(transaction.type),
      statusDisplay: this.formatTransactionStatus(transaction.status),
      statusColor: this.getStatusColor(transaction.status),
      dueDateDisplay: transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : 'N/A',
      transactionDateDisplay: new Date(transaction.transactionDate).toLocaleDateString(),
      daysOverdue: daysOverdue,
      isOverdue: daysOverdue > 0,
      vehicleInfo: transaction.vehiclePlate ? 
        `${transaction.vehiclePlate}${transaction.vehicleModel ? ` (${transaction.vehicleModel})` : ''}` : 'N/A'
    };
  },

  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount);
  },

  formatTransactionType: (type) => {
    const typeMap = {
      'DEBT_INCURRED': 'Fuel Debt',
      'PAYMENT_RECEIVED': 'Payment Received',
      'DEBT_WRITE_OFF': 'Write Off',
      'CREDIT_ADJUSTMENT': 'Credit Adjustment'
    };
    
    return typeMap[type] || type;
  },

  formatTransactionStatus: (status) => {
    const statusMap = {
      'PENDING': 'Pending',
      'OUTSTANDING': 'Outstanding',
      'PARTIAL': 'Partial',
      'SETTLED': 'Settled',
      'OVERDUE': 'Overdue',
      'CANCELLED': 'Cancelled'
    };
    
    return statusMap[status] || status;
  },

  getStatusColor: (status) => {
    const colorMap = {
      'SETTLED': 'success',
      'PARTIAL': 'warning',
      'OUTSTANDING': 'info',
      'PENDING': 'warning',
      'OVERDUE': 'error',
      'CANCELLED': 'default'
    };
    
    return colorMap[status] || 'default';
  },

  calculateDaysOverdue: (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  },

  getLastActivityDate: (debtor) => {
    if (!debtor.stationAccounts) return 'Never';
    
    let lastDate = null;
    debtor.stationAccounts.forEach(account => {
      if (account.transactions && account.transactions.length > 0) {
        const lastTransaction = account.transactions[0].transactionDate;
        if (!lastDate || new Date(lastTransaction) > new Date(lastDate)) {
          lastDate = lastTransaction;
        }
      }
    });
    
    return lastDate ? new Date(lastDate).toLocaleDateString() : 'Never';
  },

  // =====================
  // FILTER UTILITIES
  // =====================

  buildDebtorFilters: (filters) => {
    const cleanFilters = {};
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        cleanFilters[key] = filters[key];
      }
    });

    return cleanFilters;
  },

  filterDebtorsByStatus: (debtors, status) => {
    if (!Array.isArray(debtors)) return [];
    
    switch (status) {
      case 'active':
        return debtors.filter(debtor => debtor.isActive !== false);
      case 'inactive':
        return debtors.filter(debtor => debtor.isActive === false);
      case 'with-debt':
        return debtors.filter(debtor => (debtor.totalDebt || 0) > 0);
      case 'no-debt':
        return debtors.filter(debtor => (debtor.totalDebt || 0) === 0);
      case 'overdue':
        // This would require more detailed data about individual transactions
        return debtors.filter(debtor => (debtor.totalDebt || 0) > 0);
      default:
        return debtors;
    }
  },

  filterTransactionsByType: (transactions, type) => {
    if (!Array.isArray(transactions)) return [];
    if (!type) return transactions;
    
    return transactions.filter(transaction => transaction.type === type);
  },

  filterTransactionsByStatus: (transactions, status) => {
    if (!Array.isArray(transactions)) return [];
    if (!status) return transactions;
    
    return transactions.filter(transaction => transaction.status === status);
  },

  // =====================
  // SEARCH UTILITIES
  // =====================

  searchDebtorsLocal: (debtors, searchTerm) => {
    if (!Array.isArray(debtors)) return [];
    if (!searchTerm) return debtors;
    
    const term = searchTerm.toLowerCase();
    
    return debtors.filter(debtor => 
      debtor.name?.toLowerCase().includes(term) ||
      debtor.phone?.toLowerCase().includes(term) ||
      debtor.contactPerson?.toLowerCase().includes(term) ||
      debtor.email?.toLowerCase().includes(term)
    );
  },

  searchTransactions: (transactions, searchTerm) => {
    if (!Array.isArray(transactions)) return [];
    if (!searchTerm) return transactions;
    
    const term = searchTerm.toLowerCase();
    
    return transactions.filter(transaction => 
      transaction.stationDebtorAccount?.debtor?.name?.toLowerCase().includes(term) ||
      transaction.vehiclePlate?.toLowerCase().includes(term) ||
      transaction.vehicleModel?.toLowerCase().includes(term) ||
      transaction.description?.toLowerCase().includes(term) ||
      transaction.referenceNumber?.toLowerCase().includes(term)
    );
  },

  // =====================
  // SORTING UTILITIES
  // =====================

  sortDebtors: (debtors, sortBy, sortOrder = 'asc') => {
    if (!Array.isArray(debtors)) return [];
    
    return [...debtors].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'totalDebt':
          aValue = a.totalDebt || 0;
          bValue = b.totalDebt || 0;
          break;
        case 'totalStations':
          aValue = a.totalStations || 0;
          bValue = b.totalStations || 0;
          break;
        case 'status':
          aValue = (a.totalDebt || 0) > 0 ? 'Owes Money' : 'Paid Up';
          bValue = (b.totalDebt || 0) > 0 ? 'Owes Money' : 'Paid Up';
          break;
        case 'lastActivity':
          aValue = this.getLastActivityTimestamp(a);
          bValue = this.getLastActivityTimestamp(b);
          break;
        default:
          aValue = a.name || '';
          bValue = b.name || '';
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

  sortTransactions: (transactions, sortBy, sortOrder = 'desc') => {
    if (!Array.isArray(transactions)) return [];
    
    return [...transactions].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.transactionDate);
          bValue = new Date(b.transactionDate);
          break;
        case 'dueDate':
          aValue = new Date(a.dueDate || 0);
          bValue = new Date(b.dueDate || 0);
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'debtor':
          aValue = a.stationDebtorAccount?.debtor?.name || '';
          bValue = b.stationDebtorAccount?.debtor?.name || '';
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'vehicle':
          aValue = a.vehiclePlate || '';
          bValue = b.vehiclePlate || '';
          break;
        default:
          aValue = new Date(a.transactionDate);
          bValue = new Date(b.transactionDate);
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

  getLastActivityTimestamp: (debtor) => {
    if (!debtor.stationAccounts) return 0;
    
    let lastTimestamp = 0;
    debtor.stationAccounts.forEach(account => {
      if (account.transactions && account.transactions.length > 0) {
        const lastTransaction = new Date(account.transactions[0].transactionDate).getTime();
        if (lastTransaction > lastTimestamp) {
          lastTimestamp = lastTransaction;
        }
      }
    });
    
    return lastTimestamp;
  },

  // Add these methods to your existing debtorService.js

// Get debt transactions with advanced filtering
getDebtTransactions: async (filters = {}) => {
  logger.info('Fetching debt transactions with filters:', filters);
  
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    
    const url = params.toString() ? `/debtor-transactions/debts?${params.toString()}` : '/debtor-transactions/debts';
    const response = await apiService.get(url);
    return handleResponse(response, 'fetching debt transactions');
  } catch (error) {
    throw handleError(error, 'fetching debt transactions', 'Failed to fetch debt transactions');
  }
},

// Get payment transactions with advanced filtering
getPaymentTransactions: async (filters = {}) => {
  logger.info('Fetching payment transactions with filters:', filters);
  
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    
    const url = params.toString() ? `/debtor-transactions/payments?${params.toString()}` : '/debtor-transactions/payments';
    const response = await apiService.get(url);
    return handleResponse(response, 'fetching payment transactions');
  } catch (error) {
    throw handleError(error, 'fetching payment transactions', 'Failed to fetch payment transactions');
  }
},

// Get payment statistics
getPaymentStatistics: async () => {
  logger.info('Fetching payment statistics');
  
  try {
    const response = await apiService.get('/debtor-transactions/payments/statistics');
    return handleResponse(response, 'fetching payment statistics');
  } catch (error) {
    throw handleError(error, 'fetching payment statistics', 'Failed to fetch payment statistics');
  }
},

  // =====================
  // DATA MAPPING UTILITIES
  // =====================

  mapDebtorToForm: (debtor) => {
    if (!debtor) return null;
    
    return {
      id: debtor.id,
      name: debtor.name,
      phone: debtor.phone,
      contactPerson: debtor.contactPerson,
      email: debtor.email,
      isActive: debtor.isActive !== false
    };
  },

  mapFormToCreateDebtor: (formData) => {
    return {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      contactPerson: formData.contactPerson?.trim() || null,
      email: formData.email?.trim() || null
    };
  },

  mapFormToUpdateDebtor: (formData) => {
    const updateData = {};
    
    if (formData.name !== undefined) updateData.name = formData.name.trim();
    if (formData.contactPerson !== undefined) updateData.contactPerson = formData.contactPerson?.trim() || null;
    if (formData.email !== undefined) updateData.email = formData.email?.trim() || null;
    if (formData.isActive !== undefined) updateData.isActive = formData.isActive;
    
    return updateData;
  },

  mapFormToFuelDebt: (formData) => {
    return {
      debtorPhone: formData.debtorPhone.trim(),
      debtorName: formData.debtorName.trim(),
      stationId: formData.stationId,
      shiftId: formData.shiftId,
      amount: parseFloat(formData.amount),
      vehiclePlate: formData.vehiclePlate.trim(),
      vehicleModel: formData.vehicleModel?.trim() || null,
      description: formData.description?.trim() || `Fuel for ${formData.vehiclePlate}`,
      transactionDate: formData.transactionDate
    };
  },

  mapFormToDebtPayment: (formData) => {
    return {
      stationDebtorAccountId: formData.stationDebtorAccountId,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      referenceNumber: formData.referenceNumber?.trim() || null,
      notes: formData.notes?.trim() || null,
      transactionDate: formData.transactionDate
    };
  },

  mapFormToWriteOff: (formData) => {
    return {
      stationDebtorAccountId: formData.stationDebtorAccountId,
      amount: parseFloat(formData.amount),
      reason: formData.reason.trim(),
      notes: formData.notes?.trim() || null
    };
  },

  // =====================
  // STATISTICS AND ANALYTICS
  // =====================

  calculateDebtorStatistics: (debtors) => {
    if (!Array.isArray(debtors)) return null;
    
    const activeDebtors = debtors.filter(debtor => debtor.isActive !== false);
    const debtorsWithBalance = debtors.filter(debtor => (debtor.totalDebt || 0) > 0);
    
    const totalDebt = debtors.reduce((sum, debtor) => sum + (debtor.totalDebt || 0), 0);
    const averageDebt = debtors.length > 0 ? totalDebt / debtors.length : 0;
    
    return {
      totalDebtors: debtors.length,
      activeDebtors: activeDebtors.length,
      debtorsWithBalance: debtorsWithBalance.length,
      totalDebt: this.formatCurrency(totalDebt),
      averageDebt: this.formatCurrency(averageDebt),
      settlementRate: debtors.length > 0 ? 
        ((debtors.length - debtorsWithBalance.length) / debtors.length * 100).toFixed(1) + '%' : '0%'
    };
  },

  calculateAgingSummary: (agingData) => {
    if (!agingData) return null;
    
    const total = agingData.current + agingData['1-30'] + agingData['31-60'] + agingData['61-90'] + agingData['90+'];
    const overdue = agingData['1-30'] + agingData['31-60'] + agingData['61-90'] + agingData['90+'];
    
    return {
      ...agingData,
      total: this.formatCurrency(total),
      overdue: this.formatCurrency(overdue),
      overduePercentage: total > 0 ? ((overdue / total) * 100).toFixed(1) + '%' : '0%',
      currentDisplay: this.formatCurrency(agingData.current),
      '1-30Display': this.formatCurrency(agingData['1-30']),
      '31-60Display': this.formatCurrency(agingData['31-60']),
      '61-90Display': this.formatCurrency(agingData['61-90']),
      '90+Display': this.formatCurrency(agingData['90+'])
    };
  },

  // =====================
  // EXPORT/IMPORT UTILITIES
  // =====================

  exportDebtorsToCSV: (debtors) => {
    if (!debtors || !debtors.length) return '';
    
    const headers = ['Debtor Name', 'Phone', 'Contact Person', 'Email', 'Total Debt', 'Stations', 'Status', 'Last Activity'];
    const rows = debtors.map(debtor => [
      debtor.name || 'N/A',
      debtor.phone || 'N/A',
      debtor.contactPerson || 'N/A',
      debtor.email || 'N/A',
      this.formatCurrency(debtor.totalDebt || 0),
      debtor.totalStations || '0',
      (debtor.totalDebt || 0) > 0 ? 'Owes Money' : 'Paid Up',
      this.getLastActivityDate(debtor)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  },

  exportTransactionsToCSV: (transactions) => {
    if (!transactions || !transactions.length) return '';
    
    const headers = ['Date', 'Debtor', 'Station', 'Type', 'Vehicle', 'Amount', 'Balance After', 'Status', 'Due Date', 'Description'];
    const rows = transactions.map(transaction => [
      new Date(transaction.transactionDate).toLocaleDateString(),
      transaction.stationDebtorAccount?.debtor?.name || 'N/A',
      transaction.stationDebtorAccount?.station?.name || 'N/A',
      this.formatTransactionType(transaction.type),
      transaction.vehiclePlate ? 
        `${transaction.vehiclePlate}${transaction.vehicleModel ? ` (${transaction.vehicleModel})` : ''}` : 'N/A',
      this.formatCurrency(transaction.amount),
      this.formatCurrency(transaction.debtAfter),
      this.formatTransactionStatus(transaction.status),
      transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : 'N/A',
      transaction.description || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  },

  downloadDebtorsCSV: (debtors, filename = 'debtors.csv') => {
    const csvContent = this.exportDebtorsToCSV(debtors);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  downloadTransactionsCSV: (transactions, filename = 'debtor_transactions.csv') => {
    const csvContent = this.exportTransactionsToCSV(transactions);
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

  generateDebtorKey: (debtor) => {
    return `${debtor.id}-${debtor.totalDebt || 0}`;
  },

  generateTransactionKey: (transaction) => {
    return `${transaction.id}-${transaction.updatedAt}`;
  },

  findDebtorById: (debtors, debtorId) => {
    return debtors.find(debtor => debtor.id === debtorId);
  },

  findTransactionsByDebtor: (transactions, debtorId) => {
    return transactions.filter(transaction => 
      transaction.stationDebtorAccount?.debtorId === debtorId
    );
  },

  findTransactionsByStation: (transactions, stationId) => {
    return transactions.filter(transaction => 
      transaction.stationDebtorAccount?.stationId === stationId
    );
  },

  findTransactionsByType: (transactions, type) => {
    return transactions.filter(transaction => transaction.type === type);
  },

  // =====================
  // BATCH OPERATIONS
  // =====================

  bulkRecordPayments: async (payments) => {
    logger.info('Bulk recording debt payments:', payments);
    
    try {
      const results = [];
      
      for (const payment of payments) {
        try {
          const result = await this.recordDebtPayment(payment);
          results.push({ success: true, data: result, payment });
        } catch (error) {
          results.push({ 
            success: false, 
            error: error.message,
            payment 
          });
        }
      }
      
      logger.info('Bulk payment recording completed', {
        total: payments.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
      
      return this.processBulkResults(results);
    } catch (error) {
      throw handleError(error, 'bulk recording payments', 'Failed to process bulk payments');
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
          payment: f.payment,
          error: f.error
        }))
      }
    };
  },

  // =====================
  // QUICK DEBT OPERATIONS
  // =====================

  quickRecordFuelDebt: async (debtorPhone, debtorName, stationId, shiftId, amount, vehiclePlate) => {
    const debtData = {
      debtorPhone: debtorPhone.trim(),
      debtorName: debtorName.trim(),
      stationId,
      shiftId,
      amount: parseFloat(amount),
      vehiclePlate: vehiclePlate.trim(),
      description: `Quick fuel debt for ${vehiclePlate}`
    };

    return await this.recordFuelDebt(debtData);
  },

  quickRecordPayment: async (stationDebtorAccountId, amount, paymentMethod = 'CASH') => {
    const paymentData = {
      stationDebtorAccountId,
      amount: parseFloat(amount),
      paymentMethod,
      description: `Quick payment recorded`
    };

    return await this.recordDebtPayment(paymentData);
  }
};

// Default export for convenience
export default debtorService;