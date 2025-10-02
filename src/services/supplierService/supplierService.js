import { apiService } from '../apiService';

// Enhanced logging utility
const logger = {
  debug: (...args) => console.log('🔍 [SupplierService]', ...args),
  info: (...args) => console.log('ℹ️ [SupplierService]', ...args),
  warn: (...args) => console.warn('⚠️ [SupplierService]', ...args),
  error: (...args) => console.error('❌ [SupplierService]', ...args)
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

export const supplierService = {
  // =====================
  // SUPPLIER CRUD METHODS
  // =====================
  
  createSupplier: async (supplierData) => {
    logger.info('Creating supplier:', supplierData);
    debugRequest('POST', '/suppliers', supplierData);
    
    try {
      const response = await apiService.post('/suppliers', supplierData);
      debugResponse('POST', '/suppliers', response);
      return handleResponse(response, 'creating supplier');
    } catch (error) {
      throw handleError(error, 'creating supplier', 'Failed to create supplier');
    }
  },

  updateSupplier: async (supplierData) => {
    logger.info('Updating supplier:', supplierData);
    debugRequest('PUT', '/suppliers', supplierData);
    
    try {
      const response = await apiService.put('/suppliers', supplierData);
      debugResponse('PUT', '/suppliers', response);
      return handleResponse(response, 'updating supplier');
    } catch (error) {
      throw handleError(error, 'updating supplier', 'Failed to update supplier');
    }
  },

  getSuppliers: async (filters = {}) => {
    logger.info('Fetching suppliers with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/suppliers?${params.toString()}` : '/suppliers';
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching suppliers');
    } catch (error) {
      throw handleError(error, 'fetching suppliers', 'Failed to fetch suppliers');
    }
  },

  getSupplierById: async (supplierId) => {
    logger.info(`Fetching supplier: ${supplierId}`);
    
    try {
      debugRequest('GET', `/suppliers/${supplierId}`);
      const response = await apiService.get(`/suppliers/${supplierId}`);
      debugResponse('GET', `/suppliers/${supplierId}`, response);
      return handleResponse(response, 'fetching supplier');
    } catch (error) {
      throw handleError(error, 'fetching supplier', 'Failed to fetch supplier');
    }
  },

  deleteSupplier: async (supplierId) => {
    logger.info(`Deleting supplier: ${supplierId}`);
    
    try {
      debugRequest('DELETE', `/suppliers/${supplierId}`);
      const response = await apiService.delete(`/suppliers/${supplierId}`);
      debugResponse('DELETE', `/suppliers/${supplierId}`, response);
      return handleResponse(response, 'deleting supplier');
    } catch (error) {
      throw handleError(error, 'deleting supplier', 'Failed to delete supplier');
    }
  },

  // =====================
  // SUPPLIER PRODUCT METHODS
  // =====================

  addSupplierProduct: async (supplierProductData) => {
    logger.info('Adding supplier product:', supplierProductData);
    debugRequest('POST', '/suppliers/products', supplierProductData);
    
    try {
      const response = await apiService.post('/suppliers/products', supplierProductData);
      debugResponse('POST', '/suppliers/products', response);
      return handleResponse(response, 'adding supplier product');
    } catch (error) {
      throw handleError(error, 'adding supplier product', 'Failed to add supplier product');
    }
  },

  updateSupplierProduct: async (supplierProductData) => {
    logger.info('Updating supplier product:', supplierProductData);
    debugRequest('PUT', '/suppliers/products', supplierProductData);
    
    try {
      const response = await apiService.put('/suppliers/products', supplierProductData);
      debugResponse('PUT', '/suppliers/products', response);
      return handleResponse(response, 'updating supplier product');
    } catch (error) {
      throw handleError(error, 'updating supplier product', 'Failed to update supplier product');
    }
  },

  getSupplierProducts: async (filters = {}) => {
    logger.info('Fetching supplier products with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/suppliers/products/all?${params.toString()}` : '/suppliers/products/all';
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching supplier products');
    } catch (error) {
      throw handleError(error, 'fetching supplier products', 'Failed to fetch supplier products');
    }
  },

  removeSupplierProduct: async (supplierProductId) => {
    logger.info(`Removing supplier product: ${supplierProductId}`);
    
    try {
      debugRequest('DELETE', `/suppliers/products/${supplierProductId}`);
      const response = await apiService.delete(`/suppliers/products/${supplierProductId}`);
      debugResponse('DELETE', `/suppliers/products/${supplierProductId}`, response);
      return handleResponse(response, 'removing supplier product');
    } catch (error) {
      throw handleError(error, 'removing supplier product', 'Failed to remove supplier product');
    }
  },

  // =====================
  // BULK OPERATIONS
  // =====================

  bulkAddSupplierProducts: async (bulkData) => {
    logger.info('Bulk adding supplier products:', bulkData);
    debugRequest('POST', '/suppliers/products/bulk', bulkData);
    
    try {
      const response = await apiService.post('/suppliers/products/bulk', bulkData);
      debugResponse('POST', '/suppliers/products/bulk', response);
      return handleResponse(response, 'bulk adding supplier products');
    } catch (error) {
      throw handleError(error, 'bulk adding supplier products', 'Failed to bulk add supplier products');
    }
  },

  // =====================
  // PERFORMANCE & ANALYTICS
  // =====================

  getSupplierPerformance: async (supplierId) => {
    logger.info(`Fetching supplier performance: ${supplierId}`);
    
    try {
      debugRequest('GET', `/suppliers/${supplierId}/performance`);
      const response = await apiService.get(`/suppliers/${supplierId}/performance`);
      debugResponse('GET', `/suppliers/${supplierId}/performance`, response);
      return handleResponse(response, 'fetching supplier performance');
    } catch (error) {
      throw handleError(error, 'fetching supplier performance', 'Failed to fetch supplier performance');
    }
  },

  getSuppliersForProduct: async (productId) => {
    logger.info(`Fetching suppliers for product: ${productId}`);
    
    try {
      debugRequest('GET', `/suppliers/product/${productId}/suppliers`);
      const response = await apiService.get(`/suppliers/product/${productId}/suppliers`);
      debugResponse('GET', `/suppliers/product/${productId}/suppliers`, response);
      return handleResponse(response, 'fetching suppliers for product');
    } catch (error) {
      throw handleError(error, 'fetching suppliers for product', 'Failed to fetch suppliers for product');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validateSupplier: (supplierData) => {
    const errors = [];

    if (!supplierData.name?.trim()) {
      errors.push('Supplier name is required');
    }

    if (supplierData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierData.email)) {
      errors.push('Invalid email format');
    }

    if (supplierData.phone && !/^\+?[\d\s\-()]+$/.test(supplierData.phone)) {
      errors.push('Invalid phone number format');
    }

    if (supplierData.paymentTerms && supplierData.paymentTerms < 0) {
      errors.push('Payment terms cannot be negative');
    }

    if (supplierData.creditLimit && supplierData.creditLimit < 0) {
      errors.push('Credit limit cannot be negative');
    }

    return errors;
  },

  validateSupplierProduct: (supplierProductData) => {
    const errors = [];

    if (!supplierProductData.supplierId) {
      errors.push('Supplier ID is required');
    }

    if (!supplierProductData.productId) {
      errors.push('Product ID is required');
    }

    if (!supplierProductData.costPrice || supplierProductData.costPrice <= 0) {
      errors.push('Valid cost price is required');
    }

    return errors;
  },

  // =====================
  // UTILITY METHODS
  // =====================

  formatSupplier: (supplier) => {
    if (!supplier) return null;
    
    return {
      ...supplier,
      displayName: `${supplier.name} (${supplier.code})`,
      contactInfo: supplier.contactPerson ? `${supplier.contactPerson} - ${supplier.phone}` : supplier.phone,
      addressDisplay: [supplier.address, supplier.city, supplier.state, supplier.country]
        .filter(Boolean)
        .join(', '),
      productCount: supplier.supplierProducts?.length || 0,
      statusBadge: supplier.status?.toLowerCase() || 'active'
    };
  },

  formatSupplierProduct: (supplierProduct) => {
    if (!supplierProduct) return null;
    
    return {
      ...supplierProduct,
      displayName: supplierProduct.supplierProductName || supplierProduct.product?.name,
      supplierName: supplierProduct.supplier?.name,
      productCode: supplierProduct.product?.fuelCode,
      categoryPath: supplierProduct.product?.fuelSubType 
        ? `${supplierProduct.product.fuelSubType.category?.name} → ${supplierProduct.product.fuelSubType.name}`
        : 'N/A',
      priceDisplay: `${supplierProduct.costPrice} ${supplierProduct.currency}`,
      availabilityBadge: supplierProduct.isAvailable ? 'available' : 'unavailable'
    };
  },

  // Search suppliers with advanced filtering
  searchSuppliers: async (searchTerm, additionalFilters = {}) => {
    logger.info(`Searching suppliers for: "${searchTerm}"`, additionalFilters);
    
    try {
      const filters = {
        search: searchTerm,
        ...additionalFilters
      };
      
      return await this.getSuppliers(filters);
    } catch (error) {
      throw handleError(error, 'searching suppliers', 'Failed to search suppliers');
    }
  },

  // Get primary suppliers for a product
  getPrimarySuppliersForProduct: async (productId) => {
    logger.info(`Fetching primary suppliers for product: ${productId}`);
    
    try {
      const suppliers = await this.getSuppliersForProduct(productId);
      return suppliers.filter(sp => sp.isPrimary);
    } catch (error) {
      throw handleError(error, 'fetching primary suppliers', 'Failed to fetch primary suppliers');
    }
  }
};

// =====================================================================
// PAYLOAD EXAMPLES FOR SUPPLIER MANAGEMENT
// =====================================================================

/*
// CREATE SUPPLIER PAYLOAD (Vivo Energies Example):
const supplierPayload = {
  name: "Vivo Energies Kenya Limited",
  code: "VIVO",
  contactPerson: "John Kamau",
  email: "supplier@vivoenergies.co.ke",
  phone: "+254712345678",
  alternatePhone: "+254734567890",
  address: "Vivo Energy House, Muthangari Drive, Westlands",
  city: "Nairobi",
  state: "Nairobi County", 
  country: "Kenya",
  taxId: "P051234567K",
  businessRegNumber: "CPT-2012-123456",
  paymentTerms: 30,
  creditLimit: 1000000,
  supplierType: "FUEL_WHOLESALER",
  deliveryLeadTime: 2,
  deliveryAreas: "Nairobi, Mombasa, Kisumu, Nakuru, Eldoret"
};

// ADD SUPPLIER PRODUCT PAYLOAD:
const supplierProductPayload = {
  supplierId: "SUPPLIER_ID_FROM_CREATION",
  productId: "PRODUCT_ID_FROM_FUEL_SYSTEM",
  supplierSku: "VIVO-PDL-001",
  supplierProductName: "Vivo Premium Diesel",
  costPrice: 120.50,
  currency: "KES",
  minOrderQty: 1000,
  maxOrderQty: 50000,
  leadTime: 2,
  isAvailable: true,
  isPrimary: true,
  priority: 1,
  qualitySpecifications: {
    sulfurContent: 10,
    cetaneNumber: 51,
    density: 0.85,
    flashPoint: 62
  },
  certification: "KEBS Certified",
  contractStartDate: "2025-01-01T00:00:00.000Z",
  contractEndDate: "2025-12-31T23:59:59.000Z"
};

// BULK ADD SUPPLIER PRODUCTS PAYLOAD:
const bulkSupplierProductsPayload = {
  supplierId: "SUPPLIER_ID_FROM_CREATION",
  products: [
    {
      productId: "PRODUCT_ID_1",
      supplierSku: "VIVO-PDL-001",
      supplierProductName: "Vivo Premium Diesel",
      costPrice: 120.50,
      isAvailable: true,
      isPrimary: true
    },
    {
      productId: "PRODUCT_ID_2", 
      supplierSku: "VIVO-RDL-001",
      supplierProductName: "Vivo Regular Diesel",
      costPrice: 115.75,
      isAvailable: true,
      isPrimary: false
    }
  ]
};
*/

export default supplierService;