import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Input, Select, Badge, Progress } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { ChevronLeft, ChevronRight, Droplets, Package, CheckCircle } from 'lucide-react';

const ShiftCloseReconciliation = ({ shift, onClose }) => {
  const { state, dispatch } = useApp();
  const [currentStep, setCurrentStep] = useState(1); // 1: Select island, 2: Select pump, 3: Record readings
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [selectedPump, setSelectedPump] = useState(null);
  const [closingData, setClosingData] = useState({
    pumps: {},
    nonFuelItems: {}
  });
  const [completedItems, setCompletedItems] = useState({
    pumps: [],
    nonFuelItems: []
  });

  // Get shift islands
  const shiftIslands = [...new Set(shift.attendants?.map(a => a.islandId))].map(islandId => 
    state.islands.find(i => i.id === islandId)
  ).filter(Boolean);

  // Get pumps for selected island
  const islandPumps = selectedIsland ? 
    state.assets.pumps.filter(pump => pump.islandId === selectedIsland.id) : [];

  // Get non-fuel items for selected island
  const islandNonFuelItems = selectedIsland ? 
    (shift.nonFuelStocks?.filter(item => item.islandId === selectedIsland.id) || []) : [];

  // Calculate progress
  const calculateProgress = () => {
    const totalItems = shiftIslands.reduce((total, island) => {
      const islandPumps = state.assets.pumps.filter(p => p.islandId === island.id);
      const islandNonFuelItems = shift.nonFuelStocks?.filter(item => item.islandId === island.id) || [];
      return total + islandPumps.length + islandNonFuelItems.length;
    }, 0);

    const completedCount = completedItems.pumps.length + completedItems.nonFuelItems.length;
    return totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  };

  // Initialize closing data when island is selected
  useEffect(() => {
    if (selectedIsland) {
      const initialData = { ...closingData };
      
      // Initialize pump data
      islandPumps.forEach(pump => {
        if (!initialData.pumps[pump.id]) {
          initialData.pumps[pump.id] = {
            electric: '',
            manual: '',
            cash: ''
          };
        }
      });
      
      // Initialize non-fuel item data
      islandNonFuelItems.forEach(item => {
        if (!initialData.nonFuelItems[item.productId]) {
          initialData.nonFuelItems[item.productId] = {
            closingStock: ''
          };
        }
      });
      
      setClosingData(initialData);
    }
  }, [selectedIsland]);

  // Handle pump reading change
  const handlePumpReadingChange = (pumpId, meterType, value) => {
    setClosingData(prev => ({
      ...prev,
      pumps: {
        ...prev.pumps,
        [pumpId]: {
          ...prev.pumps[pumpId],
          [meterType]: value
        }
      }
    }));
  };

  // Handle non-fuel item change
  const handleNonFuelItemChange = (itemId, value) => {
    setClosingData(prev => ({
      ...prev,
      nonFuelItems: {
        ...prev.nonFuelItems,
        [itemId]: {
          closingStock: value
        }
      }
    }));
  };

  // Complete pump reconciliation
  const completePumpReconciliation = () => {
    setCompletedItems(prev => ({
      ...prev,
      pumps: [...prev.pumps, selectedPump.id]
    }));
    
    // Check if all pumps on this island are completed
    const allPumpsCompleted = islandPumps.every(pump => 
      completedItems.pumps.includes(pump.id) || pump.id === selectedPump.id
    );
    
    if (allPumpsCompleted && islandNonFuelItems.length === 0) {
      // Move back to island selection if no non-fuel items
      setCurrentStep(1);
      setSelectedPump(null);
      setSelectedIsland(null);
    } else if (allPumpsCompleted) {
      // Move to non-fuel items if all pumps are done
      setCurrentStep(3);
      setSelectedPump(null);
    } else {
      // Stay on pump selection
      setCurrentStep(2);
      setSelectedPump(null);
    }
  };

  // Complete non-fuel item reconciliation
  const completeNonFuelReconciliation = () => {
    // Check if all non-fuel items are completed
    const allItemsCompleted = islandNonFuelItems.every(item => 
      completedItems.nonFuelItems.includes(item.productId) || 
      closingData.nonFuelItems[item.productId]?.closingStock !== ''
    );
    
    if (allItemsCompleted) {
      // Mark all items as completed
      const newlyCompletedItems = islandNonFuelItems
        .filter(item => !completedItems.nonFuelItems.includes(item.productId))
        .map(item => item.productId);
      
      setCompletedItems(prev => ({
        ...prev,
        nonFuelItems: [...prev.nonFuelItems, ...newlyCompletedItems]
      }));
      
      // Return to island selection
      setCurrentStep(1);
      setSelectedIsland(null);
    }
  };

  // Finalize shift closing
  const finalizeShift = () => {
    // Prepare updated shift data
    const updatedShift = {
      ...shift,
      status: 'closed',
      closedAt: new Date().toISOString(),
      
      // Add closing pump readings
      pumpReadings: [
        ...shift.pumpReadings,
        ...Object.entries(closingData.pumps).flatMap(([pumpId, readings]) => [
          {
            pumpId,
            readingType: 'END',
            meterType: 'ELECTRIC',
            value: parseFloat(readings.electric) || 0,
            recordedById: shift.supervisorId
          },
          {
            pumpId,
            readingType: 'END',
            meterType: 'CASH',
            value: parseFloat(readings.cash) || 0,
            recordedById: shift.supervisorId
          },
          {
            pumpId,
            readingType: 'END',
            meterType: 'MANUAL',
            value: parseFloat(readings.manual) || 0,
            recordedById: shift.supervisorId
          }
        ])
      ],
      
      // Update non-fuel stocks
      nonFuelStocks: shift.nonFuelStocks.map(item => {
        const closingStock = parseInt(closingData.nonFuelItems[item.productId]?.closingStock, 10) || 0;
        const soldQuantity = item.openingStock - closingStock;
        
        return {
          ...item,
          closingStock,
          soldQuantity: Math.max(0, soldQuantity)
        };
      })
    };
    
    // Dispatch update
    dispatch({ type: 'UPDATE_SHIFT', payload: updatedShift });
    onClose();
  };

  // Check if all items are completed
  const allItemsCompleted = () => {
    const totalPumps = shiftIslands.reduce((sum, island) => 
      sum + state.assets.pumps.filter(p => p.islandId === island.id).length, 0);
    
    const totalNonFuelItems = shiftIslands.reduce((sum, island) => 
      sum + (shift.nonFuelStocks?.filter(item => item.islandId === island.id).length || 0), 0);
    
    return completedItems.pumps.length === totalPumps && 
           completedItems.nonFuelItems.length === totalNonFuelItems;
  };

  // Get product name by ID
  const getProductName = (productId) => {
    const warehouse = state.warehouses.find(w => w.stationId === shift.stationId);
    const item = warehouse?.nonFuelItems.find(i => i.itemId === productId);
    return item?.name || productId;
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Close Shift: ${shift.id}`} size="xl">
      <div className="space-y-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="font-medium">Reconciliation Progress</span>
            <span className="font-medium">{calculateProgress()}%</span>
          </div>
          <Progress value={calculateProgress()} />
        </div>
        
        {/* Step 1: Select Island */}
        {currentStep === 1 && (
          <Card title="Select Island">
            <div className="space-y-4">
              <p className="text-gray-600">Select an island to reconcile its pumps and non-fuel items.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shiftIslands.map(island => {
                  const islandPumps = state.assets.pumps.filter(p => p.islandId === island.id);
                  const islandNonFuelItems = shift.nonFuelStocks?.filter(item => item.islandId === island.id) || [];
                  
                  const completedPumps = islandPumps.filter(pump => 
                    completedItems.pumps.includes(pump.id)
                  ).length;
                  
                  const completedNonFuelItems = islandNonFuelItems.filter(item => 
                    completedItems.nonFuelItems.includes(item.productId)
                  ).length;
                  
                  return (
                    <Card 
                      key={island.id}
                      className="cursor-pointer transition-all hover:border-blue-300"
                      onClick={() => {
                        setSelectedIsland(island);
                        setCurrentStep(2);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{island.name}</h4>
                        <Badge>
                          {islandPumps.length} pumps, {islandNonFuelItems.length} items
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Pumps completed:</span>
                          <span className={completedPumps === islandPumps.length ? 'text-green-600' : 'text-yellow-600'}>
                            {completedPumps}/{islandPumps.length}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Items completed:</span>
                          <span className={completedNonFuelItems === islandNonFuelItems.length ? 'text-green-600' : 'text-yellow-600'}>
                            {completedNonFuelItems}/{islandNonFuelItems.length}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
            
            {allItemsCompleted() && (
              <div className="mt-6 pt-4 border-t">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center text-green-700">
                    <CheckCircle className="w-6 h-6 mr-2" />
                    <h3 className="text-lg font-medium">All items reconciled!</h3>
                  </div>
                  <p className="mt-2 text-green-700">
                    You can now finalize the shift closing.
                  </p>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button onClick={finalizeShift}>
                    Finalize Shift Closing
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
        
        {/* Step 2: Select Pump */}
        {currentStep === 2 && selectedIsland && (
          <Card title={`Select Pump - ${selectedIsland.name}`}>
            <div className="flex items-center mb-4">
              <Button 
                variant="ghost"
                onClick={() => {
                  setSelectedIsland(null);
                  setCurrentStep(1);
                }}
                icon={ChevronLeft}
                className="mr-2"
              >
                Back to Islands
              </Button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">Select a pump to record its closing readings.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {islandPumps.map(pump => {
                  const isCompleted = completedItems.pumps.includes(pump.id);
                  const tank = state.assets.tanks.find(t => t.id === pump.tankId);
                  
                  return (
                    <Card 
                      key={pump.id}
                      className={`cursor-pointer transition-all ${
                        isCompleted ? 'border-green-200 bg-green-50' : 'hover:border-blue-300'
                      }`}
                      onClick={() => {
                        if (!isCompleted) {
                          setSelectedPump(pump);
                          setCurrentStep(2.5); // Pump detail step
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{pump.code}</h4>
                        <Badge variant={isCompleted ? 'success' : 'default'}>
                          {isCompleted ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {tank?.productType || 'Unknown fuel type'}
                      </div>
                    </Card>
                  );
                })}
              </div>
              
              {islandNonFuelItems.length > 0 && (
                <div className="pt-4 mt-4 border-t">
                  <Button 
                    onClick={() => setCurrentStep(3)}
                    variant="outline"
                    className="w-full"
                  >
                    Continue to Non-Fuel Items
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {/* Step 2.5: Pump Reconciliation */}
        {currentStep === 2.5 && selectedIsland && selectedPump && (
          <Card title={`Pump Reconciliation - ${selectedPump.code}`}>
            <div className="flex items-center mb-4">
              <Button 
                variant="ghost"
                onClick={() => {
                  setSelectedPump(null);
                  setCurrentStep(2);
                }}
                icon={ChevronLeft}
                className="mr-2"
              >
                Back to Pumps
              </Button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Electric Meter</div>
                  <Input
                    type="number"
                    step="0.01"
                    value={closingData.pumps[selectedPump.id]?.electric || ''}
                    onChange={(e) => handlePumpReadingChange(
                      selectedPump.id, 
                      'electric', 
                      e.target.value
                    )}
                    placeholder="Enter reading"
                  />
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Cash Meter</div>
                  <Input
                    type="number"
                    step="0.01"
                    value={closingData.pumps[selectedPump.id]?.cash || ''}
                    onChange={(e) => handlePumpReadingChange(
                      selectedPump.id, 
                      'cash', 
                      e.target.value
                    )}
                    placeholder="Enter reading"
                  />
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Manual Meter</div>
                  <Input
                    type="number"
                    step="0.01"
                    value={closingData.pumps[selectedPump.id]?.manual || ''}
                    onChange={(e) => handlePumpReadingChange(
                      selectedPump.id, 
                      'manual', 
                      e.target.value
                    )}
                    placeholder="Enter reading"
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setSelectedPump(null);
                    setCurrentStep(2);
                  }}
                >
                  Back to Pumps
                </Button>
                <Button 
                  onClick={completePumpReconciliation}
                  disabled={!closingData.pumps[selectedPump.id]?.electric}
                >
                  Complete Pump Reconciliation
                </Button>
              </div>
            </div>
          </Card>
        )}
        
        {/* Step 3: Non-Fuel Items */}
        {currentStep === 3 && selectedIsland && (
          <Card title={`Non-Fuel Items - ${selectedIsland.name}`}>
            <div className="flex items-center mb-4">
              <Button 
                variant="ghost"
                onClick={() => {
                  if (islandPumps.length > 0) {
                    setCurrentStep(2);
                  } else {
                    setSelectedIsland(null);
                    setCurrentStep(1);
                  }
                }}
                icon={ChevronLeft}
                className="mr-2"
              >
                {islandPumps.length > 0 ? 'Back to Pumps' : 'Back to Islands'}
              </Button>
            </div>
            
            <div className="space-y-6">
              <p className="text-gray-600">Record closing stock for non-fuel items.</p>
              
              <div className="space-y-4">
                {islandNonFuelItems.map(item => {
                  const isCompleted = completedItems.nonFuelItems.includes(item.productId);
                  const openingStock = item.openingStock || 0;
                  const closingStock = closingData.nonFuelItems[item.productId]?.closingStock || '';
                  
                  return (
                    <Card key={item.productId} className={isCompleted ? 'border-green-200 bg-green-50' : ''}>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">{getProductName(item.productId)}</h4>
                        <Badge variant={isCompleted ? 'success' : 'default'}>
                          {isCompleted ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-sm text-blue-700">Opening Stock</div>
                          <div className="text-lg font-bold">{openingStock}</div>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-700">Closing Stock</div>
                          <Input
                            type="number"
                            value={closingStock}
                            onChange={(e) => handleNonFuelItemChange(
                              item.productId, 
                              e.target.value
                            )}
                            placeholder="Enter quantity"
                            min="0"
                            max={openingStock}
                            disabled={isCompleted}
                          />
                        </div>
                        
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-sm text-green-700">Sold Quantity</div>
                          <div className="text-lg font-bold">
                            {closingStock ? openingStock - parseInt(closingStock, 10) : 0}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              
              <div className="flex justify-between">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    if (islandPumps.length > 0) {
                      setCurrentStep(2);
                    } else {
                      setSelectedIsland(null);
                      setCurrentStep(1);
                    }
                  }}
                >
                  {islandPumps.length > 0 ? 'Back to Pumps' : 'Back to Islands'}
                </Button>
                <Button 
                  onClick={completeNonFuelReconciliation}
                  disabled={islandNonFuelItems.some(item => 
                    !completedItems.nonFuelItems.includes(item.productId) && 
                    !closingData.nonFuelItems[item.productId]?.closingStock
                  )}
                >
                  Complete Item Reconciliation
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default ShiftCloseReconciliation;