import React, { useState } from 'react';
import { Card, Alert, Badge, Input, Tabs, Tab } from '../../../ui';
import { CheckCircle, Zap, Fuel, DollarSign } from 'lucide-react';

const AfterOffloadStep = ({ purchaseData, offloadData, onChange }) => {
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
            dipAfter: {
              ...tank.dipAfter,
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
        const existingReadingIndex = tank.pumpReadingsAfter.findIndex(
          reading => reading.pumpId === pumpId
        );

        let updatedReadings;
        
        if (existingReadingIndex >= 0) {
          updatedReadings = tank.pumpReadingsAfter.map(reading =>
            reading.pumpId === pumpId
              ? { ...reading, [field]: parseFloat(value) || 0 }
              : reading
          );
        } else {
          updatedReadings = [
            ...tank.pumpReadingsAfter,
            {
              pumpId,
              pumpName: currentTank.connectedPumps.find(p => p.id === pumpId)?.name,
              [field]: parseFloat(value) || 0
            }
          ];
        }

        return { ...tank, pumpReadingsAfter: updatedReadings };
      }
      return tank;
    });

    onChange({ tankOffloads: updatedTanks });
  };

  const handleActualVolumeUpdate = (value) => {
    const currentTank = getCurrentTank();
    if (!currentTank) return;

    const updatedTanks = offloadData.tankOffloads.map(tank =>
      tank.tankId === activeTankTab
        ? { ...tank, actualVolume: parseFloat(value) || 0 }
        : tank
    );

    onChange({ tankOffloads: updatedTanks });
  };

  const handleSalesDuringOffload = (pumpId, field, value) => {
    const currentTank = getCurrentTank();
    if (!currentTank) return;

    const updatedSales = [...(offloadData.pumpSales || [])];
    const existingSaleIndex = updatedSales.findIndex(sale => 
      sale.pumpId === pumpId && sale.tankId === currentTank.tankId
    );

    if (existingSaleIndex >= 0) {
      updatedSales[existingSaleIndex] = {
        ...updatedSales[existingSaleIndex],
        [field]: parseFloat(value) || 0
      };
    } else {
      updatedSales.push({
        pumpId,
        tankId: currentTank.tankId,
        pumpName: currentTank.connectedPumps.find(p => p.id === pumpId)?.name,
        [field]: parseFloat(value) || 0
      });
    }

    onChange({ pumpSales: updatedSales });
  };

  const getPumpReading = (pumpId, type = 'after') => {
    const currentTank = getCurrentTank();
    const readings = type === 'after' ? currentTank?.pumpReadingsAfter : currentTank?.pumpReadingsBefore;
    return readings?.find(reading => reading.pumpId === pumpId) || {};
  };

  const getSalesReading = (pumpId) => {
    const currentTank = getCurrentTank();
    return offloadData.pumpSales?.find(sale => 
      sale.pumpId === pumpId && sale.tankId === currentTank.tankId
    ) || {};
  };

  const getTankCompletion = (tankId) => {
    const tank = offloadData.tankOffloads.find(t => t.tankId === tankId);
    if (!tank) return { dip: false, pumps: 0, volume: false };
    
    const hasDip = tank.dipAfter && tank.dipAfter.dipValue > 0;
    const hasVolume = tank.actualVolume > 0;
    const completedPumps = tank.pumpReadingsAfter.filter(p => 
      p.electricMeter > 0 || p.manualMeter > 0 || p.cashMeter > 0
    ).length;
    
    return {
      dip: hasDip,
      volume: hasVolume,
      pumps: completedPumps,
      totalPumps: tank.connectedPumps.length
    };
  };

  const calculateVolumeFromDips = () => {
    const currentTank = getCurrentTank();
    if (!currentTank?.dipBefore?.volume || !currentTank?.dipAfter?.volume) return null;
    
    return currentTank.dipAfter.volume - currentTank.dipBefore.volume;
  };

  return (
    <div className="space-y-4">
      {/* Compact Alert */}
      <Alert variant="success" className="text-sm" size="sm">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">AFTER Offload Readings</p>
            <p>Record tank dip, pump meter readings, and actual volumes AFTER offload.</p>
          </div>
        </div>
      </Alert>

      <Card className="p-4">
        {/* Compact Tank Tabs */}
        <Tabs value={activeTankTab} onChange={setActiveTankTab} size="sm">
          {offloadData.tankOffloads.map(tank => {
            const completion = getTankCompletion(tank.tankId);
            return (
              <Tab 
                key={tank.tankId} 
                value={tank.tankId}
                badge={`${completion.pumps}/${completion.totalPumps}`}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span className="truncate max-w-20">{tank.tankName}</span>
                  {completion.dip && completion.volume && completion.pumps === completion.totalPumps && (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  )}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* Tank Content */}
        {getCurrentTank() && (
          <div className="mt-4 space-y-4">
            {/* Compact Actual Volume Input */}
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-1">
                <Fuel className="w-3 h-3" />
                Offload Volume
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Actual Volume (L)"
                  type="number"
                  size="sm"
                  value={getCurrentTank().actualVolume || ''}
                  onChange={(e) => handleActualVolumeUpdate(e.target.value)}
                  placeholder="0"
                />
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected:</span>
                    <span className="font-semibold">{getCurrentTank().expectedVolume}L</span>
                  </div>
                  {getCurrentTank().actualVolume > 0 && (
                    <div className={`font-semibold ${
                      getCurrentTank().actualVolume === getCurrentTank().expectedVolume 
                        ? 'text-green-600' 
                        : 'text-orange-600'
                    }`}>
                      Var: {getCurrentTank().actualVolume - getCurrentTank().expectedVolume}L
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Tank Dip Reading */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <Fuel className="w-3 h-3 text-orange-600" />
                <h4 className="font-semibold text-sm">Tank Dip - AFTER</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Input
                  label="Dip (m)"
                  type="number"
                  step="0.001"
                  size="sm"
                  value={getCurrentTank().dipAfter?.dipValue || ''}
                  onChange={(e) => handleDipReadingUpdate('dipValue', e.target.value)}
                  placeholder="0.000"
                />
                <Input
                  label="Volume (L)"
                  type="number"
                  size="sm"
                  value={getCurrentTank().dipAfter?.volume || ''}
                  onChange={(e) => handleDipReadingUpdate('volume', e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Temp (°C)"
                  type="number"
                  step="0.1"
                  size="sm"
                  value={getCurrentTank().dipAfter?.temperature || ''}
                  onChange={(e) => handleDipReadingUpdate('temperature', e.target.value)}
                  placeholder="25.0"
                />
                <Input
                  label="Density"
                  type="number"
                  step="0.001"
                  size="sm"
                  value={getCurrentTank().dipAfter?.density || purchaseData.items[0].product.density}
                  onChange={(e) => handleDipReadingUpdate('density', e.target.value)}
                  placeholder="0.850"
                />
              </div>
              
              {/* Volume Calculation from Dips */}
              {calculateVolumeFromDips() !== null && (
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200 text-xs">
                  <p className="text-blue-800">
                    Calculated from dips: <strong>{calculateVolumeFromDips()}L</strong>
                  </p>
                </div>
              )}
            </Card>

            {/* Compact Pump Meter Readings */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-3 h-3 text-yellow-600" />
                <h4 className="font-semibold text-sm">
                  Pump Readings - AFTER ({getCurrentTank().connectedPumps.length})
                </h4>
              </div>
              <div className="space-y-3">
                {getCurrentTank().connectedPumps.map(pump => {
                  const beforeReading = getPumpReading(pump.id, 'before');
                  const afterReading = getPumpReading(pump.id, 'after');
                  const salesReading = getSalesReading(pump.id);
                  
                  const litersDispensed = afterReading.electricMeter - beforeReading.electricMeter;
                  
                  return (
                    <div key={pump.id} className="p-3 border rounded space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold truncate">{pump.name}</h5>
                        <Badge variant={
                          afterReading.electricMeter > 0 ? "success" : "warning"
                        } size="sm">
                          {afterReading.electricMeter > 0 ? "✓" : "⋯"}
                        </Badge>
                      </div>
                      
                      {/* Compact Meter Readings */}
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          label="Electric"
                          type="number"
                          step="0.01"
                          size="sm"
                          value={afterReading.electricMeter || ''}
                          onChange={(e) => handlePumpReadingUpdate(pump.id, 'electricMeter', e.target.value)}
                          placeholder="0"
                        />
                        <Input
                          label="Manual"
                          type="number"
                          step="0.01"
                          size="sm"
                          value={afterReading.manualMeter || ''}
                          onChange={(e) => handlePumpReadingUpdate(pump.id, 'manualMeter', e.target.value)}
                          placeholder="0"
                        />
                        <Input
                          label="Cash"
                          type="number"
                          step="0.01"
                          size="sm"
                          value={afterReading.cashMeter || ''}
                          onChange={(e) => handlePumpReadingUpdate(pump.id, 'cashMeter', e.target.value)}
                          placeholder="0"
                        />
                      </div>

                      {/* Compact Sales During Offload */}
                      <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                        <h6 className="font-medium text-yellow-800 mb-2 flex items-center gap-1">
                          <DollarSign className="w-2 h-2" />
                          Sales During Offload
                        </h6>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            label="Liters Sold"
                            type="number"
                            step="0.01"
                            size="sm"
                            value={salesReading.litersSold || ''}
                            onChange={(e) => handleSalesDuringOffload(pump.id, 'litersSold', e.target.value)}
                            placeholder="0"
                          />
                          <Input
                            label="Sales (KES)"
                            type="number"
                            step="0.01"
                            size="sm"
                            value={salesReading.salesValue || ''}
                            onChange={(e) => handleSalesDuringOffload(pump.id, 'salesValue', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Compact Calculated Values */}
                      {litersDispensed > 0 && (
                        <div className="p-2 bg-green-50 rounded border border-green-200">
                          <h6 className="font-medium text-green-800 mb-1">Calculated</h6>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-green-700">Dispensed:</span>
                              <p className="font-semibold text-green-900">{litersDispensed.toFixed(1)}L</p>
                            </div>
                            <div>
                              <span className="text-green-700">From Sales:</span>
                              <p className="font-semibold text-green-900">
                                {(salesReading.litersSold || 0).toFixed(1)}L
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </Card>

      {/* Compact Progress Summary */}
      <div className="bg-gray-50 rounded-lg p-3 border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {offloadData.tankOffloads.map(tank => {
            const completion = getTankCompletion(tank.tankId);
            return (
              <div key={tank.tankId} className="text-center">
                <p className="font-semibold text-gray-700 truncate">{tank.tankName}</p>
                <div className="space-y-1 mt-1">
                  <div className="flex justify-center gap-2">
                    <span className={`font-bold ${
                      completion.dip ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      D:{completion.dip ? '✓' : '✗'}
                    </span>
                    <span className={`font-bold ${
                      completion.volume ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      V:{completion.volume ? '✓' : '✗'}
                    </span>
                  </div>
                  <p className={`font-bold ${
                    completion.pumps === completion.totalPumps ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    P:{completion.pumps}/{completion.totalPumps}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AfterOffloadStep;