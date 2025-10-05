import React, { useState, useMemo } from 'react';
import { 
  Card, Table, Button, Input, Badge, Select, 
  DatePicker, SearchInput, LoadingSpinner,
  Modal, Tabs, Tab, StatsCard
} from '../../../ui';
import { 
  Plus, Filter, Download, Eye, Edit, Truck, 
  Building2, Package, Calendar, Search, 
  CheckCircle, Clock, AlertTriangle,
  BarChart3, RefreshCw, XCircle
} from 'lucide-react';

const OffloadManagement = () => {
  const [selectedOffload, setSelectedOffload] = useState(null);
  const [showOffloadModal, setShowOffloadModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [varianceFilter, setVarianceFilter] = useState('all');

  // Mock data for offloads
  const offloadsData = useMemo(() => [
    {
      id: 'offload-1',
      purchaseNumber: 'PO-2024-001',
      supplier: { 
        name: 'XYZ Fuel Suppliers Ltd',
        code: 'SUP-001'
      },
      station: { 
        name: 'Main Station Nairobi',
        location: 'Nairobi CBD'
      },
      product: { 
        name: 'Diesel',
        fuelCode: 'AGO',
        density: 0.85
      },
      totalVolume: 10000,
      actualVolume: 9850,
      variance: -150,
      variancePercentage: -1.5,
      status: 'completed',
      receivedBy: { 
        name: 'John Doe',
        role: 'Station Manager'
      },
      verifiedBy: {
        name: 'Jane Supervisor',
        role: 'Quality Supervisor'
      },
      createdAt: '2024-01-25T08:30:00Z',
      completedAt: '2024-01-25T10:15:00Z',
      tankOffloads: [
        {
          tankId: 'tank-1',
          tankName: 'Tank A - Diesel',
          expectedVolume: 6000,
          actualVolume: 5900,
          variance: -100,
          dipBefore: { volume: 2500, dipValue: 1.2 },
          dipAfter: { volume: 8400, dipValue: 3.1 }
        }
      ],
      pumpSalesDuringOffload: 45.5,
      notes: 'Minor variance due to temperature difference'
    },
    // ... other offload data (same as before but truncated for brevity)
  ], []);

  // Filtered data based on active tab and filters
  const filteredOffloads = useMemo(() => {
    let filtered = offloadsData;

    // Apply tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(offload => offload.status === activeTab);
    }

    // Apply other filters
    return filtered.filter(offload => {
      const matchesSearch = 
        offload.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offload.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offload.station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offload.product.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || offload.status === statusFilter;
      const matchesSupplier = supplierFilter === 'all' || offload.supplier.name === supplierFilter;
      const matchesStation = stationFilter === 'all' || offload.station.name === stationFilter;
      const matchesProduct = productFilter === 'all' || offload.product.name === productFilter;

      // Variance filter
      const matchesVariance = 
        varianceFilter === 'all' ||
        (varianceFilter === 'positive' && offload.variance > 0) ||
        (varianceFilter === 'negative' && offload.variance < 0) ||
        (varianceFilter === 'zero' && offload.variance === 0);

      const offloadDate = new Date(offload.createdAt);
      const matchesDateRange = 
        (!dateRange.start || offloadDate >= dateRange.start) &&
        (!dateRange.end || offloadDate <= dateRange.end);

      return matchesSearch && matchesStatus && matchesSupplier && 
             matchesStation && matchesProduct && matchesVariance && matchesDateRange;
    });
  }, [offloadsData, activeTab, searchTerm, statusFilter, supplierFilter, stationFilter, productFilter, varianceFilter, dateRange]);

  // Statistics
  const stats = useMemo(() => {
    const total = offloadsData.length;
    const completed = offloadsData.filter(o => o.status === 'completed').length;
    const pending = offloadsData.filter(o => o.status === 'pending').length;
    const inProgress = offloadsData.filter(o => o.status === 'in-progress').length;
    
    const totalVolume = offloadsData
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.actualVolume, 0);
    
    const totalVariance = offloadsData
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.variance, 0);

    return { total, completed, pending, inProgress, totalVolume, totalVariance };
  }, [offloadsData]);

  // Unique values for filters
  const suppliers = useMemo(() => 
    [...new Set(offloadsData.map(offload => offload.supplier.name))], 
    [offloadsData]
  );

  const stations = useMemo(() => 
    [...new Set(offloadsData.map(offload => offload.station.name))], 
    [offloadsData]
  );

  const products = useMemo(() => 
    [...new Set(offloadsData.map(offload => offload.product.name))], 
    [offloadsData]
  );

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' }
  ];

  const varianceOptions = [
    { value: 'all', label: 'All Variances' },
    { value: 'positive', label: 'Positive' },
    { value: 'negative', label: 'Negative' },
    { value: 'zero', label: 'No Variance' }
  ];

  const getStatusBadge = (status) => {
    const variants = {
      completed: { variant: 'success', label: '✓', icon: CheckCircle },
      pending: { variant: 'warning', label: '⋯', icon: Clock },
      'in-progress': { variant: 'info', label: '⟳', icon: RefreshCw }
    };
    
    const config = variants[status] || { variant: 'outline', label: status, icon: Package };
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} size="sm" className="flex items-center gap-1 w-fit text-xs">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getVarianceDisplay = (variance) => {
    if (variance === 0) {
      return <span className="text-green-600 text-xs font-medium">0L</span>;
    }
    
    if (variance > 0) {
      return <span className="text-green-600 text-xs font-medium">+{variance}L</span>;
    }
    
    return <span className="text-orange-600 text-xs font-medium">{variance}L</span>;
  };

  const handleViewOffload = (offload) => {
    setSelectedOffload(offload);
    setShowOffloadModal(true);
  };

  const handleRefreshData = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const handleExportData = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Export completed! Data downloaded successfully.');
    }, 1500);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSupplierFilter('all');
    setStationFilter('all');
    setProductFilter('all');
    setVarianceFilter('all');
    setDateRange({ start: null, end: null });
    setActiveTab('all');
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Fuel Offload Management</h1>
            </div>
            <p className="text-gray-600 text-sm">
              Track and manage fuel offload operations
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              icon={RefreshCw}
              onClick={handleRefreshData}
              loading={loading}
              size="sm"
            >
              Refresh
            </Button>
            <Button 
              variant="cosmic" 
              icon={Plus}
              size="sm"
            >
              New Offload
            </Button>
          </div>
        </div>

        {/* Compact Statistics Cards */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          <div className="bg-blue-50 p-2 rounded border border-blue-200 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Package className="w-3 h-3 text-blue-600" />
              <span className="font-semibold text-xs">Total</span>
            </div>
            <p className="text-base font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-green-50 p-2 rounded border border-green-200 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span className="font-semibold text-xs">Done</span>
            </div>
            <p className="text-base font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-orange-50 p-2 rounded border border-orange-200 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <RefreshCw className="w-3 h-3 text-orange-600" />
              <span className="font-semibold text-xs">Progress</span>
            </div>
            <p className="text-base font-bold text-orange-600">{stats.inProgress}</p>
          </div>
          <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-yellow-600" />
              <span className="font-semibold text-xs">Pending</span>
            </div>
            <p className="text-base font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-purple-50 p-2 rounded border border-purple-200 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart3 className="w-3 h-3 text-purple-600" />
              <span className="font-semibold text-xs">Volume</span>
            </div>
            <p className="text-base font-bold text-purple-600">{(stats.totalVolume / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-red-50 p-2 rounded border border-red-200 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="w-3 h-3 text-red-600" />
              <span className="font-semibold text-xs">Variance</span>
            </div>
            <p className="text-base font-bold text-red-600">{stats.totalVariance}L</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Card className="mb-4 p-3">
        <Tabs value={activeTab} onChange={setActiveTab} size="sm">
          <Tab value="all" badge={stats.total}>
            All
          </Tab>
          <Tab value="completed" badge={stats.completed}>
            Done
          </Tab>
          <Tab value="in-progress" badge={stats.inProgress}>
            Progress
          </Tab>
          <Tab value="pending" badge={stats.pending}>
            Pending
          </Tab>
        </Tabs>
      </Card>

      {/* Compact Filters Card */}
      <Card className="mb-4">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Filters & Search</h3>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                icon={Download}
                onClick={handleExportData}
                loading={loading}
                size="sm"
              >
                Export
              </Button>
              <Button 
                variant="outline" 
                icon={XCircle}
                onClick={clearAllFilters}
                size="sm"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="p-3">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
            <div className="lg:col-span-2">
              <SearchInput
                placeholder="Search PO, supplier, station..."
                value={searchTerm}
                onChange={setSearchTerm}
                icon={Search}
                size="sm"
              />
            </div>

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              size="sm"
            />

            <Select
              value={supplierFilter}
              onChange={setSupplierFilter}
              options={[
                { value: 'all', label: 'All Suppliers' },
                ...suppliers.map(supplier => ({ value: supplier, label: supplier }))
              ]}
              size="sm"
            />

            <Select
              value={productFilter}
              onChange={setProductFilter}
              options={[
                { value: 'all', label: 'All Products' },
                ...products.map(product => ({ value: product, label: product }))
              ]}
              size="sm"
            />
          </div>

          {/* Secondary Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Select
              value={varianceFilter}
              onChange={setVarianceFilter}
              options={varianceOptions}
              size="sm"
            />

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex gap-2">
                <DatePicker
                  selected={dateRange.start}
                  onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                  placeholderText="Start date"
                  className="flex-1 text-sm"
                  isClearable
                />
                <DatePicker
                  selected={dateRange.end}
                  onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                  placeholderText="End date"
                  className="flex-1 text-sm"
                  isClearable
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-600 text-sm">
          {filteredOffloads.length} of {offloadsData.length} offloads
          {filteredOffloads.length !== offloadsData.length && ' (filtered)'}
        </p>
        {filteredOffloads.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Download className="w-3 h-3" />
            <span>Click Export for filtered results</span>
          </div>
        )}
      </div>

      {/* Compact Offloads Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table size="sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Purchase
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Supplier & Station
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Volume
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Variance
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOffloads.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="font-medium text-gray-900 text-sm mb-1">No offloads found</p>
                      <p className="text-gray-600 text-xs mb-3">
                        {offloadsData.length === 0 
                          ? 'No offloads recorded yet.' 
                          : 'No offloads match your filters.'
                        }
                      </p>
                      {offloadsData.length === 0 ? (
                        <Button variant="cosmic" icon={Plus} size="sm">
                          Record First Offload
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={clearAllFilters} size="sm">
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOffloads.map((offload) => (
                  <tr key={offload.id} className="hover:bg-gray-50 transition-colors group">
                    {/* Purchase Details */}
                    <td className="px-3 py-2">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm group-hover:text-blue-600">
                          {offload.purchaseNumber}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {formatDate(offload.createdAt)}
                        </div>
                      </div>
                    </td>

                    {/* Supplier & Station */}
                    <td className="px-3 py-2">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900 text-sm">{offload.supplier.name}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Building2 className="w-3 h-3" />
                          {offload.station.name}
                        </div>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-3 py-2">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{offload.product.name}</div>
                        <div className="text-xs text-gray-500">
                          {offload.product.fuelCode}
                        </div>
                      </div>
                    </td>

                    {/* Volume Metrics */}
                    <td className="px-3 py-2">
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Exp:</span>
                          <span className="font-medium">{offload.totalVolume.toLocaleString()}L</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Act:</span>
                          <span className="font-medium text-green-600">
                            {offload.actualVolume.toLocaleString()}L
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Variance */}
                    <td className="px-3 py-2">
                      {getVarianceDisplay(offload.variance)}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2">
                      {getStatusBadge(offload.status)}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => handleViewOffload(offload)}
                        />
                        {offload.status !== 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Edit}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Compact Offload Details Modal */}
      {selectedOffload && (
        <Modal
          isOpen={showOffloadModal}
          onClose={() => setShowOffloadModal(false)}
          title={`${selectedOffload.purchaseNumber}`}
          size="lg"
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto text-sm">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <p className="text-gray-900">
                  {selectedOffload.supplier.name}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Station
                </label>
                <p className="text-gray-900">
                  {selectedOffload.station.name}
                </p>
              </div>
            </div>

            {/* Volume & Variance */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Expected
                </label>
                <p className="text-lg font-bold text-blue-600">
                  {selectedOffload.totalVolume.toLocaleString()}L
                </p>
              </div>
              <div className="text-center">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Actual
                </label>
                <p className="text-lg font-bold text-green-600">
                  {selectedOffload.actualVolume.toLocaleString()}L
                </p>
              </div>
              <div className="text-center">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Variance
                </label>
                <div className="text-lg font-bold">
                  {getVarianceDisplay(selectedOffload.variance)}
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedOffload.notes && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <p className="text-gray-700 text-sm">{selectedOffload.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OffloadManagement;