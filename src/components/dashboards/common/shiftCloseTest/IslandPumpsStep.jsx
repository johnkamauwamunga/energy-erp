import React, { useState } from 'react';
import { Card, Tabs, Tab, Input, Badge, Alert } from '../../../ui';
import { Zap, Package, Calculator, CheckCircle } from 'lucide-react';
import { closingCalculations } from './dummyDataForClosing';

const IslandPumpsStep = ({ shiftData, closingData, onChange }) => {
  const [activeIslandTab, setActiveIslandTab] = useState('');
  const { shiftIslandAttedant, meterReadings } = shiftData;
  const { pumpReadings } = closingData;

  // Group pumps by island
  const pumpsByIsland = shiftIslandAttedant.reduce((acc, assignment) => {
    const islandPumps = meterReadings
      .filter(reading => reading.pump?.islandId === assignment.islandId)
      .map(reading => ({
        ...reading,
        closingReading: pumpReadings.find(pr => pr.pumpId === reading.pumpId) || {}
      }));
    
    acc[assignment.islandId] = {
      ...assignment,
      pumps: islandPumps
    };
    return acc;
  }, {});

  // Set first island as active tab
  React.useEffect(() => {
    if (shiftIslandAttedant.length > 0 && !activeIslandTab) {
      setActiveIslandTab(shiftIslandAttedant[0].islandId);
    }
  }, [shiftIslandAttedant, activeIslandTab]);

  const handlePumpReadingUpdate = (pumpId, field, value) => {
    const numericValue = parseFloat(value) || 0;
    const updatedReadings = pumpReadings.map(reading =>
      reading.pumpId === pumpId
        ? { ...reading, [field]: numericValue }
        : reading
    );

    // Auto-calculate liters and sales when meters are updated
    if (field === 'electricMeter' || field === 'manualMeter') {
      const readingIndex = updatedReadings.findIndex(r => r.pumpId === pumpId);
      if (readingIndex !== -1) {
        const reading = updatedReadings[readingIndex];
        const startReading = meterReadings.find(mr => mr.pumpId === pumpId);
        
        if (startReading && reading.electricMeter > 0) {
          // Calculate liters dispensed (using electric meter as primary)
          const litersDispensed = reading.electricMeter - startReading.electricMeter;
          const salesValue = litersDispensed * (reading.unitPrice || 150.0);
          
          updatedReadings[readingIndex] = {
            ...reading,
            litersDispensed: Math.max(0, litersDispensed),
            salesValue: Math.max(0, salesValue)
          };
        }
      }
    }

    onChange({ pumpReadings: updatedReadings });
  };

  const getCurrentIsland = () => {
    return pumpsByIsland[activeIslandTab];
  };

  const getPumpCompletionStatus = (islandId) => {
    const islandPumps = pumpsByIsland[islandId]?.pumps || [];
    const completedPumps = islandPumps.filter(pump => 
      pump.closingReading.electricMeter > 0
    ).length;
    
    return { completed: completedPumps, total: islandPumps.length };
  };

  return (
    <div className="space-y-4">
      {/* Compact Alert */}
      <Alert variant="info" className="text-sm" size="sm">
        <div className="flex items-start gap-2">
          <Calculator className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Record Pump END Readings</p>
            <p>Enter END meter readings. Liters and sales will be auto-calculated.</p>
          </div>
        </div>
      </Alert>

      <Card className="p-4">
        {/* Compact Islands Tabs */}
        <Tabs value={activeIslandTab} onChange={setActiveIslandTab} size="sm">
          {Object.entries(pumpsByIsland).map(([islandId, islandData]) => {
            const status = getPumpCompletionStatus(islandId);
            return (
              <Tab 
                key={islandId} 
                value={islandId}
                badge={status.completed > 0 ? `${status.completed}/${status.total}` : null}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span className="truncate max-w-20">{islandData.island.name}</span>
                  {status.completed === status.total && status.total > 0 && (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  )}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* Island Pumps Content */}
        {getCurrentIsland() && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">
                {getCurrentIsland().island.name} Pumps
              </h4>
              <div className="text-xs text-gray-600">
                {getCurrentIsland().attendant.firstName}
              </div>
            </div>

            <div className="space-y-3">
              {getCurrentIsland().pumps.map(pump => {
                const startReading = meterReadings.find(mr => mr.pumpId === pump.pumpId);
                const closingReading = pumpReadings.find(pr => pr.pumpId === pump.pumpId) || {};
                
                return (
                  <Card key={pump.pumpId} className="p-3 border text-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold truncate">{pump.pump.asset.name}</h5>
                        <p className="text-gray-600 text-xs truncate">
                          {pump.pump.product?.name || 'Diesel'} • KES {closingReading.unitPrice || 150.0}
                        </p>
                      </div>
                      <Badge variant={closingReading.electricMeter > 0 ? "success" : "warning"} size="sm">
                        {closingReading.electricMeter > 0 ? "✓" : "Pending"}
                      </Badge>
                    </div>

                    {/* Compact START Readings Reference */}
                    <div className="bg-gray-50 p-2 rounded mb-3 text-xs">
                      <h6 className="font-medium mb-1">START Readings</h6>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-gray-600">Elec:</span>
                          <p className="font-semibold">{startReading.electricMeter}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Man:</span>
                          <p className="font-semibold">{startReading.manualMeter}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Cash:</span>
                          <p className="font-semibold">{startReading.cashMeter}</p>
                        </div>
                      </div>
                    </div>

                    {/* Compact END Readings Input */}
                    <div className="space-y-3">
                      <h6 className="font-medium text-xs">END Readings</h6>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          label="Electric"
                          type="number"
                          size="sm"
                          value={closingReading.electricMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.pumpId, 'electricMeter', e.target.value)
                          }
                          placeholder="0"
                          required
                        />
                        
                        <Input
                          label="Manual"
                          type="number"
                          size="sm"
                          value={closingReading.manualMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.pumpId, 'manualMeter', e.target.value)
                          }
                          placeholder="0"
                        />
                        
                        <Input
                          label="Cash"
                          type="number"
                          size="sm"
                          value={closingReading.cashMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.pumpId, 'cashMeter', e.target.value)
                          }
                          placeholder="0"
                        />
                      </div>

                      {/* Compact Calculated Values */}
                      {(closingReading.litersDispensed > 0 || closingReading.salesValue > 0) && (
                        <div className="bg-green-50 p-2 rounded border border-green-200 text-xs">
                          <h6 className="font-medium text-green-900 mb-1">Calculated</h6>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-green-700">Liters:</span>
                              <p className="font-semibold text-green-900">
                                {closingReading.litersDispensed.toFixed(1)}L
                              </p>
                            </div>
                            <div>
                              <span className="text-green-700">Sales:</span>
                              <p className="font-semibold text-green-900">
                                KES {closingReading.salesValue.toFixed(0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Compact Progress Summary */}
      <div className="bg-gray-50 rounded-lg p-3 border">
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 text-xs">
          {Object.entries(pumpsByIsland).map(([islandId, islandData]) => {
            const status = getPumpCompletionStatus(islandId);
            return (
              <div key={islandId} className="text-center">
                <p className="font-semibold text-gray-700 truncate">{islandData.island.name}</p>
                <p className={`text-base font-bold ${
                  status.completed === status.total ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {status.completed}/{status.total}
                </p>
                <p className="text-gray-600">pumps</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IslandPumpsStep;