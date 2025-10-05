import React, { useState, useEffect } from 'react';
import { 
  Card, Button, Alert, Badge, StatsCard, LoadingSpinner,
  Tabs, Tab, Progress, Modal
} from '../../ui';
import { 
  Building2, MapPin, Zap, Fuel, Package, Users, 
  DollarSign, Clock, AlertTriangle, CheckCircle, 
  Truck, Plus, FileText, BarChart3, TrendingUp, 
  TrendingDown, Eye, PlayCircle, StopCircle, 
  ShoppingCart, Warehouse, Activity, RefreshCw
} from 'lucide-react';

const StationDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);

  // Mock station data
  const stationData = {
    id: 'station-1',
    name: 'Main Station Nairobi',
    location: 'Nairobi CBD',
    status: 'active',
    currentShift: {
      id: 'shift-123',
      number: 1,
      status: 'open', // 'open', 'closed', 'none'
      startTime: '2024-01-25T06:00:00Z',
      supervisor: 'John Doe',
      attendants: 4,
      islands: 3
    },
    pendingOffloads: [
      {
        id: 'purchase-123',
        purchaseNumber: 'PO-2024-001',
        supplier: 'XYZ Fuel Suppliers',
        product: 'Diesel',
        quantity: 10000,
        expectedDelivery: '2024-01-25T14:00:00Z',
        status: 'in-transit'
      }
    ],
    recentActivities: [
      {
        id: 1,
        type: 'shift_opened',
        title: 'Morning Shift Started',
        description: 'Shift #1 started by John Doe',
        timestamp: '2024-01-25T06:00:00Z',
        icon: PlayCircle,
        color: 'green'
      },
      {
        id: 2,
        type: 'fuel_low',
        title: 'Low Fuel Alert',
        description: 'Diesel tank at 15% capacity',
        timestamp: '2024-01-25T08:30:00Z',
        icon: AlertTriangle,
        color: 'orange'
      },
      {
        id: 3,
        type: 'pump_maintenance',
        title: 'Pump Maintenance',
        description: 'Pump A2 scheduled for maintenance',
        timestamp: '2024-01-25T09:15:00Z',
        icon: Zap,
        color: 'blue'
      },
      {
        id: 4,
        type: 'sales_peak',
        title: 'Sales Peak',
        description: 'Recorded highest hourly sales',
        timestamp: '2024-01-25T10:00:00Z',
        icon: TrendingUp,
        color: 'green'
      }
    ],
    assets: {
      islands: 4,
      activeIslands: 3,
      pumps: 12,
      activePumps: 10,
      tanks: 6,
      warehouses: 2,
      activeWarehouses: 2
    },
    sales: {
      today: 433250,
      yesterday: 389500,
      trend: 11.2,
      hourly: [12500, 18700, 23400, 19800, 26700, 31200, 28900, 32500, 29800, 26700, 22300, 18900],
      products: [
        { name: 'Diesel', sales: 245000, trend: 8.5 },
        { name: 'Super Petrol', sales: 156000, trend: 15.2 },
        { name: 'Kerosene', sales: 32250, trend: -2.1 }
      ]
    },
    variances: {
      fuel: -45,
      cash: 1250,
      inventory: -320,
      status: 'pending' // 'pending', 'resolved', 'none'
    }
  };

  // Check if shift needs to be opened
  useEffect(() => {
    // Simulate API call to check current shift
    setLoading(true);
    setTimeout(() => {
      setCurrentShift(stationData.currentShift);
      setLoading(false);
    }, 1000);
  }, []);

  const handleOpenShift = () => {
    setShowShiftModal(true);
  };

  const handleCloseShift = () => {
    setLoading(true);
    // Simulate API call to close shift
    setTimeout(() => {
      setCurrentShift({ ...currentShift, status: 'closed' });
      setLoading(false);
    }, 1500);
  };

  const handleStartOffload = (purchaseId) => {
    // This would open the offload wizard
    console.log('Start offload for:', purchaseId);
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const renderAlertSection = () => {
    const alerts = [];

    // Shift status alert
    if (!currentShift || currentShift.status === 'none') {
      alerts.push({
        type: 'warning',
        icon: Clock,
        title: 'No Active Shift',
        message: 'Start a new shift to begin operations',
        action: {
          label: 'Open Shift',
          onClick: handleOpenShift,
          variant: 'cosmic'
        }
      });
    } else if (currentShift.status === 'open') {
      alerts.push({
        type: 'info',
        icon: Activity,
        title: `Shift #${currentShift.number} Active`,
        message: `Started at ${new Date(currentShift.startTime).toLocaleTimeString()} by ${currentShift.supervisor}`,
        action: {
          label: 'Close Shift',
          onClick: handleCloseShift,
          variant: 'outline'
        }
      });
    }

    // Pending offloads alert
    if (stationData.pendingOffloads.length > 0) {
      stationData.pendingOffloads.forEach(offload => {
        alerts.push({
          type: 'success',
          icon: Truck,
          title: 'Fuel Delivery Expected',
          message: `${offload.quantity}L of ${offload.product} from ${offload.supplier}`,
          action: {
            label: 'Start Offload',
            onClick: () => handleStartOffload(offload.id),
            variant: 'cosmic'
          }
        });
      });
    }

    // Variance alert (if shift closed)
    if (currentShift?.status === 'closed' && stationData.variances.status !== 'none') {
      const { fuel, cash, inventory } = stationData.variances;
      alerts.push({
        type: 'error',
        icon: AlertTriangle,
        title: 'Shift Variances Detected',
        message: `Fuel: ${fuel}L | Cash: KSH ${cash} | Inventory: ${inventory} units`,
        action: {
          label: 'Review Details',
          onClick: () => setActiveTab('variances'),
          variant: 'outline'
        }
      });
    }

    // Low stock alerts
    if (stationData.recentActivities.find(a => a.type === 'fuel_low')) {
      alerts.push({
        type: 'warning',
        icon: Fuel,
        title: 'Low Fuel Stock',
        message: 'Some tanks are below 20% capacity',
        action: {
          label: 'View Tanks',
          onClick: () => setActiveTab('inventory'),
          variant: 'outline'
        }
      });
    }

    return alerts.map((alert, index) => (
      <Alert key={index} variant={alert.type} className="mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <alert.icon className={`w-5 h-5 mt-0.5 ${
              alert.type === 'success' ? 'text-green-600' :
              alert.type === 'warning' ? 'text-orange-600' :
              alert.type === 'error' ? 'text-red-600' : 'text-blue-600'
            }`} />
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{alert.title}</h4>
              <p className="text-sm">{alert.message}</p>
            </div>
          </div>
          {alert.action && (
            <Button
              variant={alert.action.variant}
              size="sm"
              onClick={alert.action.onClick}
              className="ml-4"
            >
              {alert.action.label}
            </Button>
          )}
        </div>
      </Alert>
    ));
  };

  const renderStatsCards = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
      <StatsCard
        title="Active Islands"
        value={stationData.assets.activeIslands}
        total={stationData.assets.islands}
        icon={MapPin}
        color="blue"
        trend={0}
      />
      <StatsCard
        title="Active Pumps"
        value={stationData.assets.activePumps}
        total={stationData.assets.pumps}
        icon={Zap}
        color="green"
        trend={2.1}
      />
      <StatsCard
        title="Fuel Tanks"
        value={stationData.assets.tanks}
        icon={Fuel}
        color="orange"
      />
      <StatsCard
        title="Warehouses"
        value={stationData.assets.activeWarehouses}
        total={stationData.assets.warehouses}
        icon={Warehouse}
        color="purple"
      />
      <StatsCard
        title="Today's Sales"
        value={`KSH ${(stationData.sales.today / 1000).toFixed(0)}K`}
        icon={DollarSign}
        color="green"
        trend={stationData.sales.trend}
      />
      <StatsCard
        title="Staff On Duty"
        value={currentShift?.attendants || 0}
        icon={Users}
        color="indigo"
      />
    </div>
  );

  const renderSalesGraph = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sales Performance</h3>
          <p className="text-gray-600">Today's hourly sales trend</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {stationData.sales.trend}%
          </Badge>
          <Button variant="outline" size="sm" icon={RefreshCw}>
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Simple bar chart representation */}
      <div className="h-48 flex items-end justify-between gap-2">
        {stationData.sales.hourly.map((amount, hour) => {
          const percentage = (amount / Math.max(...stationData.sales.hourly)) * 100;
          const isPeak = amount === Math.max(...stationData.sales.hourly);
          
          return (
            <div key={hour} className="flex flex-col items-center flex-1">
              <div
                className={`w-full rounded-t-lg transition-all duration-300 ${
                  isPeak ? 'bg-gradient-to-t from-green-500 to-green-400' : 'bg-gradient-to-t from-blue-500 to-blue-400'
                }`}
                style={{ height: `${percentage}%` }}
              />
              <span className="text-xs text-gray-600 mt-2">{hour + 6}:00</span>
              <span className="text-xs font-medium text-gray-900 mt-1">
                KSH {(amount / 1000).toFixed(0)}K
              </span>
            </div>
          );
        })}
      </div>

      {/* Product breakdown */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {stationData.sales.products.map((product, index) => (
          <div key={product.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : 'bg-orange-500'
              }`} />
              <div>
                <p className="font-medium text-gray-900">{product.name}</p>
                <p className="text-sm text-gray-600">KSH {(product.sales / 1000).toFixed(0)}K</p>
              </div>
            </div>
            <Badge variant={product.trend >= 0 ? "success" : "error"} className="flex items-center gap-1">
              {product.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(product.trend)}%
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderRecentActivities = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
          <p className="text-gray-600">Station operations and alerts</p>
        </div>
        <Button variant="outline" size="sm" icon={Eye}>
          View All
        </Button>
      </div>

      <div className="space-y-4">
        {stationData.recentActivities.map((activity) => {
          const IconComponent = activity.icon;
          return (
            <div key={activity.id} className="flex items-start gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`p-2 rounded-lg ${
                activity.color === 'green' ? 'bg-green-100 text-green-600' :
                activity.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                activity.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{activity.title}</p>
                  <span className="text-xs text-gray-500">{getTimeAgo(activity.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );

  const renderQuickActions = () => (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <p className="text-gray-600">Frequently used station operations</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button 
          variant="secondary" 
          icon={Plus}
          className="h-16 flex-col justify-center"
          onClick={handleOpenShift}
        >
          <span>New Shift</span>
          <span className="text-xs text-gray-500 font-normal mt-1">Start operations</span>
        </Button>

        <Button 
          variant="secondary" 
          icon={ShoppingCart}
          className="h-16 flex-col justify-center"
        >
          <span>Record Sale</span>
          <span className="text-xs text-gray-500 font-normal mt-1">Manual entry</span>
        </Button>

        <Button 
          variant="secondary" 
          icon={FileText}
          className="h-16 flex-col justify-center"
        >
          <span>Daily Report</span>
          <span className="text-xs text-gray-500 font-normal mt-1">Generate</span>
        </Button>

        <Button 
          variant="secondary" 
          icon={BarChart3}
          className="h-16 flex-col justify-center"
        >
          <span>Analytics</span>
          <span className="text-xs text-gray-500 font-normal mt-1">View insights</span>
        </Button>
      </div>
    </Card>
  );

  const renderVarianceDetails = () => (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Shift Variances</h3>
        <p className="text-gray-600">Last closed shift discrepancies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Fuel className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-gray-900">Fuel Variance</span>
          </div>
          <p className={`text-2xl font-bold ${
            stationData.variances.fuel === 0 ? 'text-gray-600' :
            stationData.variances.fuel > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {stationData.variances.fuel}L
          </p>
          <Progress 
            value={Math.abs(stationData.variances.fuel)} 
            max={100}
            className="mt-2"
            color={stationData.variances.fuel >= 0 ? 'green' : 'red'}
          />
        </div>

        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-gray-900">Cash Variance</span>
          </div>
          <p className={`text-2xl font-bold ${
            stationData.variances.cash === 0 ? 'text-gray-600' :
            stationData.variances.cash > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            KSH {stationData.variances.cash}
          </p>
          <Progress 
            value={Math.abs(stationData.variances.cash)} 
            max={5000}
            className="mt-2"
            color={stationData.variances.cash >= 0 ? 'green' : 'red'}
          />
        </div>

        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Package className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-gray-900">Inventory Variance</span>
          </div>
          <p className={`text-2xl font-bold ${
            stationData.variances.inventory === 0 ? 'text-gray-600' :
            stationData.variances.inventory > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {stationData.variances.inventory} units
          </p>
          <Progress 
            value={Math.abs(stationData.variances.inventory)} 
            max={500}
            className="mt-2"
            color={stationData.variances.inventory >= 0 ? 'green' : 'red'}
          />
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-1">Action Required</h4>
            <p className="text-yellow-800 text-sm">
              Please review and resolve these variances before starting the next shift.
              Unexplained variances may require management approval.
            </p>
          </div>
        </div>
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
                <h1 className="text-3xl font-bold text-gray-900">{stationData.name}</h1>
                <p className="text-gray-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {stationData.location}
                  <Badge variant="success" className="ml-2">
                    Operational
                  </Badge>
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

        {/* Alert Section */}
        {renderAlertSection()}
      </div>

      {/* Tabs */}
      <Card className="mb-6">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tab value="overview">
            Overview
          </Tab>
          <Tab value="sales">
            Sales Analytics
          </Tab>
          <Tab value="inventory">
            Inventory
          </Tab>
          <Tab value="variances">
            Variances
          </Tab>
          <Tab value="activities">
            Activities
          </Tab>
        </Tabs>
      </Card>

      {/* Main Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {renderStatsCards()}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              {renderSalesGraph()}
            </div>
            <div>
              {renderRecentActivities()}
            </div>
          </div>
          {renderQuickActions()}
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="space-y-6">
          {renderStatsCards()}
          {renderSalesGraph()}
        </div>
      )}

      {activeTab === 'variances' && (
        <div className="space-y-6">
          {renderVarianceDetails()}
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="space-y-6">
          {renderRecentActivities()}
          {renderQuickActions()}
        </div>
      )}

      {/* Shift Management Modal */}
      <Modal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        title={currentShift ? "Close Current Shift" : "Open New Shift"}
        size="md"
      >
        <div className="space-y-6">
          {currentShift ? (
            <div className="text-center">
              <StopCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Close Shift #{currentShift.number}
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to close the current shift? This will trigger variance calculations and generate shift reports.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setShowShiftModal(false)}>
                  Cancel
                </Button>
                <Button variant="cosmic" onClick={handleCloseShift} loading={loading}>
                  Close Shift
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <PlayCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Start New Shift
              </h3>
              <p className="text-gray-600 mb-6">
                Begin a new operational shift. This will initialize all meters and prepare the station for daily operations.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setShowShiftModal(false)}>
                  Cancel
                </Button>
                <Button variant="cosmic" onClick={handleOpenShift} loading={loading}>
                  Start Shift
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StationDashboard;