// src/services/staff/staffAccountService.js
import { apiService } from '../apiService';

const STAFF_PAYMENTS_BASE_URL = '/staff-payments';

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

// Helper functions for formatting
const getPaymentScheduleLabel = (schedule) => {
  const labels = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    BI_WEEKLY: 'Bi-Weekly',
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    CUSTOM: 'Custom'
  };
  return labels[schedule] || schedule || 'Not Set';
};

const getPayrollMethodLabel = (method) => {
  const labels = {
    STATION_WALLET: 'Station Wallet',
    BANK_TRANSFER: 'Bank Transfer',
    MOBILE_MONEY: 'Mobile Money',
    CASH: 'Cash',
    MIXED: 'Mixed'
  };
  return labels[method] || method || 'Not Set';
};

const getTransactionTypeLabel = (type) => {
  const labels = {
    SHORTAGE: 'Shortage',
    ADVANCE: 'Advance',
    FINE: 'Fine',
    EXPENSE_CLAIM: 'Expense Claim',
    SALARY_PAYMENT: 'Salary Payment',
    BONUS: 'Bonus',
    COMMISSION: 'Commission',
    ALLOWANCE: 'Allowance',
    REIMBURSEMENT: 'Reimbursement',
    SETTLEMENT: 'Settlement',
    SHORTAGE_RECOVERY: 'Shortage Recovery',
    ADVANCE_DEDUCTION: 'Advance Deduction',
    ADJUSTMENT: 'Adjustment',
    WRITE_OFF: 'Write Off',
    TRANSFER: 'Transfer'
  };
  return labels[type] || type || 'Unknown';
};

const getTransactionTypeColor = (type) => {
  const colors = {
    SHORTAGE: 'error',
    ADVANCE: 'warning',
    FINE: 'error',
    EXPENSE_CLAIM: 'info',
    SALARY_PAYMENT: 'success',
    BONUS: 'success',
    COMMISSION: 'success',
    ALLOWANCE: 'info',
    REIMBURSEMENT: 'info',
    SETTLEMENT: 'success',
    SHORTAGE_RECOVERY: 'success',
    ADVANCE_DEDUCTION: 'warning',
    ADJUSTMENT: 'warning',
    WRITE_OFF: 'error',
    TRANSFER: 'info'
  };
  return colors[type] || 'default';
};

const getTransactionTypeBadge = (type) => {
  const badges = {
    SHORTAGE: 'danger',
    ADVANCE: 'warning',
    FINE: 'danger',
    EXPENSE_CLAIM: 'info',
    SALARY_PAYMENT: 'success',
    BONUS: 'success',
    COMMISSION: 'success',
    ALLOWANCE: 'info',
    REIMBURSEMENT: 'info',
    SETTLEMENT: 'success',
    SHORTAGE_RECOVERY: 'success',
    ADVANCE_DEDUCTION: 'warning',
    ADJUSTMENT: 'warning',
    WRITE_OFF: 'danger',
    TRANSFER: 'info'
  };
  return badges[type] || 'default';
};

const getPaymentSourceLabel = (source) => {
  const labels = {
    STATION_WALLET: 'Station Wallet',
    BANK_ACCOUNT: 'Bank Account',
    PETTY_CASH: 'Petty Cash',
    ISLAND_COLLECTION: 'Island Collection',
    DIRECT_CASH: 'Direct Cash'
  };
  return labels[source] || source || 'Not Specified';
};

const getTransactionStatusLabel = (status) => {
  const labels = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    SETTLED: 'Settled'
  };
  return labels[status] || status || 'Unknown';
};

const getTransactionStatusColor = (status) => {
  const colors = {
    PENDING: 'warning',
    APPROVED: 'info',
    REJECTED: 'error',
    SETTLED: 'success'
  };
  return colors[status] || 'default';
};

const getTransactionStatusBadge = (status) => {
  const badges = {
    PENDING: 'warning',
    APPROVED: 'info',
    REJECTED: 'danger',
    SETTLED: 'success'
  };
  return badges[status] || 'default';
};

const getSalaryPaymentStatusLabel = (status) => {
  const labels = {
    PENDING: 'Pending',
    CALCULATED: 'Calculated',
    APPROVED: 'Approved',
    PAID: 'Paid',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled'
  };
  return labels[status] || status || 'Unknown';
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
  const validPayrollMethods = ['STATION_WALLET', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CASH', 'MIXED'];
  if (accountData.payrollMethod && !validPayrollMethods.includes(accountData.payrollMethod)) {
    errors.push('Invalid payroll method');
  }

  // Validate payment schedule
  const validSchedules = ['DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM'];
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

const validateStaffTransaction = (transactionData) => {
  const errors = [];

  if (!transactionData.staffAccountId) {
    errors.push('Staff account is required');
  }

  if (!transactionData.type) {
    errors.push('Transaction type is required');
  }

  if (!transactionData.amount || transactionData.amount <= 0) {
    errors.push('Valid amount is required');
  }

  if (!transactionData.description || transactionData.description.trim() === '') {
    errors.push('Description is required');
  }

  // Validate transaction type
  const validTransactionTypes = [
    'SHORTAGE', 'ADVANCE', 'FINE', 'EXPENSE_CLAIM',
    'SALARY_PAYMENT', 'BONUS', 'COMMISSION', 'ALLOWANCE', 'REIMBURSEMENT',
    'SETTLEMENT', 'SHORTAGE_RECOVERY', 'ADVANCE_DEDUCTION',
    'ADJUSTMENT', 'WRITE_OFF', 'TRANSFER'
  ];

  if (!validTransactionTypes.includes(transactionData.type)) {
    errors.push('Invalid transaction type');
  }

  // Validate payment source
  const validPaymentSources = ['STATION_WALLET', 'BANK_ACCOUNT', 'PETTY_CASH', 'ISLAND_COLLECTION', 'DIRECT_CASH'];
  if (transactionData.paymentSource && !validPaymentSources.includes(transactionData.paymentSource)) {
    errors.push('Invalid payment source');
  }

  // Validate payment method for certain transaction types
  if (['SALARY_PAYMENT', 'BONUS', 'COMMISSION', 'ALLOWANCE'].includes(transactionData.type)) {
    const validPayrollMethods = ['STATION_WALLET', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CASH', 'MIXED'];
    if (!transactionData.paymentMethod || !validPayrollMethods.includes(transactionData.paymentMethod)) {
      errors.push('Valid payment method is required for this transaction type');
    }
  }

  return errors;
};

const validateShortage = (shortageData) => {
  const errors = [];

  if (!shortageData.staffAccountId) {
    errors.push('Staff account is required');
  }

  if (!shortageData.amount || shortageData.amount <= 0) {
    errors.push('Valid amount is required');
  }

  if (!shortageData.description || shortageData.description.trim() === '') {
    errors.push('Description is required');
  }

  return errors;
};

const validateSalaryPayment = (salaryPaymentData) => {
  const errors = [];

  if (!salaryPaymentData.staffAccountId) {
    errors.push('Staff account is required');
  }

  if (!salaryPaymentData.stationId) {
    errors.push('Station is required');
  }

  if (!salaryPaymentData.periodStart) {
    errors.push('Period start date is required');
  }

  if (!salaryPaymentData.periodEnd) {
    errors.push('Period end date is required');
  }

  if (salaryPaymentData.periodStart && salaryPaymentData.periodEnd) {
    const start = new Date(salaryPaymentData.periodStart);
    const end = new Date(salaryPaymentData.periodEnd);
    if (end <= start) {
      errors.push('Period end must be after period start');
    }
  }

  if (!salaryPaymentData.paymentDate) {
    errors.push('Payment date is required');
  }

  if (!salaryPaymentData.grossSalary || salaryPaymentData.grossSalary <= 0) {
    errors.push('Valid gross salary is required');
  }

  if (!salaryPaymentData.paymentMethod) {
    errors.push('Payment method is required');
  }

  if (!salaryPaymentData.paymentSource) {
    errors.push('Payment source is required');
  }

  return errors;
};

const validatePayrollGeneration = (payrollData) => {
  const errors = [];

  if (!payrollData.stationId) {
    errors.push('Station is required');
  }

  if (!payrollData.periodStart) {
    errors.push('Period start date is required');
  }

  if (!payrollData.periodEnd) {
    errors.push('Period end date is required');
  }

  if (!payrollData.paymentDate) {
    errors.push('Payment date is required');
  }

  if (!payrollData.paymentMethod) {
    errors.push('Payment method is required');
  }

  if (!payrollData.paymentSource) {
    errors.push('Payment source is required');
  }

  if (payrollData.periodStart && payrollData.periodEnd) {
    const start = new Date(payrollData.periodStart);
    const end = new Date(payrollData.periodEnd);
    if (end <= start) {
      errors.push('Period end must be after period start');
    }
  }

  return errors;
};

const formatStaffAccount = (account) => {
  if (!account) return null;
  
  return {
    ...account,
    // User information
    userDisplayName: account.user ? `${account.user.firstName} ${account.user.lastName}` : 'Unknown User',
    userEmail: account.user?.email || 'N/A',
    userPhone: account.user?.phone || 'N/A',
    
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
    createdAtDisplay: formatDate(account.createdAt),
    lastPaymentDateDisplay: account.lastPaymentDate ? formatDate(account.lastPaymentDate) : 'Never',
    lastShortageDateDisplay: account.lastShortageDate ? formatDate(account.lastShortageDate) : 'Never',
    nextPaymentDateDisplay: account.nextPaymentDate ? formatDate(account.nextPaymentDate) : 'Not Set',
    
    // Quick status checks
    hasShortages: account.currentBalance < 0,
    hasAdvances: account.totalAdvances > 0,
    hasBonuses: account.totalBonuses > 0,
    isDueForPayment: account.nextPaymentDate ? new Date(account.nextPaymentDate) <= new Date() : false,
    
    // Display properties
    displayId: account.id ? account.id.substring(0, 8) : 'N/A',
    displayCode: account.user?.email?.split('@')[0] || 'STAFF',
    
    // Action flags
    canEdit: true,
    canDeactivate: account.isActive,
    canActivate: !account.isActive,
    canMakePayment: !account.isOnHold && account.isActive,
    canRecordShortage: account.isActive
  };
};

const formatStaffTransaction = (transaction) => {
  if (!transaction) return null;
  
  return {
    ...transaction,
    // Staff information
    staffName: transaction.staffAccount?.user ? 
      `${transaction.staffAccount.user.firstName} ${transaction.staffAccount.user.lastName}` : 'Unknown Staff',
    staffEmail: transaction.staffAccount?.user?.email || 'N/A',
    
    // Station information
    stationName: transaction.station?.name || 'Unknown Station',
    
    // Amount formatting
    amountDisplay: formatCurrency(transaction.amount),
    netAmountPaidDisplay: formatCurrency(transaction.netAmountPaid || transaction.amount),
    previousBalanceDisplay: formatCurrency(transaction.previousBalance),
    newBalanceDisplay: formatCurrency(transaction.newBalance),
    
    // Deduction displays
    shortageDeductedDisplay: formatCurrency(transaction.shortageDeducted || 0),
    advanceDeductedDisplay: formatCurrency(transaction.advanceDeducted || 0),
    
    // Transaction type displays
    typeDisplay: getTransactionTypeLabel(transaction.type),
    typeColor: getTransactionTypeColor(transaction.type),
    typeBadge: getTransactionTypeBadge(transaction.type),
    
    // Category displays
    categoryDisplay: transaction.category ? 
      transaction.category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : 'N/A',
    
    // Payment info displays
    paymentSourceDisplay: getPaymentSourceLabel(transaction.paymentSource),
    paymentMethodDisplay: transaction.paymentMethod ? 
      getPayrollMethodLabel(transaction.paymentMethod) : 'N/A',
    
    // Status badges
    statusDisplay: getTransactionStatusLabel(transaction.status),
    statusColor: getTransactionStatusColor(transaction.status),
    statusBadge: getTransactionStatusBadge(transaction.status),
    
    // Context displays
    shiftDisplay: transaction.shift?.shiftNumber ? `Shift ${transaction.shift.shiftNumber}` : 'N/A',
    islandDisplay: transaction.island?.name || 'N/A',
    
    // Payment transaction links
    bankReference: transaction.bankTransaction?.referenceNumber || 'N/A',
    walletTransactionDate: transaction.walletTransaction?.transactionDate ? 
      formatDateTime(transaction.walletTransaction.transactionDate) : 'N/A',
    
    // Personnel displays
    recordedByName: transaction.recordedBy ? 
      `${transaction.recordedBy.firstName} ${transaction.recordedBy.lastName}` : 'System',
    approvedByName: transaction.approvedBy ? 
      `${transaction.approvedBy.firstName} ${transaction.approvedBy.lastName}` : 'N/A',
    
    // Date displays
    transactionDateDisplay: formatDateTime(transaction.transactionDate),
    paymentDateDisplay: transaction.paymentDate ? formatDate(transaction.paymentDate) : 'Pending',
    approvalDateDisplay: transaction.approvedAt ? formatDateTime(transaction.approvedAt) : 'N/A',
    
    // Display properties
    displayId: transaction.id ? transaction.id.substring(0, 8) : 'N/A',
    isAdjustable: ['SHORTAGE', 'ADVANCE', 'FINE'].includes(transaction.type),
    requiresApproval: transaction.status === 'PENDING_APPROVAL',
    canBePaid: transaction.status === 'APPROVED' && !transaction.paymentDate,
    
    // Action flags
    canApprove: transaction.status === 'PENDING',
    canProcessPayment: transaction.status === 'APPROVED' && !transaction.paymentDate,
    canEdit: transaction.status === 'PENDING',
    canCancel: ['PENDING', 'APPROVED'].includes(transaction.status),
    canSettle: ['SHORTAGE', 'ADVANCE'].includes(transaction.type) && !transaction.paymentDate
  };
};

const formatStaffAccountSummary = (summary) => {
  if (!summary) return null;
  
  return {
    ...summary,
    // Format all currency values
    totalShortagesDisplay: formatCurrency(summary.totalShortages || 0),
    totalAdvancesDisplay: formatCurrency(summary.totalAdvances || 0),
    totalBonusesDisplay: formatCurrency(summary.totalBonuses || 0),
    totalSalaryCommitmentDisplay: formatCurrency(summary.totalSalaryCommitment || 0),
    netBalanceDisplay: formatCurrency(summary.netBalance || 0),
    averageSalaryDisplay: formatCurrency(summary.averageSalary || 0),
    
    // Format percentages
    accountsWithShortagesPercentage: summary.totalAccounts > 0 
      ? Math.round((summary.accountsWithShortages / summary.totalAccounts) * 100) 
      : 0,
    accountsDueForPaymentPercentage: summary.totalAccounts > 0 
      ? Math.round((summary.accountsDueForPayment / summary.totalAccounts) * 100) 
      : 0,
    
    // Status indicators
    overallStatus: summary.netBalance < 0 ? 'critical' : summary.netBalance > 0 ? 'warning' : 'healthy',
    shortageStatus: summary.accountsWithShortages > 0 ? 'warning' : 'success',
    paymentStatus: summary.accountsDueForPayment > 0 ? 'warning' : 'success'
  };
};

const formatShortage = (shortage) => {
  if (!shortage) return null;
  
  return {
    ...shortage,
    // Amount formatting
    originalAmountDisplay: formatCurrency(shortage.originalAmount),
    amountDeductedDisplay: formatCurrency(shortage.amountDeducted || 0),
    amountRemainingDisplay: formatCurrency(shortage.amountRemaining || shortage.originalAmount),
    
    // Date formatting
    shortageDateDisplay: formatDate(shortage.shortageDate),
    dueDateDisplay: formatDate(shortage.dueDate),
    
    // Status indicators
    isOverdue: shortage.dueDate && new Date(shortage.dueDate) < new Date(),
    progressPercentage: shortage.originalAmount > 0 
      ? Math.round(((shortage.amountDeducted || 0) / shortage.originalAmount) * 100) 
      : 0,
    status: shortage.isFullyDeducted ? 'settled' : shortage.dueDate && new Date(shortage.dueDate) < new Date() ? 'overdue' : 'outstanding',
    
    // Context information
    shortageDetails: shortage.shortageTransaction?.description || 'N/A',
    shiftInfo: shortage.shortageTransaction?.shift?.shiftNumber ? 
      `Shift ${shortage.shortageTransaction.shift.shiftNumber}` : 'N/A',
    islandInfo: shortage.shortageTransaction?.island?.name || 'N/A',
    
    // Action flags
    canSettle: !shortage.isFullyDeducted && (shortage.amountRemaining || shortage.originalAmount) > 0,
    canAdjust: !shortage.isFullyDeducted,
    canWriteOff: !shortage.isFullyDeducted
  };
};

const formatShortageSummary = (summary) => {
  if (!summary) return null;
  
  return {
    ...summary,
    // Format all amounts
    outstanding: {
      ...summary.outstanding,
      totalOriginalDisplay: formatCurrency(summary.outstanding?.totalOriginal || 0),
      totalDeductedDisplay: formatCurrency(summary.outstanding?.totalDeducted || 0),
      totalRemainingDisplay: formatCurrency(summary.outstanding?.totalRemaining || 0)
    },
    settled: {
      ...summary.settled,
      totalOriginalDisplay: formatCurrency(summary.settled?.totalOriginal || 0),
      totalDeductedDisplay: formatCurrency(summary.settled?.totalDeducted || 0)
    },
    overall: {
      ...summary.overall,
      totalShortagesDisplay: formatCurrency(summary.overall?.totalShortages || 0),
      totalDeductedDisplay: formatCurrency(summary.overall?.totalDeducted || 0),
      totalRemainingDisplay: formatCurrency(summary.overall?.totalRemaining || 0)
    },
    
    // Calculate percentages
    recoveryRate: summary.overall?.totalShortages > 0 
      ? Math.round(((summary.overall?.totalDeducted || 0) / summary.overall.totalShortages) * 100) 
      : 0,
    outstandingPercentage: summary.overall?.totalShortages > 0 
      ? Math.round(((summary.outstanding?.totalRemaining || 0) / summary.overall.totalShortages) * 100) 
      : 0
  };
};

const formatSalaryPayment = (payment) => {
  if (!payment) return null;
  
  return {
    ...payment,
    // Amount formatting
    grossSalaryDisplay: formatCurrency(payment.grossSalary),
    netSalaryDisplay: formatCurrency(payment.netSalary),
    totalDeductionsDisplay: formatCurrency(payment.totalDeductions),
    amountPaidDisplay: formatCurrency(payment.amountPaid || 0),
    shortageDeductionsDisplay: formatCurrency(payment.shortageDeductions || 0),
    advanceDeductionsDisplay: formatCurrency(payment.advanceDeductions || 0),
    otherDeductionsDisplay: formatCurrency(payment.otherDeductions || 0),
    bonusesAddedDisplay: formatCurrency(payment.bonusesAdded || 0),
    
    // Date formatting
    periodStartDisplay: formatDate(payment.periodStart),
    periodEndDisplay: formatDate(payment.periodEnd),
    paymentDateDisplay: formatDate(payment.paymentDate),
    processedAtDisplay: formatDateTime(payment.processedAt),
    
    // Staff information
    staffName: payment.staffAccount?.user ? 
      `${payment.staffAccount.user.firstName} ${payment.staffAccount.user.lastName}` : 'Unknown Staff',
    staffEmail: payment.staffAccount?.user?.email || 'N/A',
    
    // Status displays
    statusDisplay: getSalaryPaymentStatusLabel(payment.status),
    statusColor: payment.status === 'PAID' ? 'success' : 
                 payment.status === 'FAILED' ? 'error' : 
                 payment.status === 'CANCELLED' ? 'error' : 
                 payment.status === 'APPROVED' ? 'info' : 
                 payment.status === 'CALCULATED' ? 'warning' : 'default',
    statusBadge: payment.status === 'PAID' ? 'success' : 
                 payment.status === 'FAILED' ? 'danger' : 
                 payment.status === 'CANCELLED' ? 'danger' : 
                 payment.status === 'APPROVED' ? 'info' : 
                 payment.status === 'CALCULATED' ? 'warning' : 'default',
    
    // Payment method displays
    paymentMethodDisplay: getPayrollMethodLabel(payment.paymentMethod),
    paymentSourceDisplay: getPaymentSourceLabel(payment.paymentSource),
    
    // Transaction links
    bankReference: payment.bankTransaction?.referenceNumber || 'N/A',
    walletTransactionDate: payment.walletTransaction?.transactionDate ? 
      formatDateTime(payment.walletTransaction.transactionDate) : 'N/A',
    
    // Action flags
    canApprove: payment.status === 'CALCULATED',
    canProcess: payment.status === 'APPROVED',
    canCancel: ['PENDING', 'CALCULATED', 'APPROVED'].includes(payment.status),
    canEdit: payment.status === 'CALCULATED',
    isProcessable: payment.status === 'APPROVED',
    isEditable: payment.status === 'CALCULATED'
  };
};

const formatSalaryCalculation = (calculation) => {
  if (!calculation) return null;
  
  return {
    ...calculation,
    // Format all amounts
    grossSalaryDisplay: formatCurrency(calculation.grossSalary),
    totalDeductionsDisplay: formatCurrency(calculation.totalDeductions || 0),
    netSalaryDisplay: formatCurrency(calculation.netSalary),
    shortageDeductionsDisplay: formatCurrency(calculation.shortageDeductions || 0),
    advanceDeductionsDisplay: formatCurrency(calculation.advanceDeductions || 0),
    otherDeductionsDisplay: formatCurrency(calculation.otherDeductions || 0),
    bonusesAddedDisplay: formatCurrency(calculation.bonusesAdded || 0),
    
    // Calculate percentages
    deductionPercentage: calculation.grossSalary > 0 
      ? Math.round((calculation.totalDeductions / calculation.grossSalary) * 100) 
      : 0,
    netPercentage: calculation.grossSalary > 0 
      ? Math.round((calculation.netSalary / calculation.grossSalary) * 100) 
      : 0,
    
    // Breakdown for display
    breakdown: [
      { label: 'Gross Salary', amount: calculation.grossSalary, type: 'income' },
      { label: 'Shortage Deductions', amount: calculation.shortageDeductions || 0, type: 'deduction' },
      { label: 'Advance Deductions', amount: calculation.advanceDeductions || 0, type: 'deduction' },
      { label: 'Other Deductions', amount: calculation.otherDeductions || 0, type: 'deduction' },
      { label: 'Bonuses', amount: calculation.bonusesAdded || 0, type: 'addition' },
      { label: 'Net Salary', amount: calculation.netSalary, type: 'net' }
    ].map(item => ({
      ...item,
      amountDisplay: formatCurrency(item.amount),
      percentage: calculation.grossSalary > 0 ? Math.round((item.amount / calculation.grossSalary) * 100) : 0
    }))
  };
};

const formatTransactionSummary = (summary) => {
  if (!summary) return null;
  
  return {
    ...summary,
    // Format totals
    totals: {
      ...summary.totals,
      totalAmountDisplay: formatCurrency(summary.totals?.totalAmount || 0),
      totalShortageDeductionsDisplay: formatCurrency(summary.totals?.totalShortageDeductions || 0),
      totalAdvanceDeductionsDisplay: formatCurrency(summary.totals?.totalAdvanceDeductions || 0),
      totalNetPaidDisplay: formatCurrency(summary.totals?.totalNetPaid || 0)
    },
    
    // Format by type
    byType: Object.entries(summary.byType || {}).reduce((acc, [type, data]) => {
      acc[type] = {
        ...data,
        totalAmountDisplay: formatCurrency(data.totalAmount || 0),
        shortageDeductedDisplay: formatCurrency(data.shortageDeducted || 0),
        advanceDeductedDisplay: formatCurrency(data.advanceDeducted || 0),
        netPaidDisplay: formatCurrency(data.netPaid || 0),
        typeDisplay: getTransactionTypeLabel(type),
        typeColor: getTransactionTypeColor(type)
      };
      return acc;
    }, {}),
    
    // Calculate percentages
    incomePercentage: summary.totals?.totalAmount > 0 
      ? Math.round(((summary.byType?.SALARY_PAYMENT?.totalAmount || 0) + 
                   (summary.byType?.BONUS?.totalAmount || 0) + 
                   (summary.byType?.COMMISSION?.totalAmount || 0) + 
                   (summary.byType?.ALLOWANCE?.totalAmount || 0)) / summary.totals.totalAmount * 100) 
      : 0,
    deductionPercentage: summary.totals?.totalAmount > 0 
      ? Math.round(((summary.byType?.SHORTAGE?.totalAmount || 0) + 
                   (summary.byType?.ADVANCE?.totalAmount || 0) + 
                   (summary.byType?.FINE?.totalAmount || 0)) / summary.totals.totalAmount * 100) 
      : 0
  };
};

const formatPayrollGeneration = (payroll) => {
  if (!payroll) return null;
  
  return {
    ...payroll,
    summary: {
      ...payroll.summary,
      totalGrossSalaryDisplay: formatCurrency(payroll.summary?.totalGrossSalary || 0),
      totalNetSalaryDisplay: formatCurrency(payroll.summary?.totalNetSalary || 0),
      totalDeductionsDisplay: formatCurrency(payroll.summary?.totalDeductions || 0),
      period: payroll.summary?.period ? {
        start: formatDate(payroll.summary.period.start),
        end: formatDate(payroll.summary.period.end)
      } : null,
      paymentDate: formatDate(payroll.summary?.paymentDate)
    },
    
    results: (payroll.results || []).map(result => ({
      ...result,
      grossSalaryDisplay: formatCurrency(result.grossSalary),
      netSalaryDisplay: formatCurrency(result.netSalary),
      totalDeductionsDisplay: formatCurrency(result.totalDeductions),
      statusColor: result.status === 'PAID' ? 'success' : 
                   result.status === 'FAILED' ? 'error' : 'warning'
    })),
    
    errors: payroll.errors || [],
    
    // Status indicators
    hasErrors: (payroll.errors || []).length > 0,
    successRate: payroll.summary?.totalStaff > 0 
      ? Math.round((payroll.summary.successful / payroll.summary.totalStaff) * 100) 
      : 0,
    overallStatus: payroll.summary?.successful === payroll.summary?.totalStaff ? 'success' : 
                   payroll.summary?.failed > 0 ? 'warning' : 'success'
  };
};

const formatPayrollReport = (report) => {
  if (!report) return null;
  
  return {
    ...report,
    period: report.period ? {
      start: formatDate(report.period.start),
      end: formatDate(report.period.end)
    } : null,
    
    summary: {
      ...report.summary,
      totalGrossSalaryDisplay: formatCurrency(report.summary?.totalGrossSalary || 0),
      totalNetSalaryDisplay: formatCurrency(report.summary?.totalNetSalary || 0),
      totalDeductionsDisplay: formatCurrency(report.summary?.totalDeductions || 0),
      totalPaidDisplay: formatCurrency(report.summary?.totalPaid || 0)
    },
    
    // Breakdown summaries
    byStatus: report.summary?.byStatus ? Object.entries(report.summary.byStatus).reduce((acc, [status, count]) => {
      acc[status] = {
        count,
        label: getSalaryPaymentStatusLabel(status),
        color: status === 'PAID' ? 'success' : 
               status === 'FAILED' ? 'error' : 
               status === 'CANCELLED' ? 'error' : 'default'
      };
      return acc;
    }, {}) : {},
    
    byPaymentMethod: report.summary?.byPaymentMethod ? Object.entries(report.summary.byPaymentMethod).reduce((acc, [method, count]) => {
      acc[method] = {
        count,
        label: getPayrollMethodLabel(method),
        color: method === 'STATION_WALLET' ? 'primary' : 
               method === 'BANK_TRANSFER' ? 'info' : 
               method === 'MOBILE_MONEY' ? 'success' : 'default'
      };
      return acc;
    }, {}) : {}
  };
};

const formatPayrollSummary = (summary) => {
  if (!summary) return null;
  
  return {
    ...summary,
    period: summary.period ? {
      start: formatDate(summary.period.start),
      end: formatDate(summary.period.end)
    } : null,
    
    totalAmountPaidDisplay: formatCurrency(summary.totalAmountPaid || 0),
    totalDeductionsDisplay: formatCurrency(summary.totalDeductions || 0),
    averageSalaryDisplay: formatCurrency(summary.averageSalary || 0),
    
    paymentBreakdown: {
      byMethod: summary.paymentBreakdown?.byMethod ? Object.entries(summary.paymentBreakdown.byMethod).reduce((acc, [method, count]) => {
        acc[method] = {
          count,
          label: getPayrollMethodLabel(method),
          percentage: summary.totalStaffPaid > 0 ? Math.round((count / summary.totalStaffPaid) * 100) : 0
        };
        return acc;
      }, {}) : {},
      
      bySource: summary.paymentBreakdown?.bySource ? Object.entries(summary.paymentBreakdown.bySource).reduce((acc, [source, count]) => {
        acc[source] = {
          count,
          label: getPaymentSourceLabel(source),
          percentage: summary.totalStaffPaid > 0 ? Math.round((count / summary.totalStaffPaid) * 100) : 0
        };
        return acc;
      }, {}) : {}
    },
    
    // Status indicators
    efficiency: summary.totalStaffPaid > 0 ? 'good' : 'none',
    costEffectiveness: summary.totalDeductions > 0 ? 'effective' : 'none'
  };
};

export const staffAccountService = {
  // =====================
  // STAFF ACCOUNT CRUD METHODS
  // =====================
  
  createStaffAccount: async (accountData) => {
    logger.info('Creating staff account:', accountData);
    debugRequest('POST', `${STAFF_PAYMENTS_BASE_URL}/accounts`, accountData);
    
    try {
      const response = await apiService.post(`${STAFF_PAYMENTS_BASE_URL}/accounts`, accountData);
      debugResponse('POST', `${STAFF_PAYMENTS_BASE_URL}/accounts`, response);
      return handleResponse(response, 'creating staff account');
    } catch (error) {
      throw handleError(error, 'creating staff account', 'Failed to create staff account');
    }
  },

  getStaffAccount: async (accountId) => {
    logger.info(`Fetching staff account: ${accountId}`);
    
    try {
      debugRequest('GET', `${STAFF_PAYMENTS_BASE_URL}/accounts/${accountId}`);
      const response = await apiService.get(`${STAFF_PAYMENTS_BASE_URL}/accounts/${accountId}`);
      debugResponse('GET', `${STAFF_PAYMENTS_BASE_URL}/accounts/${accountId}`, response);
      const account = handleResponse(response, 'fetching staff account');
      return formatStaffAccount(account);
    } catch (error) {
      throw handleError(error, 'fetching staff account', 'Failed to fetch staff account');
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
      
      const url = `${STAFF_PAYMENTS_BASE_URL}/stations/${stationId}/accounts?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching staff accounts');
      
      if (result.accounts) {
        result.accounts = result.accounts.map(account => formatStaffAccount(account));
      }
      
      return result;
    } catch (error) {
      throw handleError(error, 'fetching staff accounts', 'Failed to fetch staff accounts');
    }
  },

  updateStaffAccount: async (accountId, updateData) => {
    logger.info(`Updating staff account: ${accountId}`, updateData);
    
    try {
      debugRequest('PATCH', `${STAFF_PAYMENTS_BASE_URL}/accounts/${accountId}`, updateData);
      const response = await apiService.patch(`${STAFF_PAYMENTS_BASE_URL}/accounts/${accountId}`, updateData);
      debugResponse('PATCH', `${STAFF_PAYMENTS_BASE_URL}/accounts/${accountId}`, response);
      const updatedAccount = handleResponse(response, 'updating staff account');
      return formatStaffAccount(updatedAccount);
    } catch (error) {
      throw handleError(error, 'updating staff account', 'Failed to update staff account');
    }
  },

  deactivateStaffAccount: async (accountId) => {
    logger.info(`Deactivating staff account: ${accountId}`);
    
    try {
      debugRequest('PATCH', `${STAFF_PAYMENTS_BASE_URL}/accounts/${accountId}`, { isActive: false });
      const response = await apiService.patch(`${STAFF_PAYMENTS_BASE_URL}/accounts/${accountId}`, { isActive: false });
      debugResponse('PATCH', `${STAFF_PAYMENTS_BASE_URL}/accounts/${accountId}`, response);
      const updatedAccount = handleResponse(response, 'deactivating staff account');
      return formatStaffAccount(updatedAccount);
    } catch (error) {
      throw handleError(error, 'deactivating staff account', 'Failed to deactivate staff account');
    }
  },

  // =====================
  // STAFF ACCOUNT SUMMARY & ANALYTICS
  // =====================

  getStaffAccountSummary: async (stationId) => {
    logger.info(`Fetching staff account summary for station: ${stationId}`);
    
    try {
      debugRequest('GET', `${STAFF_PAYMENTS_BASE_URL}/stations/${stationId}/accounts/summary`);
      const response = await apiService.get(`${STAFF_PAYMENTS_BASE_URL}/stations/${stationId}/accounts/summary`);
      debugResponse('GET', `${STAFF_PAYMENTS_BASE_URL}/stations/${stationId}/accounts/summary`, response);
      
      const summary = handleResponse(response, 'fetching staff account summary');
      return formatStaffAccountSummary(summary);
    } catch (error) {
      throw handleError(error, 'fetching staff account summary', 'Failed to fetch staff account summary');
    }
  },

  // =====================
  // STAFF TRANSACTION METHODS
  // =====================

  createStaffTransaction: async (transactionData) => {
    logger.info('Creating staff transaction:', transactionData);
    debugRequest('POST', `${STAFF_PAYMENTS_BASE_URL}/transactions`, transactionData);
    
    try {
      const response = await apiService.post(`${STAFF_PAYMENTS_BASE_URL}/transactions`, transactionData);
      debugResponse('POST', `${STAFF_PAYMENTS_BASE_URL}/transactions`, response);
      const transaction = handleResponse(response, 'creating staff transaction');
      return formatStaffTransaction(transaction);
    } catch (error) {
      throw handleError(error, 'creating staff transaction', 'Failed to create staff transaction');
    }
  },

  getStaffTransactions: async (filters = {}) => {
    logger.info('Fetching staff transactions with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
          } else {
            params.append(key, value);
          }
        }
      });
      
      const url = params.toString() 
        ? `${STAFF_PAYMENTS_BASE_URL}/transactions?${params.toString()}` 
        : `${STAFF_PAYMENTS_BASE_URL}/transactions`;
      
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching staff transactions');
      
      if (result.transactions) {
        result.transactions = result.transactions.map(transaction => formatStaffTransaction(transaction));
      }
      
      return result;
    } catch (error) {
      throw handleError(error, 'fetching staff transactions', 'Failed to fetch staff transactions');
    }
  },

  getTransactionSummary: async (staffAccountId) => {
    logger.info(`Fetching transaction summary for account: ${staffAccountId}`);
    
    try {
      debugRequest('GET', `${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/transactions/summary`);
      const response = await apiService.get(`${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/transactions/summary`);
      debugResponse('GET', `${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/transactions/summary`, response);
      
      const summary = handleResponse(response, 'fetching transaction summary');
      return formatTransactionSummary(summary);
    } catch (error) {
      throw handleError(error, 'fetching transaction summary', 'Failed to fetch transaction summary');
    }
  },

  processTransactionPayment: async (transactionId, paymentData) => {
    logger.info(`Processing payment for transaction: ${transactionId}`, paymentData);
    
    try {
      debugRequest('POST', `${STAFF_PAYMENTS_BASE_URL}/transactions/${transactionId}/process-payment`, paymentData);
      const response = await apiService.post(`${STAFF_PAYMENTS_BASE_URL}/transactions/${transactionId}/process-payment`, paymentData);
      debugResponse('POST', `${STAFF_PAYMENTS_BASE_URL}/transactions/${transactionId}/process-payment`, response);
      const transaction = handleResponse(response, 'processing transaction payment');
      return formatStaffTransaction(transaction);
    } catch (error) {
      throw handleError(error, 'processing transaction payment', 'Failed to process transaction payment');
    }
  },

  approveTransaction: async (transactionId, notes = '') => {
    logger.info(`Approving transaction: ${transactionId}`);
    
    try {
      debugRequest('POST', `${STAFF_PAYMENTS_BASE_URL}/transactions/${transactionId}/approve`, { notes });
      const response = await apiService.post(`${STAFF_PAYMENTS_BASE_URL}/transactions/${transactionId}/approve`, { notes });
      debugResponse('POST', `${STAFF_PAYMENTS_BASE_URL}/transactions/${transactionId}/approve`, response);
      const transaction = handleResponse(response, 'approving transaction');
      return formatStaffTransaction(transaction);
    } catch (error) {
      throw handleError(error, 'approving transaction', 'Failed to approve transaction');
    }
  },

  // =====================
  // SHORTAGE MANAGEMENT
  // =====================

  createShortage: async (shortageData) => {
    logger.info('Creating shortage record:', shortageData);
    debugRequest('POST', `${STAFF_PAYMENTS_BASE_URL}/shortages`, shortageData);
    
    try {
      const response = await apiService.post(`${STAFF_PAYMENTS_BASE_URL}/shortages`, shortageData);
      debugResponse('POST', `${STAFF_PAYMENTS_BASE_URL}/shortages`, response);
      const shortage = handleResponse(response, 'creating shortage');
      return formatShortage(shortage);
    } catch (error) {
      throw handleError(error, 'creating shortage', 'Failed to record shortage');
    }
  },

  settleShortage: async (shortageId, settlementData) => {
    logger.info(`Settling shortage: ${shortageId}`, settlementData);
    
    try {
      debugRequest('POST', `${STAFF_PAYMENTS_BASE_URL}/shortages/${shortageId}/settle`, settlementData);
      const response = await apiService.post(`${STAFF_PAYMENTS_BASE_URL}/shortages/${shortageId}/settle`, settlementData);
      debugResponse('POST', `${STAFF_PAYMENTS_BASE_URL}/shortages/${shortageId}/settle`, response);
      return handleResponse(response, 'settling shortage');
    } catch (error) {
      throw handleError(error, 'settling shortage', 'Failed to settle shortage');
    }
  },

  getOutstandingShortages: async (staffAccountId) => {
    logger.info(`Fetching outstanding shortages for account: ${staffAccountId}`);
    
    try {
      debugRequest('GET', `${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/shortages/outstanding`);
      const response = await apiService.get(`${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/shortages/outstanding`);
      debugResponse('GET', `${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/shortages/outstanding`, response);
      
      const shortages = handleResponse(response, 'fetching outstanding shortages');
      return shortages.map(shortage => formatShortage(shortage));
    } catch (error) {
      throw handleError(error, 'fetching outstanding shortages', 'Failed to fetch outstanding shortages');
    }
  },

  getShortageSummary: async (staffAccountId) => {
    logger.info(`Fetching shortage summary for account: ${staffAccountId}`);
    
    try {
      debugRequest('GET', `${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/shortages/summary`);
      const response = await apiService.get(`${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/shortages/summary`);
      debugResponse('GET', `${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/shortages/summary`, response);
      
      const summary = handleResponse(response, 'fetching shortage summary');
      return formatShortageSummary(summary);
    } catch (error) {
      throw handleError(error, 'fetching shortage summary', 'Failed to fetch shortage summary');
    }
  },

  // =====================
  // SALARY PAYMENT METHODS
  // =====================

  createSalaryPayment: async (salaryPaymentData) => {
    logger.info('Creating salary payment:', salaryPaymentData);
    debugRequest('POST', `${STAFF_PAYMENTS_BASE_URL}/salary-payments`, salaryPaymentData);
    
    try {
      const response = await apiService.post(`${STAFF_PAYMENTS_BASE_URL}/salary-payments`, salaryPaymentData);
      debugResponse('POST', `${STAFF_PAYMENTS_BASE_URL}/salary-payments`, response);
      const payment = handleResponse(response, 'creating salary payment');
      return formatSalaryPayment(payment);
    } catch (error) {
      throw handleError(error, 'creating salary payment', 'Failed to create salary payment');
    }
  },

  processSalaryPayment: async (salaryPaymentId, paymentData = {}) => {
    logger.info(`Processing salary payment: ${salaryPaymentId}`, paymentData);
    
    try {
      debugRequest('POST', `${STAFF_PAYMENTS_BASE_URL}/salary-payments/${salaryPaymentId}/process`, paymentData);
      const response = await apiService.post(`${STAFF_PAYMENTS_BASE_URL}/salary-payments/${salaryPaymentId}/process`, paymentData);
      debugResponse('POST', `${STAFF_PAYMENTS_BASE_URL}/salary-payments/${salaryPaymentId}/process`, response);
      const payment = handleResponse(response, 'processing salary payment');
      return formatSalaryPayment(payment);
    } catch (error) {
      throw handleError(error, 'processing salary payment', 'Failed to process salary payment');
    }
  },

  getSalaryPayment: async (salaryPaymentId) => {
    logger.info(`Fetching salary payment: ${salaryPaymentId}`);
    
    try {
      debugRequest('GET', `${STAFF_PAYMENTS_BASE_URL}/salary-payments/${salaryPaymentId}`);
      const response = await apiService.get(`${STAFF_PAYMENTS_BASE_URL}/salary-payments/${salaryPaymentId}`);
      debugResponse('GET', `${STAFF_PAYMENTS_BASE_URL}/salary-payments/${salaryPaymentId}`, response);
      const payment = handleResponse(response, 'fetching salary payment');
      return formatSalaryPayment(payment);
    } catch (error) {
      throw handleError(error, 'fetching salary payment', 'Failed to fetch salary payment');
    }
  },

  approveSalaryPayment: async (salaryPaymentId, notes = '') => {
    logger.info(`Approving salary payment: ${salaryPaymentId}`);
    
    try {
      debugRequest('POST', `${STAFF_PAYMENTS_BASE_URL}/salary-payments/${salaryPaymentId}/approve`, { notes });
      const response = await apiService.post(`${STAFF_PAYMENTS_BASE_URL}/salary-payments/${salaryPaymentId}/approve`, { notes });
      debugResponse('POST', `${STAFF_PAYMENTS_BASE_URL}/salary-payments/${salaryPaymentId}/approve`, response);
      const payment = handleResponse(response, 'approving salary payment');
      return formatSalaryPayment(payment);
    } catch (error) {
      throw handleError(error, 'approving salary payment', 'Failed to approve salary payment');
    }
  },

  getSalaryPaymentHistory: async (staffAccountId, filters = {}) => {
    logger.info(`Fetching salary payment history for account: ${staffAccountId}`, filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = params.toString()
        ? `${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/salary-payments?${params.toString()}`
        : `${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/salary-payments`;
      
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching salary payment history');
      
      if (result.payments) {
        result.payments = result.payments.map(payment => formatSalaryPayment(payment));
      }
      
      return result;
    } catch (error) {
      throw handleError(error, 'fetching salary payment history', 'Failed to fetch salary payment history');
    }
  },

  calculateSalary: async (staffAccountId, calculationData) => {
    logger.info(`Calculating salary for account: ${staffAccountId}`, calculationData);
    
    try {
      debugRequest('POST', `${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/salary/calculate`, calculationData);
      const response = await apiService.post(`${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/salary/calculate`, calculationData);
      debugResponse('POST', `${STAFF_PAYMENTS_BASE_URL}/accounts/${staffAccountId}/salary/calculate`, response);
      const calculation = handleResponse(response, 'calculating salary');
      return formatSalaryCalculation(calculation);
    } catch (error) {
      throw handleError(error, 'calculating salary', 'Failed to calculate salary');
    }
  },

  // =====================
  // PAYROLL MANAGEMENT
  // =====================

  generatePayroll: async (payrollData) => {
    logger.info('Generating payroll:', payrollData);
    debugRequest('POST', `${STAFF_PAYMENTS_BASE_URL}/payroll/generate`, payrollData);
    
    try {
      const response = await apiService.post(`${STAFF_PAYMENTS_BASE_URL}/payroll/generate`, payrollData);
      debugResponse('POST', `${STAFF_PAYMENTS_BASE_URL}/payroll/generate`, response);
      const payroll = handleResponse(response, 'generating payroll');
      return formatPayrollGeneration(payroll);
    } catch (error) {
      throw handleError(error, 'generating payroll', 'Failed to generate payroll');
    }
  },

  processBulkPayments: async (paymentData) => {
    logger.info('Processing bulk payments:', paymentData);
    debugRequest('POST', `${STAFF_PAYMENTS_BASE_URL}/payroll/process-bulk`, paymentData);
    
    try {
      const response = await apiService.post(`${STAFF_PAYMENTS_BASE_URL}/payroll/process-bulk`, paymentData);
      debugResponse('POST', `${STAFF_PAYMENTS_BASE_URL}/payroll/process-bulk`, response);
      return handleResponse(response, 'processing bulk payments');
    } catch (error) {
      throw handleError(error, 'processing bulk payments', 'Failed to process bulk payments');
    }
  },

  getPayrollReport: async (stationId, periodStart, periodEnd) => {
    logger.info(`Fetching payroll report for station: ${stationId}`);
    
    try {
      const params = new URLSearchParams();
      if (periodStart) params.append('periodStart', periodStart);
      if (periodEnd) params.append('periodEnd', periodEnd);
      
      const url = `${STAFF_PAYMENTS_BASE_URL}/stations/${stationId}/payroll/report?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const report = handleResponse(response, 'fetching payroll report');
      return formatPayrollReport(report);
    } catch (error) {
      throw handleError(error, 'fetching payroll report', 'Failed to fetch payroll report');
    }
  },

  getPayrollSummary: async (stationId, year, month) => {
    logger.info(`Fetching payroll summary for station: ${stationId}`);
    
    try {
      const params = new URLSearchParams();
      if (year) params.append('year', year);
      if (month) params.append('month', month);
      
      const url = `${STAFF_PAYMENTS_BASE_URL}/stations/${stationId}/payroll/summary?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const summary = handleResponse(response, 'fetching payroll summary');
      return formatPayrollSummary(summary);
    } catch (error) {
      throw handleError(error, 'fetching payroll summary', 'Failed to fetch payroll summary');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================
  validateStaffAccount,
  validateStaffTransaction,
  validateShortage,
  validateSalaryPayment,
  validatePayrollGeneration,

  // =====================
  // FORMATTING UTILITIES
  // =====================
  formatStaffAccount,
  formatStaffTransaction,
  formatStaffAccountSummary,
  formatShortage,
  formatShortageSummary,
  formatSalaryPayment,
  formatSalaryCalculation,
  formatTransactionSummary,
  formatPayrollGeneration,
  formatPayrollReport,
  formatPayrollSummary,

  // =====================
  // HELPER METHODS
  // =====================
  getPaymentScheduleLabel,
  getPayrollMethodLabel,
  getTransactionTypeLabel,
  getTransactionTypeColor,
  getTransactionTypeBadge,
  getPaymentSourceLabel,
  getTransactionStatusLabel,
  getTransactionStatusColor,
  getTransactionStatusBadge,
  getSalaryPaymentStatusLabel,
  formatCurrency,
  formatDate,
  formatDateTime
};