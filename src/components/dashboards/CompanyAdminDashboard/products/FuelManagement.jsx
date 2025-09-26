import React, { useState, useEffect } from 'react';
import { Fuel, Package, Layers, Plus, Eye, Edit, Trash2, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import CreateFuelModal from './CreateFuelModal';
import { fuelService } from '../../../services/fuelService';

const FuelManagement = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('categories');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState('category');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [categories, setCategories] = useState([]);
  const [subTypes, setSubTypes] = useState([]);
  const [products, setProducts] = useState([]);

  const tabs = [
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'subtypes', label: 'Sub Types', icon: Package },
    { id: 'products', label: 'Products', icon: Fuel }
  ];

  // Load data based on active tab
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const filters = searchQuery ? { search: searchQuery } : {};

      switch (activeTab) {
        case 'categories':
          const categoriesData = await fuelService.getFuelCategories(filters);
          setCategories(categoriesData.data || categoriesData || []);
          break;
        
        case 'subtypes':
          const subTypesData = await fuelService.getFuelSubTypes(filters);
          setSubTypes(subTypesData.data || subTypesData || []);
          break;
        
        case 'products':
          const productsData = await fuelService.getFuelProducts(filters);
          setProducts(productsData.data || productsData || []);
          break;
        
        default:
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError(error.message || 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, retryCount, searchQuery]);

  const openCreateModal = (type) => {
    setCreateType(type);
    setIsCreateModalOpen(true);
  };

  const handleFuelCreated = () => {
    loadData();
    setIsCreateModalOpen(false);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const getActiveData = () => {
    switch (activeTab) {
      case 'categories': return categories;
      case 'subtypes': return subTypes;
      case 'products': return products;
      default: return [];
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleView = (item) => {
    // Implement view functionality
    console.log('View item:', item);
  };

  const handleEdit = (item) => {
    // Implement edit functionality
    console.log('Edit item:', item);
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading {activeTab}...</p>
        </div>
      </div>
    );
  }

  if (error && getActiveData().length === 0) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load {activeTab}</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRetry} icon={RefreshCw}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const activeData = getActiveData();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Fuel Management</h3>
          <p className="text-gray-600">
            Manage fuel categories, subtypes, and products for your company
          </p>
        </div>
        
        <div className="relative group">
          <Button 
            onClick={() => openCreateModal('category')}
            icon={Plus}
            variant="cosmic"
            size="sm"
          >
            Add New
          </Button>
          
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
            <button
              onClick={() => openCreateModal('category')}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-t-lg flex items-center"
            >
              <Layers className="w-4 h-4 mr-2 text-blue-500" />
              Add Category
            </button>
            <button
              onClick={() => openCreateModal('subtype')}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center"
            >
              <Package className="w-4 h-4 mr-2 text-green-500" />
              Add Sub Type
            </button>
            <button
              onClick={() => openCreateModal('product')}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-b-lg flex items-center"
            >
              <Fuel className="w-4 h-4 mr-2 text-orange-500" />
              Add Product
            </button>
          </div>
        </div>
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

      {/* Search and Filter Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4 items-center">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <Input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 w-64"
            />
          </div>
        </div>
        <Button onClick={loadData} icon={RefreshCw} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Fuel Management Tabs */}
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
              <span className="ml-1">({activeData.length})</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Name</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Code</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Description</th>
                {activeTab === 'subtypes' && (
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Category</th>
                )}
                {activeTab === 'products' && (
                  <>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Sub Type</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Density</th>
                  </>
                )}
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeData.length > 0 ? (
                activeData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="mr-3">
                          {activeTab === 'categories' && <Layers className="w-5 h-5 text-blue-500" />}
                          {activeTab === 'subtypes' && <Package className="w-5 h-5 text-green-500" />}
                          {activeTab === 'products' && <Fuel className="w-5 h-5 text-orange-500" />}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">ID: {item.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {item.code || item.fuelCode || 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {item.description || 'No description'}
                    </td>
                    {activeTab === 'subtypes' && (
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {item.category?.name || 'No Category'}
                      </td>
                    )}
                    {activeTab === 'products' && (
                      <>
                        <td className="py-4 px-6 text-sm text-gray-500">
                          {item.fuelSubType?.name || 'No Sub Type'}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-500">
                          {item.density ? `${item.density} kg/L` : 'N/A'}
                        </td>
                      </>
                    )}
                    <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          icon={Eye}
                          onClick={() => handleView(item)}
                        >
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          icon={Edit}
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeTab === 'products' ? 6 : activeTab === 'subtypes' ? 5 : 4} 
                      className="py-8 px-6 text-center text-gray-500">
                    {searchQuery 
                      ? `No ${activeTab} match your search criteria.` 
                      : `No ${activeTab} found. Click "Add New" to create one.`
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Create Fuel Modal */}
      <CreateFuelModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        createType={createType}
        onFuelCreated={handleFuelCreated}
        companyId={state.currentUser?.companyId}
      />
    </div>
  );
};

export default FuelManagement;