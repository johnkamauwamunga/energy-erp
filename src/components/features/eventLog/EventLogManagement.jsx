
import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, RefreshCw, 
  CheckCircle, XCircle, AlertTriangle, 
  Info, Clock, User, Building2, EyeOff,
  Building, Shield
} from 'lucide-react';
import { Card, Button, Input, Badge, Pagination } from '../../../components/ui';
import { eventLogService, EVENT_SEVERITY, EVENT_TYPES } from '../../../services/eventLogService';
import { useApp } from '../../../context/AppContext';
import { formatDate, formatTime } from '../../../utils/helpers';

const EventLogManagement = () => {
  const { state } = useApp();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    severity: '',
    eventType: '',
    stationId: '',
    companyId: '',
    dateRange: '',
    page: 1,
    limit: 20
  });
  const [totalPages, setTotalPages] = useState(1);

  const user = state.user;
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isCompanyAdmin = user.role === 'COMPANY_ADMIN';
  const isStationManager = user.role === 'STATION_MANAGER';
  const isSupervisor = user.role === 'SUPERVISOR';

  // Supervisors cannot see activity logs
  if (isSupervisor) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-12">
            <EyeOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600">Your role does not have permission to view activity logs.</p>
          </div>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    loadActivities();
  }, [filters]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      let requestFilters = { ...filters };

      // Apply role-based filtering
      if (isCompanyAdmin) {
        requestFilters.companyId = user.companyId;
      } else if (isStationManager) {
        requestFilters.stationId = user.stationId;
      }

      const response = await eventLogService.getEventLogs(requestFilters);
      
      setActivities(response.data || response);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error('Failed to load activities:', error);
      setActivities(generateMockActivities(20));
    } finally {
      setLoading(false);
    }
  };

  const generateMockActivities = (count) => {
    const eventTypes = Object.values(EVENT_TYPES);
    const severities = Object.values(EVENT_SEVERITY);
    const stations = state.serviceStations || [];
    const companies = isSuperAdmin ? [
      { id: 'company-1', name: 'FuelTech Kenya' },
      { id: 'company-2', name: 'PetroMax Ltd' },
      { id: 'company-3', name: 'Energy Solutions' }
    ] : [];
    
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT'];
    
    return Array.from({ length: count }, (_, i) => {
      const station = stations[Math.floor(Math.random() * stations.length)];
      const company = companies[Math.floor(Math.random() * companies.length)];
      
      return {
        id: `event-${i + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        eventAction: actions[Math.floor(Math.random() * actions.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        userId: `user-${Math.floor(Math.random() * 20) + 1}`,
        userName: `User ${Math.floor(Math.random() * 20) + 1}`,
        userRole: ['COMPANY_ADMIN', 'STATION_MANAGER', 'SUPERVISOR'][Math.floor(Math.random() * 3)],
        stationId: station?.id,
        stationName: station?.name || 'Unknown Station',
        companyId: company?.id || user.companyId,
        companyName: company?.name || 'Current Company',
        description: `Performed ${actions[Math.floor(Math.random() * actions.length)]} action on ${eventTypes[Math.floor(Math.random() * eventTypes.length)]}`,
        metadata: {
          resourceType: 'SALE',
          resourceId: `resource-${i + 1}`,
          changes: { field: 'amount', from: 1000, to: 1500 }
        }
      };
    });
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      [EVENT_SEVERITY.INFO]: Info,
      [EVENT_SEVERITY.WARNING]: AlertTriangle,
      [EVENT_SEVERITY.ERROR]: XCircle,
      [EVENT_SEVERITY.CRITICAL]: XCircle,
      [EVENT_SEVERITY.DEBUG]: Clock
    };
    return icons[severity] || Info;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      [EVENT_SEVERITY.INFO]: 'blue',
      [EVENT_SEVERITY.WARNING]: 'yellow',
      [EVENT_SEVERITY.ERROR]: 'red',
      [EVENT_SEVERITY.CRITICAL]: 'red',
      [EVENT_SEVERITY.DEBUG]: 'gray'
    };
    return colors[severity] || 'gray';
  };

  const getEventTypeColor = (eventType) => {
    const colors = {
      [EVENT_TYPES.SALES]: 'green',
      [EVENT_TYPES.INVENTORY]: 'orange',
      [EVENT_TYPES.PRICING]: 'purple',
      [EVENT_TYPES.SHIFT_MANAGEMENT]: 'blue',
      [EVENT_TYPES.USER_AUTHENTICATION]: 'indigo',
      [EVENT_TYPES.SECURITY]: 'red',
      [EVENT_TYPES.SYSTEM]: 'gray'
    };
    return colors[eventType] || 'gray';
  };

  const getRoleColor = (role) => {
    const colors = {
      'SUPER_ADMIN': 'red',
      'COMPANY_ADMIN': 'purple',
      'STATION_MANAGER': 'blue',
      'SUPERVISOR': 'green',
      'ATTENDANT': 'gray'
    };
    return colors[role] || 'gray';
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleExport = () => {
    console.log('Exporting activities...');
  };

  const getColumns = () => {
    const baseColumns = [
      { key: 'timestamp', label: 'Time', width: '140px' },
      { key: 'severity', label: 'Severity', width: '120px' },
      { key: 'eventType', label: 'Event Type', width: '150px' },
      { key: 'description', label: 'Description', width: 'auto' },
      { key: 'user', label: 'User', width: '140px' },
      { key: 'station', label: 'Station', width: '150px' },
    ];

    if (isSuperAdmin) {
      baseColumns.splice(5, 0, { key: 'company', label: 'Company', width: '150px' });
    }

    baseColumns.push({ key: 'actions', label: 'Actions', width: '100px' });

    return baseColumns;
  };

  const columns = getColumns();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {isSuperAdmin ? 'System Activity Log' : 'Activity Log'}
          </h3>
          <p className="text-gray-600">
            {isSuperAdmin 
              ? 'Monitor all system activities across all companies' 
              : isCompanyAdmin 
                ? 'Monitor company-wide activities and events' 
                : 'Monitor station activities and events'
            }
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            icon={Download} 
            variant="secondary" 
            onClick={handleExport}
          >
            Export
          </Button>
          <Button 
            icon={RefreshCw} 
            onClick={loadActivities}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className={`grid gap-4 p-4 ${
          isSuperAdmin ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-6' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5'
        }`}>
          <div className={isSuperAdmin ? 'lg:col-span-2' : 'lg:col-span-2'}>
            <Input
              placeholder="Search activities..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              icon={Search}
            />
          </div>
          
          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Severities</option>
            {Object.values(EVENT_SEVERITY).map(severity => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
          
          <select
            value={filters.eventType}
            onChange={(e) => handleFilterChange('eventType', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Event Types</option>
            {Object.values(EVENT_TYPES).map(type => (
              <option key={type} value={type}>
                {type.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Company filter for Super Admin only */}
          {isSuperAdmin && (
            <select
              value={filters.companyId}
              onChange={(e) => handleFilterChange('companyId', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Companies</option>
              <option value="company-1">FuelTech Kenya</option>
              <option value="company-2">PetroMax Ltd</option>
              <option value="company-3">Energy Solutions</option>
            </select>
          )}

          {/* Station filter - hidden for Station Manager (they only see their station) */}
          {!isStationManager && (
            <select
              value={filters.stationId}
              onChange={(e) => handleFilterChange('stationId', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Stations</option>
              {state.serviceStations?.map(station => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </Card>

      {/* Activity Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(column => (
                  <th
                    key={column.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: column.width }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.map(activity => {
                const SeverityIcon = getSeverityIcon(activity.severity);
                return (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    {/* Time */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(activity.timestamp)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(activity.timestamp)}
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={getSeverityColor(activity.severity)}
                        icon={SeverityIcon}
                        className="capitalize"
                      >
                        {activity.severity.toLowerCase()}
                      </Badge>
                    </td>

                    {/* Event Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={getEventTypeColor(activity.eventType)}
                        className="capitalize"
                      >
                        {activity.eventType.replace('_', ' ').toLowerCase()}
                      </Badge>
                    </td>

                    {/* Description */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {activity.description}
                      </div>
                      {activity.metadata?.changes && (
                        <div className="text-xs text-gray-500 mt-1">
                          Changed {activity.metadata.changes.field} from {activity.metadata.changes.from} to {activity.metadata.changes.to}
                        </div>
                      )}
                    </td>

                    {/* User */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {activity.userName}
                          </div>
                          <Badge 
                            variant={getRoleColor(activity.userRole)}
                            size="xs"
                            className="mt-1"
                          >
                            {activity.userRole.replace('_', ' ').toLowerCase()}
                          </Badge>
                        </div>
                      </div>
                    </td>

                    {/* Company - Super Admin only */}
                    {isSuperAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {activity.companyName}
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Station */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          {activity.stationName}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => console.log('View details', activity.id)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Loading activities...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && activities.length === 0 && (
          <div className="text-center py-12">
            <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No activities found matching your filters</p>
          </div>
        )}

        {/* Pagination */}
        {activities.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={filters.page}
              totalPages={totalPages}
              onPageChange={(page) => handleFilterChange('page', page)}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default EventLogManagement;