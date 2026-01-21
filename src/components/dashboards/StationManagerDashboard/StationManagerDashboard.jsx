import React, { useState } from 'react';
import { useApp, useAppDispatch } from '../../../context/AppContext';
import { logout } from '../../../context/AppContext/actions';
import { 
  BarChart3, Activity, Clock, Users, FileText, 
  Flame, X, Menu, MapPin, DollarSign, Truck, Building2, Fuel, LogOut, User, Settings,
  CoinsIcon, BookAIcon, LucideCoins, Users2Icon, HandCoinsIcon, FileCheck2Icon,
  SquareUserRound, Warehouse, ChevronDown, ChevronRight,
  FuelIcon, Database, Package, UserCog, Receipt, CreditCard,
  ShoppingCart, FileBarChart, TrendingUp, BarChart, Archive,
  ClipboardList, Calculator, Wallet
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
import StaffAccountManagement from '../common/staff-accounts/StaffAccountManagement';
import WarehouseManagement from '../common/warehouses/WarehouseManagement';
import StationFuelSales from '../common/fuelSales/StationFuelSales';
import CashMovement from '../common/cashMovement/CashMovement';
import ShortageManagement from '../common/shortages/ShortageManagement';
import { FallOutlined } from '@ant-design/icons';

const StationManagerDashboard = () => {
  const { state } = useApp();
  const dispatch = useAppDispatch();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({
    inventory: false,
    financial: false,
    operations: false,
    staff: false,
    reports: false
  });

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  const toggleMenu = (menu) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const station = state.currentStation?.id;

  // Define nested menu structure
  const menuStructure = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      type: 'single'
    },
    {
      id: 'staff',
      label: 'Staff Management',
      icon: UserCog,
      type: 'dropdown',
      expanded: expandedMenus.staff,
      onToggle: () => toggleMenu('staff'),
      items: [
        { id: 'staff', label: 'Staff Members', icon: Users },
        { id: 'staff-accounts', label: 'Staff Accounts', icon: SquareUserRound },
  
      ]
    },
        {
      id: 'assets',
      label: 'Assets',
      icon: Building2,
      type: 'dropdown',
      expanded: expandedMenus.assets,
      onToggle: () => toggleMenu('assets'),
      items: [
        { id: 'assets', label: 'Assets', icon: Building2 },
        { id: 'warehouses', label: 'Warehouses', icon: Warehouse },
        { id: 'fuel_tanks', label: 'Fuel Tanks', icon: Fuel },

      ]
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: Activity,
      type: 'dropdown',
      expanded: expandedMenus.operations,
      onToggle: () => toggleMenu('operations'),
      items: [
        { id: 'shifts', label: 'Shift Management', icon: Clock },
        { id: 'offloads', label: 'Fuel Offloads', icon: Truck },
     
      ]
    },
    {
      id: 'inventory',
      label: 'Inventory & Sales',
      icon: ShoppingCart,
      type: 'dropdown',
      expanded: expandedMenus.inventory,
      onToggle: () => toggleMenu('inventory'),
      items: [
        { id: 'sales', label: 'Fuel Sales', icon: DollarSign },
        { id: 'wet_stock', label: 'Wet Stock', icon: FuelIcon },
        { id: 'pump-sales', label: 'Pump Sales', icon: ShoppingCart },
        { id: 'cash-movement', label: 'Cash Movement', icon: LucideCoins },
      ]
    },
    {
      id: 'financial',
      label: 'Financial',
      icon: HandCoinsIcon,
      type: 'dropdown',
      expanded: expandedMenus.financial,
      onToggle: () => toggleMenu('financial'),
      items: [
        { id: 'expenses', label: 'Expenses', icon: CoinsIcon },
        { id: 'accounts', label: 'Accounts', icon: Wallet },
        {  id: 'shortages', label: 'Shortages', icon: FallOutlined },
        { id: 'debtor', label: 'Debtors', icon: Users2Icon },
        { id: 'debt-transfer', label: 'Payment & Transfer', icon: HandCoinsIcon },
        { id: 'receipts', label: 'Receipts', icon: Receipt }
      ]
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: FileBarChart,
      type: 'dropdown',
      expanded: expandedMenus.reports,
      onToggle: () => toggleMenu('reports'),
      items: [
      { id: 'activity', label: 'Activity Logs', icon: ClipboardList },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'reconciliation', label: 'Reconciliation', icon: Calculator },
        { id: 'debug', label: 'Debug', icon: Database }
      ]
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <StationDashboardOverview />;
      case 'staff':
        return <StationUserManagement />;
      case 'assets':
        return <StationAssetManagement />;
      case 'warehouses':
        return <WarehouseManagement />;
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
        return <StationFuelSales />;
      case 'debtor':
        return <DebtorManagementTabs />;
      case 'debt-transfer':
        return <DebtTransferManagement />;
      case 'cash-movement':
        return <CashMovement />;
      case 'reports':
        return <AssetTopologyDebug />;
      case 'activity':
        return <EventLogManagement />;
      case 'wet_stock':
        return <WetStockManagement />;
      case 'staff-accounts':
        return <StaffAccountManagement />;
        case 'shortages':
        return <ShortageManagement />;
      case 'pump-sales':
        return <PumpSalesManagement />;
      case 'analytics':
        return <AnalyticsDemo />;
      case 'reconciliation':
        return <TankReconciliationManagement />;
      case 'debug':
        return <StationDebug />;
      case 'receipts':
        return <PlaceholderComponent title="Receipts Management" icon={Receipt} />;
      default:
        return <PlaceholderComponent title="Station Dashboard" icon={BarChart3} />;
    }
  };

  const renderMenuItems = () => {
    return menuStructure.map((item) => {
      if (item.type === 'single') {
        return (
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
            <span className="truncate flex-1 text-left">{item.label}</span>
          </button>
        );
      }

      if (item.type === 'dropdown') {
        return (
          <div key={item.id} className="mb-1">
            <button
              onClick={item.onToggle}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                item.expanded 
                  ? 'bg-gray-50 text-gray-900' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              {item.expanded ? (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              )}
            </button>
            
            {item.expanded && (
              <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-3">
                {item.items.map((subItem) => (
                  <button
                    key={subItem.id}
                    onClick={() => {
                      setActiveSection(subItem.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                      activeSection === subItem.id 
                        ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500 -ml-[2px]' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <subItem.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate text-sm">{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      return null;
    });
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
      <div className={`w-64 bg-white shadow-xl transform transition-transform duration-300 z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto fixed inset-y-0 left-0 flex flex-col`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="cosmic-gradient p-2 rounded-lg flame-animation">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Lynx Energy </h1>
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
        
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {renderMenuItems()}
        </nav>
        
        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Station Manager</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {state.currentUser?.firstName?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {state.currentUser?.firstName} {state.currentUser?.lastName}
                </div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
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
                  Welcome, {state.currentUser.name}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  {station?.name} - Station Manager
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