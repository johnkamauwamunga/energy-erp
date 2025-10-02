// src/components/company/CompanyOverviewWithCharts.js
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Building2, MapPin, Truck, 
  CheckCircle, Clock, AlertTriangle, Plus, 
  FileText, Users, TrendingUp, Activity,
  BarChart3, Fuel, Eye, EyeOff, Building
} from 'lucide-react';
import { StatsCard, Button, Card } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import { eventLogService } from '../../../services/eventLogService';

// Chart components
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const EventLogOverview = () => {
  const { state } = useApp();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');
  const [selectedCompany, setSelectedCompany] = useState(null);

  const user = state.user;
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isCompanyAdmin = user.role === 'COMPANY_ADMIN';
  const isStationManager = user.role === 'STATION_MANAGER';
  const isSupervisor = user.role === 'SUPERVISOR';

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, selectedCompany]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      let data;

      if (isSuperAdmin) {
        data = await eventLogService.getSuperAdminAnalytics({
          period: timeRange,
          companyId: selectedCompany
        });
      } else if (isCompanyAdmin) {
        data = await eventLogService.getCompanyOverview(user.companyId, {
          period: timeRange
        });
      } else if (isStationManager) {
        data = await eventLogService.getStationOverview(user.stationId, {
          period: timeRange
        });
      } else {
        // Supervisor - limited view
        data = await eventLogService.getSupervisorOverview(user.stationId, {
          period: timeRange
        });
      }

      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Fallback to mock data
      setAnalytics(generateMockData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = () => {
    const baseData = {
      totalSales: 3052450,
      activeStations: 4,
      totalIslands: 12,
      todayOffloads: 8,
      salesData: [
        { date: 'Jan 22', sales: 2450000, transactions: 342 },
        { date: 'Jan 23', sales: 2780000, transactions: 387 },
        { date: 'Jan 24', sales: 3120000, transactions: 421 },
        { date: 'Jan 25', sales: 3052450, transactions: 398 },
      ],
      stationPerformance: [
        { name: 'Joska Station', sales: 1250000, volume: 45000, efficiency: 92 },
        { name: 'Kitengela Station', sales: 980000, volume: 38000, efficiency: 88 },
        { name: 'Rongai Station', sales: 823450, volume: 32000, efficiency: 85 },
      ],
      fuelDistribution: [
        { name: 'Super Petrol', value: 45, color: '#3B82F6' },
        { name: 'Diesel', value: 35, color: '#10B981' },
        { name: 'Kerosene', value: 15, color: '#F59E0B' },
      ]
    };

    if (isStationManager) {
      // Station manager sees only their station
      return {
        ...baseData,
        stationPerformance: baseData.stationPerformance.slice(0, 1),
        activeStations: 1
      };
    }

    if (isSupervisor) {
      // Supervisor sees limited data
      return {
        totalSales: 1250000,
        activeStations: 1,
        totalIslands: 4,
        todayOffloads: 2,
        salesData: baseData.salesData,
        stationPerformance: baseData.stationPerformance.slice(0, 1),
        fuelDistribution: baseData.fuelDistribution
      };
    }

    return baseData;
  };

  const getQuickActions = () => {
    if (isSuperAdmin) {
      return [
        { label: 'Create Company', icon: Building, variant: 'cosmic' },
        { label: 'System Report', icon: FileText, variant: 'secondary' },
        { label: 'Manage All Users', icon: Users, variant: 'secondary' }
      ];
    } else if (isCompanyAdmin) {
      return [
        { label: 'Create New Station', icon: Plus, variant: 'cosmic' },
        { label: 'Generate Daily Report', icon: FileText, variant: 'secondary' },
        { label: 'Manage Staff', icon: Users, variant: 'secondary' }
      ];
    } else if (isStationManager) {
      return [
        { label: 'Start New Shift', icon: Plus, variant: 'cosmic' },
        { label: 'Station Report', icon: FileText, variant: 'secondary' },
        { label: 'View Attendants', icon: Users, variant: 'secondary' }
      ];
    } else {
      // Supervisor
      return [
        { label: 'My Shift Report', icon: FileText, variant: 'secondary' },
        { label: 'Island Status', icon: MapPin, variant: 'secondary' }
      ];
    }
  };

  const getDashboardTitle = () => {
    if (isSuperAdmin) return "Super Admin Dashboard";
    if (isCompanyAdmin) return "Company Dashboard";
    if (isStationManager) return "Station Dashboard";
    return "Operations Dashboard";
  };

  const getDashboardSubtitle = () => {
    if (isSuperAdmin) return "Overview of all companies and system performance";
    if (isCompanyAdmin) return "Real-time overview of company operations";
    if (isStationManager) return "Your station performance and metrics";
    return "Limited operational overview";
  };

  const renderAccessRestricted = () => (
    <div className="text-center py-12">
      <EyeOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
      <p className="text-gray-600">Your role does not have access to this dashboard.</p>
    </div>
  );

  // Supervisor has very limited access
  if (isSupervisor) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Operations Dashboard</h3>
          <p className="text-gray-600">Limited operational overview</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatsCard
            title="Today's Sales"
            value={`KSH ${((analytics?.totalSales || 0) / 1000).toFixed(0)}K`}
            icon={DollarSign}
            color="green"
          />
          <StatsCard
            title="Active Islands"
            value={analytics?.totalIslands || 0}
            icon={MapPin}
            color="blue"
          />
        </div>

        <Card title="Quick Actions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getQuickActions().map((action, index) => (
              <Button 
                key={index}
                icon={action.icon}
                variant={action.variant}
                className="justify-start h-16"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{getDashboardTitle()}</h3>
          <p className="text-gray-600">{getDashboardSubtitle()}</p>
        </div>
        <div className="flex space-x-2">
          {isSuperAdmin && (
            <select 
              value={selectedCompany || ''}
              onChange={(e) => setSelectedCompany(e.target.value || null)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Companies</option>
              <option value="company-1">FuelTech Kenya</option>
              <option value="company-2">PetroMax Ltd</option>
              <option value="company-3">Energy Solutions</option>
            </select>
          )}
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={isStationManager ? "Station Sales" : "Today's Sales"}
          value={`KSH ${((analytics?.totalSales || 0) / 1000000).toFixed(1)}M`}
          icon={DollarSign}
          color="green"
          trend={8.7}
          subValue={
            isSuperAdmin 
              ? `${analytics?.totalCompanies || 0} companies` 
              : isStationManager 
                ? 'Your station' 
                : `${analytics?.salesData?.[analytics.salesData.length - 1]?.transactions || 0} transactions`
          }
        />
        <StatsCard
          title={isSuperAdmin ? "Total Companies" : "Active Stations"}
          value={isSuperAdmin ? (analytics?.totalCompanies || 12) : (analytics?.activeStations || 0)}
          icon={isSuperAdmin ? Building : Building2}
          color="blue"
          trend={isSuperAdmin ? 2.1 : 1.5}
          subValue={isSuperAdmin ? "Registered" : "Operational"}
        />
        {!isSuperAdmin && (
          <>
            <StatsCard
              title="Active Islands"
              value={analytics?.totalIslands || 0}
              icon={MapPin}
              color="purple"
              subValue="Serving customers"
            />
            <StatsCard
              title="Fuel Offloads"
              value={analytics?.todayOffloads || 0}
              icon={Truck}
              color="orange"
              trend={-1.2}
              subValue="Today"
            />
          </>
        )}
      </div>

      {/* Charts Section - Hidden for Station Manager */}
      {!isStationManager && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend Chart */}
          <Card title={`Sales Trend ${isSuperAdmin ? '(All Companies)' : '(Last 7 Days)'}`} icon={TrendingUp}>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.salesData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`KSH ${(value / 1000).toFixed(0)}K`, 'Sales']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Sales (KSH)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Performance Chart */}
          <Card title={isSuperAdmin ? "Company Performance" : "Station Performance"} icon={BarChart3}>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.stationPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'sales') return [`KSH ${(value / 1000).toFixed(0)}K`, 'Sales'];
                      if (name === 'volume') return [`${value}L`, 'Volume'];
                      return [value, 'Efficiency'];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="sales" fill="#3B82F6" name="Sales (KSH)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Additional Charts - Only for Company Admin and Super Admin */}
      {(isCompanyAdmin || isSuperAdmin) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fuel Distribution */}
          <Card title="Fuel Distribution" icon={Fuel}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.fuelDistribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(analytics?.fuelDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Real-time Activity */}
          <Card title="Real-time Activity" icon={Activity} className="lg:col-span-2">
            <div className="space-y-4">
              {analytics?.recentActivities?.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3 flex-1">
                    <activity.icon className={`w-5 h-5 ${activity.color}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {activity.type.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-gray-600">
                        {activity.station} - {activity.details}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{activity.time}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {getQuickActions().map((action, index) => (
            <Button 
              key={index}
              icon={action.icon}
              variant={action.variant}
              className="justify-start h-16"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default EventLogOverview;