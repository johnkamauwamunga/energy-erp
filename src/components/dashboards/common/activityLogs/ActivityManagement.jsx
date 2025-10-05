import React, { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Table,
  SearchInput,
  FilterDropdown,
  DatePicker,
  Badge,
  LoadingSpinner,
  EmptyState
} from '../../../ui';
import {
  Filter,
  Download,
  Eye,
  Building2,
  MapPin,
  Calendar,
  Search,
  Activity
} from 'lucide-react';

const ActivityManagement = () => {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    company: 'all',
    station: 'all',
    activityType: 'all',
    dateRange: 'today'
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Mock activities data - in real app, this would come from API
  const activitiesData = [
    {
      id: 1,
      type: 'shift_opened',
      title: 'Shift Started',
      description: 'Morning shift started with 6 attendants',
      company: 'Prime Energy Kenya Ltd',
      station: 'Nairobi CBD Station',
      user: 'John Doe',
      timestamp: '2024-01-25T06:00:00Z',
      severity: 'info'
    },
    {
      id: 2,
      type: 'fuel_offload',
      title: 'Fuel Offload Completed',
      description: 'Received 45,000L of Super Petrol from Vivo Energy',
      company: 'Prime Energy Kenya Ltd',
      station: 'Joska Station',
      user: 'Sarah Smith',
      timestamp: '2024-01-25T08:30:00Z',
      severity: 'success'
    },
    {
      id: 3,
      type: 'variance_detected',
      title: 'Variance Alert',
      description: 'Fuel variance of -45L detected during shift closing',
      company: 'Vivo Energy Kenya',
      station: 'Rongai Station',
      user: 'Mike Johnson',
      timestamp: '2024-01-25T07:15:00Z',
      severity: 'warning'
    },
    {
      id: 4,
      type: 'maintenance',
      title: 'Maintenance Completed',
      description: 'Pump calibration and maintenance completed',
      company: 'Total Energies Kenya',
      station: 'Thika Road Station',
      user: 'Technical Team',
      timestamp: '2024-01-25T09:45:00Z',
      severity: 'info'
    },
    {
      id: 5,
      type: 'system_alert',
      title: 'System Performance',
      description: 'High server load detected on database cluster',
      company: 'System',
      station: 'N/A',
      user: 'System Monitor',
      timestamp: '2024-01-25T06:45:00Z',
      severity: 'error'
    }
  ];

  // Mock companies and stations for filters
  const companies = [
    { id: 'all', name: 'All Companies' },
    { id: 'company-1', name: 'Prime Energy Kenya Ltd' },
    { id: 'company-2', name: 'Vivo Energy Kenya' },
    { id: 'company-3', name: 'Total Energies Kenya' },
    { id: 'system', name: 'System' }
  ];

  const activityTypes = [
    { id: 'all', name: 'All Activities' },
    { id: 'shift_opened', name: 'Shift Operations' },
    { id: 'fuel_offload', name: 'Fuel Offloads' },
    { id: 'variance_detected', name: 'Variances' },
    { id: 'maintenance', name: 'Maintenance' },
    { id: 'system_alert', name: 'System Alerts' }
  ];

  const dateRanges = [
    { id: 'today', name: 'Today' },
    { id: 'yesterday', name: 'Yesterday' },
    { id: 'week', name: 'This Week' },
    { id: 'month', name: 'This Month' },
    { id: 'custom', name: 'Custom Range' }
  ];

  // Filter activities based on current filters and search
  const filteredActivities = useMemo(() => {
    return activitiesData.filter(activity => {
      const matchesCompany = filters.company === 'all' || activity.company === companies.find(c => c.id === filters.company)?.name;
      const matchesStation = filters.station === 'all' || activity.station.toLowerCase().includes(filters.station.toLowerCase());
      const matchesType = filters.activityType === 'all' || activity.type === filters.activityType;
      const matchesSearch = searchTerm === '' || 
        activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCompany && matchesStation && matchesType && matchesSearch;
    });
  }, [filters, searchTerm]);

  const getSeverityBadge = (severity) => {
    const variants = {
      info: 'secondary',
      success: 'success',
      warning: 'warning',
      error: 'error'
    };
    return variants[severity] || 'secondary';
  };

  const getActivityIcon = (type) => {
    const icons = {
      shift_opened: '🕒',
      fuel_offload: '⛽',
      variance_detected: '⚠️',
      maintenance: '🔧',
      system_alert: '🚨'
    };
    return icons[type] || '📝';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Management</h1>
        <p className="text-gray-600">
          Monitor and filter activities across all companies and stations
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company
            </label>
            <FilterDropdown
              options={companies}
              value={filters.company}
              onFilter={(value) => setFilters(prev => ({ ...prev, company: value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Type
            </label>
            <FilterDropdown
              options={activityTypes}
              value={filters.activityType}
              onFilter={(value) => setFilters(prev => ({ ...prev, activityType: value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <FilterDropdown
              options={dateRanges}
              value={filters.dateRange}
              onFilter={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Station
            </label>
            <SearchInput
              placeholder="Search station..."
              value={filters.station === 'all' ? '' : filters.station}
              onChange={(value) => setFilters(prev => ({ ...prev, station: value || 'all' }))}
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => setFilters({
                company: 'all',
                station: 'all',
                activityType: 'all',
                dateRange: 'today'
              })}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <SearchInput
            placeholder="Search activities..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="flex-1 max-w-md"
          />
          
          <div className="flex gap-2">
            <Button variant="outline" icon={Download}>
              Export
            </Button>
            <Button variant="cosmic" icon={Filter}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Activities Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Activities ({filteredActivities.length})
            </h3>
            <p className="text-gray-600">
              Filtered results based on your criteria
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Info</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Success</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Error</span>
            </div>
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No activities found"
            description="Try adjusting your filters or search term"
            action={
              <Button
                variant="cosmic"
                onClick={() => {
                  setFilters({
                    company: 'all',
                    station: 'all',
                    activityType: 'all',
                    dateRange: 'today'
                  });
                  setSearchTerm('');
                }}
              >
                Clear All Filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden">
            <Table
              columns={[
                { key: 'activity', label: 'Activity' },
                { key: 'company', label: 'Company' },
                { key: 'station', label: 'Station' },
                { key: 'user', label: 'User' },
                { key: 'timestamp', label: 'Time' },
                { key: 'actions', label: 'Actions' }
              ]}
              data={filteredActivities.map(activity => ({
                activity: (
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getActivityIcon(activity.type)}</span>
                    <div>
                      <div className="font-medium text-gray-900">{activity.title}</div>
                      <div className="text-sm text-gray-600">{activity.description}</div>
                    </div>
                  </div>
                ),
                company: (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>{activity.company}</span>
                  </div>
                ),
                station: (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{activity.station}</span>
                  </div>
                ),
                user: (
                  <div className="text-gray-900">{activity.user}</div>
                ),
                timestamp: (
                  <div className="text-sm text-gray-600">
                    <div>{new Date(activity.timestamp).toLocaleDateString()}</div>
                    <div>{new Date(activity.timestamp).toLocaleTimeString()}</div>
                  </div>
                ),
                actions: (
                  <div className="flex gap-2">
                    <Badge variant={getSeverityBadge(activity.severity)}>
                      {activity.severity}
                    </Badge>
                    <Button variant="ghost" size="sm" icon={Eye}>
                      View
                    </Button>
                  </div>
                )
              }))}
            />
          </div>
        )}
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{activitiesData.length}</div>
          <div className="text-sm text-gray-600">Total Activities</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {activitiesData.filter(a => a.severity === 'success').length}
          </div>
          <div className="text-sm text-gray-600">Successful</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {activitiesData.filter(a => a.severity === 'warning').length}
          </div>
          <div className="text-sm text-gray-600">Warnings</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {activitiesData.filter(a => a.severity === 'error').length}
          </div>
          <div className="text-sm text-gray-600">Errors</div>
        </Card>
      </div>
    </div>
  );
};

export default ActivityManagement;