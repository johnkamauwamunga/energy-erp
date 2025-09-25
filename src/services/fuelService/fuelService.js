import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [FuelService]', ...args),
  info: (...args) => console.log('ℹ️ [FuelService]', ...args),
  warn: (...args) => console.warn('⚠️ [FuelService]', ...args),
  error: (...args) => console.error('❌ [FuelService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  if (response.data) {
    logger.debug(`${operation} successful`);
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

// Error handler utility
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
    
    if (status === 400 && data.errors) {
      const errorMessages = data.errors.map(err => err.message).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    
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
  
  // Create a new fuel category
  createFuelCategory: async (categoryData) => {
    logger.info('Creating fuel category:', categoryData);
    
    try {
      const response = await apiService.post('/fuel/categories', categoryData);
      return handleResponse(response, 'creating fuel category');
    } catch (error) {
      throw handleError(error, 'creating fuel category', 'Failed to create fuel category');
    }
  },

  // Update fuel category
  updateFuelCategory: async (categoryData) => {
    logger.info('Updating fuel category:', categoryData);
    
    try {
      const response = await apiService.put('/fuel/categories', categoryData);
      return handleResponse(response, 'updating fuel category');
    } catch (error) {
      throw handleError(error, 'updating fuel category', 'Failed to update fuel category');
    }
  },

  // Get all fuel categories with optional filtering
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
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching fuel categories');
    } catch (error) {
      throw handleError(error, 'fetching fuel categories', 'Failed to fetch fuel categories');
    }
  },

  // Get fuel category by ID
  getFuelCategoryById: async (categoryId) => {
    logger.info(`Fetching fuel category: ${categoryId}`);
    
    try {
      const response = await apiService.get(`/fuel/categories/${categoryId}`);
      return handleResponse(response, 'fetching fuel category');
    } catch (error) {
      throw handleError(error, 'fetching fuel category', 'Failed to fetch fuel category');
    }
  },

  // Delete fuel category
  deleteFuelCategory: async (categoryId) => {
    logger.info(`Deleting fuel category: ${categoryId}`);
    
    try {
      const response = await apiService.delete(`/fuel/categories/${categoryId}`);
      return handleResponse(response, 'deleting fuel category');
    } catch (error) {
      throw handleError(error, 'deleting fuel category', 'Failed to delete fuel category');
    }
  },

  // =====================
  // FUEL SUBTYPE METHODS
  // =====================

  // Create a new fuel subtype
  createFuelSubType: async (subTypeData) => {
    logger.info('Creating fuel subtype:', subTypeData);
    
    try {
      const response = await apiService.post('/fuel/subtypes', subTypeData);
      return handleResponse(response, 'creating fuel subtype');
    } catch (error) {
      throw handleError(error, 'creating fuel subtype', 'Failed to create fuel subtype');
    }
  },

  // Update fuel subtype
  updateFuelSubType: async (subTypeData) => {
    logger.info('Updating fuel subtype:', subTypeData);
    
    try {
      const response = await apiService.put('/fuel/subtypes', subTypeData);
      return handleResponse(response, 'updating fuel subtype');
    } catch (error) {
      throw handleError(error, 'updating fuel subtype', 'Failed to update fuel subtype');
    }
  },

  // Get all fuel subtypes with optional filtering
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
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching fuel subtypes');
    } catch (error) {
      throw handleError(error, 'fetching fuel subtypes', 'Failed to fetch fuel subtypes');
    }
  },

  // Get fuel subtype by ID
  getFuelSubTypeById: async (subTypeId) => {
    logger.info(`Fetching fuel subtype: ${subTypeId}`);
    
    try {
      const response = await apiService.get(`/fuel/subtypes/${subTypeId}`);
      return handleResponse(response, 'fetching fuel subtype');
    } catch (error) {
      throw handleError(error, 'fetching fuel subtype', 'Failed to fetch fuel subtype');
    }
  },

  // Delete fuel subtype
  deleteFuelSubType: async (subTypeId) => {
    logger.info(`Deleting fuel subtype: ${subTypeId}`);
    
    try {
      const response = await apiService.delete(`/fuel/subtypes/${subTypeId}`);
      return handleResponse(response, 'deleting fuel subtype');
    } catch (error) {
      throw handleError(error, 'deleting fuel subtype', 'Failed to delete fuel subtype');
    }
  },

  // Get subtypes by category
  getSubTypesByCategory: async (categoryId, filters = {}) => {
    logger.info(`Fetching subtypes for category: ${categoryId}`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/fuel/subtypes/category/${categoryId}?${params.toString()}`;
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching subtypes by category');
    } catch (error) {
      throw handleError(error, 'fetching subtypes by category', 'Failed to fetch subtypes by category');
    }
  },

  // =====================
  // FUEL PRODUCT METHODS
  // =====================

  // Create a new fuel product
  createFuelProduct: async (productData) => {
    logger.info('Creating fuel product:', productData);
    
    try {
      const response = await apiService.post('/fuel/products', productData);
      return handleResponse(response, 'creating fuel product');
    } catch (error) {
      throw handleError(error, 'creating fuel product', 'Failed to create fuel product');
    }
  },

  // Update fuel product
  updateFuelProduct: async (productData) => {
    logger.info('Updating fuel product:', productData);
    
    try {
      const response = await apiService.put('/fuel/products', productData);
      return handleResponse(response, 'updating fuel product');
    } catch (error) {
      throw handleError(error, 'updating fuel product', 'Failed to update fuel product');
    }
  },

  // Get all fuel products with optional filtering
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
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching fuel products');
    } catch (error) {
      throw handleError(error, 'fetching fuel products', 'Failed to fetch fuel products');
    }
  },

  // Get fuel product by ID
  getFuelProductById: async (productId) => {
    logger.info(`Fetching fuel product: ${productId}`);
    
    try {
      const response = await apiService.get(`/fuel/products/${productId}`);
      return handleResponse(response, 'fetching fuel product');
    } catch (error) {
      throw handleError(error, 'fetching fuel product', 'Failed to fetch fuel product');
    }
  },

  // Delete fuel product
  deleteFuelProduct: async (productId) => {
    logger.info(`Deleting fuel product: ${productId}`);
    
    try {
      const response = await apiService.delete(`/fuel/products/${productId}`);
      return handleResponse(response, 'deleting fuel product');
    } catch (error) {
      throw handleError(error, 'deleting fuel product', 'Failed to delete fuel product');
    }
  },

  // Search fuel products by various criteria
  searchFuelProducts: async (searchCriteria = {}) => {
    logger.info('Searching fuel products with criteria:', searchCriteria);
    
    try {
      const params = new URLSearchParams();
      Object.keys(searchCriteria).forEach(key => {
        if (searchCriteria[key] !== undefined && searchCriteria[key] !== null && searchCriteria[key] !== '') {
          params.append(key, searchCriteria[key]);
        }
      });
      
      const response = await apiService.get(`/fuel/products/search?${params.toString()}`);
      return handleResponse(response, 'searching fuel products');
    } catch (error) {
      throw handleError(error, 'searching fuel products', 'Failed to search fuel products');
    }
  },

  // Get products by subtype
  getProductsBySubType: async (subTypeId, filters = {}) => {
    logger.info(`Fetching products for subtype: ${subTypeId}`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/fuel/products/subtype/${subTypeId}?${params.toString()}`;
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching products by subtype');
    } catch (error) {
      throw handleError(error, 'fetching products by subtype', 'Failed to fetch products by subtype');
    }
  },

  // Get products by category
  getProductsByCategory: async (categoryId, filters = {}) => {
    logger.info(`Fetching products for category: ${categoryId}`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `/fuel/products/category/${categoryId}?${params.toString()}`;
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching products by category');
    } catch (error) {
      throw handleError(error, 'fetching products by category', 'Failed to fetch products by category');
    }
  },

  // =====================
  // FUEL HIERARCHY METHODS
  // =====================

  // Get complete fuel hierarchy
  getFuelHierarchy: async () => {
    logger.info('Fetching fuel hierarchy');
    
    try {
      const response = await apiService.get('/fuel/hierarchy');
      return handleResponse(response, 'fetching fuel hierarchy');
    } catch (error) {
      throw handleError(error, 'fetching fuel hierarchy', 'Failed to fetch fuel hierarchy');
    }
  },

  // Create fuel hierarchy sequentially (category → subtype → product)
  createFuelHierarchySequential: async (hierarchyData) => {
    logger.info('Creating fuel hierarchy sequentially:', hierarchyData);
    
    try {
      const response = await apiService.post('/fuel/hierarchy/sequential', hierarchyData);
      return handleResponse(response, 'creating fuel hierarchy sequentially');
    } catch (error) {
      throw handleError(error, 'creating fuel hierarchy sequentially', 'Failed to create fuel hierarchy');
    }
  },

  // =====================
  // BULK OPERATIONS
  // =====================

  // Bulk update fuel products
  bulkUpdateFuelProducts: async (updates) => {
    logger.info('Bulk updating fuel products:', updates);
    
    try {
      const response = await apiService.patch('/fuel/products/bulk', { updates });
      return handleResponse(response, 'bulk updating fuel products');
    } catch (error) {
      throw handleError(error, 'bulk updating fuel products', 'Failed to bulk update fuel products');
    }
  },

  // Bulk create fuel products
  bulkCreateFuelProducts: async (productsData) => {
    logger.info('Bulk creating fuel products:', productsData);
    
    try {
      const response = await apiService.post('/fuel/products/bulk', { products: productsData });
      return handleResponse(response, 'bulk creating fuel products');
    } catch (error) {
      throw handleError(error, 'bulk creating fuel products', 'Failed to bulk create fuel products');
    }
  },

  // =====================
  // EXPORT METHODS
  // =====================

  // Export fuel data
  exportFuelData: async (format = 'csv', filters = {}) => {
    logger.info(`Exporting fuel data as ${format} with filters:`, filters);
    
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Handle file download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fuel-data.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Export completed successfully' };
    } catch (error) {
      throw handleError(error, 'exporting fuel data', 'Failed to export fuel data');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================

  // Validate fuel product data
  validateFuelProduct: (productData) => {
    const errors = [];

    // Required fields validation
    if (!productData.name?.trim()) {
      errors.push('Product name is required');
    }

    if (!productData.fuelCode?.trim()) {
      errors.push('Fuel code is required');
    }

    if (!productData.fuelSubTypeId) {
      errors.push('Fuel subtype is required');
    }

    // Numeric field validation
    if (productData.density && (productData.density <= 0 || productData.density > 1.5)) {
      errors.push('Density must be between 0 and 1.5 kg/L');
    }

    if (productData.octaneRating && (productData.octaneRating < 0 || productData.octaneRating > 100)) {
      errors.push('Octane rating must be between 0 and 100');
    }

    if (productData.sulfurContent && productData.sulfurContent < 0) {
      errors.push('Sulfur content cannot be negative');
    }

    // Price validation
    if (productData.minSellingPrice && productData.maxSellingPrice) {
      if (productData.minSellingPrice > productData.maxSellingPrice) {
        errors.push('Minimum selling price cannot be greater than maximum selling price');
      }
    }

    return errors;
  },

  // Validate fuel category data
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

  // Validate fuel subtype data
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

  // Get default quality standards for a fuel category
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

  // Get default category properties
  getDefaultCategoryProperties: (categoryName) => {
    const defaultCategoryColors = {
      'DIESEL': '#0047AB',     // Blue
      'PETROL': '#FF0000',     // Red
      'KEROSENE': '#FFFF00',   // Yellow
      'LUBRICANTS': '#808080', // Gray
      'default': '#666666'     // Default gray
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

  // Format fuel product for display
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

  // Calculate mass from volume
  calculateMassFromVolume: (volume, density, temperature = 15) => {
    if (!volume || !density) return null;
    
    // Simple temperature correction (basic implementation)
    const temperatureCorrection = 1 - (0.0008 * (temperature - 15));
    const correctedDensity = density * temperatureCorrection;
    
    return volume * correctedDensity;
  },

  // Check if fuel code is unique
  checkFuelCodeUnique: async (fuelCode, excludeProductId = null) => {
    try {
      const params = new URLSearchParams();
      params.append('fuelCode', fuelCode);
      if (excludeProductId) {
        params.append('excludeId', excludeProductId);
      }
      
      const response = await apiService.get(`/fuel/products/check-unique?${params.toString()}`);
      return handleResponse(response, 'checking fuel code uniqueness');
    } catch (error) {
      throw handleError(error, 'checking fuel code uniqueness', 'Failed to check fuel code uniqueness');
    }
  }
};

export default fuelService;