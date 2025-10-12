// components/CustomDashboard.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Button,
  Badge,
  Progress,
  Alert,
  LoadingSpinner,
  Modal,
  SearchInput,
  Select,
  StatsCard,
  BarChart,
  PieChart,
  DonutChart,
  LiveDataChart
} from '../../../ui';
import {
  Building2,
  Users,
  Truck,
  Fuel,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  MapPin,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  FileText,
  BarChart3,
  Eye,
  RefreshCw,
  Menu,
  X,
  Bell,
  User,
  Shield,
  Zap,
  Battery,
  Filter,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from 'lucide-react';

import { stationService } from '../../../../services/stationService/stationService';
import { shiftService } from '../../../../services/shiftService/shiftService';
import { assetService } from '../../../../services/assetService/assetService';
import { userService } from '../../../../services/userService/userService';
import { useApp } from '../../../../context/AppContext';
import useShiftData from '../../../../hooks/useShiftData';

const ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  STATION_MANAGER: 'STATION_MANAGER',
  LINES_MANAGER: 'LINES_MANAGER',
  SUPERVISOR: 'SUPERVISOR'
};

const CustomDashboard = () => {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const currentCompany = state.currentCompany;
  const currentStation = state.currentStation;
  const userRole = state.currentUser?.role;

  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [timeRange, setTimeRange] = useState('today');
  const [realData, setRealData] = useState(null);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [liveData, setLiveData] = useState([]);

  // Use the shift data hook
  const shiftData = useShiftData(
    [ROLE.STATION_MANAGER, ROLE.SUPERVISOR, ROLE.LINES_MANAGER].includes(userRole) 
      ? currentStation?.id 
      : null, 
    {}, 
    userRole
  );

  // Generate live data for the chart
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => {
        const newData = [...prev];
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });

        // Simulate realistic data fluctuations
        const lastValue = newData.length > 0 ? newData[newData.length - 1].value : 50;
        const change = (Math.random() - 0.5) * 20; // Random change between -10 and +10
        const newValue = Math.max(10, Math.min(100, lastValue + change));

        newData.push({
          label: timeLabel,
          value: Math.round(newValue)
        });

        // Keep only last 20 data points
        return newData.slice(-20);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        stationsResponse,
        usersResponse,
        assetsResponse,
        shiftsResponse
      ] = await Promise.all([
        stationService.getCompanyStations(),
        userService.getUsers(),
        assetService.getCompanyAssets(currentCompany?.id),
        shiftService.getAllShifts({ limit: 100 })
      ]);

      const stations = stationsResponse?.data || stationsResponse || [];
      const users = usersResponse?.data || usersResponse || [];
      const assets = assetsResponse?.data || assetsResponse || [];
      const shifts = shiftsResponse?.data?.shifts || shiftsResponse?.shifts || shiftsResponse || [];

      setRealData({
        stations,
        users,
        assets,
        shifts,
        lastUpdated: new Date().toISOString()
      });

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentCompany?.id) {
      fetchDashboardData();
    }
  }, [currentCompany?.id]);

  // Calculate metrics
  const dashboardMetrics = useMemo(() => {
    if (!realData) return null;

    const { stations, shifts, users, assets } = realData;

    // Filter data based on role
    let filteredStations = stations;
    let filteredShifts = shifts;

    if ([ROLE.STATION_MANAGER, ROLE.SUPERVISOR, ROLE.LINES_MANAGER].includes(userRole)) {
      if (currentStation?.id) {
        filteredStations = stations.filter(station => station.id === currentStation.id);
        filteredShifts = shifts.filter(shift => shift.stationId === currentStation.id);
      }
    }

    // Calculate metrics
    const today = new Date().toDateString();
    const todayShifts = filteredShifts.filter(shift => 
      shift.startTime && new Date(shift.startTime).toDateString() === today
    );
    
    const todaySales = todayShifts.reduce((total, shift) => 
      total + (shift.sales?.[0]?.totalRevenue || shift.totalRevenue || 0), 0
    );

    const activeStations = new Set(
      filteredShifts
        .filter(shift => shift.status === 'OPEN' || shift.status === 'ACTIVE')
        .map(shift => shift.stationId)
        .filter(Boolean)
    ).size;

    const activeShifts = filteredShifts.filter(shift => 
      shift.status === 'OPEN' || shift.status === 'ACTIVE'
    ).length;

    const openShift = filteredShifts.find(shift => 
      shift.status === 'OPEN' || shift.status === 'ACTIVE'
    );

    return {
      // Basic metrics
      totalStations: filteredStations.length,
      activeStations,
      totalShifts: filteredShifts.length,
      activeShifts,
      totalStaff: users.length,
      activeStaff: users.filter(user => user.status === 'ACTIVE' || user.isActive).length,
      totalAssets: assets.length,
      
      // Financial metrics
      todaySales,
      monthlyTarget: 75000000,
      monthlyProgress: Math.min((todaySales / 75000000) * 100, 100),
      totalRevenue: filteredShifts.reduce((sum, shift) => 
        sum + (shift.sales?.[0]?.totalRevenue || shift.totalRevenue || 0), 0
      ),

      // Shift status
      openShift,
      hasOpenShift: !!openShift,

      // Utilization
      stationUtilization: filteredStations.length > 0 ? 
        Math.round((activeStations / filteredStations.length) * 100) : 0
    };
  }, [realData, userRole, currentStation?.id]);

  // Chart data calculations
  const chartData = useMemo(() => {
    if (!realData?.shifts) return { sales: [], products: [], stations: [] };

    const shifts = realData.shifts;
    
    // Sales by hour (mock data for demo)
    const salesByHour = Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 6}:00`,
      value: Math.floor(Math.random() * 100) + 20
    }));

    // Product distribution
    const productData = [
      { label: 'Super Petrol', value: 45, color: '#3b82f6' },
      { label: 'Diesel', value: 35, color: '#10b981' },
      { label: 'Kerosene', value: 12, color: '#f59e0b' },
      { label: 'LPG', value: 8, color: '#ef4444' }
    ];

    // Station performance
    const stationData = realData.stations.slice(0, 6).map((station, index) => ({
      label: station.name.substring(0, 3),
      value: Math.floor(Math.random() * 80) + 20
    }));

    return {
      sales: salesByHour,
      products: productData,
      stations: stationData
    };
  }, [realData]);

  // Mobile Header
  const MobileHeader = () => (
    <div className="lg:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900 text-lg">Dashboard</h1>
            <p className="text-xs text-gray-600">{currentCompany?.name || 'Company'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="p-2">
            <Bell className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Shift Status Badge
  const ShiftStatus = () => {
    if (!dashboardMetrics) return null;

    return (
      <div className="flex items-center gap-3">
        <Badge 
          variant={dashboardMetrics.hasOpenShift ? "success" : "error"}
          className="flex items-center gap-1"
        >
          <Activity className="w-3 h-3" />
          {dashboardMetrics.hasOpenShift ? 'Shift Open' : 'No Active Shift'}
        </Badge>
        {dashboardMetrics.openShift && (
          <span className="text-sm text-gray-600">
            #{dashboardMetrics.openShift.shiftNumber} • {dashboardMetrics.openShift.station?.name}
          </span>
        )}
      </div>
    );
  };

  // Role-based access display
  const RoleDisplay = () => {
    const roleConfig = {
      [ROLE.SUPER_ADMIN]: { label: 'Super Admin', color: 'purple', icon: Shield },
      [ROLE.COMPANY_ADMIN]: { label: 'Company Admin', color: 'blue', icon: Building2 },
      [ROLE.STATION_MANAGER]: { label: 'Station Manager', color: 'green', icon: Users },
      [ROLE.LINES_MANAGER]: { label: 'Lines Manager', color: 'orange', icon: Zap },
      [ROLE.SUPERVISOR]: { label: 'Supervisor', color: 'indigo', icon: User }
    };

    const config = roleConfig[userRole] || { label: userRole, color: 'gray' };
    const IconComponent = config.icon;

    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        {IconComponent && <IconComponent className="w-3 h-3" />}
        {config.label}
      </Badge>
    );
  };

  // Stats Cards Section
  const StatsSection = () => (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatsCard
        title="Active Stations"
        value={dashboardMetrics?.activeStations || 0}
        total={dashboardMetrics?.totalStations || 0}
        icon={Building2}
        color="blue"
        trend={5.2}
      />
      <StatsCard
        title="Today's Sales"
        value={`KSH ${((dashboardMetrics?.todaySales || 0) / 1000).toFixed(0)}K`}
        icon={DollarSign}
        color="green"
        trend={8.5}
      />
      <StatsCard
        title="Active Shifts"
        value={dashboardMetrics?.activeShifts || 0}
        total={dashboardMetrics?.totalShifts || 0}
        icon={Clock}
        color="purple"
      />
      <StatsCard
        title="Team Members"
        value={dashboardMetrics?.activeStaff || 0}
        total={dashboardMetrics?.totalStaff || 0}
        icon={Users}
        color="orange"
      />
    </div>
  );

  // Charts Section
  const ChartsSection = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Sales Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sales Performance</h3>
            <p className="text-gray-600">Today's sales by hour</p>
          </div>
          <Select
            value={timeRange}
            onChange={setTimeRange}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
            ]}
            className="w-32"
          />
        </div>
        <BarChart 
          data={chartData.sales}
          width={400}
          height={200}
          color="#3b82f6"
          showValues={true}
          className="w-full"
        />
      </Card>

      {/* Product Distribution */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Product Distribution</h3>
            <p className="text-gray-600">Sales by product type</p>
          </div>
        </div>
        <DonutChart 
          data={chartData.products}
          width={300}
          height={200}
          className="mx-auto"
        />
      </Card>

      {/* Live Data Chart */}
      <Card className="p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Live Operations</h3>
            <p className="text-gray-600">Real-time station performance</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUpIcon className="w-4 h-4" />
              <span className="text-sm">Live</span>
            </div>
          </div>
        </div>
        <LiveDataChart 
          data={liveData}
          width={800}
          height={250}
          color="#10b981"
          strokeWidth={3}
          className="w-full"
        />
      </Card>
    </div>
  );

  // Recent Activities Table
  const ActivitiesTable = () => {
    const activities = [
      {
        id: 1,
        type: 'shift_start',
        title: 'Morning Shift Started',
        station: 'Nairobi CBD',
        time: '06:00 AM',
        icon: Clock,
        color: 'blue'
      },
      {
        id: 2,
        type: 'fuel_delivery',
        title: 'Fuel Delivery Completed',
        station: 'Westlands',
        time: '08:30 AM',
        icon: Truck,
        color: 'green'
      },
      {
        id: 3,
        type: 'maintenance',
        title: 'Pump Maintenance',
        station: 'Karen Station',
        time: '10:15 AM',
        icon: AlertTriangle,
        color: 'orange'
      },
      {
        id: 4,
        type: 'shift_end',
        title: 'Night Shift Closed',
        station: 'Rongai',
        time: '11:45 PM',
        icon: CheckCircle,
        color: 'purple'
      }
    ];

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
            <p className="text-gray-600">Latest operations across stations</p>
          </div>
          <Button variant="outline" size="sm" icon={Eye}>
            View All
          </Button>
        </div>

        <div className="space-y-4">
          {activities.map((activity) => {
            const IconComponent = activity.icon;
            return (
              <div key={activity.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`p-2 rounded-lg ${
                  activity.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  activity.color === 'green' ? 'bg-green-100 text-green-600' :
                  activity.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-600">{activity.station}</span>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{activity.time}</span>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData} variant="cosmic">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader />
      
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  {currentCompany?.name || 'Company'} Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome back, {currentUser?.firstName} {currentUser?.lastName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <RoleDisplay />
              <ShiftStatus />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              icon={RefreshCw}
              onClick={fetchDashboardData}
            >
              Refresh
            </Button>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Monthly Target Progress</h3>
              <p className="text-gray-600">
                KSH {dashboardMetrics?.todaySales?.toLocaleString() || '0'} of KSH {dashboardMetrics?.monthlyTarget?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {dashboardMetrics?.monthlyProgress?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-gray-600">Current Progress</p>
            </div>
          </div>
          </Card>
          <Progress 
            value={dashboardMetrics?.monthlyProgress || 0} 
            max={100}
            className="mt-4"
            color="blue"
          />
        </div>
      
        {/* Main Dashboard Content */}
        <StatsSection />
        <ChartsSection />
        <ActivitiesTable />
    </div>
 
  );
};

export default CustomDashboard;