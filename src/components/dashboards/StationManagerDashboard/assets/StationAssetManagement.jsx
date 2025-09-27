import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Table, Badge, Alert, Tab } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { assetService } from '../../../../services/assetService/assetService';
import { assetConnectionService } from '../../../../services/assetConnection/assetConnectionService';
import { Fuel, Zap, Package, Link, Unlink, Warehouse } from 'lucide-react';

const StationAssetManagement = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('tanks');
  const [selectedTank, setSelectedTank] = useState(null);
  const [selectedPumps, setSelectedPumps] = useState([]);
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [connections, setConnections] = useState([]);
  const [topology, setTopology] = useState(null);
  const [error, setError] = useState('');
  const [assetsForIsland, setAssetsForIsland] = useState({
    tanks: [],
    pumps: []
  });
  const [userInfo, setUserInfo] = useState(null);

  // Load assets and connections
  const loadAssetsAndConnections = useCallback(async (currentUser) => {
    try {
      setLoading(true);
      setError("");
      console.log("🔄 Loading assets and connections from backend...");

      let stationId = currentUser?.station?.id;
      let assetsData;
      
      // Load assets based on role
      if (currentUser?.user?.role === "SUPER_ADMIN") {
        assetsData = await assetService.getAssets();
      } else if (
        currentUser?.user?.role === "COMPANY_ADMIN" ||
        currentUser?.user?.role === "COMPANY_MANAGER"
      ) {
        assetsData = await assetService.getCompanyAssets(currentUser.company.id);
      } else if (
        currentUser?.user?.role === "STATION_MANAGER" ||
        currentUser?.user?.role === "SUPERVISOR"
      ) {
        assetsData = await assetService.getStationAssets(stationId);
      } else {
        assetsData = await assetService.getAssets();
      }

      const assetsArray = assetsData.data || assetsData || [];
      setAssets(assetsArray);
      dispatch({ type: "SET_ASSETS", payload: assetsArray });

      // Load station topology if we have a station
      if (stationId) {
        try {
          const topologyData = await assetConnectionService.getStationTopology(stationId);
          const processedTopology = assetConnectionService.processTopologyData(topologyData);

          // console.log("topography data ", topologyData);
          // console.log("processed Topography ",processedTopology);
          setTopology(processedTopology);
          setConnections(processedTopology?.connections || []);
          
        
        } catch (topologyError) {
          console.warn("Could not load topology data:", topologyError.message);
          // Continue without topology data
        }
      }

    } catch (error) {
      console.error("❌ Failed to load data:", error);
      setError(error.message || "Failed to load data. Please try again.");
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

  // Load assets and connections when userInfo is available
  useEffect(() => {
    if (userInfo) {
      loadAssetsAndConnections(userInfo);
    }
  }, [userInfo, loadAssetsAndConnections]);

  // Helper function to refresh data
  const refreshData = useCallback(() => {
    if (userInfo) {
      loadAssetsAndConnections(userInfo);
    }
  }, [userInfo, loadAssetsAndConnections]);

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
  
  const stationPumps = assets.filter(asset => 
    asset.type === 'FUEL_PUMP' && asset.stationId === userStationId
  );
  
  const stationIslands = assets.filter(asset => 
    asset.type === 'ISLAND' && asset.stationId === userStationId
  );

  console.log("station islands ", stationIslands);
  
  const stationWarehouses = assets.filter(asset => 
    asset.type === 'WAREHOUSE' && asset.stationId === userStationId
  );

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

  // Enhanced asset filtering using connection data
  const getConnectedAssets = (connectionType) => {
    if (!connections || connections.length === 0) return new Set();
    
    const connectedAssetIds = new Set();
    connections.forEach(connection => {
      if (connection.type === connectionType) {
        // For TANK_TO_PUMP: assetA is tank, assetB is pump
        // For TANK_TO_ISLAND: assetA is tank, assetB is island  
        // For PUMP_TO_ISLAND: assetA is pump, assetB is island
        if (connectionType === 'TANK_TO_PUMP') {
          connectedAssetIds.add(connection.assetB.id); // Pump ID
        } else if (connectionType === 'TANK_TO_ISLAND') {
          connectedAssetIds.add(connection.assetA.id); // Tank ID
        } else if (connectionType === 'PUMP_TO_ISLAND') {
          connectedAssetIds.add(connection.assetA.id); // Pump ID
        }
      }
    });
    return connectedAssetIds;
  };

  // Get sets of connected asset IDs
  const pumpsConnectedToTanks = getConnectedAssets('TANK_TO_PUMP');
  const tanksConnectedToIslands = getConnectedAssets('TANK_TO_ISLAND');
  const pumpsConnectedToIslands = getConnectedAssets('PUMP_TO_ISLAND');

  // Pumps that are available for tank connection (not connected to any tank)
  const pumpsAvailableForTankConnection = stationPumps.filter(pump => 
    !pumpsConnectedToTanks.has(pump.id)
  );

  // Pumps that are available for island connection (not connected to any island)
  const pumpsAvailableForIslandConnection = stationPumps.filter(pump => 
    !pumpsConnectedToIslands.has(pump.id)
  );

  // Tanks that are available for island connection (not connected to any island)
  const tanksAvailableForIslandConnection = stationTanks.filter(tank => 
    !tanksConnectedToIslands.has(tank.id)
  );

  // Handle attaching assets to station
  const handleAttachAsset = async (assetId, assetType) => {
    try {
      const response = await assetService.assignToStation(assetId, userStationId);
      await refreshData();
      console.log(`✅ Asset ${assetId} attached to station successfully`);
    } catch (error) {
      console.error("❌ Failed to attach asset to station:", error);
      setError(error.message || "Failed to attach asset to station");
    }
  };
  
  // Handle detaching assets from station
  const handleDetachAsset = async (assetId, assetType) => {
    try {
      const response = await assetService.removeFromStation(assetId);
      await refreshData();
      console.log(`✅ Asset ${assetId} detached from station successfully`);
    } catch (error) {
      console.error("❌ Failed to detach asset from station:", error);
      setError(error.message || "Failed to detach asset from station");
    }
  };

  // Handle creating TANK_TO_PUMP connection
  const handleCreateTankToPumpConnection = async () => {
    if (!selectedTank || selectedPumps.length === 0) return;

    try {
      setError('');
      
      // Create connections for each selected pump
      const connectionPromises = selectedPumps.map(pumpId => 
        assetConnectionService.createConnection({
          type: 'TANK_TO_PUMP',
          assetAId: selectedTank,
          assetBId: pumpId,
          stationId: userStationId
        })
      );

      await Promise.all(connectionPromises);
      await refreshData();
      
      setSelectedTank(null);
      setSelectedPumps([]);
      
      console.log('✅ Tank to pump connections created successfully');
    } catch (error) {
      console.error('❌ Failed to create tank-pump connections:', error);
      setError(error.message || 'Failed to create connections');
    }
  };

  // Handle creating ISLAND connections
  const handleCreateIslandConnections = async () => {
    if (!selectedIsland || (assetsForIsland.tanks.length === 0 && assetsForIsland.pumps.length === 0)) return;

    try {
      setError('');
      const connectionPromises = [];

      // Create TANK_TO_ISLAND connections
      assetsForIsland.tanks.forEach(tankId => {
        connectionPromises.push(
          assetConnectionService.createConnection({
            type: 'TANK_TO_ISLAND',
            assetAId: tankId,
            assetBId: selectedIsland,
            stationId: userStationId
          })
        );
      });

      // Create PUMP_TO_ISLAND connections
      assetsForIsland.pumps.forEach(pumpId => {
        connectionPromises.push(
          assetConnectionService.createConnection({
            type: 'PUMP_TO_ISLAND',
            assetAId: pumpId,
            assetBId: selectedIsland,
            stationId: userStationId
          })
        );
      });

      await Promise.all(connectionPromises);
      await refreshData();
      
      setSelectedIsland(null);
      setAssetsForIsland({ tanks: [], pumps: [] });
      
      console.log('✅ Island connections created successfully');
    } catch (error) {
      console.error('❌ Failed to create island connections:', error);
      setError(error.message || 'Failed to create connections');
    }
  };

  // Handle deleting a connection
  const handleDeleteConnection = async (connectionId) => {
    try {
      await assetConnectionService.deleteConnection(connectionId);
      await refreshData();
      console.log('✅ Connection deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete connection:', error);
      setError(error.message || 'Failed to delete connection');
    }
  };

  // Enhanced pump columns
  const pumpColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Tank Attachment', 
      render: (_, pump) => {
        const tankConnection = connections ? 
          connections.find(conn => 
            conn.type === 'TANK_TO_PUMP' && conn.assetB.id === pump.id
          ) : null;
        
        return tankConnection ? (
          <div className="flex items-center">
            <Fuel className="w-4 h-4 text-blue-500 mr-1" />
            {tankConnection.assetA.name}
          </div>
        ) : (
          <Badge variant="outline">Unattached</Badge>
        );
      }
    },
    { header: 'Island Attachment', 
      render: (_, pump) => {
        const islandConnection = connections ? 
          connections.find(conn => 
            conn.type === 'PUMP_TO_ISLAND' && conn.assetA.id === pump.id
          ) : null;
        
        return islandConnection ? (
          <div className="flex items-center">
            <Package className="w-4 h-4 text-green-500 mr-1" />
            {islandConnection.assetB.name}
          </div>
        ) : (
          <Badge variant="outline">Unattached</Badge>
        );
      }
    },
    { header: 'Status', 
      render: (_, pump) => {
        const hasTank = connections?.some(conn => 
          conn.type === 'TANK_TO_PUMP' && conn.assetB.id === pump.id
        );
        const hasIsland = connections?.some(conn => 
          conn.type === 'PUMP_TO_ISLAND' && conn.assetA.id === pump.id
        );
        
        if (hasTank && hasIsland) {
          return <Badge variant="success">Fully Connected</Badge>;
        } else if (hasTank || hasIsland) {
          return <Badge variant="warning">Partially Connected</Badge>;
        } else {
          return <Badge variant="error">Unattached</Badge>;
        }
      }
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

  // Enhanced tank columns
  const tankColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Pumps Attached', 
      render: (_, tank) => {
        const pumpConnections = connections ? 
          connections.filter(conn => 
            conn.type === 'TANK_TO_PUMP' && conn.assetA.id === tank.id
          ) : [];
        
        return (
          <div className="flex flex-wrap gap-1">
            {pumpConnections.map(connection => (
              <Badge key={connection.id} variant="outline">
                <Zap className="w-3 h-3 mr-1" />
                {connection.assetB.name}
              </Badge>
            ))}
            {pumpConnections.length === 0 && (
              <Badge variant="outline">No pumps</Badge>
            )}
          </div>
        );
      }
    },
    { header: 'Island Attachment', 
      render: (_, tank) => {
        const islandConnection = connections ? 
          connections.find(conn => 
            conn.type === 'TANK_TO_ISLAND' && conn.assetA.id === tank.id
          ) : null;
        
        return islandConnection ? (
          <div className="flex items-center">
            <Package className="w-4 h-4 text-green-500 mr-1" />
            {islandConnection.assetB.name}
          </div>
        ) : (
          <Badge variant="outline">Unattached</Badge>
        );
      }
    },
    { header: 'Product', 
      render: (_, tank) => tank.tank?.product?.name || 'No product'
    },
    { header: 'Capacity', 
      render: (_, tank) => tank.tank?.capacity ? `${tank.tank.capacity}L` : 'N/A'
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

  // Enhanced island columns
  const islandColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Tanks Attached', 
      render: (_, island) => {
        const tankConnections = connections ? 
          connections.filter(conn => 
            conn.type === 'TANK_TO_ISLAND' && conn.assetB.id === island.id
          ) : [];
        
        return (
          <div className="flex flex-wrap gap-1">
            {tankConnections.map(connection => (
              <Badge key={connection.id} variant="blue">
                <Fuel className="w-3 h-3 mr-1" />
                {connection.assetA.name}
              </Badge>
            ))}
            {tankConnections.length === 0 && (
              <Badge variant="outline">No tanks</Badge>
            )}
          </div>
        );
      }
    },
    { header: 'Pumps Attached', 
      render: (_, island) => {
        const pumpConnections = connections ? 
          connections.filter(conn => 
            conn.type === 'PUMP_TO_ISLAND' && conn.assetB.id === island.id
          ) : [];
        
        return (
          <div className="flex flex-wrap gap-1">
            {pumpConnections.map(connection => (
              <Badge key={connection.id} variant="yellow">
                <Zap className="w-3 h-3 mr-1" />
                {connection.assetA.name}
              </Badge>
            ))}
            {pumpConnections.length === 0 && (
              <Badge variant="outline">No pumps</Badge>
            )}
          </div>
        );
      }
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

  // Warehouse columns
  const warehouseColumns = [
    { header: 'Name', accessor: 'name' },
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

  // Simple tab panel component
  const TabPanel = ({ value, tabId, children }) => {
    if (value !== tabId) return null;
    return <div className="mt-4">{children}</div>;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading assets and connections...</div>
        </div>
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

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

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
                  { header: 'Capacity', 
                    render: (_, tank) => tank.tank?.capacity ? `${tank.tank.capacity}L` : 'N/A'
                  },
                  { header: 'Product', 
                    render: (_, tank) => tank.tank?.product?.name || 'No product'
                  },
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
                  {stationTanks.map(tank => ( // Show ALL station tanks for pump connection
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
                          <div className="font-medium">{tank.name}</div>
                          <div className="text-sm text-gray-500">Tank</div>
                          {tanksConnectedToIslands.has(tank.id) && (
                            <Badge variant="blue" className="mt-1">Connected to Island</Badge>
                          )}
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
                      onClick={handleCreateTankToPumpConnection}
                      disabled={selectedPumps.length === 0}
                    >
                      Attach Selected Pumps
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pumpsAvailableForTankConnection.map(pump => (
                    <div
                      key={pump.id}
                      className={`p-3 rounded-lg cursor-pointer ${
                        selectedPumps.includes(pump.id)
                          ? 'bg-yellow-100 border border-yellow-300'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        setSelectedPumps(prev => 
                          prev.includes(pump.id) 
                            ? prev.filter(id => id !== pump.id)
                            : [...prev, pump.id]
                        );
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                          <div>
                            <div className="font-medium">{pump.name}</div>
                            <div className="text-sm text-gray-500">Pump</div>
                            {pumpsConnectedToIslands.has(pump.id) && (
                              <Badge variant="yellow" className="mt-1">Connected to Island</Badge>
                            )}
                          </div>
                        </div>
                        {selectedPumps.includes(pump.id) && (
                          <Badge variant="yellow">Selected</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {pumpsAvailableForTankConnection.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      All pumps are already connected to tanks
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Island-Asset Relationship */}
          <Card title="Attach Assets to Island">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium mb-3">Select Island</h3>
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
                          <div className="text-sm text-gray-500">Island</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Select Tanks</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tanksAvailableForIslandConnection.map(tank => (
                    <div
                      key={tank.id}
                      className={`p-3 rounded-lg cursor-pointer ${
                        assetsForIsland.tanks.includes(tank.id)
                          ? 'bg-blue-100 border border-blue-300'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        setAssetsForIsland(prev => ({
                          ...prev,
                          tanks: prev.tanks.includes(tank.id)
                            ? prev.tanks.filter(id => id !== tank.id)
                            : [...prev.tanks, tank.id]
                        }));
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Fuel className="w-5 h-5 text-blue-500 mr-2" />
                          <div>
                            <div className="font-medium">{tank.name}</div>
                            <div className="text-sm text-gray-500">Tank</div>
                          </div>
                        </div>
                        {assetsForIsland.tanks.includes(tank.id) && (
                          <Badge variant="blue">Selected</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {tanksAvailableForIslandConnection.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      All tanks are already connected to islands
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Select Pumps</h3>
                  {selectedIsland && (
                    <Button 
                      size="sm"
                      onClick={handleCreateIslandConnections}
                      disabled={assetsForIsland.tanks.length === 0 && assetsForIsland.pumps.length === 0}
                    >
                      Attach Assets
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pumpsAvailableForIslandConnection.map(pump => (
                    <div
                      key={pump.id}
                      className={`p-3 rounded-lg cursor-pointer ${
                        assetsForIsland.pumps.includes(pump.id)
                          ? 'bg-yellow-100 border border-yellow-300'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        setAssetsForIsland(prev => ({
                          ...prev,
                          pumps: prev.pumps.includes(pump.id)
                            ? prev.pumps.filter(id => id !== pump.id)
                            : [...prev.pumps, pump.id]
                        }));
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                          <div>
                            <div className="font-medium">{pump.name}</div>
                            <div className="text-sm text-gray-500">Pump</div>
                            {pumpsConnectedToTanks.has(pump.id) && (
                              <Badge variant="yellow" className="mt-1">Connected to Tank</Badge>
                            )}
                          </div>
                        </div>
                        {assetsForIsland.pumps.includes(pump.id) && (
                          <Badge variant="yellow">Selected</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {pumpsAvailableForIslandConnection.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      All pumps are already connected to islands
                    </div>
                  )}
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