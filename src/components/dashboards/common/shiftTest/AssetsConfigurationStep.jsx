import React, { useState, useEffect } from 'react';
import { Card, Tabs, Tab, Input, Button, Badge, Select, Alert } from '../../../ui';
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
      // Use mock service
      const stationAssets = await mockServices.stationService.getStationAssets(stationId);
      setIslands(stationAssets.assets || []);
      setTanks(dummyData.uniqueTanks || []);
      
      // Set first island and tank as active tabs
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

  const handleIslandAssignment = (islandId, attendantId, assignmentType = 'PRIMARY') => {
    const existingAssignmentIndex = data.islandAssignments.findIndex(
      assignment => assignment.islandId === islandId && assignment.attendantId === attendantId
    );

    let updatedAssignments;
    
    if (existingAssignmentIndex > -1) {
      // Remove assignment if same attendant clicked again
      updatedAssignments = data.islandAssignments.filter(
        (_, index) => index !== existingAssignmentIndex
      );
    } else {
      // Add new assignment
      updatedAssignments = [
        ...data.islandAssignments,
        { islandId, attendantId, assignmentType }
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
    <div className="space-y-6">
      {/* Islands Configuration */}
      <Card title="Islands & Pumps Configuration" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-blue-600" />
          <span className="font-semibold">Configure Islands and Assign Attendants</span>
        </div>

        {/* Islands Tabs */}
        <Tabs value={activeIslandTab} onChange={setActiveIslandTab}>
          {islands.map(island => {
            const islandAttendants = getIslandAssignments(island.id);
            return (
              <Tab 
                key={island.islandId} 
                value={island.islandId}
                badge={islandAttendants.length > 0 ? islandAttendants.length.toString() : null}
              >
                <div className="flex items-center gap-2">
                  {island.islandName}
                  {islandAttendants.length > 0 && (
                    <Badge variant="success" className="text-xs">
                      {islandAttendants.length} assigned
                    </Badge>
                  )}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* Island Content */}
        {getCurrentIsland() && (
          <div className="mt-6 space-y-6">
            {/* Island Assignment Section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Assign Attendants to {getCurrentIsland().islandName}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.attendants.map(attendantId => {
                  const attendant = dummyDataHelpers.getUserById(attendantId);
                  const isAssigned = getIslandAssignments(getCurrentIsland().islandId)
                    .some(a => a.attendantId === attendantId);
                  
                  if (!attendant) return null;
                  
                  return (
                    <div
                      key={attendant.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        isAssigned
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleIslandAssignment(getCurrentIsland().islandId, attendant.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            isAssigned ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                          <span className="font-medium text-sm">
                            {attendant.firstName} {attendant.lastName}
                          </span>
                        </div>
                        {isAssigned && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {getAttendantsForIsland(getCurrentIsland().islandId).length > 0 && (
                <div className="mt-3 p-2 bg-white rounded border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Assigned to this island:</p>
                  <div className="flex flex-wrap gap-1">
                    {getAttendantsForIsland(getCurrentIsland().islandId).map(attendant => (
                      <Badge key={attendant.id} variant="success" className="text-xs">
                        {attendant.firstName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pumps Configuration */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Pump Meter Readings - {getCurrentIsland().pumps?.length || 0} Pumps
              </h4>
              
              <div className="space-y-4">
                {getCurrentIsland().pumps?.map(pump => {
                  const reading = getPumpReading(pump.pumpId);
                  const previousReading = dummyDataHelpers.getPreviousPumpReading(pump.pumpId);
                  
                  return (
                    <Card key={pump.pumpId} className="p-4 border">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h5 className="font-semibold">{pump.pumpName}</h5>
                          <p className="text-sm text-gray-600">{pump.productName}</p>
                        </div>
                        <Badge variant={reading ? "success" : "warning"}>
                          {reading ? "Configured" : "Pending"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="Electric Meter"
                          type="number"
                          value={reading?.electricMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.pumpId, 'electricMeter', e.target.value)
                          }
                          placeholder="0.00"
                          helperText={previousReading ? `Previous: ${previousReading.electricMeter}` : ''}
                        />
                        
                        <Input
                          label="Manual Meter"
                          type="number"
                          value={reading?.manualMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.pumpId, 'manualMeter', e.target.value)
                          }
                          placeholder="0.00"
                          helperText={previousReading ? `Previous: ${previousReading.manualMeter}` : ''}
                        />
                        
                        <Input
                          label="Cash Meter"
                          type="number"
                          value={reading?.cashMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.pumpId, 'cashMeter', e.target.value)
                          }
                          placeholder="0.00"
                          helperText={previousReading ? `Previous: ${previousReading.cashMeter}` : ''}
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

      {/* Tanks Configuration */}
      <Card title="Tank Dip Readings" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Fuel className="w-5 h-5 text-orange-600" />
          <span className="font-semibold">Record Tank Dip Readings</span>
        </div>

        {/* Tanks Tabs */}
        <Tabs value={activeTankTab} onChange={setActiveTankTab}>
          {tanks.map(tank => {
            const reading = getTankReading(tank.tankId);
            return (
              <Tab 
                key={tank.tankId} 
                value={tank.tankId}
                badge={reading ? '✓' : null}
              >
                <div className="flex items-center gap-2">
                  {tank.tankName}
                  {reading && (
                    <Badge variant="success" className="text-xs">
                      Recorded
                    </Badge>
                  )}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* Tank Content */}
        {getCurrentTank() && (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-4">{getCurrentTank().tankName}</h4>
                <div className="space-y-4">
                  <Input
                    label="Dip Value (meters)"
                    type="number"
                    step="0.01"
                    value={getTankReading(getCurrentTank().tankId)?.dipValue || ''}
                    onChange={(e) => 
                      handleTankReadingUpdate(getCurrentTank().tankId, 'dipValue', e.target.value)
                    }
                    placeholder="0.00"
                    helperText={`Previous: ${getCurrentTank().lastDipValue}m`}
                  />
                  
                  <Input
                    label="Volume (liters)"
                    type="number"
                    value={getTankReading(getCurrentTank().tankId)?.volume || ''}
                    onChange={(e) => 
                      handleTankReadingUpdate(getCurrentTank().tankId, 'volume', e.target.value)
                    }
                    placeholder="0"
                    helperText={`Current: ${getCurrentTank().currentVolume}L`}
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-semibold mb-3">Tank Information</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product:</span>
                    <span className="font-medium">{getCurrentTank().productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capacity:</span>
                    <span className="font-medium">{getCurrentTank().capacity.toLocaleString()}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Volume:</span>
                    <span className="font-medium">{getCurrentTank().currentVolume.toLocaleString()}L</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Configuration Summary */}
      <Card title="Configuration Summary" className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <p className="font-semibold text-gray-700">Islands Configured</p>
            <p className="text-2xl font-bold text-blue-600">
              {new Set(data.islandAssignments.map(a => a.islandId)).size}
            </p>
            <p className="text-xs text-gray-600">of {islands.length}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700">Pumps Configured</p>
            <p className="text-2xl font-bold text-green-600">{data.pumpReadings.length}</p>
            <p className="text-xs text-gray-600">
              of {islands.reduce((total, island) => total + (island.pumps?.length || 0), 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700">Tanks Recorded</p>
            <p className="text-2xl font-bold text-orange-600">{data.tankReadings.length}</p>
            <p className="text-xs text-gray-600">of {tanks.length}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700">Attendants Assigned</p>
            <p className="text-2xl font-bold text-purple-600">
              {new Set(data.islandAssignments.map(a => a.attendantId)).size}
            </p>
            <p className="text-xs text-gray-600">of {data.attendants.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AssetsConfigurationStep;