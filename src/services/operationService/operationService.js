import { apiService } from '../apiService';

class OperationsService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 2 * 60 * 1000; // 2 minutes for operations data
  }

  // =====================
  // CORE UTILITIES
  // =====================

  handleResponse = (response) => {
    if (response.data?.success) {
      return response.data.data;
    }
    return response.data;
  };

  handleError = (error, defaultMessage) => {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    if (error.message) {
      throw new Error(error.message);
    }
    throw new Error(defaultMessage);
  };

  buildQuery = (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    return params.toString();
  };

  clearCache = (pattern) => {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  };

  // =====================
  // SHIFTS - READ ONLY
  // =====================

  getShifts = async (filters = {}) => {
    const cacheKey = `shifts-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = `/operations/shifts`;
      console.log("operations bit url ",url)
      const response = await apiService.get(url);
            console.log("operations bit fetch ",response?.data)
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch shifts');
    }
  };

  getShiftById = async (shiftId) => {
    const cacheKey = `shift-${shiftId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/operations/shifts/${shiftId}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch shift details');
    }
  };

  getShiftReconciliation = async (shiftId) => {
    const cacheKey = `shift-reconciliation-${shiftId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/operations/shifts/${shiftId}/reconciliation`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch shift reconciliation');
    }
  };

  validateShiftData = async (shiftId) => {
    try {
      const response = await apiService.get(`/operations/shifts/${shiftId}/validate`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to validate shift data');
    }
  };

  // =====================
  // UTILITY METHODS
  // =====================

  getOpenShift = async (stationId) => {
    const cacheKey = `open-shift-${stationId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get('/operations/shifts', {
        params: {
          stationId,
          status: 'OPEN',
          limit: 1
        }
      });
      
      const data = this.handleResponse(response);
      const openShift = data?.shifts?.[0] || null;
      
      this.cache.set(cacheKey, openShift);
      return openShift;
    } catch (error) {
      throw this.handleError(error, 'Failed to check for open shift');
    }
  };

  // =====================
  // FORMATTING UTILITIES
  // =====================

  formatShift = (shift) => {
    if (!shift) return null;
    
    const startTime = new Date(shift.startTime);
    const endTime = shift.endTime ? new Date(shift.endTime) : null;
    const duration = endTime ? this.calculateDuration(startTime, endTime) : this.calculateDuration(startTime, new Date());

    return {
      ...shift,
      displayName: `Shift ${shift.shiftNumber}`,
      startTimeDisplay: startTime.toLocaleString(),
      endTimeDisplay: endTime ? endTime.toLocaleString() : 'Ongoing',
      durationDisplay: duration,
      statusDisplay: this.getStatusDisplay(shift.status),
      statusColor: this.getStatusColor(shift.status),
      supervisorDisplay: shift.supervisor ? 
        `${shift.supervisor.firstName} ${shift.supervisor.lastName}` : 
        'Unknown',
      stationDisplay: shift.station?.name || 'Unknown Station'
    };
  };

  calculateDuration = (startTime, endTime) => {
    const diffMs = endTime - startTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  getStatusDisplay = (status) => {
    const statusMap = {
      'OPEN': 'Open',
      'CLOSED': 'Closed',
      'UNDER_REVIEW': 'Under Review',
      'APPROVED': 'Approved'
    };
    return statusMap[status] || status;
  };

  getStatusColor = (status) => {
    const colorMap = {
      'OPEN': 'green',
      'CLOSED': 'red',
      'UNDER_REVIEW': 'orange',
      'APPROVED': 'blue'
    };
    return colorMap[status] || 'default';
  };

  // =====================
  // CACHE MANAGEMENT
  // =====================

  refreshShiftsCache = (stationId = null) => {
    this.clearCache('shifts');
    if (stationId) {
      this.clearCache(`open-shift-${stationId}`);
    }
  };

  // Auto-clear cache after TTL
  startCacheCleanup = () => {
    setInterval(() => {
      const now = Date.now();
      for (const [key, { timestamp }] of this.cache.entries()) {
        if (now - timestamp > this.CACHE_TTL) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Check every minute
  };
}

export const operationsService = new OperationsService();
export default operationsService;