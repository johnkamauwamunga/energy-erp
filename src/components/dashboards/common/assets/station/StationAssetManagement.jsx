import React, { useState } from 'react';
import { Button, Card, Table, Badge } from '../../../../ui';
import { useApp } from '../../../../../context/AppContext';
import { 
  attachAssetToStation, 
  detachAssetFromStation,
  attachPumpsToTank,
  attachAssetsToIsland
} from '../../../../../context/AppContext/actions';
import { Fuel, Zap, Package, Link, Unlink } from 'lucide-react';

const StationAssetManagement = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('tanks');
  const [selectedTank, setSelectedTank] = useState(null);
  const [selectedPumps, setSelectedPumps] = useState([]);
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [assetsForIsland, setAssetsForIsland] = useState({
    tanks: [],
    pumps: []
  });

  console.log("state ", state.currentUser);
  //const currentStation= state.currentUser.stationId
  const currentStation = state.currentStation;

  // Station-level assets
  const stationTanks = state.assets?.tanks?.filter(t => t.stationId === currentStation?.id) || [];
  const stationPumps = state.assets?.pumps?.filter(p => p.stationId === currentStation?.id) || [];
  const stationIslands = state.islands?.filter(i => i.stationId === currentStation?.id) || [];

  // Unattached assets (same company, no station assigned)
  const unattachedTanks = state.assets?.tanks?.filter(t => !t.stationId && t.companyId === currentStation?.companyId) || [];
  const unattachedPumps = state.assets?.pumps?.filter(p => !p.stationId && p.companyId === currentStation?.companyId) || [];
  const unattachedIslands = state.islands?.filter(i => !i.stationId && i.companyId === currentStation?.companyId) || [];

  // Pumps without tank
  const pumpsWithoutTank = stationPumps.filter(p => !p.tankId);

  // Attach/detach actions
  const handleAttachAsset = (assetId, assetType) => {
    dispatch(attachAssetToStation(currentStation.id, assetId, assetType));
  };

  const handleDetachAsset = (assetId, assetType) => {
    dispatch(detachAssetFromStation(assetId, assetType));
  };

  const handleAttachPumpsToTank = () => {
    if (selectedTank && selectedPumps.length > 0) {
      dispatch(attachPumpsToTank(selectedTank, selectedPumps));
      setSelectedTank(null);
      setSelectedPumps([]);
    }
  };

  const togglePumpSelection = (pumpId) => {
    setSelectedPumps(prev => 
      prev.includes(pumpId) 
        ? prev.filter(id => id !== pumpId)
        : [...prev, pumpId]
    );
  };

  const toggleAssetForIsland = (assetId, assetType) => {
    setAssetsForIsland(prev => ({
      ...prev,
      [assetType]: prev[assetType].includes(assetId)
        ? prev[assetType].filter(id => id !== assetId)
        : [...prev[assetType], assetId]
    }));
  };

  const handleAttachAssetsToIsland = () => {
    if (!selectedIsland) return;
    const { tanks, pumps } = assetsForIsland;
    if (tanks.length === 0 && pumps.length === 0) return;

    dispatch(attachAssetsToIsland(selectedIsland, tanks, pumps));

    setSelectedIsland(null);
    setAssetsForIsland({ tanks: [], pumps: [] });
  };

  // Table columns
  const tankColumns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Capacity', accessor: 'capacity', render: value => `${value}L` },
    { header: 'Product', accessor: 'productType' },
    { 
      header: 'Attached Pumps', 
      render: (_, tank) => (
        <div className="flex flex-wrap gap-1">
          {state.assets?.pumps
            ?.filter(p => p.tankId === tank.id)
            .map(p => (
              <Badge key={p.id} variant="outline">{p.code}</Badge>
            ))}
        </div>
      )
    },
    { 
      header: 'Actions', 
      render: (_, tank) => (
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => handleDetachAsset(tank.id, 'tanks')}
        >
          <Unlink size={16} className="mr-1" /> Detach
        </Button>
      )
    }
  ];

  const pumpColumns = [
    { header: 'Code', accessor: 'code' },
    { 
      header: 'Status', 
      render: (_, pump) => (
        <Badge 
          variant={pump.status === 'active' ? 'success' : 'destructive'}
          className="capitalize"
        >
          {pump.status}
        </Badge>
      )
    },
    { 
      header: 'Attached To', 
      render: (_, pump) => (
        pump.tankId 
          ? `Tank: ${state.assets?.tanks?.find(t => t.id === pump.tankId)?.code || 'N/A'}`
          : pump.islandId
            ? `Island: ${state.islands?.find(i => i.id === pump.islandId)?.name || 'N/A'}`
            : 'Not attached'
      )
    },
    { 
      header: 'Actions', 
      render: (_, pump) => (
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => handleDetachAsset(pump.id, 'pumps')}
        >
          <Unlink size={16} className="mr-1" /> Detach
        </Button>
      )
    }
  ];

  const islandColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Code', accessor: 'code' },
    { 
      header: 'Attached Assets', 
      render: (_, island) => (
        <div className="flex flex-wrap gap-1">
          {state.assets?.tanks
            ?.filter(t => t.islandId === island.id)
            .map(t => (
              <Badge key={t.id} variant="blue">
                <Fuel size={14} className="mr-1" /> {t.code}
              </Badge>
            ))}
          {state.assets?.pumps
            ?.filter(p => p.islandId === island.id)
            .map(p => (
              <Badge key={p.id} variant="yellow">
                <Zap size={14} className="mr-1" /> {p.code}
              </Badge>
            ))}
        </div>
      )
    },
    { 
      header: 'Actions', 
      render: (_, island) => (
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => handleDetachAsset(island.id, 'islands')}
        >
          <Unlink size={16} className="mr-1" /> Detach
        </Button>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Asset Management - {currentStation?.name}
          </h2>
          <p className="text-gray-600">
            Manage tanks, pumps, and allocation points for this station
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {['tanks', 'pumps', 'islands', 'relationships'].map(tab => (
            <button
              key={tab}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              <span className="capitalize">{tab}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tanks Tab */}
      {activeTab === 'tanks' && (
        <div className="space-y-6">
          <Card title="Station Tanks">
            <Table columns={tankColumns} data={stationTanks} emptyMessage="No tanks attached to this station" />
          </Card>
          {unattachedTanks.length > 0 && (
            <Card title="Available Tanks" className="bg-blue-50">
              <Table
                columns={[
                  { header: 'Code', accessor: 'code' },
                  { header: 'Capacity', accessor: 'capacity', render: v => `${v}L` },
                  { header: 'Product', accessor: 'productType' },
                  { 
                    header: 'Actions', 
                    render: (_, tank) => (
                      <Button variant="success" size="sm" onClick={() => handleAttachAsset(tank.id, 'tanks')}>
                        <Link size={16} className="mr-1" /> Attach to Station
                      </Button>
                    )
                  }
                ]}
                data={unattachedTanks}
              />
            </Card>
          )}
        </div>
      )}

      {/* Pumps Tab */}
      {activeTab === 'pumps' && (
        <div className="space-y-6">
          <Card title="Station Pumps">
            <Table columns={pumpColumns} data={stationPumps} emptyMessage="No pumps attached to this station" />
          </Card>
          {unattachedPumps.length > 0 && (
            <Card title="Available Pumps" className="bg-yellow-50">
              <Table
                columns={[
                  { header: 'Code', accessor: 'code' },
                  { header: 'Status', accessor: 'status' },
                  { 
                    header: 'Actions', 
                    render: (_, pump) => (
                      <Button variant="success" size="sm" onClick={() => handleAttachAsset(pump.id, 'pumps')}>
                        <Link size={16} className="mr-1" /> Attach to Station
                      </Button>
                    )
                  }
                ]}
                data={unattachedPumps}
              />
            </Card>
          )}
        </div>
      )}

      {/* Islands Tab */}
      {activeTab === 'islands' && (
        <div className="space-y-6">
          <Card title="Allocation Points (Islands)">
            <Table columns={islandColumns} data={stationIslands} emptyMessage="No allocation points attached to this station" />
          </Card>
          {unattachedIslands.length > 0 && (
            <Card title="Available Allocation Points" className="bg-green-50">
              <Table
                columns={[
                  { header: 'Name', accessor: 'name' },
                  { header: 'Code', accessor: 'code' },
                  { 
                    header: 'Actions', 
                    render: (_, island) => (
                      <Button variant="success" size="sm" onClick={() => handleAttachAsset(island.id, 'islands')}>
                        <Link size={16} className="mr-1" /> Attach to Station
                      </Button>
                    )
                  }
                ]}
                data={unattachedIslands}
              />
            </Card>
          )}
        </div>
      )}

      {/* Relationships Tab */}
      {activeTab === 'relationships' && (
        <div className="space-y-8">
          {/* Tank-Pump Relationship */}
          <Card title="Attach Pumps to Tank">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Select Tank</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stationTanks.map(tank => (
                    <div
                      key={tank.id}
                      className={`p-3 rounded-lg cursor-pointer ${
                        selectedTank === tank.id ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedTank(tank.id)}
                    >
                      <div className="flex items-center">
                        <Fuel className="w-5 h-5 text-blue-500 mr-2" />
                        <div>
                          <div className="font-medium">{tank.name}</div>
                          <div className="text-sm text-gray-500">{tank.name} L · </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Select Pumps</h3>
                  {selectedTank && (
                    <Button size="sm" onClick={handleAttachPumpsToTank} disabled={selectedPumps.length === 0}>
                      Attach Selected Pumps
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pumpsWithoutTank.map(pump => (
                    <div
                      key={pump.id}
                      className={`p-3 rounded-lg cursor-pointer ${
                        selectedPumps.includes(pump.id) ? 'bg-yellow-100 border border-yellow-300' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => togglePumpSelection(pump.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                          <div>
                            <div className="font-medium">{pump.code}</div>
                            <div className="text-sm text-gray-500">Pump</div>
                          </div>
                        </div>
                        {selectedPumps.includes(pump.id) && <Badge variant="yellow">Selected</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Island-Asset Relationship */}
          <Card title="Attach Assets to Allocation Point">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium mb-3">Select Allocation Point</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stationIslands.map(island => (
                    <div
                      key={island.id}
                      className={`p-3 rounded-lg cursor-pointer ${
                        selectedIsland === island.id ? 'bg-green-100 border border-green-300' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedIsland(island.id)}
                    >
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-green-500 mr-2" />
                        <div>
                          <div className="font-medium">{island.name}</div>
                          <div className="text-sm text-gray-500">{island.code}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-3">Select Tanks</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stationTanks.filter(t => !t.islandId).map(tank => (
                    <div
                      key={tank.id}
                      className={`p-3 rounded-lg cursor-pointer ${
                        assetsForIsland.tanks.includes(tank.id) ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => toggleAssetForIsland(tank.id, 'tanks')}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Fuel className="w-5 h-5 text-blue-500 mr-2" />
                          <div>
                            <div className="font-medium">{tank.name}</div>
                            <div className="text-sm text-gray-500">Tank</div>
                          </div>
                        </div>
                        {assetsForIsland.tanks.includes(tank.id) && <Badge variant="blue">Selected</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Select Pumps</h3>
                  {selectedIsland && (
                    <Button 
                      size="sm"
                      onClick={handleAttachAssetsToIsland}
                      disabled={assetsForIsland.tanks.length === 0 && assetsForIsland.pumps.length === 0}
                    >
                      Attach Assets
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stationPumps.filter(p => !p.islandId && !p.tankId).map(pump => (
                    <div
                      key={pump.id}
                      className={`p-3 rounded-lg cursor-pointer ${
                        assetsForIsland.pumps.includes(pump.id) ? 'bg-yellow-100 border border-yellow-300' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => toggleAssetForIsland(pump.id, 'pumps')}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                          <div>
                            <div className="font-medium">{pump.code}</div>
                            <div className="text-sm text-gray-500">Pump</div>
                          </div>
                        </div>
                        {assetsForIsland.pumps.includes(pump.id) && <Badge variant="yellow">Selected</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StationAssetManagement;
