// components/IslandPumpsStep.js
import React, { useState } from 'react';
import { Card, Tabs, Tab, Input, Badge, Alert, Button } from '../../../../ui';
import { Zap, Calculator, CheckCircle, ChevronRight, Fuel } from 'lucide-react';

const IslandPumpsStep = ({ pumpsWithIslandInfo, expectedCollectionsByIsland, closingData, onChange }) => {
    const [activeIslandTab, setActiveIslandTab] = useState('');
    const [selectedPumpId, setSelectedPumpId] = useState(null);

    const { pumpReadings } = closingData;

    // Debug logging
    console.log("=== IslandPumpsStep Debug ===");
    console.log("pumpsWithIslandInfo:", pumpsWithIslandInfo);
    console.log("expectedCollectionsByIsland:", expectedCollectionsByIsland);

    // Group pumps by island
    const pumpsByIsland = React.useMemo(() => {
        const grouped = {};
        
        pumpsWithIslandInfo.forEach(pump => {
            const islandId = pump.islandId;
            if (!grouped[islandId]) {
                grouped[islandId] = {
                    islandId: islandId,
                    islandName: pump.islandName,
                    islandCode: pump.islandCode,
                    pumps: []
                };
            }
            
            // Get the expected collection data for this pump
            const islandExpectedData = expectedCollectionsByIsland.find(island => island.islandId === islandId);
            const pumpExpectedData = islandExpectedData?.pumps?.find(p => p.pumpId === pump.pumpId);
            
            grouped[islandId].pumps.push({
                ...pump,
                closingReading: pumpReadings?.find(pr => pr.pumpId === pump.pumpId) || {},
                isCompleted: pumpReadings?.some(pr => pr.pumpId === pump.pumpId && pr.electricMeter > 0),
                expectedData: pumpExpectedData
            });
        });
        
        return grouped;
    }, [pumpsWithIslandInfo, pumpReadings, expectedCollectionsByIsland]);

    // Set first island and pump as active
    React.useEffect(() => {
        const islandIds = Object.keys(pumpsByIsland);
        if (islandIds.length > 0 && !activeIslandTab) {
            setActiveIslandTab(islandIds[0]);
            
            // Set first pump as selected
            const firstIslandPumps = pumpsByIsland[islandIds[0]]?.pumps || [];
            if (firstIslandPumps.length > 0 && !selectedPumpId) {
                setSelectedPumpId(firstIslandPumps[0].pumpId);
            }
        }
    }, [pumpsByIsland, activeIslandTab, selectedPumpId]);

    // Calculate expected collections for each island based on actual closing readings
    const calculateIslandCollections = React.useMemo(() => {
        const collections = {};
        
        Object.values(pumpsByIsland).forEach(island => {
            let islandTotal = 0;
            const pumpCollections = [];
            
            island.pumps.forEach(pump => {
                const closingReading = pumpReadings.find(pr => pr.pumpId === pump.pumpId);
                const startReading = pump.meterReadings?.find(r => r.readingType === 'START');
                
                if (startReading && closingReading && closingReading.electricMeter > 0) {
                    const openingElectric = startReading.electricMeter || 0;
                    const openingManual = startReading.manualMeter || 0;
                    const closingElectric = closingReading.electricMeter || 0;
                    const closingManual = closingReading.manualMeter || 0;
                    
                    const electricSales = closingElectric - openingElectric;
                    const manualSales = closingManual - openingManual;
                    const averageSales = (electricSales + manualSales) / 2;
                    const unitPrice = closingReading.unitPrice || 100.00;
                    const expectedCollection = averageSales * unitPrice;
                    
                    islandTotal += expectedCollection;
                    
                    pumpCollections.push({
                        pumpId: pump.pumpId,
                        pumpName: pump.pumpName,
                        expectedCollection: Math.round(expectedCollection * 100) / 100
                    });
                }
            });
            
            collections[island.islandId] = {
                islandId: island.islandId,
                islandName: island.islandName,
                totalExpected: Math.round(islandTotal * 100) / 100,
                pumpCollections: pumpCollections
            };
        });
        
        return collections;
    }, [pumpsByIsland, pumpReadings]);

    // Pass collections to parent component for use in step 4
    React.useEffect(() => {
        if (Object.keys(calculateIslandCollections).length > 0) {
            onChange({ 
                islandCollections: calculateIslandCollections 
            });
        }
    }, [calculateIslandCollections, onChange]);

    const handlePumpReadingUpdate = (pumpId, field, value) => {
        const numericValue = parseFloat(value) || 0;
        
        // Find existing reading or create new one
        const existingReadingIndex = pumpReadings.findIndex(reading => reading.pumpId === pumpId);
        
        let updatedReadings;
        if (existingReadingIndex >= 0) {
            updatedReadings = [...pumpReadings];
            updatedReadings[existingReadingIndex] = {
                ...updatedReadings[existingReadingIndex],
                [field]: numericValue
            };
        } else {
            const pump = pumpsWithIslandInfo.find(p => p.pumpId === pumpId);
            const startReading = pump?.meterReadings?.find(r => r.readingType === 'START');
            
            updatedReadings = [
                ...pumpReadings,
                {
                    pumpId,
                    pumpName: pump?.pumpName,
                    productName: pump?.product?.name,
                    electricMeter: field === 'electricMeter' ? numericValue : 0,
                    manualMeter: field === 'manualMeter' ? numericValue : 0,
                    cashMeter: field === 'cashMeter' ? numericValue : 0,
                    unitPrice: 100.00,
                    litersDispensed: 0,
                    salesValue: 0
                }
            ];
        }

        // Auto-calculate liters and sales when meters are updated
        if (field === 'electricMeter' || field === 'manualMeter') {
            const readingIndex = updatedReadings.findIndex(r => r.pumpId === pumpId);
            if (readingIndex !== -1) {
                const reading = updatedReadings[readingIndex];
                const pump = pumpsWithIslandInfo.find(p => p.pumpId === pumpId);
                const startReading = pump?.meterReadings?.find(r => r.readingType === 'START');
                
                if (startReading && reading.electricMeter > 0) {
                    const litersDispensed = Math.max(0, reading.electricMeter - startReading.electricMeter);
                    const salesValue = litersDispensed * (reading.unitPrice || 100.00);
                    
                    updatedReadings[readingIndex] = {
                        ...reading,
                        litersDispensed: litersDispensed,
                        salesValue: salesValue
                    };
                }
            }
        }

        onChange({ pumpReadings: updatedReadings });
    };

    const getCurrentIsland = () => {
        return pumpsByIsland[activeIslandTab];
    };

    const getSelectedPump = () => {
        return getCurrentIsland()?.pumps.find(pump => pump.pumpId === selectedPumpId);
    };

    const getPumpCompletionStatus = (islandId) => {
        const islandPumps = pumpsByIsland[islandId]?.pumps || [];
        const completedPumps = islandPumps.filter(pump => pump.isCompleted).length;
        return { completed: completedPumps, total: islandPumps.length };
    };

    const calculateTotalSales = () => {
        return pumpReadings.reduce((total, reading) => total + (reading.salesValue || 0), 0);
    };

    const calculateTotalLiters = () => {
        return pumpReadings.reduce((total, reading) => total + (reading.litersDispensed || 0), 0);
    };

    // Calculate total expected collections across all islands
    const calculateTotalExpectedCollections = () => {
        return Object.values(calculateIslandCollections).reduce((total, island) => 
            total + (island.totalExpected || 0), 0
        );
    };

    const handleNextPump = () => {
        const currentIslandPumps = getCurrentIsland()?.pumps || [];
        const currentIndex = currentIslandPumps.findIndex(pump => pump.pumpId === selectedPumpId);
        
        if (currentIndex < currentIslandPumps.length - 1) {
            // Next pump in same island
            setSelectedPumpId(currentIslandPumps[currentIndex + 1].pumpId);
        } else {
            // Move to next island or loop back
            const islandIds = Object.keys(pumpsByIsland);
            const currentIslandIndex = islandIds.indexOf(activeIslandTab);
            
            if (currentIslandIndex < islandIds.length - 1) {
                const nextIslandId = islandIds[currentIslandIndex + 1];
                setActiveIslandTab(nextIslandId);
                const nextIslandPumps = pumpsByIsland[nextIslandId]?.pumps || [];
                if (nextIslandPumps.length > 0) {
                    setSelectedPumpId(nextIslandPumps[0].pumpId);
                }
            } else {
                // Loop back to first island, first pump
                const firstIslandId = islandIds[0];
                setActiveIslandTab(firstIslandId);
                const firstIslandPumps = pumpsByIsland[firstIslandId]?.pumps || [];
                if (firstIslandPumps.length > 0) {
                    setSelectedPumpId(firstIslandPumps[0].pumpId);
                }
            }
        }
    };

    if (!pumpsWithIslandInfo?.length) {
        return (
            <Alert variant="warning" className="text-sm">
                <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">No Pumps Available</p>
                        <p>There are no pumps assigned to this shift. Please contact your supervisor.</p>
                    </div>
                </div>
            </Alert>
        );
    }

    const selectedPump = getSelectedPump();
    const startReading = selectedPump?.meterReadings?.find(r => r.readingType === 'START');
    const closingReading = selectedPump?.closingReading || {};

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

            {/* Sales Summary */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                        <p className="text-blue-700 font-medium">Total Liters</p>
                        <p className="text-xl font-bold text-blue-900">{calculateTotalLiters().toFixed(1)}L</p>
                    </div>
                    <div className="text-center">
                        <p className="text-blue-700 font-medium">Actual Sales</p>
                        <p className="text-xl font-bold text-blue-900">KES {calculateTotalSales().toFixed(0)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-blue-700 font-medium">Expected Collections</p>
                        <p className="text-xl font-bold text-blue-900">KES {calculateTotalExpectedCollections().toFixed(0)}</p>
                    </div>
                </div>
            </div>

            {/* Two Panel Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Panel - Islands and Pumps */}
                <div className="lg:col-span-1">
                    <Card className="p-4">
                        {/* Islands Tabs */}
                        <Tabs value={activeIslandTab} onChange={setActiveIslandTab} size="sm">
                            {Object.entries(pumpsByIsland).map(([islandId, islandData]) => {
                                const status = getPumpCompletionStatus(islandId);
                                const islandCollection = calculateIslandCollections[islandId];
                                return (
                                    <Tab 
                                        key={islandId} 
                                        value={islandId}
                                        badge={status.completed > 0 ? `${status.completed}/${status.total}` : null}
                                    >
                                        <div className="flex items-center gap-1 text-xs">
                                            <span className="truncate max-w-20">
                                                {islandData.islandName || islandData.islandCode}
                                            </span>
                                            {status.completed === status.total && status.total > 0 && (
                                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        {islandCollection && (
                                            <div className="text-xs text-green-600 font-medium mt-1">
                                                KES {islandCollection.totalExpected.toFixed(0)}
                                            </div>
                                        )}
                                    </Tab>
                                );
                            })}
                        </Tabs>

                        {/* Pumps List */}
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-sm">
                                    {getCurrentIsland()?.islandName} Pumps
                                </h4>
                                <Badge variant="neutral" size="sm">
                                    {getCurrentIsland()?.pumps.length} pumps
                                </Badge>
                            </div>

                            {getCurrentIsland()?.pumps.map(pump => (
                                <div
                                    key={pump.pumpId}
                                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                        selectedPumpId === pump.pumpId
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    } ${
                                        pump.isCompleted ? 'bg-green-50 border-green-200' : ''
                                    }`}
                                    onClick={() => setSelectedPumpId(pump.pumpId)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Fuel className={`w-4 h-4 ${
                                                pump.isCompleted ? 'text-green-600' : 'text-gray-400'
                                            }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{pump.pumpName}</p>
                                                <p className="text-xs text-gray-600 truncate">
                                                    {pump.product?.name || 'Diesel'}
                                                </p>
                                                {pump.expectedData && (
                                                    <p className="text-xs text-green-600 font-medium">
                                                        Expected: KES {pump.expectedData.expectedCollection?.toFixed(0) || '0'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {pump.isCompleted && (
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            )}
                                            <ChevronRight className={`w-4 h-4 ${
                                                selectedPumpId === pump.pumpId ? 'text-blue-500' : 'text-gray-400'
                                            }`} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Right Panel - Pump Reading Form */}
                <div className="lg:col-span-2">
                    {selectedPump ? (
                        <Card className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg">{selectedPump.pumpName}</h3>
                                    <p className="text-gray-600 text-sm">
                                        {selectedPump.islandName} • {selectedPump.product?.name || 'Diesel'}
                                    </p>
                                </div>
                                <Badge 
                                    variant={selectedPump.isCompleted ? "success" : "warning"} 
                                    size="sm"
                                >
                                    {selectedPump.isCompleted ? "Completed" : "Pending"}
                                </Badge>
                            </div>

                            {/* Opening Readings Reference */}
                            {startReading && (
                                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                    <h4 className="font-semibold text-sm mb-3 text-gray-700">OPENING READINGS</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-600 mb-1">Electric Meter</p>
                                            <p className="text-xl font-bold text-gray-900">{startReading.electricMeter || 0}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-600 mb-1">Manual Meter</p>
                                            <p className="text-xl font-bold text-gray-900">{startReading.manualMeter || 0}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-600 mb-1">Cash Meter</p>
                                            <p className="text-xl font-bold text-gray-900">{startReading.cashMeter || 0}</p>
                                        </div>
                                    </div>
                                    {startReading.recordedAt && (
                                        <p className="text-xs text-gray-500 mt-2 text-center">
                                            Recorded: {new Date(startReading.recordedAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Expected Collection Display */}
                            {selectedPump.expectedData && (
                                <div className="bg-yellow-50 p-4 rounded-lg mb-4 border border-yellow-200">
                                    <h4 className="font-semibold text-sm mb-2 text-yellow-800">EXPECTED COLLECTION</h4>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-yellow-700 text-sm">
                                                Based on formula: (Electric + Manual Sales) ÷ 2 × Unit Price
                                            </p>
                                            <p className="text-yellow-700 text-sm">
                                                Unit Price: KES {selectedPump.expectedData.unitPrice || 100.00}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-yellow-600">Expected</p>
                                            <p className="text-xl font-bold text-yellow-800">
                                                KES {selectedPump.expectedData.expectedCollection?.toFixed(0) || '0'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Closing Readings Form */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-sm text-gray-700">CLOSING READINGS</h4>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <Input
                                        label="Electric Meter"
                                        type="number"
                                        value={closingReading.electricMeter || ''}
                                        onChange={(e) => 
                                            handlePumpReadingUpdate(selectedPump.pumpId, 'electricMeter', e.target.value)
                                        }
                                        placeholder="Enter END reading"
                                        required
                                        min={startReading?.electricMeter || 0}
                                        className="text-lg font-semibold"
                                    />
                                    
                                    <Input
                                        label="Manual Meter"
                                        type="number"
                                        value={closingReading.manualMeter || ''}
                                        onChange={(e) => 
                                            handlePumpReadingUpdate(selectedPump.pumpId, 'manualMeter', e.target.value)
                                        }
                                        placeholder="Enter END reading"
                                        min={startReading?.manualMeter || 0}
                                        className="text-lg font-semibold"
                                    />
                                    
                                    <Input
                                        label="Cash Meter"
                                        type="number"
                                        value={closingReading.cashMeter || ''}
                                        onChange={(e) => 
                                            handlePumpReadingUpdate(selectedPump.pumpId, 'cashMeter', e.target.value)
                                        }
                                        placeholder="Enter END reading"
                                        min={startReading?.cashMeter || 0}
                                        className="text-lg font-semibold"
                                    />
                                </div>

                                {/* Unit Price */}
                                <div className="max-w-xs">
                                    <Input
                                        label="Unit Price (KES)"
                                        type="number"
                                        step="0.01"
                                        value={closingReading.unitPrice || 100.00}
                                        onChange={(e) => 
                                            handlePumpReadingUpdate(selectedPump.pumpId, 'unitPrice', e.target.value)
                                        }
                                        placeholder="100.00"
                                        min="0"
                                    />
                                </div>

                                {/* Calculated Values */}
                                {(closingReading.litersDispensed > 0 || closingReading.salesValue > 0) && (
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                        <h5 className="font-semibold text-green-900 mb-3">CALCULATED VALUES</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center">
                                                <p className="text-green-700 font-medium">Liters Dispensed</p>
                                                <p className="text-2xl font-bold text-green-900">
                                                    {closingReading.litersDispensed.toFixed(1)}L
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-green-700 font-medium">Sales Value</p>
                                                <p className="text-2xl font-bold text-green-900">
                                                    KES {closingReading.salesValue.toFixed(0)}
                                                </p>
                                            </div>
                                        </div>
                                        {startReading && (
                                            <p className="text-green-700 text-sm mt-2 text-center">
                                                Electric meter change: {startReading.electricMeter} → {closingReading.electricMeter}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Next Pump Button */}
                                <div className="flex justify-end pt-4">
                                    <Button 
                                        onClick={handleNextPump}
                                        variant="primary"
                                        size="sm"
                                    >
                                        Next Pump <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card className="p-8 text-center">
                            <Fuel className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="font-semibold text-gray-700 mb-2">Select a Pump</h3>
                            <p className="text-gray-600 text-sm">
                                Choose a pump from the left panel to enter closing readings
                            </p>
                        </Card>
                    )}
                </div>
            </div>

            {/* Progress Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border">
                <h4 className="font-semibold text-sm mb-3 text-center">Progress Summary</h4>
                <div className="grid grid-cols-2 xs:grid-cols-4 gap-4 text-xs">
                    {Object.entries(pumpsByIsland).map(([islandId, islandData]) => {
                        const status = getPumpCompletionStatus(islandId);
                        const islandCollection = calculateIslandCollections[islandId];
                        return (
                            <div key={islandId} className="text-center">
                                <p className="font-semibold text-gray-700 truncate">
                                    {islandData.islandName}
                                </p>
                                <p className={`text-base font-bold ${
                                    status.completed === status.total ? 'text-green-600' : 'text-blue-600'
                                }`}>
                                    {status.completed}/{status.total}
                                </p>
                                <p className="text-gray-600">completed</p>
                                {islandCollection && (
                                    <p className="text-green-600 font-medium text-sm">
                                        KES {islandCollection.totalExpected.toFixed(0)}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default IslandPumpsStep;