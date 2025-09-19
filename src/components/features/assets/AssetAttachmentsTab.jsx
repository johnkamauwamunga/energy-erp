import React, { useState, useEffect } from 'react';
import { Button, Card, Select } from '../../ui';
import { useApp } from '../../../context/AppContext';
import { attachAssetToStation, detachAssetFromStation } from '../../../context/AppContext/actions';
import { Fuel, Zap, X, Link, Warehouse, MapPin } from 'lucide-react';
import { stationService } from '../../../services/stationService/stationService';
import clsx from 'clsx';

const AssetAttachmentsTab = () => {
  const { state, dispatch } = useApp();
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedAssets, setSelectedAssets] = useState({
    tanks: [],
    pumps: [],
    islands: [],
    warehouses: []
  });

  // Load stations
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationError, setStationError] = useState('');

  const loadStations = async () => {
    try {
      setLoadingStations(true);
      setStationError('');

      // Fetch stations for the company
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

  useEffect(() => {
    loadStations();
  }, []);

  // Get unattached assets
  const unattachedTanks = state.assets?.filter(a => a.type === 'STORAGE_TANK' && !a.stationId) || [];
  const unattachedPumps = state.assets?.filter(a => a.type === 'FUEL_PUMP' && !a.stationId) || [];
  const unattachedIslands = state.assets?.filter(a => a.type === 'ISLAND' && !a.stationId) || [];
  const unattachedWarehouses = state.assets?.filter(a => a.type === 'WAREHOUSE' && !a.stationId) || [];

  // Get assets attached to selected station
  const stationTanks = state.assets?.filter(a => a.type === 'STORAGE_TANK' && a.stationId === selectedStation?.id) || [];
  const stationPumps = state.assets?.filter(a => a.type === 'FUEL_PUMP' && a.stationId === selectedStation?.id) || [];
  const stationIslands = state.assets?.filter(a => a.type === 'ISLAND' && a.stationId === selectedStation?.id) || [];
  const stationWarehouses = state.assets?.filter(a => a.type === 'WAREHOUSE' && a.stationId === selectedStation?.id) || [];

  const handleAttachAsset = (assetId, assetType) => {
    if (!selectedStation) return;
    
    // Toggle selection
    setSelectedAssets(prev => ({
      ...prev,
      [assetType]: prev[assetType].includes(assetId)
        ? prev[assetType].filter(id => id !== assetId)
        : [...prev[assetType], assetId]
    }));
  };
  
  const handleBulkAttach = () => {
    if (!selectedStation) return;
    
    // Attach all selected assets
    selectedAssets.tanks.forEach(assetId => {
      dispatch(attachAssetToStation(selectedStation.id, assetId, 'tanks'));
    });
    
    selectedAssets.pumps.forEach(assetId => {
      dispatch(attachAssetToStation(selectedStation.id, assetId, 'pumps'));
    });
    
    selectedAssets.islands.forEach(assetId => {
      dispatch(attachAssetToStation(selectedStation.id, assetId, 'islands'));
    });
    
    selectedAssets.warehouses.forEach(assetId => {
      dispatch(attachAssetToStation(selectedStation.id, assetId, 'warehouses'));
    });
    
    // Clear selection
    setSelectedAssets({ tanks: [], pumps: [], islands: [], warehouses: [] });
  };
  
  const handleDetachAsset = (assetId, assetType) => {
    dispatch(detachAssetFromStation(assetId, assetType));
  };

  // Check if any assets are selected
  const hasSelectedAssets = 
    selectedAssets.tanks.length > 0 || 
    selectedAssets.pumps.length > 0 || 
    selectedAssets.islands.length > 0 || 
    selectedAssets.warehouses.length > 0;

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
            setSelectedAssets({ tanks: [], pumps: [], islands: [], warehouses: [] }); // Clear selection
          }}
          placeholder="Select a station"
        />
      </Card>
      
      {selectedStation ? (
        <>
          {/* Bulk Attach Button */}
          <div className="flex justify-end mb-4">
            <Button
              variant="cosmic"
              icon={Link}
              onClick={handleBulkAttach}
              disabled={!hasSelectedAssets}
              className="transition-all"
            >
              Attach Selected Assets (
              {selectedAssets.tanks.length + 
               selectedAssets.pumps.length + 
               selectedAssets.islands.length + 
               selectedAssets.warehouses.length})
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Unattached Tanks */}
            <Card title="Available Tanks" icon={Fuel}>
              <div className="space-y-2 max-h-96 overflow-y-auto p-2">
                {unattachedTanks.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No unattached tanks</p>
                ) : (
                  unattachedTanks.map(tank => (
                    <div 
                      key={tank.id} 
                      className={clsx(
                        "flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all",
                        selectedAssets.tanks.includes(tank.id)
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-50 hover:bg-gray-100"
                      )}
                      onClick={() => handleAttachAsset(tank.id, 'tanks')}
                    >
                      <div>
                        <div className="font-medium">{tank.name}</div>
                        <div className="text-sm text-gray-500">
                          {tank.type} · {tank.productType}
                        </div>
                      </div>
                      <div className="flex items-center">
                        {selectedAssets.tanks.includes(tank.id) && (
                          <span className="text-blue-500 mr-2">Selected</span>
                        )}
                        <Button 
                          size="sm" 
                          variant={selectedAssets.tanks.includes(tank.id) ? "primary" : "outline"}
                        >
                          {selectedAssets.tanks.includes(tank.id) ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            
            {/* Unattached Pumps */}
            <Card title="Available Pumps" icon={Zap}>
              <div className="space-y-2 max-h-96 overflow-y-auto p-2">
                {unattachedPumps.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No unattached pumps</p>
                ) : (
                  unattachedPumps.map(pump => (
                    <div 
                      key={pump.id} 
                      className={clsx(
                        "flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all",
                        selectedAssets.pumps.includes(pump.id)
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-50 hover:bg-gray-100"
                      )}
                      onClick={() => handleAttachAsset(pump.id, 'pumps')}
                    >
                      <div>
                        <div className="font-medium">{pump.name}</div>
                        <div className="text-sm text-gray-500">Pump</div>
                      </div>
                      <div className="flex items-center">
                        {selectedAssets.pumps.includes(pump.id) && (
                          <span className="text-blue-500 mr-2">Selected</span>
                        )}
                        <Button 
                          size="sm" 
                          variant={selectedAssets.pumps.includes(pump.id) ? "primary" : "outline"}
                        >
                          {selectedAssets.pumps.includes(pump.id) ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            
            {/* Unattached Islands */}
            <Card title="Available Islands" icon={MapPin}>
              <div className="space-y-2 max-h-96 overflow-y-auto p-2">
                {unattachedIslands.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No unattached islands</p>
                ) : (
                  unattachedIslands.map(island => (
                    <div 
                      key={island.id} 
                      className={clsx(
                        "flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all",
                        selectedAssets.islands.includes(island.id)
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-50 hover:bg-gray-100"
                      )}
                      onClick={() => handleAttachAsset(island.id, 'islands')}
                    >
                      <div>
                        <div className="font-medium">{island.name}</div>
                        <div className="text-sm text-gray-500">
                          Island · {island.code}
                        </div>
                      </div>
                      <div className="flex items-center">
                        {selectedAssets.islands.includes(island.id) && (
                          <span className="text-blue-500 mr-2">Selected</span>
                        )}
                        <Button 
                          size="sm" 
                          variant={selectedAssets.islands.includes(island.id) ? "primary" : "outline"}
                        >
                          {selectedAssets.islands.includes(island.id) ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            
            {/* Unattached Warehouses */}
            <Card title="Available Warehouses" icon={Warehouse}>
              <div className="space-y-2 max-h-96 overflow-y-auto p-2">
                {unattachedWarehouses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No unattached warehouses</p>
                ) : (
                  unattachedWarehouses.map(warehouse => (
                    <div 
                      key={warehouse.id} 
                      className={clsx(
                        "flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all",
                        selectedAssets.warehouses.includes(warehouse.id)
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-50 hover:bg-gray-100"
                      )}
                      onClick={() => handleAttachAsset(warehouse.id, 'warehouses')}
                    >
                      <div>
                        <div className="font-medium">{warehouse.name}</div>
                        <div className="text-sm text-gray-500">Warehouse</div>
                      </div>
                      <div className="flex items-center">
                        {selectedAssets.warehouses.includes(warehouse.id) && (
                          <span className="text-blue-500 mr-2">Selected</span>
                        )}
                        <Button 
                          size="sm" 
                          variant={selectedAssets.warehouses.includes(warehouse.id) ? "primary" : "outline"}
                        >
                          {selectedAssets.warehouses.includes(warehouse.id) ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
          
          {/* Attached Assets */}
          <Card 
            title={`Attached to ${selectedStation.name || selectedStation.code || 'Station'}`}
            headerClass="bg-blue-50"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Attached Tanks */}
              <div>
                <h3 className="font-medium mb-2 flex items-center">
                  <Fuel className="w-4 h-4 mr-2 text-blue-500" />
                  Tanks ({stationTanks.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stationTanks.length === 0 ? (
                    <p className="text-gray-500 text-sm">No tanks attached</p>
                  ) : (
                    stationTanks.map(tank => (
                      <div 
                        key={tank.id} 
                        className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{tank.name}</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDetachAsset(tank.id, 'tanks')}
                          title="Detach tank"
                          className="p-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Attached Pumps */}
              <div>
                <h3 className="font-medium mb-2 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                  Pumps ({stationPumps.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stationPumps.length === 0 ? (
                    <p className="text-gray-500 text-sm">No pumps attached</p>
                  ) : (
                    stationPumps.map(pump => (
                      <div 
                        key={pump.id} 
                        className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{pump.name}</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDetachAsset(pump.id, 'pumps')}
                          title="Detach pump"
                          className="p-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Attached Islands */}
              <div>
                <h3 className="font-medium mb-2 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-green-500" />
                  Islands ({stationIslands.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stationIslands.length === 0 ? (
                    <p className="text-gray-500 text-sm">No islands attached</p>
                  ) : (
                    stationIslands.map(island => (
                      <div 
                        key={island.id} 
                        className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{island.name}</div>
                          <div className="text-sm text-gray-500">{island.code}</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDetachAsset(island.id, 'islands')}
                          title="Detach island"
                          className="p-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Attached Warehouses */}
              <div>
                <h3 className="font-medium mb-2 flex items-center">
                  <Warehouse className="w-4 h-4 mr-2 text-purple-500" />
                  Warehouses ({stationWarehouses.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stationWarehouses.length === 0 ? (
                    <p className="text-gray-500 text-sm">No warehouses attached</p>
                  ) : (
                    stationWarehouses.map(warehouse => (
                      <div 
                        key={warehouse.id} 
                        className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{warehouse.name}</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDetachAsset(warehouse.id, 'warehouses')}
                          title="Detach warehouse"
                          className="p-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <div className="text-center py-10">
            <div className="text-gray-400 mb-2">Select a station to manage its assets</div>
            <div className="text-sm text-gray-500">
              Attach tanks, pumps, islands, and warehouses to service stations for operational management
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AssetAttachmentsTab;