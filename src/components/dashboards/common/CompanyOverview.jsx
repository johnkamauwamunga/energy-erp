import React from 'react';
import { 
  DollarSign, Building2, MapPin, Truck, 
  CheckCircle, Clock, AlertTriangle, Plus, FileText, Users
} from 'lucide-react';
import { StatsCard, Button } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';

const CompanyOverview = () => {
  const { state } = useApp();
  
  const totalSales = state.sales.dailyAggregation?.['2024-01-25']?.companyTotal || 3052450;
  const activeStations = state.serviceStations.filter(s => s.status === 'active').length;
  const totalIslands = Object.keys(state.islands).length;
  const todayOffloads = state.fuelManagement.offloadLogs?.length || 12;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Company Dashboard</h3>
        <p className="text-gray-600">Real-time overview of all operations</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Today's Sales"
          value={`KSH ${(totalSales / 1000000).toFixed(1)}M`}
          icon={DollarSign}
          color="green"
          trend={8.7}
          subValue="All stations"
        />
        <StatsCard
          title="Active Stations"
          value={activeStations}
          icon={Building2}
          color="blue"
          subValue="Operational"
        />
        <StatsCard
          title="Active Islands"
          value={totalIslands}
          icon={MapPin}
          color="purple"
          subValue="Serving customers"
        />
        <StatsCard
          title="Fuel Offloads"
          value={todayOffloads}
          icon={Truck}
          color="orange"
          subValue="Today"
        />
      </div>

      {/* Station Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900">Station Performance</h4>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {state.serviceStations.map((station, index) => (
                <div key={station.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{station.name}</div>
                      <div className="text-sm text-gray-600">{station.location}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      KSH {(state.sales.realTimeSales?.[station.id]?.todayTotal || 433250).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Today's Sales</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900">Recent Activity</h4>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Fuel offload completed</div>
                  <div className="text-xs text-gray-600">Joska Station - 9,995L Super Petrol</div>
                </div>
                <div className="text-xs text-gray-500">2 min ago</div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-blue-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Shift started</div>
                  <div className="text-xs text-gray-600">Kitengela Station - Morning shift</div>
                </div>
                <div className="text-xs text-gray-500">15 min ago</div>
              </div>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Variance detected</div>
                  <div className="text-xs text-gray-600">Rongai Station - Requires approval</div>
                </div>
                <div className="text-xs text-gray-500">1 hour ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Quick Actions</h4>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button icon={Plus} variant="cosmic" className="justify-start h-16">
              Create New Station
            </Button>
            <Button icon={FileText} variant="secondary" className="justify-start h-16">
              Generate Daily Report
            </Button>
            <Button icon={Users} variant="secondary" className="justify-start h-16">
              Manage Staff
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyOverview;