import React, { useState, useEffect } from 'react';
import { Button, Card, Select } from '../../ui';
import { useApp } from '../../../context/AppContext';
import { attachAssetToStation, detachAssetFromStation } from '../../../context/AppContext/actions';
import { Fuel, Zap, X, Link } from 'lucide-react';
import { stationService } from '../../../services/stationService/stationService';
import clsx from 'clsx';


const AssetAttachmentsTab = () => {
  const { state, dispatch } = useApp();
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedAssets, setSelectedAssets] = useState({
    tanks: [],
    pumps: []
  });

  // load stations

    //loading
    const [stations, setStations] = useState([]);
    const [loadingStations, setLoadingStations] = useState(false);
    const [stationError, setStationError] = useState('');


    const loadStations = async () => {
      try {
        setLoadingStations(true);
        setStationError('');
  
        // Fetch stations for the company
        const response = await stationService.getCompanyStations();
  
  // console.log('✅ Stations loaded successfully:', response);
        if (response) {
          setStations(response); // assuming response.data is an array of stations
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
  
       console.log('✅ Stations loaded successfully:', stations);
  // Get unattached assets
  // const unattachedTanks = state.assets?.tanks?.filter(tank => !tank.stationId) || [];
  // const unattachedPumps = state.assets?.pumps?.filter(pump => !pump.stationId) || [];
  // console.log("current state bits ",state);
  const unattachedTanks = state.assets?.filter(a => a.type === 'STORAGE_TANK' && !a.stationId) || [];
const unattachedPumps = state.assets?.filter(a => a.type === 'FUEL_PUMP' && !a.stationId) || [];

// console.log("unattachedTanks:", unattachedTanks);
// console.log("unattachedPumps:", unattachedPumps);
  
  // Get assets attached to selected station
  const stationTanks = state.assets?.tanks?.filter(tank => tank.stationId === selectedStation?.id) || [];
  const stationPumps = state.assets?.pumps?.filter(pump => pump.stationId === selectedStation?.id) || [];
  
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
    
    // Clear selection
    setSelectedAssets({ tanks: [], pumps: [] });
  };
  
  const handleDetachAsset = (assetId, assetType) => {
    dispatch(detachAssetFromStation(assetId, assetType));
  };

  // Check if any assets are selected
  const hasSelectedAssets = selectedAssets.tanks.length > 0 || selectedAssets.pumps.length > 0;

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
          setSelectedAssets({ tanks: [], pumps: [] }); // Clear selection
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
              Attach Selected Assets ({selectedAssets.tanks.length + selectedAssets.pumps.length})
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            
            {/* Attached Assets */}
            <Card 
              title={`Attached to ${selectedStation.name || selectedStation.code || 'Station'}`}
              headerClass="bg-blue-50"
            >
              <div className="space-y-2 max-h-96 overflow-y-auto p-2">
                {stationTanks.length === 0 && stationPumps.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No assets attached</p>
                ) : (
                  <>
                    {stationTanks.map(tank => (
                      <div 
                        key={tank.id} 
                        className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <Fuel className="w-4 h-4 mr-2 text-blue-500" />
                          <div>
                            <div className="font-medium">{tank.name}</div>
                            <div className="text-sm text-gray-500">Tank</div>
                          </div>
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
                    ))}
                    
                    {stationPumps.map(pump => (
                      <div 
                        key={pump.id} 
                        className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                          <div>
                            <div className="font-medium">{pump.name}</div>
                            <div className="text-sm text-gray-500">Pump</div>
                          </div>
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
                    ))}
                  </>
                )}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <div className="text-center py-10">
            <div className="text-gray-400 mb-2">Select a station to manage its assets</div>
            <div className="text-sm text-gray-500">
              Attach tanks and pumps to service stations for operational management
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AssetAttachmentsTab;