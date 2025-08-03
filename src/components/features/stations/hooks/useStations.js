import { useEffect, useState } from 'react';
import { useApp } from '../../../../context/AppContext';
import { fetchStations } from '../services/StationService';

export const useStations = () => {
  const { state } = useApp();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStations = async () => {
      try {
        setLoading(true);
        const companyId = state.currentCompany?.id;
        if (companyId) {
          const data = await fetchStations(companyId);
          setStations(data);
        } else {
          setStations(state.serviceStations);
        }
      } catch (err) {
        setError(err.message || 'Failed to load stations');
      } finally {
        setLoading(false);
      }
    };

    loadStations();
  }, [state.currentCompany, state.serviceStations]);

  return { stations, loading, error, refresh: loadStations };
};