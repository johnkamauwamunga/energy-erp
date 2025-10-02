// src/services/eventLogService.js
import { apiService } from './apiService';

const logger = {
  debug: (...args) => console.log('🔍 [EventLogService]', ...args),
  info: (...args) => console.log('ℹ️ [EventLogService]', ...args),
  warn: (...args) => console.warn('⚠️ [EventLogService]', ...args),
  error: (...args) => console.error('❌ [EventLogService]', ...args)
};

// Event storage for offline capability
const EVENT_STORAGE_KEY = 'pending_events';
const MAX_RETRY_ATTEMPTS = 3;

class EventLogService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.retryCounts = new Map();
    this.init();
  }

  init() {
    // Set up online/offline listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Process any pending events on startup
    this.processPendingEvents();
  }

  handleOnline() {
    this.isOnline = true;
    logger.info('Connection restored - processing pending events');
    this.processPendingEvents();
  }

  handleOffline() {
    this.isOnline = false;
    logger.warn('Connection lost - events will be queued locally');
  }

  // ==================== CORE EVENT LOGGING ====================

  async logEvent(eventData) {
    const baseEvent = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      url: window.location.href,
      ...eventData
    };

    // Add user context if available
    const userContext = this.getUserContext();
    const event = { ...baseEvent, ...userContext };

    logger.debug('Logging event:', event);

    if (this.isOnline) {
      return this.sendEvent(event);
    } else {
      return this.queueEvent(event);
    }
  }

  // ==================== BUSINESS EVENT METHODS ====================

  // User Authentication Events
  async logLogin(metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.USER_AUTHENTICATION,
      eventAction: EVENT_ACTIONS.LOGIN,
      severity: EVENT_SEVERITY.INFO,
      ...metadata
    });
  }

  async logLogout(metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.USER_AUTHENTICATION,
      eventAction: EVENT_ACTIONS.LOGOUT,
      severity: EVENT_SEVERITY.INFO,
      ...metadata
    });
  }

  async logFailedLogin(metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.USER_AUTHENTICATION,
      eventAction: EVENT_ACTIONS.LOGIN_FAILED,
      severity: EVENT_SEVERITY.WARNING,
      ...metadata
    });
  }

  // Sales Events
  async logSaleCreated(saleData, metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.SALES,
      eventAction: EVENT_ACTIONS.CREATE,
      severity: EVENT_SEVERITY.INFO,
      resourceType: RESOURCE_TYPES.SALE,
      resourceId: saleData.id,
      amount: saleData.totalAmount,
      quantity: saleData.quantity,
      productId: saleData.productId,
      ...metadata
    });
  }

  async logSaleUpdated(saleId, updates, metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.SALES,
      eventAction: EVENT_ACTIONS.UPDATE,
      severity: EVENT_SEVERITY.INFO,
      resourceType: RESOURCE_TYPES.SALE,
      resourceId: saleId,
      changes: updates,
      ...metadata
    });
  }

  async logSaleVoided(saleId, reason, metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.SALES,
      eventAction: EVENT_ACTIONS.VOID,
      severity: EVENT_SEVERITY.WARNING,
      resourceType: RESOURCE_TYPES.SALE,
      resourceId: saleId,
      reason,
      ...metadata
    });
  }

  // Shift Events
  async logShiftStarted(shiftId, metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.SHIFT_MANAGEMENT,
      eventAction: EVENT_ACTIONS.START,
      severity: EVENT_SEVERITY.INFO,
      resourceType: RESOURCE_TYPES.SHIFT,
      resourceId: shiftId,
      ...metadata
    });
  }

  async logShiftEnded(shiftId, summary, metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.SHIFT_MANAGEMENT,
      eventAction: EVENT_ACTIONS.END,
      severity: EVENT_SEVERITY.INFO,
      resourceType: RESOURCE_TYPES.SHIFT,
      resourceId: shiftId,
      shiftSummary: summary,
      ...metadata
    });
  }

  // Price Management Events
  async logPriceUpdate(priceListId, changes, metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.PRICING,
      eventAction: EVENT_ACTIONS.UPDATE,
      severity: EVENT_SEVERITY.INFO,
      resourceType: RESOURCE_TYPES.PRICE_LIST,
      resourceId: priceListId,
      changes,
      ...metadata
    });
  }

  async logPriceListActivated(priceListId, metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.PRICING,
      eventAction: EVENT_ACTIONS.ACTIVATE,
      severity: EVENT_SEVERITY.INFO,
      resourceType: RESOURCE_TYPES.PRICE_LIST,
      resourceId: priceListId,
      ...metadata
    });
  }

  // Inventory Events
  async logStockAdjustment(inventoryId, adjustment, metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.INVENTORY,
      eventAction: EVENT_ACTIONS.ADJUST,
      severity: EVENT_SEVERITY.WARNING,
      resourceType: RESOURCE_TYPES.INVENTORY,
      resourceId: inventoryId,
      adjustment,
      ...metadata
    });
  }

  async logLowStockAlert(productId, currentLevel, threshold, metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.INVENTORY,
      eventAction: EVENT_ACTIONS.ALERT,
      severity: EVENT_SEVERITY.WARNING,
      resourceType: RESOURCE_TYPES.PRODUCT,
      resourceId: productId,
      currentLevel,
      threshold,
      ...metadata
    });
  }

  // System Events
  async logError(error, context = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.SYSTEM,
      eventAction: EVENT_ACTIONS.ERROR,
      severity: EVENT_SEVERITY.ERROR,
      errorMessage: error.message,
      stackTrace: error.stack,
      ...context
    });
  }

  async logPermissionDenied(action, resource, metadata = {}) {
    return this.logEvent({
      eventType: EVENT_TYPES.SECURITY,
      eventAction: EVENT_ACTIONS.DENIED,
      severity: EVENT_SEVERITY.WARNING,
      attemptedAction: action,
      attemptedResource: resource,
      ...metadata
    });
  }

  // ==================== ANALYTICS METHODS ====================

  async getEventAnalytics(filters = {}) {
    logger.info('Fetching event analytics with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/event-logs/analytics?${params.toString()}`);
      return this.handleResponse(response, 'fetching event analytics');
    } catch (error) {
      throw this.handleError(error, 'fetching event analytics', 'Failed to fetch event analytics');
    }
  }

  // Station-level Analytics
  async getStationEventAnalytics(stationId, period, periodType = 'DAILY') {
    return this.getEventAnalytics({
      stationId,
      period,
      periodType,
      groupBy: 'eventType,eventAction'
    });
  }

  async getStationUserActivity(stationId, startDate, endDate) {
    return this.getEventAnalytics({
      stationId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupBy: 'userId,eventType',
      metrics: 'eventCount,duration'
    });
  }

  async getStationPerformanceMetrics(stationId, period, periodType) {
    return this.getEventAnalytics({
      stationId,
      period,
      periodType,
      eventTypes: [
        EVENT_TYPES.SALES,
        EVENT_TYPES.SHIFT_MANAGEMENT,
        EVENT_TYPES.INVENTORY
      ].join(','),
      metrics: 'eventCount,successRate,avgDuration'
    });
  }

  // Company-level Analytics
  async getCompanyEventAnalytics(companyId, period, periodType = 'MONTHLY') {
    return this.getEventAnalytics({
      companyId,
      period,
      periodType,
      groupBy: 'stationId,eventType',
      metrics: 'eventCount,uniqueUsers'
    });
  }

  async getCompanyUserEngagement(companyId, startDate, endDate) {
    return this.getEventAnalytics({
      companyId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupBy: 'userId,stationId',
      metrics: 'eventCount,lastActive,sessionCount'
    });
  }

  async getCompanySecurityAudit(companyId, startDate, endDate) {
    return this.getEventAnalytics({
      companyId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      eventTypes: [
        EVENT_TYPES.SECURITY,
        EVENT_TYPES.USER_AUTHENTICATION
      ].join(','),
      groupBy: 'eventAction,severity',
      metrics: 'eventCount'
    });
  }

  // Cross-station Comparative Analytics
  async getMultiStationComparison(companyId, stationIds, period, periodType) {
    return this.getEventAnalytics({
      companyId,
      stationIds: stationIds.join(','),
      period,
      periodType,
      groupBy: 'stationId,eventType',
      metrics: 'eventCount,successRate,avgResponseTime'
    });
  }

  async getStationRanking(companyId, period, periodType, metric = 'eventCount') {
    return this.getEventAnalytics({
      companyId,
      period,
      periodType,
      groupBy: 'stationId',
      metrics: metric,
      sortBy: `${metric}:desc`,
      limit: 10
    });
  }

  // Trend Analysis
  async getEventTrends(filters = {}) {
    return this.getEventAnalytics({
      ...filters,
      groupBy: 'period,eventType',
      metrics: 'eventCount,uniqueUsers'
    });
  }

  async getStationEventTrends(stationId, periodType, dataPoints = 30) {
    return this.getEventTrends({
      stationId,
      periodType,
      dataPoints,
      eventTypes: [
        EVENT_TYPES.SALES,
        EVENT_TYPES.INVENTORY,
        EVENT_TYPES.SHIFT_MANAGEMENT
      ].join(',')
    });
  }

  // Real-time Dashboard Data
  async getLiveStationMetrics(stationId) {
    return this.getEventAnalytics({
      stationId,
      periodType: 'HOURLY',
      realTime: true,
      metrics: 'eventCount,activeUsers,avgResponseTime'
    });
  }

  async getCompanyOverview(companyId) {
    return this.getEventAnalytics({
      companyId,
      periodType: 'DAILY',
      realTime: true,
      groupBy: 'stationId,eventType',
      metrics: 'eventCount,activeUsers'
    });
  }

  // ==================== QUERY METHODS ====================

  async getEventLogs(filters = {}) {
    logger.info('Fetching event logs with filters:', filters);
    
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await apiService.get(`/event-logs?${params.toString()}`);
      return this.handleResponse(response, 'fetching event logs');
    } catch (error) {
      throw this.handleError(error, 'fetching event logs', 'Failed to fetch event logs');
    }
  }

  async getEventById(eventId) {
    logger.info(`Fetching event: ${eventId}`);
    
    try {
      const response = await apiService.get(`/event-logs/${eventId}`);
      return this.handleResponse(response, 'fetching event');
    } catch (error) {
      throw this.handleError(error, 'fetching event', 'Failed to fetch event');
    }
  }

  // ==================== UTILITY METHODS ====================

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getUserContext() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return {};
      
      // Decode JWT token to get user info (simple base64 decode)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      return {
        userId: payload.userId,
        companyId: payload.companyId,
        stationId: payload.stationId,
        userRole: payload.role
      };
    } catch (error) {
      logger.warn('Could not extract user context from token');
      return {};
    }
  }

  async sendEvent(event) {
    try {
      const response = await apiService.post('/event-logs', event);
      logger.debug('Event sent successfully:', event.id);
      return this.handleResponse(response, 'sending event');
    } catch (error) {
      // If sending fails, queue for retry
      await this.queueEvent(event);
      throw this.handleError(error, 'sending event', 'Failed to send event');
    }
  }

  async queueEvent(event) {
    try {
      const pendingEvents = this.getPendingEvents();
      pendingEvents.push({
        ...event,
        queuedAt: new Date().toISOString(),
        retryCount: 0
      });
      
      localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(pendingEvents));
      logger.debug('Event queued locally:', event.id);
      
      return { success: true, queued: true, id: event.id };
    } catch (error) {
      logger.error('Failed to queue event:', error);
      throw new Error('Failed to queue event for offline storage');
    }
  }

  async processPendingEvents() {
    if (!this.isOnline) return;
    
    const pendingEvents = this.getPendingEvents();
    if (pendingEvents.length === 0) return;
    
    logger.info(`Processing ${pendingEvents.length} pending events`);
    
    const successful = [];
    const failed = [];
    
    for (const event of pendingEvents) {
      try {
        await this.sendEvent(event);
        successful.push(event.id);
      } catch (error) {
        // Increment retry count
        event.retryCount = (event.retryCount || 0) + 1;
        
        if (event.retryCount >= MAX_RETRY_ATTEMPTS) {
          logger.warn(`Event ${event.id} exceeded max retry attempts, discarding`);
          failed.push(event.id);
        } else {
          // Keep in queue for next retry
          failed.push(event.id);
        }
      }
    }
    
    // Update pending events (remove successful and update failed with new retry counts)
    const updatedPending = pendingEvents.filter(event => 
      !successful.includes(event.id) && failed.includes(event.id)
    );
    
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(updatedPending));
    
    logger.info(`Processed pending events: ${successful.length} successful, ${failed.length} failed`);
  }

  getPendingEvents() {
    try {
      const stored = localStorage.getItem(EVENT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('Error reading pending events:', error);
      return [];
    }
  }

  clearPendingEvents() {
    localStorage.removeItem(EVENT_STORAGE_KEY);
  }

  handleResponse(response, operation) {
    if (response.data) {
      logger.debug(`${operation} successful`);
      return response.data;
    }
    
    logger.warn(`Unexpected response structure for ${operation}:`, response);
    throw new Error('Invalid response format from server');
  }

  handleError(error, operation, defaultMessage) {
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
  }
}

// ==================== EVENT CONSTANTS ====================

export const EVENT_TYPES = {
  USER_AUTHENTICATION: 'USER_AUTHENTICATION',
  SALES: 'SALES',
  INVENTORY: 'INVENTORY',
  PRICING: 'PRICING',
  SHIFT_MANAGEMENT: 'SHIFT_MANAGEMENT',
  SYSTEM: 'SYSTEM',
  SECURITY: 'SECURITY',
  REPORTING: 'REPORTING',
  MAINTENANCE: 'MAINTENANCE',
  CUSTOMER_SERVICE: 'CUSTOMER_SERVICE'
};

export const EVENT_ACTIONS = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  START: 'START',
  END: 'END',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  ACTIVATE: 'ACTIVATE',
  DEACTIVATE: 'DEACTIVATE',
  VOID: 'VOID',
  ADJUST: 'ADJUST',
  ALERT: 'ALERT',
  ERROR: 'ERROR',
  DENIED: 'DENIED',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT'
};

export const EVENT_SEVERITY = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

export const RESOURCE_TYPES = {
  USER: 'USER',
  STATION: 'STATION',
  SHIFT: 'SHIFT',
  SALE: 'SALE',
  PRODUCT: 'PRODUCT',
  INVENTORY: 'INVENTORY',
  PRICE_LIST: 'PRICE_LIST',
  REPORT: 'REPORT',
  COMPANY: 'COMPANY'
};

// Create and export singleton instance
export const eventLogService = new EventLogService();
export default eventLogService;