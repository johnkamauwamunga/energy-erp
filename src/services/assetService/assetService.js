import { apiService } from '../apiService';

export const assetService = {
  // Get assets based on user role (main endpoint)
  getAssets: async () => {
    console.log('🔄 [AssetService] Fetching assets based on user role...');
    
    try {
      const response = await apiService.get('/assets');
      console.log('✅ [AssetService] API response received');
      
      if (response.data && response.data.success) {
        console.log('✅ [AssetService] Assets loaded successfully, count:', response.data.data.length);
        return response.data.data;
      } else {
        console.warn('⚠️ [AssetService] Unexpected response structure:', response.data);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ [AssetService] Error fetching assets:', error);
      
      if (error.response) {
        console.error('📊 [AssetService] Error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        if (error.response.status === 401) {
          // Token might be expired, clear it and redirect to login
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          throw new Error('Authentication failed. Please login again.');
        } else if (error.response.status === 403) {
          throw new Error('You do not have permission to access these resources');
        } else if (error.response.status === 404) {
          throw new Error('Assets endpoint not found. Please check the API URL.');
        }
      } else if (error.request) {
        console.error('🌐 [AssetService] Network error - no response received');
        throw new Error('Network error. Please check your connection and try again.');
      } else {
        console.error('⚙️ [AssetService] Request configuration error:', error.message);
        throw new Error('Failed to fetch assets. Please try again.');
      }
    }
  },

  // Get assets for a specific company (for admins)
  getCompanyAssets: async (companyId) => {
    console.log('🔄 [AssetService] Fetching company assets:', companyId);
    
    try {
      const response = await apiService.get(`/assets/company/${companyId}`);
      
      if (response.data && response.data.success) {
        console.log('✅ [AssetService] Company assets loaded successfully');
        return response.data.data;
      } else {
        console.warn('⚠️ [AssetService] Unexpected response structure:', response.data);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ [AssetService] Error fetching company assets:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch company assets');
    }
  },

  // Get assets for a specific station
  getStationAssets: async (stationId) => {
    console.log('🔄 [AssetService] Fetching station assets:', stationId);
    
    try {
      const response = await apiService.get(`/assets/station/${stationId}`);
      console.log('✅ [AssetService] API response received');
      
      if (response.data && response.data.success) {
        console.log('✅ [AssetService] Station assets loaded successfully, count:', response.data.data.length);
        return response.data.data;
      } else {
        console.warn('⚠️ [AssetService] Unexpected response structure:', response.data);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ [AssetService] Error fetching station assets:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch station assets');
    }
  },

  // Create a new asset
  createAsset: async (assetData) => {
    console.log('🔄 [AssetService] Creating asset:', assetData);
    try {
      const response = await apiService.post('/assets', assetData);
      
      if (response.data && response.data.success) {
        console.log('✅ [AssetService] Asset created successfully');
        return response.data.data;
      } else {
        console.warn('⚠️ [AssetService] Unexpected response structure:', response.data);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ [AssetService] Error creating asset:', error);
      
      if (error.response && error.response.data && error.response.data.errors) {
        // Handle validation errors from backend
        const errorMessages = error.response.data.errors.map(err => err.message).join(', ');
        throw new Error(`Validation failed: ${errorMessages}`);
      }
      
      throw new Error(error.response?.data?.message || 'Failed to create asset');
    }
  },

  // Get asset by ID
  getAssetById: async (id) => {
    console.log('🔄 [AssetService] Fetching asset by ID:', id);
    try {
      const response = await apiService.get(`/assets/${id}`);
      
      if (response.data && response.data.success) {
        console.log('✅ [AssetService] Asset loaded successfully');
        return response.data.data;
      } else {
        console.warn('⚠️ [AssetService] Unexpected response structure:', response.data);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ [AssetService] Error fetching asset:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch asset');
    }
  },

  // Update asset
  updateAsset: async (id, assetData) => {
    console.log('🔄 [AssetService] Updating asset:', id, assetData);
    try {
      const response = await apiService.put(`/assets/${id}`, assetData);
      
      if (response.data && response.data.success) {
        console.log('✅ [AssetService] Asset updated successfully');
        return response.data.data;
      } else {
        console.warn('⚠️ [AssetService] Unexpected response structure:', response.data);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ [AssetService] Error updating asset:', error);
      throw new Error(error.response?.data?.message || 'Failed to update asset');
    }
  },

  // Delete asset
  deleteAsset: async (id) => {
    console.log('🔄 [AssetService] Deleting asset:', id);
    try {
      const response = await apiService.delete(`/assets/${id}`);
      
      if (response.data && response.data.success) {
        console.log('✅ [AssetService] Asset deleted successfully');
        return response.data;
      } else {
        console.warn('⚠️ [AssetService] Unexpected response structure:', response.data);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ [AssetService] Error deleting asset:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete asset');
    }
  },

  // Assign asset to station
  assignToStation: async (id, stationId) => {
    console.log('🔄 [AssetService] Assigning asset to station:', id, stationId);
    try {
      const response = await apiService.patch(`/assets/${id}/assign`, { stationId });
      
      if (response.data && response.data.success) {
        console.log('✅ [AssetService] Asset assigned successfully');
        return response.data.data;
      } else {
        console.warn('⚠️ [AssetService] Unexpected response structure:', response.data);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ [AssetService] Error assigning asset:', error);
      throw new Error(error.response?.data?.message || 'Failed to assign asset');
    }
  },

  // Remove asset from station
  removeFromStation: async (id) => {
    console.log('🔄 [AssetService] Removing asset from station:', id);
    try {
      const response = await apiService.patch(`/assets/${id}/unassign`);
      
      if (response.data && response.data.success) {
        console.log('✅ [AssetService] Asset unassigned successfully');
        return response.data.data;
      } else {
        console.warn('⚠️ [AssetService] Unexpected response structure:', response.data);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ [AssetService] Error unassigning asset:', error);
      throw new Error(error.response?.data?.message || 'Failed to unassign asset');
    }
  },

  // Bulk assign assets to station
  bulkAssignToStation: async (assetIds, stationId) => {
    console.log('🔄 [AssetService] Bulk assigning assets to station:', assetIds, stationId);
    try {
      const response = await apiService.patch('/assets/bulk/assign', { assetIds, stationId });
      
      if (response.data && response.data.success) {
        console.log('✅ [AssetService] Assets bulk assigned successfully');
        return response.data.data;
      } else {
        console.warn('⚠️ [AssetService] Unexpected response structure:', response.data);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ [AssetService] Error bulk assigning assets:', error);
      throw new Error(error.response?.data?.message || 'Failed to bulk assign assets');
    }
  },

  // Bulk reassign assets between stations
  bulkReassignAssets: async (assetIds, fromStationId, toStationId) => {
    console.log('🔄 [AssetService] Bulk reassigning assets:', assetIds, fromStationId, toStationId);
    try {
      const response = await apiService.patch('/assets/bulk/reassign', { 
        assetIds, 
        fromStationId, 
        toStationId 
      });
      
      if (response.data && response.data.success) {
        console.log('✅ [AssetService] Assets bulk reassigned successfully');
        return response.data.data;
      } else {
        console.warn('⚠️ [AssetService] Unexpected response structure:', response.data);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ [AssetService] Error bulk reassigning assets:', error);
      throw new Error(error.response?.data?.message || 'Failed to bulk reassign assets');
    }
  }
};