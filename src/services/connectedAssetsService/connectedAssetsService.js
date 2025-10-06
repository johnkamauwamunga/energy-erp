// services/assetService/connectedAssetService.js
import { apiService } from '../apiService';

// Enhanced logging utility
const logger = {
  debug: (...args) => console.log('🔍 [AssetService]', ...args),
  info: (...args) => console.log('🏗️ [AssetService]', ...args),
  warn: (...args) => console.warn('⚠️ [AssetService]', ...args),
  error: (...args) => console.error('❌ [AssetService]', ...args)
};

// Request/Response debugging utilities
const debugRequest = (method, url, data) => {
  logger.debug(`➡️ ${method} ${url}`, data || '');
};

const debugResponse = (method, url, response) => {
  logger.debug(`⬅️ ${method} ${url} Response:`, response.data);
};

// Enhanced response handler utility
const handleResponse = (response, operation) => {
  // Handle nested success structure from backend
  if (response.data && response.data.success) {
    logger.debug(`${operation} successful`);
    return response.data.data; // Return the actual data payload
  }
  
  // Handle case where backend returns data directly
  if (response.data) {
    logger.debug(`${operation} successful (direct data)`);
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

// Enhanced error handler utility
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
    
    if (status === 400) {
      // Handle backend validation errors
      if (data.message) {
        throw new Error(data.message);
      }
      if (data.errors) {
        const errorMessages = Array.isArray(data.errors) 
          ? data.errors.map(err => err.message || err).join(', ')
          : JSON.stringify(data.errors);
        throw new Error(`Validation failed: ${errorMessages}`);
      }
    }
    
    // Handle backend error format
    if (data && data.message) {
      throw new Error(data.message);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

export const connectedAssetService = {
  // =====================
  // STATION ASSETS METHODS
  // =====================

  /**
   * Get complete asset structure for station including all relationships
   */
  async getStationAssets(stationId) {
    logger.info(`Fetching complete asset structure for station: ${stationId}`);
    
    try {
      debugRequest('GET', `/connected-assets/station/${stationId}`);
      const response = await apiService.get(`/connected-assets/station/${stationId}`);
      debugResponse('GET', `/connected-assets/station/${stationId}`, response);
      return handleResponse(response, 'fetching station assets');
    } catch (error) {
      throw handleError(error, 'fetching station assets', 'Failed to fetch station assets');
    }
  },

  /**
   * Get simplified asset structure (islands -> pumps -> tanks)
   */
  async getStationAssetsSimplified(stationId) {
    logger.info(`Fetching simplified asset structure for station: ${stationId}`);
    
    try {
      debugRequest('GET', `/connected-assets/station/${stationId}/simplified`);
      const response = await apiService.get(`/connected-assets/station/${stationId}/simplified`);
      debugResponse('GET', `/connected-assets/station/${stationId}/simplified`, response);
      return handleResponse(response, 'fetching simplified station assets');
    } catch (error) {
      throw handleError(error, 'fetching simplified station assets', 'Failed to fetch simplified station assets');
    }
  },

  /**
   * Get pumps connected to specific island (both direct and via connections)
   */
  async getIslandPumps(islandId) {
    logger.info(`Fetching pumps for island: ${islandId}`);
    
    try {
      debugRequest('GET', `/connected-assets/island/${islandId}/pumps`);
      const response = await apiService.get(`/connected-assets/island/${islandId}/pumps`);
      debugResponse('GET', `/connected-assets/island/${islandId}/pumps`, response);
      return handleResponse(response, 'fetching island pumps');
    } catch (error) {
      throw handleError(error, 'fetching island pumps', 'Failed to fetch island pumps');
    }
  },

  /**
   * Get tanks connected to multiple pumps (with duplicate prevention)
   */
  async getPumpTanks(pumpIds) {
    logger.info(`Fetching tanks for ${pumpIds.length} pumps`);
    
    try {
      debugRequest('POST', '/connected-assets/pumps/tanks', { pumpIds });
      const response = await apiService.post('/connected-assets/pumps/tanks', { pumpIds });
      debugResponse('POST', '/connected-assets/pumps/tanks', response);
      return handleResponse(response, 'fetching pump tanks');
    } catch (error) {
      throw handleError(error, 'fetching pump tanks', 'Failed to fetch pump tanks');
    }
  },

  /**
   * Get non-fuel products available at station
   */
  async getStationNonFuelProducts(stationId) {
    logger.info(`Fetching non-fuel products for station: ${stationId}`);
    
    try {
      debugRequest('GET', `/connected-assets/station/${stationId}/non-fuel`);
      const response = await apiService.get(`/connected-assets/station/${stationId}/non-fuel`);
      debugResponse('GET', `/connected-assets/station/${stationId}/non-fuel`, response);
      return handleResponse(response, 'fetching station non-fuel products');
    } catch (error) {
      throw handleError(error, 'fetching station non-fuel products', 'Failed to fetch non-fuel products');
    }
  },

  // =====================
  // SHIFT ASSETS STRUCTURE METHODS - NEW
  // =====================

  /**
   * Get complete shift assets structure with readings and attendants
   */
  async getShiftAssetsStructure(shiftId, options = {}) {
    logger.info(`Fetching shift assets structure for shift: ${shiftId}`, options);
    
    try {
      const { 
        includeReadings = true, 
        includeAttendants = true, 
        simplified = false 
      } = options;

      const params = new URLSearchParams({
        includeReadings: includeReadings.toString(),
        includeAttendants: includeAttendants.toString(),
        simplified: simplified.toString()
      });

      const url = `/connected-assets/shift/${shiftId}/assets-structure?${params}`;
      debugRequest('GET', url);
      
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching shift assets structure');
    } catch (error) {
      throw handleError(error, 'fetching shift assets structure', 'Failed to fetch shift assets structure');
    }
  },

  /**
   * Get shift assets structure filtered by specific island
   */
  async getShiftAssetsStructureByIsland(shiftId, islandId, options = {}) {
    logger.info(`Fetching shift assets structure for shift: ${shiftId}, island: ${islandId}`, options);
    
    try {
      const { 
        includeReadings = true, 
        includeAttendants = true 
      } = options;

      const params = new URLSearchParams({
        includeReadings: includeReadings.toString(),
        includeAttendants: includeAttendants.toString()
      });

      const url = `/connected-assets/shift/${shiftId}/island/${islandId}/assets-structure?${params}`;
      debugRequest('GET', url);
      
      const response = await apiService.get(url);
      debugResponse('GET', url, response);
      return handleResponse(response, 'fetching shift assets structure by island');
    } catch (error) {
      throw handleError(error, 'fetching shift assets structure by island', 'Failed to fetch shift assets structure by island');
    }
  },

  // =====================
  // SHIFT ASSETS UTILITIES - NEW
  // =====================

  /**
   * Transform shift assets structure for frontend consumption
   */
  transformShiftAssetsForUI(shiftAssets) {
    if (!shiftAssets) return null;

    const transformed = {
      shift: shiftAssets.shift,
      attendants: shiftAssets.attendants || [],
      islands: shiftAssets.islands || [],
      tanks: shiftAssets.tanks || [],
      summary: shiftAssets.summary || {},
      metadata: shiftAssets.metadata || {}
    };

    // Add convenience methods for common operations
    transformed.getIslandById = (islandId) => {
      return transformed.islands.find(island => island.islandId === islandId);
    };

    transformed.getPumpById = (pumpId) => {
      for (const island of transformed.islands) {
        const pump = island.pumps.find(p => p.pumpId === pumpId);
        if (pump) return pump;
      }
      return null;
    };

    transformed.getTankById = (tankId) => {
      return transformed.tanks.find(tank => tank.tankId === tankId);
    };

    transformed.getAttendantsByIsland = (islandId) => {
      return transformed.attendants.filter(attendant => attendant.islandId === islandId);
    };

    transformed.getReadingsSummary = () => {
      return transformed.summary.readingStatus || {};
    };

    transformed.hasOpeningReadings = () => {
      const readings = transformed.getReadingsSummary();
      return {
        pumps: readings.shiftCriticalReadings?.pumps?.start > 0,
        tanks: readings.shiftCriticalReadings?.tanks?.start > 0
      };
    };

    transformed.hasClosingReadings = () => {
      const readings = transformed.getReadingsSummary();
      return {
        pumps: readings.shiftCriticalReadings?.pumps?.end > 0,
        tanks: readings.shiftCriticalReadings?.tanks?.end > 0
      };
    };

    transformed.isShiftReadyForClose = () => {
      const readings = transformed.getReadingsSummary();
      const critical = readings.shiftCriticalReadings;
      if (!critical) return false;

      return (
        critical.pumps.start === critical.pumps.totalRequired / 2 &&
        critical.pumps.end === critical.pumps.totalRequired / 2 &&
        critical.tanks.start === critical.tanks.totalRequired / 2 &&
        critical.tanks.end === critical.tanks.totalRequired / 2
      );
    };

    return transformed;
  },

  /**
   * Extract readings for specific pump
   */
  extractPumpReadings(shiftAssets, pumpId) {
    const pump = shiftAssets.islands
      .flatMap(island => island.pumps)
      .find(p => p.pumpId === pumpId);

    return pump?.meterReadings || [];
  },

  /**
   * Extract readings for specific tank
   */
  extractTankReadings(shiftAssets, tankId) {
    const tank = shiftAssets.tanks.find(t => t.tankId === tankId);
    return tank?.dipReadings || [];
  },

  /**
   * Get opening readings for shift
   */
  getOpeningReadings(shiftAssets) {
    const openingReadings = {
      pumps: [],
      tanks: []
    };

    shiftAssets.islands.forEach(island => {
      island.pumps.forEach(pump => {
        const openingReading = pump.meterReadings?.find(r => r.readingType === 'START');
        if (openingReading) {
          openingReadings.pumps.push({
            ...openingReading,
            islandName: island.islandName,
            pumpName: pump.pumpName
          });
        }
      });
    });

    shiftAssets.tanks.forEach(tank => {
      const openingReading = tank.dipReadings?.find(r => r.readingType === 'START');
      if (openingReading) {
        openingReadings.tanks.push({
          ...openingReading,
          tankName: tank.tankName
        });
      }
    });

    return openingReadings;
  },

  /**
   * Get closing readings for shift
   */
  getClosingReadings(shiftAssets) {
    const closingReadings = {
      pumps: [],
      tanks: []
    };

    shiftAssets.islands.forEach(island => {
      island.pumps.forEach(pump => {
        const closingReading = pump.meterReadings?.find(r => r.readingType === 'END');
        if (closingReading) {
          closingReadings.pumps.push({
            ...closingReading,
            islandName: island.islandName,
            pumpName: pump.pumpName
          });
        }
      });
    });

    shiftAssets.tanks.forEach(tank => {
      const closingReading = tank.dipReadings?.find(r => r.readingType === 'END');
      if (closingReading) {
        closingReadings.tanks.push({
          ...closingReading,
          tankName: tank.tankName
        });
      }
    });

    return closingReadings;
  },

  /**
   * Calculate shift totals from readings
   */
  calculateShiftTotals(shiftAssets) {
    const openingReadings = this.getOpeningReadings(shiftAssets);
    const closingReadings = this.getClosingReadings(shiftAssets);

    let totalSales = 0;
    let totalLiters = 0;
    let totalCash = 0;

    // Calculate pump totals
    shiftAssets.islands.forEach(island => {
      island.pumps.forEach(pump => {
        const opening = pump.meterReadings?.find(r => r.readingType === 'START');
        const closing = pump.meterReadings?.find(r => r.readingType === 'END');

        if (opening && closing) {
          const sales = (closing.salesValue || 0) - (opening.salesValue || 0);
          const liters = (closing.litersDispensed || 0) - (opening.litersDispensed || 0);
          const cash = (closing.cashMeter || 0) - (opening.cashMeter || 0);

          totalSales += sales;
          totalLiters += liters;
          totalCash += cash;
        }
      });
    });

    // Calculate tank usage
    let totalTankUsage = 0;
    shiftAssets.tanks.forEach(tank => {
      const opening = tank.dipReadings?.find(r => r.readingType === 'START');
      const closing = tank.dipReadings?.find(r => r.readingType === 'END');

      if (opening && closing) {
        const usage = (opening.volume || 0) - (closing.volume || 0);
        totalTankUsage += usage;
      }
    });

    return {
      sales: {
        total: totalSales,
        cash: totalCash,
        electronic: totalSales - totalCash
      },
      volume: {
        dispensed: totalLiters,
        tankUsage: totalTankUsage,
        variance: totalLiters - totalTankUsage
      },
      efficiency: {
        salesPerLiter: totalLiters > 0 ? totalSales / totalLiters : 0,
        cashPercentage: totalSales > 0 ? (totalCash / totalSales) * 100 : 0
      }
    };
  },

  // =====================
  // ASSET DISCOVERY & CHAIN BUILDING
  // =====================

  /**
   * Build complete asset chain for multiple islands
   */
  async getCompleteAssetChain(islandIds) {
    logger.info(`Building complete asset chain for ${islandIds.length} islands`);
    
    try {
      // Step 1: Get pumps for all islands
      const pumpsResults = await Promise.all(
        islandIds.map(async (islandId) => {
          const result = await this.getIslandPumps(islandId);
          return {
            island: result.island,
            pumps: result.pumps
          };
        })
      );

      // Step 2: Combine and deduplicate pumps
      const pumpMap = new Map();
      const islands = [];
      
      pumpsResults.forEach(result => {
        islands.push(result.island);
        result.pumps.forEach(pump => {
          if (!pumpMap.has(pump.id)) {
            pumpMap.set(pump.id, {
              ...pump,
              sourceIslands: [result.island.id]
            });
          } else {
            const existingPump = pumpMap.get(pump.id);
            existingPump.sourceIslands.push(result.island.id);
          }
        });
      });

      const uniquePumps = Array.from(pumpMap.values());
      const pumpIds = uniquePumps.map(pump => pump.id);

      // Step 3: Get tanks for all pumps
      const tanksResult = await this.getPumpTanks(pumpIds);

      // Step 4: Build comprehensive asset chain
      const assetChain = {
        islands,
        pumps: uniquePumps,
        tanks: tanksResult.tanks,
        relationships: {
          islandToPump: uniquePumps.reduce((acc, pump) => {
            pump.sourceIslands.forEach(islandId => {
              if (!acc[islandId]) acc[islandId] = [];
              acc[islandId].push(pump.id);
            });
            return acc;
          }, {}),
          pumpToTank: tanksResult.tanks.reduce((acc, tank) => {
            tank.connectedPumps.forEach(pumpId => {
              if (!acc[pumpId]) acc[pumpId] = [];
              acc[pumpId].push(tank.id);
            });
            return acc;
          }, {})
        },
        summary: {
          totalIslands: islands.length,
          totalPumps: uniquePumps.length,
          totalTanks: tanksResult.tanks.length,
          connectionTypes: {
            directPumps: uniquePumps.filter(p => p.connectionType === 'DIRECT').length,
            connectedPumps: uniquePumps.filter(p => p.connectionType === 'ASSET_CONNECTION').length
          }
        }
      };

      logger.info(`✅ Asset chain built: ${assetChain.summary.totalIslands} islands, ${assetChain.summary.totalPumps} pumps, ${assetChain.summary.totalTanks} tanks`);
      return assetChain;
    } catch (error) {
      throw handleError(error, 'building asset chain', 'Failed to build asset chain');
    }
  },

  /**
   * Get asset discovery for shift opening preparation
   */
  async getShiftOpeningAssets(stationId, selectedIslandIds = null) {
    logger.info(`Preparing shift opening assets for station: ${stationId}`);
    
    try {
      // If specific islands are selected, use them; otherwise get all station assets
      let assetChain;
      
      if (selectedIslandIds && selectedIslandIds.length > 0) {
        assetChain = await this.getCompleteAssetChain(selectedIslandIds);
      } else {
        // Get all station assets and extract island IDs
        const stationAssets = await this.getStationAssets(stationId);
        const allIslandIds = stationAssets.islands.map(island => island.id);
        assetChain = await this.getCompleteAssetChain(allIslandIds);
      }

      // Get non-fuel products for the station
      const nonFuelProducts = await this.getStationNonFuelProducts(stationId);

      return {
        assetChain,
        nonFuelProducts,
        station: {
          id: stationId,
          name: assetChain.islands[0]?.stationName || 'Unknown Station'
        },
        readiness: {
          hasAssets: assetChain.summary.totalPumps > 0,
          hasTanks: assetChain.summary.totalTanks > 0,
          hasNonFuelProducts: nonFuelProducts.products.length > 0,
          isValidForShift: assetChain.summary.totalPumps > 0 && assetChain.summary.totalTanks > 0
        }
      };
    } catch (error) {
      throw handleError(error, 'preparing shift opening assets', 'Failed to prepare shift opening assets');
    }
  },

  // =====================
  // ASSET VALIDATION METHODS
  // =====================

  /**
   * Validate asset structure completeness
   */
  validateAssetStructure(assetChain) {
    const errors = [];
    const warnings = [];

    if (!assetChain.islands || assetChain.islands.length === 0) {
      errors.push('No islands found in asset structure');
    }

    if (!assetChain.pumps || assetChain.pumps.length === 0) {
      errors.push('No pumps found in asset structure');
    }

    if (!assetChain.tanks || assetChain.tanks.length === 0) {
      warnings.push('No tanks found in asset structure');
    }

    // Check for pumps without tanks
    const pumpsWithoutTanks = assetChain.pumps.filter(pump => {
      const connectedTanks = assetChain.relationships.pumpToTank[pump.id];
      return !connectedTanks || connectedTanks.length === 0;
    });

    if (pumpsWithoutTanks.length > 0) {
      warnings.push(`${pumpsWithoutTanks.length} pumps are not connected to any tanks`);
    }

    // Check for tanks without pumps
    const tanksWithoutPumps = assetChain.tanks.filter(tank => {
      return !tank.connectedPumps || tank.connectedPumps.length === 0;
    });

    if (tanksWithoutPumps.length > 0) {
      warnings.push(`${tanksWithoutPumps.length} tanks are not connected to any pumps`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        islands: assetChain.islands.length,
        pumps: assetChain.pumps.length,
        tanks: assetChain.tanks.length,
        pumpsWithoutTanks: pumpsWithoutTanks.length,
        tanksWithoutPumps: tanksWithoutPumps.length
      }
    };
  },

  /**
   * Validate asset readiness for shift operations
   */
  validateAssetsForShift(assetChain) {
    const validation = this.validateAssetStructure(assetChain);
    
    if (!validation.isValid) {
      return {
        ...validation,
        readyForShift: false,
        missingRequirements: validation.errors
      };
    }

    // Additional shift-specific validations
    const shiftRequirements = {
      hasMultipleIslands: assetChain.islands.length >= 1,
      hasPumpsWithProducts: assetChain.pumps.filter(p => p.product).length > 0,
      hasTanksWithProducts: assetChain.tanks.filter(t => t.product).length > 0,
      hasValidConnections: Object.keys(assetChain.relationships.pumpToTank).length > 0
    };

    const missingRequirements = Object.entries(shiftRequirements)
      .filter(([_, met]) => !met)
      .map(([req]) => req);

    return {
      ...validation,
      readyForShift: missingRequirements.length === 0,
      shiftRequirements,
      missingRequirements
    };
  },

  // =====================
  // DATA TRANSFORMATION UTILITIES
  // =====================

  /**
   * Transform asset chain for shift opening form
   */
  transformForShiftOpening(assetChain) {
    return {
      islands: assetChain.islands.map(island => ({
        id: island.id,
        name: island.name,
        code: island.code,
        pumps: assetChain.pumps
          .filter(pump => pump.sourceIslands.includes(island.id))
          .map(pump => ({
            id: pump.id,
            name: pump.name,
            product: pump.product,
            connectionType: pump.connectionType,
            connectedTanks: assetChain.relationships.pumpToTank[pump.id]?.map(tankId => 
              assetChain.tanks.find(t => t.id === tankId)
            ).filter(Boolean) || []
          }))
      })),
      tanks: assetChain.tanks.map(tank => ({
        id: tank.id,
        name: tank.name,
        product: tank.product,
        capacity: tank.capacity,
        currentVolume: tank.currentVolume,
        connectedPumps: tank.connectedPumps.map(pumpId =>
          assetChain.pumps.find(p => p.id === pumpId)
        ).filter(Boolean)
      })),
      summary: assetChain.summary
    };
  },

  /**
   * Transform for meter readings collection
   */
  transformForMeterReadings(assetChain) {
    const pumpReadingsTemplate = assetChain.pumps.map(pump => ({
      pumpId: pump.id,
      pumpName: pump.name,
      product: pump.product,
      island: assetChain.islands.find(island => 
        pump.sourceIslands.includes(island.id)
      ),
      meters: {
        electric: 0,
        manual: 0,
        cash: 0
      },
      isRequired: true,
      connectionType: pump.connectionType
    }));

    const tankReadingsTemplate = assetChain.tanks.map(tank => ({
      tankId: tank.id,
      tankName: tank.name,
      product: tank.product,
      currentVolume: tank.currentVolume,
      readings: {
        dip: 0,
        volume: tank.currentVolume,
        temperature: 25,
        waterLevel: 0
      },
      isRequired: true
    }));

    return {
      pumpReadings: pumpReadingsTemplate,
      tankReadings: tankReadingsTemplate,
      summary: {
        totalPumps: pumpReadingsTemplate.length,
        totalTanks: tankReadingsTemplate.length
      }
    };
  },

  /**
   * Transform for island assignments
   */
  transformForIslandAssignments(assetChain) {
    return assetChain.islands.map(island => ({
      islandId: island.id,
      islandName: island.name,
      islandCode: island.code,
      assignedPumps: assetChain.pumps
        .filter(pump => pump.sourceIslands.includes(island.id))
        .map(pump => ({
          pumpId: pump.id,
          pumpName: pump.name,
          product: pump.product
        })),
      assignment: {
        attendantId: null,
        attendantName: '',
        assignmentType: 'PRIMARY',
        startTime: new Date().toISOString()
      }
    }));
  },

  // =====================
  // CACHING & OPTIMIZATION
  // =====================

  // Simple in-memory cache
  _cache: new Map(),
  _cacheTimeout: 5 * 60 * 1000, // 5 minutes

  /**
   * Get cached data or fetch fresh
   */
  async getWithCache(cacheKey, fetchFunction) {
    const cached = this._cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this._cacheTimeout) {
      logger.debug(`📦 Serving from cache: ${cacheKey}`);
      return cached.data;
    }

    logger.debug(`🔄 Fetching fresh data: ${cacheKey}`);
    const data = await fetchFunction();
    
    this._cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  },

  /**
   * Clear cache for specific key or all
   */
  clearCache(cacheKey = null) {
    if (cacheKey) {
      this._cache.delete(cacheKey);
      logger.debug(`🗑️ Cleared cache: ${cacheKey}`);
    } else {
      this._cache.clear();
      logger.debug('🗑️ Cleared all cache');
    }
  }
};

export default connectedAssetService;