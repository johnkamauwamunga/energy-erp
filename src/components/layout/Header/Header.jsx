import React from 'react';
import { Bell, User, Menu } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const Header = ({ setSidebarOpen }) => {
  const { logout } = useApp();
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <button 
            className="md:hidden mr-4"
            onClick={() => setSidebarOpen(prev => !prev)}
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 hidden md:block">
            Energy Management System
          </h1>
        </div>
        
        <div className="flex items-center space-x-6">
          <button className="relative">
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="flex items-center group relative">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            
            <div className="ml-2 hidden md:block">
              <div className="text-sm font-medium text-gray-700">Admin User</div>
            </div>
            
            {/* Dropdown */}
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 hidden group-hover:block z-20">
              <button className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                My Profile
              </button>
              <button className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                Settings
              </button>
              <button 
                onClick={logout}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left border-t mt-2"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;