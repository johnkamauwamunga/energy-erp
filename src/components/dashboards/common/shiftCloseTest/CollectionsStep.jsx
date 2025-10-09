// components/CollectionsStep.js
import React, { useState, useEffect } from 'react';
import { Card, Tabs, Tab, Input, Badge, Alert } from '../../../ui';
import { DollarSign, Calculator, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';

const CollectionsStep = ({ closingData, onChange }) => {
    const [activeIslandTab, setActiveIslandTab] = useState('');
    const { islandCollections } = closingData;

    // Set first island as active tab
    useEffect(() => {
        if (islandCollections && Object.keys(islandCollections).length > 0 && !activeIslandTab) {
            const firstIslandId = Object.keys(islandCollections)[0];
            setActiveIslandTab(firstIslandId);
        }
    }, [islandCollections, activeIslandTab]);

    // Calculate total collected for an island
    const calculateTotalCollected = (collection) => {
        if (!collection) return 0;
        
        return (
            (collection.cashAmount || 0) +
            (collection.mobileMoneyAmount || 0) +
            (collection.visaAmount || 0) +
            (collection.mastercardAmount || 0) +
            (collection.debtAmount || 0) +
            (collection.otherAmount || 0)
        );
    };

    // Calculate expected amount for an island (from pump sales)
    const calculateExpectedAmount = (islandId) => {
        const collection = islandCollections?.[islandId];
        return collection?.totalExpected || 0;
    };

    // Determine variance status with 4 KSH tolerance
    const getVarianceStatus = (expected, actual) => {
        const variance = Math.abs(actual - expected);
        
        if (variance <= 4) return 'exact'; // Within 4 KSH tolerance
        if (actual > expected) return 'over'; // Surplus
        return 'under'; // Shortage
    };

    // Get variance amount and percentage
    const getVarianceDetails = (expected, actual) => {
        const varianceAmount = actual - expected;
        const variancePercent = expected > 0 ? (Math.abs(varianceAmount) / expected) * 100 : 0;
        
        return {
            amount: Math.abs(varianceAmount),
            percent: variancePercent,
            isOver: varianceAmount > 0
        };
    };

    const handleCollectionUpdate = (islandId, field, value) => {
        const numericValue = parseFloat(value) || 0;
        
        const updatedCollections = {
            ...islandCollections,
            [islandId]: {
                ...islandCollections[islandId],
                [field]: numericValue
            }
        };

        onChange({ islandCollections: updatedCollections });
    };

    const getCurrentIslandCollection = () => {
        return islandCollections?.[activeIslandTab] || {};
    };

    const getIslandCompletionStatus = (islandId) => {
        const collection = islandCollections?.[islandId];
        if (!collection) return false;
        
        const totalCollected = calculateTotalCollected(collection);
        return totalCollected > 0;
    };

    // Calculate totals across all islands
    const calculateGrandTotals = () => {
        let totalExpected = 0;
        let totalCollected = 0;

        if (islandCollections) {
            Object.values(islandCollections).forEach(collection => {
                totalExpected += collection.totalExpected || 0;
                totalCollected += calculateTotalCollected(collection);
            });
        }

        return { totalExpected, totalCollected };
    };

    const { totalExpected, totalCollected } = calculateGrandTotals();
    const grandVariance = getVarianceStatus(totalExpected, totalCollected);
    const grandVarianceDetails = getVarianceDetails(totalExpected, totalCollected);

    return (
        <div className="space-y-4">
            {/* Compact Alert */}
            <Alert variant="info" className="text-sm" size="sm">
                <div className="flex items-start gap-2">
                    <Calculator className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Record Island Collections</p>
                        <p>Enter actual collections. Compare with expected amounts from pump sales.</p>
                    </div>
                </div>
            </Alert>

            {/* Grand Total Summary */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                        <p className="text-blue-700 font-medium">Total Expected</p>
                        <p className="text-xl font-bold text-blue-900">KES {totalExpected.toFixed(0)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-blue-700 font-medium">Total Collected</p>
                        <p className="text-xl font-bold text-blue-900">KES {totalCollected.toFixed(0)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-blue-700 font-medium">Variance</p>
                        <p className={`text-xl font-bold ${
                            grandVariance === 'exact' ? 'text-green-600' :
                            grandVariance === 'over' ? 'text-orange-600' : 'text-red-600'
                        }`}>
                            {grandVariance === 'exact' ? '✓ Exact' : 
                             grandVariance === 'over' ? `+${grandVarianceDetails.amount.toFixed(0)}` : 
                             `-${grandVarianceDetails.amount.toFixed(0)}`}
                        </p>
                        {grandVariance !== 'exact' && (
                            <p className="text-xs text-gray-600">
                                ({grandVarianceDetails.percent.toFixed(1)}% {grandVariance === 'over' ? 'surplus' : 'shortage'})
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <Card className="p-4">
                {/* Compact Islands Tabs */}
                {islandCollections && Object.keys(islandCollections).length > 0 ? (
                    <Tabs value={activeIslandTab} onChange={setActiveIslandTab} size="sm">
                        {Object.entries(islandCollections).map(([islandId, collection]) => {
                            const isCompleted = getIslandCompletionStatus(islandId);
                            const expected = calculateExpectedAmount(islandId);
                            const actual = calculateTotalCollected(collection);
                            const varianceStatus = getVarianceStatus(expected, actual);

                            return (
                                <Tab 
                                    key={islandId} 
                                    value={islandId}
                                    badge={isCompleted ? '✓' : null}
                                >
                                    <div className="flex items-center gap-1 text-xs">
                                        <span className="truncate max-w-20">{collection.islandName}</span>
                                        {isCompleted && varianceStatus === 'exact' && (
                                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                        )}
                                        {isCompleted && varianceStatus !== 'exact' && (
                                            varianceStatus === 'over' ? 
                                                <TrendingUp className="w-3 h-3 text-orange-500 flex-shrink-0" /> :
                                                <TrendingDown className="w-3 h-3 text-red-500 flex-shrink-0" />
                                        )}
                                    </div>
                                </Tab>
                            );
                        })}
                    </Tabs>
                ) : (
                    <div className="text-center py-4 text-gray-500">
                        No island collections data available
                    </div>
                )}

                {/* Island Collection Content */}
                {activeIslandTab && islandCollections?.[activeIslandTab] && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">
                                    {islandCollections[activeIslandTab].islandName} Collections
                                </h4>
                                <p className="text-gray-600 text-xs">
                                    Island Code: {islandCollections[activeIslandTab].islandCode}
                                </p>
                            </div>
                            
                            <Badge variant={
                                getIslandCompletionStatus(activeIslandTab) ? "success" : "warning"
                            } size="sm">
                                {getIslandCompletionStatus(activeIslandTab) ? "✓" : "Pending"}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Left Column: Expected Amount & Sales Breakdown */}
                            <div className="space-y-3">
                                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                    <h5 className="font-medium mb-2 text-blue-900 text-sm flex items-center gap-1">
                                        <Calculator className="w-3 h-3" />
                                        Expected Collection
                                    </h5>
                                    
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="text-blue-700">Fuel Sales:</span>
                                            <span className="font-semibold text-blue-900">
                                                KES {(islandCollections[activeIslandTab].totalExpected || 0).toFixed(0)}
                                            </span>
                                        </div>
                                        
                                        {/* Pump Breakdown */}
                                        {islandCollections[activeIslandTab].pumpCollections?.map(pump => (
                                            <div key={pump.pumpId} className="flex justify-between items-center text-blue-600">
                                                <span className="text-xs">{pump.pumpName}:</span>
                                                <span className="text-xs font-medium">
                                                    KES {pump.expectedCollection?.toFixed(0) || '0'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Variance Display */}
                                {islandCollections[activeIslandTab].totalExpected > 0 && 
                                 calculateTotalCollected(islandCollections[activeIslandTab]) > 0 && (
                                    <div className={`p-3 rounded border text-xs ${
                                        getVarianceStatus(
                                            islandCollections[activeIslandTab].totalExpected,
                                            calculateTotalCollected(islandCollections[activeIslandTab])
                                        ) === 'exact' 
                                            ? 'bg-green-50 border-green-200' 
                                            : getVarianceStatus(
                                                islandCollections[activeIslandTab].totalExpected,
                                                calculateTotalCollected(islandCollections[activeIslandTab])
                                            ) === 'over'
                                            ? 'bg-orange-50 border-orange-200'
                                            : 'bg-red-50 border-red-200'
                                    }`}>
                                        <h5 className="font-medium mb-2 flex items-center gap-1">
                                            {getVarianceStatus(
                                                islandCollections[activeIslandTab].totalExpected,
                                                calculateTotalCollected(islandCollections[activeIslandTab])
                                            ) === 'exact' ? (
                                                <CheckCircle className="w-3 h-3 text-green-600" />
                                            ) : getVarianceStatus(
                                                islandCollections[activeIslandTab].totalExpected,
                                                calculateTotalCollected(islandCollections[activeIslandTab])
                                            ) === 'over' ? (
                                                <TrendingUp className="w-3 h-3 text-orange-600" />
                                            ) : (
                                                <TrendingDown className="w-3 h-3 text-red-600" />
                                            )}
                                            Variance Analysis
                                        </h5>
                                        
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span>Expected:</span>
                                                <span className="font-semibold">
                                                    KES {(islandCollections[activeIslandTab].totalExpected || 0).toFixed(0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Actual:</span>
                                                <span className="font-semibold">
                                                    KES {calculateTotalCollected(islandCollections[activeIslandTab]).toFixed(0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between pt-1 border-t">
                                                <span>Difference:</span>
                                                <span className={`font-semibold ${
                                                    getVarianceStatus(
                                                        islandCollections[activeIslandTab].totalExpected,
                                                        calculateTotalCollected(islandCollections[activeIslandTab])
                                                    ) === 'exact' ? 'text-green-600' : 
                                                    getVarianceStatus(
                                                        islandCollections[activeIslandTab].totalExpected,
                                                        calculateTotalCollected(islandCollections[activeIslandTab])
                                                    ) === 'over' ? 'text-orange-600' : 'text-red-600'
                                                }`}>
                                                    {getVarianceStatus(
                                                        islandCollections[activeIslandTab].totalExpected,
                                                        calculateTotalCollected(islandCollections[activeIslandTab])
                                                    ) === 'over' ? '+' : '-'}
                                                    KES {getVarianceDetails(
                                                        islandCollections[activeIslandTab].totalExpected,
                                                        calculateTotalCollected(islandCollections[activeIslandTab])
                                                    ).amount.toFixed(0)}
                                                </span>
                                            </div>
                                            {getVarianceStatus(
                                                islandCollections[activeIslandTab].totalExpected,
                                                calculateTotalCollected(islandCollections[activeIslandTab])
                                            ) !== 'exact' && (
                                                <div className="flex justify-between text-xs">
                                                    <span>Status:</span>
                                                    <span className={
                                                        getVarianceStatus(
                                                            islandCollections[activeIslandTab].totalExpected,
                                                            calculateTotalCollected(islandCollections[activeIslandTab])
                                                        ) === 'over' ? 'text-orange-600' : 'text-red-600'
                                                    }>
                                                        {getVarianceStatus(
                                                            islandCollections[activeIslandTab].totalExpected,
                                                            calculateTotalCollected(islandCollections[activeIslandTab])
                                                        ) === 'over' ? 'SURPLUS' : 'SHORTAGE'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Collection Inputs */}
                            <div>
                                <h5 className="font-medium mb-3 text-sm flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    Actual Collections
                                </h5>

                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            label="Cash"
                                            type="number"
                                            size="sm"
                                            value={getCurrentIslandCollection().cashAmount || ''}
                                            onChange={(e) => 
                                                handleCollectionUpdate(activeIslandTab, 'cashAmount', e.target.value)
                                            }
                                            placeholder="0"
                                        />
                                        
                                        <Input
                                            label="Mobile Money"
                                            type="number"
                                            size="sm"
                                            value={getCurrentIslandCollection().mobileMoneyAmount || ''}
                                            onChange={(e) => 
                                                handleCollectionUpdate(activeIslandTab, 'mobileMoneyAmount', e.target.value)
                                            }
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            label="Visa"
                                            type="number"
                                            size="sm"
                                            value={getCurrentIslandCollection().visaAmount || ''}
                                            onChange={(e) => 
                                                handleCollectionUpdate(activeIslandTab, 'visaAmount', e.target.value)
                                            }
                                            placeholder="0"
                                        />
                                        
                                        <Input
                                            label="MasterCard"
                                            type="number"
                                            size="sm"
                                            value={getCurrentIslandCollection().mastercardAmount || ''}
                                            onChange={(e) => 
                                                handleCollectionUpdate(activeIslandTab, 'mastercardAmount', e.target.value)
                                            }
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            label="Debt"
                                            type="number"
                                            size="sm"
                                            value={getCurrentIslandCollection().debtAmount || ''}
                                            onChange={(e) => 
                                                handleCollectionUpdate(activeIslandTab, 'debtAmount', e.target.value)
                                            }
                                            placeholder="0"
                                        />
                                        
                                        <Input
                                            label="Other"
                                            type="number"
                                            size="sm"
                                            value={getCurrentIslandCollection().otherAmount || ''}
                                            onChange={(e) => 
                                                handleCollectionUpdate(activeIslandTab, 'otherAmount', e.target.value)
                                            }
                                            placeholder="0"
                                        />
                                    </div>

                                    {/* Total Collected Display */}
                                    {calculateTotalCollected(getCurrentIslandCollection()) > 0 && (
                                        <div className="bg-gray-50 p-2 rounded text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">Total Collected:</span>
                                                <span className="font-bold text-green-600">
                                                    KES {calculateTotalCollected(getCurrentIslandCollection()).toFixed(0)}
                                                </span>
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
            {islandCollections && Object.keys(islandCollections).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border">
                    <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 text-xs">
                        {Object.entries(islandCollections).map(([islandId, collection]) => {
                            const expected = calculateExpectedAmount(islandId);
                            const actual = calculateTotalCollected(collection);
                            const varianceStatus = getVarianceStatus(expected, actual);
                            const isCompleted = getIslandCompletionStatus(islandId);
                            const varianceDetails = getVarianceDetails(expected, actual);

                            return (
                                <div key={islandId} className="text-center">
                                    <p className="font-semibold text-gray-700 truncate mb-1">{collection.islandName}</p>
                                    
                                    {isCompleted ? (
                                        <>
                                            <div className={`text-base font-bold mb-1 ${
                                                varianceStatus === 'exact' ? 'text-green-600' :
                                                varianceStatus === 'over' ? 'text-orange-600' : 'text-red-600'
                                            }`}>
                                                KES {actual.toFixed(0)}
                                            </div>
                                            <div className="flex items-center justify-center gap-1">
                                                {varianceStatus === 'exact' && <CheckCircle className="w-2 h-2 text-green-500" />}
                                                {varianceStatus === 'over' && <TrendingUp className="w-2 h-2 text-orange-500" />}
                                                {varianceStatus === 'under' && <TrendingDown className="w-2 h-2 text-red-500" />}
                                                <span className={
                                                    varianceStatus === 'exact' ? 'text-green-600' :
                                                    varianceStatus === 'over' ? 'text-orange-600' : 'text-red-600'
                                                }>
                                                    {varianceStatus === 'exact' ? '✓' : 
                                                     varianceStatus === 'over' ? `+${varianceDetails.amount.toFixed(0)}` : 
                                                     `-${varianceDetails.amount.toFixed(0)}`}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-orange-600">Pending</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CollectionsStep;