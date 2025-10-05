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
    <div className="space-y-4">
      {/* Compact Alert */}
      <Alert variant="warning" className="text-sm" size="sm">
        <div className="flex items-start gap-2">
          <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">BEFORE Offload Readings</p>
            <p>Record tank dip and pump meter readings BEFORE starting offload.</p>
          </div>
        </div>
      </Alert>

      {/* Compact Progress Summary */}
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
        {offloadData.tankOffloads.map(tank => {
          const completion = getTankCompletion(tank.tankId);
          const isCurrent = tank.tankId === activeTankTab;
          
          return (
            <div key={tank.tankId} className={`p-3 text-center border rounded transition-all text-xs ${
              isCurrent ? 'border-2 border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <h4 className="font-semibold text-gray-900 mb-2 truncate">{tank.tankName}</h4>
              <div className="flex justify-center items-center gap-3 mb-2">
                <div className="text-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                    completion.dip ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    {completion.dip ? '✓' : '1'}
                  </div>
                  <p className="mt-1 text-gray-600">Dip</p>
                </div>
                <div className="text-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                    completion.pumps === completion.totalPumps ? 'bg-green-500' : 'bg-blue-500'
                  }`}>
                    {completion.pumps}
                  </div>
                  <p className="mt-1 text-gray-600">Pumps</p>
                </div>
              </div>
              <p className="text-gray-600">
                {completion.pumps}/{completion.totalPumps}
              </p>
            </div>
          );
        })}
      </div>

      <Card className="p-4">
        {/* Compact Header */}
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Before Offload Readings</h3>
            <p className="text-gray-600 text-xs">Record baseline measurements before fuel transfer</p>
          </div>
        </div>

        {/* Compact Tank Tabs */}
        <Tabs value={activeTankTab} onChange={setActiveTankTab} size="sm" className="mb-4">
          {offloadData.tankOffloads.map(tank => {
            const completion = getTankCompletion(tank.tankId);
            return (
              <Tab 
                key={tank.tankId} 
                value={tank.tankId}
                badge={completion.pumps > 0 ? `${completion.pumps}/${completion.totalPumps}` : null}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span className="truncate max-w-20">{tank.tankName}</span>
                  {completion.dip && completion.pumps === completion.totalPumps && (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  )}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* Tank Content */}
        {getCurrentTank() && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Compact Tank Dip Reading */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <Fuel className="w-3 h-3 text-orange-600" />
                <h4 className="font-semibold text-gray-900 text-sm">Tank Dip</h4>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Dip (m)"
                    type="number"
                    step="0.001"
                    size="sm"
                    value={getCurrentTank().dipBefore?.dipValue || ''}
                    onChange={(e) => handleDipReadingUpdate('dipValue', e.target.value)}
                    placeholder="0.000"
                  />
                  <Input
                    label="Volume (L)"
                    type="number"
                    size="sm"
                    value={getCurrentTank().dipBefore?.volume || ''}
                    onChange={(e) => handleDipReadingUpdate('volume', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Temp (°C)"
                    type="number"
                    step="0.1"
                    size="sm"
                    value={getCurrentTank().dipBefore?.temperature || ''}
                    onChange={(e) => handleDipReadingUpdate('temperature', e.target.value)}
                    placeholder="25.0"
                  />
                  <Input
                    label="Density"
                    type="number"
                    step="0.001"
                    size="sm"
                    value={getCurrentTank().dipBefore?.density || purchaseData.items[0].product.density}
                    onChange={(e) => handleDipReadingUpdate('density', e.target.value)}
                    placeholder="0.850"
                  />
                </div>
              </div>
            </Card>

            {/* Compact Pump Meter Readings */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-3 h-3 text-yellow-600" />
                <h4 className="font-semibold text-gray-900 text-sm">
                  Pump Readings ({getCurrentTank().connectedPumps.length})
                </h4>
              </div>
              <div className="space-y-3">
                {getCurrentTank().connectedPumps.map(pump => {
                  const reading = getPumpReading(pump.id);
                  
                  return (
                    <div key={pump.id} className="p-2 border border-gray-200 rounded text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-gray-900 truncate">{pump.name}</h5>
                        <Badge variant={
                          reading.electricMeter > 0 ? "success" : "warning"
                        } size="sm">
                          {reading.electricMeter > 0 ? "✓" : "⋯"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1">
                        <Input
                          label="Electric"
                          type="number"
                          step="0.01"
                          size="sm"
                          value={reading.electricMeter || ''}
                          onChange={(e) => handlePumpReadingUpdate(pump.id, 'electricMeter', e.target.value)}
                          placeholder="0"
                        />
                        <Input
                          label="Manual"
                          type="number"
                          step="0.01"
                          size="sm"
                          value={reading.manualMeter || ''}
                          onChange={(e) => handlePumpReadingUpdate(pump.id, 'manualMeter', e.target.value)}
                          placeholder="0"
                        />
                        <Input
                          label="Cash"
                          type="number"
                          step="0.01"
                          size="sm"
                          value={reading.cashMeter || ''}
                          onChange={(e) => handlePumpReadingUpdate(pump.id, 'cashMeter', e.target.value)}
                          placeholder="0"
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
    </div>
  );
};

export default BeforeOffloadStep;