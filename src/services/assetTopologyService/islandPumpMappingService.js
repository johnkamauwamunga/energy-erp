// services/assetTopologyService/islandPumpMappingService.js
import { assetService } from '../assetService/assetService';
import { assetTopologyService } from './assetTopologyService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🏝️⛽ [IslandPumpMappingService]', ...args),
  info: (...args) => console.log('ℹ️ [IslandPumpMappingService]', ...args),
  warn: (...args) => console.warn('⚠️ [IslandPumpMappingService]', ...args),
  error: (...args) => console.error('❌ [IslandPumpMappingService]', ...args)
};

/**
 * Service to get simple mapping: { actualIslandId: [pumpIds] }
 */
export const islandPumpMappingService = {
  /**
   * Get simple mapping of actual island IDs to their pump IDs
   * @param {string} stationId 
   * @returns {Promise<Object>} { actualIslandId: [pumpIds] }
   */
  getIslandPumpMapping: async (stationId) => {
    logger.info(`Getting island-pump mapping for station: ${stationId}`);
    
    if (!stationId) {
      throw new Error('Station ID is required');
    }
    
    try {
      console.log('🔄 Starting island-pump mapping process...');
      
      // Step 1: Get asset to island mapping
      console.log('🗺️ Step 1: Getting asset to island mapping...');
      const assetToIslandMapping = await islandPumpMappingService.createAssetToIslandMapping(stationId);
      console.log('✅ Asset to island mapping:', assetToIslandMapping);
      
      // Step 2: Get topology data with pumps
      console.log('📦 Step 2: Getting topology data...');
      const topology = await assetTopologyService.getIslandsWithPumpsAndTanks(stationId);
      console.log('✅ Topology data received');
      
      // Step 3: Extract and transform to simple mapping
      console.log('🔁 Step 3: Creating simple mapping...');
      const mapping = islandPumpMappingService.createSimpleMapping(topology, assetToIslandMapping);
      console.log('✅ Final mapping created:', mapping);
      
      return mapping;
      
    } catch (error) {
      console.error('❌ Error getting island-pump mapping:', error);
      throw new Error(`Failed to get island-pump mapping: ${error.message}`);
    }
  },

  /**
   * Create asset to island ID mapping
   */
  createAssetToIslandMapping: async (stationId) => {
    try {
      const allAssets = await assetService.getStationAssets(stationId);
      
      if (!allAssets || !Array.isArray(allAssets)) {
        return {};
      }
      
      // Filter only island assets and create mapping
      const mapping = {};
      const islandAssets = allAssets.filter(asset => asset.type === 'ISLAND');
      
      islandAssets.forEach(asset => {
        if (asset.island && asset.island.id) {
          mapping[asset.id] = asset.island.id; // assetId -> actualIslandId
        }
      });
      
      console.log(`🗺️ Created mapping for ${Object.keys(mapping).length} islands`);
      return mapping;
      
    } catch (error) {
      console.error('Error creating asset mapping:', error);
      return {};
    }
  },

  /**
   * Create simple mapping: { actualIslandId: [pumpIds] }
   */
  createSimpleMapping: (topology, assetToIslandMapping) => {
    const data = topology.data || topology;
    const islandsWithPumps = data.islandsWithPumps || [];
    
    const mapping = {};
    
    islandsWithPumps.forEach(island => {
      const assetId = island.id; // This is the asset ID from topology
      const actualIslandId = assetToIslandMapping[assetId];
      
      if (actualIslandId && island.pumps && Array.isArray(island.pumps)) {
        // Get just the pump IDs
        const pumpIds = island.pumps.map(pump => pump.id);
        
        // Add to mapping: { actualIslandId: [pumpIds] }
        mapping[actualIslandId] = pumpIds;
        
        console.log(`🏝️ Island ${actualIslandId} has ${pumpIds.length} pumps:`, pumpIds);
      } else {
        console.warn(`⚠️ Skipping island ${assetId}:`, {
          hasActualId: !!actualIslandId,
          hasPumps: !!(island.pumps && Array.isArray(island.pumps)),
          pumpCount: island.pumps?.length || 0
        });
      }
    });
    
    console.log(`✅ Created mapping for ${Object.keys(mapping).length} islands with pumps`);
    return mapping;
  }
};

export default islandPumpMappingService;