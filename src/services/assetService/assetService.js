// services/assetService.js
import { apiService } from '../apiService';

export const assetService = {
  // Get all assets for current company
  getAssets: async () => {
    const response = await apiService.get('/assets');
    return response.data;
  },

  // Create a new asset
  createAsset: async (assetData) => {
    const response = await apiService.post('/assets', assetData);
    return response.data;
  },

  // Update asset
  updateAsset: async (id, assetData) => {
    const response = await apiService.put(`/assets/${id}`, assetData);
    return response.data;
  },

  // Delete asset
  deleteAsset: async (id) => {
    const response = await apiService.delete(`/assets/${id}`);
    return response.data;
  },

  // Assign asset to station
  assignToStation: async (id, stationId) => {
    const response = await apiService.post(`/assets/${id}/assign`, { stationId });
    return response.data;
  },

  // Remove asset from station
  removeFromStation: async (id) => {
    const response = await apiService.post(`/assets/${id}/unassign`);
    return response.data;
  }
};