import React, { useState, useMemo } from 'react';
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
  Table,
  SearchInput,
  FilterDropdown
} from '../../ui';
import {
  Building2,
  Users,
  MapPin,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Eye,
  RefreshCw,
  Truck,
  Package,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Globe,
  PieChart
} from 'lucide-react';

const SuperAdminDashboardOverView = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [dateRange, setDateRange] = useState('today');

  // Mock super admin data - in real app, this would come from API
  const superAdminData = {
    // Overall system metrics
    systemMetrics: {
      totalCompanies: 15,
      activeCompanies: 12,
      totalStations: 187,
      activeStations: 156,
      totalStaff: 2450,
      activeStaff: 2189,
      totalSuppliers: 45,
      systemUptime: '99.97%'
    },

    // Financial overview
    financials: {
      totalSales: 125450000,
      todaySales: 30524500,
      monthlyTarget: 150000000,
      salesTrend: 12.5,
      averageTransaction: 2450,
      topPerformingCompany: 'Prime Energy Kenya Ltd'
    },

    // Companies data
    companies: [
      {
        id: 'company-1',
        name: 'Prime Energy Kenya Ltd',
        status: 'active',
        registrationDate: '2022-03-15',
        stations: 24,
        activeStations: 18,
        totalStaff: 156,
        todaySales: 3052450,
        monthlySales: 58765000,
        salesTrend: 9.4,
        location: { lat: -1.2921, lng: 36.8219 },
        contact: 'info@primeenergy.co.ke',
        performance: 85
      },
      {
        id: 'company-2',
        name: 'Vivo Energy Kenya',
        status: 'active',
        registrationDate: '2021-08-22',
        stations: 32,
        activeStations: 28,
        totalStaff: 245,
        todaySales: 4256800,
        monthlySales: 78452000,
        salesTrend: 15.2,
        location: { lat: -1.2833, lng: 36.8167 },
        contact: 'admin@vivoenergy.co.ke',
        performance: 92
      },
      {
        id: 'company-3',
        name: 'Total Energies Kenya',
        status: 'active',
        registrationDate: '2020-11-05',
        stations: 28,
        activeStations: 25,
        totalStaff: 198,
        todaySales: 3897500,
        monthlySales: 65478000,
        salesTrend: 7.8,
        location: { lat: -1.2864, lng: 36.8172 },
        contact: 'support@totalenergies.co.ke',
        performance: 78
      },
      {
        id: 'company-4',
        name: 'Shell Kenya',
        status: 'suspended',
        registrationDate: '2023-01-10',
        stations: 18,
        activeStations: 12,
        totalStaff: 112,
        todaySales: 1568900,
        monthlySales: 28765000,
        salesTrend: -3.2,
        location: { lat: -1.2789, lng: 36.8194 },
        contact: 'operations@shell.co.ke',
        performance: 45
      }
    ],

    // All stations across companies
    allStations: [
      {
        id: 'station-1',
        companyId: 'company-1',
        companyName: 'Prime Energy Kenya Ltd',
        name: 'Nairobi CBD Station',
        status: 'active',
        location: { lat: -1.2921, lng: 36.8219, address: 'Moi Avenue, Nairobi' },
        sales: { today: 450230, monthly: 8450000, trend: 8.5 },
        staff: 12,
        utilization: 85,
        lastActivity: '2024-01-25T10:30:00Z'
      },
      {
        id: 'station-2',
        companyId: 'company-1',
        companyName: 'Prime Energy Kenya Ltd',
        name: 'Westlands Station',
        status: 'active',
        location: { lat: -1.2659, lng: 36.8037, address: 'Westlands, Nairobi' },
        sales: { today: 389450, monthly: 7120000, trend: 12.1 },
        staff: 10,
        utilization: 78,
        lastActivity: '2024-01-25T09:45:00Z'
      },
      {
        id: 'station-3',
        companyId: 'company-2',
        companyName: 'Vivo Energy Kenya',
        name: 'Karen Station',
        status: 'active',
        location: { lat: -1.3195, lng: 36.7089, address: 'Karen Road, Nairobi' },
        sales: { today: 525670, monthly: 9850000, trend: 15.3 },
        staff: 14,
        utilization: 92,
        lastActivity: '2024-01-25T11:15:00Z'
      },
      {
        id: 'station-4',
        companyId: 'company-2',
        companyName: 'Vivo Energy Kenya',
        name: 'Thika Road Station',
        status: 'maintenance',
        location: { lat: -1.2000, lng: 36.9000, address: 'Thika Road, Nairobi' },
        sales: { today: 0, monthly: 4560000, trend: -5.2 },
        staff: 0,
        utilization: 0,
        lastActivity: '2024-01-24T16:20:00Z'
      }
    ],

    // Recent activities across all companies
    recentActivities: [
      {
        id: 1,
        type: 'company_registered',
        title: 'New Company Registered',
        description: 'Shell Kenya completed registration process',
        company: 'Shell Kenya',
        timestamp: '2024-01-25T08:00:00Z',
        icon: Building2,
        color: 'green'
      },
      {
        id: 2,
        type: 'station_created',
        title: 'New Station Created',
        description: 'Prime Energy launched new station in Kitengela',
        company: 'Prime Energy Kenya Ltd',
        station: 'Kitengela Station',
        timestamp: '2024-01-25T07:30:00Z',
        icon: MapPin,
        color: 'blue'
      },
      {
        id: 3,
        type: 'system_alert',
        title: 'System Performance Alert',
        description: 'High server load detected on database cluster',
        company: 'System',
        timestamp: '2024-01-25T06:45:00Z',
        icon: AlertTriangle,
        color: 'orange'
      },
      {
        id: 4,
        type: 'purchase_made',
        title: 'Major Purchase Order',
        description: 'Vivo Energy placed order for 500,000L of Diesel',
        company: 'Vivo Energy Kenya',
        timestamp: '2024-01-25T05:15:00Z',
        icon: Truck,
        color: 'purple'
      }
    ],

    // Sales performance data
    salesPerformance: {
      byCompany: [
        { company: 'Prime Energy Kenya Ltd', sales: 58765000, trend: 9.4, marketShare: 32 },
        { company: 'Vivo Energy Kenya', sales: 78452000, trend: 15.2, marketShare: 43 },
        { company: 'Total Energies Kenya', sales: 65478000, trend: 7.8, marketShare: 36 },
        { company: 'Shell Kenya', sales: 28765000, trend: -3.2, marketShare: 16 }
      ],
      byStation: [
        { station: 'Karen Station', company: 'Vivo Energy Kenya', sales: 9850000, trend: 15.3 },
        { station: 'Nairobi CBD Station', company: 'Prime Energy Kenya Ltd', sales: 8450000, trend: 8.5 },
        { station: 'Westlands Station', company: 'Prime Energy Kenya Ltd', sales: 7120000, trend: 12.1 },
        { station: 'Mombasa Road Station', company: 'Total Energies Kenya', sales: 6890000, trend: 6.8 }
      ],
      hourlyTrend: [12500, 18700, 23400, 19800, 26700, 31200, 28900, 32500, 29800, 26700, 22300, 18900]
    },

    // Purchases overview
    purchases: {
      today: 15,
      value: 45000000,
      pending: 8,
      completed: 7,
      recent: [
        {
          id: 'purchase-1',
          company: 'Vivo Energy Kenya',
          supplier: 'National Oil Corporation',
          product: 'Diesel',
          quantity: 500000,
          value: 35000000,
          status: 'completed',
          date: '2024-01-25'
        },
        {
          id: 'purchase-2',
          company: 'Prime Energy Kenya Ltd',
          supplier: 'Gulf Energy',
          product: 'Super Petrol',
          quantity: 250000,
          value: 22500000,
          status: 'pending',
          date: '2024-01-25'
        }
      ]
    }
  };

  // Calculate derived metrics
  const metrics = useMemo(() => ({
    systemHealth: 95,
    activeRate: (superAdminData.systemMetrics.activeStations / superAdminData.systemMetrics.totalStations) * 100,
    salesProgress: (superAdminData.financials.todaySales / superAdminData.financials.monthlyTarget) * 100,
    avgCompanyPerformance: superAdminData.companies.reduce((acc, company) => acc + company.performance, 0) / superAdminData.companies.length
  }), [superAdminData]);

  const renderSystemStats = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
      <StatsCard
        title="Total Companies"
        value={superAdminData.systemMetrics.totalCompanies}
        icon={Building2}
        color="blue"
        trend={5.2}
      />
      <StatsCard
        title="Active Companies"
        value={superAdminData.systemMetrics.activeCompanies}
        total={superAdminData.systemMetrics.totalCompanies}
        icon={CheckCircle}
        color="green"
      />
      <StatsCard
        title="Total Stations"
        value={superAdminData.systemMetrics.totalStations}
        icon={MapPin}
        color="purple"
        trend={8.7}
      />
      <StatsCard
        title="Active Stations"
        value={superAdminData.systemMetrics.activeStations}
        total={superAdminData.systemMetrics.totalStations}
        icon={Zap}
        color="orange"
      />
      <StatsCard
        title="Total Staff"
        value={superAdminData.systemMetrics.totalStaff}
        icon={Users}
        color="indigo"
      />
      <StatsCard
        title="Active Staff"
        value={superAdminData.systemMetrics.activeStaff}
        total={superAdminData.systemMetrics.totalStaff}
        icon={Users}
        color="green"
      />
      <StatsCard
        title="System Uptime"
        value={superAdminData.systemMetrics.systemUptime}
        icon={Activity}
        color="green"
      />
      <StatsCard
        title="Today's Sales"
        value={`KSH ${(superAdminData.financials.todaySales / 1000000).toFixed(1)}M`}
        icon={DollarSign}
        color="green"
        trend={superAdminData.financials.salesTrend}
      />
    </div>
  );

  const renderCompaniesOverview = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Companies Overview</h3>
          <p className="text-gray-600">Performance and status of all registered companies</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput placeholder="Search companies..." />
          <FilterDropdown
            options={[
              { label: 'All Status', value: 'all' },
              { label: 'Active Only', value: 'active' },
              { label: 'Suspended', value: 'suspended' }
            ]}
            onFilter={(value) => console.log('Filter:', value)}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <Table
          columns={[
            { key: 'name', label: 'Company Name' },
            { key: 'status', label: 'Status' },
            { key: 'stations', label: 'Stations' },
            { key: 'sales', label: 'Today Sales' },
            { key: 'performance', label: 'Performance' },
            { key: 'actions', label: 'Actions' }
          ]}
          data={superAdminData.companies.map(company => ({
            name: (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{company.name}</div>
                  <div className="text-sm text-gray-500">{company.contact}</div>
                </div>
              </div>
            ),
            status: (
              <Badge variant={company.status === 'active' ? 'success' : 'error'}>
                {company.status}
              </Badge>
            ),
            stations: (
              <div className="text-center">
                <div className="font-semibold">{company.activeStations}/{company.stations}</div>
                <div className="text-xs text-gray-500">Active/Total</div>
              </div>
            ),
            sales: (
              <div>
                <div className="font-semibold">KSH {(company.todaySales / 1000).toFixed(0)}K</div>
                <div className={`text-xs flex items-center gap-1 ${
                  company.salesTrend >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {company.salesTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(company.salesTrend)}%
                </div>
              </div>
            ),
            performance: (
              <div className="w-full">
                <Progress value={company.performance} className="mb-2" />
                <div className="text-xs text-gray-600 text-center">{company.performance}%</div>
              </div>
            ),
            actions: (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" icon={Eye}>
                  View
                </Button>
                <Button variant="outline" size="sm" icon={BarChart3}>
                  Analytics
                </Button>
              </div>
            )
          }))}
        />
      </div>
    </Card>
  );

  const renderGeolocationMap = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Companies Geolocation</h3>
          <p className="text-gray-600">Geographic distribution of all companies and stations</p>
        </div>
        <Button variant="outline" size="sm" icon={Globe}>
          View Full Map
        </Button>
      </div>

      {/* Simplified map representation - in real app, use a proper map library */}
      <div className="bg-gray-100 rounded-lg h-96 relative mb-4">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Interactive Map View</p>
            <p className="text-sm text-gray-500 mt-2">
              {superAdminData.companies.length} companies, {superAdminData.allStations.length} stations
            </p>
          </div>
        </div>

        {/* Mock map markers */}
        {superAdminData.companies.map((company, index) => (
          <div
            key={company.id}
            className={`absolute w-4 h-4 rounded-full border-2 border-white cursor-pointer ${
              company.status === 'active' ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{
              left: `${50 + Math.cos(index * 0.8) * 30}%`,
              top: `${50 + Math.sin(index * 0.8) * 30}%`
            }}
            title={company.name}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {superAdminData.companies.slice(0, 3).map(company => (
          <div key={company.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${
              company.status === 'active' ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{company.name}</div>
              <div className="text-sm text-gray-600">{company.stations} stations</div>
            </div>
            <Badge variant={company.status === 'active' ? 'success' : 'error'}>
              {company.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderSalesPerformance = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Sales by Company */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sales by Company</h3>
            <p className="text-gray-600">Monthly sales performance per company</p>
          </div>
          <Button variant="outline" size="sm" icon={Download}>
            Export
          </Button>
        </div>

        <div className="space-y-4">
          {superAdminData.salesPerformance.byCompany.map((company, index) => (
            <div key={company.company} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-blue-500'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{company.company}</div>
                  <div className="text-sm text-gray-600">{company.marketShare}% market share</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  KSH {(company.sales / 1000000).toFixed(1)}M
                </div>
                <Badge variant={company.trend >= 0 ? "success" : "error"} className="flex items-center gap-1">
                  {company.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(company.trend)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Sales by Station */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Stations</h3>
            <p className="text-gray-600">Best performing stations across all companies</p>
          </div>
          <Button variant="outline" size="sm" icon={Filter}>
            Filter
          </Button>
        </div>

        <div className="space-y-4">
          {superAdminData.salesPerformance.byStation.map((station, index) => (
            <div key={station.station} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-blue-500'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{station.station}</div>
                  <div className="text-sm text-gray-600">{station.company}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  KSH {(station.sales / 1000000).toFixed(1)}M
                </div>
                <Badge variant={station.trend >= 0 ? "success" : "error"} className="flex items-center gap-1">
                  {station.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(station.trend)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderRecentActivities = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">System Activities</h3>
          <p className="text-gray-600">Recent activities across all companies and stations</p>
        </div>
        <Button variant="outline" size="sm" icon={Eye}>
          View All Activities
        </Button>
      </div>

      <div className="space-y-4">
        {superAdminData.recentActivities.map((activity) => {
          const IconComponent = activity.icon;
          return (
            <div key={activity.id} className="flex items-start gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`p-2 rounded-lg ${
                activity.color === 'green' ? 'bg-green-100 text-green-600' :
                activity.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                activity.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
              }`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{activity.title}</p>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  {activity.company && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{activity.company}</span>
                    </div>
                  )}
                  {activity.station && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{activity.station}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );

  const renderPurchasesOverview = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Purchases Overview</h3>
          <p className="text-gray-600">Recent fuel purchases across all companies</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{superAdminData.purchases.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{superAdminData.purchases.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {superAdminData.purchases.recent.map((purchase) => (
          <div key={purchase.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{purchase.product} Purchase</div>
                <div className="text-sm text-gray-600">{purchase.company} • {purchase.supplier}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {purchase.quantity.toLocaleString()}L • KSH {(purchase.value / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={purchase.status === 'completed' ? 'success' : 'warning'}>
                {purchase.status}
              </Badge>
              <div className="text-sm text-gray-600 mt-1">{purchase.date}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
                <p className="text-gray-600">
                  Complete overview of all companies, stations, and system performance
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">
              System Health: <span className="text-green-600">{metrics.systemHealth}%</span>
            </p>
            <p className="text-gray-600">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* System Health Alert */}
        <Alert variant="info" className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="font-semibold">System Operating Normally</h4>
                <p className="text-sm">All services are running smoothly. Last incident: 7 days ago</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              View Logs
            </Button>
          </div>
        </Alert>
      </div>

      {/* Tabs */}
      <Card className="mb-6">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tab value="overview">System Overview</Tab>
          <Tab value="companies">Companies</Tab>
          <Tab value="stations">All Stations</Tab>
          <Tab value="sales">Sales Analytics</Tab>
          <Tab value="activities">Activities</Tab>
          <Tab value="purchases">Purchases</Tab>
        </Tabs>
      </Card>

      {/* Main Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {renderSystemStats()}
          {renderGeolocationMap()}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              {renderSalesPerformance()}
            </div>
            <div>
              {renderRecentActivities()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'companies' && (
        <div className="space-y-6">
          {renderCompaniesOverview()}
          {renderGeolocationMap()}
        </div>
      )}

      {activeTab === 'stations' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">All Stations</h3>
                <p className="text-gray-600">Complete list of all stations across all companies</p>
              </div>
              <div className="flex items-center gap-2">
                <SearchInput placeholder="Search stations..." />
                <FilterDropdown
                  options={[
                    { label: 'All Companies', value: 'all' },
                    ...superAdminData.companies.map(c => ({ label: c.name, value: c.id }))
                  ]}
                  onFilter={(value) => console.log('Filter company:', value)}
                />
              </div>
            </div>

            <div className="overflow-hidden">
              <Table
                columns={[
                  { key: 'station', label: 'Station Name' },
                  { key: 'company', label: 'Company' },
                  { key: 'status', label: 'Status' },
                  { key: 'sales', label: 'Today Sales' },
                  { key: 'utilization', label: 'Utilization' },
                  { key: 'lastActivity', label: 'Last Activity' }
                ]}
                data={superAdminData.allStations.map(station => ({
                  station: (
                    <div className="font-medium text-gray-900">{station.name}</div>
                  ),
                  company: (
                    <div className="text-gray-600">{station.companyName}</div>
                  ),
                  status: (
                    <Badge variant={station.status === 'active' ? 'success' : 'warning'}>
                      {station.status}
                    </Badge>
                  ),
                  sales: (
                    <div>
                      <div className="font-semibold">KSH {station.sales.today.toLocaleString()}</div>
                      <div className={`text-xs flex items-center gap-1 ${
                        station.sales.trend >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {station.sales.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(station.sales.trend)}%
                      </div>
                    </div>
                  ),
                  utilization: (
                    <div className="w-24">
                      <Progress value={station.utilization} className="mb-1" />
                      <div className="text-xs text-gray-600 text-center">{station.utilization}%</div>
                    </div>
                  ),
                  lastActivity: (
                    <div className="text-sm text-gray-600">
                      {new Date(station.lastActivity).toLocaleTimeString()}
                    </div>
                  )
                }))}
              />
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="space-y-6">
          {renderSystemStats()}
          {renderSalesPerformance()}
          {renderPurchasesOverview()}
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="space-y-6">
          {renderRecentActivities()}
        </div>
      )}

      {activeTab === 'purchases' && (
        <div className="space-y-6">
          {renderPurchasesOverview()}
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboardOverView;