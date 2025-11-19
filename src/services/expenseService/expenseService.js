// services/expenseService/expenseService.js
import { apiService } from '../apiService';

class ExpenseService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  // =====================
  // CORE UTILITIES
  // =====================

  handleResponse = (response) => {
    if (response.data?.success) {
      return response.data;
    }
    return response.data;
  };

  handleError = (error, defaultMessage) => {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    if (error.message) {
      throw new Error(error.message);
    }
    throw new Error(defaultMessage);
  };

  buildQuery = (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Convert numbers to strings for URL params
        if (typeof value === 'number') {
          params.append(key, value.toString());
        } else {
          params.append(key, value);
        }
      }
    });
    return params.toString();
  };

  // =====================
  // EXPENSE MANAGEMENT
  // =====================

  createExpense = async (expenseData) => {
    try {
      const response = await apiService.post('/expenses', expenseData);
      this.clearCache('expenses');
      this.clearCache('expense-summary');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to create expense');
    }
  };

  getExpenses = async (filters = {}) => {
    const cacheKey = `expenses-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const query = this.buildQuery(filters);
      const url = query ? `/expenses?${query}` : '/expenses';
      const response = await apiService.get(url);

      console.log("this is the expenses ",response);
      const data = this.handleResponse(response);
      
      // Store with timestamp for cache cleanup
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch expenses');
    }
  };

  getExpenseById = async (expenseId) => {
    const cacheKey = `expense-${expenseId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await apiService.get(`/expenses/${expenseId}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch expense');
    }
  };

  // =====================
// COMBINED CLIENT-SIDE FILTERING
// =====================



    getExpensesByShiftAndIsland = async (shiftId, islandId, filters = {}) => {
  const cacheKey = `expenses-shift-${shiftId}-island-${islandId}-${JSON.stringify(filters)}`;
  const cached = this.cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
    return cached.data;
  }

  try {
    let expenses = [];
    let totalCount = 0;


    // Strategy 1: Get shift expenses and filter by island
    const shiftExpenses = await this.getExpensesByShift(shiftId, { ...filters, limit: 100 });

   // console.log("the shift expense data ",shiftExpenses);
    expenses = shiftExpenses.filter(expense => expense.island?.id === islandId);
      // console.log("the shift expense filtered by island ",expenses);
    totalCount = expenses.length;

    // If no results, try Strategy 2: Get island expenses and filter by shift
    if (expenses.length === 0) {
      const islandExpenses = await this.getExpensesByIsland(islandId, { ...filters, limit: 1000 });
      expenses = islandExpenses.filter(expense => expense.shiftId === shiftId);
      totalCount = expenses.length;
    }

    // Apply pagination client-side
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedExpenses = expenses.slice(startIndex, endIndex);

    const result = {
      success: true,
      data: paginatedExpenses,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    };

    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;

  } catch (error) {
    throw this.handleError(error, 'Failed to fetch expenses by shift and island');
  }
};

  updateExpense = async (expenseId, updateData) => {
    try {
      const response = await apiService.put(`/expenses/${expenseId}`, updateData);
      this.clearCache('expenses');
      this.clearCache('expense-summary');
      this.cache.delete(`expense-${expenseId}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to update expense');
    }
  };

  deleteExpense = async (expenseId) => {
    try {
      const response = await apiService.delete(`/expenses/${expenseId}`);
      this.clearCache('expenses');
      this.clearCache('expense-summary');
      this.cache.delete(`expense-${expenseId}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete expense');
    }
  };

  approveExpense = async (expenseId) => {
    try {
      const response = await apiService.patch(`/expenses/${expenseId}/approve`);
      this.clearCache('expenses');
      this.clearCache('expense-summary');
      this.cache.delete(`expense-${expenseId}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to approve expense');
    }
  };

  rejectExpense = async (expenseId, reason) => {
    try {
      const response = await apiService.patch(`/expenses/${expenseId}/reject`, { reason });
      this.clearCache('expenses');
      this.clearCache('expense-summary');
      this.cache.delete(`expense-${expenseId}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to reject expense');
    }
  };

  // =====================
  // FILTERED EXPENSE QUERIES
  // =====================

  getExpensesByStation = async (stationId, filters = {}) => {
    return this.getExpenses({ ...filters, stationId });
  };

  getExpensesByShift = async (shiftId, filters = {}) => {
    const cacheKey = `expenses-shift-${shiftId}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const query = this.buildQuery(filters);
      const url = query ? `/expenses/shift/${shiftId}?${query}` : `/expenses/shift/${shiftId}`;
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch shift expenses');
    }
  };

  getExpensesByIsland = async (islandId, filters = {}) => {
    const cacheKey = `expenses-island-${islandId}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const query = this.buildQuery(filters);
      const url = query ? `/expenses/island/${islandId}?${query}` : `/expenses/island/${islandId}`;
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch island expenses');
    }
  };

  getExpensesByPaymentSource = async (paymentSource, filters = {}) => {
    const cacheKey = `expenses-payment-${paymentSource}-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const query = this.buildQuery(filters);
      const url = query ? `/expenses/payment-source/${paymentSource}?${query}` : `/expenses/payment-source/${paymentSource}`;
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch payment source expenses');
    }
  };

  // =====================
  // EXPENSE ANALYTICS & SUMMARY
  // =====================

  getExpenseSummary = async (filters = {}) => {
    const cacheKey = `expense-summary-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const query = this.buildQuery(filters);
      const url = query ? `/expenses/analytics/summary?${query}` : '/expenses/analytics/summary';
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch expense summary');
    }
  };

  // =====================
  // UTILITIES
  // =====================

  clearCache = (pattern) => {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  };

  formatCurrency = (amount, currency = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-KE', {
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

  validateExpense = (expenseData) => {
    const errors = [];
    
    if (!expenseData.title?.trim()) errors.push('Expense title is required');
    if (expenseData.title && expenseData.title.length < 2) errors.push('Title must be at least 2 characters');
    if (expenseData.title && expenseData.title.length > 200) errors.push('Title cannot exceed 200 characters');
    
    if (!expenseData.category) errors.push('Expense category is required');
    
    if (!expenseData.amount || expenseData.amount <= 0) errors.push('Amount must be greater than 0');
    if (expenseData.amount && expenseData.amount > 10000000) errors.push('Amount cannot exceed 10,000,000');
    
    if (!expenseData.paymentSource) errors.push('Payment source is required');
    
    if (expenseData.description && expenseData.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }

    if (!expenseData.stationId) {
      errors.push('Station ID is required');
    }

    return errors;
  };

  // =====================
  // FORMATTING UTILITIES
  // =====================

  formatExpense = (expense) => {
    if (!expense) return null;
    
    return {
      ...expense,
      amountDisplay: this.formatCurrency(expense.amount),
      expenseDateDisplay: this.formatDate(expense.expenseDate),
      createdAtDisplay: this.formatDateTime(expense.createdAt),
      updatedAtDisplay: this.formatDateTime(expense.updatedAt),
      approvedAtDisplay: expense.approvedAt ? this.formatDateTime(expense.approvedAt) : 'N/A',
      statusDisplay: this.getStatusDisplay(expense.status),
      statusColor: this.getStatusColor(expense.status),
      categoryDisplay: this.getCategoryDisplay(expense.category),
      paymentSourceDisplay: this.getPaymentSourceDisplay(expense.paymentSource),
      stationDisplay: expense.station?.name || 'Unknown Station',
      islandDisplay: expense.island ? `${expense.island.name} (${expense.island.code})` : 'N/A',
      shiftDisplay: expense.shift ? `Shift ${expense.shift.shiftNumber}` : 'N/A',
      recordedByDisplay: expense.recordedBy ? 
        `${expense.recordedBy.firstName} ${expense.recordedBy.lastName}` : 'Unknown User',
      approvedByDisplay: expense.approvedBy ? 
        `${expense.approvedBy.firstName} ${expense.approvedBy.lastName}` : 'N/A',
      expenseNumberDisplay: expense.expenseNumber || 'N/A',
      // Add formatted wallet transaction info
      walletTransactionDisplay: expense.walletTransaction ? 
        `${this.formatCurrency(expense.walletTransaction.amount)} - ${expense.walletTransaction.description}` : 'N/A'
    };
  };

  getStatusDisplay = (status) => {
    const statusMap = {
      DRAFT: 'Draft',
      PENDING_APPROVAL: 'Pending Approval',
      APPROVED: 'Approved',
      REJECTED: 'Rejected'
    };
    return statusMap[status] || status;
  };

  getStatusColor = (status) => {
    const colorMap = {
      DRAFT: 'default',
      PENDING_APPROVAL: 'orange',
      APPROVED: 'green',
      REJECTED: 'red'
    };
    return colorMap[status] || 'default';
  };

  getCategoryDisplay = (category) => {
    const categoryMap = {
      FUEL: 'Fuel',
      MAINTENANCE: 'Maintenance',
      UTILITIES: 'Utilities',
      SALARIES: 'Salaries',
      OFFICE_SUPPLIES: 'Office Supplies',
      TRANSPORT: 'Transport',
      MARKETING: 'Marketing',
      OTHER: 'Other'
    };
    return categoryMap[category] || category;
  };

  getPaymentSourceDisplay = (paymentSource) => {
    const sourceMap = {
      STATION_WALLET: 'Station Wallet',
      ISLAND_COLLECTION: 'Island Collection',
      CASH: 'Cash',
      BANK_TRANSFER: 'Bank Transfer'
    };
    return sourceMap[paymentSource] || paymentSource;
  };

  // =====================
  // FILTER UTILITIES
  // =====================

  getCategoryOptions = () => {
    return [
      { value: 'FUEL', label: 'Fuel' },
      { value: 'MAINTENANCE', label: 'Maintenance' },
      { value: 'UTILITIES', label: 'Utilities' },
      { value: 'SALARIES', label: 'Salaries' },
      { value: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
      { value: 'TRANSPORT', label: 'Transport' },
      { value: 'MARKETING', label: 'Marketing' },
      { value: 'OTHER', label: 'Other' }
    ];
  };

  getStatusOptions = () => {
    return [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'REJECTED', label: 'Rejected' }
    ];
  };

  getPaymentSourceOptions = () => {
    return [
      { value: 'STATION_WALLET', label: 'Station Wallet' },
      { value: 'ISLAND_COLLECTION', label: 'Island Collection' },
      { value: 'CASH', label: 'Cash' },
      { value: 'BANK_TRANSFER', label: 'Bank Transfer' }
    ];
  };

  // =====================
  // DEFAULT DATA
  // =====================

  getDefaultExpenseData = () => {
    return {
      title: '',
      description: '',
      category: '',
      amount: 0,
      paymentSource: 'STATION_WALLET',
      expenseDate: new Date().toISOString(),
      stationId: '',
      islandId: null,
      shiftId: null
    };
  };

  getDefaultFilters = () => {
    return {
      stationId: '',
      category: '',
      status: '',
      paymentSource: '',
      startDate: '',
      endDate: '',
      search: '',
      page: 1,
      limit: 10
    };
  };

  // =====================
  // USAGE EXAMPLES
  // =====================

  getPendingExpenses = async (stationId) => {
    return this.getExpensesByStation(stationId, { status: 'PENDING_APPROVAL' });
  };

  getApprovedExpenses = async (stationId) => {
    return this.getExpensesByStation(stationId, { status: 'APPROVED' });
  };

  getWalletExpenses = async (stationId) => {
    return this.getExpensesByStation(stationId, { paymentSource: 'STATION_WALLET' });
  };

  getRecentExpenses = async (stationId, days = 7) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return this.getExpensesByStation(stationId, { 
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString()
    });
  };

  // =====================
  // CACHE MANAGEMENT
  // =====================

  preloadExpenseData = async (expenseId) => {
    try {
      const expense = await this.getExpenseById(expenseId);
      return expense;
    } catch (error) {
      console.warn('Failed to preload expense data:', error.message);
      return null;
    }
  };

  invalidateExpenseCache = (expenseId) => {
    this.cache.delete(`expense-${expenseId}`);
    this.clearCache('expenses');
    this.clearCache('expense-summary');
  };

  // Auto-clean expired cache entries
  startCacheCleanup = () => {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.CACHE_TTL) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Check every minute
  };
}

// Initialize cache cleanup
const expenseService = new ExpenseService();
expenseService.startCacheCleanup();

export { expenseService };
export default expenseService;