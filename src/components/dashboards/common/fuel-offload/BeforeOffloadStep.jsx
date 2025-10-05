import React, { useState } from 'react';
import { Card, Alert, Badge, Input, Tabs, Tab } from '../../../ui';
import { Clock, Zap, Fuel, CheckCircle, Calculator } from 'lucide-react';

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
          updatedReadings = tank.pumpReadingsBefore.map(reading =>
            reading.pumpId === pumpId
              ? { ...reading, [field]: parseFloat(value) || 0 }
              : reading
          );
        } else {
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
      {/* Header Alert */}
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

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {offloadData.tankOffloads.map(tank => {
          const completion = getTankCompletion(tank.tankId);
          const isCurrent = tank.tankId === activeTankTab;
          
          return (
            <Card key={tank.tankId} className={`p-4 text-center transition-all ${
              isCurrent ? 'border-2 border-blue-500 bg-blue-50' : 'border border-gray-200'
            }`}>
              <h4 className="font-semibold text-gray-900 mb-2">{tank.tankName}</h4>
              <div className="flex justify-center items-center gap-4 mb-2">
                <div className="text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                    completion.dip ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    {completion.dip ? '✓' : '1'}
                  </div>
                  <p className="text-xs mt-1 text-gray-600">Dip</p>
                </div>
                <div className="text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                    completion.pumps === completion.totalPumps ? 'bg-green-500' : 'bg-blue-500'
                  }`}>
                    {completion.pumps}
                  </div>
                  <p className="text-xs mt-1 text-gray-600">Pumps</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {completion.pumps}/{completion.totalPumps} completed
              </p>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Before Offload Readings</h3>
              <p className="text-gray-600">Record baseline measurements before fuel transfer</p>
            </div>
          </div>
        </div>

        {/* Tank Tabs */}
        <div className="border-b border-gray-200">
          <Tabs value={activeTankTab} onChange={setActiveTankTab} className="px-6">
            {offloadData.tankOffloads.map(tank => {
              const completion = getTankCompletion(tank.tankId);
              return (
                <Tab 
                  key={tank.tankId} 
                  value={tank.tankId}
                  badge={completion.pumps > 0 ? `${completion.pumps}/${completion.totalPumps}` : null}
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
        </div>

        {/* Tank Content */}
        {getCurrentTank() && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Tank Dip Reading */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Fuel className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-gray-900">Tank Dip Reading</h4>
                </div>
                <div className="space-y-4">
                  <Input
                    label="Dip Value (meters)"
                    type="number"
                    step="0.001"
                    value={getCurrentTank().dipBefore?.dipValue || ''}
                    onChange={(e) => handleDipReadingUpdate('dipValue', e.target.value)}
                    placeholder="0.000"
                  />
                  <Input
                    label="Volume (liters)"
                    type="number"
                    value={getCurrentTank().dipBefore?.volume || ''}
                    onChange={(e) => handleDipReadingUpdate('volume', e.target.value)}
                    placeholder="0"
                  />
                  <div className="grid grid-cols-2 gap-4">
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
                </div>
              </Card>

              {/* Pump Meter Readings */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-semibold text-gray-900">Pump Meter Readings</h4>
                </div>
                <div className="space-y-4">
                  {getCurrentTank().connectedPumps.map(pump => {
                    const reading = getPumpReading(pump.id);
                    
                    return (
                      <div key={pump.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-gray-900">{pump.name}</h5>
                          <Badge variant={
                            reading.electricMeter > 0 ? "success" : "warning"
                          }>
                            {reading.electricMeter > 0 ? "Recorded" : "Pending"}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <Input
                            label="Electric Meter"
                            type="number"
                            step="0.01"
                            value={reading.electricMeter || ''}
                            onChange={(e) => handlePumpReadingUpdate(pump.id, 'electricMeter', e.target.value)}
                            placeholder="0.00"
                          />
                          <div className="grid grid-cols-2 gap-3">
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
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BeforeOffloadStep;