// src/components/purchases/PurchaseManagement.js
import React, { useState, useEffect } from 'react';
import { 
  Plus, Eye, Edit, Trash2, Search, Filter, RefreshCw, 
  CheckCircle, XCircle, Play, Pause, BarChart3, Download,
  Truck, Package, DollarSign, Calendar, Users, AlertCircle,
  FileText, ShoppingCart, Clock, ArrowUpDown, TrendingUp
} from 'lucide-react';
import { Button, Input, Select, Badge, LoadingSpinner } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import CreateEditPurchaseModal from './create/CreateEditPurchaseModal';
// import PurchaseDetailsModal from './PurchaseDetailsModal';
// import PurchaseReceivingModal from './PurchaseReceivingModal';
import { purchaseService } from '../../../../services/purchaseService/purchaseService';
import { supplierService } from '../../../../services/supplierService/supplierService';
import { fuelService } from '../../../../services/fuelService/fuelService';

const PurchaseManagement = () => {
  const { state } = useApp();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    totalSpent: 0
  });

  // Load purchases and suppliers
  const loadPurchases = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (supplierFilter !== 'all') filters.supplierId = supplierFilter;
      if (searchQuery) filters.search = searchQuery;

      const response = await purchaseService.getPurchases(filters);
      setPurchases(response.purchases || response.data || []);
      calculateStats(response.purchases || response.data || []);
    } catch (error) {
      console.error('Failed to load purchases:', error);
      setError(error.message || 'Failed to load purchases');
      setPurchases([]);
      setStats({ total: 0, draft: 0, pending: 0, approved: 0, completed: 0, totalSpent: 0 });
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const suppliersData = await supplierService.getSuppliers({ status: 'ACTIVE' });
      setSuppliers(suppliersData.data || suppliersData || []);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const calculateStats = (purchaseData) => {
    const total = purchaseData.length;
    const draft = purchaseData.filter(p => p.status === 'DRAFT').length;
    const pending = purchaseData.filter(p => p.status === 'PENDING_APPROVAL').length;
    const approved = purchaseData.filter(p => p.status === 'APPROVED').length;
    const completed = purchaseData.filter(p => p.status === 'COMPLETED').length;
    const totalSpent = purchaseData
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    setStats({ total, draft, pending, approved, completed, totalSpent });
  };

  useEffect(() => {
    loadPurchases();
    loadSuppliers();
  }, [retryCount, statusFilter, typeFilter, supplierFilter]);

  const handlePurchaseCreated = () => {
    loadPurchases();
    setIsCreateModalOpen(false);
  };

  const handlePurchaseUpdated = () => {
    loadPurchases();
    setSelectedPurchase(null);
  };

  const handleItemsReceived = () => {
    loadPurchases();
    setIsReceivingModalOpen(false);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { color: 'gray', label: 'Draft', icon: FileText },
      PENDING_APPROVAL: { color: 'yellow', label: 'Pending Approval', icon: Clock },
      APPROVED: { color: 'blue', label: 'Approved', icon: CheckCircle },
      ORDER_CONFIRMED: { color: 'purple', label: 'Order Confirmed', icon: ShoppingCart },
      IN_TRANSIT: { color: 'orange', label: 'In Transit', icon: Truck },
      ARRIVED_AT_SITE: { color: 'teal', label: 'Arrived at Site', icon: Package },
      QUALITY_CHECK: { color: 'yellow', label: 'Quality Check', icon: AlertCircle },
      PARTIALLY_RECEIVED: { color: 'indigo', label: 'Partially Received', icon: ArrowUpDown },
      COMPLETED: { color: 'green', label: 'Completed', icon: CheckCircle },
      CANCELLED: { color: 'red', label: 'Cancelled', icon: XCircle },
      REJECTED: { color: 'red', label: 'Rejected', icon: XCircle },
      ON_HOLD: { color: 'gray', label: 'On Hold', icon: Pause }
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

  // Type badge styling
  const getTypeBadge = (type) => {
    const typeConfig = {
      FUEL: { color: 'blue', label: 'Fuel', icon: Truck },
      NON_FUEL: { color: 'green', label: 'Non-Fuel', icon: Package },
      MIXED: { color: 'purple', label: 'Mixed', icon: ShoppingCart }
    };

    const config = typeConfig[type] || typeConfig.FUEL;
    return <Badge variant={config.color}>{config.label}</Badge>;
  };

  // Delivery status badge
  const getDeliveryBadge = (status) => {
    const statusConfig = {
      PENDING: { color: 'gray', label: 'Pending' },
      DISPATCHED: { color: 'blue', label: 'Dispatched' },
      IN_TRANSIT: { color: 'orange', label: 'In Transit' },
      ARRIVED: { color: 'teal', label: 'Arrived' },
      UNLOADING: { color: 'purple', label: 'Unloading' },
      QUALITY_VERIFICATION: { color: 'yellow', label: 'Quality Check' },
      PARTIALLY_ACCEPTED: { color: 'indigo', label: 'Partially Accepted' },
      FULLY_ACCEPTED: { color: 'green', label: 'Fully Accepted' },
      REJECTED: { color: 'red', label: 'Rejected' },
      RETURNED: { color: 'red', label: 'Returned' }
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return <Badge variant={config.color}>{config.label}</Badge>;
  };

  // Action handlers
  const handleViewDetails = async (purchase) => {
    try {
      const detailedPurchase = await purchaseService.getPurchaseById(purchase.id);
      setSelectedPurchase(detailedPurchase);
      setIsDetailsModalOpen(true);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEditPurchase = (purchase) => {
    if (purchase.status !== 'DRAFT') {
      setError('Only draft purchases can be edited');
      return;
    }
    setSelectedPurchase(purchase);
    setIsCreateModalOpen(true);
  };

  const handleReceiveItems = (purchase) => {
    if (purchase.type !== 'NON_FUEL') {
      setError('Only non-fuel purchases can be received through this interface');
      return;
    }
    setSelectedPurchase(purchase);
    setIsReceivingModalOpen(true);
  };

  const handleUpdateStatus = async (purchaseId, status) => {
    try {
      await purchaseService.updatePurchaseStatus(purchaseId, status);
      loadPurchases();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (!window.confirm('Are you sure you want to delete this purchase? This action cannot be undone.')) return;
    
    try {
      await purchaseService.deletePurchase(purchaseId);
      loadPurchases();
    } catch (error) {
      setError(error.message);
    }
  };

  // Check user permissions
  const canManagePurchases = () => {
    return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_MANAGER', 'PURCHASE_MANAGER'].includes(state.currentUser.role);
  };

  const canApprovePurchases = () => {
    return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_MANAGER'].includes(state.currentUser.role);
  };

  // Filter purchases based on search
  const filteredPurchases = purchases.filter(purchase => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        purchase.purchaseNumber?.toLowerCase().includes(query) ||
        purchase.supplier?.name?.toLowerCase().includes(query) ||
        purchase.reference?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Export functionality
  const handleExportCSV = async () => {
    try {
      const csvData = await purchaseService.exportPurchasesToCSV({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        supplierId: supplierFilter !== 'all' ? supplierFilter : undefined
      });
      
      // Create and download CSV file
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchases-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to export purchases: ' + error.message);
    }
  };

  if (loading && purchases.length === 0) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading purchases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Purchase Management</h3>
          <p className="text-gray-600">
            Manage purchase orders, track deliveries, and monitor supplier performance
          </p>
        </div>
        
        {canManagePurchases() && (
          <div className="flex space-x-3">
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              icon={Plus}
              variant="cosmic"
            >
              New Purchase
            </Button>
            <Button 
              onClick={handleExportCSV} 
              icon={Download} 
              variant="outline" 
              size="sm"
            >
              Export CSV
            </Button>
            <Button icon={BarChart3} variant="outline" size="sm">
              Reports
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.totalSpent.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-6 h-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Draft</p>
              <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <option value="all">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="ORDER_CONFIRMED">Order Confirmed</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>

          {/* Type Filter */}
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="FUEL">Fuel</option>
            <option value="NON_FUEL">Non-Fuel</option>
            <option value="MIXED">Mixed</option>
          </Select>

          {/* Supplier Filter */}
          <Select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          >
            <option value="all">All Suppliers</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button onClick={loadPurchases} icon={RefreshCw} variant="outline" className="flex-1">
              Refresh
            </Button>
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
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Type</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Delivery</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Amount</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Date</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Items</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{purchase.purchaseNumber}</div>
                      <div className="text-sm text-gray-500">{purchase.reference}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{purchase.supplier?.name}</div>
                      <div className="text-sm text-gray-500">{purchase.supplier?.contactPerson}</div>
                    </td>
                    <td className="py-4 px-6">
                      {getTypeBadge(purchase.type)}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(purchase.status)}
                    </td>
                    <td className="py-4 px-6">
                      {getDeliveryBadge(purchase.deliveryStatus)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">
                        ${purchase.totalAmount?.toLocaleString() || '0'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      <div>{new Date(purchase.purchaseDate).toLocaleDateString()}</div>
                      {purchase.expectedDate && (
                        <div className="text-xs">Expected: {new Date(purchase.expectedDate).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">
                        {purchase.items?.length || 0} items
                      </div>
                      <div className="text-xs text-gray-500">
                        {purchase.items?.reduce((sum, item) => sum + (item.orderedQty || 0), 0)} total qty
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          icon={Eye}
                          onClick={() => handleViewDetails(purchase)}
                        >
                          View
                        </Button>
                        
                        {purchase.status === 'DRAFT' && canManagePurchases() && (
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            icon={Edit}
                            onClick={() => handleEditPurchase(purchase)}
                          >
                            Edit
                          </Button>
                        )}
                        
                        {purchase.status === 'PENDING_APPROVAL' && canApprovePurchases() && (
                          <Button 
                            size="sm" 
                            variant="success" 
                            icon={CheckCircle}
                            onClick={() => handleUpdateStatus(purchase.id, 'APPROVED')}
                          >
                            Approve
                          </Button>
                        )}
                        
                        {purchase.status === 'APPROVED' && purchase.type === 'NON_FUEL' && (
                          <Button 
                            size="sm" 
                            variant="primary" 
                            icon={Package}
                            onClick={() => handleReceiveItems(purchase)}
                          >
                            Receive
                          </Button>
                        )}
                        
                        {purchase.status === 'DRAFT' && (
                          <Button 
                            size="sm" 
                            variant="danger" 
                            icon={Trash2}
                            onClick={() => handleDeletePurchase(purchase.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 px-6 text-center text-gray-500">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || supplierFilter !== 'all'
                      ? 'No purchases match your search criteria.' 
                      : 'No purchases found. Create your first purchase order to get started.'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreateEditPurchaseModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
        onPurchaseCreated={handlePurchaseCreated}
        onPurchaseUpdated={handlePurchaseUpdated}
      />

      {/* <PurchaseDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        purchase={selectedPurchase}
      /> */}

      {/* <PurchaseReceivingModal 
        isOpen={isReceivingModalOpen}
        onClose={() => {
          setIsReceivingModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
        onItemsReceived={handleItemsReceived}
      /> */}
    </div>
  );
};

export default PurchaseManagement;