// services/assetConnectionService.js
import { apiService } from '../apiService';

// Enhanced logging utility
const logger = {
  debug: (...args) => console.log('🔍 [AssetConnectionService]', ...args),
  info: (...args) => console.log('ℹ️ [AssetConnectionService]', ...args),
  warn: (...args) => console.warn('⚠️ [AssetConnectionService]', ...args),
  error: (...args) => console.error('❌ [AssetConnectionService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  logger.debug(`${operation} response:`, response.data);
  
  // Check if response.data exists and has success flag
  if (response.data && response.data.success !== undefined) {
    if (response.data.success) {
      logger.debug(`${operation} successful`);
      return response.data.data || response.data; // Return data or entire response if no data field
    } else {
      throw new Error(response.data.message || `Operation ${operation} failed`);
    }
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  return response.data || response;
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
    
    // Handle connection-specific error types
    if (data && data.errorType) {
      throw new Error(`${data.message} (Error: ${data.errorType})`);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

export const assetConnectionService = {
  // =====================
  // CONNECTION TYPES & META
  // =====================
  
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

  // =====================
  // CONNECTION CRUD OPERATIONS
  // =====================

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

  // =====================
  // QUERY & FILTER OPERATIONS
  // =====================

  // Get station connections with advanced filtering
  getStationConnections: async (stationId, filters = {}) => {
    logger.info(`Fetching connections for station ${stationId}:`, filters);
    
    try {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.assetId) queryParams.append('assetId', filters.assetId);
      if (filters.include) {
        filters.include.forEach(include => queryParams.append('include[]', include));
      }
      
      const queryString = queryParams.toString();
      const url = `/asset-connections/stations/${stationId}/connections${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching station connections');
    } catch (error) {
      throw handleError(error, 'fetching station connections', 'Failed to fetch station connections');
    }
  },

  // Get specific connection types
  getConnectionsByType: async (stationId, connectionType) => {
    return assetConnectionService.getStationConnections(stationId, { type: connectionType });
  },

  // Get connections for a specific asset
  getAssetConnections: async (stationId, assetId, includeRelationships = []) => {
    return assetConnectionService.getStationConnections(stationId, { 
      assetId, 
      include: includeRelationships 
    });
  },

  // =====================
  // ASSET ASSIGNMENTS & HEALTH
  // =====================

  // Get station asset assignments (attached and unassigned)
  getStationAssetAssignments: async (stationId) => {
    logger.info(`Fetching asset assignments for station ${stationId}`);
    
    try {
      const response = await apiService.get(
        `/asset-connections/stations/${stationId}/assignments`
      );
      return handleResponse(response, 'fetching asset assignments');
    } catch (error) {
      throw handleError(error, 'fetching asset assignments', 'Failed to fetch asset assignments');
    }
  },

  // Get connection health for station
  getConnectionsHealth: async (stationId) => {
    logger.info(`Fetching connection health for station ${stationId}`);
    
    try {
      const response = await apiService.get(
        `/asset-connections/stations/${stationId}/connections/health`
      );
      return handleResponse(response, 'fetching connection health');
    } catch (error) {
      throw handleError(error, 'fetching connection health', 'Failed to fetch connection health');
    }
  },

  // =====================
  // DETACHMENT OPERATIONS
  // =====================

  // Detach specific connection type from asset(s)
  detachAssets: async (stationId, detachmentData) => {
    logger.info(`Detaching assets for station ${stationId}:`, detachmentData);
    
    try {
      const response = await apiService.post(
        `/asset-connections/stations/${stationId}/detach`,
        detachmentData
      );
      return handleResponse(response, 'detaching assets');
    } catch (error) {
      throw handleError(error, 'detaching assets', 'Failed to detach assets');
    }
  },

  // Detach all connections from an asset
  detachAllConnections: async (stationId, assetId) => {
    logger.info(`Detaching all connections from asset ${assetId} in station ${stationId}`);
    
    try {
      const response = await apiService.delete(
        `/asset-connections/stations/${stationId}/assets/${assetId}/connections`
      );
      return handleResponse(response, 'detaching all connections from asset');
    } catch (error) {
      throw handleError(error, 'detaching all connections from asset', 'Failed to detach all connections');
    }
  },

  // =====================
  // VERIFICATION OPERATIONS
  // =====================

  // Verify connection feasibility
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

  // =====================
  // HELPER METHODS & UTILITIES
  // =====================

  // Helper method to get connection type description
  getConnectionTypeDescription: (type) => {
    const descriptions = {
      TANK_TO_PUMP: 'Connects a storage tank to a fuel pump. A pump can only be connected to one tank.',
      TANK_TO_ISLAND: 'Connects a storage tank to an island. A tank can only be connected to one island.',
      PUMP_TO_ISLAND: 'Connects a fuel pump to an island. A pump can only be connected to one island.'
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

  // Helper to prepare detachment data
  prepareDetachmentData: (assetIds, type = null, disconnectAll = false) => {
    return {
      assetIds,
      type,
      disconnectAll
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
  },

  // =====================
  // ASSET STATUS & FILTERING UTILITIES
  // =====================

  // Filter assignments by asset type and connection status
  filterAssignments: (assignments, filters = {}) => {
    let filtered = { ...assignments };
    
    // Filter by asset type
    if (filters.assetType) {
      if (filters.assetType === 'pumps') {
        filtered.tanks = [];
        filtered.islands = [];
      } else if (filters.assetType === 'tanks') {
        filtered.pumps = [];
        filtered.islands = [];
      } else if (filters.assetType === 'islands') {
        filtered.tanks = [];
        filtered.pumps = [];
      }
    }
    
    // Filter by connection status
    if (filters.connectionStatus) {
      if (filters.connectionStatus === 'unattached') {
        filtered.pumps = filtered.pumps.filter(pump => 
          !pump.tank && !pump.island
        );
        filtered.tanks = filtered.tanks.filter(tank => 
          !tank.island
        );
      } else if (filters.connectionStatus === 'partial') {
        filtered.pumps = filtered.pumps.filter(pump => 
          (pump.tank && !pump.island) || (!pump.tank && pump.island)
        );
      } else if (filters.connectionStatus === 'fully-attached') {
        filtered.pumps = filtered.pumps.filter(pump => 
          pump.tank && pump.island
        );
        filtered.tanks = filtered.tanks.filter(tank => 
          tank.island
        );
      }
    }
    
    return filtered;
  },

  // Get connection statistics
  getConnectionStats: (assignments) => {
    const totalPumps = assignments.pumps.length + assignments.unassigned.pumps.length;
    const totalTanks = assignments.tanks.length + assignments.unassigned.tanks.length;
    const totalIslands = assignments.islands.length;
    
    const unattachedPumps = assignments.unassigned.pumps.length;
    const unattachedTanks = assignments.unassigned.tanks.length;
    
    const partiallyAttachedPumps = assignments.pumps.filter(pump => 
      (pump.tank && !pump.island) || (!pump.tank && pump.island)
    ).length;
    
    const fullyAttachedPumps = assignments.pumps.filter(pump => 
      pump.tank && pump.island
    ).length;
    
    return {
      totalPumps,
      totalTanks,
      totalIslands,
      unattachedPumps,
      unattachedTanks,
      partiallyAttachedPumps,
      fullyAttachedPumps,
      healthScore: calculateHealthScore(totalPumps, unattachedPumps, partiallyAttachedPumps)
    };
  },

  // Get asset connection status
  getAssetConnectionStatus: (asset) => {
    if (asset.type === 'FUEL_PUMP') {
      if (asset.pump?.tank && asset.pump?.island) {
        return { status: 'fully-attached', label: 'Fully Attached', color: 'success' };
      } else if (asset.pump?.tank || asset.pump?.island) {
        return { status: 'partial', label: 'Partially Attached', color: 'warning' };
      } else {
        return { status: 'unattached', label: 'Unattached', color: 'error' };
      }
    } else if (asset.type === 'STORAGE_TANK') {
      if (asset.tank?.islands?.length > 0) {
        return { status: 'attached', label: 'Attached to Island', color: 'success' };
      } else {
        return { status: 'unattached', label: 'Not Attached', color: 'warning' };
      }
    }
    
    return { status: 'unknown', label: 'Unknown', color: 'default' };
  }
};

// Helper function to calculate health score
const calculateHealthScore = (totalPumps, unattachedPumps, partiallyAttachedPumps) => {
  if (totalPumps === 0) return 100;
  
  const unattachedScore = (unattachedPumps / totalPumps) * 50;
  const partialScore = (partiallyAttachedPumps / totalPumps) * 25;
  const problemScore = unattachedScore + partialScore;
  
  return Math.max(0, 100 - problemScore);
};

export default assetConnectionService;