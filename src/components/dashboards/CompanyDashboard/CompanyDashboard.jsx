import React, { useState } from 'react';
import { 
  BarChart3, Building2, MapPin, Clock, Users, FileCheck, Truck, TrendingUp, FileText, Warehouse 
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Sidebar, Header } from '@/components/layout';
import CompanyOverview from './CompanyOverview';
import { ServiceStationManagement } from '@/features/stations';

const CompanyAdminDashboard = ({ user, onLogout }) => {
  const { state, dispatch } = useApp();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'stations', label: 'Service Stations', icon: Building2 },
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
        return <ServiceStationManagement />;
      // ... other cases
      default:
        return <CompanyOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        menuItems={menuItems}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userRole="Company Admin"
      />
      
      <div className="flex-1 flex flex-col">
        <Header 
          user={user} 
          onLogout={onLogout}
          setSidebarOpen={setSidebarOpen}
          userType="Company Administrator"
        />
        
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default CompanyAdminDashboard;