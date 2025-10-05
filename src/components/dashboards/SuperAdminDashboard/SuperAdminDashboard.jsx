import React, { useState } from 'react';
import { 
  BarChart3, Building2, Users, Server, TrendingUp, 
  Flame, Eye, Edit, Plus, Shield, 
  TrendingDown,
  Logs
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { useApp,useAppDispatch,logout } from '../../../context/AppContext';
import OverviewSection from './OverviewSection';
import DashboardOverview from '../common/DashboardOverview';
import SuperAdminDashboardOverView from '../common/SuperAdminDashBoardOverView';
//import SalesMetrics from './sales/SalesMetrics';
import ActivityManagement from '../common/activityLogs/ActivityManagement';
import CompanyManagement from './CompanyManagement';
import UserManagement from './UserManagement';
import SystemManagement from './SystemManagement';
import SystemAnalytics from './SystemAnalytics';
import CreateCompanyModal from './CreateCompanyModal';
import PlaceholderComponent from '../CompanyAdminDashboard/PlaceholderComponent';


const SuperAdminDashboard = () => {
  const { state } = useApp();
 const dispatch=useAppDispatch();
  const [activeSection, setActiveSection] = useState('overview');
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
      { id: 'sales', label: 'Sales', icon: TrendingUp },
    { id: 'system', label: 'System', icon: Server },
    { id: 'analytics', label: 'Analytics', icon: TrendingDown },
    { id: 'activity', label: 'Activity', icon: Logs }
  ];



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

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <SuperAdminDashboardOverView />;
      case 'companies':
        return <CompanyManagement onCreateCompany={() => setShowCreateCompanyModal(true)} />;
      case 'users':
        return <UserManagement />;
        case 'sales':
         // return <SalesMetrics />;
         return <PlaceholderComponent title="sales coming soon"/>
      case 'system':
        return <SystemManagement />;
      case 'analytics':
        return <SystemAnalytics />;
        case 'activity':
          return <ActivityManagement />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="cosmic-gradient p-2 rounded-lg flame-animation">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Energy ERP</h1>
              <p className="text-xs text-gray-500">Super Admin</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
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
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome, {state.currentUser?.name || 'Super Admin'}
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Super Administrator</span>
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
      <CreateCompanyModal
        isOpen={showCreateCompanyModal}
        onClose={() => setShowCreateCompanyModal(false)}
      />
    </div>
  );
};

export default SuperAdminDashboard;