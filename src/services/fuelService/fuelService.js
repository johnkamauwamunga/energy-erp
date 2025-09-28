import { apiService } from '../apiService';

// Enhanced logging utility
const logger = {
  debug: (...args) => console.log('🔍 [FuelService]', ...args),
  info: (...args) => console.log('ℹ️ [FuelService]', ...args),
  warn: (...args) => console.warn('⚠️ [FuelService]', ...args),
  error: (...args) => console.error('❌ [FuelService]', ...args)
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

export const fuelService = {
  // =====================
  // FUEL CATEGORY METHODS
  // =====================
  
  createFuelCategory: async (categoryData) => {
    logger.info('Creating fuel category:', categoryData);
    debugRequest('POST', '/fuel/categories', categoryData);
    
    try {
      const response = await apiService.post('/fuel/categories', categoryData);
      debugResponse('POST', '/fuel/categories', response);
      return handleResponse(response, 'creating fuel category');
    } catch (error) {
      throw handleError(error, 'creating fuel category', 'Failed to create fuel category');
    }
  },

  updateFuelCategory: async (categoryData) => {
    logger.info('Updating fuel category:', categoryData);
    
    try {
      // Extract ID from data and use in URL (RESTful pattern)
      const { id, ...updateData } = categoryData;
      if (!id) {
        throw new Error('Category ID is required for update');
      }
      
      debugRequest('PUT', `/fuel/categories/${id}`, updateData);
      const response = await apiService.put(`/fuel/categories/${id}`, updateData);
      debugResponse('PUT', `/fuel/categories/${id}`, response);
      return handleResponse(response, 'updating fuel category');
    } catch (error) {
      throw handleError(error, 'updating fuel category', 'Failed to update fuel category');
    }
  },

  getFuelCategories: async (filters = {}) => {
    logger.info('Fetching fuel categories with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/fuel/categories?${params.toString()}` : '/fuel/categories';
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching fuel categories');
    } catch (error) {
      throw handleError(error, 'fetching fuel categories', 'Failed to fetch fuel categories');
    }
  },

  getFuelCategoryById: async (categoryId) => {
    logger.info(`Fetching fuel category: ${categoryId}`);
    
    try {
      debugRequest('GET', `/fuel/categories/${categoryId}`);
      const response = await apiService.get(`/fuel/categories/${categoryId}`);
      debugResponse('GET', `/fuel/categories/${categoryId}`, response);
      return handleResponse(response, 'fetching fuel category');
    } catch (error) {
      throw handleError(error, 'fetching fuel category', 'Failed to fetch fuel category');
    }
  },

  // =====================
  // FUEL SUBTYPE METHODS
  // =====================

  createFuelSubType: async (subTypeData) => {
    logger.info('Creating fuel subtype:', subTypeData);
    debugRequest('POST', '/fuel/subtypes', subTypeData);
    
    try {
      const response = await apiService.post('/fuel/subtypes', subTypeData);
      debugResponse('POST', '/fuel/subtypes', response);
      return handleResponse(response, 'creating fuel subtype');
    } catch (error) {
      throw handleError(error, 'creating fuel subtype', 'Failed to create fuel subtype');
    }
  },

  updateFuelSubType: async (subTypeData) => {
    logger.info('Updating fuel subtype:', subTypeData);
    
    try {
      // Extract ID from data and use in URL (RESTful pattern)
      const { id, ...updateData } = subTypeData;
      if (!id) {
        throw new Error('SubType ID is required for update');
      }
      
      debugRequest('PUT', `/fuel/subtypes/${id}`, updateData);
      const response = await apiService.put(`/fuel/subtypes/${id}`, updateData);
      debugResponse('PUT', `/fuel/subtypes/${id}`, response);
      return handleResponse(response, 'updating fuel subtype');
    } catch (error) {
      throw handleError(error, 'updating fuel subtype', 'Failed to update fuel subtype');
    }
  },

  getFuelSubTypes: async (filters = {}) => {
    logger.info('Fetching fuel subtypes with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/fuel/subtypes?${params.toString()}` : '/fuel/subtypes';
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching fuel subtypes');
    } catch (error) {
      throw handleError(error, 'fetching fuel subtypes', 'Failed to fetch fuel subtypes');
    }
  },

  getFuelSubTypeById: async (subTypeId) => {
    logger.info(`Fetching fuel subtype: ${subTypeId}`);
    
    try {
      debugRequest('GET', `/fuel/subtypes/${subTypeId}`);
      const response = await apiService.get(`/fuel/subtypes/${subTypeId}`);
      debugResponse('GET', `/fuel/subtypes/${subTypeId}`, response);
      return handleResponse(response, 'fetching fuel subtype');
    } catch (error) {
      throw handleError(error, 'fetching fuel subtype', 'Failed to fetch fuel subtype');
    }
  },

  // =====================
  // FUEL PRODUCT METHODS
  // =====================

  createFuelProduct: async (productData) => {
    logger.info('Creating fuel product:', productData);
    debugRequest('POST', '/fuel/products', productData);
    
    try {
      const response = await apiService.post('/fuel/products', productData);
      debugResponse('POST', '/fuel/products', response);
      return handleResponse(response, 'creating fuel product');
    } catch (error) {
      throw handleError(error, 'creating fuel product', 'Failed to create fuel product');
    }
  },

  updateFuelProduct: async (productData) => {
    logger.info('Updating fuel product:', productData);
    
    try {
      // Extract ID from data and use in URL (RESTful pattern)
      const { id, ...updateData } = productData;
      if (!id) {
        throw new Error('Product ID is required for update');
      }
      
      debugRequest('PUT', `/fuel/products/${id}`, updateData);
      const response = await apiService.put(`/fuel/products/${id}`, updateData);
      debugResponse('PUT', `/fuel/products/${id}`, response);
      return handleResponse(response, 'updating fuel product');
    } catch (error) {
      throw handleError(error, 'updating fuel product', 'Failed to update fuel product');
    }
  },

  getFuelProducts: async (filters = {}) => {
    logger.info('Fetching fuel products with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/fuel/products?${params.toString()}` : '/fuel/products';
      debugRequest('GET', url);
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching fuel products');
    } catch (error) {
      throw handleError(error, 'fetching fuel products', 'Failed to fetch fuel products');
    }
  },

  getFuelProductById: async (productId) => {
    logger.info(`Fetching fuel product: ${productId}`);
    
    try {
      debugRequest('GET', `/fuel/products/${productId}`);
      const response = await apiService.get(`/fuel/products/${productId}`);
      debugResponse('GET', `/fuel/products/${productId}`, response);
      return handleResponse(response, 'fetching fuel product');
    } catch (error) {
      throw handleError(error, 'fetching fuel product', 'Failed to fetch fuel product');
    }
  },

  // =====================
  // FUEL HIERARCHY METHODS
  // =====================

  getFuelHierarchy: async () => {
    logger.info('Fetching fuel hierarchy');
    
    try {
      debugRequest('GET', '/fuel/hierarchy');
      const response = await apiService.get('/fuel/hierarchy');
      debugResponse('GET', '/fuel/hierarchy', response);
      return handleResponse(response, 'fetching fuel hierarchy');
    } catch (error) {
      throw handleError(error, 'fetching fuel hierarchy', 'Failed to fetch fuel hierarchy');
    }
  },

  createFuelHierarchySequential: async (hierarchyData) => {
    logger.info('Creating fuel hierarchy sequentially:', hierarchyData);
    
    try {
      debugRequest('POST', '/fuel/hierarchy/sequential', hierarchyData);
      const response = await apiService.post('/fuel/hierarchy/sequential', hierarchyData);
      debugResponse('POST', '/fuel/hierarchy/sequential', response);
      return handleResponse(response, 'creating fuel hierarchy sequentially');
    } catch (error) {
      throw handleError(error, 'creating fuel hierarchy sequentially', 'Failed to create fuel hierarchy');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validateFuelProduct: (productData) => {
    const errors = [];

    if (!productData.name?.trim()) {
      errors.push('Product name is required');
    }

    if (!productData.fuelCode?.trim()) {
      errors.push('Fuel code is required');
    }

    if (!productData.fuelSubTypeId) {
      errors.push('Fuel subtype is required');
    }

    if (productData.density && (productData.density <= 0 || productData.density > 1.5)) {
      errors.push('Density must be between 0 and 1.5 kg/L');
    }

    if (productData.octaneRating && (productData.octaneRating < 0 || productData.octaneRating > 100)) {
      errors.push('Octane rating must be between 0 and 100');
    }

    if (productData.sulfurContent && productData.sulfurContent < 0) {
      errors.push('Sulfur content cannot be negative');
    }

    if (productData.minSellingPrice && productData.maxSellingPrice) {
      if (productData.minSellingPrice > productData.maxSellingPrice) {
        errors.push('Minimum selling price cannot be greater than maximum selling price');
      }
    }

    return errors;
  },

  validateFuelCategory: (categoryData) => {
    const errors = [];

    if (!categoryData.name?.trim()) {
      errors.push('Category name is required');
    }

    if (!categoryData.code?.trim()) {
      errors.push('Category code is required');
    }

    if (categoryData.typicalDensity && categoryData.typicalDensity <= 0) {
      errors.push('Typical density must be positive');
    }

    return errors;
  },

  validateFuelSubType: (subTypeData) => {
    const errors = [];

    if (!subTypeData.name?.trim()) {
      errors.push('Subtype name is required');
    }

    if (!subTypeData.code?.trim()) {
      errors.push('Subtype code is required');
    }

    if (!subTypeData.categoryId) {
      errors.push('Category is required');
    }

    return errors;
  },

  // =====================
  // UTILITY METHODS
  // =====================

  getDefaultQualityStandards: (categoryName) => {
    const upperName = categoryName?.toUpperCase() || '';
    
    if (upperName.includes('DIESEL')) {
      return {
        sulfurContent: 10,
        cetaneNumber: 51,
        flashPoint: 60,
        viscosity: 2.0,
        waterContent: 200
      };
    } else if (upperName.includes('PETROL') || upperName.includes('GASOLINE')) {
      return {
        sulfurContent: 50,
        octaneNumber: 91,
        benzeneContent: 1.0,
        vaporPressure: 45,
        leadContent: 0.0
      };
    } else if (upperName.includes('KEROSENE')) {
      return {
        sulfurContent: 50,
        flashPoint: 38,
        smokePoint: 20,
        freezePoint: -47
      };
    }
    
    return {
      sulfurContent: 50,
      flashPoint: 60,
      density: 0.80
    };
  },

  getDefaultCategoryProperties: (categoryName) => {
    const defaultCategoryColors = {
      'DIESEL': '#0047AB',
      'PETROL': '#FF0000',
      'KEROSENE': '#FFFF00',
      'LUBRICANTS': '#808080',
      'default': '#666666'
    };
    
    const defaultDensities = {
      'DIESEL': 0.85,
      'PETROL': 0.74,
      'KEROSENE': 0.81,
      'default': 0.80
    };
    
    const defaultHazardClasses = {
      'DIESEL': 'Class 3',
      'PETROL': 'Class 3',
      'KEROSENE': 'Class 3',
      'default': 'Class 3'
    };

    const upperName = categoryName?.toUpperCase() || '';
    
    return {
      color: defaultCategoryColors[upperName] || defaultCategoryColors.default,
      density: defaultDensities[upperName] || defaultDensities.default,
      hazardClass: defaultHazardClasses[upperName] || defaultHazardClasses.default
    };
  },

  formatFuelProduct: (product) => {
    if (!product) return null;
    
    return {
      ...product,
      displayName: `${product.name} (${product.fuelCode})`,
      fullCategoryPath: product.fuelSubType?.category 
        ? `${product.fuelSubType.category.name} → ${product.fuelSubType.name}`
        : 'N/A',
      densityDisplay: product.density ? `${product.density} kg/L` : 'Not set',
      octaneDisplay: product.octaneRating ? `RON ${product.octaneRating}` : 'N/A',
      priceRange: product.minSellingPrice && product.maxSellingPrice 
        ? `${product.minSellingPrice} - ${product.maxSellingPrice}`
        : 'Not set'
    };
  },

  // =====================
  // NEW UTILITY METHODS
  // =====================

  // Helper to extract IDs for RESTful URLs
  extractIdForUrl: (data, resourceName) => {
    const id = data.id;
    if (!id) {
      throw new Error(`${resourceName} ID is required for this operation`);
    }
    return id;
  },

  // Batch operations helper
  batchCreateFuelProducts: async (productsData) => {
    logger.info('Batch creating fuel products:', productsData.length);
    
    try {
      const promises = productsData.map(productData => 
        this.createFuelProduct(productData)
      );
      
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);
      
      return {
        successful,
        failed,
        total: productsData.length,
        successCount: successful.length,
        failureCount: failed.length
      };
    } catch (error) {
      throw handleError(error, 'batch creating fuel products', 'Failed to batch create fuel products');
    }
  },

  // Search across all fuel entities
  searchFuelEntities: async (searchTerm, companyId) => {
    logger.info(`Searching fuel entities for: "${searchTerm}"`);
    
    try {
      const [categories, subTypes, products] = await Promise.all([
        this.getFuelCategories({ search: searchTerm }),
        this.getFuelSubTypes({ search: searchTerm }),
        this.getFuelProducts({ search: searchTerm })
      ]);

      return {
        categories: categories || [],
        subTypes: subTypes || [],
        products: products || [],
        searchTerm,
        totalResults: (categories?.length || 0) + (subTypes?.length || 0) + (products?.length || 0)
      };
    } catch (error) {
      throw handleError(error, 'searching fuel entities', 'Failed to search fuel entities');
    }
  },
  // Add to fuelService object in fuelService.js

// =====================
// DELETE METHODS
// =====================

deleteFuelCategory: async (categoryId) => {
  logger.info(`Deleting fuel category: ${categoryId}`);
  
  try {
    const response = await apiService.delete(`/fuel/categories/${categoryId}`);
    return handleResponse(response, 'deleting fuel category');
  } catch (error) {
    throw handleError(error, 'deleting fuel category', 'Failed to delete fuel category');
  }
},

deleteFuelSubType: async (subTypeId) => {
  logger.info(`Deleting fuel subtype: ${subTypeId}`);
  
  try {
    const response = await apiService.delete(`/fuel/subtypes/${subTypeId}`);
    return handleResponse(response, 'deleting fuel subtype');
  } catch (error) {
    throw handleError(error, 'deleting fuel subtype', 'Failed to delete fuel subtype');
  }
},

deleteFuelProduct: async (productId) => {
  logger.info(`Deleting fuel product: ${productId}`);
  
  try {
    const response = await apiService.delete(`/fuel/products/${productId}`);
    return handleResponse(response, 'deleting fuel product');
  } catch (error) {
    throw handleError(error, 'deleting fuel product', 'Failed to delete fuel product');
  }
},
};

export default fuelService;