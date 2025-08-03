import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { LandingPage } from './components/auth';
import { LoginPage } from './components/auth';
import { 
  SuperAdminDashboard, 
  CompanyAdminDashboard, 
  StationManagerDashboard, 
  SupervisorDashboard 
} from './components/dashboards';
import './index.css';

const AppRouter = () => {
  const [currentView, setCurrentView] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = (user) => {
    setCurrentUser(user);
    
    // Route to appropriate dashboard based on role
    switch (user.role) {
      case 'super_admin':
        setCurrentView('super_admin_dashboard');
        break;
      case 'company_admin':
        setCurrentView('company_admin_dashboard');
        break;
      case 'station_manager':
        setCurrentView('station_manager_dashboard');
        break;
      case 'supervisor':
        setCurrentView('supervisor_dashboard');
        break;
      default:
        setCurrentView('login');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('home');
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'login':
        return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;
      case 'company_admin_dashboard':
        return <CompanyAdminDashboard user={currentUser} onLogout={handleLogout} />;
      // Add other dashboard cases...
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  return renderView();
};

function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default App;
