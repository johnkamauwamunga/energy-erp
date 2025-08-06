import React, { useState } from 'react';
import { 
  BarChart3, Building2, MapPin, Clock, Users, FileCheck, Truck, 
  TrendingUp, FileText, Warehouse, Flame, X, Menu 
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { useApp,useAppDispatch,logout } from '../../../context/AppContext';
import CompanyOverview from '@/components/dashboards/common/CompanyOverview';
import ServiceStationManagement from '@/components/features/stations/ServiceStationManagement';
import PlaceholderComponent from './PlaceholderComponent';
import CreateAssetModal from './CreateAssetModal';
import CompanyAssetManagement from './CompanyAssetManagement'
import CompanyUserManagement from './CompanyUserManagement';

const CompanyAdminDashboard = () => {
  const { state } = useApp();
    const dispatch=useAppDispatch();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);

  //  console.log("the state ", state);
   // Implement logout handler
    const handleLogout = () => {
      // Perform logout operations
      dispatch(logout()); // Dispatch logout action
      
      // Clear any stored authentication tokens
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      // Redirect to login page
      window.location.href = '/login'; // Or use your router navigation
    };

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: BarChart3 },
    { id: 'stations', label: 'Service Stations', icon: Building2 },
    { id: 'assets', label: 'Assets', icon: Building2 },
    { id: 'islands', label: 'Island Management', icon: MapPin },
    { id: 'warehouses', label: 'Warehouse', icon: Warehouse },
    { id: 'shifts', label: 'Shift Management', icon: Clock },
    { id: 'staff', label: 'Staff Management', icon: Users },
    { id: 'matching', label: 'Document Matching', icon: FileCheck },
    { id: 'offloads', label: 'Fuel Offloads', icon: Truck },
    { id: 'sales', label: 'Sales Analytics', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <CompanyOverview />;
      case 'stations':
        // return <ServiceStationManagement />;
        return <PlaceholderComponent title="Service Station Management" icon={Building2} />;
      case 'assets':
         return <CompanyAssetManagement />;
      case 'islands':
        return <PlaceholderComponent title="Island Management" icon={MapPin} />;
      case 'warehouses':
        return <PlaceholderComponent title="Warehouse Management" icon={Warehouse} />;
      case 'shifts':
        return <PlaceholderComponent title="Shift Management" icon={Clock} />;
      case 'staff':
        return <CompanyUserManagement />;
      case 'matching':
        return <PlaceholderComponent title="Document Matching" icon={FileCheck} />;
      case 'offloads':
        return <PlaceholderComponent title="Fuel Offloads" icon={Truck} />;
      case 'sales':
        return <PlaceholderComponent title="Sales Analytics" icon={TrendingUp} />;
      case 'reports':
        return <PlaceholderComponent title="Report Center" icon={FileText} />;
      default:
        return <CompanyOverview />;
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
                <p className="text-xs text-gray-500">Company Admin</p>
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
        
        <nav className="p-4 space-y-2 overflow-y-auto h-full pb-20">
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
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome, {state.currentUser.name}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>Company Administrator</span>
              </div>
              <Button onClick={handleLogout} variant="secondary" size="sm">
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

            {/* Create Company Modal */}
      <CreateAssetModal
        isOpen={showCreateAssetModal}
        onClose={() => setShowCreateAssetModal(false)}
      />
    </div>
  );
};

export default CompanyAdminDashboard;