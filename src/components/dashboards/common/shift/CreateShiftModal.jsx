import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Select, Card, Input, Table, Badge, Alert } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { userService } from '../../../../services/userService/userService';
import { assetConnectionService } from '../../../../services/assetConnection/assetConnectionService';
import { 
  Calendar, Clock, User, UserCheck, Package, Zap, MapPin, 
  CheckCircle, ChevronRight, ChevronLeft, X, Search, Fuel,
  PlayCircle, SkipForward, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

const CreateShiftModal = ({ isOpen, onClose, onShiftCreated }) => {
  const { state } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Shift core data - only start time now
  const [shiftDetails, setShiftDetails] = useState({
    startDate: '',
    startTime: '',
    supervisorId: ''
  });
  
  // Islands and pumps
  const [selectedIslands, setSelectedIslands] = useState([]);
  const [currentIslandIndex, setCurrentIslandIndex] = useState(0);
  const [currentPumpIndex, setCurrentPumpIndex] = useState(0);
  const [islandConnections, setIslandConnections] = useState([]);
  const [pumpReadings, setPumpReadings] = useState({});
  
  // Staff management
  const [availableAttendants, setAvailableAttendants] = useState([]);
  const [availableSupervisors, setAvailableSupervisors] = useState([]);
  const [attendantAssignments, setAttendantAssignments] = useState({});
  const [selectedAttendants, setSelectedAttendants] = useState([]);
  const [attendantSearch, setAttendantSearch] = useState('');
  
  // Non-fuel items
  const [nonFuelAssignments, setNonFuelAssignments] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [openingStock, setOpeningStock] = useState('');
  
  // Validation and errors
  const [errors, setErrors] = useState({});
  const [warehouseItems, setWarehouseItems] = useState([]);

  const currentStationId = state.currentStation?.id;
  const stationIslands = (state.islands || []).filter(island => island.stationId === currentStationId);
  
  // Debug useEffect for state changes
  useEffect(() => {
    console.log("✅ [UPDATED SUPERVISORS] ", availableSupervisors);
  }, [availableSupervisors]);

  useEffect(() => {
    console.log("✅ [UPDATED ATTENDANTS] ", availableAttendants);
  }, [availableAttendants]);

  // Initialize dates with current date and time
  useEffect(() => {
    if (!isOpen) return;
    
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    setShiftDetails(prev => ({
      ...prev,
      startDate: today,
      startTime: currentTime
    }));

    // Reset states when modal opens
    setSelectedIslands([]);
    setCurrentStep(1);
    setErrors({});
  }, [isOpen]);

  // Load initial data
  useEffect(() => {
    if (!currentStationId || !isOpen) return;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        console.log("📡 Loading data for station:", currentStationId);

        // Load connections
        const topologyData = await assetConnectionService.getStationTopology(currentStationId);
        const processedTopology = assetConnectionService.processTopologyData(topologyData);

        const newConnections = processedTopology?.connections || [];

        setIslandConnections(newConnections);

       

        // Load staff
        const [attendantsResp, supervisorsResp] = await Promise.all([
          userService.getStationAttendants(currentStationId),
          userService.getStationSupervisors(currentStationId)
        ]);

          console.log("islands on newConnections ",newConnections);

          console.log("islands on state",islandConnections);

        console.log("📊 Raw attendants response:", attendantsResp);
        console.log("📊 Raw supervisors response:", supervisorsResp);
        
        const attendants = Array.isArray(attendantsResp) ? attendantsResp : [];
        const supervisors = Array.isArray(supervisorsResp) ? supervisorsResp : [];

        setAvailableAttendants(attendants);
        setAvailableSupervisors(supervisors);
        
        // Load warehouse items
        const warehouse = (state.warehouses || []).find(wh => wh.stationId === currentStationId);
        setWarehouseItems(warehouse?.nonFuelItems || []);
        
      } catch (error) {
        console.error('❌ Failed to load initial data:', error);
        setErrors({ load: 'Failed to load required data' });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [currentStationId, isOpen, state.warehouses]);

  // Date and time validation (simplified)
  const validateDateTime = () => {
    const newErrors = {};
    
    if (!shiftDetails.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!shiftDetails.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    // Check if start date/time is not in the future
    const startDateTime = new Date(`${shiftDetails.startDate}T${shiftDetails.startTime}`);
    const now = new Date();
    
    if (startDateTime > now) {
      newErrors.startDate = 'Shift cannot start in the future';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Get islands with PUMP_TO_ISLAND connections
// 1. Helper: get islands with pumps
const getConnectedIslands = () => {
  if (!stationIslands?.length || !islandConnections?.length) return [];

  return stationIslands.map(island => {
    const pumps = islandConnections
      .filter(conn => conn.type === 'PUMP_TO_ISLAND' && conn.assetB?.id === island.id)
      .map(conn => conn.assetA); // assetA is the pump

    return {
      ...island,
      pumps
    };
  }).filter(island => island.pumps.length > 0);
};


// 2. Log once islandConnections updates
useEffect(() => {
  if (!islandConnections.length) return;

  const connectedIslands = getConnectedIslands();

  console.log("connected islands ",connectedIslands)

  console.log("✅ Connected islands with pumps:");
  connectedIslands.forEach(island => {
    console.log(
      `🌍 ${island.name} → pumps: ${island.pumps.map(p => p.name).join(", ")}`
    );
  });
}, [islandConnections, stationIslands]);

  // Get pumps for an island
  const getIslandPumps = (islandId) => {
    return newConnections
      .filter(conn => conn.type === 'PUMP_TO_ISLAND' && conn.assetB?.id === islandId)
      .map(conn => conn.assetA) // Assuming assetA is the pump
      .filter(Boolean);
  };

  // Handle island selection
  const handleIslandSelect = (island) => {
    if (!selectedIslands.find(i => i.id === island.id)) {
      const islandPumps = getIslandPumps(island.id);
      setSelectedIslands(prev => [...prev, {
        ...island,
        pumps: islandPumps,
        completed: false
      }]);
    }
  };

  // Handle island removal
  const handleIslandRemove = (islandId) => {
    setSelectedIslands(prev => prev.filter(island => island.id !== islandId));
    
    // Remove attendant assignments for this island
    setAttendantAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[islandId];
      return newAssignments;
    });
    
    // Remove pump readings for this island
    setPumpReadings(prev => {
      const newReadings = { ...prev };
      delete newReadings[islandId];
      return newReadings;
    });
  };

  // Update pump reading
  const updatePumpReading = (field, value) => {
    const currentIsland = selectedIslands[currentIslandIndex];
    const currentPump = currentIsland.pumps[currentPumpIndex];
    
    setPumpReadings(prev => ({
      ...prev,
      [currentIsland.id]: {
        ...prev[currentIsland.id],
        [currentPump.id]: {
          ...prev[currentIsland.id]?.[currentPump.id],
          [field]: value
        }
      }
    }));
  };

  // Handle pump reading save and progress
  const handlePumpReadingSave = () => {
    const currentIsland = selectedIslands[currentIslandIndex];
    const islandPumps = currentIsland.pumps || [];
    
    // Move to next pump or next island
    if (currentPumpIndex < islandPumps.length - 1) {
      setCurrentPumpIndex(currentPumpIndex + 1);
    } else {
      // Mark island as completed
      const updatedIslands = selectedIslands.map((island, index) => 
        index === currentIslandIndex ? { ...island, completed: true } : island
      );
      setSelectedIslands(updatedIslands);
      
      // Move to next island or next step
      if (currentIslandIndex < selectedIslands.length - 1) {
        setCurrentIslandIndex(currentIslandIndex + 1);
        setCurrentPumpIndex(0);
      } else {
        setCurrentStep(3); // Move to attendant assignment
      }
    }
  };

  // Handle previous pump
  const handlePreviousPump = () => {
    if (currentPumpIndex > 0) {
      setCurrentPumpIndex(currentPumpIndex - 1);
    } else if (currentIslandIndex > 0) {
      const prevIslandIndex = currentIslandIndex - 1;
      const prevIslandPumps = selectedIslands[prevIslandIndex].pumps || [];
      setCurrentIslandIndex(prevIslandIndex);
      setCurrentPumpIndex(prevIslandPumps.length - 1);
    }
  };

  // Toggle attendant selection
  const toggleAttendantSelection = (attendantId) => {
    setSelectedAttendants(prev =>
      prev.includes(attendantId)
        ? prev.filter(id => id !== attendantId)
        : [...prev, attendantId]
    );
  };

  // Handle attendant assignment
  const handleAttendantAssign = (islandId) => {
    if (selectedAttendants.length === 0) return;

    setAttendantAssignments(prev => ({
      ...prev,
      [islandId]: [...new Set([...(prev[islandId] || []), ...selectedAttendants])]
    }));

    setSelectedAttendants([]);
    setAttendantSearch('');
  };

  // Handle attendant removal
  const handleAttendantRemove = (islandId, attendantId) => {
    setAttendantAssignments(prev => ({
      ...prev,
      [islandId]: (prev[islandId] || []).filter(id => id !== attendantId)
    }));
  };

  // Handle non-fuel assignment
  const handleNonFuelAssign = (islandId) => {
    if (!selectedItem || !openingStock) return;

    setNonFuelAssignments(prev => ({
      ...prev,
      [islandId]: [
        ...(prev[islandId] || []),
        {
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          unit: selectedItem.unit,
          openingStock: parseFloat(openingStock)
        }
      ]
    }));

    setSelectedItem(null);
    setOpeningStock('');
  };

  // Handle non-fuel removal
  const handleNonFuelRemove = (islandId, itemId) => {
    setNonFuelAssignments(prev => ({
      ...prev,
      [islandId]: (prev[islandId] || []).filter(item => item.itemId !== itemId)
    }));
  };

  // Filter available attendants
  const getAvailableAttendants = () => {
    const allAssigned = Object.values(attendantAssignments).flat();
    return availableAttendants.filter(attendant => 
      !allAssigned.includes(attendant.id) &&
      (attendant.name?.toLowerCase().includes(attendantSearch.toLowerCase()) ||
       attendant.email?.toLowerCase().includes(attendantSearch.toLowerCase()))
    );
  };

  // Calculate duration (for display - will be calculated on shift close)
  const calculateDuration = () => {
    return "Will be calculated when shift closes";
  };

  // Format date and time
  const formatDateTime = (date, time) => {
    return new Date(`${date}T${time}`).toLocaleString();
  };

  // Get total pumps
  const getTotalPumps = () => {
    return selectedIslands.reduce((total, island) => total + (island.pumps?.length || 0), 0);
  };

  // Get total attendants
  const getTotalAttendants = () => {
    return Object.values(attendantAssignments).flat().length;
  };

  // Get total non-fuel items
  const getTotalNonFuelItems = () => {
    return Object.values(nonFuelAssignments).reduce((total, items) => total + items.length, 0);
  };

  // Handle shift creation
  const handleCreateShift = async () => {
    if (!validateDateTime()) return;

    setLoading(true);
    try {
      const shiftData = {
        stationId: currentStationId,
        startDate: shiftDetails.startDate,
        startTime: shiftDetails.startTime,
        supervisorId: shiftDetails.supervisorId,
        islands: selectedIslands.map(island => ({
          islandId: island.id,
          pumps: (island.pumps || []).map(pump => ({
            pumpId: pump.id,
            readings: pumpReadings[island.id]?.[pump.id] || {}
          })),
          attendants: attendantAssignments[island.id] || [],
          nonFuelItems: nonFuelAssignments[island.id] || []
        }))
      };

      console.log("📤 Creating shift with data:", shiftData);
      // TODO: Call your shift creation API here
      // await shiftService.createShift(shiftData);
      
      onShiftCreated?.();
      onClose();
    } catch (error) {
      console.error('❌ Failed to create shift:', error);
      setErrors({ submit: 'Failed to create shift' });
    } finally {
      setLoading(false);
    }
  };

  // Steps configuration
  const steps = [
    { number: 1, title: 'Shift Time & Islands', icon: Calendar, completed: true },
    { number: 2, title: 'Pump Meters', icon: Zap, completed: false },
    { number: 3, title: 'Attendants', icon: UserCheck, completed: false },
    { number: 4, title: 'Non-Fuel Items', icon: Package, completed: false, optional: true },
    { number: 5, title: 'Review', icon: CheckCircle, completed: false }
  ];

  // Step 1: Shift Time and Island Selection
  const Step1DateTimeIslands = () => {
    const connectedIslands = getConnectedIslands();
    
    return (
      <Card title="1. Set Shift Time & Select Islands">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Date and Time Selection */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Shift Start Time
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Start Date *"
                type="date"
                value={shiftDetails.startDate}
                onChange={e => setShiftDetails(prev => ({ ...prev, startDate: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                error={errors.startDate}
              />
              
              <Input
                label="Start Time *"
                type="time"
                value={shiftDetails.startTime}
                onChange={e => setShiftDetails(prev => ({ ...prev, startTime: e.target.value }))}
                error={errors.startTime}
              />
            </div>
            
            <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded">
              <div>End time will be set when the shift is closed</div>
              <div>Shift must start on or before current time</div>
            </div>
          </div>

          {/* Island Selection */}
          <div>
            <h3 className="font-medium flex items-center mb-4">
              <MapPin className="w-5 h-5 mr-2" />
              Select Islands ({selectedIslands.length} selected)
            </h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {connectedIslands.map(island => {
                const pumpCount = getIslandPumps(island.id).length;
                const isSelected = selectedIslands.some(i => i.id === island.id);
                
                return (
                  <div
                    key={island.id}
                    className={clsx(
                      "p-3 border rounded-lg cursor-pointer transition-all",
                      isSelected ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-blue-300"
                    )}
                    onClick={() => isSelected ? handleIslandRemove(island.id) : handleIslandSelect(island)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{island.name}</div>
                        <div className="text-sm text-gray-600">{pumpCount} pump(s) connected</div>
                      </div>
                      {isSelected ? (
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          <Button variant="ghost" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            handleIslandRemove(island.id);
                          }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {connectedIslands.length === 0 && (
              <Alert variant="warning" className="mt-4">
                No islands with pump connections found. Please set up island-to-pump connections first.
              </Alert>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              // if (validateDateTime() && selectedIslands.length > 0) {
                setCurrentStep(2);
                setCurrentIslandIndex(0);
                setCurrentPumpIndex(0);
              // }
            }}
            // disabled={selectedIslands.length === 0}
            icon={ChevronRight}
          >
            Next: Pump Meters
          </Button>
        </div>
      </Card>
    );
  };

  // Step 2: Pump Meter Recording
  const Step2PumpMeters = () => {
    const currentIsland = selectedIslands[currentIslandIndex];

    const islandPumps = currentIsland?.pumps || [];
    console.log("islands ",currentIsland,' pumps ',islandPumps)
    const currentPump = islandPumps[currentPumpIndex];
    const currentReading = pumpReadings[currentIsland?.id]?.[currentPump?.id] || {};

    if (!currentIsland) return null;

    return (
      <Card title={`2. Record Pump Meters - ${currentIsland.name}`}>
        {/* Progress Indicator */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="text-sm text-blue-800">Island Progress</div>
              <div className="flex items-center space-x-2 mt-1">
                {selectedIslands.map((island, index) => (
                  <div
                    key={island.id}
                    className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
                      island.completed ? "bg-green-500" :
                      index === currentIslandIndex ? "bg-blue-500" : "bg-gray-300"
                    )}
                  >
                    {island.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
                  </div>
                ))}
              </div>
            </div>
            <Badge variant="blue">
              Pump {currentPumpIndex + 1} of {islandPumps.length}
            </Badge>
          </div>
        </div>

        {/* Pump Meter Form */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            {currentPump?.name || currentPump?.code} - Opening Meter Readings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Electric Meter *"
              type="number"
              step="0.001"
              value={currentReading.electric || ''}
              onChange={e => updatePumpReading('electric', e.target.value)}
              min="0"
              error={!currentReading.electric ? 'Required' : undefined}
            />
            
            <Input
              label="Cash Meter *"
              type="number"
              step="0.001"
              value={currentReading.cash || ''}
              onChange={e => updatePumpReading('cash', e.target.value)}
              min="0"
              error={!currentReading.cash ? 'Required' : undefined}
            />
            
            <Input
              label="Manual Meter"
              type="number"
              step="0.001"
              value={currentReading.manual || ''}
              onChange={e => updatePumpReading('manual', e.target.value)}
              min="0"
            />
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            variant="secondary"
            onClick={handlePreviousPump}
            icon={ChevronLeft}
            disabled={currentIslandIndex === 0 && currentPumpIndex === 0}
          >
            Previous
          </Button>
          
          <Button
            onClick={handlePumpReadingSave}
            disabled={!currentReading.electric || !currentReading.cash}
            icon={currentPumpIndex === islandPumps.length - 1 ? CheckCircle : ChevronRight}
          >
            {currentPumpIndex === islandPumps.length - 1 ? 
              `Complete ${currentIsland.name}` : 'Next Pump'
            }
          </Button>
        </div>
      </Card>
    );
  };

  // Step 3: Attendant Assignment
  const Step3Attendants = () => {
    const availableForAssignment = getAvailableAttendants();
    const unassignedIslands = selectedIslands.filter(island => 
      !attendantAssignments[island.id] || attendantAssignments[island.id].length === 0
    );

    return (
      <Card title="3. Assign Attendants & Supervisor">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supervisor Selection */}
          <div className="lg:col-span-2">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Shift Supervisor</h3>
              <Select
                label="Select Supervisor *"
                value={shiftDetails.supervisorId}
                onChange={e => setShiftDetails(prev => ({ ...prev, supervisorId: e.target.value }))}
                options={[
                  { value: '', label: 'Choose a supervisor' },
                  ...availableSupervisors.map(sup => ({
                    value: sup.id,
                    label: `${sup.name} - ${sup.email}`
                  }))
                ]}
                error={errors.supervisor}
              />
            </div>
          </div>

          {/* Attendant Selection */}
          <div className="space-y-4">
            <h3 className="font-medium">Available Attendants</h3>
            
            <Input
              placeholder="Search attendants..."
              value={attendantSearch}
              onChange={e => setAttendantSearch(e.target.value)}
              icon={Search}
            />
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableForAssignment.map(attendant => (
                <div
                  key={attendant.id}
                  className={clsx(
                    "p-3 border rounded-lg cursor-pointer",
                    selectedAttendants.includes(attendant.id) ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  )}
                  onClick={() => toggleAttendantSelection(attendant.id)}
                >
                  <div className="font-medium">{attendant.name}</div>
                  <div className="text-sm text-gray-600">{attendant.email}</div>
                  {selectedAttendants.includes(attendant.id) && (
                    <div className="text-xs text-blue-600 mt-1">Selected</div>
                  )}
                </div>
              ))}
              
              {availableForAssignment.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No attendants available for assignment
                </div>
              )}
            </div>
            
            {selectedAttendants.length > 0 && (
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm font-medium">
                  {selectedAttendants.length} attendant(s) selected
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAttendants([])}
                  className="mt-2"
                >
                  Clear selection
                </Button>
              </div>
            )}
          </div>

          {/* Assignment Panel */}
          <div className="space-y-4">
            <h3 className="font-medium">Assign to Islands</h3>
            
            {unassignedIslands.length > 0 ? (
              <div className="space-y-3">
                {unassignedIslands.map(island => (
                  <Button
                    key={island.id}
                    variant="outline"
                    onClick={() => handleAttendantAssign(island.id)}
                    disabled={selectedAttendants.length === 0}
                    className="w-full justify-start"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Assign to {island.name}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                All islands have attendants assigned
              </div>
            )}

            {/* Current Assignments */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Current Assignments</h4>
              {Object.entries(attendantAssignments).map(([islandId, attendantIds]) => {
                const island = selectedIslands.find(i => i.id === islandId);
                const attendants = availableAttendants.filter(a => attendantIds.includes(a.id));
                
                return (
                  <div key={islandId} className="border rounded-lg p-3">
                    <div className="font-medium flex justify-between items-center">
                      {island?.name}
                      <Badge variant="green">{attendants.length} assigned</Badge>
                    </div>
                    <div className="mt-2 space-y-1">
                      {attendants.map(att => (
                        <div key={att.id} className="flex justify-between items-center text-sm">
                          <span>{att.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAttendantRemove(islandId, att.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="secondary" onClick={() => setCurrentStep(2)} icon={ChevronLeft}>
            Back to Pump Meters
          </Button>
          <Button
            onClick={() => setCurrentStep(4)}
            disabled={unassignedIslands.length > 0 || !shiftDetails.supervisorId}
            icon={ChevronRight}
          >
            Next: Non-Fuel Items
          </Button>
        </div>
      </Card>
    );
  };

  // Step 4: Non-Fuel Items (Optional)
  const Step4NonFuelItems = () => {
    return (
      <Card title="4. Assign Non-Fuel Items (Optional)">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Item Selection */}
          <div className="space-y-4">
            <Select
              label="Select Item"
              value={selectedItem?.id || ''}
              onChange={e => setSelectedItem(warehouseItems.find(item => item.id === e.target.value) || null)}
              options={[
                { value: '', label: 'Choose an item' },
                ...warehouseItems.map(item => ({
                  value: item.id,
                  label: `${item.name} (Stock: ${item.currentStock} ${item.unit})`
                }))
              ]}
            />
            
            {selectedItem && (
              <>
                <Input
                  label={`Opening Stock (${selectedItem.unit})`}
                  type="number"
                  value={openingStock}
                  onChange={e => setOpeningStock(e.target.value)}
                  min="0"
                  max={selectedItem.currentStock}
                />
                <div className="text-sm text-gray-600">
                  Available stock: {selectedItem.currentStock} {selectedItem.unit}
                </div>
              </>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              {selectedIslands.map(island => (
                <Button
                  key={island.id}
                  variant="outline"
                  onClick={() => handleNonFuelAssign(island.id)}
                  disabled={!selectedItem || !openingStock}
                >
                  Assign to {island.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Assignments */}
          <div className="space-y-4">
            <h3 className="font-medium">Current Assignments</h3>
            {Object.keys(nonFuelAssignments).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items assigned yet
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(nonFuelAssignments).map(([islandId, items]) => {
                  const island = selectedIslands.find(i => i.id === islandId);
                  return (
                    <div key={islandId} className="border rounded-lg p-3">
                      <div className="font-medium">{island?.name}</div>
                      {items.map(item => (
                        <div key={item.itemId} className="flex justify-between items-center text-sm mt-2">
                          <div>
                            <div className="font-medium">{item.itemName}</div>
                            <div className="text-gray-600">{item.openingStock} {item.unit}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleNonFuelRemove(islandId, item.itemId)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="secondary" onClick={() => setCurrentStep(3)} icon={ChevronLeft}>
            Back to Attendants
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => setCurrentStep(5)} icon={SkipForward}>
              Skip This Step
            </Button>
            <Button onClick={() => setCurrentStep(5)} icon={ChevronRight}>
              Review & Create
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // Step 5: Review and Create
  const Step5Review = () => {
    const selectedSupervisor = availableSupervisors.find(s => s.id === shiftDetails.supervisorId);

    return (
      <Card title="5. Review Shift Details">
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard title="Islands" value={selectedIslands.length} color="blue" />
            <SummaryCard title="Pumps" value={getTotalPumps()} color="green" />
            <SummaryCard title="Attendants" value={getTotalAttendants()} color="purple" />
            <SummaryCard title="Items" value={getTotalNonFuelItems()} color="orange" />
          </div>

          {/* Shift Timing */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Shift Timing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Start</div>
                <div className="font-medium">{formatDateTime(shiftDetails.startDate, shiftDetails.startTime)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">End</div>
                <div className="font-medium">Will be set when shift closes</div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Supervisor: {selectedSupervisor?.name || 'Not assigned'}
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="space-y-4">
            {selectedIslands.map(island => (
              <IslandReview 
                key={island.id} 
                island={island} 
                readings={pumpReadings[island.id] || {}}
                attendants={attendantAssignments[island.id] || []}
                nonFuelItems={nonFuelAssignments[island.id] || []}
                availableAttendants={availableAttendants}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="secondary" onClick={() => setCurrentStep(4)} icon={ChevronLeft}>
            Back to Items
          </Button>
          <Button 
            variant="primary" 
            icon={CheckCircle}
            onClick={handleCreateShift}
            loading={loading}
          >
            Create Shift
          </Button>
        </div>
      </Card>
    );
  };

  // Render the modal
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create New Shift" 
      size="3xl"
    >
      <div className="space-y-6">
        {/* Step Indicator */}
        <StepIndicator 
          steps={steps} 
          currentStep={currentStep} 
          onStepClick={setCurrentStep}
        />

        {/* Loading State */}
        {loading && <div className="text-center py-8">Loading station data...</div>}

        {/* Error Display */}
        {errors.load && <Alert variant="error">{errors.load}</Alert>}
        {errors.submit && <Alert variant="error">{errors.submit}</Alert>}

        {/* Step Content */}
        {!loading && (
          <>
            {currentStep === 1 && <Step1DateTimeIslands />}
            {currentStep === 2 && <Step2PumpMeters />}
            {currentStep === 3 && <Step3Attendants />}
            {currentStep === 4 && <Step4NonFuelItems />}
            {currentStep === 5 && <Step5Review />}
          </>
        )}
      </div>
    </Modal>
  );
};

// Supporting components
const StepIndicator = ({ steps, currentStep, onStepClick }) => (
  <div className="flex justify-center space-x-4">
    {steps.map(step => (
      <div
        key={step.number}
        className={clsx(
          "flex items-center cursor-pointer",
          step.number <= currentStep ? "opacity-100" : "opacity-50"
        )}
        onClick={() => step.number <= currentStep && onStepClick(step.number)}
      >
        <div className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
          step.number < currentStep ? "bg-green-500" :
          step.number === currentStep ? "bg-blue-500" : "bg-gray-300"
        )}>
          {step.number < currentStep ? <CheckCircle className="w-4 h-4" /> : step.number}
        </div>
        <div className="ml-2">
          <div className="text-sm font-medium">{step.title}</div>
          {step.optional && <div className="text-xs text-gray-500">Optional</div>}
        </div>
        {step.number < steps.length && <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />}
      </div>
    ))}
  </div>
);

const SummaryCard = ({ title, value, color }) => (
  <div className={clsx("text-center p-3 rounded-lg", {
    "bg-blue-50 text-blue-800": color === 'blue',
    "bg-green-50 text-green-800": color === 'green',
    "bg-purple-50 text-purple-800": color === 'purple',
    "bg-orange-50 text-orange-800": color === 'orange'
  })}>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-sm">{title}</div>
  </div>
);

const IslandReview = ({ island, readings, attendants, nonFuelItems, availableAttendants }) => (
  <div className="border rounded-lg p-4">
    <h4 className="font-medium mb-3">{island.name}</h4>
    
    {/* Pumps */}
    <div className="mb-3">
      <div className="text-sm font-medium text-gray-600">Pumps</div>
      {island.pumps?.map(pump => {
        const reading = readings[pump.id] || {};
        return (
          <div key={pump.id} className="text-sm ml-4 mt-1">
            <div className="font-medium">{pump.name}</div>
            <div>Electric: {reading.electric || 'Not set'}</div>
            <div>Cash: {reading.cash || 'Not set'}</div>
            {reading.manual && <div>Manual: {reading.manual}</div>}
          </div>
        );
      })}
    </div>

    {/* Attendants */}
    <div className="mb-3">
      <div className="text-sm font-medium text-gray-600">Attendants</div>
      <div className="text-sm ml-4">
        {attendants.length > 0 
          ? attendants.map(id => availableAttendants.find(a => a.id === id)?.name).join(', ')
          : 'None assigned'
        }
      </div>
    </div>

    {/* Non-Fuel Items */}
    {nonFuelItems.length > 0 && (
      <div>
        <div className="text-sm font-medium text-gray-600">Non-Fuel Items</div>
        {nonFuelItems.map(item => (
          <div key={item.itemId} className="text-sm ml-4 mt-1">
            {item.itemName}: {item.openingStock} {item.unit}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default CreateShiftModal;