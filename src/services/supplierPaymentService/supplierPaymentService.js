import { apiService } from '../apiService';

export const supplierPaymentService = {
  // =====================
  // HEALTH CHECK
  // =====================

  /**
   * Health check for supplier payment service
   */
  healthCheck: async () => {
    try {
      const response = await apiService.get('/supplier-payments/health');
      console.log("Supplier payment health check:", response);
      return response;
    } catch (error) {
      console.error('Supplier payment health check failed:', error);
      throw error;
    }
  },

  // =====================
  // SUPPLIER ACCOUNTS & INVOICES
  // =====================

  /**
   * Get supplier accounts with outstanding invoices
   */
  getSupplierAccounts: async (query = {}) => {
    try {
      const response = await apiService.get('/supplier-payments/accounts', { params: query });
      console.log("Supplier accounts with invoices:", response);
      return response;
    } catch (error) {
      console.error('Failed to fetch supplier accounts:', error);
      throw error;
    }
  },

  /**
   * Get complete payment journey for a supplier
   */
  getSupplierPaymentJourney: async (supplierAccountId) => {
    try {
      const response = await apiService.get(`/supplier-payments/accounts/${supplierAccountId}/journey`);
      console.log("Supplier payment journey:", response);
      return response;
    } catch (error) {
      console.error(`Failed to fetch payment journey for supplier ${supplierAccountId}:`, error);
      throw error;
    }
  },

  // =====================
  // PAYMENT PROCESSING
  // =====================

  /**
   * Process cash payment from station wallet
   */
  processCashPayment: async (paymentData) => {
    try {
      console.log("💵 SENDING CASH PAYMENT:", paymentData);
      const response = await apiService.post('/supplier-payments/payments/cash', paymentData);
      console.log("✅ Cash payment processed:", response);
      return response;
    } catch (error) {
      console.error('❌ Failed to process cash payment:', error);
      throw error;
    }
  },

  /**
   * Process bank transfer payment
   */
  processBankPayment: async (paymentData) => {
    try {
      console.log("🏦 SENDING BANK PAYMENT:", paymentData);
      const response = await apiService.post('/supplier-payments/payments/bank', paymentData);
      console.log("✅ Bank payment processed:", response);
      return response;
    } catch (error) {
      console.error('❌ Failed to process bank payment:', error);
      throw error;
    }
  },

  // =====================
  // VALIDATION ENDPOINTS
  // =====================

  /**
   * Validate payment allocations via API
   */
  validateAllocationsApi: async (allocations, totalPaymentAmount) => {
    try {
      const response = await apiService.post('/supplier-payments/allocations/validate', {
        allocations,
        totalPaymentAmount
      });
      console.log("Allocations validation:", response);
      return response;
    } catch (error) {
      console.error('Failed to validate allocations:', error);
      throw error;
    }
  },

  // =====================
  // TRANSACTIONS & ALLOCATIONS
  // =====================

  /**
   * Get supplier transactions with filters
   */
  getSupplierTransactions: async (query = {}) => {
    try {
      const response = await apiService.get('/supplier-payments/transactions', { params: query });
      console.log("Supplier transactions:", response);
      return response;
    } catch (error) {
      console.error('Failed to fetch supplier transactions:', error);
      throw error;
    }
  },

  /**
   * Get payment allocations
   */
  getPaymentAllocations: async (query = {}) => {
    try {
      const response = await apiService.get('/supplier-payments/allocations', { params: query });
      console.log("Payment allocations:", response);
      return response;
    } catch (error) {
      console.error('Failed to fetch payment allocations:', error);
      throw error;
    }
  },

  /**
   * Get account transfers (supplier payments)
   */
  getAccountTransfers: async (query = {}) => {
    try {
      const response = await apiService.get('/supplier-payments/transfers', { params: query });
      console.log("Account transfers:", response);
      return response;
    } catch (error) {
      console.error('Failed to fetch account transfers:', error);
      throw error;
    }
  },

  // =====================
  // UTILITY ENDPOINTS
  // =====================

  /**
   * Get available payment methods
   */
  getPaymentMethods: async () => {
    try {
      const response = await apiService.get('/supplier-payments/payment-methods');
      console.log("Payment methods:", response);
      return response;
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      throw error;
    }
  },

  /**
   * Get bank accounts for payments
   */
  getBankAccounts: async () => {
    try {
      const response = await apiService.get('/supplier-payments/bank-accounts');
      console.log("Bank accounts for payments:", response);
      return response;
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
      throw error;
    }
  },

  /**
   * Get station wallets for cash payments
   */
  getStationWallets: async (stationId = null) => {
    try {
      const params = stationId ? { stationId } : {};
      const response = await apiService.get('/supplier-payments/station-wallets', { params });
      console.log("Station wallets:", response);
      return response;
    } catch (error) {
      console.error('Failed to fetch station wallets:', error);
      throw error;
    }
  },

  // =====================
  // PAYMENT VALIDATION HELPERS
  // =====================

  /**
   * Validate payment allocations (client-side)
   */
  validateAllocations: (allocations, paymentAmount) => {
    const totalAllocated = allocations.reduce((sum, alloc) => sum + (parseFloat(alloc.amount) || 0), 0);
    
    if (totalAllocated > paymentAmount) {
      throw new Error(`Total allocation (${totalAllocated}) exceeds payment amount (${paymentAmount})`);
    }

    return {
      totalAllocated,
      creditBalance: paymentAmount - totalAllocated,
      isValid: true
    };
  },

  /**
   * Generate suggested allocations (oldest first)
   */
  generateSuggestedAllocations: (outstandingInvoices, paymentAmount) => {
    const suggestions = [];
    let remainingAmount = paymentAmount;

    // Sort by due date (oldest first)
    const sortedInvoices = [...outstandingInvoices].sort((a, b) => 
      new Date(a.dueDate || 0) - new Date(b.dueDate || 0)
    );

    for (const invoice of sortedInvoices) {
      if (remainingAmount <= 0) break;

      const amountToAllocate = Math.min(invoice.remainingBalance || 0, remainingAmount);
      suggestions.push({
        invoiceTransactionId: invoice.id,
        invoiceNumber: invoice.invoiceNumber || invoice.referenceNumber || `INV-${invoice.id?.slice(-6)}`,
        originalAmount: invoice.amount || 0,
        remainingBalance: invoice.remainingBalance || 0,
        suggestedAmount: amountToAllocate,
        dueDate: invoice.dueDate,
        isOverdue: invoice.isOverdue || (invoice.dueDate && new Date(invoice.dueDate) < new Date()),
        purchaseNumber: invoice.purchaseNumber || invoice.purchase?.purchaseNumber
      });

      remainingAmount -= amountToAllocate;
    }

    return {
      suggestions,
      totalSuggested: paymentAmount - remainingAmount,
      remainingPayment: remainingAmount
    };
  },

  /**
   * Calculate payment summary
   */
  calculatePaymentSummary: (paymentAmount, allocations) => {
    const totalAllocated = allocations.reduce((sum, alloc) => sum + (parseFloat(alloc.amount) || 0), 0);
    const creditBalance = paymentAmount - totalAllocated;
    
    return {
      totalAllocated,
      creditBalance,
      isOverpayment: creditBalance > 0,
      isValid: totalAllocated <= paymentAmount
    };
  }
};

// =====================
// PAYMENT DATA TRANSFORMERS
// =====================

export const paymentTransformers = {
  /**
   * Transform supplier account data for UI
   */
  transformSupplierAccount: (account) => {
    const outstandingInvoices = account.outstandingInvoices || [];
    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + (inv.remainingBalance || 0), 0);
    
    return {
      id: account.id,
      supplierName: account.supplier?.name || account.supplierName || 'Unknown Supplier',
      contactPerson: account.supplier?.contactPerson,
      phone: account.supplier?.phone,
      currentBalance: account.currentBalance || 0,
      creditLimit: account.creditLimit,
      availableCredit: account.availableCredit || (account.creditLimit ? account.creditLimit - (account.currentBalance || 0) : null),
      status: account.status,
      paymentTerms: account.paymentTerms,
      outstandingInvoices: outstandingInvoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber || invoice.referenceNumber || `INV-${invoice.id?.slice(-6) || 'N/A'}`,
        originalAmount: invoice.amount || 0,
        remainingBalance: invoice.remainingBalance || (invoice.amount || 0),
        dueDate: invoice.dueDate,
        isOverdue: invoice.isOverdue || (invoice.dueDate && new Date(invoice.dueDate) < new Date()),
        purchaseNumber: invoice.purchaseNumber || invoice.purchase?.purchaseNumber,
        description: invoice.description,
        status: invoice.status || 'OUTSTANDING'
      })),
      totalOutstanding
    };
  },

  /**
   * Transform payment response for UI
   */
  transformPaymentResponse: (response) => {
    if (!response.data) return response;
    
    return {
      ...response,
      data: {
        ...response.data,
        // Add formatted values for UI
        formattedPaymentAmount: paymentTransformers.formatCurrency(response.data.paymentAmount || 0),
        formattedAllocatedAmount: paymentTransformers.formatCurrency(response.data.allocatedAmount || 0),
        formattedCreditBalance: paymentTransformers.formatCurrency(response.data.creditBalance || 0),
        hasCredit: (response.data.creditBalance || 0) > 0,
        invoiceStatuses: response.data.invoiceStatuses || []
      }
    };
  },

  /**
   * Prepare payment data for API
   */
  preparePaymentData: (formData, allocations) => {
    const payload = {
      supplierAccountId: formData.supplierAccountId,
      paymentAmount: parseFloat(formData.paymentAmount) || 0,
      paymentMethod: formData.paymentMethod,
      applicationMethod: formData.applicationMethod || 'OLDEST_FIRST',
      allocations: allocations.map(alloc => ({
        invoiceTransactionId: alloc.invoiceTransactionId,
        amount: parseFloat(alloc.amount) || 0
      })),
      description: formData.description || '',
      paymentReference: formData.paymentReference || ''
    };

    // Add payment method specific fields
    if (formData.paymentMethod === 'CASH') {
      payload.stationId = formData.stationId;
      if (formData.shiftId) {
        payload.shiftId = formData.shiftId;
      }
    } else if (formData.paymentMethod === 'BANK_TRANSFER') {
      payload.bankAccountId = formData.bankAccountId;
    }

    return payload;
  },

  /**
   * Format currency for display
   */
  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  },

  /**
   * Format date for display
   */
  formatDate: (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Format date time for display
   */
  formatDateTime: (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// =====================
// PAYMENT STATUS UTILITIES
// =====================

export const paymentStatus = {
  /**
   * Get status color for UI
   */
  getStatusColor: (status) => {
    const colors = {
      'OUTSTANDING': 'orange',
      'PARTIALLY_PAID': 'blue', 
      'PAID': 'green',
      'OVERDUE': 'red',
      'ACTIVE': 'green',
      'ON_HOLD': 'yellow',
      'SUSPENDED': 'red',
      'COMPLETED': 'green',
      'PENDING': 'orange',
      'FAILED': 'red'
    };
    return colors[status] || 'default';
  },

  /**
   * Get transaction type display text
   */
  getTransactionTypeText: (type) => {
    const types = {
      'PURCHASE_INVOICE': 'Purchase Invoice',
      'PAYMENT_MADE': 'Payment Made',
      'CREDIT_NOTE': 'Credit Note',
      'DEBIT_NOTE': 'Debit Note',
      'ADJUSTMENT': 'Adjustment'
    };
    return types[type] || type;
  },

  /**
   * Check if invoice is overdue
   */
  isInvoiceOverdue: (invoice) => {
    if (!invoice.dueDate) return false;
    return new Date(invoice.dueDate) < new Date();
  },

  /**
   * Calculate days until due
   */
  getDaysUntilDue: (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
};