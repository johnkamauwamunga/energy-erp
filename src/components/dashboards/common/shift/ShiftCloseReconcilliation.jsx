// src/components/shift/ShiftCloseReconciliation.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Input, Card, Badge, Progress } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { formatCurrency, formatDateTime } from '../../../../utils/helpers';
import { ChevronLeft, Zap, Package, CheckCircle } from 'lucide-react';

const ShiftCloseReconciliation = ({ shift, onClose }) => {
  const { state, dispatch } = useApp();
  const [currentIsland, setCurrentIsland] = useState(null);
  const [currentPump, setCurrentPump] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [closingData, setClosingData] = useState({
    islands: {}
  });
  const [completedItems, setCompletedItems] = useState({
    pumps: [],
    products: []
  });

  // Get shift islands
  const shiftIslands = shift.islands.map(island => ({
    ...state.islands.find(i => i.id === island.islandId),
    ...island
  }));

  // Get progress percentage
  const calculateProgress = () => {
    const totalItems = shiftIslands.reduce((total, island) => {
      return total + island.fuelPumps.length + island.nonFuelItems.length;
    }, 0);
    
    const completedCount = completedItems.pumps.length + completedItems.products.length;
    
    return totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  };

  // Initialize closing data
  useEffect(() => {
    const initialData = { islands: {} };
    
    shiftIslands.forEach(island => {
      initialData.islands[island.id] = {
        fuelPumps: island.fuelPumps.map(pump => ({
          pumpId: pump.pumpId,
          closingCash: '',
          closingManual: '',
          closingElectric: ''
        })),
        nonFuelItems: island.nonFuelItems.map(item => ({
          itemId: item.itemId,
          closingStock: ''
        }))
      };
    });
    
    setClosingData(initialData);
  }, [shift]);

  // Handle pump reading change
  const handlePumpReadingChange = (islandId, pumpId, field, value) => {
    setClosingData(prev => ({
      ...prev,
      islands: {
        ...prev.islands,
        [islandId]: {
          ...prev.islands[islandId],
          fuelPumps: prev.islands[islandId].fuelPumps.map(pump => 
            pump.pumpId === pumpId ? { ...pump, [field]: value } : pump
          )
        }
      }
    }));
  };

  // Handle product stock change
  const handleProductStockChange = (islandId, itemId, value) => {
    setClosingData(prev => ({
      ...prev,
      islands: {
        ...prev.islands,
        [islandId]: {
          ...prev.islands[islandId],
          nonFuelItems: prev.islands[islandId].nonFuelItems.map(item => 
            item.itemId === itemId ? { ...item, closingStock: value } : item
          )
        }
      }
    }));
  };

  // Calculate fuel sales for a pump
  const calculateFuelSales = (islandId, pumpId) => {
    const openingPump = shift.islands
      .find(i => i.islandId === islandId)
      .fuelPumps.find(p => p.pumpId === pumpId);
      
    const closingPump = closingData.islands[islandId]?.fuelPumps
      .find(p => p.pumpId === pumpId);
    
    if (!openingPump || !closingPump) return 0;
    
    const cashSold = (parseFloat(closingPump.closingCash) || 0) - (openingPump.openingCash || 0);
    const manualSold = (parseFloat(closingPump.closingManual) || 0) - (openingPump.openingManual || 0);
    const electricSold = (parseFloat(closingPump.closingElectric) || 0) - (openingPump.openingElectric || 0);
    
    // Get fuel price from the pump asset
    const pumpAsset = state.assets.pumps.find(p => p.id === pumpId);
    const pricePerLiter = pumpAsset?.pricePerLiter || 0;
    
    return (cashSold + manualSold + electricSold) * pricePerLiter;
  };

  // Calculate non-fuel sales
  const calculateNonFuelSales = (islandId, itemId) => {
    const openingItem = shift.islands
      .find(i => i.islandId === islandId)
      .nonFuelItems.find(i => i.itemId === itemId);
      
    const closingItem = closingData.islands[islandId]?.nonFuelItems
      .find(i => i.itemId === itemId);
    
    if (!openingItem || !closingItem) return 0;
    
    const openingStock = openingItem.openingStock || 0;
    const closingStock = parseInt(closingItem.closingStock, 10) || 0;
    const sold = openingStock - closingStock;
    
    return sold * (openingItem.price || 0);
  };

  // Mark pump as completed
  const completePump = (islandId, pumpId) => {
    setCompletedItems(prev => ({
      ...prev,
      pumps: [...prev.pumps, pumpId]
    }));
    setCurrentPump(null);
  };

  // Mark product as completed
  const completeProduct = (islandId, itemId) => {
    setCompletedItems(prev => ({
      ...prev,
      products: [...prev.products, itemId]
    }));
    setCurrentProduct(null);
  };

  // Finalize shift closing
  const finalizeShift = () => {
    const updatedShift = {
      ...shift,
      status: 'closed',
      closedAt: new Date().toISOString(),
      islands: shift.islands.map(island => {
        const closingIsland = closingData.islands[island.islandId] || {};
        return {
          ...island,
          fuelPumps: island.fuelPumps.map(pump => {
            const closingPump = closingIsland.fuelPumps?.find(p => p.pumpId === pump.pumpId) || {};
            return {
              ...pump,
              closingCash: closingPump.closingCash,
              closingManual: closingPump.closingManual,
              closingElectric: closingPump.closingElectric,
              fuelSales: calculateFuelSales(island.islandId, pump.pumpId)
            };
          }),
          nonFuelItems: island.nonFuelItems.map(item => {
            const closingItem = closingIsland.nonFuelItems?.find(i => i.itemId === item.itemId) || {};
            return {
              ...item,
              closingStock: closingItem.closingStock,
              nonFuelSales: calculateNonFuelSales(island.islandId, item.itemId)
            };
          })
        };
      })
    };
    
    // Calculate totals
    updatedShift.totalFuelSales = updatedShift.islands.reduce((sum, island) => 
      sum + island.fuelPumps.reduce((islandSum, pump) => 
        islandSum + (pump.fuelSales || 0), 0), 0);
    
    updatedShift.totalNonFuelSales = updatedShift.islands.reduce((sum, island) => 
      sum + island.nonFuelItems.reduce((islandSum, item) => 
        islandSum + (item.nonFuelSales || 0), 0), 0);
    
    updatedShift.totalSales = updatedShift.totalFuelSales + updatedShift.totalNonFuelSales;
    
    // Update warehouse stock
    updatedShift.islands.forEach(island => {
      island.nonFuelItems.forEach(item => {
        if (item.closingStock) {
          dispatch({
            type: 'UPDATE_WAREHOUSE_STOCK',
            payload: {
              warehouseId: shift.warehouseId,
              itemId: item.itemId,
              newStock: item.closingStock
            }
          });
        }
      });
    });
    
    dispatch({ type: 'UPDATE_SHIFT', payload: updatedShift });
    onClose();
  };

  // Check if all items are completed
  const allItemsCompleted = () => {
    const totalPumps = shiftIslands.reduce((sum, island) => sum + island.fuelPumps.length, 0);
    const totalProducts = shiftIslands.reduce((sum, island) => sum + island.nonFuelItems.length, 0);
    
    return completedItems.pumps.length === totalPumps && 
           completedItems.products.length === totalProducts;
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Shift Closing: ${shift.id}`} size="2xl">
      <div className="space-y-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="font-medium">Reconciliation Progress</span>
            <span className="font-medium">{calculateProgress()}%</span>
          </div>
          <Progress value={calculateProgress()} />
        </div>
        
        {/* Island selection */}
        {!currentIsland && !currentPump && !currentProduct && (
          <div>
            <h3 className="text-lg font-medium mb-4">Select Allocation Point</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {shiftIslands.map(island => {
                const completedPumps = island.fuelPumps.filter(pump => 
                  completedItems.pumps.includes(pump.pumpId)
                ).length;
                
                const completedProducts = island.nonFuelItems.filter(item => 
                  completedItems.products.includes(item.itemId)
                ).length;
                
                return (
                  <Card 
                    key={island.id}
                    className="cursor-pointer transition-all hover:border-blue-300"
                    onClick={() => setCurrentIsland(island)}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{island.name}</h4>
                      <Badge>
                        {island.fuelPumps.length} pumps, {island.nonFuelItems.length} products
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Pumps completed:</span>
                        <span className={completedPumps === island.fuelPumps.length ? 'text-green-600' : 'text-yellow-600'}>
                          {completedPumps}/{island.fuelPumps.length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Products completed:</span>
                        <span className={completedProducts === island.nonFuelItems.length ? 'text-green-600' : 'text-yellow-600'}>
                          {completedProducts}/{island.nonFuelItems.length}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Island details */}
        {currentIsland && !currentPump && !currentProduct && (
          <div>
            <div className="flex items-center mb-4">
              <Button 
                variant="ghost"
                onClick={() => setCurrentIsland(null)}
                icon={ChevronLeft}
                className="mr-2"
              >
                Back
              </Button>
              <h3 className="text-lg font-medium">
                {currentIsland.name} - Reconciliation
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fuel Pumps */}
              <Card title="Fuel Pumps">
                {currentIsland.fuelPumps.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No fuel pumps assigned
                  </div>
                ) : (
                  <Table
                    columns={[
                      { header: 'Pump', accessor: 'code' },
                      { header: 'Status', accessor: 'status' },
                      { header: 'Actions', accessor: 'actions' }
                    ]}
                    data={currentIsland.fuelPumps.map(pump => {
                      const isCompleted = completedItems.pumps.includes(pump.pumpId);
                      const pumpAsset = state.assets.pumps.find(p => p.id === pump.pumpId);
                      
                      return {
                        code: pumpAsset?.code || `Pump ${pump.pumpId.slice(-4)}`,
                        status: isCompleted ? (
                          <Badge variant="success">Completed</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        ),
                        actions: (
                          <Button 
                            size="sm"
                            onClick={() => setCurrentPump(pump.pumpId)}
                          >
                            {isCompleted ? 'Review' : 'Reconcile'}
                          </Button>
                        )
                      };
                    })}
                  />
                )}
              </Card>
              
              {/* Non-Fuel Products */}
              <Card title="Non-Fuel Products">
                {currentIsland.nonFuelItems.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No non-fuel products assigned
                  </div>
                ) : (
                  <Table
                    columns={[
                      { header: 'Product', accessor: 'name' },
                      { header: 'Status', accessor: 'status' },
                      { header: 'Actions', accessor: 'actions' }
                    ]}
                    data={currentIsland.nonFuelItems.map(item => {
                      const isCompleted = completedItems.products.includes(item.itemId);
                      const warehouseItem = warehouse?.nonFuelItems.find(i => i.itemId === item.itemId);
                      
                      return {
                        name: item.name || warehouseItem?.name || `Item ${item.itemId.slice(-4)}`,
                        status: isCompleted ? (
                          <Badge variant="success">Completed</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        ),
                        actions: (
                          <Button 
                            size="sm"
                            onClick={() => setCurrentProduct(item.itemId)}
                          >
                            {isCompleted ? 'Review' : 'Reconcile'}
                          </Button>
                        )
                      };
                    })}
                  />
                )}
              </Card>
            </div>
          </div>
        )}
        
        {/* Pump reconciliation */}
        {currentPump && (
          <div>
            <div className="flex items-center mb-4">
              <Button 
                variant="ghost"
                onClick={() => setCurrentPump(null)}
                icon={ChevronLeft}
                className="mr-2"
              >
                Back to Pumps
              </Button>
              <h3 className="text-lg font-medium">
                Pump Reconciliation
              </h3>
            </div>
            
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-700">Electric Meter</div>
                  <Input
                    type="number"
                    value={closingData.islands[currentIsland.id]?.fuelPumps
                      .find(p => p.pumpId === currentPump)?.closingElectric || ''}
                    onChange={(e) => handlePumpReadingChange(
                      currentIsland.id, 
                      currentPump, 
                      'closingElectric', 
                      e.target.value
                    )}
                    placeholder="Enter reading"
                  />
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-700">Automatic Meter</div>
                  <Input
                    type="number"
                    value={closingData.islands[currentIsland.id]?.fuelPumps
                      .find(p => p.pumpId === currentPump)?.closingAuto || ''}
                    onChange={(e) => handlePumpReadingChange(
                      currentIsland.id, 
                      currentPump, 
                      'closingAuto', 
                      e.target.value
                    )}
                    placeholder="Enter reading"
                  />
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-700">Manual Meter</div>
                  <Input
                    type="number"
                    value={closingData.islands[currentIsland.id]?.fuelPumps
                      .find(p => p.pumpId === currentPump)?.closingManual || ''}
                    onChange={(e) => handlePumpReadingChange(
                      currentIsland.id, 
                      currentPump, 
                      'closingManual', 
                      e.target.value
                    )}
                    placeholder="Enter reading"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-700">Calculated Sales</div>
                  <div className="text-xl font-bold">
                    {formatCurrency(calculateFuelSales(currentIsland.id, currentPump))}
                  </div>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-700">Fuel Type</div>
                  <div className="text-lg font-bold">
                    {state.assets.pumps.find(p => p.id === currentPump)?.fuelType || 'N/A'}
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-sm text-yellow-700">Price per Liter</div>
                  <div className="text-xl font-bold">
                    {formatCurrency(state.assets.pumps.find(p => p.id === currentPump)?.pricePerLiter || 0)}
                  </div>
                </div>
              </div>
            </Card>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="secondary" 
                onClick={() => setCurrentPump(null)}
              >
                Back to Pumps
              </Button>
              <Button 
                onClick={() => completePump(currentIsland.id, currentPump)}
                icon={CheckCircle}
              >
                Complete Reconciliation
              </Button>
            </div>
          </div>
        )}
        
        {/* Product reconciliation */}
        {currentProduct && (
          <div>
            <div className="flex items-center mb-4">
              <Button 
                variant="ghost"
                onClick={() => setCurrentProduct(null)}
                icon={ChevronLeft}
                className="mr-2"
              >
                Back to Products
              </Button>
              <h3 className="text-lg font-medium">
                Product Reconciliation
              </h3>
            </div>
            
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-700">Opening Stock</div>
                  <div className="text-xl font-bold">
                    {currentIsland.nonFuelItems.find(i => i.itemId === currentProduct)?.openingStock || 0}
                  </div>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-700">Price per Unit</div>
                  <div className="text-xl font-bold">
                    {formatCurrency(currentIsland.nonFuelItems.find(i => i.itemId === currentProduct)?.price || 0)}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-700">Closing Stock</div>
                  <Input
                    type="number"
                    value={closingData.islands[currentIsland.id]?.nonFuelItems
                      .find(i => i.itemId === currentProduct)?.closingStock || ''}
                    onChange={(e) => handleProductStockChange(
                      currentIsland.id, 
                      currentProduct, 
                      e.target.value
                    )}
                    placeholder="Enter quantity"
                    min="0"
                  />
                </div>
              </div>
              
              <div className="mt-4 bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-700">Calculated Sales</div>
                <div className="text-xl font-bold">
                  {formatCurrency(calculateNonFuelSales(currentIsland.id, currentProduct))}
                </div>
              </div>
            </Card>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="secondary" 
                onClick={() => setCurrentProduct(null)}
              >
                Back to Products
              </Button>
              <Button 
                onClick={() => completeProduct(currentIsland.id, currentProduct)}
                icon={CheckCircle}
              >
                Complete Reconciliation
              </Button>
            </div>
          </div>
        )}
        
        {/* Finalization */}
        {!currentIsland && !currentPump && !currentProduct && allItemsCompleted() && (
          <div className="pt-6 border-t">
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <div className="flex items-center text-green-700">
                <CheckCircle className="w-6 h-6 mr-2" />
                <h3 className="text-lg font-medium">All items reconciled!</h3>
              </div>
              <p className="mt-2 text-green-700">
                You can now finalize the shift closing.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Shift Summary">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Shift ID:</span>
                    <span className="font-medium">{shift.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Supervisor:</span>
                    <span className="font-medium">
                      {state.staff.supervisors.find(s => s.id === shift.supervisorId)?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Start Time:</span>
                    <span className="font-medium">{formatDateTime(shift.startTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>End Time:</span>
                    <span className="font-medium">{formatDateTime(shift.endTime)}</span>
                  </div>
                </div>
              </Card>
              
              <Card title="Financial Summary">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Fuel Sales:</span>
                    <span className="font-medium">
                      {formatCurrency(shift.islands.reduce((sum, island) => 
                        sum + island.fuelPumps.reduce((islandSum, pump) => 
                          islandSum + (pump.fuelSales || 0), 0), 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Non-Fuel Sales:</span>
                    <span className="font-medium">
                      {formatCurrency(shift.islands.reduce((sum, island) => 
                        sum + island.nonFuelItems.reduce((islandSum, item) => 
                          islandSum + (item.nonFuelSales || 0), 0), 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-medium">Total Sales:</span>
                    <span className="font-medium text-lg">
                      {formatCurrency(
                        shift.islands.reduce((sum, island) => 
                          sum + island.fuelPumps.reduce((islandSum, pump) => 
                            islandSum + (pump.fuelSales || 0), 0) +
                          island.nonFuelItems.reduce((islandSum, item) => 
                            islandSum + (item.nonFuelSales || 0), 0), 0)
                      )}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
            
            <div className="flex justify-end pt-6">
              <Button 
                onClick={finalizeShift}
                variant="primary"
                className="w-full md:w-auto"
              >
                Finalize Shift Closing
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ShiftCloseReconciliation;