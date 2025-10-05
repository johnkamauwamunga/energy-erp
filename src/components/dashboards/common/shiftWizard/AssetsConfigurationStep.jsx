import React, { useState, useEffect } from 'react';
import { Card, Tabs, Tab, Input, Button, Badge } from '../../../ui';
import { Zap, Plus, Minus, Save } from 'lucide-react';
import { stationService } from '../../../../services/stationService/stationService';

const AssetsConfigurationStep = ({ data, onChange, stationId }) => {
  const [islands, setIslands] = useState([]);
  const [activeIslandTab, setActiveIslandTab] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStationAssets();
  }, [stationId]);

  const fetchStationAssets = async () => {
    setLoading(true);
    try {
      const stationAssets = await stationService.getStationAssets(stationId);
      setIslands(stationAssets.islands || []);
      
      // Set first island as active tab if available
      if (stationAssets.islands?.length > 0 && !activeIslandTab) {
        setActiveIslandTab(stationAssets.islands[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch station assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIslandAssignment = (islandId, attendantId, assignmentType = 'PRIMARY') => {
    const existingAssignment = data.islandAssignments.find(
      assignment => assignment.islandId === islandId
    );

    let updatedAssignments;
    
    if (existingAssignment) {
      // Update existing assignment
      updatedAssignments = data.islandAssignments.map(assignment =>
        assignment.islandId === islandId
          ? { ...assignment, attendantId, assignmentType }
          : assignment
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

  const getCurrentIsland = () => {
    return islands.find(island => island.id === activeIslandTab);
  };

  const getIslandAssignment = (islandId) => {
    return data.islandAssignments.find(assignment => assignment.islandId === islandId);
  };

  const getPumpReading = (pumpId) => {
    return data.pumpReadings.find(reading => reading.pumpId === pumpId);
  };

  return (
    <div className="space-y-6">
      <Card title="Configure Islands & Pumps" className="p-6">
        {/* Islands Tabs */}
        <Tabs value={activeIslandTab} onChange={setActiveIslandTab}>
          {islands.map(island => {
            const assignment = getIslandAssignment(island.id);
            return (
              <Tab 
                key={island.id} 
                value={island.id}
                badge={assignment ? '✓' : null}
              >
                {island.name}
                {assignment && (
                  <Badge variant="success" className="ml-2 text-xs">
                    Assigned
                  </Badge>
                )}
              </Tab>
            );
          })}
        </Tabs>

        {/* Island Content */}
        {getCurrentIsland() && (
          <div className="mt-6 space-y-6">
            {/* Island Assignment */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Assign Attendant</h4>
              <Select
                value={getIslandAssignment(getCurrentIsland().id)?.attendantId || ''}
                onChange={(attendantId) => 
                  handleIslandAssignment(getCurrentIsland().id, attendantId)
                }
                options={data.attendants.map(attId => {
                  const attendant = data.attendantsDetails?.find(a => a.id === attId);
                  return {
                    value: attId,
                    label: attendant 
                      ? `${attendant.firstName} ${attendant.lastName}`
                      : `Attendant ${attId}`
                  };
                })}
                placeholder="Select attendant for this island..."
              />
            </div>

            {/* Pumps Configuration */}
            <div>
              <h4 className="font-semibold mb-4">
                Pump Readings - {getCurrentIsland().pumps?.length || 0} Pumps
              </h4>
              
              <div className="space-y-4">
                {getCurrentIsland().pumps?.map(pump => {
                  const reading = getPumpReading(pump.id);
                  
                  return (
                    <Card key={pump.id} className="p-4 border">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold">{pump.name}</h5>
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
                            handlePumpReadingUpdate(pump.id, 'electricMeter', e.target.value)
                          }
                          placeholder="0.00"
                        />
                        
                        <Input
                          label="Manual Meter"
                          type="number"
                          value={reading?.manualMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.id, 'manualMeter', e.target.value)
                          }
                          placeholder="0.00"
                        />
                        
                        <Input
                          label="Cash Meter"
                          type="number"
                          value={reading?.cashMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.id, 'cashMeter', e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <Input
                          label="Liters Dispensed"
                          type="number"
                          value={reading?.litersDispensed || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.id, 'litersDispensed', e.target.value)
                          }
                          placeholder="0.00"
                        />
                        
                        <Input
                          label="Sales Value"
                          type="number"
                          value={reading?.salesValue || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.id, 'salesValue', e.target.value)
                          }
                          placeholder="0.00"
                        />
                        
                        <Input
                          label="Unit Price"
                          type="number"
                          value={reading?.unitPrice || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.id, 'unitPrice', e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {islands.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No islands configured for this station</p>
          </div>
        )}
      </Card>

      {/* Summary */}
      <Card title="Configuration Summary" className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold">Islands Configured</p>
            <p>{data.islandAssignments.length} / {islands.length}</p>
          </div>
          <div>
            <p className="font-semibold">Pumps Configured</p>
            <p>{data.pumpReadings.length} / {islands.reduce((total, island) => total + (island.pumps?.length || 0), 0)}</p>
          </div>
          <div>
            <p className="font-semibold">Attendants Assigned</p>
            <p>{new Set(data.islandAssignments.map(a => a.attendantId)).size} / {data.attendants.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AssetsConfigurationStep;