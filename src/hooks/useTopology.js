// hooks/useTopology.js
import { useState, useEffect, useCallback } from 'react';
import { assetTopologyService } from '../services/assetTopologyService/assetTopologyService';
import { useApp } from '../context/AppContext';

// Global cache storage (similar to your shift service pattern)
let topologyCache = new Map();

export const useTopology = (stationId) => {
  const { state: appState } = useApp();
  const [topologyData, setTopologyData] = useState({
    comprehensiveTopology: null,
    islandsWithPumps: null,
    tanksWithPumps: null,
    pumpConnections: null,
    productDistribution: null,
    stationOverview: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Check cache for existing topology data
  const getCachedTopology = useCallback((stationId) => {
    return topologyCache.get(stationId);
  }, []);

  // Cache topology data
  const cacheTopologyData = useCallback((stationId, data) => {
    topologyCache.set(stationId, {
      ...data,
      lastUpdated: new Date().toISOString(),
      cached: true
    });
  }, []);

  // Clear cache for specific station
  const clearStationCache = useCallback((stationId) => {
    topologyCache.delete(stationId);
  }, []);

  // Clear all cache
  const clearAllCache = useCallback(() => {
    topologyCache.clear();
  }, []);

  // Load comprehensive topology data
  const loadTopology = useCallback(async (forceRefresh = false) => {
    if (!stationId) {
      setError('Station ID is required');
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedTopology(stationId);
      if (cached) {
        console.log('📦 Using cached topology data');
        setTopologyData(cached);
        setLastUpdated(cached.lastUpdated);
        setLoading(false);
        setError(null);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Loading station topology...');
      
      // Load all topology data in parallel (similar to your shift service pattern)
      const [
        comprehensiveTopology,
        islandsWithPumps,
        tanksWithPumps,
        pumpConnections,
        productDistribution,
        stationOverview
      ] = await Promise.all([
        assetTopologyService.getComprehensiveStationTopology(stationId),
        assetTopologyService.getIslandsWithPumpsAndTanks(stationId),
        assetTopologyService.getTanksWithPumpsAndProducts(stationId),
        assetTopologyService.getPumpConnections(stationId),
        assetTopologyService.getProductDistribution(stationId),
        assetTopologyService.getStationOverview(stationId)
      ]);

      const newTopologyData = {
        comprehensiveTopology,
        islandsWithPumps,
        tanksWithPumps,
        pumpConnections,
        productDistribution,
        stationOverview,
        lastUpdated: new Date().toISOString(),
        cached: false
      };

      // Cache the data
      cacheTopologyData(stationId, newTopologyData);

      // Update state
      setTopologyData(newTopologyData);
      setLastUpdated(newTopologyData.lastUpdated);
      
      console.log('✅ Topology loaded successfully');

    } catch (err) {
      const errorMsg = err.message || 'Failed to load topology data';
      console.error('❌ Topology loading error:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [stationId, getCachedTopology, cacheTopologyData]);

  // Initialize - load topology when station changes
  useEffect(() => {
    if (stationId) {
      loadTopology();
    }
  }, [stationId, loadTopology]);

  // Refresh topology data
  const refreshTopology = useCallback(async () => {
    await loadTopology(true);
  }, [loadTopology]);

  // Clear all topology data
  const clearTopology = useCallback(() => {
    setTopologyData({
      comprehensiveTopology: null,
      islandsWithPumps: null,
      tanksWithPumps: null,
      pumpConnections: null,
      productDistribution: null,
      stationOverview: null
    });
    setError(null);
    setLastUpdated(null);
    if (stationId) {
      clearStationCache(stationId);
    }
  }, [stationId, clearStationCache]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Helper functions to get specific data (similar to your shift service pattern)
  const getIslandsWithPumps = useCallback(() => {
    return topologyData.islandsWithPumps;
  }, [topologyData.islandsWithPumps]);

  const getTanksWithPumps = useCallback(() => {
    return topologyData.tanksWithPumps;
  }, [topologyData.tanksWithPumps]);

  const getPumpConnections = useCallback(() => {
    return topologyData.pumpConnections;
  }, [topologyData.pumpConnections]);

  const getProductDistribution = useCallback(() => {
    return topologyData.productDistribution;
  }, [topologyData.productDistribution]);

  const getStationOverview = useCallback(() => {
    return topologyData.stationOverview;
  }, [topologyData.stationOverview]);

  const getComprehensiveTopology = useCallback(() => {
    return topologyData.comprehensiveTopology;
  }, [topologyData.comprehensiveTopology]);

  // Get specific island data
  const getIslandById = useCallback((islandId) => {
    const islandsData = getIslandsWithPumps();
    if (!islandsData?.data?.islands) return null;
    
    return islandsData.data.islands.find(island => island.id === islandId);
  }, [getIslandsWithPumps]);

  // Get specific tank data
  const getTankById = useCallback((tankId) => {
    const tanksData = getTanksWithPumps();
    if (!tanksData?.data?.tanks) return null;
    
    return tanksData.data.tanks.find(tank => tank.id === tankId);
  }, [getTanksWithPumps]);

  // Get specific pump data
  const getPumpById = useCallback((pumpId) => {
    const pumpsData = getPumpConnections();
    if (!pumpsData?.data?.pumps) return null;
    
    return pumpsData.data.pumps.find(pump => pump.id === pumpId);
  }, [getPumpConnections]);

  // Get products list
  const getProducts = useCallback(() => {
    const distributionData = getProductDistribution();
    return distributionData?.data?.products || [];
  }, [getProductDistribution]);

  // Get station summary
  const getStationSummary = useCallback(() => {
    const overview = getStationOverview();
    return overview?.data?.overview || {};
  }, [getStationOverview]);

  return {
    // State (similar to your useShift pattern)
    topologyData,
    loading,
    error,
    lastUpdated,
    
    // Actions (similar to your useShift pattern)
    loadTopology,
    refreshTopology,
    clearTopology,
    clearError,
    clearAllCache,
    
    // Data getters
    getIslandsWithPumps,
    getTanksWithPumps,
    getPumpConnections,
    getProductDistribution,
    getStationOverview,
    getComprehensiveTopology,
    
    // Specific data helpers
    getIslandById,
    getTankById,
    getPumpById,
    getProducts,
    getStationSummary,
    
    // Helper properties (similar to your useShift pattern)
    hasData: !!topologyData.comprehensiveTopology,
    isCached: topologyData.cached || false,
    stationId
  };
};