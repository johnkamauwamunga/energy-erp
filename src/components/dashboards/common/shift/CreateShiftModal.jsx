import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Card, Input, Table } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { Plus, X, User, MapPin, Clock, UserCheck, Package, Droplets } from 'lucide-react';
import clsx from 'clsx';

const CreateShiftModal = ({ onClose }) => {
  const { state, dispatch } = useApp();
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [nonFuelItems, setNonFuelItems] = useState({});
  const [tankReadings, setTankReadings] = useState({});
  const [pumpReadings, setPumpReadings] = useState({});
  
  const [shiftDetails, setShiftDetails] = useState({
    startTime: new Date().toISOString().slice(0, 16),
    endTime: '',
    supervisorId: '',
    priceListId: ''
  });
  
  const [selectedAttendantIds, setSelectedAttendantIds] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [openingStock, setOpeningStock] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: Island selection, 2: Attendant assignment, 3: Shift details
  
  // Get current station
  const currentStation = state.currentStation?.id;
  
  // Filter islands by current station
  const stationIslands = (state.islands || []).filter(
    island => island.stationId === currentStation
  );
  
  // Get available attendants
  const availableAttendants = (state.staff?.attendants || []).filter(attendant => 
    attendant.stationId === currentStation &&
    !(state.shifts || []).some(shift => 
      shift.status === 'open' && 
      (shift.attendants || []).some(a => a.id === attendant.id)
    )
  );

  // Get assigned attendant IDs
  const assignedAttendantIds = new Set(
    Object.values(assignments).flatMap(arr => arr || [])
  );

  // Get warehouse for current station
  const warehouse = (state.warehouses || []).find(
    wh => wh.stationId === currentStation
  );
  
  // Get non-fuel items from warehouse
  const warehouseItems = warehouse?.nonFuelItems || [];
  
  // Get tanks for current station
  const stationTanks = ((state.assets || {}).tanks || []).filter(
    tank => tank.stationId === currentStation
  );
  
  // Get pumps for current station
  const stationPumps = ((state.assets || {}).pumps || []).filter(
    pump => pump.stationId === currentStation
  );

  // Set default end time
  useEffect(() => {
    const endTime = new Date(new Date().setHours(23, 59, 0)).toISOString().slice(0, 16);
    setShiftDetails(prev => ({ ...prev, endTime }));
  }, []);

  // Handle island selection
  const handleSelectIsland = (islandId) => {
    const island = stationIslands.find(i => i.id === islandId);
    setSelectedIsland(island);
    
    // Initialize tank readings for this island
    if (island && !tankReadings[island.id]) {
      const islandTanks = stationTanks.filter(tank => tank.islandId === island.id);
      const initialReadings = {};
      
      islandTanks.forEach(tank => {
        initialReadings[tank.id] = {
          dipValue: tank.currentLevel || 0,
          temperature: 25.0 // Default temperature
        };
      });
      
      setTankReadings(prev => ({
        ...prev,
        [island.id]: initialReadings
      }));
    }
    
    // Initialize pump readings for this island
    if (island && !pumpReadings[island.id]) {
      const islandPumps = stationPumps.filter(pump => pump.islandId === island.id);
      const initialReadings = {};
      
      islandPumps.forEach(pump => {
        initialReadings[pump.id] = {
          electric: 0,
          manual: 0,
          cash: 0
        };
      });
      
      setPumpReadings(prev => ({
        ...prev,
        [island.id]: initialReadings
      }));
    }
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

  // Handle tank reading change
  const handleTankReadingChange = (islandId, tankId, field, value) => {
    setTankReadings(prev => ({
      ...prev,
      [islandId]: {
        ...prev[islandId],
        [tankId]: {
          ...prev[islandId][tankId],
          [field]: field === 'temperature' ? parseFloat(value) : parseInt(value, 10)
        }
      }
    }));
  };

  // Handle pump reading change
  const handlePumpReadingChange = (islandId, pumpId, meterType, value) => {
    setPumpReadings(prev => ({
      ...prev,
      [islandId]: {
        ...prev[islandId],
        [pumpId]: {
          ...prev[islandId][pumpId],
          [meterType]: parseFloat(value)
        }
      }
    }));
  };

  // Remove assignment
  const removeAssignment = (islandId, attendantId) => {
    setAssignments(prev => ({
      ...prev,
      [islandId]: (prev[islandId] || []).filter(id => id !== attendantId)
    }));
  };

  // Remove item assignment
  const removeItemAssignment = (islandId, itemId) => {
    setNonFuelItems(prev => ({
      ...prev,
      [islandId]: (prev[islandId] || []).filter(item => item.itemId !== itemId)
    }));
  };

  // Create shift
  const createShift = () => {
    const shiftId = `SHIFT_${Date.now()}`;
    
    // Prepare tank readings
    const allTankReadings = [];
    Object.entries(tankReadings).forEach(([islandId, tanks]) => {
      Object.entries(tanks || {}).forEach(([tankId, reading]) => {
        allTankReadings.push({
          tankId,
          readingType: 'START',
          value: reading.dipValue,
          temperature: reading.temperature,
          recordedById: shiftDetails.supervisorId
        });
      });
    });
    
    // Prepare pump readings
    const allPumpReadings = [];
    Object.entries(pumpReadings).forEach(([islandId, pumps]) => {
      Object.entries(pumps || {}).forEach(([pumpId, readings]) => {
        Object.entries(readings || {}).forEach(([meterType, value]) => {
          allPumpReadings.push({
            pumpId,
            readingType: 'START',
            meterType: meterType.toUpperCase(),
            value,
            recordedById: shiftDetails.supervisorId
          });
        });
      });
    });
    
    // Prepare non-fuel stocks
    const allNonFuelStocks = [];
    Object.entries(nonFuelItems).forEach(([islandId, items]) => {
      (items || []).forEach(item => {
        allNonFuelStocks.push({
          productId: item.itemId,
          islandId,
          openingStock: item.openingStock,
          closingStock: item.openingStock, // Same as opening initially
          soldQuantity: 0,
          recordedById: shiftDetails.supervisorId
        });
      });
    });
    
    // Prepare attendants
    const allAttendants = [];
    Object.entries(assignments).forEach(([islandId, attendantIds]) => {
      (attendantIds || []).forEach(attendantId => {
        allAttendants.push({
          id: attendantId,
          islandId
        });
      });
    });
    
    const shift = {
      id: shiftId,
      stationId: currentStation,
      supervisorId: shiftDetails.supervisorId,
      status: 'open',
      startTime: shiftDetails.startTime,
      endTime: shiftDetails.endTime,
      tankReadings: allTankReadings,
      pumpReadings: allPumpReadings,
      nonFuelStocks: allNonFuelStocks,
      attendants: allAttendants
    };
    
    // Only add priceListId if it's provided
    if (shiftDetails.priceListId) {
      shift.priceListId = shiftDetails.priceListId;
    }
    
    dispatch({ type: 'ADD_SHIFT', payload: shift });
    onClose();
  };

  const hasAssignments = Object.keys(assignments).length > 0;
  const isFormValid = hasAssignments && 
                     shiftDetails.startTime && 
                     shiftDetails.endTime && 
                     shiftDetails.supervisorId;

  // Get tanks for selected island
  const islandTanks = selectedIsland ? 
    stationTanks.filter(tank => tank.islandId === selectedIsland.id) : [];
  
  // Get pumps for selected island
  const islandPumps = selectedIsland ? 
    stationPumps.filter(pump => pump.islandId === selectedIsland.id) : [];

  // Navigation functions
  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create New Shift" size="2xl">
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= step ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-2 ${currentStep > step ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Island Selection */}
        {currentStep === 1 && (
          <Card title="1. Select Allocation Point">
            <div className="space-y-4">
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
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-700 font-medium">Selected Island</div>
                  <div className="text-lg font-bold">{selectedIsland.name}</div>
                  <div className="text-sm text-blue-600 mt-2">
                    {islandTanks.length} tank(s), {islandPumps.length} pump(s) available
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={nextStep}
                disabled={!selectedIsland}
              >
                Next: Assign Attendants
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Attendant Assignment */}
        {currentStep === 2 && (
          <Card title="2. Assign Attendants to Island">
            <div className="mb-4">
              <div className="text-sm text-gray-500">Selected Island:</div>
              <div className="text-lg font-bold">{selectedIsland?.name}</div>
            </div>
            
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
                  Assign to {selectedIsland?.name}
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
                          {(attendantIds || []).map(attendantId => {
                            const attendant = (state.staff?.attendants || []).find(a => a.id === attendantId);
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
            
            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={prevStep}>
                Back
              </Button>
              <Button 
                onClick={nextStep}
                disabled={!hasAssignments}
              >
                Next: Shift Details
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Shift Details */}
        {currentStep === 3 && (
          <>
            <Card title="3. Shift Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    ...(state.staff?.supervisors || [])
                      .filter(s => s.stationId === currentStation)
                      .map(supervisor => ({
                        value: supervisor.id,
                        label: supervisor.name
                      }))
                  ]}
                  icon={User}
                />
                
                <Select
                  label="Price List (Optional)"
                  value={shiftDetails.priceListId}
                  onChange={e => setShiftDetails({
                    ...shiftDetails,
                    priceListId: e.target.value
                  })}
                  options={[
                    { value: '', label: 'No Price List' },
                    ...(state.priceLists || [])
                      .filter(pl => pl.stationId === currentStation)
                      .map(priceList => ({
                        value: priceList.id,
                        label: priceList.name
                      }))
                  ]}
                  icon={Package}
                />
              </div>
            </Card>

            {/* Tank Dip Readings */}
            {selectedIsland && islandTanks.length > 0 && (
              <Card title="Tank Dip Readings">
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center">
                    <Droplets className="w-4 h-4 mr-2" />
                    Tank Dip Readings for {selectedIsland.name}
                  </h3>
                  
                  {islandTanks.map(tank => (
                    <div key={tank.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium">{tank.code} - {tank.productType}</div>
                        <div className="text-xs text-gray-600">Capacity: {tank.capacity.toLocaleString()} L</div>
                      </div>
                      
                      <Input
                        label="Dip Value (Liters)"
                        type="number"
                        value={tankReadings[selectedIsland.id]?.[tank.id]?.dipValue || ''}
                        onChange={e => handleTankReadingChange(
                          selectedIsland.id, 
                          tank.id, 
                          'dipValue', 
                          e.target.value
                        )}
                        min="0"
                        max={tank.capacity}
                      />
                      
                      <Input
                        label="Temperature (°C)"
                        type="number"
                        step="0.1"
                        value={tankReadings[selectedIsland.id]?.[tank.id]?.temperature || ''}
                        onChange={e => handleTankReadingChange(
                          selectedIsland.id, 
                          tank.id, 
                          'temperature', 
                          e.target.value
                        )}
                        min="0"
                        max="100"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            {/* Pump Meter Readings */}
            {selectedIsland && islandPumps.length > 0 && (
              <Card title="Pump Meter Readings">
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center">
                    <Droplets className="w-4 h-4 mr-2" />
                    Pump Meter Readings for {selectedIsland.name}
                  </h3>
                  
                  {islandPumps.map(pump => (
                    <div key={pump.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium">{pump.code}</div>
                        <div className="text-xs text-gray-600">
                          {((state.assets || {}).tanks || []).find(t => t.id === pump.tankId)?.productType || 'Unknown'}
                        </div>
                      </div>
                      
                      <Input
                        label="Electric Meter"
                        type="number"
                        step="0.01"
                        value={pumpReadings[selectedIsland.id]?.[pump.id]?.electric || ''}
                        onChange={e => handlePumpReadingChange(
                          selectedIsland.id, 
                          pump.id, 
                          'electric', 
                          e.target.value
                        )}
                        min="0"
                      />
                      
                      <Input
                        label="Cash Meter"
                        type="number"
                        step="0.01"
                        value={pumpReadings[selectedIsland.id]?.[pump.id]?.cash || ''}
                        onChange={e => handlePumpReadingChange(
                          selectedIsland.id, 
                          pump.id, 
                          'cash', 
                          e.target.value
                        )}
                        min="0"
                      />
                      
                      <Input
                        label="Manual Meter"
                        type="number"
                        step="0.01"
                        value={pumpReadings[selectedIsland.id]?.[pump.id]?.manual || ''}
                        onChange={e => handlePumpReadingChange(
                          selectedIsland.id, 
                          pump.id, 
                          'manual', 
                          e.target.value
                        )}
                        min="0"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            {/* Non-Fuel Items Section */}
            {selectedIsland && (
              <Card title="Restock Non-Fuel Items">
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
            
            <div className="flex justify-between">
              <Button variant="secondary" onClick={prevStep}>
                Back
              </Button>
              <Button 
                onClick={createShift}
                disabled={!isFormValid}
              >
                Open Shift
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CreateShiftModal;