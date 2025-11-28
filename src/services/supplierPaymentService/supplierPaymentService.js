// services/supplierPaymentService.js
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
      const response = await apiService.post('/supplier-payments/payments/cash', paymentData);
      console.log("Cash payment processed:", response);
      return response;
    } catch (error) {
      console.error('Failed to process cash payment:', error);
      throw error;
    }
  },

  /**
   * Process bank transfer payment
   */
  processBankPayment: async (paymentData) => {
    try {
      const response = await apiService.post('/supplier-payments/payments/bank', paymentData);
      console.log("Bank payment processed:", response);
      return response;
    } catch (error) {
      console.error('Failed to process bank payment:', error);
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
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    
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
      new Date(a.dueDate) - new Date(b.dueDate)
    );

    for (const invoice of sortedInvoices) {
      if (remainingAmount <= 0) break;

      const amountToAllocate = Math.min(invoice.remainingBalance, remainingAmount);
      suggestions.push({
        invoiceTransactionId: invoice.id,
        invoiceNumber: invoice.referenceNumber || `INV-${invoice.id.slice(-6)}`,
        originalAmount: invoice.amount,
        remainingBalance: invoice.remainingBalance,
        suggestedAmount: amountToAllocate,
        dueDate: invoice.dueDate,
        isOverdue: invoice.dueDate && new Date(invoice.dueDate) < new Date(),
        purchaseNumber: invoice.purchase?.purchaseNumber
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
   * Generate suggested allocations (highest amount first)
   */
  generateSuggestedAllocationsHighestFirst: (outstandingInvoices, paymentAmount) => {
    const suggestions = [];
    let remainingAmount = paymentAmount;

    // Sort by amount (highest first)
    const sortedInvoices = [...outstandingInvoices].sort((a, b) => 
      b.remainingBalance - a.remainingBalance
    );

    for (const invoice of sortedInvoices) {
      if (remainingAmount <= 0) break;

      const amountToAllocate = Math.min(invoice.remainingBalance, remainingAmount);
      suggestions.push({
        invoiceTransactionId: invoice.id,
        invoiceNumber: invoice.referenceNumber || `INV-${invoice.id.slice(-6)}`,
        originalAmount: invoice.amount,
        remainingBalance: invoice.remainingBalance,
        suggestedAmount: amountToAllocate,
        dueDate: invoice.dueDate,
        isOverdue: invoice.dueDate && new Date(invoice.dueDate) < new Date(),
        purchaseNumber: invoice.purchase?.purchaseNumber
      });

      remainingAmount -= amountToAllocate;
    }

    return {
      suggestions,
      totalSuggested: paymentAmount - remainingAmount,
      remainingPayment: remainingAmount
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
  transformSupplierAccount: (account) => ({
    id: account.id,
    supplierName: account.supplier?.name || 'Unknown Supplier',
    contactPerson: account.supplier?.contactPerson,
    phone: account.supplier?.phone,
    currentBalance: account.currentBalance || 0,
    creditLimit: account.creditLimit,
    availableCredit: account.availableCredit,
    status: account.status,
    paymentTerms: account.paymentTerms,
    outstandingInvoices: account.outstandingInvoices?.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.referenceNumber || `INV-${invoice.id?.slice(-6) || 'N/A'}`,
      originalAmount: invoice.amount,
      remainingBalance: invoice.remainingBalance,
      dueDate: invoice.dueDate,
      isOverdue: invoice.dueDate && new Date(invoice.dueDate) < new Date(),
      purchaseNumber: invoice.purchase?.purchaseNumber,
      description: invoice.description,
      status: invoice.status
    })) || [],
    totalOutstanding: account.totalOutstanding || 0
  }),

  /**
   * Transform payment journey for UI
   */
  transformPaymentJourney: (journey) => ({
    supplier: journey.supplier,
    currentBalance: journey.currentBalance || 0,
    creditLimit: journey.creditLimit,
    transactions: journey.transactions?.map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter,
      description: transaction.description,
      transactionDate: transaction.transactionDate,
      status: transaction.status,
      purchase: transaction.purchase,
      purchaseReceiving: transaction.purchaseReceiving,
      source: transaction.accountTransfer ? {
        type: transaction.accountTransfer.fromAccountType,
        name: transaction.accountTransfer.fromAccountName,
        bankTransaction: transaction.accountTransfer.bankTransaction,
        walletTransaction: transaction.accountTransfer.walletTransactions?.[0]
      } : null,
      allocations: transaction.allocations || []
    })) || []
  }),

  /**
   * Transform transaction for UI display
   */
  transformTransaction: (transaction) => ({
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    balanceBefore: transaction.balanceBefore,
    balanceAfter: transaction.balanceAfter,
    description: transaction.description,
    transactionDate: transaction.transactionDate,
    status: transaction.status,
    supplierName: transaction.supplierAccount?.supplier?.name,
    purchaseNumber: transaction.purchase?.purchaseNumber,
    paymentMethod: transaction.paymentMethod,
    referenceNumber: transaction.referenceNumber
  }),

  /**
   * Transform allocation for UI display
   */
  transformAllocation: (allocation) => ({
    id: allocation.id,
    allocatedAmount: allocation.allocatedAmount,
    allocationDate: allocation.allocationDate,
    applicationMethod: allocation.applicationMethod,
    paymentTransaction: allocation.paymentTransaction ? {
      id: allocation.paymentTransaction.id,
      amount: allocation.paymentTransaction.amount,
      transactionDate: allocation.paymentTransaction.transactionDate,
      supplierName: allocation.paymentTransaction.supplierAccount?.supplier?.name
    } : null,
    invoiceTransaction: allocation.invoiceTransaction ? {
      id: allocation.invoiceTransaction.id,
      purchaseNumber: allocation.invoiceTransaction.purchase?.purchaseNumber,
      amount: allocation.invoiceTransaction.amount
    } : null,
    allocatedBy: allocation.allocatedBy ? {
      name: `${allocation.allocatedBy.firstName} ${allocation.allocatedBy.lastName}`
    } : null
  }),

  /**
   * Prepare payment data for API
   */
  preparePaymentData: (formData, allocations) => ({
    supplierAccountId: formData.supplierAccountId,
    paymentAmount: parseFloat(formData.paymentAmount),
    paymentMethod: formData.paymentMethod,
    applicationMethod: formData.applicationMethod || 'OLDEST_FIRST',
    allocations: allocations.map(alloc => ({
      invoiceTransactionId: alloc.invoiceTransactionId,
      amount: parseFloat(alloc.amount)
    })),
    description: formData.description,
    paymentReference: formData.paymentReference,
    ...(formData.paymentMethod === 'CASH' && {
      stationId: formData.stationId,
      shiftId: formData.shiftId
    }),
    ...(formData.paymentMethod === 'BANK_TRANSFER' && {
      bankAccountId: formData.bankAccountId
    })
  }),

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
      'SUSPENDED': 'red'
    };
    return colors[status] || 'default';
  },

  /**
   * Get transaction type display text
   */
  getTransactionTypeText: (type) => {
    const types = {
      'PURCHASE_INVOICE': 'Purchase Invoice',
      'PAYMENT_MADE': 'Payment',
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

// =====================
// USAGE EXAMPLES
// =====================

/*
// Example 1: Health check
await supplierPaymentService.healthCheck();

// Example 2: Get supplier accounts
const suppliers = await supplierPaymentService.getSupplierAccounts({
  page: 1,
  limit: 10,
  includePaidInvoices: false
});

// Example 3: Process cash payment
const cashPaymentResult = await supplierPaymentService.processCashPayment({
  supplierAccountId: '625d5961-5f6e-43c4-9b24-c1d4e765abf9',
  paymentAmount: 130000,
  paymentMethod: 'CASH',
  stationId: '14991d3e-f5d9-40c3-bc1a-c9288992f649',
  applicationMethod: 'MANUAL_ALLOCATION',
  allocations: [
    {
      invoiceTransactionId: '53fdfb1f-9cbd-40b5-a868-7f47e416eb69',
      amount: 50000
    }
  ],
  description: 'Partial payment for November fuel',
  paymentReference: 'CASH-001'
});

// Example 4: Validate allocations via API
const validation = await supplierPaymentService.validateAllocationsApi(
  allocations,
  paymentAmount
);

// Example 5: Get account transfers
const transfers = await supplierPaymentService.getAccountTransfers({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  transferCategory: 'SUPPLIER_PAYMENT'
});

// Example 6: Transform data for UI
const transformedAccount = paymentTransformers.transformSupplierAccount(rawAccount);
const formattedAmount = paymentTransformers.formatCurrency(139200);
const statusColor = paymentStatus.getStatusColor('OUTSTANDING');
*/