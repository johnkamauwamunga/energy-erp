// src/components/shift/ShiftCloseReconciliation.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Input, Card, Badge } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { formatCurrency } from '../../../../utils/helpers';
import { Zap, ChevronLeft, Package } from 'lucide-react';

const ShiftCloseReconciliation = ({ shift, onClose }) => {
  const { state } = useApp();
  const [pumpReadings, setPumpReadings] = useState({});
  const [productStocks, setProductStocks] = useState({});
  const [currentPump, setCurrentPump] = useState(null);
  const [currentIsland, setCurrentIsland] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [closedPumps, setClosedPumps] = useState([]);
  const [closedProducts, setClosedProducts] = useState([]);
  
  // Get islands for this shift
  const shiftIslands = state.islands.filter(island => 
    shift.islands?.includes(island.id)
  );
  
  // Get pumps for current island
  const islandPumps = currentIsland 
    ? state.assets.pumps.filter(pump => pump.islandId === currentIsland.id)
    : [];

  // Get non-fuel products for current island
  const islandProducts = currentIsland 
    ? (shift.nonFuelProducts || []).filter(p => p.islandId === currentIsland.id)
    : [];

  // Initialize pump readings and product stocks
  useEffect(() => {
    const initialReadings = {};
    const initialStocks = {};
    
    // Initialize readings for all pumps
    shiftIslands.forEach(island => {
      const pumps = state.assets.pumps.filter(pump => pump.islandId === island.id);
      pumps.forEach(pump => {
        initialReadings[pump.id] = {
          electric: '',
          manual: '',
          auto: '',
          avg: ''
        };
      });
    });
    
    // Initialize stocks for all products
    shiftIslands.forEach(island => {
      const products = shift.nonFuelProducts.filter(p => p.islandId === island.id);
      products.forEach(product => {
        initialStocks[product.productId] = {
          closingStock: '',
          openingStock: product.openingStock || 0,
          price: product.price || 0
        };
      });
    });
    
    setPumpReadings(initialReadings);
    setProductStocks(initialStocks);
  }, [shift]);

  // Handle reading change
  const handleReadingChange = (pumpId, meter, value) => {
    setPumpReadings(prev => ({
      ...prev,
      [pumpId]: {
        ...prev[pumpId],
        [meter]: value
      }
    }));
  };

  // Calculate expected amount for a pump
  const calculateExpected = (pumpId) => {
    const readings = pumpReadings[pumpId];
    if (!readings || !readings.avg) return 0;
    
    const liters = parseFloat(readings.avg);
    return isNaN(liters) ? 0 : liters * 1000; // 1L = 1000 Ksh
  };

  // Calculate average for a pump
  const calculateAverage = (pumpId) => {
    const readings = pumpReadings[pumpId];
    if (!readings) return '';
    
    const electric = parseFloat(readings.electric) || 0;
    const manual = parseFloat(readings.manual) || 0;
    const auto = parseFloat(readings.auto) || 0;
    
    if (electric + manual + auto === 0) return '';
    
    const avg = (electric + manual + auto) / 3;
    return avg.toFixed(2);
  };

  // Handle product stock change
  const handleStockChange = (productId, value) => {
    setProductStocks(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        closingStock: value
      }
    }));
  };

  // Calculate product sales
  const calculateProductSales = (productId) => {
    const stock = productStocks[productId];
    if (!stock || !stock.closingStock) return 0;
    
    const closing = parseInt(stock.closingStock, 10);
    const opening = stock.openingStock || 0;
    const price = stock.price || 0;
    
    return (opening - closing) * price;
  };

  // Close a pump (mark as reconciled)
  const handleClosePump = () => {
    if (!currentPump) return;
    
    // Calculate average if not already set
    const avg = calculateAverage(currentPump);
    if (avg) {
      setPumpReadings(prev => ({
        ...prev,
        [currentPump]: {
          ...prev[currentPump],
          avg
        }
      }));
    }
    
    // Mark pump as closed
    setClosedPumps(prev => [...prev, currentPump]);
    setCurrentPump(null);
  };

  // Close a product (mark as reconciled)
  const handleCloseProduct = () => {
    if (!currentProduct) return;
    setClosedProducts(prev => [...prev, currentProduct]);
    setCurrentProduct(null);
  };

  // Finalize shift closing
  const handleFinalizeShift = () => {
    // Prepare shift closing data
    const closingData = {
      closedAt: new Date().toISOString(),
      islands: shiftIslands.map(island => {
        const pumps = state.assets.pumps.filter(pump => pump.islandId === island.id);
        const products = shift.nonFuelProducts.filter(p => p.islandId === island.id);
        
        return {
          islandId: island.id,
          pumps: pumps.map(pump => {
            const readings = pumpReadings[pump.id] || {};
            return {
              pumpId: pump.id,
              readings,
              expected: calculateExpected(pump.id)
            };
          }),
          products: products.map(product => {
            const stock = productStocks[product.productId] || {};
            return {
              productId: product.productId,
              openingStock: product.openingStock,
              closingStock: stock.closingStock || 0,
              sales: calculateProductSales(product.productId)
            };
          })
        };
      })
    };
    
    // Dispatch action to close shift
    // dispatch({
    //   type: 'UPDATE_SHIFT',
    //   payload: {
    //     ...shift,
    //     status: 'closed',
    //     closingData
    //   }
    // });
    
    onClose();
  };

  // Check if all pumps and products are closed
  const allItemsClosed = () => {
    const totalPumps = shiftIslands.reduce((total, island) => {
      return total + state.assets.pumps.filter(pump => pump.islandId === island.id).length;
    }, 0);
    
    const totalProducts = shift.nonFuelProducts?.length || 0;
    
    return closedPumps.length === totalPumps && closedProducts.length === totalProducts;
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Shift Closing: ${shift.id}`} size="2xl">
      <div className="space-y-6">
        {/* Island selection */}
        {!currentIsland && (
          <div>
            <h3 className="text-lg font-medium mb-4">Select Allocation Point</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {shiftIslands.map(island => {
                const pumps = state.assets.pumps.filter(pump => pump.islandId === island.id);
                const products = shift.nonFuelProducts.filter(p => p.islandId === island.id);
                const closedPumpCount = pumps.filter(pump => closedPumps.includes(pump.id)).length;
                const closedProductCount = products.filter(product => closedProducts.includes(product.productId)).length;
                
                return (
                  <Card 
                    key={island.id}
                    className="cursor-pointer transition-all hover:border-blue-300"
                    onClick={() => setCurrentIsland(island)}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{island.name}</h4>
                      <Badge>
                        {pumps.length} pumps, {products.length} products
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Pumps:</span>
                        <span className={closedPumpCount === pumps.length ? 'text-green-600' : 'text-yellow-600'}>
                          {closedPumpCount}/{pumps.length} closed
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Products:</span>
                        <span className={closedProductCount === products.length ? 'text-green-600' : 'text-yellow-600'}>
                          {closedProductCount}/{products.length} closed
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Island actions */}
        {currentIsland && (
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
                {currentIsland.name}
              </h3>
            </div>
            
            {/* Pumps and Products Tabs */}
            <div className="flex border-b mb-4">
              <button
                className={`px-4 py-2 font-medium ${
                  !currentPump && !currentProduct 
                    ? 'border-b-2 border-blue-500 text-blue-600' 
                    : 'text-gray-500'
                }`}
                onClick={() => {
                  setCurrentPump(null);
                  setCurrentProduct(null);
                }}
              >
                Overview
              </button>
              <button
                className={`px-4 py-2 font-medium ${
                  currentPump 
                    ? 'border-b-2 border-blue-500 text-blue-600' 
                    : 'text-gray-500'
                }`}
                onClick={() => {
                  if (islandPumps.length > 0) {
                    setCurrentPump(islandPumps[0].id);
                  }
                }}
              >
                Fuel Pumps
              </button>
              <button
                className={`px-4 py-2 font-medium ${
                  currentProduct 
                    ? 'border-b-2 border-blue-500 text-blue-600' 
                    : 'text-gray-500'
                }`}
                onClick={() => {
                  if (islandProducts.length > 0) {
                    setCurrentProduct(islandProducts[0].productId);
                  }
                }}
              >
                Non-Fuel Products
              </button>
            </div>
            
            {/* Overview */}
            {!currentPump && !currentProduct && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pumps Section */}
                <Card title="Fuel Pumps">
                  {islandPumps.length === 0 ? (
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
                      data={islandPumps.map(pump => {
                        const isClosed = closedPumps.includes(pump.id);
                        return {
                          code: pump.code,
                          status: isClosed ? (
                            <Badge variant="success">Closed</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          ),
                          actions: (
                            <Button 
                              size="sm"
                              onClick={() => setCurrentPump(pump.id)}
                            >
                              {isClosed ? 'Review' : 'Reconcile'}
                            </Button>
                          )
                        };
                      })}
                    />
                  )}
                </Card>
                
                {/* Products Section */}
                <Card title="Non-Fuel Products">
                  {islandProducts.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No non-fuel products assigned
                    </div>
                  ) : (
                    <Table
                      columns={[
                        { header: 'Product', accessor: 'name' },
                        { header: 'Size', accessor: 'size' },
                        { header: 'Status', accessor: 'status' },
                        { header: 'Actions', accessor: 'actions' }
                      ]}
                      data={islandProducts.map(product => {
                        const isClosed = closedProducts.includes(product.productId);
                        return {
                          name: product.productName,
                          size: product.size,
                          status: isClosed ? (
                            <Badge variant="success">Closed</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          ),
                          actions: (
                            <Button 
                              size="sm"
                              onClick={() => setCurrentProduct(product.productId)}
                            >
                              {isClosed ? 'Review' : 'Reconcile'}
                            </Button>
                          )
                        };
                      })}
                    />
                  )}
                </Card>
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
                    Pump {state.assets.pumps.find(p => p.id === currentPump)?.code}
                  </h3>
                </div>
                
                <Card>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-700">Electric Meter</div>
                      <Input
                        type="number"
                        value={pumpReadings[currentPump]?.electric || ''}
                        onChange={(e) => handleReadingChange(currentPump, 'electric', e.target.value)}
                        placeholder="Enter reading"
                      />
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-700">Automatic Meter</div>
                      <Input
                        type="number"
                        value={pumpReadings[currentPump]?.auto || ''}
                        onChange={(e) => handleReadingChange(currentPump, 'auto', e.target.value)}
                        placeholder="Enter reading"
                      />
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-700">Manual Meter</div>
                      <Input
                        type="number"
                        value={pumpReadings[currentPump]?.manual || ''}
                        onChange={(e) => handleReadingChange(currentPump, 'manual', e.target.value)}
                        placeholder="Enter reading"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-blue-700">Average (L)</div>
                      <div className="text-xl font-bold">
                        {pumpReadings[currentPump]?.avg || calculateAverage(currentPump) || '0.00'}
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-green-700">Expected Amount</div>
                      <div className="text-xl font-bold">
                        {formatCurrency(calculateExpected(currentPump))}
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-sm text-yellow-700">Rate: 1L = Ksh 1000</div>
                      <div className="text-sm mt-1">
                        Avg × 1000 = Expected
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
                  <Button onClick={handleClosePump}>
                    Save & Close Pump
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
                    {shift.nonFuelProducts.find(p => p.productId === currentProduct)?.productName}
                  </h3>
                </div>
                
                <Card>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-blue-700">Opening Stock</div>
                      <div className="text-xl font-bold">
                        {productStocks[currentProduct]?.openingStock || 0}
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-green-700">Price per Unit</div>
                      <div className="text-xl font-bold">
                        {formatCurrency(productStocks[currentProduct]?.price || 0)}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-700">Closing Stock</div>
                      <Input
                        type="number"
                        value={productStocks[currentProduct]?.closingStock || ''}
                        onChange={(e) => handleStockChange(currentProduct, e.target.value)}
                        placeholder="Enter quantity"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-purple-50 p-3 rounded-lg">
                    <div className="text-sm text-purple-700">Calculated Sales</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(calculateProductSales(currentProduct))}
                    </div>
                    <div className="text-sm mt-1">
                      (Opening - Closing) × Price
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
                  <Button onClick={handleCloseProduct}>
                    Save & Close Product
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Final shift closing */}
        {!currentIsland && !currentPump && !currentProduct && (
          <div className="pt-6 border-t">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-medium">Shift Closing Summary</h3>
                <p className="text-sm text-gray-600">
                  {closedPumps.length} pumps and {closedProducts.length} products reconciled
                </p>
              </div>
              
              <Button 
                onClick={handleFinalizeShift}
                disabled={!allItemsClosed()}
                variant={allItemsClosed() ? 'primary' : 'secondary'}
              >
                Finalize Shift Closing
              </Button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {shiftIslands.map(island => {
                  const pumps = state.assets.pumps.filter(pump => pump.islandId === island.id);
                  const products = shift.nonFuelProducts.filter(p => p.islandId === island.id);
                  const closedPumpCount = pumps.filter(pump => closedPumps.includes(pump.id)).length;
                  const closedProductCount = products.filter(product => closedProducts.includes(product.productId)).length;
                  
                  return (
                    <div key={island.id} className="border rounded-lg p-3">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{island.name}</h4>
                        <span className="font-medium">
                          {closedPumpCount}/{pumps.length} pumps
                          <br />
                          {closedProductCount}/{products.length} products
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Pumps:</span>
                          <span className={closedPumpCount === pumps.length ? 'text-green-600' : 'text-yellow-600'}>
                            {closedPumpCount}/{pumps.length}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Products:</span>
                          <span className={closedProductCount === products.length ? 'text-green-600' : 'text-yellow-600'}>
                            {closedProductCount}/{products.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ShiftCloseReconciliation;