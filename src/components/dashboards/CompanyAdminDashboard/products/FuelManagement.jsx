import React, { useState, useEffect } from 'react';
import { 
  Fuel, Package, Layers, Plus, Eye, Edit, Trash2, Search, 
  RefreshCw, AlertCircle, Filter, X, Download, Upload, 
  ChevronDown, ArrowUpDown, SlidersHorizontal 
} from 'lucide-react';
import { Button, Input, Select1 as Select, Dialog, ConfirmDialog, Tabs, Card, Badge } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import CreateFuelModal from './create/CreateFuelModal';
// import EditFuelModal from './edit/EditFuelModal';
import { fuelService } from '../../../../services/fuelService/fuelService';

const FuelManagement = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('products');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subTypes, setSubTypes] = useState([]);

  // Filter states - simplified
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    subType: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const tabs = [
    { id: 'products', label: 'Products', icon: Fuel, count: products.length },
    { id: 'subtypes', label: 'Sub Types', icon: Package, count: subTypes.length },
    { id: 'categories', label: 'Categories', icon: Layers, count: categories.length }
  ];

  // Sort options
  const sortOptions = {
    products: [
      { value: 'name-asc', label: 'Name A-Z' },
      { value: 'name-desc', label: 'Name Z-A' },
      { value: 'code-asc', label: 'Code A-Z' },
      { value: 'code-desc', label: 'Code Z-A' },
      { value: 'density-asc', label: 'Density Low-High' },
      { value: 'density-desc', label: 'Density High-Low' }
    ],
    subtypes: [
      { value: 'name-asc', label: 'Name A-Z' },
      { value: 'name-desc', label: 'Name Z-A' },
      { value: 'code-asc', label: 'Code A-Z' },
      { value: 'code-desc', label: 'Code Z-A' }
    ],
    categories: [
      { value: 'name-asc', label: 'Name A-Z' },
      { value: 'name-desc', label: 'Name Z-A' },
      { value: 'code-asc', label: 'Code A-Z' },
      { value: 'code-desc', label: 'Code Z-A' }
    ]
  };

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [productsData, categoriesData, subTypesData] = await Promise.all([
        fuelService.getFuelProducts(),
        fuelService.getFuelCategories(),
        fuelService.getFuelSubTypes()
      ]);

      setProducts(productsData?.products || productsData || []);
      setCategories(categoriesData || []);
      setSubTypes(subTypesData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter and sort data
  const getFilteredData = () => {
    let data = [];
    
    switch (activeTab) {
      case 'products': data = products; break;
      case 'subtypes': data = subTypes; break;
      case 'categories': data = categories; break;
      default: data = [];
    }

    // Apply search filter
    if (filters.search) {
      data = data.filter(item => 
        item.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.code?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.fuelCode?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply category filter (for products and subtypes)
    if (filters.category && activeTab !== 'categories') {
      data = data.filter(item => 
        item.categoryId === filters.category || 
        item.category?.id === filters.category
      );
    }

    // Apply subtype filter (for products only)
    if (filters.subType && activeTab === 'products') {
      data = data.filter(item => item.fuelSubTypeId === filters.subType);
    }

    // Apply sorting
    const [sortField, sortOrder] = filters.sortBy.split('-');
    data.sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';

      // Handle nested fields
      if (sortField === 'category' && a.category) aValue = a.category.name;
      if (sortField === 'category' && b.category) bValue = b.category.name;
      if (sortField === 'fuelSubType' && a.fuelSubType) aValue = a.fuelSubType.name;
      if (sortField === 'fuelSubType' && b.fuelSubType) bValue = b.fuelSubType.name;

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      subType: '',
      sortBy: 'name-asc',
      sortOrder: 'asc'
    });
  };

  const openCreateModal = () => {
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
    setSuccess('Fuel product created successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleFuelUpdated = () => {
    loadData();
    setIsEditModalOpen(false);
    setSuccess('Fuel product updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      await fuelService.deleteFuelProduct(deletingItem.id);
      loadData();
      setSuccess('Fuel product deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to delete fuel product');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const getItemType = () => {
    switch (activeTab) {
      case 'products': return 'product';
      case 'subtypes': return 'subtype';
      case 'categories': return 'category';
      default: return 'item';
    }
  };

  const formatProductData = (product) => ({
    ...product,
    parentName: product.fuelSubType?.name || 'No Sub Type',
    code: product.fuelCode,
    specifications: [
      product.density && `${product.density} kg/L`,
      product.octaneRating && `RON ${product.octaneRating}`,
      product.sulfurContent && `${product.sulfurContent}ppm S`
    ].filter(Boolean).join(' • ') || 'No specs',
    categoryName: product.fuelSubType?.category?.name || 'N/A'
  });

  const formatSubTypeData = (subType) => ({
    ...subType,
    parentName: subType.category?.name || 'No Category',
    code: subType.code,
    specifications: subType.specification || 'No specification'
  });

  const formatCategoryData = (category) => ({
    ...category,
    parentName: '-',
    code: category.code,
    specifications: category.defaultColor ? `Color: ${category.defaultColor}` : 'No specs'
  });

  const formatItemData = (item) => {
    switch (activeTab) {
      case 'products': return formatProductData(item);
      case 'subtypes': return formatSubTypeData(item);
      case 'categories': return formatCategoryData(item);
      default: return item;
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      product: 'orange',
      subtype: 'green', 
      category: 'blue'
    };
    return colors[type] || 'gray';
  };

  const getTypeIcon = (type) => {
    const icons = {
      product: Fuel,
      subtype: Package,
      category: Layers
    };
    return icons[type] || Layers;
  };

  const LoadingState = () => (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading {activeTab}...</p>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load {activeTab}</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={loadData} icon={RefreshCw}>
          Try Again
        </Button>
      </div>
    </div>
  );

  const EmptyState = () => {
    const currentTab = tabs.find(t => t.id === activeTab);
    const Icon = currentTab?.icon || Layers;
    
    return (
      <div className="text-center py-12">
        <Icon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium text-gray-900 mb-2">No {activeTab} found</p>
        <p className="text-sm text-gray-600 mb-4">
          {filters.search || filters.category || filters.subType
            ? 'Try adjusting your search filters'
            : `Get started by creating your first ${activeTab.slice(0, -1)}`
          }
        </p>
        <Button
          variant="cosmic"
          onClick={openCreateModal}
          icon={Plus}
        >
          Create {activeTab.slice(0, -1)}
        </Button>
      </div>
    );
  };

  const filteredData = getFilteredData();
  const hasActiveFilters = filters.search || filters.category || filters.subType;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel Management</h1>
          <p className="text-gray-600 mt-1">
            Manage fuel products, subtypes, and categories for {state.currentUser?.company?.name}
          </p>
        </div>
        
        <Button 
          onClick={openCreateModal}
          icon={Plus}
          variant="cosmic"
        >
          Add Product
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <Button onClick={loadData} size="sm" variant="secondary" className="ml-4">
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <div className="flex-1 text-green-800">{success}</div>
          <X 
            className="w-4 h-4 cursor-pointer text-green-600 hover:text-green-800" 
            onClick={() => setSuccess('')} 
          />
        </div>
      )}

      {/* Compact Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Search */}
          <div className="flex-1 w-full lg:w-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 text-sm"
              />
            </div>
          </div>

          {/* Category Filter */}
          {activeTab !== 'categories' && (
            <Select
              value={filters.category}
              onChange={(event) => handleFilterChange('category', event.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
              className="w-full lg:w-48"
              size="sm"
            />
          )}

          {/* SubType Filter */}
          {activeTab === 'products' && (
            <Select
              value={filters.subType}
              onChange={(event) => handleFilterChange('subType', event.target.value)}
              options={[
                { value: '', label: 'All Sub Types' },
                ...subTypes.map(st => ({ value: st.id, label: st.name }))
              ]}
              className="w-full lg:w-48"
              size="sm"
            />
          )}

          {/* Sort */}
          <Select
            value={filters.sortBy}
            onChange={(event) => handleFilterChange('sortBy', event.target.value)}
            options={sortOptions[activeTab] || []}
            className="w-full lg:w-48"
            size="sm"
            icon={ArrowUpDown}
          />

          {/* Filter Actions */}
          <div className="flex gap-2 w-full lg:w-auto">
            {hasActiveFilters && (
              <Button 
                onClick={clearFilters}
                icon={X}
                variant="secondary"
                size="sm"
                className="flex-1 lg:flex-none"
              >
                Clear
              </Button>
            )}
            <Button 
              onClick={loadData}
              icon={RefreshCw}
              variant="outline"
              size="sm"
              className="flex-1 lg:flex-none"
            >
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              <span>{tab.label}</span>
              <Badge variant="secondary" className="ml-2">
                {tab.count}
              </Badge>
            </button>
          ))}
        </nav>
      </div>

      {/* Data Table */}
      <Card className="overflow-hidden">
        {loading && filteredData.length === 0 ? (
          <LoadingState />
        ) : error && filteredData.length === 0 ? (
          <ErrorState />
        ) : filteredData.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs tracking-wider">
                      Details
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs tracking-wider">
                      Code
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs tracking-wider">
                      Parent
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs tracking-wider">
                      Specifications
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.map((item) => {
                    const formattedItem = formatItemData(item);
                    const typeColor = getTypeColor(getItemType());
                    const TypeIcon = getTypeIcon(getItemType());

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-${typeColor}-100 text-${typeColor}-600`}>
                              <TypeIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                {formattedItem.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ID: {item.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <code className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded border">
                            {formattedItem.code}
                          </code>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900 font-medium">
                            {formattedItem.parentName}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600 max-w-xs">
                            {formattedItem.specifications}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="success" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              icon={Eye}
                              onClick={() => openEditModal(item)}
                              className="text-gray-500 hover:text-gray-700"
                            />
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              icon={Edit}
                              onClick={() => openEditModal(item)}
                              className="text-gray-500 hover:text-blue-600"
                            />
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              icon={Trash2}
                              onClick={() => openDeleteDialog(item)}
                              className="text-gray-500 hover:text-red-600"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {filteredData.length} of {filteredData.length} {activeTab}
                {hasActiveFilters && ' (filtered)'}
              </div>
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={openCreateModal}
                  icon={Plus}
                  variant="outline"
                  size="sm"
                >
                  Add New
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modals */}
      <CreateFuelModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onFuelCreated={handleFuelCreated}
        companyId={state.currentUser?.companyId}
      />

      {/* <EditFuelModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={editingItem}
        onFuelUpdated={handleFuelUpdated}
      /> */}

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={`Delete ${getItemType()}`}
        message={`Are you sure you want to delete "${deletingItem?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
};

export default FuelManagement;