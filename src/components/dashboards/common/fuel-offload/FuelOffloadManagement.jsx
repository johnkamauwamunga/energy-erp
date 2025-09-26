// src/components/fuel-offload/FuelOffloadManagement.js
import React, { useState, useEffect } from 'react';
import { 
  Plus, Eye, Edit, Trash2, Search, Filter, RefreshCw, 
  CheckCircle, XCircle, BarChart3, Download, Truck, Calendar, 
  Users, Tag, AlertCircle, Fuel, Zap, Clock, Archive, 
  Calculator, FileText, CheckSquare, MapPin, Building, 
  Smartphone, Monitor, Grid, List, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button, Input, Select, Badge, LoadingSpinner } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import CreateEditOffloadModal from '../offloads/CreateOffloadModal';
// import OffloadDetailsModal from './OffloadDetailsModal';
// import CompleteOffloadModal from './CompleteOffloadModal';
import { fuelOffloadService, offloadFormatters } from '../../services/fuelOffloadService';

const FuelOffloadManagement = () => {
  const { state } = useApp();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedOffload, setSelectedOffload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offloads, setOffloads] = useState([]);
  const [stations, setStations] = useState([]);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [tankFilter, setTankFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list' for mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Detect mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setViewMode('list'); // Default to list on desktop
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load offloads and stations
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (stationFilter !== 'all') filters.stationId = stationFilter;
      if (tankFilter !== 'all') filters.tankId = tankFilter;
      if (dateFilter) filters.startDate = dateFilter;
      if (searchQuery) filters.search = searchQuery;

      // Load offloads based on user role
      let offloadsResponse;
      if (state.currentUser.stationId) {
        // Station-level view
        offloadsResponse = await fuelOffloadService.getOffloadsByStation(
          state.currentUser.stationId, 
          filters
        );
      } else {
        // Company-level view
        offloadsResponse = await fuelOffloadService.getOffloads(filters);
      }

      setOffloads(offloadsResponse.data || []);

      // Load stations for company admins
      if (!state.currentUser.stationId) {
        // This would come from your stations API
        const mockStations = [
          { id: '1', name: 'Downtown Station' },
          { id: '2', name: 'Airport Station' },
          { id: '3', name: 'Highway Station' }
        ];
        setStations(mockStations);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
      setError(error.message || 'Failed to load fuel offloads');
      setOffloads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [retryCount, statusFilter, stationFilter, tankFilter, dateFilter]);

  const handleOffloadCreated = () => {
    loadData();
    setIsCreateModalOpen(false);
  };

  const handleOffloadUpdated = () => {
    loadData();
    setSelectedOffload(null);
  };

  const handleOffloadCompleted = () => {
    loadData();
    setIsCompleteModalOpen(false);
    setSelectedOffload(null);
  };

  const handleRetry = () => setRetryCount(prev => prev + 1);

  // Status badge with mobile optimization
  const getStatusBadge = (status) => {
    const statusConfig = {
      'IN_PROGRESS': { color: 'blue', label: 'In Progress', icon: Clock, short: 'Progress' },
      'SUCCESSFUL': { color: 'green', label: 'Completed', icon: CheckCircle, short: 'Done' },
      'FAILED': { color: 'red', label: 'Failed', icon: XCircle, short: 'Failed' },
      'CANCELLED': { color: 'gray', label: 'Cancelled', icon: XCircle, short: 'Cancelled' },
      'PARTIAL': { color: 'orange', label: 'Partial', icon: AlertCircle, short: 'Partial' }
    };

    const config = statusConfig[status] || statusConfig.IN_PROGRESS;
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
    if (offload.status !== 'IN_PROGRESS') {
      setError('Only in-progress offloads can be edited');
      return;
    }
    setSelectedOffload(offload);
    setIsCreateModalOpen(true);
  };

  const handleCompleteOffload = (offload) => {
    setSelectedOffload(offload);
    setIsCompleteModalOpen(true);
  };

  const handleDeleteOffload = async (offloadId) => {
    if (!window.confirm('Are you sure you want to delete this offload? This action cannot be undone.')) return;
    
    try {
      await fuelOffloadService.deleteOffload(offloadId);
      loadData();
    } catch (error) {
      setError(error.message);
    }
  };

  // Check permissions
  const canManageOffloads = () => {
    return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER', 'STATION_MANAGER', 'SUPERVISOR'].includes(state.currentUser.role);
  };

  const canCreateOffloads = () => {
    return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'STATION_MANAGER', 'SUPERVISOR'].includes(state.currentUser.role);
  };

  // Statistics for dashboard
  const stats = {
    total: offloads.length,
    inProgress: offloads.filter(o => o.status === 'IN_PROGRESS').length,
    completed: offloads.filter(o => o.status === 'SUCCESSFUL').length,
    today: offloads.filter(o => {
      const today = new Date().toDateString();
      return new Date(o.startTime).toDateString() === today;
    }).length
  };

  // Mobile-optimized offload card
  const MobileOffloadCard = ({ offload }) => {
    const formatted = offloadFormatters.formatOffloadForDisplay(offload);
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{offload.deliveryNoteNumber}</span>
              {getStatusBadge(offload.status)}
            </div>
            <div className="text-xs text-gray-600">
              {offload.vehicleNumber} • {offload.driverName}
            </div>
            <div className="text-xs text-gray-500">
              {offload.tank?.asset?.station?.name} • {formatted.shortStartTime}
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
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Product:</div>
              <div className="font-medium">{offload.product?.name}</div>
              
              <div>Expected:</div>
              <div className="font-medium">{offload.expectedQuantity}L</div>
              
              <div>Actual:</div>
              <div className="font-medium">{offload.actualQuantity}L</div>
              
              <div>Variance:</div>
              <div className={`font-medium ${
                offload.variance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {offload.variance}L
              </div>
            </div>
            
            <div className="flex space-x-2 pt-2">
              <Button size="sm" variant="secondary" onClick={() => handleViewDetails(offload)}>
                <Eye className="w-3 h-3" />
              </Button>
              {offload.status === 'IN_PROGRESS' && canManageOffloads() && (
                <>
                  <Button size="sm" variant="success" onClick={() => handleCompleteOffload(offload)}>
                    <CheckSquare className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleEditOffload(offload)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                </>
              )}
              <Button size="sm" variant="danger" onClick={() => handleDeleteOffload(offload.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
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
            {state.currentUser.stationId 
              ? `Managing offloads for your station` 
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
              icon={isMobile ? Grid : List}
              variant="outline" 
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="hidden sm:flex"
            >
              {viewMode === 'grid' ? 'List' : 'Grid'}
            </Button>
            <Button icon={Download} variant="outline" size="sm">
              <span className="hidden md:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center flex-1">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
          <Button onClick={handleRetry} size="sm" variant="secondary">
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Statistics Cards - Mobile Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex space-x-3 overflow-x-auto pb-2 -mx-2 px-2">
          <div className="bg-white p-3 rounded-lg shadow-sm border min-w-[140px] flex-shrink-0">
            <div className="flex items-center">
              <div className="p-1 bg-blue-100 rounded-lg">
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total</p>
                <p className="text-lg font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm border min-w-[140px] flex-shrink-0">
            <div className="flex items-center">
              <div className="p-1 bg-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Completed</p>
                <p className="text-lg font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm border min-w-[140px] flex-shrink-0">
            <div className="flex items-center">
              <div className="p-1 bg-yellow-100 rounded-lg">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">In Progress</p>
                <p className="text-lg font-bold text-gray-900">{stats.inProgress}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm border min-w-[140px] flex-shrink-0">
            <div className="flex items-center">
              <div className="p-1 bg-purple-100 rounded-lg">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Today</p>
                <p className="text-lg font-bold text-gray-900">{stats.today}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg p-3 md:p-4 mb-4 shadow-sm border">
        <div className="space-y-3">
          {/* Main Search Row */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search offloads..."
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
            </Button>
            <Button onClick={loadData} icon={RefreshCw} variant="outline" size="sm">
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>

          {/* Expandable Filters */}
          {isFilterOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="sm"
              >
                <option value="all">All Statuses</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SUCCESSFUL">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>

              {!state.currentUser.stationId && (
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
                  setTankFilter('all');
                  setDateFilter('');
                  setSearchQuery('');
                }}
                variant="secondary"
                size="sm"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Offloads Display */}
      {isMobile && viewMode === 'grid' ? (
        // Mobile Grid View
        <div className="space-y-3">
          {offloads.length > 0 ? (
            offloads.map(offload => (
              <MobileOffloadCard key={offload.id} offload={offload} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No offloads found. {canCreateOffloads() && 'Create your first offload to get started.'}
            </div>
          )}
        </div>
      ) : (
        // Desktop Table View
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Delivery Note</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Vehicle & Driver</th>
                  {!state.currentUser.stationId && (
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Station</th>
                  )}
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Product & Tank</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Quantities (L)</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Timeline</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {offloads.length > 0 ? (
                  offloads.map(offload => {
                    const formatted = offloadFormatters.formatOffloadForDisplay(offload);
                    return (
                      <tr key={offload.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 text-sm">{offload.deliveryNoteNumber}</div>
                          <div className="text-xs text-gray-500">{offload.transporterName}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 text-sm">{offload.vehicleNumber}</div>
                          <div className="text-xs text-gray-500">{offload.driverName}</div>
                        </td>
                        {!state.currentUser.stationId && (
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-900">{offload.tank?.asset?.station?.name}</div>
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 text-sm">{offload.product?.name}</div>
                          <div className="text-xs text-gray-500">{offload.tank?.asset?.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Exp:</span>
                              <span className="font-medium">{offload.expectedQuantity}L</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Act:</span>
                              <span className="font-medium">{offload.actualQuantity}L</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Var:</span>
                              <span className={`font-medium ${
                                offload.variance >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {offload.variance}L
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(offload.status)}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          <div>Start: {formatted.formattedStartTime}</div>
                          {offload.endTime && <div>End: {formatted.formattedEndTime}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-1">
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              icon={Eye}
                              onClick={() => handleViewDetails(offload)}
                            >
                              View
                            </Button>
                            
                            {offload.status === 'IN_PROGRESS' && canManageOffloads() && (
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
                            
                            <Button 
                              size="sm" 
                              variant="danger" 
                              icon={Trash2}
                              onClick={() => handleDeleteOffload(offload.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={!state.currentUser.stationId ? 8 : 7} className="py-8 px-4 text-center text-gray-500">
                      No offloads found. {canCreateOffloads() && 'Create your first offload to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateEditOffloadModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedOffload(null);
        }}
        offload={selectedOffload}
        onOffloadCreated={handleOffloadCreated}
        onOffloadUpdated={handleOffloadUpdated}
      />

      {/* <OffloadDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        offload={selectedOffload}
      /> */}

      {/* <CompleteOffloadModal 
        isOpen={isCompleteModalOpen}
        onClose={() => {
          setIsCompleteModalOpen(false);
          setSelectedOffload(null);
        }}
        offload={selectedOffload}
        onOffloadCompleted={handleOffloadCompleted}
      /> */}
    </div>
  );
};

export default FuelOffloadManagement;