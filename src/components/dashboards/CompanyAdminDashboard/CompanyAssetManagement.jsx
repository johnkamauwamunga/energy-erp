import React, { useState, useEffect } from 'react';
import { Building2, Plus, Eye, Edit, Fuel, Zap, Package, Link, RefreshCw, AlertCircle } from 'lucide-react';
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
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);



  const tabs = [
    { id: 'all', label: 'All Assets', icon: Package },
    { id: 'STORAGE_TANK', label: 'Tanks', icon: Fuel },
    { id: 'FUEL_PUMP', label: 'Pumps', icon: Zap },
    { id: 'ISLAND', label: 'Islands', icon: Package },
    { id: 'WAREHOUSE', label: 'Warehouses', icon: Building2 },
    { id: 'attachments', label: 'Attachments', icon: Link }
  ];

  // Get assets based on tab selection
  const getFilteredAssets = () => {
    if (!assets || !Array.isArray(assets)) return [];
    if (activeTab === 'all') return assets;
    return assets.filter(asset => asset.type === activeTab);
  };

  const filteredAssets = getFilteredAssets();

  // Load assets from backend based on user role
  const loadAssetsFromBackend = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Loading assets from backend...');

      console.log("state is ",state.currentUser);
      
      let assetsData;
      let currentUser = state.currentUser ;
      
      // Choose the right API endpoint based on user role
      if (currentUser.role === 'SUPER_ADMIN') {
        // Super admin can use the general endpoint or specific company endpoint
        assetsData = await assetService.getAssets();
      } else if (currentUser.role === 'COMPANY_ADMIN' || currentUser.role === 'COMPANY_MANAGER') {
        // Company admin/manager gets company assets
        assetsData = await assetService.getCompanyAssets(currentUser.companyId);
           console.log('🔄 assets are  ', assetsData);
      } else if (currentUser.role === 'STATION_MANAGER' || currentUser.role === 'SUPERVISOR') {
        // Station staff gets station assets
        assetsData = await assetService.getStationAssets(currentUser.stationId);
      } else {
        // Default to general endpoint with role-based filtering on backend
        assetsData = await assetService.getAssets();
      }
      
      console.log('✅ Assets loaded successfully:', assetsData);
      
      // Set the local assets state
      setAssets(assetsData || []);
      
      // Also update the global state if needed
      dispatch({ type: 'SET_ASSETS', payload: assetsData || [] });
    } catch (error) {
      console.error('❌ Failed to load assets:', error);
      setError(error.message || 'Failed to load assets. Please try again.');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  

  // const loadStations = async () => {
  //   try {
  //     setLoadingStations(true);
  //     setStationError('');

  //     // Fetch stations for the company
  //     const response = await stationService.getCompanyStations();

  //     console.log('✅ Stations loaded successfully:', response);
  //     if (response && response.success) {
  //       setStations(response.data); // assuming response.data is an array of stations
  //     } else {
  //       setStationError('Failed to load stations');
  //     }
  //   } catch (err) {
  //     console.error('❌ Failed to fetch stations:', err);
  //     setStationError(err.message || 'Failed to fetch stations');
  //   } finally {
  //     setLoadingStations(false);
  //   }
  // };

 


  // Load assets on component mount and when retryCount changes
  useEffect(() => {
    loadAssetsFromBackend();
  }, [retryCount]);

  const openCreateModal = (type) => {
    // Check if user has permission to create assets
    if (state.currentUser.role !== 'SUPER_ADMIN' && 
        state.currentUser.role !== 'COMPANY_ADMIN' && 
        state.currentUser.role !== 'COMPANY_MANAGER') {
      setError('You do not have permission to create assets');
      return;
    }
    
    setAssetType(type);
    setIsCreateModalOpen(true);
  };

  const handleAssetCreated = () => {
    // Refresh assets after creating a new one
    loadAssetsFromBackend();
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
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

  // Safe count function for assets
  const getAssetCount = (tabId) => {
    if (!assets || !Array.isArray(assets)) return 0;
    
    if (tabId === 'all') return assets.length;
    return assets.filter(a => a.type === tabId).length;
  };

  // Check if user can create assets
  const canCreateAssets = () => {
    return state.currentUser.role === 'SUPER_ADMIN' || 
           state.currentUser.role === 'COMPANY_ADMIN' || 
           state.currentUser.role === 'COMPANY_MANAGER';
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

  if (error && assets.length === 0) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load assets</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRetry} icon={RefreshCw}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Assets Management</h3>
          <p className="text-gray-600">
            {state.currentUser.role === 'SUPER_ADMIN' ? 'All assets across all companies' : 
             state.currentUser.role === 'COMPANY_ADMIN' || state.currentUser.role === 'COMPANY_MANAGER' ? 'Your company assets' : 
             'Assets assigned to your station'}
          </p>
        </div>
        {canCreateAssets() && (
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
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-100 text-yellow-700 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
          <Button onClick={handleRetry} size="sm" variant="secondary" className="ml-auto">
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

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
              {tab.id !== 'attachments' && (
                <span className="ml-1">
                  ({getAssetCount(tab.id)})
                </span>
              )}
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
               
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Name</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Type</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Capacity</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Station</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Company</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Created</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssets && filteredAssets.length > 0 ? (
                  filteredAssets.map(asset => (
                    <tr key={asset.id} className="hover:bg-gray-50">
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
                        {state.currentUser.role === 'SUPER_ADMIN' && asset.companyId 
                          ? `Company ${asset.companyId.substring(0, 8)}...` 
                          : 'Your Company'}
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 px-6 text-center text-gray-500">
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
        user={state.user}
      />
    </div>
  );
};

export default CompanyAssetManagement;