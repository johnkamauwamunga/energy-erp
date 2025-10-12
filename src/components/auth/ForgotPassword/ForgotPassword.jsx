import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Mail, Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { userService } from '../../../services/userService/userService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  
  const navigate = useNavigate();

  // Check if passwords match
  useEffect(() => {
    if (newPassword && confirmPassword && newPassword === confirmPassword) {
      setPasswordMatch(true);
      setError('');
    } else if (confirmPassword) {
      setPasswordMatch(false);
    }
  }, [newPassword, confirmPassword]);

  // Validate password strength in real-time using userService validation
  useEffect(() => {
    setPasswordStrength({
      hasMinLength: newPassword.length >= 8,
      hasUpperCase: /[A-Z]/.test(newPassword),
      hasLowerCase: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecialChar: /[^A-Za-z0-9]/.test(newPassword)
    });
  }, [newPassword]);

  const validateForm = () => {
    if (!email || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    // Use userService validation for password strength
    const passwordValidation = userService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return false;
    }

    // Use userService validation for password match
    const matchValidation = userService.validatePasswordMatch(newPassword, confirmPassword);
    if (!matchValidation.isValid) {
      setError(matchValidation.error);
      return false;
    }

    return true;
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Call userService with the exact payload structure expected by the API
      const resetData = {
        email: email.trim().toLowerCase(),
        newPassword: newPassword,
        confirmPassword: confirmPassword
      };

      console.log('🟢 [FRONTEND] Sending reset payload:', resetData);

      const result = await userService.resetPasswordByEmail(resetData);
      
      if (result.success) {
        setSuccess(true);
        console.log('✅ [FRONTEND] Password reset successful for:', email);
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.message || 'Password reset failed. Please try again.');
      }
    } catch (err) {
      // Handle API errors
      console.error('❌ [FRONTEND] Password reset error:', err);
      
      // Enhanced error handling based on common scenarios
      if (err.response?.status === 404) {
        setError('No account found with this email address');
      } else if (err.response?.status === 400) {
        setError(err.message || 'Invalid request. Please check your input and try again.');
      } else if (err.response?.status === 422) {
        setError(err.message || 'Password does not meet security requirements');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && email && newPassword && confirmPassword && passwordMatch) {
      handleResetPassword(e);
    }
  };

  const getPasswordStrengthScore = () => {
    const { hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar } = passwordStrength;
    const requirements = [hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar];
    return requirements.filter(Boolean).length;
  };

  const getStrengthColor = () => {
    const score = getPasswordStrengthScore();
    if (score <= 2) return 'text-red-400';
    if (score <= 3) return 'text-orange-400';
    if (score === 4) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStrengthText = () => {
    const score = getPasswordStrengthScore();
    if (score <= 2) return 'Weak';
    if (score <= 3) return 'Fair';
    if (score === 4) return 'Good';
    return 'Strong';
  };

  // Check if form is ready for submission
  const isFormValid = () => {
    return email && 
           newPassword && 
           confirmPassword && 
           passwordMatch && 
           getPasswordStrengthScore() === 5;
  };

  if (loading) {
    return (
      <div className="min-h-screen cosmic-gradient flex items-center justify-center">
        <div className="text-white text-xl">Processing...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen cosmic-gradient flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400 rounded-full opacity-10 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-400 rounded-full opacity-10 animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-md w-full mx-4">
          <div className="glass-effect rounded-2xl p-8 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Password Reset Successful!</h2>
            <p className="text-blue-100 mb-6">
              Your password has been successfully reset. You will be redirected to the login page shortly.
            </p>
            <Button
              onClick={() => navigate('/login')}
              variant="cosmic"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </div>
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
        {/* Back to Login */}
        <div className="mb-8">
          <Button 
            onClick={() => navigate('/login')}
            variant="ghost"
            icon={ArrowLeft}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            Back to Login
          </Button>
        </div>

        {/* Reset Card */}
        <div className="glass-effect rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-block cosmic-gradient p-3 rounded-xl flame-animation mb-4">
              <Flame className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Reset Your Password</h2>
            <p className="text-blue-100">Enter your email and new password</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg text-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your email"
              icon={Mail}
              required
              autoComplete="email"
            />
            
            {/* Password with strength indicator */}
            <div className="space-y-2">
              <Input
                label="New Password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter new password"
                icon={Lock}
                required
                autoComplete="new-password"
                rightIcon={showPassword ? EyeOff : Eye}
                onRightIconClick={() => setShowPassword(!showPassword)}
              />
              
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-100">Password Strength:</span>
                    <span className={`text-sm font-medium ${getStrengthColor()}`}>
                      {getStrengthText()}
                    </span>
                  </div>
                  
                  {/* Password requirements */}
                  <div className="space-y-1 text-xs">
                    <div className={`flex items-center ${passwordStrength.hasMinLength ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordStrength.hasMinLength ? '✓' : '✗'} At least 8 characters
                    </div>
                    <div className={`flex items-center ${passwordStrength.hasUpperCase ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordStrength.hasUpperCase ? '✓' : '✗'} One uppercase letter
                    </div>
                    <div className={`flex items-center ${passwordStrength.hasLowerCase ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordStrength.hasLowerCase ? '✓' : '✗'} One lowercase letter
                    </div>
                    <div className={`flex items-center ${passwordStrength.hasNumber ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordStrength.hasNumber ? '✓' : '✗'} One number
                    </div>
                    <div className={`flex items-center ${passwordStrength.hasSpecialChar ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordStrength.hasSpecialChar ? '✓' : '✗'} One special character
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirm New Password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Confirm new password"
              icon={Lock}
              required
              autoComplete="new-password"
              rightIcon={showConfirmPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            {confirmPassword && (
              <div className={`text-sm ${passwordMatch ? 'text-green-400' : 'text-red-400'}`}>
                {passwordMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}

            <Button
              type="submit"
              variant="cosmic"
              size="lg"
              className="w-full"
              loading={loading}
              disabled={!isFormValid()}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="text-blue-100 text-sm">
              Make sure your new password meets all security requirements
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;