import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, Table, Badge, Alert, Tab } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { assetService } from '../../../../services/assetService/assetService';
import { assetConnectionService } from '../../../../services/assetConnection/assetConnectionService';
import { fuelService } from '../../../../services/fuelService/fuelService';
import { Fuel, Zap, Package, Link, Unlink, Warehouse, Edit, Download, BarChart3 } from 'lucide-react';
import AdvancedReportGenerator from '../../../dashboards/common/downloadable/AdvancedReportGenerator';

// Helper function to add sequential numbers to data
const addSequenceNumbers = (data) => 
  data.map((item, index) => ({
    ...item,
    _sequence: index + 1
  }));

// Edit Asset Modal Component
const EditAssetModal = ({ asset, onSave, onClose, userRole }) => {
  const [formData, setFormData] = useState({
    name: asset.name || '',
    stationLabel: asset.stationLabel || '',
    status: asset.status || 'REGISTERED'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canEditName = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER'].includes(userRole);
  const canEditStatus = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER'].includes(userRole);
  const canEditStationLabel = asset.stationId && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER', 'STATION_MANAGER', 'SUPERVISOR'].includes(userRole);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updateData = {};
      if (canEditName) updateData.name = formData.name;
      if (canEditStatus) updateData.status = formData.status;
      if (canEditStationLabel) updateData.stationLabel = formData.stationLabel;

      await onSave(asset.id, updateData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Edit Asset</h2>
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}
          
          <form onSubmit={handleSubmit}>
            {canEditName && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            {canEditStationLabel && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station Label
                  <span className="text-xs text-gray-500 ml-2">(Local name for this station)</span>
                </label>
                <input
                  type="text"
                  value={formData.stationLabel}
                  onChange={(e) => setFormData(prev => ({ ...prev, stationLabel: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`e.g., ${asset.name}#shell@${asset.station?.name?.toLowerCase()}`}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">This label will be used within this station only</p>
              </div>
            )}

            {!canEditStationLabel && asset.stationId && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-md">
                <p className="text-sm text-yellow-800">
                  Station label can only be edited when asset is assigned to a station
                </p>
              </div>
            )}

            {canEditStatus && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="REGISTERED">Registered</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

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
  const [assetsForIsland, setAssetsForIsland] = useState({ tanks: [], pumps: [] });
  const [userInfo, setUserInfo] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch products
  useEffect(() => {
    const response = fuelService.getFuelProducts();
    console.log("the products are ", response);
  }, []);

  // Load assets and connections
  const loadAssetsAndConnections = useCallback(async (currentUser) => {
    try {
      setLoading(true);
      setError("");
      console.log("🔄 Loading assets and connections from backend...");

      let stationId = currentUser?.station?.id;
      let assetsData;
      
      if (currentUser?.user?.role === "SUPER_ADMIN") {
        assetsData = await assetService.getAssets();
      } else if (['COMPANY_ADMIN', 'COMPANY_MANAGER'].includes(currentUser?.user?.role)) {
        assetsData = await assetService.getCompanyAssets(currentUser.company.id);
      } else if (['STATION_MANAGER', 'SUPERVISOR'].includes(currentUser?.user?.role)) {
        assetsData = await assetService.getStationAssets(stationId);
      } else {
        assetsData = await assetService.getAssets();
      }

      const assetsArray = assetsData.data || assetsData || [];
      setAssets(assetsArray);
      dispatch({ type: "SET_ASSETS", payload: assetsArray });

      if (stationId) {
        try {
          const topologyData = await assetConnectionService.getStationTopology(stationId);
          const processedTopology = assetConnectionService.processTopologyData(topologyData);
          setTopology(processedTopology);
          setConnections(processedTopology?.connections || []);
        } catch (topologyError) {
          console.warn("Could not load topology data:", topologyError.message);
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

  // Enhanced assets data for reporting WITH SEQUENTIAL NUMBERING
  const enhancedAssets = useMemo(() => {
    const getAssetTypeLabel = (type) => {
      const types = {
        'STORAGE_TANK': 'Tank',
        'FUEL_PUMP': 'Pump',
        'ISLAND': 'Island',
        'WAREHOUSE': 'Warehouse'
      };
      return types[type] || type;
    };

    const getStatusLabel = (status) => {
      const statuses = {
        'REGISTERED': 'Registered',
        'ASSIGNED': 'Assigned',
        'ACTIVE': 'Active',
        'INACTIVE': 'Inactive',
        'MAINTENANCE': 'Maintenance'
      };
      return statuses[status] || status;
    };

    const getConnectionStatus = (asset, connections) => {
      if (!connections || connections.length === 0) return 'Unconnected';
      
      const hasTankConnection = connections.some(conn => 
        (conn.type === 'TANK_TO_PUMP' && conn.assetB.id === asset.id) ||
        (conn.type === 'TANK_TO_ISLAND' && conn.assetA.id === asset.id)
      );
      
      const hasPumpConnection = connections.some(conn => 
        (conn.type === 'PUMP_TO_ISLAND' && conn.assetA.id === asset.id) ||
        (conn.type === 'TANK_TO_PUMP' && conn.assetA.id === asset.id)
      );
      
      const hasIslandConnection = connections.some(conn => 
        (conn.type === 'TANK_TO_ISLAND' && conn.assetB.id === asset.id) ||
        (conn.type === 'PUMP_TO_ISLAND' && conn.assetB.id === asset.id)
      );

      if (asset.type === 'STORAGE_TANK') {
        return hasTankConnection ? 'Connected' : 'Unconnected';
      } else if (asset.type === 'FUEL_PUMP') {
        return (hasPumpConnection || hasTankConnection) ? 'Connected' : 'Unconnected';
      } else if (asset.type === 'ISLAND') {
        return (hasIslandConnection) ? 'Connected' : 'Unconnected';
      }
      return 'N/A';
    };

    // Add sequence numbers while enhancing
    return assets.map((asset, index) => ({
      ...asset,
      sequenceNumber: index + 1, // Add sequence number here
      assetTypeDisplay: getAssetTypeLabel(asset.type),
      statusDisplay: getStatusLabel(asset.status),
      stationName: asset.station?.name || 'Unassigned',
      stationCode: asset.station?.code || 'N/A',
      companyName: asset.company?.name || 'N/A',
      capacity: asset.tank?.capacity || 0,
      productName: asset.tank?.product?.name || 'N/A',
      connectionStatus: getConnectionStatus(asset, connections),
      formattedCreatedAt: asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'N/A',
      formattedUpdatedAt: asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString() : 'N/A',
      timestamp: new Date(asset.createdAt).getTime()
    }));
  }, [assets, connections]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalAssets = enhancedAssets.length;
    const stationAssets = enhancedAssets.filter(asset => asset.stationId === userInfo?.station?.id);
    const totalStationAssets = stationAssets.length;
    
    const tanks = stationAssets.filter(a => a.type === 'STORAGE_TANK');
    const pumps = stationAssets.filter(a => a.type === 'FUEL_PUMP');
    const islands = stationAssets.filter(a => a.type === 'ISLAND');
    const warehouses = stationAssets.filter(a => a.type === 'WAREHOUSE');
    
    const activeAssets = stationAssets.filter(a => a.status === 'ACTIVE');
    const inactiveAssets = stationAssets.filter(a => a.status === 'INACTIVE');
    const maintenanceAssets = stationAssets.filter(a => a.status === 'MAINTENANCE');
    
    const connectedAssets = stationAssets.filter(a => a.connectionStatus === 'Connected');
    const unconnectedAssets = stationAssets.filter(a => a.connectionStatus === 'Unconnected');
    
    const totalCapacity = tanks.reduce((sum, tank) => sum + (tank.capacity || 0), 0);
    
    return {
      totalAssets,
      totalStationAssets,
      tanksCount: tanks.length,
      pumpsCount: pumps.length,
      islandsCount: islands.length,
      warehousesCount: warehouses.length,
      activeAssetsCount: activeAssets.length,
      inactiveAssetsCount: inactiveAssets.length,
      maintenanceAssetsCount: maintenanceAssets.length,
      connectedAssetsCount: connectedAssets.length,
      unconnectedAssetsCount: unconnectedAssets.length,
      totalCapacity,
      availableAssetsCount: enhancedAssets.filter(a => !a.stationId).length
    };
  }, [enhancedAssets, userInfo]);

  // Enhanced station assets by type WITH SEQUENCE NUMBERS
  const enhancedStationTanks = useMemo(() => 
    addSequenceNumbers(enhancedAssets.filter(asset => 
      asset.type === 'STORAGE_TANK' && asset.stationId === userInfo?.station?.id
    )),
  [enhancedAssets, userInfo]);

  const enhancedStationPumps = useMemo(() => 
    addSequenceNumbers(enhancedAssets.filter(asset => 
      asset.type === 'FUEL_PUMP' && asset.stationId === userInfo?.station?.id
    )),
  [enhancedAssets, userInfo]);

  const enhancedStationIslands = useMemo(() => 
    addSequenceNumbers(enhancedAssets.filter(asset => 
      asset.type === 'ISLAND' && asset.stationId === userInfo?.station?.id
    )),
  [enhancedAssets, userInfo]);

  const enhancedStationWarehouses = useMemo(() => 
    addSequenceNumbers(enhancedAssets.filter(asset => 
      asset.type === 'WAREHOUSE' && asset.stationId === userInfo?.station?.id
    )),
  [enhancedAssets, userInfo]);

  // Summary data for report header
  const summaryData = {
    'Station Name': userInfo?.station?.name || 'N/A',
    'Station Code': userInfo?.station?.code || 'N/A',
    'Total Assets': summaryStats.totalStationAssets,
    'Tanks': summaryStats.tanksCount,
    'Pumps': summaryStats.pumpsCount,
    'Islands': summaryStats.islandsCount,
    'Warehouses': summaryStats.warehousesCount,
    'Active Assets': summaryStats.activeAssetsCount,
    'Inactive Assets': summaryStats.inactiveAssetsCount,
    'Maintenance Assets': summaryStats.maintenanceAssetsCount,
    'Connected Assets': summaryStats.connectedAssetsCount,
    'Unconnected Assets': summaryStats.unconnectedAssetsCount,
    'Total Capacity': `${summaryStats.totalCapacity}L`,
    'Available Assets': summaryStats.availableAssetsCount,
    'Report Generated': new Date().toLocaleString(),
    'Generated By': userInfo?.user ? `${userInfo.user.firstName} ${userInfo.user.lastName}` : 'System'
  };

  // Handle updating asset
  const handleUpdateAsset = async (assetId, updateData) => {
    try {
      await assetService.updateAsset(assetId, updateData);
      await refreshData();
      console.log('✅ Asset updated successfully');
    } catch (error) {
      console.error('❌ Failed to update asset:', error);
      throw new Error(error.message || 'Failed to update asset');
    }
  };

  // Handle attaching assets to station
  const handleAttachAsset = async (assetId, assetType) => {
    try {
      await assetService.assignToStation(assetId, userInfo.station?.id);
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
      await assetService.removeFromStation(assetId);
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
      const connectionPromises = selectedPumps.map(pumpId => 
        assetConnectionService.createConnection({
          type: 'TANK_TO_PUMP',
          assetAId: selectedTank,
          assetBId: pumpId,
          stationId: userInfo.station?.id
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

      assetsForIsland.tanks.forEach(tankId => {
        connectionPromises.push(
          assetConnectionService.createConnection({
            type: 'TANK_TO_ISLAND',
            assetAId: tankId,
            assetBId: selectedIsland,
            stationId: userInfo.station?.id
          })
        );
      });

      assetsForIsland.pumps.forEach(pumpId => {
        connectionPromises.push(
          assetConnectionService.createConnection({
            type: 'PUMP_TO_ISLAND',
            assetAId: pumpId,
            assetBId: selectedIsland,
            stationId: userInfo.station?.id
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

  // Get data source for export based on active tab
  const getExportDataSource = () => {
    switch (activeTab) {
      case 'tanks': return enhancedStationTanks;
      case 'pumps': return enhancedStationPumps;
      case 'islands': return enhancedStationIslands;
      case 'warehouses': return enhancedStationWarehouses;
      case 'relationships': return enhancedAssets.filter(a => a.stationId === userInfo?.station?.id);
      default: return enhancedStationTanks;
    }
  };

  // Get export columns based on active tab - FIXED with proper sequence column
  const getExportColumns = () => {
    const commonColumns = [
      {
        title: '#',
        dataIndex: 'sequenceNumber',
        key: 'sequence',
        type: 'number',
        width: 50
      },
      {
        title: 'Asset ID',
        dataIndex: 'id',
        key: 'assetId',
        type: 'text'
      },
      {
        title: 'Asset Name',
        dataIndex: 'name',
        key: 'assetName',
        type: 'text'
      },
      {
        title: 'Asset Type',
        key: 'assetType',
        render: (_, record) => record.assetTypeDisplay,
        type: 'text'
      },
      {
        title: 'Station Label',
        dataIndex: 'stationLabel',
        key: 'stationLabel',
        render: (label) => label || 'Not set',
        type: 'text'
      },
      {
        title: 'Status',
        key: 'status',
        render: (_, record) => record.statusDisplay,
        type: 'text'
      },
      {
        title: 'Connection Status',
        key: 'connectionStatus',
        render: (_, record) => record.connectionStatus,
        type: 'text'
      },
      {
        title: 'Station Name',
        key: 'stationName',
        render: (_, record) => record.stationName,
        type: 'text'
      },
      {
        title: 'Station Code',
        key: 'stationCode',
        render: (_, record) => record.stationCode,
        type: 'text'
      },
      {
        title: 'Company Name',
        key: 'companyName',
        render: (_, record) => record.companyName,
        type: 'text'
      },
      {
        title: 'Created Date',
        key: 'createdDate',
        render: (_, record) => record.formattedCreatedAt,
        type: 'date'
      },
      {
        title: 'Last Updated',
        key: 'lastUpdated',
        render: (_, record) => record.formattedUpdatedAt,
        type: 'date'
      }
    ];

    const typeSpecificColumns = {
      tanks: [
        {
          title: 'Capacity (Liters)',
          key: 'capacity',
          render: (_, record) => record.capacity || 0,
          type: 'number'
        },
        {
          title: 'Product Name',
          key: 'productName',
          render: (_, record) => record.productName,
          type: 'text'
        }
      ],
      pumps: [
        {
          title: 'Flow Rate',
          dataIndex: 'flowRate',
          key: 'flowRate',
          render: (rate) => rate ? `${rate} L/min` : 'N/A',
          type: 'text'
        }
      ],
      islands: [
        {
          title: 'Island Number',
          dataIndex: 'islandNumber',
          key: 'islandNumber',
          render: (number) => number || 'N/A',
          type: 'text'
        }
      ],
      warehouses: [
        {
          title: 'Warehouse Type',
          dataIndex: 'warehouseType',
          key: 'warehouseType',
          render: (type) => type || 'N/A',
          type: 'text'
        }
      ],
      relationships: [
        {
          title: 'Connected Assets Count',
          key: 'connectedAssetsCount',
          render: (_, record) => {
            const connectionsCount = connections.filter(conn => 
              conn.assetA.id === record.id || conn.assetB.id === record.id
            ).length;
            return connectionsCount;
          },
          type: 'number'
        }
      ]
    };

    return [...commonColumns, ...(typeSpecificColumns[activeTab] || [])];
  };

  // Get tab title
  const getTabTitle = () => {
    const titles = {
      'tanks': 'Storage Tanks',
      'pumps': 'Fuel Pumps',
      'islands': 'Allocation Islands',
      'warehouses': 'Warehouses',
      'relationships': 'Asset Relationships'
    };
    return titles[activeTab] || 'Assets';
  };

  // Get file name
  const getFileName = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const stationCode = userInfo?.station?.code || 'station';
    return `station_assets_${activeTab}_${stationCode}_${dateStr}`;
  };

  // Handle export
  const handleExport = (format) => {
    console.log(`Exporting ${getExportDataSource().length} ${activeTab} assets as ${format}`);
  };

  // Column definitions WITH FIXED SEQUENCE NUMBERS
  const pumpColumns = [
    { 
      header: '#', 
      accessor: '_sequence',
      width: '50px'
    },
    { header: 'Name', accessor: 'name' },
    { 
      header: 'Station Label', 
      render: (_, pump) => (
        <div className="flex items-center">
          {pump.stationLabel ? (
            <span className="font-medium text-blue-600">{pump.stationLabel}</span>
          ) : (
            <span className="text-gray-500 italic">Not set</span>
          )}
        </div>
      )
    },
    { 
      header: 'Tank Attachment', 
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
    { 
      header: 'Island Attachment', 
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
    { 
      header: 'Status', 
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
    { 
      header: 'Actions', 
      render: (_, pump) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setEditingAsset(pump);
              setShowEditModal(true);
            }}
          >
            <Edit size={14} className="mr-1" /> Edit
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => handleDetachAsset(pump.id, 'pumps')}
          >
            <Unlink size={14} className="mr-1" /> Detach
          </Button>
        </div>
      )
    }
  ];

  const tankColumns = [
    { 
      header: '#', 
      accessor: '_sequence',
      width: '50px'
    },
    { header: 'Name', accessor: 'name' },
    { 
      header: 'Station Label', 
      render: (_, tank) => (
        <div className="flex items-center">
          {tank.stationLabel ? (
            <span className="font-medium text-blue-600">{tank.stationLabel}</span>
          ) : (
            <span className="text-gray-500 italic">Not set</span>
          )}
        </div>
      )
    },
    { 
      header: 'Pumps Attached', 
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
            {pumpConnections.length === 0 && <Badge variant="outline">No pumps</Badge>}
          </div>
        );
      }
    },
    { 
      header: 'Island Attachment', 
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
    { 
      header: 'Product', 
      render: (_, tank) => tank.tank?.product?.name || 'No product'
    },
    { 
      header: 'Capacity', 
      render: (_, tank) => tank.tank?.capacity ? `${tank.tank.capacity}L` : 'N/A'
    },
    { 
      header: 'Actions', 
      render: (_, tank) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setEditingAsset(tank);
              setShowEditModal(true);
            }}
          >
            <Edit size={14} className="mr-1" /> Edit
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => handleDetachAsset(tank.id, 'tanks')}
          >
            <Unlink size={14} className="mr-1" /> Detach
          </Button>
        </div>
      )
    }
  ];

  const islandColumns = [
    { 
      header: '#', 
      accessor: '_sequence',
      width: '50px'
    },
    { header: 'Name', accessor: 'name' },
    { 
      header: 'Station Label', 
      render: (_, island) => (
        <div className="flex items-center">
          {island.stationLabel ? (
            <span className="font-medium text-blue-600">{island.stationLabel}</span>
          ) : (
            <span className="text-gray-500 italic">Not set</span>
          )}
        </div>
      )
    },
    { 
      header: 'Tanks Attached', 
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
            {tankConnections.length === 0 && <Badge variant="outline">No tanks</Badge>}
          </div>
        );
      }
    },
    { 
      header: 'Pumps Attached', 
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
            {pumpConnections.length === 0 && <Badge variant="outline">No pumps</Badge>}
          </div>
        );
      }
    },
    { 
      header: 'Actions', 
      render: (_, island) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setEditingAsset(island);
              setShowEditModal(true);
            }}
          >
            <Edit size={14} className="mr-1" /> Edit
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => handleDetachAsset(island.id, 'islands')}
          >
            <Unlink size={14} className="mr-1" /> Detach
          </Button>
        </div>
      )
    }
  ];

  const warehouseColumns = [
    { 
      header: '#', 
      accessor: '_sequence',
      width: '50px'
    },
    { header: 'Name', accessor: 'name' },
    { 
      header: 'Station Label', 
      render: (_, warehouse) => (
        <div className="flex items-center">
          {warehouse.stationLabel ? (
            <span className="font-medium text-blue-600">{warehouse.stationLabel}</span>
          ) : (
            <span className="text-gray-500 italic">Not set</span>
          )}
        </div>
      )
    },
    { 
      header: 'Actions', 
      render: (_, warehouse) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setEditingAsset(warehouse);
              setShowEditModal(true);
            }}
          >
            <Edit size={14} className="mr-1" /> Edit
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => handleDetachAsset(warehouse.id, 'warehouses')}
          >
            <Unlink size={14} className="mr-1" /> Detach
          </Button>
        </div>
      )
    }
  ];

  // Get assets for current user
  const userStationId = userInfo?.station?.id;
  const userCompanyId = userInfo?.company?.id;

  if (!userInfo) {
    return (
      <div className="p-6">
        <Alert variant="error">Unable to load user information. Please try logging in again.</Alert>
      </div>
    );
  }

  if (!userStationId) {
    return (
      <div className="p-6">
        <Alert variant="warning">No station assigned to your account. Please contact your administrator.</Alert>
      </div>
    );
  }

  // Get assets attached to this user's station
  const stationTanks = addSequenceNumbers(assets.filter(asset => 
    asset.type === 'STORAGE_TANK' && asset.stationId === userStationId
  ));
  
  const stationPumps = addSequenceNumbers(assets.filter(asset => 
    asset.type === 'FUEL_PUMP' && asset.stationId === userStationId
  ));
  
  const stationIslands = addSequenceNumbers(assets.filter(asset => 
    asset.type === 'ISLAND' && asset.stationId === userStationId
  ));
  
  const stationWarehouses = addSequenceNumbers(assets.filter(asset => 
    asset.type === 'WAREHOUSE' && asset.stationId === userStationId
  ));

  // Get unattached assets in the same company WITH SEQUENCE NUMBERS
  const unattachedTanks = addSequenceNumbers(assets.filter(asset => 
    asset.type === 'STORAGE_TANK' && (!asset.stationId || asset.stationId !== userStationId) && asset.companyId === userCompanyId
  ));
  
  const unattachedPumps = addSequenceNumbers(assets.filter(asset => 
    asset.type === 'FUEL_PUMP' && (!asset.stationId || asset.stationId !== userStationId) && asset.companyId === userCompanyId
  ));
  
  const unattachedIslands = addSequenceNumbers(assets.filter(asset => 
    asset.type === 'ISLAND' && (!asset.stationId || asset.stationId !== userStationId) && asset.companyId === userCompanyId
  ));
  
  const unattachedWarehouses = addSequenceNumbers(assets.filter(asset => 
    asset.type === 'WAREHOUSE' && (!asset.stationId || asset.stationId !== userStationId) && asset.companyId === userCompanyId
  ));

  // Enhanced asset filtering using connection data
  const getConnectedAssets = (connectionType) => {
    if (!connections || connections.length === 0) return new Set();
    
    const connectedAssetIds = new Set();
    connections.forEach(connection => {
      if (connection.type === connectionType) {
        if (connectionType === 'TANK_TO_PUMP') {
          connectedAssetIds.add(connection.assetB.id);
        } else if (connectionType === 'TANK_TO_ISLAND') {
          connectedAssetIds.add(connection.assetA.id);
        } else if (connectionType === 'PUMP_TO_ISLAND') {
          connectedAssetIds.add(connection.assetA.id);
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
        <div className="flex items-center space-x-4">
          <AdvancedReportGenerator
            dataSource={getExportDataSource()}
            columns={getExportColumns()}
            title={`${getTabTitle()} Report - ${userInfo.station?.name}`}
            fileName={getFileName()}
            summaryData={summaryData}
            reportType="operations"
            stationInfo={userInfo.station}
            footerText={`Generated from Lynx Energy System - ${userInfo.user ? `User: ${userInfo.user.firstName} ${userInfo.user.lastName}` : ''} - ${new Date().toLocaleDateString()}`}
            showFooter={true}
            enableCustomization={true}
            onReportGenerate={handleExport}
          />
          <Badge variant="outline" className="text-sm">
            Station Manager: {userInfo.user?.firstName} {userInfo.user?.lastName}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50">
          <div className="p-4">
            <div className="flex items-center">
              <Fuel className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{summaryStats.tanksCount}</div>
                <div className="text-sm text-gray-600">Storage Tanks</div>
                <div className="text-xs text-gray-500">{summaryStats.totalCapacity}L total capacity</div>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-yellow-50">
          <div className="p-4">
            <div className="flex items-center">
              <Zap className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{summaryStats.pumpsCount}</div>
                <div className="text-sm text-gray-600">Fuel Pumps</div>
                <div className="text-xs text-gray-500">{summaryStats.connectedAssetsCount} connected</div>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-green-50">
          <div className="p-4">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{summaryStats.islandsCount}</div>
                <div className="text-sm text-gray-600">Allocation Islands</div>
                <div className="text-xs text-gray-500">Service points</div>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-purple-50">
          <div className="p-4">
            <div className="flex items-center">
              <Warehouse className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{summaryStats.warehousesCount}</div>
                <div className="text-sm text-gray-600">Warehouses</div>
                <div className="text-xs text-gray-500">Storage facilities</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      {/* Asset Type Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'tanks', label: 'Tanks', icon: Fuel, count: summaryStats.tanksCount },
            { id: 'pumps', label: 'Pumps', icon: Zap, count: summaryStats.pumpsCount },
            { id: 'islands', label: 'Islands', icon: Package, count: summaryStats.islandsCount },
            { id: 'warehouses', label: 'Warehouses', icon: Warehouse, count: summaryStats.warehousesCount },
            { id: 'relationships', label: 'Relationships', icon: Link, count: summaryStats.connectedAssetsCount }
          ].map(tab => (
            <Tab
              key={tab.id}
              value={tab.id}
              icon={tab.icon}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="flex items-center">
                {tab.label}
                <Badge variant="outline" className="ml-2 text-xs">{tab.count}</Badge>
              </div>
            </Tab>
          ))}
        </nav>
      </div>

      {/* Tanks Tab */}
      <TabPanel value={activeTab} tabId="tanks">
        <div className="space-y-6">
          <Card title={`Station Tanks (${stationTanks.length})`}>
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
                  { 
                    header: '#', 
                    accessor: '_sequence',
                    width: '50px'
                  },
                  { header: 'Name', accessor: 'name' },
                  { 
                    header: 'Capacity', 
                    render: (_, tank) => tank.tank?.capacity ? `${tank.tank.capacity}L` : 'N/A'
                  },
                  { 
                    header: 'Product', 
                    render: (_, tank) => tank.tank?.product?.name || 'No product'
                  },
                  { 
                    header: 'Actions', 
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
          <Card title={`Station Pumps (${stationPumps.length})`}>
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
                  { 
                    header: '#', 
                    accessor: '_sequence',
                    width: '50px'
                  },
                  { header: 'Name', accessor: 'name' },
                  { 
                    header: 'Actions', 
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
          <Card title={`Allocation Points (${stationIslands.length})`}>
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
                  { 
                    header: '#', 
                    accessor: '_sequence',
                    width: '50px'
                  },
                  { header: 'Name', accessor: 'name' },
                  { 
                    header: 'Actions', 
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
          <Card title={`Station Warehouses (${stationWarehouses.length})`}>
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
                  { 
                    header: '#', 
                    accessor: '_sequence',
                    width: '50px'
                  },
                  { header: 'Name', accessor: 'name' },
                  { 
                    header: 'Actions', 
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
                  {stationTanks.map((tank) => (
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
                        <div className="mr-2 text-sm font-medium text-gray-600">{tank._sequence}</div>
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
                  {pumpsAvailableForTankConnection.map((pump) => (
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
                          <div className="mr-2 text-sm font-medium text-gray-600">{pump._sequence}</div>
                          <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                          <div>
                            <div className="font-medium">{pump.name}</div>
                            <div className="text-sm text-gray-500">Pump</div>
                            {pumpsConnectedToIslands.has(pump.id) && (
                              <Badge variant="yellow" className="mt-1">Connected to Island</Badge>
                            )}
                          </div>
                        </div>
                        {selectedPumps.includes(pump.id) && <Badge variant="yellow">Selected</Badge>}
                      </div>
                    </div>
                  ))}
                  {pumpsAvailableForTankConnection.length === 0 && (
                    <div className="text-center text-gray-500 py-4">All pumps are already connected to tanks</div>
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
                  {stationIslands.map((island) => (
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
                        <div className="mr-2 text-sm font-medium text-gray-600">{island._sequence}</div>
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
                  {tanksAvailableForIslandConnection.map((tank) => (
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
                          <div className="mr-2 text-sm font-medium text-gray-600">{tank._sequence}</div>
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
                  {tanksAvailableForIslandConnection.length === 0 && (
                    <div className="text-center text-gray-500 py-4">All tanks are already connected to islands</div>
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
                  {pumpsAvailableForIslandConnection.map((pump) => (
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
                          <div className="mr-2 text-sm font-medium text-gray-600">{pump._sequence}</div>
                          <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                          <div>
                            <div className="font-medium">{pump.name}</div>
                            <div className="text-sm text-gray-500">Pump</div>
                            {pumpsConnectedToTanks.has(pump.id) && (
                              <Badge variant="yellow" className="mt-1">Connected to Tank</Badge>
                            )}
                          </div>
                        </div>
                        {assetsForIsland.pumps.includes(pump.id) && <Badge variant="yellow">Selected</Badge>}
                      </div>
                    </div>
                  ))}
                  {pumpsAvailableForIslandConnection.length === 0 && (
                    <div className="text-center text-gray-500 py-4">All pumps are already connected to islands</div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </TabPanel>

      {/* Edit Asset Modal */}
      {showEditModal && editingAsset && (
        <EditAssetModal
          asset={editingAsset}
          onSave={handleUpdateAsset}
          onClose={() => {
            setShowEditModal(false);
            setEditingAsset(null);
          }}
          userRole={userInfo?.user?.role}
        />
      )}
    </div>
  );
};

export default StationAssetManagement;