// components/TanksStep.js
import React, { useState } from 'react';
import { Card, Tabs, Tab, Input, Badge, Alert, Button } from '../../../../ui';
import { Fuel, Droplets, Thermometer, CheckCircle, ChevronRight, Gauge } from 'lucide-react';

const TanksStep = ({ tanksWithReadings, closingData, onChange }) => {
    const [activeTankTab, setActiveTankTab] = useState('');
    const [selectedTankId, setSelectedTankId] = useState(null);
    
    const { tankReadings } = closingData;

    // Enhanced tanks data with completion status
    const enhancedTanks = React.useMemo(() => {
        return tanksWithReadings?.map(tank => ({
            ...tank,
            closingReading: tankReadings?.find(tr => tr.tankId === tank.tankId) || {},
            isCompleted: tankReadings?.some(tr => 
                tr.tankId === tank.tankId && tr.dipValue > 0 && tr.volume > 0
            )
        })) || [];
    }, [tanksWithReadings, tankReadings]);

    // Set first tank as active
    React.useEffect(() => {
        if (enhancedTanks?.length > 0 && !activeTankTab) {
            setActiveTankTab(enhancedTanks[0].tankId);
            
            if (!selectedTankId) {
                setSelectedTankId(enhancedTanks[0].tankId);
            }
        }
    }, [enhancedTanks, activeTankTab, selectedTankId]);

    const handleTankReadingUpdate = (tankId, field, value) => {
        const numericValue = parseFloat(value) || 0;
        
        // Find existing reading or create new one
        const existingReadingIndex = tankReadings.findIndex(reading => reading.tankId === tankId);
        
        let updatedReadings;
        if (existingReadingIndex >= 0) {
            updatedReadings = tankReadings.map(reading =>
                reading.tankId === tankId
                    ? { ...reading, [field]: numericValue }
                    : reading
            );
        } else {
            const tank = enhancedTanks.find(t => t.tankId === tankId);
            const startReading = tank?.latestReading;
            
            updatedReadings = [
                ...tankReadings,
                {
                    tankId,
                    tankName: tank?.tankName,
                    productName: tank?.product?.name,
                    dipValue: field === 'dipValue' ? numericValue : 0,
                    volume: field === 'volume' ? numericValue : 0,
                    temperature: field === 'temperature' ? numericValue : (startReading?.temperature || 25),
                    waterLevel: field === 'waterLevel' ? numericValue : (startReading?.waterLevel || 0),
                    density: field === 'density' ? numericValue : (startReading?.density || 0.85)
                }
            ];
        }

        onChange({ tankReadings: updatedReadings });
    };

    const getCurrentTank = () => {
        return enhancedTanks.find(tank => tank.tankId === activeTankTab);
    };

    const getSelectedTank = () => {
        return enhancedTanks.find(tank => tank.tankId === selectedTankId);
    };

    const getTankCompletionStatus = (tankId) => {
        const tank = enhancedTanks.find(t => t.tankId === tankId);
        return tank?.isCompleted || false;
    };

    const calculateVolumeChange = (startVolume, endVolume) => {
        return endVolume - startVolume;
    };

    const calculateTotalVolumeChange = () => {
        return tankReadings.reduce((total, reading) => {
            const tank = enhancedTanks?.find(t => t.tankId === reading.tankId);
            const startVolume = tank?.latestReading?.volume || 0;
            if (reading.volume > 0) {
                return total + (reading.volume - startVolume);
            }
            return total;
        }, 0);
    };

    const handleNextTank = () => {
        const currentIndex = enhancedTanks.findIndex(tank => tank.tankId === selectedTankId);
        
        if (currentIndex < enhancedTanks.length - 1) {
            // Next tank
            const nextTankId = enhancedTanks[currentIndex + 1].tankId;
            setSelectedTankId(nextTankId);
            setActiveTankTab(nextTankId);
        } else {
            // Loop back to first tank
            const firstTankId = enhancedTanks[0].tankId;
            setSelectedTankId(firstTankId);
            setActiveTankTab(firstTankId);
        }
    };

    if (!enhancedTanks?.length) {
        return (
            <Alert variant="warning" className="text-sm">
                <div className="flex items-start gap-2">
                    <Fuel className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">No Tank Readings</p>
                        <p>There are no tank dip readings for this shift. Please contact your supervisor.</p>
                    </div>
                </div>
            </Alert>
        );
    }

    const selectedTank = getSelectedTank();
    const startReading = selectedTank?.latestReading;
    const closingReading = selectedTank?.closingReading || {};

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

            {/* Volume Change Summary */}
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <div className="text-center">
                    <p className="text-orange-700 font-medium">Total Volume Change</p>
                    <p className={`text-xl font-bold ${
                        calculateTotalVolumeChange() < 0 ? 'text-red-600' : 'text-orange-900'
                    }`}>
                        {calculateTotalVolumeChange().toLocaleString()}L
                    </p>
                </div>
            </div>

            {/* Two Panel Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Panel - Tanks List */}
                <div className="lg:col-span-1">
                    <Card className="p-4">
                        {/* Tanks Tabs */}
                        <Tabs value={activeTankTab} onChange={setActiveTankTab} size="sm">
                            {enhancedTanks.map(tank => {
                                const isCompleted = getTankCompletionStatus(tank.tankId);
                                return (
                                    <Tab 
                                        key={tank.tankId} 
                                        value={tank.tankId}
                                        badge={isCompleted ? '✓' : null}
                                    >
                                        <div className="flex items-center gap-1 text-xs">
                                            <span className="truncate max-w-20">{tank.tankName}</span>
                                            {isCompleted && (
                                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    </Tab>
                                );
                            })}
                        </Tabs>

                        {/* Tanks List */}
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-sm">Available Tanks</h4>
                                <Badge variant="neutral" size="sm">
                                    {enhancedTanks.length} tanks
                                </Badge>
                            </div>

                            {enhancedTanks.map(tank => (
                                <div
                                    key={tank.tankId}
                                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                        selectedTankId === tank.tankId
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    } ${
                                        tank.isCompleted ? 'bg-green-50 border-green-200' : ''
                                    }`}
                                    onClick={() => {
                                        setSelectedTankId(tank.tankId);
                                        setActiveTankTab(tank.tankId);
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Fuel className={`w-4 h-4 ${
                                                tank.isCompleted ? 'text-green-600' : 'text-gray-400'
                                            }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{tank.tankName}</p>
                                                <p className="text-xs text-gray-600 truncate">
                                                    {tank.product?.name || 'Diesel'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {tank.isCompleted && (
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            )}
                                            <ChevronRight className={`w-4 h-4 ${
                                                selectedTankId === tank.tankId ? 'text-blue-500' : 'text-gray-400'
                                            }`} />
                                        </div>
                                    </div>

                                    {/* Tank Quick Info */}
                                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                                        <div className="text-gray-600">
                                            Capacity: {(tank.capacity || 0).toLocaleString()}L
                                        </div>
                                        <div className="text-gray-600">
                                            Current: {(tank.currentVolume || 0).toLocaleString()}L
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Right Panel - Tank Reading Form */}
                <div className="lg:col-span-2">
                    {selectedTank ? (
                        <Card className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg">{selectedTank.tankName}</h3>
                                    <p className="text-gray-600 text-sm">
                                        {selectedTank.product?.name || 'Diesel'} • 
                                        Capacity: {(selectedTank.capacity || 0).toLocaleString()}L
                                    </p>
                                </div>
                                <Badge 
                                    variant={selectedTank.isCompleted ? "success" : "warning"} 
                                    size="sm"
                                >
                                    {selectedTank.isCompleted ? "Completed" : "Pending"}
                                </Badge>
                            </div>

                            {/* Opening Readings Reference */}
                            {startReading && (
                                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                    <h4 className="font-semibold text-sm mb-3 text-gray-700 flex items-center gap-2">
                                        <Gauge className="w-4 h-4" />
                                        OPENING DIP READINGS
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-600 mb-1">Dip Value</p>
                                            <p className="text-xl font-bold text-gray-900">{startReading.dipValue}m</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-600 mb-1">Volume</p>
                                            <p className="text-xl font-bold text-gray-900">{startReading.volume.toLocaleString()}L</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-600 mb-1">Temperature</p>
                                            <p className="text-xl font-bold text-gray-900">{startReading.temperature || 25}°C</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-600 mb-1">Water Level</p>
                                            <p className="text-xl font-bold text-gray-900">{startReading.waterLevel || 0}m</p>
                                        </div>
                                    </div>
                                    {startReading.recordedAt && (
                                        <p className="text-xs text-gray-500 mt-2 text-center">
                                            Recorded: {new Date(startReading.recordedAt).toLocaleString()} • 
                                            Density: {startReading.density || 0.85}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Closing Readings Form */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                    <Droplets className="w-4 h-4" />
                                    CLOSING DIP READINGS
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <Input
                                            label="Dip Value (m)"
                                            type="number"
                                            step="0.01"
                                            value={closingReading.dipValue || ''}
                                            onChange={(e) => 
                                                handleTankReadingUpdate(selectedTank.tankId, 'dipValue', e.target.value)
                                            }
                                            placeholder="0.00"
                                            required
                                            min={0}
                                            className="text-lg font-semibold"
                                        />
                                        
                                        <Input
                                            label="Volume (L)"
                                            type="number"
                                            value={closingReading.volume || ''}
                                            onChange={(e) => 
                                                handleTankReadingUpdate(selectedTank.tankId, 'volume', e.target.value)
                                            }
                                            placeholder="0"
                                            required
                                            min={0}
                                            className="text-lg font-semibold"
                                        />

                                        <Input
                                            label="Density"
                                            type="number"
                                            step="0.001"
                                            value={closingReading.density || ''}
                                            onChange={(e) => 
                                                handleTankReadingUpdate(selectedTank.tankId, 'density', e.target.value)
                                            }
                                            placeholder="0.850"
                                            min="0.700"
                                            max="1.000"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <Input
                                            label="Temperature (°C)"
                                            type="number"
                                            step="0.1"
                                            value={closingReading.temperature || ''}
                                            onChange={(e) => 
                                                handleTankReadingUpdate(selectedTank.tankId, 'temperature', e.target.value)
                                            }
                                            placeholder="25.0"
                                            min={0}
                                            className="text-lg font-semibold"
                                        />
                                        
                                        <Input
                                            label="Water Level (m)"
                                            type="number"
                                            step="0.01"
                                            value={closingReading.waterLevel || ''}
                                            onChange={(e) => 
                                                handleTankReadingUpdate(selectedTank.tankId, 'waterLevel', e.target.value)
                                            }
                                            placeholder="0.00"
                                            min={0}
                                            className="text-lg font-semibold"
                                        />
                                    </div>
                                </div>

                                {/* Volume Change Calculation */}
                                {closingReading.volume > 0 && startReading && (
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                        <h5 className="font-semibold text-green-900 mb-3">VOLUME CHANGE ANALYSIS</h5>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center">
                                                <p className="text-green-700 font-medium">Opening Volume</p>
                                                <p className="text-2xl font-bold text-green-900">
                                                    {startReading.volume.toLocaleString()}L
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-green-700 font-medium">Closing Volume</p>
                                                <p className="text-2xl font-bold text-green-900">
                                                    {closingReading.volume.toLocaleString()}L
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-green-700 font-medium">Volume Change</p>
                                                <p className={`text-2xl font-bold ${
                                                    calculateVolumeChange(startReading.volume, closingReading.volume) < 0 
                                                        ? 'text-red-600' 
                                                        : 'text-green-900'
                                                }`}>
                                                    {calculateVolumeChange(startReading.volume, closingReading.volume).toLocaleString()}L
                                                </p>
                                            </div>
                                        </div>
                                        {selectedTank.connectedPumps && (
                                            <p className="text-green-700 text-sm mt-2 text-center">
                                                Connected to: {selectedTank.connectedPumps.map(pump => pump.pumpName).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Next Tank Button */}
                                <div className="flex justify-end pt-4">
                                    <Button 
                                        onClick={handleNextTank}
                                        variant="primary"
                                        size="sm"
                                    >
                                        Next Tank <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card className="p-8 text-center">
                            <Fuel className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="font-semibold text-gray-700 mb-2">Select a Tank</h3>
                            <p className="text-gray-600 text-sm">
                                Choose a tank from the left panel to enter closing dip readings
                            </p>
                        </Card>
                    )}
                </div>
            </div>

            {/* Progress Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border">
                <h4 className="font-semibold text-sm mb-3 text-center">Progress Summary</h4>
                <div className="grid grid-cols-2 xs:grid-cols-4 gap-4 text-xs">
                    {enhancedTanks.map(tank => {
                        const isCompleted = getTankCompletionStatus(tank.tankId);
                        return (
                            <div key={tank.tankId} className="text-center">
                                <p className="font-semibold text-gray-700 truncate">{tank.tankName}</p>
                                <p className={`text-base font-bold ${
                                    isCompleted ? 'text-green-600' : 'text-orange-600'
                                }`}>
                                    {isCompleted ? '✓' : '⋯'}
                                </p>
                                <p className="text-gray-600">
                                    {isCompleted ? 'Completed' : 'Pending'}
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