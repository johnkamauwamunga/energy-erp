import { apiService } from '../apiService';

export const stationService = {
  // Create a station
  createStation: async (stationData) => {
    const response = await apiService.post('/stations/create', stationData);
    console.log("stations create response ",response);
    return response.data;
  },

  // Create multiple stations in bulk
  createBulkStations: async (stationsData) => {
    const response = await apiService.post('/stations/bulk', stationsData);
    return response.data;
  },

  // Get station details
  getStation: async (stationId) => {
    const response = await apiService.get(`/stations/${stationId}`);
    return response.data;
  },

  // Update station
  updateStation: async (stationId, stationData) => {
    const response = await apiService.put(`/stations/${stationId}`, stationData);
    return response.data;
  },

  // Delete station
  deleteStation: async (stationId) => {
    const response = await apiService.delete(`/stations/${stationId}`);
    return response.data;
  },

  // Get all stations for the current company (or all stations for superadmin)
  getCompanyStations: async () => {
    const response = await apiService.get('/stations');
    return response.data;
  },

  // Get stations by company ID (for superadmin)
  getStationsByCompanyId: async (companyId) => {
    const response = await apiService.get(`/stations/company/${companyId}`);
    return response.data;
  }
};