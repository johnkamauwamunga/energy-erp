import React, { useState, useMemo } from 'react';
import { Button, Card, Table, Badge } from '../../../../ui';
import { useApp } from '../../../../../context/AppContext';
import { 
  attachAssetToStation, 
  detachAssetFromStation,
  attachPumpsToTank,
  attachAssetsToIsland
} from '../../../../../context/AppContext/actions';
import { Fuel, Zap, Package, Link, Unlink, Download, FileText, Printer } from 'lucide-react';
import AdvancedReportGenerator from '../../downloadable/AdvancedReportGenerator';

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
  const currentStation = state.currentStation;
  const currentUser = state.currentUser;

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

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    return {
      totalTanks: stationTanks.length,
      totalPumps: stationPumps.length,
      totalIslands: stationIslands.length,
      attachedTanks: stationTanks.filter(t => t.islandId).length,
      attachedPumps: stationPumps.filter(p => p.tankId || p.islandId).length,
      totalCapacity: stationTanks.reduce((sum, tank) => sum + (tank.capacity || 0), 0),
      activePumps: stationPumps.filter(p => p.status === 'active').length,
      inactivePumps: stationPumps.filter(p => p.status !== 'active').length,
      availableAssets: unattachedTanks.length + unattachedPumps.length + unattachedIslands.length
    };
  }, [stationTanks, stationPumps, stationIslands, unattachedTanks, unattachedPumps, unattachedIslands]);

  // Enhanced data for reports WITH SEQUENTIAL NUMBERING
  const enhancedStationTanks = useMemo(() => 
    stationTanks.map((tank, index) => ({
      ...tank,
      sequentialNumber: index + 1,
      attachedPumpsCount: state.assets?.pumps?.filter(p => p.tankId === tank.id).length || 0,
      attachedPumpsCodes: state.assets?.pumps?.filter(p => p.tankId === tank.id).map(p => p.code).join(', ') || 'None',
      islandName: tank.islandId ? state.islands?.find(i => i.id === tank.islandId)?.name || 'N/A' : 'Not assigned',
      formattedCapacity: `${tank.capacity || 0}L`,
      productDisplay: tank.productType || 'N/A',
      status: 'Attached',
      timestamp: new Date().getTime()
    })),
  [stationTanks, state.assets?.pumps, state.islands]);

  const enhancedStationPumps = useMemo(() => 
    stationPumps.map((pump, index) => ({
      ...pump,
      sequentialNumber: index + 1,
      tankCode: pump.tankId ? state.assets?.tanks?.find(t => t.id === pump.tankId)?.code || 'N/A' : 'Not assigned',
      islandName: pump.islandId ? state.islands?.find(i => i.id === pump.islandId)?.name || 'N/A' : 'Not assigned',
      attachmentType: pump.tankId ? 'Tank' : pump.islandId ? 'Island' : 'Not attached',
      statusDisplay: pump.status?.charAt(0).toUpperCase() + pump.status?.slice(1) || 'Unknown',
      formattedStatus: pump.status || 'unknown',
      timestamp: new Date().getTime()
    })),
  [stationPumps, state.assets?.tanks, state.islands]);

  const enhancedStationIslands = useMemo(() => 
    stationIslands.map((island, index) => ({
      ...island,
      sequentialNumber: index + 1,
      attachedTanksCount: state.assets?.tanks?.filter(t => t.islandId === island.id).length || 0,
      attachedPumpsCount: state.assets?.pumps?.filter(p => p.islandId === island.id).length || 0,
      attachedAssets: [
        ...(state.assets?.tanks?.filter(t => t.islandId === island.id).map(t => `Tank: ${t.code}`) || []),
        ...(state.assets?.pumps?.filter(p => p.islandId === island.id).map(p => `Pump: ${p.code}`) || [])
      ].join(', ') || 'No assets attached',
      totalAssets: (state.assets?.tanks?.filter(t => t.islandId === island.id).length || 0) + 
                   (state.assets?.pumps?.filter(p => p.islandId === island.id).length || 0),
      timestamp: new Date().getTime()
    })),
  [stationIslands, state.assets?.tanks, state.assets?.pumps]);

  // Summary data for report header
  const summaryData = useMemo(() => ({
    'Station Name': currentStation?.name || 'N/A',
    'Station Code': currentStation?.code || 'N/A',
    'Total Tanks': summaryStats.totalTanks,
    'Total Pumps': summaryStats.totalPumps,
    'Total Islands': summaryStats.totalIslands,
    'Total Capacity': `${summaryStats.totalCapacity}L`,
    'Active Pumps': summaryStats.activePumps,
    'Inactive Pumps': summaryStats.inactivePumps,
    'Attached Tanks': summaryStats.attachedTanks,
    'Attached Pumps': summaryStats.attachedPumps,
    'Available Assets': summaryStats.availableAssets,
    'Generated By': currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System',
    'Generation Date': new Date().toLocaleString()
  }), [currentStation, summaryStats, currentUser]);

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

  // Table columns with sequential numbering
  const tankColumns = [
    { 
      header: '#', 
      accessor: 'id',
      render: (_, __, index) => (
        <span className="text-sm text-gray-500">{index + 1}</span>
      ),
      width: '50px'
    },
    { header: 'Code', accessor: 'code' },
    { header: 'Name', accessor: 'name' },
    { header: 'Capacity', accessor: 'capacity', render: value => `${value}L` },
    { header: 'Product', accessor: 'productType' },
    { 
      header: 'Allocation Point', 
      render: (_, tank) => (
        tank.islandId 
          ? state.islands?.find(i => i.id === tank.islandId)?.name || 'N/A'
          : 'Not assigned'
      )
    },
    { 
      header: 'Attached Pumps', 
      render: (_, tank) => {
        const attachedPumps = state.assets?.pumps?.filter(p => p.tankId === tank.id) || [];
        return (
          <div className="flex flex-wrap gap-1">
            {attachedPumps.map(p => (
              <Badge key={p.id} variant="outline">{p.code}</Badge>
            ))}
            {attachedPumps.length === 0 && <span className="text-gray-400">None</span>}
          </div>
        );
      }
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
    { 
      header: '#', 
      accessor: 'id',
      render: (_, __, index) => (
        <span className="text-sm text-gray-500">{index + 1}</span>
      ),
      width: '50px'
    },
    { header: 'Code', accessor: 'code' },
    { header: 'Name', accessor: 'name' },
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
      render: (_, pump) => {
        if (pump.tankId) {
          const tank = state.assets?.tanks?.find(t => t.id === pump.tankId);
          return `Tank: ${tank?.code || 'N/A'}`;
        } else if (pump.islandId) {
          const island = state.islands?.find(i => i.id === pump.islandId);
          return `Allocation Point: ${island?.name || 'N/A'}`;
        }
        return 'Not attached';
      }
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
    { 
      header: '#', 
      accessor: 'id',
      render: (_, __, index) => (
        <span className="text-sm text-gray-500">{index + 1}</span>
      ),
      width: '50px'
    },
    { header: 'Name', accessor: 'name' },
    { header: 'Code', accessor: 'code' },
    { header: 'Description', accessor: 'description' },
    { 
      header: 'Attached Assets', 
      render: (_, island) => {
        const attachedTanks = state.assets?.tanks?.filter(t => t.islandId === island.id) || [];
        const attachedPumps = state.assets?.pumps?.filter(p => p.islandId === island.id) || [];
        
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {attachedTanks.map(t => (
                <Badge key={t.id} variant="blue">
                  <Fuel size={14} className="mr-1" /> {t.code}
                </Badge>
              ))}
              {attachedPumps.map(p => (
                <Badge key={p.id} variant="yellow">
                  <Zap size={14} className="mr-1" /> {p.code}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-gray-500">
              {attachedTanks.length} tanks, {attachedPumps.length} pumps
            </div>
          </div>
        );
      }
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

  // Export columns for reports
  const getExportColumns = (assetType) => {
    const baseColumns = [
      {
        title: '#',
        key: 'sequence',
        render: (_, __, index) => index + 1,
        type: 'number',
        width: 50
      },
      {
        title: 'Asset Type',
        key: 'assetType',
        render: () => {
          switch(assetType) {
            case 'tanks': return 'Tank';
            case 'pumps': return 'Pump';
            case 'islands': return 'Allocation Point';
            default: return 'Asset';
          }
        },
        type: 'text'
      },
      {
        title: 'Station Name',
        key: 'stationName',
        render: () => currentStation?.name || 'N/A',
        type: 'text'
      },
      {
        title: 'Station Code',
        key: 'stationCode',
        render: () => currentStation?.code || 'N/A',
        type: 'text'
      },
      {
        title: 'Report Date',
        key: 'reportDate',
        render: () => new Date().toLocaleDateString(),
        type: 'date'
      }
    ];

    const typeSpecificColumns = {
      tanks: [
        {
          title: 'Tank Code',
          dataIndex: 'code',
          key: 'tankCode',
          type: 'text'
        },
        {
          title: 'Tank Name',
          dataIndex: 'name',
          key: 'tankName',
          type: 'text'
        },
        {
          title: 'Capacity',
          dataIndex: 'capacity',
          key: 'capacity',
          render: (value) => value || 0,
          type: 'number'
        },
        {
          title: 'Product Type',
          dataIndex: 'productType',
          key: 'productType',
          render: (value) => value || 'N/A',
          type: 'text'
        },
        {
          title: 'Allocation Point',
          key: 'allocationPoint',
          render: (_, record) => record.islandName || 'Not assigned',
          type: 'text'
        },
        {
          title: 'Attached Pumps Count',
          key: 'attachedPumpsCount',
          render: (_, record) => record.attachedPumpsCount || 0,
          type: 'number'
        },
        {
          title: 'Attached Pumps',
          key: 'attachedPumps',
          render: (_, record) => record.attachedPumpsCodes || 'None',
          type: 'text'
        },
        {
          title: 'Status',
          key: 'status',
          render: () => 'Attached to Station',
          type: 'text'
        }
      ],
      pumps: [
        {
          title: 'Pump Code',
          dataIndex: 'code',
          key: 'pumpCode',
          type: 'text'
        },
        {
          title: 'Pump Name',
          dataIndex: 'name',
          key: 'pumpName',
          type: 'text'
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'pumpStatus',
          render: (value) => value?.charAt(0).toUpperCase() + value?.slice(1) || 'Unknown',
          type: 'text'
        },
        {
          title: 'Attachment Type',
          key: 'attachmentType',
          render: (_, record) => record.attachmentType,
          type: 'text'
        },
        {
          title: 'Attached To Tank',
          key: 'attachedToTank',
          render: (_, record) => record.tankCode,
          type: 'text'
        },
        {
          title: 'Attached To Island',
          key: 'attachedToIsland',
          render: (_, record) => record.islandName,
          type: 'text'
        },
        {
          title: 'Current Status',
          dataIndex: 'formattedStatus',
          key: 'currentStatus',
          render: (value) => value?.charAt(0).toUpperCase() + value?.slice(1) || 'Unknown',
          type: 'text'
        }
      ],
      islands: [
        {
          title: 'Island Name',
          dataIndex: 'name',
          key: 'islandName',
          type: 'text'
        },
        {
          title: 'Island Code',
          dataIndex: 'code',
          key: 'islandCode',
          type: 'text'
        },
        {
          title: 'Description',
          dataIndex: 'description',
          key: 'description',
          render: (value) => value || 'N/A',
          type: 'text'
        },
        {
          title: 'Attached Tanks Count',
          key: 'attachedTanksCount',
          render: (_, record) => record.attachedTanksCount || 0,
          type: 'number'
        },
        {
          title: 'Attached Pumps Count',
          key: 'attachedPumpsCount',
          render: (_, record) => record.attachedPumpsCount || 0,
          type: 'number'
        },
        {
          title: 'Total Attached Assets',
          key: 'totalAssets',
          render: (_, record) => record.totalAssets || 0,
          type: 'number'
        },
        {
          title: 'Attached Assets List',
          key: 'attachedAssets',
          render: (_, record) => record.attachedAssets || 'No assets attached',
          type: 'text'
        }
      ]
    };

    return [...baseColumns, ...(typeSpecificColumns[assetType] || [])];
  };

  // Get data source based on active tab
  const getDataSource = () => {
    switch (activeTab) {
      case 'tanks': return enhancedStationTanks;
      case 'pumps': return enhancedStationPumps;
      case 'islands': return enhancedStationIslands;
      default: return [];
    }
  };

  // Get title based on active tab
  const getReportTitle = () => {
    const titles = {
      'tanks': 'Station Tank Assets',
      'pumps': 'Station Pump Assets',
      'islands': 'Station Allocation Points',
      'relationships': 'Asset Relationships'
    };
    return `${titles[activeTab]} - ${currentStation?.name || 'Station'}`;
  };

  // Get file name based on active tab
  const getFileName = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    return `station_assets_${activeTab}_${currentStation?.code || 'station'}_${dateStr}`;
  };

  // Main export handler
  const handleExport = (format) => {
    console.log(`Exporting ${getDataSource().length} ${activeTab} assets as ${format}`);
  };

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
        <div className="flex items-center space-x-4">
          {/* Export Button */}
          <AdvancedReportGenerator
            dataSource={getDataSource()}
            columns={getExportColumns(activeTab)}
            title={getReportTitle()}
            fileName={getFileName()}
            summaryData={summaryData}
            reportType="operations"
            stationInfo={currentStation}
            footerText={`Generated from Lynx Energy System - ${currentUser ? `User: ${currentUser.firstName} ${currentUser.lastName}` : ''} - ${new Date().toLocaleDateString()}`}
            showFooter={true}
            enableCustomization={true}
            onReportGenerate={handleExport}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50">
          <div className="p-4">
            <div className="flex items-center">
              <Fuel className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{summaryStats.totalTanks}</div>
                <div className="text-sm text-gray-600">Total Tanks</div>
                <div className="text-xs text-gray-500">{summaryStats.totalCapacity}L capacity</div>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-yellow-50">
          <div className="p-4">
            <div className="flex items-center">
              <Zap className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{summaryStats.totalPumps}</div>
                <div className="text-sm text-gray-600">Total Pumps</div>
                <div className="text-xs text-gray-500">
                  {summaryStats.activePumps} active, {summaryStats.inactivePumps} inactive
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-green-50">
          <div className="p-4">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{summaryStats.totalIslands}</div>
                <div className="text-sm text-gray-600">Allocation Points</div>
                <div className="text-xs text-gray-500">{summaryStats.attachedTanks} tanks attached</div>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-purple-50">
          <div className="p-4">
            <div className="flex items-center">
              <Link className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{summaryStats.availableAssets}</div>
                <div className="text-sm text-gray-600">Available Assets</div>
                <div className="text-xs text-gray-500">Ready for attachment</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {['tanks', 'pumps', 'islands', 'relationships'].map(tab => (
            <button
              key={tab}
              className={`pb-3 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tanks Tab */}
      {activeTab === 'tanks' && (
        <div className="space-y-6">
          <Card title="Station Tanks">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Attached Tanks</h3>
                <p className="text-sm text-gray-600">
                  {stationTanks.length} tanks attached to this station
                </p>
              </div>
            </div>
            <Table 
              columns={tankColumns} 
              data={stationTanks} 
              emptyMessage="No tanks attached to this station"
            />
          </Card>
          {unattachedTanks.length > 0 && (
            <Card title="Available Tanks" className="bg-blue-50">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Available for Attachment</h3>
                <p className="text-sm text-gray-600">
                  {unattachedTanks.length} tanks available from company inventory
                </p>
              </div>
              <Table
                columns={[
                  { 
                    header: '#', 
                    render: (_, __, index) => index + 1,
                    width: '50px'
                  },
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
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Attached Pumps</h3>
                <p className="text-sm text-gray-600">
                  {stationPumps.length} pumps attached to this station
                </p>
              </div>
            </div>
            <Table columns={pumpColumns} data={stationPumps} emptyMessage="No pumps attached to this station" />
          </Card>
          {unattachedPumps.length > 0 && (
            <Card title="Available Pumps" className="bg-yellow-50">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Available for Attachment</h3>
                <p className="text-sm text-gray-600">
                  {unattachedPumps.length} pumps available from company inventory
                </p>
              </div>
              <Table
                columns={[
                  { 
                    header: '#', 
                    render: (_, __, index) => index + 1,
                    width: '50px'
                  },
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
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Attached Allocation Points</h3>
                <p className="text-sm text-gray-600">
                  {stationIslands.length} allocation points attached to this station
                </p>
              </div>
            </div>
            <Table columns={islandColumns} data={stationIslands} emptyMessage="No allocation points attached to this station" />
          </Card>
          {unattachedIslands.length > 0 && (
            <Card title="Available Allocation Points" className="bg-green-50">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Available for Attachment</h3>
                <p className="text-sm text-gray-600">
                  {unattachedIslands.length} allocation points available from company inventory
                </p>
              </div>
              <Table
                columns={[
                  { 
                    header: '#', 
                    render: (_, __, index) => index + 1,
                    width: '50px'
                  },
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
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Create Tank-Pump Relationships</h3>
              <p className="text-sm text-gray-600">
                Select a tank and pumps to attach them together
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 text-gray-700">Select Tank</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stationTanks.map(tank => (
                    <div
                      key={tank.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedTank === tank.id ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedTank(tank.id)}
                    >
                      <div className="flex items-center">
                        <Fuel className="w-5 h-5 text-blue-500 mr-2" />
                        <div>
                          <div className="font-medium">{tank.code}</div>
                          <div className="text-sm text-gray-500">{tank.capacity}L · {tank.productType}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">Select Pumps</h4>
                  {selectedTank && (
                    <Button 
                      size="sm" 
                      onClick={handleAttachPumpsToTank} 
                      disabled={selectedPumps.length === 0}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      Attach {selectedPumps.length} Pump{selectedPumps.length !== 1 ? 's' : ''}
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pumpsWithoutTank.map(pump => (
                    <div
                      key={pump.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedPumps.includes(pump.id) ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => togglePumpSelection(pump.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                          <div>
                            <div className="font-medium">{pump.code}</div>
                            <div className="text-sm text-gray-500">{pump.status}</div>
                          </div>
                        </div>
                        {selectedPumps.includes(pump.id) && <Badge variant="yellow">Selected</Badge>}
                      </div>
                    </div>
                  ))}
                  {pumpsWithoutTank.length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      No unattached pumps available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Island-Asset Relationship */}
          <Card title="Attach Assets to Allocation Point">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Assign Assets to Allocation Points</h3>
              <p className="text-sm text-gray-600">
                Select an allocation point and assign tanks and pumps to it
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-3 text-gray-700">Select Allocation Point</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stationIslands.map(island => (
                    <div
                      key={island.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedIsland === island.id ? 'bg-green-100 border-2 border-green-300' : 'bg-gray-50 hover:bg-gray-100'
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
                <h4 className="font-medium mb-3 text-gray-700">Select Tanks</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stationTanks.filter(t => !t.islandId).map(tank => (
                    <div
                      key={tank.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        assetsForIsland.tanks.includes(tank.id) ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => toggleAssetForIsland(tank.id, 'tanks')}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Fuel className="w-5 h-5 text-blue-500 mr-2" />
                          <div>
                            <div className="font-medium">{tank.code}</div>
                            <div className="text-sm text-gray-500">{tank.capacity}L</div>
                          </div>
                        </div>
                        {assetsForIsland.tanks.includes(tank.id) && <Badge variant="blue">Selected</Badge>}
                      </div>
                    </div>
                  ))}
                  {stationTanks.filter(t => !t.islandId).length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      No unattached tanks available
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">Select Pumps</h4>
                  {selectedIsland && (
                    <Button 
                      size="sm"
                      onClick={handleAttachAssetsToIsland}
                      disabled={assetsForIsland.tanks.length === 0 && assetsForIsland.pumps.length === 0}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      Attach {assetsForIsland.tanks.length + assetsForIsland.pumps.length} Asset{assetsForIsland.tanks.length + assetsForIsland.pumps.length !== 1 ? 's' : ''}
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stationPumps.filter(p => !p.islandId && !p.tankId).map(pump => (
                    <div
                      key={pump.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        assetsForIsland.pumps.includes(pump.id) ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => toggleAssetForIsland(pump.id, 'pumps')}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                          <div>
                            <div className="font-medium">{pump.code}</div>
                            <div className="text-sm text-gray-500">{pump.status}</div>
                          </div>
                        </div>
                        {assetsForIsland.pumps.includes(pump.id) && <Badge variant="yellow">Selected</Badge>}
                      </div>
                    </div>
                  ))}
                  {stationPumps.filter(p => !p.islandId && !p.tankId).length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      No unattached pumps available
                    </div>
                  )}
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