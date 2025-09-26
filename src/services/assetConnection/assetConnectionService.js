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
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

export const assetConnectionService = {
  // =====================
  // CONNECTION RULES & META
  // =====================
  
  // Get connection rules
  getConnectionRules: async () => {
    logger.info('Fetching connection rules');
    
    try {
      const response = await apiService.get('/asset-connections/rules');
      return handleResponse(response, 'fetching connection rules');
    } catch (error) {
      throw handleError(error, 'fetching connection rules', 'Failed to fetch connection rules');
    }
  },

  // =====================
  // CONNECTION CRUD OPERATIONS
  // =====================

  // Create a connection
  createConnection: async (connectionData) => {
    logger.info('Creating connection:', connectionData);
    
    try {
      const response = await apiService.post('/asset-connections', connectionData);
      return handleResponse(response, 'creating connection');
    } catch (error) {
      throw handleError(error, 'creating connection', 'Failed to create connection');
    }
  },

  // Create bulk connections
  createBulkConnections: async (bulkData) => {
    logger.info('Creating bulk connections:', bulkData);
    
    try {
      const response = await apiService.post('/asset-connections/bulk', bulkData);
      return handleResponse(response, 'creating bulk connections');
    } catch (error) {
      throw handleError(error, 'creating bulk connections', 'Failed to create bulk connections');
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
  // QUERY ENDPOINTS
  // =====================

  // Get all connections for a station
  getConnectionsByStation: async (stationId, filters = {}) => {
    logger.info(`Fetching connections for station ${stationId}:`, filters);
    
    try {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters
      if (filters.connectionType) queryParams.append('connectionType', filters.connectionType);
      if (filters.includeUnattached) queryParams.append('includeUnattached', filters.includeUnattached);
      
      const queryString = queryParams.toString();
      const url = `/asset-connections/station/${stationId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching station connections');
    } catch (error) {
      throw handleError(error, 'fetching station connections', 'Failed to fetch station connections');
    }
  },

  // Get connections for a specific asset
  getConnectionsByAsset: async (assetId) => {
    logger.info(`Fetching connections for asset ${assetId}`);
    
    try {
      const response = await apiService.get(`/asset-connections/asset/${assetId}`);
      return handleResponse(response, 'fetching asset connections');
    } catch (error) {
      throw handleError(error, 'fetching asset connections', 'Failed to fetch asset connections');
    }
  },

  // Get station topology (complete connection map)
  getStationTopology: async (stationId) => {
    logger.info(`Fetching station topology for station ${stationId}`);
    
    try {
      const response = await apiService.get(`/asset-connections/station/${stationId}/topology`);
      return handleResponse(response, 'fetching station topology');
    } catch (error) {
      throw handleError(error, 'fetching station topology', 'Failed to fetch station topology');
    }
  },

  // Get unattached assets in station
  getUnattachedAssets: async (stationId) => {
    logger.info(`Fetching unattached assets for station ${stationId}`);
    
    try {
      const response = await apiService.get(`/asset-connections/station/${stationId}/unattached`);
      return handleResponse(response, 'fetching unattached assets');
    } catch (error) {
      throw handleError(error, 'fetching unattached assets', 'Failed to fetch unattached assets');
    }
  },

  // Get connection audit logs
  getConnectionAuditLogs: async (stationId, filters = {}) => {
    logger.info(`Fetching connection audit logs for station ${stationId}:`, filters);
    
    try {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.connectionType) queryParams.append('connectionType', filters.connectionType);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.limit) queryParams.append('limit', filters.limit);
      
      const queryString = queryParams.toString();
      const url = `/asset-connections/station/${stationId}/audit-logs${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching connection audit logs');
    } catch (error) {
      throw handleError(error, 'fetching connection audit logs', 'Failed to fetch connection audit logs');
    }
  },

  // =====================
  // HELPER METHODS & UTILITIES
  // =====================

  // Helper method to get connection type description
  getConnectionTypeDescription: (type) => {
    const descriptions = {
      TANK_TO_PUMP: 'Connects a storage tank to a fuel pump. A pump can only be connected to one tank.',
      TANK_TO_ISLAND: 'Connects a storage tank to an island. An island can have multiple tanks.',
      PUMP_TO_ISLAND: 'Connects a fuel pump to an island. An island can have multiple pumps.'
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
    
    if (!connectionData.stationId) {
      errors.push('Station ID is required');
    }
    
    if (connectionData.assetAId === connectionData.assetBId) {
      errors.push('Cannot connect an asset to itself');
    }
    
    return errors;
  },

  // Helper to prepare bulk connection data
  prepareBulkConnectionData: (connections) => {
    return {
      connections,
      action: 'CONNECT'
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
    
    return assetAType === combination.assetAType && assetBType === combination.assetBType;
  },

  // Helper to process station topology data for display
  processTopologyData: (topologyData) => {
    if (!topologyData) return null;
    
    const processed = {
      station: topologyData.station,
      connections: topologyData.connections || [],
      summary: topologyData.summary || {}
    };
    
    // Enhance summary with additional calculations
    if (processed.summary) {
      processed.summary.connectionHealth = calculateConnectionHealth(
        processed.summary.totalConnections,
        processed.summary.unattachedAssets?.length || 0
      );
    }
    
    return processed;
  },

  // Helper to process asset connections data
  processAssetConnections: (assetConnectionsData) => {
    if (!assetConnectionsData) return null;
    
    return {
      asset: assetConnectionsData.asset,
      connections: assetConnectionsData.connections || {
        tanks: [],
        pumps: [],
        islands: []
      }
    };
  },

  // Get asset connection status
  getAssetConnectionStatus: (asset, connections) => {
    if (asset.type === 'FUEL_PUMP') {
      const pumpConnections = connections?.pumps || [];
      const hasTankConnection = pumpConnections.some(conn => 
        conn.type === 'TANK_TO_PUMP' && 
        (conn.assetA.id === asset.id || conn.assetB.id === asset.id)
      );
      const hasIslandConnection = pumpConnections.some(conn => 
        conn.type === 'PUMP_TO_ISLAND' && 
        (conn.assetA.id === asset.id || conn.assetB.id === asset.id)
      );
      
      if (hasTankConnection && hasIslandConnection) {
        return { status: 'fully-attached', label: 'Fully Attached', color: 'success' };
      } else if (hasTankConnection || hasIslandConnection) {
        return { status: 'partial', label: 'Partially Attached', color: 'warning' };
      } else {
        return { status: 'unattached', label: 'Unattached', color: 'error' };
      }
    } else if (asset.type === 'STORAGE_TANK') {
      const tankConnections = connections?.tanks || [];
      const hasIslandConnection = tankConnections.some(conn => 
        conn.type === 'TANK_TO_ISLAND' && 
        (conn.assetA.id === asset.id || conn.assetB.id === asset.id)
      );
      
      if (hasIslandConnection) {
        return { status: 'attached', label: 'Attached to Island', color: 'success' };
      } else {
        return { status: 'unattached', label: 'Not Attached', color: 'warning' };
      }
    }
    
    return { status: 'unknown', label: 'Unknown', color: 'default' };
  },

  // Helper to find connections between specific assets
  findConnectionBetweenAssets: (connections, assetAId, assetBId, type = null) => {
    const allConnections = [
      ...(connections.tanks || []),
      ...(connections.pumps || []),
      ...(connections.islands || [])
    ];
    
    return allConnections.find(connection => {
      const matchesAssets = 
        (connection.assetA.id === assetAId && connection.assetB.id === assetBId) ||
        (connection.assetA.id === assetBId && connection.assetB.id === assetAId);
      
      if (type) {
        return matchesAssets && connection.type === type;
      }
      return matchesAssets;
    });
  },

  // Helper to get connection statistics
  getConnectionStats: (topologyData) => {
    if (!topologyData) return null;
    
    const { summary, connections } = topologyData;
    const totalConnections = connections.length;
    
    const connectionTypes = {
      TANK_TO_PUMP: connections.filter(conn => conn.type === 'TANK_TO_PUMP').length,
      TANK_TO_ISLAND: connections.filter(conn => conn.type === 'TANK_TO_ISLAND').length,
      PUMP_TO_ISLAND: connections.filter(conn => conn.type === 'PUMP_TO_ISLAND').length
    };
    
    return {
      totalConnections,
      connectionTypes,
      unattachedAssets: summary.unattachedAssets?.length || 0,
      healthScore: calculateConnectionHealth(totalConnections, summary.unattachedAssets?.length || 0)
    };
  },

  // Helper to filter connections by type
  filterConnectionsByType: (connections, type) => {
    const allConnections = [
      ...(connections.tanks || []),
      ...(connections.pumps || []),
      ...(connections.islands || [])
    ];
    
    return allConnections.filter(connection => connection.type === type);
  },

  // Helper to get assets of specific type from topology
  getAssetsByType: (topologyData, assetType) => {
    if (!topologyData) return [];
    
    const assets = [];
    
    // Get connected assets from connections
    topologyData.connections.forEach(connection => {
      if (connection.assetA.type === assetType) {
        assets.push(connection.assetA);
      }
      if (connection.assetB.type === assetType) {
        assets.push(connection.assetB);
      }
    });
    
    // Get unattached assets
    if (topologyData.summary.unattachedAssets) {
      topologyData.summary.unattachedAssets.forEach(asset => {
        if (asset.type === assetType) {
          assets.push(asset);
        }
      });
    }
    
    // Remove duplicates by id
    return assets.filter((asset, index, self) => 
      index === self.findIndex(a => a.id === asset.id)
    );
  }
};

// Helper function to calculate connection health score
const calculateConnectionHealth = (totalConnections, unattachedAssetsCount) => {
  if (totalConnections === 0 && unattachedAssetsCount === 0) return 100;
  if (totalConnections === 0) return 0;
  
  const maxPossibleConnections = totalConnections + unattachedAssetsCount;
  const healthPercentage = (totalConnections / maxPossibleConnections) * 100;
  
  return Math.round(healthPercentage);
};

export default assetConnectionService;