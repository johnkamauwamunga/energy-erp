// shiftWizard/useShiftStructure.js
import { useMemo } from 'react';
import { 
  transformShiftData, 
  transformSingleShift,
  transformForListView,
  transformForDashboard,
  transformForSummary,
  transformShiftsByViewType
} from './shiftTransformers';
import { VIEW_TYPES } from './constants';

/**
 * React hook for consuming and transforming shift data
 */

export const useShiftStructure = (rawShiftData, options = {}) => {
  const {
    formatShiftStatus,
    viewType = VIEW_TYPES.FULL,
    includeRaw = false,
    enableDebug = process.env.NODE_ENV === 'development'
  } = options;

  const transformedData = useMemo(() => {
    if (!rawShiftData) return null;

    try {
      // Handle single shift vs multiple shifts
      if (rawShiftData.shifts) {
        // Multiple shifts (from getAllShifts)
        const baseTransformed = transformShiftData(rawShiftData, formatShiftStatus);
        
        // Apply view-specific transformations if not FULL view
        if (viewType !== VIEW_TYPES.FULL) {
          const transformedShifts = transformShiftsByViewType(
            baseTransformed.shifts, 
            viewType, 
            formatShiftStatus
          );
          
          return {
            ...baseTransformed,
            shifts: transformedShifts
          };
        }
        
        return baseTransformed;
      } else {
        // Single shift (from getShiftById, getCurrentOpenShift, etc.)
        const singleShift = transformSingleShift(rawShiftData, formatShiftStatus);
        if (!singleShift) return null;
        
        // Apply view-specific transformation for single shift
        if (viewType === VIEW_TYPES.LIST) {
          return transformForListView(singleShift);
        } else if (viewType === VIEW_TYPES.DASHBOARD) {
          return transformForDashboard(singleShift);
        } else if (viewType === VIEW_TYPES.SUMMARY) {
          return transformForSummary(singleShift);
        }
        
        return singleShift;
      }
    } catch (error) {
      console.error('Error transforming shift data:', error);
      if (enableDebug) {
        console.debug('Raw data that caused error:', rawShiftData);
      }
      return rawShiftData; // Fallback to raw data
    }
  }, [rawShiftData, formatShiftStatus, viewType, enableDebug]);

  const metadata = useMemo(() => {
    if (!transformedData) return {};
    
    if (transformedData.shifts) {
      // Multiple shifts
      return {
        totalShifts: transformedData.shifts.length,
        hasOpenShifts: transformedData.shifts.some(s => s.statusInfo?.isOpen || s.isOpen),
        hasVariances: transformedData.shifts.some(s => s.quality?.hasVariance || s.hasVariance),
        ...transformedData.metadata
      };
    } else {
      // Single shift
      return {
        isOpen: transformedData.statusInfo?.isOpen || false,
        hasVariance: transformedData.quality?.hasVariance || false,
        hasDiscrepancies: transformedData.quality?.hasDiscrepancies || false
      };
    }
  }, [transformedData]);

  return {
    data: transformedData,
    raw: includeRaw ? rawShiftData : undefined,
    isEmpty: !transformedData || 
             (transformedData.shifts && transformedData.shifts.length === 0) ||
             (!transformedData.shifts && !transformedData.id),
    metadata,
    viewType
  };
};

// Utility hooks for common patterns
export const useShiftList = (rawShiftData, options = {}) => {
  return useShiftStructure(rawShiftData, { ...options, viewType: VIEW_TYPES.LIST });
};

export const useShiftDashboard = (rawShiftData, options = {}) => {
  return useShiftStructure(rawShiftData, { ...options, viewType: VIEW_TYPES.DASHBOARD });
};

export const useShiftSummary = (rawShiftData, options = {}) => {
  return useShiftStructure(rawShiftData, { ...options, viewType: VIEW_TYPES.SUMMARY });
};

export const useSingleShift = (rawShiftData, options = {}) => {
  const result = useShiftStructure(rawShiftData, options);
  
  // If it's multiple shifts but we want single, take the first one
  if (result?.data?.shifts) {
    return {
      ...result,
      data: result.data.shifts[0] || null
    };
  }
  
  return result;
};

// Hook for filtering and searching shifts
export const useShiftFilter = (rawShiftData, filters = {}, options = {}) => {
  const { data, ...rest } = useShiftStructure(rawShiftData, options);
  
  const filteredData = useMemo(() => {
    if (!data || !data.shifts) return data;

    let filteredShifts = data.shifts;

    // Apply status filter
    if (filters.status && filters.status !== 'ALL') {
      filteredShifts = filteredShifts.filter(shift => 
        shift.status === filters.status
      );
    }

    // Apply station filter
    if (filters.stationId) {
      filteredShifts = filteredShifts.filter(shift => 
        shift.station?.id === filters.stationId
      );
    }

    // Apply date range filter
    if (filters.startDate) {
      filteredShifts = filteredShifts.filter(shift => 
        new Date(shift.startTime) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filteredShifts = filteredShifts.filter(shift => 
        new Date(shift.startTime) <= new Date(filters.endDate)
      );
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredShifts = filteredShifts.filter(shift =>
        shift.shiftNumber.toString().includes(searchLower) ||
        shift.station?.name?.toLowerCase().includes(searchLower) ||
        shift.supervisor?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply variance filter
    if (filters.hasVariance !== undefined) {
      filteredShifts = filteredShifts.filter(shift => 
        shift.quality?.hasVariance === filters.hasVariance
      );
    }

    return {
      ...data,
      shifts: filteredShifts,
      filteredCount: filteredShifts.length
    };
  }, [data, filters]);

  return {
    ...rest,
    data: filteredData,
    filterStats: {
      originalCount: data?.shifts?.length || 0,
      filteredCount: filteredData?.shifts?.length || 0,
      filterApplied: Object.keys(filters).length > 0
    }
  };
};