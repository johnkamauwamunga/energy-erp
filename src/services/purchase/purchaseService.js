import { apiService } from '../apiService';

class PurchaseService {
  constructor() {
    this.logger = {
      debug: (...args) => console.log('🔍 [PurchaseService]', ...args),
      info: (...args) => console.log('ℹ️ [PurchaseService]', ...args),
      warn: (...args) => console.warn('⚠️ [PurchaseService]', ...args),
      error: (...args) => console.error('❌ [PurchaseService]', ...args)
    };
    
    this.cache = new Map();
    this.CACHE_TTL = 2 * 60 * 1000; // 2 minutes
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
      return response.data.data;
    }
    
    if (response.data) {
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
          throw new Error('Purchase order not found.');
        
        case 400:
          return this.handleValidationError(data);
        
        case 409:
          throw new Error(data?.message || 'This action cannot be performed in the current status.');
        
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
  // PURCHASE CRUD OPERATIONS
  // =====================

  createPurchase = async (purchaseData) => {
    this.logger.info('Creating purchase:', purchaseData);
    this.debugRequest('POST', '/purchases', purchaseData);
    
    try {
      const response = await apiService.post('/purchases', purchaseData);
      this.debugResponse('POST', '/purchases', response);
      this.clearCache('purchases');
      return this.handleResponse(response, 'Purchase creation');
    } catch (error) {
      throw this.handleError(error, 'Purchase creation', 'Failed to create purchase order');
    }
  };

  getPurchases = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching purchases:', filters);
    
    const cacheKey = `purchases-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const url = query ? `/purchases?${query}` : '/purchases';
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Purchases fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Purchases fetch', 'Failed to fetch purchases');
    }
  };

  getPurchaseById = async (purchaseId, forceRefresh = false) => {
    this.logger.info(`Fetching purchase: ${purchaseId}`);
    
    const cacheKey = `purchase-${purchaseId}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      this.debugRequest('GET', `/purchases/${purchaseId}`);
      const response = await apiService.get(`/purchases/${purchaseId}`);
      this.debugResponse('GET', `/purchases/${purchaseId}`, response);
      
      const data = this.handleResponse(response, 'Purchase fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Purchase fetch', 'Failed to fetch purchase details');
    }
  };

  updatePurchaseStatus = async (purchaseId, status) => {
    this.logger.info(`Updating purchase status: ${purchaseId} -> ${status}`);
    
    try {
      this.debugRequest('PATCH', `/purchases/${purchaseId}/status`, { status });
      const response = await apiService.patch(`/purchases/${purchaseId}/status`, { status });
      this.debugResponse('PATCH', `/purchases/${purchaseId}/status`, response);
      this.clearCache('purchases');
      return this.handleResponse(response, 'Purchase status update');
    } catch (error) {
      throw this.handleError(error, 'Purchase status update', 'Failed to update purchase status');
    }
  };

  receiveNonFuelItems = async (purchaseId, receiveData) => {
    this.logger.info(`Receiving non-fuel items for purchase: ${purchaseId}`, receiveData);
    
    try {
      this.debugRequest('POST', `/purchases/${purchaseId}/receive-nonfuel`, receiveData);
      const response = await apiService.post(`/purchases/${purchaseId}/receive-nonfuel`, receiveData);
      this.debugResponse('POST', `/purchases/${purchaseId}/receive-nonfuel`, response);
      this.clearCache('purchases');
      return this.handleResponse(response, 'Non-fuel items receiving');
    } catch (error) {
      throw this.handleError(error, 'Non-fuel items receiving', 'Failed to receive non-fuel items');
    }
  };

  deletePurchase = async (purchaseId) => {
    this.logger.info(`Deleting purchase: ${purchaseId}`);
    
    try {
      this.debugRequest('DELETE', `/purchases/${purchaseId}`);
      const response = await apiService.delete(`/purchases/${purchaseId}`);
      this.debugResponse('DELETE', `/purchases/${purchaseId}`, response);
      this.clearCache('purchases');
      return this.handleResponse(response, 'Purchase deletion');
    } catch (error) {
      throw this.handleError(error, 'Purchase deletion', 'Failed to delete purchase');
    }
  };

  // =====================
  // PURCHASE STATUS MANAGEMENT
  // =====================

  getPurchaseStatusOptions = () => {
    return [
      { value: 'DRAFT', label: 'Draft', color: 'gray', canEdit: true },
      { value: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'orange', canEdit: false },
      { value: 'APPROVED', label: 'Approved', color: 'blue', canEdit: false },
      { value: 'ORDER_CONFIRMED', label: 'Order Confirmed', color: 'purple', canEdit: false },
      { value: 'IN_TRANSIT', label: 'In Transit', color: 'cyan', canEdit: false },
      { value: 'ARRIVED_AT_SITE', label: 'Arrived at Site', color: 'teal', canEdit: false },
      { value: 'QUALITY_CHECK', label: 'Quality Check', color: 'yellow', canEdit: false },
      { value: 'PARTIALLY_RECEIVED', label: 'Partially Received', color: 'indigo', canEdit: false },
      { value: 'COMPLETED', label: 'Completed', color: 'green', canEdit: false },
      { value: 'CANCELLED', label: 'Cancelled', color: 'red', canEdit: false },
      { value: 'REJECTED', label: 'Rejected', color: 'red', canEdit: false },
      { value: 'ON_HOLD', label: 'On Hold', color: 'gray', canEdit: false }
    ];
  };

  getDeliveryStatusOptions = () => {
    return [
      { value: 'PENDING', label: 'Pending', color: 'gray' },
      { value: 'DISPATCHED', label: 'Dispatched', color: 'blue' },
      { value: 'IN_TRANSIT', label: 'In Transit', color: 'orange' },
      { value: 'ARRIVED', label: 'Arrived', color: 'teal' },
      { value: 'UNLOADING', label: 'Unloading', color: 'purple' },
      { value: 'QUALITY_VERIFICATION', label: 'Quality Verification', color: 'yellow' },
      { value: 'PARTIALLY_ACCEPTED', label: 'Partially Accepted', color: 'indigo' },
      { value: 'FULLY_ACCEPTED', label: 'Fully Accepted', color: 'green' },
      { value: 'REJECTED', label: 'Rejected', color: 'red' },
      { value: 'RETURNED', label: 'Returned', color: 'red' }
    ];
  };

  getNextAllowedStatuses = (currentStatus) => {
    const statusFlow = {
      DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
      PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'ON_HOLD'],
      APPROVED: ['ORDER_CONFIRMED', 'CANCELLED'],
      ORDER_CONFIRMED: ['IN_TRANSIT', 'ON_HOLD'],
      IN_TRANSIT: ['ARRIVED_AT_SITE', 'ON_HOLD'],
      ARRIVED_AT_SITE: ['QUALITY_CHECK', 'ON_HOLD'],
      QUALITY_CHECK: ['PARTIALLY_RECEIVED', 'COMPLETED', 'REJECTED'],
      PARTIALLY_RECEIVED: ['COMPLETED', 'ON_HOLD'],
      ON_HOLD: ['PENDING_APPROVAL', 'APPROVED', 'ORDER_CONFIRMED', 'CANCELLED']
    };
    
    return statusFlow[currentStatus] || [];
  };

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validatePurchase = (purchaseData) => {
    const errors = [];
    
    if (!purchaseData.supplierId) errors.push('Supplier is required');
    if (!purchaseData.stationId) errors.push('Station is required');
    if (!purchaseData.purchaseDate) errors.push('Purchase date is required');
    if (!purchaseData.type) errors.push('Purchase type is required');
    
    // Validate items
    if (!purchaseData.items || purchaseData.items.length === 0) {
      errors.push('At least one purchase item is required');
    } else {
      purchaseData.items.forEach((item, index) => {
        if (!item.productId) errors.push(`Item ${index + 1}: Product is required`);
        if (!item.orderedQty || item.orderedQty <= 0) errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        if (!item.unitCost || item.unitCost <= 0) errors.push(`Item ${index + 1}: Unit cost must be greater than 0`);
        
        // Validate fuel items have tank
        if (item.productType === 'FUEL' && !item.tankId) {
          errors.push(`Item ${index + 1}: Tank selection is required for fuel products`);
        }
        
        // Validate non-fuel items have warehouse
        if (item.productType === 'NON_FUEL' && !purchaseData.warehouseId) {
          errors.push('Warehouse is required for non-fuel purchases');
        }
      });
    }
    
    return errors;
  };

  validateReceiveItems = (receiveData, purchaseItems) => {
    const errors = [];
    
    if (!receiveData.items || receiveData.items.length === 0) {
      errors.push('At least one item to receive is required');
      return errors;
    }
    
    receiveData.items.forEach((receiveItem, index) => {
      const purchaseItem = purchaseItems.find(item => item.id === receiveItem.purchaseItemId);
      
      if (!purchaseItem) {
        errors.push(`Item ${index + 1}: Purchase item not found`);
        return;
      }
      
      const remainingQty = purchaseItem.orderedQty - purchaseItem.receivedQty;
      
      if (!receiveItem.receivedQty || receiveItem.receivedQty <= 0) {
        errors.push(`Item ${index + 1}: Received quantity must be greater than 0`);
      }
      
      if (receiveItem.receivedQty > remainingQty) {
        errors.push(`Item ${index + 1}: Received quantity (${receiveItem.receivedQty}) exceeds remaining quantity (${remainingQty})`);
      }
      
      if (purchaseItem.product.type === 'NON_FUEL') {
        if (!receiveItem.batchNumber) {
          errors.push(`Item ${index + 1}: Batch number is required for non-fuel items`);
        }
      }
    });
    
    return errors;
  };

  // =====================
  // DATA TRANSFORMATIONS
  // =====================

  formatPurchaseForSubmit = (formData) => {
    return {
      ...formData,
      purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : new Date().toISOString(),
      expectedDate: formData.expectedDate ? new Date(formData.expectedDate).toISOString() : null,
      expectedDeliveryDate: formData.expectedDeliveryDate ? new Date(formData.expectedDeliveryDate).toISOString() : null,
      items: formData.items.map(item => ({
        productId: item.productId,
        orderedQty: Number(item.orderedQty),
        unitCost: Number(item.unitCost),
        tankId: item.tankId || null,
        batchNumber: item.batchNumber || null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : null
      }))
    };
  };

  formatPurchaseForDisplay = (purchase) => {
    if (!purchase) return null;
    
    const statusOption = this.getPurchaseStatusOptions().find(s => s.value === purchase.status);
    const deliveryStatusOption = this.getDeliveryStatusOptions().find(s => s.value === purchase.deliveryStatus);
    
    return {
      ...purchase,
      displayStatus: statusOption?.label || purchase.status,
      statusColor: statusOption?.color || 'gray',
      displayDeliveryStatus: deliveryStatusOption?.label || purchase.deliveryStatus,
      deliveryStatusColor: deliveryStatusOption?.color || 'gray',
      displayTotalAmount: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(purchase.totalAmount || 0),
      displayPurchaseDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString() : 'N/A',
      displayExpectedDate: purchase.expectedDate ? new Date(purchase.expectedDate).toLocaleDateString() : 'Not set',
      progressPercentage: this.calculatePurchaseProgress(purchase),
      canEdit: purchase.status === 'DRAFT',
      canDelete: purchase.status === 'DRAFT',
      canReceive: ['APPROVED', 'PARTIALLY_RECEIVED'].includes(purchase.status) && purchase.type !== 'FUEL'
    };
  };

  calculatePurchaseProgress = (purchase) => {
    if (!purchase.items || purchase.items.length === 0) return 0;
    
    const totalOrdered = purchase.items.reduce((sum, item) => sum + item.orderedQty, 0);
    const totalReceived = purchase.items.reduce((sum, item) => sum + item.receivedQty, 0);
    
    return totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
  };

  // =====================
  // ITEM MANAGEMENT
  // =====================

  calculateItemTotals = (items) => {
    return items.reduce((totals, item) => {
      const quantity = Number(item.orderedQty) || 0;
      const unitCost = Number(item.unitCost) || 0;
      const itemTotal = quantity * unitCost;
      
      return {
        totalQuantity: totals.totalQuantity + quantity,
        totalCost: totals.totalCost + itemTotal,
        itemCount: totals.itemCount + 1
      };
    }, { totalQuantity: 0, totalCost: 0, itemCount: 0 });
  };

  validateItemAddition = (newItem, existingItems) => {
    const errors = [];
    
    // Check for duplicate product
    const duplicateProduct = existingItems.find(item => 
      item.productId === newItem.productId && 
      item.tankId === newItem.tankId
    );
    
    if (duplicateProduct) {
      errors.push('This product is already in the purchase order');
    }
    
    // Validate quantities and costs
    if (!newItem.orderedQty || newItem.orderedQty <= 0) {
      errors.push('Quantity must be greater than 0');
    }
    
    if (!newItem.unitCost || newItem.unitCost <= 0) {
      errors.push('Unit cost must be greater than 0');
    }
    
    return errors;
  };

  // =====================
  // BATCH OPERATIONS
  // =====================

  batchUpdatePurchaseStatus = async (purchaseIds, status) => {
    this.logger.info(`Batch updating purchase status: ${purchaseIds.join(', ')} -> ${status}`);
    
    try {
      const promises = purchaseIds.map(purchaseId => 
        this.updatePurchaseStatus(purchaseId, status)
      );
      
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);
      
      return {
        successful,
        failed,
        total: purchaseIds.length,
        successCount: successful.length,
        failureCount: failed.length
      };
    } catch (error) {
      throw this.handleError(error, 'Batch status update', 'Failed to batch update purchase status');
    }
  };

  // =====================
  // ANALYTICS & REPORTING
  // =====================

  getPurchaseAnalytics = async (period = 'month') => {
    this.logger.info(`Fetching purchase analytics for period: ${period}`);
    
    try {
      const purchases = await this.getPurchases({}, true);
      
      const analytics = {
        totalPurchases: purchases.pagination?.totalCount || purchases.length || 0,
        totalSpent: purchases.reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0),
        pendingApproval: purchases.filter(p => p.status === 'PENDING_APPROVAL').length,
        inTransit: purchases.filter(p => p.status === 'IN_TRANSIT').length,
        completedThisMonth: purchases.filter(p => 
          p.status === 'COMPLETED' && 
          new Date(p.receivedDate).getMonth() === new Date().getMonth()
        ).length
      };
      
      return analytics;
    } catch (error) {
      throw this.handleError(error, 'Analytics fetch', 'Failed to fetch purchase analytics');
    }
  };

  // =====================
  // EXPORT UTILITIES
  // =====================

  exportPurchaseToPDF = async (purchaseId) => {
    this.logger.info(`Exporting purchase to PDF: ${purchaseId}`);
    
    try {
      const purchase = await this.getPurchaseById(purchaseId, true);
      return this.formatPurchaseForDisplay(purchase);
    } catch (error) {
      throw this.handleError(error, 'PDF export', 'Failed to export purchase to PDF');
    }
  };

  exportPurchasesToCSV = async (filters = {}) => {
    this.logger.info('Exporting purchases to CSV:', filters);
    
    try {
      const purchases = await this.getPurchases(filters, true);
      
      // Convert to CSV format
      const headers = ['Purchase Number', 'Supplier', 'Station', 'Total Amount', 'Status', 'Purchase Date'];
      const csvData = purchases.map(purchase => [
        purchase.purchaseNumber,
        purchase.supplier?.name || 'N/A',
        purchase.station?.name || 'N/A',
        purchase.totalAmount,
        purchase.status,
        new Date(purchase.purchaseDate).toLocaleDateString()
      ]);
      
      return [headers, ...csvData];
    } catch (error) {
      throw this.handleError(error, 'CSV export', 'Failed to export purchases to CSV');
    }
  };
}

export const purchaseService = new PurchaseService();
export default purchaseService;