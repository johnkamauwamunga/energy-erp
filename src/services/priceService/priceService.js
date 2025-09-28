import { apiService } from './apiService';

const logger = {
  debug: (...args) => console.log('🔍 [PricingService]', ...args),
  info: (...args) => console.log('ℹ️ [PricingService]', ...args),
  warn: (...args) => console.warn('⚠️ [PricingService]', ...args),
  error: (...args) => console.error('❌ [PricingService]', ...args)
};

class PricingService {
  constructor() {
    this.basePath = '/api/pricing';
  }

  // ==================== UTILITY METHODS ====================

  #handleResponse(response, operation) {
    if (response.data) {
      logger.debug(`${operation} successful`);
      return response.data;
    }
    
    logger.warn(`Unexpected response structure for ${operation}:`, response);
    throw new Error('Invalid response format from server');
  }

  #handleError(error, operation, defaultMessage) {
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

  // ==================== PRICE LIST MANAGEMENT ====================

  async createPriceList(priceListData) {
    logger.info('Creating price list:', priceListData);
    
    try {
      const response = await apiService.post(`${this.basePath}/pricelists`, priceListData);
      return this.#handleResponse(response, 'creating price list');
    } catch (error) {
      throw this.#handleError(error, 'creating price list', 'Failed to create price list');
    }
  }

  async updatePriceList(priceListId, updateData) {
    logger.info(`Updating price list ${priceListId}:`, updateData);
    
    try {
      const response = await apiService.put(`${this.basePath}/pricelists/${priceListId}`, updateData);
      return this.#handleResponse(response, 'updating price list');
    } catch (error) {
      throw this.#handleError(error, 'updating price list', 'Failed to update price list');
    }
  }

  async getPriceLists(filters = {}) {
    logger.info('Fetching price lists with filters:', filters);
    
    try {
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(`${this.basePath}/pricelists?${queryParams}`);
      return this.#handleResponse(response, 'fetching price lists');
    } catch (error) {
      throw this.#handleError(error, 'fetching price lists', 'Failed to fetch price lists');
    }
  }

  async getPriceListById(priceListId) {
    logger.info(`Fetching price list: ${priceListId}`);
    
    try {
      const response = await apiService.get(`${this.basePath}/pricelists/${priceListId}`);
      return this.#handleResponse(response, 'fetching price list');
    } catch (error) {
      throw this.#handleError(error, 'fetching price list', 'Failed to fetch price list');
    }
  }

  async deletePriceList(priceListId) {
    logger.info(`Deleting price list: ${priceListId}`);
    
    try {
      const response = await apiService.delete(`${this.basePath}/pricelists/${priceListId}`);
      return this.#handleResponse(response, 'deleting price list');
    } catch (error) {
      throw this.#handleError(error, 'deleting price list', 'Failed to delete price list');
    }
  }

  // ==================== PRICE LIST ITEMS MANAGEMENT ====================

  async addPriceListItem(priceListId, itemData) {
    logger.info(`Adding price list item to ${priceListId}:`, itemData);
    
    try {
      const response = await apiService.post(
        `${this.basePath}/pricelists/${priceListId}/items`, 
        itemData
      );
      return this.#handleResponse(response, 'adding price list item');
    } catch (error) {
      throw this.#handleError(error, 'adding price list item', 'Failed to add price list item');
    }
  }

  async updatePriceListItem(itemId, updateData) {
    logger.info(`Updating price list item ${itemId}:`, updateData);
    
    try {
      const response = await apiService.put(
        `${this.basePath}/priceitems/${itemId}`, 
        updateData
      );
      return this.#handleResponse(response, 'updating price list item');
    } catch (error) {
      throw this.#handleError(error, 'updating price list item', 'Failed to update price list item');
    }
  }

  async getPriceListItems(priceListId, filters = {}) {
    logger.info(`Fetching price list items for ${priceListId}:`, filters);
    
    try {
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(
        `${this.basePath}/pricelists/${priceListId}/items?${queryParams}`
      );
      return this.#handleResponse(response, 'fetching price list items');
    } catch (error) {
      throw this.#handleError(error, 'fetching price list items', 'Failed to fetch price list items');
    }
  }

  async deletePriceListItem(itemId) {
    logger.info(`Deleting price list item: ${itemId}`);
    
    try {
      const response = await apiService.delete(`${this.basePath}/priceitems/${itemId}`);
      return this.#handleResponse(response, 'deleting price list item');
    } catch (error) {
      throw this.#handleError(error, 'deleting price list item', 'Failed to delete price list item');
    }
  }

  // ==================== PRICE RULES MANAGEMENT ====================

  async addPriceRule(priceListId, ruleData) {
    logger.info(`Adding price rule to ${priceListId}:`, ruleData);
    
    try {
      const response = await apiService.post(
        `${this.basePath}/pricelists/${priceListId}/rules`, 
        ruleData
      );
      return this.#handleResponse(response, 'adding price rule');
    } catch (error) {
      throw this.#handleError(error, 'adding price rule', 'Failed to add price rule');
    }
  }

  async updatePriceRule(ruleId, updateData) {
    logger.info(`Updating price rule ${ruleId}:`, updateData);
    
    try {
      const response = await apiService.put(
        `${this.basePath}/pricerules/${ruleId}`, 
        updateData
      );
      return this.#handleResponse(response, 'updating price rule');
    } catch (error) {
      throw this.#handleError(error, 'updating price rule', 'Failed to update price rule');
    }
  }

  async getPriceRules(priceListId) {
    logger.info(`Fetching price rules for ${priceListId}`);
    
    try {
      const response = await apiService.get(
        `${this.basePath}/pricelists/${priceListId}/rules`
      );
      return this.#handleResponse(response, 'fetching price rules');
    } catch (error) {
      throw this.#handleError(error, 'fetching price rules', 'Failed to fetch price rules');
    }
  }

  async deletePriceRule(ruleId) {
    logger.info(`Deleting price rule: ${ruleId}`);
    
    try {
      const response = await apiService.delete(`${this.basePath}/pricerules/${ruleId}`);
      return this.#handleResponse(response, 'deleting price rule');
    } catch (error) {
      throw this.#handleError(error, 'deleting price rule', 'Failed to delete price rule');
    }
  }

  // ==================== PRICE CALCULATIONS ====================

  async calculatePrice(calculationData) {
    logger.info('Calculating price:', calculationData);
    
    try {
      const response = await apiService.post(
        `${this.basePath}/prices/calculate`, 
        calculationData
      );
      return this.#handleResponse(response, 'calculating price');
    } catch (error) {
      throw this.#handleError(error, 'calculating price', 'Failed to calculate price');
    }
  }

  async getCurrentPrices(filters = {}) {
    logger.info('Fetching current prices with filters:', filters);
    
    try {
      const queryParams = this.#buildQueryParams(filters);
      const response = await apiService.get(
        `${this.basePath}/prices/current?${queryParams}`
      );
      return this.#handleResponse(response, 'fetching current prices');
    } catch (error) {
      throw this.#handleError(error, 'fetching current prices', 'Failed to fetch current prices');
    }
  }

  // ==================== COMPETITIVE PRICING ====================

  async adjustCompetitivePrice(productId, marketData) {
    logger.info(`Adjusting competitive price for ${productId}:`, marketData);
    
    try {
      const response = await apiService.post(
        `${this.basePath}/prices/competitive/${productId}/adjust`, 
        marketData
      );
      return this.#handleResponse(response, 'adjusting competitive price');
    } catch (error) {
      throw this.#handleError(error, 'adjusting competitive price', 'Failed to adjust competitive price');
    }
  }

  async getCompetitiveAnalysis(productId) {
    logger.info(`Getting competitive analysis for ${productId}`);
    
    try {
      const response = await apiService.get(
        `${this.basePath}/prices/competitive/${productId}/analysis`
      );
      return this.#handleResponse(response, 'getting competitive analysis');
    } catch (error) {
      throw this.#handleError(error, 'getting competitive analysis', 'Failed to get competitive analysis');
    }
  }

  // ==================== PRICE CALCULATION ENGINE (CLIENT-SIDE) ====================

  /**
   * Client-side price calculation for immediate feedback
   * Uses the same logic as backend for consistency
   */
  calculatePriceClientSide(basePrice, rules, context, minPrice, maxPrice) {
    let finalPrice = basePrice;
    const appliedRules = [];

    // Sort rules by priority (descending)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (rule.isActive && this.#ruleAppliesClientSide(rule, context)) {
        const priceBefore = finalPrice;
        finalPrice = this.#applyRuleAdjustment(finalPrice, rule);
        
        // Apply boundaries
        finalPrice = Math.max(minPrice || 0, Math.min(finalPrice, maxPrice || Infinity));
        
        appliedRules.push({
          rule: rule.name,
          adjustment: rule.adjustmentType,
          value: rule.adjustmentValue,
          before: priceBefore,
          after: finalPrice
        });
      }
    }

    return {
      basePrice,
      finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimals
      appliedRules,
      calculatedAt: new Date()
    };
  }

  #ruleAppliesClientSide(rule, context) {
    switch (rule.conditionType) {
      case PRICE_RULE_CONDITION_TYPES.TIME_BASED:
        return this.#timeBasedRuleApplies(rule.condition, context.timestamp);
      
      case PRICE_RULE_CONDITION_TYPES.CUSTOMER_TYPE:
        return this.#customerTypeRuleApplies(rule.condition, context.customerType);
      
      case PRICE_RULE_CONDITION_TYPES.VOLUME_BASED:
        return this.#volumeBasedRuleApplies(rule.condition, context.quantity);
      
      case PRICE_RULE_CONDITION_TYPES.PAYMENT_METHOD:
        return this.#paymentMethodRuleApplies(rule.condition, context.paymentMethod);
      
      default:
        return false;
    }
  }

  #timeBasedRuleApplies(condition, timestamp) {
    if (!timestamp) return false;
    
    const time = new Date(timestamp).toTimeString().split(' ')[0]; // Get HH:MM:SS
    return time >= condition.startTime && time <= condition.endTime;
  }

  #customerTypeRuleApplies(condition, customerType) {
    return condition.customerTypes.includes(customerType);
  }

  #volumeBasedRuleApplies(condition, quantity) {
    return quantity >= condition.minQuantity;
  }

  #paymentMethodRuleApplies(condition, paymentMethod) {
    return condition.paymentMethods.includes(paymentMethod);
  }

  #applyRuleAdjustment(price, rule) {
    switch (rule.adjustmentType) {
      case PRICE_ADJUSTMENT_TYPES.PERCENTAGE_DISCOUNT:
        return price * (1 - rule.adjustmentValue / 100);
      
      case PRICE_ADJUSTMENT_TYPES.FIXED_DISCOUNT:
        return price - rule.adjustmentValue;
      
      case PRICE_ADJUSTMENT_TYPES.PERCENTAGE_INCREASE:
        return price * (1 + rule.adjustmentValue / 100);
      
      case PRICE_ADJUSTMENT_TYPES.FIXED_INCREASE:
        return price + rule.adjustmentValue;
      
      default:
        return price;
    }
  }

  // ==================== PRICE VALIDATION ====================

  validatePriceCalculation(costPrice, sellingPrice, minMargin, maxMargin) {
    const margin = ((sellingPrice - costPrice) / costPrice) * 100;
    
    return {
      isValid: margin >= minMargin && margin <= maxMargin,
      margin: Math.round(margin * 100) / 100,
      message: margin < minMargin 
        ? `Margin (${margin}%) below minimum (${minMargin}%)`
        : margin > maxMargin
        ? `Margin (${margin}%) above maximum (${maxMargin}%)`
        : `Margin (${margin}%) within acceptable range`
    };
  }

  // ==================== BULK OPERATIONS ====================

  async bulkUpdatePriceListItems(priceListId, items) {
    logger.info(`Bulk updating items for price list ${priceListId}:`, items);
    
    try {
      // Since we don't have a bulk endpoint, we'll use Promise.all
      const operations = items.map(item => 
        item.id 
          ? this.updatePriceListItem(item.id, item)
          : this.addPriceListItem(priceListId, item)
      );
      
      const results = await Promise.all(operations);
      return results;
    } catch (error) {
      throw this.#handleError(error, 'bulk updating price list items', 'Failed to bulk update items');
    }
  }
}

// ==================== CONSTANTS (Matching Backend) ====================

export const PRICE_LIST_TYPES = {
  RETAIL: 'RETAIL',
  WHOLESALE: 'WHOLESALE', 
  FLEET: 'FLEET',
  PROMOTIONAL: 'PROMOTIONAL'
};

export const PRICE_LIST_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED'
};

export const PRICE_RULE_CONDITION_TYPES = {
  TIME_BASED: 'TIME_BASED',
  CUSTOMER_TYPE: 'CUSTOMER_TYPE',
  VOLUME_BASED: 'VOLUME_BASED',
  PAYMENT_METHOD: 'PAYMENT_METHOD'
};

export const PRICE_ADJUSTMENT_TYPES = {
  PERCENTAGE_DISCOUNT: 'PERCENTAGE_DISCOUNT',
  FIXED_DISCOUNT: 'FIXED_DISCOUNT',
  PERCENTAGE_INCREASE: 'PERCENTAGE_INCREASE',
  FIXED_INCREASE: 'FIXED_INCREASE'
};

export const CUSTOMER_TYPES = {
  RETAIL: 'RETAIL',
  FLEET: 'FLEET',
  CORPORATE: 'CORPORATE'
};

export const PAYMENT_METHODS = {
  CASH: 'CASH',
  CARD: 'CARD',
  MOBILE_MONEY: 'MOBILE_MONEY'
};

// Create singleton instance
export const pricingService = new PricingService();
export default pricingService;