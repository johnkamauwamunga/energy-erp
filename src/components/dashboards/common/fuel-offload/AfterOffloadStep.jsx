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
    <div className="space-y-6">
      <Alert variant="success">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 mt-0.5" />
          <div>
            <h4 className="font-semibold mb-1">AFTER Offload Readings</h4>
            <p className="text-sm">
              Record tank dip readings, pump meter readings, and actual offloaded volumes AFTER completing the offload.
              Also track any sales that occurred during the offload process.
            </p>
          </div>
        </div>
      </Alert>

      <Card title="After Offload Readings" className="p-6">
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
                  {completion.dip && completion.volume && completion.pumps === completion.totalPumps && (
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
            {/* Actual Volume Input */}
            <Card title="Offload Volume" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Actual Volume Offloaded (L)"
                  type="number"
                  value={getCurrentTank().actualVolume || ''}
                  onChange={(e) => handleActualVolumeUpdate(e.target.value)}
                  placeholder="Enter actual volume"
                />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Expected Volume:</p>
                  <p className="font-semibold">{getCurrentTank().expectedVolume}L</p>
                  {getCurrentTank().actualVolume > 0 && (
                    <div className={`text-sm ${
                      getCurrentTank().actualVolume === getCurrentTank().expectedVolume 
                        ? 'text-green-600' 
                        : 'text-orange-600'
                    }`}>
                      Variance: {getCurrentTank().actualVolume - getCurrentTank().expectedVolume}L
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Tank Dip Reading */}
            <Card title="Tank Dip Reading - AFTER Offload" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Dip Value (m)"
                  type="number"
                  step="0.001"
                  value={getCurrentTank().dipAfter?.dipValue || ''}
                  onChange={(e) => handleDipReadingUpdate('dipValue', e.target.value)}
                  placeholder="0.000"
                />
                <Input
                  label="Volume (L)"
                  type="number"
                  value={getCurrentTank().dipAfter?.volume || ''}
                  onChange={(e) => handleDipReadingUpdate('volume', e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Temperature (°C)"
                  type="number"
                  step="0.1"
                  value={getCurrentTank().dipAfter?.temperature || ''}
                  onChange={(e) => handleDipReadingUpdate('temperature', e.target.value)}
                  placeholder="25.0"
                />
                <Input
                  label="Density (kg/L)"
                  type="number"
                  step="0.001"
                  value={getCurrentTank().dipAfter?.density || purchaseData.items[0].product.density}
                  onChange={(e) => handleDipReadingUpdate('density', e.target.value)}
                  placeholder="0.850"
                />
              </div>
              
              {/* Volume Calculation from Dips */}
              {calculateVolumeFromDips() !== null && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Calculated volume from dips: <strong>{calculateVolumeFromDips()}L</strong>
                  </p>
                </div>
              )}
            </Card>

            {/* Pump Meter Readings */}
            <Card title="Pump Meter Readings - AFTER Offload" className="p-4">
              <div className="space-y-4">
                {getCurrentTank().connectedPumps.map(pump => {
                  const beforeReading = getPumpReading(pump.id, 'before');
                  const afterReading = getPumpReading(pump.id, 'after');
                  const salesReading = getSalesReading(pump.id);
                  
                  const litersDispensed = afterReading.electricMeter - beforeReading.electricMeter;
                  
                  return (
                    <div key={pump.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold">{pump.name}</h5>
                        <Badge variant={
                          afterReading.electricMeter > 0 ? "success" : "warning"
                        }>
                          {afterReading.electricMeter > 0 ? "Recorded" : "Pending"}
                        </Badge>
                      </div>
                      
                      {/* Meter Readings */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="Electric Meter"
                          type="number"
                          step="0.01"
                          value={afterReading.electricMeter || ''}
                          onChange={(e) => handlePumpReadingUpdate(pump.id, 'electricMeter', e.target.value)}
                          placeholder="0.00"
                        />
                        <Input
                          label="Manual Meter"
                          type="number"
                          step="0.01"
                          value={afterReading.manualMeter || ''}
                          onChange={(e) => handlePumpReadingUpdate(pump.id, 'manualMeter', e.target.value)}
                          placeholder="0.00"
                        />
                        <Input
                          label="Cash Meter"
                          type="number"
                          step="0.01"
                          value={afterReading.cashMeter || ''}
                          onChange={(e) => handlePumpReadingUpdate(pump.id, 'cashMeter', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      {/* Sales During Offload */}
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h6 className="font-medium text-yellow-800 mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Sales During Offload
                        </h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            label="Liters Sold During Offload"
                            type="number"
                            step="0.01"
                            value={salesReading.litersSold || ''}
                            onChange={(e) => handleSalesDuringOffload(pump.id, 'litersSold', e.target.value)}
                            placeholder="0.00"
                          />
                          <Input
                            label="Sales Value (KES)"
                            type="number"
                            step="0.01"
                            value={salesReading.salesValue || ''}
                            onChange={(e) => handleSalesDuringOffload(pump.id, 'salesValue', e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Calculated Values */}
                      {litersDispensed > 0 && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <h6 className="font-medium text-green-800 mb-2">Calculated During Offload</h6>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-green-700">Liters Dispensed:</span>
                              <p className="font-semibold text-green-900">{litersDispensed.toFixed(2)}L</p>
                            </div>
                            <div>
                              <span className="text-green-700">From Sales:</span>
                              <p className="font-semibold text-green-900">
                                {(salesReading.litersSold || 0).toFixed(2)}L
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

      {/* Progress Summary */}
      <Card title="Progress Summary" className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {offloadData.tankOffloads.map(tank => {
            const completion = getTankCompletion(tank.tankId);
            return (
              <div key={tank.tankId} className="text-center">
                <p className="font-semibold text-gray-700">{tank.tankName}</p>
                <div className="space-y-1">
                  <p className={`text-xs font-bold ${
                    completion.dip ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    Dip: {completion.dip ? '✓' : '✗'}
                  </p>
                  <p className={`text-xs font-bold ${
                    completion.volume ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    Volume: {completion.volume ? '✓' : '✗'}
                  </p>
                  <p className={`text-xs font-bold ${
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

export default AfterOffloadStep;