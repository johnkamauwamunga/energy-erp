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

  console.log("LoginPage render - isAuthenticated:", isAuthenticated, "user:", user, "isLoading:", isLoading);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("Redirecting based on user role:", user.role);
      // Redirect based on user role
      switch (user.role) {
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
        default:
          navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await login(credentials.email, credentials.password);
      
      if (result.success) {
        console.log("Login successful, user role:", result.data.user.role);
        // The useEffect will handle redirection based on role
      } else {
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch (err) {
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

  // Show loading while initializing auth state
  if (isLoading) {
    return (
      <div className="min-h-screen cosmic-gradient flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cosmic-gradient flex items-center justify-center relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-400 rounded-full opacity-10 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        {/* Back to Home */}
        <div className="mb-8">
          <Button 
            onClick={() => navigate('/')}
            variant="ghost"
            icon={Home}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            Back to Home
          </Button>
        </div>

        {/* Login Card */}
        <div className="glass-effect rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-block cosmic-gradient p-3 rounded-xl flame-animation mb-4">
              <Flame className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">System Access</h2>
            <p className="text-blue-100">Sign in to your dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg text-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              onKeyPress={handleKeyPress}
              placeholder="Enter your email"
              icon={Mail}
              required
              autoComplete="email"
            />
            
            <Input
              label="Password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              onKeyPress={handleKeyPress}
              placeholder="Enter your password"
              icon={Lock}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="cosmic"
              size="lg"
              className="w-full"
              icon={LogIn}
              loading={loading}
              disabled={!credentials.email || !credentials.password}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="text-blue-100 text-sm">
              Secure access with role-based permissions
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;