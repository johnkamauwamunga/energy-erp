import { useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { authService } from '../services/auth/authService';

export const useAuth = () => {
  const { dispatch } = useApp();

  // Initialize user from localStorage on first load
  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch({ type: 'SET_USER', payload: user });
      } catch (error) {
        console.error('Failed to parse user data', error);
      }
    }
  }, [dispatch]);

  const login = useCallback(async (email, password) => {
    const user = await authService.login(email, password);
    
    // Store all essential user data
    localStorage.setItem('authToken', user.token);
    localStorage.setItem('userData', JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      permissions: user.permissions
    }));
    
    dispatch({ type: 'SET_USER', payload: user });
    return user;
  }, [dispatch]);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    dispatch({ type: 'LOGOUT' });
  }, [dispatch]);

  return { login, logout };
};