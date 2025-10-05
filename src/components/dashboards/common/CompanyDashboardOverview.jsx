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
  Modal
} from '../../ui';
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
  Warehouse,
  Zap
} from 'lucide-react';

const CompanyDashboardOverview = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);

  // Mock company data - in real app, this would come from API/context
  const companyData = {
    id: 'company-1',
    name: 'Prime Energy Kenya Ltd',
    totalStations: 24,
    activeStations: 18,
    totalStaff: 156,
    activeStaff: 142,
    suppliers: 8,
    products: 12,
    
    // Key metrics
    metrics: {
      todaySales: 3052450,
      yesterdaySales: 2789100,
      salesTrend: 9.4,
      monthlyTarget: 75000000,
      monthlyProgress: 68,
      activeSuppliers: 6,
      totalProducts: ['Super Petrol', 'Diesel', 'Kerosene', 'LPG', 'Lubricants'],
      stationUtilization: 75
    },

    // Sales data for charts
    sales: {
      daily: [12500, 18700, 23400, 19800, 26700, 31200, 28900, 32500, 29800, 26700, 22300, 18900],
      monthly: [28.5, 31.2, 29.8, 32.1, 35.4, 38.9, 42.1, 45.6, 48.2, 51.1, 55.3, 58.7],
      projections: [62.1, 65.8, 68.9, 72.4, 75.0, 78.2, 81.5, 85.1, 88.7, 92.3, 95.8, 99.5],
      byProduct: [
        { name: 'Super Petrol', sales: 1450000, trend: 12.5, marketShare: 48 },
        { name: 'Diesel', sales: 1250000, trend: 8.2, marketShare: 41 },
        { name: 'Kerosene', sales: 252450, trend: -3.1, marketShare: 8 },
        { name: 'LPG', sales: 100000, trend: 25.7, marketShare: 3 }
      ]
    },

    // Recent activities
    recentActivities: [
      {
        id: 1,
        type: 'offload_completed',
        title: 'Fuel Offload Completed',
        description: 'Joska Station received 45,000L of Super Petrol from Vivo Energy',
        station: 'Joska Station',
        timestamp: '2024-01-25T08:00:00Z',
        icon: Truck,
        color: 'green'
      },
      {
        id: 2,
        type: 'shift_opened',
        title: 'Morning Shift Started',
        description: 'Kitengela Station opened morning shift with 6 attendants',
        station: 'Kitengela Station',
        timestamp: '2024-01-25T06:00:00Z',
        icon: Clock,
        color: 'blue'
      },
      {
        id: 3,
        type: 'variance_detected',
        title: 'Variance Detected',
        description: 'Rongai Station reported fuel variance of -45L',
        station: 'Rongai Station',
        timestamp: '2024-01-25T07:30:00Z',
        icon: AlertTriangle,
        color: 'orange'
      },
      {
        id: 4,
        type: 'maintenance_completed',
        title: 'Maintenance Completed',
        description: 'Pump maintenance completed at Nairobi CBD Station',
        station: 'Nairobi CBD Station',
        timestamp: '2024-01-25T09:15:00Z',
        icon: CheckCircle,
        color: 'purple'
      }
    ],

    // Expected activities
    expectedActivities: [
      {
        id: 1,
        type: 'fuel_delivery',
        title: 'Scheduled Fuel Delivery',
        description: 'Expected delivery of 50,000L Diesel from Total Energies',
        station: 'Karen Station',
        scheduledTime: '2024-01-25T14:00:00Z',
        priority: 'high',
        icon: Truck
      },
      {
        id: 2,
        type: 'shift_close',
        title: 'Shift Closing',
        description: 'Evening shift closing and reporting',
        station: 'All Stations',
        scheduledTime: '2024-01-25T22:00:00Z',
        priority: 'medium',
        icon: Clock
      },
      {
        id: 3,
        type: 'maintenance',
        title: 'Scheduled Maintenance',
        description: 'Tank calibration at Thika Road Station',
        station: 'Thika Road Station',
        scheduledTime: '2024-01-26T08:00:00Z',
        priority: 'medium',
        icon: Zap
      }
    ],

    // Planner tasks
    plannerTasks: [
      {
        id: 1,
        title: 'Purchase Fuel from Vivo Energy',
        description: 'Negotiate and purchase 200,000L of Super Petrol',
        dueDate: '2024-01-26',
        priority: 'high',
        assignedTo: 'Procurement Team',
        status: 'pending'
      },
      {
        id: 2,
        title: 'Update Station Equipment',
        description: 'Install new POS systems at 5 stations',
        dueDate: '2024-01-28',
        priority: 'medium',
        assignedTo: 'IT Department',
        status: 'in-progress'
      },
      {
        id: 3,
        title: 'Assign New Users',
        description: 'Create accounts for 15 new staff members',
        dueDate: '2024-01-27',
        priority: 'medium',
        assignedTo: 'HR Department',
        status: 'pending'
      },
      {
        id: 4,
        title: 'Monthly Performance Review',
        description: 'Review January performance metrics',
        dueDate: '2024-02-01',
        priority: 'low',
        assignedTo: 'Management',
        status: 'pending'
      }
    ],

    // Variances across stations
    variances: {
      total: 8,
      critical: 2,
      stations: [
        {
          id: 'station-1',
          name: 'Rongai Station',
          fuelVariance: -45,
          cashVariance: 1250,
          inventoryVariance: -320,
          status: 'pending',
          shift: 'Morning Shift'
        },
        {
          id: 'station-2',
          name: 'Kitengela Station',
          fuelVariance: -12,
          cashVariance: -450,
          inventoryVariance: 0,
          status: 'resolved',
          shift: 'Night Shift'
        },
        {
          id: 'station-3',
          name: 'Joska Station',
          fuelVariance: 23,
          cashVariance: 890,
          inventoryVariance: -150,
          status: 'pending',
          shift: 'Morning Shift'
        }
      ]
    },

    // Station status
    stations: [
      { id: 1, name: 'Nairobi CBD', status: 'active', sales: 450230, staff: 12, utilization: 85 },
      { id: 2, name: 'Westlands', status: 'active', sales: 389450, staff: 10, utilization: 78 },
      { id: 3, name: 'Karen', status: 'active', sales: 325670, staff: 8, utilization: 72 },
      { id: 4, name: 'Rongai', status: 'active', sales: 298450, staff: 7, utilization: 68 },
      { id: 5, name: 'Kitengela', status: 'active', sales: 275890, staff: 6, utilization: 65 },
      { id: 6, name: 'Thika Road', status: 'maintenance', sales: 0, staff: 0, utilization: 0 },
      { id: 7, name: 'Mombasa Road', status: 'active', sales: 312560, staff: 9, utilization: 75 },
      { id: 8, name: 'Juja', status: 'active', sales: 267890, staff: 6, utilization: 62 }
    ]
  };

  // Calculate derived metrics
  const metrics = useMemo(() => ({
    monthlySales: companyData.sales.monthly[new Date().getMonth()],
    salesProgress: (companyData.metrics.todaySales / companyData.metrics.monthlyTarget) * 100,
    stationEfficiency: (companyData.metrics.activeStations / companyData.totalStations) * 100,
    staffEfficiency: (companyData.metrics.activeStaff / companyData.totalStaff) * 100
  }), [companyData]);

  const renderStatsCards = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
      <StatsCard
        title="Active Suppliers"
        value={companyData.metrics.activeSuppliers}
        total={companyData.suppliers}
        icon={Truck}
        color="blue"
        trend={2}
      />
      <StatsCard
        title="Products"
        value={companyData.metrics.totalProducts.length}
        total={companyData.products}
        icon={Package}
        color="green"
      />
      <StatsCard
        title="Active Stations"
        value={companyData.metrics.activeStations}
        total={companyData.totalStations}
        icon={Building2}
        color="purple"
        trend={5.2}
      />
      <StatsCard
        title="Active Staff"
        value={companyData.metrics.activeStaff}
        total={companyData.totalStaff}
        icon={Users}
        color="orange"
      />
      <StatsCard
        title="Today's Sales"
        value={`KSH ${(companyData.metrics.todaySales / 1000000).toFixed(1)}M`}
        icon={DollarSign}
        color="green"
        trend={companyData.metrics.salesTrend}
      />
      <StatsCard
        title="Station Utilization"
        value={`${companyData.metrics.stationUtilization}%`}
        icon={Activity}
        color="indigo"
        trend={3.1}
      />
    </div>
  );

  const renderSalesGraph = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sales Performance & Projections</h3>
          <p className="text-gray-600">Monthly sales trend and future projections</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {companyData.metrics.salesTrend}%
          </Badge>
          <Button variant="outline" size="sm" icon={RefreshCw}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Combined actual vs projection chart */}
      <div className="h-64 flex items-end justify-between gap-1 mb-6">
        {companyData.sales.monthly.map((actual, index) => {
          const projection = companyData.sales.projections[index];
          const maxValue = Math.max(...companyData.sales.projections);
          const actualPercentage = (actual / maxValue) * 100;
          const projectionPercentage = (projection / maxValue) * 100;
          const isCurrentMonth = index === new Date().getMonth();
          
          return (
            <div key={index} className="flex flex-col items-center flex-1 relative">
              {/* Projection bar (background) */}
              <div
                className="w-full bg-gray-200 rounded-t-lg opacity-50"
                style={{ height: `${projectionPercentage}%` }}
              />
              {/* Actual sales bar */}
              <div
                className={`w-full rounded-t-lg absolute bottom-0 transition-all duration-300 ${
                  isCurrentMonth 
                    ? 'bg-gradient-to-t from-green-500 to-green-400' 
                    : 'bg-gradient-to-t from-blue-500 to-blue-400'
                }`}
                style={{ height: `${actualPercentage}%` }}
              />
              <span className="text-xs text-gray-600 mt-2">
                {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][index]}
              </span>
              <span className="text-xs font-medium text-gray-900 mt-1">
                KSH {actual}M
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-gray-600">Actual Sales</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-300 rounded"></div>
          <span className="text-gray-600">Projections</span>
        </div>
      </div>
    </Card>
  );

  const renderActivities = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Activities */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
            <p className="text-gray-600">Latest operations across all stations</p>
          </div>
          <Button variant="outline" size="sm" icon={Eye}>
            View All
          </Button>
        </div>

        <div className="space-y-4">
          {companyData.recentActivities.map((activity) => {
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
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{activity.station}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Expected Activities */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Expected Activities</h3>
            <p className="text-gray-600">Scheduled operations and deliveries</p>
          </div>
          <Button variant="outline" size="sm" icon={Calendar}>
            Schedule
          </Button>
        </div>

        <div className="space-y-4">
          {companyData.expectedActivities.map((activity) => {
            const IconComponent = activity.icon;
            return (
              <div key={activity.id} className="flex items-start gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`p-2 rounded-lg ${
                  activity.priority === 'high' ? 'bg-red-100 text-red-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <Badge variant={activity.priority === 'high' ? 'error' : 'secondary'}>
                      {activity.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{activity.station}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.scheduledTime).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  const renderPlanner = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Operational Planner</h3>
          <p className="text-gray-600">Tasks and programs for the company</p>
        </div>
        <Button variant="cosmic" size="sm" icon={Plus}>
          Add Task
        </Button>
      </div>

      <div className="space-y-4">
        {companyData.plannerTasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-4 flex-1">
              <div className={`w-2 h-2 mt-2 rounded-full ${
                task.priority === 'high' ? 'bg-red-500' :
                task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                  <span>Assigned to: {task.assignedTo}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={
                task.status === 'completed' ? 'success' :
                task.status === 'in-progress' ? 'warning' : 'secondary'
              }>
                {task.status}
              </Badge>
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderVariances = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Variance Monitoring</h3>
          <p className="text-gray-600">Track discrepancies across all stations</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="error">
            {companyData.variances.critical} Critical
          </Badge>
          <Badge variant="secondary">
            {companyData.variances.total} Total
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {companyData.variances.stations.map((station) => (
          <div key={station.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{station.name}</h4>
              <Badge variant={station.status === 'resolved' ? 'success' : 'error'}>
                {station.status}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Fuel className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium">Fuel</span>
                </div>
                <p className={`text-lg font-bold ${
                  station.fuelVariance === 0 ? 'text-gray-600' :
                  station.fuelVariance > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {station.fuelVariance}L
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Cash</span>
                </div>
                <p className={`text-lg font-bold ${
                  station.cashVariance === 0 ? 'text-gray-600' :
                  station.cashVariance > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  KSH {station.cashVariance}
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Package className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">Inventory</span>
                </div>
                <p className={`text-lg font-bold ${
                  station.inventoryVariance === 0 ? 'text-gray-600' :
                  station.inventoryVariance > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {station.inventoryVariance} units
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Shift: {station.shift}</span>
              <Button variant="outline" size="sm">
                Investigate
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderStationsOverview = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">All Stations Overview</h3>
          <p className="text-gray-600">Real-time status of all service stations</p>
        </div>
        <Button variant="outline" size="sm" icon={Eye}>
          View Map
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {companyData.stations.map((station) => (
          <div
            key={station.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
              station.status === 'active' 
                ? 'border-green-200 bg-green-50' 
                : 'border-orange-200 bg-orange-50'
            }`}
            onClick={() => setSelectedStation(station)}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{station.name}</h4>
              <Badge variant={station.status === 'active' ? 'success' : 'warning'}>
                {station.status}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sales:</span>
                <span className="font-medium">KSH {station.sales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Staff:</span>
                <span className="font-medium">{station.staff}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Utilization:</span>
                <span className="font-medium">{station.utilization}%</span>
              </div>
            </div>

            <Progress 
              value={station.utilization} 
              className="mt-3"
              color={station.utilization > 80 ? 'green' : station.utilization > 60 ? 'blue' : 'orange'}
            />
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{companyData.name}</h1>
                <p className="text-gray-600">
                  Comprehensive overview of company operations and performance
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-gray-600">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Monthly Progress */}
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Monthly Target Progress</h3>
              <p className="text-gray-600">
                KSH {companyData.metrics.todaySales.toLocaleString()} of KSH {companyData.metrics.monthlyTarget.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{metrics.monthlySales}M</p>
              <p className="text-sm text-gray-600">Current Month Sales</p>
            </div>
          </div>
          <Progress 
            value={metrics.monthlySales} 
            max={100}
            className="mt-3"
            color="blue"
          />
        </Card>
      </div>

      {/* Tabs */}
      <Card className="mb-6">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tab value="overview">Company Overview</Tab>
          <Tab value="stations">All Stations</Tab>
          <Tab value="variances">Variances</Tab>
          <Tab value="planner">Operational Planner</Tab>
          <Tab value="analytics">Analytics</Tab>
        </Tabs>
      </Card>

      {/* Main Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {renderStatsCards()}
          {renderSalesGraph()}
          {renderActivities()}
          {renderPlanner()}
        </div>
      )}

      {activeTab === 'stations' && (
        <div className="space-y-6">
          {renderStationsOverview()}
          {renderActivities()}
        </div>
      )}

      {activeTab === 'variances' && (
        <div className="space-y-6">
          {renderVariances()}
          {renderStationsOverview()}
        </div>
      )}

      {activeTab === 'planner' && (
        <div className="space-y-6">
          {renderPlanner()}
          {renderActivities()}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {renderStatsCards()}
          {renderSalesGraph()}
          {renderVariances()}
        </div>
      )}

      {/* Station Detail Modal */}
      <Modal
        isOpen={!!selectedStation}
        onClose={() => setSelectedStation(null)}
        title={selectedStation?.name}
        size="lg"
      >
        {selectedStation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Status</p>
                <Badge variant={selectedStation.status === 'active' ? 'success' : 'warning'}>
                  {selectedStation.status}
                </Badge>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Today's Sales</p>
                <p className="font-semibold">KSH {selectedStation.sales.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Staff Count</p>
                <p className="font-semibold">{selectedStation.staff}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Utilization</p>
                <p className="font-semibold">{selectedStation.utilization}%</p>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button variant="cosmic" className="flex-1">
                View Details
              </Button>
              <Button variant="outline" className="flex-1">
                Generate Report
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CompanyDashboardOverview;