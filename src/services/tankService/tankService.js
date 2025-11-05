import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [TankService]', ...args),
  info: (...args) => console.log('ℹ️ [TankService]', ...args),
  warn: (...args) => console.warn('⚠️ [TankService]', ...args),
  error: (...args) => console.error('❌ [TankService]', ...args)
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

export const tankService = {
  // =====================
  // BASIC TANK METHODS
  // =====================
  
  getAllTanks: async (filters = {}) => {
    logger.info('Fetching tanks with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = params.toString() ? `/tank-connections?${params.toString()}` : '/tank-connections';
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching tanks');
    } catch (error) {
      throw handleError(error, 'fetching tanks', 'Failed to fetch tanks');
    }
  },

  getTankById: async (tankId) => {
    logger.info(`Fetching tank: ${tankId}`);
    
    try {
      const response = await apiService.get(`/tank-connections/${tankId}`);
      return handleResponse(response, 'fetching tank');
    } catch (error) {
      throw handleError(error, 'fetching tank', 'Failed to fetch tank');
    }
  },

  updateTankProduct: async (tankId, productData) => {
    logger.info(`Updating tank product for ${tankId}:`, productData);
    
    try {
      const response = await apiService.patch(`/tank-connections/${tankId}/product`, productData);
      return handleResponse(response, 'updating tank product');
    } catch (error) {
      throw handleError(error, 'updating tank product', 'Failed to update tank product');
    }
  },

  getUnassignedTanks: async (stationId = null) => {
    logger.info('Fetching unassigned tanks', stationId ? `for station: ${stationId}` : '');
    
    try {
      const url = stationId ? `/tank-connections/unassigned?stationId=${stationId}` : '/tank-connections/unassigned';
      const response = await apiService.get(url);
      return handleResponse(response, 'fetching unassigned tanks');
    } catch (error) {
      throw handleError(error, 'fetching unassigned tanks', 'Failed to fetch unassigned tanks');
    }
  },

  // =====================
  // TANK-PRODUCT MANAGEMENT
  // =====================

  assignProductToTank: async (tankId, productId) => {
    logger.info(`Assigning product ${productId} to tank ${tankId}`);
    
    try {
      const response = await apiService.patch(`/tank-connections/${tankId}/product`, {
        productId: productId
      });
      return handleResponse(response, 'assigning product to tank');
    } catch (error) {
      throw handleError(error, 'assigning product to tank', 'Failed to assign product to tank');
    }
  },

  unassignProductFromTank: async (tankId) => {
    logger.info(`Unassigning product from tank ${tankId}`);
    
    try {
      const response = await apiService.patch(`/tank-connections/${tankId}/product`, {
        productId: null
      });
      return handleResponse(response, 'unassigning product from tank');
    } catch (error) {
      throw handleError(error, 'unassigning product from tank', 'Failed to unassign product from tank');
    }
  },

  reassignProductToTank: async (tankId, newProductId) => {
    logger.info(`Reassigning product ${newProductId} to tank ${tankId}`);
    
    try {
      const response = await apiService.patch(`/tank-connections/${tankId}/product`, {
        productId: newProductId
      });
      return handleResponse(response, 'reassigning product to tank');
    } catch (error) {
      throw handleError(error, 'reassigning product to tank', 'Failed to reassign product to tank');
    }
  },

  // =====================
  // BATCH OPERATIONS
  // =====================

  bulkAssignProducts: async (assignments) => {
    logger.info('Bulk assigning products to tanks:', assignments);
    
    try {
      const results = [];
      
      for (const assignment of assignments) {
        try {
          const result = await this.assignProductToTank(assignment.tankId, assignment.productId);
          results.push({ success: true, data: result, assignment });
        } catch (error) {
          results.push({ 
            success: false, 
            error: error.message,
            assignment 
          });
        }
      }
      
      logger.info('Bulk assignment completed', {
        total: assignments.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
      
      return this.processBulkResults(results);
    } catch (error) {
      throw handleError(error, 'bulk assigning products', 'Failed to process bulk assignments');
    }
  },

  // =====================
  // VALIDATION UTILITIES
  // =====================

  validateTankProductAssignment: (tankId, productId) => {
    const errors = [];

    if (!tankId) {
      errors.push('Tank selection is required');
    }

    if (!productId) {
      errors.push('Product selection is required');
    }

    // Validate UUID format if needed
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (tankId && !uuidRegex.test(tankId)) {
      errors.push('Invalid tank ID format');
    }

    if (productId && !uuidRegex.test(productId)) {
      errors.push('Invalid product ID format');
    }

    return errors;
  },

  validateBulkAssignments: (assignments) => {
    const errors = [];
    
    if (!Array.isArray(assignments) || assignments.length === 0) {
      errors.push('At least one assignment is required for bulk operations');
    }

    if (assignments.length > 50) {
      errors.push('Cannot process more than 50 assignments at once');
    }

    assignments.forEach((assignment, index) => {
      const assignmentErrors = this.validateTankProductAssignment(assignment.tankId, assignment.productId);
      if (assignmentErrors.length > 0) {
        errors.push(`Assignment ${index + 1}: ${assignmentErrors.join(', ')}`);
      }
    });

    return errors;
  },

  // =====================
  // DATA TRANSFORMATION UTILITIES
  // =====================

  formatTankForDisplay: (tank) => {
    if (!tank) return null;
    
    const utilization = tank.capacity ? 
      ((tank.currentVolume || 0) / tank.capacity * 100).toFixed(1) : 0;
    
    return {
      ...tank,
      displayName: tank.asset?.name || 'Unknown Tank',
      stationInfo: tank.asset?.station?.name || 'Unknown Station',
      productInfo: tank.product ? 
        `${tank.product.name} (${tank.product.fuelCode || 'No Code'})` : 
        'No Product Assigned',
      fuelSubTypeInfo: tank.fuelSubType ? 
        `${tank.fuelSubType.name} (${tank.fuelSubType.category?.name || 'No Category'})` : 
        'No Fuel Type',
      utilization: `${utilization}%`,
      capacityDisplay: `${(tank.currentVolume || 0).toLocaleString()} / ${tank.capacity.toLocaleString()} L`,
      status: tank.productId ? 'Assigned' : 'Unassigned',
      statusColor: tank.productId ? 'success' : 'warning',
      lastUpdated: tank.updatedAt ? new Date(tank.updatedAt).toLocaleDateString() : 'Unknown'
    };
  },

  formatTankList: (tanks) => {
    if (!Array.isArray(tanks)) return [];
    
    return tanks.map(tank => this.formatTankForDisplay(tank));
  },

  formatUnassignedTank: (tank) => {
    if (!tank) return null;
    
    return {
      ...tank,
      displayName: tank.asset?.name || 'Unknown Tank',
      stationInfo: tank.asset?.station?.name || 'Unknown Station',
      capacityDisplay: `${tank.capacity.toLocaleString()} L`,
      availableCapacity: tank.capacity - (tank.currentVolume || 0),
      isAvailable: true
    };
  },

  // =====================
  // FILTER UTILITIES
  // =====================

  buildTankFilters: (filters) => {
    const cleanFilters = {};
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        cleanFilters[key] = filters[key];
      }
    });

    return cleanFilters;
  },

  filterTanksByStatus: (tanks, status) => {
    if (!Array.isArray(tanks)) return [];
    
    switch (status) {
      case 'assigned':
        return tanks.filter(tank => tank.productId);
      case 'unassigned':
        return tanks.filter(tank => !tank.productId);
      case 'low-stock':
        return tanks.filter(tank => {
          const utilization = tank.capacity ? (tank.currentVolume || 0) / tank.capacity : 0;
          return utilization < 0.2; // Less than 20% full
        });
      case 'high-stock':
        return tanks.filter(tank => {
          const utilization = tank.capacity ? (tank.currentVolume || 0) / tank.capacity : 0;
          return utilization > 0.8; // More than 80% full
        });
      default:
        return tanks;
    }
  },

  filterTanksByStation: (tanks, stationId) => {
    if (!Array.isArray(tanks)) return [];
    if (!stationId) return tanks;
    
    return tanks.filter(tank => tank.asset?.stationId === stationId);
  },

  filterTanksByProduct: (tanks, productId) => {
    if (!Array.isArray(tanks)) return [];
    if (!productId) return tanks;
    
    return tanks.filter(tank => tank.productId === productId);
  },

  // =====================
  // SEARCH UTILITIES
  // =====================

  searchTanks: (tanks, searchTerm) => {
    if (!Array.isArray(tanks)) return [];
    if (!searchTerm) return tanks;
    
    const term = searchTerm.toLowerCase();
    
    return tanks.filter(tank => 
      tank.asset?.name?.toLowerCase().includes(term) ||
      tank.product?.name?.toLowerCase().includes(term) ||
      tank.product?.fuelCode?.toLowerCase().includes(term) ||
      tank.asset?.station?.name?.toLowerCase().includes(term) ||
      tank.fuelSubType?.name?.toLowerCase().includes(term)
    );
  },

  // =====================
  // SORTING UTILITIES
  // =====================

  sortTanks: (tanks, sortBy, sortOrder = 'asc') => {
    if (!Array.isArray(tanks)) return [];
    
    return [...tanks].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.asset?.name || '';
          bValue = b.asset?.name || '';
          break;
        case 'station':
          aValue = a.asset?.station?.name || '';
          bValue = b.asset?.station?.name || '';
          break;
        case 'product':
          aValue = a.product?.name || '';
          bValue = b.product?.name || '';
          break;
        case 'capacity':
          aValue = a.capacity || 0;
          bValue = b.capacity || 0;
          break;
        case 'currentVolume':
          aValue = a.currentVolume || 0;
          bValue = b.currentVolume || 0;
          break;
        case 'status':
          aValue = a.productId ? 'assigned' : 'unassigned';
          bValue = b.productId ? 'assigned' : 'unassigned';
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt || 0);
          bValue = new Date(b.updatedAt || 0);
          break;
        default:
          aValue = a.asset?.name || '';
          bValue = b.asset?.name || '';
      }
      
      if (sortOrder === 'desc') {
        [aValue, bValue] = [bValue, aValue];
      }
      
      if (typeof aValue === 'string') {
        return aValue.localeCompare(bValue);
      }
      
      return aValue - bValue;
    });
  },

  // =====================
  // DATA MAPPING UTILITIES
  // =====================

  mapTankToForm: (tank) => {
    if (!tank) return null;
    
    return {
      id: tank.id,
      assetId: tank.assetId,
      productId: tank.productId,
      fuelSubTypeId: tank.fuelSubTypeId,
      stationId: tank.asset?.stationId,
      capacity: tank.capacity,
      currentVolume: tank.currentVolume,
      // Add any other fields you might have in your form
    };
  },

  mapFormToTankProductUpdate: (formData) => {
    return {
      productId: formData.productId,
      fuelSubTypeId: formData.fuelSubTypeId
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
          assignment: f.assignment,
          error: f.error
        }))
      }
    };
  },

  // =====================
  // STATISTICS AND ANALYTICS
  // =====================

  calculateTankStatistics: (tanks) => {
    if (!Array.isArray(tanks)) return null;
    
    const assignedTanks = tanks.filter(tank => tank.productId);
    const unassignedTanks = tanks.filter(tank => !tank.productId);
    
    const totalCapacity = tanks.reduce((sum, tank) => sum + (tank.capacity || 0), 0);
    const totalVolume = tanks.reduce((sum, tank) => sum + (tank.currentVolume || 0), 0);
    const averageUtilization = totalCapacity > 0 ? (totalVolume / totalCapacity * 100) : 0;
    
    return {
      totalTanks: tanks.length,
      assignedTanks: assignedTanks.length,
      unassignedTanks: unassignedTanks.length,
      assignmentRate: tanks.length > 0 ? (assignedTanks.length / tanks.length * 100).toFixed(1) + '%' : '0%',
      totalCapacity: totalCapacity.toLocaleString() + ' L',
      totalVolume: totalVolume.toLocaleString() + ' L',
      averageUtilization: averageUtilization.toFixed(1) + '%',
      availableCapacity: (totalCapacity - totalVolume).toLocaleString() + ' L'
    };
  },

  getTanksByStation: (tanks) => {
    if (!Array.isArray(tanks)) return {};
    
    return tanks.reduce((acc, tank) => {
      const stationName = tank.asset?.station?.name || 'Unknown Station';
      if (!acc[stationName]) {
        acc[stationName] = [];
      }
      acc[stationName].push(tank);
      return acc;
    }, {});
  },

  getTanksByProduct: (tanks) => {
    if (!Array.isArray(tanks)) return {};
    
    return tanks.reduce((acc, tank) => {
      if (tank.product) {
        const productName = tank.product.name || 'Unknown Product';
        if (!acc[productName]) {
          acc[productName] = [];
        }
        acc[productName].push(tank);
      }
      return acc;
    }, {});
  },

  // =====================
  // EXPORT/IMPORT UTILITIES
  // =====================

  exportTanksToCSV: (tanks) => {
    if (!tanks || !tanks.length) return '';
    
    const headers = ['Tank Name', 'Station', 'Product', 'Fuel Type', 'Capacity (L)', 'Current Volume (L)', 'Utilization', 'Status'];
    const rows = tanks.map(tank => {
      const utilization = tank.capacity ? 
        ((tank.currentVolume || 0) / tank.capacity * 100).toFixed(1) + '%' : '0%';
      
      return [
        tank.asset?.name || 'N/A',
        tank.asset?.station?.name || 'N/A',
        tank.product?.name || 'Unassigned',
        tank.fuelSubType?.name || 'N/A',
        tank.capacity || '0',
        tank.currentVolume || '0',
        utilization,
        tank.productId ? 'Assigned' : 'Unassigned'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  },

  downloadTanksCSV: (tanks, filename = 'tanks.csv') => {
    const csvContent = this.exportTanksToCSV(tanks);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  // =====================
  // CACHE AND STATE MANAGEMENT HELPERS
  // =====================

  generateTankKey: (tank) => {
    return `${tank.id}-${tank.productId || 'unassigned'}`;
  },

  findTankById: (tanks, tankId) => {
    return tanks.find(tank => tank.id === tankId);
  },

  findTanksByProduct: (tanks, productId) => {
    return tanks.filter(tank => tank.productId === productId);
  },

  findTanksByStation: (tanks, stationId) => {
    return tanks.filter(tank => tank.asset?.stationId === stationId);
  }
};

// Default export for convenience
export default tankService;