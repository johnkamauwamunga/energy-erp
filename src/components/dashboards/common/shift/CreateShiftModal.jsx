import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Card, Input, Table, Tabs, Badge, Tooltip } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { 
  Plus, X, User, MapPin, Clock, UserCheck, Package, Droplets, 
  Zap, Calculator, SkipForward, CheckCircle, AlertCircle, Eye, Lock, PlayCircle
} from 'lucide-react';
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
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('fuel');
  const [validationErrors, setValidationErrors] = useState({});
  const [hoveredStep, setHoveredStep] = useState(null);
  const [showStepPreview, setShowStepPreview] = useState(false);

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

  // Get supervisors for current station
  const availableSupervisors = (state.staff?.supervisors || []).filter(
    supervisor => supervisor.stationId === currentStation
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

  // Set default end time (8 hours from start)
  useEffect(() => {
    const start = new Date(shiftDetails.startTime);
    const end = new Date(start.getTime() + 8 * 60 * 60 * 1000);
    setShiftDetails(prev => ({ 
      ...prev, 
      endTime: end.toISOString().slice(0, 16) 
    }));
  }, [shiftDetails.startTime]);

  // Validation functions
  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 1:
        if (!selectedIsland) errors.island = 'Please select an island';
        break;
      
      case 2:
        if (Object.keys(assignments).length === 0) {
          errors.assignments = 'Please assign at least one attendant to an island';
        }
        break;
      
      case 3:
        if (!shiftDetails.supervisorId) errors.supervisor = 'Supervisor is required';
        if (!shiftDetails.startTime) errors.startTime = 'Start time is required';
        if (!shiftDetails.endTime) errors.endTime = 'End time is required';
        
        // Validate tank readings
        if (selectedIsland) {
          const islandTanks = stationTanks.filter(tank => tank.islandId === selectedIsland.id);
          islandTanks.forEach(tank => {
            const reading = tankReadings[selectedIsland.id]?.[tank.id];
            if (!reading || reading.dipValue === undefined) {
              errors[`tank-${tank.id}`] = `Dip reading required for ${tank.code}`;
            }
          });
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if step is completed
  const isStepCompleted = (step) => {
    switch (step) {
      case 1: return !!selectedIsland;
      case 2: return Object.keys(assignments).length > 0;
      case 3: 
        return !!shiftDetails.supervisorId && 
               !!shiftDetails.startTime && 
               !!shiftDetails.endTime &&
               selectedIsland && 
               stationTanks.filter(tank => tank.islandId === selectedIsland.id)
                 .every(tank => tankReadings[selectedIsland.id]?.[tank.id]?.dipValue !== undefined);
      case 4: return true; // Non-fuel is optional
      case 5: return true; // Review step
      default: return false;
    }
  };

  // Handle island selection
  const handleSelectIsland = (islandId) => {
    const island = stationIslands.find(i => i.id === islandId);
    setSelectedIsland(island);
    setValidationErrors(prev => ({ ...prev, island: undefined }));
    
    // Initialize readings for this island
    if (island) {
      const islandTanks = stationTanks.filter(tank => tank.islandId === island.id);
      const initialTankReadings = {};
      
      islandTanks.forEach(tank => {
        initialTankReadings[tank.id] = {
          dipValue: tank.currentLevel || 0,
          temperature: 25.0,
          waterLevel: 0
        };
      });
      
      setTankReadings(prev => ({
        ...prev,
        [island.id]: initialTankReadings
      }));

      // Initialize pump readings for this island
      const islandPumps = stationPumps.filter(pump => pump.islandId === island.id);
      const initialPumpReadings = {};
      
      islandPumps.forEach(pump => {
        initialPumpReadings[pump.id] = {
          electric: pump.currentReading?.electric || 0,
          manual: pump.currentReading?.manual || 0,
          cash: pump.currentReading?.cash || 0
        };
      });
      
      setPumpReadings(prev => ({
        ...prev,
        [island.id]: initialPumpReadings
      }));
    }
  };

  // Navigation with validation
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    setValidationErrors({});
  };

  const skipNonFuel = () => {
    setCurrentStep(5); // Skip to review
  };

  const goToStep = (step) => {
    if (step <= currentStep || isStepCompleted(step - 1)) {
      setCurrentStep(step);
      setValidationErrors({});
    }
  };

  // Get tanks and pumps for selected island
  const islandTanks = selectedIsland ? 
    stationTanks.filter(tank => tank.islandId === selectedIsland.id) : [];
  
  const islandPumps = selectedIsland ? 
    stationPumps.filter(pump => pump.islandId === selectedIsland.id) : [];

  // Calculate total assigned attendants
  const totalAssignedAttendants = Object.values(assignments).reduce(
    (total, islandAttendants) => total + (islandAttendants?.length || 0), 0
  );

  // Step headers with status and hover preview
  const steps = [
    { 
      number: 1, 
      title: 'Island Selection', 
      icon: MapPin,
      description: 'Select the service island for this shift',
      completed: isStepCompleted(1)
    },
    { 
      number: 2, 
      title: 'Staff Assignment', 
      icon: UserCheck,
      description: 'Assign attendants to the selected island',
      completed: isStepCompleted(2)
    },
    { 
      number: 3, 
      title: 'Meter Readings', 
      icon: Calculator,
      description: 'Record opening tank dips and pump meter readings',
      completed: isStepCompleted(3)
    },
    { 
      number: 4, 
      title: 'Non-Fuel Items', 
      icon: Package, 
      optional: true,
      description: 'Set opening stock for shop items (optional)',
      completed: true // Optional step is always considered completed
    },
    { 
      number: 5, 
      title: 'Review & Create', 
      icon: CheckCircle,
      description: 'Review all information and create shift',
      completed: isStepCompleted(5)
    }
  ];

  // Step preview content
  const getStepPreview = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        return (
          <div className="p-3 space-y-2">
            <div className="font-medium text-sm">Island Selection</div>
            <div className="text-xs text-gray-600">
              {selectedIsland 
                ? `Selected: ${selectedIsland.name}`
                : 'No island selected yet'
              }
            </div>
            {stationIslands.length > 0 && (
              <div className="text-xs">
                Available: {stationIslands.length} islands
              </div>
            )}
          </div>
        );
      
      case 2:
        return (
          <div className="p-3 space-y-2">
            <div className="font-medium text-sm">Staff Assignment</div>
            <div className="text-xs text-gray-600">
              {totalAssignedAttendants > 0 
                ? `${totalAssignedAttendants} attendants assigned`
                : 'No attendants assigned yet'
              }
            </div>
            <div className="text-xs">
              Available: {availableAttendants.length} attendants
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="p-3 space-y-2">
            <div className="font-medium text-sm">Meter Readings</div>
            <div className="text-xs text-gray-600">
              {selectedIsland ? (
                <>
                  <div>{islandTanks.length} tanks to read</div>
                  <div>{islandPumps.length} pumps to read</div>
                </>
              ) : 'Select an island first'}
            </div>
            {shiftDetails.supervisorId && (
              <div className="text-xs text-green-600">
                Supervisor assigned
              </div>
            )}
          </div>
        );
      
      case 4:
        return (
          <div className="p-3 space-y-2">
            <div className="font-medium text-sm">Non-Fuel Items</div>
            <div className="text-xs text-gray-600">
              {warehouseItems.length} items available in warehouse
            </div>
            <div className="text-xs text-blue-600">
              Optional step - can be skipped
            </div>
          </div>
        );
      
      case 5:
        const completedSteps = steps.filter(step => step.completed).length;
        return (
          <div className="p-3 space-y-2">
            <div className="font-medium text-sm">Review & Create</div>
            <div className="text-xs text-gray-600">
              {completedSteps >= 3 ? 'Ready to create shift' : 'Complete previous steps first'}
            </div>
            <div className="text-xs">
              Progress: {completedSteps}/5 steps completed
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create New Shift" size="3xl">
      <div className="space-y-6">
        {/* Enhanced Step Indicator with Hover Previews */}
        <div className="bg-gray-50 rounded-lg p-4 relative">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <Tooltip 
                  content={getStepPreview(step.number)}
                  placement="top"
                  interactive
                  delayDuration={300}
                >
                  <div 
                    className="flex items-center cursor-pointer group"
                    onMouseEnter={() => setHoveredStep(step.number)}
                    onMouseLeave={() => setHoveredStep(null)}
                    onClick={() => goToStep(step.number)}
                  >
                    <div className={clsx(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200",
                      step.completed 
                        ? "bg-green-500 border-green-500 text-white shadow-sm"
                        : currentStep === step.number
                        ? "bg-blue-500 border-blue-500 text-white shadow-sm"
                        : step.number <= currentStep
                        ? "bg-blue-100 border-blue-300 text-blue-600"
                        : "bg-white border-gray-300 text-gray-400",
                      "group-hover:scale-110 group-hover:shadow-md"
                    )}>
                      {step.completed ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : currentStep === step.number ? (
                        <PlayCircle className="w-5 h-5" />
                      ) : step.number < currentStep ? (
                        <step.icon className="w-5 h-5" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="ml-3">
                      <div className={clsx(
                        "text-sm font-medium transition-colors",
                        step.completed || step.number <= currentStep
                          ? "text-gray-900 group-hover:text-blue-600"
                          : "text-gray-500"
                      )}>
                        {step.title}
                        {step.optional && (
                          <span className="text-xs text-gray-400 ml-1">(Optional)</span>
                        )}
                      </div>
                      <div className={clsx(
                        "text-xs transition-opacity",
                        hoveredStep === step.number ? "opacity-100" : "opacity-0",
                        "text-gray-600 mt-1"
                      )}>
                        Click to {step.number <= currentStep ? 'view' : 'preview'}
                      </div>
                    </div>
                  </div>
                </Tooltip>
                
                {index < steps.length - 1 && (
                  <div className={clsx(
                    "flex-1 h-1 mx-4 transition-all duration-300",
                    step.completed ? "bg-green-500" : "bg-gray-300",
                    hoveredStep === step.number && "bg-green-400"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{steps.filter(step => step.completed).length} of 5 steps completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(steps.filter(step => step.completed).length / 5) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* Step 1: Island Selection */}
        {currentStep === 1 && (
          <Card title="1. Select Service Island" className="relative">
            {validationErrors.island && (
              <div className="absolute top-4 right-4">
                <Badge variant="error" icon={AlertCircle}>
                  {validationErrors.island}
                </Badge>
              </div>
            )}
            
            <div className="space-y-6">
              <Select
                label="Service Island *"
                options={[
                  { value: '', label: 'Select an island to begin' },
                  ...stationIslands.map(island => ({
                    value: island.id,
                    label: `${island.name} (${island.code})`,
                    description: `${islandTanks.length} tanks, ${islandPumps.length} pumps`
                  }))
                ]}
                value={selectedIsland?.id || ''}
                onChange={(e) => handleSelectIsland(e.target.value)}
                icon={MapPin}
                error={validationErrors.island}
              />
              
              {selectedIsland && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Island Details</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>Name:</strong> {selectedIsland.name}</div>
                      <div><strong>Code:</strong> {selectedIsland.code}</div>
                      <div><strong>Tanks:</strong> {islandTanks.length}</div>
                      <div><strong>Pumps:</strong> {islandPumps.length}</div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2">Available Resources</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>Attendants:</strong> {availableAttendants.length} available</div>
                      <div><strong>Supervisors:</strong> {availableSupervisors.length} available</div>
                      <div><strong>Non-Fuel Items:</strong> {warehouseItems.length} in warehouse</div>
                    </div>
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
                icon={UserCheck}
              >
                Next: Assign Staff
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Staff Assignment */}
        {currentStep === 2 && (
          <Card title="2. Assign Staff to Islands" className="relative">
            {validationErrors.assignments && (
              <div className="absolute top-4 right-4">
                <Badge variant="error" icon={AlertCircle}>
                  {validationErrors.assignments}
                </Badge>
              </div>
            )}
            
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Selected Island:</div>
                  <div className="text-lg font-bold">{selectedIsland?.name}</div>
                </div>
                <Badge variant="success">
                  {totalAssignedAttendants} attendants assigned
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Attendants */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center text-gray-700">
                  <User className="w-4 h-4 mr-2" />
                  Available Attendants ({availableAttendants.length})
                </h3>
                
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {availableAttendants
                    .filter(a => !assignedAttendantIds.has(a.id))
                    .map(attendant => (
                    <div 
                      key={attendant.id}
                      className={clsx(
                        "p-3 rounded-lg border transition-all cursor-pointer",
                        selectedAttendantIds.includes(attendant.id)
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                      onClick={() => setSelectedAttendantIds(prev => 
                        prev.includes(attendant.id) 
                          ? prev.filter(id => id !== attendant.id) 
                          : [...prev, attendant.id]
                      )}
                    >
                      <div className="font-medium">{attendant.name}</div>
                      <div className="text-sm text-gray-600">{attendant.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Last shift: {attendant.lastShiftDate || 'Never'}
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={() => {
                    if (selectedAttendantIds.length > 0) {
                      setAssignments(prev => ({
                        ...prev,
                        [selectedIsland.id]: [
                          ...(prev[selectedIsland.id] || []),
                          ...selectedAttendantIds
                        ]
                      }));
                      setSelectedAttendantIds([]);
                    }
                  }}
                  disabled={selectedAttendantIds.length === 0}
                  className="w-full"
                  icon={Plus}
                >
                  Assign {selectedAttendantIds.length} to {selectedIsland?.name}
                </Button>
              </div>
              
              {/* Current Assignments */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center text-gray-700">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Current Assignments
                </h3>
                
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {Object.entries(assignments).map(([islandId, attendantIds]) => {
                    const island = stationIslands.find(i => i.id === islandId);
                    return (
                      <div key={islandId} className="border rounded-lg overflow-hidden bg-white">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2 font-medium text-white">
                          {island?.name || 'Unknown Island'}
                          <Badge variant="light" className="ml-2">
                            {attendantIds.length} attendants
                          </Badge>
                        </div>
                        <div className="divide-y">
                          {(attendantIds || []).map(attendantId => {
                            const attendant = availableAttendants.find(a => a.id === attendantId);
                            return (
                              <div key={attendantId} className="px-3 py-2 flex justify-between items-center hover:bg-gray-50">
                                <div className="flex-1">
                                  <div className="font-medium">{attendant?.name}</div>
                                  <div className="text-sm text-gray-600">{attendant?.email}</div>
                                </div>
                                <button 
                                  onClick={() => setAssignments(prev => ({
                                    ...prev,
                                    [islandId]: (prev[islandId] || []).filter(id => id !== attendantId)
                                  }))}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                  title="Remove assignment"
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
                  
                  {Object.keys(assignments).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <div>No attendants assigned yet</div>
                      <div className="text-sm">Select attendants from the left panel</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={prevStep}>
                Back to Island
              </Button>
              <Button 
                onClick={nextStep}
                disabled={totalAssignedAttendants === 0}
                icon={Calculator}
              >
                Next: Meter Readings
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Meter Readings */}
        {currentStep === 3 && (
          <Card title="3. Record Opening Meter Readings">
            <Tabs
              tabs={[
                { id: 'fuel', label: 'Fuel Meters', icon: Droplets },
                { id: 'nonfuel', label: 'Non-Fuel Items', icon: Package }
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
            
            {activeTab === 'fuel' && (
              <div className="space-y-6 mt-4">
                {/* Tank Readings */}
                {islandTanks.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center text-gray-700">
                      <Droplets className="w-4 h-4 mr-2" />
                      Tank Dip Readings ({islandTanks.length} tanks)
                    </h4>
                    
                    <div className="grid gap-4">
                      {islandTanks.map(tank => {
                        const reading = tankReadings[selectedIsland.id]?.[tank.id] || {};
                        const error = validationErrors[`tank-${tank.id}`];
                        
                        return (
                          <Card key={tank.id} className={clsx("p-4", error && "border-red-200 bg-red-50")}>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <div className="font-medium">{tank.code}</div>
                                <div className="text-sm text-gray-600">{tank.productType}</div>
                                <div className="text-xs text-gray-500">Capacity: {tank.capacity.toLocaleString()}L</div>
                                {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
                              </div>
                              
                              <Input
                                label="Dip Value (Liters) *"
                                type="number"
                                value={reading.dipValue || ''}
                                onChange={e => setTankReadings(prev => ({
                                  ...prev,
                                  [selectedIsland.id]: {
                                    ...prev[selectedIsland.id],
                                    [tank.id]: {
                                      ...reading,
                                      dipValue: parseFloat(e.target.value) || 0
                                    }
                                  }
                                }))}
                                min="0"
                                max={tank.capacity}
                                error={error}
                              />
                              
                              <Input
                                label="Temperature (°C)"
                                type="number"
                                step="0.1"
                                value={reading.temperature || ''}
                                onChange={e => setTankReadings(prev => ({
                                  ...prev,
                                  [selectedIsland.id]: {
                                    ...prev[selectedIsland.id],
                                    [tank.id]: {
                                      ...reading,
                                      temperature: parseFloat(e.target.value) || 0
                                    }
                                  }
                                }))}
                                min="0"
                                max="100"
                              />
                              
                              <Input
                                label="Water Level (cm)"
                                type="number"
                                value={reading.waterLevel || ''}
                                onChange={e => setTankReadings(prev => ({
                                  ...prev,
                                  [selectedIsland.id]: {
                                    ...prev[selectedIsland.id],
                                    [tank.id]: {
                                      ...reading,
                                      waterLevel: parseFloat(e.target.value) || 0
                                    }
                                  }
                                }))}
                                min="0"
                              />
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pump Readings */}
                {islandPumps.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center text-gray-700">
                      <Zap className="w-4 h-4 mr-2" />
                      Pump Meter Readings ({islandPumps.length} pumps)
                    </h4>
                    
                    <div className="grid gap-4">
                      {islandPumps.map(pump => {
                        const reading = pumpReadings[selectedIsland.id]?.[pump.id] || {};
                        const tank = stationTanks.find(t => t.id === pump.tankId);
                        
                        return (
                          <Card key={pump.id} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                              <div>
                                <div className="font-medium">{pump.code}</div>
                                <div className="text-sm text-gray-600">{tank?.productType}</div>
                                <div className="text-xs text-gray-500">Nozzles: {pump.nozzleCount || 2}</div>
                              </div>
                              
                              <Input
                                label="Electric Meter *"
                                type="number"
                                step="0.001"
                                value={reading.electric || ''}
                                onChange={e => setPumpReadings(prev => ({
                                  ...prev,
                                  [selectedIsland.id]: {
                                    ...prev[selectedIsland.id],
                                    [pump.id]: {
                                      ...reading,
                                      electric: parseFloat(e.target.value) || 0
                                    }
                                  }
                                }))}
                                min="0"
                              />
                              
                              <Input
                                label="Cash Meter"
                                type="number"
                                step="0.001"
                                value={reading.cash || ''}
                                onChange={e => setPumpReadings(prev => ({
                                  ...prev,
                                  [selectedIsland.id]: {
                                    ...prev[selectedIsland.id],
                                    [pump.id]: {
                                      ...reading,
                                      cash: parseFloat(e.target.value) || 0
                                    }
                                  }
                                }))}
                                min="0"
                              />
                              
                              <Input
                                label="Manual Meter"
                                type="number"
                                step="0.001"
                                value={reading.manual || ''}
                                onChange={e => setPumpReadings(prev => ({
                                  ...prev,
                                  [selectedIsland.id]: {
                                    ...prev[selectedIsland.id],
                                    [pump.id]: {
                                      ...reading,
                                      manual: parseFloat(e.target.value) || 0
                                    }
                                  }
                                }))}
                                min="0"
                              />
                              
                              <div className="flex items-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Auto-fill with current readings
                                    const currentReading = pump.currentReading || {};
                                    setPumpReadings(prev => ({
                                      ...prev,
                                      [selectedIsland.id]: {
                                        ...prev[selectedIsland.id],
                                        [pump.id]: {
                                          electric: currentReading.electric || 0,
                                          cash: currentReading.cash || 0,
                                          manual: currentReading.manual || 0
                                        }
                                      }
                                    }));
                                  }}
                                >
                                  Use Current
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shift Details */}
                <Card title="Shift Configuration" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Start Time *"
                      type="datetime-local"
                      value={shiftDetails.startTime}
                      onChange={e => setShiftDetails(prev => ({
                        ...prev,
                        startTime: e.target.value
                      }))}
                      icon={Clock}
                      error={validationErrors.startTime}
                    />
                    
                    <Input
                      label="End Time *"
                      type="datetime-local"
                      value={shiftDetails.endTime}
                      onChange={e => setShiftDetails(prev => ({
                        ...prev,
                        endTime: e.target.value
                      }))}
                      icon={Clock}
                      error={validationErrors.endTime}
                    />
                    
                    <Select
                      label="Supervisor In Charge *"
                      value={shiftDetails.supervisorId}
                      onChange={e => setShiftDetails(prev => ({
                        ...prev,
                        supervisorId: e.target.value
                      }))}
                      options={[
                        { value: '', label: 'Select Supervisor' },
                        ...availableSupervisors.map(supervisor => ({
                          value: supervisor.id,
                          label: supervisor.name,
                          description: supervisor.email
                        }))
                      ]}
                      icon={User}
                      error={validationErrors.supervisor}
                    />
                    
                    <Select
                      label="Price List (Optional)"
                      value={shiftDetails.priceListId}
                      onChange={e => setShiftDetails(prev => ({
                        ...prev,
                        priceListId: e.target.value
                      }))}
                      options={[
                        { value: '', label: 'Use Default Pricing' },
                        ...(state.priceLists || [])
                          .filter(pl => pl.stationId === currentStation && pl.status === 'ACTIVE')
                          .map(priceList => ({
                            value: priceList.id,
                            label: priceList.name,
                            description: `Effective: ${new Date(priceList.effectiveFrom).toLocaleDateString()}`
                          }))
                      ]}
                      icon={Package}
                    />
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'nonfuel' && (
              <div className="mt-4">
                <div className="text-center py-8">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Non-Fuel Items</h3>
                  <p className="text-gray-600 mb-4">Manage shop inventory and item assignments</p>
                  <Button variant="outline" onClick={() => setActiveTab('fuel')}>
                    Back to Fuel Meters
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={prevStep}>
                Back to Staff
              </Button>
              <div className="space-x-2">
                <Button variant="outline" onClick={skipNonFuel} icon={SkipForward}>
                  Skip Non-Fuel
                </Button>
                <Button 
                  onClick={nextStep}
                  icon={Package}
                >
                  Next: Non-Fuel Items
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Steps 4 and 5 would follow the same pattern */}
      </div>
    </Modal>
  );
};

export default CreateShiftModal;