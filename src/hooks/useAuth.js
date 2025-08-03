import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { authService } from '../services/auth/authService';

export const useAuth = () => {
  const { dispatch } = useApp();

  const login = useCallback(async (email, password) => {
  
      const user = await authService.login(email, password);
      
      // Dispatch to store user in context
      dispatch({ 
        type: 'SET_USER', 
        payload: user 
      });
      
      return user;
  
  }, [dispatch]);

  const logout = useCallback(async () => {
    await authService.logout();
    dispatch({ type: 'LOGOUT' });
  }, [dispatch]);

  return {
    login,
    logout
  };
};