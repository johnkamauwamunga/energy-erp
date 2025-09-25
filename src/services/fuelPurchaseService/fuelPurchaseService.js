import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [FuelPurchaseService]', ...args),
  info: (...args) => console.log('ℹ️ [FuelPurchaseService]', ...args),
  warn: (...args) => console.warn('⚠️ [FuelPurchaseService]', ...args),
  error: (...args) => console.error('❌ [FuelPurchaseService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  console.log("API Response:", response.data);
  
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

export const fuelPurchaseService = {
  // Create a new fuel purchase
  createFuelPurchase: async (purchaseData) => {
    logger.info('Creating fuel purchase:', purchaseData);
    
    try {
      const response = await apiService.post('/fuel-purchases', purchaseData);
      return handleResponse(response, 'creating fuel purchase');
    } catch (error) {
      throw handleError(error, 'creating fuel purchase', 'Failed to create fuel purchase');
    }
  },

  // Get fuel purchase by ID
  getFuelPurchaseById: async (purchaseId) => {
    logger.info(`Fetching fuel purchase: ${purchaseId}`);
    
    try {
      const response = await apiService.get(`/fuel-purchases/${purchaseId}`);
      return handleResponse(response, 'fetching fuel purchase');
    } catch (error) {
      throw handleError(error, 'fetching fuel purchase', 'Failed to fetch fuel purchase');
    }
  },

  // Get all fuel purchases with filtering
  getFuelPurchases: async (filters = {}) => {
    logger.info('Fetching fuel purchases with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-purchases?${params.toString()}`);
      return handleResponse(response, 'fetching fuel purchases');
    } catch (error) {
      throw handleError(error, 'fetching fuel purchases', 'Failed to fetch fuel purchases');
    }
  },

  // Update fuel purchase
  updateFuelPurchase: async (purchaseId, updateData) => {
    logger.info(`Updating fuel purchase ${purchaseId}:`, updateData);
    
    try {
      const response = await apiService.put(`/fuel-purchases/${purchaseId}`, updateData);
      return handleResponse(response, 'updating fuel purchase');
    } catch (error) {
      throw handleError(error, 'updating fuel purchase', 'Failed to update fuel purchase');
    }
  },

  // Approve fuel purchase
  approveFuelPurchase: async (purchaseId, approveData = {}) => {
    logger.info(`Approving fuel purchase: ${purchaseId}`, approveData);
    
    try {
      const response = await apiService.patch(`/fuel-purchases/${purchaseId}/approve`, approveData);
      return handleResponse(response, 'approving fuel purchase');
    } catch (error) {
      throw handleError(error, 'approving fuel purchase', 'Failed to approve fuel purchase');
    }
  },

  // Cancel fuel purchase
  cancelFuelPurchase: async (purchaseId, reason) => {
    logger.info(`Cancelling fuel purchase: ${purchaseId}`, { reason });
    
    try {
      const response = await apiService.patch(`/fuel-purchases/${purchaseId}/cancel`, { reason });
      return handleResponse(response, 'cancelling fuel purchase');
    } catch (error) {
      throw handleError(error, 'cancelling fuel purchase', 'Failed to cancel fuel purchase');
    }
  },

  // Get purchases by supplier
  getPurchasesBySupplier: async (supplierId, filters = {}) => {
    logger.info(`Fetching purchases for supplier: ${supplierId}`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-purchases/supplier/${supplierId}?${params.toString()}`);
      return handleResponse(response, 'fetching purchases by supplier');
    } catch (error) {
      throw handleError(error, 'fetching purchases by supplier', 'Failed to fetch purchases by supplier');
    }
  },

  // Get purchase summary for dashboard
  getPurchaseSummary: async (filters = {}) => {
    logger.info('Fetching purchase summary with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-purchases/summary?${params.toString()}`);
      return handleResponse(response, 'fetching purchase summary');
    } catch (error) {
      throw handleError(error, 'fetching purchase summary', 'Failed to fetch purchase summary');
    }
  },

  // Get purchase items
  getPurchaseItems: async (purchaseId) => {
    logger.info(`Fetching items for purchase: ${purchaseId}`);
    
    try {
      const response = await apiService.get(`/fuel-purchases/${purchaseId}/items`);
      return handleResponse(response, 'fetching purchase items');
    } catch (error) {
      throw handleError(error, 'fetching purchase items', 'Failed to fetch purchase items');
    }
  },

  // Add item to purchase
  addPurchaseItem: async (purchaseId, itemData) => {
    logger.info(`Adding item to purchase ${purchaseId}:`, itemData);
    
    try {
      const response = await apiService.post(`/fuel-purchases/${purchaseId}/items`, itemData);
      return handleResponse(response, 'adding purchase item');
    } catch (error) {
      throw handleError(error, 'adding purchase item', 'Failed to add purchase item');
    }
  },

  // Update purchase item
  updatePurchaseItem: async (purchaseId, itemId, itemData) => {
    logger.info(`Updating item ${itemId} in purchase ${purchaseId}:`, itemData);
    
    try {
      const response = await apiService.put(`/fuel-purchases/${purchaseId}/items/${itemId}`, itemData);
      return handleResponse(response, 'updating purchase item');
    } catch (error) {
      throw handleError(error, 'updating purchase item', 'Failed to update purchase item');
    }
  },

  // Remove purchase item
  removePurchaseItem: async (purchaseId, itemId) => {
    logger.info(`Removing item ${itemId} from purchase ${purchaseId}`);
    
    try {
      const response = await apiService.delete(`/fuel-purchases/${purchaseId}/items/${itemId}`);
      return handleResponse(response, 'removing purchase item');
    } catch (error) {
      throw handleError(error, 'removing purchase item', 'Failed to remove purchase item');
    }
  },

  // Delete fuel purchase (add to your backend too)
  deleteFuelPurchase: async (purchaseId) => {
    logger.info(`Deleting fuel purchase: ${purchaseId}`);
    
    try {
      const response = await apiService.delete(`/fuel-purchases/${purchaseId}`);
      return handleResponse(response, 'deleting fuel purchase');
    } catch (error) {
      throw handleError(error, 'deleting fuel purchase', 'Failed to delete fuel purchase');
    }
  },

  // Get purchase items
//   getPurchaseItems: async (purchaseId) => {
//     logger.info(`Fetching items for purchase: ${purchaseId}`);
    
//     try {
//       const response = await apiService.get(`/fuel-purchases/${purchaseId}/items`);
//       return handleResponse(response, 'fetching purchase items');
//     } catch (error) {
//       throw handleError(error, 'fetching purchase items', 'Failed to fetch purchase items');
//     }
//   }
};