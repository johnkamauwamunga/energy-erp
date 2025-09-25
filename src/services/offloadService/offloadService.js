import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [OffloadService]', ...args),
  info: (...args) => console.log('ℹ️ [OffloadService]', ...args),
  warn: (...args) => console.warn('⚠️ [OffloadService]', ...args),
  error: (...args) => console.error('❌ [OffloadService]', ...args)
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

export const offloadService = {
  // Start a new fuel offload
  startOffload: async (offloadData) => {
    logger.info('Starting fuel offload:', offloadData);
    
    try {
      const response = await apiService.post('/fuel-offloads', offloadData);
      return handleResponse(response, 'starting fuel offload');
    } catch (error) {
      throw handleError(error, 'starting fuel offload', 'Failed to start fuel offload');
    }
  },

  // Complete an in-progress offload
  completeOffload: async (offloadId, completionData) => {
    logger.info(`Completing offload ${offloadId}:`, completionData);
    
    try {
      const response = await apiService.post(`/fuel-offloads/${offloadId}/complete`, completionData);
      return handleResponse(response, 'completing fuel offload');
    } catch (error) {
      throw handleError(error, 'completing fuel offload', 'Failed to complete fuel offload');
    }
  },

  // Get offload by ID
  getOffloadById: async (offloadId) => {
    logger.info(`Fetching offload: ${offloadId}`);
    
    try {
      const response = await apiService.get(`/fuel-offloads/${offloadId}`);
      return handleResponse(response, 'fetching offload');
    } catch (error) {
      throw handleError(error, 'fetching offload', 'Failed to fetch offload');
    }
  },

  // Get all offloads with filtering
  getOffloads: async (filters = {}) => {
    logger.info('Fetching offloads with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-offloads?${params.toString()}`);
      return handleResponse(response, 'fetching offloads');
    } catch (error) {
      throw handleError(error, 'fetching offloads', 'Failed to fetch offloads');
    }
  },

  // Update offload details
  updateOffload: async (offloadId, updateData) => {
    logger.info(`Updating offload ${offloadId}:`, updateData);
    
    try {
      const response = await apiService.patch(`/fuel-offloads/${offloadId}`, updateData);
      return handleResponse(response, 'updating offload');
    } catch (error) {
      throw handleError(error, 'updating offload', 'Failed to update offload');
    }
  },

  // Get offloads by purchase
  getOffloadsByPurchase: async (purchaseId, filters = {}) => {
    logger.info(`Fetching offloads for purchase: ${purchaseId}`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-offloads/purchase/${purchaseId}?${params.toString()}`);
      return handleResponse(response, 'fetching offloads by purchase');
    } catch (error) {
      throw handleError(error, 'fetching offloads by purchase', 'Failed to fetch offloads by purchase');
    }
  },

  // Get offloads by tank
  getOffloadsByTank: async (tankId, filters = {}) => {
    logger.info(`Fetching offloads for tank: ${tankId}`, filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-offloads/tank/${tankId}?${params.toString()}`);
      return handleResponse(response, 'fetching offloads by tank');
    } catch (error) {
      throw handleError(error, 'fetching offloads by tank', 'Failed to fetch offloads by tank');
    }
  },

  // Get offload summary for dashboard
  getOffloadSummary: async (filters = {}) => {
    logger.info('Fetching offload summary with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/fuel-offloads/summary/dashboard?${params.toString()}`);
      return handleResponse(response, 'fetching offload summary');
    } catch (error) {
      throw handleError(error, 'fetching offload summary', 'Failed to fetch offload summary');
    }
  },

  // Get offload readings (dip and pump)
  getOffloadReadings: async (offloadId) => {
    logger.info(`Fetching readings for offload: ${offloadId}`);
    
    try {
      const response = await apiService.get(`/fuel-offloads/${offloadId}/readings`);
      return handleResponse(response, 'fetching offload readings');
    } catch (error) {
      throw handleError(error, 'fetching offload readings', 'Failed to fetch offload readings');
    }
  },

  // Verify offload
  verifyOffload: async (offloadId, verificationData) => {
    logger.info(`Verifying offload ${offloadId}:`, verificationData);
    
    try {
      const response = await apiService.post(`/fuel-offloads/${offloadId}/verify`, verificationData);
      return handleResponse(response, 'verifying offload');
    } catch (error) {
      throw handleError(error, 'verifying offload', 'Failed to verify offload');
    }
  },

  // Get offload variances
  getOffloadVariances: async (offloadId) => {
    logger.info(`Fetching variances for offload: ${offloadId}`);
    
    try {
      const response = await apiService.get(`/fuel-offloads/${offloadId}/variances`);
      return handleResponse(response, 'fetching offload variances');
    } catch (error) {
      throw handleError(error, 'fetching offload variances', 'Failed to fetch offload variances');
    }
  },

  // Calculate expected quantities
  calculateExpectedQuantities: async (purchaseId, tankId) => {
    logger.info(`Calculating expected quantities for purchase: ${purchaseId}, tank: ${tankId}`);
    
    try {
      const response = await apiService.get(`/fuel-offloads/calculate-expected?purchaseId=${purchaseId}&tankId=${tankId}`);
      return handleResponse(response, 'calculating expected quantities');
    } catch (error) {
      throw handleError(error, 'calculating expected quantities', 'Failed to calculate expected quantities');
    }
  }
};