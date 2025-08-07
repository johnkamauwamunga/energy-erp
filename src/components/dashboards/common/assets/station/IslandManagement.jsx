import React, { useState } from 'react';
import { Button, Card, Table, Modal, Input, Select, Badge } from '../../../../ui';
import { useApp, useAppDispatch } from '../../../../../context/AppContext';
import { formatDate } from '../../../../../helpersutils/helpers';
import { Plus, Edit, Trash, MapPin, X } from 'lucide-react';

const IslandManagement = () => {
  const { state } = useApp();
  const dispatch = useAppDispatch();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingIsland, setEditingIsland] = useState(null);
  const [selectedStation, setSelectedStation] = useState(state.currentStation?.id || '');
  
  // Filter islands by current context (company or station)
  const filteredIslands = state.islands.filter(island => {
    if (state.currentCompany && !state.currentStation) {
      return island.companyId === state.currentCompany.id;
    }
    if (state.currentStation) {
      return island.stationId === state.currentStation.id;
    }
    return true;
  });
  
  // Get stations for dropdown
  const stationsOptions = state.serviceStations
    .filter(station => !state.currentCompany || station.companyId === state.currentCompany.id)
    .map(station => ({
      value: station.id,
      label: station.name
    }));
  
  // Handle create/update island
  const handleSubmitIsland = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const islandData = Object.fromEntries(formData.entries());
    
    const newIsland = {
      ...islandData,
      id: editingIsland?.id || `ISL_${Date.now()}`,
      companyId: state.currentCompany?.id || '',
      createdAt: editingIsland?.createdAt || new Date().toISOString()
    };
    
    if (editingIsland) {
      dispatch({ type: 'UPDATE_ISLAND', payload: newIsland });
    } else {
      dispatch({ type: 'ADD_ISLAND', payload: newIsland });
    }
    
    setIsCreateModalOpen(false);
    setEditingIsland(null);
  };
  
  // Handle delete island
  const handleDeleteIsland = (islandId) => {
    if (window.confirm('Are you sure you want to delete this island? This action cannot be undone.')) {
      dispatch({ type: 'DELETE_ISLAND', payload: islandId });
    }
  };
  
  // Table columns
  const columns = [
    { 
      header: 'Name', 
      accessor: 'name',
      cellClassName: 'font-medium'
    },
    { 
      header: 'Station', 
      accessor: 'station',
      render: (value) => value || <span className="text-gray-400">Unassigned</span>
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (value) => (
        <Badge 
          variant={value === 'active' ? 'success' : 'default'}
          className="capitalize"
        >
          {value}
        </Badge>
      )
    },
    { 
      header: 'Created', 
      accessor: 'createdAt',
      render: (value) => formatDate(value)
    },
    { 
      header: 'Actions', 
      render: (_, island) => (
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => {
              setEditingIsland(island);
              setIsCreateModalOpen(true);
            }}
            icon={Edit}
          />
          <Button 
            size="sm" 
            variant="destructive"
            onClick={() => handleDeleteIsland(island.id)}
            icon={Trash}
          />
        </div>
      )
    }
  ];
  
  // Prepare table data
  const tableData = filteredIslands.map(island => {
    const station = state.serviceStations.find(s => s.id === island.stationId);
    return {
      ...island,
      station: station?.name || '',
      status: 'active' // Default status for now
    };
  });

  return (
    <Card 
      title="Island Management" 
      icon={MapPin}
      actions={
        <div className="flex items-center space-x-3">
          <Select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            options={[
              { value: '', label: 'All Stations' },
              ...stationsOptions
            ]}
            className="w-48"
          />
          <Button 
            variant="cosmic"
            onClick={() => setIsCreateModalOpen(true)}
            icon={Plus}
          >
            Add Island
          </Button>
        </div>
      }
    >
      <Table
        columns={columns}
        data={tableData}
        emptyMessage={
          <div className="text-center py-10">
            <div className="text-gray-500 mb-2">No islands found</div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Your First Island
            </Button>
          </div>
        }
      />
      
      {/* Create/Edit Island Modal */}
      {isCreateModalOpen && (
        <Modal 
          isOpen={true} 
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingIsland(null);
          }} 
          title={editingIsland ? "Edit Island" : "Create New Island"}
        >
          <form onSubmit={handleSubmitIsland}>
            <div className="space-y-4">
              <Input
                label="Island Name"
                name="name"
                defaultValue={editingIsland?.name || ''}
                placeholder="e.g., Island A"
                required
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Island Code"
                  name="code"
                  defaultValue={editingIsland?.code || ''}
                  placeholder="e.g., ISL-A"
                />
                
                <Select
                  label="Status"
                  name="status"
                  defaultValue={editingIsland?.status || 'active'}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'maintenance', label: 'Maintenance' }
                  ]}
                />
              </div>
              
              <Select
                label="Service Station"
                name="stationId"
                defaultValue={editingIsland?.stationId || state.currentStation?.id || ''}
                options={[
                  { value: '', label: 'Select Station' },
                  ...stationsOptions
                ]}
                required
              />
              
              <Input
                label="Description"
                name="description"
                defaultValue={editingIsland?.description || ''}
                placeholder="Brief description of the island"
                as="textarea"
                rows={3}
              />
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="secondary" 
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingIsland(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingIsland ? 'Update Island' : 'Create Island'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
};

export default IslandManagement;