// src/services/nonFuelPurchaseService.js
import { apiService } from '../apiService';

// Enhanced logging utility with production control
const logger = {
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [NonFuelPurchaseService]', ...args);
    }
  },
  info: (...args) => console.log('ℹ️ [NonFuelPurchaseService]', ...args),
  warn: (...args) => console.warn('⚠️ [NonFuelPurchaseService]', ...args),
  error: (...args) => console.error('❌ [NonFuelPurchaseService]', ...args)
};

// Enhanced error handler with specific messages
const handleError = (error, operation, context = {}) => {
  const errorMessages = {
    createPurchase: 'Failed to create non-fuel purchase',
    getPurchases: 'Failed to fetch purchases',
    getPurchaseById: 'Failed to fetch purchase details',
    getPurchaseByNumber: 'Failed to fetch purchase by number',
    updatePurchase: 'Failed to update purchase',
    updatePurchaseStatus: 'Failed to update purchase status',
    deletePurchase: 'Failed to delete purchase',
    getPurchasesByStation: 'Failed to fetch purchases by station',
    getSuppliers: 'Failed to fetch suppliers',
    getPurchaseAnalytics: 'Failed to fetch purchase analytics',
    getPurchaseAnalyticsByStation: 'Failed to fetch station purchase analytics',
    getPurchaseSummaryReport: 'Failed to fetch purchase summary report',
    getDetailedPurchaseReport: 'Failed to fetch detailed purchase report',
    exportPurchasesCSV: 'Failed to export purchases CSV',
    createReceiving: 'Failed to create receiving',
    getReceivings: 'Failed to fetch receivings',
    getReceivingById: 'Failed to fetch receiving details',
    getReceivingByNumber: 'Failed to fetch receiving by number',
    updateReceiving: 'Failed to update receiving',
    updateReceivingStatus: 'Failed to update receiving status',
    addReceivingItem: 'Failed to add receiving item',
    updateReceivingItem: 'Failed to update receiving item',
    deleteReceivingItem: 'Failed to delete receiving item',
    approveReceiving: 'Failed to approve receiving',
    createItemReceipt: 'Failed to create item receipt',
    getItemReceiptById: 'Failed to fetch item receipt',
    getItemReceiptsByPurchase: 'Failed to fetch item receipts by purchase',
    addReceivingDocument: 'Failed to add receiving document',
    getReceivingDocuments: 'Failed to fetch receiving documents',
    deleteReceivingDocument: 'Failed to delete receiving document',
    getWarehouseStock: 'Failed to fetch warehouse stock',
    getProductStock: 'Failed to fetch product stock',
    getStockAlerts: 'Failed to fetch stock alerts',
    getReorderSuggestions: 'Failed to fetch reorder suggestions'
  };

  logger.error(`Error during ${operation}:`, { error, context });

  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        throw new Error(data.message || 'Invalid request data');
      case 401:
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      case 403:
        throw new Error('You do not have permission for this action');
      case 404:
        throw new Error(data.message || 'Requested resource not found');
      case 409:
        throw new Error(data.message || 'Resource already exists');
      case 422:
        const validationErrors = data.errors 
          ? Object.values(data.errors).flat().join(', ')
          : data.message;
        throw new Error(`Validation failed: ${validationErrors}`);
      case 500:
        throw new Error('Server error. Please try again later.');
      default:
        throw new Error(data?.message || errorMessages[operation] || 'Operation failed');
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection.');
  } else {
    throw new Error(error.message || errorMessages[operation] || 'Unexpected error occurred');
  }
};

// Response handler for paginated responses
const handleResponse = (response, operation) => {
  if (response.data && response.data.success) {
    // Return both data and pagination if available
    if (response.data.pagination) {
      return {
        data: response.data.data,
        pagination: response.data.pagination
      };
    }
    return response.data.data;
  }
  
  if (response.data) {
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}`);
  throw new Error('Invalid server response format');
};

// Request builder with query parameters
const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => params.append(key, item));
      } else if (typeof value === 'boolean') {
        params.append(key, value.toString());
      } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        // Handle nested objects (if any)
        params.append(key, JSON.stringify(value));
      } else if (value instanceof Date) {
        params.append(key, value.toISOString());
      } else {
        params.append(key, value.toString());
      }
    }
  });
  
  return params.toString();
};

// Status constants matching backend
const PURCHASE_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  IN_TRANSIT: 'IN_TRANSIT',
  ARRIVED_AT_SITE: 'ARRIVED_AT_SITE',
  QUALITY_CHECK: 'QUALITY_CHECK',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
  ON_HOLD: 'ON_HOLD'
};

const RECEIVING_STATUS = {
  PENDING: 'PENDING',
  ARRIVED: 'ARRIVED',
  INSPECTION_IN_PROGRESS: 'INSPECTION_IN_PROGRESS',
  COMPLETED: 'COMPLETED'
};

const DELIVERY_STATUS = {
  PENDING: 'PENDING',
  IN_TRANSIT: 'IN_TRANSIT',
  ARRIVED_AT_SITE: 'ARRIVED_AT_SITE',
  PARTIALLY_ACCEPTED: 'PARTIALLY_ACCEPTED',
  FULLY_ACCEPTED: 'FULLY_ACCEPTED',
  REJECTED: 'REJECTED'
};

class NonFuelPurchaseService {
  // =====================
  // PURCHASE OPERATIONS
  // =====================
  
  async createPurchase(purchaseData) {
    try {
      logger.info('Creating non-fuel purchase:', purchaseData);
      
      // Format data with proper types
      const formattedData = {
        ...purchaseData,
        purchaseDate: purchaseData.purchaseDate ? new Date(purchaseData.purchaseDate).toISOString() : undefined,
        expectedDate: purchaseData.expectedDate ? new Date(purchaseData.expectedDate).toISOString() : undefined,
        expectedDeliveryDate: purchaseData.expectedDeliveryDate ? new Date(purchaseData.expectedDeliveryDate).toISOString() : undefined,
        discountAmount: purchaseData.discountAmount ? parseFloat(purchaseData.discountAmount) : 0,
        items: purchaseData.items.map(item => ({
          ...item,
          orderedQty: parseInt(item.orderedQty),
          unitCost: parseFloat(item.unitCost),
          taxRate: item.taxRate ? parseFloat(item.taxRate) : 0.16,
          batchNumber: item.batchNumber || null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : null
        }))
      };
      
      const response = await apiService.post('/nonfuel-purchase/purchases', formattedData);
      return handleResponse(response, 'createPurchase');
    } catch (error) {
      throw handleError(error, 'createPurchase', { purchaseData });
    }
  }

  async getPurchases(filters = {}) {
    try {
      logger.info('Fetching non-fuel purchases with filters:', filters);
      
      // Format filters with proper types
      const formattedFilters = {
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 10,
        type: 'NON_FUEL', // Always filter for non-fuel purchases
        stationId: filters.stationId || undefined,
        supplierId: filters.supplierId || undefined,
        warehouseId: filters.warehouseId || undefined,
        status: filters.status || undefined,
        deliveryStatus: filters.deliveryStatus || undefined,
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
        endDate: filters.endDate ? new Date(filters.endDate).toISOString() : undefined,
        search: filters.search || undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString ? `/nonfuel-purchase/purchases?${queryString}` : '/nonfuel-purchase/purchases';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getPurchases');
    } catch (error) {
      throw handleError(error, 'getPurchases', { filters });
    }
  }

  async getPurchaseById(purchaseId) {
    try {
      logger.info(`Fetching purchase: ${purchaseId}`);
      const response = await apiService.get(`/nonfuel-purchase/purchases/${purchaseId}`);
      return handleResponse(response, 'getPurchaseById');
    } catch (error) {
      throw handleError(error, 'getPurchaseById', { purchaseId });
    }
  }

  async getPurchaseByNumber(purchaseNumber) {
    try {
      logger.info(`Fetching purchase by number: ${purchaseNumber}`);
      const response = await apiService.get(`/nonfuel-purchase/purchases/number/${purchaseNumber}`);
      return handleResponse(response, 'getPurchaseByNumber');
    } catch (error) {
      throw handleError(error, 'getPurchaseByNumber', { purchaseNumber });
    }
  }

  async updatePurchase(purchaseId, updateData) {
    try {
      logger.info(`Updating purchase: ${purchaseId}`, updateData);
      
      // Format data with proper types
      const formattedData = {
        ...updateData,
        expectedDate: updateData.expectedDate ? new Date(updateData.expectedDate).toISOString() : undefined,
        expectedDeliveryDate: updateData.expectedDeliveryDate ? new Date(updateData.expectedDeliveryDate).toISOString() : undefined,
        discountAmount: updateData.discountAmount !== undefined ? parseFloat(updateData.discountAmount) : undefined
      };
      
      const response = await apiService.patch(`/nonfuel-purchase/purchases/${purchaseId}`, formattedData);
      return handleResponse(response, 'updatePurchase');
    } catch (error) {
      throw handleError(error, 'updatePurchase', { purchaseId, updateData });
    }
  }

  async updatePurchaseStatus(purchaseId, status) {
    try {
      logger.info(`Updating purchase status: ${purchaseId} -> ${status}`);
      
      const response = await apiService.patch(`/nonfuel-purchase/purchases/${purchaseId}/status`, { status });
      return handleResponse(response, 'updatePurchaseStatus');
    } catch (error) {
      throw handleError(error, 'updatePurchaseStatus', { purchaseId, status });
    }
  }

  async deletePurchase(purchaseId) {
    try {
      logger.info(`Deleting purchase: ${purchaseId}`);
      const response = await apiService.delete(`/nonfuel-purchase/purchases/${purchaseId}`);
      return handleResponse(response, 'deletePurchase');
    } catch (error) {
      throw handleError(error, 'deletePurchase', { purchaseId });
    }
  }

  async getPurchasesByStation(stationId, filters = {}) {
    try {
      logger.info(`Fetching purchases for station: ${stationId}`, filters);
      
      const formattedFilters = {
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 10,
        type: 'NON_FUEL'
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString 
        ? `/nonfuel-purchase/purchases/station/${stationId}?${queryString}`
        : `/nonfuel-purchase/purchases/station/${stationId}`;
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getPurchasesByStation');
    } catch (error) {
      throw handleError(error, 'getPurchasesByStation', { stationId, filters });
    }
  }

  async getSuppliers(activeOnly = true) {
    try {
      logger.info(`Fetching suppliers, activeOnly: ${activeOnly}`);
      const queryString = buildQueryString({ activeOnly });
      const url = queryString ? `/nonfuel-purchase/purchases/suppliers?${queryString}` : '/nonfuel-purchase/purchases/suppliers';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getSuppliers');
    } catch (error) {
      throw handleError(error, 'getSuppliers', { activeOnly });
    }
  }

  async getPurchaseAnalytics(filters = {}) {
    try {
      logger.info('Fetching purchase analytics with filters:', filters);
      
      const formattedFilters = {
        ...filters,
        type: 'NON_FUEL',
        stationId: filters.stationId || undefined,
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
        endDate: filters.endDate ? new Date(filters.endDate).toISOString() : undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString ? `/nonfuel-purchase/purchases/analytics?${queryString}` : '/nonfuel-purchase/purchases/analytics';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getPurchaseAnalytics');
    } catch (error) {
      throw handleError(error, 'getPurchaseAnalytics', { filters });
    }
  }

  async getPurchaseAnalyticsByStation(stationId, filters = {}) {
    try {
      logger.info(`Fetching purchase analytics for station: ${stationId}`, filters);
      
      const formattedFilters = {
        ...filters,
        type: 'NON_FUEL',
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
        endDate: filters.endDate ? new Date(filters.endDate).toISOString() : undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString 
        ? `/nonfuel-purchase/purchases/station/${stationId}/analytics?${queryString}`
        : `/nonfuel-purchase/purchases/station/${stationId}/analytics`;
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getPurchaseAnalyticsByStation');
    } catch (error) {
      throw handleError(error, 'getPurchaseAnalyticsByStation', { stationId, filters });
    }
  }

  // =====================
  // PURCHASE REPORTS
  // =====================

  async getPurchaseSummaryReport(filters = {}) {
    try {
      logger.info('Fetching purchase summary report with filters:', filters);
      
      const formattedFilters = {
        ...filters,
        type: 'NON_FUEL',
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
        endDate: filters.endDate ? new Date(filters.endDate).toISOString() : undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString 
        ? `/nonfuel-purchase/purchases/reports/summary?${queryString}`
        : '/nonfuel-purchase/purchases/reports/summary';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getPurchaseSummaryReport');
    } catch (error) {
      throw handleError(error, 'getPurchaseSummaryReport', { filters });
    }
  }

  async getDetailedPurchaseReport(filters = {}) {
    try {
      logger.info('Fetching detailed purchase report with filters:', filters);
      
      const formattedFilters = {
        ...filters,
        type: 'NON_FUEL',
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
        endDate: filters.endDate ? new Date(filters.endDate).toISOString() : undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString 
        ? `/nonfuel-purchase/purchases/reports/detailed?${queryString}`
        : '/nonfuel-purchase/purchases/reports/detailed';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getDetailedPurchaseReport');
    } catch (error) {
      throw handleError(error, 'getDetailedPurchaseReport', { filters });
    }
  }

  async exportPurchasesCSV(filters = {}) {
    try {
      logger.info('Exporting purchases CSV with filters:', filters);
      
      const formattedFilters = {
        ...filters,
        type: 'NON_FUEL',
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
        endDate: filters.endDate ? new Date(filters.endDate).toISOString() : undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString 
        ? `/nonfuel-purchase/purchases/export/csv?${queryString}`
        : '/nonfuel-purchase/purchases/export/csv';
      
      const response = await apiService.get(url, {
        responseType: 'blob'
      });
      
      // Handle CSV blob response
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `non-fuel-purchases-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      return { success: true, message: 'CSV export initiated' };
    } catch (error) {
      throw handleError(error, 'exportPurchasesCSV', { filters });
    }
  }

  // =====================
  // RECEIVING OPERATIONS
  // =====================

  async createReceiving(receivingData) {
    try {
      logger.info('Creating receiving:', receivingData);
      
      // Format data with proper types
      const formattedData = {
        ...receivingData,
        supplierInvoiceDate: receivingData.supplierInvoiceDate ? 
          new Date(receivingData.supplierInvoiceDate).toISOString() : undefined,
        supplierInvoiceAmount: parseFloat(receivingData.supplierInvoiceAmount)
      };
      
      const response = await apiService.post('/nonfuel-purchase/receivings', formattedData);
      return handleResponse(response, 'createReceiving');
    } catch (error) {
      throw handleError(error, 'createReceiving', { receivingData });
    }
  }

  async getReceivings(filters = {}) {
    try {
      logger.info('Fetching receivings with filters:', filters);
      
      const formattedFilters = {
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 10,
        stationId: filters.stationId || undefined,
        warehouseId: filters.warehouseId || undefined,
        status: filters.status || undefined,
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
        endDate: filters.endDate ? new Date(filters.endDate).toISOString() : undefined,
        search: filters.search || undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString ? `/nonfuel-purchase/receivings?${queryString}` : '/nonfuel-purchase/receivings';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getReceivings');
    } catch (error) {
      throw handleError(error, 'getReceivings', { filters });
    }
  }

  async getReceivingById(receivingId) {
    try {
      logger.info(`Fetching receiving: ${receivingId}`);
      const response = await apiService.get(`/nonfuel-purchase/receivings/${receivingId}`);
      return handleResponse(response, 'getReceivingById');
    } catch (error) {
      throw handleError(error, 'getReceivingById', { receivingId });
    }
  }

  async getReceivingByNumber(receivingNumber) {
    try {
      logger.info(`Fetching receiving by number: ${receivingNumber}`);
      const response = await apiService.get(`/nonfuel-purchase/receivings/number/${receivingNumber}`);
      return handleResponse(response, 'getReceivingByNumber');
    } catch (error) {
      throw handleError(error, 'getReceivingByNumber', { receivingNumber });
    }
  }

  async updateReceiving(receivingId, updateData) {
    try {
      logger.info(`Updating receiving: ${receivingId}`, updateData);
      
      const response = await apiService.patch(`/nonfuel-purchase/receivings/${receivingId}`, updateData);
      return handleResponse(response, 'updateReceiving');
    } catch (error) {
      throw handleError(error, 'updateReceiving', { receivingId, updateData });
    }
  }

  async updateReceivingStatus(receivingId, status) {
    try {
      logger.info(`Updating receiving status: ${receivingId} -> ${status}`);
      
      const response = await apiService.patch(`/nonfuel-purchase/receivings/${receivingId}/status`, { status });
      return handleResponse(response, 'updateReceivingStatus');
    } catch (error) {
      throw handleError(error, 'updateReceivingStatus', { receivingId, status });
    }
  }

  async addReceivingItem(receivingId, itemData) {
    try {
      logger.info(`Adding item to receiving: ${receivingId}`, itemData);
      
      // Format data with proper types
      const formattedData = {
        ...itemData,
        receivedQty: parseInt(itemData.receivedQty),
        damagedQty: parseInt(itemData.damagedQty || 0),
        unitCost: itemData.unitCost ? parseFloat(itemData.unitCost) : undefined,
        expiryDate: itemData.expiryDate ? new Date(itemData.expiryDate).toISOString() : null
      };
      
      const response = await apiService.post(`/nonfuel-purchase/receivings/${receivingId}/items`, formattedData);
      return handleResponse(response, 'addReceivingItem');
    } catch (error) {
      throw handleError(error, 'addReceivingItem', { receivingId, itemData });
    }
  }

  async updateReceivingItem(receivingId, itemId, updateData) {
    try {
      logger.info(`Updating receiving item: ${receivingId}/${itemId}`, updateData);
      
      // Format data with proper types
      const formattedData = {
        ...updateData,
        receivedQty: updateData.receivedQty !== undefined ? parseInt(updateData.receivedQty) : undefined,
        damagedQty: updateData.damagedQty !== undefined ? parseInt(updateData.damagedQty) : undefined,
        unitCost: updateData.unitCost !== undefined ? parseFloat(updateData.unitCost) : undefined
      };
      
      const response = await apiService.patch(`/nonfuel-purchase/receivings/${receivingId}/items/${itemId}`, formattedData);
      return handleResponse(response, 'updateReceivingItem');
    } catch (error) {
      throw handleError(error, 'updateReceivingItem', { receivingId, itemId, updateData });
    }
  }

  async deleteReceivingItem(receivingId, itemId) {
    try {
      logger.info(`Deleting receiving item: ${receivingId}/${itemId}`);
      const response = await apiService.delete(`/nonfuel-purchase/receivings/${receivingId}/items/${itemId}`);
      return handleResponse(response, 'deleteReceivingItem');
    } catch (error) {
      throw handleError(error, 'deleteReceivingItem', { receivingId, itemId });
    }
  }

  async approveReceiving(receivingId, approvalNotes = '') {
    try {
      logger.info(`Approving receiving: ${receivingId}`);
      
      const response = await apiService.post(`/nonfuel-purchase/receivings/${receivingId}/approve`, {
        approvalNotes
      });
      return handleResponse(response, 'approveReceiving');
    } catch (error) {
      throw handleError(error, 'approveReceiving', { receivingId });
    }
  }

  // =====================
  // ITEM RECEIPT OPERATIONS
  // =====================

  async createItemReceipt(receiptData) {
    try {
      logger.info('Creating item receipt:', receiptData);
      
      // Format data with proper types
      const formattedData = {
        ...receiptData,
        receivedQty: parseInt(receiptData.receivedQty),
        damagedQty: parseInt(receiptData.damagedQty || 0),
        unitCost: receiptData.unitCost ? parseFloat(receiptData.unitCost) : undefined,
        expiryDate: receiptData.expiryDate ? new Date(receiptData.expiryDate).toISOString() : null
      };
      
      const response = await apiService.post('/nonfuel-purchase/item-receipts', formattedData);
      return handleResponse(response, 'createItemReceipt');
    } catch (error) {
      throw handleError(error, 'createItemReceipt', { receiptData });
    }
  }

  async getItemReceiptById(receiptId) {
    try {
      logger.info(`Fetching item receipt: ${receiptId}`);
      const response = await apiService.get(`/nonfuel-purchase/item-receipts/${receiptId}`);
      return handleResponse(response, 'getItemReceiptById');
    } catch (error) {
      throw handleError(error, 'getItemReceiptById', { receiptId });
    }
  }

  async getItemReceiptsByPurchase(purchaseId) {
    try {
      logger.info(`Fetching item receipts for purchase: ${purchaseId}`);
      const response = await apiService.get(`/nonfuel-purchase/purchases/${purchaseId}/item-receipts`);
      return handleResponse(response, 'getItemReceiptsByPurchase');
    } catch (error) {
      throw handleError(error, 'getItemReceiptsByPurchase', { purchaseId });
    }
  }

  // =====================
  // DOCUMENT OPERATIONS
  // =====================

  async addReceivingDocument(receivingId, documentData) {
    try {
      logger.info(`Adding document to receiving: ${receivingId}`, documentData);
      
      // Format data with proper types
      const formattedData = {
        ...documentData,
        documentDate: documentData.documentDate ? new Date(documentData.documentDate).toISOString() : null,
        fileSize: documentData.fileSize ? parseInt(documentData.fileSize) : undefined
      };
      
      const response = await apiService.post(`/nonfuel-purchase/receivings/${receivingId}/documents`, formattedData);
      return handleResponse(response, 'addReceivingDocument');
    } catch (error) {
      throw handleError(error, 'addReceivingDocument', { receivingId, documentData });
    }
  }

  async getReceivingDocuments(receivingId) {
    try {
      logger.info(`Fetching documents for receiving: ${receivingId}`);
      const response = await apiService.get(`/nonfuel-purchase/receivings/${receivingId}/documents`);
      return handleResponse(response, 'getReceivingDocuments');
    } catch (error) {
      throw handleError(error, 'getReceivingDocuments', { receivingId });
    }
  }

  async deleteReceivingDocument(documentId) {
    try {
      logger.info(`Deleting document: ${documentId}`);
      const response = await apiService.delete(`/nonfuel-purchase/receivings/documents/${documentId}`);
      return handleResponse(response, 'deleteReceivingDocument');
    } catch (error) {
      throw handleError(error, 'deleteReceivingDocument', { documentId });
    }
  }

  // =====================
  // WAREHOUSE STOCK OPERATIONS
  // =====================

  async getWarehouseStock(warehouseId, filters = {}) {
    try {
      logger.info(`Fetching warehouse stock: ${warehouseId}`, filters);
      
      const formattedFilters = {
        ...filters,
        productId: filters.productId || undefined,
        status: filters.status || undefined,
        batchNumber: filters.batchNumber || undefined,
        expiringSoon: filters.expiringSoon || undefined,
        expired: filters.expired || undefined,
        search: filters.search || undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString 
        ? `/nonfuel-purchase/warehouses/${warehouseId}/stock?${queryString}`
        : `/nonfuel-purchase/warehouses/${warehouseId}/stock`;
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getWarehouseStock');
    } catch (error) {
      throw handleError(error, 'getWarehouseStock', { warehouseId, filters });
    }
  }

  async getProductStock(warehouseId, productId) {
    try {
      logger.info(`Fetching product stock: ${warehouseId}/${productId}`);
      const response = await apiService.get(`/nonfuel-purchase/warehouses/${warehouseId}/stock/${productId}`);
      return handleResponse(response, 'getProductStock');
    } catch (error) {
      throw handleError(error, 'getProductStock', { warehouseId, productId });
    }
  }

  async getStockAlerts(warehouseId) {
    try {
      logger.info(`Fetching stock alerts for warehouse: ${warehouseId}`);
      const response = await apiService.get(`/nonfuel-purchase/warehouses/${warehouseId}/stock-alerts`);
      return handleResponse(response, 'getStockAlerts');
    } catch (error) {
      throw handleError(error, 'getStockAlerts', { warehouseId });
    }
  }

  async getReorderSuggestions(warehouseId) {
    try {
      logger.info(`Fetching reorder suggestions for warehouse: ${warehouseId}`);
      const response = await apiService.get(`/nonfuel-purchase/warehouses/${warehouseId}/reorder-suggestions`);
      return handleResponse(response, 'getReorderSuggestions');
    } catch (error) {
      throw handleError(error, 'getReorderSuggestions', { warehouseId });
    }
  }

  // =====================
  // VALIDATION METHODS
  // =====================

  validatePurchase(purchaseData) {
    const errors = {};

    if (!purchaseData.supplierId) {
      errors.supplierId = 'Supplier is required';
    }

    if (!purchaseData.stationId) {
      errors.stationId = 'Station is required';
    }

    if (!purchaseData.warehouseId) {
      errors.warehouseId = 'Warehouse is required';
    }

    if (!purchaseData.purchaseDate) {
      errors.purchaseDate = 'Purchase date is required';
    }

    if (purchaseData.items && purchaseData.items.length === 0) {
      errors.items = 'At least one purchase item is required';
    } else if (purchaseData.items) {
      purchaseData.items.forEach((item, index) => {
        if (!item.productId) {
          errors[`items[${index}].productId`] = 'Product is required';
        }
        if (!item.orderedQty || item.orderedQty <= 0) {
          errors[`items[${index}].orderedQty`] = 'Valid ordered quantity is required';
        }
        if (!item.unitCost || item.unitCost <= 0) {
          errors[`items[${index}].unitCost`] = 'Valid unit cost is required';
        }
      });
    }

    // Date validation
    if (purchaseData.expectedDate && purchaseData.purchaseDate) {
      const expectedDate = new Date(purchaseData.expectedDate);
      const purchaseDate = new Date(purchaseData.purchaseDate);
      if (expectedDate < purchaseDate) {
        errors.expectedDate = 'Expected date must be on or after purchase date';
      }
    }

    if (purchaseData.expectedDeliveryDate && purchaseData.expectedDate) {
      const expectedDelivery = new Date(purchaseData.expectedDeliveryDate);
      const expected = new Date(purchaseData.expectedDate);
      if (expectedDelivery < expected) {
        errors.expectedDeliveryDate = 'Expected delivery date must be on or after expected date';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  validateReceiving(receivingData) {
    const errors = {};

    if (!receivingData.purchaseId) {
      errors.purchaseId = 'Purchase is required';
    }

    if (!receivingData.supplierInvoiceNumber) {
      errors.supplierInvoiceNumber = 'Supplier invoice number is required';
    }

    if (!receivingData.supplierInvoiceDate) {
      errors.supplierInvoiceDate = 'Supplier invoice date is required';
    }

    if (!receivingData.supplierInvoiceAmount || receivingData.supplierInvoiceAmount <= 0) {
      errors.supplierInvoiceAmount = 'Valid supplier invoice amount is required';
    }

    if (!receivingData.driverName) {
      errors.driverName = 'Driver name is required';
    }

    if (!receivingData.deliveryVehiclePlate) {
      errors.deliveryVehiclePlate = 'Delivery vehicle plate is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  validateReceivingItem(itemData) {
    const errors = {};

    if (!itemData.productId) {
      errors.productId = 'Product is required';
    }

    if (!itemData.receivedQty || itemData.receivedQty <= 0) {
      errors.receivedQty = 'Valid received quantity is required';
    }

    if (itemData.damagedQty !== undefined && itemData.damagedQty < 0) {
      errors.damagedQty = 'Damaged quantity cannot be negative';
    }

    if (itemData.damagedQty !== undefined && itemData.receivedQty !== undefined) {
      if (itemData.damagedQty > itemData.receivedQty) {
        errors.damagedQty = 'Damaged quantity cannot exceed received quantity';
      }
    }

    if (itemData.unitCost !== undefined && itemData.unitCost <= 0) {
      errors.unitCost = 'Valid unit cost is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // =====================
  // FORMATTING UTILITIES
  // =====================

  formatPurchase(purchase) {
    if (!purchase) return null;
    
    const statusColors = {
      DRAFT: 'secondary',
      PENDING_APPROVAL: 'warning',
      APPROVED: 'info',
      ORDER_CONFIRMED: 'info',
      IN_TRANSIT: 'info',
      ARRIVED_AT_SITE: 'info',
      QUALITY_CHECK: 'info',
      PARTIALLY_RECEIVED: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'error',
      REJECTED: 'error',
      ON_HOLD: 'warning'
    };

    const deliveryStatusColors = {
      PENDING: 'secondary',
      IN_TRANSIT: 'info',
      ARRIVED_AT_SITE: 'info',
      PARTIALLY_ACCEPTED: 'warning',
      FULLY_ACCEPTED: 'success',
      REJECTED: 'error'
    };

    const totalOrdered = purchase.items?.reduce((sum, item) => sum + (item.orderedQty || 0), 0) || 0;
    const totalReceived = purchase.items?.reduce((sum, item) => sum + (item.receivedQty || 0), 0) || 0;
    const deliveryProgress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

    return {
      ...purchase,
      statusColor: statusColors[purchase.status] || 'default',
      deliveryStatusColor: deliveryStatusColors[purchase.deliveryStatus] || 'default',
      displayNumber: purchase.purchaseNumber,
      supplierName: purchase.supplier?.name || 'Unknown Supplier',
      stationName: purchase.station?.name || 'Unknown Station',
      warehouseName: purchase.warehouse?.name || 'Unknown Warehouse',
      totalItems: totalOrdered,
      receivedItems: totalReceived,
      deliveryProgress: Math.round(deliveryProgress),
      isFullyReceived: deliveryProgress >= 100,
      hasSupplierAccount: !!purchase.supplier?.supplierAccount,
      supplierAccountStatus: purchase.supplier?.supplierAccount?.status || 'NO_ACCOUNT',
      formattedDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString() : 'N/A',
      formattedExpectedDate: purchase.expectedDate ? new Date(purchase.expectedDate).toLocaleDateString() : 'N/A',
      formattedAmounts: {
        grossAmount: `KES ${(purchase.grossAmount || 0).toLocaleString()}`,
        netPayable: `KES ${(purchase.netPayable || 0).toLocaleString()}`,
        taxAmount: `KES ${(purchase.totalTaxAmount || 0).toLocaleString()}`
      }
    };
  }

  formatReceiving(receiving) {
    if (!receiving) return null;
    
    const statusColors = {
      PENDING: 'secondary',
      ARRIVED: 'info',
      INSPECTION_IN_PROGRESS: 'warning',
      COMPLETED: 'success'
    };

    const totalAccepted = receiving.acceptedItems || 0;
    const totalDamaged = receiving.damagedItems || 0;
    const totalReceived = receiving.receivedTotalItems || 0;
    const inspectionProgress = receiving.expectedTotalItems > 0 ? 
      (totalReceived / receiving.expectedTotalItems) * 100 : 0;

    return {
      ...receiving,
      statusColor: statusColors[receiving.status] || 'default',
      displayNumber: receiving.receivingNumber,
      purchaseNumber: receiving.purchase?.purchaseNumber || 'N/A',
      supplierName: receiving.purchase?.supplier?.name || 'Unknown Supplier',
      stationName: receiving.station?.name || 'Unknown Station',
      warehouseName: receiving.warehouse?.name || 'Unknown Warehouse',
      inspectionProgress: Math.round(inspectionProgress),
      acceptanceRate: totalReceived > 0 ? Math.round((totalAccepted / totalReceived) * 100) : 0,
      damageRate: totalReceived > 0 ? Math.round((totalDamaged / totalReceived) * 100) : 0,
      isFullyInspected: inspectionProgress >= 100,
      formattedDeliveryTime: receiving.deliveryTime ? 
        new Date(receiving.deliveryTime).toLocaleString() : 'N/A',
      formattedInvoiceAmount: `KES ${(receiving.supplierInvoiceAmount || 0).toLocaleString()}`,
      formattedPayableAmount: `KES ${(receiving.payableAmount || 0).toLocaleString()}`,
      hasDocuments: receiving.documents?.length > 0,
      documentCount: receiving.documents?.length || 0,
      hasItemReceipts: receiving.itemReceipts?.length > 0,
      itemReceiptCount: receiving.itemReceipts?.length || 0
    };
  }

  formatWarehouseStock(stock) {
    if (!stock) return null;
    
    const statusColors = {
      AVAILABLE: 'success',
      RESERVED: 'warning',
      LOW_STOCK: 'error',
      OUT_OF_STOCK: 'error',
      EXPIRED: 'error',
      DAMAGED: 'error'
    };

    const isExpired = stock.expiryDate && new Date(stock.expiryDate) < new Date();
    const isLowStock = stock.availableQty <= stock.reorderPoint;
    const isCritical = stock.availableQty === 0;
    
    let stockStatus = 'AVAILABLE';
    if (isExpired) stockStatus = 'EXPIRED';
    else if (isCritical) stockStatus = 'OUT_OF_STOCK';
    else if (isLowStock) stockStatus = 'LOW_STOCK';

    return {
      ...stock,
      statusColor: statusColors[stockStatus] || 'default',
      productName: stock.product?.name || 'Unknown Product',
      categoryName: stock.product?.category?.name || 'N/A',
      subCategoryName: stock.product?.subCategory?.name || 'N/A',
      unit: stock.product?.unit || 'N/A',
      isExpired,
      isLowStock,
      isCritical,
      stockStatus,
      stockValue: stock.availableQty * (stock.avgUnitCost || 0),
      formattedStockValue: `KES ${(stock.availableQty * (stock.avgUnitCost || 0)).toLocaleString()}`,
      formattedExpiryDate: stock.expiryDate ? 
        new Date(stock.expiryDate).toLocaleDateString() : 'No expiry',
      expiryStatus: isExpired ? 'Expired' : 
        stock.expiryDate ? `${Math.ceil((new Date(stock.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} days left` : 'N/A',
      reorderStatus: isLowStock ? `Reorder needed (${stock.availableQty}/${stock.reorderPoint})` : 'OK',
      formattedUnitCost: `KES ${(stock.avgUnitCost || 0).toLocaleString()}`,
      batchInfo: stock.batchNumber ? `Batch: ${stock.batchNumber}` : 'No batch'
    };
  }

  // =====================
  // UTILITY METHODS
  // =====================

  async searchPurchases(searchTerm, additionalFilters = {}) {
    try {
      const filters = {
        search: searchTerm,
        ...additionalFilters
      };
      return await this.getPurchases(filters);
    } catch (error) {
      throw handleError(error, 'searchPurchases', { searchTerm, additionalFilters });
    }
  }

  async searchReceivings(searchTerm, additionalFilters = {}) {
    try {
      const filters = {
        search: searchTerm,
        ...additionalFilters
      };
      return await this.getReceivings(filters);
    } catch (error) {
      throw handleError(error, 'searchReceivings', { searchTerm, additionalFilters });
    }
  }

  async getPurchaseStatusOptions() {
    return Object.entries(PURCHASE_STATUS).map(([key, value]) => ({
      value,
      label: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    }));
  }

  async getReceivingStatusOptions() {
    return Object.entries(RECEIVING_STATUS).map(([key, value]) => ({
      value,
      label: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    }));
  }

  async getDeliveryStatusOptions() {
    return Object.entries(DELIVERY_STATUS).map(([key, value]) => ({
      value,
      label: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    }));
  }

  // Calculate purchase summary
  calculatePurchaseSummary(purchase) {
    const items = purchase.items || [];
    const totalOrdered = items.reduce((sum, item) => sum + (item.orderedQty || 0), 0);
    const totalReceived = items.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
    const totalValue = items.reduce((sum, item) => sum + (item.netAmount || 0), 0);
    const pendingQty = totalOrdered - totalReceived;
    const completionRate = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

    return {
      totalOrdered,
      totalReceived,
      totalValue,
      pendingQty,
      completionRate: Math.round(completionRate),
      isComplete: completionRate >= 100,
      itemCount: items.length,
      fullyReceivedItems: items.filter(item => item.isFullyReceived).length
    };
  }

  // Calculate receiving summary
  calculateReceivingSummary(receiving) {
    const itemReceipts = receiving.itemReceipts || [];
    const totalExpected = receiving.expectedTotalItems || 0;
    const totalReceived = receiving.receivedTotalItems || 0;
    const totalAccepted = receiving.acceptedItems || 0;
    const totalDamaged = receiving.damagedItems || 0;
    const totalMissing = receiving.missingItems || 0;
    
    const inspectionProgress = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;
    const acceptanceRate = totalReceived > 0 ? (totalAccepted / totalReceived) * 100 : 0;
    const damageRate = totalReceived > 0 ? (totalDamaged / totalReceived) * 100 : 0;
    const missingRate = totalReceived > 0 ? (totalMissing / totalReceived) * 100 : 0;

    return {
      totalExpected,
      totalReceived,
      totalAccepted,
      totalDamaged,
      totalMissing,
      inspectionProgress: Math.round(inspectionProgress),
      acceptanceRate: Math.round(acceptanceRate),
      damageRate: Math.round(damageRate),
      missingRate: Math.round(missingRate),
      isFullyInspected: inspectionProgress >= 100,
      itemReceiptCount: itemReceipts.length,
      documentCount: receiving.documents?.length || 0
    };
  }

  // Prepare export data for purchases
  preparePurchaseExportData(purchases) {
    return purchases.map(purchase => ({
      'Purchase Number': purchase.purchaseNumber || 'N/A',
      'Date': purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString() : 'N/A',
      'Supplier': purchase.supplier?.name || 'N/A',
      'Station': purchase.station?.name || 'N/A',
      'Warehouse': purchase.warehouse?.name || 'N/A',
      'Status': purchase.status || 'N/A',
      'Delivery Status': purchase.deliveryStatus || 'N/A',
      'Gross Amount': purchase.grossAmount || 0,
      'Tax Amount': purchase.totalTaxAmount || 0,
      'Discount': purchase.discountAmount || 0,
      'Net Payable': purchase.netPayable || 0,
      'Items Count': purchase.items?.length || 0,
      'Expected Date': purchase.expectedDate ? new Date(purchase.expectedDate).toLocaleDateString() : 'N/A',
      'Received Date': purchase.receivedDate ? new Date(purchase.receivedDate).toLocaleDateString() : 'N/A',
      'Created By': purchase.createdBy?.firstName 
        ? `${purchase.createdBy.firstName} ${purchase.createdBy.lastName}` 
        : 'N/A',
      'Approved By': purchase.approvedBy?.firstName
        ? `${purchase.approvedBy.firstName} ${purchase.approvedBy.lastName}`
        : 'N/A'
    }));
  }

  // Prepare export data for warehouse stock
  prepareStockExportData(stock) {
    return stock.map(item => ({
      'Product': item.product?.name || 'N/A',
      'Category': item.product?.category?.name || 'N/A',
      'Sub Category': item.product?.subCategory?.name || 'N/A',
      'Batch Number': item.batchNumber || 'N/A',
      'Available Quantity': item.availableQty || 0,
      'Physical Quantity': item.physicalQty || 0,
      'Reserved Quantity': item.reservedQty || 0,
      'Unit Cost': item.avgUnitCost || 0,
      'Stock Value': (item.availableQty || 0) * (item.avgUnitCost || 0),
      'Storage Location': item.storageLocation || 'N/A',
      'Expiry Date': item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A',
      'Status': item.status || 'N/A',
      'Minimum Stock': item.minStock || 0,
      'Reorder Point': item.reorderPoint || 0,
      'Maximum Stock': item.maxStock || 'N/A',
      'Last Receipt': item.lastReceiptDate ? new Date(item.lastReceiptDate).toLocaleDateString() : 'N/A'
    }));
  }
}

// Create and export a singleton instance
export const nonFuelPurchaseService = new NonFuelPurchaseService();

// Example usage patterns
export const nonFuelPurchaseExamples = {
  createPurchase: {
    supplierId: "123e4567-e89b-12d3-a456-426614174000",
    stationId: "223e4567-e89b-12d3-a456-426614174000",
    warehouseId: "323e4567-e89b-12d3-a456-426614174000",
    purchaseDate: "2024-01-15T08:00:00.000Z",
    expectedDate: "2024-01-20T08:00:00.000Z",
    expectedDeliveryDate: "2024-01-22T08:00:00.000Z",
    supplierRef: "SUPP-PO-2024-00123",
    internalRef: "INT-PUR-2024-0456",
    deliveryAddress: "Warehouse 1, Main Depot, Nairobi",
    termsAndConditions: "Payment within 30 days. Goods must be in perfect condition.",
    discountAmount: 1000,
    items: [
      {
        productId: "423e4567-e89b-12d3-a456-426614174000",
        orderedQty: 50,
        unitCost: 1200,
        taxRate: 0.16,
        batchNumber: "BATCH-001-2024",
        expiryDate: "2025-12-31T23:59:59.000Z",
        storageLocation: "Shelf A3, Zone 1"
      }
    ]
  },

  createReceiving: {
    purchaseId: "92523a35-670c-4401-aa95-ddc4c79cbd62",
    supplierInvoiceNumber: "INV-GL-2024-7890",
    supplierInvoiceDate: "2024-01-22T08:00:00.000Z",
    supplierInvoiceAmount: 260000,
    driverName: "John Kamau",
    driverPhone: "+254712345678",
    deliveryVehiclePlate: "KCB 123A",
    deliveryCompany: "Swift Logistics",
    deliveryNoteNumber: "DN-2024-04567",
    waybillNumber: "WB-789012",
    currency: "KES"
  },

  addReceivingItem: {
    productId: "8990d08c-0394-4766-9037-fccbcc3f2bd3",
    receivedQty: 48,
    damagedQty: 2,
    batchNumber: "BATCH-001-2024",
    expiryDate: "2025-12-31T23:59:59.000Z",
    storageLocation: "Shelf A3, Zone 1",
    inspectionNotes: "2 bottles damaged during transit",
    unitCost: 1200
  },

  addReceivingDocument: {
    documentType: "DELIVERY_NOTE",
    documentNumber: "DN-2024-04567",
    documentDate: "2024-01-22T08:00:00.000Z",
    fileUrl: "https://storage.example.com/documents/dn-2024-04567.pdf",
    fileName: "delivery_note_789012.pdf",
    fileSize: 245760,
    notes: "Original delivery note from supplier"
  }
};

export default nonFuelPurchaseService;