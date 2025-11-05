import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Mail, Lock, LogIn, Home } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { useAuth } from '../../../hooks/useAuth';

const LoginPage = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();

  console.log("🔍 LoginPage State:", {
    isAuthenticated,
    user: user?.email,
    userRole: user?.role,
    isLoading
  });

  // Redirect when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("✅ LoginPage: User authenticated, redirecting...", {
        role: user.role,
        email: user.email
      });
      
      // Small delay to ensure state is fully updated
      const redirectTimer = setTimeout(() => {
        redirectBasedOnRole(user.role);
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, user, navigate]);

  const redirectBasedOnRole = (role) => {
    console.log("🔄 Redirecting based on role:", role);
    
    switch (role) {
      case 'SUPER_ADMIN':
        navigate('/super-admin/dashboard');
        break;
      case 'COMPANY_ADMIN':
        navigate('/company-admin/dashboard');
        break;
      case 'STATION_MANAGER':
        navigate('/station-manager/dashboard');
        break;
      case 'SUPERVISOR':
        navigate('/supervisor/dashboard');
        break;
      case 'ATTENDANT':
        navigate('/attendant/dashboard');
        break;
      default:
        console.warn("⚠️ Unknown role, redirecting to default dashboard");
        navigate('/dashboard');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    console.log("🔄 LoginPage: Starting login process", {
      email: credentials.email
    });
    
    try {
      const result = await login(credentials.email, credentials.password);
      
      console.log("📨 LoginPage: Login result received", {
        success: result.success,
        message: result.message,
        hasUserData: !!result.data?.user
      });
      
      if (result.success) {
        console.log("✅ LoginPage: Login successful in component", {
          userRole: result.data?.user?.role,
          userEmail: result.data?.user?.email
        });
        
        // The useEffect will handle redirection automatically
        // We don't need to redirect here as the auth state change will trigger it
      } else {
        console.log("❌ LoginPage: Login failed in component", {
          message: result.message
        });
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error("💥 LoginPage: Login error caught", err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && credentials.email && credentials.password) {
      handleLogin(e);
    }
  };

  const handleInputChange = (field, value) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  // Show loading while initializing auth state
  if (isLoading) {
    return (
      <div className="min-h-screen cosmic-gradient flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block cosmic-gradient p-4 rounded-xl flame-animation mb-4">
            <Flame className="w-12 h-12 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Initializing</h2>
          <p className="text-blue-100">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cosmic-gradient flex items-center justify-center relative overflow-hidden p-4">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-400 rounded-full opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-1/3 w-32 h-32 bg-cyan-400 rounded-full opacity-10 animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Back to Home */}
        <div className="mb-8">
          <Button 
            onClick={() => navigate('/')}
            variant="ghost"
            icon={Home}
            className="text-white hover:bg-white hover:bg-opacity-20 transition-all duration-200"
          >
            Back to Home
          </Button>
        </div>

        {/* Login Card */}
        <div className="glass-effect rounded-2xl p-8 shadow-2xl border border-white border-opacity-10">
          <div className="text-center mb-8">
            <div className="inline-block cosmic-gradient p-3 rounded-xl flame-animation mb-4">
              <Flame className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">System Access</h2>
            <p className="text-blue-100">Sign in to your dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg text-red-100 animate-shake">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse"></div>
                <span className="font-medium">Authentication Error</span>
              </div>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              value={credentials.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your email"
              icon={Mail}
              required
              autoComplete="email"
              disabled={loading}
              className="transition-all duration-200"
            />
            
            <Input
              label="Password"
              type="password"
              value={credentials.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your password"
              icon={Lock}
              required
              autoComplete="current-password"
              disabled={loading}
              className="transition-all duration-200"
            />

            <Button
              type="submit"
              variant="cosmic"
              size="lg"
              className="w-full transform transition-all duration-200 hover:scale-105 active:scale-95"
              icon={loading ? null : LogIn}
              loading={loading}
              disabled={!credentials.email || !credentials.password || loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white border-opacity-10">
            <div className="text-center">
              <div className="text-blue-100 text-sm mb-2">
                Secure access with role-based permissions
              </div>
              <a 
                href='/forgot-password' 
                className="text-red-200 text-sm hover:text-red-100 transition-colors duration-200 underline"
              >
                Forgot password?
              </a>
            </div>
          </div>

          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-black bg-opacity-20 rounded-lg">
              <div className="text-xs text-blue-200">
                <div>Status: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
                <div>User: {user?.email || 'None'}</div>
                <div>Role: {user?.role || 'None'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Version Info */}
        <div className="text-center mt-6">
          <p className="text-blue-200 text-xs opacity-70">
            Fuel Management System v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;