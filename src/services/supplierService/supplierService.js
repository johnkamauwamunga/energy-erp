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
    getSupplierProductsById: 'Failed to fetch supplier products',
    removeSupplierProduct: 'Failed to remove supplier product',
    bulkAddSupplierProducts: 'Failed to add products in bulk',
    getSupplierStats: 'Failed to fetch supplier statistics',
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
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects (if any)
        params.append(key, JSON.stringify(value));
      } else {
        params.append(key, value.toString());
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
      
      // Prepare data with proper types
      const formattedData = {
        ...supplierData,
        paymentTerms: supplierData.paymentTerms ? parseInt(supplierData.paymentTerms) : 30,
        deliveryLeadTime: supplierData.deliveryLeadTime ? parseInt(supplierData.deliveryLeadTime) : 0,
        creditLimit: supplierData.creditLimit ? parseFloat(supplierData.creditLimit) : undefined
      };
      
      const response = await apiService.post('/suppliers', formattedData);
      return handleResponse(response, 'createSupplier');
    } catch (error) {
      throw handleError(error, 'createSupplier', { supplierData });
    }
  }

  async updateSupplier(supplierData) {
    try {
      logger.info('Updating supplier:', supplierData);
      
      // Ensure id is included and data types are correct
      if (!supplierData.id) {
        throw new Error('Supplier ID is required for update');
      }
      
      const formattedData = {
        ...supplierData,
        paymentTerms: supplierData.paymentTerms ? parseInt(supplierData.paymentTerms) : undefined,
        deliveryLeadTime: supplierData.deliveryLeadTime ? parseInt(supplierData.deliveryLeadTime) : undefined,
        creditLimit: supplierData.creditLimit ? parseFloat(supplierData.creditLimit) : undefined,
        rating: supplierData.rating ? parseFloat(supplierData.rating) : undefined
      };
      
      const response = await apiService.put('/suppliers', formattedData);
      return handleResponse(response, 'updateSupplier');
    } catch (error) {
      throw handleError(error, 'updateSupplier', { supplierData });
    }
  }

  async getSuppliers(filters = {}) {
    try {
      logger.info('Fetching suppliers with filters:', filters);
      
      // Format filters with proper types
      const formattedFilters = {
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 50,
        includeProducts: filters.includeProducts || false,
        paymentTerms: filters.paymentTerms ? parseInt(filters.paymentTerms) : undefined,
        // Ensure enum values are uppercase to match backend
        status: filters.status ? filters.status.toUpperCase() : undefined,
        supplierType: filters.supplierType ? filters.supplierType.toUpperCase() : undefined,
        productType: filters.productType ? filters.productType.toUpperCase() : undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString ? `/suppliers?${queryString}` : '/suppliers';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getSuppliers');
    } catch (error) {
      throw handleError(error, 'getSuppliers', { filters });
    }
  }

  async getSupplierById(supplierId, includeProducts = false) {
    try {
      logger.info(`Fetching supplier: ${supplierId}, includeProducts: ${includeProducts}`);
      
      const queryString = buildQueryString({ includeProducts });
      const url = queryString ? `/suppliers/${supplierId}?${queryString}` : `/suppliers/${supplierId}`;
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getSupplierById');
    } catch (error) {
      throw handleError(error, 'getSupplierById', { supplierId, includeProducts });
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
      
      // Format data with proper types
      const formattedData = {
        ...supplierProductData,
        costPrice: parseFloat(supplierProductData.costPrice),
        minOrderQty: supplierProductData.minOrderQty ? parseFloat(supplierProductData.minOrderQty) : undefined,
        maxOrderQty: supplierProductData.maxOrderQty ? parseFloat(supplierProductData.maxOrderQty) : undefined,
        leadTime: supplierProductData.leadTime ? parseInt(supplierProductData.leadTime) : undefined,
        priority: supplierProductData.priority ? parseInt(supplierProductData.priority) : 0,
        // Parse quality specifications if provided
        qualitySpecifications: supplierProductData.qualitySpecifications ? 
          JSON.parse(JSON.stringify(supplierProductData.qualitySpecifications)) : undefined,
        // Parse contract terms if provided
        contractTerms: supplierProductData.contractTerms ? 
          JSON.parse(JSON.stringify(supplierProductData.contractTerms)) : undefined
      };
      
      const response = await apiService.post('/suppliers/products', formattedData);
      return handleResponse(response, 'addSupplierProduct');
    } catch (error) {
      throw handleError(error, 'addSupplierProduct', { supplierProductData });
    }
  }

  async updateSupplierProduct(supplierProductData) {
    try {
      logger.info('Updating supplier product:', supplierProductData);
      
      // Ensure id is included
      if (!supplierProductData.id) {
        throw new Error('Supplier Product ID is required for update');
      }
      
      // Format data with proper types
      const formattedData = {
        ...supplierProductData,
        costPrice: supplierProductData.costPrice ? parseFloat(supplierProductData.costPrice) : undefined,
        minOrderQty: supplierProductData.minOrderQty !== undefined ? 
          parseFloat(supplierProductData.minOrderQty) : undefined,
        maxOrderQty: supplierProductData.maxOrderQty !== undefined ? 
          parseFloat(supplierProductData.maxOrderQty) : undefined,
        leadTime: supplierProductData.leadTime !== undefined ? 
          parseInt(supplierProductData.leadTime) : undefined,
        priority: supplierProductData.priority !== undefined ? 
          parseInt(supplierProductData.priority) : undefined
      };
      
      const response = await apiService.put('/suppliers/products', formattedData);
      return handleResponse(response, 'updateSupplierProduct');
    } catch (error) {
      throw handleError(error, 'updateSupplierProduct', { supplierProductData });
    }
  }

  async getSupplierProducts(filters = {}) {
    try {
      logger.info('Fetching supplier products with filters:', filters);
      
      // Format filters
      const formattedFilters = {
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 50,
        isActive: filters.isActive !== undefined ? Boolean(filters.isActive) : undefined,
        isPrimary: filters.isPrimary !== undefined ? Boolean(filters.isPrimary) : undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString ? `/suppliers/products/all?${queryString}` : '/suppliers/products/all';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getSupplierProducts');
    } catch (error) {
      throw handleError(error, 'getSupplierProducts', { filters });
    }
  }

  async getSupplierProductsById(supplierId, filters = {}) {
    try {
      logger.info(`Fetching products for supplier: ${supplierId}`, filters);
      
      const formattedFilters = {
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 50,
        isPrimary: filters.isPrimary !== undefined ? Boolean(filters.isPrimary) : undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString 
        ? `/suppliers/${supplierId}/products?${queryString}`
        : `/suppliers/${supplierId}/products`;
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getSupplierProductsById');
    } catch (error) {
      throw handleError(error, 'getSupplierProductsById', { supplierId, filters });
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
      
      // Format products data
      const formattedData = {
        supplierId: bulkData.supplierId,
        products: bulkData.products.map(product => ({
          ...product,
          costPrice: parseFloat(product.costPrice),
          minOrderQty: product.minOrderQty ? parseFloat(product.minOrderQty) : undefined,
          maxOrderQty: product.maxOrderQty ? parseFloat(product.maxOrderQty) : undefined,
          leadTime: product.leadTime ? parseInt(product.leadTime) : undefined,
          priority: product.priority ? parseInt(product.priority) : 0,
          isAvailable: product.isAvailable !== undefined ? product.isAvailable : true,
          isPrimary: product.isPrimary !== undefined ? product.isPrimary : false
        }))
      };
      
      const response = await apiService.post('/suppliers/products/bulk', formattedData);
      return handleResponse(response, 'bulkAddSupplierProducts');
    } catch (error) {
      throw handleError(error, 'bulkAddSupplierProducts', { bulkData });
    }
  }

  // =====================
  // STATS & ANALYTICS
  // =====================

  async getSupplierStats() {
    try {
      logger.info('Fetching supplier statistics');
      const response = await apiService.get('/suppliers/stats/summary');
      return handleResponse(response, 'getSupplierStats');
    } catch (error) {
      throw handleError(error, 'getSupplierStats');
    }
  }

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
  // VALIDATION METHODS
  // =====================

  validateSupplier(supplierData) {
    const errors = {};

    if (!supplierData.name || !supplierData.name.trim()) {
      errors.name = 'Supplier name is required';
    } else if (supplierData.name.length > 200) {
      errors.name = 'Supplier name must be less than 200 characters';
    }

    if (supplierData.code && supplierData.code.length > 20) {
      errors.code = 'Supplier code must be less than 20 characters';
    }

    if (supplierData.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierData.email)) {
        errors.email = 'Invalid email format';
      }
    }

    if (supplierData.phone) {
      if (!/^\+?[\d\s\-()]+$/.test(supplierData.phone)) {
        errors.phone = 'Invalid phone number format';
      }
    }

    if (supplierData.paymentTerms !== undefined) {
      const paymentTerms = parseInt(supplierData.paymentTerms);
      if (isNaN(paymentTerms) || paymentTerms < 0 || paymentTerms > 365) {
        errors.paymentTerms = 'Payment terms must be between 0 and 365 days';
      }
    }

    if (supplierData.creditLimit !== undefined) {
      const creditLimit = parseFloat(supplierData.creditLimit);
      if (isNaN(creditLimit) || creditLimit < 0) {
        errors.creditLimit = 'Credit limit must be a positive number';
      }
    }

    if (supplierData.deliveryLeadTime !== undefined) {
      const leadTime = parseInt(supplierData.deliveryLeadTime);
      if (isNaN(leadTime) || leadTime < 0) {
        errors.deliveryLeadTime = 'Delivery lead time must be a positive number';
      }
    }

    // Validate supplier type
    const validSupplierTypes = [
      'FUEL_WHOLESALER', 'FUEL_REFINERY', 'OIL_COMPANY', 'DISTRIBUTOR', 
      'RETAIL_SUPPLIER', 'EQUIPMENT_VENDOR', 'SERVICE_PROVIDER', 'GENERAL_SUPPLIER'
    ];
    
    if (supplierData.supplierType && !validSupplierTypes.includes(supplierData.supplierType)) {
      errors.supplierType = 'Invalid supplier type';
    }

    // Validate status for updates
    const validStatuses = ['ACTIVE', 'INACTIVE', 'ON_HOLD', 'BLACKLISTED'];
    if (supplierData.status && !validStatuses.includes(supplierData.status)) {
      errors.status = 'Invalid supplier status';
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
    } else if (isNaN(parseFloat(supplierProductData.costPrice))) {
      errors.costPrice = 'Cost price must be a valid number';
    }

    if (supplierProductData.minOrderQty !== undefined && supplierProductData.minOrderQty < 0) {
      errors.minOrderQty = 'Minimum order quantity cannot be negative';
    }

    if (supplierProductData.maxOrderQty !== undefined) {
      const maxQty = parseFloat(supplierProductData.maxOrderQty);
      const minQty = supplierProductData.minOrderQty ? parseFloat(supplierProductData.minOrderQty) : 0;
      if (maxQty < minQty) {
        errors.maxOrderQty = 'Maximum order quantity must be greater than minimum order quantity';
      }
    }

    if (supplierProductData.leadTime !== undefined && supplierProductData.leadTime < 0) {
      errors.leadTime = 'Lead time cannot be negative';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // =====================
  // FORMATTING UTILITIES
  // =====================

  formatSupplier(supplier) {
    if (!supplier) return null;
    
    const statusColors = {
      ACTIVE: 'success',
      INACTIVE: 'secondary',
      ON_HOLD: 'warning',
      BLACKLISTED: 'error'
    };

    const typeLabels = {
      FUEL_WHOLESALER: 'Fuel Wholesaler',
      FUEL_REFINERY: 'Fuel Refinery',
      OIL_COMPANY: 'Oil Company',
      DISTRIBUTOR: 'Distributor',
      RETAIL_SUPPLIER: 'Retail Supplier',
      EQUIPMENT_VENDOR: 'Equipment Vendor',
      SERVICE_PROVIDER: 'Service Provider',
      GENERAL_SUPPLIER: 'General Supplier'
    };

    const productCount = supplier._count?.supplierProducts || 
      (Array.isArray(supplier.supplierProducts) ? supplier.supplierProducts.length : 0);

    return {
      ...supplier,
      displayName: `${supplier.name}${supplier.code ? ` (${supplier.code})` : ''}`,
      contactInfo: supplier.contactPerson ? 
        `${supplier.contactPerson} - ${supplier.phone}` : supplier.phone,
      addressDisplay: [supplier.address, supplier.city, supplier.state, supplier.country]
        .filter(Boolean)
        .join(', '),
      productCount,
      purchaseCount: supplier._count?.purchases || 0,
      statusColor: statusColors[supplier.status] || 'default',
      isActive: supplier.status === 'ACTIVE',
      typeLabel: typeLabels[supplier.supplierType] || supplier.supplierType,
      rating: supplier.rating || 0,
      deliveryInfo: supplier.deliveryLeadTime ? 
        `${supplier.deliveryLeadTime} day(s)${supplier.deliveryAreas ? ` - ${supplier.deliveryAreas}` : ''}` : 
        'Not specified',
      hasProducts: productCount > 0,
      // Format products if they exist
      formattedProducts: Array.isArray(supplier.supplierProducts) 
        ? supplier.supplierProducts.map(sp => this.formatSupplierProduct(sp))
        : []
    };
  }

  formatSupplierProduct(supplierProduct) {
    if (!supplierProduct) return null;
    
    const product = supplierProduct.product || {};
    const supplier = supplierProduct.supplier || {};
    
    const stockStatusColors = {
      IN_STOCK: 'success',
      LOW_STOCK: 'warning',
      OUT_OF_STOCK: 'error'
    };

    return {
      ...supplierProduct,
      displayName: supplierProduct.supplierProductName || product.name,
      supplierName: supplier.name,
      supplierCode: supplier.code,
      productCode: product.fuelCode || 'N/A',
      productName: product.name,
      category: product.category || 'N/A',
      priceDisplay: `${supplierProduct.costPrice ? supplierProduct.costPrice.toLocaleString() : '0'} ${supplierProduct.currency || 'KES'}`,
      availabilityBadge: supplierProduct.isAvailable ? 'available' : 'unavailable',
      stockStatusColor: stockStatusColors[supplierProduct.stockStatus] || 'default',
      stockStatusText: supplierProduct.stockStatus ? 
        supplierProduct.stockStatus.replace('_', ' ') : 'Unknown',
      isExpired: supplierProduct.contractEndDate && 
        new Date(supplierProduct.contractEndDate) < new Date(),
      leadTimeDisplay: supplierProduct.leadTime ? 
        `${supplierProduct.leadTime} day(s)` : 'Not specified',
      orderRange: supplierProduct.minOrderQty || supplierProduct.maxOrderQty ? 
        `${supplierProduct.minOrderQty || 0} - ${supplierProduct.maxOrderQty || 'No limit'}` : 
        'No restrictions',
      // Product type
      productType: product.type || 'N/A'
    };
  }

  // =====================
  // UTILITY METHODS
  // =====================

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
      const result = await this.getSuppliersForProduct(productId);
      const suppliers = result.data || result;
      return Array.isArray(suppliers) ? 
        suppliers.filter(sp => sp.isPrimary) : [];
    } catch (error) {
      throw handleError(error, 'getPrimarySuppliersForProduct', { productId });
    }
  }

  // Prepare export data
  prepareExportData(suppliers) {
    return suppliers.map(supplier => ({
      'Supplier Code': supplier.code || 'N/A',
      'Supplier Name': supplier.name || 'N/A',
      'Contact Person': supplier.contactPerson || 'N/A',
      'Email': supplier.email || 'N/A',
      'Phone': supplier.phone || 'N/A',
      'Status': supplier.status || 'N/A',
      'Type': this.formatSupplier(supplier).typeLabel || 'N/A',
      'Payment Terms': supplier.paymentTerms || 'N/A',
      'Credit Limit': supplier.creditLimit || 'N/A',
      'Delivery Lead Time': supplier.deliveryLeadTime || 'N/A',
      'Products Count': this.formatSupplier(supplier).productCount || 0,
      'Rating': supplier.rating || 'N/A',
      'Delivery Areas': supplier.deliveryAreas || 'N/A',
      'Address': [supplier.address, supplier.city, supplier.state, supplier.country]
        .filter(Boolean)
        .join(', ')
    }));
  }

  prepareSupplierProductsExport(supplierProducts) {
    return supplierProducts.map(sp => ({
      'Supplier': sp.supplier?.name || 'N/A',
      'Product': sp.product?.name || sp.supplierProductName || 'N/A',
      'Product Code': sp.product?.fuelCode || 'N/A',
      'Supplier SKU': sp.supplierSku || 'N/A',
      'Cost Price': sp.costPrice || 'N/A',
      'Currency': sp.currency || 'KES',
      'Minimum Order': sp.minOrderQty || 'N/A',
      'Maximum Order': sp.maxOrderQty || 'N/A',
      'Lead Time': sp.leadTime || 'N/A',
      'Availability': sp.isAvailable ? 'Available' : 'Not Available',
      'Primary Supplier': sp.isPrimary ? 'Yes' : 'No',
      'Stock Status': sp.stockStatus || 'N/A',
      'Certification': sp.certification || 'N/A'
    }));
  }
}

// Create and export a singleton instance
export const supplierService = new SupplierService();

// Example usage patterns
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
    businessRegNumber: "C-123456",
    paymentTerms: 30,
    creditLimit: 1000000,
    supplierType: "FUEL_WHOLESALER",
    deliveryLeadTime: 2,
    deliveryAreas: "Nairobi, Mombasa, Kisumu"
  },

  addSupplierProduct: {
    supplierId: "123e4567-e89b-12d3-a456-426614174000",
    productId: "223e4567-e89b-12d3-a456-426614174000",
    supplierSku: "VIVO-PDL-001",
    supplierProductName: "Premium Diesel",
    costPrice: 120.50,
    currency: "KES",
    minOrderQty: 1000,
    maxOrderQty: 50000,
    leadTime: 2,
    isAvailable: true,
    isPrimary: true,
    priority: 1
  }
};

export default supplierService;