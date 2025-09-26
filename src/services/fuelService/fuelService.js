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
  
  createFuelCategory: async (categoryData) => {
    logger.info('Creating fuel category:', categoryData);
    
    try {
      const response = await apiService.post('/fuel/categories', categoryData);
      return handleResponse(response, 'creating fuel category');
    } catch (error) {
      throw handleError(error, 'creating fuel category', 'Failed to create fuel category');
    }
  },

  updateFuelCategory: async (categoryData) => {
    logger.info('Updating fuel category:', categoryData);
    
    try {
      const response = await apiService.put('/fuel/categories', categoryData);
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
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching fuel categories');
    } catch (error) {
      throw handleError(error, 'fetching fuel categories', 'Failed to fetch fuel categories');
    }
  },

  getFuelCategoryById: async (categoryId) => {
    logger.info(`Fetching fuel category: ${categoryId}`);
    
    try {
      const response = await apiService.get(`/fuel/categories/${categoryId}`);
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
    
    try {
      const response = await apiService.post('/fuel/subtypes', subTypeData);
      return handleResponse(response, 'creating fuel subtype');
    } catch (error) {
      throw handleError(error, 'creating fuel subtype', 'Failed to create fuel subtype');
    }
  },

  updateFuelSubType: async (subTypeData) => {
    logger.info('Updating fuel subtype:', subTypeData);
    
    try {
      const response = await apiService.put('/fuel/subtypes', subTypeData);
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
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching fuel subtypes');
    } catch (error) {
      throw handleError(error, 'fetching fuel subtypes', 'Failed to fetch fuel subtypes');
    }
  },

  getFuelSubTypeById: async (subTypeId) => {
    logger.info(`Fetching fuel subtype: ${subTypeId}`);
    
    try {
      const response = await apiService.get(`/fuel/subtypes/${subTypeId}`);
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
    
    try {
      const response = await apiService.post('/fuel/products', productData);
      return handleResponse(response, 'creating fuel product');
    } catch (error) {
      throw handleError(error, 'creating fuel product', 'Failed to create fuel product');
    }
  },

  updateFuelProduct: async (productData) => {
    logger.info('Updating fuel product:', productData);
    
    try {
      const response = await apiService.put('/fuel/products', productData);
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
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching fuel products');
    } catch (error) {
      throw handleError(error, 'fetching fuel products', 'Failed to fetch fuel products');
    }
  },

  getFuelProductById: async (productId) => {
    logger.info(`Fetching fuel product: ${productId}`);
    
    try {
      const response = await apiService.get(`/fuel/products/${productId}`);
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
      const response = await apiService.get('/fuel/hierarchy');
      return handleResponse(response, 'fetching fuel hierarchy');
    } catch (error) {
      throw handleError(error, 'fetching fuel hierarchy', 'Failed to fetch fuel hierarchy');
    }
  },

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
  }
};

export default fuelService;