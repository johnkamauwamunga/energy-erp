import React, { useState } from 'react';
import { Card, Tabs, Tab, Input, Badge, Alert } from '../../../ui';
import { Fuel, Droplets, Thermometer, CheckCircle } from 'lucide-react';

const TanksStep = ({ shiftData, closingData, onChange }) => {
  const [activeTankTab, setActiveTankTab] = useState('');
  const { dipReadings } = shiftData;
  const { tankReadings } = closingData;

  // Set first tank as active tab
  React.useEffect(() => {
    if (dipReadings.length > 0 && !activeTankTab) {
      setActiveTankTab(dipReadings[0].tankId);
    }
  }, [dipReadings, activeTankTab]);

  const handleTankReadingUpdate = (tankId, field, value) => {
    const numericValue = parseFloat(value) || 0;
    const updatedReadings = tankReadings.map(reading =>
      reading.tankId === tankId
        ? { ...reading, [field]: numericValue }
        : reading
    );

    onChange({ tankReadings: updatedReadings });
  };

  const getCurrentTank = () => {
    return dipReadings.find(tank => tank.tankId === activeTankTab);
  };

  const getCurrentTankClosingReading = () => {
    return tankReadings.find(reading => reading.tankId === activeTankTab) || {};
  };

  const getTankCompletionStatus = (tankId) => {
    const closingReading = tankReadings.find(tr => tr.tankId === tankId);
    return closingReading?.dipValue > 0;
  };

  const calculateVolumeChange = (startVolume, endVolume) => {
    return endVolume - startVolume;
  };

  return (
    <div className="space-y-4">
      {/* Compact Alert */}
      <Alert variant="info" className="text-sm" size="sm">
        <div className="flex items-start gap-2">
          <Droplets className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Record Tank END Dip Readings</p>
            <p>Enter END dip readings for fuel reconciliation and variance analysis.</p>
          </div>
        </div>
      </Alert>

      <Card className="p-4">
        {/* Compact Tanks Tabs */}
        <Tabs value={activeTankTab} onChange={setActiveTankTab} size="sm">
          {dipReadings.map(tank => {
            const isCompleted = getTankCompletionStatus(tank.tankId);
            return (
              <Tab 
                key={tank.tankId} 
                value={tank.tankId}
                badge={isCompleted ? '✓' : null}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span className="truncate max-w-20">{tank.tank.asset.name}</span>
                  {isCompleted && (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  )}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* Tank Content */}
        {getCurrentTank() && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm truncate">
                {getCurrentTank().tank.asset.name}
              </h4>
              <div className="text-xs text-gray-600 truncate">
                {getCurrentTank().tank.product?.name || 'Diesel'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: START Readings Reference */}
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded border text-xs">
                  <h5 className="font-medium mb-2 flex items-center gap-1">
                    <Fuel className="w-3 h-3" />
                    START Readings
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-600">Dip:</span>
                      <p className="font-semibold">{getCurrentTank().dipValue}m</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Volume:</span>
                      <p className="font-semibold">{getCurrentTank().volume.toLocaleString()}L</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Temp:</span>
                      <p className="font-semibold">{getCurrentTank().temperature}°C</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Water:</span>
                      <p className="font-semibold">{getCurrentTank().waterLevel}m</p>
                    </div>
                  </div>
                </div>

                {/* Compact Tank Information */}
                <div className="bg-blue-50 p-3 rounded border border-blue-200 text-xs">
                  <h5 className="font-medium mb-2 text-blue-900">Tank Info</h5>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Capacity:</span>
                      <span className="font-semibold text-blue-900">
                        {(getCurrentTank().tank.capacity || 0).toLocaleString()}L
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Current:</span>
                      <span className="font-semibold text-blue-900">
                        {(getCurrentTank().tank.currentVolume || 0).toLocaleString()}L
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Density:</span>
                      <span className="font-semibold text-blue-900">
                        {getCurrentTank().density || 0.85}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: END Readings Input */}
              <div>
                <h5 className="font-medium text-sm mb-3 flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  END Readings
                </h5>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Dip (m)"
                      type="number"
                      step="0.01"
                      size="sm"
                      value={getCurrentTankClosingReading().dipValue || ''}
                      onChange={(e) => 
                        handleTankReadingUpdate(getCurrentTank().tankId, 'dipValue', e.target.value)
                      }
                      placeholder="0.00"
                      required
                    />
                    
                    <Input
                      label="Volume (L)"
                      type="number"
                      size="sm"
                      value={getCurrentTankClosingReading().volume || ''}
                      onChange={(e) => 
                        handleTankReadingUpdate(getCurrentTank().tankId, 'volume', e.target.value)
                      }
                      placeholder="0"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Temp (°C)"
                      type="number"
                      step="0.1"
                      size="sm"
                      value={getCurrentTankClosingReading().temperature || ''}
                      onChange={(e) => 
                        handleTankReadingUpdate(getCurrentTank().tankId, 'temperature', e.target.value)
                      }
                      placeholder="25.0"
                    />
                    
                    <Input
                      label="Water (m)"
                      type="number"
                      step="0.01"
                      size="sm"
                      value={getCurrentTankClosingReading().waterLevel || ''}
                      onChange={(e) => 
                        handleTankReadingUpdate(getCurrentTank().tankId, 'waterLevel', e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <Input
                    label="Density"
                    type="number"
                    step="0.001"
                    size="sm"
                    value={getCurrentTankClosingReading().density || ''}
                    onChange={(e) => 
                      handleTankReadingUpdate(getCurrentTank().tankId, 'density', e.target.value)
                    }
                    placeholder="0.850"
                  />

                  {/* Compact Volume Change Calculation */}
                  {getCurrentTankClosingReading().volume > 0 && (
                    <div className="bg-green-50 p-2 rounded border border-green-200 text-xs">
                      <h6 className="font-medium text-green-900 mb-1">Volume Change</h6>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-green-700">START:</span>
                          <p className="font-semibold text-green-900">
                            {getCurrentTank().volume.toLocaleString()}L
                          </p>
                        </div>
                        <div>
                          <span className="text-green-700">END:</span>
                          <p className="font-semibold text-green-900">
                            {getCurrentTankClosingReading().volume.toLocaleString()}L
                          </p>
                        </div>
                        <div>
                          <span className="text-green-700">Change:</span>
                          <p className={`font-semibold ${
                            calculateVolumeChange(getCurrentTank().volume, getCurrentTankClosingReading().volume) < 0 
                              ? 'text-red-600' 
                              : 'text-green-900'
                          }`}>
                            {calculateVolumeChange(getCurrentTank().volume, getCurrentTankClosingReading().volume).toLocaleString()}L
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Compact Progress Summary */}
      <div className="bg-gray-50 rounded-lg p-3 border">
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 text-xs">
          {dipReadings.map(tank => {
            const isCompleted = getTankCompletionStatus(tank.tankId);
            return (
              <div key={tank.tankId} className="text-center">
                <p className="font-semibold text-gray-700 truncate">{tank.tank.asset.name}</p>
                <div className={`text-base font-bold ${
                  isCompleted ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {isCompleted ? '✓' : '⋯'}
                </div>
                <p className="text-gray-600">
                  {isCompleted ? 'Done' : 'Pending'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TanksStep;