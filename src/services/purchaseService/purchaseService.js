// src/services/purchaseService/purchaseService.js
import { apiService } from '../apiService';

// Enhanced logging utility
const logger = {
  debug: (...args) => console.log('🔍 [PurchaseService]', ...args),
  info: (...args) => console.log('ℹ️ [PurchaseService]', ...args),
  warn: (...args) => console.warn('⚠️ [PurchaseService]', ...args),
  error: (...args) => console.error('❌ [PurchaseService]', ...args)
};

// Request/Response debugging utilities
const debugRequest = (method, url, data) => {
  logger.debug(`➡️ ${method} ${url}`, data || '');
};

const debugResponse = (method, url, response) => {
  logger.debug(`⬅️ ${method} ${url} Response:`, response.data);
};

// Enhanced response handler utility
const handleResponse = (response, operation) => {
  // Handle nested success structure from backend
  if (response.data && response.data.success) {
    logger.debug(`${operation} successful`);
    return response.data.data; // Return the actual data payload
  }
  
  // Handle case where backend returns data directly
  if (response.data) {
    logger.debug(`${operation} successful (direct data)`);
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

// Enhanced error handler utility
const handleError = (error, operation, defaultMessage) => {
  logger.error(`Error during ${operation}:`, error);
  
  if (error.response) {
    const { status, data } = error.response;
    
    if (status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Authentication failed. Please login again.');
    }
    
    if (status === 403) {
      throw new Error('You do not have permission to perform this action');
    }
    
    if (status === 404) {
      throw new Error('Requested resource not found');
    }
    
    if (status === 400) {
      // Handle backend validation errors
      if (data.message) {
        throw new Error(data.message);
      }
      if (data.errors) {
        const errorMessages = Array.isArray(data.errors) 
          ? data.errors.map(err => err.message || err).join(', ')
          : JSON.stringify(data.errors);
        throw new Error(`Validation failed: ${errorMessages}`);
      }
    }
    
    // Handle backend error format
    if (data && data.message) {
      throw new Error(data.message);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

export const purchaseService = {
  // =====================
  // PURCHASE CRUD METHODS
  // =====================
  
  createPurchase: async (purchaseData) => {
    logger.info('Creating purchase:', purchaseData);
    debugRequest('POST', '/purchases', purchaseData);
    
    try {
      const response = await apiService.post('/purchases', purchaseData);
      debugResponse('POST', '/purchases', response);
      return handleResponse(response, 'creating purchase');
    } catch (error) {
      throw handleError(error, 'creating purchase', 'Failed to create purchase order');
    }
  },

  getPurchases: async (filters = {}) => {
    logger.info('Fetching purchases with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      
      // Handle array filters (like multiple statuses)
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
      
      const url = params.toString() ? `/purchases?${params.toString()}` : '/purchases';
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching purchases');
    } catch (error) {
      throw handleError(error, 'fetching purchases', 'Failed to fetch purchases');
    }
  },

  getPurchaseById: async (purchaseId) => {
    logger.info(`Fetching purchase: ${purchaseId}`);
    
    try {
      debugRequest('GET', `/purchases/${purchaseId}`);
      const response = await apiService.get(`/purchases/${purchaseId}`);
      debugResponse('GET', `/purchases/${purchaseId}`, response);
      return handleResponse(response, 'fetching purchase');
    } catch (error) {
      throw handleError(error, 'fetching purchase', 'Failed to fetch purchase');
    }
  },

  getPurchaseByNumber: async (purchaseNumber) => {
    logger.info(`Fetching purchase by number: ${purchaseNumber}`);
    
    try {
      debugRequest('GET', `/purchases/number/${purchaseNumber}`);
      const response = await apiService.get(`/purchases/number/${purchaseNumber}`);
      debugResponse('GET', `/purchases/number/${purchaseNumber}`, response);
      return handleResponse(response, 'fetching purchase by number');
    } catch (error) {
      throw handleError(error, 'fetching purchase by number', 'Failed to fetch purchase');
    }
  },

  updatePurchase: async (purchaseId, updateData) => {
    logger.info(`Updating purchase: ${purchaseId}`, updateData);
    
    try {
      debugRequest('PATCH', `/purchases/${purchaseId}`, updateData);
      const response = await apiService.patch(`/purchases/${purchaseId}`, updateData);
      debugResponse('PATCH', `/purchases/${purchaseId}`, response);
      return handleResponse(response, 'updating purchase');
    } catch (error) {
      throw handleError(error, 'updating purchase', 'Failed to update purchase');
    }
  },

  updatePurchaseStatus: async (purchaseId, status) => {
    logger.info(`Updating purchase status: ${purchaseId} to ${status}`);
    
    try {
      debugRequest('PATCH', `/purchases/${purchaseId}/status`, { status });
      const response = await apiService.patch(`/purchases/${purchaseId}/status`, { status });
      debugResponse('PATCH', `/purchases/${purchaseId}/status`, response);
      return handleResponse(response, 'updating purchase status');
    } catch (error) {
      throw handleError(error, 'updating purchase status', 'Failed to update purchase status');
    }
  },

  bulkUpdatePurchaseStatus: async (purchaseIds, status) => {
    logger.info(`Bulk updating purchase status for ${purchaseIds.length} purchases to ${status}`);
    
    try {
      debugRequest('PATCH', '/purchases/bulk/status', { purchaseIds, status });
      const response = await apiService.patch('/purchases/bulk/status', { purchaseIds, status });
      debugResponse('PATCH', '/purchases/bulk/status', response);
      return handleResponse(response, 'bulk updating purchase status');
    } catch (error) {
      throw handleError(error, 'bulk updating purchase status', 'Failed to bulk update purchase status');
    }
  },

  receiveNonFuelItems: async (purchaseId, receiveData) => {
    logger.info(`Receiving non-fuel items for purchase: ${purchaseId}`, receiveData);
    
    try {
      debugRequest('POST', `/purchases/${purchaseId}/receive-nonfuel`, receiveData);
      const response = await apiService.post(`/purchases/${purchaseId}/receive-nonfuel`, receiveData);
      debugResponse('POST', `/purchases/${purchaseId}/receive-nonfuel`, response);
      return handleResponse(response, 'receiving non-fuel items');
    } catch (error) {
      throw handleError(error, 'receiving non-fuel items', 'Failed to receive non-fuel items');
    }
  },

  deletePurchase: async (purchaseId) => {
    logger.info(`Deleting purchase: ${purchaseId}`);
    
    try {
      debugRequest('DELETE', `/purchases/${purchaseId}`);
      const response = await apiService.delete(`/purchases/${purchaseId}`);
      debugResponse('DELETE', `/purchases/${purchaseId}`, response);
      return handleResponse(response, 'deleting purchase');
    } catch (error) {
      throw handleError(error, 'deleting purchase', 'Failed to delete purchase');
    }
  },

  // =====================
  // SUPPLIER METHODS
  // =====================

  getSuppliers: async (activeOnly = true) => {
    logger.info(`Fetching suppliers, activeOnly: ${activeOnly}`);
    
    try {
      const url = `/purchases/suppliers?activeOnly=${activeOnly}`;
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching suppliers');
    } catch (error) {
      throw handleError(error, 'fetching suppliers', 'Failed to fetch suppliers');
    }
  },

  // =====================
  // PURCHASE ANALYTICS & REPORTING
  // =====================

  getPurchaseAnalytics: async (filters = {}) => {
    logger.info('Fetching purchase analytics with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/purchases/analytics?${params.toString()}` : '/purchases/analytics';
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching purchase analytics');
    } catch (error) {
      throw handleError(error, 'fetching purchase analytics', 'Failed to fetch purchase analytics');
    }
  },

  exportPurchases: async (filters = {}, format = 'csv') => {
    logger.info(`Exporting purchases in ${format} format with filters:`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/purchases/export?${params.toString()}&format=${format}`;
      debugRequest('GET', url);
      const response = await apiService.get(url, { responseType: 'blob' });
      
      // Handle file download
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `purchases-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      logger.debug('Export successful');
      return { success: true, message: 'Export completed successfully' };
    } catch (error) {
      throw handleError(error, 'exporting purchases', 'Failed to export purchases');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validatePurchase: (purchaseData) => {
    const errors = [];

    if (!purchaseData.supplierId) {
      errors.push('Supplier is required');
    }

    if (!purchaseData.stationId) {
      errors.push('Station is required');
    }

    if (!purchaseData.type) {
      errors.push('Purchase type is required');
    }

    if (!purchaseData.purchaseDate) {
      errors.push('Purchase date is required');
    }

    if (!purchaseData.items || purchaseData.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      purchaseData.items.forEach((item, index) => {
        if (!item.productId) {
          errors.push(`Item ${index + 1}: Product is required`);
        }
        if (!item.orderedQty || item.orderedQty <= 0) {
          errors.push(`Item ${index + 1}: Valid quantity is required`);
        }
        if (!item.unitCost || item.unitCost <= 0) {
          errors.push(`Item ${index + 1}: Valid unit cost is required`);
        }
        
        // Non-fuel specific validations
        if (purchaseData.type === 'NON_FUEL') {
          if (!purchaseData.warehouseId) {
            errors.push('Warehouse is required for non-fuel purchases');
          }
        }

        // Tax rate validation
        if (item.taxRate && (item.taxRate < 0 || item.taxRate > 1)) {
          errors.push(`Item ${index + 1}: Tax rate must be between 0 and 1 (0% to 100%)`);
        }
      });
    }

    // Date validations
    if (purchaseData.expectedDate && purchaseData.purchaseDate) {
      const purchaseDate = new Date(purchaseData.purchaseDate);
      const expectedDate = new Date(purchaseData.expectedDate);
      if (expectedDate < purchaseDate) {
        errors.push('Expected date must be on or after purchase date');
      }
    }

    if (purchaseData.expectedDeliveryDate && purchaseData.purchaseDate) {
      const purchaseDate = new Date(purchaseData.purchaseDate);
      const expectedDeliveryDate = new Date(purchaseData.expectedDeliveryDate);
      if (expectedDeliveryDate < purchaseDate) {
        errors.push('Expected delivery date must be on or after purchase date');
      }
    }

    return errors;
  },

  validatePurchaseStatusUpdate: (currentStatus, newStatus) => {
    const allowedTransitions = {
      'DRAFT': ['PENDING_APPROVAL', 'CANCELLED'],
      'PENDING_APPROVAL': ['APPROVED', 'REJECTED', 'ON_HOLD'],
      'APPROVED': ['ORDER_CONFIRMED', 'CANCELLED'],
      'ORDER_CONFIRMED': ['IN_TRANSIT', 'CANCELLED'],
      'IN_TRANSIT': ['ARRIVED_AT_SITE', 'CANCELLED'],
      'ARRIVED_AT_SITE': ['QUALITY_CHECK', 'REJECTED'],
      'QUALITY_CHECK': ['PARTIALLY_RECEIVED', 'FULLY_ACCEPTED', 'REJECTED'],
      'PARTIALLY_RECEIVED': ['COMPLETED'],
      'COMPLETED': [],
      'CANCELLED': [],
      'REJECTED': [],
      'ON_HOLD': ['APPROVED', 'CANCELLED']
    };

    if (!allowedTransitions[currentStatus]) {
      return `Current status '${currentStatus}' is not valid`;
    }

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      return `Cannot transition from '${currentStatus}' to '${newStatus}'`;
    }

    return null;
  },

  // =====================
  // UTILITY METHODS
  // =====================

  formatPurchase: (purchase) => {
    if (!purchase) return null;
    
    const grossAmount = purchase.grossAmount || 0;
    const totalTaxAmount = purchase.totalTaxAmount || 0;
    const discountAmount = purchase.discountAmount || 0;
    const netPayable = purchase.netPayable || 0;
    
    return {
      ...purchase,
      displayNumber: purchase.purchaseNumber,
      supplierName: purchase.supplier?.name,
      stationName: purchase.station?.name,
      warehouseName: purchase.warehouse?.name,
      
      // Financial displays
      grossAmountDisplay: `$${grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalTaxAmountDisplay: `$${totalTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      discountAmountDisplay: `$${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      netPayableDisplay: `$${netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      
      statusBadge: purchase.status?.toLowerCase().replace(/_/g, '-'),
      deliveryStatusBadge: purchase.deliveryStatus?.toLowerCase().replace(/_/g, '-'),
      itemCount: purchase.items?.length || 0,
      createdByName: purchase.createdBy ? `${purchase.createdBy.firstName} ${purchase.createdBy.lastName}` : 'N/A',
      isFuelPurchase: purchase.type === 'FUEL',
      isEditable: ['DRAFT', 'PENDING_APPROVAL'].includes(purchase.status),
      isDeletable: purchase.status === 'DRAFT',
      
      // Progress indicators
      receivedPercentage: purchaseService.calculatePurchaseReceivedPercentage(purchase),
      isFullyReceived: purchaseService.isPurchaseFullyReceived(purchase),
      
      // Quick status checks
      isDraft: purchase.status === 'DRAFT',
      isPendingApproval: purchase.status === 'PENDING_APPROVAL',
      isApproved: purchase.status === 'APPROVED',
      isCompleted: purchase.status === 'COMPLETED',
      isCancelled: purchase.status === 'CANCELLED'
    };
  },

  formatPurchaseItem: (item) => {
    if (!item) return null;
    
    const grossAmount = item.grossAmount || 0;
    const taxAmount = item.taxAmount || 0;
    const netAmount = item.netAmount || 0;
    const unitCost = item.unitCost || 0;
    
    return {
      ...item,
      productName: item.product?.name,
      productCode: item.product?.fuelCode || item.product?.sku,
      productType: item.product?.type,
      
      // Financial displays
      grossAmountDisplay: `$${grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      taxAmountDisplay: item.taxRate && item.taxRate > 0 ? `$${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Tax Free',
      netAmountDisplay: `$${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      unitCostDisplay: `$${unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      taxRateDisplay: item.taxRate ? `${(item.taxRate * 100).toFixed(2)}%` : '0%',
      
      receivedPercentage: item.orderedQty > 0 ? (item.receivedQty / item.orderedQty) * 100 : 0,
      isFullyReceived: item.receivedQty >= item.orderedQty,
      variance: item.orderedQty - item.receivedQty,
      varianceDisplay: (item.orderedQty - item.receivedQty)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      
      // Quick status
      isReceived: item.receivedQty > 0,
      isPartiallyReceived: item.receivedQty > 0 && item.receivedQty < item.orderedQty
    };
  },

  calculatePurchaseReceivedPercentage: (purchase) => {
    if (!purchase.items || purchase.items.length === 0) return 0;
    
    const totalOrdered = purchase.items.reduce((sum, item) => sum + (item.orderedQty || 0), 0);
    const totalReceived = purchase.items.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
    
    return totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
  },

  isPurchaseFullyReceived: (purchase) => {
    if (!purchase.items || purchase.items.length === 0) return false;
    return purchase.items.every(item => (item.receivedQty || 0) >= (item.orderedQty || 0));
  },

  calculatePurchaseTotals: (items) => {
    const totals = {
      grossAmount: 0,
      totalTaxAmount: 0,
      discountAmount: 0,
      netPayable: 0,
      taxableAmount: 0,
      taxFreeAmount: 0,
      itemCount: items.length
    };

    items.forEach(item => {
      const orderedQty = parseFloat(item.orderedQty) || 0;
      const unitCost = parseFloat(item.unitCost) || 0;
      const taxRate = parseFloat(item.taxRate) || 0;
      
      const itemGrossAmount = orderedQty * unitCost;
      const itemTaxAmount = itemGrossAmount * taxRate;
      
      totals.grossAmount += itemGrossAmount;
      totals.totalTaxAmount += itemTaxAmount;
      
      if (taxRate > 0) {
        totals.taxableAmount += itemGrossAmount;
      } else {
        totals.taxFreeAmount += itemGrossAmount;
      }
    });

    totals.netPayable = totals.grossAmount + totals.totalTaxAmount - totals.discountAmount;
    
    // Format for display
    return {
      ...totals,
      grossAmountDisplay: `$${totals.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalTaxAmountDisplay: `$${totals.totalTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      discountAmountDisplay: `$${totals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      netPayableDisplay: `$${totals.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      taxableAmountDisplay: `$${totals.taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      taxFreeAmountDisplay: `$${totals.taxFreeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    };
  },

  // =====================
  // SEARCH & FILTER METHODS
  // =====================

  searchPurchases: async (searchTerm, additionalFilters = {}) => {
    logger.info(`Searching purchases for: "${searchTerm}"`, additionalFilters);
    
    try {
      const filters = {
        search: searchTerm,
        ...additionalFilters
      };
      
      return await purchaseService.getPurchases(filters);
    } catch (error) {
      throw handleError(error, 'searching purchases', 'Failed to search purchases');
    }
  },

  // Get purchases by supplier
  getPurchasesBySupplier: async (supplierId, filters = {}) => {
    logger.info(`Fetching purchases for supplier: ${supplierId}`, filters);
    
    try {
      return await purchaseService.getPurchases({ supplierId, ...filters });
    } catch (error) {
      throw handleError(error, 'fetching supplier purchases', 'Failed to fetch supplier purchases');
    }
  },

  // Get purchases by station
  getPurchasesByStation: async (stationId, filters = {}) => {
    logger.info(`Fetching purchases for station: ${stationId}`, filters);
    
    try {
      return await purchaseService.getPurchases({ stationId, ...filters });
    } catch (error) {
      throw handleError(error, 'fetching station purchases', 'Failed to fetch station purchases');
    }
  },

  // Get pending approvals
  getPendingApprovals: async (filters = {}) => {
    logger.info('Fetching pending approvals', filters);
    
    try {
      return await purchaseService.getPurchases({ status: 'PENDING_APPROVAL', ...filters });
    } catch (error) {
      throw handleError(error, 'fetching pending approvals', 'Failed to fetch pending approvals');
    }
  },

  // Get recent purchases
  getRecentPurchases: async (limit = 10) => {
    logger.info(`Fetching recent purchases: ${limit}`);
    
    try {
      const result = await purchaseService.getPurchases({ page: 1, limit });
      return result.purchases ? result.purchases.slice(0, limit) : result.slice(0, limit);
    } catch (error) {
      throw handleError(error, 'fetching recent purchases', 'Failed to fetch recent purchases');
    }
  },

  // Get purchases by status
  getPurchasesByStatus: async (status, filters = {}) => {
    logger.info(`Fetching purchases with status: ${status}`, filters);
    
    try {
      return await purchaseService.getPurchases({ status, ...filters });
    } catch (error) {
      throw handleError(error, `fetching ${status} purchases`, `Failed to fetch ${status} purchases`);
    }
  },

  // =====================
  // CONSTANTS & OPTIONS
  // =====================

  getPurchaseStatusOptions: () => {
    return [
      { value: 'DRAFT', label: 'Draft', color: 'gray', badge: 'default' },
      { value: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'orange', badge: 'processing' },
      { value: 'APPROVED', label: 'Approved', color: 'blue', badge: 'processing' },
      { value: 'ORDER_CONFIRMED', label: 'Order Confirmed', color: 'purple', badge: 'processing' },
      { value: 'IN_TRANSIT', label: 'In Transit', color: 'orange', badge: 'processing' },
      { value: 'ARRIVED_AT_SITE', label: 'Arrived at Site', color: 'cyan', badge: 'processing' },
      { value: 'QUALITY_CHECK', label: 'Quality Check', color: 'gold', badge: 'processing' },
      { value: 'PARTIALLY_RECEIVED', label: 'Partially Received', color: 'geekblue', badge: 'processing' },
      { value: 'COMPLETED', label: 'Completed', color: 'green', badge: 'success' },
      { value: 'CANCELLED', label: 'Cancelled', color: 'red', badge: 'error' },
      { value: 'REJECTED', label: 'Rejected', color: 'red', badge: 'error' },
      { value: 'ON_HOLD', label: 'On Hold', color: 'gray', badge: 'default' }
    ];
  },

  getDeliveryStatusOptions: () => {
    return [
      { value: 'PENDING', label: 'Pending', color: 'gray', badge: 'default' },
      { value: 'DISPATCHED', label: 'Dispatched', color: 'blue', badge: 'processing' },
      { value: 'IN_TRANSIT', label: 'In Transit', color: 'orange', badge: 'processing' },
      { value: 'ARRIVED', label: 'Arrived', color: 'cyan', badge: 'processing' },
      { value: 'UNLOADING', label: 'Unloading', color: 'purple', badge: 'processing' },
      { value: 'QUALITY_VERIFICATION', label: 'Quality Verification', color: 'gold', badge: 'processing' },
      { value: 'PARTIALLY_ACCEPTED', label: 'Partially Accepted', color: 'geekblue', badge: 'processing' },
      { value: 'FULLY_ACCEPTED', label: 'Fully Accepted', color: 'green', badge: 'success' },
      { value: 'REJECTED', label: 'Rejected', color: 'red', badge: 'error' },
      { value: 'RETURNED', label: 'Returned', color: 'red', badge: 'error' }
    ];
  },

  getPurchaseTypeOptions: () => {
    return [
      { value: 'FUEL', label: 'Fuel', color: 'blue' },
      { value: 'NON_FUEL', label: 'Non-Fuel', color: 'green' },
      { value: 'MIXED', label: 'Mixed', color: 'purple' }
    ];
  },

  // =====================
  // HELPER METHODS
  // =====================

  getStatusColor: (status) => {
    const statusConfig = {
      'DRAFT': 'gray',
      'PENDING_APPROVAL': 'orange',
      'APPROVED': 'blue',
      'ORDER_CONFIRMED': 'purple',
      'IN_TRANSIT': 'orange',
      'ARRIVED_AT_SITE': 'cyan',
      'QUALITY_CHECK': 'gold',
      'PARTIALLY_RECEIVED': 'geekblue',
      'COMPLETED': 'green',
      'CANCELLED': 'red',
      'REJECTED': 'red',
      'ON_HOLD': 'gray'
    };
    return statusConfig[status] || 'gray';
  },

  getStatusLabel: (status) => {
    const statusConfig = {
      'DRAFT': 'Draft',
      'PENDING_APPROVAL': 'Pending Approval',
      'APPROVED': 'Approved',
      'ORDER_CONFIRMED': 'Order Confirmed',
      'IN_TRANSIT': 'In Transit',
      'ARRIVED_AT_SITE': 'Arrived at Site',
      'QUALITY_CHECK': 'Quality Check',
      'PARTIALLY_RECEIVED': 'Partially Received',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
      'REJECTED': 'Rejected',
      'ON_HOLD': 'On Hold'
    };
    return statusConfig[status] || status;
  },

  canEditPurchase: (purchase) => {
    return purchase && ['DRAFT', 'PENDING_APPROVAL'].includes(purchase.status);
  },

  canDeletePurchase: (purchase) => {
    return purchase && purchase.status === 'DRAFT';
  },

  canApprovePurchase: (purchase) => {
    return purchase && purchase.status === 'PENDING_APPROVAL';
  },

  // =====================
  // CACHE & PERFORMANCE
  // =====================

  // Simple in-memory cache (optional)
  _cache: new Map(),
  _cacheTimeout: 5 * 60 * 1000, // 5 minutes

  getCached: (key) => {
    const item = purchaseService._cache.get(key);
    if (item && Date.now() - item.timestamp < purchaseService._cacheTimeout) {
      return item.data;
    }
    return null;
  },

  setCached: (key, data) => {
    purchaseService._cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },

  clearCache: () => {
    purchaseService._cache.clear();
  }
};

export default purchaseService;