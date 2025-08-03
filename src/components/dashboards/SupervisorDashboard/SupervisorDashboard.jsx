import React, { useState } from 'react';
import { 
  BarChart3, Clock, MapPin, Fuel, Flame, X, Menu, UserCheck 
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import PlaceholderComponent from './PlaceholderComponent';

const SupervisorDashboard = ({ user, onLogout }) => {
  const { state } = useApp();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const station = state.serviceStations.find(s => s.id === user.stationId);
  const supervisor = state.staff.supervisors.find(s => s.id === user.id);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'shift', label: 'Current Shift', icon: Clock },
    { id: 'islands', label: 'Islands', icon: MapPin },
    { id: 'readings', label: 'Readings', icon: Fuel }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <PlaceholderComponent title="Supervisor Dashboard" icon={BarChart3} />;
      case 'shift':
        return <PlaceholderComponent title="Current Shift" icon={Clock} />;
      case 'islands':
        return <PlaceholderComponent title="Island Operations" icon={MapPin} />;
      case 'readings':
        return <PlaceholderComponent title="Readings Management" icon={Fuel} />;
      default:
        return <PlaceholderComponent title="Supervisor Dashboard" icon={BarChart3} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 bg-white shadow-xl transform transition-transform duration-300 z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto fixed inset-y-0 left-0`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="cosmic-gradient p-2 rounded-lg flame-animation">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Energy ERP</h1>
                <p className="text-xs text-gray-500">Supervisor</p>
              </div>
            </div>
            <button 
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                activeSection === item.id 
                  ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-500' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Welcome, {user.name}
                </h2>
                <p className="text-sm text-gray-600">{station?.name} - {supervisor?.shift} Shift Supervisor</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <UserCheck className="w-4 h-4" />
                <span>Supervisor</span>
              </div>
              <Button onClick={onLogout} variant="secondary" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default SupervisorDashboard;