// src/services/paymentService.js
import { apiService } from '../apiService';

export const paymentService = {
  // =====================
  // HEALTH CHECK
  // =====================

  /**
   * Health check for payment module
   */
  healthCheck: async () => {
    try {
      const response = await apiService.get('/payments/health');
      return response.data;
    } catch (error) {
      console.error('Payment health check failed:', error);
      throw error;
    }
  },

  // =====================
  // PAYMENT PROCESSING
  // =====================

  /**
   * Process a new payment with automatic deductions
   * @param {Object} paymentData - Payment data including staffAccountId, amount, etc.
   * @returns {Object} Processed payment result with deductions
   */
  processPayment: async (paymentData) => {
    try {
      const response = await apiService.post('/payments', paymentData);
      return response.data;
    } catch (error) {
      console.error('Payment processing failed:', error);
      throw error;
    }
  },

  /**
   * Preview payment with deductions before processing
   * @param {Object} previewData - Data for payment preview
   * @returns {Object} Payment preview with deduction calculations
   */
  previewPayment: async (previewData) => {
    try {
      const response = await apiService.post('/payments/preview', previewData);
      return response.data;
    } catch (error) {
      console.error('Payment preview failed:', error);
      throw error;
    }
  },

  // =====================
  // PAYMENT QUERIES
  // =====================

  /**
   * Get a single payment by ID
   * @param {string} paymentId - Payment ID
   * @returns {Object} Payment details
   */
  getPayment: async (paymentId) => {
    try {
      const response = await apiService.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch payment ${paymentId}:`, error);
      throw error;
    }
  },

  /**
   * Get all payments for a specific staff account
   * @param {string} staffAccountId - Staff account ID
   * @param {Object} filters - Query filters (pagination, date range, etc.)
   * @returns {Object} Payments list with pagination
   */
  getPaymentsByStaffAccount: async (staffAccountId, filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
          } else if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await apiService.get(
        `/staff-accounts/${staffAccountId}/payments?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch payments for staff account ${staffAccountId}:`, error);
      throw error;
    }
  },

  /**
   * Get all payments with filters
   * @param {Object} filters - Query filters
   * @returns {Object} Payments list with pagination
   */
  getAllPayments: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
          } else if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await apiService.get(`/payments?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch all payments:', error);
      throw error;
    }
  },

  // =====================
  // PAYMENT UPDATES
  // =====================

  /**
   * Update an existing payment
   * @param {string} paymentId - Payment ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated payment
   */
  updatePayment: async (paymentId, updateData) => {
    try {
      const response = await apiService.put(`/payments/${paymentId}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Failed to update payment ${paymentId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a payment
   * @param {string} paymentId - Payment ID
   * @returns {Object} Deletion confirmation
   */
  deletePayment: async (paymentId) => {
    try {
      const response = await apiService.delete(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to delete payment ${paymentId}:`, error);
      throw error;
    }
  },

  // =====================
  // DEDUCTION QUERIES
  // =====================

  /**
   * Get a single deduction by ID
   * @param {string} deductionId - Deduction ID
   * @returns {Object} Deduction details
   */
  getDeduction: async (deductionId) => {
    try {
      const response = await apiService.get(`/deductions/${deductionId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch deduction ${deductionId}:`, error);
      throw error;
    }
  },

  /**
   * Get all deductions for a specific staff account
   * @param {string} staffAccountId - Staff account ID
   * @param {Object} filters - Query filters
   * @returns {Object} Deductions list with pagination
   */
  getDeductionsByStaffAccount: async (staffAccountId, filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
          } else if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await apiService.get(
        `/staff-accounts/${staffAccountId}/deductions?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch deductions for staff account ${staffAccountId}:`, error);
      throw error;
    }
  },

  /**
   * Get all deductions with filters
   * @param {Object} filters - Query filters
   * @returns {Object} Deductions list with pagination
   */
  getAllDeductions: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
          } else if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await apiService.get(`/deductions?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch all deductions:', error);
      throw error;
    }
  },

  // =====================
  // PAYMENT STATISTICS & REPORTS
  // =====================

  /**
   * Get payment statistics for a period
   * @param {Object} params - Statistics parameters (date range, station, etc.)
   * @returns {Object} Payment statistics
   */
  getPaymentStatistics: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (value instanceof Date) {
            queryParams.append(key, value.toISOString());
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });

      // This endpoint would need to be created in backend
      const response = await apiService.get(`/payments/statistics?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch payment statistics:', error);
      throw error;
    }
  },

  /**
   * Get payment summary for a staff member
   * @param {string} staffAccountId - Staff account ID
   * @param {Object} params - Summary parameters
   * @returns {Object} Payment summary
   */
  getStaffPaymentSummary: async (staffAccountId, params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (value instanceof Date) {
            queryParams.append(key, value.toISOString());
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });

      // This endpoint would need to be created in backend
      const response = await apiService.get(
        `/staff-accounts/${staffAccountId}/payment-summary?${queryParams.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch payment summary for staff ${staffAccountId}:`, error);
      throw error;
    }
  },

  // =====================
  // BULK PAYMENT OPERATIONS
  // =====================

  /**
   * Process multiple payments in batch
   * @param {Array} payments - Array of payment objects
   * @returns {Object} Batch processing result
   */
  processBatchPayments: async (payments) => {
    try {
      // This endpoint would need to be created in backend
      const response = await apiService.post('/payments/batch', { payments });
      return response.data;
    } catch (error) {
      console.error('Batch payment processing failed:', error);
      throw error;
    }
  },

  /**
   * Preview batch payments
   * @param {Array} payments - Array of payment preview objects
   * @returns {Object} Batch preview result
   */
  previewBatchPayments: async (payments) => {
    try {
      // This endpoint would need to be created in backend
      const response = await apiService.post('/payments/batch-preview', { payments });
      return response.data;
    } catch (error) {
      console.error('Batch payment preview failed:', error);
      throw error;
    }
  },

  // =====================
  // PAYMENT TEMPLATES
  // =====================

  /**
   * Save a payment as a template
   * @param {Object} templateData - Template data
   * @returns {Object} Created template
   */
  savePaymentTemplate: async (templateData) => {
    try {
      // This endpoint would need to be created in backend
      const response = await apiService.post('/payments/templates', templateData);
      return response.data;
    } catch (error) {
      console.error('Failed to save payment template:', error);
      throw error;
    }
  },

  /**
   * Get saved payment templates
   * @param {Object} filters - Template filters
   * @returns {Object} Payment templates
   */
  getPaymentTemplates: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      // This endpoint would need to be created in backend
      const response = await apiService.get(`/payments/templates?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch payment templates:', error);
      throw error;
    }
  },

  // =====================
  // EXPORT & DOWNLOAD
  // =====================

  /**
   * Export payments to CSV
   * @param {Object} filters - Export filters
   * @returns {Blob} CSV file blob
   */
  exportPaymentsToCSV: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });

      // This endpoint would need to be created in backend
      const response = await apiService.get(`/payments/export/csv?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to export payments to CSV:', error);
      throw error;
    }
  },

  /**
   * Export payments to PDF
   * @param {Object} filters - Export filters
   * @returns {Blob} PDF file blob
   */
  exportPaymentsToPDF: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });

      // This endpoint would need to be created in backend
      const response = await apiService.get(`/payments/export/pdf?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to export payments to PDF:', error);
      throw error;
    }
  },

  // =====================
  // VALIDATION & UTILITIES
  // =====================

  /**
   * Validate payment amount before processing
   * @param {Object} validationData - Data to validate
   * @returns {Object} Validation result
   */
  validatePayment: async (validationData) => {
    try {
      // This endpoint would need to be created in backend
      const response = await apiService.post('/payments/validate', validationData);
      return response.data;
    } catch (error) {
      console.error('Payment validation failed:', error);
      throw error;
    }
  },

  /**
   * Get available payment methods
   * @returns {Array} List of payment methods
   */
  getPaymentMethods: async () => {
    try {
      // This endpoint would need to be created in backend
      const response = await apiService.get('/payments/methods');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      throw error;
    }
  },

  /**
   * Get payment statuses
   * @returns {Array} List of payment statuses
   */
  getPaymentStatuses: async () => {
    try {
      // This endpoint would need to be created in backend
      const response = await apiService.get('/payments/statuses');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch payment statuses:', error);
      throw error;
    }
  },

  // =====================
  // REAL-TIME UPDATES (WebSocket)
  // =====================

  /**
   * Subscribe to payment updates
   * @param {Function} callback - Callback function for updates
   * @returns {Object} Subscription object
   */
  subscribeToPaymentUpdates: (callback) => {
    // This would be implemented with WebSocket or Server-Sent Events
    // For now, we'll simulate with polling or leave empty
    console.log('Payment update subscription started');
    
    // Return subscription object with unsubscribe method
    return {
      unsubscribe: () => {
        console.log('Payment update subscription stopped');
      }
    };
  },

  /**
   * Get real-time payment status
   * @param {string} paymentId - Payment ID
   * @returns {Object} Real-time payment status
   */
  getRealTimePaymentStatus: async (paymentId) => {
    try {
      // This would be a WebSocket endpoint or long-polling endpoint
      const response = await apiService.get(`/payments/${paymentId}/realtime-status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get real-time payment status:', error);
      throw error;
    }
  },

  // =====================
  // ERROR HANDLING UTILITIES
  // =====================

  /**
   * Parse payment error for user-friendly display
   * @param {Error} error - Error object
   * @returns {Object} Parsed error with user-friendly message
   */
  parsePaymentError: (error) => {
    const defaultError = {
      message: 'An unexpected error occurred while processing the payment.',
      code: 'UNKNOWN_ERROR',
      details: null
    };

    if (!error) return defaultError;

    // Check for network errors
    if (error.message?.includes('Network Error')) {
      return {
        message: 'Network connection error. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        details: error.message
      };
    }

    // Check for timeout errors
    if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
      return {
        message: 'Request timeout. Please try again.',
        code: 'TIMEOUT_ERROR',
        details: error.message
      };
    }

    // Check for server errors
    if (error.response?.status >= 500) {
      return {
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        details: error.response.data?.message || error.message
      };
    }

    // Check for validation errors
    if (error.response?.status === 400) {
      const errors = error.response.data?.errors || error.response.data?.message;
      return {
        message: 'Validation error. Please check your input.',
        code: 'VALIDATION_ERROR',
        details: errors,
        validationErrors: error.response.data?.errors
      };
    }

    // Check for authorization errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      return {
        message: 'You are not authorized to perform this action.',
        code: 'AUTH_ERROR',
        details: error.response.data?.message
      };
    }

    // Check for not found errors
    if (error.response?.status === 404) {
      return {
        message: 'The requested resource was not found.',
        code: 'NOT_FOUND',
        details: error.response.data?.message
      };
    }

    // Check for duplicate payment errors
    if (error.response?.data?.message?.includes('Duplicate') || 
        error.response?.data?.errorCode === 'DUPLICATE_PAYMENT') {
      return {
        message: 'This payment has already been processed.',
        code: 'DUPLICATE_PAYMENT',
        details: error.response.data?.message
      };
    }

    // Check for insufficient funds errors
    if (error.response?.data?.message?.includes('insufficient') || 
        error.response?.data?.errorCode === 'INSUFFICIENT_FUNDS') {
      return {
        message: 'Insufficient funds to process this payment.',
        code: 'INSUFFICIENT_FUNDS',
        details: error.response.data?.message
      };
    }

    // Return server-provided error if available
    if (error.response?.data) {
      return {
        message: error.response.data.message || defaultError.message,
        code: error.response.data.errorCode || 'API_ERROR',
        details: error.response.data.details
      };
    }

    // Return generic error
    return {
      message: error.message || defaultError.message,
      code: error.code || 'UNKNOWN_ERROR',
      details: error.stack
    };
  },

  // =====================
  // PAYMENT FORM UTILITIES
  // =====================

  /**
   * Format payment data for submission
   * @param {Object} formData - Raw form data
   * @returns {Object} Formatted payment data
   */
  formatPaymentData: (formData) => {
    const formattedData = {
      staffAccountId: formData.staffAccountId,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      paymentType: formData.paymentType || 'SALARY',
      description: formData.description || `Payment to staff`,
      autoDeductShortages: formData.autoDeductShortages !== false,
      deductionPriority: formData.deductionPriority || 'OLDEST_FIRST',
      autoDeductAdvances: formData.autoDeductAdvances !== false,
      advanceDeductionPriority: formData.advanceDeductionPriority || 'OLDEST_FIRST',
      paymentDate: formData.paymentDate ? new Date(formData.paymentDate) : new Date(),
      notes: formData.notes || null,
      shiftId: formData.shiftId || null,
      islandId: formData.islandId || null
    };

    // Add specific deduction IDs if provided
    if (formData.specificShortageIds && formData.specificShortageIds.length > 0) {
      formattedData.specificShortageIds = formData.specificShortageIds;
    }

    if (formData.specificAdvanceIds && formData.specificAdvanceIds.length > 0) {
      formattedData.specificAdvanceIds = formData.specificAdvanceIds;
    }

    // Add metadata if needed
    if (formData.metadata) {
      formattedData.metadata = {
        ...formData.metadata,
        formVersion: '1.0',
        submittedAt: new Date().toISOString()
      };
    }

    return formattedData;
  },

  /**
   * Format payment preview data
   * @param {Object} formData - Raw form data
   * @returns {Object} Formatted preview data
   */
  formatPreviewData: (formData) => {
    return {
      staffAccountId: formData.staffAccountId,
      amount: parseFloat(formData.amount),
      autoDeductShortages: formData.autoDeductShortages !== false,
      deductionPriority: formData.deductionPriority || 'OLDEST_FIRST',
      autoDeductAdvances: formData.autoDeductAdvances !== false,
      specificShortageIds: formData.specificShortageIds || [],
      specificAdvanceIds: formData.specificAdvanceIds || []
    };
  },

  /**
   * Calculate payment summary from preview data
   * @param {Object} previewData - Preview data from API
   * @returns {Object} Payment summary for display
   */
  calculatePaymentSummary: (previewData) => {
    if (!previewData || !previewData.deductionCalculation) {
      return null;
    }

    const calc = previewData.deductionCalculation;
    
    return {
      grossAmount: calc.grossAmount,
      totalDeductions: calc.totalDeductions,
      shortageDeductions: calc.totalShortageDeduction,
      advanceDeductions: calc.totalAdvanceDeduction,
      netAmount: calc.netAmount,
      shortagesCleared: calc.proposedShortageDeductions.filter(d => d.willBeCleared).length,
      advancesCleared: calc.proposedAdvanceDeductions.filter(d => d.willBeCleared).length,
      remainingShortages: previewData.availableShortages.length - 
                        calc.proposedShortageDeductions.filter(d => d.willBeCleared).length,
      remainingAdvances: previewData.availableAdvances.length - 
                        calc.proposedAdvanceDeductions.filter(d => d.willBeCleared).length
    };
  },

  // =====================
  // CONSTANTS & ENUMS
  // =====================

  PAYMENT_TYPES: {
    SALARY: 'SALARY',
    BONUS: 'BONUS',
    ADVANCE: 'ADVANCE',
    REIMBURSEMENT: 'REIMBURSEMENT',
    SETTLEMENT: 'SETTLEMENT',
    OTHER: 'OTHER'
  },

  DEDUCTION_PRIORITY: {
    OLDEST_FIRST: 'OLDEST_FIRST',
    HIGHEST_FIRST: 'HIGHEST_FIRST',
    OVERDUE_FIRST: 'OVERDUE_FIRST',
    SPECIFIC: 'SPECIFIC'
  },

  PAYMENT_STATUSES: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    SETTLED: 'SETTLED',
    VOIDED: 'VOIDED'
  },

  PAYMENT_METHODS: {
    CASH: 'CASH',
    BANK_TRANSFER: 'BANK_TRANSFER',
    MOBILE_MONEY: 'MOBILE_MONEY',
    CHEQUE: 'CHEQUE',
    WALLET: 'WALLET',
    OTHER: 'OTHER'
  },

  // =====================
  // TYPE DEFINITIONS (for TypeScript/IDE support)
  // =====================

  /**
   * Type definitions for better IDE support
   * These are JSDoc comments that provide type hints
   */

  /**
   * @typedef {Object} Payment
   * @property {string} id - Payment ID
   * @property {string} staffAccountId - Staff account ID
   * @property {number} amount - Gross payment amount
   * @property {number} netAmountPaid - Net amount paid after deductions
   * @property {number} shortageDeducted - Total shortage deductions
   * @property {number} advanceDeducted - Total advance deductions
   * @property {string} paymentMethod - Payment method
   * @property {string} paymentReference - Payment reference number
   * @property {string} paymentType - Type of payment
   * @property {string} description - Payment description
   * @property {string} status - Payment status
   * @property {Date} transactionDate - Transaction date
   * @property {Date} createdAt - Creation timestamp
   */

  /**
   * @typedef {Object} PaymentPreview
   * @property {Object} staffAccount - Staff account details
   * @property {Array} availableShortages - List of available shortages
   * @property {Object} deductionCalculation - Deduction calculations
   * @property {Array} warnings - Warnings for payment
   */

  /**
   * @typedef {Object} PaymentFilters
   * @property {string} [staffAccountId] - Filter by staff account
   * @property {string} [staffId] - Filter by staff user ID
   * @property {string} [stationId] - Filter by station
   * @property {string} [paymentMethod] - Filter by payment method
   * @property {string|Array} [paymentType] - Filter by payment type
   * @property {number} [minAmount] - Minimum amount
   * @property {number} [maxAmount] - Maximum amount
   * @property {Date|string} [startDate] - Start date filter
   * @property {Date|string} [endDate] - End date filter
   * @property {boolean} [hasShortageDeductions] - Has shortage deductions
   * @property {number} [page] - Page number
   * @property {number} [limit] - Items per page
   * @property {string} [sortBy] - Sort field
   * @property {string} [sortOrder] - Sort order (asc/desc)
   */

  /**
   * @typedef {Object} PaginatedResponse
   * @property {Array} data - Array of items
   * @property {Object} pagination - Pagination metadata
   * @property {number} pagination.page - Current page
   * @property {number} pagination.limit - Items per page
   * @property {number} pagination.total - Total items
   * @property {number} pagination.pages - Total pages
   * @property {boolean} pagination.hasNextPage - Has next page
   * @property {boolean} pagination.hasPrevPage - Has previous page
   */

  /**
   * @typedef {Object} ServiceResponse
   * @property {boolean} success - Success flag
   * @property {any} data - Response data
   * @property {string} [message] - Response message
   * @property {string} [errorCode] - Error code if failed
   * @property {any} [details] - Additional details
   */
};

export default paymentService;