// src/components/shift/CreateShiftModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Card, Input, Table } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { Plus, X, User, MapPin, Clock, UserCheck, Package } from 'lucide-react';
import clsx from 'clsx';

const CreateShiftModal = ({ onClose }) => {
  const { state, dispatch } = useApp();
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [nonFuelItems, setNonFuelItems] = useState({});
  const [shiftDetails, setShiftDetails] = useState({
    startTime: new Date().toISOString().slice(0, 16),
    endTime: '',
    supervisorId: ''
  });
  const [selectedAttendantIds, setSelectedAttendantIds] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [openingStock, setOpeningStock] = useState('');
  
  // Get current station
  const currentStation = state.currentStation?.id;
  
  // Filter islands by current station
  const stationIslands = state.islands.filter(
    island => island.stationId === currentStation
  );
  
  // Get available attendants
  const availableAttendants = state.staff.attendants.filter(attendant => 
    attendant.stationId === currentStation &&
    !state.shifts.some(shift => 
      shift.status === 'open' && 
      shift.islands.some(i => 
        i.attendants.includes(attendant.id)
      )
    )
  );

  // Get assigned attendant IDs
  const assignedAttendantIds = new Set(
    Object.values(assignments).flatMap(arr => arr)
  );

  // Get warehouse for current station
  const warehouse = state.warehouses.find(
    wh => wh.stationId === currentStation
  );
  
  // Get non-fuel items from warehouse
  const warehouseItems = warehouse?.nonFuelItems || [];

  // Set default end time
  useEffect(() => {
    const endTime = new Date(new Date().setHours(23, 59, 0)).toISOString().slice(0, 16);
    setShiftDetails(prev => ({ ...prev, endTime }));
  }, []);

  // Handle island selection
  const handleSelectIsland = (islandId) => {
    setSelectedIsland(stationIslands.find(i => i.id === islandId));
  };

  // Handle attendant selection
  const toggleAttendantSelection = (attendantId) => {
    setSelectedAttendantIds(prev => 
      prev.includes(attendantId) 
        ? prev.filter(id => id !== attendantId) 
        : [...prev, attendantId]
    );
  };

  // Assign attendants to island
  const assignToIsland = () => {
    if (!selectedIsland || selectedAttendantIds.length === 0) return;
    
    setAssignments(prev => ({
      ...prev,
      [selectedIsland.id]: [
        ...(prev[selectedIsland.id] || []),
        ...selectedAttendantIds
      ]
    }));
    
    setSelectedAttendantIds([]);
  };

  // Handle item assignment
  const assignItemToIsland = () => {
    if (!selectedIsland || !selectedItemId || !openingStock) return;
    
    const item = warehouseItems.find(i => i.itemId === selectedItemId);
    if (!item) return;
    
    const newAssignment = {
      itemId: selectedItemId,
      name: item.name,
      price: item.sellingPrice,
      openingStock: parseInt(openingStock, 10)
    };
    
    setNonFuelItems(prev => ({
      ...prev,
      [selectedIsland.id]: [
        ...(prev[selectedIsland.id] || []),
        newAssignment
      ]
    }));
    
    setSelectedItemId('');
    setOpeningStock('');
  };

  // Remove assignment
  const removeAssignment = (islandId, attendantId) => {
    setAssignments(prev => ({
      ...prev,
      [islandId]: prev[islandId].filter(id => id !== attendantId)
    }));
  };

  // Remove item assignment
  const removeItemAssignment = (islandId, itemId) => {
    setNonFuelItems(prev => ({
      ...prev,
      [islandId]: prev[islandId].filter(item => item.itemId !== itemId)
    }));
  };

  // Create shift
  const createShift = () => {
    const shiftId = `SHIFT_${Date.now()}`;
    
    const shift = {
      id: shiftId,
      stationId: currentStation,
      warehouseId: warehouse?.id,
      supervisorId: shiftDetails.supervisorId,
      status: 'open',
      startTime: shiftDetails.startTime,
      endTime: shiftDetails.endTime,
      islands: Object.keys(assignments).map(islandId => ({
        islandId,
        attendants: assignments[islandId],
        nonFuelItems: nonFuelItems[islandId] || [],
        fuelPumps: state.assets.pumps
          .filter(pump => pump.islandId === islandId)
          .map(pump => ({
            pumpId: pump.id,
            openingCash: 0,
            openingManual: 0,
            openingElectric: 0
          }))
      }))
    };
    
    dispatch({ type: 'ADD_SHIFT', payload: shift });
    onClose();
  };

  const hasAssignments = Object.keys(assignments).length > 0;
  const isFormValid = hasAssignments && 
                     shiftDetails.startTime && 
                     shiftDetails.endTime && 
                     shiftDetails.supervisorId;

  return (
    <Modal isOpen={true} onClose={onClose} title="Create New Shift" size="2xl">
      <div className="space-y-6">
        {/* Island Selection */}
        <Card title="1. Select Allocation Point">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Service Island"
              options={[
                { value: '', label: 'Select an island' },
                ...stationIslands.map(island => ({
                  value: island.id,
                  label: island.name
                }))
              ]}
              value={selectedIsland?.id || ''}
              onChange={(e) => handleSelectIsland(e.target.value)}
              icon={MapPin}
            />
            
            {selectedIsland && (
              <div className="flex items-end">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex-1">
                  <div className="text-sm text-blue-700">Selected Island</div>
                  <div className="font-medium">{selectedIsland.name}</div>
                </div>
              </div>
            )}
          </div>
        </Card>
        
        {/* Attendant Assignment */}
        {selectedIsland && (
          <Card title="2. Assign Attendants">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Available Attendants */}
              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Available Attendants ({availableAttendants.length})
                </h3>
                
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                  {availableAttendants.filter(a => !assignedAttendantIds.has(a.id)).map(attendant => (
                    <div 
                      key={attendant.id}
                      className={clsx(
                        "p-3 rounded-lg border transition-all cursor-pointer",
                        selectedAttendantIds.includes(attendant.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => toggleAttendantSelection(attendant.id)}
                    >
                      <div className="font-medium">{attendant.name}</div>
                      <div className="text-sm text-gray-600">{attendant.email}</div>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={assignToIsland}
                  disabled={selectedAttendantIds.length === 0}
                  className="mt-4 w-full"
                  icon={Plus}
                >
                  Assign to {selectedIsland.name}
                </Button>
              </div>
              
              {/* Current Assignments */}
              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Current Assignments
                </h3>
                
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {Object.entries(assignments).map(([islandId, attendantIds]) => {
                    const island = stationIslands.find(i => i.id === islandId);
                    return (
                      <div key={islandId} className="border rounded-lg overflow-hidden">
                        <div className="bg-blue-50 px-3 py-2 font-medium border-b">
                          {island?.name || 'Unknown Island'}
                        </div>
                        <div className="divide-y">
                          {attendantIds.map(attendantId => {
                            const attendant = state.staff.attendants.find(a => a.id === attendantId);
                            return (
                              <div key={attendantId} className="px-3 py-2 flex justify-between items-center">
                                <div>
                                  <div className="font-medium">{attendant?.name}</div>
                                  <div className="text-sm text-gray-600">{attendant?.email}</div>
                                </div>
                                <button 
                                  onClick={() => removeAssignment(islandId, attendantId)}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        )}
        
        {/* Non-Fuel Items Section */}
        {selectedIsland && (
          <Card title="3. Restock Non-Fuel Items">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item Selection */}
              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Warehouse Inventory
                </h3>
                
                <div className="space-y-4">
                  <Select
                    label="Select Item"
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    options={[
                      { value: '', label: 'Select an item' },
                      ...warehouseItems.map(item => ({
                        value: item.itemId,
                        label: `${item.name} (Stock: ${item.currentStock})`
                      }))
                    ]}
                  />
                  
                  {selectedItemId && (
                    <>
                      <Input
                        label="Quantity to Restock"
                        type="number"
                        placeholder="Enter quantity"
                        value={openingStock}
                        onChange={(e) => setOpeningStock(e.target.value)}
                        min="1"
                        max={warehouseItems.find(i => i.itemId === selectedItemId)?.currentStock || 0}
                      />
                      <div className="text-sm text-gray-500">
                        Max available: {warehouseItems.find(i => i.itemId === selectedItemId)?.currentStock || 0}
                      </div>
                    </>
                  )}
                  
                  <Button
                    onClick={assignItemToIsland}
                    disabled={!selectedItemId || !openingStock}
                    className="w-full mt-2"
                    icon={Plus}
                  >
                    Add to {selectedIsland.name}
                  </Button>
                </div>
              </div>
              
              {/* Current Assignments */}
              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Island Restock List
                </h3>
                
                <div className="max-h-72 overflow-y-auto pr-2">
                  {nonFuelItems[selectedIsland.id]?.length > 0 ? (
                    <Table
                      columns={[
                        { header: 'Product', accessor: 'name' },
                        { header: 'Quantity', accessor: 'quantity' },
                        { header: 'Actions', accessor: 'actions' }
                      ]}
                      data={nonFuelItems[selectedIsland.id].map(item => ({
                        name: item.name,
                        quantity: item.openingStock,
                        actions: (
                          <button 
                            onClick={() => removeItemAssignment(selectedIsland.id, item.itemId)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )
                      }))}
                    />
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No items added yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
        
        {/* Shift Details */}
        <Card title="4. Schedule Shift">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Start Time"
              type="datetime-local"
              value={shiftDetails.startTime}
              onChange={e => setShiftDetails({
                ...shiftDetails,
                startTime: e.target.value
              })}
              icon={Clock}
            />
            
            <Input
              label="End Time"
              type="datetime-local"
              value={shiftDetails.endTime}
              onChange={e => setShiftDetails({
                ...shiftDetails,
                endTime: e.target.value
              })}
              icon={Clock}
            />
            
            <Select
              label="Supervisor In Charge"
              value={shiftDetails.supervisorId}
              onChange={e => setShiftDetails({
                ...shiftDetails,
                supervisorId: e.target.value
              })}
              options={[
                { value: '', label: 'Select Supervisor' },
                ...state.staff.supervisors
                  .filter(s => s.stationId === currentStation)
                  .map(supervisor => ({
                    value: supervisor.id,
                    label: supervisor.name
                  }))
              ]}
              icon={User}
            />
          </div>
        </Card>
        
        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={createShift}
            disabled={!isFormValid}
          >
            Open Shift
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateShiftModal;