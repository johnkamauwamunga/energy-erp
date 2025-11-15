import { apiService } from '../apiService';

class DebtorService {
  constructor() {
    this.logger = {
      debug: (...args) => console.log('🔍 [DebtorService]', ...args),
      info: (...args) => console.log('ℹ️ [DebtorService]', ...args),
      warn: (...args) => console.warn('⚠️ [DebtorService]', ...args),
      error: (...args) => console.error('❌ [DebtorService]', ...args)
    };
    
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  // =====================
  // CORE UTILITIES
  // =====================

  debugRequest = (method, url, data) => {
    this.logger.debug(`➡️ ${method} ${url}`, data || '');
  };

  debugResponse = (method, url, response) => {
    this.logger.debug(`⬅️ ${method} ${url} Response:`, response.data);
  };

  handleResponse = (response, operation) => {
    if (response.data?.success) {
      this.logger.debug(`${operation} successful`);
      return response.data.data;
    }
    
    if (response.data) {
      this.logger.debug(`${operation} successful (direct data)`);
      return response.data;
    }
    
    this.logger.warn(`Unexpected response structure for ${operation}`);
    throw new Error('Invalid response format from server');
  };

  handleError = (error, operation, defaultMessage) => {
    this.logger.error(`${operation} failed:`, error);

    // Network errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    if (error.request) {
      throw new Error('Network error. Please check your connection.');
    }

    // HTTP errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          throw new Error('Authentication failed. Please login again.');
        
        case 403:
          throw new Error('You do not have permission to perform this action.');
        
        case 404:
          throw new Error('Requested resource not found.');
        
        case 400:
          return this.handleValidationError(data);
        
        default:
          if (data?.message) throw new Error(data.message);
      }
    }

    throw new Error(defaultMessage || 'An unexpected error occurred');
  };

  handleValidationError = (data) => {
    if (data.message) throw new Error(data.message);
    if (data.errors) {
      const errorMessages = Array.isArray(data.errors) 
        ? data.errors.map(err => err.message || err).join(', ')
        : JSON.stringify(data.errors);
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    throw new Error('Validation failed');
  };

  buildQueryParams = (filters) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    return params.toString();
  };

  // =====================
  // CACHE MANAGEMENT
  // =====================

  getCached = (key) => {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`Cache hit: ${key}`);
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  };

  setCached = (key, data) => {
    this.cache.set(key, { data, timestamp: Date.now() });
  };

  clearCache = (pattern = null) => {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  };

  // =====================
  // DEBTOR CATEGORY MANAGEMENT
  // =====================

  createDebtorCategory = async (categoryData) => {
    this.logger.info('Creating debtor category:', categoryData);
    this.debugRequest('POST', '/debtor-categories', categoryData);
    
    try {
      const response = await apiService.post('/debtor-categories', categoryData);
      this.debugResponse('POST', '/debtor-categories', response);
      this.clearCache('debtor-categories');
      return this.handleResponse(response, 'Debtor category creation');
    } catch (error) {
      throw this.handleError(error, 'Debtor category creation', 'Failed to create debtor category');
    }
  };

  updateDebtorCategory = async (categoryId, updateData) => {
    this.logger.info(`Updating debtor category ${categoryId}:`, updateData);
    this.debugRequest('PATCH', `/debtor-categories/${categoryId}`, updateData);
    
    try {
      const response = await apiService.patch(`/debtor-categories/${categoryId}`, updateData);
      this.debugResponse('PATCH', `/debtor-categories/${categoryId}`, response);
      this.clearCache('debtor-categories');
      return this.handleResponse(response, 'Debtor category update');
    } catch (error) {
      throw this.handleError(error, 'Debtor category update', 'Failed to update debtor category');
    }
  };

  getDebtorCategories = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching debtor categories:', filters);
    
    const cacheKey = `debtor-categories-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const url = query ? `/debtor-categories?${query}` : '/debtor-categories';
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Debtor categories fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Debtor categories fetch', 'Failed to fetch debtor categories');
    }
  };

  getDebtorCategoryById = async (categoryId) => {
    this.logger.info(`Fetching debtor category: ${categoryId}`);
    
    const cacheKey = `debtor-category-${categoryId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      this.debugRequest('GET', `/debtor-categories/${categoryId}`);
      const response = await apiService.get(`/debtor-categories/${categoryId}`);
      this.debugResponse('GET', `/debtor-categories/${categoryId}`, response);
      
      const data = this.handleResponse(response, 'Debtor category fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Debtor category fetch', 'Failed to fetch debtor category');
    }
  };

  deleteDebtorCategory = async (categoryId) => {
    this.logger.info(`Deleting debtor category: ${categoryId}`);
    this.debugRequest('DELETE', `/debtor-categories/${categoryId}`);
    
    try {
      const response = await apiService.delete(`/debtor-categories/${categoryId}`);
      this.debugResponse('DELETE', `/debtor-categories/${categoryId}`, response);
      this.clearCache('debtor-categories');
      return this.handleResponse(response, 'Debtor category deletion');
    } catch (error) {
      throw this.handleError(error, 'Debtor category deletion', 'Failed to delete debtor category');
    }
  };

  getActiveDebtorCategories = async (forceRefresh = false) => {
    this.logger.info('Fetching active debtor categories');
    
    const cacheKey = 'active-debtor-categories';
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      this.debugRequest('GET', '/debtor-categories/active');
      const response = await apiService.get('/debtor-categories/active');
      this.debugResponse('GET', '/debtor-categories/active', response);
      
      const data = this.handleResponse(response, 'Active debtor categories fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Active debtor categories fetch', 'Failed to fetch active debtor categories');
    }
  };

  initializeSystemCategories = async () => {
    this.logger.info('Initializing system debtor categories');
    this.debugRequest('POST', '/debtor-categories/initialize/system');
    
    try {
      const response = await apiService.post('/debtor-categories/initialize/system');
      this.debugResponse('POST', '/debtor-categories/initialize/system', response);
      this.clearCache('debtor-categories');
      return this.handleResponse(response, 'System categories initialization');
    } catch (error) {
      throw this.handleError(error, 'System categories initialization', 'Failed to initialize system categories');
    }
  };

  // =====================
  // DEBTOR MANAGEMENT
  // =====================

  createDebtor = async (debtorData) => {
    this.logger.info('Creating debtor:', debtorData);
    this.debugRequest('POST', '/debtors', debtorData);
    
    try {
      const response = await apiService.post('/debtors', debtorData);
      this.debugResponse('POST', '/debtors', response);
      this.clearCache('debtors');
      this.clearCache('debtor-statistics');
      return this.handleResponse(response, 'Debtor creation');
    } catch (error) {
      throw this.handleError(error, 'Debtor creation', 'Failed to create debtor');
    }
  };

  updateDebtor = async (debtorId, updateData) => {
    this.logger.info(`Updating debtor ${debtorId}:`, updateData);
    this.debugRequest('PATCH', `/debtors/${debtorId}`, updateData);
    
    try {
      const response = await apiService.patch(`/debtors/${debtorId}`, updateData);
      this.debugResponse('PATCH', `/debtors/${debtorId}`, response);
      this.clearCache('debtors');
      this.clearCache('debtor-statistics');
      return this.handleResponse(response, 'Debtor update');
    } catch (error) {
      throw this.handleError(error, 'Debtor update', 'Failed to update debtor');
    }
  };

  getDebtors = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching debtors:', filters);
    
    const cacheKey = `debtors-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const url = query ? `/debtors?${query}` : '/debtors';
      
      console.log("the debtor on debtor service ",url)
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Debtors fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Debtors fetch', 'Failed to fetch debtors');
    }
  };

  getDebtorById = async (debtorId) => {
    this.logger.info(`Fetching debtor: ${debtorId}`);
    
    const cacheKey = `debtor-${debtorId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      this.debugRequest('GET', `/debtors/${debtorId}`);
      const response = await apiService.get(`/debtors/${debtorId}`);
      this.debugResponse('GET', `/debtors/${debtorId}`, response);
      
      const data = this.handleResponse(response, 'Debtor fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Debtor fetch', 'Failed to fetch debtor');
    }
  };

  deleteDebtor = async (debtorId) => {
    this.logger.info(`Deleting debtor: ${debtorId}`);
    this.debugRequest('DELETE', `/debtors/${debtorId}`);
    
    try {
      const response = await apiService.delete(`/debtors/${debtorId}`);
      this.debugResponse('DELETE', `/debtors/${debtorId}`, response);
      this.clearCache('debtors');
      this.clearCache('debtor-statistics');
      return this.handleResponse(response, 'Debtor deletion');
    } catch (error) {
      throw this.handleError(error, 'Debtor deletion', 'Failed to delete debtor');
    }
  };

  searchDebtors = async (searchTerm, limit = 10) => {
    this.logger.info(`Searching debtors: "${searchTerm}"`);
    
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    try {
      this.debugRequest('GET', `/debtors/search?search=${searchTerm}&limit=${limit}`);
      const response = await apiService.get(`/debtors/search?search=${searchTerm}&limit=${limit}`);
      this.debugResponse('GET', `/debtors/search`, response);
      
      return this.handleResponse(response, 'Debtor search');
    } catch (error) {
      throw this.handleError(error, 'Debtor search', 'Failed to search debtors');
    }
  };

  getDebtorsByCategory = async (categoryId, isActive = true) => {
    this.logger.info(`Fetching debtors by category: ${categoryId}`);
    
    try {
      const query = this.buildQueryParams({ isActive });
      const url = query ? `/debtors/category/${categoryId}?${query}` : `/debtors/category/${categoryId}`;
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      return this.handleResponse(response, 'Debtors by category fetch');
    } catch (error) {
      throw this.handleError(error, 'Debtors by category fetch', 'Failed to fetch debtors by category');
    }
  };

  checkCreditLimit = async (debtorId, additionalAmount = 0) => {
    this.logger.info(`Checking credit limit for debtor: ${debtorId}`);
    
    try {
      const query = this.buildQueryParams({ additionalAmount });
      const url = `/debtors/${debtorId}/credit-limit?${query}`;
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      return this.handleResponse(response, 'Credit limit check');
    } catch (error) {
      throw this.handleError(error, 'Credit limit check', 'Failed to check credit limit');
    }
  };

  // =====================
  // DEBT OPERATIONS
  // =====================

  recordFuelDebt = async (debtData) => {
    this.logger.info('Recording fuel debt:', debtData);
    this.debugRequest('POST', '/debtors/record-fuel-debt', debtData);
    
    try {
      const response = await apiService.post('/debtors/record-fuel-debt', debtData);
      this.debugResponse('POST', '/debtors/record-fuel-debt', response);
      this.clearCache('debtors');
      this.clearCache('debtor-statistics');
      this.clearCache('station-debtors');
      return this.handleResponse(response, 'Fuel debt recording');
    } catch (error) {
      throw this.handleError(error, 'Fuel debt recording', 'Failed to record fuel debt');
    }
  };

  recordDebtPayment = async (paymentData) => {
    this.logger.info('Recording debt payment:', paymentData);
    this.debugRequest('POST', '/debtors/record-payment', paymentData);
    
    try {
      const response = await apiService.post('/debtors/record-payment', paymentData);
      this.debugResponse('POST', '/debtors/record-payment', response);
      this.clearCache('debtors');
      this.clearCache('debtor-statistics');
      this.clearCache('station-debtors');
      this.clearCache('debtor-transactions');
      return this.handleResponse(response, 'Debt payment recording');
    } catch (error) {
      throw this.handleError(error, 'Debt payment recording', 'Failed to record debt payment');
    }
  };

  writeOffDebt = async (writeOffData) => {
    this.logger.info('Writing off debt:', writeOffData);
    this.debugRequest('POST', '/debtors/write-off', writeOffData);
    
    try {
      const response = await apiService.post('/debtors/write-off', writeOffData);
      this.debugResponse('POST', '/debtors/write-off', response);
      this.clearCache('debtors');
      this.clearCache('debtor-statistics');
      this.clearCache('station-debtors');
      this.clearCache('debtor-transactions');
      return this.handleResponse(response, 'Debt write-off');
    } catch (error) {
      throw this.handleError(error, 'Debt write-off', 'Failed to write off debt');
    }
  };

  // =====================
  // STATION DEBT OPERATIONS
  // =====================

  getStationDebtors = async (stationId) => {
    this.logger.info(`Fetching station debtors: ${stationId}`);
    
    const cacheKey = `station-debtors-${stationId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      this.debugRequest('GET', `/debtors/station/${stationId}`);
      const response = await apiService.get(`/debtors/station/${stationId}`);
      this.debugResponse('GET', `/debtors/station/${stationId}`, response);
      
      const data = this.handleResponse(response, 'Station debtors fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Station debtors fetch', 'Failed to fetch station debtors');
    }
  };

  // =====================
  // TRANSACTION HISTORY
  // =====================

  getDebtorTransactions = async (debtorId, filters = {}, forceRefresh = false) => {
    this.logger.info(`Fetching transactions for debtor: ${debtorId}`, filters);
    
    const cacheKey = `debtor-transactions-${debtorId}-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const url = query ? `/debtors/${debtorId}/transactions?${query}` : `/debtors/${debtorId}/transactions`;
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Debtor transactions fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Debtor transactions fetch', 'Failed to fetch debtor transactions');
    }
  };

  // =====================
  // STATISTICS AND REPORTS
  // =====================

  getDebtorStatistics = async (stationId = null, forceRefresh = false) => {
    this.logger.info('Fetching debtor statistics');
    
    const cacheKey = stationId ? `debtor-statistics-${stationId}` : 'debtor-statistics';
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = stationId ? this.buildQueryParams({ stationId }) : '';
      const url = query ? `/debtors/reports/statistics?${query}` : '/debtors/reports/statistics';
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Debtor statistics fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Debtor statistics fetch', 'Failed to fetch debtor statistics');
    }
  };

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validateDebtorCategory = (categoryData) => {
    const errors = [];
    if (!categoryData.name?.trim()) errors.push('Category name is required');
    if (categoryData.name && categoryData.name.length < 1) errors.push('Category name must be at least 1 character');
    if (categoryData.name && categoryData.name.length > 100) errors.push('Category name cannot exceed 100 characters');
    if (categoryData.color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(categoryData.color)) errors.push('Color must be a valid hex color');
    if (categoryData.icon && !/^[a-z-]+$/.test(categoryData.icon)) errors.push('Icon can only contain lowercase letters and hyphens');
    return errors;
  };

  validateDebtor = (debtorData) => {
    const errors = [];
    if (!debtorData.name?.trim()) errors.push('Debtor name is required');
    if (debtorData.name && debtorData.name.length < 1) errors.push('Debtor name must be at least 1 character');
    if (debtorData.name && debtorData.name.length > 200) errors.push('Debtor name cannot exceed 200 characters');
    if (!debtorData.categoryId) errors.push('Category is required');
    if (debtorData.code && !/^[A-Z0-9-_]+$/.test(debtorData.code)) errors.push('Code can only contain uppercase letters, numbers, hyphens and underscores');
    if (debtorData.phone && !/^\+?[\d\s-()]+$/.test(debtorData.phone)) errors.push('Invalid phone number format');
    if (debtorData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debtorData.email)) errors.push('Invalid email address');
    if (debtorData.creditLimit && debtorData.creditLimit < 0) errors.push('Credit limit cannot be negative');
    if (debtorData.paymentTerms && debtorData.paymentTerms < 0) errors.push('Payment terms cannot be negative');
    if (debtorData.paymentTerms && debtorData.paymentTerms > 365) errors.push('Payment terms cannot exceed 365 days');
    return errors;
  };

  validateFuelDebt = (debtData) => {
    const errors = [];
    if (!debtData.debtorPhone?.trim()) errors.push('Debtor phone is required');
    if (!debtData.debtorName?.trim()) errors.push('Debtor name is required');
    if (!debtData.stationId) errors.push('Station is required');
    if (!debtData.shiftId) errors.push('Shift is required');
    if (!debtData.amount || debtData.amount <= 0) errors.push('Amount must be positive');
    if (debtData.amount && debtData.amount > 1000000) errors.push('Amount cannot exceed 1,000,000');
    if (!debtData.vehiclePlate?.trim()) errors.push('Vehicle plate is required');
    return errors;
  };

  validateDebtPayment = (paymentData) => {
    const errors = [];
    if (!paymentData.stationDebtorAccountId) errors.push('Station debtor account is required');
    if (!paymentData.amount || paymentData.amount <= 0) errors.push('Amount must be positive');
    if (paymentData.amount && paymentData.amount > 1000000) errors.push('Amount cannot exceed 1,000,000');
    if (!paymentData.paymentMethod) errors.push('Payment method is required');
    return errors;
  };

  validateDebtWriteOff = (writeOffData) => {
    const errors = [];
    if (!writeOffData.stationDebtorAccountId) errors.push('Station debtor account is required');
    if (!writeOffData.amount || writeOffData.amount <= 0) errors.push('Amount must be positive');
    if (writeOffData.amount && writeOffData.amount > 1000000) errors.push('Amount cannot exceed 1,000,000');
    if (!writeOffData.reason?.trim()) errors.push('Write-off reason is required');
    return errors;
  };

  // =====================
  // UTILITY METHODS
  // =====================

  formatDebtorCategory = (category) => {
    if (!category) return null;
    
    return {
      ...category,
      displayName: category.name,
      debtorCountDisplay: category.debtorCount ? `${category.debtorCount} debtor${category.debtorCount !== 1 ? 's' : ''}` : 'No debtors',
      statusDisplay: category.isActive ? 'Active' : 'Inactive',
      statusColor: category.isActive ? 'success' : 'error',
      systemDisplay: category.isSystem ? 'System' : 'Custom',
      systemColor: category.isSystem ? 'primary' : 'default',
      settingsDisplay: this.getCategorySettingsDisplay(category)
    };
  };

  getCategorySettingsDisplay = (category) => {
    const settings = [];
    if (category.isPaymentProcessor) settings.push('Payment Processor');
    if (category.requiresApproval) settings.push('Requires Approval');
    if (category.hasCreditLimit) settings.push('Credit Limit');
    return settings.length > 0 ? settings.join(', ') : 'No special settings';
  };

  formatDebtor = (debtor) => {
    if (!debtor) return null;
    
    return {
      ...debtor,
      displayName: debtor.name,
      categoryDisplay: debtor.category ? `${debtor.category.name}${debtor.category.color ? ` (${debtor.category.color})` : ''}` : 'No Category',
      totalDebtDisplay: new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
      }).format(debtor.totalDebt || 0),
      stationCountDisplay: debtor.stationCount ? `${debtor.stationCount} station${debtor.stationCount !== 1 ? 's' : ''}` : 'No stations',
      statusDisplay: debtor.isActive ? 'Active' : 'Inactive',
      statusColor: debtor.isActive ? 'success' : 'error',
      blacklistedDisplay: debtor.isBlacklisted ? 'Blacklisted' : 'Clear',
      blacklistedColor: debtor.isBlacklisted ? 'error' : 'success',
      creditLimitDisplay: debtor.creditLimit 
        ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(debtor.creditLimit)
        : 'No limit',
      creditUtilization: debtor.creditLimit && debtor.totalDebt 
        ? (debtor.totalDebt / debtor.creditLimit * 100).toFixed(1) + '%'
        : 'N/A'
    };
  };

  formatDebtorTransaction = (transaction) => {
    if (!transaction) return null;
    
    return {
      ...transaction,
      amountDisplay: new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: transaction.currency || 'KES'
      }).format(transaction.amount || 0),
      typeDisplay: this.getTransactionTypeDisplay(transaction.type),
      typeColor: this.getTransactionTypeColor(transaction.type),
      statusDisplay: this.getTransactionStatusDisplay(transaction.status),
      statusColor: this.getTransactionStatusColor(transaction.status),
      stationDisplay: transaction.stationDebtorAccount?.station?.name || 'Unknown Station',
      dueDateDisplay: transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : 'Not set',
      isOverdue: transaction.dueDate && new Date(transaction.dueDate) < new Date() && transaction.status === 'OUTSTANDING'
    };
  };

  getTransactionTypeDisplay = (type) => {
    const typeMap = {
      'DEBIT': 'Debt Incurred',
      'CREDIT': 'Payment Received',
      'DEBT_WRITE_OFF': 'Write Off',
      'PAYMENT_RECEIVED': 'Payment Received'
    };
    return typeMap[type] || type;
  };

  getTransactionTypeColor = (type) => {
    const colorMap = {
      'DEBIT': 'error',
      'CREDIT': 'success',
      'DEBT_WRITE_OFF': 'warning',
      'PAYMENT_RECEIVED': 'success'
    };
    return colorMap[type] || 'default';
  };

  getTransactionStatusDisplay = (status) => {
    const statusMap = {
      'PENDING': 'Pending',
      'OUTSTANDING': 'Outstanding',
      'SETTLED': 'Settled',
      'OVERDUE': 'Overdue',
      'CANCELLED': 'Cancelled'
    };
    return statusMap[status] || status;
  };

  getTransactionStatusColor = (status) => {
    const colorMap = {
      'PENDING': 'warning',
      'OUTSTANDING': 'info',
      'SETTLED': 'success',
      'OVERDUE': 'error',
      'CANCELLED': 'default'
    };
    return colorMap[status] || 'default';
  };

  formatStationDebtors = (stationDebtors) => {
    if (!stationDebtors) return null;
    
    return {
      ...stationDebtors,
      totalDebtDisplay: new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
      }).format(stationDebtors.totalDebt || 0),
      debtorCountDisplay: `${stationDebtors.debtorCount} debtor${stationDebtors.debtorCount !== 1 ? 's' : ''}`,
      agingDisplay: this.formatAgingAnalysis(stationDebtors.aging)
    };
  };

  formatAgingAnalysis = (aging) => {
    if (!aging) return 'No data';
    
    const parts = [];
    if (aging.current > 0) parts.push(`Current: ${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(aging.current)}`);
    if (aging['1-30'] > 0) parts.push(`1-30: ${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(aging['1-30'])}`);
    if (aging['31-60'] > 0) parts.push(`31-60: ${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(aging['31-60'])}`);
    if (aging['61-90'] > 0) parts.push(`61-90: ${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(aging['61-90'])}`);
    if (aging['90+'] > 0) parts.push(`90+: ${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(aging['90+'])}`);
    
    return parts.length > 0 ? parts.join(', ') : 'All cleared';
  };

  getDefaultDebtorCategoryData = () => {
    return {
      name: '',
      description: '',
      color: '#666666',
      icon: '',
      isPaymentProcessor: false,
      requiresApproval: false,
      hasCreditLimit: false,
      isActive: true
    };
  };

  getDefaultDebtorData = () => {
    return {
      name: '',
      categoryId: '',
      code: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      creditLimit: null,
      paymentTerms: null,
      taxNumber: '',
      isActive: true,
      isBlacklisted: false
    };
  };

  getDefaultFuelDebtData = () => {
    return {
      debtorPhone: '',
      debtorName: '',
      stationId: '',
      shiftId: '',
      amount: 0,
      vehiclePlate: '',
      vehicleModel: '',
      description: 'Fuel purchase on credit',
      transactionDate: new Date().toISOString()
    };
  };

  getDefaultDebtPaymentData = () => {
    return {
      stationDebtorAccountId: '',
      amount: 0,
      paymentMethod: 'CASH',
      referenceNumber: '',
      notes: '',
      transactionDate: new Date().toISOString()
    };
  };

  getDefaultDebtWriteOffData = () => {
    return {
      stationDebtorAccountId: '',
      amount: 0,
      reason: '',
      notes: ''
    };
  };

  // =====================
  // BATCH OPERATIONS
  // =====================

  batchCreateDebtors = async (debtorsData) => {
    this.logger.info(`Batch creating ${debtorsData.length} debtors`);
    
    try {
      const promises = debtorsData.map(debtorData => 
        this.createDebtor(debtorData)
      );
      
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);
      
      return {
        successful,
        failed,
        total: debtorsData.length,
        successCount: successful.length,
        failureCount: failed.length
      };
    } catch (error) {
      throw this.handleError(error, 'Batch debtor creation', 'Failed to batch create debtors');
    }
  };

  // =====================
  // SEARCH OPERATIONS
  // =====================

  searchDebtorEntities = async (searchTerm) => {
    this.logger.info(`Searching debtor entities for: "${searchTerm}"`);
    
    try {
      const [categories, debtors] = await Promise.all([
        this.getDebtorCategories({ search: searchTerm }),
        this.searchDebtors(searchTerm)
      ]);

      return {
        categories: categories?.categories || categories || [],
        debtors: debtors || [],
        searchTerm,
        totalResults: (categories?.categories?.length || categories?.length || 0) + (debtors?.length || 0)
      };
    } catch (error) {
      throw this.handleError(error, 'Debtor entities search', 'Failed to search debtor entities');
    }
  };

  // =====================
  // ANALYTICS
  // =====================

  getDebtorAnalytics = async (forceRefresh = false) => {
    this.logger.info('Fetching debtor analytics');
    
    const cacheKey = 'debtor-analytics';
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const [statistics, categories, recentTransactions] = await Promise.all([
        this.getDebtorStatistics(null, true),
        this.getDebtorCategories({}, true),
        this.getDebtors({}, true).then(debtors => {
          // Get recent transactions for top debtors
          const topDebtors = (debtors?.debtors || debtors || []).slice(0, 5);
          return Promise.all(
            topDebtors.map(debtor => 
              this.getDebtorTransactions(debtor.id, { limit: 5 }, true)
            )
          );
        })
      ]);

      const analytics = {
        summary: statistics?.summary || {},
        topDebtors: statistics?.topDebtors || [],
        recentTransactions: recentTransactions.flatMap(t => t?.transactions || t || []).slice(0, 10),
        categoryDistribution: {},
        statusDistribution: {
          active: 0,
          inactive: 0,
          blacklisted: 0
        }
      };

      // Process categories data
      const categoriesList = categories?.categories || categories || [];
      categoriesList.forEach(category => {
        analytics.categoryDistribution[category.name] = category.debtorCount || 0;
      });

      // Process debtors data for status distribution
      const debtorsList = statistics?.topDebtors || [];
      debtorsList.forEach(debtor => {
        if (debtor.isBlacklisted) {
          analytics.statusDistribution.blacklisted++;
        } else if (debtor.isActive) {
          analytics.statusDistribution.active++;
        } else {
          analytics.statusDistribution.inactive++;
        }
      });

      this.setCached(cacheKey, analytics);
      return analytics;
    } catch (error) {
      throw this.handleError(error, 'Debtor analytics fetch', 'Failed to fetch debtor analytics');
    }
  };

  // =====================
  // EXPORT/IMPORT
  // =====================

  exportDebtors = async (format = 'json') => {
    this.logger.info(`Exporting debtors in ${format} format`);
    
    try {
      const debtors = await this.getDebtors({}, true);
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalDebtors: debtors?.debtors?.length || debtors?.length || 0,
        debtors: (debtors?.debtors || debtors || []).map(debtor => ({
          id: debtor.id,
          name: debtor.name,
          code: debtor.code,
          category: debtor.category?.name,
          contactPerson: debtor.contactPerson,
          phone: debtor.phone,
          email: debtor.email,
          creditLimit: debtor.creditLimit,
          currentDebt: debtor.totalDebt || 0,
          paymentTerms: debtor.paymentTerms,
          isActive: debtor.isActive,
          isBlacklisted: debtor.isBlacklisted,
          createdAt: debtor.createdAt
        }))
      };

      if (format === 'csv') {
        // Convert to CSV format
        const headers = ['Name', 'Code', 'Category', 'Contact Person', 'Phone', 'Email', 'Credit Limit', 'Current Debt', 'Payment Terms', 'Status', 'Blacklisted'];
        const csvRows = [headers.join(',')];
        
        exportData.debtors.forEach(debtor => {
          const row = [
            `"${debtor.name}"`,
            `"${debtor.code || ''}"`,
            `"${debtor.category || ''}"`,
            `"${debtor.contactPerson || ''}"`,
            `"${debtor.phone || ''}"`,
            `"${debtor.email || ''}"`,
            debtor.creditLimit || 0,
            debtor.currentDebt || 0,
            debtor.paymentTerms || '',
            debtor.isActive ? 'Active' : 'Inactive',
            debtor.isBlacklisted ? 'Yes' : 'No'
          ];
          csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
      }

      return exportData;
    } catch (error) {
      throw this.handleError(error, 'Debtors export', 'Failed to export debtors');
    }
  };
}

export const debtorService = new DebtorService();
export default debtorService;