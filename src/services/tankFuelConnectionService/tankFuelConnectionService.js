// services/tankFuelConnectionService.js
import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [TankFuelConnectionService]', ...args),
  info: (...args) => console.log('ℹ️ [TankFuelConnectionService]', ...args),
  warn: (...args) => console.warn('⚠️ [TankFuelConnectionService]', ...args),
  error: (...args) => console.error('❌ [TankFuelConnectionService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
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

export const tankFuelConnectionService = {
  // =====================
  // BASIC CRUD METHODS
  // =====================
  
  createTankFuelConnection: async (connectionData) => {
    logger.info('Creating tank fuel connection:', connectionData);
    
    try {
      const response = await apiService.post('/api/tank-fuel-connections', connectionData);
      return handleResponse(response, 'creating tank fuel connection');
    } catch (error) {
      throw handleError(error, 'creating tank fuel connection', 'Failed to create tank fuel connection');
    }
  },

  updateTankFuelConnection: async (connectionData) => {
    logger.info('Updating tank fuel connection:', connectionData);
    
    try {
      const response = await apiService.put(`/api/tank-fuel-connections/${connectionData.id}`, connectionData);
      return handleResponse(response, 'updating tank fuel connection');
    } catch (error) {
      throw handleError(error, 'updating tank fuel connection', 'Failed to update tank fuel connection');
    }
  },

  deleteTankFuelConnection: async (connectionId) => {
    logger.info(`Deleting tank fuel connection: ${connectionId}`);
    
    try {
      const response = await apiService.delete(`/api/tank-fuel-connections/${connectionId}`);
      return handleResponse(response, 'deleting tank fuel connection');
    } catch (error) {
      throw handleError(error, 'deleting tank fuel connection', 'Failed to delete tank fuel connection');
    }
  },

  getTankFuelConnections: async (filters = {}) => {
    logger.info('Fetching tank fuel connections with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/api/tank-fuel-connections?${params.toString()}` : '/api/tank-fuel-connections';
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching tank fuel connections');
    } catch (error) {
      throw handleError(error, 'fetching tank fuel connections', 'Failed to fetch tank fuel connections');
    }
  },

  getTankFuelConnectionById: async (connectionId) => {
    logger.info(`Fetching tank fuel connection: ${connectionId}`);
    
    try {
      const response = await apiService.get(`/api/tank-fuel-connections/${connectionId}`);
      return handleResponse(response, 'fetching tank fuel connection');
    } catch (error) {
      throw handleError(error, 'fetching tank fuel connection', 'Failed to fetch tank fuel connection');
    }
  },

  // =====================
  // BULK OPERATIONS
  // =====================

  bulkCreateTankFuelConnections: async (connectionsData) => {
    logger.info('Creating bulk tank fuel connections:', connectionsData);
    
    try {
      const response = await apiService.post('/api/tank-fuel-connections/bulk', connectionsData);
      return handleResponse(response, 'creating bulk tank fuel connections');
    } catch (error) {
      throw handleError(error, 'creating bulk tank fuel connections', 'Failed to create bulk tank fuel connections');
    }
  },

  // =====================
  // SPECIALIZED QUERIES
  // =====================

  getTanksByProduct: async (filters = {}) => {
    logger.info('Fetching tanks by product with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/api/tank-fuel-connections/tanks-by-product?${params.toString()}` : '/api/tank-fuel-connections/tanks-by-product';
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching tanks by product');
    } catch (error) {
      throw handleError(error, 'fetching tanks by product', 'Failed to fetch tanks by product');
    }
  },

  getAssetsByTank: async (filters = {}) => {
    logger.info('Fetching assets by tank with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/api/tank-fuel-connections/assets-by-tank?${params.toString()}` : '/api/tank-fuel-connections/assets-by-tank';
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching assets by tank');
    } catch (error) {
      throw handleError(error, 'fetching assets by tank', 'Failed to fetch assets by tank');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validateTankFuelConnection: (connectionData) => {
    const errors = [];

    if (!connectionData.assetId) {
      errors.push('Asset selection is required');
    }

    if (!connectionData.tankId) {
      errors.push('Tank selection is required');
    }

    if (!connectionData.productId) {
      errors.push('Product selection is required');
    }

    if (!connectionData.stationId) {
      errors.push('Station selection is required');
    }

    return errors;
  },

  validateBulkConnections: (connectionsData) => {
    const errors = [];
    
    if (!Array.isArray(connectionsData) || connectionsData.length === 0) {
      errors.push('At least one connection is required for bulk operations');
    }

    if (connectionsData.length > 50) {
      errors.push('Cannot process more than 50 connections at once');
    }

    connectionsData.forEach((connection, index) => {
      const connectionErrors = this.validateTankFuelConnection(connection);
      if (connectionErrors.length > 0) {
        errors.push(`Connection ${index + 1}: ${connectionErrors.join(', ')}`);
      }
    });

    return errors;
  },

  // =====================
  // DATA TRANSFORMATION UTILITIES
  // =====================

  formatConnectionForDisplay: (connection) => {
    if (!connection) return null;
    
    return {
      ...connection,
      displayName: `${connection.asset?.name || 'Unknown Asset'} → ${connection.tank?.asset?.name || 'Unknown Tank'}`,
      productInfo: connection.product ? `${connection.product.name} (${connection.product.fuelCode})` : 'Unknown Product',
      stationInfo: connection.station?.name || 'Unknown Station',
      createdAtDisplay: connection.createdAt ? new Date(connection.createdAt).toLocaleDateString() : 'Unknown',
      status: 'Active' // You can add status logic based on your business rules
    };
  },

  formatTankWithConnections: (tankData) => {
    if (!tankData) return null;
    
    const primaryConnection = tankData.connections?.find(conn => 
      conn.attachmentType === 'PRIMARY' // Adjust based on your actual field
    );
    
    return {
      ...tankData,
      tank: tankData.tank,
      primaryProduct: primaryConnection?.product,
      connectedProducts: tankData.products || [],
      connectionsCount: tankData.connections?.length || 0,
      currentVolume: tankData.tank?.currentVolume || 0,
      capacity: tankData.tank?.capacity || 0,
      utilization: tankData.tank?.capacity ? 
        ((tankData.tank.currentVolume || 0) / tankData.tank.capacity * 100).toFixed(1) + '%' 
        : 'Unknown'
    };
  },

  formatAssetWithConnections: (assetData) => {
    if (!assetData) return null;
    
    return {
      ...assetData,
      asset: assetData.asset,
      connectedTanks: assetData.tanks || [],
      connectedProducts: assetData.products || [],
      connectionsCount: assetData.connections?.length || 0,
      assetType: assetData.asset?.type || 'Unknown',
      stationInfo: assetData.asset?.station?.name || 'Unknown Station'
    };
  },

  // =====================
  // FILTER UTILITIES
  // =====================

  buildConnectionFilters: (filters) => {
    const cleanFilters = {};
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        cleanFilters[key] = filters[key];
      }
    });

    return cleanFilters;
  },

  // =====================
  // DATA MAPPING UTILITIES
  // =====================

  mapConnectionToForm: (connection) => {
    if (!connection) return null;
    
    return {
      id: connection.id,
      assetId: connection.assetId,
      tankId: connection.tankId,
      productId: connection.productId,
      stationId: connection.stationId,
      // Add any other fields you might have in your form
    };
  },

  mapFormToConnection: (formData) => {
    return {
      assetId: formData.assetId,
      tankId: formData.tankId,
      productId: formData.productId,
      stationId: formData.stationId,
      // Include any additional fields that might be needed
    };
  },

  // =====================
  // BATCH OPERATION UTILITIES
  // =====================

  processBulkResults: (results) => {
    const successful = results.filter(result => result.success);
    const failed = results.filter(result => !result.success);
    
    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: results.length > 0 ? (successful.length / results.length * 100).toFixed(1) + '%' : '0%',
      details: {
        successful: successful.map(s => s.data),
        failed: failed.map(f => ({
          data: f.data,
          error: f.error
        }))
      }
    };
  },

  // =====================
  // CACHE AND STATE MANAGEMENT HELPERS
  // =====================

  generateConnectionKey: (connection) => {
    return `${connection.assetId}-${connection.tankId}-${connection.productId}`;
  },

  findDuplicateConnections: (existingConnections, newConnection) => {
    const key = this.generateConnectionKey(newConnection);
    return existingConnections.filter(conn => 
      this.generateConnectionKey(conn) === key
    );
  },

  // =====================
  // EXPORT/IMPORT UTILITIES
  // =====================

  exportConnectionsToCSV: (connections) => {
    if (!connections || !connections.length) return '';
    
    const headers = ['Asset', 'Tank', 'Product', 'Station', 'Created At'];
    const rows = connections.map(conn => [
      conn.asset?.name || 'N/A',
      conn.tank?.asset?.name || 'N/A',
      conn.product?.name || 'N/A',
      conn.station?.name || 'N/A',
      conn.createdAt ? new Date(conn.createdAt).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  },

  downloadConnectionsCSV: (connections, filename = 'tank-fuel-connections.csv') => {
    const csvContent = this.exportConnectionsToCSV(connections);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
};

// Default export for convenience
export default tankFuelConnectionService;