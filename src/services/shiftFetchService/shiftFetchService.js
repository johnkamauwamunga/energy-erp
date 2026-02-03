// services/shiftFetchService.js
import { apiService } from '../apiService';

// Simple logging utility
const logger = {
  debug: (...args) => console.log('🔍 [ShiftFetchService]', ...args),
  info: (...args) => console.log('ℹ️ [ShiftFetchService]', ...args),
  warn: (...args) => console.warn('⚠️ [ShiftFetchService]', ...args),
  error: (...args) => console.error('❌ [ShiftFetchService]', ...args)
};

// Response handler utility
const handleResponse = (response, operation) => {
  console.log(`API Response for ${operation}:`, response);
  
  if (response && response.success !== undefined) {
    logger.debug(`${operation} successful`);
    return response;
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
  } else if (error.message) {
    throw error;
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

export const shiftFetchService = {
  // ==================== ADMIN/MANAGER LEVEL ENDPOINTS ====================

  /**
   * Get all shifts for a specific station (Admin/Manager)
   * @param {string} stationId - The station ID
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Shift status (OPEN, CLOSED, etc.)
   * @param {string} filters.startDate - Start date for filtering
   * @param {string} filters.endDate - End date for filtering
   * @param {number} filters.page - Page number for pagination
   * @param {number} filters.limit - Items per page
   * @returns {Promise} All shifts for station with pagination
   */
  getAllShiftsForStation: async (stationId, filters = {}) => {
    logger.info(`Getting all shifts for station: ${stationId}`, filters);
    
    try {
      const response = await apiService.get(`/shift-fetch/stations/${stationId}/shifts`, {
        params: filters
      });
      return handleResponse(response, 'fetching all shifts for station');
    } catch (error) {
      throw handleError(error, 'fetching all shifts for station', 'Failed to fetch shifts for station');
    }
  },

  /**
   * Get detailed shift information
   * @param {string} shiftId - The shift ID
   * @param {boolean} includeReadings - Whether to include meter readings
   * @returns {Promise} Detailed shift information
   */
  getShiftDetails: async (shiftId, includeReadings = false) => {
    logger.info(`Getting shift details for shift: ${shiftId}`, { includeReadings });
    
    try {
      const response = await apiService.get(`/shift-fetch/shifts/${shiftId}`, {
        params: { includeReadings }
      });
      return handleResponse(response, 'fetching shift details');
    } catch (error) {
      throw handleError(error, 'fetching shift details', 'Failed to fetch shift details');
    }
  },

  /**
   * Get current open shift for a station
   * @param {string} stationId - The station ID
   * @returns {Promise} Current open shift information
   */
  getCurrentOpenShiftForStation: async (stationId) => {
    logger.info(`Getting current open shift for station: ${stationId}`);
    
    try {
      const response = await apiService.get(`/shift-fetch/stations/${stationId}/shifts/current`);
      return handleResponse(response, 'fetching current open shift');
    } catch (error) {
      throw handleError(error, 'fetching current open shift', 'Failed to fetch current open shift');
    }
  },

  /**
   * Search shifts by shift number
   * @param {string} stationId - The station ID
   * @param {string} shiftNumber - Shift number to search for
   * @param {boolean} exactMatch - Whether to search for exact match
   * @returns {Promise} Search results
   */
  searchShiftsByNumber: async (stationId, shiftNumber, exactMatch = false) => {
    logger.info(`Searching shifts for station: ${stationId}, shift number: ${shiftNumber}`, { exactMatch });
    
    try {
      const response = await apiService.get(`/shift-fetch/stations/${stationId}/shifts/search`, {
        params: { 
          shiftNumber, 
          exactMatch: exactMatch.toString() 
        }
      });
      return handleResponse(response, 'searching shifts by number');
    } catch (error) {
      throw handleError(error, 'searching shifts by number', 'Failed to search shifts');
    }
  },

  // ==================== STAFF LEVEL ENDPOINTS ====================

  /**
   * Get shifts for the authenticated user's station (Staff)
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Shift status (OPEN, CLOSED, etc.)
   * @param {string} filters.startDate - Start date for filtering
   * @param {string} filters.endDate - End date for filtering
   * @param {number} filters.page - Page number for pagination
   * @param {number} filters.limit - Items per page
   * @returns {Promise} Shifts for user's station with pagination
   */
  getShiftsForMyStation: async (filters = {}) => {
    logger.info('Getting shifts for my station', filters);
    
    try {
      const response = await apiService.get('/shift-fetch/my-station/shifts', {
        params: filters
      });
      return handleResponse(response, 'fetching shifts for my station');
    } catch (error) {
      throw handleError(error, 'fetching shifts for my station', 'Failed to fetch shifts for your station');
    }
  },

  /**
   * Get current open shift for user's station
   * @returns {Promise} Current open shift for user's station
   */
  getCurrentOpenShiftForMyStation: async () => {
    logger.info('Getting current open shift for my station');
    
    try {
      const response = await apiService.get('/shift-fetch/my-station/shifts/current');
      return handleResponse(response, 'fetching current open shift for my station');
    } catch (error) {
      throw handleError(error, 'fetching current open shift for my station', 'Failed to fetch current open shift for your station');
    }
  },

  // ==================== DATA PROCESSING & UTILITY METHODS ====================

  /**
   * Format shift data for display
   * @param {Object} shiftData - Raw shift data from API
   * @returns {Object} Formatted shift data
   */
  formatShiftData: (shiftData) => {
    if (!shiftData) return null;
    
    return {
      id: shiftData.id,
      shiftNumber: shiftData.shiftNumber,
      status: shiftData.status,
      startTime: new Date(shiftData.startTime),
      endTime: shiftData.endTime ? new Date(shiftData.endTime) : null,
      duration: shiftData.duration,
      createdAt: new Date(shiftData.createdAt),
      updatedAt: new Date(shiftData.updatedAt),
      station: shiftData.station,
      supervisor: shiftData.supervisor,
      summary: shiftData.summary,
      details: shiftData.details,
      overview: shiftData.overview,
      counts: shiftData.counts,
      readings: shiftData.readings,
      checks: shiftData.checks,
      collections: shiftData.collections,
      reconciliation: shiftData.reconciliation,
      sales: shiftData.sales
    };
  },

  /**
   * Format station shifts response
   * @param {Object} responseData - Raw response data
   * @returns {Object} Formatted station shifts data
   */
  formatStationShifts: (responseData) => {
    if (!responseData) return null;
    
    const { station, filters, shifts, pagination } = responseData;
    
    return {
      station: {
        id: station.id,
        name: station.name,
        company: station.company
      },
      filters: filters,
      shifts: shifts.map(shift => this.formatShiftData(shift)),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalCount: pagination.totalCount,
        totalPages: pagination.totalPages,
        showing: pagination.showing,
        hasNext: pagination.page < pagination.totalPages,
        hasPrevious: pagination.page > 1
      }
    };
  },

  /**
   * Calculate shift duration in hours
   * @param {Date|string} startTime - Shift start time
   * @param {Date|string} endTime - Shift end time
   * @returns {string} Formatted duration
   */
  calculateShiftDuration: (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  },

  /**
   * Format shift status for display
   * @param {string} status - Shift status
   * @returns {Object} Formatted status with color and label
   */
  formatShiftStatus: (status) => {
    const statusConfig = {
      'OPEN': { 
        label: 'Open', 
        color: 'success', 
        icon: 'play_circle', 
        description: 'Shift is currently active' 
      },
      'CLOSED': { 
        label: 'Closed', 
        color: 'primary', 
        icon: 'check_circle', 
        description: 'Shift has been completed' 
      },
      'UNDER_REVIEW': { 
        label: 'Under Review', 
        color: 'warning', 
        icon: 'hourglass_empty', 
        description: 'Shift is being reviewed' 
      },
      'APPROVED': { 
        label: 'Approved', 
        color: 'info', 
        icon: 'verified', 
        description: 'Shift has been approved' 
      },
      'CANCELLED': { 
        label: 'Cancelled', 
        color: 'error', 
        icon: 'cancel', 
        description: 'Shift was cancelled' 
      }
    };
    
    return statusConfig[status] || { 
      label: status, 
      color: 'default', 
      icon: 'help', 
      description: 'Unknown status' 
    };
  },

  /**
   * Format supervisor information
   * @param {Object} supervisor - Supervisor data
   * @returns {Object} Formatted supervisor info
   */
  formatSupervisorInfo: (supervisor) => {
    if (!supervisor) return { name: 'N/A', email: 'N/A' };
    
    return {
      id: supervisor.id,
      name: `${supervisor.firstName} ${supervisor.lastName}`.trim(),
      firstName: supervisor.firstName,
      lastName: supervisor.lastName,
      email: supervisor.email,
      initials: supervisor.firstName && supervisor.lastName 
        ? `${supervisor.firstName.charAt(0)}${supervisor.lastName.charAt(0)}`.toUpperCase()
        : 'NA'
    };
  },

  /**
   * Format attendant information
   * @param {Object} attendant - Attendant data
   * @returns {Object} Formatted attendant info
   */
  formatAttendantInfo: (attendant) => {
    if (!attendant) return { name: 'N/A' };
    
    return {
      id: attendant.id,
      name: `${attendant.firstName} ${attendant.lastName}`.trim(),
      firstName: attendant.firstName,
      lastName: attendant.lastName,
      email: attendant.email
    };
  },

  /**
   * Format island information
   * @param {Object} island - Island data
   * @returns {Object} Formatted island info
   */
  formatIslandInfo: (island) => {
    if (!island) return { code: 'N/A', name: 'N/A' };
    
    return {
      id: island.id,
      code: island.code,
      name: island.name,
      displayName: `${island.code} - ${island.name}`
    };
  },

  /**
   * Generate shift summary statistics
   * @param {Array} shifts - Array of shifts
   * @returns {Object} Summary statistics
   */
  generateShiftStatistics: (shifts) => {
    if (!shifts || !Array.isArray(shifts)) {
      return {
        totalShifts: 0,
        openShifts: 0,
        closedShifts: 0,
        underReview: 0,
        approved: 0,
        totalDuration: 0,
        avgDuration: 0
      };
    }
    
    const totalShifts = shifts.length;
    const openShifts = shifts.filter(s => s.status === 'OPEN').length;
    const closedShifts = shifts.filter(s => s.status === 'CLOSED').length;
    const underReview = shifts.filter(s => s.status === 'UNDER_REVIEW').length;
    const approved = shifts.filter(s => s.status === 'APPROVED').length;
    
    const closedShiftsWithDuration = shifts.filter(s => 
      s.status === 'CLOSED' && s.endTime && s.startTime
    );
    
    const totalDuration = closedShiftsWithDuration.reduce((total, shift) => {
      const duration = shift.duration || 
        Math.round((new Date(shift.endTime) - new Date(shift.startTime)) / (1000 * 60 * 60));
      return total + duration;
    }, 0);
    
    const avgDuration = closedShiftsWithDuration.length > 0 
      ? totalDuration / closedShiftsWithDuration.length 
      : 0;
    
    return {
      totalShifts,
      openShifts,
      closedShifts,
      underReview,
      approved,
      totalDuration: Math.round(totalDuration),
      avgDuration: Math.round(avgDuration * 10) / 10,
      statusDistribution: {
        OPEN: { count: openShifts, percentage: totalShifts > 0 ? (openShifts / totalShifts * 100).toFixed(1) : '0.0' },
        CLOSED: { count: closedShifts, percentage: totalShifts > 0 ? (closedShifts / totalShifts * 100).toFixed(1) : '0.0' },
        UNDER_REVIEW: { count: underReview, percentage: totalShifts > 0 ? (underReview / totalShifts * 100).toFixed(1) : '0.0' },
        APPROVED: { count: approved, percentage: totalShifts > 0 ? (approved / totalShifts * 100).toFixed(1) : '0.0' }
      }
    };
  },

  /**
   * Filter shifts by various criteria
   * @param {Array} shifts - Array of shifts
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered shifts
   */
  filterShifts: (shifts, filters = {}) => {
    if (!shifts || !Array.isArray(shifts)) return [];
    
    return shifts.filter(shift => {
      // Status filter
      if (filters.status && shift.status !== filters.status) {
        return false;
      }
      
      // Date range filter
      if (filters.startDate || filters.endDate) {
        const shiftDate = new Date(shift.startTime);
        
        if (filters.startDate && shiftDate < new Date(filters.startDate)) {
          return false;
        }
        
        if (filters.endDate && shiftDate > new Date(filters.endDate)) {
          return false;
        }
      }
      
      // Supervisor filter
      if (filters.supervisorId && shift.supervisor?.id !== filters.supervisorId) {
        return false;
      }
      
      // Search term filter
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        const shiftNumberMatch = shift.shiftNumber?.toLowerCase().includes(searchTerm);
        const supervisorNameMatch = shift.supervisor?.firstName?.toLowerCase().includes(searchTerm) ||
                                   shift.supervisor?.lastName?.toLowerCase().includes(searchTerm);
        
        if (!shiftNumberMatch && !supervisorNameMatch) {
          return false;
        }
      }
      
      return true;
    });
  },

  /**
   * Sort shifts by field
   * @param {Array} shifts - Array of shifts
   * @param {string} field - Field to sort by
   * @param {string} direction - 'asc' or 'desc'
   * @returns {Array} Sorted shifts
   */
  sortShifts: (shifts, field = 'startTime', direction = 'desc') => {
    if (!shifts || !Array.isArray(shifts)) return [];
    
    return [...shifts].sort((a, b) => {
      let valueA, valueB;
      
      switch (field) {
        case 'shiftNumber':
          valueA = a.shiftNumber;
          valueB = b.shiftNumber;
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'supervisor':
          valueA = `${a.supervisor?.firstName} ${a.supervisor?.lastName}`.toLowerCase();
          valueB = `${b.supervisor?.firstName} ${b.supervisor?.lastName}`.toLowerCase();
          break;
        case 'duration':
          valueA = a.duration || 0;
          valueB = b.duration || 0;
          break;
        case 'startTime':
        default:
          valueA = new Date(a.startTime).getTime();
          valueB = new Date(b.startTime).getTime();
          break;
      }
      
      if (direction === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
  },

  /**
   * Prepare filters for API request
   * @param {Object} rawFilters - Raw filter object
   * @returns {Object} Prepared filters for API
   */
  prepareFilters: (rawFilters = {}) => {
    const filters = { ...rawFilters };
    
    // Convert dates to ISO string if they're Date objects
    if (filters.startDate instanceof Date) {
      filters.startDate = filters.startDate.toISOString();
    }
    
    if (filters.endDate instanceof Date) {
      filters.endDate = filters.endDate.toISOString();
    }
    
    // Ensure page and limit are numbers
    if (filters.page) {
      filters.page = Number(filters.page);
    }
    
    if (filters.limit) {
      filters.limit = Number(filters.limit);
    }
    
    return filters;
  },

  /**
   * Validate shift ID
   * @param {string} shiftId - Shift ID to validate
   * @returns {boolean} True if valid
   */
  validateShiftId: (shiftId) => {
    if (!shiftId) return false;
    
    // UUID validation pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(shiftId);
  },

  /**
   * Validate station ID
   * @param {string} stationId - Station ID to validate
   * @returns {boolean} True if valid
   */
  validateStationId: (stationId) => {
    if (!stationId) return false;
    
    // UUID validation pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(stationId);
  },

  /**
   * Get shift status options for dropdown
   * @returns {Array} Status options
   */
  getStatusOptions: () => {
    return [
      { value: 'OPEN', label: 'Open', color: 'success' },
      { value: 'CLOSED', label: 'Closed', color: 'primary' },
      { value: 'UNDER_REVIEW', label: 'Under Review', color: 'warning' },
      { value: 'APPROVED', label: 'Approved', color: 'info' }
    ];
  },

  /**
   * Export shifts to CSV format
   * @param {Array} shifts - Array of shifts
   * @param {Object} station - Station information
   * @returns {string} CSV formatted data
   */
  exportShiftsToCSV: (shifts, station = null) => {
    if (!shifts || !Array.isArray(shifts)) return '';
    
    const csvRows = [];
    
    // Header
    if (station) {
      csvRows.push(`Station: ${station.name}`);
      csvRows.push(`Company: ${station.company}`);
      csvRows.push('');
    }
    
    csvRows.push('Shift Report');
    csvRows.push('');
    
    // Column headers
    csvRows.push('Shift Number,Status,Start Time,End Time,Duration,Supervisor,Pump Readings,Tank Readings,Collections,Product Sales,Islands,Attendants');
    
    // Data rows
    shifts.forEach(shift => {
      const row = [
        shift.shiftNumber || '',
        shift.status || '',
        shift.startTime ? new Date(shift.startTime).toLocaleString() : '',
        shift.endTime ? new Date(shift.endTime).toLocaleString() : '',
        shift.duration ? `${shift.duration}h` : '',
        shift.supervisor ? `${shift.supervisor.firstName} ${shift.supervisor.lastName}` : '',
        shift.summary?.pumpReadings || '0',
        shift.summary?.tankReadings || '0',
        shift.summary?.collections || '0',
        shift.summary?.productSales || '0',
        shift.details?.islands?.join('; ') || '',
        shift.details?.attendants?.join('; ') || ''
      ];
      
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  },

  /**
   * Format shift timeline data for charts
   * @param {Array} shifts - Array of shifts
   * @returns {Object} Timeline data
   */
  getShiftTimelineData: (shifts) => {
    if (!shifts || !Array.isArray(shifts)) return { timeline: [], hours: {} };
    
    const timeline = shifts.map(shift => ({
      id: shift.id,
      shiftNumber: shift.shiftNumber,
      status: shift.status,
      startTime: new Date(shift.startTime),
      endTime: shift.endTime ? new Date(shift.endTime) : null,
      duration: shift.duration,
      supervisor: shift.supervisor,
      station: shift.station
    }));
    
    // Group shifts by hour of the day
    const hours = {};
    shifts.forEach(shift => {
      const hour = new Date(shift.startTime).getHours();
      if (!hours[hour]) {
        hours[hour] = 0;
      }
      hours[hour]++;
    });
    
    return { timeline, hours };
  },

  /**
   * Get user station information
   * @returns {Promise} User's station info
   */
  getUserStationInfo: async () => {
    logger.info('Getting user station information');
    
    try {
      // Use the getShiftsForMyStation endpoint to get station info
      const response = await apiService.get('/shift-fetch/my-station/shifts', {
        params: { limit: 1 }
      });
      
      if (response.success && response.data && response.data.station) {
        return {
          success: true,
          station: response.data.station
        };
      }
      
      throw new Error('Could not determine user station');
    } catch (error) {
      logger.warn('Could not get user station info:', error.message);
      return {
        success: false,
        station: null,
        message: 'You are not assigned to any station'
      };
    }
  },

  /**
   * Check if user has permission to view station
   * @param {string} stationId - Station ID to check
   * @returns {boolean} True if user can view
   */
  canViewStation: async (stationId) => {
    try {
      // Try to fetch shifts for the station
      await apiService.get(`/shift-fetch/stations/${stationId}/shifts`, {
        params: { limit: 1 }
      });
      return true;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        return false;
      }
      throw error;
    }
  }
};

export default shiftFetchService;