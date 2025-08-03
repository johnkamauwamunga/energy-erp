import React, { Suspense } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  Outlet
} from 'react-router-dom';
import { useApp } from './context/AppContext';
import Layout  from './components/layout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Public Components
const LandingPage = React.lazy(() => import('./components/auth/LandingPage'));
const LoginPage = React.lazy(() => import('./components/auth/LoginPage'));
const AboutPage = React.lazy(() => import('./components/auth/AboutPage'));


// Protected Components
const SuperAdminDashboard = React.lazy(() => import('./components/dashboards/SuperAdminDashboard'));
const CompanyAdminDashboard = React.lazy(() => import('./components/dashboards/CompanyAdminDashboard'));
const StationManagerDashboard = React.lazy(() => import('./components/dashboards/StationManagerDashboard'));
const SupervisorDashboard = React.lazy(() => import('./components/dashboards/SupervisorDashboard'));
const ServiceStationManagement = React.lazy(() => import('./components/features/stations/ServiceStationManagement'));
const FuelManagement = React.lazy(() => import('./components/features/fuel/FuelManagement'));
const StaffManagement = React.lazy(() => import('./components/features/staff/StaffManagement'));
const ShiftManagement = React.lazy(() => import('./components/features/shifts/ShiftsManagement'));
const ReportsCenter = React.lazy(() => import('./components/features/reports/ReportCenter'));
// const SettingsPage = React.lazy(() => import('./components/features/settings/SettingsPage'));
// const CompanyManagement = React.lazy(() => import('./components/features/companies/CompanyManagement'));

// Layout wrapper for protected routes
const ProtectedLayout = () => {
  const { state } = useApp();
  
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
};

// Role-based dashboard router
const RoleDashboard = () => {
  const { state } = useApp();
  
 // if (!state.currentUser) return <LoadingSpinner />;
  const role="super_admin";
 // switch (state.currentUser.role) {
 switch(role){
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'company_admin':
      return <CompanyAdminDashboard />;
    case 'station_manager':
      return <StationManagerDashboard />;
    case 'supervisor':
      return <SupervisorDashboard />;
    default:
      return <Navigate to="/" replace />;
  }
};

function App() {
  const { state } = useApp();

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={
            state.isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } />
          <Route path="/about" element={<AboutPage />} />

          
          {/* Protected Routes - Requires authentication */}
          {/* <Route element={<ProtectedLayout />}> */}
            <Route path="/dashboard" element={<RoleDashboard />} />
            
            {/* Feature Modules */}
            <Route path="/stations" element={<ServiceStationManagement />} />
            <Route path="/fuel" element={<FuelManagement />} />
            <Route path="/staff" element={<StaffManagement />} />
            <Route path="/shifts" element={<ShiftManagement />} />
            <Route path="/reports" element={<ReportsCenter />} />
            {/* <Route path="/settings" element={<SettingsPage />} /> */}
            
            {/* Role-specific routes */}
            {/* {state.currentUser?.role === 'super_admin' && (
              // <Route path="/companies" element={<CompanyManagement />} />
            )} */}
          {/* </Route> */}
          
          {/* Fallback Routes */}
          <Route path="*" element={
            state.isAuthenticated 
              ? <Navigate to="/dashboard" replace /> 
              : <Navigate to="/" replace />
          } />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;