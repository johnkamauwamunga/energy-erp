import React from 'react';
import { 
  Building2, MapPin, Server, Activity, Eye,
  DollarSign, Truck, Users, CheckCircle, Clock,
  AlertTriangle, Plus, FileText, Fuel, User, 
  Layers, Shuffle, BarChart2, Clipboard, Settings
} from 'lucide-react';
import { StatsCard, Button } from '../../ui';
import { useApp } from '../../../context/AppContext';

const DashboardOverview = () => {
  const { state } = useApp();
  const { role } = state.currentUser;

  // Common stats data
  const commonStats = {
    super_admin: [
      { title: "Total Companies", value: state.companies.length, icon: Building2, color: "blue", trend: 15.2 },
      { title: "Active Stations", value: state.serviceStations.length, icon: MapPin, color: "green", trend: 8.7 },
      { title: "System Uptime", value: "99.97%", icon: Server, color: "purple" },
      { title: "Daily Transactions", value: "45.2K", icon: Activity, color: "orange", trend: 12.3 }
    ],
    company_admin: [
      { title: "Today's Sales", value: `KSH ${(3052450 / 1000000).toFixed(1)}M`, icon: DollarSign, color: "green", trend: 8.7 },
      { title: "Active Stations", value: state.serviceStations.filter(s => s.status === 'active').length, icon: Building2, color: "blue" },
      { title: "Active Islands", value: Object.keys(state.islands).length, icon: MapPin, color: "purple" },
      { title: "Fuel Offloads", value: 12, icon: Truck, color: "orange" }
    ],
    station_manager: [
      { title: "Active Islands", value: state.currentStation?.islands?.filter(i => i.status === 'active').length || 0, icon: MapPin, color: "blue" },
      { title: "Active Attendants", value: state.currentStation?.staff?.filter(s => s.status === 'active').length || 0, icon: Users, color: "green" },
      { title: "Today's Sales", value: `KSH 433,250`, icon: DollarSign, color: "purple", trend: 5.3 },
      { title: "Fuel Stock", value: `${state.currentStation?.fuelLevel || 78}%`, icon: Fuel, color: "orange" }
    ],
    supervisor: [
      { title: "Current Shift", value: "Morning Shift", icon: Clock, color: "blue" },
      { title: "Active Islands", value: 4, icon: MapPin, color: "green" },
      { title: "Attendants", value: 8, icon: User, color: "purple" },
      { title: "Shift Sales", value: `KSH 102,450`, icon: DollarSign, color: "orange", trend: 3.1 }
    ]
  };

  // Role-specific sections
  const renderRoleSpecificContent = () => {
    switch(role) {
      case 'super_admin':
        return (
          <>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-6">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">Companies Overview</h4>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {state.companies.map(company => (
                    <div key={company.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
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

            <div className="mt-6 bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">System Analytics</h4>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-medium text-gray-900">Sales by Company</h5>
                      <Button size="sm" variant="ghost">View All</Button>
                    </div>
                    {/* Sales chart would go here */}
                    <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                      <BarChart2 className="w-12 h-12 text-gray-400" />
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-medium text-gray-900">Recent Activity</h5>
                      <Button size="sm" variant="ghost">View All</Button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1 p-2 bg-blue-100 rounded-full">
                          <Settings className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">System configuration updated</p>
                          <p className="text-xs text-gray-500">2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="mt-1 p-2 bg-green-100 rounded-full">
                          <Plus className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">New company registered</p>
                          <p className="text-xs text-gray-500">5 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      
      case 'company_admin':
        return (
          <>
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
                            KSH 433,250
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
                  </div>
                </div>
              </div>
            </div>

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
          </>
        );
      
      case 'station_manager':
        return (
          <>
            <div className="bg-white rounded-xl shadow-lg mt-6">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">Station Operations</h4>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h5 className="font-semibold text-gray-900 mb-4">Island Status</h5>
                    <div className="space-y-3">
                      {state.currentStation?.islands?.map(island => (
                        <div key={island.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-3 ${
                              island.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                            <span>Island {island.number}</span>
                          </div>
                          <span className="text-sm text-gray-600">{island.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h5 className="font-semibold text-gray-900 mb-4">Fuel Levels</h5>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Super Petrol</span>
                          <span className="text-sm font-medium">78%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '78%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Diesel</span>
                          <span className="text-sm font-medium">54%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '54%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h5 className="font-semibold text-gray-900 mb-4">Staff On Duty</h5>
                    <div className="space-y-3">
                      {state.currentStation?.staff?.slice(0, 4).map(staff => (
                        <div key={staff.id} className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{staff.name}</p>
                            <p className="text-xs text-gray-600">{staff.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">Quick Actions</h4>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Button icon={Plus} variant="secondary" className="justify-start">
                    Create Shift
                  </Button>
                  <Button icon={Clipboard} variant="secondary" className="justify-start">
                    Record Readings
                  </Button>
                  <Button icon={Shuffle} variant="secondary" className="justify-start">
                    Manage Attendants
                  </Button>
                  <Button icon={FileText} variant="secondary" className="justify-start">
                    Generate Report
                  </Button>
                </div>
              </div>
            </div>
          </>
        );
      
      case 'supervisor':
        return (
          <>
            <div className="bg-white rounded-xl shadow-lg mt-6">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">Current Shift Details</h4>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Shift Information</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shift Type:</span>
                        <span className="font-medium">Morning Shift</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start Time:</span>
                        <span className="font-medium">06:00 AM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">End Time:</span>
                        <span className="font-medium">02:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium text-green-600">Active</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Attendants</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map(id => (
                        <div key={id} className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="text-sm">Attendant {id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">Island Readings</h4>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Island</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Reading</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Reading</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[1, 2, 3, 4].map(id => (
                        <tr key={id}>
                          <td className="px-4 py-3 whitespace-nowrap">Island {id}</td>
                          <td className="px-4 py-3 whitespace-nowrap">12,450 L</td>
                          <td className="px-4 py-3 whitespace-nowrap">11,230 L</td>
                          <td className="px-4 py-3 whitespace-nowrap">KSH 24,560</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">Shift Actions</h4>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="secondary" className="justify-center">
                    Record Readings
                  </Button>
                  <Button variant="secondary" className="justify-center">
                    Assign Attendant
                  </Button>
                  <Button variant="destructive" className="justify-center">
                    End Shift
                  </Button>
                </div>
              </div>
            </div>
          </>
        );
      
      default:
        return <div className="mt-6 text-center py-12 bg-white rounded-xl shadow-lg">
          <p className="text-gray-600">No dashboard available for this role</p>
        </div>;
    }
  };

  // Role-specific headers
  const roleHeaders = {
    super_admin: {
      title: "System Overview",
      description: "Monitor all companies and system performance"
    },
    company_admin: {
      title: "Company Dashboard",
      description: "Real-time overview of all operations"
    },
    station_manager: {
      title: "Station Management",
      description: "Manage your service station operations"
    },
    supervisor: {
      title: "Shift Dashboard",
      description: "Monitor and manage your current shift"
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {roleHeaders[role]?.title || "Dashboard"}
        </h3>
        <p className="text-gray-600">
          {roleHeaders[role]?.description || "Overview of your operations"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {commonStats[role]?.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            trend={stat.trend}
          />
        ))}
      </div>

      {/* Role-specific content */}
      {renderRoleSpecificContent()}
    </div>
  );
};

export default DashboardOverview;