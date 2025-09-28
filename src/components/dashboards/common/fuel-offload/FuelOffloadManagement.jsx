// src/components/fuel-offload/FuelOffloadManagement.js
import React, { useState, useEffect } from 'react';
import { 
  Plus, Eye, Edit, Trash2, Search, Filter, RefreshCw, 
  CheckCircle, XCircle, BarChart3, Download, Truck, Calendar, 
  Users, Tag, AlertCircle, Fuel, Zap, Clock, Archive, 
  Calculator, FileText, CheckSquare, MapPin, Building, 
  Smartphone, Monitor, Grid, List, ChevronDown, ChevronUp,
  Package, Scale, Thermometer, Droplets, UserCheck
} from 'lucide-react';
import { Button, Input, Select, Badge, LoadingSpinner, Alert, Modal } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import CreateOffloadModal from './CreateOffloadModal';
import OffloadDetailsModal from './OffloadDetailsModal';
import { fuelOffloadService, offloadFormatters } from '../../services/fuelOffloadService';

const FuelOffloadManagement = () => {
  const { state } = useApp();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOffload, setSelectedOffload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offloads, setOffloads] = useState([]);
  const [stations, setStations] = useState([]);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, totalCount: 0, totalPages: 1 });

  // Detect mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) setViewMode('grid');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load offloads and stations
  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      
      // Build filters for backend API
      const filters = {
        page: page,
        limit: pagination.limit,
        sortBy: 'startTime',
        sortOrder: 'desc'
      };

      if (statusFilter !== 'all') filters.status = statusFilter;
      if (stationFilter !== 'all') filters.stationId = stationFilter;
      if (productFilter !== 'all') filters.productId = productFilter;
      if (supplierFilter !== 'all') filters.supplierId = supplierFilter;
      if (dateFilter) filters.startDate = new Date(dateFilter).toISOString();
      if (searchQuery) {
        // Search in multiple fields
        filters.search = searchQuery;
      }

      let offloadsResponse;
      if (state.currentUser?.stationId) {
        // Station-level view - use station filter
        offloadsResponse = await fuelOffloadService.getOffloads({
          ...filters,
          stationId: state.currentUser.stationId
        });
      } else {
        // Company-level view
        offloadsResponse = await fuelOffloadService.getOffloads(filters);
      }

      // Handle response format with pagination
      if (offloadsResponse.pagination) {
        setPagination(offloadsResponse.pagination);
        setOffloads(offloadsResponse.offloads || offloadsResponse.data || []);
      } else {
        const offloadsData = offloadsResponse.offloads || offloadsResponse.data || offloadsResponse;
        setOffloads(Array.isArray(offloadsData) ? offloadsData : []);
      }

      // Load stations for company admins
      if (!state.currentUser?.stationId && state.stations) {
        setStations(state.stations);
      }

    } catch (error) {
      console.error('Failed to load offloads:', error);
      setError(error.message || 'Failed to load fuel offloads');
      setOffloads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [retryCount, statusFilter, stationFilter, productFilter, supplierFilter, dateFilter]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData(1);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleOffloadCreated = () => {
    loadData(1);
    setIsCreateModalOpen(false);
  };

  const handleRetry = () => setRetryCount(prev => prev + 1);

  // Status badge with mobile optimization - UPDATED FOR BACKEND STATUSES
  const getStatusBadge = (status) => {
    const statusConfig = {
      'UNLOADING': { color: 'blue', label: 'Unloading', icon: Clock, short: 'Unloading' },
      'FULLY_ACCEPTED': { color: 'green', label: 'Fully Accepted', icon: CheckCircle, short: 'Accepted' },
      'PARTIALLY_ACCEPTED': { color: 'orange', label: 'Partially Accepted', icon: AlertCircle, short: 'Partial' },
      'REJECTED': { color: 'red', label: 'Rejected', icon: XCircle, short: 'Rejected' }
    };

    const config = statusConfig[status] || { color: 'gray', label: status, icon: Clock, short: status };
    const IconComponent = config.icon;

    return (
      <Badge variant={config.color} className="flex items-center gap-1 text-xs">
        <IconComponent className="w-3 h-3" />
        <span className={isMobile ? 'hidden sm:inline' : ''}>
          {isMobile ? config.short : config.label}
        </span>
      </Badge>
    );
  };

  // Action handlers
  const handleViewDetails = async (offload) => {
    try {
      const detailedOffload = await fuelOffloadService.getOffloadById(offload.id);
      setSelectedOffload(detailedOffload);
      setIsDetailsModalOpen(true);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEditOffload = (offload) => {
    if (offload.status !== 'UNLOADING') {
      setError('Only offloads in UNLOADING status can be edited');
      return;
    }
    setSelectedOffload(offload);
    setIsCreateModalOpen(true);
  };

  const handleCompleteOffload = async (offload) => {
    try {
      // This will open the completion modal through the details view
      const detailedOffload = await fuelOffloadService.getOffloadById(offload.id);
      setSelectedOffload(detailedOffload);
      setIsDetailsModalOpen(true);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteOffload = async (offloadId) => {
    if (!window.confirm('Are you sure you want to cancel this offload? This action cannot be undone.')) return;
    
    try {
      await fuelOffloadService.updateOffload(offloadId, { status: 'REJECTED' });
      loadData(pagination.page);
    } catch (error) {
      setError(error.message);
    }
  };

  // Check permissions based on your backend roles
  const canManageOffloads = () => {
    const userRole = state.currentUser?.role;
    return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER', 'STATION_MANAGER', 'SUPERVISOR'].includes(userRole);
  };

  const canCreateOffloads = () => {
    const userRole = state.currentUser?.role;
    return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'STATION_MANAGER', 'SUPERVISOR'].includes(userRole);
  };

  // Statistics for dashboard - UPDATED FOR NEW STATUSES
  const stats = {
    total: offloads.length,
    unloading: offloads.filter(o => o.status === 'UNLOADING').length,
    fullyAccepted: offloads.filter(o => o.status === 'FULLY_ACCEPTED').length,
    partiallyAccepted: offloads.filter(o => o.status === 'PARTIALLY_ACCEPTED').length,
    today: offloads.filter(o => {
      const today = new Date().toDateString();
      const offloadDate = new Date(o.startTime || o.createdAt).toDateString();
      return offloadDate === today;
    }).length,
    totalVolume: offloads.reduce((sum, o) => sum + (o.actualQuantity || 0), 0),
    totalValue: offloads.reduce((sum, o) => sum + (o.totalValue || 0), 0)
  };

  // Format offload for display
  const formatOffload = (offload) => {
    return offloadFormatters.formatOffloadForDisplay(offload) || offload;
  };

  // Get unique products and suppliers for filters
  const uniqueProducts = [...new Set(offloads.map(o => o.productId).filter(Boolean))];
  const uniqueSuppliers = [...new Set(offloads.map(o => o.supplierId).filter(Boolean))];

  // Mobile-optimized offload card - ENHANCED WITH MORE INFO
  const MobileOffloadCard = ({ offload }) => {
    const formatted = formatOffload(offload);
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{offload.deliveryNoteNumber}</span>
              {getStatusBadge(offload.status)}
            </div>
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {offload.vehicleNumber} • {offload.driverName}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Building className="w-3 h-3" />
              {offload.tank?.asset?.station?.name || offload.purchaseItem?.station?.name} • {formatted.shortStartTime}
            </div>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setIsExpanded(!isExpanded)}
            icon={isExpanded ? ChevronUp : ChevronDown}
          />
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-2 border-t pt-3">
            {/* Enhanced Information Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3 text-gray-400" />
                <span>Product:</span>
              </div>
              <div className="font-medium">{offload.product?.name || offload.purchaseItem?.product?.name}</div>
              
              <div className="flex items-center gap-1">
                <Scale className="w-3 h-3 text-gray-400" />
                <span>Expected:</span>
              </div>
              <div className="font-medium">{offload.expectedQuantity}L</div>
              
              <div className="flex items-center gap-1">
                <Scale className="w-3 h-3 text-gray-400" />
                <span>Actual:</span>
              </div>
              <div className="font-medium">{offload.actualQuantity || 'N/A'}L</div>
              
              <div className="flex items-center gap-1">
                <Calculator className="w-3 h-3 text-gray-400" />
                <span>Variance:</span>
              </div>
              <div className={`font-medium ${
                offload.variance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {offload.variance || 0}L ({formatted.variancePercentage}%)
              </div>

              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-400" />
                <span>Supplier:</span>
              </div>
              <div className="font-medium">{offload.supplier?.name}</div>

              <div className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-gray-400" />
                <span>Density:</span>
              </div>
              <div className="font-medium">{offload.density || 'N/A'}</div>

              {offload.verifiedBy && (
                <>
                  <div className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-gray-400" />
                    <span>Verified:</span>
                  </div>
                  <div className="font-medium">
                    {offload.verifiedBy?.firstName} {offload.verifiedBy?.lastName}
                  </div>
                </>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <Button size="sm" variant="secondary" onClick={() => handleViewDetails(offload)}>
                <Eye className="w-3 h-3" />
                <span className="ml-1">Details</span>
              </Button>
              {offload.status === 'UNLOADING' && canManageOffloads() && (
                <>
                  <Button size="sm" variant="success" onClick={() => handleCompleteOffload(offload)}>
                    <CheckSquare className="w-3 h-3" />
                    <span className="ml-1">Complete</span>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleEditOffload(offload)}>
                    <Edit className="w-3 h-3" />
                    <span className="ml-1">Edit</span>
                  </Button>
                </>
              )}
              {canManageOffloads() && offload.status === 'UNLOADING' && (
                <Button size="sm" variant="danger" onClick={() => handleDeleteOffload(offload.id)}>
                  <Trash2 className="w-3 h-3" />
                  <span className="ml-1">Cancel</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Pagination controls
  const PaginationControls = () => (
    <div className="flex justify-between items-center mt-4">
      <div className="text-sm text-gray-600">
        Showing {offloads.length} of {pagination.totalCount} offloads
      </div>
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={() => loadData(pagination.page - 1)}
        >
          Previous
        </Button>
        <span className="px-3 py-1 text-sm bg-gray-100 rounded">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => loadData(pagination.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );

  if (loading && offloads.length === 0) {
    return (
      <div className="p-4 flex justify-center items-center min-h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading fuel offloads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            Fuel Offload Management
          </h3>
          <p className="text-gray-600 text-sm md:text-base">
            {state.currentUser?.stationId 
              ? `Managing offloads for ${state.currentStation?.name}` 
              : `Viewing offloads across all stations`
            }
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {canCreateOffloads() && (
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              icon={Plus}
              variant="cosmic"
              size="sm"
              className="flex-1 md:flex-none"
            >
              <span className="hidden sm:inline">New Offload</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
          
          <div className="flex gap-2">
            <Button 
              icon={RefreshCw}
              variant="outline" 
              size="sm"
              onClick={() => loadData(pagination.page)}
            >
              <span className="hidden md:inline">Refresh</span>
            </Button>
            <Button icon={Download} variant="outline" size="sm">
              <span className="hidden md:inline">Export</span>
            </Button>
            <Button 
              icon={viewMode === 'list' ? Grid : List}
              variant="outline" 
              size="sm"
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className="hidden md:flex"
            >
              {viewMode === 'list' ? 'Grid' : 'List'}
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert 
          type="error" 
          title="Error" 
          message={error} 
          actions={
            <Button onClick={handleRetry} size="sm" variant="secondary">
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          }
        />
      )}

      {/* Enhanced Statistics Cards */}
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total Offloads</p>
                <p className="text-lg font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Fully Accepted</p>
                <p className="text-lg font-bold text-gray-900">{stats.fullyAccepted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Unloading</p>
                <p className="text-lg font-bold text-gray-900">{stats.unloading}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Partial</p>
                <p className="text-lg font-bold text-gray-900">{stats.partiallyAccepted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Today</p>
                <p className="text-lg font-bold text-gray-900">{stats.today}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Scale className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total Volume</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalVolume.toLocaleString()}L</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filter Bar */}
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border">
        <div className="space-y-3">
          {/* Main Search Row */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search by delivery note, vehicle, driver, supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
                size="sm"
              />
            </div>
            <Button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              icon={Filter}
              variant="outline"
              size="sm"
            >
              <span className="hidden sm:inline">Filters</span>
              <span className="sm:hidden">Filter</span>
            </Button>
          </div>

          {/* Expandable Filters */}
          {isFilterOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="sm"
              >
                <option value="all">All Statuses</option>
                <option value="UNLOADING">Unloading</option>
                <option value="FULLY_ACCEPTED">Fully Accepted</option>
                <option value="PARTIALLY_ACCEPTED">Partially Accepted</option>
                <option value="REJECTED">Rejected</option>
              </Select>

              {!state.currentUser?.stationId && (
                <Select
                  value={stationFilter}
                  onChange={(e) => setStationFilter(e.target.value)}
                  size="sm"
                >
                  <option value="all">All Stations</option>
                  {stations.map(station => (
                    <option key={station.id} value={station.id}>{station.name}</option>
                  ))}
                </Select>
              )}

              <Select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                size="sm"
              >
                <option value="all">All Products</option>
                {uniqueProducts.map(productId => {
                  const product = offloads.find(o => o.productId === productId)?.product;
                  return product ? (
                    <option key={productId} value={productId}>{product.name}</option>
                  ) : null;
                }).filter(Boolean)}
              </Select>

              <Select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                size="sm"
              >
                <option value="all">All Suppliers</option>
                {uniqueSuppliers.map(supplierId => {
                  const supplier = offloads.find(o => o.supplierId === supplierId)?.supplier;
                  return supplier ? (
                    <option key={supplierId} value={supplierId}>{supplier.name}</option>
                  ) : null;
                }).filter(Boolean)}
              </Select>

              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  size="sm"
                  placeholder="Filter by date"
                />
                <Button 
                  onClick={() => {
                    setStatusFilter('all');
                    setStationFilter('all');
                    setProductFilter('all');
                    setSupplierFilter('all');
                    setDateFilter('');
                    setSearchQuery('');
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Offloads Display */}
      {isMobile || viewMode === 'grid' ? (
        // Mobile/Grid View
        <div className="space-y-3">
          {offloads.length > 0 ? (
            offloads.map(offload => (
              <MobileOffloadCard key={offload.id} offload={offload} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-medium">No offloads found</p>
              <p className="text-sm text-gray-500 mt-1">
                {canCreateOffloads() 
                  ? 'Create your first fuel offload to get started.' 
                  : 'No offloads match your current filters.'
                }
              </p>
              {(searchQuery || statusFilter !== 'all' || stationFilter !== 'all') && (
                <Button 
                  onClick={() => {
                    setStatusFilter('all');
                    setStationFilter('all');
                    setProductFilter('all');
                    setSupplierFilter('all');
                    setDateFilter('');
                    setSearchQuery('');
                  }}
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
          {offloads.length > 0 && <PaginationControls />}
        </div>
      ) : (
        // Desktop Table View
        <>
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Delivery Details</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Station & Product</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Quantities (L)</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Quality & Metrics</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Supplier & Financial</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Status & Timeline</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {offloads.length > 0 ? (
                    offloads.map(offload => {
                      const formatted = formatOffload(offload);
                      return (
                        <tr key={offload.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{offload.deliveryNoteNumber}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              <div className="flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                {offload.vehicleNumber} • {offload.driverName}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Users className="w-3 h-3" />
                                {offload.transporterName}
                              </div>
                              {offload.waybillNumber && (
                                <div className="flex items-center gap-1 mt-1">
                                  <FileText className="w-3 h-3" />
                                  {offload.waybillNumber}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">
                              {offload.tank?.asset?.station?.name || offload.purchaseItem?.station?.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {offload.product?.name || offload.purchaseItem?.product?.name}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Fuel className="w-3 h-3" />
                                {offload.tank?.asset?.name}
                              </div>
                            </div>
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expected:</span>
                                <span className="font-medium">{offload.expectedQuantity}L</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Actual:</span>
                                <span className="font-medium">{offload.actualQuantity || 'N/A'}L</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Variance:</span>
                                <span className={`font-medium ${
                                  (offload.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {offload.variance || 0}L
                                </span>
                              </div>
                              {offload.dipVolumeChange && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Dip Change:</span>
                                  <span className="font-medium">{offload.dipVolumeChange}L</span>
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="space-y-1 text-sm">
                              {offload.density && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Density:</span>
                                  <span>{offload.density}</span>
                                </div>
                              )}
                              {offload.temperature && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Temp:</span>
                                  <span>{offload.temperature}°C</span>
                                </div>
                              )}
                              {offload.salesDuringOffload > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Sales During:</span>
                                  <span className="text-green-600">{offload.salesDuringOffload}L</span>
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{offload.supplier?.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              <div>Unit Price: {formatted.unitPriceFormatted}</div>
                              {offload.totalValue && (
                                <div>Total: {formatted.totalValueFormatted}</div>
                              )}
                            </div>
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="mb-2">{getStatusBadge(offload.status)}</div>
                            <div className="text-xs text-gray-500 space-y-1">
                              <div>Start: {formatted.formattedStartTime}</div>
                              {offload.endTime && <div>End: {formatted.formattedEndTime}</div>}
                              {offload.verifiedBy && (
                                <div>Verified by: {offload.verifiedBy?.firstName}</div>
                              )}
                            </div>
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="flex flex-col space-y-2">
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                icon={Eye}
                                onClick={() => handleViewDetails(offload)}
                              >
                                View
                              </Button>
                              
                              {offload.status === 'UNLOADING' && canManageOffloads() && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="success" 
                                    icon={CheckSquare}
                                    onClick={() => handleCompleteOffload(offload)}
                                  >
                                    Complete
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    icon={Edit}
                                    onClick={() => handleEditOffload(offload)}
                                  >
                                    Edit
                                  </Button>
                                </>
                              )}
                              
                              {canManageOffloads() && offload.status === 'UNLOADING' && (
                                <Button 
                                  size="sm" 
                                  variant="danger" 
                                  icon={Trash2}
                                  onClick={() => handleDeleteOffload(offload.id)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 px-4 text-center text-gray-500">
                        <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-lg font-medium">No offloads found</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {canCreateOffloads() 
                            ? 'Create your first fuel offload to get started.' 
                            : 'No offloads match your current filters.'
                          }
                        </p>
                        {(searchQuery || statusFilter !== 'all' || stationFilter !== 'all') && (
                          <Button 
                            onClick={() => {
                              setStatusFilter('all');
                              setStationFilter('all');
                              setProductFilter('all');
                              setSupplierFilter('all');
                              setDateFilter('');
                              setSearchQuery('');
                            }}
                            variant="secondary"
                            size="sm"
                            className="mt-3"
                          >
                            Clear Filters
                          </Button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {offloads.length > 0 && <PaginationControls />}
        </>
      )}

      {/* Create/Edit Offload Modal */}
      <CreateOffloadModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedOffload(null);
        }}
        offload={selectedOffload}
        onOffloadCreated={handleOffloadCreated}
        refreshOffloads={() => loadData(pagination.page)}
      />

      {/* Offload Details Modal */}
      <OffloadDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedOffload(null);
        }}
        offload={selectedOffload}
        onOffloadUpdated={handleOffloadCreated}
      />
    </div>
  );
};

export default FuelOffloadManagement;