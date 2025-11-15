import React, { useState } from 'react';
import { 
  BarChart3, Building2, MapPin, Clock, Users, FileCheck, Truck, 
  TrendingUp, FileText, Warehouse, Flame, X, Menu, DollarSign, Coins,
  User, Settings, LogOut, UserCog
} from 'lucide-react';
import { Button } from '../../ui';
import { useApp, useAppDispatch, logout } from '../../../context/AppContext';
import CompanyOverview from '@/components/dashboards/common/CompanyOverview';
import DashboardOverview from '@/components/dashboards/common/DashboardOverview';
import ServiceStationManagement from '@/components/features/stations/ServiceStationManagement';
import PlaceholderComponent from './PlaceholderComponent';
import CreateAssetModal from './CreateAssetModal';
import CompanyAssetManagement from './CompanyAssetManagement';
import CompanyUserManagement from './CompanyUserManagement';
import CompanyStationsManagement from './stations/CompanyStationsManagement';
import FuelPurchaseManagement from './purchases/PurchaseManagement';
import FuelManagement from './products/FuelManagement';
import ShiftCreationWizard from '../common/shiftWizard/ShiftCreationWizard';
import CompanyDashboardOverview from '../common/CompanyDashboardOverview';
import AnalyticsDemo from '../common/analytics/AnalyticsDemo';
import CustomDashboard from '../common/analytics/CustomDashboard';
import FuelPriceManagement from './fuel-price/FuelPriceManagement';
import SupplierManagement from './supplier/SupplierManagement';
import SupplierAccountManagement from './supplier/accounts/SupplierAccountManagement';
import BankManagementTabs from '../common/banks/BankManagementTabs';
import Debug from './Debug';

const CompanyAdminDashboard = () => {
  const { state } = useApp();
  const dispatch = useAppDispatch();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: BarChart3 },
    { id: 'stations', label: 'Service Stations', icon: Building2 },
    { id: 'staff', label: 'Staff Management', icon: Users },
    { id: 'assets', label: 'Assets', icon: Building2 },
    { id: 'suppliers', label: 'Supplier', icon: Warehouse },
    { id: 'supplier_account', label: 'Supplier Account', icon: UserCog },
    { id: 'products_mant', label: 'Product Management', icon: MapPin },
    { id: 'fuel_price', label: 'Fuel Price', icon: Coins },
    { id: 'purchase', label: 'Purchase', icon: TrendingUp },
    { id: 'banks', label: 'Banks', icon:Coins },
    { id: 'sales', label: 'Sales Analytics', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <CompanyDashboardOverview />;
      case 'stations':
        return <CompanyStationsManagement />;
      case 'staff':
        return <CompanyUserManagement />;
      case 'assets':
        return <CompanyAssetManagement />;
      case 'products_mant':
        return <FuelManagement />;
      case 'fuel_price':
        return <FuelPriceManagement />;
      case 'suppliers':
        return <SupplierManagement />;
      case 'supplier_account':
        return <SupplierAccountManagement />;
      case 'purchase':
        return <FuelPurchaseManagement />;
      case 'banks':
        return <BankManagementTabs />;
      case 'sales':
        return <PlaceholderComponent title="Sales Analytics" icon={TrendingUp} />;
      case 'reports':
        return <Debug />;
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
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-gray-900 truncate">Energy ERP</h1>
                <p className="text-xs text-gray-500 truncate">Company Admin</p>
              </div>
            </div>
            <button 
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
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
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <button 
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                  Welcome, {state.currentUser?.firstName || 'User'}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  Company Administrator
                </p>
              </div>
            </div>
            
            {/* User Profile with Dropdown */}
            <div className="relative flex-shrink-0 ml-2 sm:ml-4">
              <button 
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                  {state.currentUser?.firstName?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:block text-left min-w-0 max-w-[120px]">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {state.currentUser?.firstName} {state.currentUser?.lastName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    Company Admin
                  </div>
                </div>
              </button>
              
              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-20 border border-gray-200">
                  <button 
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowDropdown(false)}
                  >
                    <User className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">My Profile</span>
                  </button>
                  <button 
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowDropdown(false)}
                  >
                    <Settings className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Settings</span>
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Logout</span>
                  </button>
                </div>
              )}
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