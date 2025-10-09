import React, { useState, useEffect, useMemo } from 'react';
import { Card, Tabs, Tab, Input, Badge, Alert, Button, Table } from '../../../ui';
import { Zap, Package, Fuel, User, CheckCircle, ArrowRight, ArrowLeft, Save, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { dummyData, mockServices, dummyDataHelpers } from './dummyData';
import { connectedAssetService } from '../../../../services/connectedAssetsService/connectedAssetsService';
import { useApp } from '../../../../context/AppContext';
import { shiftService } from '../../../../services/shiftService/shiftService';

const AssetsConfigurationStep = ({ data, onChange, stationId, shiftId, onSave, onFinalCreate }) => {
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
  const [showSummary, setShowSummary] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  const currentStation = state.currentStation?.id;
  const shiftDetails = localStorage.getItem("currentShiftId");
  const currentUser = state.currentUser?.id;

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
        
        // Filter islands to only show those with pumps
        const islandsWithPumps = result.assets.filter(island => 
          island.pumps && island.pumps.length > 0
        );
        
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
          unitPrice: 150.0,
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
//   const handleSaveConfiguration = async () => {
//     if (!shiftDetails) {
//       setSaveError('No shift ID available');
//       return;
//     }

//     if (!currentUser) {
//       setSaveError('No user information available');
//       return;
//     }

//     setSaving(true);
//     setSaveError(null);
//     setSaveSuccess(false);

//     console.log('💾 Saving configuration');
//     try {
//       const payload = {
//         shiftId: shiftId,
//         recordedById: currentUser,
//         islandAssignments: data.islandAssignments,
//         pumpReadings: data.pumpReadings,
//         tankReadings: data.tankReadings
//       };

//       console.log('💾 Saving configuration:', payload);
      
//       const result = await shiftService.openShift(payload);
//       console.log('✅ Configuration saved successfully:', result);
      
//       setSaveSuccess(true);
      
//       // Save configuration data to localStorage for summary
//       localStorage.setItem('shiftConfigurationData', JSON.stringify({
//         ...data,
//         shiftId: shiftId,
//         recordedById: currentUser,
//         timestamp: new Date().toISOString()
//       }));
      
//       // Show summary after successful save
//       setTimeout(() => {
//         setShowSummary(true);
//       }, 1500);
      
//       // Notify parent component
//       if (onSave) {
//         onSave(result);
//       }
      
//     } catch (error) {
//       console.error('❌ Failed to save configuration:', error);
//       setSaveError(error.message || 'Failed to save configuration');
//     } finally {
//       setSaving(false);
//     }
//   };

 const handleClearStorage = async() =>{
       localStorage.removeItem('currentShiftId');
        localStorage.removeItem('currentShiftNumber');
        localStorage.removeItem('currentShiftStartTime');
        localStorage.removeItem('currentShiftStation');
        localStorage.removeItem('currentShiftAttendants')
           localStorage.removeItem('currentShiftId');
    localStorage.removeItem('currentShiftNumber');
    localStorage.removeItem('currentShiftStartTime');
      localStorage.removeItem('currentStationAssets')
       localStorage.removeItem('shiftConfigurationData')
 }

  const handleCheckStorage = async() =>{
    const currentShift=   localStorage.getItem('currentShiftId');
     const currentNumber=    localStorage.getItem('currentShiftNumber');
        const startTime= localStorage.getItem('currentShiftStartTime');
       const currentStation=  localStorage.getItem('currentShiftStation');
        const Attedants= localStorage.getItem('currentShiftAttendants')
      const stationAssets= localStorage.getItem('currentStationAssets')
       const configuration= localStorage.getItem('shiftConfigurationData')

       console.log("shiftId",currentShift," Number ",currentNumber,' start Time',startTime," currentStation ")
       console.log(" station ",currentStation," Attedants ",Attedants," stationAssets ",stationAssets," configuration ",configuration)
    }

const handleSaveConfiguration = async () => {
  if (!shiftId) {
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

  console.log('💾 Saving configuration for shift:', shiftDetails);
  try {
    const payload = {
        shiftId: shiftDetails,
      recordedById: currentUser,
      islandAssignments: data.islandAssignments,
      pumpReadings: data.pumpReadings,
      tankReadings: data.tankReadings
    };

    console.log('📦 Payload:', payload);
    
    // Correct API call with two parameters
    const result = await shiftService.openShift(shiftDetails, payload);
    console.log('✅ Configuration saved successfully:', result);
    
    setSaveSuccess(true);
    
    // Save data for summary display
    localStorage.setItem('shiftConfigurationData', JSON.stringify({
      ...data,
      shiftDetails: shiftDetails,
      recordedById: currentUser,
      timestamp: new Date().toISOString()
    }));

    localStorage.setItem('currentStationAssets', JSON.stringify({
      islands: islands,
      tanks: tanks
    }));
    
    // Show summary after successful save
    setTimeout(() => {
      setShowSummary(true);
    }, 1500);
    
    // Notify parent component
    if (onSave) {
      onSave(result);
    }
    
  } catch (error) {
    console.error('❌ Failed to save configuration:', error);
    setSaveError(error.message || 'Failed to save configuration');
  } finally {
    setSaving(false);
  }
};

  // Handle final shift creation
  const handleFinalCreate = async () => {
    if (!shiftId) {
      setSaveError('No shift ID available');
      return;
    }

    setCreating(true);
    setSaveError(null);

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
        localStorage.removeItem('shiftConfigurationData');
      }, 2000);
      
    } catch (err) {
      console.error('❌ Failed to finalize shift:', err);
      setSaveError(err.message || 'Failed to create shift');
    } finally {
      setCreating(false);
    }
  };

  // Helper functions for summary
  const getIslandName = (islandId) => {
    const island = islands.find(i => i.islandId === islandId);
    return island ? island.islandName : `Island ${islandId?.substring(0, 8)}`;
  };

  const getPumpName = (pumpId) => {
    for (let island of islands) {
      const pump = island.pumps?.find(p => p.pumpId === pumpId);
      if (pump) return pump.pumpName;
    }
    return `Pump ${pumpId?.substring(0, 8)}`;
  };

  const getTankName = (tankId) => {
    const tank = tanks.find(t => t.tankId === tankId);
    return tank ? tank.tankName : `Tank ${tankId?.substring(0, 8)}`;
  };

  const getAttendantName = (attendantId) => {
    const attendant = persistedAttendants.find(a => a.id === attendantId);
    console.log("attedants are ",attendant);
    return attendant ? `${attendant.firstName} ${attendant.lastName}` : `Attendant ${attendantId?.substring(0, 8)}`;
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
  const availableAttendants = persistedAttendants.length > 0 ? persistedAttendants : [];

  // ========== SUMMARY VIEW ==========
  if (showSummary) {
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
              <CheckCircle2 className="w-5 h-5" />
              <div>
                <p className="font-semibold">Shift Ready to Start!</p>
                <p>All configurations have been saved successfully. The shift is now active.</p>
              </div>
            </div>
          </Alert>
        ) : isConfigurationComplete ? (
          <Alert variant="success" className="text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
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
                {state.currentUser?.firstName || 'Current User'}
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
            {/* handleCheckStorage */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleFinalCreate}
                disabled={creating || !isConfigurationComplete || createSuccess}
                loading={creating}
                icon={createSuccess ? CheckCircle2 : Play}
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
        {saveError && (
          <Alert variant="error" className="text-sm">
            {saveError}
          </Alert>
        )}

        {/* Back to Configuration Button */}
        {!createSuccess && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setShowSummary(false)}
              icon={ArrowLeft}
            >
              Back to Configuration
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ========== CONFIGURATION VIEW (YOUR ORIGINAL CODE) ==========
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
            <div>
            <Button
              onClick={handleSaveConfiguration}
              disabled={saving || !shiftDetails || !currentUser}
              loading={saving}
              icon={Save}
              size="lg"
              className="whitespace-nowrap"
            >
              {saving ? 'Saving Configuration...' : 'Save & View Summary'}
            </Button>
            </div>

            <div>
            <Button
              onClick={handleClearStorage}
              icon={Save}
              size="lg"
              className="whitespace-nowrap"
            >
              {'Clear local Storage'}
            </Button>
            </div>

              <div>
            <Button
              onClick={handleCheckStorage}
              icon={Save}
              size="lg"
              className="whitespace-nowrap"
            >
              {'Check local Storage'}
            </Button>
            </div>

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
          All configurations saved successfully! Loading summary...
        </Alert>
      )}
    </div>
  );
};

export default AssetsConfigurationStep;