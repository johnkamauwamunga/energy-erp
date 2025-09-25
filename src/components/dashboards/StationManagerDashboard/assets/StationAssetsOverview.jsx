import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Table, 
  Badge, 
  Button, 
  Tabs, 
  SearchInput, 
  FilterDropdown,
  StatusIndicator,
  Modal,
  EmptyState
} from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { assetConnectionService } from '../../../../services/assetConnection/assetConnectionService';
import { 
  fetchAssetAssignments,
  fetchConnectionHealth,
  setConnectionFilters
} from '../../../../context/AppContext/actions';
import { 
  Fuel, 
  Zap, 
  Package, 
  Warehouse, 
  Link, 
  Unlink, 
  Eye, 
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  Search
} from 'lucide-react';

const StationAssetsOverview = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('pumps');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [connectionFilter, setConnectionFilter] = useState('all');

  const stationId = state.currentStation?.id;
  const assignments = state.assetConnections?.assignments;
  const healthReport = state.assetConnections?.healthReport;

  useEffect(() => {
    if (stationId) {
      loadAssetData();
    }
  }, [stationId]);

  const loadAssetData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use the thunk actions from your context
      await dispatch(fetchAssetAssignments(stationId));
      await dispatch(fetchConnectionHealth(stationId));
      
    } catch (err) {
      setError(err.message);
      console.error('Failed to load asset data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to filter assets based on current filters
  const filterAssets = (assets, assetType) => {
    if (!assets || !Array.isArray(assets)) return [];

    return assets.filter(asset => {
      const assetData = asset.asset || asset;
      const matchesSearch = assetData.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assetData.code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const connectionStatus = asset.connectionStatus || asset.status || 'unknown';
      const matchesStatus = statusFilter === 'all' || 
                           connectionStatus.toLowerCase().includes(statusFilter);
      
      let matchesConnection = true;
      if (connectionFilter !== 'all') {
        if (assetType === 'pump') {
          const isConnected = asset.tank || asset.island;
          matchesConnection = connectionFilter === 'connected' ? isConnected : !isConnected;
        } else if (assetType === 'tank') {
          const isConnected = asset.island;
          matchesConnection = connectionFilter === 'connected' ? isConnected : !isConnected;
        }
      }

      return matchesSearch && matchesStatus && matchesConnection;
    });
  };

  // Get filtered assets directly from state
  const filteredPumps = useMemo(() => 
    filterAssets(assignments?.pumps, 'pump'), 
    [assignments, searchTerm, statusFilter, connectionFilter]
  );

  const filteredTanks = useMemo(() => 
    filterAssets(assignments?.tanks, 'tank'), 
    [assignments, searchTerm, statusFilter, connectionFilter]
  );

  const filteredIslands = useMemo(() => 
    filterAssets(assignments?.islands), 
    [assignments, searchTerm]
  );

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'fully_connected':
      case 'connected':
        return 'success';
      case 'partial':
        return 'warning';
      case 'disconnected':
      case 'unassigned':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'fully_connected':
      case 'connected':
        return <CheckCircle size={16} />;
      case 'partial':
        return <AlertTriangle size={16} />;
      case 'disconnected':
      case 'unassigned':
        return <XCircle size={16} />;
      default:
        return <Settings size={16} />;
    }
  };

  const AssetStatusBadge = ({ asset }) => {
    const status = asset.connectionStatus || asset.status || 'unknown';
    return (
      <Badge variant={getStatusVariant(status)} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const ConnectionInfo = ({ asset }) => {
    if (asset.asset?.type === 'FUEL_PUMP' || asset.type === 'FUEL_PUMP') {
      const assetData = asset.asset || asset;
      return (
        <div className="text-sm text-gray-600">
          {asset.tank && <div>↳ Tank: {asset.tank.asset?.name || asset.tank.name}</div>}
          {asset.island && <div>↳ Island: {asset.island.asset?.name || asset.island.name}</div>}
          {!asset.tank && !asset.island && <div className="text-red-500">Not connected</div>}
        </div>
      );
    }
    
    if (asset.asset?.type === 'STORAGE_TANK' || asset.type === 'STORAGE_TANK') {
      return (
        <div className="text-sm text-gray-600">
          {asset.island && <div>↳ Island: {asset.island.asset?.name || asset.island.name}</div>}
          {asset.pumps && asset.pumps.length > 0 && (
            <div>↳ Pumps: {asset.pumps.length} connected</div>
          )}
          {!asset.island && <div className="text-yellow-500">No island connection</div>}
        </div>
      );
    }

    return null;
  };

  const PumpTable = () => (
    <Table
      columns={[
        {
          header: 'Pump Info',
          render: (pump) => {
            const assetData = pump.asset || pump;
            return (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Zap size={20} className="text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">{assetData.name}</div>
                  <div className="text-sm text-gray-500">{assetData.code}</div>
                </div>
              </div>
            );
          }
        },
        {
          header: 'Status',
          render: (pump) => <AssetStatusBadge asset={pump} />
        },
        {
          header: 'Connections',
          render: (pump) => <ConnectionInfo asset={pump} />
        },
        {
          header: 'Actions',
          render: (pump) => {
            const assetData = pump.asset || pump;
            return (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAsset(assetData)}
                  className="flex items-center gap-1"
                >
                  <Eye size={14} />
                  Details
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedAsset({ ...assetData, action: 'assign' })}
                  className="flex items-center gap-1"
                >
                  <Link size={14} />
                  Assign
                </Button>
              </div>
            );
          }
        }
      ]}
      data={filteredPumps}
      emptyMessage={
        <EmptyState
          icon={Zap}
          title="No Pumps Found"
          description={searchTerm ? "Try adjusting your search criteria" : "No pumps are assigned to this station"}
        />
      }
    />
  );

  const TankTable = () => (
    <Table
      columns={[
        {
          header: 'Tank Info',
          render: (tank) => {
            const assetData = tank.asset || tank;
            return (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Fuel size={20} className="text-green-600" />
                </div>
                <div>
                  <div className="font-semibold">{assetData.name}</div>
                  <div className="text-sm text-gray-500">{assetData.code}</div>
                  <div className="text-xs text-gray-400">
                    Capacity: {assetData.capacity}L • Product: {assetData.product?.name || 'N/A'}
                  </div>
                </div>
              </div>
            );
          }
        },
        {
          header: 'Status',
          render: (tank) => <AssetStatusBadge asset={tank} />
        },
        {
          header: 'Connections',
          render: (tank) => <ConnectionInfo asset={tank} />
        },
        {
          header: 'Actions',
          render: (tank) => {
            const assetData = tank.asset || tank;
            return (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAsset(assetData)}
                  className="flex items-center gap-1"
                >
                  <Eye size={14} />
                  Details
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedAsset({ ...assetData, action: 'assign' })}
                  className="flex items-center gap-1"
                >
                  <Link size={14} />
                  Assign
                </Button>
              </div>
            );
          }
        }
      ]}
      data={filteredTanks}
      emptyMessage={
        <EmptyState
          icon={Fuel}
          title="No Tanks Found"
          description={searchTerm ? "Try adjusting your search criteria" : "No tanks are assigned to this station"}
        />
      }
    />
  );

  const IslandTable = () => (
    <Table
      columns={[
        {
          header: 'Island Info',
          render: (island) => {
            const assetData = island.asset || island;
            return (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Package size={20} className="text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold">{assetData.name}</div>
                  <div className="text-sm text-gray-500">{assetData.code}</div>
                  <div className="text-xs text-gray-400">
                    {island.tanks?.length || 0} tanks • {island.pumps?.length || 0} pumps
                  </div>
                </div>
              </div>
            );
          }
        },
        {
          header: 'Connected Assets',
          render: (island) => (
            <div className="space-y-1">
              {island.tanks?.slice(0, 3).map(tank => {
                const tankData = tank.asset || tank;
                return (
                  <Badge key={tankData.id} variant="blue" className="mr-1">
                    <Fuel size={12} className="mr-1" />
                    {tankData.code}
                  </Badge>
                );
              })}
              {island.pumps?.slice(0, 3).map(pump => {
                const pumpData = pump.asset || pump;
                return (
                  <Badge key={pumpData.id} variant="yellow" className="mr-1">
                    <Zap size={12} className="mr-1" />
                    {pumpData.code}
                  </Badge>
                );
              })}
              {((island.tanks?.length || 0) > 3 || (island.pumps?.length || 0) > 3) && (
                <div className="text-xs text-gray-500">+ more</div>
              )}
            </div>
          )
        },
        {
          header: 'Actions',
          render: (island) => {
            const assetData = island.asset || island;
            return (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAsset(assetData)}
                  className="flex items-center gap-1"
                >
                  <Eye size={14} />
                  Details
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedAsset({ ...assetData, action: 'assign' })}
                  className="flex items-center gap-1"
                >
                  <Link size={14} />
                  Manage
                </Button>
              </div>
            );
          }
        }
      ]}
      data={filteredIslands}
      emptyMessage={
        <EmptyState
          icon={Package}
          title="No Islands Found"
          description={searchTerm ? "Try adjusting your search criteria" : "No islands are assigned to this station"}
        />
      }
    />
  );

  const HealthOverview = () => {
    if (!healthReport) return null;

    const getHealthColor = (status) => {
      switch (status?.toLowerCase()) {
        case 'healthy': return 'text-green-600 bg-green-50';
        case 'warning': return 'text-yellow-600 bg-yellow-50';
        case 'critical': return 'text-red-600 bg-red-50';
        default: return 'text-gray-600 bg-gray-50';
      }
    };

    return (
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Connection Health</h3>
            <p className="text-gray-600">Overall system status</p>
          </div>
          <Badge variant={getStatusVariant(healthReport.overallHealth)}>
            {healthReport.overallHealth?.toUpperCase() || 'UNKNOWN'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 rounded-lg bg-blue-50">
            <div className="text-2xl font-bold text-blue-600">{healthReport.summary?.totalPumps || 0}</div>
            <div className="text-sm text-blue-600">Total Pumps</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50">
            <div className="text-2xl font-bold text-red-600">{healthReport.summary?.unattachedPumps || 0}</div>
            <div className="text-sm text-red-600">Unattached Pumps</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-50">
            <div className="text-2xl font-bold text-green-600">{healthReport.summary?.totalTanks || 0}</div>
            <div className="text-sm text-green-600">Total Tanks</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-50">
            <div className="text-2xl font-bold text-yellow-600">{healthReport.summary?.unattachedTanks || 0}</div>
            <div className="text-sm text-yellow-600">Unattached Tanks</div>
          </div>
        </div>

        {healthReport.issues?.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Issues Needing Attention</h4>
            <div className="space-y-2">
              {healthReport.issues.slice(0, 3).map((issue, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <AlertTriangle size={16} className="text-yellow-500" />
                  <span className="flex-1">{issue.assetName}: {issue.issues?.join(', ')}</span>
                  <Badge variant={getStatusVariant(issue.severity)}>
                    {issue.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  };

  const handleFilterChange = (newFilters) => {
    dispatch(setConnectionFilters(newFilters));
  };

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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle size={20} />
            <span className="font-medium">Error loading assets</span>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
          <Button variant="outline" onClick={loadAssetData} className="mt-3">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Station Assets</h2>
          <p className="text-gray-600">Manage and monitor asset connections</p>
        </div>
        <Button 
          variant="primary"
          onClick={loadAssetData}
          className="flex items-center gap-2"
        >
          <Settings size={16} />
          Refresh
        </Button>
      </div>

      {/* Health Overview */}
      <HealthOverview />

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search assets..."
              value={searchTerm}
              onChange={setSearchTerm}
              icon={Search}
            />
          </div>
          <div className="flex gap-2">
            <FilterDropdown
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'connected', label: 'Connected' },
                { value: 'unconnected', label: 'Unconnected' }
              ]}
              value={connectionFilter}
              onChange={setConnectionFilter}
              icon={Filter}
            />
            <FilterDropdown
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'fully_connected', label: 'Fully Connected' },
                { value: 'partial', label: 'Partially Connected' },
                { value: 'disconnected', label: 'Disconnected' }
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              icon={StatusIndicator}
            />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            value: 'pumps',
            label: 'Pumps',
            icon: Zap,
            count: assignments?.pumps?.length || 0,
            badge: healthReport?.summary?.unattachedPumps > 0 ? 'warning' : undefined
          },
          {
            value: 'tanks',
            label: 'Tanks',
            icon: Fuel,
            count: assignments?.tanks?.length || 0,
            badge: healthReport?.summary?.unattachedTanks > 0 ? 'warning' : undefined
          },
          {
            value: 'islands',
            label: 'Islands',
            icon: Package,
            count: assignments?.islands?.length || 0
          }
        ]}
      />

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'pumps' && <PumpTable />}
        {activeTab === 'tanks' && <TankTable />}
        {activeTab === 'islands' && <IslandTable />}
      </div>

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onAssignment={() => {
            setSelectedAsset(null);
            // This would typically open the assignment manager
          }}
        />
      )}
    </div>
  );
};

// Simple Asset Detail Modal
const AssetDetailModal = ({ asset, onClose, onAssignment }) => {
  return (
    <Modal
      title={`Asset Details - ${asset.name}`}
      isOpen={true}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Code</label>
            <div className="mt-1">{asset.code}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Type</label>
            <div className="mt-1 capitalize">{asset.type?.replace('_', ' ')}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <div className="mt-1">
              <Badge variant={asset.status === 'OPERATIONAL' ? 'success' : 'warning'}>
                {asset.status}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Station</label>
            <div className="mt-1">{asset.station?.name || 'Unassigned'}</div>
          </div>
        </div>
        
        {asset.action === 'assign' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <Link size={16} />
              <span className="font-medium">Ready for Assignment</span>
            </div>
            <p className="text-blue-700 text-sm">
              This asset is ready to be connected to other assets in the station.
            </p>
            <Button variant="primary" onClick={onAssignment} className="mt-3">
              Open Assignment Manager
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {asset.action !== 'assign' && (
            <Button variant="primary" onClick={onAssignment}>
              Manage Connections
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default StationAssetsOverview;