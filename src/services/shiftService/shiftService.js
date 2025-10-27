// services/shiftService.js
import { apiService } from '../apiService';

class ShiftService {
  constructor() {
    this.basePath = '/shifts';
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000;
    
    this.logger = {
      debug: (...args) => console.log('🔍 [ShiftService]', ...args),
      info: (...args) => console.log('ℹ️ [ShiftService]', ...args),
      warn: (...args) => console.warn('⚠️ [ShiftService]', ...args),
      error: (...args) => console.error('❌ [ShiftService]', ...args)
    };

    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      cacheEnabled: true
    };

    // Reading type constants
    this.READING_TYPES = {
      ALL: 'ALL',
      START_ONLY: 'START_ONLY',
      END_ONLY: 'END_ONLY',
      CONSUMPTION_ONLY: 'CONSUMPTION_ONLY'
    };
  }

  // ==================== CORE UTILITIES ====================

  #handleResponse(response, operation) {
    if (response.data?.success) {
      this.logger.debug(`${operation} successful`);
      return response.data;
    }
    
    if (response.data) {
      this.logger.debug(`${operation} successful (direct data)`);
      return response.data;
    }
    
    this.logger.warn(`Unexpected response structure for ${operation}`);
    throw new Error('Invalid response format from server');
  }

  #handleError(error, operation, defaultMessage) {
    this.logger.error(`${operation} failed:`, error);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    if (error.request) {
      throw new Error('Network error. Please check your connection.');
    }

    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          throw new Error('Authentication failed. Please login again.');
        
        case 403:
          throw new Error('You do not have permission to perform this action.');
        
        case 404:
          throw new Error('Requested resource not found.');
        
        case 400:
        case 422:
          return this.#handleValidationError(data);
        
        case 429:
          throw new Error('Too many requests. Please try again later.');
        
        case 500:
          throw new Error('Server error. Please try again later.');
        
        default:
          if (data?.message) throw new Error(data.message);
      }
    }

    throw new Error(defaultMessage || 'An unexpected error occurred');
  }

  #handleValidationError(data) {
    if (data.message) throw new Error(data.message);
    if (data.errors) {
      const errorMessages = Array.isArray(data.errors) 
        ? data.errors.map(err => err.message || err).join(', ')
        : JSON.stringify(data.errors);
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    throw new Error('Validation failed');
  }

  #buildQueryParams(filters = {}) {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(item => params.append(`${key}[]`, item));
        } 
        else if (value instanceof Date) {
          params.append(key, value.toISOString());
        }
        else if (typeof value === 'object') {
          params.append(key, JSON.stringify(value));
        }
        else {
          params.append(key, value);
        }
      }
    });
    
    return params.toString();
  }

  #getCached(key) {
    if (!this.config.cacheEnabled) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`Cache hit: ${key}`);
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  #setCached(key, data) {
    if (this.config.cacheEnabled) {
      this.cache.set(key, { data, timestamp: Date.now() });
    }
  }

  async #retryOperation(operation, retries = this.config.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (error.response?.status >= 500 && i < retries - 1) {
          this.logger.warn(`Retrying operation (${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (i + 1)));
          continue;
        }
        throw error;
      }
    }
  }

  // ==================== ASSET-ENHANCED SHIFT ENDPOINTS ====================

  /**
   * GET ALL SHIFTS WITH ASSETS (Super Admin only)
   * Global view across all companies with complete asset relationships
   */
  async getAllShiftsWithAssets(filters = {}, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `all-shifts-assets-${JSON.stringify(filters)}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info('Fetching all shifts with assets across companies', filters);
      
      const queryParams = this.#buildQueryParams(filters);
      const url = `${this.basePath}/with-assets/all${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await apiService.get(url);
      const data = this.#handleResponse(response, 'All shifts with assets fetch');
      
      this.#setCached(cacheKey, data);
      this.logger.info(`Retrieved ${data.data?.shifts?.length || 0} shifts with complete asset relationships`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'All shifts with assets fetch', 'Failed to fetch all shifts with assets');
    });
  }

  /**
   * GET SHIFTS BY STATION WITH ASSETS
   * All shifts for a specific station with complete asset relationships
   */
  async getShiftsByStationWithAssets(stationId, filters = {}, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `shifts-station-assets-${stationId}-${JSON.stringify(filters)}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching shifts with assets for station ${stationId}`, filters);
      
      const queryParams = this.#buildQueryParams(filters);
      const url = `${this.basePath}/with-assets/station/${stationId}${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await apiService.get(url);
      const data = this.#handleResponse(response, 'Station shifts with assets fetch');
      
      this.#setCached(cacheKey, data);
      this.logger.info(`Retrieved ${data.data?.shifts?.length || 0} shifts for station ${stationId} with asset relationships`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Station shifts with assets fetch', 'Failed to fetch station shifts with assets');
    });
  }

  /**
   * GET SHIFTS BY COMPANY WITH ASSETS
   * All shifts across company stations with complete asset relationships
   */
  async getShiftsByCompanyWithAssets(companyId, filters = {}, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `shifts-company-assets-${companyId}-${JSON.stringify(filters)}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching shifts with assets for company ${companyId}`, filters);
      
      const queryParams = this.#buildQueryParams(filters);
      const url = `${this.basePath}/with-assets/company/${companyId}${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await apiService.get(url);
      const data = this.#handleResponse(response, 'Company shifts with assets fetch');
      
      this.#setCached(cacheKey, data);
      this.logger.info(`Retrieved ${data.data?.shifts?.length || 0} shifts for company ${companyId} with asset relationships`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Company shifts with assets fetch', 'Failed to fetch company shifts with assets');
    });
  }

  /**
   * GET SHIFT BY ID WITH ASSETS
   * Single shift with complete asset relationships and readings
   */
  async getShiftByIdWithAssets(shiftId, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `shift-assets-${shiftId}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching shift ${shiftId} with complete assets`);
      
      const response = await apiService.get(`${this.basePath}/with-assets/${shiftId}`);
      const data = this.#handleResponse(response, 'Shift with assets fetch');
      
      this.#setCached(cacheKey, data);
      this.logger.info(`Retrieved shift ${shiftId} with complete asset relationships`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift with assets fetch', 'Failed to fetch shift with assets');
    });
  }

  // ==================== LAST SHIFT READINGS ENDPOINTS ====================

  /**
   * GET LAST SHIFT READINGS BY STATION
   * Returns the last closed shift readings with only END readings
   */
  async getLastShiftReadingsByStation(stationId, options = {}) {
    return this.#retryOperation(async () => {
      const {
        forceRefresh = false
      } = options;

      const cacheKey = `last-shift-readings-station-${stationId}-end`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching last shift readings for station ${stationId}`);
      
      const url = `${this.basePath}/station/${stationId}/last-shift-readings`;
      const response = await apiService.get(url);
     
      let data = this.#handleResponse(response, 'Last shift readings by station fetch');
      
      // Extract only END readings and transform to desired structure
      data = this.#extractEndReadings(data);
      
      this.#setCached(cacheKey, data);
      
      if (data?.data?.pumpMeterReadings && Object.keys(data.data.pumpMeterReadings).length > 0) {
        this.logger.info(`Retrieved last shift END readings for station ${stationId}`);
      } else {
        this.logger.info(`No closed shifts found for station ${stationId}`);
      }
      
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Last shift readings by station fetch', 'Failed to fetch last shift readings');
    });
  }

  /**
   * GET LAST SHIFT READINGS BY COMPANY
   * Returns last shift readings for all stations in a company
   */
  async getLastShiftReadingsByCompany(companyId, options = {}) {
    return this.#retryOperation(async () => {
      const {
        forceRefresh = false
      } = options;

      const cacheKey = `last-shift-readings-company-${companyId}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching last shift readings for company ${companyId}`);
      
      const url = `${this.basePath}/company/${companyId}/last-shift-readings`;
      const response = await apiService.get(url);
      const data = this.#handleResponse(response, 'Last shift readings by company fetch');
      
      this.#setCached(cacheKey, data);
      this.logger.info(`Retrieved last shift readings for ${data.data?.stationReadings?.length || 0} stations in company ${companyId}`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Last shift readings by company fetch', 'Failed to fetch last shift readings by company');
    });
  }

  /**
   * EXTRACT ONLY END READINGS AND TRANSFORM TO SIMPLE STRUCTURE
   */
  #extractEndReadings(data) {
    if (!data?.readings) {
      return {
        success: data.success,
        message: data.message,
        data: {
          pumpMeterReadings: {},
          tankDipReadings: {}
        }
      };
    }

    const { pumpReadings, tankReadings } = data.readings;
    
    const transformedData = {
      success: data.success,
      message: data.message,
      data: {
        pumpMeterReadings: {},
        tankDipReadings: {}
      }
    };

    // Process pump end readings
    if (pumpReadings?.end) {
      pumpReadings.end.forEach(reading => {
        transformedData.data.pumpMeterReadings[reading.pumpId] = {
          electricMeter: reading.electricMeter,
          cashMeter: reading.cashMeter,
          manualMeter: reading.manualMeter,
          litersDispensed: reading.litersDispensed,
          salesValue: reading.salesValue,
          unitPrice: reading.unitPrice,
          recordedAt: reading.recordedAt
        };
      });
    }

    // Process tank end readings
    if (tankReadings?.end) {
      tankReadings.end.forEach(reading => {
        transformedData.data.tankDipReadings[reading.tankId] = {
          dipValue: reading.dipValue,
          volume: reading.volume,
          density: reading.density,
          temperature: reading.temperature,
          waterLevel: reading.waterLevel,
          recordedAt: reading.recordedAt
        };
      });
    }

    return transformedData;
  }

  // ==================== SHIFT VISIBILITY ENDPOINTS ====================

  /**
   * GET SHIFT BY ID
   * Enhanced with access control and complete relationships
   */
  async getShiftById(shiftId, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `shift-${shiftId}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching shift ${shiftId}`);
      
      const response = await apiService.get(`${this.basePath}/${shiftId}`);
      const data = this.#handleResponse(response, 'Shift fetch');
      
      this.#setCached(cacheKey, data);
      this.logger.info(`Retrieved shift ${shiftId} with complete details`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift fetch', 'Failed to fetch shift');
    });
  }

  /**
   * GET SHIFTS BY STATION
   * All shifts for a specific station with access control
   */
  async getShiftsByStation(stationId, filters = {}) {
    return this.#retryOperation(async () => {
      const cacheKey = `shifts-station-${stationId}-${JSON.stringify(filters)}`;
      
      this.logger.info(`Fetching shifts for station ${stationId}`, filters);
      
      const queryParams = this.#buildQueryParams(filters);
      const url = `${this.basePath}/station/${stationId}${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await apiService.get(url);
      const data = this.#handleResponse(response, 'Station shifts fetch');
      
      this.#setCached(cacheKey, data);
      this.logger.info(`Retrieved ${data.data?.shifts?.length || 0} shifts for station ${stationId}`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Station shifts fetch', 'Failed to fetch station shifts');
    });
  }

  /**
   * GET SHIFTS BY COMPANY
   * All shifts across company stations with access control
   */
  async getShiftsByCompany(companyId, filters = {}, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `shifts-company-${companyId}-${JSON.stringify(filters)}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info(`Fetching shifts for company ${companyId}`, filters);
      
      const queryParams = this.#buildQueryParams(filters);
      const url = `${this.basePath}/company/${companyId}${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await apiService.get(url);
      const data = this.#handleResponse(response, 'Company shifts fetch');
      
      this.#setCached(cacheKey, data);
      this.logger.info(`Retrieved ${data.data?.shifts?.length || 0} shifts for company ${companyId}`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Company shifts fetch', 'Failed to fetch company shifts');
    });
  }

  /**
   * GET ALL SHIFTS (Super Admin only)
   * Global view across all companies
   */
  async getAllShifts(filters = {}, forceRefresh = false) {
    return this.#retryOperation(async () => {
      const cacheKey = `all-shifts-${JSON.stringify(filters)}`;
      
      if (!forceRefresh) {
        const cached = this.#getCached(cacheKey);
        if (cached) return cached;
      }

      this.logger.info('Fetching all shifts across companies', filters);
      
      const queryParams = this.#buildQueryParams(filters);
      const url = `${this.basePath}${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await apiService.get(url);
      const data = this.#handleResponse(response, 'All shifts fetch');
      
      this.#setCached(cacheKey, data);
      this.logger.info(`Retrieved ${data.data?.shifts?.length || 0} shifts across all companies`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'All shifts fetch', 'Failed to fetch all shifts');
    });
  }

  // ==================== SHIFT OPERATIONS ====================

  /**
   * CREATE NEW SHIFT
   */
  async createShift(shiftData) {
    return this.#retryOperation(async () => {
      this.logger.info('Creating new shift', shiftData);
      
      const response = await apiService.post(this.basePath, shiftData);
      const data = this.#handleResponse(response, 'Shift creation');
      
      // Clear relevant cache
      this.clearShiftsCache();
      
      this.logger.info(`Shift created successfully: ${data.data?.shift?.id}`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift creation', 'Failed to create shift');
    });
  }

  /**
   * OPEN SHIFT WITH READINGS AND ASSIGNMENTS
   */
  async openShift(openData) {
    return this.#retryOperation(async () => {
      this.logger.info('Opening shift with readings', openData);
      
      const response = await apiService.post(`${this.basePath}/${openData.shiftId}/open`, openData);
      const data = this.#handleResponse(response, 'Shift opening');
      
      // Clear shift cache
      this.clearShiftCache(openData.shiftId);
      this.clearShiftsCache();
      
      this.logger.info(`Shift opened successfully: ${openData.shiftId}`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift opening', 'Failed to open shift');
    });
  }

  /**
   * CLOSE SHIFT WITH ALL READINGS AND COLLECTIONS
   */
  async closeShift(shiftId, closeData) {
    return this.#retryOperation(async () => {
      this.logger.info(`Closing shift ${shiftId}`, closeData);
      
      const response = await apiService.post(`${this.basePath}/${shiftId}/close`, closeData);
      const data = this.#handleResponse(response, 'Shift closing');
      
      // Clear relevant cache
      this.clearShiftCache(shiftId);
      this.clearShiftsCache();
      
      this.logger.info(`Shift closed successfully: ${shiftId}`);
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift closing', 'Failed to close shift');
    });
  }

  // ==================== SPECIALIZED QUERIES ====================

  /**
   * GET CURRENT OPEN SHIFT FOR STATION
   * Returns null if no open shift found (not an error)
   */
  async getCurrentOpenShift(stationId) {
    try {
      return await this.#retryOperation(async () => {
        this.logger.info(`Fetching current open shift for station ${stationId}`);
        
        const response = await apiService.get(`${this.basePath}/station/${stationId}/current`);
        const data = this.#handleResponse(response, 'Current open shift fetch');
        
        // ✅ Backend now returns 200 with data: null for no open shift
        if (data.success && data.data === null) {
          this.logger.info(`No open shift found for station ${stationId}`);
          return { 
            success: true, 
            data: null, 
            message: 'No open shift found' 
          };
        }
        
        this.logger.info(`Found open shift for station ${stationId}:`, data.data?.shiftNumber);
        return data;
      });
    } catch (error) {
      // ✅ Only handle actual errors (network issues, server errors, station not found)
      throw this.#handleError(error, 'Current open shift fetch', 'Failed to fetch current open shift');
    }
  }

  /**
   * GET LATEST SHIFT FOR STATION
   */
  async getLatestShift(stationId) {
    return this.#retryOperation(async () => {
      this.logger.info(`Fetching latest shift for station ${stationId}`);
      
      const response = await apiService.get(`${this.basePath}/stations/${stationId}/shifts/latest`);
      const data = this.#handleResponse(response, 'Latest shift fetch');
      
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Latest shift fetch', 'Failed to fetch latest shift');
    });
  }

  /**
   * CHECK SHIFT OPENING STATUS
   */
  async checkShiftOpeningStatus(shiftId) {
    return this.#retryOperation(async () => {
      this.logger.info(`Checking opening status for shift ${shiftId}`);
      
      const response = await apiService.get(`${this.basePath}/${shiftId}/opening-status`);
      const data = this.#handleResponse(response, 'Opening status check');
      
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Opening status check', 'Failed to check opening status');
    });
  }

  /**
   * DIAGNOSE SHIFT OPENING ISSUES
   */
  async diagnoseShiftOpening(shiftId) {
    return this.#retryOperation(async () => {
      this.logger.info(`Diagnosing opening issues for shift ${shiftId}`);
      
      const response = await apiService.get(`${this.basePath}/${shiftId}/diagnose-opening`);
      const data = this.#handleResponse(response, 'Shift opening diagnosis');
      
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift opening diagnosis', 'Failed to diagnose opening issues');
    });
  }

  /**
   * GET SHIFT SALES SUMMARY
   */
  async getShiftSales(shiftId) {
    return this.#retryOperation(async () => {
      this.logger.info(`Fetching sales for shift ${shiftId}`);
      
      const response = await apiService.get(`${this.basePath}/${shiftId}/sales`);
      const data = this.#handleResponse(response, 'Shift sales fetch');
      
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift sales fetch', 'Failed to fetch shift sales');
    });
  }

  /**
   * GET ISLAND SALES AND COLLECTIONS
   */
  async getIslandSalesAndCollections(shiftId) {
    return this.#retryOperation(async () => {
      this.logger.info(`Fetching island sales and collections for shift ${shiftId}`);
      
      const response = await apiService.get(`${this.basePath}/${shiftId}/island-sales`);
      const data = this.#handleResponse(response, 'Island sales fetch');
      
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Island sales fetch', 'Failed to fetch island sales and collections');
    });
  }

  /**
   * GET SHIFT WITH PERSONNEL
   */
  async getShiftWithPersonnel(shiftId) {
    return this.#retryOperation(async () => {
      this.logger.info(`Fetching shift personnel for shift ${shiftId}`);
      
      const response = await apiService.get(`${this.basePath}/${shiftId}/personnel`);
      const data = this.#handleResponse(response, 'Shift personnel fetch');
      
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift personnel fetch', 'Failed to fetch shift personnel');
    });
  }

  /**
   * GET SHIFTS BY SUPERVISOR
   */
  async getShiftsBySupervisor(supervisorId, filters = {}) {
    return this.#retryOperation(async () => {
      this.logger.info(`Fetching shifts for supervisor ${supervisorId}`, filters);
      
      const queryParams = this.#buildQueryParams(filters);
      const url = `${this.basePath}/supervisor/${supervisorId}${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await apiService.get(url);
      const data = this.#handleResponse(response, 'Supervisor shifts fetch');
      
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Supervisor shifts fetch', 'Failed to fetch supervisor shifts');
    });
  }

  /**
   * GET SHIFTS BY ATTENDANT
   */
  async getShiftsByAttendant(attendantId, filters = {}) {
    return this.#retryOperation(async () => {
      this.logger.info(`Fetching shifts for attendant ${attendantId}`, filters);
      
      const queryParams = this.#buildQueryParams(filters);
      const url = `${this.basePath}/attendant/${attendantId}${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await apiService.get(url);
      const data = this.#handleResponse(response, 'Attendant shifts fetch');
      
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Attendant shifts fetch', 'Failed to fetch attendant shifts');
    });
  }

  /**
   * GET SHIFT ANALYTICS
   */
  async getShiftAnalytics(shiftId) {
    return this.#retryOperation(async () => {
      this.logger.info(`Fetching analytics for shift ${shiftId}`);
      
      const response = await apiService.get(`${this.basePath}/${shiftId}/analytics`);
      const data = this.#handleResponse(response, 'Shift analytics fetch');
      
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift analytics fetch', 'Failed to fetch shift analytics');
    });
  }

  /**
   * GET SHIFT DETAILS
   */
  async getShiftDetails(shiftId) {
    return this.#retryOperation(async () => {
      this.logger.info(`Fetching detailed shift information for ${shiftId}`);
      
      const response = await apiService.get(`${this.basePath}/${shiftId}/details`);
      const data = this.#handleResponse(response, 'Shift details fetch');
      
      return data;
    }).catch(error => {
      throw this.#handleError(error, 'Shift details fetch', 'Failed to fetch shift details');
    });
  }

  // ==================== ASSET-SPECIFIC METHODS ====================

  /**
   * EXTRACT ASSET CHAIN FROM SHIFT DATA
   * Processes shift data to extract complete asset relationships
   */
  extractAssetChain(shiftData) {
    if (!shiftData?.data?.shift) return null;

    const shift = shiftData.data.shift;
    
    const assetChain = {
      islands: [],
      pumps: [],
      tanks: [],
      connections: []
    };

    // Extract islands from assignments
    if (shift.shiftIslandAttendant) {
      shift.shiftIslandAttendant.forEach(assignment => {
        if (assignment.island) {
          const island = {
            ...assignment.island,
            assignmentType: assignment.assignmentType,
            attendant: assignment.attendant
          };
          
          if (!assetChain.islands.find(i => i.id === island.id)) {
            assetChain.islands.push(island);
          }
        }
      });
    }

    // Extract pumps from meter readings
    if (shift.meterReadings) {
      shift.meterReadings.forEach(reading => {
        if (reading.pump && !assetChain.pumps.find(p => p.id === reading.pump.id)) {
          assetChain.pumps.push({
            ...reading.pump,
            readings: [reading]
          });
        }
      });
    }

    // Extract tanks from dip readings
    if (shift.dipReadings) {
      shift.dipReadings.forEach(reading => {
        if (reading.tank && !assetChain.tanks.find(t => t.id === reading.tank.id)) {
          assetChain.tanks.push({
            ...reading.tank,
            readings: [reading]
          });
        }
      });
    }

    // Build connections based on asset relationships
    assetChain.connections = this.#buildAssetConnections(assetChain);

    return assetChain;
  }

  #buildAssetConnections(assetChain) {
    const connections = [];

    // Island to Pump connections
    assetChain.islands.forEach(island => {
      assetChain.pumps.forEach(pump => {
        if (pump.islandId === island.id) {
          connections.push({
            type: 'PUMP_TO_ISLAND',
            source: { type: 'PUMP', id: pump.id, name: pump.asset?.name },
            target: { type: 'ISLAND', id: island.id, name: island.name }
          });
        }
      });
    });

    // Tank to Pump connections
    assetChain.pumps.forEach(pump => {
      if (pump.tankId) {
        const tank = assetChain.tanks.find(t => t.id === pump.tankId);
        if (tank) {
          connections.push({
            type: 'TANK_TO_PUMP',
            source: { type: 'TANK', id: tank.id, name: tank.asset?.name },
            target: { type: 'PUMP', id: pump.id, name: pump.asset?.name }
          });
        }
      }
    });

    return connections;
  }

  /**
   * GET ASSET SUMMARY FOR SHIFT
   * Provides a quick overview of assets involved in the shift
   */
  getAssetSummary(shiftData) {
    if (!shiftData?.data?.shift) return null;

    const shift = shiftData.data.shift;
    
    return {
      totalIslands: shift.shiftIslandAttendant?.length || 0,
      totalPumps: new Set(shift.meterReadings?.map(r => r.pumpId)).size || 0,
      totalTanks: new Set(shift.dipReadings?.map(r => r.tankId)).size || 0,
      assignedAttendants: new Set(shift.shiftIslandAttendant?.map(a => a.attendantId)).size || 0,
      products: this.#extractProducts(shift)
    };
  }

  #extractProducts(shift) {
    const products = new Set();
    
    // Extract from pump readings
    shift.meterReadings?.forEach(reading => {
      if (reading.pump?.product) {
        products.add(reading.pump.product.name);
      }
    });
    
    // Extract from tank readings
    shift.dipReadings?.forEach(reading => {
      if (reading.tank?.product) {
        products.add(reading.tank.product.name);
      }
    });
    
    return Array.from(products);
  }

  // ==================== FILTER BUILDERS ====================

  /**
   * BUILD SHIFT FILTERS FOR DIFFERENT VISIBILITY LEVELS
   */
  buildShiftFilters(options = {}) {
    const {
      // Basic filters
      stationId,
      companyId,
      status,
      startDate,
      endDate,
      shiftNumber,
      
      // Date range options
      dateRange,
      
      // Pagination
      page = 1,
      limit = 50,
      
      // Sorting
      sortBy = 'startTime',
      sortOrder = 'desc',
      
      // Date presets
      datePreset,
      
      // Advanced filters
      statuses,
      stationIds,
      shiftNumbers,
      
      // Include options
      includeDetails = true,
      includeRelations = true,
      includeAssets = false,
      includeReadings = true
    } = options;

    const filters = {
      stationId,
      companyId,
      status,
      startDate,
      endDate,
      shiftNumber,
      page,
      limit,
      sortBy,
      sortOrder,
      includeDetails,
      includeRelations,
      includeAssets,
      includeReadings,
      statuses,
      stationIds,
      shiftNumbers
    };

    // Handle date range presets
    if (datePreset) {
      const dateRange = this.#buildDateRange(datePreset);
      filters.startDate = dateRange.start;
      filters.endDate = dateRange.end;
    }
    
    // Handle explicit date range
    if (dateRange) {
      filters.startDate = dateRange.start;
      filters.endDate = dateRange.end;
    }

    // Clean up undefined values
    return Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => {
        if (value === undefined || value === null || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      })
    );
  }

  #buildDateRange(preset) {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastWeek':
        start.setDate(now.getDate() - now.getDay() - 7);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - now.getDay() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        start.setMonth(now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  // ==================== DATA TRANSFORMERS ====================

  /**
   * TRANSFORM SHIFT DATA FOR FRONTEND CONSUMPTION
   * Handles the new backend response structure with assets
   */
  transformShiftData(apiResponse, includeAssets = false) {
    if (!apiResponse) return null;

    const responseData = apiResponse.data || apiResponse;
    
    if (!responseData.shifts && !responseData.shift) return apiResponse;

    // Handle single shift
    if (responseData.shift) {
      return this.#transformSingleShift(responseData, includeAssets);
    }

    // Handle multiple shifts
    if (responseData.shifts) {
      return this.#transformMultipleShifts(responseData, includeAssets);
    }

    return apiResponse;
  }

  #transformSingleShift(responseData, includeAssets) {
    const shift = responseData.shift;
    
    const transformed = {
      ...responseData,
      data: {
        ...responseData,
        shift: {
          ...shift,
          
          // Flatten frequently accessed relationships
          stationName: shift.station?.name,
          supervisorName: shift.supervisor ? `${shift.supervisor.firstName} ${shift.supervisor.lastName}` : null,
          companyName: shift.station?.company?.name,
          
          // Financial summary
          totalRevenue: shift.sales?.totalRevenue || shift.sales?.[0]?.totalRevenue || 0,
          totalCollections: shift.shiftCollection?.totalCollected || 0,
          
          // Status indicators
          hasDiscrepancies: shift.reconciliation?.status === 'DISCREPANCY',
          isFullyReconciled: shift.reconciliation?.status === 'COMPLETED',
          
          // Quick access to key metrics
          metrics: {
            fuelSales: shift.sales?.totalFuelRevenue || shift.sales?.[0]?.totalFuelRevenue || 0,
            nonFuelSales: shift.sales?.totalNonFuelRevenue || shift.sales?.[0]?.totalNonFuelRevenue || 0,
            cashCollected: shift.shiftCollection?.cashAmount || 0,
            mobileMoneyCollected: shift.shiftCollection?.mobileMoneyAmount || 0,
            totalAttendants: shift.shiftIslandAttendant?.length || 0,
            totalPumps: this.#getUniquePumpsCount(shift.meterReadings || [])
          },
          
          // Opening check status
          openingStatus: shift.shiftOpeningCheck || null,
          
          // Reconciliation status
          reconciliationStatus: shift.reconciliation?.status || 'PENDING',
          
          // Collections variance
          cashVariance: shift.shiftCollection?.variance || 0,
          fuelVariance: shift.reconciliation?.variance || 0
        }
      }
    };

    // Add asset chain if requested
    if (includeAssets) {
      transformed.data.assetChain = this.extractAssetChain(transformed);
      transformed.data.assetSummary = this.getAssetSummary(transformed);
    }

    return transformed;
  }

  #transformMultipleShifts(responseData, includeAssets) {
    const transformedShifts = responseData.shifts.map(shift => ({
      ...shift,
      
      // Flatten frequently accessed relationships
      stationName: shift.station?.name,
      supervisorName: shift.supervisor ? `${shift.supervisor.firstName} ${shift.supervisor.lastName}` : null,
      companyName: shift.station?.company?.name,
      
      // Financial summary
      totalRevenue: shift.sales?.totalRevenue || shift.sales?.[0]?.totalRevenue || 0,
      totalCollections: shift.shiftCollection?.totalCollected || 0,
      
      // Status indicators
      hasDiscrepancies: shift.reconciliation?.status === 'DISCREPANCY',
      isFullyReconciled: shift.reconciliation?.status === 'COMPLETED',
      
      // Quick access to key metrics
      metrics: {
        fuelSales: shift.sales?.totalFuelRevenue || shift.sales?.[0]?.totalFuelRevenue || 0,
        nonFuelSales: shift.sales?.totalNonFuelRevenue || shift.sales?.[0]?.totalNonFuelRevenue || 0,
        cashCollected: shift.shiftCollection?.cashAmount || 0,
        mobileMoneyCollected: shift.shiftCollection?.mobileMoneyAmount || 0,
        totalAttendants: shift.shiftIslandAttendant?.length || 0,
        totalPumps: this.#getUniquePumpsCount(shift.meterReadings || [])
      },
      
      // Opening check status
      openingStatus: shift.shiftOpeningCheck || null,
      
      // Reconciliation status
      reconciliationStatus: shift.reconciliation?.status || 'PENDING'
    }));

    const result = {
      ...responseData,
      shifts: transformedShifts
    };

    // Add asset summaries if requested
    if (includeAssets) {
      result.assetSummaries = transformedShifts.map(shift => 
        this.getAssetSummary({ data: { shift } })
      );
    }

    return result;
  }

  #getUniquePumpsCount(meterReadings) {
    const pumpIds = new Set();
    meterReadings.forEach(reading => {
      if (reading.pumpId) pumpIds.add(reading.pumpId);
    });
    return pumpIds.size;
  }

  /**
   * EXTRACT SUMMARY DATA FOR DASHBOARDS
   */
  extractShiftSummary(apiResponse) {
    if (!apiResponse?.data) return null;

    const { shifts, pagination, summary } = apiResponse.data;
    
    return {
      totalShifts: pagination?.totalCount || shifts?.length || 0,
      financialSummary: summary?.financials || {
        totalRevenue: shifts?.reduce((sum, shift) => sum + (shift.sales?.totalRevenue || shift.sales?.[0]?.totalRevenue || 0), 0) || 0,
        totalCollections: shifts?.reduce((sum, shift) => sum + (shift.shiftCollection?.totalCollected || 0), 0) || 0
      },
      statusBreakdown: summary?.byStatus || this.#calculateStatusBreakdown(shifts),
      qualityMetrics: summary?.quality || {
        shiftsWithVariances: shifts?.filter(shift => shift.reconciliation?.status === 'DISCREPANCY').length || 0,
        variancePercentage: 0
      },
      timeRange: summary?.timeRange || {
        oldest: shifts?.[shifts?.length - 1]?.startTime || null,
        newest: shifts?.[0]?.startTime || null
      }
    };
  }

  #calculateStatusBreakdown(shifts) {
    const breakdown = {
      OPEN: 0,
      CLOSED: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0
    };
    
    shifts?.forEach(shift => {
      if (breakdown.hasOwnProperty(shift.status)) {
        breakdown[shift.status]++;
      }
    });
    
    return breakdown;
  }

  // ==================== CACHE MANAGEMENT ====================

  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
      this.logger.info(`Cache cleared for pattern: ${pattern}`);
    } else {
      this.cache.clear();
      this.logger.info('All cache cleared');
    }
  }

  clearShiftsCache() {
    this.clearCache('shifts');
  }

  clearShiftCache(shiftId) {
    for (const key of this.cache.keys()) {
      if (key.includes(`shift-${shiftId}`)) {
        this.cache.delete(key);
      }
    }
  }

  // ==================== VALIDATION & UTILITIES ====================

  validateShiftCreation(shiftData) {
    const errors = [];
    
    if (!shiftData.stationId) errors.push('Station ID is required');
    if (!shiftData.supervisorId) errors.push('Supervisor ID is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateShiftOpening(openData) {
    const errors = [];
    
    if (!openData.shiftId) errors.push('Shift ID is required');
    if (!openData.recordedById) errors.push('Recorder ID is required');
    if (!openData.islandAssignments?.length) errors.push('At least one island assignment is required');
    if (!openData.pumpReadings?.length) errors.push('At least one pump reading is required');
    if (!openData.tankReadings?.length) errors.push('At least one tank reading is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateShiftClosing(closeData) {
    const errors = [];
    
    if (!closeData.shiftId) errors.push('Shift ID is required');
    if (!closeData.recordedById) errors.push('Recorder ID is required');
    if (!closeData.endTime) errors.push('End time is required');
    if (!closeData.pumpReadings?.length) errors.push('At least one pump reading is required');
    if (!closeData.tankReadings?.length) errors.push('At least one tank reading is required');
    if (!closeData.islandCollections?.length) errors.push('At least one island collection is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  formatShiftStatus(status) {
    const statusMap = {
      'OPEN': { label: 'Open', color: 'success', variant: 'success' },
      'CLOSED': { label: 'Closed', color: 'secondary', variant: 'secondary' },
      'UNDER_REVIEW': { label: 'Under Review', color: 'warning', variant: 'warning' },
      'APPROVED': { label: 'Approved', color: 'info', variant: 'info' }
    };
    
    return statusMap[status] || { label: status, color: 'default', variant: 'default' };
  }

  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatVolume(liters, unit = 'L') {
    return `${new Intl.NumberFormat('en-US').format(liters)} ${unit}`;
  }

  // ==================== CONFIGURATION ====================

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Configuration updated:', this.config);
  }
}

// Create singleton instance
export const shiftService = new ShiftService();

// Export constants
export const SHIFT_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED'
};

export const SHIFT_VISIBILITY = {
  BY_ID: 'BY_ID',
  BY_STATION: 'BY_STATION',
  BY_COMPANY: 'BY_COMPANY',
  ALL: 'ALL'
};

export const OPENING_CHECKS = {
  HAS_INITIAL_METER_READINGS: 'hasInitialMeterReadings',
  HAS_INITIAL_DIP_READINGS: 'hasInitialDipReadings',
  HAS_ATTENDANTS_ASSIGNED: 'hasAttendantsAssigned',
  HAS_NO_OPEN_SHIFTS: 'hasNoOpenShifts',
  HAS_VALID_PRICING: 'hasValidPricing',
  HAS_ASSETS_CONNECTED: 'hasAssetsConnected'
};

export const RECONCILIATION_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DISCREPANCY: 'DISCREPANCY'
};

export const COLLECTION_STATUS = {
  PENDING: 'PENDING',
  COUNTED: 'COUNTED',
  VERIFIED: 'VERIFIED',
  DISCREPANCY: 'DISCREPANCY',
  RESOLVED: 'RESOLVED'
};

// Add new constants for reading types
export const READING_TYPES = {
  ALL: 'ALL',
  START_ONLY: 'START_ONLY',
  END_ONLY: 'END_ONLY',
  CONSUMPTION_ONLY: 'CONSUMPTION_ONLY'
};

// Asset connection types
export const ASSET_CONNECTION_TYPES = {
  TANK_TO_PUMP: 'TANK_TO_PUMP',
  TANK_TO_ISLAND: 'TANK_TO_ISLAND',
  PUMP_TO_ISLAND: 'PUMP_TO_ISLAND'
};

export default shiftService;