import React, { useState, useEffect } from 'react';
import { 
  Plus, Eye, Edit, Trash2, Search, Filter, RefreshCw, 
  Fuel, Clock, CheckCircle, XCircle, AlertCircle,
  Download, Upload, BarChart3, Truck
} from 'lucide-react';
import { Button, Input, Select, Badge } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import CreateFuelPurchaseModal from './create/CreateFuelPurchaseModal';
import { fuelPurchaseService } from '../../../../services/fuelPurchaseService/fuelPurchaseService';

const FuelPurchaseManagement = () => {
  const { state } = useApp();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Status options for filtering
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'RECEIVED', label: 'Received' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  // Load purchases from backend
  const loadPurchases = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (supplierFilter !== 'all') filters.supplierId = supplierFilter;
      if (dateRange.start) filters.startDate = dateRange.start;
      if (dateRange.end) filters.endDate = dateRange.end;
      if (searchQuery) filters.search = searchQuery;

      const response = await fuelPurchaseService.getFuelPurchases(filters);
      setPurchases(response.data || []);
    } catch (error) {
      console.error('Failed to load fuel purchases:', error);
      setError(error.message || 'Failed to load fuel purchases');
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  // Load purchases on component mount and when filters change
  useEffect(() => {
    loadPurchases();
  }, [retryCount, statusFilter, supplierFilter, dateRange]);

  const handlePurchaseCreated = () => {
    loadPurchases();
    setIsCreateModalOpen(false);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { color: 'gray', label: 'Draft', icon: Clock },
      PENDING_APPROVAL: { color: 'yellow', label: 'Pending Approval', icon: Clock },
      APPROVED: { color: 'green', label: 'Approved', icon: CheckCircle },
      RECEIVED: { color: 'blue', label: 'Received', icon: CheckCircle },
      CANCELLED: { color: 'red', label: 'Cancelled', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.color} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Action handlers
  const handleViewPurchase = (purchaseId) => {
    // Navigate to purchase detail page or open modal
    console.log('View purchase:', purchaseId);
  };

  const handleEditPurchase = (purchase) => {
    // Only allow editing if in draft or pending approval
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(purchase.status)) {
      setError('Cannot edit purchase in current status');
      return;
    }
    // Open edit modal (you can extend CreateFuelPurchaseModal for editing)
    console.log('Edit purchase:', purchase.id);
  };

  const handleApprovePurchase = async (purchaseId) => {
    try {
      await fuelPurchaseService.approveFuelPurchase(purchaseId);
      loadPurchases();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleCancelPurchase = async (purchaseId) => {
    if (!window.confirm('Are you sure you want to cancel this purchase?')) return;
    
    try {
      const reason = prompt('Please enter cancellation reason:');
      if (reason) {
        await fuelPurchaseService.cancelFuelPurchase(purchaseId, reason);
        loadPurchases();
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (!window.confirm('Are you sure you want to delete this purchase? This action cannot be undone.')) return;
    
    try {
      // You'll need to add a delete method to your service
      // await fuelPurchaseService.deleteFuelPurchase(purchaseId);
      loadPurchases();
    } catch (error) {
      setError(error.message);
    }
  };

  // Check if user can create purchases
  const canCreatePurchases = () => {
    return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_MANAGER', 'STATION_MANAGER'].includes(state.currentUser.role);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Filter purchases based on search and filters
  const filteredPurchases = purchases.filter(purchase => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        purchase.purchaseNumber?.toLowerCase().includes(query) ||
        purchase.supplier?.name?.toLowerCase().includes(query) ||
        purchase.supplierRef?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fuel purchases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Fuel Purchases</h3>
          <p className="text-gray-600">
            Manage fuel purchases and deliveries for your stations
          </p>
        </div>
        
        {canCreatePurchases() && (
          <div className="flex space-x-3">
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              icon={Plus}
              variant="cosmic"
            >
              New Fuel Purchase
            </Button>
            <Button icon={Download} variant="outline" size="sm">
              Export
            </Button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
          <Button onClick={handleRetry} size="sm" variant="secondary" className="ml-auto">
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search purchases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {/* Date Range */}
          <div className="flex space-x-2">
            <Input
              type="date"
              placeholder="Start Date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <Input
              type="date"
              placeholder="End Date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button onClick={loadPurchases} icon={RefreshCw} variant="outline" className="flex-1">
              Refresh
            </Button>
            <Button icon={Filter} variant="outline">
              More Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Fuel className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">{purchases.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {purchases.filter(p => p.status === 'APPROVED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {purchases.filter(p => p.status === 'PENDING_APPROVAL').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Purchase #</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Supplier</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Date</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Items</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Total Amount</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Station</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{purchase.purchaseNumber}</div>
                      <div className="text-sm text-gray-500">{purchase.supplierRef}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{purchase.supplier?.name}</div>
                      <div className="text-sm text-gray-500">{purchase.supplier?.code}</div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">
                        {purchase.items?.length || 0} items
                      </div>
                      <div className="text-xs text-gray-500">
                        {purchase.items?.[0]?.product?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-gray-900">
                      {formatCurrency(purchase.totalAmount)}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(purchase.status)}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {purchase.warehouse?.name || 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          icon={Eye}
                          onClick={() => handleViewPurchase(purchase.id)}
                        >
                          View
                        </Button>
                        
                        {['DRAFT', 'PENDING_APPROVAL'].includes(purchase.status) && (
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            icon={Edit}
                            onClick={() => handleEditPurchase(purchase)}
                          >
                            Edit
                          </Button>
                        )}
                        
                        {purchase.status === 'PENDING_APPROVAL' && (
                          <Button 
                            size="sm" 
                            variant="success" 
                            icon={CheckCircle}
                            onClick={() => handleApprovePurchase(purchase.id)}
                          >
                            Approve
                          </Button>
                        )}
                        
                        {['DRAFT', 'PENDING_APPROVAL'].includes(purchase.status) && (
                          <Button 
                            size="sm" 
                            variant="danger" 
                            icon={XCircle}
                            onClick={() => handleCancelPurchase(purchase.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 px-6 text-center text-gray-500">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'No purchases match your search criteria.' 
                      : 'No fuel purchases found. Create your first purchase to get started.'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <CreateFuelPurchaseModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPurchaseCreated={handlePurchaseCreated}
      />
    </div>
  );
};

export default FuelPurchaseManagement;