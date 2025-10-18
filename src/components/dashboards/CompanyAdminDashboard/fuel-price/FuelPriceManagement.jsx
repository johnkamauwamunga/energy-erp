import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Edit, Save, X, Search, Filter, RefreshCw, 
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, Plus,
  Download, Upload, ArrowUpDown, ChevronDown, MoreVertical,
  Calculator, BarChart3
} from 'lucide-react';
import { 
  Button, Input, Select1 as Select, Card, Badge, 
  Dialog, ConfirmDialog, Tabs, Tooltip
} from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { fuelPriceService } from '../../../../services/fuelPriceService/fuelPriceService';
import FuelPriceUpdateModal from './FuelPriceUpdateModal';
import BulkPriceUpdateModal from './BulkPriceUpdateModal';

const FuelPriceManagement = () => {
  const { state } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    priceStatus: '',
    sortBy: 'name-asc'
  });

  // Statistics state
  const [stats, setStats] = useState({
    total: 0,
    withPricing: 0,
    profitable: 0,
    needsAttention: 0
  });

  // Load products with pricing
  const loadProducts = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fuelPriceService.getProductPrices({}, forceRefresh);
      console.log("💰 Prices response:", response);
      
      setProducts(response || []);
      calculateStats(response || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      setError(error.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (products) => {
    const withPricing = products.filter(p => p.hasPricing).length;
    const profitable = products.filter(p => p.priceStatus === 'profitable' || p.priceStatus === 'good').length;
    const needsAttention = products.filter(p => 
      !p.hasPricing || p.priceStatus === 'unprofitable' || (p.margin !== null && p.margin < 5)
    ).length;

    setStats({
      total: products.length,
      withPricing,
      profitable,
      needsAttention
    });
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Handle price update
  const handlePriceUpdate = async (productId, priceData) => {
    try {
      setError('');
      await fuelPriceService.updateProductPrices({
        productId,
        ...priceData
      });
      
      setSuccess('Price updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      loadProducts(true); // Force refresh
      setIsUpdateModalOpen(false);
    } catch (error) {
      console.error('Failed to update price:', error);
      setError(error.message || 'Failed to update price');
    }
  };

  // Handle bulk price update
  const handleBulkPriceUpdate = async (updates) => {
    try {
      setError('');
      await fuelPriceService.updateBulkProductPrices({ updates });
      
      setSuccess(`${updates.length} product prices updated successfully!`);
      setTimeout(() => setSuccess(''), 3000);
      loadProducts(true); // Force refresh
      setIsBulkModalOpen(false);
    } catch (error) {
      console.error('Failed to update bulk prices:', error);
      setError(error.message || 'Failed to update prices');
    }
  };

  // Open update modal
  const openUpdateModal = (product) => {
    setSelectedProduct(product);
    setIsUpdateModalOpen(true);
  };

  // Open bulk update modal
  const openBulkModal = () => {
    setIsBulkModalOpen(true);
  };

  // Start inline editing
  const startInlineEdit = (product) => {
    setEditingProduct({
      ...product,
      baseCostPrice: product.baseCostPrice || 0,
      minSellingPrice: product.minSellingPrice || 0,
      maxSellingPrice: product.maxSellingPrice || 0,
      originalPrices: {
        baseCostPrice: product.baseCostPrice || 0,
        minSellingPrice: product.minSellingPrice || 0,
        maxSellingPrice: product.maxSellingPrice || 0
      }
    });
  };

  // Cancel inline editing
  const cancelInlineEdit = () => {
    setEditingProduct(null);
  };

  // Save inline edit
  const saveInlineEdit = async () => {
    if (!editingProduct) return;

    try {
      await handlePriceUpdate(editingProduct.id, {
        baseCostPrice: parseFloat(editingProduct.baseCostPrice) || 0,
        minSellingPrice: parseFloat(editingProduct.minSellingPrice) || 0,
        maxSellingPrice: parseFloat(editingProduct.maxSellingPrice) || 0
      });
      setEditingProduct(null);
    } catch (error) {
      // Error is handled in handlePriceUpdate
    }
  };

  // Handle inline input change
  const handleInlineInputChange = (field, value) => {
    if (!editingProduct) return;

    setEditingProduct(prev => ({
      ...prev,
      [field]: value === '' ? '' : parseFloat(value) || 0
    }));
  };

  // Filter and sort products
  const getFilteredProducts = () => {
    let filtered = [...products];

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.fuelCode?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply price status filter
    if (filters.priceStatus) {
      filtered = filtered.filter(product => 
        product.priceStatus === filters.priceStatus
      );
    }

    // Apply sorting
    const [sortField, sortOrder] = filters.sortBy.split('-');
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle calculated fields
      switch (sortField) {
        case 'margin':
          aValue = a.margin || 0;
          bValue = b.margin || 0;
          break;
        case 'priceSpread':
          aValue = (a.maxSellingPrice || 0) - (a.minSellingPrice || 0);
          bValue = (b.maxSellingPrice || 0) - (b.minSellingPrice || 0);
          break;
        default:
          break;
      }

      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  // Export pricing data
  const exportPricingData = async () => {
    try {
      await fuelPriceService.exportPricingData('csv');
      setSuccess('Pricing data exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to export pricing data');
    }
  };

  // Quick actions
  const quickActions = [
    {
      label: 'Refresh Prices',
      icon: RefreshCw,
      action: () => loadProducts(true),
      variant: 'outline'
    },
    {
      label: 'Bulk Update',
      icon: Upload,
      action: openBulkModal,
      variant: 'cosmic'
    },
    {
      label: 'Export Data',
      icon: Download,
      action: exportPricingData,
      variant: 'outline'
    }
  ];

  const filteredProducts = getFilteredProducts();
  const hasActiveFilters = filters.search || filters.priceStatus;

  const LoadingState = () => (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading product prices...</p>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load product prices</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => loadProducts(true)} icon={RefreshCw}>
          Try Again
        </Button>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-12">
      <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
      <p className="text-lg font-medium text-gray-900 mb-2">No products found</p>
      <p className="text-sm text-gray-600 mb-4">
        {hasActiveFilters 
          ? 'Try adjusting your search filters'
          : 'No fuel products available for pricing management'
        }
      </p>
      {!hasActiveFilters && (
        <Button variant="cosmic" onClick={() => window.location.href = '/fuel-management'}>
          <Plus className="w-4 h-4 mr-2" />
          Create Products
        </Button>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel Price Management</h1>
          <p className="text-gray-600 mt-1">
            Manage pricing for all fuel products in {state.currentUser?.company?.name}
          </p>
        </div>
        
        <div className="flex space-x-3">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              onClick={action.action}
              icon={action.icon}
              variant={action.variant}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <Button onClick={() => setError('')} size="sm" variant="ghost" className="ml-4">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
          <div className="flex-1 text-green-800">{success}</div>
          <X 
            className="w-4 h-4 cursor-pointer text-green-600 hover:text-green-800" 
            onClick={() => setSuccess('')} 
          />
        </div>
      )}

      {/* Statistics Cards */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center border-l-4 border-l-blue-500">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Products</div>
          </Card>
          <Card className="p-4 text-center border-l-4 border-l-green-500">
            <div className="text-2xl font-bold text-green-600">{stats.withPricing}</div>
            <div className="text-sm text-gray-600">With Pricing</div>
          </Card>
          <Card className="p-4 text-center border-l-4 border-l-emerald-500">
            <div className="text-2xl font-bold text-emerald-600">{stats.profitable}</div>
            <div className="text-sm text-gray-600">Profitable</div>
          </Card>
          <Card className="p-4 text-center border-l-4 border-l-orange-500">
            <div className="text-2xl font-bold text-orange-600">{stats.needsAttention}</div>
            <div className="text-sm text-gray-600">Needs Attention</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search products by name or fuel code..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2 text-sm"
              />
            </div>
          </div>

          {/* Price Status Filter */}
          <Select
            value={filters.priceStatus}
            onChange={(event) => setFilters(prev => ({ ...prev, priceStatus: event.target.value }))}
            options={[
              { value: '', label: 'All Status' },
              { value: 'profitable', label: 'Profitable (>20%)' },
              { value: 'good', label: 'Good Margin (10-20%)' },
              { value: 'low-margin', label: 'Low Margin (0-10%)' },
              { value: 'unprofitable', label: 'Unprofitable' },
              { value: 'no-pricing', label: 'No Pricing' }
            ]}
            className="w-full"
            size="sm"
          />

          {/* Sort */}
          <Select
            value={filters.sortBy}
            onChange={(event) => setFilters(prev => ({ ...prev, sortBy: event.target.value }))}
            options={[
              { value: 'name-asc', label: 'Name A-Z' },
              { value: 'name-desc', label: 'Name Z-A' },
              { value: 'fuelCode-asc', label: 'Fuel Code A-Z' },
              { value: 'baseCostPrice-asc', label: 'Base Cost Low-High' },
              { value: 'baseCostPrice-desc', label: 'Base Cost High-Low' },
              { value: 'margin-desc', label: 'Margin High-Low' },
              { value: 'margin-asc', label: 'Margin Low-High' },
              { value: 'priceSpread-desc', label: 'Price Spread High-Low' }
            ]}
            className="w-full"
            size="sm"
            icon={ArrowUpDown}
          />
        </div>

        {/* Second row of filters */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600">
            Showing {filteredProducts.length} of {products.length} products
            {hasActiveFilters && ' (filtered)'}
          </div>

          <div className="flex space-x-2">
            {hasActiveFilters && (
              <Button 
                onClick={() => setFilters({
                  search: '',
                  priceStatus: '',
                  sortBy: 'name-asc'
                })}
                icon={X}
                variant="secondary"
                size="sm"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="overflow-hidden">
        {loading && filteredProducts.length === 0 ? (
          <LoadingState />
        ) : error && filteredProducts.length === 0 ? (
          <ErrorState />
        ) : filteredProducts.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs tracking-wider">
                      Product
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs tracking-wider">
                      Base Cost
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs tracking-wider">
                      Price Range
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 uppercase text-xs tracking-wider">
                      Margin
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
                  {filteredProducts.map((product) => {
                    const isEditing = editingProduct?.id === product.id;
                    const formattedProduct = fuelPriceService.formatProductForDisplay(product);

                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                        {/* Product Info */}
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs border">
                                {product.fuelCode}
                              </code>
                              {product.unit && (
                                <span className="ml-2 text-xs text-gray-400">{product.unit}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Base Cost */}
                        <td className="py-4 px-6">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingProduct.baseCostPrice}
                              onChange={(e) => handleInlineInputChange('baseCostPrice', e.target.value)}
                              className="w-24 text-sm"
                              size="sm"
                            />
                          ) : (
                            <div className="text-sm font-medium text-gray-900">
                              {product.baseCostPrice ? `$${product.baseCostPrice.toFixed(2)}` : (
                                <span className="text-gray-400 italic">Not set</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Price Range */}
                        <td className="py-4 px-6">
                          {isEditing ? (
                            <div className="flex space-x-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingProduct.minSellingPrice}
                                onChange={(e) => handleInlineInputChange('minSellingPrice', e.target.value)}
                                placeholder="Min"
                                className="w-20 text-sm"
                                size="sm"
                              />
                              <span className="text-gray-400 self-center">-</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingProduct.maxSellingPrice}
                                onChange={(e) => handleInlineInputChange('maxSellingPrice', e.target.value)}
                                placeholder="Max"
                                className="w-20 text-sm"
                                size="sm"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {product.minSellingPrice && product.maxSellingPrice 
                                  ? `$${product.minSellingPrice.toFixed(2)} - $${product.maxSellingPrice.toFixed(2)}`
                                  : <span className="text-gray-400 italic">Not set</span>
                                }
                              </div>
                              {formattedProduct.priceSpread > 0 && (
                                <div className="text-xs text-gray-500">
                                  Spread: ${formattedProduct.priceSpread.toFixed(2)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Margin */}
                        <td className="py-4 px-6">
                          <div className={`text-sm font-medium ${
                            formattedProduct.margin > 20 ? 'text-green-600' :
                            formattedProduct.margin > 10 ? 'text-blue-600' :
                            formattedProduct.margin > 0 ? 'text-orange-600' :
                            'text-gray-400'
                          }`}>
                            {formattedProduct.marginDisplay}
                          </div>
                          {formattedProduct.margin && (
                            <div className="text-xs text-gray-500">
                              ${((product.maxSellingPrice - product.baseCostPrice) || 0).toFixed(2)} profit
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          <Badge 
                            variant={formattedProduct.priceStatus === 'profitable' ? 'success' :
                                    formattedProduct.priceStatus === 'good' ? 'primary' :
                                    formattedProduct.priceStatus === 'low-margin' ? 'warning' :
                                    formattedProduct.priceStatus === 'unprofitable' ? 'error' : 'secondary'}
                          >
                            {formattedProduct.priceStatus === 'profitable' && '💰 Profitable'}
                            {formattedProduct.priceStatus === 'good' && '👍 Good'}
                            {formattedProduct.priceStatus === 'low-margin' && '⚠️ Low Margin'}
                            {formattedProduct.priceStatus === 'unprofitable' && '❌ Unprofitable'}
                            {formattedProduct.priceStatus === 'no-pricing' && '📝 Needs Pricing'}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6">
                          <div className="flex space-x-2">
                            {isEditing ? (
                              <>
                                <Tooltip content="Save changes">
                                  <Button 
                                    size="sm" 
                                    variant="success"
                                    icon={Save}
                                    onClick={saveInlineEdit}
                                  />
                                </Tooltip>
                                <Tooltip content="Cancel editing">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    icon={X}
                                    onClick={cancelInlineEdit}
                                  />
                                </Tooltip>
                              </>
                            ) : (
                              <>
                                <Tooltip content="Quick edit">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    icon={Edit}
                                    onClick={() => startInlineEdit(product)}
                                  />
                                </Tooltip>
                                <Tooltip content="Advanced pricing">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    icon={Calculator}
                                    onClick={() => openUpdateModal(product)}
                                  />
                                </Tooltip>
                              </>
                            )}
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
                {filteredProducts.length} products • {stats.withPricing} with pricing • {stats.profitable} profitable
              </div>
              <Button 
                onClick={openBulkModal}
                icon={Upload}
                variant="cosmic"
                size="sm"
              >
                Bulk Update
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Modals */}
      <FuelPriceUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        product={selectedProduct}
        onPriceUpdate={handlePriceUpdate}
      />

      <BulkPriceUpdateModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        products={products}
        onBulkUpdate={handleBulkPriceUpdate}
      />
    </div>
  );
};

export default FuelPriceManagement;