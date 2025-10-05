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
    <div className="space-y-6">
      <Alert variant="info">
        <div className="flex items-start gap-3">
          <Droplets className="w-5 h-5 mt-0.5" />
          <div>
            <h4 className="font-semibold mb-1">Record Tank END Dip Readings</h4>
            <p className="text-sm">
              Enter END dip readings for each tank. This data is used for fuel reconciliation and variance analysis.
            </p>
          </div>
        </div>
      </Alert>

      <Card title="Tank Dip Readings - END" className="p-6">
        {/* Tanks Tabs */}
        <Tabs value={activeTankTab} onChange={setActiveTankTab}>
          {dipReadings.map(tank => {
            const isCompleted = getTankCompletionStatus(tank.tankId);
            return (
              <Tab 
                key={tank.tankId} 
                value={tank.tankId}
                badge={isCompleted ? '✓' : null}
              >
                <div className="flex items-center gap-2">
                  {tank.tank.asset.name}
                  {isCompleted && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* Tank Content */}
        {getCurrentTank() && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-semibold text-lg">
                {getCurrentTank().tank.asset.name}
              </h4>
              <div className="text-sm text-gray-600">
                Product: {getCurrentTank().tank.product?.name || 'Diesel'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: START Readings Reference */}
              <div>
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h5 className="font-medium mb-3 flex items-center gap-2">
                    <Fuel className="w-4 h-4" />
                    START Readings (Reference)
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Dip Value:</span>
                      <p className="font-semibold">{getCurrentTank().dipValue} m</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Volume:</span>
                      <p className="font-semibold">{getCurrentTank().volume.toLocaleString()} L</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Temperature:</span>
                      <p className="font-semibold">{getCurrentTank().temperature} °C</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Water Level:</span>
                      <p className="font-semibold">{getCurrentTank().waterLevel} m</p>
                    </div>
                  </div>
                </div>

                {/* Tank Information */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h5 className="font-medium mb-3 text-blue-900">Tank Information</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Capacity:</span>
                      <span className="font-semibold text-blue-900">
                        {getCurrentTank().tank.capacity?.toLocaleString() || 'N/A'} L
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Current Volume:</span>
                      <span className="font-semibold text-blue-900">
                        {getCurrentTank().tank.currentVolume?.toLocaleString() || 'N/A'} L
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Product Density:</span>
                      <span className="font-semibold text-blue-900">
                        {getCurrentTank().density || 0.85}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: END Readings Input */}
              <div>
                <div className="space-y-4">
                  <h5 className="font-medium flex items-center gap-2">
                    <Droplets className="w-4 h-4" />
                    END Readings
                  </h5>

                  <div className="grid grid-cols-1 gap-4">
                    <Input
                      label="Dip Value (meters)"
                      type="number"
                      step="0.01"
                      value={getCurrentTankClosingReading().dipValue || ''}
                      onChange={(e) => 
                        handleTankReadingUpdate(getCurrentTank().tankId, 'dipValue', e.target.value)
                      }
                      placeholder="0.00"
                      required
                      helperText="Measured dip value in meters"
                    />
                    
                    <Input
                      label="Volume (liters)"
                      type="number"
                      value={getCurrentTankClosingReading().volume || ''}
                      onChange={(e) => 
                        handleTankReadingUpdate(getCurrentTank().tankId, 'volume', e.target.value)
                      }
                      placeholder="0"
                      required
                      helperText="Calculated volume based on dip value"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Temperature (°C)"
                        type="number"
                        step="0.1"
                        value={getCurrentTankClosingReading().temperature || ''}
                        onChange={(e) => 
                          handleTankReadingUpdate(getCurrentTank().tankId, 'temperature', e.target.value)
                        }
                        placeholder="25.0"
                        helperText="Fuel temperature"
                      />
                      
                      <Input
                        label="Water Level (m)"
                        type="number"
                        step="0.01"
                        value={getCurrentTankClosingReading().waterLevel || ''}
                        onChange={(e) => 
                          handleTankReadingUpdate(getCurrentTank().tankId, 'waterLevel', e.target.value)
                        }
                        placeholder="0.00"
                        helperText="Water bottom level"
                      />
                    </div>

                    <Input
                      label="Density"
                      type="number"
                      step="0.001"
                      value={getCurrentTankClosingReading().density || ''}
                      onChange={(e) => 
                        handleTankReadingUpdate(getCurrentTank().tankId, 'density', e.target.value)
                      }
                      placeholder="0.850"
                      helperText="Fuel density (kg/L)"
                    />
                  </div>

                  {/* Volume Change Calculation */}
                  {getCurrentTankClosingReading().volume > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h6 className="font-medium text-green-900 mb-2">Volume Change</h6>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-green-700">START Volume:</span>
                          <p className="font-semibold text-green-900">
                            {getCurrentTank().volume.toLocaleString()} L
                          </p>
                        </div>
                        <div>
                          <span className="text-green-700">END Volume:</span>
                          <p className="font-semibold text-green-900">
                            {getCurrentTankClosingReading().volume.toLocaleString()} L
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-green-700">Volume Change:</span>
                          <p className={`font-semibold ${
                            calculateVolumeChange(getCurrentTank().volume, getCurrentTankClosingReading().volume) < 0 
                              ? 'text-red-600' 
                              : 'text-green-900'
                          }`}>
                            {calculateVolumeChange(getCurrentTank().volume, getCurrentTankClosingReading().volume).toLocaleString()} L
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

      {/* Progress Summary */}
      <Card title="Tank Reading Progress" className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {dipReadings.map(tank => {
            const isCompleted = getTankCompletionStatus(tank.tankId);
            return (
              <div key={tank.tankId} className="text-center">
                <p className="font-semibold text-gray-700">{tank.tank.asset.name}</p>
                <div className={`text-lg font-bold ${
                  isCompleted ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {isCompleted ? '✓' : '⋯'}
                </div>
                <p className="text-xs text-gray-600">
                  {isCompleted ? 'Completed' : 'Pending'}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default TanksStep;