// hooks/useShift.js
import { useState, useEffect, useCallback } from 'react';
import { shiftService } from '../services/shiftService/shiftService';
import { useApp } from '../context/AppContext';

export const useShift = (stationId) => {
  const { state: appState } = useApp();
  
  const [currentShift, setCurrentShift] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ==================== SHIFT OPERATIONS ====================

  // Check for active shift via API
  const checkActiveShift = useCallback(async () => {
    if (!stationId) return null;

    try {
      console.log('🔍 Checking for active shift...');
      
      // Try to get open shift with full details
      try {
        const result = await shiftService.getOpenShiftFullDetails(stationId);
        if (result?.data?.hasOpenShift) {
          console.log('✅ Active shift found:', result.data.shift.shiftNumber);
          const shift = result.data.shift;
          setCurrentShift(shift);
          return shift;
        }
      } catch (apiError) {
        console.log('⚠️ No active shift via full details API:', apiError.message);
      }

      // Fallback: Try basic open shift endpoint
      try {
        const result = await shiftService.getOpenShift(stationId);
        if (result?.data) {
          console.log('✅ Active shift found via basic endpoint:', result.data.shiftNumber);
          const shift = result.data;
          setCurrentShift(shift);
          return shift;
        }
      } catch (basicError) {
        console.log('⚠️ No active shift via basic API');
      }

      return null;
    } catch (err) {
      console.error('❌ Error checking active shift:', err);
      return null;
    }
  }, [stationId]);

  // ==================== SHIFT CREATION ====================

  const createShift = async (payload) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Creating shift...', payload);
      const result = await shiftService.createShift(payload);
      console.log('✅ Shift created:', result);
      
      const shift = result.data?.shift || result.shift || result.data;
      
      if (shift?.id) {
        setCurrentShift(shift);
        return shift;
      } else {
        throw new Error('No valid shift returned from API');
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to create shift';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ==================== SHIFT OPENING ====================

  const openShift = async (openShiftPayload) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Opening shift with payload:', openShiftPayload);

      // Call the service with the prepared payload
      const result = await shiftService.openShift(openShiftPayload.shiftId, openShiftPayload);
      console.log('✅ Shift opened successfully:', result);
      
      // Update current shift with opened status
      if (result.data) {
        setCurrentShift(prev => ({
          ...prev,
          status: 'OPEN',
          ...result.data
        }));
      }
      
      return result;
    } catch (err) {
      const errorMsg = err.message || 'Failed to open shift';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ==================== SHIFT CLOSING ====================

  const closeShift = async (closeShiftPayload) => {
    try {
      setLoading(true);
      setError(null);

      if (!closeShiftPayload?.shiftId) {
        throw new Error('No shift ID provided for closing');
      }

      console.log('🔚 Closing shift with payload:', closeShiftPayload);
      const result = await shiftService.closeShift(closeShiftPayload.shiftId, closeShiftPayload);
      console.log('✅ Shift closed successfully:', result);
      
      // Clear current shift after successful closure
      setCurrentShift(null);
      
      return result;
    } catch (err) {
      const errorMsg = err.message || 'Failed to close shift';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ==================== ASSET DATA FOR READINGS ====================

  /**
   * Get all pumps for station with last readings
   */
  const getStationPumpsWithReadings = useCallback(async () => {
    if (!stationId) {
      console.log('⚠️ No station ID provided');
      return [];
    }

    try {
      console.log('⛽ Getting station pumps with readings...');
      const result = await shiftService.getStationPumpsWithLastEndReadings(stationId);
      
      if (result?.data?.pumps) {
        const pumps = result.data.pumps.map(item => ({
          id: item.pump?.id,
          name: item.pump?.name,
          stationLabel: item.pump?.stationLabel,
          product: item.pump?.product,
          island: item.pump?.island,
          tank: item.pump?.tank,
          lastEndReading: item.lastEndReading,
          hasPreviousReading: !!item.lastEndReading
        }));

        console.log(`✅ Found ${pumps.length} pumps for station`);
        return pumps;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to get station pumps:', error);
      setError(`Failed to load station pumps: ${error.message}`);
      return [];
    }
  }, [stationId]);

  /**
   * Get all tanks for station with last readings
   */
  const getStationTanksWithReadings = useCallback(async () => {
    if (!stationId) {
      console.log('⚠️ No station ID provided');
      return [];
    }

    try {
      console.log('🛢️ Getting station tanks with readings...');
      const result = await shiftService.getStationTanksWithLastEndReadings(stationId);
      
      if (result?.data?.tanks) {
        const tanks = result.data.tanks.map(item => ({
          id: item.tank?.id,
          name: item.tank?.name,
          stationLabel: item.tank?.stationLabel,
          product: item.tank?.product,
          capacity: item.tank?.capacity,
          pumps: item.tank?.pumps,
          lastEndReading: item.lastEndReading,
          hasPreviousReading: !!item.lastEndReading
        }));

        console.log(`✅ Found ${tanks.length} tanks for station`);
        return tanks;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to get station tanks:', error);
      setError(`Failed to load station tanks: ${error.message}`);
      return [];
    }
  }, [stationId]);

  // ==================== UTILITY FUNCTIONS ====================

  const clearShift = useCallback(() => {
    setCurrentShift(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==================== STATUS CHECKERS ====================

  const canOpenShift = useCallback((wizardData) => {
    if (!wizardData?.shiftInfo?.shiftId) return false;
    
    return wizardData.personnel.islandAssignments?.length > 0 &&
           wizardData.readings.pumpReadings?.length > 0 &&
           wizardData.readings.tankReadings?.length > 0;
  }, []);

  const getShiftStatus = useCallback(() => {
    if (!currentShift) return 'NO_SHIFT';
    return currentShift.status;
  }, [currentShift]);

  // Initialize - check for existing active shift
  useEffect(() => {
    const initialize = async () => {
      if (stationId) {
        await checkActiveShift();
      }
    };
    
    initialize();
  }, [stationId, checkActiveShift]);

  return {
    // State
    currentShift,
    loading,
    error,
    
    // Core Operations
    createShift,
    openShift,
    closeShift,
    checkActiveShift,
    
    // Asset Data Management
    getStationPumpsWithReadings,
    getStationTanksWithReadings,
    
    // Utility Functions
    clearShift,
    clearError,
    
    // Status Checkers
    canOpenShift,
    getShiftStatus
  };
};