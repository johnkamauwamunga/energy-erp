import React, { useState, useEffect } from 'react';
import { Building2, Plus, Eye, Edit, Fuel, Zap, Package, Link } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import CreateAssetModal from './CreateAssetModal';
import AssetAttachmentsTab from '../../features/assets/AssetAttachmentsTab';
import { assetService } from '../../../services/assetService/assetService';

const CompanyAssetManagement = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('tanks');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assetType, setAssetType] = useState('tank'); // Added this line
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'tanks', label: 'Tanks', icon: Fuel },
    { id: 'pumps', label: 'Pumps', icon: Zap },
    { id: 'islands', label: 'Islands', icon: Package },
    { id: 'warehouses', label: 'Warehouses', icon: Building2 },
    { id: 'attachments', label: 'Attachments', icon: Link }
  ];

  // Get assets based on tab selection
  const getAssets = () => {
    switch (activeTab) {
      case 'tanks':
        return state.assets?.tanks || [];
      case 'pumps':
        return state.assets?.pumps || [];
      case 'islands':
        return state.assets?.islands || [];
      case 'warehouses':
        return state.assets?.warehouses || [];
      case 'attachments':
        return []; // Attachments tab doesn't need table data
      default:
        return [];
    }
  };

  const currentAssets = getAssets();

  // Load assets from backend
  useEffect(() => {
    loadAssetsFromBackend();
  }, []);

  const loadAssetsFromBackend = async () => {
    try {
      setLoading(true);
      const assets = await assetService.getCompanyAssets();
      
      // Transform the backend data to match our frontend structure
      const transformedAssets = {
        tanks: assets.filter(asset => asset.type === 'STORAGE_TANK'),
        pumps: assets.filter(asset => asset.type === 'FUEL_PUMP'),
        islands: assets.filter(asset => asset.type === 'ISLAND'),
        warehouses: assets.filter(asset => asset.type === 'WAREHOUSE')
      };
      
      // Update the state with the transformed assets
      dispatch({ type: 'SET_ASSETS', payload: transformedAssets });
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
            onClick={() => openCreateModal('tank')} 
            icon={Fuel} 
            variant="cosmic"
            size="sm"
          >
            Add Tank
          </Button>
          <Button 
            onClick={() => openCreateModal('pump')} 
            icon={Zap} 
            variant="cosmic"
            size="sm"
          >
            Add Pump
          </Button>
          <Button 
            onClick={() => openCreateModal('island')} 
            icon={Package} 
            variant="cosmic"
            size="sm"
          >
            Add Island
          </Button>
          <Button 
            onClick={() => openCreateModal('warehouse')} 
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
                  {activeTab === 'tanks' && (
                    <>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Capacity</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                    </>
                  )}
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
                        {activeTab === 'tanks' && <Fuel className="w-5 h-5 text-blue-500 mr-2" />}
                        {activeTab === 'pumps' && <Zap className="w-5 h-5 text-yellow-500 mr-2" />}
                        {activeTab === 'islands' && <Package className="w-5 h-5 text-green-500 mr-2" />}
                        {activeTab === 'warehouses' && <Building2 className="w-5 h-5 text-purple-500 mr-2" />}
                        {asset.name}
                      </div>
                    </td>
                    
                    {activeTab === 'tanks' && (
                      <>
                        <td className="py-4 px-6 text-sm text-gray-500">
                          {asset.tank?.capacity || 0} L
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            asset.status === 'ASSIGNED' 
                              ? 'bg-green-100 text-green-800' 
                              : asset.status === 'MAINTENANCE'
                              ? 'bg-yellow-100 text-yellow-800'
                              : asset.status === 'DECOMMISSIONED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {asset.status}
                          </span>
                        </td>
                      </>
                    )}
                    
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
                    <td colSpan={activeTab === 'tanks' ? 7 : 5} className="py-8 px-6 text-center text-gray-500">
                      No {activeTab} found. Register a new {activeTab.slice(0, -1)}.
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