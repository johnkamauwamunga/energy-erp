import { apiService } from '../apiService';

class FuelPriceService {
  constructor() {
    this.baseUrl = '/fuel-prices';
    this.logger = {
      debug: (...args) => console.log('🔍 [FuelPriceService]', ...args),
      info: (...args) => console.log('ℹ️ [FuelPriceService]', ...args),
      warn: (...args) => console.warn('⚠️ [FuelPriceService]', ...args),
      error: (...args) => console.error('❌ [FuelPriceService]', ...args)
    };
    
    this.cache = new Map();
    this.CACHE_TTL = 2 * 60 * 1000; // 2 minutes for pricing data
  }

  // =====================
  // CORE UTILITIES - FIXED
  // =====================

  debugRequest = (method, endpoint, data) => {
    this.logger.debug(`➡️ ${method} ${this.baseUrl}${endpoint}`, data || '');
  };

  debugResponse = (method, endpoint, response) => {
    this.logger.debug(`⬅️ ${method} ${this.baseUrl}${endpoint} Response:`, response);
  };

  // FIXED: Handle different response formats
  handleResponse = (response, operation) => {
    console.log(`📦 ${operation} raw response:`, response);
    
    // Case 1: Direct array response (your current backend format)
    if (Array.isArray(response)) {
      this.logger.debug(`${operation} successful (direct array)`);
      return response;
    }
    
    // Case 2: Standard success response with data property
    if (response && response.success && response.data) {
      this.logger.debug(`${operation} successful (wrapped response)`);
      return response.data;
    }
    
    // Case 3: Response has data but no success wrapper
    if (response && response.data !== undefined) {
      this.logger.debug(`${operation} successful (direct data)`);
      return response.data;
    }
    
    // Case 4: Response is the data directly
    if (response !== undefined && response !== null) {
      this.logger.debug(`${operation} successful (raw response)`);
      return response;
    }
    
    this.logger.warn(`Unexpected response structure for ${operation}`, response);
    throw new Error('Invalid response format from server');
  };

  handleError = (error, operation, defaultMessage) => {
    this.logger.error(`${operation} failed:`, error);

    // Network errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    if (!error.response && error.message) {
      // This might be our custom error from handleResponse
      throw error;
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
    if (!filters || Object.keys(filters).length === 0) return '';
    
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        // Handle array values for bulk operations
        if (Array.isArray(filters[key])) {
          params.append(key, filters[key].join(','));
        } else {
          params.append(key, filters[key]);
        }
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
  // PRODUCT PRICING - CORE ENDPOINTS (FIXED)
  // =====================

  // GET Product Prices - FIXED
  getProductPrices = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching product prices:', filters);
    
    const cacheKey = `product-prices-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const endpoint = query ? `/products/prices?${query}` : '/products/prices';
      
      this.debugRequest('GET', endpoint);
      const response = await apiService.get(`${this.baseUrl}${endpoint}`);
      this.debugResponse('GET', endpoint, response);
      
      const data = this.handleResponse(response, 'Product prices fetch');
      
      // Ensure we always return an array
      const products = Array.isArray(data) ? data : [];
      
      // Enrich products with pricing calculations
      const enrichedProducts = products.map(product => this.enrichProductPricing(product));
      
      this.setCached(cacheKey, enrichedProducts);
      return enrichedProducts;
    } catch (error) {
      throw this.handleError(error, 'Product prices fetch', 'Failed to fetch product prices');
    }
  };

  // PUT Single Product Price Update - FIXED
  updateProductPrices = async (priceData) => {
    this.logger.info('Updating product prices:', priceData);
    
    try {
      this.debugRequest('PUT', '/products/prices', priceData);
      const response = await apiService.put(`${this.baseUrl}/products/prices`, priceData);
      this.debugResponse('PUT', '/products/prices', response);
      
      const data = this.handleResponse(response, 'Price update');
      this.clearCache('product-prices');
      
      // Return enriched product data
      return this.enrichProductPricing(data);
    } catch (error) {
      throw this.handleError(error, 'Price update', 'Failed to update product prices');
    }
  };

  // PUT Bulk Product Price Update - FIXED
  updateBulkProductPrices = async (bulkPriceData) => {
    this.logger.info('Updating bulk product prices:', bulkPriceData);
    
    try {
      this.debugRequest('PUT', '/products/prices/bulk', bulkPriceData);
      const response = await apiService.put(`${this.baseUrl}/products/prices/bulk`, bulkPriceData);
      this.debugResponse('PUT', '/products/prices/bulk', response);
      
      const data = this.handleResponse(response, 'Bulk price update');
      this.clearCache('product-prices');
      
      // Ensure we return array of enriched products
      const results = Array.isArray(data) ? data : [];
      return results.map(product => this.enrichProductPricing(product));
    } catch (error) {
      throw this.handleError(error, 'Bulk price update', 'Failed to update bulk product prices');
    }
  };

  // GET Bulk Product Prices - FIXED
  getBulkProductPrices = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching bulk product prices:', filters);
    
    const cacheKey = `bulk-product-prices-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const endpoint = query ? `/products/prices/bulk?${query}` : '/products/prices/bulk';
      
      this.debugRequest('GET', endpoint);
      const response = await apiService.get(`${this.baseUrl}${endpoint}`);
      this.debugResponse('GET', endpoint, response);
      
      const data = this.handleResponse(response, 'Bulk product prices fetch');
      
      // Ensure we return an array
      const products = Array.isArray(data) ? data : [];
      this.setCached(cacheKey, products);
      return products;
    } catch (error) {
      throw this.handleError(error, 'Bulk product prices fetch', 'Failed to fetch bulk product prices');
    }
  };

  // GET Product Pricing History - FIXED
  getProductPricingHistory = async (productId, days = 30, forceRefresh = false) => {
    this.logger.info(`Fetching pricing history for product ${productId}, days: ${days}`);
    
    const cacheKey = `pricing-history-${productId}-${days}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams({ productId, days });
      const endpoint = `/products/prices/history?${query}`;
      
      this.debugRequest('GET', endpoint);
      const response = await apiService.get(`${this.baseUrl}${endpoint}`);
      this.debugResponse('GET', endpoint, response);
      
      const data = this.handleResponse(response, 'Pricing history fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Pricing history fetch', 'Failed to fetch product pricing history');
    }
  };

  // GET Pricing Analytics - FIXED
  getPricingAnalytics = async (forceRefresh = false) => {
    this.logger.info('Fetching pricing analytics');
    
    const cacheKey = 'pricing-analytics';
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const endpoint = '/products/prices/analytics';
      this.debugRequest('GET', endpoint);
      const response = await apiService.get(`${this.baseUrl}${endpoint}`);
      this.debugResponse('GET', endpoint, response);
      
      const data = this.handleResponse(response, 'Pricing analytics fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Pricing analytics fetch', 'Failed to fetch pricing analytics');
    }
  };

  // GET Export Pricing Data - FIXED
  exportPricingData = async (format = 'json') => {
    this.logger.info(`Exporting pricing data in ${format} format`);
    
    try {
      const endpoint = `/products/prices/export?format=${format}`;
      this.debugRequest('GET', endpoint);
      
      const response = await apiService.get(`${this.baseUrl}${endpoint}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });
      
      this.debugResponse('GET', endpoint, response);
      
      if (format === 'csv') {
        // Handle CSV download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `product-prices-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return { success: true, message: 'CSV file downloaded' };
      }
      
      return this.handleResponse(response, 'Pricing data export');
    } catch (error) {
      throw this.handleError(error, 'Pricing data export', 'Failed to export pricing data');
    }
  };

  // =====================
  // PRICING UTILITIES - ENHANCED
  // =====================

  // Validate single product price update
  validateProductPrices = (priceData) => {
    const errors = [];
    
    if (!priceData.productId) errors.push('Product ID is required');
    
    // Handle null/undefined values by treating them as 0
    const baseCostPrice = priceData.baseCostPrice || 0;
    const minSellingPrice = priceData.minSellingPrice || 0;
    const maxSellingPrice = priceData.maxSellingPrice || 0;
    
    if (typeof baseCostPrice !== 'number' || baseCostPrice < 0) {
      errors.push('Base cost price must be a positive number');
    }
    
    if (typeof minSellingPrice !== 'number' || minSellingPrice < 0) {
      errors.push('Minimum selling price must be a positive number');
    }
    
    if (typeof maxSellingPrice !== 'number' || maxSellingPrice < 0) {
      errors.push('Maximum selling price must be a positive number');
    }
    
    // Validate price relationships
    if (minSellingPrice > maxSellingPrice) {
      errors.push('Minimum selling price cannot exceed maximum selling price');
    }
    
    if (baseCostPrice > maxSellingPrice) {
      errors.push('Base cost price cannot exceed maximum selling price');
    }
    
    // Check if at least one price is provided
    if (baseCostPrice === 0 && minSellingPrice === 0 && maxSellingPrice === 0) {
      errors.push('At least one pricing field must be provided');
    }
    
    return errors;
  };

  // Validate bulk product price updates
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

  // FIXED: Enrich product with pricing analytics - handle null values
  enrichProductPricing = (product) => {
    if (!product) return null;
    
    // Handle null values by defaulting to 0
    const baseCostPrice = product.baseCostPrice || 0;
    const minSellingPrice = product.minSellingPrice || 0;
    const maxSellingPrice = product.maxSellingPrice || 0;
    
    // Calculate margin (handle division by zero)
    const margin = baseCostPrice > 0 && maxSellingPrice > 0 
      ? ((maxSellingPrice - baseCostPrice) / baseCostPrice) * 100
      : 0;

    // Determine price status
    let priceStatus = 'no-pricing';
    if (baseCostPrice > 0 && minSellingPrice > 0 && maxSellingPrice > 0) {
      if (margin > 20) priceStatus = 'profitable';
      else if (margin > 10) priceStatus = 'good';
      else if (margin > 0) priceStatus = 'low-margin';
      else priceStatus = 'unprofitable';
    }

    return {
      ...product,
      baseCostPrice,
      minSellingPrice,
      maxSellingPrice,
      margin: Number(margin.toFixed(1)),
      priceStatus,
      priceSpread: maxSellingPrice - minSellingPrice,
      hasPricing: !!(baseCostPrice && minSellingPrice && maxSellingPrice),
      marginDisplay: margin ? `${margin.toFixed(1)}%` : 'N/A',
      priceRange: minSellingPrice && maxSellingPrice 
        ? `${minSellingPrice.toFixed(2)} - ${maxSellingPrice.toFixed(2)}` 
        : 'Not set'
    };
  };

  // Calculate optimal pricing based on cost and desired margin
  calculateOptimalPricing = (baseCost, desiredMargin = 0.15) => {
    const base = baseCost || 0;
    const minPrice = base * (1 + desiredMargin);
    const maxPrice = base * (1 + desiredMargin * 1.5); // Allow 50% more margin for flexibility
    
    return {
      baseCostPrice: base,
      minSellingPrice: Math.round(minPrice * 100) / 100,
      maxSellingPrice: Math.round(maxPrice * 100) / 100,
      recommendedMargin: desiredMargin * 100
    };
  };

  // Format product for display - handle null values
  formatProductForDisplay = (product) => {
    if (!product) return null;
    
    const enriched = this.enrichProductPricing(product);
    
    return {
      ...enriched,
      displayName: `${product.name} (${product.fuelCode})`,
      typeDisplay: product.type?.toLowerCase() === 'fuel' ? 'Fuel' : 'Non-Fuel',
      unitDisplay: product.unit?.toLowerCase() === 'liter' ? 'L' : product.unit
    };
  };

  // Batch update helper
  prepareBulkUpdate = (products, priceUpdates) => {
    const updates = products.map(product => {
      const update = priceUpdates[product.id] || {};
      return {
        productId: product.id,
        baseCostPrice: update.baseCostPrice !== undefined ? update.baseCostPrice : (product.baseCostPrice || 0),
        minSellingPrice: update.minSellingPrice !== undefined ? update.minSellingPrice : (product.minSellingPrice || 0),
        maxSellingPrice: update.maxSellingPrice !== undefined ? update.maxSellingPrice : (product.maxSellingPrice || 0)
      };
    }).filter(update => 
      update.baseCostPrice !== 0 || 
      update.minSellingPrice !== 0 || 
      update.maxSellingPrice !== 0
    );

    return { updates };
  };

  // Get products needing pricing attention
  getProductsNeedingPricing = async (filters = {}) => {
    try {
      const products = await this.getProductPrices(filters);
      return products.filter(product => 
        !product.baseCostPrice || 
        !product.minSellingPrice || 
        !product.maxSellingPrice ||
        (product.margin !== null && product.margin < 5)
      );
    } catch (error) {
      throw this.handleError(error, 'Products needing pricing fetch', 'Failed to fetch products needing pricing attention');
    }
  };

  // Quick price update for single product
  quickUpdatePrice = async (productId, field, value) => {
    const updateData = {
      productId,
      [field]: value || 0
    };
    
    return await this.updateProductPrices(updateData);
  };

  // Apply percentage increase to all products
  applyPercentageIncrease = async (percentage, products = null) => {
    try {
      let targetProducts = products;
      
      if (!targetProducts) {
        targetProducts = await this.getProductPrices();
      }
      
      const updates = targetProducts
        .filter(product => product.baseCostPrice && product.minSellingPrice && product.maxSellingPrice)
        .map(product => ({
          productId: product.id,
          baseCostPrice: product.baseCostPrice * (1 + percentage / 100),
          minSellingPrice: product.minSellingPrice * (1 + percentage / 100),
          maxSellingPrice: product.maxSellingPrice * (1 + percentage / 100)
          
        }));
      
      if (updates.length === 0) {
        throw new Error('No products with complete pricing data found');
      }
      
      return await this.updateBulkProductPrices({ updates });
    } catch (error) {
      throw this.handleError(error, 'Percentage increase application', 'Failed to apply percentage increase');
    }
  };
}

export const fuelPriceService = new FuelPriceService();
export default fuelPriceService;