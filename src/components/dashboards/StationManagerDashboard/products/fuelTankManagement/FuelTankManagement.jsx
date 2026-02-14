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
  X,
  Download
} from 'lucide-react';
import { Button, Input, Select, Card, Badge, Modal } from '../../../../ui';
import { useApp } from '../../../../../context/AppContext';
import { tankService } from '../../../../../services/tankService/tankService';
import { fuelService } from '../../../../../services/fuelService/fuelService';
import AdvancedReportGenerator from '../../../common/downloadable/AdvancedReportGenerator';

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
  
  // Report generation state
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [reportData, setReportData] = useState([]);

  // Load tanks
  const loadTanks = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters = {};
      if (state.currentUser?.role === 'STATION_MANAGER' && state.currentStation?.id) {
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
      
      // Handle different response structures
      let productsData = response;
      if (!Array.isArray(productsData) && productsData.data) {
        productsData = productsData.data;
      }
      
      if (Array.isArray(productsData)) {
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

  // ========== REPORT GENERATION FUNCTIONS ==========

  // Prepare data for report
  const prepareReportData = () => {
    return filteredTanks.map((tank, index) => {
      const utilization = tank.capacity ? 
        ((tank.currentVolume || 0) / tank.capacity * 100) : 0;
      const available = (tank.capacity || 0) - (tank.currentVolume || 0);
      
      return {
        '#': index + 1,
        'Tank Name': tank.asset?.name || 'Unknown',
        'Product': tank.product?.name || 'Not Assigned',
        'Product Code': tank.product?.fuelCode || 'N/A',
        'Capacity (L)': tank.capacity || 0,
        'Current Volume (L)': tank.currentVolume || 0,
        'Available (L)': available,
        'Utilization %': utilization.toFixed(1),
        'Status': tank.productId ? 'Assigned' : 'Unassigned',
        'Station': tank.asset?.station?.name || 'N/A'
      };
    });
  };

  // Get columns for report
  const getReportColumns = () => {
    return [
      { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
      { title: 'Tank Name', dataIndex: 'Tank Name', key: 'tankName', width: 150, type: 'text' },
      { title: 'Product', dataIndex: 'Product', key: 'product', width: 150, type: 'text' },
      { title: 'Capacity (L)', dataIndex: 'Capacity (L)', key: 'capacity', width: 100, type: 'number' },
      { title: 'Current Volume (L)', dataIndex: 'Current Volume (L)', key: 'currentVolume', width: 120, type: 'number' },
      { title: 'Available (L)', dataIndex: 'Available (L)', key: 'available', width: 100, type: 'number' },
      { title: 'Utilization %', dataIndex: 'Utilization %', key: 'utilization', width: 90, type: 'percentage' },
      { title: 'Status', dataIndex: 'Status', key: 'status', width: 80, type: 'text' },
      { title: 'Station', dataIndex: 'Station', key: 'station', width: 120, type: 'text' }
    ];
  };

  // Calculate summary data for report
  const calculateSummaryData = () => {
    const totalCapacity = filteredTanks.reduce((sum, tank) => sum + (tank.capacity || 0), 0);
    const totalVolume = filteredTanks.reduce((sum, tank) => sum + (tank.currentVolume || 0), 0);
    const assignedTanks = filteredTanks.filter(t => t.productId).length;
    
    return {
      'Report Type': 'Tank Inventory Report',
      'Total Tanks': filteredTanks.length,
      'Assigned Tanks': assignedTanks,
      'Unassigned Tanks': filteredTanks.length - assignedTanks,
      'Total Capacity': `${totalCapacity.toLocaleString()} L`,
      'Total Volume': `${totalVolume.toLocaleString()} L`,
      'Overall Utilization': `${((totalVolume / totalCapacity) * 100 || 0).toFixed(1)}%`,
      'Generated Date': new Date().toLocaleDateString('en-KE'),
      'Generated Time': new Date().toLocaleTimeString('en-KE'),
      'Generated By': state.currentUser ? `${state.currentUser.firstName || ''} ${state.currentUser.lastName || ''}`.trim() : 'System'
    };
  };

  // Handle export
  const handleExport = () => {
    setReportData(prepareReportData());
    setShowReportGenerator(true);
  };

  const handleReportComplete = (format) => {
    console.log(`✅ Report generated as ${format}`);
    setShowReportGenerator(false);
  };

  const handleViewTank = (tank) => {
    setSelectedTank(tank);
    setIsDetailModalOpen(true);
  };

  const handleUpdateProduct = (tank) => {
    setSelectedTank(tank);
    setSelectedProductId(tank.productId || '');
    setUpdateError('');
    
    // Ensure products are loaded
    if (products.length === 0) {
      loadProducts();
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
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUtilizationBgColor = (percentage) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
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
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tank Management</h1>
          <p className="text-sm text-gray-600">
            Manage fuel tanks and assign products
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={loadTanks}
            icon={RefreshCw}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
          <Button 
            onClick={handleExport}
            icon={Download}
            variant="primary"
            size="sm"
            disabled={filteredTanks.length === 0}
          >
            Export Report
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg flex items-center text-sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
          <Button onClick={loadTanks} size="xs" variant="secondary" className="ml-auto">
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Filters - Compact */}
      <Card className="p-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search tanks or products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 py-1 text-sm"
                size="sm"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-36 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tanks</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
            
            <div className="text-sm text-gray-500 flex items-center">
              {filteredTanks.length} tank(s)
            </div>
          </div>
        </div>
      </Card>

      {/* Tanks Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tank Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTanks.length > 0 ? (
                filteredTanks.map((tank, index) => {
                  const utilization = tank.capacity ? 
                    ((tank.currentVolume || 0) / tank.capacity * 100) : 0;
                  const available = (tank.capacity || 0) - (tank.currentVolume || 0);
                  const utilizationColor = getUtilizationColor(utilization);
                  const utilizationBgColor = getUtilizationBgColor(utilization);
                  
                  return (
                    <tr key={tank.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs text-gray-500">{index + 1}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center">
                          <Fuel className="w-4 h-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium">{tank.asset?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {tank.product ? (
                          <div>
                            <div className="text-sm">{tank.product.name}</div>
                            <div className="text-xs text-gray-500">{tank.product.fuelCode}</div>
                          </div>
                        ) : (
                          <Badge color="yellow" size="sm">Unassigned</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        {tank.capacity?.toLocaleString() || 0} L
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        {tank.currentVolume?.toLocaleString() || 0} L
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`text-sm font-medium ${available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {available.toLocaleString()} L
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-medium ${utilizationColor}`}>
                            {utilization.toFixed(1)}%
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                            <div 
                              className={`${utilizationBgColor} h-1 rounded-full`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {tank.asset?.station?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex space-x-1 justify-center">
                          <button
                            onClick={() => handleViewTank(tank)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleUpdateProduct(tank)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title={tank.productId ? "Change Product" : "Assign Product"}
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <Fuel className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 mb-1">No tanks found</p>
                      <p className="text-xs text-gray-400">
                        {searchQuery || statusFilter !== 'all' 
                          ? 'Try adjusting your search or filters' 
                          : 'No tanks available in this station'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary Cards - Compact */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-gray-500">Total Tanks</div>
          <div className="text-xl font-bold">{filteredTanks.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-gray-500">Assigned</div>
          <div className="text-xl font-bold text-green-600">
            {filteredTanks.filter(t => t.productId).length}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-gray-500">Total Capacity</div>
          <div className="text-xl font-bold">
            {filteredTanks.reduce((sum, t) => sum + (t.capacity || 0), 0).toLocaleString()} L
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-gray-500">Total Volume</div>
          <div className="text-xl font-bold">
            {filteredTanks.reduce((sum, t) => sum + (t.currentVolume || 0), 0).toLocaleString()} L
          </div>
        </Card>
      </div>

      {/* Tank Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Tank Details"
        size="md"
      >
        {selectedTank && (
          <div className="space-y-4">
            {/* Tank Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Tank Name</label>
                <p className="text-base font-semibold">{selectedTank.asset?.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Station</label>
                <p className="text-base">{selectedTank.asset?.station?.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Status</label>
                <div className="mt-1">{getStatusBadge(selectedTank)}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Capacity</label>
                <p className="text-base">{selectedTank.capacity?.toLocaleString()} L</p>
              </div>
            </div>

            {/* Current Product */}
            <div>
              <h4 className="text-sm font-medium mb-2">Current Product</h4>
              {selectedTank.product ? (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-blue-900">{selectedTank.product.name}</p>
                      <p className="text-xs text-blue-700">Code: {selectedTank.product.fuelCode}</p>
                    </div>
                    <Badge color="blue" size="sm">Assigned</Badge>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <p className="text-yellow-700 text-sm">No product assigned</p>
                </div>
              )}
            </div>

            {/* Volume Information */}
            <div>
              <h4 className="text-sm font-medium mb-2">Volume Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Current Volume</div>
                  <div className="text-lg font-semibold">
                    {selectedTank.currentVolume?.toLocaleString() || 0} L
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Available</div>
                  <div className="text-lg font-semibold text-green-600">
                    {((selectedTank.capacity || 0) - (selectedTank.currentVolume || 0)).toLocaleString()} L
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleUpdateProduct(selectedTank);
                }}
                icon={Edit}
                variant="primary"
                size="sm"
              >
                {selectedTank.productId ? 'Change Product' : 'Assign Product'}
              </Button>
              <Button
                onClick={() => setIsDetailModalOpen(false)}
                variant="secondary"
                size="sm"
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
        size="sm"
      >
        {selectedTank && (
          <div className="space-y-4">
            {/* Tank Info */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-sm">{selectedTank.asset?.name}</h4>
              <p className="text-xs text-gray-600">
                Station: {selectedTank.asset?.station?.name}
              </p>
              <p className="text-xs text-gray-600">
                Capacity: {selectedTank.capacity?.toLocaleString()} L
              </p>
              {selectedTank.product && (
                <p className="text-xs text-blue-600 mt-1">
                  Current: {selectedTank.product.name}
                </p>
              )}
            </div>

            {/* Product Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Select Product
              </label>
              
              {products.length === 0 ? (
                <div className="text-center py-3 border border-gray-300 rounded">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-xs text-gray-500 mt-1">Loading products...</p>
                </div>
              ) : (
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a product --</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.fuelCode ? `(${product.fuelCode})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Error Display */}
            {updateError && (
              <div className="p-2 bg-red-100 text-red-700 rounded-lg flex items-center text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
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
                    size="sm"
                    disabled={updating}
                  >
                    Remove
                  </Button>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => setIsUpdateModalOpen(false)}
                  variant="secondary"
                  size="sm"
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProduct}
                  icon={Check}
                  variant="primary"
                  size="sm"
                  disabled={updating || selectedProductId === selectedTank.productId}
                >
                  {updating ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Report Generator Modal */}
      {showReportGenerator && (
        <Modal
          isOpen={showReportGenerator}
          onClose={() => setShowReportGenerator(false)}
          title="Generate Tank Report"
          size="lg"
        >
          <div className="p-4">
            <AdvancedReportGenerator
              key={`tank-report-${Date.now()}`}
              dataSource={reportData}
              columns={getReportColumns()}
              summaryData={calculateSummaryData()}
              title={`Tank Inventory Report - ${state.currentStation?.name || 'All Stations'}`}
              fileName={`tank_inventory_${new Date().toISOString().split('T')[0]}`}
              reportType="inventory"
              companyName={state.currentCompany?.name}
              stationInfo={state.currentStation}
              footerText={`Generated from Fuel Management System | ${new Date().toLocaleString()}`}
              showFooter={true}
              enableCustomization={true}
              showGrandTotals={false}
              onReportGenerate={handleReportComplete}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FuelTankManagement;