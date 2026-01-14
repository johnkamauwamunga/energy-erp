import { apiService } from '../apiService';

// Enhanced logging utility with production control
const logger = {
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [WarehouseService]', ...args);
    }
  },
  info: (...args) => console.log('ℹ️ [WarehouseService]', ...args),
  warn: (...args) => console.warn('⚠️ [WarehouseService]', ...args),
  error: (...args) => console.error('❌ [WarehouseService]', ...args)
};

// Enhanced error handler with warehouse-specific messages
const handleError = (error, operation, context = {}) => {
  const errorMessages = {
    createWarehouse: 'Failed to create warehouse',
    updateWarehouse: 'Failed to update warehouse',
    getWarehouses: 'Failed to fetch warehouses',
    getWarehouseById: 'Failed to fetch warehouse details',
    deleteWarehouse: 'Failed to delete warehouse',
    getCompanyWarehouses: 'Failed to fetch company warehouses',
    getStationWarehouses: 'Failed to fetch station warehouses',
    bulkAssignToStation: 'Failed to bulk assign warehouses',
    getWarehouseStockSummary: 'Failed to fetch warehouse stock summary',
    validateAndFixWarehouses: 'Failed to validate warehouses'
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
        throw new Error(data.message || 'You do not have permission for this action');
      case 404:
        throw new Error(data.message || 'Requested resource not found');
      case 409:
        throw new Error(data.message || 'Resource already exists');
      case 422:
        if (data.errors && Array.isArray(data.errors)) {
          const validationErrors = data.errors.map(err => `${err.field}: ${err.message}`).join(', ');
          throw new Error(`Validation failed: ${validationErrors}`);
        }
        throw new Error(data.message || 'Validation failed');
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

// Response handler for consistent response structure
const handleResponse = (response, operation) => {
  if (response.data && response.data.success) {
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
      } else if (value instanceof Date) {
        params.append(key, value.toISOString());
      } else {
        params.append(key, value.toString());
      }
    }
  });
  
  return params.toString();
};

class WarehouseService {
  // =====================
  // WAREHOUSE CRUD METHODS
  // =====================
  
  async getWarehouses(filters = {}) {
    try {
      logger.info('Fetching warehouses with filters:', filters);
      
      const queryString = buildQueryString(filters);
      const url = queryString ? `/warehouses?${queryString}` : '/warehouses';
      
      const response = await apiService.get(url);
      const data = handleResponse(response, 'getWarehouses');

      console.log('Fetched warehouses data:', data);
      
      // Format warehouses before returning
      if (Array.isArray(data)) {
        return data.map(warehouse => this.formatWarehouse(warehouse));
      }
      return data;
    } catch (error) {
      throw handleError(error, 'getWarehouses', { filters });
    }
  }

  async getWarehouseById(warehouseId) {
    try {
      logger.info(`Fetching warehouse: ${warehouseId}`);
      
      const response = await apiService.get(`/warehouses/${warehouseId}`);
      const data = handleResponse(response, 'getWarehouseById');
      
      return this.formatWarehouse(data);
    } catch (error) {
      throw handleError(error, 'getWarehouseById', { warehouseId });
    }
  }

  async createWarehouse(warehouseData) {
    try {
      logger.info('Creating warehouse:', warehouseData);
      
      // Prepare data - NO companyId needed (comes from auth token)
      const formattedData = {
        name: warehouseData.name || 'Main Warehouse',
        stationId: warehouseData.stationId || null,
        // companyId is NOT included here - it comes from auth token
        assetId: warehouseData.assetId || null
      };
      
      const response = await apiService.post('/warehouses', formattedData);
      const data = handleResponse(response, 'createWarehouse');
      
      return this.formatWarehouse(data);
    } catch (error) {
      throw handleError(error, 'createWarehouse', { warehouseData });
    }
  }

  async updateWarehouse(warehouseId, warehouseData) {
    try {
      logger.info(`Updating warehouse ${warehouseId}:`, warehouseData);
      
      // Prepare data - only name, stationId, and assetId can be updated
      const formattedData = {
        name: warehouseData.name,
        stationId: warehouseData.stationId,
        assetId: warehouseData.assetId
      };
      
      const response = await apiService.put(`/warehouses/${warehouseId}`, formattedData);
      const data = handleResponse(response, 'updateWarehouse');
      
      return this.formatWarehouse(data);
    } catch (error) {
      throw handleError(error, 'updateWarehouse', { warehouseId, warehouseData });
    }
  }

  async deleteWarehouse(warehouseId) {
    try {
      logger.info(`Deleting warehouse: ${warehouseId}`);
      const response = await apiService.delete(`/warehouses/${warehouseId}`);
      return handleResponse(response, 'deleteWarehouse');
    } catch (error) {
      throw handleError(error, 'deleteWarehouse', { warehouseId });
    }
  }

  // =====================
  // COMPANY & STATION WAREHOUSES
  // =====================

  async getCompanyWarehouses(companyId, filters = {}) {
    try {
      logger.info(`Fetching warehouses for company: ${companyId}`, filters);
      
      const queryString = buildQueryString(filters);
      const url = queryString 
        ? `/warehouses/company/${companyId}?${queryString}`
        : `/warehouses/company/${companyId}`;
      
      const response = await apiService.get(url);
      const data = handleResponse(response, 'getCompanyWarehouses');
      
      if (Array.isArray(data)) {
        return data.map(warehouse => this.formatWarehouse(warehouse));
      }
      return data;
    } catch (error) {
      throw handleError(error, 'getCompanyWarehouses', { companyId, filters });
    }
  }

  async getStationWarehouses(stationId, filters = {}) {
    try {
      logger.info(`Fetching warehouses for station: ${stationId}`, filters);
      
      const queryString = buildQueryString(filters);
      const url = queryString 
        ? `/warehouses/station/${stationId}?${queryString}`
        : `/warehouses/station/${stationId}`;
      
      const response = await apiService.get(url);
      const data = handleResponse(response, 'getStationWarehouses');
      
      if (Array.isArray(data)) {
        return data.map(warehouse => this.formatWarehouse(warehouse));
      }
      return data;
    } catch (error) {
      throw handleError(error, 'getStationWarehouses', { stationId, filters });
    }
  }

  // =====================
  // BULK OPERATIONS
  // =====================

  async bulkAssignToStation(warehouseIds, stationId) {
    try {
      logger.info(`Bulk assigning ${warehouseIds.length} warehouses to station: ${stationId}`);
      
      // Ensure warehouseIds is an array
      const formattedWarehouseIds = Array.isArray(warehouseIds) ? warehouseIds : [warehouseIds];
      
      const payload = {
        warehouseIds: formattedWarehouseIds,
        stationId: stationId
      };
      
      const response = await apiService.patch('/warehouses/bulk/assign', payload);
      const data = handleResponse(response, 'bulkAssignToStation');
      
      if (Array.isArray(data)) {
        return data.map(warehouse => this.formatWarehouse(warehouse));
      }
      return data;
    } catch (error) {
      throw handleError(error, 'bulkAssignToStation', { warehouseIds, stationId });
    }
  }

  // =====================
  // STOCK MANAGEMENT
  // =====================

  async getWarehouseStockSummary(warehouseId) {
    try {
      logger.info(`Fetching stock summary for warehouse: ${warehouseId}`);
      
      const response = await apiService.get(`/warehouses/${warehouseId}/stock/summary`);
      const data = handleResponse(response, 'getWarehouseStockSummary');
      
      return this.formatStockSummary(data);
    } catch (error) {
      throw handleError(error, 'getWarehouseStockSummary', { warehouseId });
    }
  }

  // =====================
  // ADMIN OPERATIONS
  // =====================

  async validateAndFixWarehouses() {
    try {
      logger.info('Validating and fixing warehouses');
      
      const response = await apiService.post('/warehouses/validate');
      return handleResponse(response, 'validateAndFixWarehouses');
    } catch (error) {
      throw handleError(error, 'validateAndFixWarehouses');
    }
  }

  // =====================
  // VALIDATION METHODS
  // =====================

  validateWarehouse(warehouseData, isUpdate = false) {
    const errors = {};

    if (!isUpdate || warehouseData.name !== undefined) {
      if (!warehouseData.name || !warehouseData.name.trim()) {
        errors.name = 'Warehouse name is required';
      } else if (warehouseData.name.length > 100) {
        errors.name = 'Warehouse name must be less than 100 characters';
      }
    }

    if (warehouseData.stationId !== undefined && warehouseData.stationId !== null) {
      // Validate UUID format for stationId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(warehouseData.stationId)) {
        errors.stationId = 'Invalid station ID format';
      }
    }

    if (warehouseData.assetId !== undefined && warehouseData.assetId !== null) {
      // Validate UUID format for assetId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(warehouseData.assetId)) {
        errors.assetId = 'Invalid asset ID format';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  validateBulkAssignment(assignmentData) {
    const errors = {};

    if (!assignmentData.warehouseIds || !Array.isArray(assignmentData.warehouseIds)) {
      errors.warehouseIds = 'Warehouse IDs must be an array';
    } else if (assignmentData.warehouseIds.length === 0) {
      errors.warehouseIds = 'At least one warehouse ID is required';
    } else if (assignmentData.warehouseIds.length > 100) {
      errors.warehouseIds = 'Cannot process more than 100 warehouses at once';
    } else {
      // Validate each warehouse ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      assignmentData.warehouseIds.forEach((id, index) => {
        if (!uuidRegex.test(id)) {
          if (!errors.warehouseIds) errors.warehouseIds = [];
          if (!Array.isArray(errors.warehouseIds)) errors.warehouseIds = [];
          errors.warehouseIds.push(`Warehouse ID at index ${index} is invalid`);
        }
      });
    }

    if (!assignmentData.stationId) {
      errors.stationId = 'Station ID is required';
    } else {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(assignmentData.stationId)) {
        errors.stationId = 'Invalid station ID format';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // =====================
  // FORMATTING UTILITIES
  // =====================

// In warehouseService.js - update formatWarehouse function
formatWarehouse(warehouse) {
  if (!warehouse) return null;
  
  // Calculate stock metrics
  let totalStock = 0;
  let lowStockItems = 0;
  let criticalItems = 0;
  
  if (warehouse.warehouseStock && Array.isArray(warehouse.warehouseStock)) {
    warehouse.warehouseStock.forEach(item => {
      totalStock += item.availableQty || 0;
      if (item.isBelowReorderPoint) lowStockItems++;
      // Check if below min stock (you need to define this logic)
      if (item.availableQty <= item.minStock) criticalItems++;
    });
  }
  
  const hasStock = totalStock > 0;
  const stockStatus = hasStock ? 'active' : 'empty';
  const stockStatusColors = {
    active: 'success',
    empty: 'default',
    low: 'warning'
  };

  return {
    ...warehouse,
    displayName: warehouse.name,
    locationDisplay: this.getLocationDisplay(warehouse),
    stockStatus,
    stockStatusColor: stockStatusColors[stockStatus],
    hasStock,
    totalStock,
    lowStockItems,
    criticalItems,
    stationName: warehouse.station?.name || 'Unassigned',
    companyName: warehouse.company?.name || 'Unknown',
    assetName: warehouse.asset?.name || 'No Asset',
    assetType: warehouse.asset?.type || 'N/A',
    // Quick access properties
    isAssignedToStation: !!warehouse.stationId,
    isLinkedToAsset: !!warehouse.assetId,
    createdAtFormatted: warehouse.createdAt ? 
      new Date(warehouse.createdAt).toLocaleDateString() : 'N/A',
    updatedAtFormatted: warehouse.updatedAt ? 
      new Date(warehouse.updatedAt).toLocaleDateString() : 'N/A',
    // Keep original data
    _raw: warehouse
  };
}


// In warehouseService.js - update formatStockItem function
formatStockItem(stockItem) {
  if (!stockItem) return null;
  
  const product = stockItem.product || {};
  
  // Determine stock status based on available quantity vs thresholds
  let stockStatus = 'UNKNOWN';
  if (stockItem.availableQty <= 0) {
    stockStatus = 'OUT_OF_STOCK';
  } else if (stockItem.availableQty <= stockItem.minStock) {
    stockStatus = 'CRITICAL';
  } else if (stockItem.availableQty <= stockItem.reorderPoint) {
    stockStatus = 'LOW_STOCK';
  } else {
    stockStatus = 'IN_STOCK';
  }
  
  const stockStatusColors = {
    'IN_STOCK': 'success',
    'LOW_STOCK': 'warning',
    'CRITICAL': 'error',
    'OUT_OF_STOCK': 'default'
  };

  const expiryDate = stockItem.expiryDate ? new Date(stockItem.expiryDate) : null;
  const isExpiringSoon = expiryDate && 
    (expiryDate - new Date()) < (30 * 24 * 60 * 60 * 1000); // Within 30 days

  return {
    ...stockItem,
    productName: product.name || 'Unknown Product',
    productCode: product.fuelCode || product.code || 'N/A',
    category: product.category?.name || 'N/A',
    subCategory: product.subCategory?.name || 'N/A',
    stockStatus,
    stockStatusColor: stockStatusColors[stockStatus] || 'default',
    isBelowReorder: stockItem.isBelowReorderPoint || false,
    isBelowMinStock: stockItem.availableQty <= (stockItem.minStock || 0),
    expiryDateFormatted: expiryDate ? expiryDate.toLocaleDateString() : 'No expiry',
    isExpiringSoon,
    requiresAttention: isExpiringSoon || stockItem.isBelowReorderPoint || (stockItem.availableQty <= (stockItem.minStock || 0)),
    // Stock metrics
    stockPercentage: stockItem.maxStock ? 
      Math.round((stockItem.availableQty / stockItem.maxStock) * 100) : null,
    // Product type
    productType: product.type || 'N/A'
  };
}

// In warehouseService.js - update formatStockSummary function
formatStockSummary(summaryData) {
  if (!summaryData) return null;
  
  const { warehouse, summary, lowStockItems, expiringSoonItems, totalProducts, totalAvailableQty } = summaryData;
  
  // Process summary statistics
  const stockSummary = {
    totalProducts: totalProducts || 0,
    totalAvailableQty: totalAvailableQty || 0,
    lowStockCount: lowStockItems?.length || 0,
    expiringSoonCount: expiringSoonItems?.length || 0,
    criticalCount: lowStockItems?.filter(item => item.availableQty <= item.minStock)?.length || 0,
    
    // Group by status
    byStatus: summary?.reduce((acc, item) => {
      const status = item.status || 'UNKNOWN';
      acc[status] = {
        count: item._count || 0,
        totalQty: item._sum?.availableQty || 0,
        physicalQty: item._sum?.physicalQty || 0
      };
      return acc;
    }, {}) || {}
  };
  
  return {
    warehouse: this.formatWarehouse(warehouse),
    summary: stockSummary,
    lowStockItems: lowStockItems?.map(item => this.formatStockItem(item)) || [],
    expiringSoonItems: expiringSoonItems?.map(item => this.formatStockItem(item)) || [],
    requiresAttention: stockSummary.lowStockCount > 0 || stockSummary.expiringSoonCount > 0
  };
}

  // =====================
  // UTILITY METHODS
  // =====================

  getLocationDisplay(warehouse) {
    if (warehouse.station) {
      const company = warehouse.station.company || warehouse.company;
      return `${warehouse.station.name}, ${company?.name || 'Unknown Company'}`;
    } else if (warehouse.company) {
      return `${warehouse.company.name} (Unassigned)`;
    }
    return 'Unknown Location';
  }

  getStockStatus(stockItem) {
    if (!stockItem) return 'UNKNOWN';
    
    if (stockItem.isBelowMinStock) return 'CRITICAL';
    if (stockItem.isBelowReorder) return 'LOW_STOCK';
    if (stockItem.availableQty > 0) return 'IN_STOCK';
    return 'OUT_OF_STOCK';
  }

  async searchWarehouses(searchTerm, additionalFilters = {}) {
    try {
      const filters = {
        search: searchTerm,
        ...additionalFilters
      };
      return await this.getWarehouses(filters);
    } catch (error) {
      throw handleError(error, 'searchWarehouses', { searchTerm, additionalFilters });
    }
  }

  async getUnassignedWarehouses(companyId) {
    try {
      const warehouses = await this.getCompanyWarehouses(companyId);
      if (Array.isArray(warehouses)) {
        return warehouses.filter(warehouse => !warehouse.stationId);
      }
      return [];
    } catch (error) {
      throw handleError(error, 'getUnassignedWarehouses', { companyId });
    }
  }

  async getWarehousesByAssetType(assetType) {
    try {
      const warehouses = await this.getWarehouses();
      if (Array.isArray(warehouses)) {
        return warehouses.filter(warehouse => 
          warehouse.asset && warehouse.asset.type === assetType
        );
      }
      return [];
    } catch (error) {
      throw handleError(error, 'getWarehousesByAssetType', { assetType });
    }
  }

  // =====================
  // EXPORT METHODS
  // =====================

  prepareWarehousesExport(warehouses) {
    return warehouses.map(warehouse => ({
      'Warehouse ID': warehouse.id || 'N/A',
      'Warehouse Name': warehouse.name || 'N/A',
      'Station': warehouse.station?.name || 'Unassigned',
      'Company': warehouse.company?.name || 'N/A',
      'Asset': warehouse.asset?.name || 'No Asset',
      'Asset Type': warehouse.asset?.type || 'N/A',
      'Total Stock': warehouse.totalStock || 0,
      'Low Stock Items': warehouse.lowStockItems || 0,
      'Critical Items': warehouse.criticalItems || 0,
      'Created Date': warehouse.createdAtFormatted || 'N/A',
      'Last Updated': warehouse.updatedAtFormatted || 'N/A',
      'Status': warehouse.hasStock ? 'Active' : 'Empty'
    }));
  }

  prepareStockSummaryExport(summaryData) {
    if (!summaryData) return [];
    
    const { warehouse, lowStockItems, expiringSoonItems, summary } = summaryData;
    const exportData = [];
    
    // Add warehouse info
    exportData.push({
      'Section': 'Warehouse Information',
      'Warehouse Name': warehouse.name || 'N/A',
      'Location': this.getLocationDisplay(warehouse),
      'Total Products': summary.totalProducts || 0,
      'Total Available Qty': summary.totalAvailableQty || 0,
      'Low Stock Items': summary.lowStockCount || 0,
      'Expiring Soon': summary.expiringSoonCount || 0,
      'Critical Items': summary.criticalCount || 0
    });
    
    // Add stock by status
    if (summary.byStatus) {
      Object.entries(summary.byStatus).forEach(([status, data]) => {
        exportData.push({
          'Section': 'Stock by Status',
          'Status': status,
          'Product Count': data.count,
          'Total Quantity': data.totalQty
        });
      });
    }
    
    // Add low stock items
    lowStockItems?.forEach(item => {
      exportData.push({
        'Section': 'Low Stock Items',
        'Product': item.productName || 'N/A',
        'Product Code': item.productCode || 'N/A',
        'Available Qty': item.availableQty || 0,
        'Reorder Point': item.reorderPoint || 'N/A',
        'Min Stock': item.minStock || 'N/A'
      });
    });
    
    // Add expiring soon items
    expiringSoonItems?.forEach(item => {
      exportData.push({
        'Section': 'Expiring Soon',
        'Product': item.productName || 'N/A',
        'Product Code': item.productCode || 'N/A',
        'Available Qty': item.availableQty || 0,
        'Expiry Date': item.expiryDateFormatted || 'N/A',
        'Days Remaining': Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) || 'N/A'
      });
    });
    
    return exportData;
  }

  // =====================
  // CACHE & STATE MANAGEMENT HELPERS
  // =====================

  createWarehouseCache() {
    let cache = {
      warehouses: new Map(),
      lastUpdated: null,
      companyWarehouses: new Map(),
      stationWarehouses: new Map()
    };

    return {
      getWarehouse(id) {
        return cache.warehouses.get(id);
      },

      setWarehouse(id, data) {
        cache.warehouses.set(id, {
          data,
          timestamp: Date.now()
        });
      },

      getCompanyWarehouses(companyId) {
        return cache.companyWarehouses.get(companyId);
      },

      setCompanyWarehouses(companyId, data) {
        cache.companyWarehouses.set(companyId, {
          data,
          timestamp: Date.now()
        });
      },

      getStationWarehouses(stationId) {
        return cache.stationWarehouses.get(stationId);
      },

      setStationWarehouses(stationId, data) {
        cache.stationWarehouses.set(stationId, {
          data,
          timestamp: Date.now()
        });
      },

      clearWarehouse(id) {
        cache.warehouses.delete(id);
      },

      clearCompanyWarehouses(companyId) {
        cache.companyWarehouses.delete(companyId);
      },

      clearStationWarehouses(stationId) {
        cache.stationWarehouses.delete(stationId);
      },

      clearAll() {
        cache.warehouses.clear();
        cache.companyWarehouses.clear();
        cache.stationWarehouses.clear();
        cache.lastUpdated = null;
      },

      isStale(timestamp, maxAge = 5 * 60 * 1000) { // 5 minutes default
        return !timestamp || (Date.now() - timestamp) > maxAge;
      }
    };
  }
}

// Create and export a singleton instance
export const warehouseService = new WarehouseService();

// Create and export cache instance
export const warehouseCache = warehouseService.createWarehouseCache();

export default warehouseService;