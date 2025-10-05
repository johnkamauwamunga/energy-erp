import React, { useState, useMemo } from 'react';
import { 
  Card, Table, Button, Input, Badge, Select, 
  DatePicker, SearchInput, LoadingSpinner,
  Modal, Tooltip, Tabs, Tab, StatsCard
} from '../../../ui';
import { 
  Plus, Filter, Download, Eye, Edit, Truck, 
  Building2, User, Package, Calendar, Search, 
  CheckCircle, Clock, AlertTriangle, FileText,
  BarChart3, RefreshCw, XCircle
} from 'lucide-react';

const OffloadManagement = () => {
  const [selectedOffload, setSelectedOffload] = useState(null);
  const [showOffloadModal, setShowOffloadModal] = useState(false);
  const [showOffloadWizard, setShowOffloadWizard] = useState(false);
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
        },
        {
          tankId: 'tank-2',
          tankName: 'Tank B - Diesel',
          expectedVolume: 4000,
          actualVolume: 3950,
          variance: -50,
          dipBefore: { volume: 1800, dipValue: 0.8 },
          dipAfter: { volume: 5750, dipValue: 2.6 }
        }
      ],
      pumpSalesDuringOffload: 45.5,
      notes: 'Minor variance due to temperature difference'
    },
    {
      id: 'offload-2',
      purchaseNumber: 'PO-2024-002',
      supplier: { 
        name: 'ABC Petroleum',
        code: 'SUP-002'
      },
      station: { 
        name: 'Kitengela Station',
        location: 'Kitengela'
      },
      product: { 
        name: 'Super Petrol',
        fuelCode: 'PMS',
        density: 0.74
      },
      totalVolume: 8000,
      actualVolume: 8000,
      variance: 0,
      variancePercentage: 0,
      status: 'completed',
      receivedBy: { 
        name: 'Jane Smith',
        role: 'Shift Supervisor'
      },
      verifiedBy: {
        name: 'Mike Johnson',
        role: 'Quality Controller'
      },
      createdAt: '2024-01-24T14:20:00Z',
      completedAt: '2024-01-24T16:45:00Z',
      tankOffloads: [
        {
          tankId: 'tank-3',
          tankName: 'Tank C - Petrol',
          expectedVolume: 8000,
          actualVolume: 8000,
          variance: 0,
          dipBefore: { volume: 1200, dipValue: 0.5 },
          dipAfter: { volume: 9200, dipValue: 3.8 }
        }
      ],
      pumpSalesDuringOffload: 28.2,
      notes: 'Perfect delivery with no variance'
    },
    {
      id: 'offload-3',
      purchaseNumber: 'PO-2024-003',
      supplier: { 
        name: 'XYZ Fuel Suppliers Ltd',
        code: 'SUP-001'
      },
      station: { 
        name: 'Rongai Station',
        location: 'Rongai'
      },
      product: { 
        name: 'Diesel',
        fuelCode: 'AGO',
        density: 0.85
      },
      totalVolume: 12000,
      actualVolume: 0,
      variance: -12000,
      variancePercentage: -100,
      status: 'pending',
      receivedBy: { 
        name: 'Mike Johnson',
        role: 'Assistant Manager'
      },
      verifiedBy: null,
      createdAt: '2024-01-25T11:00:00Z',
      completedAt: null,
      tankOffloads: [],
      pumpSalesDuringOffload: 0,
      notes: 'Awaiting truck arrival'
    },
    {
      id: 'offload-4',
      purchaseNumber: 'PO-2024-004',
      supplier: { 
        name: 'Global Oil Kenya',
        code: 'SUP-003'
      },
      station: { 
        name: 'Main Station Nairobi',
        location: 'Nairobi CBD'
      },
      product: { 
        name: 'Kerosene',
        fuelCode: 'DPK',
        density: 0.81
      },
      totalVolume: 5000,
      actualVolume: 4950,
      variance: -50,
      variancePercentage: -1.0,
      status: 'completed',
      receivedBy: { 
        name: 'Sarah Wilson',
        role: 'Fuel Attendant'
      },
      verifiedBy: {
        name: 'John Doe',
        role: 'Station Manager'
      },
      createdAt: '2024-01-23T09:15:00Z',
      completedAt: '2024-01-23T11:30:00Z',
      tankOffloads: [
        {
          tankId: 'tank-4',
          tankName: 'Tank D - Kerosene',
          expectedVolume: 5000,
          actualVolume: 4950,
          variance: -50,
          dipBefore: { volume: 800, dipValue: 0.4 },
          dipAfter: { volume: 5750, dipValue: 2.9 }
        }
      ],
      pumpSalesDuringOffload: 12.8,
      notes: 'Small variance within acceptable limits'
    },
    {
      id: 'offload-5',
      purchaseNumber: 'PO-2024-005',
      supplier: { 
        name: 'ABC Petroleum',
        code: 'SUP-002'
      },
      station: { 
        name: 'Kitengela Station',
        location: 'Kitengela'
      },
      product: { 
        name: 'Super Petrol',
        fuelCode: 'PMS',
        density: 0.74
      },
      totalVolume: 7000,
      actualVolume: 7100,
      variance: 100,
      variancePercentage: 1.43,
      status: 'completed',
      receivedBy: { 
        name: 'David Brown',
        role: 'Senior Attendant'
      },
      verifiedBy: {
        name: 'Jane Smith',
        role: 'Shift Supervisor'
      },
      createdAt: '2024-01-22T13:45:00Z',
      completedAt: '2024-01-22T15:20:00Z',
      tankOffloads: [
        {
          tankId: 'tank-3',
          tankName: 'Tank C - Petrol',
          expectedVolume: 7000,
          actualVolume: 7100,
          variance: 100,
          dipBefore: { volume: 1500, dipValue: 0.6 },
          dipAfter: { volume: 8600, dipValue: 3.5 }
        }
      ],
      pumpSalesDuringOffload: 32.1,
      notes: 'Slight over-delivery from supplier'
    },
    {
      id: 'offload-6',
      purchaseNumber: 'PO-2024-006',
      supplier: { 
        name: 'Premium Fuels Ltd',
        code: 'SUP-004'
      },
      station: { 
        name: 'Rongai Station',
        location: 'Rongai'
      },
      product: { 
        name: 'Diesel',
        fuelCode: 'AGO',
        density: 0.85
      },
      totalVolume: 15000,
      actualVolume: 14800,
      variance: -200,
      variancePercentage: -1.33,
      status: 'in-progress',
      receivedBy: { 
        name: 'Alice Cooper',
        role: 'Fuel Attendant'
      },
      verifiedBy: null,
      createdAt: '2024-01-25T16:30:00Z',
      completedAt: null,
      tankOffloads: [
        {
          tankId: 'tank-1',
          tankName: 'Tank A - Diesel',
          expectedVolume: 10000,
          actualVolume: 9800,
          variance: -200,
          dipBefore: { volume: 2000, dipValue: 1.0 },
          dipAfter: { volume: 11800, dipValue: 5.9 }
        }
      ],
      pumpSalesDuringOffload: 67.3,
      notes: 'Currently offloading remaining 5000L'
    }
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
        offload.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offload.receivedBy.name.toLowerCase().includes(searchTerm.toLowerCase());

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
    { value: 'positive', label: 'Positive Variance' },
    { value: 'negative', label: 'Negative Variance' },
    { value: 'zero', label: 'No Variance' }
  ];

  const getStatusBadge = (status) => {
    const variants = {
      completed: { variant: 'success', label: 'Completed', icon: CheckCircle },
      pending: { variant: 'warning', label: 'Pending', icon: Clock },
      'in-progress': { variant: 'info', label: 'In Progress', icon: RefreshCw }
    };
    
    const config = variants[status] || { variant: 'outline', label: status, icon: FileText };
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getVarianceDisplay = (variance, percentage) => {
    if (variance === 0) {
      return (
        <div className="flex items-center gap-1">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-green-600 font-medium">0L (0%)</span>
        </div>
      );
    }
    
    if (variance > 0) {
      return (
        <div className="flex items-center gap-1">
          <BarChart3 className="w-4 h-4 text-green-500" />
          <span className="text-green-600 font-medium">
            +{variance}L (+{percentage.toFixed(2)}%)
          </span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <span className="text-orange-600 font-medium">
          {variance}L ({percentage.toFixed(2)}%)
        </span>
      </div>
    );
  };

  const handleViewOffload = (offload) => {
    setSelectedOffload(offload);
    setShowOffloadModal(true);
  };

  const handleCreateOffload = () => {
    setShowOffloadWizard(true);
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
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Truck className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Fuel Offload Management</h1>
            </div>
            <p className="text-gray-600">
              Track and manage all fuel offload operations, variances, and supplier performance
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              icon={RefreshCw}
              onClick={handleRefreshData}
              loading={loading}
            >
              Refresh
            </Button>
            <Button 
              variant="cosmic" 
              icon={Plus}
              onClick={handleCreateOffload}
            >
              New Offload
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <StatsCard
            title="Total Offloads"
            value={stats.total}
            icon={Package}
            color="blue"
            trend={12.5}
          />
          <StatsCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle}
            color="green"
          />
          <StatsCard
            title="In Progress"
            value={stats.inProgress}
            icon={RefreshCw}
            color="orange"
          />
          <StatsCard
            title="Pending"
            value={stats.pending}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="Total Volume"
            value={`${(stats.totalVolume / 1000).toFixed(0)}K L`}
            icon={BarChart3}
            color="purple"
          />
          <StatsCard
            title="Net Variance"
            value={`${stats.totalVariance}L`}
            icon={AlertTriangle}
            color={stats.totalVariance >= 0 ? "green" : "red"}
          />
        </div>
      </div>

      {/* Tabs */}
      <Card className="mb-6">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tab value="all" badge={stats.total}>
            All Offloads
          </Tab>
          <Tab value="completed" badge={stats.completed}>
            Completed
          </Tab>
          <Tab value="in-progress" badge={stats.inProgress}>
            In Progress
          </Tab>
          <Tab value="pending" badge={stats.pending}>
            Pending
          </Tab>
        </Tabs>
      </Card>

      {/* Filters Card */}
      <Card className="mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                icon={Download}
                onClick={handleExportData}
                loading={loading}
              >
                Export
              </Button>
              <Button 
                variant="outline" 
                icon={XCircle}
                onClick={clearAllFilters}
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            <div className="lg:col-span-2">
              <SearchInput
                placeholder="Search PO, supplier, station, product..."
                value={searchTerm}
                onChange={setSearchTerm}
                icon={Search}
              />
            </div>

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />

            <Select
              value={supplierFilter}
              onChange={setSupplierFilter}
              options={[
                { value: 'all', label: 'All Suppliers' },
                ...suppliers.map(supplier => ({ value: supplier, label: supplier }))
              ]}
            />

            <Select
              value={stationFilter}
              onChange={setStationFilter}
              options={[
                { value: 'all', label: 'All Stations' },
                ...stations.map(station => ({ value: station, label: station }))
              ]}
            />

            <Select
              value={productFilter}
              onChange={setProductFilter}
              options={[
                { value: 'all', label: 'All Products' },
                ...products.map(product => ({ value: product, label: product }))
              ]}
            />
          </div>

          {/* Secondary Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              value={varianceFilter}
              onChange={setVarianceFilter}
              options={varianceOptions}
            />

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="flex gap-2">
                <DatePicker
                  selected={dateRange.start}
                  onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                  placeholderText="Start date"
                  className="flex-1"
                  isClearable
                />
                <DatePicker
                  selected={dateRange.end}
                  onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                  placeholderText="End date"
                  className="flex-1"
                  isClearable
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-600">
          Showing {filteredOffloads.length} of {offloadsData.length} offloads
          {filteredOffloads.length !== offloadsData.length && ' (filtered)'}
        </p>
        {filteredOffloads.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Download className="w-4 h-4" />
            <span>Click Export to download filtered results</span>
          </div>
        )}
      </div>

      {/* Offloads Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier & Station
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Volume Metrics
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Personnel
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timeline
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOffloads.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-16 h-16 text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No offloads found</p>
                      <p className="text-gray-600 mb-4">
                        {offloadsData.length === 0 
                          ? 'No offloads have been recorded yet.' 
                          : 'No offloads match your current filters.'
                        }
                      </p>
                      {offloadsData.length === 0 ? (
                        <Button variant="cosmic" icon={Plus} onClick={handleCreateOffload}>
                          Record First Offload
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={clearAllFilters}>
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOffloads.map((offload) => (
                  <tr key={offload.id} className="hover:bg-gray-50 transition-colors group">
                    {/* Purchase Details */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600">
                          {offload.purchaseNumber}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {offload.id}
                        </div>
                        {offload.notes && (
                          <Tooltip content={offload.notes}>
                            <div className="text-xs text-gray-400 truncate max-w-[200px] mt-1">
                              📝 {offload.notes}
                            </div>
                          </Tooltip>
                        )}
                      </div>
                    </td>

                    {/* Supplier & Station */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div>
                          <div className="font-medium text-gray-900">{offload.supplier.name}</div>
                          <div className="text-xs text-gray-500">{offload.supplier.code}</div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="w-4 h-4" />
                          {offload.station.name}
                        </div>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{offload.product.name}</div>
                        <div className="text-xs text-gray-500">
                          {offload.product.fuelCode} • ρ: {offload.product.density}
                        </div>
                      </div>
                    </td>

                    {/* Volume Metrics */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Expected:</span>
                          <span className="font-medium">{offload.totalVolume.toLocaleString()}L</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Actual:</span>
                          <span className="font-medium text-green-600">
                            {offload.actualVolume.toLocaleString()}L
                          </span>
                        </div>
                        {offload.pumpSalesDuringOffload > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Sales during:</span>
                            <span className="text-blue-600">{offload.pumpSalesDuringOffload}L</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Variance */}
                    <td className="px-6 py-4">
                      {getVarianceDisplay(offload.variance, offload.variancePercentage)}
                    </td>

                    {/* Personnel */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {offload.receivedBy.name}
                          </div>
                          <div className="text-xs text-gray-500">{offload.receivedBy.role}</div>
                        </div>
                        {offload.verifiedBy && (
                          <div>
                            <div className="text-sm text-gray-600">
                              {offload.verifiedBy.name}
                            </div>
                            <div className="text-xs text-gray-500">{offload.verifiedBy.role}</div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Timeline */}
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        <div>
                          <div className="text-gray-600">Created:</div>
                          <div className="text-gray-900">{formatDate(offload.createdAt)}</div>
                        </div>
                        {offload.completedAt && (
                          <div>
                            <div className="text-gray-600">Completed:</div>
                            <div className="text-gray-900">{formatDate(offload.completedAt)}</div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {getStatusBadge(offload.status)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tooltip content="View Full Details">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Eye}
                            onClick={() => handleViewOffload(offload)}
                          />
                        </Tooltip>
                        {offload.status !== 'completed' && (
                          <Tooltip content="Edit Offload">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Edit}
                            />
                          </Tooltip>
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

      {/* Offload Details Modal */}
      {selectedOffload && (
        <Modal
          isOpen={showOffloadModal}
          onClose={() => setShowOffloadModal(false)}
          title={`Offload Details - ${selectedOffload.purchaseNumber}`}
          size="xl"
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Basic Information */}
            <Card>
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900">Basic Information</h4>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Number
                    </label>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedOffload.purchaseNumber}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    {getStatusBadge(selectedOffload.status)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier
                    </label>
                    <p className="text-gray-900">
                      {selectedOffload.supplier.name} ({selectedOffload.supplier.code})
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Station
                    </label>
                    <p className="text-gray-900">
                      {selectedOffload.station.name} - {selectedOffload.station.location}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Volume & Variance */}
            <Card>
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900">Volume & Variance</h4>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Volume
                    </label>
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedOffload.totalVolume.toLocaleString()}L
                    </p>
                  </div>
                  <div className="text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Actual Volume
                    </label>
                    <p className="text-2xl font-bold text-green-600">
                      {selectedOffload.actualVolume.toLocaleString()}L
                    </p>
                  </div>
                  <div className="text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Variance
                    </label>
                    <div className="text-2xl font-bold">
                      {getVarianceDisplay(selectedOffload.variance, selectedOffload.variancePercentage)}
                    </div>
                  </div>
                </div>
                {selectedOffload.pumpSalesDuringOffload > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Sales during offload:</strong> {selectedOffload.pumpSalesDuringOffload}L
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Tank Details */}
            {selectedOffload.tankOffloads.length > 0 && (
              <Card>
                <div className="p-4 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900">Tank Offload Details</h4>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    {selectedOffload.tankOffloads.map((tank, index) => (
                      <div key={tank.tankId} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-gray-900">{tank.tankName}</h5>
                          <Badge variant={tank.variance === 0 ? "success" : "warning"}>
                            Variance: {tank.variance}L
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Expected:</span>
                            <p className="font-semibold">{tank.expectedVolume}L</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Actual:</span>
                            <p className="font-semibold text-green-600">{tank.actualVolume}L</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Dip Volume:</span>
                            <p className="font-semibold">
                              {tank.dipAfter.volume - tank.dipBefore.volume}L
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Notes */}
            {selectedOffload.notes && (
              <Card>
                <div className="p-4 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900">Notes</h4>
                </div>
                <div className="p-4">
                  <p className="text-gray-700">{selectedOffload.notes}</p>
                </div>
              </Card>
            )}
          </div>
        </Modal>
      )}

      {/* Offload Wizard Modal */}
      <Modal
        isOpen={showOffloadWizard}
        onClose={() => setShowOffloadWizard(false)}
        title="Create New Fuel Offload"
        size="xl"
      >
        <div className="text-center py-8">
          <Truck className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Start New Offload Process
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            This will open the fuel offload wizard to record a new fuel delivery with tank readings, pump meters, and variance tracking.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setShowOffloadWizard(false)}>
              Cancel
            </Button>
            <Button variant="cosmic" icon={Plus}>
              Start New Offload
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OffloadManagement;