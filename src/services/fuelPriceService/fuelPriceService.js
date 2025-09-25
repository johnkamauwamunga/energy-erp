// src/services/fuelPriceService.js
import { apiService } from './apiService';

const logger = {
  debug: (...args) => console.log('🔍 [FuelPriceService]', ...args),
  info: (...args) => console.log('ℹ️ [FuelPriceService]', ...args),
  warn: (...args) => console.warn('⚠️ [FuelPriceService]', ...args),
  error: (...args) => console.error('❌ [FuelPriceService]', ...args)
};

const handleResponse = (response, operation) => {
  if (response.data) {
    logger.debug(`${operation} successful`);
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

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

export const fuelPriceService = {
  // Price List CRUD Operations
  createPriceList: async (priceListData) => {
    logger.info('Creating price list:', priceListData);
    
    try {
      const response = await apiService.post('/fuel-pricing/price-lists', priceListData);
      return handleResponse(response, 'creating price list');
    } catch (error) {
      throw handleError(error, 'creating price list', 'Failed to create price list');
    }
  },

  updatePriceList: async (priceListId, updateData) => {
    logger.info(`Updating price list ${priceListId}:`, updateData);
    
    try {
      const response = await apiService.put('/fuel-pricing/price-lists', {
        id: priceListId,
        ...updateData
      });
      return handleResponse(response, 'updating price list');
    } catch (error) {
      throw handleError(error, 'updating price list', 'Failed to update price list');
    }
  },

  getPriceLists: async (filters = {}) => {
    logger.info('Fetching price lists with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-pricing/price-lists?${params.toString()}`);
      return handleResponse(response, 'fetching price lists');
    } catch (error) {
      throw handleError(error, 'fetching price lists', 'Failed to fetch price lists');
    }
  },

  getPriceListById: async (priceListId) => {
    logger.info(`Fetching price list: ${priceListId}`);
    
    try {
      const response = await apiService.get(`/fuel-pricing/price-lists/${priceListId}`);
      return handleResponse(response, 'fetching price list');
    } catch (error) {
      throw handleError(error, 'fetching price list', 'Failed to fetch price list');
    }
  },

  approvePriceList: async (priceListId) => {
    logger.info(`Approving price list: ${priceListId}`);
    
    try {
      const response = await apiService.patch(`/fuel-pricing/price-lists/${priceListId}/approve`);
      return handleResponse(response, 'approving price list');
    } catch (error) {
      throw handleError(error, 'approving price list', 'Failed to approve price list');
    }
  },

  activatePriceList: async (priceListId) => {
    logger.info(`Activating price list: ${priceListId}`);
    
    try {
      const response = await apiService.patch(`/fuel-pricing/price-lists/${priceListId}/activate`);
      return handleResponse(response, 'activating price list');
    } catch (error) {
      throw handleError(error, 'activating price list', 'Failed to activate price list');
    }
  },

  deactivatePriceList: async (priceListId) => {
    logger.info(`Deactivating price list: ${priceListId}`);
    
    try {
      const response = await apiService.patch(`/fuel-pricing/price-lists/${priceListId}/deactivate`);
      return handleResponse(response, 'deactivating price list');
    } catch (error) {
      throw handleError(error, 'deactivating price list', 'Failed to deactivate price list');
    }
  },

  // Price List Items Operations
  addPriceListItem: async (itemData) => {
    logger.info('Adding price list item:', itemData);
    
    try {
      const response = await apiService.post('/fuel-pricing/price-list-items', itemData);
      return handleResponse(response, 'adding price list item');
    } catch (error) {
      throw handleError(error, 'adding price list item', 'Failed to add price list item');
    }
  },

  updatePriceListItem: async (itemId, updateData) => {
    logger.info(`Updating price list item ${itemId}:`, updateData);
    
    try {
      const response = await apiService.put('/fuel-pricing/price-list-items', {
        id: itemId,
        ...updateData
      });
      return handleResponse(response, 'updating price list item');
    } catch (error) {
      throw handleError(error, 'updating price list item', 'Failed to update price list item');
    }
  },

  getPriceListItems: async (filters = {}) => {
    logger.info('Fetching price list items with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-pricing/price-list-items?${params.toString()}`);
      return handleResponse(response, 'fetching price list items');
    } catch (error) {
      throw handleError(error, 'fetching price list items', 'Failed to fetch price list items');
    }
  },

  bulkUpdatePriceListItems: async (priceListId, items) => {
    logger.info(`Bulk updating price list items for ${priceListId}:`, items);
    
    try {
      const response = await apiService.post('/fuel-pricing/price-list-items/bulk', {
        priceListId,
        items
      });
      return handleResponse(response, 'bulk updating price list items');
    } catch (error) {
      throw handleError(error, 'bulk updating price list items', 'Failed to bulk update price list items');
    }
  },

  // Price Rules Operations
  createPriceRule: async (ruleData) => {
    logger.info('Creating price rule:', ruleData);
    
    try {
      const response = await apiService.post('/fuel-pricing/price-rules', ruleData);
      return handleResponse(response, 'creating price rule');
    } catch (error) {
      throw handleError(error, 'creating price rule', 'Failed to create price rule');
    }
  },

  updatePriceRule: async (ruleId, updateData) => {
    logger.info(`Updating price rule ${ruleId}:`, updateData);
    
    try {
      const response = await apiService.put('/fuel-pricing/price-rules', {
        id: ruleId,
        ...updateData
      });
      return handleResponse(response, 'updating price rule');
    } catch (error) {
      throw handleError(error, 'updating price rule', 'Failed to update price rule');
    }
  },

  getPriceRules: async (filters = {}) => {
    logger.info('Fetching price rules with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-pricing/price-rules?${params.toString()}`);
      return handleResponse(response, 'fetching price rules');
    } catch (error) {
      throw handleError(error, 'fetching price rules', 'Failed to fetch price rules');
    }
  },

  togglePriceRule: async (ruleId, isActive) => {
    logger.info(`Toggling price rule ${ruleId} to ${isActive}`);
    
    try {
      const response = await apiService.patch(`/fuel-pricing/price-rules/${ruleId}/toggle`, {
        isActive
      });
      return handleResponse(response, 'toggling price rule');
    } catch (error) {
      throw handleError(error, 'toggling price rule', 'Failed to toggle price rule');
    }
  },

  // Price Calculation and Queries
  calculateFuelPrice: async (calculationData) => {
    logger.info('Calculating fuel price:', calculationData);
    
    try {
      const response = await apiService.post('/fuel-pricing/calculate', calculationData);
      return handleResponse(response, 'calculating fuel price');
    } catch (error) {
      throw handleError(error, 'calculating fuel price', 'Failed to calculate fuel price');
    }
  },

  getCurrentPrices: async (filters = {}) => {
    logger.info('Fetching current prices with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-pricing/current-prices?${params.toString()}`);
      return handleResponse(response, 'fetching current prices');
    } catch (error) {
      throw handleError(error, 'fetching current prices', 'Failed to fetch current prices');
    }
  },

  getPriceHistory: async (filters = {}) => {
    logger.info('Fetching price history with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-pricing/price-history?${params.toString()}`);
      return handleResponse(response, 'fetching price history');
    } catch (error) {
      throw handleError(error, 'fetching price history', 'Failed to fetch price history');
    }
  },

  // Price Management Operations
  applyPriceUpdate: async (updateData) => {
    logger.info('Applying price update:', updateData);
    
    try {
      const response = await apiService.post('/fuel-pricing/price-updates', updateData);
      return handleResponse(response, 'applying price update');
    } catch (error) {
      throw handleError(error, 'applying price update', 'Failed to apply price update');
    }
  },

  setDiscount: async (discountData) => {
    logger.info('Setting discount:', discountData);
    
    try {
      const response = await apiService.post('/fuel-pricing/discounts', discountData);
      return handleResponse(response, 'setting discount');
    } catch (error) {
      throw handleError(error, 'setting discount', 'Failed to set discount');
    }
  },

  // Analytics
  getPriceAnalytics: async (filters = {}) => {
    logger.info('Fetching price analytics with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-pricing/analytics?${params.toString()}`);
      return handleResponse(response, 'fetching price analytics');
    } catch (error) {
      throw handleError(error, 'fetching price analytics', 'Failed to fetch price analytics');
    }
  }
};

// Constants matching backend enums
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
  ARCHIVED: 'ARCHIVED'
};

export const PRICE_RULE_CONDITION_TYPES = {
  TIME_BASED: 'TIME_BASED',
  DAY_BASED: 'DAY_BASED',
  QUANTITY_BASED: 'QUANTITY_BASED',
  CUSTOMER_TYPE: 'CUSTOMER_TYPE',
  PAYMENT_METHOD: 'PAYMENT_METHOD',
  LOYALTY_TIER: 'LOYALTY_TIER',
  SPECIAL_EVENT: 'SPECIAL_EVENT'
};

export const PRICE_ADJUSTMENT_TYPES = {
  PERCENTAGE_DISCOUNT: 'PERCENTAGE_DISCOUNT',
  PERCENTAGE_INCREASE: 'PERCENTAGE_INCREASE',
  FIXED_DISCOUNT: 'FIXED_DISCOUNT',
  FIXED_INCREASE: 'FIXED_INCREASE',
  PRICE_OVERRIDE: 'PRICE_OVERRIDE'
};