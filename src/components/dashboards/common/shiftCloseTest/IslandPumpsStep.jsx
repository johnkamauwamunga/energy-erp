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
    <div className="space-y-6">
      <Alert variant="info">
        <div className="flex items-start gap-3">
          <Calculator className="w-5 h-5 mt-0.5" />
          <div>
            <h4 className="font-semibold mb-1">Record Pump END Readings</h4>
            <p className="text-sm">
              Enter END meter readings for each pump. Liters dispensed and sales values will be automatically calculated.
            </p>
          </div>
        </div>
      </Alert>

      <Card title="Island Pumps - END Readings" className="p-6">
        {/* Islands Tabs */}
        <Tabs value={activeIslandTab} onChange={setActiveIslandTab}>
          {Object.entries(pumpsByIsland).map(([islandId, islandData]) => {
            const status = getPumpCompletionStatus(islandId);
            return (
              <Tab 
                key={islandId} 
                value={islandId}
                badge={status.completed > 0 ? `${status.completed}/${status.total}` : null}
              >
                <div className="flex items-center gap-2">
                  {islandData.island.name}
                  {status.completed === status.total && status.total > 0 && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* Island Pumps Content */}
        {getCurrentIsland() && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-lg">
                {getCurrentIsland().island.name} - Pumps
              </h4>
              <div className="text-sm text-gray-600">
                Attendant: {getCurrentIsland().attendant.firstName} {getCurrentIsland().attendant.lastName}
              </div>
            </div>

            <div className="space-y-4">
              {getCurrentIsland().pumps.map(pump => {
                const startReading = meterReadings.find(mr => mr.pumpId === pump.pumpId);
                const closingReading = pumpReadings.find(pr => pr.pumpId === pump.pumpId) || {};
                
                return (
                  <Card key={pump.pumpId} className="p-4 border">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h5 className="font-semibold">{pump.pump.asset.name}</h5>
                        <p className="text-sm text-gray-600">
                          Product: {pump.pump.product?.name || 'Diesel'} • 
                          Price: KES {closingReading.unitPrice || 150.0}
                        </p>
                      </div>
                      <Badge variant={closingReading.electricMeter > 0 ? "success" : "warning"}>
                        {closingReading.electricMeter > 0 ? "Recorded" : "Pending"}
                      </Badge>
                    </div>

                    {/* START Readings Reference */}
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <h6 className="font-medium text-sm mb-2">START Readings (Reference)</h6>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Electric:</span>
                          <p className="font-semibold">{startReading.electricMeter}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Manual:</span>
                          <p className="font-semibold">{startReading.manualMeter}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Cash:</span>
                          <p className="font-semibold">{startReading.cashMeter}</p>
                        </div>
                      </div>
                    </div>

                    {/* END Readings Input */}
                    <div className="space-y-4">
                      <h6 className="font-medium">END Readings</h6>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="Electric Meter"
                          type="number"
                          value={closingReading.electricMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.pumpId, 'electricMeter', e.target.value)
                          }
                          placeholder="0.00"
                          required
                        />
                        
                        <Input
                          label="Manual Meter"
                          type="number"
                          value={closingReading.manualMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.pumpId, 'manualMeter', e.target.value)
                          }
                          placeholder="0.00"
                        />
                        
                        <Input
                          label="Cash Meter"
                          type="number"
                          value={closingReading.cashMeter || ''}
                          onChange={(e) => 
                            handlePumpReadingUpdate(pump.pumpId, 'cashMeter', e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </div>

                      {/* Calculated Values */}
                      {(closingReading.litersDispensed > 0 || closingReading.salesValue > 0) && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <h6 className="font-medium text-green-900 mb-2">Calculated Sales</h6>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-green-700">Liters Dispensed:</span>
                              <p className="font-semibold text-green-900">
                                {closingReading.litersDispensed.toFixed(2)} L
                              </p>
                            </div>
                            <div>
                              <span className="text-green-700">Sales Value:</span>
                              <p className="font-semibold text-green-900">
                                KES {closingReading.salesValue.toFixed(2)}
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

      {/* Progress Summary */}
      <Card title="Progress Summary" className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {Object.entries(pumpsByIsland).map(([islandId, islandData]) => {
            const status = getPumpCompletionStatus(islandId);
            return (
              <div key={islandId} className="text-center">
                <p className="font-semibold text-gray-700">{islandData.island.name}</p>
                <p className={`text-lg font-bold ${
                  status.completed === status.total ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {status.completed}/{status.total}
                </p>
                <p className="text-xs text-gray-600">pumps completed</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default IslandPumpsStep;