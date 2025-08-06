import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Input, Card } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { formatCurrency } from '../../../../utils/helpers';
import { Zap, ChevronLeft } from 'lucide-react';

const ShiftCloseReconciliation = ({ shift, onClose }) => {
  const { state } = useApp();
  const [pumpReadings, setPumpReadings] = useState({});
  const [currentPump, setCurrentPump] = useState(null);
  const [currentIsland, setCurrentIsland] = useState(null);
  const [closedPumps, setClosedPumps] = useState([]);
  
  // Get islands for this shift
  const shiftIslands = state.islands.filter(island => 
    shift.islands?.includes(island.id)
  );
  
  // Get pumps for current island
  const islandPumps = currentIsland 
    ? state.assets.pumps.filter(pump => pump.islandId === currentIsland.id)
    : [];

  // Initialize pump readings
  useEffect(() => {
    const initialReadings = {};
    
    // Initialize readings for all pumps in all islands
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
    
    setPumpReadings(initialReadings);
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

  // Finalize shift closing
  const handleFinalizeShift = () => {
    // Prepare shift closing data
    const closingData = {
      closedAt: new Date().toISOString(),
      islands: shiftIslands.map(island => {
        const pumps = state.assets.pumps.filter(pump => pump.islandId === island.id);
        return {
          islandId: island.id,
          pumps: pumps.map(pump => {
            const readings = pumpReadings[pump.id] || {};
            return {
              pumpId: pump.id,
              readings,
              expected: calculateExpected(pump.id)
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

  // Check if all pumps are closed
  const allPumpsClosed = shiftIslands.reduce((total, island) => {
    const pumps = state.assets.pumps.filter(pump => pump.islandId === island.id);
    return total + pumps.length;
  }, 0) === closedPumps.length;

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
                const closedCount = pumps.filter(pump => closedPumps.includes(pump.id)).length;
                
                return (
                  <Card 
                    key={island.id}
                    className={`cursor-pointer transition-all ${
                      currentIsland?.id === island.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setCurrentIsland(island)}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{island.name}</h4>
                      <Badge variant={closedCount === pumps.length ? 'success' : 'warning'}>
                        {closedCount}/{pumps.length} pumps
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {pumps.length} pumps to reconcile
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Pump selection */}
        {currentIsland && !currentPump && (
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
                Pumps at {currentIsland.name}
              </h3>
            </div>
            
            <Table
              columns={[
                { header: 'Pump', accessor: 'code' },
                { header: 'Status', accessor: 'status' },
                { header: 'Actions', accessor: 'actions' }
              ]}
              data={islandPumps.map(pump => {
                const isClosed = closedPumps.includes(pump.id);
                const readings = pumpReadings[pump.id] || {};
                
                return {
                  id: pump.id,
                  code: pump.code,
                  status: isClosed ? (
                    <Badge variant="success">Completed</Badge>
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
                Back
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
        
        {/* Final shift closing */}
        {!currentIsland && !currentPump && (
          <div className="pt-6 border-t">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-medium">Shift Closing Summary</h3>
                <p className="text-sm text-gray-600">
                  {closedPumps.length} pumps reconciled across {shiftIslands.length} islands
                </p>
              </div>
              
              <Button 
                onClick={handleFinalizeShift}
                disabled={!allPumpsClosed}
                variant={allPumpsClosed ? 'primary' : 'secondary'}
              >
                Finalize Shift Closing
              </Button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {shiftIslands.map(island => {
                  const pumps = state.assets.pumps.filter(pump => pump.islandId === island.id);
                  const closedCount = pumps.filter(pump => closedPumps.includes(pump.id)).length;
                  const progress = pumps.length > 0 ? Math.round((closedCount / pumps.length) * 100) : 0;
                  
                  return (
                    <div key={island.id} className="border rounded-lg p-3">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{island.name}</h4>
                        <span className={`font-medium ${
                          closedCount === pumps.length ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {closedCount}/{pumps.length}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`h-2 rounded-full ${
                            closedCount === pumps.length ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        ></div>
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