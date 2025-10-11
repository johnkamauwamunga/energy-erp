import React, { useState, useEffect } from 'react';
import { Card, Badge, Table, Alert, Button } from '../../../../ui';
import { CheckCircle, AlertCircle, Package, Zap, Fuel, User, Play, DollarSign, Gauge, Thermometer, Droplets } from 'lucide-react';

const SummaryStep = ({ data, shiftId, onFinalCreate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [assetsData, setAssetsData] = useState({ islands: [], tanks: [] });

  // Load assets data from localStorage
  useEffect(() => {
    const loadAssetsData = () => {
      setLoading(true);
      try {
        console.log('📊 Summary Data:', data);
        
        // Load assets from localStorage (set by AssetsConfigurationStep)
        const savedAssets = localStorage.getItem('currentStationAssets');
        if (savedAssets) {
          const parsedAssets = JSON.parse(savedAssets);
          setAssetsData(parsedAssets);
          console.log('🏝️ Loaded assets:', parsedAssets);
        }

      } catch (err) {
        console.error('❌ Error loading data:', err);
        setError('Failed to load configuration data');
      } finally {
        setLoading(false);
      }
    };

    loadAssetsData();
  }, [data]);

  // Get attendant name from data.attendants
  const getAttendantName = (attendantId) => {
    if (!attendantId) return 'Unknown Attendant';
    
    if (data.attendants && Array.isArray(data.attendants)) {
      const attendant = data.attendants.find(a => a.id === attendantId);
      if (attendant) {
        return `${attendant.firstName} ${attendant.lastName}`.trim();
      }
    }
    
    return `Attendant ${attendantId?.substring(0, 8)}`;
  };

  // Get supervisor name
  const getSupervisorName = () => {
    if (data.supervisorId) {
      return getAttendantName(data.supervisorId);
    }
    return "Shift Supervisor";
  };

  // Get island name from assets data
  const getIslandName = (islandId) => {
    const island = assetsData.islands.find(i => i.islandId === islandId);
    return island ? island.islandName : `Island ${islandId?.substring(0, 8)}`;
  };

  // Get pump details including name and product
  const getPumpDetails = (pumpId) => {
    for (let island of assetsData.islands) {
      const pump = island.pumps?.find(p => p.pumpId === pumpId);
      if (pump) {
        return {
          name: pump.pumpName,
          product: pump.productName || 'No Product',
          tank: pump.tank?.tankName
        };
      }
    }
    return { name: `Pump ${pumpId?.substring(0, 8)}`, product: 'Unknown', tank: null };
  };

  // Get tank details including name and product
  const getTankDetails = (tankId) => {
    const tank = assetsData.tanks.find(t => t.tankId === tankId);
    if (tank) {
      return {
        name: tank.tankName,
        product: tank.productName,
        capacity: tank.capacity,
        currentVolume: tank.currentVolume
      };
    }
    return { name: `Tank ${tankId?.substring(0, 8)}`, product: 'Unknown', capacity: 0, currentVolume: 0 };
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
        localStorage.removeItem('currentStationAssets');
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
                        <span className="font-medium">{getAttendantName(assignment.attendantId)}</span>
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
            Pump Meter Readings
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
          <div className="space-y-6">
            {data.pumpReadings.map((reading, index) => {
              const pumpDetails = getPumpDetails(reading.pumpId);
              
              return (
                <div key={index} className="border rounded-lg p-6 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg text-gray-900">{pumpDetails.name}</h4>
                      <p className="text-gray-600">{pumpDetails.product}</p>
                      {pumpDetails.tank && (
                        <p className="text-sm text-blue-600 mt-1">
                          Connected to: {pumpDetails.tank}
                        </p>
                      )}
                    </div>
                    <Badge variant="success">Completed</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Electric Meter */}
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-blue-900">Electric Meter</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-700">
                        {reading.electricMeter.toLocaleString()}
                      </div>
                      <div className="text-sm text-blue-600 mt-1">Current Reading</div>
                    </div>

                    {/* Manual Meter */}
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Gauge className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-900">Manual Meter</span>
                      </div>
                      <div className="text-2xl font-bold text-green-700">
                        {reading.manualMeter.toLocaleString()}
                      </div>
                      <div className="text-sm text-green-600 mt-1">Current Reading</div>
                    </div>

                    {/* Cash Meter */}
                    <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-purple-900">Cash Meter</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-700">
                        KSh {reading.cashMeter.toLocaleString()}
                      </div>
                      <div className="text-sm text-purple-600 mt-1">Sales Amount</div>
                    </div>
                  </div>

                  {/* Additional Pump Information */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Unit Price:</span>
                      <span className="font-semibold">KSh {reading.unitPrice?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Liters Dispensed:</span>
                      <span className="font-semibold">{reading.litersDispensed?.toLocaleString()} L</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Sales Value:</span>
                      <span className="font-semibold">KSh {reading.salesValue?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Pump ID:</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {reading.pumpId.substring(0, 8)}...
                      </code>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Tank Readings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Fuel className="w-5 h-5 text-orange-600" />
            Tank Dip Readings
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
          <div className="space-y-6">
            {data.tankReadings.map((reading, index) => {
              const tankDetails = getTankDetails(reading.tankId);
              
              return (
                <div key={index} className="border rounded-lg p-6 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg text-gray-900">{tankDetails.name}</h4>
                      <p className="text-gray-600">{tankDetails.product}</p>
                    </div>
                    <Badge variant="success">Recorded</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Readings */}
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Gauge className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-blue-900">Dip Value</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-700">
                          {reading.dipValue} m
                        </div>
                        <div className="text-sm text-blue-600 mt-1">Current Measurement</div>
                      </div>

                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Droplets className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-green-900">Volume</span>
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                          {reading.volume.toLocaleString()} L
                        </div>
                        <div className="text-sm text-green-600 mt-1">Current Volume</div>
                      </div>
                    </div>

                    {/* Right Column - Tank Information */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h5 className="font-semibold text-sm mb-3">Tank Information</h5>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">Product:</span>
                          <span className="font-semibold">{tankDetails.product}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">Total Capacity:</span>
                          <span className="font-semibold">{tankDetails.capacity.toLocaleString()} L</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">Previous Volume:</span>
                          <span className="font-semibold">{tankDetails.currentVolume.toLocaleString()} L</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">Available Space:</span>
                          <span className="font-semibold text-green-600">
                            {(tankDetails.capacity - tankDetails.currentVolume).toLocaleString()} L
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">Temperature:</span>
                          <span className="font-semibold">{reading.temperature}°C</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">Water Level:</span>
                          <span className="font-semibold">{reading.waterLevel} m</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">Density:</span>
                          <span className="font-semibold">{reading.density}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Progress Summary */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border">
        <h3 className="font-semibold text-lg mb-4 text-center">Configuration Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{completionStats.islands}</div>
            <div className="text-sm text-gray-600">Islands</div>
            <Badge variant={completionStats.islands > 0 ? "success" : "warning"} size="sm" className="mt-1">
              {completionStats.islands > 0 ? 'Configured' : 'Pending'}
            </Badge>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{completionStats.pumps}</div>
            <div className="text-sm text-gray-600">Pumps</div>
            <Badge variant={completionStats.pumps > 0 ? "success" : "warning"} size="sm" className="mt-1">
              {completionStats.pumps > 0 ? 'Recorded' : 'Pending'}
            </Badge>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-orange-600">{completionStats.tanks}</div>
            <div className="text-sm text-gray-600">Tanks</div>
            <Badge variant={completionStats.tanks > 0 ? "success" : "warning"} size="sm" className="mt-1">
              {completionStats.tanks > 0 ? 'Recorded' : 'Pending'}
            </Badge>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{completionStats.attendants}</div>
            <div className="text-sm text-gray-600">Attendants</div>
            <Badge variant={completionStats.attendants > 0 ? "success" : "warning"} size="sm" className="mt-1">
              {completionStats.attendants > 0 ? 'Assigned' : 'Pending'}
            </Badge>
          </div>
        </div>
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