import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Tabs,
  Modal,
  Badge,
  SearchInput,
  EmptyState,
  Alert
} from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { assetConnectionService } from '../../../../services/assetConnection/assetConnectionService';
import {
  createAssetConnection,
  verifyConnection,
  fetchAssetAssignments
} from '../../../../context/AppContext/actions';
import {
  Fuel,
  Zap,
  Package,
  Link2,
  Unlink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Settings,
  RotateCcw
} from 'lucide-react';

const AssetAssignmentManager = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('tank-pump');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedAssets, setSelectedAssets] = useState({
    tank: null,
    pump: null,
    island: null
  });
  const [bulkSelection, setBulkSelection] = useState({
    pumps: [],
    tanks: []
  });
  const [verificationResult, setVerificationResult] = useState(null);

  const stationId = state.currentStation?.id;
  const assignments = state.assetConnections?.assignments;

  useEffect(() => {
    if (stationId) {
      loadAssignments();
    }
  }, [stationId]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      await dispatch(fetchAssetAssignments(stationId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get available assets directly from state
  const availablePumps = useMemo(() => 
    assignments?.pumps?.filter(pump => !pump.tank) || []
  , [assignments]);

  const availableTanks = useMemo(() => 
    assignments?.tanks?.filter(tank => !tank.island) || []
  , [assignments]);

  const availableIslands = useMemo(() => 
    assignments?.islands || []
  , [assignments]);

  const handleAssetSelect = (asset, type) => {
    setSelectedAssets(prev => ({
      ...prev,
      [type]: prev[type]?.id === asset.id ? null : asset
    }));
  };

  const handleBulkSelect = (assetId, type) => {
    setBulkSelection(prev => ({
      ...prev,
      [type]: prev[type].includes(assetId)
        ? prev[type].filter(id => id !== assetId)
        : [...prev[type], assetId]
    }));
  };

  const handleVerifyConnection = async () => {
    if (!selectedAssets.tank || !selectedAssets.pump) return;

    try {
      const result = await assetConnectionService.verifyConnection(stationId, {
        type: 'TANK_TO_PUMP',
        assetAId: selectedAssets.tank.id,
        assetBId: selectedAssets.pump.id
      });
      setVerificationResult(result);
    } catch (err) {
      setError('Failed to verify connection: ' + err.message);
    }
  };

  const handleCreateConnection = async () => {
    try {
      let connectionData;
      
      switch (activeTab) {
        case 'tank-pump':
          if (!selectedAssets.tank || !selectedAssets.pump) return;
          connectionData = {
            type: 'TANK_TO_PUMP',
            assetAId: selectedAssets.tank.id,
            assetBId: selectedAssets.pump.id
          };
          break;
        case 'pump-island':
          if (!selectedAssets.pump || !selectedAssets.island) return;
          connectionData = {
            type: 'PUMP_TO_ISLAND',
            assetAId: selectedAssets.pump.id,
            assetBId: selectedAssets.island.id
          };
          break;
        case 'tank-island':
          if (!selectedAssets.tank || !selectedAssets.island) return;
          connectionData = {
            type: 'TANK_TO_ISLAND',
            assetAId: selectedAssets.tank.id,
            assetBId: selectedAssets.island.id
          };
          break;
        default:
          return;
      }

      await dispatch(createAssetConnection(stationId, connectionData));
      setSuccess('Connection created successfully!');
      setSelectedAssets({ tank: null, pump: null, island: null });
      setVerificationResult(null);
      await loadAssignments();
    } catch (err) {
      setError('Failed to create connection: ' + err.message);
    }
  };

  const handleBulkCreateConnections = async () => {
    try {
      let results;
      
      if (activeTab === 'tank-pump' && bulkSelection.pumps.length > 0 && selectedAssets.tank) {
        results = await assetConnectionService.bulkConnectToAsset(stationId, {
          targetAssetId: selectedAssets.tank.id,
          sourceAssetIds: bulkSelection.pumps,
          type: 'TANK_TO_PUMP'
        });
      } else if (activeTab === 'pump-island' && bulkSelection.pumps.length > 0 && selectedAssets.island) {
        results = await assetConnectionService.bulkConnectToAsset(stationId, {
          targetAssetId: selectedAssets.island.id,
          sourceAssetIds: bulkSelection.pumps,
          type: 'PUMP_TO_ISLAND'
        });
      } else if (activeTab === 'tank-island' && bulkSelection.tanks.length > 0 && selectedAssets.island) {
        results = await assetConnectionService.bulkConnectToAsset(stationId, {
          targetAssetId: selectedAssets.island.id,
          sourceAssetIds: bulkSelection.tanks,
          type: 'TANK_TO_ISLAND'
        });
      }

      if (results) {
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        setSuccess(`Bulk operation completed: ${successful} successful, ${failed} failed`);
        setBulkSelection({ pumps: [], tanks: [] });
        setSelectedAssets({ tank: null, pump: null, island: null });
        await loadAssignments();
      }
    } catch (err) {
      setError('Bulk operation failed: ' + err.message);
    }
  };

  const ConnectionVisualizer = () => {
    const getConnectionStatus = () => {
      switch (activeTab) {
        case 'tank-pump':
          return {
            from: selectedAssets.tank,
            to: selectedAssets.pump,
            type: 'TANK_TO_PUMP'
          };
        case 'pump-island':
          return {
            from: selectedAssets.pump,
            to: selectedAssets.island,
            type: 'PUMP_TO_ISLAND'
          };
        case 'tank-island':
          return {
            from: selectedAssets.tank,
            to: selectedAssets.island,
            type: 'TANK_TO_ISLAND'
          };
        default:
          return null;
      }
    };

    const connection = getConnectionStatus();

    if (!connection.from && !connection.to) {
      return (
        <EmptyState
          icon={Link2}
          title="No Assets Selected"
          description="Select assets from both sides to create a connection"
          size="sm"
        />
      );
    }

    return (
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
        <AssetPreview asset={connection.from} type="from" />
        <ConnectionArrow isValid={verificationResult?.valid} />
        <AssetPreview asset={connection.to} type="to" />
      </div>
    );
  };

  const AssetPreview = ({ asset, type }) => {
    if (!asset) {
      return (
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
            {type === 'from' ? <Fuel size={24} /> : <Zap size={24} />}
          </div>
          <div className="text-sm text-gray-500">Select {type === 'from' ? 'source' : 'target'}</div>
        </div>
      );
    }

    return (
      <div className="text-center p-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
          type === 'from' ? 'bg-blue-100' : 'bg-green-100'
        }`}>
          {asset.type === 'FUEL_PUMP' ? (
            <Zap size={24} className="text-yellow-600" />
          ) : asset.type === 'STORAGE_TANK' ? (
            <Fuel size={24} className="text-blue-600" />
          ) : (
            <Package size={24} className="text-green-600" />
          )}
        </div>
        <div className="font-semibold">{asset.code}</div>
        <div className="text-sm text-gray-500">{asset.name}</div>
      </div>
    );
  };

  const ConnectionArrow = ({ isValid }) => (
    <div className="flex flex-col items-center">
      <ArrowRight size={32} className={isValid ? 'text-green-500' : 'text-gray-400'} />
      {verificationResult && (
        <Badge variant={isValid ? 'success' : 'error'} className="mt-2">
          {isValid ? 'Valid' : 'Invalid'}
        </Badge>
      )}
    </div>
  );

  const TankPumpAssignment = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Tanks */}
        <Card title="Available Tanks" className="h-96 overflow-hidden">
          <div className="h-64 overflow-y-auto space-y-2">
            {availableTanks.map(tank => {
              const tankData = tank.asset || tank;
              return (
                <AssetCard
                  key={tankData.id}
                  asset={tankData}
                  isSelected={selectedAssets.tank?.id === tankData.id}
                  onSelect={() => handleAssetSelect(tankData, 'tank')}
                  type="tank"
                  status={tank.connectionStatus}
                />
              );
            })}
            {availableTanks.length === 0 && (
              <EmptyState
                icon={Fuel}
                title="No Tanks Available"
                description="All tanks are already connected to islands"
                size="sm"
              />
            )}
          </div>
        </Card>

        {/* Available Pumps */}
        <Card title="Available Pumps" className="h-96 overflow-hidden">
          <div className="h-64 overflow-y-auto space-y-2">
            {availablePumps.map(pump => {
              const pumpData = pump.asset || pump;
              return (
                <AssetCard
                  key={pumpData.id}
                  asset={pumpData}
                  isSelected={selectedAssets.pump?.id === pumpData.id}
                  onSelect={() => handleAssetSelect(pumpData, 'pump')}
                  isBulkSelected={bulkSelection.pumps.includes(pumpData.id)}
                  onBulkSelect={() => handleBulkSelect(pumpData.id, 'pumps')}
                  type="pump"
                  status={pump.connectionStatus}
                  showBulkOption
                />
              );
            })}
            {availablePumps.length === 0 && (
              <EmptyState
                icon={Zap}
                title="No Pumps Available"
                description="All pumps are already connected to tanks"
                size="sm"
              />
            )}
          </div>
        </Card>
      </div>

      {/* Connection Visualizer */}
      <ConnectionVisualizer />

      {/* Verification and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleVerifyConnection}
            disabled={!selectedAssets.tank || !selectedAssets.pump}
          >
            Verify Connection
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateConnection}
            disabled={!selectedAssets.tank || !selectedAssets.pump}
          >
            Create Connection
          </Button>
        </div>

        {bulkSelection.pumps.length > 0 && selectedAssets.tank && (
          <Button variant="success" onClick={handleBulkCreateConnections}>
            Connect {bulkSelection.pumps.length} Pumps to Tank
          </Button>
        )}
      </div>

      {/* Verification Results */}
      {verificationResult && (
        <Alert variant={verificationResult.valid ? 'success' : 'error'}>
          <div className="space-y-2">
            <div className="font-semibold">
              {verificationResult.valid ? 'Connection Valid' : 'Connection Issues Found'}
            </div>
            {verificationResult.errors?.map((error, index) => (
              <div key={index} className="flex items-center gap-2">
                <XCircle size={16} />
                {error}
              </div>
            ))}
            {verificationResult.warnings?.map((warning, index) => (
              <div key={index} className="flex items-center gap-2 text-yellow-700">
                <AlertTriangle size={16} />
                {warning}
              </div>
            ))}
            {verificationResult.valid && (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} />
                This connection meets all requirements
              </div>
            )}
          </div>
        </Alert>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading assignment manager...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Asset Assignment Manager</h2>
          <p className="text-gray-600">Connect assets to create operational units</p>
        </div>
        <Button variant="outline" onClick={loadAssignments} className="flex items-center gap-2">
          <RotateCcw size={16} />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" onClose={() => setError('')} className="mb-4">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess('')} className="mb-4">
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            value: 'tank-pump',
            label: 'Tank → Pump',
            icon: Fuel,
            description: 'Connect pumps to fuel tanks'
          },
          {
            value: 'pump-island',
            label: 'Pump → Island',
            icon: Zap,
            description: 'Assign pumps to service islands'
          },
          {
            value: 'tank-island',
            label: 'Tank → Island',
            icon: Package,
            description: 'Connect tanks to service islands'
          }
        ]}
      />

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'tank-pump' && <TankPumpAssignment />}
        {activeTab === 'pump-island' && <div>Pump-Island Assignment Interface</div>}
        {activeTab === 'tank-island' && <div>Tank-Island Assignment Interface</div>}
      </div>
    </div>
  );
};

// Reusable Asset Card Component
const AssetCard = ({ 
  asset, 
  isSelected, 
  onSelect, 
  isBulkSelected, 
  onBulkSelect, 
  type, 
  status, 
  showBulkOption = false 
}) => (
  <div
    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
      isSelected
        ? 'border-blue-500 bg-blue-50'
        : isBulkSelected
        ? 'border-green-500 bg-green-50'
        : 'border-gray-200 hover:border-gray-300'
    }`}
    onClick={onSelect}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${
          type === 'pump' ? 'bg-yellow-100' : 
          type === 'tank' ? 'bg-blue-100' : 'bg-green-100'
        }`}>
          {type === 'pump' ? <Zap size={16} className="text-yellow-600" /> :
           type === 'tank' ? <Fuel size={16} className="text-blue-600" /> :
           <Package size={16} className="text-green-600" />}
        </div>
        <div>
          <div className="font-medium">{asset.code}</div>
          <div className="text-sm text-gray-600">{asset.name}</div>
          {status && (
            <Badge variant={
              status === 'FULLY_CONNECTED' ? 'success' :
              status === 'PARTIAL' ? 'warning' : 'error'
            } className="text-xs">
              {status.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>
      
      {showBulkOption && (
        <Button
          variant={isBulkSelected ? 'success' : 'outline'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onBulkSelect();
          }}
        >
          {isBulkSelected ? 'Selected' : 'Select'}
        </Button>
      )}
    </div>
  </div>
);

export default AssetAssignmentManager;