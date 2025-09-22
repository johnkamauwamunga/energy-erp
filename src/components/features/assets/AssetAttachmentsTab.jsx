import React, { useState, useEffect } from 'react';
import { Button, Card, Select, LoadingSpinner, Modal } from '../../ui';
import { useApp } from '../../../context/AppContext';
import { Fuel, Zap, X, Link, MapPin, RefreshCw, AlertCircle, Unlink } from 'lucide-react';
import { stationService } from '../../../services/stationService/stationService';
import { assetService } from '../../../services/assetService/assetService';
import { assetConnectionService } from '../../../services/assetConnectionService/assetConnectionService';
import clsx from 'clsx';

const AssetConnectionsTab = ({ onRefreshAssets }) => {
  const { state, dispatch } = useApp();
  const [selectedStation, setSelectedStation] = useState(null);
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationError, setStationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connections, setConnections] = useState([]);
  const [activeTab, setActiveTab] = useState('tank-pump');
  const [connectionModal, setConnectionModal] = useState({
    isOpen: false,
    type: null,
    sourceAsset: null,
    targetAssets: []
  });

  // Load stations
  const loadStations = async () => {
    try {
      setLoadingStations(true);
      setStationError('');
      const response = await stationService.getCompanyStations();
      if (response) {
        setStations(response);
      } else {
        setStationError('Failed to load stations');
      }
    } catch (err) {
      console.error('❌ Failed to fetch stations:', err);
      setStationError(err.message || 'Failed to fetch stations');
    } finally {
      setLoadingStations(false);
    }
  };

  // Load connections for selected station
  const loadConnections = async () => {
    if (!selectedStation) return;
    
    try {
      setLoading(true);
      const response = await assetConnectionService.getStationConnections(selectedStation.id);
      console.log("loading station ",response);
      setConnections(response.data || []);
    } catch (err) {
      console.error('Failed to load connections:', err);
      setError(err.message || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      loadConnections();
    }
  }, [selectedStation]);

  // Get assets by type
  const stationTanks = state.assets?.filter(a => a.type === 'STORAGE_TANK' && a.stationId === selectedStation?.id) || [];
  const stationPumps = state.assets?.filter(a => a.type === 'FUEL_PUMP' && a.stationId === selectedStation?.id) || [];
  const stationIslands = state.assets?.filter(a => a.type === 'ISLAND' && a.stationId === selectedStation?.id) || [];

  // Get connections by type
  const tankPumpConnections = connections.filter(c => c.type === 'TANK_TO_PUMP');
  const tankIslandConnections = connections.filter(c => c.type === 'TANK_TO_ISLAND');
  const pumpIslandConnections = connections.filter(c => c.type === 'PUMP_TO_ISLAND');

  // Group connections by source asset for easier display
  const groupedTankPumpConnections = {};
  tankPumpConnections.forEach(conn => {
    const tankId = conn.assetA.type === 'STORAGE_TANK' ? conn.assetAId : conn.assetBId;
    const pumpId = conn.assetA.type === 'FUEL_PUMP' ? conn.assetAId : conn.assetBId;
    
    if (!groupedTankPumpConnections[tankId]) {
      groupedTankPumpConnections[tankId] = [];
    }
    groupedTankPumpConnections[tankId].push(pumpId);
  });

  const groupedTankIslandConnections = {};
  tankIslandConnections.forEach(conn => {
    const tankId = conn.assetA.type === 'STORAGE_TANK' ? conn.assetAId : conn.assetBId;
    const islandId = conn.assetA.type === 'ISLAND' ? conn.assetAId : conn.assetBId;
    
    if (!groupedTankIslandConnections[islandId]) {
      groupedTankIslandConnections[islandId] = [];
    }
    groupedTankIslandConnections[islandId].push(tankId);
  });

  const groupedPumpIslandConnections = {};
  pumpIslandConnections.forEach(conn => {
    const pumpId = conn.assetA.type === 'FUEL_PUMP' ? conn.assetAId : conn.assetBId;
    const islandId = conn.assetA.type === 'ISLAND' ? conn.assetAId : conn.assetBId;
    
    if (!groupedPumpIslandConnections[islandId]) {
      groupedPumpIslandConnections[islandId] = [];
    }
    groupedPumpIslandConnections[islandId].push(pumpId);
  });

  // Get unconnected assets
  const getUnconnectedPumps = () => {
    const connectedPumpIds = new Set(tankPumpConnections.flatMap(conn => 
      [conn.assetAId, conn.assetBId].filter(id => 
        state.assets?.find(a => a.id === id)?.type === 'FUEL_PUMP'
      )
    ));
    
    return stationPumps.filter(pump => !connectedPumpIds.has(pump.id));
  };

  const getUnconnectedTanks = () => {
    const connectedTankIds = new Set(tankPumpConnections.flatMap(conn => 
      [conn.assetAId, conn.assetBId].filter(id => 
        state.assets?.find(a => a.id === id)?.type === 'STORAGE_TANK'
      )
    ));
    
    return stationTanks.filter(tank => !connectedTankIds.has(tank.id));
  };

  const openConnectionModal = (type, sourceAsset) => {
    setConnectionModal({
      isOpen: true,
      type,
      sourceAsset,
      targetAssets: []
    });
  };

  const closeConnectionModal = () => {
    setConnectionModal({
      isOpen: false,
      type: null,
      sourceAsset: null,
      targetAssets: []
    });
  };

  const handleTargetAssetSelection = (assetId, checked) => {
    setConnectionModal(prev => ({
      ...prev,
      targetAssets: checked 
        ? [...prev.targetAssets, assetId]
        : prev.targetAssets.filter(id => id !== assetId)
    }));
  };

  const createConnections = async () => {
    if (!connectionModal.sourceAsset || connectionModal.targetAssets.length === 0) return;
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const { type, sourceAsset, targetAssets } = connectionModal;
      
      // Create connections based on type
      const connectionPromises = targetAssets.map(targetAssetId => {
        let assetAId, assetBId;
        
        if (type === 'TANK_TO_PUMP') {
          assetAId = sourceAsset.id; // Tank
          assetBId = targetAssetId;  // Pump
        } else if (type === 'TANK_TO_ISLAND') {
          assetAId = sourceAsset.id; // Tank
          assetBId = targetAssetId;  // Island
        } else if (type === 'PUMP_TO_ISLAND') {
          assetAId = sourceAsset.id; // Pump
          assetBId = targetAssetId;  // Island
        }
        
        return assetConnectionService.createConnection(selectedStation.id, {
          type,
          assetAId,
          assetBId
        });
      });
      
      await Promise.all(connectionPromises);
      setSuccess(`Successfully created ${targetAssets.length} connections`);
      closeConnectionModal();
      loadConnections();
    } catch (err) {
      console.error('Failed to create connections:', err);
      setError(err.message || 'Failed to create connections');
    } finally {
      setLoading(false);
    }
  };

  const disconnectAssets = async (connectionId) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await assetConnectionService.deleteConnection(connectionId);
      setSuccess('Connection successfully removed');
      loadConnections();
    } catch (err) {
      console.error('Failed to disconnect assets:', err);
      setError(err.message || 'Failed to disconnect assets');
    } finally {
      setLoading(false);
    }
  };

  const findConnectionId = (type, assetAId, assetBId) => {
    return connections.find(conn => 
      conn.type === type && 
      ((conn.assetAId === assetAId && conn.assetBId === assetBId) ||
       (conn.assetAId === assetBId && conn.assetBId === assetAId))
    )?.id;
  };

  // Render connection section based on type
  const renderTankPumpSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Connected Tanks and Pumps */}
      <div>
        <h3 className="font-medium mb-4 flex items-center">
          <Fuel className="w-5 h-5 mr-2 text-blue-500" />
          Tanks with Pump Connections
        </h3>
        
        {stationTanks.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No tanks available at this station</p>
        ) : (
          <div className="space-y-4">
            {stationTanks.map(tank => (
              <Card key={tank.id} className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">{tank.name}</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openConnectionModal('TANK_TO_PUMP', tank)}
                  >
                    <Link className="w-4 h-4 mr-1" />
                    Connect Pumps
                  </Button>
                </div>
                
                {groupedTankPumpConnections[tank.id]?.length > 0 ? (
                  <div className="space-y-2">
                    {groupedTankPumpConnections[tank.id].map(pumpId => {
                      const pump = state.assets?.find(a => a.id === pumpId);
                      if (!pump) return null;
                      
                      const connectionId = findConnectionId('TANK_TO_PUMP', tank.id, pumpId);
                      
                      return (
                        <div key={pumpId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{pump.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => disconnectAssets(connectionId)}
                            title="Disconnect pump"
                          >
                            <Unlink className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm py-2">No pumps connected to this tank</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Unconnected Pumps */}
      <div>
        <h3 className="font-medium mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          Unconnected Pumps
        </h3>
        
        {getUnconnectedPumps().length === 0 ? (
          <p className="text-gray-500 text-sm py-4">All pumps are connected to tanks</p>
        ) : (
          <div className="space-y-2">
            {getUnconnectedPumps().map(pump => (
              <div key={pump.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <span>{pump.name}</span>
                <span className="text-sm text-gray-500">Not connected</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderTankIslandSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Islands with Tank Connections */}
      <div>
        <h3 className="font-medium mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-green-500" />
          Islands with Tank Connections
        </h3>
        
        {stationIslands.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No islands available at this station</p>
        ) : (
          <div className="space-y-4">
            {stationIslands.map(island => (
              <Card key={island.id} className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">{island.name}</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openConnectionModal('TANK_TO_ISLAND', island)}
                  >
                    <Link className="w-4 h-4 mr-1" />
                    Connect Tanks
                  </Button>
                </div>
                
                {groupedTankIslandConnections[island.id]?.length > 0 ? (
                  <div className="space-y-2">
                    {groupedTankIslandConnections[island.id].map(tankId => {
                      const tank = state.assets?.find(a => a.id === tankId);
                      if (!tank) return null;
                      
                      const connectionId = findConnectionId('TANK_TO_ISLAND', island.id, tankId);
                      
                      return (
                        <div key={tankId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{tank.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => disconnectAssets(connectionId)}
                            title="Disconnect tank"
                          >
                            <Unlink className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm py-2">No tanks connected to this island</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Unconnected Tanks */}
      <div>
        <h3 className="font-medium mb-4 flex items-center">
          <Fuel className="w-5 h-5 mr-2 text-blue-500" />
          Unconnected Tanks
        </h3>
        
        {getUnconnectedTanks().length === 0 ? (
          <p className="text-gray-500 text-sm py-4">All tanks are connected to islands</p>
        ) : (
          <div className="space-y-2">
            {getUnconnectedTanks().map(tank => (
              <div key={tank.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <span>{tank.name}</span>
                <span className="text-sm text-gray-500">Not connected</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPumpIslandSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Islands with Pump Connections */}
      <div>
        <h3 className="font-medium mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-green-500" />
          Islands with Pump Connections
        </h3>
        
        {stationIslands.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No islands available at this station</p>
        ) : (
          <div className="space-y-4">
            {stationIslands.map(island => (
              <Card key={island.id} className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">{island.name}</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openConnectionModal('PUMP_TO_ISLAND', island)}
                  >
                    <Link className="w-4 h-4 mr-1" />
                    Connect Pumps
                  </Button>
                </div>
                
                {groupedPumpIslandConnections[island.id]?.length > 0 ? (
                  <div className="space-y-2">
                    {groupedPumpIslandConnections[island.id].map(pumpId => {
                      const pump = state.assets?.find(a => a.id === pumpId);
                      if (!pump) return null;
                      
                      const connectionId = findConnectionId('PUMP_TO_ISLAND', island.id, pumpId);
                      
                      return (
                        <div key={pumpId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{pump.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => disconnectAssets(connectionId)}
                            title="Disconnect pump"
                          >
                            <Unlink className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm py-2">No pumps connected to this island</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Unconnected Pumps */}
      <div>
        <h3 className="font-medium mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          Unconnected Pumps
        </h3>
        
        {stationPumps.filter(pump => {
          // Filter out pumps that are already connected to an island
          const connectedToIsland = pumpIslandConnections.some(conn => 
            conn.assetAId === pump.id || conn.assetBId === pump.id
          );
          return !connectedToIsland;
        }).length === 0 ? (
          <p className="text-gray-500 text-sm py-4">All pumps are connected to islands</p>
        ) : (
          <div className="space-y-2">
            {stationPumps.filter(pump => {
              const connectedToIsland = pumpIslandConnections.some(conn => 
                conn.assetAId === pump.id || conn.assetBId === pump.id
              );
              return !connectedToIsland;
            }).map(pump => (
              <div key={pump.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <span>{pump.name}</span>
                <span className="text-sm text-gray-500">Not connected to island</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Get available target assets based on connection type
  const getAvailableTargetAssets = () => {
    const { type, sourceAsset } = connectionModal;
    
    if (!type || !sourceAsset) return [];
    
    if (type === 'TANK_TO_PUMP') {
      // For TANK_TO_PUMP, show unconnected pumps
      return getUnconnectedPumps();
    } else if (type === 'TANK_TO_ISLAND') {
      // For TANK_TO_ISLAND, show unconnected tanks
      return getUnconnectedTanks();
    } else if (type === 'PUMP_TO_ISLAND') {
      // For PUMP_TO_ISLAND, show pumps not connected to this island
      return stationPumps.filter(pump => {
        const alreadyConnected = groupedPumpIslandConnections[sourceAsset.id]?.includes(pump.id);
        return !alreadyConnected;
      });
    }
    
    return [];
  };

  return (
    <div className="space-y-6">
      <Card title="Select Station" className="mb-6">
        <Select
          label="Service Station"
          options={stations.map(station => ({
            value: station.id,
            label: station.name
          }))}
          value={selectedStation?.id || ''}
          onChange={(e) => {
            const stationId = e.target.value;
            const station = stations.find(s => s.id === stationId);
            setSelectedStation(station || null);
            setError('');
            setSuccess('');
          }}
          placeholder="Select a station"
          disabled={loadingStations}
        />
        {loadingStations && <div className="mt-2"><LoadingSpinner size="sm" /> Loading stations...</div>}
        {stationError && <div className="mt-2 text-red-500 text-sm">{stationError}</div>}
      </Card>
      
      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-100 text-green-700 rounded-lg flex items-center">
          <span className="mr-2">✅</span>
          {success}
        </div>
      )}
      
      {selectedStation ? (
        <>
          {/* Connection Type Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('tank-pump')}
                className={clsx(
                  "py-4 px-1 border-b-2 font-medium text-sm",
                  activeTab === 'tank-pump'
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Fuel className="w-4 h-4 inline mr-1" />
                <Zap className="w-4 h-4 inline mr-1" />
                Tank-Pump Connections
              </button>
              <button
                onClick={() => setActiveTab('tank-island')}
                className={clsx(
                  "py-4 px-1 border-b-2 font-medium text-sm",
                  activeTab === 'tank-island'
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Fuel className="w-4 h-4 inline mr-1" />
                <MapPin className="w-4 h-4 inline mr-1" />
                Tank-Island Connections
              </button>
              <button
                onClick={() => setActiveTab('pump-island')}
                className={clsx(
                  "py-4 px-1 border-b-2 font-medium text-sm",
                  activeTab === 'pump-island'
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Zap className="w-4 h-4 inline mr-1" />
                <MapPin className="w-4 h-4 inline mr-1" />
                Pump-Island Connections
              </button>
            </nav>
          </div>
          
          {/* Connection Content */}
          <div className="mt-6">
            {activeTab === 'tank-pump' && renderTankPumpSection()}
            {activeTab === 'tank-island' && renderTankIslandSection()}
            {activeTab === 'pump-island' && renderPumpIslandSection()}
          </div>
          
          {/* Connection Modal */}
          <Modal
            isOpen={connectionModal.isOpen}
            onClose={closeConnectionModal}
            title={`Connect ${connectionModal.sourceAsset?.name} to ${connectionModal.type === 'TANK_TO_PUMP' ? 'Pumps' : connectionModal.type === 'TANK_TO_ISLAND' ? 'Tanks' : 'Pumps'}`}
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select {connectionModal.type === 'TANK_TO_PUMP' ? 'pumps' : connectionModal.type === 'TANK_TO_ISLAND' ? 'tanks' : 'pumps'} to connect to {connectionModal.sourceAsset?.name}
              </p>
              
              <div className="max-h-64 overflow-y-auto border rounded-lg p-2">
                {getAvailableTargetAssets().length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No available assets to connect</p>
                ) : (
                  getAvailableTargetAssets().map(asset => (
                    <div key={asset.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        id={`asset-${asset.id}`}
                        checked={connectionModal.targetAssets.includes(asset.id)}
                        onChange={(e) => handleTargetAssetSelection(asset.id, e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor={`asset-${asset.id}`} className="flex-1 cursor-pointer">
                        {asset.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={closeConnectionModal}>
                  Cancel
                </Button>
                <Button 
                  onClick={createConnections} 
                  disabled={connectionModal.targetAssets.length === 0 || loading}
                >
                  {loading ? <LoadingSpinner size="sm" className="mr-2" /> : <Link className="w-4 h-4 mr-2" />}
                  Create {connectionModal.targetAssets.length} Connection(s)
                </Button>
              </div>
            </div>
          </Modal>
        </>
      ) : (
        <Card>
          <div className="text-center py-10">
            <div className="text-gray-400 mb-2">Select a station to manage asset connections</div>
            <div className="text-sm text-gray-500">
              Connect tanks to pumps, tanks to islands, and pumps to islands for operational management
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AssetConnectionsTab;