import React, { useState, useEffect } from 'react';
import { Building2, Plus, Eye, Edit, Fuel, Zap, Package, Link } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import CreateAssetModal from './CreateAssetModal';
import AssetAttachmentsTab from '../../features/assets/AssetAttachmentsTab';
import { assetService } from '../../../services/assetService/assetService';

const CompanyAssetManagement = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assetType, setAssetType] = useState('');
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'all', label: 'All Assets', icon: Package },
    { id: 'STORAGE_TANK', label: 'Tanks', icon: Fuel },
    { id: 'FUEL_PUMP', label: 'Pumps', icon: Zap },
    { id: 'ISLAND', label: 'Islands', icon: Package },
    { id: 'WAREHOUSE', label: 'Warehouses', icon: Building2 },
    { id: 'attachments', label: 'Attachments', icon: Link }
  ];

  // Get assets based on tab selection
  const getAssets = () => {
    if (!state.assets || !state.assets.data) return [];
    
    if (activeTab === 'all') return state.assets.data;
    
    return state.assets.data.filter(asset => asset.type === activeTab);
  };

  const currentAssets = getAssets();

  // Load assets from backend
  useEffect(() => {
    loadAssetsFromBackend();
  }, []);

  const loadAssetsFromBackend = async () => {
    try {
      setLoading(true);
      const response = await assetService.getCompanyAssets();
      
      // Update the state with the assets
      dispatch({ type: 'SET_ASSETS', payload: response.data });
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (type) => {
    setAssetType(type);
    setIsCreateModalOpen(true);
  };

  const handleAssetCreated = () => {
    // Refresh assets after creating a new one
    loadAssetsFromBackend();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ASSIGNED': return 'bg-green-100 text-green-800';
      case 'OPERATIONAL': return 'bg-blue-100 text-blue-800';
      case 'MAINTENANCE': return 'bg-yellow-100 text-yellow-800';
      case 'DECOMMISSIONED': return 'bg-red-100 text-red-800';
      case 'REGISTERED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssetIcon = (type) => {
    switch (type) {
      case 'STORAGE_TANK': return <Fuel className="w-5 h-5 text-blue-500 mr-2" />;
      case 'FUEL_PUMP': return <Zap className="w-5 h-5 text-yellow-500 mr-2" />;
      case 'ISLAND': return <Package className="w-5 h-5 text-green-500 mr-2" />;
      case 'WAREHOUSE': return <Building2 className="w-5 h-5 text-purple-500 mr-2" />;
      default: return <Package className="w-5 h-5 text-gray-500 mr-2" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Assets Management</h3>
          <p className="text-gray-600">Manage all registered assets</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            onClick={() => openCreateModal('STORAGE_TANK')} 
            icon={Fuel} 
            variant="cosmic"
            size="sm"
          >
            Add Tank
          </Button>
          <Button 
            onClick={() => openCreateModal('FUEL_PUMP')} 
            icon={Zap} 
            variant="cosmic"
            size="sm"
          >
            Add Pump
          </Button>
          <Button 
            onClick={() => openCreateModal('ISLAND')} 
            icon={Package} 
            variant="cosmic"
            size="sm"
          >
            Add Island
          </Button>
          <Button 
            onClick={() => openCreateModal('WAREHOUSE')} 
            icon={Building2} 
            variant="cosmic"
            size="sm"
          >
            Add Warehouse
          </Button>
        </div>
      </div>

      {/* Asset Type Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="w-4 h-4 mr-1" />
              <span className="capitalize">{tab.label}</span>
              {tab.id !== 'attachments' && ` (${getAssets().length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Conditional rendering based on active tab */}
      {activeTab === 'attachments' ? (
        <AssetAttachmentsTab />
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">ID</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Name</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Type</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Capacity</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Station</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Created</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">
                      {asset.id.substring(0, 8)}...
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        {getAssetIcon(asset.type)}
                        {asset.name}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {asset.type.replace('_', ' ')}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {asset.tank?.capacity ? `${asset.tank.capacity} L` : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(asset.status)}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {asset.station 
                        ? asset.station.name 
                        : asset.stationId 
                          ? 'Unknown Station' 
                          : 'Unassigned'}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="secondary" icon={Eye}>
                          View
                        </Button>
                        <Button size="sm" variant="secondary" icon={Edit}>
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {currentAssets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 px-6 text-center text-gray-500">
                      No {activeTab === 'all' ? 'assets' : activeTab.toLowerCase()} found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Asset Creation Modal */}
      <CreateAssetModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        assetType={assetType}
        onAssetCreated={handleAssetCreated}
      />
    </div>
  );
};

export default CompanyAssetManagement;