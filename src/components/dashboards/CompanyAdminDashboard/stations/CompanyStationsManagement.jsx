import React, { useState, useEffect } from 'react';
import { Building2, Plus, Eye, Edit, RefreshCw, Trash2, Mail, Phone, Calendar, MapPin } from 'lucide-react';
import { Button } from '../../../../components/ui';
import { useApp } from '../../../../context/AppContext';
import { stationService } from '../../../../services/stationService/stationService';
import CreateStationsModal from './CreateStationsModal';

const CompanyStationsManagement = () => {
  const { state, dispatch } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);

  // Fetch stations from the backend
  const fetchStations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Determine which API to call based on user role
      let response;
      if (state.currentUser?.role === 'superadmin') {
        // Superadmin can view all stations
        response = await stationService.getCompanyStations();
      } else {
        // Regular users only see their company's stations
        response = await stationService.getCompanyStations();
      }
      
      // Handle the response format
      const stationsData = response.success ? response.data : response;
      
      if (!Array.isArray(stationsData)) {
        throw new Error('Invalid response format from server');
      }
      
      // Transform the backend response
      const transformedStations = stationsData.map(station => ({
        id: station.id,
        name: station.name,
        location: station.location,
        companyId: station.companyId,
        createdAt: station.createdAt,
        updatedAt: station.updatedAt,
        warehousesCount: station.warehouses ? station.warehouses.length : 0,
        companyName: station.companyId // You might want to fetch company names separately
      }));
      
      // Update global state
      dispatch({ type: 'SET_STATIONS', payload: transformedStations });
      
    } catch (error) {
      console.error('Failed to fetch stations:', error);
      setError(error.message || 'Failed to fetch stations');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a station
  const handleDeleteStation = async (stationId) => {
    try {
      setDeletingId(stationId);
      const response = await stationService.deleteStation(stationId);
      
      // Handle the response format
      const isSuccess = response.success;
      
      if (isSuccess) {
        // Remove station from state
        dispatch({ type: 'DELETE_STATION', payload: stationId });
      } else {
        throw new Error(response.message || 'Failed to delete station');
      }
    } catch (error) {
      console.error('Failed to delete station:', error);
      alert(error.message || 'Failed to delete station');
    } finally {
      setDeletingId(null);
    }
  };

  // Confirm before deleting
  const confirmDelete = (station) => {
    if (window.confirm(`Are you sure you want to delete ${station.name}? This action cannot be undone.`)) {
      handleDeleteStation(station.id);
    }
  };

  // Handle creating a new station
  const handleCreateStation = () => {
    setEditingStation(null);
    setIsCreateModalOpen(true);
  };

  // Handle editing a station
  const handleEditStation = (station) => {
    setEditingStation(station);
    setIsCreateModalOpen(true);
  };

  // Close the modal
  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingStation(null);
  };

  useEffect(() => {
    fetchStations();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Use serviceStations from state instead of stations
  const stations = state.serviceStations || [];

  console.log("stations be ",stations)

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="mt-2 text-gray-600">Loading stations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-600">
              <p className="font-medium">Error loading stations</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <Button 
            onClick={fetchStations} 
            variant="secondary" 
            size="sm" 
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Station Management</h3>
            <p className="text-gray-600">Manage all stations in your company</p>
          </div>
          <Button onClick={handleCreateStation} icon={Plus} variant="cosmic">
            Create New Station
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Station Management</h3>
          <p className="text-sm text-gray-600">Manage all stations in your company</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={fetchStations} 
            variant="secondary" 
            icon={RefreshCw}
            size="sm"
          >
            Refresh
          </Button>
          <Button onClick={handleCreateStation} icon={Plus} variant="cosmic" size="sm">
            New Station
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Station</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Location</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Warehouses</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stations.map(station => (
                <tr key={station.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{station.name}</div>
                        <div className="text-xs text-gray-500 truncate">{station.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {station.location ? (
                      <div className="flex items-center text-gray-700 text-sm">
                        <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                        <span className="truncate">{station.location}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No location set</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {station.warehousesCount} warehouses
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center text-gray-500 text-xs">
                      <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                      {formatDate(station.createdAt)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-1">
                      <Button 
                        size="xs" 
                        variant="secondary" 
                        icon={Eye}
                        onClick={() => console.log('View station:', station.id)}
                      />
                      <Button 
                        size="xs" 
                        variant="secondary" 
                        icon={Edit}
                        onClick={() => handleEditStation(station)}
                      />
                      <Button 
                        size="xs" 
                        variant="danger" 
                        icon={Trash2}
                        loading={deletingId === station.id}
                        onClick={() => confirmDelete(station)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {stations.length === 0 && (
          <div className="text-center py-8">
            <Building2 className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No stations found</p>
            <Button 
              onClick={handleCreateStation} 
              variant="cosmic" 
              size="sm"
              className="mt-3"
            >
              Create Your First Station
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Station Modal */}
      <CreateStationsModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        editingStation={editingStation}
      />
    </div>
  );
};

export default CompanyStationsManagement;