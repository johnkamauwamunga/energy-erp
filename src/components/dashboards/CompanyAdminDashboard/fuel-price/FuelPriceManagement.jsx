import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, Edit, Save, X, Search, RefreshCw, 
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, Plus,
  Download, Upload, ArrowUpDown, Calculator, FileText,
  Eye, Filter, MoreVertical
} from 'lucide-react';
import { 
  Button, Input, Select1 as Select, Card, Badge, 
  Dialog, ConfirmDialog, Tabs, Tooltip
} from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { fuelPriceService } from '../../../../services/fuelPriceService/fuelPriceService';
import FuelPriceUpdateModal from './FuelPriceUpdateModal';
import BulkPriceUpdateModal from './BulkPriceUpdateModal';
import AdvancedReportGenerator from '../../common/downloadable/AdvancedReportGenerator'; // Import report generator

const FuelPriceManagement = () => {
  const { state } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [reportConfig, setReportConfig] = useState(null);
  
  // Filter states - COMPACT
  const [filters, setFilters] = useState({
    search: '',
    priceStatus: '',
    sortBy: 'name-asc'
  });

  // Pagination - COMPACT
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0
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
      setPagination(prev => ({ ...prev, total: (response || []).length }));
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
      loadProducts(true);
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
      loadProducts(true);
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

  // Filter and sort products with pagination
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

  // Get paginated data
  const getPaginatedData = () => {
    const filtered = getFilteredProducts();
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return filtered.slice(start, end);
  };

  const filteredProducts = getFilteredProducts();
  const paginatedProducts = getPaginatedData();
  const hasActiveFilters = filters.search || filters.priceStatus;

  // ==================== REPORT GENERATION ====================

  // Prepare pricing report data - COMPACT columns
  const preparePricingReportData = (data) => {
    return data.map((item, index) => ({
      '#': index + 1,
      'Product Name': item.name,
      'Fuel Code': item.fuelCode,
      'Base Cost': item.baseCostPrice || 0,
      'Min Price': item.minSellingPrice || 0,
      'Max Price': item.maxSellingPrice || 0,
      'Margin %': item.margin || 0,
      'Status': item.priceStatus || 'no-pricing',
      'Has Pricing': item.hasPricing ? 'Yes' : 'No',
      'Unit': item.unit || 'L'
    }));
  };

  // Get pricing report columns - COMPACT
  const getPricingReportColumns = () => [
    { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
    { title: 'Product Name', dataIndex: 'Product Name', key: 'name', width: 150, type: 'text' },
    { title: 'Fuel Code', dataIndex: 'Fuel Code', key: 'code', width: 80, type: 'text' },
    { title: 'Base Cost', dataIndex: 'Base Cost', key: 'cost', width: 100, type: 'currency' },
    { title: 'Min Price', dataIndex: 'Min Price', key: 'min', width: 100, type: 'currency' },
    { title: 'Max Price', dataIndex: 'Max Price', key: 'max', width: 100, type: 'currency' },
    { title: 'Margin %', dataIndex: 'Margin %', key: 'margin', width: 80, type: 'percentage' },
    { title: 'Status', dataIndex: 'Status', key: 'status', width: 100, type: 'text' },
    { title: 'Has Pricing', dataIndex: 'Has Pricing', key: 'hasPricing', width: 80, type: 'boolean' },
    { title: 'Unit', dataIndex: 'Unit', key: 'unit', width: 60, type: 'text' }
  ];

  // Calculate pricing report summary
  const calculatePricingSummary = (data) => {
    const totalProducts = data.length;
    const withPricing = data.filter(p => p.hasPricing).length;
    const avgMargin = data.reduce((sum, p) => sum + (p.margin || 0), 0) / (withPricing || 1);
    
    return {
      'Report Type': 'Fuel Pricing Report',
      'Total Products': totalProducts,
      'Products with Pricing': withPricing,
      'Products without Pricing': totalProducts - withPricing,
      'Average Margin': `${avgMargin.toFixed(2)}%`,
      'Profitable Products': data.filter(p => p.priceStatus === 'profitable').length,
      'Needs Attention': data.filter(p => !p.hasPricing || p.priceStatus === 'unprofitable').length,
      'Generated Date': new Date().toLocaleDateString('en-KE'),
      'Generated Time': new Date().toLocaleTimeString('en-KE')
    };
  };

  // Handle generate report
  const handleGenerateReport = () => {
    if (products.length === 0) {
      setError('No product data to export');
      return;
    }

    const reportData = preparePricingReportData(products);
    const reportColumns = getPricingReportColumns();
    const summaryData = calculatePricingSummary(products);
    
    const title = `Fuel Pricing Report - ${state.currentCompany?.name || 'Company'}`;
    const fileName = `fuel_pricing_${new Date().toISOString().split('T')[0]}`;
    
    const config = {
      dataSource: reportData,
      columns: reportColumns,
      summaryData: summaryData,
      title: title,
      fileName: fileName,
      reportType: 'inventory', // Using inventory theme for fuel
      companyName: state.currentCompany?.name || "Lynx Energy System",
      stationInfo: state.currentStation ? {
        name: state.currentStation.name,
        code: state.currentStation.code,
        address: state.currentStation.address
      } : null,
      showFooter: true,
      footerText: `Generated from Lynx Energy | User: ${state.currentUser?.firstName || ''} ${state.currentUser?.lastName || ''} | ${new Date().toLocaleString('en-KE')}`,
      enableCustomization: true,
      showGrandTotals: true
    };
    
    setReportConfig(config);
    setIsReportModalOpen(true);
  };

  const handleReportComplete = (format) => {
    setSuccess(`Fuel pricing report generated successfully as ${format.toUpperCase()}!`);
    setTimeout(() => setSuccess(''), 3000);
    setIsReportModalOpen(false);
    setReportConfig(null);
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

  // Loading state
  const LoadingState = () => (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600 text-sm">Loading product prices...</p>
      </div>
    </div>
  );

  // Error state
  const ErrorState = () => (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load product prices</h3>
        <p className="text-gray-600 mb-4 text-sm">{error}</p>
        <Button onClick={() => loadProducts(true)} size="sm" icon={RefreshCw}>
          Try Again
        </Button>
      </div>
    </div>
  );

  // Empty state
  const EmptyState = () => (
    <div className="text-center py-12">
      <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p className="text-base font-medium text-gray-900 mb-2">No products found</p>
      <p className="text-sm text-gray-600 mb-4">
        {hasActiveFilters 
          ? 'Try adjusting your search filters'
          : 'No fuel products available for pricing management'
        }
      </p>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header - COMPACT */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Fuel Price Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {state.currentUser?.company?.name} • {filteredProducts.length} products
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Tooltip content="Refresh">
            <Button 
              onClick={() => loadProducts(true)} 
              size="sm" 
              variant="ghost"
              icon={RefreshCw}
              loading={loading}
            />
          </Tooltip>
          <Tooltip content="Generate Report">
            <Button 
              onClick={handleGenerateReport}
              size="sm" 
              variant="ghost"
              icon={FileText}
              disabled={products.length === 0}
            />
          </Tooltip>
          <Tooltip content="Export CSV">
            <Button 
              onClick={exportPricingData}
              size="sm" 
              variant="ghost"
              icon={Download}
              disabled={products.length === 0}
            />
          </Tooltip>
          <Tooltip content="Bulk Update">
            <Button 
              onClick={() => setIsBulkModalOpen(true)}
              size="sm" 
              variant="cosmic"
              icon={Upload}
              disabled={products.length === 0}
            >
              Bulk
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Alerts - COMPACT */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
          <span className="text-sm text-red-700 flex-1">{error}</span>
          <X 
            className="w-4 h-4 cursor-pointer text-red-600 hover:text-red-800" 
            onClick={() => setError('')} 
          />
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
          <span className="text-sm text-green-700 flex-1">{success}</span>
          <X 
            className="w-4 h-4 cursor-pointer text-green-600 hover:text-green-800" 
            onClick={() => setSuccess('')} 
          />
        </div>
      )}

      {/* Quick Stats - COMPACT */}
      {products.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-2 text-center">
            <div className="text-lg font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </Card>
          <Card className="p-2 text-center">
            <div className="text-lg font-bold text-green-600">{stats.withPricing}</div>
            <div className="text-xs text-gray-500">With Price</div>
          </Card>
          <Card className="p-2 text-center">
            <div className="text-lg font-bold text-emerald-600">{stats.profitable}</div>
            <div className="text-xs text-gray-500">Profitable</div>
          </Card>
          <Card className="p-2 text-center">
            <div className="text-lg font-bold text-orange-600">{stats.needsAttention}</div>
            <div className="text-xs text-gray-500">Attention</div>
          </Card>
        </div>
      )}

      {/* Filters - COMPACT */}
      <Card className="p-3">
        <div className="grid grid-cols-4 gap-2">
          {/* Search */}
          <div className="col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-8 pr-3 py-1.5 text-xs"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={filters.priceStatus}
            onChange={(event) => setFilters(prev => ({ ...prev, priceStatus: event.target.value }))}
            options={[
              { value: '', label: 'All Status' },
              { value: 'profitable', label: 'Profitable' },
              { value: 'good', label: 'Good' },
              { value: 'low-margin', label: 'Low Margin' },
              { value: 'unprofitable', label: 'Unprofitable' },
              { value: 'no-pricing', label: 'No Pricing' }
            ]}
            className="w-full text-xs"
            size="sm"
          />

          {/* Sort */}
          <Select
            value={filters.sortBy}
            onChange={(event) => setFilters(prev => ({ ...prev, sortBy: event.target.value }))}
            options={[
              { value: 'name-asc', label: 'Name A-Z' },
              { value: 'name-desc', label: 'Name Z-A' },
              { value: 'fuelCode-asc', label: 'Code A-Z' },
              { value: 'margin-desc', label: 'Margin High' },
              { value: 'margin-asc', label: 'Margin Low' }
            ]}
            className="w-full text-xs"
            size="sm"
          />
        </div>

        {/* Filter footer */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">
            {filteredProducts.length} of {products.length} products
          </span>
          {hasActiveFilters && (
            <Button 
              onClick={() => setFilters({ search: '', priceStatus: '', sortBy: 'name-asc' })}
              size="xs"
              variant="ghost"
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Products Table - COMPACT like AccountsManagement */}
      <Card className="overflow-hidden">
        {loading && products.length === 0 ? (
          <LoadingState />
        ) : error && products.length === 0 ? (
          <ErrorState />
        ) : filteredProducts.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">#</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Product</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Code</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Cost</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Min</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Max</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Margin</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedProducts.map((product, index) => {
                    const isEditing = editingProduct?.id === product.id;
                    const formattedProduct = fuelPriceService.formatProductForDisplay(product);
                    const rowIndex = (pagination.page - 1) * pagination.limit + index + 1;

                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        {/* Index */}
                        <td className="py-2 px-3">
                          <span className="text-xs text-gray-500">{rowIndex}</span>
                        </td>

                        {/* Product Name */}
                        <td className="py-2 px-3">
                          <span className="text-xs font-medium text-gray-900">
                            {product.name?.length > 25 
                              ? product.name.substring(0, 25) + '...' 
                              : product.name}
                          </span>
                        </td>

                        {/* Fuel Code */}
                        <td className="py-2 px-3">
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {product.fuelCode}
                          </code>
                        </td>

                        {/* Base Cost */}
                        <td className="py-2 px-3 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingProduct.baseCostPrice}
                              onChange={(e) => handleInlineInputChange('baseCostPrice', e.target.value)}
                              className="w-20 text-xs h-6"
                              size="xs"
                            />
                          ) : (
                            <span className="text-xs font-medium">
                              {product.baseCostPrice 
                                ? `KES ${product.baseCostPrice.toFixed(2)}`
                                : <span className="text-gray-300">-</span>}
                            </span>
                          )}
                        </td>

                        {/* Min Price */}
                        <td className="py-2 px-3 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingProduct.minSellingPrice}
                              onChange={(e) => handleInlineInputChange('minSellingPrice', e.target.value)}
                              className="w-20 text-xs h-6"
                              size="xs"
                            />
                          ) : (
                            <span className="text-xs">
                              {product.minSellingPrice 
                                ? `KES ${product.minSellingPrice.toFixed(2)}`
                                : <span className="text-gray-300">-</span>}
                            </span>
                          )}
                        </td>

                        {/* Max Price */}
                        <td className="py-2 px-3 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingProduct.maxSellingPrice}
                              onChange={(e) => handleInlineInputChange('maxSellingPrice', e.target.value)}
                              className="w-20 text-xs h-6"
                              size="xs"
                            />
                          ) : (
                            <span className="text-xs">
                              {product.maxSellingPrice 
                                ? `KES ${product.maxSellingPrice.toFixed(2)}`
                                : <span className="text-gray-300">-</span>}
                            </span>
                          )}
                        </td>

                        {/* Margin */}
                        <td className="py-2 px-3 text-right">
                          {formattedProduct.margin !== null ? (
                            <span className={`text-xs font-medium ${
                              formattedProduct.margin > 20 ? 'text-green-600' :
                              formattedProduct.margin > 10 ? 'text-blue-600' :
                              formattedProduct.margin > 0 ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {formattedProduct.margin.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3 text-center">
                          {formattedProduct.priceStatus && (
                            <Badge 
                              variant={formattedProduct.priceStatus === 'profitable' ? 'success' :
                                     formattedProduct.priceStatus === 'good' ? 'primary' :
                                     formattedProduct.priceStatus === 'low-margin' ? 'warning' :
                                     formattedProduct.priceStatus === 'unprofitable' ? 'error' : 'secondary'}
                              size="sm"
                            >
                              {formattedProduct.priceStatus === 'profitable' && '💰'}
                              {formattedProduct.priceStatus === 'good' && '👍'}
                              {formattedProduct.priceStatus === 'low-margin' && '⚠️'}
                              {formattedProduct.priceStatus === 'unprofitable' && '❌'}
                              {formattedProduct.priceStatus === 'no-pricing' && '📝'}
                            </Badge>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3">
                          <div className="flex justify-center space-x-1">
                            {isEditing ? (
                              <>
                                <Tooltip content="Save">
                                  <Button 
                                    size="xs" 
                                    variant="success"
                                    icon={Save}
                                    onClick={saveInlineEdit}
                                  />
                                </Tooltip>
                                <Tooltip content="Cancel">
                                  <Button 
                                    size="xs" 
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
                                    size="xs" 
                                    variant="ghost"
                                    icon={Edit}
                                    onClick={() => startInlineEdit(product)}
                                  />
                                </Tooltip>
                                <Tooltip content="Advanced">
                                  <Button 
                                    size="xs" 
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

            {/* Pagination - COMPACT */}
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="text-xs text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, filteredProducts.length)} of{' '}
                {filteredProducts.length} entries
              </div>
              <div className="flex space-x-1">
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  Prev
                </Button>
                <span className="px-3 py-1 text-xs bg-white border border-gray-300 rounded">
                  {pagination.page}
                </span>
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page * pagination.limit >= filteredProducts.length}
                >
                  Next
                </Button>
              </div>
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

      {/* Report Generator Modal */}
      {isReportModalOpen && reportConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900">Fuel Pricing Report</h3>
                <Badge variant="primary" size="sm">{reportConfig.dataSource.length} records</Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon={X}
                onClick={() => {
                  setIsReportModalOpen(false);
                  setReportConfig(null);
                }}
              />
            </div>
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <AdvancedReportGenerator
                key={`pricing-report-${Date.now()}`}
                {...reportConfig}
                onReportGenerate={handleReportComplete}
                onSettingsSave={(settings) => {
                  console.log('Settings saved:', settings);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelPriceManagement;