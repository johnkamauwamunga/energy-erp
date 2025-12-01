import React, { useState } from 'react';
import { useApp, useAppDispatch } from '../../../context/AppContext';
import { logout } from '../../../context/AppContext/actions';
import { 
  BarChart3, Activity, Clock, Users, FileText, 
  Flame, X, Menu, MapPin, DollarSign, Truck, Building2, Fuel, LogOut, User, Settings,CoinsIcon,BookAIcon,
  Users2Icon,HandCoinsIcon
} from 'lucide-react';
import { Button } from '../../ui';
import DashboardOverview from '../../../components/dashboards/common/CompanyOverview';
import PlaceholderComponent from './PlaceholderComponent';
import StationAssetManagement from './assets/StationAssetManagement';
import StationDashboardOverview from '../common/StationDashboardOverview';
import SalesManagement from '../common/sales/SalesManagement';
import StationUserManagement from './staff/StationUserManagement';
import FuelOffloadWizard from '../common/fuel-offload/FuelOffloadWizard';
import ShiftManagement from '../common/shift/ShiftManagement';
import AnalyticsDemo from '../common/analytics/AnalyticsDemo';
import OffloadMagement from '../common/offload-test/OffloadManagement';
import FuelTankManagement from './products/fuelTankManagement/FuelTankManagement';
import DebtorManagementTabs from '../common/debtors/DebtorManagementTabs';
import StationDebug from './StationDebug';
import AssetTopologyDebug from './AssetTopologyDebug';
import SimpleIslandPumpTest from './SimpleIslandPumpTest';
import TankReconciliationManagement from '../common/wetstock-reconcilliation/TankReconciliation';
import WetStockManagement from '../common/wetstock/WetStockManagement';
import ExpenseManagement from '../common/expenses/ExpenseManagement';
import AccountsManagement from '../common/accounts/AccountManagement';
import DebtTransferManagement from '../common/debtTransfering/DebtTransferManagement';
import EventLogManagement from '../common/events/EventLogManagement';
import PumpSalesManagement from '../common/enhanced-sales/PumpSalesManagement';

const StationManagerDashboard = () => {
  const { state } = useApp();
  const dispatch = useAppDispatch();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  const station = state.currentStation?.id;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'shifts', label: 'Shift Management', icon: Clock },
    { id: 'assets', label: 'Assets', icon: Building2 },
    { id: "fuel_tanks", label: "Fuel Tanks", icon: Fuel },
    { id: 'offloads', label: 'Fuel Offloads', icon: Truck },
     { id: 'expenses', label: 'Expenses', icon: CoinsIcon },
    { id: 'accounts', label: 'Accounts', icon: BookAIcon },
    { id: 'sales', label: 'Sales', icon: DollarSign },
    { id: 'debtor', label: 'Debtors', icon: Users2Icon },
    {id: 'debt-transfer', label: 'Payment & Transfer',icon:HandCoinsIcon},
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'wet_stock', label: 'Wet Stock', icon: Fuel},
    { id: 'activity', label: 'Activity Logs', icon: Activity }
  
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <StationDashboardOverview />;
      case 'staff':
        return <StationUserManagement />;
      case 'assets':
        return <StationAssetManagement />;
      case 'fuel_tanks':
        return <FuelTankManagement />;
      case 'shifts':
        return <ShiftManagement />;
      case 'offloads':
        return <OffloadMagement />;
      case 'expenses':
         return <ExpenseManagement />;
      case 'accounts':
         return <AccountsManagement />;
      case 'sales':
        return <PumpSalesManagement />;
      case 'debtor':
        return <DebtorManagementTabs />;
        case 'debt-transfer':
          return <DebtTransferManagement />;
      case 'reports':
        return <AssetTopologyDebug />;
      case 'activity':
        return <EventLogManagement />;
      case 'wet_stock':
        return <WetStockManagement />;
      default:
        return <PlaceholderComponent title="Station Dashboard" icon={BarChart3} />;
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
                <p className="text-xs text-gray-500 truncate max-w-[120px]" title={station?.name}>
                  {station?.name}
                </p>
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
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0"> {/* Added min-w-0 for proper flexbox truncation */}
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1"> {/* Added flex-1 and min-w-0 */}
              <button 
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div className="min-w-0 flex-1"> {/* Added for proper text truncation */}
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                  Welcome, {state.currentUser.name}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  {station?.name} - Station Manager
                </p>
              </div>
            </div>
            
            {/* User Profile with Dropdown */}
            <div className="relative flex-shrink-0 ml-2 sm:ml-4"> {/* Added flex-shrink-0 and margin */}
              <button 
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                  {state.currentUser?.firstName?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:block text-left min-w-0 max-w-[120px]"> {/* Added max-width */}
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {state.currentUser?.firstName} {state.currentUser?.lastName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    Station Manager
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
    </div>
  );
};

export default StationManagerDashboard;