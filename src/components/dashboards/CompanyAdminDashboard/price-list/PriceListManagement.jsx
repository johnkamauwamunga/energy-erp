// src/components/pricing/PriceListManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Eye, Edit, Trash2, Search, Filter, RefreshCw, 
  CheckCircle, XCircle, Play, Pause, BarChart3, Download,
  DollarSign, Calendar, Users, Tag, AlertCircle, Clock, Archive
} from 'lucide-react';
import { Button, Input, Select, Badge, LoadingSpinner } from '../../ui';
import { useApp } from '../../context/AppContext';
import CreatePriceListModal from './CreatePriceListModal';
import PriceListDetailsModal from './PriceListDetailsModal';
import { pricingService, PRICE_LIST_TYPES, PRICE_LIST_STATUS } from '../../services/pricingService';

const PriceListManagement = () => {
  const { state } = useApp();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [priceLists, setPriceLists] = useState([]);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Load price lists from backend
  const loadPriceLists = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      
      const filters = {
        page,
        limit: pagination.limit
      };
      
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (searchQuery) filters.search = searchQuery;

      const response = await pricingService.getPriceLists(filters);
      setPriceLists(response.priceLists || []);
      setPagination(prev => ({
        ...prev,
        page,
        total: response.pagination?.total || 0,
        pages: response.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('Failed to load price lists:', error);
      setError(error.message || 'Failed to load price lists');
      setPriceLists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPriceLists(1);
  }, [retryCount, statusFilter, typeFilter]);

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      loadPriceLists(1);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePriceListCreated = () => {
    loadPriceLists(1);
    setIsCreateModalOpen(false);
  };

  const handlePriceListUpdated = () => {
    loadPriceLists(pagination.page);
    setSelectedPriceList(null);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { color: 'gray', label: 'Draft', icon: Tag },
      PENDING_APPROVAL: { color: 'yellow', label: 'Pending Approval', icon: Clock },
      APPROVED: { color: 'blue', label: 'Approved', icon: CheckCircle },
      ACTIVE: { color: 'green', label: 'Active', icon: Play },
      EXPIRED: { color: 'red', label: 'Expired', icon: XCircle },
      ARCHIVED: { color: 'gray', label: 'Archived', icon: Archive },
      INACTIVE: { color: 'gray', label: 'Inactive', icon: Pause }
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.color} className="flex items-center gap-1 w-fit">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Type badge styling
  const getTypeBadge = (type) => {
    const typeConfig = {
      RETAIL: { color: 'blue', label: 'Retail' },
      WHOLESALE: { color: 'green', label: 'Wholesale' },
      PROMOTIONAL: { color: 'purple', label: 'Promotional' },
      CONTRACT: { color: 'orange', label: 'Contract' },
      STAFF: { color: 'pink', label: 'Staff' },
      GOVERNMENT: { color: 'red', label: 'Government' },
      OTHER: { color: 'gray', label: 'Other' }
    };

    const config = typeConfig[type] || typeConfig.OTHER;
    return <Badge variant={config.color}>{config.label}</Badge>;
  };

  // Action handlers
  const handleViewDetails = async (priceList) => {
    try {
      const detailedPriceList = await pricingService.getPriceListById(priceList.id);
      setSelectedPriceList(detailedPriceList);
      setIsDetailsModalOpen(true);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEditPriceList = (priceList) => {
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(priceList.status)) {
      setError('Cannot edit price list in current status');
      return;
    }
    setSelectedPriceList(priceList);
    setIsCreateModalOpen(true);
  };

  const handleApprovePriceList = async (priceListId) => {
    try {
      await pricingService.approvePriceList(priceListId);
      loadPriceLists(pagination.page);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleActivatePriceList = async (priceListId, effectiveFrom = null) => {
    try {
      await pricingService.activatePriceList(priceListId, effectiveFrom);
      loadPriceLists(pagination.page);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeactivatePriceList = async (priceListId) => {
    try {
      await pricingService.deactivatePriceList(priceListId);
      loadPriceLists(pagination.page);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeletePriceList = async (priceListId) => {
    if (!window.confirm('Are you sure you want to delete this price list? This action cannot be undone.')) return;
    
    try {
      await pricingService.deletePriceList(priceListId);
      loadPriceLists(pagination.page);
    } catch (error) {
      setError(error.message);
    }
  };

  // Check user permissions
  const canManagePricing = () => {
    return state.currentUser?.permissions?.includes('priceLists.manage') || 
           ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_MANAGER'].includes(state.currentUser?.role);
  };

  const canViewPricing = () => {
    return state.currentUser?.permissions?.includes('priceLists.view') || canManagePricing();
  };

  // Statistics
  const stats = {
    total: pagination.total,
    active: priceLists.filter(p => p.status === 'ACTIVE').length,
    draft: priceLists.filter(p => p.status === 'DRAFT').length,
    pending: priceLists.filter(p => p.status === 'PENDING_APPROVAL').length
  };

  if (loading && priceLists.length === 0) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading price lists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Price List Management</h3>
          <p className="text-gray-600">
            Manage product pricing lists, rules, and calculations
          </p>
        </div>
        
        {canManagePricing() && (
          <div className="flex space-x-3">
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              icon={Plus}
              variant="cosmic"
            >
              New Price List
            </Button>
            <Button icon={BarChart3} variant="outline" size="sm">
              Analytics
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Price Lists</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Play className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Tag className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Draft</p>
              <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search price lists..."
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
            {Object.entries(PRICE_LIST_STATUS).map(([key, value]) => (
              <option key={key} value={value}>{value.replace('_', ' ')}</option>
            ))}
          </Select>

          {/* Type Filter */}
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {Object.entries(PRICE_LIST_TYPES).map(([key, value]) => (
              <option key={key} value={value}>{value}</option>
            ))}
          </Select>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button onClick={() => loadPriceLists(1)} icon={RefreshCw} variant="outline" className="flex-1">
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Price Lists Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Name</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Type</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Effective Dates</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Items</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Created</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {priceLists.length > 0 ? (
                priceLists.map(priceList => (
                  <tr key={priceList.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{priceList.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {priceList.description}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {getTypeBadge(priceList.type)}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(priceList.status)}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      <div>From: {new Date(priceList.effectiveFrom).toLocaleDateString()}</div>
                      <div>To: {priceList.effectiveTo ? new Date(priceList.effectiveTo).toLocaleDateString() : 'No end date'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">
                        {priceList.items?.length || 0} products
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {new Date(priceList.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          icon={Eye}
                          onClick={() => handleViewDetails(priceList)}
                        >
                          View
                        </Button>
                        
                        {['DRAFT', 'PENDING_APPROVAL'].includes(priceList.status) && canManagePricing() && (
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            icon={Edit}
                            onClick={() => handleEditPriceList(priceList)}
                          >
                            Edit
                          </Button>
                        )}
                        
                        {priceList.status === 'PENDING_APPROVAL' && canManagePricing() && (
                          <Button 
                            size="sm" 
                            variant="success" 
                            icon={CheckCircle}
                            onClick={() => handleApprovePriceList(priceList.id)}
                          >
                            Approve
                          </Button>
                        )}
                        
                        {priceList.status === 'APPROVED' && canManagePricing() && (
                          <Button 
                            size="sm" 
                            variant="success" 
                            icon={Play}
                            onClick={() => handleActivatePriceList(priceList.id)}
                          >
                            Activate
                          </Button>
                        )}
                        
                        {priceList.status === 'ACTIVE' && canManagePricing() && (
                          <Button 
                            size="sm" 
                            variant="warning" 
                            icon={Pause}
                            onClick={() => handleDeactivatePriceList(priceList.id)}
                          >
                            Deactivate
                          </Button>
                        )}
                        
                        {['DRAFT', 'INACTIVE'].includes(priceList.status) && canManagePricing() && (
                          <Button 
                            size="sm" 
                            variant="danger" 
                            icon={Trash2}
                            onClick={() => handleDeletePriceList(priceList.id)}
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
                  <td colSpan={7} className="py-8 px-6 text-center text-gray-500">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'No price lists match your search criteria.' 
                      : 'No price lists found. Create your first price list to get started.'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.pages} • {pagination.total} total price lists
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPriceLists(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPriceLists(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreatePriceListModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedPriceList(null);
        }}
        priceList={selectedPriceList}
        onPriceListCreated={handlePriceListCreated}
        onPriceListUpdated={handlePriceListUpdated}
      />

      <PriceListDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        priceList={selectedPriceList}
      />
    </div>
  );
};

export default PriceListManagement;