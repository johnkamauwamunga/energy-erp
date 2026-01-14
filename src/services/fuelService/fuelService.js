// services/fuelService.js
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
    this.BASE_URL = '/fuel'; // Updated to match backend route
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
    // Handle backend response structure
    if (response.data?.success === true) {
      this.logger.debug(`${operation} successful`);
      return response.data.data || response.data;
    }
    
    // Handle direct data responses (for compatibility)
    if (response.data && typeof response.data === 'object') {
      this.logger.debug(`${operation} successful (direct data)`);
      return response.data;
    }
    
    this.logger.warn(`Unexpected response structure for ${operation}`);
    throw new Error('Invalid response format from server');
  };

  handleError = (error, operation, defaultMessage) => {
    this.logger.error(`${operation} failed:`, error);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    if (error.request && !error.response) {
      throw new Error('Network error. Please check your connection.');
    }

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
        
        case 409:
          throw new Error(data?.message || 'Conflict: Resource already exists');
        
        case 422:
          return this.handleValidationError(data);
        
        default:
          if (data?.message) {
            throw new Error(data.message);
          }
      }
    }

    throw new Error(defaultMessage || 'An unexpected error occurred');
  };

  handleValidationError = (data) => {
    if (data.message) {
      // Backend returns message for validation errors
      throw new Error(data.message);
    }
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
    const url = `${this.BASE_URL}/categories`;
    this.debugRequest('POST', url, categoryData);
    
    try {
      const response = await apiService.post(url, categoryData);
      this.debugResponse('POST', url, response);
      this.clearCache('categories');
      return this.handleResponse(response, 'Category creation');
    } catch (error) {
      throw this.handleError(error, 'Category creation', 'Failed to create fuel category');
    }
  };

  updateFuelCategory = async (categoryData) => {
    this.logger.info('Updating fuel category:', categoryData);
    const url = `${this.BASE_URL}/categories`;
    this.debugRequest('PUT', url, categoryData);
    
    try {
      const response = await apiService.put(url, categoryData);
      this.debugResponse('PUT', url, response);
      this.clearCache('categories');
      return this.handleResponse(response, 'Category update');
    } catch (error) {
      throw this.handleError(error, 'Category update', 'Failed to update fuel category');
    }
  };

  getFuelCategories = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching fuel categories:', filters);
    
    const cacheKey = `fuel-categories-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const url = query ? `${this.BASE_URL}/categories?${query}` : `${this.BASE_URL}/categories`;
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const responseData = this.handleResponse(response, 'Categories fetch');

      console.log("response for fetched categories ",responseData);
      
      // Handle backend response structure (data + pagination)
      const data = responseData;
      const pagination = responseData.pagination;
      
      const result = { data, pagination };
      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      throw this.handleError(error, 'Categories fetch', 'Failed to fetch fuel categories');
    }
  };

  getFuelCategoryById = async (categoryId) => {
    this.logger.info(`Fetching fuel category: ${categoryId}`);
    
    const cacheKey = `fuel-category-${categoryId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.BASE_URL}/categories/${categoryId}`;
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Category fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Category fetch', 'Failed to fetch fuel category');
    }
  };

  deleteFuelCategory = async (categoryId) => {
    this.logger.info(`Deleting fuel category: ${categoryId}`);
    
    try {
      const url = `${this.BASE_URL}/categories/${categoryId}`;
      this.debugRequest('DELETE', url);
      const response = await apiService.delete(url);
      this.debugResponse('DELETE', url, response);
      this.clearCache('categories');
      return this.handleResponse(response, 'Category deletion');
    } catch (error) {
      throw this.handleError(error, 'Category deletion', 'Failed to delete fuel category');
    }
  };

  // =====================
  // FUEL PRODUCTS
  // =====================

  createFuelProduct = async (productData) => {
    this.logger.info('Creating fuel product:', productData);
    const url = `${this.BASE_URL}/products`;
    this.debugRequest('POST', url, productData);
    
    try {
      const response = await apiService.post(url, productData);
      this.debugResponse('POST', url, response);
      this.clearCache('fuel-products');
      this.clearCache('pricing');
      
      const data = this.handleResponse(response, 'Product creation');
      
      // Check if fuelCode was auto-generated
      if (response.data?.note && response.data.note.includes('auto-generated')) {
        this.logger.info(`Fuel code auto-generated: ${data.fuelCode}`);
      }
      
      return data;
    } catch (error) {
      throw this.handleError(error, 'Product creation', 'Failed to create fuel product');
    }
  };

  updateFuelProduct = async (productData) => {
    this.logger.info('Updating fuel product:', productData);
    const url = `${this.BASE_URL}/products`;
    this.debugRequest('PUT', url, productData);
    
    try {
      const response = await apiService.put(url, productData);
      this.debugResponse('PUT', url, response);
      this.clearCache('fuel-products');
      this.clearCache('pricing');
      return this.handleResponse(response, 'Product update');
    } catch (error) {
      throw this.handleError(error, 'Product update', 'Failed to update fuel product');
    }
  };

  getFuelProducts = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching fuel products:', filters);
    
    const cacheKey = `fuel-products-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const url = query ? `${this.BASE_URL}/products?${query}` : `${this.BASE_URL}/products`;
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const responseData = this.handleResponse(response, 'Products fetch');

      console.log("the fuel products ",responseData)
      
      // Handle backend response structure
      const data =  responseData;
      const pagination = responseData.pagination;
      const stats = responseData.stats;
      
      const result = { data, pagination, stats };
      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      throw this.handleError(error, 'Products fetch', 'Failed to fetch fuel products');
    }
  };

  getFuelProductById = async (productId) => {
    this.logger.info(`Fetching fuel product: ${productId}`);
    
    const cacheKey = `fuel-product-${productId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.BASE_URL}/products/${productId}`;
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const data = this.handleResponse(response, 'Product fetch');
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Product fetch', 'Failed to fetch fuel product');
    }
  };

  getFuelProductByName = async (productName) => {
    this.logger.info(`Fetching fuel product by name: ${productName}`);
    
    try {
      const url = `${this.BASE_URL}/products/name/${encodeURIComponent(productName)}`;
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      return this.handleResponse(response, 'Product fetch by name');
    } catch (error) {
      throw this.handleError(error, 'Product fetch by name', 'Failed to fetch fuel product by name');
    }
  };

  deleteFuelProduct = async (productId) => {
    this.logger.info(`Deleting fuel product: ${productId}`);
    
    try {
      const url = `${this.BASE_URL}/products/${productId}`;
      this.debugRequest('DELETE', url);
      const response = await apiService.delete(url);
      this.debugResponse('DELETE', url, response);
      this.clearCache('fuel-products');
      this.clearCache('pricing');
      return this.handleResponse(response, 'Product deletion');
    } catch (error) {
      throw this.handleError(error, 'Product deletion', 'Failed to delete fuel product');
    }
  };

  // =====================
  // PRODUCT PRICING
  // =====================

  updateProductPrices = async (priceData) => {
    this.logger.info('Updating product prices:', priceData);
    const url = `${this.BASE_URL}/products/prices`;
    this.debugRequest('PUT', url, priceData);
    
    try {
      const response = await apiService.put(url, priceData);
      this.debugResponse('PUT', url, response);
      this.clearCache('pricing');
      this.clearCache('products');
      return this.handleResponse(response, 'Price update');
    } catch (error) {
      throw this.handleError(error, 'Price update', 'Failed to update product prices');
    }
  };

  updateBulkProductPrices = async (bulkData) => {
    this.logger.info('Bulk updating product prices:', bulkData);
    const url = `${this.BASE_URL}/products/prices/bulk`;
    this.debugRequest('PUT', url, bulkData);
    
    try {
      const response = await apiService.put(url, bulkData);
      this.debugResponse('PUT', url, response);
      this.clearCache('pricing');
      this.clearCache('products');
      return this.handleResponse(response, 'Bulk price update');
    } catch (error) {
      throw this.handleError(error, 'Bulk price update', 'Failed to update bulk product prices');
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
      const url = query ? `${this.BASE_URL}/products/prices?${query}` : `${this.BASE_URL}/products/prices`;
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const responseData = this.handleResponse(response, 'Product prices fetch');
      
      // Handle backend response structure
      const data = responseData.products || responseData.data || responseData;
      const pagination = responseData.pagination;
      const statistics = responseData.statistics || responseData.stats;
      const summary = responseData.summary;
      
      const result = { data, pagination, statistics, summary };
      this.setCached(cacheKey, result);
      return result;
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
      const url = query ? `${this.BASE_URL}/products/prices/bulk?${query}` : `${this.BASE_URL}/products/prices/bulk`;
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const responseData = this.handleResponse(response, 'Bulk product prices fetch');
      
      // Handle backend response structure
      const data = responseData.data || responseData;
      const count = responseData.count || data.length;
      const summary = responseData.summary;
      
      const result = { data, count, summary };
      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      throw this.handleError(error, 'Bulk product prices fetch', 'Failed to fetch bulk product prices');
    }
  };

  getProductPricingHistory = async (filters = {}, forceRefresh = false) => {
    this.logger.info('Fetching product pricing history:', filters);
    
    const cacheKey = `pricing-history-${JSON.stringify(filters)}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const query = this.buildQueryParams(filters);
      const url = query ? `${this.BASE_URL}/products/prices/history?${query}` : `${this.BASE_URL}/products/prices/history`;
      
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const responseData = this.handleResponse(response, 'Pricing history fetch');
      
      // Handle backend response structure
      const data = responseData.data || responseData;
      const count = responseData.count || data.length;
      const summary = responseData.summary;
      
      const result = { data, count, summary };
      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      throw this.handleError(error, 'Pricing history fetch', 'Failed to fetch pricing history');
    }
  };

  getPricingAnalytics = async (forceRefresh = false) => {
    this.logger.info('Fetching pricing analytics');
    
    const cacheKey = 'pricing-analytics';
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const url = `${this.BASE_URL}/products/pricing/analytics`;
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const responseData = this.handleResponse(response, 'Pricing analytics fetch');
      
      // Handle backend response structure
      const data = responseData.data || responseData;
      const summary = responseData.summary;
      
      const result = { data, summary };
      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      throw this.handleError(error, 'Pricing analytics fetch', 'Failed to fetch pricing analytics');
    }
  };

  exportPricingData = async (format = 'json') => {
    this.logger.info(`Exporting pricing data in ${format} format`);
    
    try {
      const url = `${this.BASE_URL}/products/pricing/export?format=${format}`;
      this.debugRequest('GET', url);
      
      if (format === 'csv') {
        const response = await apiService.get(url, { responseType: 'blob' });
        
        // Create download link
        const blob = new Blob([response.data], { type: 'text/csv' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `fuel-pricing-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        return { success: true, message: 'CSV export downloaded' };
      } else {
        const response = await apiService.get(url);
        this.debugResponse('GET', url, response);
        return this.handleResponse(response, 'Pricing data export');
      }
    } catch (error) {
      throw this.handleError(error, 'Pricing data export', 'Failed to export pricing data');
    }
  };

  // =====================
  // ADMIN ENDPOINTS (Super Admin Only)
  // =====================

  getAllFuelCategoriesByCompany = async (companyId, forceRefresh = false) => {
    this.logger.info(`Fetching all fuel categories for company: ${companyId}`);
    
    const cacheKey = `admin-categories-${companyId}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const url = `${this.BASE_URL}/admin/categories/${companyId}`;
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const responseData = this.handleResponse(response, 'Admin categories fetch');
      
      const data = responseData.data || responseData;
      const total = responseData.total;
      const companyIdResponse = responseData.companyId;
      
      const result = { data, total, companyId: companyIdResponse };
      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      throw this.handleError(error, 'Admin categories fetch', 'Failed to fetch admin categories');
    }
  };

  getAllFuelProductsByCompany = async (companyId, forceRefresh = false) => {
    this.logger.info(`Fetching all fuel products for company: ${companyId}`);
    
    const cacheKey = `admin-products-${companyId}`;
    
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const url = `${this.BASE_URL}/admin/products/${companyId}`;
      this.debugRequest('GET', url);
      const response = await apiService.get(url);
      this.debugResponse('GET', url, response);
      
      const responseData = this.handleResponse(response, 'Admin products fetch');
      
      const data = responseData.data || responseData;
      const total = responseData.total;
      const stats = responseData.stats;
      const companyIdResponse = responseData.companyId;
      
      const result = { data, total, stats, companyId: companyIdResponse };
      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      throw this.handleError(error, 'Admin products fetch', 'Failed to fetch admin products');
    }
  };

  // =====================
  // VALIDATION UTILITIES (Updated for backend schema)
  // =====================

  validateFuelCategory = (categoryData) => {
    const errors = [];
    
    // Required fields
    if (!categoryData.name?.trim()) {
      errors.push('Category name is required');
    } else if (categoryData.name.length > 100) {
      errors.push('Name cannot exceed 100 characters');
    }
    
    if (!categoryData.code?.trim()) {
      errors.push('Category code is required');
    } else if (categoryData.code.length > 10) {
      errors.push('Code cannot exceed 10 characters');
    }
    
    // Optional field validations
    if (categoryData.defaultColor && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(categoryData.defaultColor)) {
      errors.push('Invalid color code format');
    }
    
    if (categoryData.typicalDensity !== undefined) {
      if (typeof categoryData.typicalDensity !== 'number' || categoryData.typicalDensity < 0.1 || categoryData.typicalDensity > 2.0) {
        errors.push('Typical density must be between 0.1 and 2.0');
      }
    }
    
    return errors;
  };

  validateFuelProduct = (productData) => {
    const errors = [];
    
    // Required fields
    if (!productData.name?.trim()) {
      errors.push('Product name is required');
    } else if (productData.name.length > 200) {
      errors.push('Name cannot exceed 200 characters');
    }
    
    if (!productData.fuelCategoryId) {
      errors.push('Fuel category is required');
    }
    
    // Optional field validations
    if (productData.fuelCode && productData.fuelCode.trim().length > 10) {
      errors.push('Fuel code cannot exceed 10 characters');
    }
    
    if (productData.description && productData.description.length > 500) {
      errors.push('Description cannot exceed 500 characters');
    }
    
    if (productData.octaneRating !== undefined) {
      if (!Number.isInteger(productData.octaneRating) || productData.octaneRating < 0 || productData.octaneRating > 120) {
        errors.push('Octane rating must be between 0 and 120');
      }
    }
    
    if (productData.density !== undefined) {
      if (productData.density < 0.7 || productData.density > 1.5) {
        errors.push('Density must be between 0.7 and 1.5');
      }
    }
    
    if (productData.flashPoint !== undefined) {
      if (productData.flashPoint < -100 || productData.flashPoint > 400) {
        errors.push('Flash point must be between -100 and 400');
      }
    }
    
    // Price validations
    if (productData.minSellingPrice && productData.maxSellingPrice) {
      if (productData.minSellingPrice > productData.maxSellingPrice) {
        errors.push('Minimum selling price cannot be greater than maximum selling price');
      }
    }
    
    if (productData.baseCostPrice && productData.maxSellingPrice) {
      if (productData.baseCostPrice > productData.maxSellingPrice) {
        errors.push('Base cost price cannot be greater than maximum selling price');
      }
    }
    
    // Color code validation
    if (productData.colorCode && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(productData.colorCode)) {
      errors.push('Invalid color code format');
    }
    
    return errors;
  };

  validatePricingData = (pricingData) => {
    const errors = [];
    
    // Required field
    if (!pricingData.productId) {
      errors.push('Product ID is required');
    }
    
    // Check if at least one price is provided
    if (pricingData.baseCostPrice === undefined && 
        pricingData.minSellingPrice === undefined && 
        pricingData.maxSellingPrice === undefined) {
      errors.push('At least one pricing field must be provided');
    }
    
    // Validate positive numbers
    if (pricingData.baseCostPrice !== undefined && pricingData.baseCostPrice <= 0) {
      errors.push('Base cost price must be positive');
    }
    
    if (pricingData.minSellingPrice !== undefined && pricingData.minSellingPrice <= 0) {
      errors.push('Minimum selling price must be positive');
    }
    
    if (pricingData.maxSellingPrice !== undefined && pricingData.maxSellingPrice <= 0) {
      errors.push('Maximum selling price must be positive');
    }
    
    // Validate price relationships
    if (pricingData.minSellingPrice && pricingData.maxSellingPrice) {
      if (pricingData.minSellingPrice > pricingData.maxSellingPrice) {
        errors.push('Minimum selling price cannot exceed maximum selling price');
      }
    }
    
    if (pricingData.baseCostPrice && pricingData.maxSellingPrice) {
      if (pricingData.baseCostPrice > pricingData.maxSellingPrice) {
        errors.push('Base cost price cannot exceed maximum selling price');
      }
    }
    
    return errors;
  };

  // =====================
  // UTILITY METHODS
  // =====================

  suggestFuelCode = (categoryName, productName, existingCodes = []) => {
    // Clean and extract initials
    const cleanCategory = (categoryName || 'FUEL').replace(/[^a-zA-Z]/g, '');
    const cleanProduct = (productName || 'PROD').replace(/[^a-zA-Z]/g, '');
    
    const categoryInitials = cleanCategory.substring(0, 3).toUpperCase();
    const productInitials = cleanProduct.substring(0, 2).toUpperCase();
    
    // Generate base code
    const baseCode = `${categoryInitials}-${productInitials}`;
    
    // Check if exists
    const codeExists = existingCodes.includes(baseCode);
    
    if (!codeExists) {
      return baseCode;
    }
    
    // Add sequential number if code exists
    let counter = 1;
    let newCode;
    do {
      newCode = `${baseCode}-${counter.toString().padStart(2, '0')}`;
      counter++;
    } while (existingCodes.includes(newCode) && counter < 100);
    
    return newCode;
  };

  calculateMargin = (baseCost, sellingPrice) => {
    if (!baseCost || !sellingPrice || baseCost <= 0) return null;
    return ((sellingPrice - baseCost) / baseCost) * 100;
  };

  calculatePriceSpread = (minPrice, maxPrice) => {
    if (!minPrice || !maxPrice) return null;
    return maxPrice - minPrice;
  };

  getFuelUnitOptions = () => {
    return [
      { value: 'LITER', label: 'Liter (L)', symbol: 'L' },
      { value: 'GALLON', label: 'Gallon (gal)', symbol: 'gal' },
      { value: 'BARREL', label: 'Barrel (bbl)', symbol: 'bbl' },
      { value: 'KILOGRAM', label: 'Kilogram (kg)', symbol: 'kg' }
    ];
  };

  // =====================
  // DATA TRANSFORMATIONS
  // =====================

  transformProductForForm = (product) => {
    if (!product) return {};
    
    return {
      ...product,
      // Ensure unit is properly formatted
      unit: product.unit || 'LITER',
      // Convert null to empty string for optional fields
      fuelCode: product.fuelCode || '',
      description: product.description || '',
      colorCode: product.colorCode || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      brand: product.brand || '',
      modelNumber: product.modelNumber || '',
      packSize: product.packSize || '',
      // Ensure numbers are properly formatted
      baseCostPrice: product.baseCostPrice || '',
      minSellingPrice: product.minSellingPrice || '',
      maxSellingPrice: product.maxSellingPrice || '',
      density: product.density || '',
      octaneRating: product.octaneRating || '',
      sulfurContent: product.sulfurContent || '',
      flashPoint: product.flashPoint || '',
      // Default boolean values
      isBatchTracked: product.isBatchTracked || false,
      isSerialTracked: product.isSerialTracked || false
    };
  };

  prepareProductForSubmit = (formData) => {
    const preparedData = { ...formData };
    
    // Convert empty strings to null for optional fields
    const optionalFields = [
      'fuelCode',
      'description',
      'octaneRating',
      'sulfurContent',
      'colorCode',
      'density',
      'flashPoint',
      'sku',
      'barcode',
      'brand',
      'modelNumber',
      'packSize',
      'baseCostPrice',
      'minSellingPrice',
      'maxSellingPrice'
    ];
    
    optionalFields.forEach(field => {
      if (preparedData[field] === '' || preparedData[field] === undefined) {
        preparedData[field] = null;
      }
    });
    
    // Ensure unit has default value
    if (!preparedData.unit) {
      preparedData.unit = 'LITER';
    }
    
    // Ensure boolean fields are properly set
    preparedData.isBatchTracked = Boolean(preparedData.isBatchTracked);
    preparedData.isSerialTracked = Boolean(preparedData.isSerialTracked);
    
    return preparedData;
  };

  // =====================
  // FORMATTING UTILITIES
  // =====================

  formatPrice = (price, unit = 'LITER') => {
    if (price === null || price === undefined) return '-';
    
    const unitSymbols = {
      'LITER': 'L',
      'GALLON': 'gal',
      'BARREL': 'bbl',
      'KILOGRAM': 'kg'
    };
    
    return `${Number(price).toFixed(2)}/${unitSymbols[unit] || unit}`;
  };

  formatMargin = (margin) => {
    if (margin === null || margin === undefined) return '-';
    return `${Number(margin).toFixed(1)}%`;
  };

  getPriceStatusColor = (priceStatus) => {
    const colors = {
      'excellent': 'success',
      'good': 'info',
      'fair': 'warning',
      'low': 'warning',
      'low-margin': 'warning',
      'unprofitable': 'danger',
      'no-pricing': 'secondary',
      'incomplete': 'secondary',
      'unknown': 'light'
    };
    return colors[priceStatus] || 'light';
  };

  getPriceStatusText = (priceStatus) => {
    const texts = {
      'excellent': 'Excellent (> 25%)',
      'good': 'Good (15-25%)',
      'fair': 'Fair (5-15%)',
      'low': 'Low (0-5%)',
      'low-margin': 'Low Margin',
      'unprofitable': 'Unprofitable',
      'no-pricing': 'No Pricing',
      'incomplete': 'Incomplete Data',
      'unknown': 'Unknown'
    };
    return texts[priceStatus] || 'Unknown';
  };

  // =====================
  // SEARCH OPERATIONS
  // =====================

  searchFuelProducts = async (searchTerm, filters = {}) => {
    this.logger.info(`Searching fuel products: "${searchTerm}"`);
    
    try {
      const searchFilters = { ...filters, search: searchTerm };
      return await this.getFuelProducts(searchFilters, true);
    } catch (error) {
      throw this.handleError(error, 'Fuel product search', 'Failed to search fuel products');
    }
  };

  // =====================
  // BULK OPERATIONS
  // =====================

  batchCreateFuelProducts = async (productsData) => {
    this.logger.info(`Batch creating ${productsData.length} fuel products`);
    
    try {
      const results = [];
      const errors = [];
      
      for (let i = 0; i < productsData.length; i++) {
        try {
          const result = await this.createFuelProduct(productsData[i]);
          results.push(result);
        } catch (error) {
          errors.push({
            index: i,
            productData: productsData[i],
            error: error.message
          });
        }
      }
      
      return {
        successful: results,
        failed: errors,
        total: productsData.length,
        successCount: results.length,
        failureCount: errors.length
      };
    } catch (error) {
      throw this.handleError(error, 'Batch fuel product creation', 'Failed to batch create fuel products');
    }
  };

  // =====================
  // STATUS CHECKERS
  // =====================

  checkProductPricingStatus = (product) => {
    const status = {
      isValid: true,
      issues: [],
      warnings: [],
      priceStatus: 'unknown',
      margin: null,
      hasPricing: false
    };

    // Check if all pricing fields are present
    const hasFullPricing = product.baseCostPrice !== null && 
                          product.minSellingPrice !== null && 
                          product.maxSellingPrice !== null;

    status.hasPricing = hasFullPricing;

    if (!hasFullPricing) {
      status.warnings.push('Incomplete pricing data');
      status.priceStatus = 'no-pricing';
    } else {
      // Calculate margin
      const margin = this.calculateMargin(product.baseCostPrice, product.maxSellingPrice);
      status.margin = margin;
      
      if (margin !== null) {
        if (margin > 25) {
          status.priceStatus = 'excellent';
        } else if (margin > 15) {
          status.priceStatus = 'good';
        } else if (margin > 5) {
          status.priceStatus = 'fair';
        } else if (margin > 0) {
          status.priceStatus = 'low';
          status.warnings.push('Low margin (< 5%)');
        } else {
          status.priceStatus = 'unprofitable';
          status.issues.push('Product is unprofitable (negative margin)');
          status.isValid = false;
        }
      }
    }

    // Check price spread
    if (product.minSellingPrice !== null && product.maxSellingPrice !== null) {
      const spread = this.calculatePriceSpread(product.minSellingPrice, product.maxSellingPrice);
      if (spread !== null && spread < 0) {
        status.issues.push('Price spread is negative');
        status.isValid = false;
      } else if (spread !== null && product.baseCostPrice && spread < product.baseCostPrice * 0.05) {
        status.warnings.push('Narrow price spread (< 5% of base cost)');
      }
    }

    return status;
  };

  // =====================
  // TEMPLATE METHODS (Updated for new schema)
  // =====================

  getFuelProductTemplates = () => {
    return {
      'DIESEL_STANDARD': {
        name: 'Standard Diesel',
        fuelCategoryId: null, // Must be set by user
        unit: 'LITER',
        fuelCode: 'DSL-STD',
        description: 'Standard Automotive Diesel Oil',
        octaneRating: null,
        sulfurContent: 50,
        colorCode: '#0047AB',
        density: 0.85,
        flashPoint: 65,
        sku: 'DSL-STD-001',
        barcode: '890123456001',
        brand: 'Standard',
        isBatchTracked: true,
        isSerialTracked: false,
        baseCostPrice: 120.50,
        minSellingPrice: 135.00,
        maxSellingPrice: 150.00
      },
      'PETROL_PREMIUM': {
        name: 'Premium Petrol',
        fuelCategoryId: null, // Must be set by user
        unit: 'LITER',
        fuelCode: 'PET-PRM',
        description: 'Premium Motor Spirit (95 RON)',
        octaneRating: 95,
        sulfurContent: 10,
        colorCode: '#FF0000',
        density: 0.75,
        flashPoint: -40,
        sku: 'PET-PRM-001',
        barcode: '890123456002',
        brand: 'Premium',
        isBatchTracked: true,
        isSerialTracked: false,
        baseCostPrice: 130.75,
        minSellingPrice: 145.00,
        maxSellingPrice: 160.00
      }
    };
  };

  // =====================
  // API HEALTH CHECK
  // =====================

  checkApiHealth = async () => {
    try {
      const response = await apiService.get(`${this.BASE_URL}/`);
      return {
        healthy: true,
        version: response.data?.version || 'unknown',
        features: response.data?.features || {},
        userInfo: response.data?.userInfo || {}
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  };

  // =====================
  // DATA EXPORT/IMPORT
  // =====================

  generateExportData = (products, includePricing = true) => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        fuelCode: product.fuelCode,
        category: product.fuelCategory?.name,
        unit: product.unit,
        ...(includePricing && {
          baseCostPrice: product.baseCostPrice,
          minSellingPrice: product.minSellingPrice,
          maxSellingPrice: product.maxSellingPrice,
          margin: product.margin,
          priceStatus: product.priceStatus
        }),
        description: product.description,
        density: product.density,
        octaneRating: product.octaneRating,
        sulfurContent: product.sulfurContent,
        flashPoint: product.flashPoint
      }))
    };
    
    return exportData;
  };

  // =====================
  // STATISTICS
  // =====================

  calculateProductStatistics = (products) => {
    const stats = {
      total: products.length,
      withPricing: 0,
      withoutPricing: 0,
      withFuelCode: 0,
      withoutFuelCode: 0,
      profitable: 0,
      unprofitable: 0,
      categories: {},
      margins: []
    };
    
    products.forEach(product => {
      // Pricing stats
      if (product.baseCostPrice && product.minSellingPrice && product.maxSellingPrice) {
        stats.withPricing++;
        
        // Calculate margin
        const margin = this.calculateMargin(product.baseCostPrice, product.maxSellingPrice);
        if (margin !== null) {
          stats.margins.push(margin);
          if (margin > 0) stats.profitable++;
          if (margin <= 0) stats.unprofitable++;
        }
      } else {
        stats.withoutPricing++;
      }
      
      // Fuel code stats
      if (product.fuelCode) {
        stats.withFuelCode++;
      } else {
        stats.withoutFuelCode++;
      }
      
      // Category stats
      const categoryName = product.fuelCategory?.name || 'Uncategorized';
      if (!stats.categories[categoryName]) {
        stats.categories[categoryName] = 0;
      }
      stats.categories[categoryName]++;
    });
    
    // Calculate average margin
    if (stats.margins.length > 0) {
      const sum = stats.margins.reduce((a, b) => a + b, 0);
      stats.averageMargin = Number((sum / stats.margins.length).toFixed(1));
    }
    
    return stats;
  };
}

export const fuelService = new FuelService();
export default fuelService;