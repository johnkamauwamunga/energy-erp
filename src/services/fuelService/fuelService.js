import { apiService } from '../apiService';

class FuelService {
  constructor() {
    this.logger = {
      debug: (...args) => console.log('🔍 [FuelService]', ...args),
      info: (...args) => console.log('ℹ️ [FuelService]', ...args),
      warn: (...args) => console.warn('⚠️ [FuelService]', ...args),
      error: (...args) => console.error('❌ [FuelService]', ...args)
    };
    
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
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
      this.logger.debug(`${operation} successful`);
      return response.data.data;
    }
    
    if (response.data) {
      this.logger.debug(`${operation} successful (direct data)`);
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
          throw new Error('Requested resource not found.');
        
        case 400:
          return this.handleValidationError(data);
        
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
  // FUEL CATEGORIES
  // =====================

  createFuelCategory = async (categoryData) => {
    this.logger.info('Creating fuel category:', categoryData);
    this.debugRequest('POST', '/fuel/categories', categoryData);
    
    try {
      const response = await apiService.post('/fuel/categories', categoryData);
      this.debugResponse('POST', '/fuel/categories', response);
      this.clearCache('categories');
      return this.handleResponse(response, 'Category creation');
    } catch (error) {
      throw this.handleError(error, 'Category creation', 'Failed to create fuel category');
    }
  };

  updateFuelCategory = async (categoryData) => {
    this.logger.info('Updating fuel category:', categoryData);
    this.debugRequest('PUT', '/fuel/categories', categoryData);
    
    try {
      const response = await apiService.put('/fuel/categories', categoryData);
      this.debugResponse('PUT', '/fuel/categories', response);
      this.clearCache('categories');
      return this.handleResponse(response, 'Category update');
    } catch (error) {
      throw this.handleError(error, 'Category update', 'Failed to update fuel category');
    }
  };

  getFuelCategories = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching fuel categories:', filters);
    
    const cacheKey = `categories-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const url = query ? `/fuel/categories?${query}` : '/fuel/categories';
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Categories fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Categories fetch', 'Failed to fetch fuel categories');
    }
  };

  getFuelCategoryById = async (categoryId) => {
    this.logger.info(`Fetching fuel category: ${categoryId}`);
    
    const cacheKey = `category-${categoryId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      this.debugRequest('GET', `/fuel/categories/${categoryId}`);
      const response = await apiService.get(`/fuel/categories/${categoryId}`);
      this.debugResponse('GET', `/fuel/categories/${categoryId}`, response);
      
      const data = this.handleResponse(response, 'Category fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Category fetch', 'Failed to fetch fuel category');
    }
  };

  // =====================
  // FUEL SUBTYPES
  // =====================

  createFuelSubType = async (subTypeData) => {
    this.logger.info('Creating fuel subtype:', subTypeData);
    this.debugRequest('POST', '/fuel/subtypes', subTypeData);
    
    try {
      const response = await apiService.post('/fuel/subtypes', subTypeData);
      this.debugResponse('POST', '/fuel/subtypes', response);
      this.clearCache('subtypes');
      return this.handleResponse(response, 'Subtype creation');
    } catch (error) {
      throw this.handleError(error, 'Subtype creation', 'Failed to create fuel subtype');
    }
  };

  updateFuelSubType = async (subTypeData) => {
    this.logger.info('Updating fuel subtype:', subTypeData);
    this.debugRequest('PUT', '/fuel/subtypes', subTypeData);
    
    try {
      const response = await apiService.put('/fuel/subtypes', subTypeData);
      this.debugResponse('PUT', '/fuel/subtypes', response);
      this.clearCache('subtypes');
      return this.handleResponse(response, 'Subtype update');
    } catch (error) {
      throw this.handleError(error, 'Subtype update', 'Failed to update fuel subtype');
    }
  };

  getFuelSubTypes = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching fuel subtypes:', filters);
    
    const cacheKey = `subtypes-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const url = query ? `/fuel/subtypes?${query}` : '/fuel/subtypes';
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Subtypes fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Subtypes fetch', 'Failed to fetch fuel subtypes');
    }
  };

  getFuelSubTypeById = async (subTypeId) => {
    this.logger.info(`Fetching fuel subtype: ${subTypeId}`);
    
    const cacheKey = `subtype-${subTypeId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      this.debugRequest('GET', `/fuel/subtypes/${subTypeId}`);
      const response = await apiService.get(`/fuel/subtypes/${subTypeId}`);
      this.debugResponse('GET', `/fuel/subtypes/${subTypeId}`, response);
      
      const data = this.handleResponse(response, 'Subtype fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Subtype fetch', 'Failed to fetch fuel subtype');
    }
  };

  // =====================
  // FUEL PRODUCTS
  // =====================

  createFuelProduct = async (productData) => {
    this.logger.info('Creating fuel product:', productData);
    this.debugRequest('POST', '/fuel/products', productData);
    
    try {
      const response = await apiService.post('/fuel/products', productData);
      this.debugResponse('POST', '/fuel/products', response);
      this.clearCache('products');
      this.clearCache('pricing');
      return this.handleResponse(response, 'Product creation');
    } catch (error) {
      throw this.handleError(error, 'Product creation', 'Failed to create fuel product');
    }
  };

  updateFuelProduct = async (productData) => {
    this.logger.info('Updating fuel product:', productData);
    this.debugRequest('PUT', '/fuel/products', productData);
    
    try {
      const response = await apiService.put('/fuel/products', productData);
      this.debugResponse('PUT', '/fuel/products', response);
      this.clearCache('products');
      this.clearCache('pricing');
      return this.handleResponse(response, 'Product update');
    } catch (error) {
      throw this.handleError(error, 'Product update', 'Failed to update fuel product');
    }
  };

  getFuelProducts = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching fuel products:', filters);
    
    const cacheKey = `products-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const url = query ? `/fuel/products?${query}` : '/fuel/products';
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Products fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Products fetch', 'Failed to fetch fuel products');
    }
  };

  getFuelProductById = async (productId) => {
    this.logger.info(`Fetching fuel product: ${productId}`);
    
    const cacheKey = `product-${productId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      this.debugRequest('GET', `/fuel/products/${productId}`);
      const response = await apiService.get(`/fuel/products/${productId}`);
      this.debugResponse('GET', `/fuel/products/${productId}`, response);
      
      const data = this.handleResponse(response, 'Product fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Product fetch', 'Failed to fetch fuel product');
    }
  };

  // =====================
  // PRODUCT PRICING MANAGEMENT
  // =====================

  updateProductPrices = async (priceData) => {
    this.logger.info('Updating product prices:', priceData);
    this.debugRequest('PUT', '/fuel/products/prices', priceData);
    
    try {
      const response = await apiService.put('/fuel/products/prices', priceData);
      this.debugResponse('PUT', '/fuel/products/prices', response);
      this.clearCache('pricing');
      this.clearCache('products');
      return this.handleResponse(response, 'Price update');
    } catch (error) {
      throw this.handleError(error, 'Price update', 'Failed to update product prices');
    }
  };

  getProductPrices = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching product prices:', filters);
    
    const cacheKey = `product-prices-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const url = query ? `/fuel/products/prices?${query}` : '/fuel/products/prices';
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Product prices fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Product prices fetch', 'Failed to fetch product prices');
    }
  };

  getBulkProductPrices = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching bulk product prices:', filters);
    
    const cacheKey = `bulk-product-prices-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const url = query ? `/fuel/products/prices/bulk?${query}` : '/fuel/products/prices/bulk';
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Bulk product prices fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Bulk product prices fetch', 'Failed to fetch bulk product prices');
    }
  };

  updateBulkProductPrices = async (bulkPriceData) => {
    this.logger.info('Updating bulk product prices:', bulkPriceData);
    this.debugRequest('PUT', '/fuel/products/prices/bulk', bulkPriceData);
    
    try {
      const response = await apiService.put('/fuel/products/prices/bulk', bulkPriceData);
      this.debugResponse('PUT', '/fuel/products/prices/bulk', response);
      this.clearCache('pricing');
      this.clearCache('products');
      return this.handleResponse(response, 'Bulk price update');
    } catch (error) {
      throw this.handleError(error, 'Bulk price update', 'Failed to update bulk product prices');
    }
  };

  getProductPricingHistory = async (productId, days = 30, forceRefresh = false) => {
    this.logger.info(`Fetching pricing history for product ${productId}, days: ${days}`);
    
    const cacheKey = `pricing-history-${productId}-${days}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams({ productId, days });
      const url = `/fuel/products/prices/history?${query}`;
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Pricing history fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Pricing history fetch', 'Failed to fetch product pricing history');
    }
  };

  // =====================
  // FUEL HIERARCHY
  // =====================

  getFuelHierarchy = async (forceRefresh = false) => {
    this.logger.info('Fetching fuel hierarchy');
    
    const cacheKey = 'hierarchy';
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      this.debugRequest('GET', '/fuel/hierarchy');
      const response = await apiService.get('/fuel/hierarchy');
      this.debugResponse('GET', '/fuel/hierarchy', response);
      
      const data = this.handleResponse(response, 'Hierarchy fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Hierarchy fetch', 'Failed to fetch fuel hierarchy');
    }
  };

  createFuelHierarchySequential = async (hierarchyData) => {
    this.logger.info('Creating fuel hierarchy sequentially:', hierarchyData);
    
    try {
      this.debugRequest('POST', '/fuel/hierarchy/sequential', hierarchyData);
      const response = await apiService.post('/fuel/hierarchy/sequential', hierarchyData);
      this.debugResponse('POST', '/fuel/hierarchy/sequential', response);
      this.clearCache();
      return this.handleResponse(response, 'Sequential hierarchy creation');
    } catch (error) {
      throw this.handleError(error, 'Sequential hierarchy creation', 'Failed to create fuel hierarchy');
    }
  };

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validateFuelCategory = (categoryData) => {
    const errors = [];
    if (!categoryData.name?.trim()) errors.push('Category name is required');
    if (!categoryData.code?.trim()) errors.push('Category code is required');
    return errors;
  };

  validateFuelSubType = (subTypeData) => {
    const errors = [];
    if (!subTypeData.name?.trim()) errors.push('Subtype name is required');
    if (!subTypeData.code?.trim()) errors.push('Subtype code is required');
    if (!subTypeData.categoryId) errors.push('Category is required');
    return errors;
  };

  validateFuelProduct = (productData) => {
    const errors = [];
    if (!productData.name?.trim()) errors.push('Product name is required');
    if (!productData.fuelCode?.trim()) errors.push('Fuel code is required');
    if (!productData.fuelSubTypeId) errors.push('Fuel subtype is required');
    
    if (productData.density && (productData.density <= 0 || productData.density > 1.5)) {
      errors.push('Density must be between 0 and 1.5 kg/L');
    }
    
    if (productData.octaneRating && (productData.octaneRating < 0 || productData.octaneRating > 100)) {
      errors.push('Octane rating must be between 0 and 100');
    }
    
    if (productData.minSellingPrice && productData.maxSellingPrice) {
      if (productData.minSellingPrice > productData.maxSellingPrice) {
        errors.push('Minimum selling price cannot be greater than maximum selling price');
      }
    }
    
    return errors;
  };

  validateProductPrices = (priceData) => {
    const errors = [];
    
    if (!priceData.productId) errors.push('Product ID is required');
    if (!priceData.baseCostPrice && priceData.baseCostPrice !== 0) errors.push('Base cost price is required');
    if (!priceData.minSellingPrice && priceData.minSellingPrice !== 0) errors.push('Minimum selling price is required');
    if (!priceData.maxSellingPrice && priceData.maxSellingPrice !== 0) errors.push('Maximum selling price is required');
    
    if (priceData.minSellingPrice > priceData.maxSellingPrice) {
      errors.push('Minimum selling price cannot be greater than maximum selling price');
    }
    
    if (priceData.baseCostPrice > priceData.maxSellingPrice) {
      errors.push('Base cost price cannot be greater than maximum selling price');
    }
    
    if (priceData.baseCostPrice < 0 || priceData.minSellingPrice < 0 || priceData.maxSellingPrice < 0) {
      errors.push('Prices cannot be negative');
    }
    
    return errors;
  };

  validateBulkProductPrices = (bulkPriceData) => {
    const errors = [];
    
    if (!bulkPriceData.updates || !Array.isArray(bulkPriceData.updates)) {
      errors.push('Updates array is required');
      return errors;
    }
    
    if (bulkPriceData.updates.length === 0) {
      errors.push('At least one product update is required');
    }
    
    bulkPriceData.updates.forEach((update, index) => {
      const updateErrors = this.validateProductPrices(update);
      if (updateErrors.length > 0) {
        errors.push(`Update ${index + 1}: ${updateErrors.join(', ')}`);
      }
    });
    
    return errors;
  };

  // =====================
  // UTILITY METHODS
  // =====================

  getDefaultQualityStandards = (categoryName) => {
    const upperName = categoryName?.toUpperCase() || '';
    
    if (upperName.includes('DIESEL')) {
      return { sulfurContent: 10, cetaneNumber: 51, flashPoint: 60, viscosity: 2.0, waterContent: 200 };
    } else if (upperName.includes('PETROL') || upperName.includes('GASOLINE')) {
      return { sulfurContent: 50, octaneNumber: 91, benzeneContent: 1.0, vaporPressure: 45, leadContent: 0.0 };
    } else if (upperName.includes('KEROSENE')) {
      return { sulfurContent: 50, flashPoint: 38, smokePoint: 20, freezePoint: -47 };
    }
    
    return { sulfurContent: 50, flashPoint: 60, density: 0.80 };
  };

  getDefaultCategoryProperties = (categoryName) => {
    const colors = {
      'DIESEL': '#0047AB', 'PETROL': '#FF0000', 'KEROSENE': '#FFFF00', 
      'LUBRICANTS': '#808080', 'default': '#666666'
    };
    
    const upperName = categoryName?.toUpperCase() || '';
    return { color: colors[upperName] || colors.default };
  };

  formatFuelProduct = (product) => {
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
        : 'Not set',
      margin: product.baseCostPrice && product.maxSellingPrice 
        ? ((product.maxSellingPrice - product.baseCostPrice) / product.baseCostPrice * 100).toFixed(2)
        : null
    };
  };

  formatPriceData = (priceData) => {
    if (!priceData) return null;
    
    return {
      ...priceData,
      marginPercentage: priceData.baseCostPrice && priceData.maxSellingPrice 
        ? ((priceData.maxSellingPrice - priceData.baseCostPrice) / priceData.baseCostPrice * 100).toFixed(2)
        : null,
      priceSpread: priceData.maxSellingPrice - priceData.minSellingPrice,
      isProfitable: priceData.baseCostPrice && priceData.minSellingPrice 
        ? priceData.minSellingPrice > priceData.baseCostPrice
        : null
    };
  };

  calculateOptimalPricing = (baseCost, desiredMargin = 0.15, competitivePrice = null) => {
    const minPrice = baseCost * (1 + desiredMargin);
    const maxPrice = competitivePrice ? Math.min(competitivePrice * 1.1, baseCost * (1 + desiredMargin * 2)) : baseCost * (1 + desiredMargin * 2);
    
    return {
      baseCostPrice: baseCost,
      minSellingPrice: Math.round(minPrice * 100) / 100,
      maxSellingPrice: Math.round(maxPrice * 100) / 100,
      recommendedMargin: desiredMargin * 100
    };
  };

  // =====================
  // BATCH OPERATIONS
  // =====================

  batchCreateFuelProducts = async (productsData) => {
    this.logger.info(`Batch creating ${productsData.length} fuel products`);
    
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
      throw this.handleError(error, 'Batch product creation', 'Failed to batch create fuel products');
    }
  };

  batchUpdateProductPrices = async (productsWithPrices) => {
    this.logger.info(`Batch updating prices for ${productsWithPrices.length} products`);
    
    try {
      const updates = productsWithPrices.map(product => ({
        productId: product.id,
        baseCostPrice: product.baseCostPrice,
        minSellingPrice: product.minSellingPrice,
        maxSellingPrice: product.maxSellingPrice
      }));

      const result = await this.updateBulkProductPrices({ updates });
      return result;
    } catch (error) {
      throw this.handleError(error, 'Batch price update', 'Failed to batch update product prices');
    }
  };

  // =====================
  // SEARCH OPERATIONS
  // =====================

  searchFuelEntities = async (searchTerm) => {
    this.logger.info(`Searching fuel entities for: "${searchTerm}"`);
    
    try {
      const [categories, subTypes, products] = await Promise.all([
        this.getFuelCategories({ search: searchTerm }),
        this.getFuelSubTypes({ search: searchTerm }),
        this.getFuelProducts({ search: searchTerm })
      ]);

      return {
        categories: categories || [],
        subTypes: subTypes || [],
        products: products?.products || products || [],
        searchTerm,
        totalResults: (categories?.length || 0) + (subTypes?.length || 0) + (products?.products?.length || products?.length || 0)
      };
    } catch (error) {
      throw this.handleError(error, 'Fuel entities search', 'Failed to search fuel entities');
    }
  };

  searchProductsForPricing = async (searchTerm) => {
    this.logger.info(`Searching products for pricing: "${searchTerm}"`);
    
    try {
      const products = await this.getProductPrices({ search: searchTerm });
      return {
        products: products || [],
        searchTerm,
        totalResults: products?.length || 0
      };
    } catch (error) {
      throw this.handleError(error, 'Product pricing search', 'Failed to search products for pricing');
    }
  };

  // =====================
  // PRICING ANALYTICS
  // =====================

  getPricingAnalytics = async (forceRefresh = false) => {
    this.logger.info('Fetching pricing analytics');
    
    const cacheKey = 'pricing-analytics';
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      // Get all products with pricing
      const products = await this.getProductPrices({}, true);
      
      const analytics = {
        totalProducts: products.length,
        productsWithPricing: products.filter(p => p.baseCostPrice && p.minSellingPrice && p.maxSellingPrice).length,
        averageMargin: 0,
        lowestMargin: Infinity,
        highestMargin: -Infinity,
        pricingDistribution: {
          lowMargin: 0,    // < 10%
          mediumMargin: 0, // 10-25%
          highMargin: 0,   // 25-50%
          premiumMargin: 0 // > 50%
        },
        productsNeedingUpdate: []
      };

      let totalMargin = 0;
      let marginCount = 0;

      products.forEach(product => {
        if (product.baseCostPrice && product.maxSellingPrice) {
          const margin = ((product.maxSellingPrice - product.baseCostPrice) / product.baseCostPrice) * 100;
          totalMargin += margin;
          marginCount++;

          // Update min/max margins
          if (margin < analytics.lowestMargin) analytics.lowestMargin = margin;
          if (margin > analytics.highestMargin) analytics.highestMargin = margin;

          // Update margin distribution
          if (margin < 10) analytics.pricingDistribution.lowMargin++;
          else if (margin < 25) analytics.pricingDistribution.mediumMargin++;
          else if (margin < 50) analytics.pricingDistribution.highMargin++;
          else analytics.pricingDistribution.premiumMargin++;

          // Check if product needs pricing update
          if (!product.baseCostPrice || !product.minSellingPrice || !product.maxSellingPrice) {
            analytics.productsNeedingUpdate.push({
              id: product.id,
              name: product.name,
              fuelCode: product.fuelCode,
              reason: 'Missing pricing data'
            });
          } else if (margin < 5) {
            analytics.productsNeedingUpdate.push({
              id: product.id,
              name: product.name,
              fuelCode: product.fuelCode,
              reason: 'Low margin (< 5%)'
            });
          }
        }
      });

      analytics.averageMargin = marginCount > 0 ? totalMargin / marginCount : 0;
      analytics.lowestMargin = analytics.lowestMargin === Infinity ? 0 : analytics.lowestMargin;
      analytics.highestMargin = analytics.highestMargin === -Infinity ? 0 : analytics.highestMargin;

      this.setCached(cacheKey, analytics);
      return analytics;
    } catch (error) {
      throw this.handleError(error, 'Pricing analytics fetch', 'Failed to fetch pricing analytics');
    }
  };

  // =====================
  // EXPORT/IMPORT
  // =====================

  exportPricingData = async (format = 'json') => {
    this.logger.info(`Exporting pricing data in ${format} format`);
    
    try {
      const products = await this.getProductPrices({}, true);
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalProducts: products.length,
        products: products.map(product => ({
          id: product.id,
          name: product.name,
          fuelCode: product.fuelCode,
          baseCostPrice: product.baseCostPrice,
          minSellingPrice: product.minSellingPrice,
          maxSellingPrice: product.maxSellingPrice,
          unit: product.unit,
          category: product.fuelSubType?.category?.name,
          subType: product.fuelSubType?.name
        }))
      };

      if (format === 'csv') {
        // Convert to CSV format
        const headers = ['Name', 'Fuel Code', 'Category', 'SubType', 'Base Cost', 'Min Price', 'Max Price', 'Unit'];
        const csvRows = [headers.join(',')];
        
        exportData.products.forEach(product => {
          const row = [
            `"${product.name}"`,
            `"${product.fuelCode}"`,
            `"${product.category || ''}"`,
            `"${product.subType || ''}"`,
            product.baseCostPrice || '',
            product.minSellingPrice || '',
            product.maxSellingPrice || '',
            `"${product.unit}"`
          ];
          csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
      }

      return exportData;
    } catch (error) {
      throw this.handleError(error, 'Pricing data export', 'Failed to export pricing data');
    }
  };
}

export const fuelService = new FuelService();
export default fuelService;