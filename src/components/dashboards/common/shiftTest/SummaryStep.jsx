import React, { useState, useEffect } from 'react';
import { Card, Badge, Table, Alert, Button } from '../../../ui';
import { CheckCircle, AlertCircle, Package, Zap, Fuel, User, Play, Save } from 'lucide-react';
import { dummyData, dummyDataHelpers } from './dummyData';
import { connectedAssetService } from '../../../../services/connectedAssetsService/connectedAssetsService';

const SummaryStep = ({ data, shiftId, onFinalCreate }) => {
  const [assetsData, setAssetsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Load the actual configuration data from localStorage or props
  useEffect(() => {
    const loadConfigurationData = () => {
      setLoading(true);
      try {
        console.log('📊 Using configuration data from props:', data);
        
        // You can also load from localStorage if needed
        const savedAttendants = localStorage.getItem('currentShiftAttendants');
        const savedShiftId = localStorage.getItem('currentShiftId');
        
        console.log('💾 Loaded from localStorage:', {
          savedAttendants: savedAttendants ? JSON.parse(savedAttendants) : null,
          savedShiftId
        });
        
        setAssetsData({
          shiftId: shiftId || savedShiftId,
          configuration: data
        });
        
      } catch (err) {
        console.error('❌ Error loading configuration:', err);
        setError('Failed to load configuration data');
      } finally {
        setLoading(false);
      }
    };

    loadConfigurationData();
  }, [data, shiftId]);

  // Helper functions to get names from actual data
  const getIslandName = (islandId) => {
    // Try to get from actual configuration data first
    if (assetsData?.configuration?.islands) {
      const island = assetsData.configuration.islands.find(i => i.islandId === islandId);
      if (island) return island.islandName;
    }
    
    // Fallback to dummy data
    const island = dummyData.stationAssets.assets.find(i => i.islandId === islandId);
    return island ? island.islandName : `Island ${islandId?.substring(0, 8)}`;
  };

  const getPumpName = (pumpId) => {
    // Try to get from actual configuration data first
    if (assetsData?.configuration?.islands) {
      for (let island of assetsData.configuration.islands) {
        const pump = island.pumps?.find(p => p.pumpId === pumpId);
        if (pump) return pump.pumpName;
      }
    }
    
    // Fallback to dummy data
    for (let island of dummyData.stationAssets.assets) {
      const pump = island.pumps.find(p => p.pumpId === pumpId);
      if (pump) return pump.pumpName;
    }
    return `Pump ${pumpId?.substring(0, 8)}`;
  };

  const getTankName = (tankId) => {
    // Try to get from actual configuration data first
    if (assetsData?.configuration?.tanks) {
      const tank = assetsData.configuration.tanks.find(t => t.tankId === tankId);
      if (tank) return tank.tankName;
    }
    
    // Fallback to dummy data
    const tank = dummyData.uniqueTanks.find(t => t.tankId === tankId);
    return tank ? tank.tankName : `Tank ${tankId?.substring(0, 8)}`;
  };

  const getUserName = (userId) => {
    const user = dummyDataHelpers.getUserById(userId);
    return user ? `${user.firstName} ${user.lastName}` : `User ${userId?.substring(0, 8)}`;
  };

  const getSupervisorName = () => {
    return getUserName(data.supervisorId);
  };

  // Handle final shift creation
  const handleFinalCreate = async () => {
    if (!shiftId) {
      setError('No shift ID available');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      console.log('🎯 Finalizing shift creation with ID:', shiftId);
      
      // You can add any final API calls here if needed
      // For example, verify the shift is ready to start
      
      if (onFinalCreate) {
        await onFinalCreate(shiftId, data);
      }
      
      setCreateSuccess(true);
      
      // Clear localStorage after successful creation
      setTimeout(() => {
        localStorage.removeItem('currentShiftId');
        localStorage.removeItem('currentShiftAttendants');
        localStorage.removeItem('currentShiftNumber');
        localStorage.removeItem('currentShiftStartTime');
        localStorage.removeItem('currentShiftStation');
      }, 2000);
      
    } catch (err) {
      console.error('❌ Failed to finalize shift:', err);
      setError(err.message || 'Failed to create shift');
    } finally {
      setCreating(false);
    }
  };

  // Group island assignments by island
  const assignmentsByIsland = data.islandAssignments.reduce((acc, assignment) => {
    if (!acc[assignment.islandId]) {
      acc[assignment.islandId] = [];
    }
    acc[assignment.islandId].push(assignment);
    return acc;
  }, {});

  // Calculate completion statistics
  const completionStats = {
    islands: new Set(data.islandAssignments.map(a => a.islandId)).size,
    pumps: data.pumpReadings.length,
    tanks: data.tankReadings.length,
    attendants: new Set(data.islandAssignments.map(a => a.attendantId)).size
  };

  const isConfigurationComplete = completionStats.pumps > 0 && completionStats.tanks > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Shift Configuration Summary</h2>
        <p className="text-gray-600 mt-2">Review all configurations before starting the shift</p>
      </div>

      {/* Status Alert */}
      {createSuccess ? (
        <Alert variant="success" className="text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Shift Ready to Start!</p>
              <p>All configurations have been saved successfully. The shift is now active.</p>
            </div>
          </div>
        </Alert>
      ) : isConfigurationComplete ? (
        <Alert variant="success" className="text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Configuration Complete</p>
              <p>All required configurations have been set. Ready to start the shift.</p>
            </div>
          </div>
        </Alert>
      ) : (
        <Alert variant="warning" className="text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Configuration Incomplete</p>
              <p>Some required configurations are missing. Please complete all sections.</p>
            </div>
          </div>
        </Alert>
      )}

      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Shift Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data.shiftNumber}</div>
            <div className="text-sm text-gray-600">Shift Number</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {new Date(data.startTime).toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">Start Date</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">
              {new Date(data.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
            <div className="text-sm text-gray-600">Start Time</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-600 truncate">
              {getSupervisorName()}
            </div>
            <div className="text-sm text-gray-600">Supervisor</div>
          </div>
        </div>
        {shiftId && (
          <div className="mt-4 p-3 bg-gray-50 rounded border">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">Shift ID:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">{shiftId}</code>
            </div>
          </div>
        )}
      </Card>

      {/* Island Assignments */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Island Assignments
          </h3>
          <Badge variant={completionStats.islands > 0 ? "success" : "warning"}>
            {completionStats.islands} Islands Configured
          </Badge>
        </div>

        {Object.keys(assignmentsByIsland).length === 0 ? (
          <Alert variant="warning" className="text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>No attendants assigned to islands</span>
            </div>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(assignmentsByIsland).map(([islandId, assignments]) => (
              <div key={islandId} className="border rounded-lg p-4">
                <h4 className="font-semibold text-blue-700 mb-3">{getIslandName(islandId)}</h4>
                <div className="space-y-2">
                  {assignments.map((assignment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{getUserName(assignment.attendantId)}</span>
                      </div>
                      <Badge variant="success" size="sm">
                        {assignment.assignmentType}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pump Readings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-600" />
            Pump Readings
          </h3>
          <Badge variant={completionStats.pumps > 0 ? "success" : "warning"}>
            {completionStats.pumps} Pumps Configured
          </Badge>
        </div>

        {data.pumpReadings.length === 0 ? (
          <Alert variant="warning" className="text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>No pump readings configured</span>
            </div>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 font-semibold">Pump</th>
                  <th className="text-left p-3 font-semibold">Electric Meter</th>
                  <th className="text-left p-3 font-semibold">Manual Meter</th>
                  <th className="text-left p-3 font-semibold">Cash Meter</th>
                  <th className="text-left p-3 font-semibold">Unit Price</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.pumpReadings.map((reading, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{getPumpName(reading.pumpId)}</td>
                    <td className="p-3">{reading.electricMeter.toLocaleString()}</td>
                    <td className="p-3">{reading.manualMeter.toLocaleString()}</td>
                    <td className="p-3">{reading.cashMeter.toLocaleString()}</td>
                    <td className="p-3">KSh {reading.unitPrice?.toLocaleString()}</td>
                    <td className="p-3">
                      <Badge variant="success">Completed</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* Tank Readings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Fuel className="w-5 h-5 text-orange-600" />
            Tank Readings
          </h3>
          <Badge variant={completionStats.tanks > 0 ? "success" : "warning"}>
            {completionStats.tanks} Tanks Configured
          </Badge>
        </div>

        {data.tankReadings.length === 0 ? (
          <Alert variant="warning" className="text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>No tank readings configured</span>
            </div>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 font-semibold">Tank</th>
                  <th className="text-left p-3 font-semibold">Dip Value</th>
                  <th className="text-left p-3 font-semibold">Volume</th>
                  <th className="text-left p-3 font-semibold">Temperature</th>
                  <th className="text-left p-3 font-semibold">Water Level</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.tankReadings.map((reading, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{getTankName(reading.tankId)}</td>
                    <td className="p-3">{reading.dipValue}m</td>
                    <td className="p-3">{reading.volume.toLocaleString()}L</td>
                    <td className="p-3">{reading.temperature}°C</td>
                    <td className="p-3">{reading.waterLevel}m</td>
                    <td className="p-3">
                      <Badge variant="success">Recorded</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* Final Action */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="text-center lg:text-left">
            <h3 className="font-semibold text-lg text-gray-900">Ready to Start Shift</h3>
            <p className="text-gray-600 mt-1">
              {isConfigurationComplete 
                ? "All configurations are complete. You can now start the shift."
                : "Some configurations are missing. Please complete all sections before starting."
              }
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleFinalCreate}
              disabled={creating || !isConfigurationComplete || createSuccess}
              loading={creating}
              icon={createSuccess ? CheckCircle : Play}
              size="lg"
              variant={createSuccess ? "success" : "cosmic"}
              className="whitespace-nowrap"
            >
              {creating ? 'Starting Shift...' : 
               createSuccess ? 'Shift Started Successfully' : 'Start Shift Now'}
            </Button>
            
            <div className="text-xs text-gray-500 text-center">
              Shift ID: {shiftId?.substring(0, 8)}...
            </div>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="error" className="text-sm">
          {error}
        </Alert>
      )}
    </div>
  );
};

export default SummaryStep;