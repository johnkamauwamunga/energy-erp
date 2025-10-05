import React, { useState } from 'react';
import { Card, Alert, Badge, Input, Tabs, Tab } from '../../../ui';
import { Clock, Zap, Fuel, CheckCircle } from 'lucide-react';

const BeforeOffloadStep = ({ purchaseData, offloadData, onChange }) => {
  const [activeTankTab, setActiveTankTab] = useState('');

  React.useEffect(() => {
    if (offloadData.tankOffloads.length > 0 && !activeTankTab) {
      setActiveTankTab(offloadData.tankOffloads[0].tankId);
    }
  }, [offloadData.tankOffloads, activeTankTab]);

  const getCurrentTank = () => {
    return offloadData.tankOffloads.find(tank => tank.tankId === activeTankTab);
  };

  const handleDipReadingUpdate = (field, value) => {
    const currentTank = getCurrentTank();
    if (!currentTank) return;

    const updatedTanks = offloadData.tankOffloads.map(tank =>
      tank.tankId === activeTankTab
        ? {
            ...tank,
            dipBefore: {
              ...tank.dipBefore,
              [field]: parseFloat(value) || 0
            }
          }
        : tank
    );

    onChange({ tankOffloads: updatedTanks });
  };

  const handlePumpReadingUpdate = (pumpId, field, value) => {
    const currentTank = getCurrentTank();
    if (!currentTank) return;

    const updatedTanks = offloadData.tankOffloads.map(tank => {
      if (tank.tankId === activeTankTab) {
        const existingReadingIndex = tank.pumpReadingsBefore.findIndex(
          reading => reading.pumpId === pumpId
        );

        let updatedReadings;
        
        if (existingReadingIndex >= 0) {
          // Update existing reading
          updatedReadings = tank.pumpReadingsBefore.map(reading =>
            reading.pumpId === pumpId
              ? { ...reading, [field]: parseFloat(value) || 0 }
              : reading
          );
        } else {
          // Create new reading
          updatedReadings = [
            ...tank.pumpReadingsBefore,
            {
              pumpId,
              pumpName: currentTank.connectedPumps.find(p => p.id === pumpId)?.name,
              [field]: parseFloat(value) || 0
            }
          ];
        }

        return { ...tank, pumpReadingsBefore: updatedReadings };
      }
      return tank;
    });

    onChange({ tankOffloads: updatedTanks });
  };

  const getPumpReading = (pumpId) => {
    const currentTank = getCurrentTank();
    return currentTank?.pumpReadingsBefore.find(reading => reading.pumpId === pumpId) || {};
  };

  const getTankCompletion = (tankId) => {
    const tank = offloadData.tankOffloads.find(t => t.tankId === tankId);
    if (!tank) return { dip: false, pumps: 0, totalPumps: 0 };
    
    const hasDip = tank.dipBefore && tank.dipBefore.dipValue > 0;
    const completedPumps = tank.pumpReadingsBefore.filter(p => 
      p.electricMeter > 0 || p.manualMeter > 0 || p.cashMeter > 0
    ).length;
    
    return {
      dip: hasDip,
      pumps: completedPumps,
      totalPumps: tank.connectedPumps.length
    };
  };

  return (
    <div className="space-y-6">
      <Alert variant="warning">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 mt-0.5" />
          <div>
            <h4 className="font-semibold mb-1">BEFORE Offload Readings</h4>
            <p className="text-sm">
              Record tank dip readings and pump meter readings BEFORE starting the offload process.
              This establishes the baseline for calculations.
            </p>
          </div>
        </div>
      </Alert>

      <Card title="Before Offload Readings" className="p-6">
        {/* Tank Tabs */}
        <Tabs value={activeTankTab} onChange={setActiveTankTab}>
          {offloadData.tankOffloads.map(tank => {
            const completion = getTankCompletion(tank.tankId);
            return (
              <Tab 
                key={tank.tankId} 
                value={tank.tankId}
                badge={`${completion.pumps}/${completion.totalPumps}`}
              >
                <div className="flex items-center gap-2">
                  {tank.tankName}
                  {completion.dip && completion.pumps === completion.totalPumps && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* Tank Content */}
        {getCurrentTank() && (
          <div className="mt-6 space-y-6">
            {/* Tank Dip Reading */}
            <Card title="Tank Dip Reading - BEFORE Offload" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Dip Value (m)"
                  type="number"
                  step="0.001"
                  value={getCurrentTank().dipBefore?.dipValue || ''}
                  onChange={(e) => handleDipReadingUpdate('dipValue', e.target.value)}
                  placeholder="0.000"
                />
                <Input
                  label="Volume (L)"
                  type="number"
                  value={getCurrentTank().dipBefore?.volume || ''}
                  onChange={(e) => handleDipReadingUpdate('volume', e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Temperature (°C)"
                  type="number"
                  step="0.1"
                  value={getCurrentTank().dipBefore?.temperature || ''}
                  onChange={(e) => handleDipReadingUpdate('temperature', e.target.value)}
                  placeholder="25.0"
                />
                <Input
                  label="Density (kg/L)"
                  type="number"
                  step="0.001"
                  value={getCurrentTank().dipBefore?.density || purchaseData.items[0].product.density}
                  onChange={(e) => handleDipReadingUpdate('density', e.target.value)}
                  placeholder="0.850"
                />
              </div>
            </Card>

            {/* Pump Meter Readings */}
            <Card title="Pump Meter Readings - BEFORE Offload" className="p-4">
              <div className="space-y-4">
                {getCurrentTank().connectedPumps.map(pump => {
                  const reading = getPumpReading(pump.id);
                  
                  return (
                    <div key={pump.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold">{pump.name}</h5>
                        <Badge variant={
                          reading.electricMeter > 0 ? "success" : "warning"
                        }>
                          {reading.electricMeter > 0 ? "Recorded" : "Pending"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="Electric Meter"
                          type="number"
                          step="0.01"
                          value={reading.electricMeter || ''}
                          onChange={(e) => handlePumpReadingUpdate(pump.id, 'electricMeter', e.target.value)}
                          placeholder="0.00"
                        />
                        <Input
                          label="Manual Meter"
                          type="number"
                          step="0.01"
                          value={reading.manualMeter || ''}
                          onChange={(e) => handlePumpReadingUpdate(pump.id, 'manualMeter', e.target.value)}
                          placeholder="0.00"
                        />
                        <Input
                          label="Cash Meter"
                          type="number"
                          step="0.01"
                          value={reading.cashMeter || ''}
                          onChange={(e) => handlePumpReadingUpdate(pump.id, 'cashMeter', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </Card>

      {/* Progress Summary */}
      <Card title="Progress Summary" className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {offloadData.tankOffloads.map(tank => {
            const completion = getTankCompletion(tank.tankId);
            return (
              <div key={tank.tankId} className="text-center">
                <p className="font-semibold text-gray-700">{tank.tankName}</p>
                <div className="space-y-1">
                  <p className={`text-sm font-bold ${
                    completion.dip ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    Dip: {completion.dip ? '✓' : '✗'}
                  </p>
                  <p className={`text-sm font-bold ${
                    completion.pumps === completion.totalPumps ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    Pumps: {completion.pumps}/{completion.totalPumps}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default BeforeOffloadStep;