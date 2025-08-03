import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, BarChart3, Fuel, MapPin, Users, 
  Settings, FileText, Wrench, ChevronDown, X
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { state } = useApp();
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/stations', label: 'Stations', icon: MapPin },
    { path: '/fuel', label: 'Fuel Management', icon: Fuel },
    { path: '/staff', label: 'Staff', icon: Users },
    { path: '/shifts', label: 'Shifts', icon: Wrench },
    { path: '/reports', label: 'Reports', icon: FileText },
  ];
  
  // Add company management for super admins
  if (state.currentUser?.role === 'super_admin') {
    navItems.push({ path: '/companies', label: 'Companies', icon: BarChart3 });
  }
  
  // Always add settings at the end
  navItems.push({ path: '/settings', label: 'Settings', icon: Settings });

  return (
    <div 
      className={`fixed md:relative z-50 w-64 bg-white shadow-md h-full transition-transform duration-300 transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-800">
          <span className="text-orange-500">Energy</span>ERP
        </h1>
        <button 
          className="md:hidden text-gray-600"
          onClick={() => setIsOpen(false)}
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      {/* User Info */}
      <div className="p-4 border-b">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-8 h-8" />
          </div>
          <div>
            <div className="font-medium text-gray-800">{state.currentUser?.name || 'User'}</div>
            <div className="text-sm text-gray-500">{state.currentUser?.role || 'Role'}</div>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center p-3 mb-1 rounded-md transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
            onClick={() => setIsOpen(false)}
          >
            <item.icon className="mr-3 h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t text-sm text-gray-500">
        <div>v4.0.1</div>
        <div>© 2023 EnergyERP</div>
      </div>
    </div>
  );
};

export default Sidebar;