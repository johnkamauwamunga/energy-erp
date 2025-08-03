import { useState } from 'react';
import { useApp } from '../../../../context/AppContext';
import { createStation, updateStation } from '../services/StationService';

export const useStationOperations = () => {
  const { dispatch } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateStation = async (stationData) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const newStation = await createStation(stationData);
      dispatch({ type: 'ADD_STATION', payload: newStation });
      return newStation;
    } catch (err) {
      setError(err.message || 'Failed to create station');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateStation = async (stationId, updates) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const updatedStation = await updateStation(stationId, updates);
      dispatch({ type: 'UPDATE_STATION', payload: updatedStation });
      return updatedStation;
    } catch (err) {
      setError(err.message || 'Failed to update station');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    createStation: handleCreateStation,
    updateStation: handleUpdateStation,
    isProcessing,
    error
  };
};