import React, { Suspense } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  Outlet
} from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Public Components
const LandingPage = React.lazy(() => import('./components/auth/LandingPage'));
const LoginPage = React.lazy(() => import('./components/auth/LoginPage'));
const AboutPage = React.lazy(() => import('./components/auth/AboutPage'));

// Protected Components - Role-specific dashboards
const SuperAdminDashboard = React.lazy(() => import('./components/dashboards/SuperAdminDashboard'));
const CompanyAdminDashboard = React.lazy(() => import('./components/dashboards/CompanyAdminDashboard'));
const StationManagerDashboard = React.lazy(() => import('./components/dashboards/StationManagerDashboard'));
const SupervisorDashboard = React.lazy(() => import('./components/dashboards/SupervisorDashboard'));

// Feature Modules
const ServiceStationManagement = React.lazy(() => import('./components/features/stations/ServiceStationManagement'));
const FuelManagement = React.lazy(() => import('./components/features/fuel/FuelManagement'));
const StaffManagement = React.lazy(() => import('./components/features/staff/StaffManagement'));
const ShiftManagement = React.lazy(() => import('./components/features/shifts/ShiftsManagement'));
const ReportsCenter = React.lazy(() => import('./components/features/reports/ReportCenter'));

// Layout wrapper for protected routes
const ProtectedLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (

      <Suspense fallback={<LoadingSpinner />}>
        <Outlet />
      </Suspense>
 
  );
};

// Role-based route protection
const RoleProtectedRoute = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

// Role-based dashboard router
const RoleDashboard = () => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  switch (user.role) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'COMPANY_ADMIN':
      return <CompanyAdminDashboard />;
    case 'STATION_MANAGER':
      return <StationManagerDashboard />;
    case 'SUPERVISOR':
      return <SupervisorDashboard />;
    default:
      return <Navigate to="/" replace />;
  }
};

function App() {
  return (
    <AppProvider>
      <Router>
        <Suspense fallback={<LoadingSpinner fullScreen />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />

            {/* Protected Routes - Requires authentication */}
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<RoleDashboard />} />
              
              {/* Super Admin Routes */}
              <Route path="/super-admin/*" element={
                <RoleProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminDashboard />
                </RoleProtectedRoute>
              } />
              
              {/* Company Admin Routes */}
              <Route path="/company-admin/*" element={
                <RoleProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
                  <CompanyAdminDashboard />
                </RoleProtectedRoute>
              } />
              
              {/* Station Manager Routes */}
              <Route path="/station-manager/*" element={
                <RoleProtectedRoute allowedRoles={['STATION_MANAGER']}>
                  <StationManagerDashboard />
                </RoleProtectedRoute>
              } />
              
              {/* Supervisor Routes */}
              <Route path="/supervisor/*" element={
                <RoleProtectedRoute allowedRoles={['SUPERVISOR']}>
                  <SupervisorDashboard />
                </RoleProtectedRoute>
              } />
              
              {/* Feature Modules with role-based access */}
              <Route path="/stations" element={
                <RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'STATION_MANAGER']}>
                  <ServiceStationManagement />
                </RoleProtectedRoute>
              } />
              
              <Route path="/fuel" element={
                <RoleProtectedRoute allowedRoles={['STATION_MANAGER', 'SUPERVISOR']}>
                  <FuelManagement />
                </RoleProtectedRoute>
              } />
              
              <Route path="/staff" element={
                <RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'STATION_MANAGER']}>
                  <StaffManagement />
                </RoleProtectedRoute>
              } />
              
              <Route path="/shifts" element={
                <RoleProtectedRoute allowedRoles={['STATION_MANAGER', 'SUPERVISOR']}>
                  <ShiftManagement />
                </RoleProtectedRoute>
              } />
              
              <Route path="/reports" element={
                <RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'STATION_MANAGER']}>
                  <ReportsCenter />
                </RoleProtectedRoute>
              } />
            </Route>
            
            {/* Fallback Routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AppProvider>
  );
}

export default App;