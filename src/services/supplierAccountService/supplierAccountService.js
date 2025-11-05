import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [SupplierAccountService]', ...args),
  info: (...args) => console.log('ℹ️ [SupplierAccountService]', ...args),
  warn: (...args) => console.warn('⚠️ [SupplierAccountService]', ...args),
  error: (...args) => console.error('❌ [SupplierAccountService]', ...args)
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

export const supplierAccountService = {
  // =====================
  // SUPPLIER CRUD OPERATIONS
  // =====================
  
  createSupplier: async (supplierData) => {
    logger.info('Creating supplier:', supplierData);
    
    try {
      const response = await apiService.post('/supplier-debt/suppliers', supplierData);
      return handleResponse(response, 'creating supplier');
    } catch (error) {
      throw handleError(error, 'creating supplier', 'Failed to create supplier');
    }
  },

  getSuppliers: async (filters = {}) => {
    logger.info('Fetching suppliers with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/supplier-debt/suppliers?${params.toString()}` : '/supplier-debt/suppliers';
      const response = await apiService.get(url);
      console.log("the suppliers are ", response);
      return handleResponse(response, 'fetching suppliers');
    } catch (error) {
      throw handleError(error, 'fetching suppliers', 'Failed to fetch suppliers');
    }
  },

  getSupplierById: async (supplierId) => {
    logger.info(`Fetching supplier: ${supplierId}`);
    
    try {
      const response = await apiService.get(`/supplier-debt/suppliers/${supplierId}`);
      return handleResponse(response, 'fetching supplier');
    } catch (error) {
      throw handleError(error, 'fetching supplier', 'Failed to fetch supplier');
    }
  },

  searchSuppliers: async (searchTerm) => {
    logger.info(`Searching suppliers: ${searchTerm}`);
    
    try {
      if (!searchTerm || searchTerm.length < 2) {
        return { data: [] };
      }
      
      const response = await apiService.get(`/supplier-debt/suppliers/search?search=${encodeURIComponent(searchTerm)}`);
      return handleResponse(response, 'searching suppliers');
    } catch (error) {
      throw handleError(error, 'searching suppliers', 'Failed to search suppliers');
    }
  },

  // =====================
  // DEBT OPERATIONS (PURCHASE INVOICES)
  // =====================

  recordPurchaseInvoice: async (invoiceData) => {
    logger.info('Recording purchase invoice:', invoiceData);
    
    try {
      const response = await apiService.post('/supplier-debt/purchase-invoices', invoiceData);
      return handleResponse(response, 'recording purchase invoice');
    } catch (error) {
      throw handleError(error, 'recording purchase invoice', 'Failed to record purchase invoice');
    }
  },

  getOutstandingInvoices: async (supplierAccountId) => {
    logger.info(`Fetching outstanding invoices for supplier account: ${supplierAccountId}`);
    
    try {
      const response = await apiService.get(`/supplier-debt/supplier-accounts/${supplierAccountId}/outstanding-invoices`);
      return handleResponse(response, 'fetching outstanding invoices');
    } catch (error) {
      throw handleError(error, 'fetching outstanding invoices', 'Failed to fetch outstanding invoices');
    }
  },

  getInvoiceById: async (transactionId) => {
    logger.info(`Fetching invoice: ${transactionId}`);
    
    try {
      const response = await apiService.get(`/supplier-debt/invoices/${transactionId}`);
      return handleResponse(response, 'fetching invoice');
    } catch (error) {
      throw handleError(error, 'fetching invoice', 'Failed to fetch invoice');
    }
  },

  // =====================
  // PAYMENT OPERATIONS
  // =====================

  recordSupplierPayment: async (paymentData) => {
    logger.info('Recording supplier payment:', paymentData);
    
    try {
      const response = await apiService.post('/supplier-debt/payments', paymentData);
      return handleResponse(response, 'recording supplier payment');
    } catch (error) {
      throw handleError(error, 'recording supplier payment', 'Failed to record supplier payment');
    }
  },

  allocatePaymentToInvoices: async (allocationData) => {
    logger.info('Allocating payment to invoices:', allocationData);
    
    try {
      const response = await apiService.post('/supplier-debt/payments/allocate', allocationData);
      return handleResponse(response, 'allocating payment to invoices');
    } catch (error) {
      throw handleError(error, 'allocating payment to invoices', 'Failed to allocate payment to invoices');
    }
  },

  getPaymentHistory: async (supplierAccountId, filters = {}) => {
    logger.info(`Fetching payment history for supplier account: ${supplierAccountId}`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/supplier-debt/supplier-accounts/${supplierAccountId}/payments?${params.toString()}`;
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching payment history');
    } catch (error) {
      throw handleError(error, 'fetching payment history', 'Failed to fetch payment history');
    }
  },

  // =====================
  // DEBT POSITION & REPORTING
  // =====================

  getSupplierDebtPosition: async (supplierAccountId) => {
    logger.info(`Fetching debt position for supplier account: ${supplierAccountId}`);
    
    try {
      const response = await apiService.get(`/supplier-debt/supplier-accounts/${supplierAccountId}/debt-position`);
      return handleResponse(response, 'fetching debt position');
    } catch (error) {
      throw handleError(error, 'fetching debt position', 'Failed to fetch debt position');
    }
  },

  getSupplierTransactions: async ( filters = {}) => {

    const supplierAccountId='2843e4a0-7e13-4297-bc57-c4f793191bd5';
    logger.info(`Fetching transactions for supplier account ${supplierAccountId}:`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/supplier-debt/supplier-accounts/${supplierAccountId}/transactions?${params.toString()}`;
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching supplier transactions');
    } catch (error) {
      throw handleError(error, 'fetching supplier transactions', 'Failed to fetch supplier transactions');
    }
  },

  getSupplierBalanceSheet: async (supplierAccountId, startDate, endDate) => {
    logger.info(`Fetching balance sheet for supplier account: ${supplierAccountId}`, { startDate, endDate });
    
    try {
      const response = await apiService.get(`/supplier-debt/supplier-accounts/${supplierAccountId}/balance-sheet?startDate=${startDate}&endDate=${endDate}`);
      return handleResponse(response, 'fetching balance sheet');
    } catch (error) {
      throw handleError(error, 'fetching balance sheet', 'Failed to fetch balance sheet');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validateCreateSupplier: (supplierData) => {
    const errors = [];

    if (!supplierData.name?.trim()) {
      errors.push('Supplier name is required');
    }

    if (!supplierData.code?.trim()) {
      errors.push('Supplier code is required');
    }

    if (supplierData.name && supplierData.name.length > 200) {
      errors.push('Supplier name cannot exceed 200 characters');
    }

    if (supplierData.code && supplierData.code.length > 50) {
      errors.push('Supplier code cannot exceed 50 characters');
    }

    if (supplierData.contactPerson && supplierData.contactPerson.length > 100) {
      errors.push('Contact person name cannot exceed 100 characters');
    }

    if (supplierData.email && !this.isValidEmail(supplierData.email)) {
      errors.push('Invalid email address format');
    }

    if (supplierData.phone && !this.isValidPhone(supplierData.phone)) {
      errors.push('Invalid phone number format');
    }

    if (supplierData.creditLimit && supplierData.creditLimit < 0) {
      errors.push('Credit limit cannot be negative');
    }

    if (supplierData.creditLimit && supplierData.creditLimit > 100000000) {
      errors.push('Credit limit cannot exceed 100,000,000');
    }

    return errors;
  },

  validatePurchaseInvoice: (invoiceData) => {
    const errors = [];

    if (!invoiceData.supplierId) {
      errors.push('Supplier selection is required');
    }

    if (!invoiceData.amount || invoiceData.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (invoiceData.amount > 10000000) {
      errors.push('Amount cannot exceed 10,000,000');
    }

    if (!invoiceData.description?.trim()) {
      errors.push('Description is required');
    }

    if (!invoiceData.dueDate) {
      errors.push('Due date is required');
    }

    if (invoiceData.dueDate && new Date(invoiceData.dueDate) < new Date()) {
      errors.push('Due date cannot be in the past');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (invoiceData.supplierId && !uuidRegex.test(invoiceData.supplierId)) {
      errors.push('Invalid supplier ID format');
    }

    return errors;
  },

  validateSupplierPayment: (paymentData) => {
    const errors = [];

    if (!paymentData.supplierAccountId) {
      errors.push('Supplier account selection is required');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Valid payment amount is required');
    }

    if (paymentData.amount > 10000000) {
      errors.push('Payment amount cannot exceed 10,000,000');
    }

    if (!paymentData.paymentMethod) {
      errors.push('Payment method is required');
    }

    if (!paymentData.paymentReference?.trim()) {
      errors.push('Payment reference is required');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (paymentData.supplierAccountId && !uuidRegex.test(paymentData.supplierAccountId)) {
      errors.push('Invalid supplier account ID format');
    }

    return errors;
  },

  validatePaymentAllocation: (allocationData) => {
    const errors = [];

    if (!allocationData.paymentTransactionId) {
      errors.push('Payment transaction selection is required');
    }

    if (!allocationData.allocations || !Array.isArray(allocationData.allocations) || allocationData.allocations.length === 0) {
      errors.push('At least one allocation is required');
    }

    if (allocationData.allocations) {
      allocationData.allocations.forEach((allocation, index) => {
        if (!allocation.invoiceTransactionId) {
          errors.push(`Allocation ${index + 1}: Invoice transaction is required`);
        }
        if (!allocation.allocatedAmount || allocation.allocatedAmount <= 0) {
          errors.push(`Allocation ${index + 1}: Valid allocated amount is required`);
        }
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (allocationData.paymentTransactionId && !uuidRegex.test(allocationData.paymentTransactionId)) {
      errors.push('Invalid payment transaction ID format');
    }

    return errors;
  },

  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidPhone: (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  // =====================
  // DATA TRANSFORMATION UTILITIES
  // =====================

  formatSupplierForDisplay: (supplier) => {
    if (!supplier) return null;
    
    const currentBalance = supplier.supplierAccount?.currentBalance || 0;
    const creditLimit = supplier.supplierAccount?.creditLimit || 0;
    const availableCredit = supplier.supplierAccount?.availableCredit || 0;
    
    const statusColor = currentBalance > 0 ? 'warning' : 'success';
    const creditUtilization = creditLimit > 0 ? (currentBalance / creditLimit * 100) : 0;
    
    return {
      ...supplier,
      displayName: supplier.name || 'Unknown Supplier',
      codeDisplay: supplier.code || 'No Code',
      contactInfo: supplier.contactPerson || 'No Contact',
      emailDisplay: supplier.email || 'No Email',
      phoneDisplay: supplier.phone || 'No Phone',
      currentBalance: this.formatCurrency(currentBalance),
      creditLimit: this.formatCurrency(creditLimit),
      availableCredit: this.formatCurrency(availableCredit),
      creditUtilization: `${creditUtilization.toFixed(1)}%`,
      status: currentBalance > 0 ? 'Owes Money' : 'Paid Up',
      statusColor: statusColor,
      isCreditHold: supplier.supplierAccount?.isCreditHold || false,
      lastActivity: this.getLastActivityDate(supplier),
      isActive: supplier.status === 'ACTIVE'
    };
  },

  formatSupplierAccountForDisplay: (supplierAccount) => {
    if (!supplierAccount) return null;
    
    const currentDate = new Date();
    const overdueAmount = supplierAccount.transactions
      ?.filter(t => t.dueDate && new Date(t.dueDate) < currentDate && t.status !== 'SETTLED')
      ?.reduce((sum, t) => sum + t.amount, 0) || 0;
    
    return {
      ...supplierAccount,
      supplierName: supplierAccount.supplier?.name || 'Unknown Supplier',
      balanceDisplay: this.formatCurrency(supplierAccount.currentBalance),
      creditLimitDisplay: this.formatCurrency(supplierAccount.creditLimit),
      availableCreditDisplay: this.formatCurrency(supplierAccount.availableCredit),
      overdueDisplay: this.formatCurrency(overdueAmount),
      status: supplierAccount.currentBalance > 0 ? 'Active' : 'Settled',
      statusColor: supplierAccount.currentBalance > 0 ? 
        (overdueAmount > 0 ? 'error' : 'warning') : 'success',
      lastTransaction: supplierAccount.lastPaymentDate ? 
        new Date(supplierAccount.lastPaymentDate).toLocaleDateString() : 'Never',
      creditUtilization: supplierAccount.creditLimit ? 
        `${((supplierAccount.currentBalance / supplierAccount.creditLimit) * 100).toFixed(1)}%` : 'N/A'
    };
  },

  formatTransactionForDisplay: (transaction) => {
    if (!transaction) return null;
    
    const isPayment = transaction.type === 'PAYMENT_MADE';
    const isCreditNote = transaction.type === 'CREDIT_NOTE';
    const amountColor = isPayment || isCreditNote ? 'success' : 'error';
    const amountPrefix = isPayment || isCreditNote ? '-' : '+';
    
    const daysOverdue = transaction.dueDate ? this.calculateDaysOverdue(transaction.dueDate) : 0;
    
    return {
      ...transaction,
      supplierName: transaction.supplierAccount?.supplier?.name || 'Unknown Supplier',
      amountDisplay: `${amountPrefix}${this.formatCurrency(Math.abs(transaction.amount))}`,
      amountColor: amountColor,
      balanceAfterDisplay: this.formatCurrency(transaction.balanceAfter),
      typeDisplay: this.formatTransactionType(transaction.type),
      statusDisplay: this.formatTransactionStatus(transaction.status),
      statusColor: this.getStatusColor(transaction.status),
      dueDateDisplay: transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : 'N/A',
      transactionDateDisplay: new Date(transaction.transactionDate).toLocaleDateString(),
      daysOverdue: daysOverdue,
      isOverdue: daysOverdue > 0 && transaction.status !== 'SETTLED',
      paymentInfo: transaction.paymentReference ? 
        `${transaction.paymentMethod || ''} - ${transaction.paymentReference}` : 'N/A'
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
      'PURCHASE_INVOICE': 'Purchase Invoice',
      'PAYMENT_MADE': 'Payment Made',
      'CREDIT_NOTE': 'Credit Note',
      'DEBIT_NOTE': 'Debit Note',
      'ADJUSTMENT': 'Adjustment',
      'WRITE_OFF': 'Write Off',
      'REFUND_RECEIVED': 'Refund Received'
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

  getLastActivityDate: (supplier) => {
    if (!supplier.supplierAccount) return 'Never';
    
    const lastPayment = supplier.supplierAccount.lastPaymentDate;
    const lastPurchase = supplier.supplierAccount.lastPurchaseDate;
    
    if (lastPayment && lastPurchase) {
      return new Date(Math.max(new Date(lastPayment), new Date(lastPurchase))).toLocaleDateString();
    } else if (lastPayment) {
      return new Date(lastPayment).toLocaleDateString();
    } else if (lastPurchase) {
      return new Date(lastPurchase).toLocaleDateString();
    }
    
    return 'Never';
  },

  // =====================
  // FILTER UTILITIES
  // =====================

  buildSupplierFilters: (filters) => {
    const cleanFilters = {};
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        cleanFilters[key] = filters[key];
      }
    });

    return cleanFilters;
  },

  filterSuppliersByStatus: (suppliers, status) => {
    if (!Array.isArray(suppliers)) return [];
    
    switch (status) {
      case 'active':
        return suppliers.filter(supplier => supplier.status === 'ACTIVE');
      case 'inactive':
        return suppliers.filter(supplier => supplier.status !== 'ACTIVE');
      case 'with-debt':
        return suppliers.filter(supplier => (supplier.supplierAccount?.currentBalance || 0) > 0);
      case 'no-debt':
        return suppliers.filter(supplier => (supplier.supplierAccount?.currentBalance || 0) === 0);
      case 'credit-hold':
        return suppliers.filter(supplier => supplier.supplierAccount?.isCreditHold === true);
      case 'over-limit':
        return suppliers.filter(supplier => {
          const balance = supplier.supplierAccount?.currentBalance || 0;
          const limit = supplier.supplierAccount?.creditLimit || 0;
          return limit > 0 && balance > limit;
        });
      default:
        return suppliers;
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

  searchSuppliersLocal: (suppliers, searchTerm) => {
    if (!Array.isArray(suppliers)) return [];
    if (!searchTerm) return suppliers;
    
    const term = searchTerm.toLowerCase();
    
    return suppliers.filter(supplier => 
      supplier.name?.toLowerCase().includes(term) ||
      supplier.code?.toLowerCase().includes(term) ||
      supplier.contactPerson?.toLowerCase().includes(term) ||
      supplier.email?.toLowerCase().includes(term) ||
      supplier.phone?.toLowerCase().includes(term)
    );
  },

  searchTransactions: (transactions, searchTerm) => {
    if (!Array.isArray(transactions)) return [];
    if (!searchTerm) return transactions;
    
    const term = searchTerm.toLowerCase();
    
    return transactions.filter(transaction => 
      transaction.supplierAccount?.supplier?.name?.toLowerCase().includes(term) ||
      transaction.invoiceNumber?.toLowerCase().includes(term) ||
      transaction.paymentReference?.toLowerCase().includes(term) ||
      transaction.description?.toLowerCase().includes(term) ||
      transaction.referenceNumber?.toLowerCase().includes(term)
    );
  },

  // =====================
  // SORTING UTILITIES
  // =====================

  sortSuppliers: (suppliers, sortBy, sortOrder = 'asc') => {
    if (!Array.isArray(suppliers)) return [];
    
    return [...suppliers].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'code':
          aValue = a.code || '';
          bValue = b.code || '';
          break;
        case 'balance':
          aValue = a.supplierAccount?.currentBalance || 0;
          bValue = b.supplierAccount?.currentBalance || 0;
          break;
        case 'creditLimit':
          aValue = a.supplierAccount?.creditLimit || 0;
          bValue = b.supplierAccount?.creditLimit || 0;
          break;
        case 'status':
          aValue = (a.supplierAccount?.currentBalance || 0) > 0 ? 'Owes Money' : 'Paid Up';
          bValue = (b.supplierAccount?.currentBalance || 0) > 0 ? 'Owes Money' : 'Paid Up';
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
        case 'supplier':
          aValue = a.supplierAccount?.supplier?.name || '';
          bValue = b.supplierAccount?.supplier?.name || '';
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'reference':
          aValue = a.referenceNumber || '';
          bValue = b.referenceNumber || '';
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

  getLastActivityTimestamp: (supplier) => {
    const lastPayment = supplier.supplierAccount?.lastPaymentDate;
    const lastPurchase = supplier.supplierAccount?.lastPurchaseDate;
    
    if (lastPayment && lastPurchase) {
      return Math.max(new Date(lastPayment).getTime(), new Date(lastPurchase).getTime());
    } else if (lastPayment) {
      return new Date(lastPayment).getTime();
    } else if (lastPurchase) {
      return new Date(lastPurchase).getTime();
    }
    
    return 0;
  },

  // =====================
  // DATA MAPPING UTILITIES
  // =====================

  mapSupplierToForm: (supplier) => {
    if (!supplier) return null;
    
    return {
      id: supplier.id,
      name: supplier.name,
      code: supplier.code,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      state: supplier.state,
      taxId: supplier.taxId,
      businessRegNumber: supplier.businessRegNumber,
      paymentTerms: supplier.paymentTerms,
      creditLimit: supplier.creditLimit,
      supplierType: supplier.supplierType,
      status: supplier.status,
      deliveryLeadTime: supplier.deliveryLeadTime,
      deliveryAreas: supplier.deliveryAreas
    };
  },

  mapFormToCreateSupplier: (formData) => {
    return {
      name: formData.name.trim(),
      code: formData.code.trim(),
      contactPerson: formData.contactPerson?.trim() || null,
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
      address: formData.address?.trim() || null,
      city: formData.city?.trim() || null,
      state: formData.state?.trim() || null,
      taxId: formData.taxId?.trim() || null,
      businessRegNumber: formData.businessRegNumber?.trim() || null,
      paymentTerms: formData.paymentTerms ? parseInt(formData.paymentTerms) : 30,
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : null,
      supplierType: formData.supplierType || null,
      deliveryLeadTime: formData.deliveryLeadTime ? parseInt(formData.deliveryLeadTime) : null,
      deliveryAreas: formData.deliveryAreas?.trim() || null
    };
  },

  mapFormToPurchaseInvoice: (formData) => {
    return {
      supplierId: formData.supplierId,
      amount: parseFloat(formData.amount),
      description: formData.description.trim(),
      dueDate: formData.dueDate,
      invoiceNumber: formData.invoiceNumber?.trim() || null,
      notes: formData.notes?.trim() || null
    };
  },

  mapFormToSupplierPayment: (formData) => {
    return {
      supplierAccountId: formData.supplierAccountId,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      paymentReference: formData.paymentReference.trim(),
      bankAccount: formData.bankAccount?.trim() || null,
      description: formData.description?.trim() || `Payment to supplier`,
      notes: formData.notes?.trim() || null
    };
  },

  mapFormToPaymentAllocation: (formData) => {
    return {
      paymentTransactionId: formData.paymentTransactionId,
      allocations: formData.allocations.map(allocation => ({
        supplierAccountId: allocation.supplierAccountId,
        invoiceTransactionId: allocation.invoiceTransactionId,
        allocatedAmount: parseFloat(allocation.allocatedAmount),
        applicationMethod: allocation.applicationMethod || 'MANUAL_ALLOCATION'
      }))
    };
  },

  // =====================
  // STATISTICS AND ANALYTICS
  // =====================

  calculateSupplierStatistics: (suppliers) => {
    if (!Array.isArray(suppliers)) return null;
    
    const activeSuppliers = suppliers.filter(supplier => supplier.status === 'ACTIVE');
    const suppliersWithBalance = suppliers.filter(supplier => (supplier.supplierAccount?.currentBalance || 0) > 0);
    const suppliersOnCreditHold = suppliers.filter(supplier => supplier.supplierAccount?.isCreditHold === true);
    
    const totalDebt = suppliers.reduce((sum, supplier) => sum + (supplier.supplierAccount?.currentBalance || 0), 0);
    const totalCreditLimit = suppliers.reduce((sum, supplier) => sum + (supplier.supplierAccount?.creditLimit || 0), 0);
    const averageDebt = suppliers.length > 0 ? totalDebt / suppliers.length : 0;
    
    return {
      totalSuppliers: suppliers.length,
      activeSuppliers: activeSuppliers.length,
      suppliersWithBalance: suppliersWithBalance.length,
      suppliersOnCreditHold: suppliersOnCreditHold.length,
      totalDebt: this.formatCurrency(totalDebt),
      totalCreditLimit: this.formatCurrency(totalCreditLimit),
      averageDebt: this.formatCurrency(averageDebt),
      creditUtilization: totalCreditLimit > 0 ? 
        ((totalDebt / totalCreditLimit) * 100).toFixed(1) + '%' : 'N/A',
      settlementRate: suppliers.length > 0 ? 
        ((suppliers.length - suppliersWithBalance.length) / suppliers.length * 100).toFixed(1) + '%' : '0%'
    };
  },

  calculateAgingSummary: (agingData) => {
    if (!agingData) return null;
    
    const total = agingData.current + agingData.overdue1_30 + agingData.overdue31_60 + agingData.overdue61_plus;
    const overdue = agingData.overdue1_30 + agingData.overdue31_60 + agingData.overdue61_plus;
    
    return {
      ...agingData,
      total: this.formatCurrency(total),
      overdue: this.formatCurrency(overdue),
      overduePercentage: total > 0 ? ((overdue / total) * 100).toFixed(1) + '%' : '0%',
      currentDisplay: this.formatCurrency(agingData.current),
      overdue1_30Display: this.formatCurrency(agingData.overdue1_30),
      overdue31_60Display: this.formatCurrency(agingData.overdue31_60),
      overdue61_plusDisplay: this.formatCurrency(agingData.overdue61_plus)
    };
  },

  // =====================
  // QUICK OPERATIONS
  // =====================

  quickRecordPurchaseInvoice: async (supplierId, amount, description) => {
    const invoiceData = {
      supplierId,
      amount: parseFloat(amount),
      description: description.trim(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
    };

    return await this.recordPurchaseInvoice(invoiceData);
  },

  quickRecordSupplierPayment: async (supplierAccountId, amount, paymentMethod = 'BANK_TRANSFER') => {
    const paymentData = {
      supplierAccountId,
      amount: parseFloat(amount),
      paymentMethod,
      paymentReference: `PAY-${Date.now()}`,
      description: `Quick payment recorded`
    };

    return await this.recordSupplierPayment(paymentData);
  },

  // =====================
  // EXPORT UTILITIES
  // =====================

  exportSuppliersToCSV: (suppliers) => {
    if (!suppliers || !suppliers.length) return '';
    
    const headers = ['Supplier Name', 'Code', 'Contact Person', 'Email', 'Phone', 'Current Balance', 'Credit Limit', 'Available Credit', 'Status', 'Last Activity'];
    const rows = suppliers.map(supplier => [
      supplier.name || 'N/A',
      supplier.code || 'N/A',
      supplier.contactPerson || 'N/A',
      supplier.email || 'N/A',
      supplier.phone || 'N/A',
      this.formatCurrency(supplier.supplierAccount?.currentBalance || 0),
      this.formatCurrency(supplier.supplierAccount?.creditLimit || 0),
      this.formatCurrency(supplier.supplierAccount?.availableCredit || 0),
      (supplier.supplierAccount?.currentBalance || 0) > 0 ? 'Owes Money' : 'Paid Up',
      this.getLastActivityDate(supplier)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  },

  exportTransactionsToCSV: (transactions) => {
    if (!transactions || !transactions.length) return '';
    
    const headers = ['Date', 'Supplier', 'Type', 'Amount', 'Balance After', 'Status', 'Due Date', 'Reference', 'Description'];
    const rows = transactions.map(transaction => [
      new Date(transaction.transactionDate).toLocaleDateString(),
      transaction.supplierAccount?.supplier?.name || 'N/A',
      this.formatTransactionType(transaction.type),
      this.formatCurrency(transaction.amount),
      this.formatCurrency(transaction.balanceAfter),
      this.formatTransactionStatus(transaction.status),
      transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : 'N/A',
      transaction.referenceNumber || 'N/A',
      transaction.description || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  },

  downloadSuppliersCSV: (suppliers, filename = 'suppliers.csv') => {
    const csvContent = this.exportSuppliersToCSV(suppliers);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  downloadTransactionsCSV: (transactions, filename = 'supplier_transactions.csv') => {
    const csvContent = this.exportTransactionsToCSV(transactions);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
};

// Default export for convenience
export default supplierAccountService;