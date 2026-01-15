// src/services/collectionService/collectionService.js
import { apiService } from '../apiService';

// Enhanced logging utility
const logger = {
  debug: (...args) => console.log('🔍 [CollectionService]', ...args),
  info: (...args) => console.log('ℹ️ [CollectionService]', ...args),
  warn: (...args) => console.warn('⚠️ [CollectionService]', ...args),
  error: (...args) => console.error('❌ [CollectionService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  logger.debug(`${operation} response:`, response.data);
  
  if (response.data && response.data.success !== false) {
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

// Enhanced error handler
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
      throw new Error('You do not have permission to access this collection');
    }
    
    if (status === 404) {
      throw new Error('Collection data not found');
    }
    
    if (status === 400 && data && data.errors) {
      const errorMessages = data.errors.map(err => `${err.path}: ${err.message}`).join(', ');
      throw new Error(`Validation error: ${errorMessages}`);
    }
    
    if (data && data.message) {
      throw new Error(data.message);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

// ========== NORMALIZATION & FORMATTING ==========

const normalizeCollectionResponse = (apiData, type, filters = {}) => {
  logger.debug(`Normalizing ${type} collection response`);
  
  // If it's already in the correct format with data property
  if (apiData && typeof apiData === 'object' && !Array.isArray(apiData) && apiData.data !== undefined) {
    return apiData;
  }
  
  // If it's an array, create the expected structure
  if (Array.isArray(apiData)) {
    const response = {
      success: true,
      data: apiData,
      summary: calculateCollectionSummary(apiData, type),
      meta: {
        reportType: `${type}_collections`,
        filtersApplied: filters,
        generatedAt: new Date().toISOString(),
        totalCollections: apiData.length
      },
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total: apiData.length,
        pages: Math.ceil(apiData.length / (filters.limit || 20))
      }
    };
    
    return response;
  }
  
  // Return empty structure
  return {
    success: true,
    data: [],
    summary: {
      totalCash: 0,
      totalCollections: 0,
      totalShortage: 0,
      totalOverage: 0,
      totalDebts: 0,
      totalExpenses: 0,
      grandTotal: 0
    },
    meta: {
      reportType: `${type}_collections`,
      filtersApplied: filters,
      generatedAt: new Date().toISOString()
    },
    pagination: {
      page: filters.page || 1,
      limit: filters.limit || 20,
      total: 0,
      pages: 0
    }
  };
};

const calculateCollectionSummary = (collections, type) => {
  if (!Array.isArray(collections)) return {};
  
  const summary = {
    totalCollections: collections.length,
    totalCash: 0,
    totalReceipts: 0,
    totalExpenses: 0,
    totalShortage: 0,
    totalOverage: 0,
    totalDebts: 0,
    grandTotal: 0,
    totalCashCollected: 0,
    averageVariance: 0
  };
  
  collections.forEach(collection => {
    summary.totalCash += collection.cashAmount || 0;
    summary.totalReceipts += collection.receiptsAmount || 0;
    summary.totalExpenses += collection.expensesAmount || 0;
    summary.totalShortage += collection.shortageAmount || 0;
    summary.totalOverage += collection.overageAmount || 0;
    summary.totalDebts += collection.totalDebtsIncurred || 0;
    summary.grandTotal += collection.grandTotal || 0;
    summary.totalCashCollected += collection.totalCashCollected || 0;
    summary.averageVariance += collection.cashVariance || 0;
  });
  
  if (collections.length > 0) {
    summary.averageVariance /= collections.length;
  }
  
  return summary;
};

const formatCurrency = (amount, currency = 'KES') => {
  if (amount === null || amount === undefined) return `Ksh 0.00`;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString, format = 'full') => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-KE');
    case 'time':
      return date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    case 'datetime':
      return date.toLocaleString('en-KE');
    default:
      return date.toLocaleString('en-KE');
  }
};

// ========== FILTER BUILDER UTILITIES ==========

const collectionFilters = {
  buildCollectionQueryFilters: (filters = {}) => {
    const {
      startDate,
      endDate,
      stationId,
      islandId,
      attendantId,
      status,
      page = 1,
      limit = 20,
      sortBy = 'countedAt',
      sortOrder = 'desc',
      includeIslandCollections = false,
      includeWalletTransactions = false,
      includeDebtorTransactions = false,
      includeStaffTransactions = false
    } = filters;

    const params = {
      page,
      limit,
      sortBy,
      sortOrder
    };

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (stationId) params.stationId = stationId;
    if (islandId) params.islandId = islandId;
    if (attendantId) params.attendantId = attendantId;
    if (status) params.status = status;
    if (includeIslandCollections) params.includeIslandCollections = includeIslandCollections;
    if (includeWalletTransactions) params.includeWalletTransactions = includeWalletTransactions;
    if (includeDebtorTransactions) params.includeDebtorTransactions = includeDebtorTransactions;
    if (includeStaffTransactions) params.includeStaffTransactions = includeStaffTransactions;

    return params;
  },

  buildDateReportFilters: (filters = {}) => {
    const {
      date,
      startDate,
      endDate,
      stationId,
      groupBy = 'station',
      period = 'daily',
      page = 1,
      limit = 20
    } = filters;

    const params = {
      groupBy,
      period,
      page,
      limit
    };

    if (date) params.date = date;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (stationId) params.stationId = stationId;

    return params;
  },

  buildShiftCollectionDetailFilters: (filters = {}) => {
    const {
      includeAllDetails = true
    } = filters;

    return {
      includeAllDetails
    };
  }
};

// ========== DATA FORMATTERS ==========

const collectionFormatters = {
  formatIslandCollection: (collection) => {
    if (!collection) return null;
    
    return {
      ...collection,
      formatted: {
        cashAmount: formatCurrency(collection.cashAmount),
        receiptsAmount: formatCurrency(collection.receiptsAmount),
        expensesAmount: formatCurrency(collection.expensesAmount),
        shortageAmount: formatCurrency(collection.shortageAmount),
        overageAmount: formatCurrency(collection.overageAmount),
        totalCashCollected: formatCurrency(collection.totalCashCollected),
        totalDebtsIncurred: formatCurrency(collection.totalDebtsIncurred),
        grandTotal: formatCurrency(collection.grandTotal),
        countedAt: formatDate(collection.countedAt),
        verifiedAt: collection.verifiedAt ? formatDate(collection.verifiedAt) : 'Not Verified'
      },
      statusInfo: {
        label: collection.status,
        variant: getStatusVariant(collection.status),
        icon: getStatusIcon(collection.status)
      }
    };
  },

  formatShiftCollection: (collection) => {
    if (!collection) return null;
    
    return {
      ...collection,
      formatted: {
        cashAmount: formatCurrency(collection.cashAmount),
        receiptsAmount: formatCurrency(collection.receiptsAmount),
        expensesAmount: formatCurrency(collection.expensesAmount),
        shortageAmount: formatCurrency(collection.shortageAmount),
        overageAmount: formatCurrency(collection.overageAmount),
        totalCashCollected: formatCurrency(collection.totalCashCollected),
        totalDebtsIncurred: formatCurrency(collection.totalDebtsIncurred),
        grandTotal: formatCurrency(collection.grandTotal),
        cashVariance: formatCurrency(collection.cashVariance),
        variancePercentage: collection.variancePercentage ? 
          `${collection.variancePercentage.toFixed(2)}%` : 'N/A',
        countedAt: formatDate(collection.countedAt),
        verifiedAt: collection.verifiedAt ? formatDate(collection.verifiedAt) : 'Not Verified'
      },
      stationInfo: {
        name: collection.station?.name || 'Unknown Station',
        location: collection.station?.location || 'Unknown Location'
      },
      shiftInfo: {
        shiftNumber: collection.shift?.shiftNumber || 'N/A',
        supervisor: collection.shift?.supervisor ? 
          `${collection.shift.supervisor.firstName} ${collection.shift.supervisor.lastName}` : 'Unknown'
      },
      statusInfo: {
        label: collection.status,
        variant: getStatusVariant(collection.status),
        icon: getStatusIcon(collection.status)
      },
      countedByInfo: collection.countedBy ? 
        `${collection.countedBy.firstName} ${collection.countedBy.lastName}` : 'Unknown',
      verifiedByInfo: collection.verifiedBy ? 
        `${collection.verifiedBy.firstName} ${collection.verifiedBy.lastName}` : 'Not Verified'
    };
  },

  formatMoneyFlow: (moneyFlow) => {
    if (!moneyFlow) return null;
    
    const formatTransactionList = (transactions) => {
      return transactions?.map(tx => ({
        ...tx,
        formattedAmount: formatCurrency(tx.amount),
        formattedDate: formatDate(tx.transactionDate || tx.createdAt)
      })) || [];
    };
    
    return {
      ...moneyFlow,
      shiftCollection: moneyFlow.shiftCollection ? 
        collectionFormatters.formatShiftCollection(moneyFlow.shiftCollection) : null,
      moneyFlow: {
        cashToWallet: formatTransactionList(moneyFlow.moneyFlow?.cashToWallet),
        expensesFromWallet: formatTransactionList(moneyFlow.moneyFlow?.expensesFromWallet),
        debtsToDebtors: formatTransactionList(moneyFlow.moneyFlow?.debtsToDebtors),
        debtPayments: formatTransactionList(moneyFlow.moneyFlow?.debtPayments),
        staffLiabilities: formatTransactionList(moneyFlow.moneyFlow?.staffLiabilities),
        staffPayments: formatTransactionList(moneyFlow.moneyFlow?.staffPayments)
      },
      summary: moneyFlow.summary ? {
        totalCashMovedToWallet: formatCurrency(moneyFlow.summary.totalCashMovedToWallet),
        totalExpensesPaid: formatCurrency(moneyFlow.summary.totalExpensesPaid),
        totalNewDebtsRecorded: formatCurrency(moneyFlow.summary.totalNewDebtsRecorded),
        totalDebtPayments: formatCurrency(moneyFlow.summary.totalDebtPayments),
        totalStaffLiabilities: formatCurrency(moneyFlow.summary.totalStaffLiabilities),
        totalStaffPayments: formatCurrency(moneyFlow.summary.totalStaffPayments)
      } : null
    };
  },

  formatDailyReport: (report) => {
    if (!report) return null;
    
    return {
      ...report,
      formatted: {
        date: formatDate(report.date, 'short'),
        totalShiftCollections: report.summary?.totalShiftCollections || 0,
        totalCash: formatCurrency(report.summary?.totalCash),
        totalReceipts: formatCurrency(report.summary?.totalReceipts),
        totalExpenses: formatCurrency(report.summary?.totalExpenses),
        totalShortage: formatCurrency(report.summary?.totalShortage),
        totalOverage: formatCurrency(report.summary?.totalOverage),
        totalDebts: formatCurrency(report.summary?.totalDebtsIncurred),
        grandTotal: formatCurrency(report.summary?.grandTotal),
        totalCashCollected: formatCurrency(report.summary?.totalCashCollected),
        averageVariance: formatCurrency(report.summary?.averageVariance)
      },
      shiftCollections: (report.shiftCollections || []).map(sc => 
        collectionFormatters.formatShiftCollection(sc)
      )
    };
  },

  formatPerformanceReport: (report) => {
    if (!report) return null;
    
    const formatGroupedData = (groupedData) => {
      return groupedData?.map(group => ({
        ...group,
        formatted: {
          totalCash: formatCurrency(group.totalCash || group.totalCashCollected),
          totalDebts: formatCurrency(group.totalDebts),
          totalGrandTotal: formatCurrency(group.totalGrandTotal),
          averageUnitPrice: formatCurrency(group.averageUnitPrice || 0)
        }
      })) || [];
    };
    
    return {
      ...report,
      formatted: {
        period: report.period,
        startDate: formatDate(report.startDate, 'short'),
        endDate: formatDate(report.endDate, 'short'),
        groupBy: report.groupBy,
        totalShiftCollections: report.totalShiftCollections || 0,
        totalCash: formatCurrency(report.totalCash),
        totalDebts: formatCurrency(report.totalDebts),
        totalGrandTotal: formatCurrency(report.totalGrandTotal)
      },
      groupedData: formatGroupedData(report.groupedData)
    };
  },

  formatForTable: (data, type) => {
    if (!data || !Array.isArray(data)) {
      logger.warn(`No data to format for table (${type})`);
      return [];
    }
    
    switch (type) {
      case 'island-collections':
        return data.map(item => ({
          id: item.id,
          islandName: item.island?.name || item.island?.code || 'Unknown Island',
          attendantName: item.attendant ? 
            `${item.attendant.firstName} ${item.attendant.lastName}` : 'Unknown',
          stationName: item.shift?.station?.name || 'Unknown Station',
          cashAmount: item.cashAmount,
          totalCashCollected: item.totalCashCollected,
          shortageAmount: item.shortageAmount,
          overageAmount: item.overageAmount,
          status: item.status,
          countedAt: item.countedAt,
          
          // Formatted values
          formattedCashAmount: formatCurrency(item.cashAmount),
          formattedTotalCashCollected: formatCurrency(item.totalCashCollected),
          formattedShortageAmount: formatCurrency(item.shortageAmount),
          formattedOverageAmount: formatCurrency(item.overageAmount),
          formattedCountedAt: formatDate(item.countedAt, 'datetime'),
          statusVariant: getStatusVariant(item.status)
        }));
        
      case 'shift-collections':
        return data.map(item => ({
          id: item.id,
          shiftNumber: item.shift?.shiftNumber || 'N/A',
          stationName: item.station?.name || 'Unknown Station',
          supervisorName: item.shift?.supervisor ? 
            `${item.shift.supervisor.firstName} ${item.shift.supervisor.lastName}` : 'Unknown',
          cashAmount: item.cashAmount,
          totalCashCollected: item.totalCashCollected,
          totalDebtsIncurred: item.totalDebtsIncurred,
          grandTotal: item.grandTotal,
          cashVariance: item.cashVariance,
          status: item.status,
          countedAt: item.countedAt,
          countedBy: item.countedBy ? 
            `${item.countedBy.firstName} ${item.countedBy.lastName}` : 'Unknown',
          
          // Formatted values
          formattedCashAmount: formatCurrency(item.cashAmount),
          formattedTotalCashCollected: formatCurrency(item.totalCashCollected),
          formattedTotalDebts: formatCurrency(item.totalDebtsIncurred),
          formattedGrandTotal: formatCurrency(item.grandTotal),
          formattedCashVariance: formatCurrency(item.cashVariance),
          formattedCountedAt: formatDate(item.countedAt, 'datetime'),
          statusVariant: getStatusVariant(item.status)
        }));
        
      default:
        return data.map(item => ({
          id: item.id,
          ...item,
          formattedAmount: item.amount ? formatCurrency(item.amount) : 'N/A',
          formattedDate: item.date || item.createdAt || item.countedAt ? 
            formatDate(item.date || item.createdAt || item.countedAt) : 'N/A'
        }));
    }
  }
};

// Helper functions
const getStatusVariant = (status) => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'warning';
    case 'APPROVED':
    case 'VERIFIED':
      return 'success';
    case 'REJECTED':
    case 'DISPUTED':
      return 'danger';
    case 'UNDER_REVIEW':
      return 'info';
    default:
      return 'secondary';
  }
};

const getStatusIcon = (status) => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'clock';
    case 'APPROVED':
    case 'VERIFIED':
      return 'check-circle';
    case 'REJECTED':
    case 'DISPUTED':
      return 'x-circle';
    case 'UNDER_REVIEW':
      return 'eye';
    default:
      return 'file-text';
  }
};

// ========== MAIN COLLECTION SERVICE ==========

const CollectionService = {
  // ========== 1. ISLAND COLLECTIONS ==========
  getIslandCollections: async (filters = {}) => {
    logger.info('Fetching island collections', filters);
    
    try {
      const params = collectionFilters.buildCollectionQueryFilters(filters);
      const response = await apiService.get('/collections/island-collections', { params });
      const apiData = handleResponse(response, 'fetching island collections');
      
      // Normalize the API response
      const normalizedResult = normalizeCollectionResponse(apiData, 'island', filters);
      
      // Format data
      const formattedData = (normalizedResult.data || []).map(item => 
        collectionFormatters.formatIslandCollection(item)
      );
      
      const tableData = collectionFormatters.formatForTable(normalizedResult.data, 'island-collections');
      
      return {
        ...normalizedResult,
        data: formattedData,
        tableData,
        summary: normalizedResult.summary ? {
          ...normalizedResult.summary,
          formatted: {
            totalCash: formatCurrency(normalizedResult.summary.totalCash),
            totalCollections: normalizedResult.summary.totalCollections,
            totalShortage: formatCurrency(normalizedResult.summary.totalShortage),
            totalOverage: formatCurrency(normalizedResult.summary.totalOverage),
            totalDebts: formatCurrency(normalizedResult.summary.totalDebts),
            grandTotal: formatCurrency(normalizedResult.summary.grandTotal)
          }
        } : {}
      };
    } catch (error) {
      throw handleError(error, 'fetching island collections', 'Failed to fetch island collections');
    }
  },

  // ========== 2. SHIFT COLLECTIONS ==========
  getShiftCollections: async (filters = {}) => {
    logger.info('Fetching shift collections', filters);
    
    try {
      const params = collectionFilters.buildCollectionQueryFilters(filters);
      const response = await apiService.get('/collections/shift-collections', { params });
      const apiData = handleResponse(response, 'fetching shift collections');
      
      // Normalize the API response
      const normalizedResult = normalizeCollectionResponse(apiData, 'shift', filters);
      
      // Format data
      const formattedData = (normalizedResult.data || []).map(item => 
        collectionFormatters.formatShiftCollection(item)
      );
      
      const tableData = collectionFormatters.formatForTable(normalizedResult.data, 'shift-collections');
      
      return {
        ...normalizedResult,
        data: formattedData,
        tableData,
        summary: normalizedResult.summary ? {
          ...normalizedResult.summary,
          formatted: {
            totalCash: formatCurrency(normalizedResult.summary.totalCash),
            totalCollections: normalizedResult.summary.totalCollections,
            totalShortage: formatCurrency(normalizedResult.summary.totalShortage),
            totalOverage: formatCurrency(normalizedResult.summary.totalOverage),
            totalDebts: formatCurrency(normalizedResult.summary.totalDebts),
            grandTotal: formatCurrency(normalizedResult.summary.grandTotal),
            totalCashCollected: formatCurrency(normalizedResult.summary.totalCashCollected),
            averageVariance: formatCurrency(normalizedResult.summary.averageVariance)
          }
        } : {}
      };
    } catch (error) {
      throw handleError(error, 'fetching shift collections', 'Failed to fetch shift collections');
    }
  },

  // ========== 3. SINGLE SHIFT COLLECTION DETAILS ==========
  getShiftCollectionById: async (id, filters = {}) => {
    logger.info(`Fetching shift collection details: ${id}`, filters);
    
    try {
      const params = collectionFilters.buildShiftCollectionDetailFilters(filters);
      const response = await apiService.get(`/collections/shift-collections/${id}`, { params });
      const apiData = handleResponse(response, 'fetching shift collection details');
      
      // Format the detailed collection
      const formattedCollection = collectionFormatters.formatShiftCollection(apiData.data || apiData);
      
      return {
        success: true,
        data: formattedCollection,
        meta: {
          retrievedAt: new Date().toISOString(),
          collectionId: id
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching shift collection details', 'Failed to fetch shift collection details');
    }
  },

  // ========== 4. MONEY FLOW ==========
  getMoneyFlow: async (collectionId) => {
    logger.info(`Fetching money flow for collection: ${collectionId}`);
    
    try {
      const response = await apiService.get(`/collections/shift-collections/${collectionId}/money-flow`);
      const apiData = handleResponse(response, 'fetching money flow');
      
      // Format money flow data
      const formattedMoneyFlow = collectionFormatters.formatMoneyFlow(apiData.data || apiData);
      
      return {
        success: true,
        data: formattedMoneyFlow,
        meta: {
          retrievedAt: new Date().toISOString(),
          collectionId: collectionId
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching money flow', 'Failed to fetch money flow data');
    }
  },

  // ========== 5. DAILY REPORT ==========
  getDailyReport: async (filters = {}) => {
    logger.info('Fetching daily report', filters);
    
    try {
      const params = collectionFilters.buildDateReportFilters(filters);
      const response = await apiService.get('/collections/reports/daily', { params });
      const apiData = handleResponse(response, 'fetching daily report');
      
      // Format daily report
      const formattedReport = collectionFormatters.formatDailyReport(apiData.data || apiData);
      
      return {
        success: true,
        data: formattedReport,
        meta: {
          reportType: 'daily',
          generatedAt: new Date().toISOString(),
          filtersApplied: filters
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching daily report', 'Failed to fetch daily report');
    }
  },

  // ========== 6. PERFORMANCE REPORT ==========
  getPerformanceReport: async (filters = {}) => {
    logger.info('Fetching performance report', filters);
    
    try {
      const params = collectionFilters.buildDateReportFilters(filters);
      const response = await apiService.get('/collections/reports/performance', { params });
      const apiData = handleResponse(response, 'fetching performance report');
      
      // Format performance report
      const formattedReport = collectionFormatters.formatPerformanceReport(apiData.data || apiData);
      
      return {
        success: true,
        data: formattedReport,
        meta: {
          reportType: 'performance',
          generatedAt: new Date().toISOString(),
          filtersApplied: filters
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching performance report', 'Failed to fetch performance report');
    }
  },

  // ========== 7. DASHBOARD SUMMARY ==========
  getDashboardSummary: async () => {
    logger.info('Fetching dashboard summary');
    
    try {
      const response = await apiService.get('/collections/dashboard/summary');
      const apiData = handleResponse(response, 'fetching dashboard summary');
      
      // Format dashboard summary based on user role
      const formattedSummary = formatDashboardSummary(apiData.data || apiData);
      
      return {
        success: true,
        data: formattedSummary,
        meta: {
          retrievedAt: new Date().toISOString(),
          reportType: 'dashboard_summary'
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching dashboard summary', 'Failed to fetch dashboard summary');
    }
  },

  // ========== 8. CREATE ISLAND COLLECTION ==========
  createIslandCollection: async (data) => {
    logger.info('Creating island collection', data);
    
    try {
      const response = await apiService.post('/collections/island-collections', data);
      const apiData = handleResponse(response, 'creating island collection');
      
      return {
        success: true,
        data: apiData.data,
        message: 'Island collection created successfully'
      };
    } catch (error) {
      throw handleError(error, 'creating island collection', 'Failed to create island collection');
    }
  },

  // ========== 9. UPDATE COLLECTION STATUS ==========
  updateCollectionStatus: async (collectionId, status, type = 'shift', notes = '') => {
    logger.info(`Updating ${type} collection status: ${collectionId} to ${status}`);
    
    try {
      const response = await apiService.put(`/collections/${type}-collections/${collectionId}/status`, {
        status,
        notes
      });
      const apiData = handleResponse(response, 'updating collection status');
      
      return {
        success: true,
        data: apiData.data,
        message: 'Collection status updated successfully'
      };
    } catch (error) {
      throw handleError(error, 'updating collection status', 'Failed to update collection status');
    }
  },

  // ========== 10. VERIFY COLLECTION ==========
  verifyCollection: async (collectionId, type = 'shift', verificationData = {}) => {
    logger.info(`Verifying ${type} collection: ${collectionId}`);
    
    try {
      const response = await apiService.post(`/collections/${type}-collections/${collectionId}/verify`, verificationData);
      const apiData = handleResponse(response, 'verifying collection');
      
      return {
        success: true,
        data: apiData.data,
        message: 'Collection verified successfully'
      };
    } catch (error) {
      throw handleError(error, 'verifying collection', 'Failed to verify collection');
    }
  },

  // ========== 11. GET COLLECTION STATISTICS ==========
  getCollectionStats: async (period = 'today', stationId = null) => {
    logger.info(`Fetching collection statistics for period: ${period}, station: ${stationId}`);
    
    try {
      let startDate, endDate;
      const today = new Date().toISOString().split('T')[0];
      
      switch (period) {
        case 'today':
          startDate = today;
          endDate = today;
          break;
        case 'yesterday':
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = yesterday.toISOString().split('T')[0];
          endDate = startDate;
          break;
        case 'week':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
          endDate = today;
          break;
        case 'month':
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo.toISOString().split('T')[0];
          endDate = today;
          break;
        default:
          startDate = today;
          endDate = today;
      }
      
      const filters = {
        startDate,
        endDate,
        stationId,
        limit: 50
      };
      
      const [islandCollections, shiftCollections, dailyReport] = await Promise.all([
        this.getIslandCollections(filters).catch(() => ({ data: [], summary: {} })),
        this.getShiftCollections(filters).catch(() => ({ data: [], summary: {} })),
        this.getDailyReport(filters).catch(() => ({ data: null }))
      ]);
      
      const stats = {
        period,
        dateRange: { startDate, endDate },
        islandCollections: {
          count: islandCollections.summary?.totalCollections || 0,
          totalCash: islandCollections.summary?.totalCash || 0,
          totalShortage: islandCollections.summary?.totalShortage || 0,
          totalOverage: islandCollections.summary?.totalOverage || 0
        },
        shiftCollections: {
          count: shiftCollections.summary?.totalCollections || 0,
          totalCash: shiftCollections.summary?.totalCash || 0,
          totalDebts: shiftCollections.summary?.totalDebts || 0,
          grandTotal: shiftCollections.summary?.grandTotal || 0,
          averageVariance: shiftCollections.summary?.averageVariance || 0
        },
        dailySummary: dailyReport.data?.summary || {}
      };
      
      // Add formatted values
      stats.formatted = {
        periodLabel: getPeriodLabel(period),
        islandTotalCash: formatCurrency(stats.islandCollections.totalCash),
        shiftTotalCash: formatCurrency(stats.shiftCollections.totalCash),
        grandTotal: formatCurrency(stats.shiftCollections.grandTotal),
        averageVariance: formatCurrency(stats.shiftCollections.averageVariance)
      };
      
      return stats;
    } catch (error) {
      throw handleError(error, 'fetching collection statistics', 'Failed to fetch collection statistics');
    }
  },

  // ========== 12. EXPORT COLLECTION DATA ==========
  exportCollectionData: async (type, filters = {}, format = 'csv') => {
    logger.info(`Exporting ${type} collection data in ${format} format`);
    
    try {
      let data;
      
      switch (type) {
        case 'island-collections':
          const islandResult = await this.getIslandCollections(filters);
          data = islandResult.data;
          break;
        case 'shift-collections':
          const shiftResult = await this.getShiftCollections(filters);
          data = shiftResult.data;
          break;
        case 'daily-report':
          const dailyResult = await this.getDailyReport(filters);
          data = dailyResult.data ? [dailyResult.data] : [];
          break;
        case 'performance-report':
          const performanceResult = await this.getPerformanceReport(filters);
          data = performanceResult.data ? [performanceResult.data] : [];
          break;
        default:
          throw new Error(`Invalid export type: ${type}`);
      }
      
      // Convert to desired format
      if (format === 'csv') {
        return convertToCSV(data, type);
      } else if (format === 'excel') {
        return convertToExcel(data, type);
      } else if (format === 'json') {
        return JSON.stringify({ data, meta: { exportedAt: new Date().toISOString(), type, filters } }, null, 2);
      }
      
      throw new Error(`Unsupported export format: ${format}`);
    } catch (error) {
      throw handleError(error, 'exporting collection data', 'Failed to export collection data');
    }
  },

  // ========== 13. GET RECENT ACTIVITY ==========
  getRecentActivity: async (limit = 10) => {
    logger.info(`Fetching recent collection activity (limit: ${limit})`);
    
    try {
      // Get recent collections from different endpoints
      const recentFilters = {
        limit,
        sortBy: 'countedAt',
        sortOrder: 'desc'
      };
      
      const [recentIsland, recentShift] = await Promise.all([
        this.getIslandCollections(recentFilters).catch(() => ({ data: [] })),
        this.getShiftCollections(recentFilters).catch(() => ({ data: [] }))
      ]);
      
      // Combine and sort by date
      const allCollections = [
        ...(recentIsland.data || []).map(item => ({
          ...item,
          type: 'island',
          displayName: `Island: ${item.island?.name || item.island?.code || 'Unknown'}`
        })),
        ...(recentShift.data || []).map(item => ({
          ...item,
          type: 'shift',
          displayName: `Shift: ${item.shift?.shiftNumber || 'Unknown'} - ${item.station?.name || 'Unknown Station'}`
        }))
      ].sort((a, b) => new Date(b.countedAt) - new Date(a.countedAt)).slice(0, limit);
      
      return {
        success: true,
        data: allCollections,
        meta: {
          total: allCollections.length,
          retrievedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching recent activity', 'Failed to fetch recent activity');
    }
  }
};

// ========== HELPER FUNCTIONS ==========

const formatDashboardSummary = (summaryData) => {
  if (!summaryData) return {};
  
  const formatted = { ...summaryData };
  
  // Format numeric values
  if (formatted.companies) {
    formatted.formattedCompanies = formatted.companies.toLocaleString();
  }
  if (formatted.stations) {
    formatted.formattedStations = formatted.stations.toLocaleString();
  }
  if (formatted.todayCollections) {
    formatted.formattedTodayCollections = formatted.todayCollections.toLocaleString();
  }
  
  // Format monetary values
  if (formatted.totalCashCollected) {
    formatted.formattedTotalCashCollected = formatCurrency(formatted.totalCashCollected);
  }
  if (formatted.totalShortage) {
    formatted.formattedTotalShortage = formatCurrency(formatted.totalShortage);
  }
  if (formatted.totalOverage) {
    formatted.formattedTotalOverage = formatCurrency(formatted.totalOverage);
  }
  
  // Format recent collections
  if (formatted.recentCollections && Array.isArray(formatted.recentCollections)) {
    formatted.formattedRecentCollections = formatted.recentCollections.map(item => ({
      ...item,
      formattedAmount: item.cashAmount ? formatCurrency(item.cashAmount) : 'N/A',
      formattedDate: item.countedAt ? formatDate(item.countedAt, 'short') : 'N/A'
    }));
  }
  
  if (formatted.recentShifts && Array.isArray(formatted.recentShifts)) {
    formatted.formattedRecentShifts = formatted.recentShifts.map(item => ({
      ...item,
      formattedStartTime: item.startTime ? formatDate(item.startTime, 'datetime') : 'N/A',
      formattedEndTime: item.endTime ? formatDate(item.endTime, 'datetime') : 'N/A'
    }));
  }
  
  return formatted;
};

const getPeriodLabel = (period) => {
  switch (period) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case 'week':
      return 'Last 7 Days';
    case 'month':
      return 'Last 30 Days';
    default:
      return period;
  }
};

const convertToCSV = (data, type) => {
  if (!data || data.length === 0) return '';
  
  // Flatten the data for CSV
  const flatData = data.map(item => flattenObject(item));
  
  const headers = Object.keys(flatData[0] || {}).join(',');
  const rows = flatData.map(item => 
    Object.values(item).map(val => 
      typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
    ).join(',')
  );
  
  return [headers, ...rows].join('\n');
};

const flattenObject = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, key) => {
    const pre = prefix.length ? prefix + '.' : '';
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
      Object.assign(acc, flattenObject(obj[key], pre + key));
    } else if (Array.isArray(obj[key])) {
      // For arrays, join with semicolon or take first few items
      acc[pre + key] = obj[key].slice(0, 3).join('; ');
    } else {
      acc[pre + key] = obj[key];
    }
    
    return acc;
  }, {});
};

const convertToExcel = (data, type) => {
  // This would typically use a library like xlsx
  logger.warn('Excel export requires xlsx library - returning CSV instead');
  return convertToCSV(data, type);
};

// ========== SINGLE EXPORT ==========

// ✅ CORRECT: Default export
export default CollectionService;

// Named exports
export { 
  collectionFilters, 
  collectionFormatters,
  formatCurrency,
  formatDate
};