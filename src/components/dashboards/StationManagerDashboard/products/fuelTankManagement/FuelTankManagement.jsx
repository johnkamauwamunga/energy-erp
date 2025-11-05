// components/tank/TankManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Fuel, 
  Plus, 
  Eye, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertCircle,
  Droplets,
  Gauge,
  Truck,
  Edit,
  Check,
  X
} from 'lucide-react';
import { Button, Input, Select, Card, Badge, Modal } from '../../../../ui';
import { useApp } from '../../../../../context/AppContext';
import { tankService } from '../../../../../services/tankService/tankService';
import { fuelService } from '../../../../../services/fuelService/fuelService';

const FuelTankManagement = () => {
  const { state } = useApp();
  const [tanks, setTanks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTank, setSelectedTank] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // Load tanks
  const loadTanks = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters = {};
      if (state.currentUser.role === 'STATION_MANAGER' && state.currentStation?.id) {
        filters.stationId = state.currentStation.id;
      }
      
      const response = await tankService.getAllTanks(filters);
      const tanksData = response.data || response || [];
      setTanks(tanksData);
    } catch (error) {
      console.error('Failed to load tanks:', error);
      setError(error.message || 'Failed to load tanks');
      setTanks([]);
    } finally {
      setLoading(false);
    }
  };

  // Load fuel products
  const loadProducts = async () => {
    try {
      const response = await fuelService.getFuelProducts();
      console.log("Raw products response:", response);
      
      // Handle different response structures
      let productsData = response;
      if (!Array.isArray(productsData) && productsData.data) {
        productsData = productsData.data;
      }
      
      if (Array.isArray(productsData)) {
        console.log("Loaded products:", productsData.length);
        setProducts(productsData);
      } else {
        console.error("Products data is not an array:", productsData);
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    }
  };

  useEffect(() => {
    loadTanks();
    loadProducts();
  }, [state.currentStation]);

  // Filter tanks based on search and filters
  const filteredTanks = useMemo(() => {
    return tanks.filter(tank => {
      // Search filter
      const matchesSearch = !searchQuery || 
        tank?.asset?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tank?.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tank?.product?.fuelCode?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'assigned' && tank.productId) ||
        (statusFilter === 'unassigned' && !tank.productId);
      
      return matchesSearch && matchesStatus;
    });
  }, [tanks, searchQuery, statusFilter]);

  const handleViewTank = (tank) => {
    setSelectedTank(tank);
    setIsDetailModalOpen(true);
  };

  const handleUpdateProduct = async (tank) => {
    setSelectedTank(tank);
    setSelectedProductId(tank.productId || '');
    setUpdateError('');
    
    // Ensure products are loaded
    if (products.length === 0) {
      await loadProducts();
    }
    
    setIsUpdateModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!selectedTank) return;

    try {
      setUpdating(true);
      setUpdateError('');

      await tankService.updateTankProduct(selectedTank.id, {
        productId: selectedProductId || null
      });

      // Refresh tanks list
      await loadTanks();
      
      // Close modal
      setIsUpdateModalOpen(false);
      setSelectedTank(null);
      setSelectedProductId('');
      
    } catch (error) {
      console.error('Failed to update tank product:', error);
      setUpdateError(error.message || 'Failed to update tank product');
    } finally {
      setUpdating(false);
    }
  };

  const handleUnassignProduct = async () => {
    if (!selectedTank) return;

    try {
      setUpdating(true);
      setUpdateError('');

      await tankService.unassignProductFromTank(selectedTank.id);

      // Refresh tanks list
      await loadTanks();
      
      // Close modal
      setIsUpdateModalOpen(false);
      setSelectedTank(null);
      setSelectedProductId('');
      
    } catch (error) {
      console.error('Failed to unassign product:', error);
      setUpdateError(error.message || 'Failed to unassign product');
    } finally {
      setUpdating(false);
    }
  };

  const getUtilizationColor = (percentage) => {
    if (percentage < 50) return 'green';
    if (percentage < 80) return 'yellow';
    return 'red';
  };

  const getStatusBadge = (tank) => {
    if (tank.productId) {
      return <Badge color="green">Assigned</Badge>;
    } else {
      return <Badge color="yellow">Unassigned</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tanks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tank Management</h1>
          <p className="text-gray-600">
            Manage fuel tanks and assign products
          </p>
        </div>
        
        <Button 
          onClick={loadTanks}
          icon={RefreshCw}
          variant="outline"
        >
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
          <Button onClick={loadTanks} size="sm" variant="secondary" className="ml-auto">
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search tanks or products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tanks</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Tanks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTanks.length > 0 ? (
          filteredTanks.map((tank) => {
            const utilization = tank.capacity ? 
              ((tank.currentVolume || 0) / tank.capacity * 100) : 0;

            return (
              <Card key={tank.id} className="p-6 hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Fuel className="w-5 h-5 text-blue-500" />
                      {tank.asset?.name || 'Unnamed Tank'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {tank.asset?.station?.name || 'No Station'}
                    </p>
                  </div>
                  {getStatusBadge(tank)}
                </div>

                {/* Product Info */}
                {tank.product ? (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-900">
                        {tank.product.name}
                      </span>
                      <Badge color="blue">{tank.product.fuelCode}</Badge>
                    </div>
                    {tank.product.fuelSubType && (
                      <p className="text-sm text-blue-700 mt-1">
                        {tank.product.fuelSubType.category?.name} • {tank.product.fuelSubType.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg text-center">
                    <p className="text-yellow-700 text-sm">
                      No product assigned
                    </p>
                  </div>
                )}

                {/* Capacity & Volume */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Droplets className="w-4 h-4" />
                      Current Volume
                    </span>
                    <span className="font-medium">
                      {tank.currentVolume?.toLocaleString() || 0} L
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Capacity</span>
                    <span className="font-medium">
                      {tank.capacity?.toLocaleString() || 0} L
                    </span>
                  </div>

                  {/* Utilization Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Utilization</span>
                      <span className={`font-medium text-${getUtilizationColor(utilization)}-600`}>
                        {utilization.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`bg-${getUtilizationColor(utilization)}-500 h-2 rounded-full transition-all`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleViewTank(tank)}
                    icon={Eye}
                    variant="secondary"
                    className="flex-1"
                  >
                    Details
                  </Button>
                  <Button
                    onClick={() => handleUpdateProduct(tank)}
                    icon={Edit}
                    variant="primary"
                  >
                    {tank.productId ? 'Change' : 'Assign'}
                  </Button>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Fuel className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tanks found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'No tanks match your search criteria' 
                : 'No tanks available in this station'
              }
            </p>
          </div>
        )}
      </div>

      {/* Tank Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Tank Details"
        size="lg"
      >
        {selectedTank && (
          <div className="space-y-6">
            {/* Tank Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Tank Name</label>
                <p className="text-lg font-semibold">{selectedTank.asset?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Station</label>
                <p className="text-lg">{selectedTank.asset?.station?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">{getStatusBadge(selectedTank)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Capacity</label>
                <p className="text-lg">{selectedTank.capacity?.toLocaleString()} L</p>
              </div>
            </div>

            {/* Current Product */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Current Product</h4>
              {selectedTank.product ? (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-blue-900">{selectedTank.product.name}</p>
                      <p className="text-blue-700">Code: {selectedTank.product.fuelCode}</p>
                      {selectedTank.product.fuelSubType && (
                        <p className="text-blue-600 text-sm">
                          {selectedTank.product.fuelSubType.category?.name} • {selectedTank.product.fuelSubType.name}
                        </p>
                      )}
                    </div>
                    <Badge color="blue">Assigned</Badge>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-yellow-700">No product assigned to this tank</p>
                </div>
              )}
            </div>

            {/* Volume Information */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Volume Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Current Volume</label>
                  <p className="text-xl font-semibold">
                    {selectedTank.currentVolume?.toLocaleString() || 0} L
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Available Capacity</label>
                  <p className="text-xl font-semibold text-green-600">
                    {((selectedTank.capacity || 0) - (selectedTank.currentVolume || 0)).toLocaleString()} L
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-4 flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleUpdateProduct(selectedTank);
                }}
                icon={Edit}
                variant="primary"
              >
                {selectedTank.productId ? 'Change Product' : 'Assign Product'}
              </Button>
              <Button
                onClick={() => setIsDetailModalOpen(false)}
                variant="secondary"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Update Product Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title={selectedTank?.productId ? "Update Tank Product" : "Assign Product to Tank"}
        size="md"
      >
        {selectedTank && (
          <div className="space-y-6">
            {/* Tank Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900">{selectedTank.asset?.name}</h4>
              <p className="text-sm text-gray-600">
                Station: {selectedTank.asset?.station?.name}
              </p>
              <p className="text-sm text-gray-600">
                Capacity: {selectedTank.capacity?.toLocaleString()} L
              </p>
              {selectedTank.product && (
                <p className="text-sm text-blue-600 mt-1">
                  Current: {selectedTank.product.name} ({selectedTank.product.fuelCode})
                </p>
              )}
            </div>

            {/* Product Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Product
              </label>
              
              {products.length === 0 ? (
                <div className="text-center py-4 border border-gray-300 rounded-md">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading products...</p>
                </div>
              ) : (
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select a product --</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.fuelCode ? `(${product.fuelCode})` : ''}
                    </option>
                  ))}
                </select>
              )}
              
              <p className="text-sm text-gray-500 mt-1">
                {products.length} product(s) available
              </p>
            </div>

            {/* Error Display */}
            {updateError && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {updateError}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <div>
                {selectedTank.productId && (
                  <Button
                    onClick={handleUnassignProduct}
                    icon={X}
                    variant="danger"
                    disabled={updating}
                  >
                    Remove Product
                  </Button>
                )}
              </div>
              
              <div className="flex space-x-3">
                <Button
                  onClick={() => setIsUpdateModalOpen(false)}
                  variant="secondary"
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProduct}
                  icon={Check}
                  variant="primary"
                  disabled={updating || selectedProductId === selectedTank.productId}
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FuelTankManagement;