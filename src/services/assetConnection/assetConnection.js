import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [AssetConnectionService]', ...args),
  info: (...args) => console.log('ℹ️ [AssetConnectionService]', ...args),
  warn: (...args) => console.warn('⚠️ [AssetConnectionService]', ...args),
  error: (...args) => console.error('❌ [AssetConnectionService]', ...args)
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

export const assetConnectionService = {
  // Get connection types
  getConnectionTypes: async () => {
    logger.info('Fetching connection types');
    
    try {
      const response = await apiService.get('/asset-connections/types');
      return handleResponse(response, 'fetching connection types');
    } catch (error) {
      throw handleError(error, 'fetching connection types', 'Failed to fetch connection types');
    }
  },

  // Create a connection
  createConnection: async (stationId, connectionData) => {
    logger.info(`Creating connection for station ${stationId}:`, connectionData);
    
    try {
      const response = await apiService.post(
        `/asset-connections/stations/${stationId}/connections`,
        connectionData
      );
      return handleResponse(response, 'creating connection');
    } catch (error) {
      throw handleError(error, 'creating connection', 'Failed to create connection');
    }
  },

  // Create bulk connections
  createBulkConnections: async (stationId, connections) => {
    logger.info(`Creating bulk connections for station ${stationId}:`, connections);
    
    try {
      const response = await apiService.post(
        `/asset-connections/stations/${stationId}/connections/bulk`,
        { connections }
      );
      return handleResponse(response, 'creating bulk connections');
    } catch (error) {
      throw handleError(error, 'creating bulk connections', 'Failed to create bulk connections');
    }
  },

  // Bulk connect to a single asset
  bulkConnectToAsset: async (stationId, bulkData) => {
    logger.info(`Bulk connecting to asset for station ${stationId}:`, bulkData);
    
    try {
      const response = await apiService.post(
        `/asset-connections/stations/${stationId}/connections/bulk-to-asset`,
        bulkData
      );
      return handleResponse(response, 'bulk connecting to asset');
    } catch (error) {
      throw handleError(error, 'bulk connecting to asset', 'Failed to bulk connect to asset');
    }
  },

  // Verify connection
  verifyConnection: async (stationId, connectionData) => {
    logger.info(`Verifying connection for station ${stationId}:`, connectionData);
    
    try {
      const response = await apiService.post(
        `/asset-connections/stations/${stationId}/verify-connection`,
        connectionData
      );
      return handleResponse(response, 'verifying connection');
    } catch (error) {
      throw handleError(error, 'verifying connection', 'Failed to verify connection');
    }
  },

  // Get station connections
  getStationConnections: async (stationId, filters = {}) => {
    logger.info(`Fetching connections for station ${stationId}:`, filters);
    
    try {
      const queryParams = new URLSearchParams();
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.assetId) queryParams.append('assetId', filters.assetId);
      
      const queryString = queryParams.toString();
      const url = `/asset-connections/stations/${stationId}/connections${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching station connections');
    } catch (error) {
      throw handleError(error, 'fetching station connections', 'Failed to fetch station connections');
    }
  },

  // Delete connection
  deleteConnection: async (connectionId) => {
    logger.info(`Deleting connection: ${connectionId}`);
    
    try {
      const response = await apiService.delete(`/asset-connections/${connectionId}`);
      return handleResponse(response, 'deleting connection');
    } catch (error) {
      throw handleError(error, 'deleting connection', 'Failed to delete connection');
    }
  },

  // Helper method to get connection type description
  getConnectionTypeDescription: (type) => {
    const descriptions = {
      TANK_TO_PUMP: 'Connects a storage tank to a fuel pump',
      TANK_TO_ISLAND: 'Connects a storage tank to an island',
      PUMP_TO_ISLAND: 'Connects a fuel pump to an island'
    };
    
    return descriptions[type] || 'Unknown connection type';
  },

  // Helper to validate connection data before sending
  validateConnectionData: (connectionData) => {
    const errors = [];
    
    if (!connectionData.type) {
      errors.push('Connection type is required');
    }
    
    if (!connectionData.assetAId) {
      errors.push('Asset A ID is required');
    }
    
    if (!connectionData.assetBId) {
      errors.push('Asset B ID is required');
    }
    
    if (connectionData.assetAId === connectionData.assetBId) {
      errors.push('Cannot connect an asset to itself');
    }
    
    return errors;
  },

  // Helper to prepare bulk connection data for multiple assets to a single target
  prepareBulkConnectionData: (targetAssetId, sourceAssetIds, type) => {
    return {
      targetAssetId,
      sourceAssetIds,
      type
    };
  },

  // Helper to check if a connection is valid based on asset types
  isValidConnectionType: (assetAType, assetBType, connectionType) => {
    const validCombinations = {
      TANK_TO_PUMP: {
        assetAType: 'STORAGE_TANK',
        assetBType: 'FUEL_PUMP'
      },
      TANK_TO_ISLAND: {
        assetAType: 'STORAGE_TANK',
        assetBType: 'ISLAND'
      },
      PUMP_TO_ISLAND: {
        assetAType: 'FUEL_PUMP',
        assetBType: 'ISLAND'
      }
    };
    
    const combination = validCombinations[connectionType];
    if (!combination) return false;
    
    // Check if the asset types match the expected combination
    // For TANK_TO_PUMP, order matters
    if (connectionType === 'TANK_TO_PUMP') {
      return assetAType === combination.assetAType && assetBType === combination.assetBType;
    }
    
    // For ISLAND connections, either order is acceptable
    return (
      (assetAType === combination.assetAType && assetBType === combination.assetBType) ||
      (assetAType === combination.assetBType && assetBType === combination.assetAType)
    );
  }
};