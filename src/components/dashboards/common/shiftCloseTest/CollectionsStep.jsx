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
    <div className="space-y-6">
      <Alert variant="info">
        <div className="flex items-start gap-3">
          <Calculator className="w-5 h-5 mt-0.5" />
          <div>
            <h4 className="font-semibold mb-1">Record Island Collections</h4>
            <p className="text-sm">
              Enter actual collections for each island. Compare with expected amounts calculated from pump sales.
            </p>
          </div>
        </div>
      </Alert>

      <Card title="Island Collections" className="p-6">
        {/* Islands Tabs */}
        <Tabs value={activeIslandTab} onChange={setActiveIslandTab}>
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
                <div className="flex items-center gap-2">
                  {assignment.island.name}
                  {isCompleted && varianceStatus === 'exact' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {isCompleted && varianceStatus !== 'exact' && (
                    varianceStatus === 'over' ? 
                      <TrendingUp className="w-4 h-4 text-orange-500" /> :
                      <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* Island Collection Content */}
        {getCurrentIsland() && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-semibold text-lg">
                  {getCurrentIsland().island.name} Collections
                </h4>
                <p className="text-sm text-gray-600">
                  Attendant: {getCurrentIsland().attendant.firstName} {getCurrentIsland().attendant.lastName}
                </p>
              </div>
              
              <Badge variant={
                getIslandCompletionStatus(getCurrentIsland().islandId) ? "success" : "warning"
              }>
                {getIslandCompletionStatus(getCurrentIsland().islandId) ? "Recorded" : "Pending"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Expected Amount & Sales Breakdown */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h5 className="font-medium mb-3 text-blue-900 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Expected Collection
                  </h5>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Fuel Sales:</span>
                      <span className="font-semibold text-blue-900">
                        KES {getCurrentIslandCollection().expectedAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-600">Pumps in Island:</span>
                      <span className="text-blue-800">
                        {pumpReadings.filter(p => {
                          const pump = shiftData.meterReadings.find(mr => mr.pumpId === p.pumpId);
                          return pump?.pump?.islandId === getCurrentIsland().islandId;
                        }).length}
                      </span>
                    </div>

                    {/* Pump Sales Breakdown */}
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <h6 className="font-medium text-blue-900 mb-2 text-sm">Pump Sales Breakdown:</h6>
                      {pumpReadings
                        .filter(p => {
                          const pump = shiftData.meterReadings.find(mr => mr.pumpId === p.pumpId);
                          return pump?.pump?.islandId === getCurrentIsland().islandId;
                        })
                        .map(pump => {
                          const pumpData = shiftData.meterReadings.find(mr => mr.pumpId === pump.pumpId);
                          return (
                            <div key={pump.pumpId} className="flex justify-between items-center text-xs mb-1">
                              <span className="text-blue-600">{pumpData?.pump?.asset.name}:</span>
                              <span className="text-blue-800">KES {(pump.salesValue || 0).toFixed(2)}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Variance Display */}
                {getCurrentIslandCollection().expectedAmount > 0 && 
                 closingCalculations.calculateTotalCollected(getCurrentIslandCollection()) > 0 && (
                  <div className={`p-4 rounded-lg border ${
                    getVarianceStatus(
                      getCurrentIslandCollection().expectedAmount,
                      closingCalculations.calculateTotalCollected(getCurrentIslandCollection())
                    ) === 'exact' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-orange-50 border-orange-200'
                  }`}>
                    <h5 className="font-medium mb-2 flex items-center gap-2">
                      {getVarianceStatus(
                        getCurrentIslandCollection().expectedAmount,
                        closingCalculations.calculateTotalCollected(getCurrentIslandCollection())
                      ) === 'exact' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : getVarianceStatus(
                        getCurrentIslandCollection().expectedAmount,
                        closingCalculations.calculateTotalCollected(getCurrentIslandCollection())
                      ) === 'over' ? (
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      Collection Variance
                    </h5>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Expected:</span>
                        <span className="font-semibold">
                          KES {getCurrentIslandCollection().expectedAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Actual:</span>
                        <span className="font-semibold">
                          KES {closingCalculations.calculateTotalCollected(getCurrentIslandCollection()).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span>Variance:</span>
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
                            getCurrentIslandCollection().expectedAmount
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Collection Inputs */}
              <div>
                <h5 className="font-medium mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Actual Collections
                </h5>

                <div className="space-y-4">
                  <Input
                    label="Cash Amount"
                    type="number"
                    value={getCurrentIslandCollection().cashAmount || ''}
                    onChange={(e) => 
                      handleCollectionUpdate(getCurrentIsland().islandId, 'cashAmount', e.target.value)
                    }
                    placeholder="0.00"
                  />
                  
                  <Input
                    label="Mobile Money"
                    type="number"
                    value={getCurrentIslandCollection().mobileMoneyAmount || ''}
                    onChange={(e) => 
                      handleCollectionUpdate(getCurrentIsland().islandId, 'mobileMoneyAmount', e.target.value)
                    }
                    placeholder="0.00"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Visa Card"
                      type="number"
                      value={getCurrentIslandCollection().visaAmount || ''}
                      onChange={(e) => 
                        handleCollectionUpdate(getCurrentIsland().islandId, 'visaAmount', e.target.value)
                      }
                      placeholder="0.00"
                    />
                    
                    <Input
                      label="MasterCard"
                      type="number"
                      value={getCurrentIslandCollection().mastercardAmount || ''}
                      onChange={(e) => 
                        handleCollectionUpdate(getCurrentIsland().islandId, 'mastercardAmount', e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Debt Amount"
                      type="number"
                      value={getCurrentIslandCollection().debtAmount || ''}
                      onChange={(e) => 
                        handleCollectionUpdate(getCurrentIsland().islandId, 'debtAmount', e.target.value)
                      }
                      placeholder="0.00"
                    />
                    
                    <Input
                      label="Other Amount"
                      type="number"
                      value={getCurrentIslandCollection().otherAmount || ''}
                      onChange={(e) => 
                        handleCollectionUpdate(getCurrentIsland().islandId, 'otherAmount', e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>

                  {/* Total Collected Display */}
                  {closingCalculations.calculateTotalCollected(getCurrentIslandCollection()) > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Collected:</span>
                        <span className="text-lg font-bold text-green-600">
                          KES {closingCalculations.calculateTotalCollected(getCurrentIslandCollection()).toFixed(2)}
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

      {/* Progress Summary */}
      <Card title="Collection Progress" className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {shiftIslandAttedant.map(assignment => {
            const collection = islandCollections.find(col => col.islandId === assignment.islandId);
            const expected = collection?.expectedAmount || 0;
            const actual = collection ? closingCalculations.calculateTotalCollected(collection) : 0;
            const varianceStatus = getVarianceStatus(expected, actual);
            const isCompleted = getIslandCompletionStatus(assignment.islandId);

            return (
              <div key={assignment.islandId} className="text-center p-3 border rounded-lg">
                <p className="font-semibold text-gray-700 mb-2">{assignment.island.name}</p>
                
                {isCompleted ? (
                  <>
                    <div className={`text-lg font-bold mb-1 ${
                      varianceStatus === 'exact' ? 'text-green-600' :
                      varianceStatus === 'over' ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      KES {actual.toFixed(0)}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs">
                      {varianceStatus === 'exact' && <CheckCircle className="w-3 h-3 text-green-500" />}
                      {varianceStatus === 'over' && <TrendingUp className="w-3 h-3 text-orange-500" />}
                      {varianceStatus === 'under' && <TrendingDown className="w-3 h-3 text-red-500" />}
                      <span className={
                        varianceStatus === 'exact' ? 'text-green-600' :
                        varianceStatus === 'over' ? 'text-orange-600' : 'text-red-600'
                      }>
                        {varianceStatus === 'exact' ? 'Exact' : 
                         varianceStatus === 'over' ? 'Over' : 'Under'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-orange-600 text-sm">Pending</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default CollectionsStep;