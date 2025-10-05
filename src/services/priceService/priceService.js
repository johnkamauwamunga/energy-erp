// src/services/pricingService.js
import { apiService } from './apiService';

class PricingService {
  constructor() {
    this.basePath = '/api/pricing';
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
    
    this.logger = {
      debug: (...args) => console.log('🔍 [PricingService]', ...args),
      info: (...args) => console.log('ℹ️ [PricingService]', ...args),
      warn: (...args) => console.warn('⚠️ [PricingService]', ...args),
      error: (...args) => console.error('❌ [PricingService]', ...args)
    };

    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      cacheEnabled: true
    };
  }

  // ==================== CORE UTILITIES ====================

  #handleResponse(response, operation) {
    if (response.data?.success) {
      this.logger.debug(`${operation} successful`);
      return response.data.data || response.data;
    }
    
    if (response.data) {
      this.logger.debug(`${operation} successful (direct data)`);
      return response.data;
    }
    
    this.logger.warn(`Unexpected response structure for ${operation}`);
    throw new Error('Invalid response format from server');
  }

  #handleError(error, operation, defaultMessage) {
    this.logger.error(`${operation} failed:`, error);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    if (error.request) {
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
        case 422:
          return this.#handleValidationError(data);
        
        case 429:
          throw new Error('Too many requests. Please try again later.');
        
        case 500:
          throw new Error('Server error. Please try again later.');
        
        default:
          if (data?.message) throw new Error(data.message);
      }
    }

    throw new Error(defaultMessage || 'An unexpected error occurred');
  }

  #handleValidationError(data) {
    if (data.message) throw new Error(data.message);
    if (data.errors) {
      const errorMessages = Array.isArray(data.errors) 
        ? data.errors.map(err => err.message || err).join(', ')
        : JSON.stringify(data.errors);
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    throw new Error('Validation failed');
  }

  #buildQueryParams(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    return params.toString();
  }

  #getCached(key) {
    if (!this.config.cacheEnabled) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`Cache hit: ${key}`);
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  #setCached(key, data) {
    if (this.config.cacheEnabled) {
      this.cache.set(key, { data, timestamp: Date.now() });
    }
  }

  async #retryOperation(operation, retries = this.config.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (error.response?.status >= 500 && i < retries - 1) {
          this.logger.warn(`Retrying operation (${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (i + 1)));
          continue;
        }
        throw error;
      }
    }
  }

  // ==================== PRICE LIST MANAGEMENT ====================

  async createPriceList(priceListData) {
    return this.#retryOperation(async () => {
      this.logger.info('Creating price list:', priceListData);
      
      const response = await apiService.post(`${this.basePath}/pricelists`, priceListData);
      this.clearCache('pricelists');
      return this.#handleResponse(response, 'Price list creation');
    }).catch(error => {
      throw this.#handleError(error, 'Price list creation', 'Failed to create price list');
    });
  }

  async updatePriceList(priceListId, updateData) {
    return this.#retryOperation(async () => {
      this.logger.info(`Updating price list ${priceListId}:`, updateData);
      
      const response = await apiService.put(`${this.basePath}/pricelists/${priceListId}`, updateData);
      this.clearCache('pricelists');
      return this.#handleResponse(response, 'Price list update');
    }).catch(error => {
      throw this.#handleError(error, 'Price list update', 'Failed to update price list');
    });
  }

  async getPriceLists(filters = {}, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `pricelists-${JSON.stringify(filters)}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info('Fetching price lists:', filters);
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(`${this.basePath}/pricelists?${queryParams}`);
      
      const data = this.#handleResponse(response, 'Price lists fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Price lists fetch', 'Failed to fetch price lists');
    });
  }

  async getPriceListById(priceListId, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `pricelist-${priceListId}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching price list: ${priceListId}`);
      const response = await apiService.get(`${this.basePath}/pricelists/${priceListId}`);
      
      const data = this.#handleResponse(response, 'Price list fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Price list fetch', 'Failed to fetch price list');
    });
  }

  async deletePriceList(priceListId) {
    return this.#retryOperation(async () => {
      this.logger.info(`Deleting price list: ${priceListId}`);
      
      const response = await apiService.delete(`${this.basePath}/pricelists/${priceListId}`);
      this.clearCache('pricelists');
      return this.#handleResponse(response, 'Price list deletion');
    }).catch(error => {
      throw this.#handleError(error, 'Price list deletion', 'Failed to delete price list');
    });
  }

  // ==================== PRICE LIST STATUS MANAGEMENT ====================

  async activatePriceList(priceListId, effectiveFrom = null) {
    return this.#retryOperation(async () => {
      this.logger.info(`Activating price list: ${priceListId}`);
      
      const requestBody = effectiveFrom ? { effectiveFrom } : {};
      const response = await apiService.post(
        `${this.basePath}/pricelists/${priceListId}/activate`,
        requestBody
      );
      
      this.clearCache('pricelists');
      return this.#handleResponse(response, 'Price list activation');
    }).catch(error => {
      throw this.#handleError(error, 'Price list activation', 'Failed to activate price list');
    });
  }

  async deactivatePriceList(priceListId) {
    return this.#retryOperation(async () => {
      this.logger.info(`Deactivating price list: ${priceListId}`);
      
      const response = await apiService.post(
        `${this.basePath}/pricelists/${priceListId}/deactivate`
      );
      
      this.clearCache('pricelists');
      return this.#handleResponse(response, 'Price list deactivation');
    }).catch(error => {
      throw this.#handleError(error, 'Price list deactivation', 'Failed to deactivate price list');
    });
  }

  async approvePriceList(priceListId) {
    return this.#retryOperation(async () => {
      this.logger.info(`Approving price list: ${priceListId}`);
      
      const response = await apiService.post(
        `${this.basePath}/pricelists/${priceListId}/approve`
      );
      
      this.clearCache('pricelists');
      return this.#handleResponse(response, 'Price list approval');
    }).catch(error => {
      throw this.#handleError(error, 'Price list approval', 'Failed to approve price list');
    });
  }

  // ==================== CURRENT PRICING ====================

  async getActivePriceList(type = 'RETAIL') {
    return this.#retryOperation(async () => {
      const cacheKey = `active-pricelist-${type}`;
      const cached = this.#getCached(cacheKey);
      if (cached) return cached;

      this.logger.info(`Fetching active price list for type: ${type}`);
      const response = await apiService.get(
        `${this.basePath}/pricelists/active/current?type=${type}`
      );
      
      const data = this.#handleResponse(response, 'Active price list fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Active price list fetch', 'Failed to fetch active price list');
    });
  }

  async getCurrentPrices() {
    return this.#retryOperation(async () => {
      const cacheKey = 'current-prices';
      const cached = this.#getCached(cacheKey);
      if (cached) return cached;

      this.logger.info('Fetching current prices');
      const response = await apiService.get(`${this.basePath}/prices/current`);
      
      const data = this.#handleResponse(response, 'Current prices fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Current prices fetch', 'Failed to fetch current prices');
    });
  }

  // ==================== UTILITY METHODS ====================

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Configuration updated:', this.config);
  }

  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
    this.logger.info('Cache cleared' + (pattern ? ` for pattern: ${pattern}` : ''));
  }

  // Helper method for price validation
  validatePrice(costPrice, sellingPrice, minMargin = 5, maxMargin = 50) {
    if (costPrice <= 0) throw new Error('Cost price must be positive');
    if (sellingPrice <= 0) throw new Error('Selling price must be positive');
    
    const margin = ((sellingPrice - costPrice) / costPrice) * 100;
    const isValid = margin >= minMargin && margin <= maxMargin;
    
    return {
      isValid,
      margin: Math.round(margin * 100) / 100,
      message: isValid 
        ? `Margin (${margin}%) is acceptable`
        : `Margin (${margin}%) outside acceptable range (${minMargin}%-${maxMargin}%)`,
      recommendation: !isValid 
        ? margin < minMargin 
          ? `Increase price to at least $${(costPrice * (1 + minMargin / 100)).toFixed(2)}`
          : `Consider reducing price to maximize sales`
        : 'Price is optimal'
    };
  }

  formatPrice(price, currency = 'USD', locale = 'en-US') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(price);
  }
}

// Create singleton instance
export const pricingService = new PricingService();

// Export constants that match your backend schema
export const PRICE_LIST_TYPES = {
  RETAIL: 'RETAIL',
  WHOLESALE: 'WHOLESALE',
  PROMOTIONAL: 'PROMOTIONAL',
  CONTRACT: 'CONTRACT',
  STAFF: 'STAFF',
  GOVERNMENT: 'GOVERNMENT',
  OTHER: 'OTHER'
};

export const PRICE_LIST_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  ARCHIVED: 'ARCHIVED',
  INACTIVE: 'INACTIVE'
};

export const PRICE_ADJUSTMENT_TYPES = {
  PERCENTAGE_DISCOUNT: 'PERCENTAGE_DISCOUNT',
  PERCENTAGE_INCREASE: 'PERCENTAGE_INCREASE',
  FIXED_DISCOUNT: 'FIXED_DISCOUNT',
  FIXED_INCREASE: 'FIXED_INCREASE',
  PRICE_OVERRIDE: 'PRICE_OVERRIDE'
};

export default pricingService;