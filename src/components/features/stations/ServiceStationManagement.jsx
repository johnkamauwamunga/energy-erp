import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import { useStations } from './hooks/useStations';
import CreateStationModal from './components/CreateStationModal';
import StationCard from './components/StationCard';

const ServiceStationManagement = () => {
  const { state } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { stations, loading, error } = useStations();

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-gray-500">Loading stations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-500 p-4 rounded-lg">
          Error loading stations: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Service Station Management</h3>
          <p className="text-gray-600">Manage all service stations and their operations</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} icon={Plus} variant="cosmic">
          Add New Station
        </Button>
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map(station => {
          const islandCount = Object.values(state.islands).filter(
            island => island.stationId === station.id
          ).length;
          
          return (
            <StationCard 
              key={station.id} 
              station={station} 
              islandCount={islandCount}
            />
          );
        })}
      </div>

      <CreateStationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

export default ServiceStationManagement;