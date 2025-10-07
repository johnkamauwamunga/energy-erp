import React, { useState, useEffect, useMemo } from 'react';
import { Card, Tabs, Tab, Input, Badge, Alert, Button } from '../../../ui';
import { Zap, Package, Fuel, User, CheckCircle, ArrowRight, ArrowLeft, Save } from 'lucide-react';
import { dummyData, mockServices, dummyDataHelpers } from './dummyData';
import { connectedAssetService } from '../../../../services/connectedAssetsService/connectedAssetsService';
import { useApp } from '../../../../context/AppContext';
import { shiftService } from '../../../../services/shiftService/shiftService';

const AssetsConfigurationStep = ({ data, onChange, stationId, shiftId, onSave }) => {
  const { state } = useApp();
  const [islands, setIslands] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [activeMainTab, setActiveMainTab] = useState('islands');
  const [selectedIslandId, setSelectedIslandId] = useState('');
  const [activePumpIndex, setActivePumpIndex] = useState(0);
  const [selectedTankId, setSelectedTankId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [persistedAttendants, setPersistedAttendants] = useState([]);

  const currentStation = state.currentStation?.id;
  const shiftDetails = localStorage.getItem("currentShiftId");
  const currentUser = state.currentUser?.id; // This should have the supervisor/current user info
console.log("current shift ",shiftDetails);
  // Load attendants from localStorage
  useEffect(() => {
    const savedAttendants = localStorage.getItem('currentShiftAttendants');
    if (savedAttendants) {
      try {
        const parsedAttendants = JSON.parse(savedAttendants);
        console.log('📥 Loaded attendants in Assets step:', parsedAttendants);
        setPersistedAttendants(parsedAttendants);
      } catch (e) {
        console.error('❌ Error loading attendants in Assets step:', e);
      }
    }
  }, []);

  // Fetch assets data
  useEffect(() => {
    const fetchAssets = async() => {
      try {
        const result = await connectedAssetService.getStationAssetsSimplified(currentStation);
       // console.log('connected assets ', result);
        
        // Filter islands to only show those with pumps
        const islandsWithPumps = result.assets.filter(island => 
          island.pumps && island.pumps.length > 0
        );
        
       // console.log("islands with pumps ",islandsWithPumps);
        setIslands(islandsWithPumps);
        
        // Extract unique tanks from all pumps
        const allTanks = [];
        result.assets.forEach(island => {
          island.pumps?.forEach(pump => {
            if (pump.tank && !allTanks.find(t => t.tankId === pump.tank.tankId)) {
              allTanks.push(pump.tank);
            }
          });
        });
        
        setTanks(allTanks);
        
        // Auto-select first island with pumps if available
        if (islandsWithPumps.length > 0 && !selectedIslandId) {
          setSelectedIslandId(islandsWithPumps[0].islandId);
        }
        
        // Auto-select first tank if available
        if (allTanks.length > 0 && !selectedTankId) {
          setSelectedTankId(allTanks[0].tankId);
        }
        
      } catch(e) {
        console.log("failed to get assets", e);
      }
    };
    
    if (currentStation) {
      fetchAssets();
    }
  }, [currentStation]);

  // Get selected island
  const selectedIsland = useMemo(() => {
    return islands.find(island => island.islandId === selectedIslandId);
  }, [islands, selectedIslandId]);

  // Get selected tank
  const selectedTank = useMemo(() => {
    return tanks.find(tank => tank.tankId === selectedTankId);
  }, [tanks, selectedTankId]);

  // Get current pump
  const currentPump = useMemo(() => {
    return selectedIsland?.pumps?.[activePumpIndex];
  }, [selectedIsland, activePumpIndex]);

  // Island assignments for current island
  const getIslandAssignments = (islandId) => {
    return data.islandAssignments.filter(assignment => assignment.islandId === islandId);
  };

  // Check if attendant is assigned to current island
  const isAttendantAssigned = (attendantId, islandId) => {
    return data.islandAssignments.some(assignment => 
      assignment.islandId === islandId && assignment.attendantId === attendantId
    );
  };

  // Handle island assignment
  const handleIslandAssignment = (islandId, attendantId) => {
    const existingAssignmentIndex = data.islandAssignments.findIndex(
      assignment => assignment.islandId === islandId && assignment.attendantId === attendantId
    );

    let updatedAssignments;
    
    if (existingAssignmentIndex > -1) {
      // Remove assignment
      updatedAssignments = data.islandAssignments.filter(
        (_, index) => index !== existingAssignmentIndex
      );
    } else {
      // Add assignment
      updatedAssignments = [
        ...data.islandAssignments,
        { 
          islandId, 
          attendantId, 
          assignmentType: 'PRIMARY' 
        }
      ];
    }

    onChange({ islandAssignments: updatedAssignments });
  };

  // Handle pump reading update
  const handlePumpReadingUpdate = (pumpId, field, value) => {
    const existingReading = data.pumpReadings.find(reading => reading.pumpId === pumpId);

    let updatedReadings;

    if (existingReading) {
      updatedReadings = data.pumpReadings.map(reading =>
        reading.pumpId === pumpId
          ? { ...reading, [field]: parseFloat(value) || 0 }
          : reading
      );
    } else {
      updatedReadings = [
        ...data.pumpReadings,
        {
          pumpId,
          electricMeter: 0,
          manualMeter: 0,
          cashMeter: 0,
          litersDispensed: 0,
          salesValue: 0,
          unitPrice: 150.0, // Default price
          [field]: parseFloat(value) || 0
        }
      ];
    }

    onChange({ pumpReadings: updatedReadings });
  };

  // Handle tank reading update
  const handleTankReadingUpdate = (tankId, field, value) => {
    const existingReading = data.tankReadings.find(reading => reading.tankId === tankId);

    let updatedReadings;

    if (existingReading) {
      updatedReadings = data.tankReadings.map(reading =>
        reading.tankId === tankId
          ? { ...reading, [field]: parseFloat(value) || 0 }
          : reading
      );
    } else {
      updatedReadings = [
        ...data.tankReadings,
        {
          tankId,
          dipValue: 0,
          volume: 0,
          temperature: 25.0,
          waterLevel: 0.0,
          density: 0.85,
          [field]: parseFloat(value) || 0
        }
      ];
    }

    onChange({ tankReadings: updatedReadings });
  };

  // Get pump reading
  const getPumpReading = (pumpId) => {
    return data.pumpReadings.find(reading => reading.pumpId === pumpId);
  };

  // Get tank reading
  const getTankReading = (tankId) => {
    return data.tankReadings.find(reading => reading.tankId === tankId);
  };

  // Pump navigation
  const nextPump = () => {
    if (selectedIsland?.pumps && activePumpIndex < selectedIsland.pumps.length - 1) {
      setActivePumpIndex(activePumpIndex + 1);
    }
  };

  const prevPump = () => {
    if (activePumpIndex > 0) {
      setActivePumpIndex(activePumpIndex - 1);
    }
  };

  // Save all configurations
  const handleSaveConfiguration = async () => {
    if (!shiftDetails) {
      setSaveError('No shift ID available');
      return;
    }

    if (!currentUser) {
      setSaveError('No user information available');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    console.log('💾 Saving configuration');
    try {
      const payload = {
        shiftId: shiftId,
        recordedById: currentUser,
        islandAssignments: data.islandAssignments,
        pumpReadings: data.pumpReadings,
        tankReadings: data.tankReadings
      };

      console.log('💾 Saving configuration:', payload);
      
      const result = await shiftService.openShift(payload);
      console.log('✅ Configuration saved successfully:', result);
      
      setSaveSuccess(true);
      
      // Notify parent component
      if (onSave) {
        onSave(result);
      }
      
      // Auto-clear success message
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to save configuration:', error);
      setSaveError(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const availableAttendants = persistedAttendants.length > 0 ? persistedAttendants : [];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Alert variant="info" className="text-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>
              Configuring assets for Shift: <code className="bg-blue-100 px-2 py-1 rounded text-xs">{shiftId}</code>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {availableAttendants.length} attendants
            </Badge>
            <Badge variant="outline">
              {islands.length} islands with pumps
            </Badge>
            <Badge variant="outline">
              {tanks.length} tanks
            </Badge>
          </div>
        </div>
      </Alert>

      {/* Main Tabs */}
      <Card className="p-4">
        <Tabs value={activeMainTab} onChange={setActiveMainTab}>
          <Tab value="islands" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>Islands & Pumps</span>
            <Badge variant="outline" size="sm">
              {islands.length}
            </Badge>
          </Tab>
          
          <Tab value="tanks" className="flex items-center gap-2">
            <Fuel className="w-4 h-4" />
            <span>Tank Readings</span>
            <Badge variant="outline" size="sm">
              {tanks.length}
            </Badge>
          </Tab>
        </Tabs>

        {/* Islands & Pumps Content */}
        {activeMainTab === 'islands' && (
          <div className="mt-6 space-y-6">
            {/* Island Selection */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                Select Island
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {islands.map(island => {
                  const assignments = getIslandAssignments(island.islandId);
                  const isSelected = selectedIslandId === island.islandId;
                  
                  return (
                    <button
                      key={island.islandId}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-100 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => {
                        setSelectedIslandId(island.islandId);
                        setActivePumpIndex(0);
                      }}
                    >
                      <div className="font-semibold text-sm">{island.islandName}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {island.pumps?.length || 0} pumps
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {assignments.length > 0 ? (
                          <Badge variant="success" size="sm">
                            {assignments.length} attendants
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            No attendants
                          </Badge>
                        )}
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Island Configuration */}
            {selectedIsland && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Attendants & Pump List */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Attendant Assignment */}
                  <Card className="p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-green-600" />
                      Assign Attendants to {selectedIsland.islandName}
                    </h4>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availableAttendants.map(attendant => {
                        const isAssigned = isAttendantAssigned(attendant.id, selectedIsland.islandId);
                        
                        return (
                          <div
                            key={attendant.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isAssigned
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleIslandAssignment(selectedIsland.islandId, attendant.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {attendant.firstName} {attendant.lastName}
                                </div>
                                <div className="text-xs text-gray-600 truncate">
                                  {attendant.email}
                                </div>
                              </div>
                              {isAssigned && (
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {getIslandAssignments(selectedIsland.islandId).length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 rounded border">
                        <p className="font-medium text-green-900 text-sm mb-2">
                          Assigned to {selectedIsland.islandName}:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {getIslandAssignments(selectedIsland.islandId).map(assignment => {
                            const attendant = availableAttendants.find(a => a.id === assignment.attendantId);
                            return attendant ? (
                              <Badge key={attendant.id} variant="success" size="sm">
                                {attendant.firstName}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Pump List */}
                  <Card className="p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-600" />
                      Pumps on {selectedIsland.islandName}
                    </h4>
                    
                    <div className="space-y-2">
                      {selectedIsland.pumps?.map((pump, index) => {
                        const reading = getPumpReading(pump.pumpId);
                        const isActive = activePumpIndex === index;
                        
                        return (
                          <button
                            key={pump.pumpId}
                            className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                              isActive
                                ? 'border-orange-500 bg-orange-50 shadow-md'
                                : reading
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setActivePumpIndex(index)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">
                                  {pump.pumpName}
                                </div>
                                <div className="text-xs text-gray-600 truncate">
                                  {pump.productName || 'No Product'}
                                </div>
                                {pump.tank && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    Tank: {pump.tank.tankName}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {reading ? (
                                  <Badge variant="success" size="sm">Completed</Badge>
                                ) : (
                                  <Badge variant="warning" size="sm">Pending</Badge>
                                )}
                                {isActive && (
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                {/* Right Column - Pump Configuration */}
                <div className="lg:col-span-2">
                  {currentPump && (
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-semibold text-xl">{currentPump.pumpName}</h3>
                          <p className="text-gray-600">
                            {currentPump.productName || 'No Product Assigned'}
                          </p>
                          {currentPump.tank && (
                            <p className="text-sm text-blue-600 mt-1">
                              Connected to Tank: {currentPump.tank.tankName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            Pump {activePumpIndex + 1} of {selectedIsland.pumps?.length}
                          </div>
                          <div className="text-xs text-gray-500">
                            Island: {selectedIsland.islandName}
                          </div>
                        </div>
                      </div>

                      {/* Pump Readings Form */}
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input
                            label="Electric Meter"
                            type="number"
                            step="0.1"
                            value={getPumpReading(currentPump.pumpId)?.electricMeter || ''}
                            onChange={(e) => 
                              handlePumpReadingUpdate(currentPump.pumpId, 'electricMeter', e.target.value)
                            }
                            placeholder="0.0"
                            helperText="Current electric meter reading"
                          />
                          
                          <Input
                            label="Manual Meter"
                            type="number"
                            step="0.1"
                            value={getPumpReading(currentPump.pumpId)?.manualMeter || ''}
                            onChange={(e) => 
                              handlePumpReadingUpdate(currentPump.pumpId, 'manualMeter', e.target.value)
                            }
                            placeholder="0.0"
                            helperText="Current manual meter reading"
                          />
                          
                          <Input
                            label="Cash Meter"
                            type="number"
                            step="0.1"
                            value={getPumpReading(currentPump.pumpId)?.cashMeter || ''}
                            onChange={(e) => 
                              handlePumpReadingUpdate(currentPump.pumpId, 'cashMeter', e.target.value)
                            }
                            placeholder="0.0"
                            helperText="Current cash meter reading"
                          />
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex justify-between pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={prevPump}
                            disabled={activePumpIndex === 0}
                            icon={ArrowLeft}
                          >
                            Previous Pump
                          </Button>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              {selectedIsland.pumps?.filter(pump => 
                                getPumpReading(pump.pumpId)
                              ).length || 0} of {selectedIsland.pumps?.length} completed
                            </span>
                          </div>
                          
                          <Button
                            variant="cosmic"
                            onClick={nextPump}
                            disabled={activePumpIndex === (selectedIsland.pumps?.length - 1)}
                            icon={ArrowRight}
                          >
                            Next Pump
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tanks Content */}
        {activeMainTab === 'tanks' && (
          <div className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tank List */}
              <div className="lg:col-span-1">
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-orange-600" />
                    Select Tank
                  </h3>
                  
                  <div className="space-y-3">
                    {tanks.map(tank => {
                      const reading = getTankReading(tank.tankId);
                      const isSelected = selectedTankId === tank.tankId;
                      const connectedPumps = islands.flatMap(island => 
                        island.pumps?.filter(pump => pump.tank?.tankId === tank.tankId) || []
                      );
                      
                      return (
                        <button
                          key={tank.tankId}
                          className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50 shadow-md'
                              : reading
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedTankId(tank.tankId)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-sm">{tank.tankName}</div>
                            {reading ? (
                              <Badge variant="success" size="sm">Recorded</Badge>
                            ) : (
                              <Badge variant="warning" size="sm">Pending</Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Product: {tank.productName}</div>
                            <div>Capacity: {tank.capacity.toLocaleString()}L</div>
                            <div>Current: {tank.currentVolume.toLocaleString()}L</div>
                            <div className="text-blue-600">
                              {connectedPumps.length} pump(s) connected
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-full h-1 bg-orange-500 rounded-full mt-2"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Tank Readings Form */}
              <div className="lg:col-span-2">
                {selectedTank && (
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-semibold text-xl">{selectedTank.tankName}</h3>
                        <p className="text-gray-600">{selectedTank.productName}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" size="lg">
                          Capacity: {selectedTank.capacity.toLocaleString()}L
                        </Badge>
                        <div className="text-sm text-gray-600 mt-1">
                          Current: {selectedTank.currentVolume.toLocaleString()}L
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Input
                          label="Dip Value (meters)"
                          type="number"
                          step="0.01"
                          value={getTankReading(selectedTank.tankId)?.dipValue || ''}
                          onChange={(e) => 
                            handleTankReadingUpdate(selectedTank.tankId, 'dipValue', e.target.value)
                          }
                          placeholder="0.00"
                          helperText="Current dip stick measurement"
                        />
                        
                        <Input
                          label="Volume (liters)"
                          type="number"
                          value={getTankReading(selectedTank.tankId)?.volume || ''}
                          onChange={(e) => 
                            handleTankReadingUpdate(selectedTank.tankId, 'volume', e.target.value)
                          }
                          placeholder="0"
                          helperText={`Current volume (Available: ${(selectedTank.capacity - selectedTank.currentVolume).toLocaleString()}L)`}
                        />
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <h4 className="font-semibold text-sm mb-3">Tank Information</h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-gray-600">Product:</span>
                            <span className="font-semibold">{selectedTank.productName}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-gray-600">Total Capacity:</span>
                            <span className="font-semibold">{selectedTank.capacity.toLocaleString()}L</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-gray-600">Current Volume:</span>
                            <span className="font-semibold">{selectedTank.currentVolume.toLocaleString()}L</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-gray-600">Available Space:</span>
                            <span className="font-semibold text-green-600">
                              {(selectedTank.capacity - selectedTank.currentVolume).toLocaleString()}L
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600">Connected Pumps:</span>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {islands.flatMap(island => 
                                island.pumps
                                  ?.filter(pump => pump.tank?.tankId === selectedTank.tankId)
                                  .map(pump => (
                                    <Badge key={pump.pumpId} variant="outline" size="sm">
                                      {pump.pumpName}
                                    </Badge>
                                  )) || []
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Progress Summary & Save Button */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {new Set(data.islandAssignments.map(a => a.islandId)).size}
              </div>
              <div className="text-gray-600 text-sm">Islands Configured</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.pumpReadings.length}
              </div>
              <div className="text-gray-600 text-sm">Pumps Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data.tankReadings.length}
              </div>
              <div className="text-gray-600 text-sm">Tanks Recorded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(data.islandAssignments.map(a => a.attendantId)).size}
              </div>
              <div className="text-gray-600 text-sm">Attendants Assigned</div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSaveConfiguration}
              disabled={saving || !shiftDetails || !currentUser}
              loading={saving}
              icon={Save}
              size="lg"
              className="whitespace-nowrap"
            >
              {saving ? 'Saving Configuration...' : 'Save All Configurations'}
            </Button>
            <div className="text-xs text-gray-500 text-center">
              Recorded by: {currentUser?.firstName || 'Current User'}
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {saveError && (
        <Alert variant="error" className="text-sm">
          {saveError}
        </Alert>
      )}
      
      {saveSuccess && (
        <Alert variant="success" className="text-sm">
          All configurations saved successfully!
        </Alert>
      )}
    </div>
  );
};

export default AssetsConfigurationStep;