// src/services/shortage/shortageService.js
import { apiService } from '../apiService';

const SHORTAGE_BASE_URL = '/shortages';

// Enhanced logging utility
const logger = {
  debug: (...args) => console.log('🔍 [ShortageService]', ...args),
  info: (...args) => console.log('ℹ️ [ShortageService]', ...args),
  warn: (...args) => console.warn('⚠️ [ShortageService]', ...args),
  error: (...args) => console.error('❌ [ShortageService]', ...args)
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
  if (response && response.success) {
    logger.debug(`${operation} successful`);
    return response.data;
  }
  
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

// =====================
// FORMATTING UTILITIES
// =====================

const getShortageTypeLabel = (type) => {
  const labels = {
    CASH: 'Cash Shortage',
    INVENTORY: 'Inventory Shortage',
    PRODUCT: 'Product Shortage',
    EQUIPMENT: 'Equipment Shortage',
    OTHER: 'Other Shortage'
  };
  return labels[type] || type || 'Unknown';
};

const getResponsiblePartyLabel = (party) => {
  const labels = {
    ATTENDANT: 'Attendant',
    SUPERVISOR: 'Supervisor',
    SHIFT_LEADER: 'Shift Leader',
    STATION: 'Station',
    OTHER: 'Other'
  };
  return labels[party] || party || 'Unknown';
};

const getSeverityLabel = (severity) => {
  const labels = {
    MINOR: 'Minor',
    MODERATE: 'Moderate',
    MAJOR: 'Major',
    CRITICAL: 'Critical'
  };
  return labels[severity] || severity || 'Unknown';
};

const getStatusLabel = (status) => {
  const labels = {
    ACTIVE: 'Active',
    PARTIALLY_DEDUCTED: 'Partially Deducted',
    FULLY_DEDUCTED: 'Fully Deducted',
    WRITTEN_OFF: 'Written Off'
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

const formatDaysUntilDue = (dueDate) => {
  if (!dueDate) return 'No due date';
  
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} days`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else {
    return `Due in ${diffDays} days`;
  }
};

// =====================
// VALIDATION UTILITIES
// =====================

const validateShortage = (shortageData) => {
  const errors = [];

  if (!shortageData.staffAccountId) {
    errors.push('Staff account is required');
  }

  if (!shortageData.amount || shortageData.amount <= 0) {
    errors.push('Amount must be positive');
  }

  if (!shortageData.description || shortageData.description.trim() === '') {
    errors.push('Description is required');
  }

  if (shortageData.description && shortageData.description.length > 500) {
    errors.push('Description cannot exceed 500 characters');
  }

  // Validate enums
  const validShortageTypes = ['CASH', 'INVENTORY', 'PRODUCT', 'EQUIPMENT', 'OTHER'];
  if (shortageData.shortageType && !validShortageTypes.includes(shortageData.shortageType)) {
    errors.push('Invalid shortage type');
  }

  const validResponsibleParties = ['ATTENDANT', 'SUPERVISOR', 'SHIFT_LEADER', 'STATION', 'OTHER'];
  if (shortageData.responsibleParty && !validResponsibleParties.includes(shortageData.responsibleParty)) {
    errors.push('Invalid responsible party');
  }

  const validSeverities = ['MINOR', 'MODERATE', 'MAJOR', 'CRITICAL'];
  if (shortageData.severity && !validSeverities.includes(shortageData.severity)) {
    errors.push('Invalid severity level');
  }

  // Validate due date is in future if provided
  if (shortageData.dueDate) {
    const dueDate = new Date(shortageData.dueDate);
    if (dueDate < new Date()) {
      errors.push('Due date must be in the future');
    }
  }

  return errors;
};

// =====================
// FORMATTING FUNCTIONS
// =====================

const formatShortage = (shortage) => {
  if (!shortage) return null;
  
  return {
    ...shortage,
    // Basic information
    shortageTypeDisplay: getShortageTypeLabel(shortage.shortageType),
    responsiblePartyDisplay: getResponsiblePartyLabel(shortage.responsibleParty),
    severityDisplay: getSeverityLabel(shortage.severity),
    statusDisplay: getStatusLabel(shortage.status),
    
    // Financial displays
    amountDisplay: formatCurrency(shortage.amount),
    amountRemainingDisplay: formatCurrency(shortage.amountRemaining),
    percentagePaid: shortage.amount > 0 ? 
      ((shortage.amount - shortage.amountRemaining) / shortage.amount * 100).toFixed(1) : 0,
    
    // Date displays
    shortageDateDisplay: formatDate(shortage.shortageDate),
    shortageDateTimeDisplay: formatDateTime(shortage.shortageDate),
    dueDateDisplay: shortage.dueDate ? formatDate(shortage.dueDate) : 'No due date',
    daysUntilDueDisplay: formatDaysUntilDue(shortage.dueDate),
    recordedAtDisplay: formatDateTime(shortage.recordedAt),
    
    // Staff information
    staffDisplayName: shortage.staffAccount?.user ? 
      `${shortage.staffAccount.user.firstName} ${shortage.staffAccount.user.lastName}` : 'Unknown Staff',
    staffEmail: shortage.staffAccount?.user?.email || 'N/A',
    
    // Station information
    stationDisplayName: shortage.staffAccount?.station?.name || 'Unknown Station',
    stationCompanyName: shortage.staffAccount?.station?.company?.name || 'N/A',
    
    // Status badges and colors
    statusBadge: shortage.status === 'ACTIVE' ? 'warning' :
                 shortage.status === 'PARTIALLY_DEDUCTED' ? 'info' :
                 shortage.status === 'FULLY_DEDUCTED' ? 'success' :
                 shortage.status === 'WRITTEN_OFF' ? 'secondary' : 'default',
    
    severityBadge: shortage.severity === 'CRITICAL' ? 'danger' :
                   shortage.severity === 'MAJOR' ? 'warning' :
                   shortage.severity === 'MODERATE' ? 'info' :
                   'secondary',
    
    // Due date urgency
    isOverdue: shortage.dueDate ? new Date(shortage.dueDate) < new Date() : false,
    isDueToday: shortage.dueDate ? 
      new Date(shortage.dueDate).toDateString() === new Date().toDateString() : false,
    isDueSoon: shortage.dueDate ? {
      date: new Date(shortage.dueDate),
      daysUntilDue: Math.ceil((new Date(shortage.dueDate) - new Date()) / (1000 * 60 * 60 * 24)),
      isSoon: Math.ceil((new Date(shortage.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) <= 7
    } : null,
    
    // Quick status checks
    hasOutstanding: shortage.amountRemaining > 0,
    isFullyPaid: shortage.amountRemaining === 0,
    isPartiallyPaid: shortage.amountRemaining > 0 && shortage.amountRemaining < shortage.amount,
    canAddDeduction: shortage.amountRemaining > 0 && shortage.status !== 'WRITTEN_OFF',
    
    // Deductions summary
    totalDeducted: shortage.amount - shortage.amountRemaining,
    totalDeductedDisplay: formatCurrency(shortage.amount - shortage.amountRemaining),
    deductionsCount: shortage.deductions?.length || 0,
    
    // Display properties
    displayId: shortage.id ? shortage.id.substring(0, 8) : 'N/A',
    
    // Action flags
    canEdit: shortage.status === 'ACTIVE' || shortage.status === 'PARTIALLY_DEDUCTED',
    canDelete: shortage.amountRemaining === shortage.amount && 
               (!shortage.deductions || shortage.deductions.length === 0),
    canWriteOff: shortage.amountRemaining > 0,
    canAddComment: true
  };
};

const formatShortageList = (shortages) => {
  if (!shortages || !Array.isArray(shortages)) return [];
  return shortages.map(shortage => formatShortage(shortage));
};

const formatShortageStats = (stats) => {
  if (!stats) return null;
  
  return {
    ...stats,
    // Format overview
    overview: stats.overview ? {
      ...stats.overview,
      totalAmountDisplay: formatCurrency(stats.overview.totalAmount),
      outstandingAmountDisplay: formatCurrency(stats.overview.outstandingAmount),
      avgShortageAmountDisplay: formatCurrency(stats.overview.avgShortageAmount)
    } : null,
    
    // Format by type
    byType: (stats.byType || []).map(item => ({
      ...item,
      shortageTypeDisplay: getShortageTypeLabel(item.shortageType),
      totalAmountDisplay: formatCurrency(item.totalAmount),
      percentage: item.count && stats.overview?.totalShortages ? 
        ((item.count / stats.overview.totalShortages) * 100).toFixed(1) : 0
    })),
    
    // Format by severity
    bySeverity: (stats.bySeverity || []).map(item => ({
      ...item,
      severityDisplay: getSeverityLabel(item.severity),
      totalAmountDisplay: formatCurrency(item.totalAmount),
      percentage: item.count && stats.overview?.totalShortages ? 
        ((item.count / stats.overview.totalShortages) * 100).toFixed(1) : 0
    })),
    
    // Format by status
    byStatus: (stats.byStatus || []).map(item => ({
      ...item,
      statusDisplay: getStatusLabel(item.status),
      totalAmountDisplay: formatCurrency(item.totalAmount),
      percentage: item.count && stats.overview?.totalShortages ? 
        ((item.count / stats.overview.totalShortages) * 100).toFixed(1) : 0
    })),
    
    // Format trends if present
    trends: (stats.trends || []).map(trend => ({
      ...trend,
      periodDisplay: formatDate(trend.period),
      totalAmountDisplay: formatCurrency(trend.totalAmount)
    })),
    
    // Format top staff if present
    topStaff: (stats.topStaff || []).map(staff => ({
      ...staff,
      staffName: staff.staffName || 'Unknown',
      totalAmountDisplay: formatCurrency(staff.totalAmount)
    })),
    
    // Add computed metrics
    computedMetrics: {
      // Percentage of shortages that are outstanding
      outstandingPercentage: stats.overview?.totalShortages > 0 ? 
        ((stats.overview.outstandingShortages / stats.overview.totalShortages) * 100).toFixed(1) : 0,
      
      // Average outstanding amount per shortage
      avgOutstandingPerShortage: stats.overview?.outstandingShortages > 0 ? 
        (stats.overview.outstandingAmount / stats.overview.outstandingShortages) : 0,
      
      // Collection rate
      collectionRate: stats.overview?.totalAmount > 0 ? 
        ((stats.overview.totalAmount - stats.overview.outstandingAmount) / stats.overview.totalAmount * 100).toFixed(1) : 0
    }
  };
};

// =====================
// MAIN SERVICE METHODS
// =====================

export const shortageService = {
  
  // ========== CREATE SHORTAGE ==========
  
  createShortage: async (shortageData) => {
    logger.info('Creating shortage:', shortageData);
    debugRequest('POST', SHORTAGE_BASE_URL, shortageData);
    
    try {
      const response = await apiService.post(SHORTAGE_BASE_URL, shortageData);
      debugResponse('POST', SHORTAGE_BASE_URL, response);
      const shortage = handleResponse(response, 'creating shortage');
      return formatShortage(shortage);
    } catch (error) {
      throw handleError(error, 'creating shortage', 'Failed to create shortage');
    }
  },

  // ========== GET SHORTAGE ==========
  
  getShortage: async (shortageId) => {
    logger.info(`Fetching shortage: ${shortageId}`);
    
    try {
      const url = `${SHORTAGE_BASE_URL}/${shortageId}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      const shortage = handleResponse(response, 'fetching shortage');
      return formatShortage(shortage);
    } catch (error) {
      throw handleError(error, 'fetching shortage', 'Failed to fetch shortage');
    }
  },

  // ========== GET SHORTAGES BY STAFF ACCOUNT ==========
  
  getShortagesByStaffAccount: async (staffAccountId, filters = {}) => {
    logger.info(`Fetching shortages for staff account: ${staffAccountId}`, filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `${SHORTAGE_BASE_URL}/staff/${staffAccountId}?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching shortages by staff account');
      
      if (result.shortages) {
        result.shortages = result.shortages.map(shortage => formatShortage(shortage));
      }
      
      return result;
    } catch (error) {
      throw handleError(error, 'fetching shortages by staff account', 'Failed to fetch shortages');
    }
  },

  // ========== ROLE-BASED SHORTAGE ENDPOINTS ==========
  
  // Get my shortages (for attendants - their own shortages)
  getMyShortages: async (filters = {}) => {
    logger.info('Fetching my shortages with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `${SHORTAGE_BASE_URL}/my/shortages?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching my shortages');
      
      if (result.shortages) {
        result.shortages = result.shortages.map(shortage => formatShortage(shortage));
      }
      
      return result;
    } catch (error) {
      throw handleError(error, 'fetching my shortages', 'Failed to fetch your shortages');
    }
  },

  // Get station shortages (for station managers, supervisors)
  getStationShortages: async (filters = {}) => {
    logger.info('Fetching station shortages with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `${SHORTAGE_BASE_URL}/station/shortages?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching station shortages');
      
      if (result.shortages) {
        result.shortages = result.shortages.map(shortage => formatShortage(shortage));
      }
      
      return result;
    } catch (error) {
      throw handleError(error, 'fetching station shortages', 'Failed to fetch station shortages');
    }
  },

  // Get company shortages (for company admins)
  getCompanyShortages: async (filters = {}) => {
    logger.info('Fetching company shortages with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `${SHORTAGE_BASE_URL}/company/shortages?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching company shortages');
      
      if (result.shortages) {
        result.shortages = result.shortages.map(shortage => formatShortage(shortage));
      }
      
      return result;
    } catch (error) {
      throw handleError(error, 'fetching company shortages', 'Failed to fetch company shortages');
    }
  },

  // Get all shortages (for super admin)
  getAllShortages: async (filters = {}) => {
    logger.info('Fetching all shortages with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `${SHORTAGE_BASE_URL}/all/shortages?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching all shortages');
      
      if (result.shortages) {
        result.shortages = result.shortages.map(shortage => formatShortage(shortage));
      }
      
      return result;
    } catch (error) {
      throw handleError(error, 'fetching all shortages', 'Failed to fetch shortages');
    }
  },

  // ========== UPDATE SHORTAGE ==========
  
  updateShortage: async (shortageId, updateData) => {
    logger.info(`Updating shortage: ${shortageId}`, updateData);
    
    try {
      const url = `${SHORTAGE_BASE_URL}/${shortageId}`;
      debugRequest('PUT', url, updateData);
      const response = await apiService.put(url, updateData);
      debugResponse('PUT', url, response);
      const updatedShortage = handleResponse(response, 'updating shortage');
      return formatShortage(updatedShortage);
    } catch (error) {
      throw handleError(error, 'updating shortage', 'Failed to update shortage');
    }
  },

  // ========== DELETE SHORTAGE ==========
  
  deleteShortage: async (shortageId) => {
    logger.info(`Deleting shortage: ${shortageId}`);
    
    try {
      const url = `${SHORTAGE_BASE_URL}/${shortageId}`;
      debugRequest('DELETE', url);
      const response = await apiService.delete(url);
      debugResponse('DELETE', url, response);
      return handleResponse(response, 'deleting shortage');
    } catch (error) {
      throw handleError(error, 'deleting shortage', 'Failed to delete shortage');
    }
  },

  // ========== STATISTICS ENDPOINTS ==========
  
  getShortageStats: async (filters = {}) => {
    logger.info('Fetching shortage statistics with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `${SHORTAGE_BASE_URL}/stats/overview?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const stats = handleResponse(response, 'fetching shortage statistics');
      return formatShortageStats(stats);
    } catch (error) {
      throw handleError(error, 'fetching shortage statistics', 'Failed to fetch shortage statistics');
    }
  },

  getStationShortageStats: async (filters = {}) => {
    logger.info('Fetching station shortage statistics with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `${SHORTAGE_BASE_URL}/stats/station?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const stats = handleResponse(response, 'fetching station shortage statistics');
      return formatShortageStats(stats);
    } catch (error) {
      throw handleError(error, 'fetching station shortage statistics', 'Failed to fetch station shortage statistics');
    }
  },

  getCompanyShortageStats: async (filters = {}) => {
    logger.info('Fetching company shortage statistics with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `${SHORTAGE_BASE_URL}/stats/company?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const stats = handleResponse(response, 'fetching company shortage statistics');
      return formatShortageStats(stats);
    } catch (error) {
      throw handleError(error, 'fetching company shortage statistics', 'Failed to fetch company shortage statistics');
    }
  },

  // ========== DEDUCTION ENDPOINTS ==========
  
  createDeduction: async (shortageId, deductionData) => {
    logger.info(`Creating deduction for shortage: ${shortageId}`, deductionData);
    
    try {
      const url = `${SHORTAGE_BASE_URL}/${shortageId}/deductions`;
      debugRequest('POST', url, deductionData);
      const response = await apiService.post(url, deductionData);
      debugResponse('POST', url, response);
      return handleResponse(response, 'creating deduction');
    } catch (error) {
      throw handleError(error, 'creating deduction', 'Failed to create deduction');
    }
  },

  getDeductionsByShortage: async (shortageId, filters = {}) => {
    logger.info(`Fetching deductions for shortage: ${shortageId}`, filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `${SHORTAGE_BASE_URL}/${shortageId}/deductions?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      
      const result = handleResponse(response, 'fetching deductions by shortage');
      return result;
    } catch (error) {
      throw handleError(error, 'fetching deductions', 'Failed to fetch deductions');
    }
  },

  // ========== UTILITY ENDPOINTS ==========
  
  getShortageSummary: async () => {
    logger.info('Fetching shortage summary');
    
    try {
      const url = `${SHORTAGE_BASE_URL}/summary/overview`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching shortage summary');
    } catch (error) {
      throw handleError(error, 'fetching shortage summary', 'Failed to fetch shortage summary');
    }
  },

  exportShortages: async (filters = {}) => {
    logger.info('Exporting shortages with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const url = `${SHORTAGE_BASE_URL}/export/data?${params.toString()}`;
      debugRequest('GET', url);
      const response = await apiService.get(url, { responseType: 'blob' });
      
      // Handle blob response for download
      const blob = new Blob([response], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `shortages_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      logger.info('Export successful');
      return { success: true };
    } catch (error) {
      throw handleError(error, 'exporting shortages', 'Failed to export shortages');
    }
  },

  // ========== QUICK ACCESS METHODS ==========
  
  getActiveShortages: async (filters = {}) => {
    return shortageService.getStationShortages({
      ...filters,
      status: 'ACTIVE',
      hasOutstanding: true
    });
  },

  getOverdueShortages: async (filters = {}) => {
    return shortageService.getStationShortages({
      ...filters,
      status: 'ACTIVE',
      hasOutstanding: true,
      dueBefore: new Date().toISOString()
    });
  },

  getHighSeverityShortages: async (filters = {}) => {
    return shortageService.getStationShortages({
      ...filters,
      severity: ['MAJOR', 'CRITICAL'],
      hasOutstanding: true
    });
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================
  validateShortage,

  // =====================
  // FORMATTING UTILITIES
  // =====================
  formatShortage,
  formatShortageList,
  formatShortageStats,
  
  // =====================
  // HELPER METHODS
  // =====================
  getShortageTypeLabel,
  getResponsiblePartyLabel,
  getSeverityLabel,
  getStatusLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDaysUntilDue
};