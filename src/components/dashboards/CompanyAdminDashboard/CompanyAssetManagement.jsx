import React, { useState } from 'react';
import { Building2, Plus, Eye, Edit, Fuel, Zap, Package } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import CreateAssetModal from './CreateAssetModal';

const CompanyAssetManagement = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('tanks');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assetType, setAssetType] = useState('tank');

  // Get assets based on tab selection
  const getAssets = () => {
    switch (activeTab) {
      case 'tanks':
        return state.assets?.tanks || [];
      case 'pumps':
        return state.assets?.pumps || [];
      case 'islands':
        return state.assets?.islands || [];
      default:
        return [];
    }
  };

  const currentAssets = getAssets();

  const openCreateModal = (type) => {
    setAssetType(type);
    setIsCreateModalOpen(true);
  };

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
        </div>
      </div>

      {/* Asset Type Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {['tanks', 'pumps', 'islands'].map((tab) => (
            <button
              key={tab}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              <span className="capitalize">{tab}</span> ({currentAssets.length})
            </button>
          ))}
        </nav>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">ID</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Code</th>
                {activeTab === 'tanks' && (
                  <>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Capacity</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Product</th>
                  </>
                )}
                {activeTab === 'pumps' && (
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Island</th>
                )}
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Company</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Created</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">
                    {asset.id}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      {asset.type === 'tank' && <Fuel className="w-5 h-5 text-blue-500 mr-2" />}
                      {asset.type === 'pump' && <Zap className="w-5 h-5 text-yellow-500 mr-2" />}
                      {asset.type === 'island' && <Package className="w-5 h-5 text-green-500 mr-2" />}
                      {asset.code}
                    </div>
                  </td>
                  
                  {activeTab === 'tanks' && (
                    <>
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {asset.capacity} L
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {asset.productType}
                        </span>
                      </td>
                    </>
                  )}
                  
                  {activeTab === 'pumps' && (
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {asset.islandCode || 'N/A'}
                    </td>
                  )}
                  
                  <td className="py-4 px-6">
                    <div className="text-sm">
                      <div className="text-gray-900">
                        {state.companies.find(c => c.id === asset.companyId)?.name || asset.companyId}
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6 text-sm text-gray-500">
                    {asset.createdAt}
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
                  <td colSpan="7" className="py-8 px-6 text-center text-gray-500">
                    No {activeTab} found. Register a new {activeTab.slice(0, -1)}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Asset Creation Modal */}
      <CreateAssetModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        assetType={assetType}
      />
    </div>
  );
};

export default CompanyAssetManagement;