import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Card, Input, Table, Tabs, Badge, Alert } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { 
  Droplets, Zap, Package, CreditCard, CheckCircle, AlertCircle,
  Save, Calendar, Users, Calculator, TrendingUp
} from 'lucide-react';
import clsx from 'clsx';

const CloseShiftModal = ({ shift, onClose }) => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('dips');
  const [tankReadings, setTankReadings] = useState({});
  const [pumpReadings, setPumpReadings] = useState({});
  const [nonFuelReadings, setNonFuelReadings] = useState({});
  const [collections, setCollections] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Get current station data
  const currentStation = state.currentStation?.id;
  const stationTanks = ((state.assets || {}).tanks || []).filter(t => t.stationId === currentStation);
  const stationPumps = ((state.assets || {}).pumps || []).filter(p => p.stationId === currentStation);
  const stationIslands = (state.islands || []).filter(i => i.stationId === currentStation);

  // Initialize data from shift
  useEffect(() => {
    if (shift) {
      // Initialize tank readings with opening data
      const initialTankReadings = {};
      stationTanks.forEach(tank => {
        const openingReading = shift.tankReadings?.find(tr => tr.tankId === tank.id);
        initialTankReadings[tank.id] = {
          openingDip: openingReading?.dipValue || 0,
          closingDip: '',
          temperature: 25.0
        };
      });
      setTankReadings(initialTankReadings);

      // Initialize pump readings with opening data
      const initialPumpReadings = {};
      stationPumps.forEach(pump => {
        const openingReading = shift.pumpReadings?.find(pr => pr.pumpId === pump.id);
        initialPumpReadings[pump.id] = {
          openingElectric: openingReading?.electricMeter || 0,
          openingManual: openingReading?.manualMeter || 0,
          openingCash: openingReading?.cashMeter || 0,
          closingElectric: '',
          closingManual: '',
          closingCash: ''
        };
      });
      setPumpReadings(initialPumpReadings);

      // Initialize collections
      const initialCollections = {};
      stationIslands.forEach(island => {
        const islandAttendants = shift.attendants?.filter(a => a.islandId === island.id) || [];
        initialCollections[island.id] = {
          attendants: islandAttendants,
          expected: 0, // Will be calculated from pump readings
          actualCash: 0,
          actualMobile: 0,
          actualCard: 0,
          actualDebt: 0,
          actualOther: 0
        };
      });
      setCollections(initialCollections);
    }
  }, [shift]);

  // Tabs configuration
  const tabs = [
    { id: 'dips', label: 'Tank Dips', icon: Droplets, required: true },
    { id: 'pumps', label: 'Pump Readings', icon: Zap, required: true },
    { id: 'nonfuel', label: 'Non-Fuel Closing', icon: Package, required: false },
    { id: 'collections', label: 'Collections', icon: CreditCard, required: true },
    { id: 'review', label: 'Review & Close', icon: CheckCircle, required: false }
  ];

  // Validation functions
  const isTabCompleted = (tabId) => {
    switch (tabId) {
      case 'dips':
        return stationTanks.every(tank => tankReadings[tank.id]?.closingDip !== '');
      
      case 'pumps':
        return stationPumps.every(pump => 
          pumpReadings[pump.id]?.closingElectric !== '' &&
          pumpReadings[pump.id]?.closingManual !== '' &&
          pumpReadings[pump.id]?.closingCash !== ''
        );
      
      case 'collections':
        return stationIslands.every(island => {
          const collection = collections[island.id];
          return collection && (
            collection.actualCash !== undefined &&
            collection.actualMobile !== undefined &&
            collection.actualCard !== undefined
          );
        });
      
      default:
        return true;
    }
  };

  const isShiftReadyToClose = () => {
    return tabs.filter(tab => tab.required).every(tab => isTabCompleted(tab.id));
  };

  // Calculate expected collections based on pump readings
  const calculateExpectedCollections = () => {
    const expected = {};
    
    stationIslands.forEach(island => {
      const islandPumps = stationPumps.filter(pump => pump.islandId === island.id);
      let islandTotal = 0;
      
      islandPumps.forEach(pump => {
        const reading = pumpReadings[pump.id];
        if (reading) {
          const volume = reading.closingElectric - reading.openingElectric;
          // Simple calculation - in real app, use price list
          islandTotal += volume * 150; // Assume 150 per liter
        }
      });
      
      expected[island.id] = islandTotal;
    });
    
    return expected;
  };

  // Handle shift closing
  const handleCloseShift = async () => {
    if (!isShiftReadyToClose()) return;
    
    setIsLoading(true);
    try {
      const closeData = {
        shiftId: shift.id,
        supervisorId: shift.supervisorId,
        tankReadings: Object.entries(tankReadings).map(([tankId, reading]) => ({
          tankId,
          dipValue: reading.closingDip,
          temperature: reading.temperature
        })),
        pumpReadings: Object.entries(pumpReadings).map(([pumpId, reading]) => ({
          pumpId,
          electricMeter: reading.closingElectric,
          manualMeter: reading.closingManual,
          cashMeter: reading.closingCash
        })),
        islandCollections: Object.entries(collections).map(([islandId, collection]) => ({
          islandId,
          attendantId: collection.attendants[0]?.id, // Simplified
          cash: collection.actualCash,
          mobileMoney: collection.actualMobile,
          visa: collection.actualCard / 2, // Simplified split
          mastercard: collection.actualCard / 2,
          debt: collection.actualDebt,
          other: collection.actualOther
        }))
      };

      // Call API here
      console.log('Closing shift with data:', closeData);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'success',
          title: 'Shift Closed',
          message: `Shift closed successfully`
        }
      });
      
      onClose();
      
    } catch (error) {
      console.error('Failed to close shift:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!shift) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Close Shift">
        <Alert type="error">Shift data not available</Alert>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={`Close Shift - ${shift.station?.name}`} size="4xl">
      <div className="space-y-6">
        {/* Shift Info Header */}
        <Card>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Supervisor</div>
              <div className="font-medium">{shift.supervisor?.name}</div>
            </div>
            <div>
              <div className="text-gray-600">Start Time</div>
              <div className="font-medium">{new Date(shift.startTime).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Duration</div>
              <div className="font-medium">
                {Math.round((new Date() - new Date(shift.startTime)) / (1000 * 60 * 60))} hours
              </div>
            </div>
            <div>
              <div className="text-gray-600">Attendants</div>
              <div className="font-medium">{shift.attendants?.length || 0}</div>
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div className="bg-gray-50 rounded-lg p-4">
          <Tabs
            tabs={tabs.map(tab => ({
              ...tab,
              badge: tab.required ? (isTabCompleted(tab.id) ? '✓' : '!') : undefined
            }))}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Tank Dips Tab */}
          {activeTab === 'dips' && (
            <Card title="Tank Dip Readings">
              <div className="space-y-4">
                <Alert type="info">
                  Record closing dip readings for all active tanks
                </Alert>
                
                <div className="grid gap-4">
                  {stationTanks.map(tank => (
                    <Card key={tank.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div>
                          <div className="font-medium">{tank.code}</div>
                          <div className="text-sm text-gray-600">{tank.productType}</div>
                          <div className="text-xs text-gray-500">
                            Opening: {tankReadings[tank.id]?.openingDip}L
                          </div>
                        </div>
                        
                        <Input
                          label="Closing Dip (L) *"
                          type="number"
                          value={tankReadings[tank.id]?.closingDip || ''}
                          onChange={e => setTankReadings(prev => ({
                            ...prev,
                            [tank.id]: {
                              ...prev[tank.id],
                              closingDip: parseFloat(e.target.value) || 0
                            }
                          }))}
                          min="0"
                        />
                        
                        <Input
                          label="Temperature (°C)"
                          type="number"
                          value={tankReadings[tank.id]?.temperature || ''}
                          onChange={e => setTankReadings(prev => ({
                            ...prev,
                            [tank.id]: {
                              ...prev[tank.id],
                              temperature: parseFloat(e.target.value) || 0
                            }
                          }))}
                        />
                        
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Difference</div>
                          <div className="font-medium">
                            {((tankReadings[tank.id]?.closingDip || 0) - (tankReadings[tank.id]?.openingDip || 0)).toFixed(1)}L
                          </div>
                        </div>
                        
                        <Badge 
                          variant={tankReadings[tank.id]?.closingDip !== '' ? "success" : "warning"}
                          className="justify-center"
                        >
                          {tankReadings[tank.id]?.closingDip !== '' ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Pump Readings Tab */}
          {activeTab === 'pumps' && (
            <Card title="Pump Meter Readings">
              <div className="space-y-6">
                {stationIslands.map(island => {
                  const islandPumps = stationPumps.filter(pump => pump.islandId === island.id);
                  return (
                    <div key={island.id} className="border rounded-lg">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white font-medium">
                        {island.name} - {islandPumps.length} Pumps
                      </div>
                      
                      <div className="p-4 space-y-4">
                        {islandPumps.map(pump => (
                          <div key={pump.id} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center p-3 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium">{pump.code}</div>
                              <div className="text-xs text-gray-600">{pump.productType}</div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-xs text-gray-600">Opening</div>
                              <div className="font-medium">{pumpReadings[pump.id]?.openingElectric}</div>
                            </div>
                            
                            <Input
                              label="Closing Electric"
                              type="number"
                              value={pumpReadings[pump.id]?.closingElectric || ''}
                              onChange={e => setPumpReadings(prev => ({
                                ...prev,
                                [pump.id]: {
                                  ...prev[pump.id],
                                  closingElectric: parseFloat(e.target.value) || 0
                                }
                              }))}
                              size="sm"
                            />
                            
                            <Input
                              label="Closing Manual"
                              type="number"
                              value={pumpReadings[pump.id]?.closingManual || ''}
                              onChange={e => setPumpReadings(prev => ({
                                ...prev,
                                [pump.id]: {
                                  ...prev[pump.id],
                                  closingManual: parseFloat(e.target.value) || 0
                                }
                              }))}
                              size="sm"
                            />
                            
                            <Input
                              label="Closing Cash"
                              type="number"
                              value={pumpReadings[pump.id]?.closingCash || ''}
                              onChange={e => setPumpReadings(prev => ({
                                ...prev,
                                [pump.id]: {
                                  ...prev[pump.id],
                                  closingCash: parseFloat(e.target.value) || 0
                                }
                              }))}
                              size="sm"
                            />
                            
                            <div className="text-center">
                              <div className="text-xs text-gray-600">Sales</div>
                              <div className="font-medium">
                                {((pumpReadings[pump.id]?.closingElectric || 0) - (pumpReadings[pump.id]?.openingElectric || 0)).toFixed(1)}L
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Collections Tab */}
          {activeTab === 'collections' && (
            <Card title="Island Collections">
              <div className="space-y-6">
                <Alert type="info">
                  Enter actual collections for each island. Expected amounts are calculated from pump readings.
                </Alert>
                
                {stationIslands.map(island => {
                  const islandCollections = collections[island.id] || {};
                  const expected = calculateExpectedCollections()[island.id] || 0;
                  const actual = (islandCollections.actualCash || 0) + 
                                (islandCollections.actualMobile || 0) + 
                                (islandCollections.actualCard || 0) + 
                                (islandCollections.actualDebt || 0) + 
                                (islandCollections.actualOther || 0);
                  const variance = actual - expected;
                  
                  return (
                    <div key={island.id} className="border rounded-lg">
                      <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 text-white font-medium">
                        {island.name} - Expected: {expected.toLocaleString()}
                      </div>
                      
                      <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-4">
                        <Input
                          label="Cash Collected"
                          type="number"
                          value={islandCollections.actualCash || ''}
                          onChange={e => setCollections(prev => ({
                            ...prev,
                            [island.id]: {
                              ...prev[island.id],
                              actualCash: parseFloat(e.target.value) || 0
                            }
                          }))}
                        />
                        
                        <Input
                          label="Mobile Money"
                          type="number"
                          value={islandCollections.actualMobile || ''}
                          onChange={e => setCollections(prev => ({
                            ...prev,
                            [island.id]: {
                              ...prev[island.id],
                              actualMobile: parseFloat(e.target.value) || 0
                            }
                          }))}
                        />
                        
                        <Input
                          label="Card Payments"
                          type="number"
                          value={islandCollections.actualCard || ''}
                          onChange={e => setCollections(prev => ({
                            ...prev,
                            [island.id]: {
                              ...prev[island.id],
                              actualCard: parseFloat(e.target.value) || 0
                            }
                          }))}
                        />
                        
                        <Input
                          label="Debt Collections"
                          type="number"
                          value={islandCollections.actualDebt || ''}
                          onChange={e => setCollections(prev => ({
                            ...prev,
                            [island.id]: {
                              ...prev[island.id],
                              actualDebt: parseFloat(e.target.value) || 0
                            }
                          }))}
                        />
                        
                        <Input
                          label="Other Payments"
                          type="number"
                          value={islandCollections.actualOther || ''}
                          onChange={e => setCollections(prev => ({
                            ...prev,
                            [island.id]: {
                              ...prev[island.id],
                              actualOther: parseFloat(e.target.value) || 0
                            }
                          }))}
                        />
                        
                        <div className="space-y-2">
                          <div className="text-sm">
                            <div>Total: {actual.toLocaleString()}</div>
                            <div className={clsx(
                              "font-medium",
                              variance >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              Variance: {variance.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Review Tab */}
          {activeTab === 'review' && (
            <Card title="Review & Close Shift">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Validation Status</h4>
                    <div className="space-y-2">
                      {tabs.filter(tab => tab.required).map(tab => (
                        <div key={tab.id} className="flex items-center">
                          {isTabCompleted(tab.id) ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                          )}
                          <span className={isTabCompleted(tab.id) ? "text-gray-700" : "text-gray-400"}>
                            {tab.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Shift Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Sales (Expected):</span>
                        <span>{Object.values(calculateExpectedCollections()).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Collections:</span>
                        <span>
                          {stationIslands.reduce((total, island) => {
                            const coll = collections[island.id] || {};
                            return total + (coll.actualCash || 0) + (coll.actualMobile || 0) + 
                                   (coll.actualCard || 0) + (coll.actualDebt || 0) + (coll.actualOther || 0);
                          }, 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overall Variance:</span>
                        <span className={clsx(
                          "font-medium",
                          Object.values(calculateExpectedCollections()).reduce((a, b) => a + b, 0) <= 
                          stationIslands.reduce((total, island) => {
                            const coll = collections[island.id] || {};
                            return total + (coll.actualCash || 0) + (coll.actualMobile || 0) + 
                                   (coll.actualCard || 0) + (coll.actualDebt || 0) + (coll.actualOther || 0);
                          }, 0) ? "text-green-600" : "text-red-600"
                        )}>
                          {(
                            stationIslands.reduce((total, island) => {
                              const coll = collections[island.id] || {};
                              return total + (coll.actualCash || 0) + (coll.actualMobile || 0) + 
                                     (coll.actualCard || 0) + (coll.actualDebt || 0) + (coll.actualOther || 0);
                            }, 0) - Object.values(calculateExpectedCollections()).reduce((a, b) => a + b, 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {!isShiftReadyToClose() && (
                  <Alert type="warning">
                    Please complete all required sections (marked with !) before closing the shift.
                  </Alert>
                )}

                <div className="flex justify-end space-x-3">
                  <Button variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCloseShift}
                    disabled={!isShiftReadyToClose() || isLoading}
                    loading={isLoading}
                    icon={Save}
                    variant="danger"
                  >
                    Close Shift
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CloseShiftModal;