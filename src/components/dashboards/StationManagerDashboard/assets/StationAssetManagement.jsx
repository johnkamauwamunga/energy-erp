import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Table, Badge, Alert, Tab } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { 
  attachAssetToStation, 
  detachAssetFromStation,
  attachPumpsToTank,
  attachAssetsToIsland
} from '../../../../context/AppContext/actions';
import { assetService } from '../../../../services/assetService/assetService';
import { Fuel, Zap, Package, Link, Unlink, Warehouse } from 'lucide-react';

const StationAssetManagement = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('tanks');
  const [selectedTank, setSelectedTank] = useState(null);
  const [selectedPumps, setSelectedPumps] = useState([]);
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [assetsForIsland, setAssetsForIsland] = useState({
    tanks: [],
    pumps: []
  });
  const [userInfo, setUserInfo] = useState(null);

  // Memoize the loadAssets function
  const loadAssetsFromBackend = useCallback(async (currentUser) => {
    try {
      setLoading(true);
      setError("");
      console.log("🔄 Loading assets from backend...");

      let assetsData;
      let stationId = currentUser?.station?.id;
      console.log("current user is ", currentUser?.user?.role);
      
      // Choose the right API endpoint based on role
      if (currentUser?.user?.role === "SUPER_ADMIN") {
        assetsData = await assetService.getAssets();
      } else if (
        currentUser?.user?.role === "COMPANY_ADMIN" ||
        currentUser?.user?.role === "COMPANY_MANAGER"
      ) {
        assetsData = await assetService.getCompanyAssets(currentUser.company.id);
        console.log("🔄 Company assets are ", assetsData);
      } else if (
        currentUser?.user?.role === "STATION_MANAGER" ||
        currentUser?.user?.role === "SUPERVISOR"
      ) {
        assetsData = await assetService.getStationAssets(stationId);
        console.log("🔄 Station assets: ", assetsData);
      } else {
        assetsData = await assetService.getAssets();
      }

      console.log("✅ Assets loaded successfully:", assetsData);

      // Ensure we're working with the data property if it exists
      const assetsArray = assetsData.data || assetsData || [];
      setAssets(assetsArray);
      dispatch({ type: "SET_ASSETS", payload: assetsArray });
    } catch (error) {
      console.error("❌ Failed to load assets:", error);
      setError(error.message || "Failed to load assets. Please try again.");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // On first render, load user info from localStorage
  useEffect(() => {
    const storedAuthData = localStorage.getItem("authData");
    if (storedAuthData) {
      try {
        const authData = JSON.parse(storedAuthData);
        setUserInfo(authData);
      } catch (error) {
        console.error("Error parsing auth data:", error);
      }
    }
  }, []);

  // Load assets when userInfo is available
  useEffect(() => {
    if (userInfo) {
      loadAssetsFromBackend(userInfo);
    }
  }, [userInfo, loadAssetsFromBackend]);

  if (!userInfo) {
    return (
      <div className="p-6">
        <Alert variant="error">Unable to load user information. Please try logging in again.</Alert>
      </div>
    );
  }

  const userStationId = userInfo.station?.id;
  const userCompanyId = userInfo.company?.id;

  if (!userStationId) {
    return (
      <div className="p-6">
        <Alert variant="warning">No station assigned to your account. Please contact your administrator.</Alert>
      </div>
    );
  }

  // Get assets attached to this user's station
  const stationTanks = assets.filter(asset => 
    asset.type === 'STORAGE_TANK' && asset.stationId === userStationId
  );
  
  console.log("station tanks ",stationTanks)
  const stationPumps = assets.filter(asset => 
    asset.type === 'FUEL_PUMP' && asset.stationId === userStationId
  );
  
    console.log("station pumps ",stationPumps)
  const stationIslands = assets.filter(asset => 
    asset.type === 'ISLAND' && asset.stationId === userStationId
  );
  
    console.log("station island ",stationIslands)
  const stationWarehouses = assets.filter(asset => 
    asset.type === 'WAREHOUSE' && asset.stationId === userStationId
  );
  
  console.log("station warehouse ",stationWarehouses)
  // Get unattached assets in the same company
  const unattachedTanks = assets.filter(asset => 
    asset.type === 'STORAGE_TANK' && (!asset.stationId || asset.stationId !== userStationId) && asset.companyId === userCompanyId
  );
  
  const unattachedPumps = assets.filter(asset => 
    asset.type === 'FUEL_PUMP' && (!asset.stationId || asset.stationId !== userStationId) && asset.companyId === userCompanyId
  );
  
  const unattachedIslands = assets.filter(asset => 
    asset.type === 'ISLAND' && (!asset.stationId || asset.stationId !== userStationId) && asset.companyId === userCompanyId
  );
  
  const unattachedWarehouses = assets.filter(asset => 
    asset.type === 'WAREHOUSE' && (!asset.stationId || asset.stationId !== userStationId) && asset.companyId === userCompanyId
  );
  
  // Get pumps not attached to any tank
  const pumpsWithoutTank = stationPumps.filter(pump => !pump.tankId);
  
  // Handle attaching assets to station
  const handleAttachAsset = async (assetId, assetType) => {
    try {
      // Call the API to attach the asset to the station
      const response = await assetService.assignToStation(assetId, userStationId);
      
      // Update local state with the updated asset
      const updatedAssets = assets.map(asset => 
        asset.id === assetId ? { ...asset, stationId: userStationId } : asset
      );
      
      setAssets(updatedAssets);
      dispatch({ type: "SET_ASSETS", payload: updatedAssets });
      
      console.log(`✅ Asset ${assetId} attached to station successfully`);
    } catch (error) {
      console.error("❌ Failed to attach asset to station:", error);
      setError(error.message || "Failed to attach asset to station");
    }
  };
  
  // Handle detaching assets from station
  const handleDetachAsset = async (assetId, assetType) => {
    try {
      // Call the API to detach the asset from the station
      const response = await assetService.removeFromStation(assetId);
      
      // Update local state with the updated asset
      const updatedAssets = assets.map(asset => 
        asset.id === assetId ? { ...asset, stationId: null } : asset
      );
      
      setAssets(updatedAssets);
      dispatch({ type: "SET_ASSETS", payload: updatedAssets });
      
      console.log(`✅ Asset ${assetId} detached from station successfully`);
    } catch (error) {
      console.error("❌ Failed to detach asset from station:", error);
      setError(error.message || "Failed to detach asset from station");
    }
  };
  
  // Handle attaching pumps to tank
  const handleAttachPumpsToTank = () => {
    if (selectedTank && selectedPumps.length > 0) {
      dispatch(attachPumpsToTank(selectedTank, selectedPumps));
      setSelectedTank(null);
      setSelectedPumps([]);
    }
  };
  
  // Handle selecting pumps for tank
  const togglePumpSelection = (pumpId) => {
    setSelectedPumps(prev => 
      prev.includes(pumpId) 
        ? prev.filter(id => id !== pumpId)
        : [...prev, pumpId]
    );
  };
  
  // Handle selecting assets for island
  const toggleAssetForIsland = (assetId, assetType) => {
    setAssetsForIsland(prev => ({
      ...prev,
      [assetType]: prev[assetType].includes(assetId)
        ? prev[assetType].filter(id => id !== assetId)
        : [...prev[assetType], assetId]
    }));
  };
  
  // Handle attaching assets to island
  const handleAttachAssetsToIsland = () => {
    if (selectedIsland && 
        (assetsForIsland.tanks.length > 0 || assetsForIsland.pumps.length > 0)) {
      dispatch(attachAssetsToIsland(
        selectedIsland, 
        assetsForIsland.tanks, 
        assetsForIsland.pumps
      ));
      setSelectedIsland(null);
      setAssetsForIsland({ tanks: [], pumps: [] });
    }
  };

  // Simple tab panel component
  const TabPanel = ({ value, tabId, children }) => {
    if (value !== tabId) return null;
    return <div className="mt-4">{children}</div>;
  };

  // Tank columns for table
  const tankColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Code', accessor: 'code' },
    { header: 'Capacity', accessor: 'capacity', render: value => `${value}L` },
    { header: 'Product', accessor: 'productType' },
    { header: 'Attached Pumps', 
      render: (_, tank) => (
        <div className="flex flex-wrap gap-1">
          {stationPumps
            .filter(pump => pump.tankId === tank.id)
            .map(pump => (
              <Badge key={pump.id} variant="outline">
                {pump.code}
              </Badge>
            ))}
        </div>
      )
    },
    { header: 'Actions', 
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

  // Pump columns for table
  const pumpColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Code', accessor: 'code' },
    { header: 'Status', 
      render: (_, pump) => (
        <Badge 
          variant={pump.status === 'active' ? 'success' : 'destructive'}
          className="capitalize"
        >
          {pump.status}
        </Badge>
      )
    },
    { header: 'Attached To', 
      render: (_, pump) => (
        pump.tankId 
          ? `Tank: ${stationTanks.find(t => t.id === pump.tankId)?.code || 'N/A'}`
          : 'No tank'
      )
    },
    { header: 'Actions', 
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

  // Island columns for table
  const islandColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Code', accessor: 'code' },
    { header: 'Attached Assets', 
      render: (_, island) => (
        <div className="flex flex-wrap gap-1">
          {stationTanks
            .filter(tank => tank.islandId === island.id)
            .map(tank => (
              <Badge key={tank.id} variant="blue">
                <Fuel size={14} className="mr-1" /> {tank.code}
              </Badge>
            ))}
          
          {stationPumps
            .filter(pump => pump.islandId === island.id)
            .map(pump => (
              <Badge key={pump.id} variant="yellow">
                <Zap size={14} className="mr-1" /> {pump.code}
              </Badge>
            ))}
        </div>
      )
    },
    { header: 'Actions', 
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

  // Warehouse columns for table
  const warehouseColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Code', accessor: 'code' },
    { header: 'Capacity', accessor: 'capacity', render: value => `${value} units` },
    { header: 'Actions', 
      render: (_, warehouse) => (
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => handleDetachAsset(warehouse.id, 'warehouses')}
        >
          <Unlink size={16} className="mr-1" /> Detach
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading assets...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Asset Management - {userInfo.station?.name}
          </h2>
          <p className="text-gray-600">
            Manage tanks, pumps, islands, and warehouses for this station
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Station Manager: {userInfo.user?.firstName} {userInfo.user?.lastName}
        </Badge>
      </div>

      {/* Asset Type Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'tanks', label: 'Tanks', icon: Fuel },
            { id: 'pumps', label: 'Pumps', icon: Zap },
            { id: 'islands', label: 'Islands', icon: Package },
            { id: 'warehouses', label: 'Warehouses', icon: Warehouse },
            { id: 'relationships', label: 'Relationships', icon: Link }
          ].map(tab => (
            <Tab
              key={tab.id}
              value={tab.id}
              icon={tab.icon}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Tab>
          ))}
        </nav>
      </div>

      {/* Tanks Tab */}
      <TabPanel value={activeTab} tabId="tanks">
        <div className="space-y-6">
          <Card title="Station Tanks">
            <Table
              columns={tankColumns}
              data={stationTanks}
              emptyMessage="No tanks attached to this station"
            />
          </Card>

          {unattachedTanks.length > 0 && (
            <Card title="Available Tanks" className="bg-blue-50">
              <Table
                columns={[
                  { header: 'Name', accessor: 'name' },
                  { header: 'Code', accessor: 'code' },
                  { header: 'Capacity', accessor: 'capacity', render: value => `${value}L` },
                  { header: 'Product', accessor: 'productType' },
                  { header: 'Actions', 
                    render: (_, tank) => (
                      <Button 
                        variant="success"
                        size="sm"
                        onClick={() => handleAttachAsset(tank.id, 'tanks')}
                      >
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
      </TabPanel>

      {/* Pumps Tab */}
      <TabPanel value={activeTab} tabId="pumps">
        <div className="space-y-6">
          <Card title="Station Pumps">
            <Table
              columns={pumpColumns}
              data={stationPumps}
              emptyMessage="No pumps attached to this station"
            />
          </Card>

          {unattachedPumps.length > 0 && (
            <Card title="Available Pumps" className="bg-yellow-50">
              <Table
                columns={[
                  { header: 'Name', accessor: 'name' },
                  { header: 'Code', accessor: 'code' },
                  { header: 'Status', accessor: 'status' },
                  { header: 'Actions', 
                    render: (_, pump) => (
                      <Button 
                        variant="success"
                        size="sm"
                        onClick={() => handleAttachAsset(pump.id, 'pumps')}
                      >
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
      </TabPanel>

      {/* Islands Tab */}
      <TabPanel value={activeTab} tabId="islands">
        <div className="space-y-6">
          <Card title="Allocation Points (Islands)">
            <Table
              columns={islandColumns}
              data={stationIslands}
              emptyMessage="No allocation points attached to this station"
            />
          </Card>

          {unattachedIslands.length > 0 && (
            <Card title="Available Allocation Points" className="bg-green-50">
              <Table
                columns={[
                  { header: 'Name', accessor: 'name' },
                  { header: 'Code', accessor: 'code' },
                  { header: 'Actions', 
                    render: (_, island) => (
                      <Button 
                        variant="success"
                        size="sm"
                        onClick={() => handleAttachAsset(island.id, 'islands')}
                      >
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
      </TabPanel>

      {/* Warehouses Tab */}
      <TabPanel value={activeTab} tabId="warehouses">
        <div className="space-y-6">
          <Card title="Station Warehouses">
            <Table
              columns={warehouseColumns}
              data={stationWarehouses}
              emptyMessage="No warehouses attached to this station"
            />
          </Card>

          {unattachedWarehouses.length > 0 && (
            <Card title="Available Warehouses" className="bg-purple-50">
              <Table
                columns={[
                  { header: 'Name', accessor: 'name' },
                  { header: 'Code', accessor: 'code' },
                  { header: 'Capacity', accessor: 'capacity', render: value => `${value} units` },
                  { header: 'Actions', 
                    render: (_, warehouse) => (
                      <Button 
                        variant="success"
                        size="sm"
                        onClick={() => handleAttachAsset(warehouse.id, 'warehouses')}
                      >
                        <Link size={16} className="mr-1" /> Attach to Station
                      </Button>
                    )
                  }
                ]}
                data={unattachedWarehouses}
              />
            </Card>
          )}
        </div>
      </TabPanel>

      {/* Relationships Tab */}
      <TabPanel value={activeTab} tabId="relationships">
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
                        selectedTank === tank.id
                          ? 'bg-blue-100 border border-blue-300'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedTank(tank.id)}
                    >
                      <div className="flex items-center">
                        <Fuel className="w-5 h-5 text-blue-500 mr-2" />
                        <div>
                          <div className="font-medium">{tank.code}</div>
                          <div className="text-sm text-gray-500">
                            {tank.capacity}L · {tank.productType}
                          </div>
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
                    <Button 
                      size="sm"
                      onClick={handleAttachPumpsToTank}
                      disabled={selectedPumps.length === 0}
                    >
                      Attach Selected Pumps
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pumpsWithoutTank.map(pump => (
                    <div
                      key={pump.id}
                      className={`p-3 rounded-lg cursor-pointer ${
                        selectedPumps.includes(pump.id)
                          ? 'bg-yellow-100 border border-yellow-300'
                          : 'bg-gray-50 hover:bg-gray-100'
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
                        {selectedPumps.includes(pump.id) && (
                          <Badge variant="yellow">Selected</Badge>
                        )}
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
                        selectedIsland === island.id
                          ? 'bg-green-100 border border-green-300'
                          : 'bg-gray-50 hover:bg-gray-100'
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
                  {stationTanks
                    .filter(tank => !tank.islandId)
                    .map(tank => (
                      <div
                        key={tank.id}
                        className={`p-3 rounded-lg cursor-pointer ${
                          assetsForIsland.tanks.includes(tank.id)
                            ? 'bg-blue-100 border border-blue-300'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => toggleAssetForIsland(tank.id, 'tanks')}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Fuel className="w-5 h-5 text-blue-500 mr-2" />
                            <div>
                              <div className="font-medium">{tank.code}</div>
                              <div className="text-sm text-gray-500">Tank</div>
                            </div>
                          </div>
                          {assetsForIsland.tanks.includes(tank.id) && (
                            <Badge variant="blue">Selected</Badge>
                          )}
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
                  {stationPumps
                    .filter(pump => !pump.islandId)
                    .map(pump => (
                      <div
                        key={pump.id}
                        className={`p-3 rounded-lg cursor-pointer ${
                          assetsForIsland.pumps.includes(pump.id)
                            ? 'bg-yellow-100 border border-yellow-300'
                            : 'bg-gray-50 hover:bg-gray-100'
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
                          {assetsForIsland.pumps.includes(pump.id) && (
                            <Badge variant="yellow">Selected</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </TabPanel>
    </div>
  );
};

export default StationAssetManagement;