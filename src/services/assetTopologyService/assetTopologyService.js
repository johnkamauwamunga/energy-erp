// services/assetTopologyService/assetTopologyService.js
import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [AssetTopologyService]', ...args),
  info: (...args) => console.log('ℹ️ [AssetTopologyService]', ...args),
  warn: (...args) => console.warn('⚠️ [AssetTopologyService]', ...args),
  error: (...args) => console.error('❌ [AssetTopologyService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  console.log(`📦 ${operation} raw response:`, response);
  
  if (response.data) {
    logger.debug(`${operation} successful`);
    return response.data;
  }
  
  // If response itself is the data (no nested data property)
  if (response && (response.islands !== undefined || response.station !== undefined)) {
    logger.debug(`${operation} successful (direct data)`);
    return response;
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

// Helper function to merge pump data from island and tank connections
const mergePumpData = (islandPump, tankPump = null) => {
  // Use tank pump data for product info if available
  const sourcePump = tankPump || islandPump;
  
  const mergedPump = {
    id: islandPump.id,
    name: islandPump.name,
    assetId: islandPump.assetId,
    
    // Product info from tank connection (if available)
    product: sourcePump.product || null,
    productSource: tankPump ? 'TANK' : 'ISLAND',
    
    // Tank info from tank connection
    tank: tankPump ? {
      id: tankPump.tank?.id,
      name: tankPump.tank?.name,
      assetId: tankPump.tank?.assetId,
      capacity: tankPump.tank?.capacity,
      currentVolume: tankPump.tank?.currentVolume,
      product: tankPump.tank?.product,
      utilization: tankPump.tank?.utilization,
      connectionId: tankPump.connectionId,
      connectionType: tankPump.connectionType
    } : null,
    
    productCompatibility: sourcePump.productCompatibility || islandPump.productCompatibility,
    connections: {
      directToIsland: islandPump.connectionId ? {
        connectionId: islandPump.connectionId,
        connectionType: islandPump.connectionType
      } : null,
      toTank: tankPump ? {
        connectionId: tankPump.connectionId,
        connectionType: tankPump.connectionType
      } : null
    }
  };

  // Calculate connection status
  if (mergedPump.tank && mergedPump.product) {
    mergedPump.connectionStatus = 'FULLY_CONNECTED';
  } else if (mergedPump.tank && !mergedPump.product) {
    mergedPump.connectionStatus = 'PARTIALLY_CONNECTED';
  } else {
    mergedPump.connectionStatus = 'DISCONNECTED';
  }

  return mergedPump;
};

export const assetTopologyService = {
  /**
   * Get comprehensive topology for an entire station
   * This returns the complete station overview with islands, pumps, tanks and summaries
   * @param {string} stationId - Required station ID
   * @returns {Promise} Complete station topology data
   */
  getComprehensiveStationTopology: async (stationId) => {
    logger.info(`Fetching comprehensive station topology: ${stationId}`);
    
    if (!stationId) {
      throw new Error('Station ID is required for comprehensive topology');
    }
    
    try {
      const response = await apiService.get(`/asset-topography/station/${stationId}/comprehensive`);
      console.log("Comprehensive topology response:", response);
      return handleResponse(response, 'fetching comprehensive station topology');
    } catch (error) {
      throw handleError(error, 'fetching comprehensive station topology', 'Failed to fetch station topology');
    }
  },

  /**
   * FUNCTION 1: Get islands with their directly connected pumps, products, and tank relationships
   * Returns structured data showing: Island → Pumps → Products → Tanks hierarchy
   * @param {string} stationId - Station ID
   * @returns {Promise} Islands with pumps, products, and tank connections
   */
  getIslandsWithPumpsAndTanks: async (stationId) => {
    logger.info(`Fetching islands with pumps and tanks: ${stationId}`);
    
    try {
      const topology = await assetTopologyService.getComprehensiveStationTopology(stationId);
      console.log("Fetched topology data for islands:", topology);

      // Handle both response.data and direct response structures
      const topologyData = topology.data || topology;
      
      if (!topologyData) {
        throw new Error('Invalid topology response: data is undefined');
      }

      const { islands, pumps, tanks } = topologyData;
      
      if (!islands || !pumps || !tanks) {
        console.warn('Missing data in topology:', { islands, pumps, tanks });
        throw new Error('Invalid topology structure: missing islands, pumps, or tanks');
      }

      // Create a map of tank pumps by pump ID for easy lookup
      const tankPumpMap = new Map();
      tanks.forEach(tank => {
        if (tank.connectedPumps) {
          tank.connectedPumps.forEach(tankPump => {
            tankPumpMap.set(tankPump.id, { 
              ...tankPump, 
              tank: {
                id: tank.id,
                name: tank.name,
                assetId: tank.assetId,
                capacity: tank.capacity,
                currentVolume: tank.currentVolume,
                product: tank.product,
                utilization: tank.utilization,
                connectionStatus: tank.connectionStatus,
                station: tank.station
              }
            });
          });
        }
      });

      // Structure islands with their pumps, products, and tanks
      const islandsWithPumps = islands.map(island => {
        // Get direct pumps from island (these are the pumps physically connected to the island)
        const directPumps = island.directPumps || [];
        
        // Check if island has pumps
        const hasPumps = directPumps.length > 0;
        
        // Structure pumps with their product and tank info
        const structuredPumps = directPumps.map(directPump => {
          const tankPump = tankPumpMap.get(directPump.id);
          return mergePumpData(directPump, tankPump);
        });

        // Get unique products flowing through this island's pumps
        const islandProducts = [...new Map(
          structuredPumps
            .map(pump => pump.product)
            .filter(product => product !== null)
            .map(product => [product.id, product])
        ).values()];

        // Get tanks connected to this island (via pumps)
        const connectedTanks = [...new Map(
          structuredPumps
            .map(pump => pump.tank)
            .filter(tank => tank !== null)
            .map(tank => [tank.id, tank])
        ).values()];

        // Get tanks directly connected to island
        const directTanks = island.tanks || [];

        return {
          id: island.id,
          name: island.name,
          code: island.code,
          station: island.station,
          asset: island.asset,
          
          // Core hierarchy data
          hasPumps: hasPumps,
          pumps: structuredPumps,
          products: islandProducts,
          connectedTanks: connectedTanks,
          directTanks: directTanks,
          
          // Summary information
          summary: {
            totalPumps: structuredPumps.length,
            pumpsWithTanks: structuredPumps.filter(p => p.tank !== null).length,
            pumpsWithoutTanks: structuredPumps.filter(p => p.tank === null).length,
            pumpsWithProducts: structuredPumps.filter(p => p.product !== null).length,
            uniqueProducts: islandProducts.length,
            connectedTanksCount: connectedTanks.length,
            directTanksCount: directTanks.length,
            
            // Connection status summary
            fullyConnectedPumps: structuredPumps.filter(p => p.connectionStatus === 'FULLY_CONNECTED').length,
            partiallyConnectedPumps: structuredPumps.filter(p => p.connectionStatus === 'PARTIALLY_CONNECTED').length,
            disconnectedPumps: structuredPumps.filter(p => p.connectionStatus === 'DISCONNECTED').length,
            
            fullyOperational: structuredPumps.every(pump => 
              pump.connectionStatus === 'FULLY_CONNECTED'
            )
          }
        };
      });

      // Separate islands with pumps vs without pumps
      const islandsWithPumpsList = islandsWithPumps.filter(island => island.hasPumps);
      const islandsWithoutPumps = islandsWithPumps.filter(island => !island.hasPumps);
      
      return {
        success: true,
        data: {
          // Main data structure
          islands: islandsWithPumps,
          
          // Categorized views
          islandsWithPumps: islandsWithPumpsList,
          islandsWithoutPumps: islandsWithoutPumps,
          
          // Station-wide summary
          summary: {
            totalIslands: islandsWithPumps.length,
            islandsWithPumps: islandsWithPumpsList.length,
            islandsWithoutPumps: islandsWithoutPumps.length,
            totalPumps: islandsWithPumps.reduce((sum, island) => sum + island.pumps.length, 0),
            totalProducts: [...new Set(
              islandsWithPumps.flatMap(island => island.products.map(p => p.id))
            )].length,
            fullyConnectedIslands: islandsWithPumps.filter(island => 
              island.summary.fullyOperational
            ).length
          }
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching islands with pumps and tanks', 'Failed to fetch island-pump relationships');
    }
  },

  /**
   * FUNCTION 2: Get tanks with their directly connected pumps and products including pricing
   * Returns: Tank { pumps connected, product with pricing, capacity, utilization }
   * @param {string} stationId - Station ID
   * @returns {Promise} Tanks with connected pumps and product info including pricing
   */
  getTanksWithPumpsAndProducts: async (stationId) => {
    logger.info(`Fetching tanks with pumps and products: ${stationId}`);
    
    try {
      const topology = await assetTopologyService.getComprehensiveStationTopology(stationId);
      console.log("Fetched topology data for tanks:", topology);
      
      // Handle both response.data and direct response structures
      const topologyData = topology.data || topology;
      
      if (!topologyData) {
        throw new Error('Invalid topology response: data is undefined');
      }

      const { tanks, pumps, islands } = topologyData;
      
      if (!tanks || !pumps || !islands) {
        console.warn('Missing data in topology:', { tanks, pumps, islands });
        throw new Error('Invalid topology structure: missing tanks, pumps, or islands');
      }

      // Create island map for easy lookup
      const islandMap = new Map();
      islands.forEach(island => {
        if (island.directPumps) {
          island.directPumps.forEach(pump => {
            islandMap.set(pump.id, {
              id: island.id,
              name: island.name,
              code: island.code,
              station: island.station,
              asset: island.asset
            });
          });
        }
      });

      // Structure tanks with their connected pumps
      const tanksWithPumps = tanks.map(tank => {
        // Get pumps directly connected to this tank
        const connectedPumps = tank.connectedPumps || [];
        
        // Structure pump info with island data and product pricing
        const structuredPumps = connectedPumps.map(tankPump => {
          const island = islandMap.get(tankPump.id);
          
          return {
            id: tankPump.id,
            name: tankPump.name,
            assetId: tankPump.assetId,
            island: island,
            product: tankPump.product ? {
              ...tankPump.product,
              // Include pricing information
              pricing: {
                baseCostPrice: tankPump.product.baseCostPrice,
                minSellingPrice: tankPump.product.minSellingPrice,
                maxSellingPrice: tankPump.product.maxSellingPrice
              }
            } : null,
            productSource: 'TANK',
            productCompatibility: tankPump.productCompatibility,
            connection: {
              connectionId: tankPump.connectionId,
              connectionType: tankPump.connectionType
            }
          };
        });

        // Calculate connection status for tank
        let connectionStatus = 'DISCONNECTED';
        if (structuredPumps.length > 0) {
          if (structuredPumps.every(pump => pump.product)) {
            connectionStatus = 'FULLY_CONNECTED';
          } else if (structuredPumps.some(pump => pump.product)) {
            connectionStatus = 'PARTIALLY_CONNECTED';
          }
        }

        // Get islands connected to this tank (via pumps)
        const connectedIslands = [...new Map(
          structuredPumps
            .map(pump => pump.island)
            .filter(island => island !== null)
            .map(island => [island.id, island])
        ).values()];

        return {
          id: tank.id,
          name: tank.name,
          assetId: tank.assetId,
          capacity: tank.capacity,
          currentVolume: tank.currentVolume,
          utilization: tank.utilization,
          product: tank.product ? {
            ...tank.product,
            // Include pricing information
            pricing: {
              baseCostPrice: tank.product.baseCostPrice,
              minSellingPrice: tank.product.minSellingPrice,
              maxSellingPrice: tank.product.maxSellingPrice
            }
          } : null,
          station: tank.station,
          connectionStatus: connectionStatus,
          
          // Direct pump connections
          connectedPumps: structuredPumps,
          connectedIslands: connectedIslands,
          
          // Direct island connections (if any)
          directIslandConnections: tank.connectedIslands || [],
          
          summary: {
            totalPumps: structuredPumps.length,
            connectedPumps: structuredPumps.filter(p => p.product !== null).length,
            disconnectedPumps: structuredPumps.filter(p => p.product === null).length,
            connectedIslandsCount: connectedIslands.length,
            utilizationPercentage: tank.utilization ? Math.round(tank.utilization * 100) : 0,
            // Product summary
            productName: tank.product?.name || 'No Product',
            productCode: tank.product?.fuelCode || 'N/A'
          }
        };
      });
      
      return {
        success: true,
        data: {
          tanks: tanksWithPumps,
          summary: {
            totalTanks: tanksWithPumps.length,
            totalCapacity: tanksWithPumps.reduce((sum, tank) => sum + (tank.capacity || 0), 0),
            totalVolume: tanksWithPumps.reduce((sum, tank) => sum + (tank.currentVolume || 0), 0),
            averageUtilization: tanksWithPumps.length > 0 ? 
              tanksWithPumps.reduce((sum, tank) => sum + (tank.utilization || 0), 0) / tanksWithPumps.length : 0,
            fullyConnectedTanks: tanksWithPumps.filter(tank => 
              tank.connectionStatus === 'FULLY_CONNECTED'
            ).length,
            tanksWithPumps: tanksWithPumps.filter(tank => tank.connectedPumps.length > 0).length,
            tanksWithoutPumps: tanksWithPumps.filter(tank => tank.connectedPumps.length === 0).length,
            uniqueProducts: [...new Set(
              tanksWithPumps
                .map(tank => tank.product?.name)
                .filter(name => name)
            )].length
          }
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching tanks with pumps and products', 'Failed to fetch tank-pump relationships');
    }
  },

  // ... other functions (getPumpConnections, getProductDistribution, getStationOverview) 
  // need the same fix - use topology.data || topology

  /**
   * FUNCTION 3: Get detailed pump connections across the station
   * Returns comprehensive pump data with both island and tank connections
   * @param {string} stationId - Station ID
   * @returns {Promise} Detailed pump connection data
   */
  getPumpConnections: async (stationId) => {
    logger.info(`Fetching detailed pump connections: ${stationId}`);
    
    try {
      const topology = await assetTopologyService.getComprehensiveStationTopology(stationId);
      
      // Handle both response.data and direct response structures
      const topologyData = topology.data || topology;
      
      if (!topologyData) {
        throw new Error('Invalid topology response: data is undefined');
      }

      const { islands, tanks, pumps } = topologyData;
      
      // Create maps for easy lookup
      const islandPumpMap = new Map();
      const tankPumpMap = new Map();
      
      islands.forEach(island => {
        if (island.directPumps) {
          island.directPumps.forEach(pump => {
            islandPumpMap.set(pump.id, { 
              ...pump, 
              island: {
                id: island.id,
                name: island.name,
                code: island.code,
                station: island.station
              }
            });
          });
        }
      });
      
      tanks.forEach(tank => {
        if (tank.connectedPumps) {
          tank.connectedPumps.forEach(pump => {
            tankPumpMap.set(pump.id, { 
              ...pump, 
              tank: {
                id: tank.id,
                name: tank.name,
                assetId: tank.assetId,
                capacity: tank.capacity,
                currentVolume: tank.currentVolume,
                product: tank.product,
                utilization: tank.utilization
              }
            });
          });
        }
      });

      // Structure all pumps with their complete connection data
      const detailedPumps = pumps.map(pump => {
        const islandData = islandPumpMap.get(pump.id);
        const tankData = tankPumpMap.get(pump.id);
        
        const mergedPump = mergePumpData(
          islandData || pump, 
          tankData
        );

        // Add pricing information if product exists
        if (mergedPump.product) {
          mergedPump.product.pricing = {
            baseCostPrice: mergedPump.product.baseCostPrice,
            minSellingPrice: mergedPump.product.minSellingPrice,
            maxSellingPrice: mergedPump.product.maxSellingPrice
          };
        }

        return {
          ...mergedPump,
          island: islandData?.island || null,
          isFullyConnected: mergedPump.connectionStatus === 'FULLY_CONNECTED',
          isPartiallyConnected: mergedPump.connectionStatus === 'PARTIALLY_CONNECTED',
          isDisconnected: mergedPump.connectionStatus === 'DISCONNECTED'
        };
      });

      return {
        success: true,
        data: {
          pumps: detailedPumps,
          summary: {
            totalPumps: detailedPumps.length,
            fullyConnected: detailedPumps.filter(p => p.connectionStatus === 'FULLY_CONNECTED').length,
            partiallyConnected: detailedPumps.filter(p => p.connectionStatus === 'PARTIALLY_CONNECTED').length,
            disconnected: detailedPumps.filter(p => p.connectionStatus === 'DISCONNECTED').length,
            pumpsWithIslands: detailedPumps.filter(p => p.island !== null).length,
            pumpsWithTanks: detailedPumps.filter(p => p.tank !== null).length,
            pumpsWithProducts: detailedPumps.filter(p => p.product !== null).length
          }
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching pump connections', 'Failed to fetch pump connection data');
    }
  },

  /**
   * Get product distribution across the station with pricing
   * @param {string} stationId - Station ID
   * @returns {Promise} Product distribution data with pricing
   */
  getProductDistribution: async (stationId) => {
    logger.info(`Fetching product distribution: ${stationId}`);
    
    try {
      const topology = await assetTopologyService.getComprehensiveStationTopology(stationId);
      
      // Handle both response.data and direct response structures
      const topologyData = topology.data || topology;
      
      if (!topologyData) {
        throw new Error('Invalid topology response: data is undefined');
      }

      const { tanks, pumps } = topologyData;
      
      // Extract unique products with pricing
      const products = new Map();
      
      // Process tanks and their products
      tanks.forEach(tank => {
        if (tank.product) {
          const productId = tank.product.id;
          if (!products.has(productId)) {
            products.set(productId, {
              ...tank.product,
              pricing: {
                baseCostPrice: tank.product.baseCostPrice,
                minSellingPrice: tank.product.minSellingPrice,
                maxSellingPrice: tank.product.maxSellingPrice
              },
              tanks: 0,
              pumps: 0,
              totalCapacity: 0,
              currentVolume: 0,
              totalUtilization: 0
            });
          }
          
          const product = products.get(productId);
          product.tanks++;
          product.totalCapacity += tank.capacity || 0;
          product.currentVolume += tank.currentVolume || 0;
          product.totalUtilization += tank.utilization || 0;
        }
      });
      
      // Process pumps by product
      pumps.forEach(pump => {
        if (pump.product) {
          const productId = pump.product.id;
          if (products.has(productId)) {
            products.get(productId).pumps++;
          }
        }
      });
      
      // Calculate averages and percentages
      const productArray = Array.from(products.values()).map(product => ({
        ...product,
        averageUtilization: product.tanks > 0 ? product.totalUtilization / product.tanks : 0,
        capacityUtilization: product.totalCapacity > 0 ? (product.currentVolume / product.totalCapacity) * 100 : 0,
        // Pricing summary
        priceRange: {
          min: product.minSellingPrice,
          max: product.maxSellingPrice,
          base: product.baseCostPrice
        }
      }));
      
      return {
        success: true,
        data: {
          products: productArray,
          summary: {
            totalProducts: products.size,
            totalTanks: tanks.length,
            totalPumps: pumps.length,
            totalCapacity: productArray.reduce((sum, product) => sum + product.totalCapacity, 0),
            totalVolume: productArray.reduce((sum, product) => sum + product.currentVolume, 0),
            totalValue: productArray.reduce((sum, product) => sum + (product.currentVolume * product.baseCostPrice), 0)
          }
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching product distribution', 'Failed to fetch product distribution');
    }
  },

  /**
   * Get station overview with key metrics
   * @param {string} stationId - Station ID
   * @returns {Promise} Station overview with key metrics
   */
  getStationOverview: async (stationId) => {
    logger.info(`Fetching station overview: ${stationId}`);
    
    try {
      const topology = await assetTopologyService.getComprehensiveStationTopology(stationId);
      
      // Handle both response.data and direct response structures
      const topologyData = topology.data || topology;
      
      if (!topologyData) {
        throw new Error('Invalid topology response: data is undefined');
      }

      const { station, islands, pumps, tanks, overview } = topologyData;
      
      return {
        success: true,
        data: {
          station: station,
          overview: {
            totalIslands: islands.length,
            totalPumps: pumps.length,
            totalTanks: tanks.length,
            totalProducts: new Set(tanks.map(tank => tank.product?.id).filter(Boolean)).size,
            totalCapacity: tanks.reduce((sum, tank) => sum + (tank.capacity || 0), 0),
            currentVolume: tanks.reduce((sum, tank) => sum + (tank.currentVolume || 0), 0),
            overallUtilization: overview?.utilization?.overall || 0
          },
          quickStats: {
            islandsWithPumps: islands.filter(island => island.directPumps && island.directPumps.length > 0).length,
            tanksWithPumps: tanks.filter(tank => tank.connectedPumps && tank.connectedPumps.length > 0).length,
            connectedAssets: overview?.totals?.connectedAssets || 0
          }
        }
      };
    } catch (error) {
      throw handleError(error, 'fetching station overview', 'Failed to fetch station overview');
    }
  }
};

// Export default for convenience
export default assetTopologyService;