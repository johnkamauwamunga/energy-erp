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
      return response.data.data;
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
        params.append(key, value);
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
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query ? `/expenses?${query}` : '/expenses';
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch expenses');
    }
  };

  getExpenseById = async (expenseId) => {
    const cacheKey = `expense-${expenseId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/expenses/${expenseId}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch expense');
    }
  };

  updateExpense = async (expenseId, updateData) => {
    try {
      const response = await apiService.put(`/expenses/${expenseId}`, updateData);
      this.clearCache('expenses');
      this.clearCache('expense-summary');
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
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to reject expense');
    }
  };

  // =====================
  // EXPENSE ANALYTICS & SUMMARY
  // =====================

  getExpenseSummary = async (filters = {}) => {
    const cacheKey = `expense-summary-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query ? `/expenses/analytics/summary?${query}` : '/expenses/analytics/summary';
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch expense summary');
    }
  };

  getExpenseStats = async (period = 'monthly') => {
    const cacheKey = `expense-stats-${period}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/expenses/analytics/stats?period=${period}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch expense statistics');
    }
  };

  // =====================
  // BULK OPERATIONS
  // =====================

  bulkApproveExpenses = async (expenseIds) => {
    try {
      const response = await apiService.post('/expenses/bulk/approve', { expenseIds });
      this.clearCache('expenses');
      this.clearCache('expense-summary');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to bulk approve expenses');
    }
  };

  bulkDeleteExpenses = async (expenseIds) => {
    try {
      const response = await apiService.post('/expenses/bulk/delete', { expenseIds });
      this.clearCache('expenses');
      this.clearCache('expense-summary');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to bulk delete expenses');
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
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
      createdAtDisplay: this.formatDate(expense.createdAt),
      statusDisplay: this.getStatusDisplay(expense.status),
      statusColor: this.getStatusColor(expense.status),
      categoryDisplay: this.getCategoryDisplay(expense.category),
      paymentSourceDisplay: this.getPaymentSourceDisplay(expense.paymentSource),
      stationDisplay: expense.station?.name || 'Unknown Station',
      islandDisplay: expense.island ? `Island ${expense.island.code}` : 'N/A',
      shiftDisplay: expense.shift ? `Shift ${expense.shift.shiftNumber}` : 'N/A',
      recordedByDisplay: expense.recordedBy ? 
        `${expense.recordedBy.firstName} ${expense.recordedBy.lastName}` : 'Unknown User',
      approvedByDisplay: expense.approvedBy ? 
        `${expense.approvedBy.firstName} ${expense.approvedBy.lastName}` : 'N/A'
    };
  };

  getStatusDisplay = (status) => {
    const statusMap = {
      DRAFT: 'Draft',
      PENDING_APPROVAL: 'Pending Approval',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      PAID: 'Paid',
      CANCELLED: 'Cancelled'
    };
    return statusMap[status] || status;
  };

  getStatusColor = (status) => {
    const colorMap = {
      DRAFT: 'default',
      PENDING_APPROVAL: 'warning',
      APPROVED: 'success',
      REJECTED: 'error',
      PAID: 'success',
      CANCELLED: 'error'
    };
    return colorMap[status] || 'default';
  };

  getCategoryDisplay = (category) => {
    const categoryMap = {
      CLEANING_SUPPLIES: 'Cleaning Supplies',
      MAINTENANCE: 'Maintenance',
      UTILITIES: 'Utilities',
      OFFICE_SUPPLIES: 'Office Supplies',
      SECURITY_SERVICES: 'Security Services',
      FUEL_EQUIPMENT: 'Fuel Equipment',
      STAFF_WELFARE: 'Staff Welfare',
      MARKETING: 'Marketing',
      INSURANCE: 'Insurance',
      LICENSES_PERMITS: 'Licenses & Permits',
      OTHER: 'Other'
    };
    return categoryMap[category] || category;
  };

  getPaymentSourceDisplay = (paymentSource) => {
    const sourceMap = {
      STATION_WALLET: 'Station Wallet',
      PETTY_CASH: 'Petty Cash',
      ISLAND_COLLECTION: 'Island Collection',
      BANK_ACCOUNT: 'Bank Account',
      MIXED: 'Mixed Sources'
    };
    return sourceMap[paymentSource] || paymentSource;
  };

  // =====================
  // FILTER UTILITIES
  // =====================

  getCategoryOptions = () => {
    return [
      { value: 'CLEANING_SUPPLIES', label: 'Cleaning Supplies' },
      { value: 'MAINTENANCE', label: 'Maintenance' },
      { value: 'UTILITIES', label: 'Utilities' },
      { value: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
      { value: 'SECURITY_SERVICES', label: 'Security Services' },
      { value: 'FUEL_EQUIPMENT', label: 'Fuel Equipment' },
      { value: 'STAFF_WELFARE', label: 'Staff Welfare' },
      { value: 'MARKETING', label: 'Marketing' },
      { value: 'INSURANCE', label: 'Insurance' },
      { value: 'LICENSES_PERMITS', label: 'Licenses & Permits' },
      { value: 'OTHER', label: 'Other' }
    ];
  };

  getStatusOptions = () => {
    return [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'REJECTED', label: 'Rejected' },
      { value: 'PAID', label: 'Paid' },
      { value: 'CANCELLED', label: 'Cancelled' }
    ];
  };

  getPaymentSourceOptions = () => {
    return [
      { value: 'STATION_WALLET', label: 'Station Wallet' },
      { value: 'PETTY_CASH', label: 'Petty Cash' },
      { value: 'ISLAND_COLLECTION', label: 'Island Collection' },
      { value: 'BANK_ACCOUNT', label: 'Bank Account' },
      { value: 'MIXED', label: 'Mixed Sources' }
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
      islandId: '',
      shiftId: ''
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
      page: 1,
      limit: 20
    };
  };

  // =====================
  // EXPORT UTILITIES
  // =====================

  exportExpenses = async (filters = {}, format = 'csv') => {
    try {
      const query = this.buildQuery({ ...filters, format });
      const response = await apiService.get(`/expenses/export?${query}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      throw this.handleError(error, 'Failed to export expenses');
    }
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
}

export const expenseService = new ExpenseService();
export default expenseService;