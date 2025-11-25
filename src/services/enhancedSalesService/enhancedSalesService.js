import { apiService } from '../apiService';

class EnhancedSalesService {
  constructor() {
    this.basePath = '/enhanced-sales';
    this.cache = new Map();
    this.CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache
    
    this.logger = {
      debug: (...args) => console.log('🔍 [EnhancedSalesService]', ...args),
      info: (...args) => console.log('📊 [EnhancedSalesService]', ...args),
      warn: (...args) => console.warn('⚠️ [EnhancedSalesService]', ...args),
      error: (...args) => console.error('❌ [EnhancedSalesService]', ...args)
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
      return response.data;
    }
    
    if (response.data) {
      this.logger.debug(`${operation} successful (direct data)`);
      return { data: response.data, success: true };
    }
    
    this.logger.warn(`Unexpected response structure for ${operation}`);
    throw new Error('Invalid response format from server');
  }

  #handleError(error, operation, defaultMessage) {
    this.logger.error(`${operation} failed:`, error);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    if (!error.response) {
      throw new Error('Network error. Please check your connection.');
    }

    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        throw new Error('Authentication failed. Please login again.');
      
      case 403:
        throw new Error('You do not have permission to view sales data.');
      
      case 404:
        throw new Error('Sales data not found.');
      
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
    
    // Only include defined, non-null, non-empty values
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, value);
        }
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

  // ==================== MAIN SALES ENDPOINTS ====================

  async getCalculatedPumpSales(filters = {}, forceRefresh = false) {
    const cacheKey = `pump-sales-${JSON.stringify(filters)}`;
    
    return this.#retryOperation(async () => {
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info('Fetching calculated pump sales:', filters);
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(`${this.basePath}/pump-sales?${queryParams}`);
      
      const data = this.#handleResponse(response, 'Pump sales fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Pump sales fetch', 'Failed to fetch pump sales data');
    });
  }

  async getProductPerformance(filters = {}, forceRefresh = false) {
    const cacheKey = `product-performance-${JSON.stringify(filters)}`;
    
    return this.#retryOperation(async () => {
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info('Fetching product performance:', filters);
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(`${this.basePath}/product-performance?${queryParams}`);
      
      const data = this.#handleResponse(response, 'Product performance fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Product performance fetch', 'Failed to fetch product performance data');
    });
  }

  async getShiftPerformance(filters = {}, forceRefresh = false) {
    const cacheKey = `shift-performance-${JSON.stringify(filters)}`;
    
    return this.#retryOperation(async () => {
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info('Fetching shift performance:', filters);
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(`${this.basePath}/shift-performance?${queryParams}`);
      
      const data = this.#handleResponse(response, 'Shift performance fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift performance fetch', 'Failed to fetch shift performance data');
    });
  }

  async getSalesTrends(filters = {}, forceRefresh = false) {
    const cacheKey = `sales-trends-${JSON.stringify(filters)}`;
    
    return this.#retryOperation(async () => {
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info('Fetching sales trends:', filters);
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(`${this.basePath}/sales-trends?${queryParams}`);
      
      const data = this.#handleResponse(response, 'Sales trends fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Sales trends fetch', 'Failed to fetch sales trends data');
    });
  }

  // ==================== SPECIFIC ENTITY SALES ====================

  async getSalesByPump(pumpId, filters = {}, forceRefresh = false) {
    const cacheKey = `pump-${pumpId}-sales-${JSON.stringify(filters)}`;
    
    return this.#retryOperation(async () => {
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching sales for pump ${pumpId}:`, filters);
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(`${this.basePath}/pump/${pumpId}?${queryParams}`);
      
      const data = this.#handleResponse(response, 'Pump-specific sales fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Pump-specific sales fetch', 'Failed to fetch pump sales data');
    });
  }

  async getSalesByShift(shiftId, filters = {}, forceRefresh = false) {
    const cacheKey = `shift-${shiftId}-sales-${JSON.stringify(filters)}`;
    
    return this.#retryOperation(async () => {
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching sales for shift ${shiftId}:`, filters);
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(`${this.basePath}/shift/${shiftId}?${queryParams}`);
      
      const data = this.#handleResponse(response, 'Shift-specific sales fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift-specific sales fetch', 'Failed to fetch shift sales data');
    });
  }

  async getSalesByStation(stationId, filters = {}, forceRefresh = false) {
    const cacheKey = `station-${stationId}-sales-${JSON.stringify(filters)}`;
    
    return this.#retryOperation(async () => {
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching sales for station ${stationId}:`, filters);
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(`${this.basePath}/station/${stationId}?${queryParams}`);
      
      const data = this.#handleResponse(response, 'Station-specific sales fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Station-specific sales fetch', 'Failed to fetch station sales data');
    });
  }

  async getSalesByProduct(productId, filters = {}, forceRefresh = false) {
    const cacheKey = `product-${productId}-sales-${JSON.stringify(filters)}`;
    
    return this.#retryOperation(async () => {
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching sales for product ${productId}:`, filters);
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(`${this.basePath}/product/${productId}?${queryParams}`);
      
      const data = this.#handleResponse(response, 'Product-specific sales fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Product-specific sales fetch', 'Failed to fetch product sales data');
    });
  }

  // ==================== DEBUG & UTILITY METHODS ====================

  async getRawReadings(limit = 20, forceRefresh = false) {
    const cacheKey = `raw-readings-${limit}`;
    
    return this.#retryOperation(async () => {
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching raw pump readings (limit: ${limit})`);
      const response = await apiService.get(`${this.basePath}/raw-readings?limit=${limit}`);
      
      const data = this.#handleResponse(response, 'Raw readings fetch');
      this.#setCached(cacheKey, data);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Raw readings fetch', 'Failed to fetch raw pump readings');
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
    this.logger.info('Sales cache cleared' + (pattern ? ` for pattern: ${pattern}` : ''));
  }

  // Data transformation helpers
  transformForCharts(salesData, type = 'revenue') {
    if (!salesData?.data) return [];

    if (Array.isArray(salesData.data)) {
      return salesData.data.map(item => ({
        name: item.product?.name || item.pump?.name || item.shift?.shiftNumber || 'Unknown',
        value: type === 'revenue' ? 
          (item.metrics?.totalRevenue || item.salesData?.salesValue || 0) :
          type === 'liters' ? 
          (item.metrics?.totalLiters || item.salesData?.litersDispensed || 0) : 0
      }));
    }

    return [];
  }

  calculateKPIs(salesData) {
    if (!salesData?.data) return {};

    const data = Array.isArray(salesData.data) ? salesData.data : [salesData.data];
    
    const totalRevenue = data.reduce((sum, item) => 
      sum + (item.metrics?.totalRevenue || item.salesData?.salesValue || 0), 0
    );
    
    const totalLiters = data.reduce((sum, item) => 
      sum + (item.metrics?.totalLiters || item.salesData?.litersDispensed || 0), 0
    );

    return {
      totalRevenue,
      totalLiters,
      averagePrice: totalLiters > 0 ? totalRevenue / totalLiters : 0,
      recordCount: data.length
    };
  }

  formatCurrency(amount, currency = 'KES', locale = 'en-KE') {
    if (amount === null || amount === undefined) return 'KES 0.00';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatVolume(liters, unit = 'L') {
    if (liters === null || liters === undefined) return '0.00 L';
    
    return new Intl.NumberFormat('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(liters) + ` ${unit}`;
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  }

  // Advanced data transformations
  transformForTimeSeries(salesData, period = 'daily') {
    if (!salesData?.data) return { series: [], categories: [] };

    const timeData = {};
    const categories = new Set();

    salesData.data.forEach(item => {
      let timeKey;
      const date = new Date(item.shift?.startTime || item.salesData?.calculatedAt || new Date());

      switch (period) {
        case 'hourly':
          timeKey = date.toISOString().slice(0, 13) + ':00';
          break;
        case 'daily':
          timeKey = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          timeKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          timeKey = date.toISOString().slice(0, 7);
          break;
        default:
          timeKey = date.toISOString().split('T')[0];
      }

      categories.add(timeKey);

      if (!timeData[timeKey]) {
        timeData[timeKey] = {
          revenue: 0,
          liters: 0,
          transactions: 0
        };
      }

      timeData[timeKey].revenue += item.metrics?.totalRevenue || item.salesData?.salesValue || 0;
      timeData[timeKey].liters += item.metrics?.totalLiters || item.salesData?.litersDispensed || 0;
      timeData[timeKey].transactions += 1;
    });

    const sortedCategories = Array.from(categories).sort();
    
    return {
      series: [
        {
          name: 'Revenue',
          data: sortedCategories.map(cat => timeData[cat]?.revenue || 0)
        },
        {
          name: 'Liters',
          data: sortedCategories.map(cat => timeData[cat]?.liters || 0)
        }
      ],
      categories: sortedCategories
    };
  }

  // Filter sales data by various criteria
  filterSalesData(salesData, filters = {}) {
    if (!salesData?.data) return salesData;

    let filteredData = [...salesData.data];

    if (filters.productName) {
      filteredData = filteredData.filter(item => 
        item.product?.name?.toLowerCase().includes(filters.productName.toLowerCase())
      );
    }

    if (filters.minRevenue) {
      filteredData = filteredData.filter(item => 
        (item.metrics?.totalRevenue || item.salesData?.salesValue) >= filters.minRevenue
      );
    }

    if (filters.maxRevenue) {
      filteredData = filteredData.filter(item => 
        (item.metrics?.totalRevenue || item.salesData?.salesValue) <= filters.maxRevenue
      );
    }

    if (filters.pumpName) {
      filteredData = filteredData.filter(item => 
        item.pump?.name?.toLowerCase().includes(filters.pumpName.toLowerCase())
      );
    }

    return {
      ...salesData,
      data: filteredData
    };
  }
}

// Create singleton instance
export const enhancedSalesService = new EnhancedSalesService();

// Export constants
export const GROUPING_TYPES = {
  PUMP: 'pump',
  PRODUCT: 'product',
  SHIFT: 'shift',
  PRODUCT_SHIFT: 'product-shift'
};

export const SORT_OPTIONS = {
  SALES_VALUE: 'salesValue',
  LITERS_DISPENSED: 'litersDispensed',
  PUMP_NAME: 'pumpName',
  PRODUCT_NAME: 'productName',
  SHIFT_START: 'shiftStart'
};

export const PERIOD_TYPES = {
  HOURLY: 'HOURLY',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY'
};

export default enhancedSalesService;