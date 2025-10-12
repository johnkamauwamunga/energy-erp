import { apiService } from '../apiService';

export const userService = {
  // Create a single user
  createUser: async (userData) => {
    console.log('🟢 [USER API] Creating user:', { 
      email: userData.email, 
      role: userData.role,
      hasPassword: !!userData.password,
      stationCount: userData.stationIds ? userData.stationIds.length : 0
    });
    
    try {
      const response = await apiService.post('/users', userData);

      console.log("the user created is ",response)
      // console.log('✅ [USER API] User created successfully:', { 
      //   userId: response.data.data.id,
      //   email: response.data.data.email,
      //   tempPassword: response.data.data.tempPassword ? 'Generated' : 'Not generated'
      // });
      return response.data;
    } catch (error) {
      console.log("error ",error);
      // console.error('❌ [USER API] Failed to create user:', {
      //   error: error.response?.data?.message || error.message,
      //   status: error.response?.status,
      //   email: userData.email
      // });
      throw error;
    }
  },

  // Create multiple users in bulk
  createBulkUsers: async (usersData) => {
    console.log('🟢 [USER API] Creating users in bulk:', { 
      userCount: usersData.length,
      emails: usersData.map(u => u.email)
    });
    
    try {
      const response = await apiService.post('/users/bulk', usersData);
      console.log('✅ [USER API] Bulk users created successfully:', { 
        count: response.data.data.length,
        successCount: response.data.data.filter(u => u.id).length
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to create bulk users:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userCount: usersData.length
      });
      throw error;
    }
  },

  // Get all users with optional filters
  getUsers: async (filters = {}) => {
    console.log('🟢 [USER API] Fetching users with filters:', filters);
    
    const params = new URLSearchParams();
    
    // Add filters to params if provided
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    
    const queryString = params.toString();
    const url = queryString ? `/users?${queryString}` : '/users';
    
    try {
      const response = await apiService.get(url);
      console.log('✅ [USER API] Users fetched successfully:', { 
        count: response.data.pagination?.totalCount,
        totalPages: response.data.pagination?.totalPages,
        currentPage: response.data.pagination?.page
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to fetch users:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        filters
      });
      throw error;
    }
  },

  // Get a specific user by ID
  getUser: async (userId) => {
    console.log('🟢 [USER API] Fetching user:', { userId });
    
    try {
      const response = await apiService.get(`/users/${userId}`);
      console.log('✅ [USER API] User fetched successfully:', { 
        userId: response.data.data.id,
        email: response.data.data.email,
        role: response.data.data.role
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to fetch user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Get user by email
  getUserByEmail: async (email) => {
    console.log('🟢 [USER API] Fetching user by email:', { email });
    
    try {
      const response = await apiService.get(`/users/email/${encodeURIComponent(email)}`);
      console.log('✅ [USER API] User fetched by email successfully:', { 
        userId: response.data.data.id,
        email: response.data.data.email
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to fetch user by email:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        email
      });
      throw error;
    }
  },

  // Update user details
  updateUser: async (userId, userData) => {
    console.log('🟢 [USER API] Updating user:', { 
      userId,
      updates: Object.keys(userData)
    });
    
    try {
      const response = await apiService.put(`/users/${userId}`, userData);
      console.log('✅ [USER API] User updated successfully:', { 
        userId: response.data.data.id,
        updatedFields: Object.keys(userData)
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to update user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Update user status
  updateUserStatus: async (userId, statusData) => {
    console.log('🟢 [USER API] Updating user status:', { 
      userId, 
      newStatus: statusData.status 
    });
    
    try {
      const response = await apiService.patch(`/users/${userId}/status`, statusData);
      console.log('✅ [USER API] User status updated successfully:', { 
        userId: response.data.data.id,
        newStatus: response.data.data.status
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to update user status:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Update user password (admin function)
  updateUserPassword: async (userId, passwordData) => {
    console.log('🟢 [USER API] Updating user password:', { userId });
    
    try {
      const response = await apiService.patch(`/users/${userId}/password`, passwordData);
      console.log('✅ [USER API] User password updated successfully:', { userId });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to update user password:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Reset password by email (no token required)
  
  
 // Reset password by email (no token required)
resetPasswordByEmail: async (resetData) => {
  const { email, newPassword, confirmPassword } = resetData;
  
  console.log('🟢 [USER API] Resetting password by email:', { 
    email: email,
    hasNewPassword: !!newPassword,
    hasConfirmPassword: !!confirmPassword,
    passwordLength: newPassword?.length || 0
  });
  
  // Client-side validation before making the API call
  if (!email || !newPassword || !confirmPassword) {
    const error = new Error('All fields are required');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (newPassword !== confirmPassword) {
    const error = new Error('Passwords do not match');
    error.code = 'PASSWORD_MISMATCH';
    throw error;
  }

  // Use the userService's own password strength validation
  const passwordValidation = userService.validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    const error = new Error(passwordValidation.errors[0]);
    error.code = 'PASSWORD_STRENGTH_ERROR';
    error.details = passwordValidation.errors;
    throw error;
  }

  try {
    // Ensure payload matches exactly what backend expects
    const payload = {
      email: email.trim().toLowerCase(),
      newPassword: newPassword,
      confirmPassword: confirmPassword
    };

    console.log('📤 [USER API] Sending reset payload:', { 
      email: payload.email,
      passwordLength: payload.newPassword.length
    });

    const response = await apiService.patch('/users/password/reset', payload);
    
    console.log('✅ [USER API] Password reset successfully:', { 
      email: payload.email,
      userId: response.data.data?.userId,
      message: response.data.message
    });

    // Ensure consistent response structure
    return {
      success: true,
      message: response.data.message || 'Password reset successfully',
      data: response.data.data,
      userId: response.data.data?.userId
    };

  } catch (error) {
    console.error('❌ [USER API] Failed to reset password:', {
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
      code: error.response?.data?.code,
      email: email,
      validationErrors: error.response?.data?.errors
    });

    // Enhanced error handling with specific error types
    let errorMessage = error.response?.data?.message || error.message;
    let errorCode = error.response?.data?.code || error.code;

    // Map HTTP status codes to user-friendly messages
    if (error.response?.status === 404) {
      errorMessage = 'No account found with this email address';
      errorCode = 'USER_NOT_FOUND';
    } else if (error.response?.status === 400) {
      errorMessage = errorMessage || 'Invalid request data';
      errorCode = 'BAD_REQUEST';
    } else if (error.response?.status === 422) {
      errorMessage = errorMessage || 'Password does not meet security requirements';
      errorCode = 'VALIDATION_FAILED';
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error. Please try again later.';
      errorCode = 'SERVER_ERROR';
    } else if (!error.response) {
      errorMessage = 'Network error. Please check your connection.';
      errorCode = 'NETWORK_ERROR';
    }

    // Create enhanced error with all relevant information
    const enhancedError = new Error(errorMessage);
    enhancedError.code = errorCode;
    enhancedError.status = error.response?.status;
    enhancedError.response = error.response;
    enhancedError.details = error.response?.data?.errors;
    
    throw enhancedError;
  }
},

  // Delete a user
  deleteUser: async (userId) => {
    console.log('🟢 [USER API] Deleting user:', { userId });
    
    try {
      const response = await apiService.delete(`/users/${userId}`);
      console.log('✅ [USER API] User deleted successfully:', { userId });
      return response.data;
    } catch (error) {
      console.error('❌ [USER API] Failed to delete user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // =====================
  // ASSIGNMENT METHODS
  // =====================

  // Assign user to station
  assignUserToStation: async (assignmentData) => {
    console.log('🟢 [USER ASSIGNMENT] Assigning user to station:', assignmentData);
    
    try {
      const response = await apiService.post('/user-assignments', assignmentData);
      console.log('✅ [USER ASSIGNMENT] User assigned successfully:', {
        assignmentId: response.data.data.id,
        userId: assignmentData.userId,
        stationId: assignmentData.stationId,
        role: assignmentData.role
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to assign user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        validationErrors: error.response?.data?.errors,
        assignmentData
      });
      
      // Enhance error message for validation errors
      if (error.response?.data?.errors) {
        const enhancedError = new Error(
          `Assignment validation failed: ${error.response.data.errors.map(e => e.message).join(', ')}`
        );
        enhancedError.response = error.response;
        throw enhancedError;
      }
      
      throw error;
    }
  },

  // Bulk assign users to station
  assignUsersBulk: async (bulkData) => {
    console.log('🟢 [USER ASSIGNMENT] Bulk assigning users to station:', { 
      stationId: bulkData.stationId,
      assignmentCount: bulkData.assignments.length,
      roles: [...new Set(bulkData.assignments.map(a => a.role))]
    });
    
    try {
      const response = await apiService.post('/user-assignments/bulk', bulkData);
      
      const result = {
        ...response.data,
        // Add helper properties for easier consumption
        successCount: response.data.data?.length || 0,
        errorCount: response.data.errors?.length || 0
      };
      
      console.log('✅ [USER ASSIGNMENT] Bulk assignment completed:', {
        stationId: bulkData.stationId,
        successCount: result.successCount,
        errorCount: result.errorCount
      });
      
      return result;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to bulk assign users:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        validationErrors: error.response?.data?.errors,
        stationId: bulkData.stationId
      });
      
      // Enhance error message for validation errors
      if (error.response?.data?.errors) {
        const enhancedError = new Error(
          `Bulk assignment validation failed: ${JSON.stringify(error.response.data.errors)}`
        );
        enhancedError.response = error.response;
        throw enhancedError;
      }
      
      throw error;
    }
  },

  // Update user assignment
  updateUserAssignment: async (assignmentId, updateData) => {
    console.log('🟢 [USER ASSIGNMENT] Updating assignment:', { 
      assignmentId, 
      updateData 
    });
    
    try {
      const response = await apiService.put(`/user-assignments/${assignmentId}`, updateData);
      console.log('✅ [USER ASSIGNMENT] Assignment updated successfully:', {
        assignmentId: response.data.data.id,
        newRole: response.data.data.role
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to update assignment:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        validationErrors: error.response?.data?.errors,
        assignmentId
      });
      throw error;
    }
  },

  // Unassign user from station
  unassignUserFromStation: async (assignmentId) => {
    console.log('🟢 [USER ASSIGNMENT] Unassigning user:', { assignmentId });
    
    try {
      const response = await apiService.delete(`/user-assignments/${assignmentId}`);
      console.log('✅ [USER ASSIGNMENT] User unassigned successfully:', { 
        assignmentId,
        message: response.data.message
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to unassign user:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        assignmentId
      });
      throw error;
    }
  },

  // Get assignment by ID
  getAssignment: async (assignmentId) => {
    console.log('🟢 [USER ASSIGNMENT] Getting assignment:', { assignmentId });
    
    try {
      const response = await apiService.get(`/user-assignments/${assignmentId}`);
      console.log('✅ [USER ASSIGNMENT] Assignment fetched successfully:', {
        assignmentId: response.data.data.id,
        userId: response.data.data.userId,
        stationId: response.data.data.stationId
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to get assignment:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        assignmentId
      });
      throw error;
    }
  },

  // Get user assignments
  getUserAssignments: async (userId, filters = {}) => {
    console.log('🟢 [USER ASSIGNMENT] Getting user assignments:', { userId, filters });
    
    try {
      const params = new URLSearchParams();
      
      // Add filters to params if provided
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const queryString = params.toString();
      const url = queryString 
        ? `/user-assignments/user/${userId}?${queryString}`
        : `/user-assignments/user/${userId}`;
      
      const response = await apiService.get(url);
      console.log('✅ [USER ASSIGNMENT] User assignments fetched successfully:', {
        userId,
        count: response.data.data.length,
        hasPagination: !!response.data.pagination
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to get user assignments:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId
      });
      throw error;
    }
  },

  // Get station assignments
  getStationAssignments: async (stationId, filters = {}) => {
    console.log('🟢 [USER ASSIGNMENT] Getting station assignments:', { stationId, filters });
    
    try {
      const params = new URLSearchParams();
      
      // Add filters to params if provided
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const queryString = params.toString();
      const url = queryString 
        ? `/user-assignments/station/${stationId}?${queryString}`
        : `/user-assignments/station/${stationId}`;
      
      const response = await apiService.get(url);

      console.log("the response for station assignment is ",response)
      // console.log('✅ [USER ASSIGNMENT] Station assignments fetched successfully:', {
      //   stationId,
      //   count: response.data.data.length,
      //   pagination: response.data.pagination
      // });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to get station assignments:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        stationId
      });
      throw error;
    }
  },

  // Helper method to check if a user is already assigned to a station
  checkUserAssignment: async (userId, stationId) => {
    console.log('🟢 [USER ASSIGNMENT] Checking if user is assigned to station:', { 
      userId, 
      stationId 
    });
    
    try {
      // Get all user assignments and check if any match the station
      const assignments = await this.getUserAssignments(userId);
      const isAssigned = assignments.data.some(
        assignment => assignment.stationId === stationId
      );
      
      console.log('✅ [USER ASSIGNMENT] Assignment check completed:', {
        userId,
        stationId,
        isAssigned
      });
      
      return isAssigned;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENT] Failed to check user assignment:', {
        error: error.message,
        userId,
        stationId
      });
      throw error;
    }
  },

  // =====================
  // STATION-LEVEL USER MANAGEMENT
  // =====================

  // Get users by station
  getUsersByStation: async (stationId, filters = {}) => {
    console.log('🟢 [STATION USERS] Fetching users for station:', { 
      stationId, 
      filters 
    });
    
    const params = new URLSearchParams();
    
    // Add filters to params if provided
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    
    const queryString = params.toString();
    const url = queryString 
      ? `/users/station/${stationId}/users?${queryString}`
      : `/users/station/${stationId}/users`;
    
    try {
      const response = await apiService.get(url);
      console.log('✅ [STATION USERS] Station users fetched successfully:', { 
        stationId,
        count: response.data.data?.length,
        totalCount: response.data.pagination?.totalCount
      });
      return response.data;
    } catch (error) {
      console.error('❌ [STATION USERS] Failed to fetch station users:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        stationId,
        filters
      });
      throw error;
    }
  },

  // Get user's specific station assignments
  getUserStationAssignments: async (userId, stationId) => {
    console.log('🟢 [USER ASSIGNMENTS] Fetching user station assignments:', { 
      userId, 
      stationId 
    });
    
    try {
      const response = await apiService.get(`/users/${userId}/station/${stationId}/assignments`);
      console.log('✅ [USER ASSIGNMENTS] User station assignments fetched successfully:', { 
        userId,
        stationId,
        assignmentCount: response.data.data?.stationAssignments?.length
      });
      return response.data;
    } catch (error) {
      console.error('❌ [USER ASSIGNMENTS] Failed to fetch user station assignments:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        userId,
        stationId
      });
      throw error;
    }
  },

  // Get station users summary
  getStationUsersSummary: async (stationId) => {
    console.log('🟢 [STATION SUMMARY] Fetching station users summary:', { stationId });
    
    try {
      const response = await apiService.get(`/users/station/${stationId}/summary`);
      console.log('✅ [STATION SUMMARY] Station users summary fetched successfully:', { 
        stationId,
        totalUsers: response.data.data?.summary?.totalUsers
      });
      return response.data;
    } catch (error) {
      console.error('❌ [STATION SUMMARY] Failed to fetch station users summary:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        stationId
      });
      throw error;
    }
  },

  // =====================
  // HELPER METHODS FOR STATION MANAGEMENT
  // =====================

  // Get attendants for a station
  getStationAttendants: async (stationId, filters = {}) => {
    const response = await userService.getUsersByStation(stationId, {
      ...filters,
      role: 'ATTENDANT'
    });

    console.log("✅ [STATION ATTEDANTS] ", response);
    return response;
  },

  // Get supervisors for a station
  getStationSupervisors: async (stationId, filters = {}) => {
    const response = userService.getUsersByStation(stationId, {
      ...filters,
      role: 'SUPERVISOR'
    });
   console.log("✅ [STATION SUPERVISOR] ",response)
    return response;
  },

  // Get station managers for a station
  getStationManagers: async (stationId, filters = {}) => {
    return userService.getUsersByStation(stationId, {
      ...filters,
      role: 'STATION_MANAGER'
    });
  },

  // Get users by status (ACTIVE, INACTIVE, etc.)
  getStationUsersByStatus: async (stationId, status, filters = {}) => {
    return userService.getUsersByStation(stationId, {
      ...filters,
      status: status
    });
  },

  // =====================
  // UTILITY METHODS
  // =====================

  // Filter users by role from existing data (client-side filtering)
  filterUsersByRole: (users, role) => {
    return users.filter(user => user.role === role);
  },

  // Get user count by role
  getUserCountByRole: (users) => {
    return users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
  },

  // Format user for display
  formatUserDisplay: (user) => {
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      role: user.role,
      status: user.status,
      stationAssignment: user.stationAssignments?.[0],
      isActive: user.status === 'ACTIVE'
    };
  },

  // Check if user is assigned to specific station
  isUserAssignedToStation: (user, stationId) => {
    return user.stationAssignments?.some(assignment => 
      assignment.stationId === stationId
    );
  },

  // =====================
  // PASSWORD UTILITY METHODS
  // =====================

  // Validate password strength (client-side validation)
  validatePasswordStrength: (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Check if passwords match
  validatePasswordMatch: (password, confirmPassword) => {
    return {
      isValid: password === confirmPassword,
      error: password === confirmPassword ? null : 'Passwords do not match'
    };
  },

  // Generate a random secure password (for admin use)
  generateSecurePassword: () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + special;
    let password = '';
    
    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
};

export default userService;