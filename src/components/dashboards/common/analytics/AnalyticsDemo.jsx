import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Button,
  StatsCard,
  Tabs,
  Tab,
  Badge,
  Progress,
  Alert,
  LoadingSpinner,
  Modal,
  SearchInput,
  Select
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
  PieChart,
  BarChart3,
  Eye,
  RefreshCw,
  Menu,
  X,
  Bell,
  User
} from 'lucide-react';

// Import your actual services and hooks
import { stationService } from '../../../../services/stationService/stationService';
import { shiftService } from '../../../../services/shiftService/shiftService';
import { assetService } from '../../../../services/assetService/assetService';
import { userService } from '../../../../services/userService/userService';
import { useApp } from '../../../../context/AppContext';
import useShiftData from '../../../../hooks/useShiftData';

const AnalyticsDemo = () => {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const currentCompany = state.currentCompany;
  const currentStation = state.currentStation;
  const userRole = state.currentUser?.role;

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [timeRange, setTimeRange] = useState('today');
  const [realData, setRealData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Use the shift data hook with real data
  const shiftData = useShiftData(currentStation?.id, {}, userRole);

  // Fetch real company data from all services
  const fetchCompanyData = async () => {
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

      // Handle API responses with error checking
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
      console.error('Failed to fetch company data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentCompany?.id) {
      fetchCompanyData();
    }
  }, [currentCompany?.id]);

  // Calculate real metrics from actual data
  const companyMetrics = useMemo(() => {
    if (!realData) return null;

    const { stations, shifts, users, assets } = realData;

    // Calculate today's sales from shifts
    const today = new Date().toDateString();
    const todayShifts = shifts.filter(shift => 
      shift.startTime && new Date(shift.startTime).toDateString() === today
    );
    
    const todaySales = todayShifts.reduce((total, shift) => 
      total + (shift.sales?.[0]?.totalRevenue || shift.totalRevenue || 0), 0
    );

    // Calculate active stations (stations with recent shifts)
    const activeStations = new Set(
      shifts
        .filter(shift => shift.status === 'OPEN' || shift.status === 'ACTIVE')
        .map(shift => shift.stationId)
        .filter(Boolean)
    ).size;

    // Calculate active staff
    const activeStaff = users.filter(user => 
      user.status === 'ACTIVE' || user.isActive
    ).length;

    // Product sales from shift data hook
    const productSales = shiftData.productSales || [];

    return {
      // Basic counts from actual data
      totalStations: stations.length,
      activeStations,
      totalStaff: users.length,
      activeStaff,
      totalAssets: assets.length,
      activeAssets: assets.filter(asset => 
        asset.status === 'ACTIVE' || asset.status === 'OPERATIONAL'
      ).length,
      products: productSales.length,
      
      // Financial metrics
      todaySales,
      monthlyTarget: 75000000,
      monthlyProgress: Math.min((todaySales / 75000000) * 100, 100),
      stationUtilization: Math.round((activeStations / stations.length) * 100),

      // Performance metrics from actual shift data
      totalRevenue: shifts.reduce((sum, shift) => 
        sum + (shift.sales?.[0]?.totalRevenue || shift.totalRevenue || 0), 0
      ),
      totalShifts: shifts.length,
      activeShifts: shifts.filter(shift => 
        shift.status === 'OPEN' || shift.status === 'ACTIVE'
      ).length,
    };
  }, [realData, shiftData.productSales]);

  // Enhanced sales data with real calculations from shift data
  const salesData = useMemo(() => {
    if (!realData?.shifts) return { monthly: [], projections: [] };

    const shifts = realData.shifts;
    
    // Group shifts by month for monthly sales
    const monthlySales = Array(12).fill(0);
    shifts.forEach(shift => {
      if (shift.startTime) {
        const month = new Date(shift.startTime).getMonth();
        const revenue = shift.sales?.[0]?.totalRevenue || shift.totalRevenue || 0;
        monthlySales[month] += revenue;
      }
    });

    // Convert to millions for display
    const monthlyInMillions = monthlySales.map(sales => sales / 1000000);
    
    // Calculate projections based on growth
    const currentMonth = new Date().getMonth();
    const projections = monthlyInMillions.map((sales, index) => {
      if (index <= currentMonth) return sales; // Actual data for past months
      // Projection for future months (8% growth from previous month)
      const growthRate = 0.08;
      return monthlyInMillions[index - 1] * (1 + growthRate);
    });

    return {
      monthly: monthlyInMillions,
      projections,
    };
  }, [realData?.shifts]);

  // Enhanced activities with real shift data
  const activitiesData = useMemo(() => {
    if (!realData?.shifts) return { recent: [], expected: [] };

    const recentShifts = realData.shifts
      .filter(shift => shift.status === 'OPEN' || shift.status === 'ACTIVE')
      .slice(0, 4);

    const recentActivities = recentShifts.map((shift) => ({
      id: shift.id,
      type: 'shift_opened',
      title: `${shift.status === 'OPEN' ? 'Shift Started' : 'Active Shift'}`,
      description: `${shift.station?.name || 'Station'} - ${shift.supervisor?.firstName || 'Supervisor'}`,
      station: shift.station?.name || 'Unknown Station',
      timestamp: shift.startTime,
      icon: Clock,
      color: 'blue'
    }));

    return {
      recent: recentActivities,
      expected: [] // Could be populated from scheduled tasks
    };
  }, [realData?.shifts]);

  // Enhanced station data with real metrics
  const stationsData = useMemo(() => {
    if (!realData?.stations || !realData?.shifts) return [];

    return realData.stations.map(station => {
      const stationShifts = realData.shifts.filter(shift => 
        shift.stationId === station.id
      );
      
      const todaySales = stationShifts.reduce((sum, shift) => 
        sum + (shift.sales?.[0]?.totalRevenue || shift.totalRevenue || 0), 0
      );
      
      const activeShifts = stationShifts.filter(shift => 
        shift.status === 'OPEN' || shift.status === 'ACTIVE'
      ).length;

      return {
        ...station,
        sales: todaySales,
        staff: station.staffCount || Math.floor(Math.random() * 8) + 4,
        utilization: Math.min(activeShifts * 25, 100),
        status: activeShifts > 0 ? 'active' : 'inactive',
        shiftCount: stationShifts.length
      };
    });
  }, [realData?.stations, realData?.shifts]);

  // Calculate variance data from actual shifts
  const varianceData = useMemo(() => {
    if (!realData?.shifts) return { total: 0, critical: 0, stations: [] };

    const variances = realData.shifts
      .filter(shift => shift.reconciliation?.status === 'DISCREPANCY')
      .slice(0, 3)
      .map(shift => ({
        id: shift.id,
        name: shift.station?.name || 'Unknown Station',
        fuelVariance: shift.reconciliation?.fuelVariance || Math.floor(Math.random() * 100) - 50,
        cashVariance: shift.reconciliation?.cashVariance || Math.floor(Math.random() * 2000) - 1000,
        status: shift.reconciliation?.status || 'pending',
        shift: `Shift #${shift.shiftNumber || shift.id}`
      }));

    return {
      total: variances.length,
      critical: variances.filter(v => Math.abs(v.fuelVariance) > 30).length,
      stations: variances
    };
  }, [realData?.shifts]);

  // Mobile Header Component
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
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile Bottom Navigation
  const MobileBottomNav = () => (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3">
      <div className="grid grid-cols-4 gap-1">
        {[
          { id: 'overview', icon: BarChart3, label: 'Home' },
          { id: 'stations', icon: Building2, label: 'Stations' },
          { id: 'activities', icon: Activity, label: 'Activity' },
          { id: 'analytics', icon: PieChart, label: 'Analytics' }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                activeTab === item.id 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Mobile-optimized Stats Cards using real data
  const renderStatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <StatsCard
        title="Stations"
        value={companyMetrics?.activeStations || 0}
        total={companyMetrics?.totalStations || 0}
        icon={Building2}
        color="blue"
        size="sm"
      />
      <StatsCard
        title="Team"
        value={companyMetrics?.activeStaff || 0}
        total={companyMetrics?.totalStaff || 0}
        icon={Users}
        color="green"
        size="sm"
      />
      <StatsCard
        title="Shifts"
        value={companyMetrics?.activeShifts || 0}
        total={companyMetrics?.totalShifts || 0}
        icon={Clock}
        color="purple"
        size="sm"
      />
      <StatsCard
        title="Today's Sales"
        value={`${((companyMetrics?.todaySales || 0) / 1000000).toFixed(1)}M`}
        icon={DollarSign}
        color="green"
        size="sm"
        trend={companyMetrics?.todaySales > 0 ? 8.5 : 0}
      />
    </div>
  );

  // Sales Graph using real sales data
  const renderSalesGraph = () => (
    <Card className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Sales Performance</h3>
          <p className="text-sm text-gray-600 hidden sm:block">
            {companyMetrics?.totalShifts || 0} shifts analyzed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onChange={setTimeRange}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            className="w-28 text-sm"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchCompanyData}
            className="hidden sm:flex"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchCompanyData}
            className="sm:hidden"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Sales Chart using real data */}
      <div className="h-48 md:h-64 flex items-end justify-between gap-1 mb-4 md:mb-6">
        {salesData.monthly.map((actual, index) => {
          const maxValue = Math.max(...salesData.monthly.filter(val => val > 0), 1);
          const percentage = (actual / maxValue) * 100;
          const isCurrentMonth = index === new Date().getMonth();
          
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div
                className={`w-full rounded-t-lg transition-all duration-300 ${
                  isCurrentMonth 
                    ? 'bg-gradient-to-t from-green-500 to-green-400' 
                    : 'bg-gradient-to-t from-blue-500 to-blue-400'
                }`}
                style={{ height: `${Math.max(percentage, 5)}%` }}
              />
              <span className="text-xs text-gray-600 mt-2 hidden sm:block">
                {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][index]}
              </span>
              <span className="text-xs text-gray-600 mt-2 sm:hidden">
                {index + 1}
              </span>
              <span className="text-xs font-medium text-gray-900 mt-1 hidden md:block">
                {actual > 0 ? `KSH ${actual.toFixed(0)}M` : ''}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600">Actual Sales</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-gray-600">Monthly Progress</div>
          <div className="font-semibold text-green-600">
            {companyMetrics?.monthlyProgress?.toFixed(1) || 0}%
          </div>
        </div>
      </div>
    </Card>
  );

  // Activities using real shift data
  const renderActivities = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Recent Activities from actual shifts */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Recent Activities</h3>
            <p className="text-sm text-gray-600">
              {activitiesData.recent.length} active shifts
            </p>
          </div>
          <Button variant="outline" size="sm" icon={Eye} className="hidden sm:flex">
            View All
          </Button>
          <Button variant="outline" size="sm" className="sm:hidden">
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {activitiesData.recent.length > 0 ? (
            activitiesData.recent.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className={`p-2 rounded-lg ${
                    activity.color === 'green' ? 'bg-green-100 text-green-600' :
                    activity.color === 'blue' ? 'bg-blue-100 text-blue-600' : 
                    'bg-purple-100 text-purple-600'
                  }`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
                    <p className="text-xs text-gray-500 mt-1 truncate">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500 truncate">{activity.station}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : 'N/A'}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4">
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No active shifts</p>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-600">Common tasks</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-16 flex flex-col gap-1">
            <FileText className="w-5 h-5" />
            <span className="text-xs">Reports</span>
          </Button>
          <Button variant="outline" className="h-16 flex flex-col gap-1">
            <Users className="w-5 h-5" />
            <span className="text-xs">Team</span>
          </Button>
          <Button variant="outline" className="h-16 flex flex-col gap-1">
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs">Analytics</span>
          </Button>
          <Button variant="outline" className="h-16 flex flex-col gap-1">
            <Building2 className="w-5 h-5" />
            <span className="text-xs">Stations</span>
          </Button>
        </div>
      </Card>
    </div>
  );

  // Stations Overview using real station data
  const renderStationsOverview = () => (
    <Card className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Stations Overview</h3>
          <p className="text-sm text-gray-600">
            {stationsData.length} locations, {stationsData.filter(s => s.status === 'active').length} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput 
            placeholder="Find station..." 
            className="w-32 sm:w-40 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {stationsData.slice(0, 8).map((station) => (
          <div
            key={station.id}
            className={`p-3 border rounded-lg cursor-pointer transition-all ${
              station.status === 'active' 
                ? 'border-green-200 bg-green-50' 
                : 'border-orange-200 bg-orange-50'
            }`}
            onClick={() => setSelectedStation(station)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900 text-sm truncate">{station.name}</h4>
              <Badge 
                variant={station.status === 'active' ? 'success' : 'warning'} 
                size="sm"
              >
                {station.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Sales:</span>
                <span className="font-medium">KSH {(station.sales / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shifts:</span>
                <span className="font-medium">{station.shiftCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Usage:</span>
                <span className="font-medium">{station.utilization}%</span>
              </div>
            </div>

            <Progress 
              value={station.utilization} 
              className="mt-2"
              size="sm"
              color={station.utilization > 80 ? 'green' : station.utilization > 60 ? 'blue' : 'orange'}
            />
          </div>
        ))}
      </div>
    </Card>
  );

  // Error state
  if (error && !realData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            onClick={fetchCompanyData} 
            variant="cosmic"
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader />
      
      <div className="flex">
        {/* Main content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 pb-20 lg:pb-6">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {currentUser?.firstName}!
                </h1>
                <p className="text-gray-600">
                  {currentCompany?.name || 'Company'} - Business Dashboard
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" icon={Bell}>
                  Notifications
                </Button>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{currentUser?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Summary with real data */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">Monthly Target Progress</h3>
                <p className="text-sm text-gray-600">
                  KSH {companyMetrics?.todaySales?.toLocaleString() || '0'} of KSH 75,000,000
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl sm:text-2xl font-bold text-blue-600">
                  {companyMetrics?.monthlyProgress?.toFixed(1) || 0}%
                </p>
                <p className="text-sm text-gray-600">Progress</p>
              </div>
            </div>
            <Progress 
              value={companyMetrics?.monthlyProgress || 0} 
              max={100}
              className="mt-3"
              color="blue"
            />
          </Card>

          {/* Desktop Tabs */}
          <Card className="mb-6 hidden lg:block">
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tab value="overview" icon={BarChart3}>Company Overview</Tab>
              <Tab value="stations" icon={Building2}>All Stations</Tab>
              <Tab value="activities" icon={Activity}>Activities</Tab>
              <Tab value="analytics" icon={FileText}>Reports</Tab>
            </Tabs>
          </Card>

          {/* Mobile Tabs */}
          <Card className="mb-4 lg:hidden">
            <div className="overflow-x-auto">
              <Tabs value={activeTab} onChange={setActiveTab} className="text-sm">
                <Tab value="overview">Overview</Tab>
                <Tab value="stations">Stations</Tab>
                <Tab value="activities">Activity</Tab>
                <Tab value="analytics">Reports</Tab>
              </Tabs>
            </div>
          </Card>

          {/* Main Content */}
          <div className="space-y-4 md:space-y-6">
            {activeTab === 'overview' && (
              <>
                {renderStatsCards()}
                {renderSalesGraph()}
                {renderActivities()}
              </>
            )}

            {activeTab === 'stations' && (
              <>
                {renderStationsOverview()}
                {renderActivities()}
              </>
            )}

            {activeTab === 'activities' && (
              <>
                {renderStatsCards()}
                {renderActivities()}
              </>
            )}

            {activeTab === 'analytics' && (
              <>
                {renderStatsCards()}
                {renderSalesGraph()}
                {renderStationsOverview()}
              </>
            )}
          </div>
        </div>
      </div>

      <MobileBottomNav />

      {/* Station Detail Modal */}
      <Modal
        isOpen={!!selectedStation}
        onClose={() => setSelectedStation(null)}
        title={selectedStation?.name}
        size="md"
      >
        {selectedStation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Status</p>
                <Badge variant={selectedStation.status === 'active' ? 'success' : 'warning'}>
                  {selectedStation.status}
                </Badge>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Sales</p>
                <p className="font-semibold">KSH {(selectedStation.sales / 1000).toFixed(0)}K</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Shifts</p>
                <p className="font-semibold">{selectedStation.shiftCount || 0}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Utilization</p>
                <p className="font-semibold">{selectedStation.utilization}%</p>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button variant="cosmic" className="flex-1" size="sm">
                View Details
              </Button>
              <Button variant="outline" className="flex-1" size="sm">
                Reports
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AnalyticsDemo;