import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [ShiftService]', ...args),
  info: (...args) => console.log('ℹ️ [ShiftService]', ...args),
  warn: (...args) => console.warn('⚠️ [ShiftService]', ...args),
  error: (...args) => console.error('❌ [ShiftService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  console.log("API Response:", response.data);
  
  if (response.data) {
    logger.debug(`${operation} successful`);
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

// Error handler utility
const handleError = (error, operation, defaultMessage) => {
  logger.error(`Error during ${operation}:`, error);
  
  if (error.response) {
    const { status, data } = error.response;
    
    if (status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      throw new Error('Authentication failed. Please login again.');
    }
    
    if (status === 403) {
      throw new Error('You do not have permission to perform this action');
    }
    
    if (status === 404) {
      throw new Error('Requested resource not found');
    }
    
    if (status === 400 && data.errors) {
      const errorMessages = data.errors.map(err => err.message).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    
    if (data && data.message) {
      throw new Error(data.message);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

export const shiftService = {
  // Check if station has open shift
  checkOpenShift: async (stationId) => {
    logger.info(`Checking open shift for station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/shifts/check-open/${stationId}`);
      return handleResponse(response, 'checking open shift');
    } catch (error) {
      throw handleError(error, 'checking open shift', 'Failed to check open shift');
    }
  },

  // Validate shift opening prerequisites
  validateShiftOpening: async (stationId, supervisorId) => {
    logger.info(`Validating shift opening for station: ${stationId}, supervisor: ${supervisorId}`);
    
    try {
      const response = await apiService.post('/shifts/validate-opening', {
        stationId,
        supervisorId
      });
      return handleResponse(response, 'validating shift opening');
    } catch (error) {
      throw handleError(error, 'validating shift opening', 'Failed to validate shift opening');
    }
  },

  // Open a new shift
  openShift: async (shiftData) => {
    logger.info('Opening shift:', shiftData);
    
    try {
      const response = await apiService.post('/shifts/open', shiftData);
      return handleResponse(response, 'opening shift');
    } catch (error) {
      throw handleError(error, 'opening shift', 'Failed to open shift');
    }
  },

  // Close an existing shift
  closeShift: async (closeData) => {
    logger.info('Closing shift:', closeData);
    
    try {
      const response = await apiService.post('/shifts/close', closeData);
      return handleResponse(response, 'closing shift');
    } catch (error) {
      throw handleError(error, 'closing shift', 'Failed to close shift');
    }
  },

  // Get current open shift for user's station
  getCurrentShift: async () => {
    logger.info('Fetching current shift');
    
    try {
      const response = await apiService.get('/shifts/current');
      return handleResponse(response, 'fetching current shift');
    } catch (error) {
      throw handleError(error, 'fetching current shift', 'Failed to fetch current shift');
    }
  },

  // Get current open shift for specific station
  getCurrentShiftByStation: async (stationId) => {
    logger.info(`Fetching current shift for station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/shifts/current/${stationId}`);
      return handleResponse(response, 'fetching current shift by station');
    } catch (error) {
      throw handleError(error, 'fetching current shift by station', 'Failed to fetch current shift');
    }
  },

  // Get shift by ID
  getShiftById: async (shiftId) => {
    logger.info(`Fetching shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}`);
      return handleResponse(response, 'fetching shift by ID');
    } catch (error) {
      throw handleError(error, 'fetching shift by ID', 'Failed to fetch shift');
    }
  },

  // Get shifts with filtering and pagination
  getShifts: async (filters = {}) => {
    logger.info('Fetching shifts with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/shifts?${params.toString()}`);
      return handleResponse(response, 'fetching shifts');
    } catch (error) {
      throw handleError(error, 'fetching shifts', 'Failed to fetch shifts');
    }
  },

  // Get shift report
  getShiftReport: async (shiftId) => {
    logger.info(`Fetching shift report for: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}/report`);
      return handleResponse(response, 'fetching shift report');
    } catch (error) {
      throw handleError(error, 'fetching shift report', 'Failed to fetch shift report');
    }
  },

  // Get shift collections
  getShiftCollections: async (shiftId) => {
    logger.info(`Fetching collections for shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/shifts/${shiftId}/collections`);
      return handleResponse(response, 'fetching shift collections');
    } catch (error) {
      throw handleError(error, 'fetching shift collections', 'Failed to fetch shift collections');
    }
  },

  // Verify shift collections
  verifyCollections: async (shiftId, verificationData) => {
    logger.info(`Verifying collections for shift: ${shiftId}`, verificationData);
    
    try {
      const response = await apiService.post(`/shifts/${shiftId}/verify-collections`, verificationData);
      return handleResponse(response, 'verifying shift collections');
    } catch (error) {
      throw handleError(error, 'verifying shift collections', 'Failed to verify collections');
    }
  }
};