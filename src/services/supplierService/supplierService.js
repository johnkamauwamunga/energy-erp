import { apiService } from '../apiService';

// Enhanced logging utility with production control
const logger = {
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [SupplierService]', ...args);
    }
  },
  info: (...args) => console.log('ℹ️ [SupplierService]', ...args),
  warn: (...args) => console.warn('⚠️ [SupplierService]', ...args),
  error: (...args) => console.error('❌ [SupplierService]', ...args)
};

// Enhanced error handler with more specific messages
const handleError = (error, operation, context = {}) => {
  const errorMessages = {
    createSupplier: 'Failed to create supplier',
    updateSupplier: 'Failed to update supplier',
    getSuppliers: 'Failed to fetch suppliers',
    getSupplierById: 'Failed to fetch supplier details',
    deleteSupplier: 'Failed to delete supplier',
    addSupplierProduct: 'Failed to add product to supplier',
    updateSupplierProduct: 'Failed to update supplier product',
    getSupplierProducts: 'Failed to fetch supplier products',
    removeSupplierProduct: 'Failed to remove supplier product',
    bulkAddSupplierProducts: 'Failed to add products in bulk',
    getSupplierPerformance: 'Failed to fetch supplier performance',
    getSuppliersForProduct: 'Failed to fetch suppliers for product'
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
        throw new Error('Requested resource not found');
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

// Response handler
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
      } else {
        params.append(key, value);
      }
    }
  });
  
  return params.toString();
};

class SupplierService {
  // =====================
  // SUPPLIER CRUD METHODS
  // =====================
  
  async createSupplier(supplierData) {
    try {
      logger.info('Creating supplier:', supplierData);
      const response = await apiService.post('/suppliers', supplierData);
      return handleResponse(response, 'createSupplier');
    } catch (error) {
      throw handleError(error, 'createSupplier', { supplierData });
    }
  }

  async updateSupplier(supplierData) {
    try {
      logger.info('Updating supplier:', supplierData);
      const response = await apiService.put('/suppliers', supplierData);
      return handleResponse(response, 'updateSupplier');
    } catch (error) {
      throw handleError(error, 'updateSupplier', { supplierData });
    }
  }

  async getSuppliers(filters = {}) {
    try {
      logger.info('Fetching suppliers with filters:', filters);
      const queryString = buildQueryString(filters);
      const url = queryString ? `/suppliers?${queryString}` : '/suppliers';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getSuppliers');
    } catch (error) {
      throw handleError(error, 'getSuppliers', { filters });
    }
  }

  async getSupplierById(supplierId) {
    try {
      logger.info(`Fetching supplier: ${supplierId}`);
      const response = await apiService.get(`/suppliers/${supplierId}`);
      return handleResponse(response, 'getSupplierById');
    } catch (error) {
      throw handleError(error, 'getSupplierById', { supplierId });
    }
  }

  async deleteSupplier(supplierId) {
    try {
      logger.info(`Deleting supplier: ${supplierId}`);
      const response = await apiService.delete(`/suppliers/${supplierId}`);
      return handleResponse(response, 'deleteSupplier');
    } catch (error) {
      throw handleError(error, 'deleteSupplier', { supplierId });
    }
  }

  // =====================
  // SUPPLIER PRODUCT METHODS
  // =====================

  async addSupplierProduct(supplierProductData) {
    try {
      logger.info('Adding supplier product:', supplierProductData);
      const response = await apiService.post('/suppliers/products', supplierProductData);
      return handleResponse(response, 'addSupplierProduct');
    } catch (error) {
      throw handleError(error, 'addSupplierProduct', { supplierProductData });
    }
  }

  async updateSupplierProduct(supplierProductData) {
    try {
      logger.info('Updating supplier product:', supplierProductData);
      const response = await apiService.put('/suppliers/products', supplierProductData);
      return handleResponse(response, 'updateSupplierProduct');
    } catch (error) {
      throw handleError(error, 'updateSupplierProduct', { supplierProductData });
    }
  }

  async getSupplierProducts(filters = {}) {
    try {
      logger.info('Fetching supplier products with filters:', filters);
      const queryString = buildQueryString(filters);
      const url = queryString ? `/suppliers/products/all?${queryString}` : '/suppliers/products/all';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getSupplierProducts');
    } catch (error) {
      throw handleError(error, 'getSupplierProducts', { filters });
    }
  }

  async removeSupplierProduct(supplierProductId) {
    try {
      logger.info(`Removing supplier product: ${supplierProductId}`);
      const response = await apiService.delete(`/suppliers/products/${supplierProductId}`);
      return handleResponse(response, 'removeSupplierProduct');
    } catch (error) {
      throw handleError(error, 'removeSupplierProduct', { supplierProductId });
    }
  }

  // =====================
  // BULK OPERATIONS
  // =====================

  async bulkAddSupplierProducts(bulkData) {
    try {
      logger.info('Bulk adding supplier products:', bulkData);
      const response = await apiService.post('/suppliers/products/bulk', bulkData);
      return handleResponse(response, 'bulkAddSupplierProducts');
    } catch (error) {
      throw handleError(error, 'bulkAddSupplierProducts', { bulkData });
    }
  }

  // =====================
  // PERFORMANCE & ANALYTICS
  // =====================

  async getSupplierPerformance(supplierId) {
    try {
      logger.info(`Fetching supplier performance: ${supplierId}`);
      const response = await apiService.get(`/suppliers/${supplierId}/performance`);
      return handleResponse(response, 'getSupplierPerformance');
    } catch (error) {
      throw handleError(error, 'getSupplierPerformance', { supplierId });
    }
  }

  async getSuppliersForProduct(productId) {
    try {
      logger.info(`Fetching suppliers for product: ${productId}`);
      const response = await apiService.get(`/suppliers/product/${productId}/suppliers`);
      return handleResponse(response, 'getSuppliersForProduct');
    } catch (error) {
      throw handleError(error, 'getSuppliersForProduct', { productId });
    }
  }

  // =====================
  // ENHANCED UTILITY METHODS
  // =====================

  validateSupplier(supplierData) {
    const errors = {};

    if (!supplierData.name || !supplierData.name.trim()) {
      errors.name = 'Supplier name is required';
    }

    if (supplierData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierData.email)) {
      errors.email = 'Invalid email format';
    }

    if (supplierData.phone && !/^\+?[\d\s\-()]+$/.test(supplierData.phone)) {
      errors.phone = 'Invalid phone number format';
    }

    if (supplierData.paymentTerms && supplierData.paymentTerms < 0) {
      errors.paymentTerms = 'Payment terms cannot be negative';
    }

    if (supplierData.creditLimit && supplierData.creditLimit < 0) {
      errors.creditLimit = 'Credit limit cannot be negative';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  validateSupplierProduct(supplierProductData) {
    const errors = {};

    if (!supplierProductData.supplierId) {
      errors.supplierId = 'Supplier is required';
    }

    if (!supplierProductData.productId) {
      errors.productId = 'Product is required';
    }

    if (!supplierProductData.costPrice || supplierProductData.costPrice <= 0) {
      errors.costPrice = 'Valid cost price is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Enhanced formatting utilities
  formatSupplier(supplier) {
    if (!supplier) return null;
    
    const statusColors = {
      ACTIVE: 'success',
      INACTIVE: 'secondary',
      ON_HOLD: 'warning',
      BLACKLISTED: 'error'
    };

    return {
      ...supplier,
      displayName: `${supplier.name} (${supplier.code})`,
      contactInfo: supplier.contactPerson ? 
        `${supplier.contactPerson} - ${supplier.phone}` : supplier.phone,
      addressDisplay: [supplier.address, supplier.city, supplier.state, supplier.country]
        .filter(Boolean)
        .join(', '),
      productCount: supplier.supplierProducts ? supplier.supplierProducts.length : 0,
      purchaseCount: supplier._count ? supplier._count.purchases : 0,
      statusColor: statusColors[supplier.status] || 'default',
      isActive: supplier.status === 'ACTIVE'
    };
  }

  formatSupplierProduct(supplierProduct) {
    if (!supplierProduct) return null;
    
    const product = supplierProduct.product || {};
    const supplier = supplierProduct.supplier || {};
    
    return {
      ...supplierProduct,
      displayName: supplierProduct.supplierProductName || product.name,
      supplierName: supplier.name,
      productCode: product.fuelCode,
      categoryPath: product.fuelSubType 
        ? `${product.fuelSubType.category ? product.fuelSubType.category.name + ' → ' : ''}${product.fuelSubType.name}`
        : 'N/A',
      priceDisplay: `${supplierProduct.costPrice ? supplierProduct.costPrice.toLocaleString() : '0'} ${supplierProduct.currency || 'KES'}`,
      availabilityBadge: supplierProduct.isAvailable ? 'available' : 'unavailable',
      isExpired: supplierProduct.contractEndDate && 
        new Date(supplierProduct.contractEndDate) < new Date()
    };
  }

  // Search and filter utilities
  async searchSuppliers(searchTerm, additionalFilters = {}) {
    try {
      const filters = {
        search: searchTerm,
        ...additionalFilters
      };
      return await this.getSuppliers(filters);
    } catch (error) {
      throw handleError(error, 'searchSuppliers', { searchTerm, additionalFilters });
    }
  }

  async getPrimarySuppliersForProduct(productId) {
    try {
      const suppliers = await this.getSuppliersForProduct(productId);
      return suppliers.filter(sp => sp.isPrimary);
    } catch (error) {
      throw handleError(error, 'getPrimarySuppliersForProduct', { productId });
    }
  }

  // Supplier statistics
  async getSupplierStats() {
    try {
      const suppliers = await this.getSuppliers();
      
      const activeSuppliers = suppliers.filter(s => s.status === 'ACTIVE');
      const onHoldSuppliers = suppliers.filter(s => s.status === 'ON_HOLD');
      const blacklistedSuppliers = suppliers.filter(s => s.status === 'BLACKLISTED');
      const suppliersWithProducts = suppliers.filter(s => {
        const productCount = s.supplierProducts ? s.supplierProducts.length : 0;
        return productCount > 0;
      });
      
      return {
        totalSuppliers: suppliers.length,
        activeSuppliers: activeSuppliers.length,
        onHoldSuppliers: onHoldSuppliers.length,
        blacklistedSuppliers: blacklistedSuppliers.length,
        suppliersWithProducts: suppliersWithProducts.length
      };
    } catch (error) {
      throw handleError(error, 'getSupplierStats');
    }
  }

  // Export utilities
  prepareExportData(suppliers) {
    return suppliers.map(supplier => ({
      'Supplier Code': supplier.code,
      'Supplier Name': supplier.name,
      'Contact Person': supplier.contactPerson,
      'Email': supplier.email,
      'Phone': supplier.phone,
      'Status': supplier.status,
      'Type': supplier.supplierType,
      'Payment Terms': supplier.paymentTerms,
      'Credit Limit': supplier.creditLimit,
      'Products Count': supplier.supplierProducts ? supplier.supplierProducts.length : 0
    }));
  }
}

// Create and export a singleton instance
export const supplierService = new SupplierService();

// Example usage patterns for common operations
export const supplierExamples = {
  createSupplier: {
    name: "Vivo Energies Kenya Limited",
    code: "VIVO",
    contactPerson: "John Kamau",
    email: "supplier@vivoenergies.co.ke",
    phone: "+254712345678",
    address: "Vivo Energy House, Muthangari Drive, Westlands",
    city: "Nairobi",
    country: "Kenya",
    taxId: "P051234567K",
    paymentTerms: 30,
    supplierType: "FUEL_WHOLESALER"
  },

  addSupplierProduct: {
    supplierId: "supplier-uuid",
    productId: "product-uuid",
    supplierSku: "VIVO-PDL-001",
    costPrice: 120.50,
    currency: "KES",
    minOrderQty: 1000,
    isAvailable: true,
    isPrimary: true
  },

  bulkAddProducts: {
    supplierId: "supplier-uuid",
    products: [
      {
        productId: "product-uuid-1",
        supplierSku: "VIVO-PDL-001",
        costPrice: 120.50,
        isPrimary: true
      },
      {
        productId: "product-uuid-2",
        supplierSku: "VIVO-RDL-001",
        costPrice: 115.75,
        isPrimary: false
      }
    ]
  }
};

export default supplierService;