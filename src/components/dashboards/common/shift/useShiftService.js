// shiftWizard/useShiftService.js
import { useState, useEffect, useCallback } from 'react';
import { shiftService } from '../../../../services/shiftService';
import { useShiftStructure, useShiftFilter } from './useShiftStructure';

/**
 * Combined hook that handles both data fetching and transformation
 */

export const useShiftService = (serviceMethod, params = [], options = {}) => {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Add forceRefresh to params if needed
      const fetchParams = [...params];
      if (forceRefresh && serviceMethod.name.includes('getAllShifts')) {
        // For getAllShifts, forceRefresh is the second parameter
        fetchParams[1] = true;
      }
      
      const result = await serviceMethod(...fetchParams);
      setRawData(result);
      setLastFetch(new Date());
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [serviceMethod, ...params]);

  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchData(options.forceRefresh);
    }
  }, [fetchData, options.autoFetch, options.forceRefresh]);

  // Transform the raw data
  const transformedData = useShiftStructure(rawData, options);

  return {
    // Transformed data
    ...transformedData,
    
    // Service state
    loading,
    error,
    lastFetch,
    
    // Raw data for advanced use cases
    rawData,
    
    // Control methods
    refetch: (forceRefresh = false) => fetchData(forceRefresh),
    clearData: () => setRawData(null),
    setData: setRawData,
    
    // Cache management
    clearCache: () => {
      if (options.clearCachePattern) {
        shiftService.clearCache(options.clearCachePattern);
      }
    }
  };
};

// Pre-configured hooks for common service methods
export const useAllShifts = (filters = {}, options = {}) => {
  return useShiftService(shiftService.getAllShifts, [filters], options);
};

export const useShiftById = (shiftId, options = {}) => {
  return useShiftService(shiftService.getShiftById, [shiftId], options);
};

export const useCurrentOpenShift = (stationId, options = {}) => {
  return useShiftService(shiftService.getCurrentOpenShift, [stationId], options);
};

export const useOpenShifts = (stationId, options = {}) => {
  return useShiftService(shiftService.getOpenShifts, [stationId], options);
};

export const useShiftsByDateRange = (startDate, endDate, additionalFilters = {}, options = {}) => {
  const filters = shiftService.buildShiftFilters({
    startDate,
    endDate,
    ...additionalFilters
  });
  
  return useShiftService(shiftService.getAllShifts, [filters], options);
};

export const useShiftWithFilter = (filters = {}, viewOptions = {}) => {
  const shiftData = useAllShifts(filters, viewOptions);
  const filteredData = useShiftFilter(shiftData.rawData, filters, viewOptions);

  return {
    ...shiftData,
    ...filteredData
  };
};

// Hook for shift creation and management
export const useShiftManager = () => {
  const [creating, setCreating] = useState(false);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);

  const createShift = useCallback(async (shiftData) => {
    setCreating(true);
    try {
      const validation = shiftService.validateShiftCreation(shiftData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      
      const result = await shiftService.createShift(shiftData);
      return result;
    } finally {
      setCreating(false);
    }
  }, []);

  const openShift = useCallback(async (shiftId, openingData) => {
    setOpening(true);
    try {
      const result = await shiftService.openShift(shiftId, openingData);
      return result;
    } finally {
      setOpening(false);
    }
  }, []);

  const closeShift = useCallback(async (shiftId, closingData) => {
    setClosing(true);
    try {
      const result = await shiftService.closeShift(shiftId, closingData);
      return result;
    } finally {
      setClosing(false);
    }
  }, []);

  const checkOpeningStatus = useCallback(async (shiftId) => {
    return await shiftService.checkShiftOpeningStatus(shiftId);
  }, []);

  return {
    createShift,
    openShift,
    closeShift,
    checkOpeningStatus,
    creating,
    opening,
    closing,
    generatingShiftNumber: false,
    generateShiftNumber: () => shiftService.generateShiftNumber()
  };
};

// Hook for real-time shift updates (polling)
export const useShiftPolling = (stationId, interval = 30000, options = {}) => {
  const [pollingCount, setPollingCount] = useState(0);
  
  const shiftData = useCurrentOpenShift(stationId, {
    ...options,
    autoFetch: true
  });

  useEffect(() => {
    if (!stationId || !shiftData.data?.statusInfo?.isOpen) return;

    const pollInterval = setInterval(() => {
      setPollingCount(prev => prev + 1);
      shiftData.refetch();
    }, interval);

    return () => clearInterval(pollInterval);
  }, [stationId, interval, shiftData.data?.statusInfo?.isOpen, shiftData.refetch]);

  return {
    ...shiftData,
    pollingCount,
    isPolling: shiftData.data?.statusInfo?.isOpen
  };
};