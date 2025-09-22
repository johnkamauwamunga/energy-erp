import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [AssetService]', ...args),
  info: (...args) => console.log('ℹ️ [AssetService]', ...args),
  warn: (...args) => console.warn('⚠️ [AssetService]', ...args),
  error: (...args) => console.error('❌ [AssetService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  console.log("API Response:", response.data);
  
  // Check if response.data exists
  if (response.data) {
    logger.debug(`${operation} successful`);
    
    // Return the data directly (not response.data.data)
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
    
    // Handle specific HTTP status codes
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
    
    // Handle validation errors
    if (status === 400 && data.errors) {
      const errorMessages = data.errors.map(err => err.message).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    
    // Use server-provided message if available
    if (data && data.message) {
      throw new Error(data.message);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

export const assetService = {
  // Get assets based on user role
  getAssets: async () => {
    logger.info('Fetching assets based on user role');
    
    try {
      const response = await apiService.get('/assets');
      return handleResponse(response, 'fetching assets');
    } catch (error) {
      throw handleError(error, 'fetching assets', 'Failed to fetch assets');
    }
  },

  // Get assets for a specific company
  getCompanyAssets: async (companyId) => {
    logger.info(`Fetching company assets: ${companyId}`);
    
    try {
      const response = await apiService.get(`/assets/company/${companyId}`);
      console.log("Fetching company asset response:", response);
      return handleResponse(response, 'fetching company assets');
    } catch (error) {
      throw handleError(error, 'fetching company assets', 'Failed to fetch company assets');
    }
  },

  // Get assets for a specific station
  getStationAssets: async (stationId) => {
    logger.info(`Fetching station assets: ${stationId}`);
    
    try {
      const response = await apiService.get(`/assets/station/${stationId}`);
      return handleResponse(response, 'fetching station assets');
    } catch (error) {
      throw handleError(error, 'fetching station assets', 'Failed to fetch station assets');
    }
  },

  // Create a new asset
  createAsset: async (assetData) => {
    logger.info('Creating asset:', assetData);
    
    try {
      const response = await apiService.post('/assets', assetData);
      return handleResponse(response, 'creating asset');
    } catch (error) {
      throw handleError(error, 'creating asset', 'Failed to create asset');
    }
  },

  // Get asset by ID
  getAssetById: async (id) => {
    logger.info(`Fetching asset: ${id}`);
    
    try {
      const response = await apiService.get(`/assets/${id}`);
      return handleResponse(response, 'fetching asset');
    } catch (error) {
      throw handleError(error, 'fetching asset', 'Failed to fetch asset');
    }
  },

  // Update asset
  updateAsset: async (id, assetData) => {
    logger.info(`Updating asset: ${id}`, assetData);
    
    try {
      const response = await apiService.put(`/assets/${id}`, assetData);
      return handleResponse(response, 'updating asset');
    } catch (error) {
      throw handleError(error, 'updating asset', 'Failed to update asset');
    }
  },

  // Delete asset
  deleteAsset: async (id) => {
    logger.info(`Deleting asset: ${id}`);
    
    try {
      const response = await apiService.delete(`/assets/${id}`);
      return handleResponse(response, 'deleting asset');
    } catch (error) {
      throw handleError(error, 'deleting asset', 'Failed to delete asset');
    }
  },

  // Assign asset to station
  assignToStation: async (id, stationId) => {
    logger.info(`Assigning asset ${id} to station ${stationId}`);
    
    try {
      const response = await apiService.patch(`/assets/${id}/assign`, { stationId });
      return handleResponse(response, 'assigning asset to station');
    } catch (error) {
      throw handleError(error, 'assigning asset to station', 'Failed to assign asset to station');
    }
  },

  // Remove asset from station
  removeFromStation: async (id) => {
    logger.info(`Removing asset ${id} from station`);
    
    try {
      const response = await apiService.patch(`/assets/${id}/unassign`);
      return handleResponse(response, 'removing asset from station');
    } catch (error) {
      throw handleError(error, 'removing asset from station', 'Failed to remove asset from station');
    }
  },

  // Bulk assign assets to station
  bulkAssignToStation: async (assetIds, stationId) => {
        console.log("bulk assigning, ",assetIds," to ",stationId)
   // logger.info(`Bulk assigning ${assetIds.length} assets to station ${stationId}`);
    
    try {
      const response = await apiService.patch('/assets/bulk/assign', { assetIds, stationId });
      return handleResponse(response, 'bulk assigning assets');
    } catch (error) {
      throw handleError(error, 'bulk assigning assets', 'Failed to bulk assign assets');
    }
  },

  // Bulk reassign assets between stations
  bulkReassignAssets: async (assetIds, fromStationId, toStationId) => {

    logger.info(`Bulk reassigning ${assetIds.length} assets from ${fromStationId} to ${toStationId}`);
    
    try {
      const response = await apiService.patch('/assets/bulk/reassign', { 
        assetIds, 
        fromStationId, 
        toStationId 
      });
      return handleResponse(response, 'bulk reassigning assets');
    } catch (error) {
      throw handleError(error, 'bulk reassigning assets', 'Failed to bulk reassign assets');
    }
  }
};