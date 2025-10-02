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
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
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
      
      const url = params.toString() ? `/purchases/analytics/summary?${params.toString()}` : '/purchases/analytics/summary';
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching purchase analytics');
    } catch (error) {
      throw handleError(error, 'fetching purchase analytics', 'Failed to fetch purchase analytics');
    }
  },

  getPurchaseStats: async (period = 'monthly') => {
    logger.info(`Fetching purchase stats for period: ${period}`);
    
    try {
      debugRequest('GET', `/purchases/stats?period=${period}`);
      const response = await apiService.get(`/purchases/stats?period=${period}`);
      debugResponse('GET', `/purchases/stats?period=${period}`, response);
      return handleResponse(response, 'fetching purchase stats');
    } catch (error) {
      throw handleError(error, 'fetching purchase stats', 'Failed to fetch purchase statistics');
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
        
        // Fuel-specific validations
        if (purchaseData.type === 'FUEL') {
          if (!item.tankId) {
            errors.push(`Item ${index + 1}: Tank is required for fuel purchases`);
          }
        }
        
        // Non-fuel specific validations
        if (purchaseData.type === 'NON_FUEL') {
          if (!purchaseData.warehouseId) {
            errors.push('Warehouse is required for non-fuel purchases');
          }
        }
      });
    }

    return errors;
  },

  validatePurchaseStatusUpdate: (currentStatus, newStatus) => {
    const allowedTransitions = {
      'DRAFT': ['PENDING_APPROVAL', 'CANCELLED'],
      'PENDING_APPROVAL': ['APPROVED', 'REJECTED'],
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
    
    return {
      ...purchase,
      displayNumber: purchase.purchaseNumber,
      supplierName: purchase.supplier?.name,
      stationName: purchase.station?.name,
      totalAmountDisplay: `$${purchase.totalAmount?.toLocaleString()}`,
      statusBadge: purchase.status?.toLowerCase().replace('_', '-'),
      deliveryStatusBadge: purchase.deliveryStatus?.toLowerCase().replace('_', '-'),
      itemCount: purchase.items?.length || 0,
      createdByName: purchase.createdBy ? `${purchase.createdBy.firstName} ${purchase.createdBy.lastName}` : 'N/A',
      isFuelPurchase: purchase.type === 'FUEL',
      isEditable: ['DRAFT', 'PENDING_APPROVAL'].includes(purchase.status),
      isDeletable: purchase.status === 'DRAFT'
    };
  },

  formatPurchaseItem: (item) => {
    if (!item) return null;
    
    return {
      ...item,
      productName: item.product?.name,
      productCode: item.product?.fuelCode || item.product?.sku,
      totalCostDisplay: `$${item.totalCost?.toLocaleString()}`,
      unitCostDisplay: `$${item.unitCost?.toLocaleString()}`,
      receivedPercentage: item.orderedQty > 0 ? (item.receivedQty / item.orderedQty) * 100 : 0,
      isFullyReceived: item.receivedQty >= item.orderedQty,
      tankName: item.tank?.asset?.name || 'N/A'
    };
  },

  calculatePurchaseTotals: (items) => {
    const totals = {
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0
    };

    items.forEach(item => {
      const itemTotal = item.orderedQty * item.unitCost;
      totals.subtotal += itemTotal;
    });

    totals.total = totals.subtotal - totals.discount + totals.tax;
    return totals;
  },

  // Search purchases with advanced filtering
  searchPurchases: async (searchTerm, additionalFilters = {}) => {
    logger.info(`Searching purchases for: "${searchTerm}"`, additionalFilters);
    
    try {
      const filters = {
        search: searchTerm,
        ...additionalFilters
      };
      
      return await this.getPurchases(filters);
    } catch (error) {
      throw handleError(error, 'searching purchases', 'Failed to search purchases');
    }
  },

  // Get purchases by supplier
  getPurchasesBySupplier: async (supplierId, filters = {}) => {
    logger.info(`Fetching purchases for supplier: ${supplierId}`, filters);
    
    try {
      return await this.getPurchases({ supplierId, ...filters });
    } catch (error) {
      throw handleError(error, 'fetching supplier purchases', 'Failed to fetch supplier purchases');
    }
  },

  // Get purchases by station
  getPurchasesByStation: async (stationId, filters = {}) => {
    logger.info(`Fetching purchases for station: ${stationId}`, filters);
    
    try {
      return await this.getPurchases({ stationId, ...filters });
    } catch (error) {
      throw handleError(error, 'fetching station purchases', 'Failed to fetch station purchases');
    }
  },

  // Get pending approvals
  getPendingApprovals: async (filters = {}) => {
    logger.info('Fetching pending approvals', filters);
    
    try {
      return await this.getPurchases({ status: 'PENDING_APPROVAL', ...filters });
    } catch (error) {
      throw handleError(error, 'fetching pending approvals', 'Failed to fetch pending approvals');
    }
  },

  // Get recent purchases
  getRecentPurchases: async (limit = 10) => {
    logger.info(`Fetching recent purchases: ${limit}`);
    
    try {
      const purchases = await this.getPurchases({ page: 1, limit });
      return purchases.slice(0, limit);
    } catch (error) {
      throw handleError(error, 'fetching recent purchases', 'Failed to fetch recent purchases');
    }
  }
};

// =====================================================================
// PAYLOAD EXAMPLES FOR PURCHASE MANAGEMENT
// =====================================================================

/*
// CREATE FUEL PURCHASE PAYLOAD (Diesel from Vivo Energy Example):
const fuelPurchasePayload = {
  supplierId: "d1f9d996-fe58-4264-ab67-750392797157",
  stationId: "d2aecaeb-a1a2-441c-b323-b3f24146c169", 
  warehouseId: null,
  purchaseDate: "2024-01-15T10:00:00.000Z",
  expectedDate: "2024-01-17T10:00:00.000Z",
  type: "FUEL",
  expectedDeliveryDate: "2024-01-17T10:00:00.000Z",
  supplierRef: "VE-PO-2024-001",
  internalRef: "INT-PO-DSL-2024-001",
  termsAndConditions: "Standard payment terms: Net 30 days",
  deliveryAddress: "Main Station, Westlands, Nairobi",
  notes: "Monthly diesel supply from Vivo Energy - Regular Automotive Diesel",
  reference: "MONTHLY-DIESEL-JAN",
  items: [
    {
      productId: "f3f55173-0f6d-4d00-ae03-d00683f0c636",
      orderedQty: 10000,
      unitCost: 125,
      tankId: "26874315-f9a9-4250-8328-590dd6080753"
    }
  ]
};

// CREATE NON-FUEL PURCHASE PAYLOAD (Lubricants Example):
const nonFuelPurchasePayload = {
  supplierId: "d1f9d996-fe58-4264-ab67-750392797157",
  stationId: "d2aecaeb-a1a2-441c-b323-b3f24146c169",
  warehouseId: "123e4567-e89b-12d3-a456-426614174004",
  purchaseDate: "2024-01-15T10:00:00.000Z",
  expectedDate: "2024-01-17T10:00:00.000Z",
  type: "NON_FUEL",
  expectedDeliveryDate: "2024-01-17T10:00:00.000Z",
  supplierRef: "SUP-NF-2024-001",
  internalRef: "INT-PO-NF-2024-001",
  termsAndConditions: "Immediate payment upon delivery",
  deliveryAddress: "Main Station, Westlands, Nairobi",
  notes: "Engine oil and lubricants purchase",
  reference: "LUBRICANTS-JAN",
  items: [
    {
      productId: "123e4567-e89b-12d3-a456-426614174005",
      orderedQty: 50,
      unitCost: 15.50,
      batchNumber: "BATCH-ENG-OIL-001",
      expiryDate: "2025-12-31T00:00:00.000Z"
    },
    {
      productId: "123e4567-e89b-12d3-a456-426614174006",
      orderedQty: 100,
      unitCost: 8.75,
      batchNumber: "BATCH-GREASE-001",
      expiryDate: "2026-06-30T00:00:00.000Z"
    }
  ]
};

// UPDATE PURCHASE STATUS PAYLOAD:
const updateStatusPayload = {
  status: "APPROVED" // or "PENDING_APPROVAL", "ORDER_CONFIRMED", "CANCELLED", etc.
};

// RECEIVE NON-FUEL ITEMS PAYLOAD:
const receiveNonFuelPayload = {
  items: [
    {
      purchaseItemId: "123e4567-e89b-12d3-a456-42661417400a",
      receivedQty: 50,
      batchNumber: "BATCH-ENG-OIL-001",
      expiryDate: "2025-12-31T00:00:00.000Z"
    },
    {
      purchaseItemId: "123e4567-e89b-12d3-a456-42661417400b",
      receivedQty: 100,
      batchNumber: "BATCH-GREASE-001",
      expiryDate: "2026-06-30T00:00:00.000Z"
    }
  ]
};

// FILTER EXAMPLES:
const purchaseFilters = {
  status: "PENDING_APPROVAL",
  type: "FUEL",
  stationId: "d2aecaeb-a1a2-441c-b323-b3f24146c169",
  supplierId: "d1f9d996-fe58-4264-ab67-750392797157",
  deliveryStatus: "PENDING",
  page: 1,
  limit: 10
};
*/

export default purchaseService;