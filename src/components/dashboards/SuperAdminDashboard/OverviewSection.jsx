import React from 'react';
import { Building2, MapPin, Server, Activity, Eye } from 'lucide-react';
import { StatsCard, Button } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';

const OverviewSection = () => {
  const { state } = useApp();
  
  return (
    <div className="p-6">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">System Overview</h3>
        <p className="text-gray-600">Monitor all companies and system performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Companies"
          value={state.companies.length}
          icon={Building2}
          color="blue"
          trend={15.2}
        />
        <StatsCard
          title="Active Stations"
          value={state.serviceStations.length}
          icon={MapPin}
          color="green"
          trend={8.7}
        />
        <StatsCard
          title="System Uptime"
          value="99.97%"
          icon={Server}
          color="purple"
        />
        <StatsCard
          title="Daily Transactions"
          value="45.2K"
          icon={Activity}
          color="orange"
          trend={12.3}
        />
      </div>

      {/* Companies Overview */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Companies Overview</h4>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {state.companies.map(company => (
              <div 
                key={company.id} 
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900">{company.name}</h5>
                    <p className="text-sm text-gray-600">{company.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">{company.stationsCount}</div>
                    <div className="text-xs text-gray-500">Stations</div>
                  </div>
                  <div className="text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      company.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {company.status}
                    </span>
                  </div>
                  <Button size="sm" variant="secondary" icon={Eye}>
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewSection;