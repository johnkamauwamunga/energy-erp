import React, { useState, useEffect } from 'react';
import { Card, Tabs, Tab, Input, Badge, Alert } from '../../../ui';
import { Zap, Package, Fuel, User, CheckCircle, AlertCircle } from 'lucide-react';
import { dummyData, mockServices, dummyDataHelpers } from './dummyData';

const AssetsConfigurationStep = ({ data, onChange, stationId }) => {
  const [islands, setIslands] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [activeIslandTab, setActiveIslandTab] = useState('');
  const [activeTankTab, setActiveTankTab] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStationAssets();
  }, [stationId]);

  const fetchStationAssets = async () => {
    setLoading(true);
    try {
      const stationAssets = await mockServices.stationService.getStationAssets(stationId);
      setIslands(stationAssets.assets || []);
      setTanks(dummyData.uniqueTanks || []);
      
      if (stationAssets.assets?.length > 0 && !activeIslandTab) {
        setActiveIslandTab(stationAssets.assets[0].islandId);
      }
      if (dummyData.uniqueTanks?.length > 0 && !activeTankTab) {
        setActiveTankTab(dummyData.uniqueTanks[0].tankId);
      }
    } catch (error) {
      console.error('Failed to fetch station assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIslandAssignment = (islandId, attendantId) => {
    const existingAssignmentIndex = data.islandAssignments.findIndex(
      assignment => assignment.islandId === islandId && assignment.attendantId === attendantId
    );

    let updatedAssignments;
    
    if (existingAssignmentIndex > -1) {
      updatedAssignments = data.islandAssignments.filter(
        (_, index) => index !== existingAssignmentIndex
      );
    } else {
      updatedAssignments = [
        ...data.islandAssignments,
        { islandId, attendantId, assignmentType: 'PRIMARY' }
      ];
    }

    onChange({ islandAssignments: updatedAssignments });
  };

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
          unitPrice: 0,
          [field]: parseFloat(value) || 0
        }
      ];
    }

    onChange({ pumpReadings: updatedReadings });
  };

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

  const getCurrentIsland = () => {
    return islands.find(island => island.islandId === activeIslandTab);
  };

  const getCurrentTank = () => {
    return tanks.find(tank => tank.tankId === activeTankTab);
  };

  const getIslandAssignments = (islandId) => {
    return data.islandAssignments.filter(assignment => assignment.islandId === islandId);
  };

  const getPumpReading = (pumpId) => {
    return data.pumpReadings.find(reading => reading.pumpId === pumpId);
  };

  const getTankReading = (tankId) => {
    return data.tankReadings.find(reading => reading.tankId === tankId);
  };

  const getAttendantsForIsland = (islandId) => {
    const assignments = getIslandAssignments(islandId);
    return assignments.map(assignment => 
      dummyDataHelpers.getUserById(assignment.attendantId)
    ).filter(Boolean);
  };

  return (
    <div className="space-y-4">
      {/* Islands Configuration - Compact */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm">Islands & Pumps</span>
        </div>

        {/* Compact Islands Tabs */}
        <Tabs value={activeIslandTab} onChange={setActiveIslandTab} size="sm">
          {islands.map(island => {
            const islandAttendants = getIslandAssignments(island.id);
            return (
              <Tab 
                key={island.islandId} 
                value={island.islandId}
                badge={islandAttendants.length > 0 ? islandAttendants.length.toString() : null}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span className="truncate max-w-20">{island.islandName}</span>
                  {islandAttendants.length > 0 && (
                    <Badge variant="success" size="sm">
                      {islandAttendants.length}
                    </Badge>
                  )}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* Island Content */}
        {getCurrentIsland() && (
          <div className="mt-4 space-y-4">
            {/* Compact Island Assignment */}
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <h4 className="font-semibold mb-2 text-sm flex items-center gap-1">
                <User className="w-3 h-3" />
                Assign to {getCurrentIsland().islandName}
              </h4>
              
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                {data.attendants.map(attendantId => {
                  const attendant = dummyDataHelpers.getUserById(attendantId);
                  const isAssigned = getIslandAssignments(getCurrentIsland().islandId)
                    .some(a => a.attendantId === attendantId);
                  
                  if (!attendant) return null;
                  
                  return (
                    <div
                      key={attendant.id}
                      className={`p-2 border rounded-md cursor-pointer transition-colors text-xs ${
                        isAssigned
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleIslandAssignment(getCurrentIsland().islandId, attendant.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">
                          {attendant.firstName}
                        </span>
                        {isAssigned && (
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {getAttendantsForIsland(getCurrentIsland().islandId).length > 0 && (
                <div className="mt-2 p-2 bg-white rounded border text-xs">
                  <p className="font-medium text-gray-700 mb-1">Assigned:</p>
                  <div className="flex flex-wrap gap-1">
                    {getAttendantsForIsland(getCurrentIsland().islandId).map(attendant => (
                      <Badge key={attendant.id} variant="success" size="sm">
                        {attendant.firstName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Compact Pumps Configuration */}
            <div>
              <h4 className="font-semibold mb-3 text-sm flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Pump Readings ({getCurrentIsland().pumps?.length || 0})
              </h4>
              
              <div className="space-y-3">
                {getCurrentIsland().pumps?.map(pump => {
                  const reading = getPumpReading(pump.pumpId);
                  const previousReading = dummyDataHelpers.getPreviousPumpReading(pump.pumpId);
                  
                  return (
                    <Card key={pump.pumpId} className="p-3 border text-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <h5 className="font-semibold truncate">{pump.pumpName}</h5>
                          <p className="text-gray-600 text-xs truncate">{pump.productName}</p>
                        </div>
                        <Badge variant={reading ? "success" : "warning"} size="sm">
                          {reading ? "✓" : "Pending"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          label="Electric"
                          type="number"
                          size="sm"
                          value={reading?.electricMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.pumpId, 'electricMeter', e.target.value)
                          }
                          placeholder="0"
                          helperText={previousReading ? `Prev: ${previousReading.electricMeter}` : ''}
                        />
                        
                        <Input
                          label="Manual"
                          type="number"
                          size="sm"
                          value={reading?.manualMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.pumpId, 'manualMeter', e.target.value)
                          }
                          placeholder="0"
                          helperText={previousReading ? `Prev: ${previousReading.manualMeter}` : ''}
                        />
                        
                        <Input
                          label="Cash"
                          type="number"
                          size="sm"
                          value={reading?.cashMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.pumpId, 'cashMeter', e.target.value)
                          }
                          placeholder="0"
                          helperText={previousReading ? `Prev: ${previousReading.cashMeter}` : ''}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Tanks Configuration - Compact */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Fuel className="w-4 h-4 text-orange-600" />
          <span className="font-semibold text-sm">Tank Readings</span>
        </div>

        {/* Compact Tanks Tabs */}
        <Tabs value={activeTankTab} onChange={setActiveTankTab} size="sm">
          {tanks.map(tank => {
            const reading = getTankReading(tank.tankId);
            return (
              <Tab 
                key={tank.tankId} 
                value={tank.tankId}
                badge={reading ? '✓' : null}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span className="truncate max-w-20">{tank.tankName}</span>
                  {reading && (
                    <Badge variant="success" size="sm">
                      ✓
                    </Badge>
                  )}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* Tank Content */}
        {getCurrentTank() && (
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-3 text-sm">{getCurrentTank().tankName}</h4>
                <div className="space-y-3">
                  <Input
                    label="Dip Value (m)"
                    type="number"
                    step="0.01"
                    size="sm"
                    value={getTankReading(getCurrentTank().tankId)?.dipValue || ''}
                    onChange={(e) => 
                      handleTankReadingUpdate(getCurrentTank().tankId, 'dipValue', e.target.value)
                    }
                    placeholder="0.00"
                    helperText={`Prev: ${getCurrentTank().lastDipValue}m`}
                  />
                  
                  <Input
                    label="Volume (L)"
                    type="number"
                    size="sm"
                    value={getTankReading(getCurrentTank().tankId)?.volume || ''}
                    onChange={(e) => 
                      handleTankReadingUpdate(getCurrentTank().tankId, 'volume', e.target.value)
                    }
                    placeholder="0"
                    helperText={`Current: ${getCurrentTank().currentVolume}L`}
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded border text-xs">
                <h5 className="font-semibold mb-2">Tank Info</h5>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product:</span>
                    <span className="font-medium truncate max-w-20">{getCurrentTank().productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capacity:</span>
                    <span className="font-medium">{getCurrentTank().capacity.toLocaleString()}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current:</span>
                    <span className="font-medium">{getCurrentTank().currentVolume.toLocaleString()}L</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Compact Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border">
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 text-xs">
          <div className="text-center">
            <p className="font-semibold text-gray-700">Islands</p>
            <p className="text-lg font-bold text-blue-600">
              {new Set(data.islandAssignments.map(a => a.islandId)).size}
            </p>
            <p className="text-gray-600">of {islands.length}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700">Pumps</p>
            <p className="text-lg font-bold text-green-600">{data.pumpReadings.length}</p>
            <p className="text-gray-600">
              of {islands.reduce((total, island) => total + (island.pumps?.length || 0), 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700">Tanks</p>
            <p className="text-lg font-bold text-orange-600">{data.tankReadings.length}</p>
            <p className="text-gray-600">of {tanks.length}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700">Attendants</p>
            <p className="text-lg font-bold text-purple-600">
              {new Set(data.islandAssignments.map(a => a.attendantId)).size}
            </p>
            <p className="text-gray-600">of {data.attendants.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsConfigurationStep;