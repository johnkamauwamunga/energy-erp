import React, { useState, useEffect } from 'react';
import { Card, Tabs, Tab, Input, Badge, Alert, Progress } from '../../../ui';
import { DollarSign, Package, Calculator, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { closingCalculations } from './dummyDataForClosing';

const CollectionsStep = ({ shiftData, closingData, onChange }) => {
  const [activeIslandTab, setActiveIslandTab] = useState('');
  const { shiftIslandAttedant } = shiftData;
  const { pumpReadings, islandCollections } = closingData;

  // Calculate expected amounts when pump readings change
  useEffect(() => {
    const updatedCollections = islandCollections.map(collection => {
      const expectedAmount = closingCalculations.calculateExpectedCollection(
        collection.islandId,
        pumpReadings,
        closingData.nonFuelStocks
      );
      
      return {
        ...collection,
        expectedAmount
      };
    });

    onChange({ islandCollections: updatedCollections });
  }, [pumpReadings, closingData.nonFuelStocks]);

  // Set first island as active tab
  React.useEffect(() => {
    if (shiftIslandAttedant.length > 0 && !activeIslandTab) {
      setActiveIslandTab(shiftIslandAttedant[0].islandId);
    }
  }, [shiftIslandAttedant, activeIslandTab]);

  const handleCollectionUpdate = (islandId, field, value) => {
    const numericValue = parseFloat(value) || 0;
    const updatedCollections = islandCollections.map(collection =>
      collection.islandId === islandId
        ? { ...collection, [field]: numericValue }
        : collection
    );

    onChange({ islandCollections: updatedCollections });
  };

  const getCurrentIsland = () => {
    return shiftIslandAttedant.find(assignment => assignment.islandId === activeIslandTab);
  };

  const getCurrentIslandCollection = () => {
    return islandCollections.find(collection => collection.islandId === activeIslandTab) || {};
  };

  const getIslandCompletionStatus = (islandId) => {
    const collection = islandCollections.find(col => col.islandId === islandId);
    if (!collection) return false;
    
    const totalCollected = closingCalculations.calculateTotalCollected(collection);
    return totalCollected > 0;
  };

  const getVarianceStatus = (expected, actual) => {
    const variance = actual - expected;
    const variancePercent = expected > 0 ? (variance / expected) * 100 : 0;
    
    if (Math.abs(variancePercent) <= 1) return 'exact'; // Within 1%
    if (variancePercent > 0) return 'over'; // Over collection
    return 'under'; // Under collection
  };

  const getIslandPumpsSales = (islandId) => {
    const islandPumps = pumpReadings.filter(reading => {
      const pump = shiftData.meterReadings.find(mr => mr.pumpId === reading.pumpId);
      return pump?.pump?.islandId === islandId;
    });
    
    return islandPumps.reduce((total, pump) => total + (pump.salesValue || 0), 0);
  };

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

      <Card className="p-4">
        {/* Compact Islands Tabs */}
        <Tabs value={activeIslandTab} onChange={setActiveIslandTab} size="sm">
          {shiftIslandAttedant.map(assignment => {
            const isCompleted = getIslandCompletionStatus(assignment.islandId);
            const collection = islandCollections.find(col => col.islandId === assignment.islandId);
            const expected = collection?.expectedAmount || 0;
            const actual = collection ? closingCalculations.calculateTotalCollected(collection) : 0;
            const varianceStatus = getVarianceStatus(expected, actual);

            return (
              <Tab 
                key={assignment.islandId} 
                value={assignment.islandId}
                badge={isCompleted ? '✓' : null}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span className="truncate max-w-20">{assignment.island.name}</span>
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

        {/* Island Collection Content */}
        {getCurrentIsland() && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">
                  {getCurrentIsland().island.name} Collections
                </h4>
                <p className="text-gray-600 text-xs truncate">
                  {getCurrentIsland().attendant.firstName}
                </p>
              </div>
              
              <Badge variant={
                getIslandCompletionStatus(getCurrentIsland().islandId) ? "success" : "warning"
              } size="sm">
                {getIslandCompletionStatus(getCurrentIsland().islandId) ? "✓" : "Pending"}
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
                        KES {(getCurrentIslandCollection().expectedAmount || 0).toFixed(0)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600">Pumps:</span>
                      <span className="text-blue-800">
                        {pumpReadings.filter(p => {
                          const pump = shiftData.meterReadings.find(mr => mr.pumpId === p.pumpId);
                          return pump?.pump?.islandId === getCurrentIsland().islandId;
                        }).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Variance Display */}
                {getCurrentIslandCollection().expectedAmount > 0 && 
                 closingCalculations.calculateTotalCollected(getCurrentIslandCollection()) > 0 && (
                  <div className={`p-3 rounded border text-xs ${
                    getVarianceStatus(
                      getCurrentIslandCollection().expectedAmount,
                      closingCalculations.calculateTotalCollected(getCurrentIslandCollection())
                    ) === 'exact' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-orange-50 border-orange-200'
                  }`}>
                    <h5 className="font-medium mb-2 flex items-center gap-1">
                      {getVarianceStatus(
                        getCurrentIslandCollection().expectedAmount,
                        closingCalculations.calculateTotalCollected(getCurrentIslandCollection())
                      ) === 'exact' ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : getVarianceStatus(
                        getCurrentIslandCollection().expectedAmount,
                        closingCalculations.calculateTotalCollected(getCurrentIslandCollection())
                      ) === 'over' ? (
                        <TrendingUp className="w-3 h-3 text-orange-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                      Variance
                    </h5>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Expected:</span>
                        <span className="font-semibold">
                          KES {(getCurrentIslandCollection().expectedAmount || 0).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Actual:</span>
                        <span className="font-semibold">
                          KES {closingCalculations.calculateTotalCollected(getCurrentIslandCollection()).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t">
                        <span>Difference:</span>
                        <span className={`font-semibold ${
                          getVarianceStatus(
                            getCurrentIslandCollection().expectedAmount,
                            closingCalculations.calculateTotalCollected(getCurrentIslandCollection())
                          ) === 'exact' ? 'text-green-600' : 
                          getVarianceStatus(
                            getCurrentIslandCollection().expectedAmount,
                            closingCalculations.calculateTotalCollected(getCurrentIslandCollection())
                          ) === 'over' ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          KES {(
                            closingCalculations.calculateTotalCollected(getCurrentIslandCollection()) - 
                            (getCurrentIslandCollection().expectedAmount || 0)
                          ).toFixed(0)}
                        </span>
                      </div>
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
                        handleCollectionUpdate(getCurrentIsland().islandId, 'cashAmount', e.target.value)
                      }
                      placeholder="0"
                    />
                    
                    <Input
                      label="Mobile Money"
                      type="number"
                      size="sm"
                      value={getCurrentIslandCollection().mobileMoneyAmount || ''}
                      onChange={(e) => 
                        handleCollectionUpdate(getCurrentIsland().islandId, 'mobileMoneyAmount', e.target.value)
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
                        handleCollectionUpdate(getCurrentIsland().islandId, 'visaAmount', e.target.value)
                      }
                      placeholder="0"
                    />
                    
                    <Input
                      label="MasterCard"
                      type="number"
                      size="sm"
                      value={getCurrentIslandCollection().mastercardAmount || ''}
                      onChange={(e) => 
                        handleCollectionUpdate(getCurrentIsland().islandId, 'mastercardAmount', e.target.value)
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
                        handleCollectionUpdate(getCurrentIsland().islandId, 'debtAmount', e.target.value)
                      }
                      placeholder="0"
                    />
                    
                    <Input
                      label="Other"
                      type="number"
                      size="sm"
                      value={getCurrentIslandCollection().otherAmount || ''}
                      onChange={(e) => 
                        handleCollectionUpdate(getCurrentIsland().islandId, 'otherAmount', e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>

                  {/* Total Collected Display */}
                  {closingCalculations.calculateTotalCollected(getCurrentIslandCollection()) > 0 && (
                    <div className="bg-gray-50 p-2 rounded text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total:</span>
                        <span className="font-bold text-green-600">
                          KES {closingCalculations.calculateTotalCollected(getCurrentIslandCollection()).toFixed(0)}
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
      <div className="bg-gray-50 rounded-lg p-3 border">
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 text-xs">
          {shiftIslandAttedant.map(assignment => {
            const collection = islandCollections.find(col => col.islandId === assignment.islandId);
            const expected = collection?.expectedAmount || 0;
            const actual = collection ? closingCalculations.calculateTotalCollected(collection) : 0;
            const varianceStatus = getVarianceStatus(expected, actual);
            const isCompleted = getIslandCompletionStatus(assignment.islandId);

            return (
              <div key={assignment.islandId} className="text-center">
                <p className="font-semibold text-gray-700 truncate mb-1">{assignment.island.name}</p>
                
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
                         varianceStatus === 'over' ? '+' : '-'}
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
    </div>
  );
};

export default CollectionsStep;