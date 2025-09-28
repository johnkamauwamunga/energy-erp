import React, { useState, useEffect } from 'react';
import { 
  Fuel, Package, Layers, Plus, Eye, Edit, Trash2, Search, 
  RefreshCw, AlertCircle, Filter, X, Download, Upload 
} from 'lucide-react';
import { Button, Input, Select, Dialog, ConfirmDialog } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import CreateFuelModal from './CreateFuelModal';
import EditFuelModal from './EditFuelModal';
import { fuelService } from '../../../services/fuelService';

const FuelManagement = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('categories');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [createType, setCreateType] = useState('category');
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Data states
  const [categories, setCategories] = useState([]);
  const [subTypes, setSubTypes] = useState([]);
  const [products, setProducts] = useState([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subTypeFilter, setSubTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const tabs = [
    { id: 'categories', label: 'Categories', icon: Layers, color: 'blue' },
    { id: 'subtypes', label: 'Sub Types', icon: Package, color: 'green' },
    { id: 'products', label: 'Products', icon: Fuel, color: 'orange' }
  ];

  // Load data based on active tab
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const filters = {};
      if (searchQuery) filters.search = searchQuery;
      if (categoryFilter) filters.categoryId = categoryFilter;
      if (subTypeFilter) filters.fuelSubTypeId = subTypeFilter;

      switch (activeTab) {
        case 'categories':
          const categoriesData = await fuelService.getFuelCategories(filters);
          setCategories(categoriesData?.data || categoriesData || []);
          break;
        
        case 'subtypes':
          const subTypesData = await fuelService.getFuelSubTypes(filters);
          setSubTypes(subTypesData?.data || subTypesData || []);
          break;
        
        case 'products':
          const productsData = await fuelService.getFuelProducts(filters);
          setProducts(productsData?.data || productsData || []);
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
  }, [activeTab, retryCount]);

  // Load categories for filters
  useEffect(() => {
    const loadCategoriesForFilter = async () => {
      try {
        const data = await fuelService.getFuelCategories();
        setCategories(data?.data || data || []);
      } catch (error) {
        console.error('Failed to load categories for filter:', error);
      }
    };
    loadCategoriesForFilter();
  }, []);

  const openCreateModal = (type) => {
    setCreateType(type);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (item) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleFuelCreated = () => {
    loadData();
    setIsCreateModalOpen(false);
    setSuccess(`${createType} created successfully!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleFuelUpdated = () => {
    loadData();
    setIsEditModalOpen(false);
    setSuccess(`${getItemType(editingItem)} updated successfully!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      switch (getItemType(deletingItem)) {
        case 'category':
          await fuelService.deleteFuelCategory(deletingItem.id);
          break;
        case 'subtype':
          await fuelService.deleteFuelSubType(deletingItem.id);
          break;
        case 'product':
          await fuelService.deleteFuelProduct(deletingItem.id);
          break;
      }

      loadData();
      setSuccess(`${getItemType(deletingItem)} deleted successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || `Failed to delete ${getItemType(deletingItem)}`);
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setSubTypeFilter('');
    setStatusFilter('all');
    loadData();
  };

  const getActiveData = () => {
    switch (activeTab) {
      case 'categories': return categories;
      case 'subtypes': return subTypes;
      case 'products': return products;
      default: return [];
    }
  };

  const getItemType = (item) => {
    if (item.fuelCode) return 'product';
    if (item.categoryId || item.category) return 'subtype';
    return 'category';
  };

  const getItemIcon = (item) => {
    const type = getItemType(item);
    switch (type) {
      case 'category': return <Layers className="w-4 h-4" />;
      case 'subtype': return <Package className="w-4 h-4" />;
      case 'product': return <Fuel className="w-4 h-4" />;
      default: return <Layers className="w-4 h-4" />;
    }
  };

  const getItemColor = (item) => {
    const type = getItemType(item);
    switch (type) {
      case 'category': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'subtype': return 'text-green-600 bg-green-50 border-green-200';
      case 'product': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatItemData = (item) => {
    const type = getItemType(item);
    switch (type) {
      case 'product':
        return {
          ...item,
          parentName: item.fuelSubType?.name || 'No Sub Type',
          code: item.fuelCode,
          specifications: [
            item.density && `${item.density} kg/L`,
            item.octaneRating && `RON ${item.octaneRating}`
          ].filter(Boolean).join(' • ') || 'N/A'
        };
      case 'subtype':
        return {
          ...item,
          parentName: item.category?.name || 'No Category',
          code: item.code,
          specifications: item.specification || 'N/A'
        };
      case 'category':
        return {
          ...item,
          parentName: '-',
          code: item.code,
          specifications: item.typicalDensity ? `${item.typicalDensity} kg/L` : 'N/A'
        };
      default:
        return item;
    }
  };

  if (loading && getActiveData().length === 0) {
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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Fuel Management</h3>
          <p className="text-gray-600">
            Manage fuel categories, subtypes, and products for {state.currentUser?.company?.name}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            icon={Download}
            variant="outline"
            size="sm"
          >
            Export
          </Button>
          <Button 
            onClick={() => openCreateModal('category')}
            icon={Plus}
            variant="cosmic"
            size="sm"
          >
            Add New
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
          <Button onClick={handleRetry} size="sm" variant="secondary" className="ml-auto">
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg flex items-center">
          <div className="flex-1">{success}</div>
          <X className="w-4 h-4 cursor-pointer" onClick={() => setSuccess('')} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            {activeTab === 'subtypes' || activeTab === 'products' ? (
              <Select
                value={categoryFilter}
                onChange={(value) => setCategoryFilter(value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                ]}
                className="w-48"
              />
            ) : null}

            {activeTab === 'products' ? (
              <Select
                value={subTypeFilter}
                onChange={(value) => setSubTypeFilter(value)}
                options={[
                  { value: '', label: 'All Sub Types' },
                  ...subTypes.map(st => ({ value: st.id, label: st.name }))
                ]}
                className="w-48"
              />
            ) : null}

            <Button 
              onClick={loadData}
              icon={Filter}
              variant="outline"
              size="sm"
            >
              Apply Filters
            </Button>

            {(searchQuery || categoryFilter || subTypeFilter) && (
              <Button 
                onClick={clearFilters}
                icon={X}
                variant="secondary"
                size="sm"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? `border-${tab.color}-500 text-${tab.color}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              <span className="capitalize">{tab.label}</span>
              <span className="ml-2 bg-gray-100 text-gray-600 rounded-full px-2 py-1 text-xs">
                {activeData.length}
              </span>
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
                <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs">Name & Type</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs">Code</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs">Parent</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs">Description</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs">Specifications</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeData.length > 0 ? (
                activeData.map((item) => {
                  const formattedItem = formatItemData(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getItemColor(item)}`}>
                            {getItemIcon(item)}
                            <span className="ml-1 capitalize">{getItemType(item)}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{formattedItem.name}</div>
                            <div className="text-sm text-gray-500">ID: {item.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {formattedItem.code}
                        </code>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-900">
                        {formattedItem.parentName}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 max-w-md">
                        {formattedItem.description || (
                          <span className="text-gray-400 italic">No description</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {formattedItem.specifications}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            icon={Eye}
                            onClick={() => openEditModal(item)}
                          >
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            icon={Edit}
                            onClick={() => openEditModal(item)}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="danger" 
                            icon={Trash2}
                            onClick={() => openDeleteDialog(item)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center">
                    <div className="text-gray-500">
                      <tabs.find(t => t.id === activeTab)?.icon({ className: "w-16 h-16 mx-auto mb-4 text-gray-300" })}
                      <p className="text-lg font-medium text-gray-900 mb-2">No {activeTab} found</p>
                      <p className="text-sm text-gray-600 mb-4">
                        {searchQuery || categoryFilter || subTypeFilter
                          ? 'Try adjusting your search filters'
                          : `Get started by creating your first ${activeTab.slice(0, -1)}`
                        }
                      </p>
                      <Button
                        variant="cosmic"
                        onClick={() => openCreateModal(activeTab.slice(0, -1))}
                        icon={Plus}
                      >
                        Create {activeTab.slice(0, -1)}
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      {activeData.length > 0 && (
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <div>
            Showing {activeData.length} of {activeData.length} {activeTab}
          </div>
          <Button 
            onClick={loadData}
            icon={RefreshCw}
            variant="outline"
            size="sm"
          >
            Refresh Data
          </Button>
        </div>
      )}

      {/* Modals */}
      <CreateFuelModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        createType={createType}
        onFuelCreated={handleFuelCreated}
        companyId={state.currentUser?.companyId}
      />

      <EditFuelModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={editingItem}
        onFuelUpdated={handleFuelUpdated}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={`Delete ${getItemType(deletingItem)}`}
        message={`Are you sure you want to delete "${deletingItem?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
};

export default FuelManagement;