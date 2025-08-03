import React, { useState } from 'react';
import { Plus, MapPin, User, Phone, DollarSign } from 'lucide-react';
import { Modal, Input, Button } from '../../../ui';
import { useStationOperations } from '../hooks/useStationOperations';

const CreateStationModal = ({ isOpen, onClose }) => {
  const [stationData, setStationData] = useState({
    name: '',
    location: '',
    type: 'urban',
    manager: '',
    managerEmail: '',
    phone: '',
    dailyTarget: ''
  });
  
  const { createStation, isProcessing, error } = useStationOperations();

  const handleCreate = async () => {
    try {
      const newStation = {
        ...stationData,
        dailyTarget: Number(stationData.dailyTarget),
        status: 'active',
        companyId: 'COMP_001', // Default company ID
        gps: { lat: 0, lng: 0 },
        monthlyTarget: Number(stationData.dailyTarget) * 30,
        establishedDate: new Date().toISOString().split('T')[0]
      };
      
      await createStation(newStation);
      onClose();
      
      // Reset form
      setStationData({
        name: '',
        location: '',
        type: 'urban',
        manager: '',
        managerEmail: '',
        phone: '',
        dailyTarget: ''
      });
    } catch (err) {
      console.error('Station creation failed:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Service Station"
      size="lg"
      actions={[
        <Button 
          key="create" 
          onClick={handleCreate} 
          variant="success" 
          icon={Plus}
          disabled={isProcessing}
        >
          {isProcessing ? 'Creating...' : 'Create Station'}
        </Button>,
        <Button key="cancel" onClick={onClose} variant="secondary" disabled={isProcessing}>
          Cancel
        </Button>
      ]}
    >
      <div className="space-y-6">
        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Station Name"
            value={stationData.name}
            onChange={(e) => setStationData({...stationData, name: e.target.value})}
            placeholder="e.g., Joska Service Station"
            required
          />
          <Input
            label="Location"
            value={stationData.location}
            onChange={(e) => setStationData({...stationData, location: e.target.value})}
            placeholder="e.g., Joska, Machakos Road"
            icon={MapPin}
            required
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Station Type <span className="text-red-500">*</span>
            </label>
            <select
              value={stationData.type}
              onChange={(e) => setStationData({...stationData, type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="urban">Urban Station</option>
              <option value="highway">Highway Station</option>
              <option value="suburban">Suburban Station</option>
              <option value="truck_stop">Truck Stop</option>
            </select>
          </div>
          <Input
            label="Daily Target (KSH)"
            type="number"
            value={stationData.dailyTarget}
            onChange={(e) => setStationData({...stationData, dailyTarget: e.target.value})}
            placeholder="400000"
            icon={DollarSign}
            required
          />
          <Input
            label="Station Manager"
            value={stationData.manager}
            onChange={(e) => setStationData({...stationData, manager: e.target.value})}
            placeholder="Manager Name"
            icon={User}
            required
          />
          <Input
            label="Manager Email"
            type="email"
            value={stationData.managerEmail}
            onChange={(e) => setStationData({...stationData, managerEmail: e.target.value})}
            placeholder="manager@company.com"
            required
          />
          <Input
            label="Phone Number"
            value={stationData.phone}
            onChange={(e) => setStationData({...stationData, phone: e.target.value})}
            placeholder="+254 XXX XXX XXX"
            icon={Phone}
            required
          />
        </div>
      </div>
    </Modal>
  );
};

export default CreateStationModal;