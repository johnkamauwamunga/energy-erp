import { apiService } from '../apiService';

const logger = {
  debug: (...args) => console.log('🔍 [EventLogService]', ...args),
  info: (...args) => console.log('ℹ️ [EventLogService]', ...args),
  warn: (...args) => console.warn('⚠️ [EventLogService]', ...args),
  error: (...args) => console.error('❌ [EventLogService]', ...args)
};

const handleResponse = (response, operation) => {
  console.log("Event Log API Response:", response.data);
  
  if (response.data) {
    logger.debug(`${operation} successful`);
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

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

export const eventLogService = {
  // ==================== EVENT QUERIES ====================

  /**
   * Get events with role-based access control and filtering
   */
  getEvents: async (filters = {}) => {
    logger.info('Fetching events with filters:', filters);
    
    try {
      const response = await apiService.get('/events', {
        params: filters
      });
      return handleResponse(response, 'fetching events');
    } catch (error) {
      throw handleError(error, 'fetching events', 'Failed to fetch events');
    }
  },

  /**
   * Get event statistics
   */
  getEventStats: async (period = '30d') => {
    logger.info('Fetching event statistics:', { period });
    
    try {
      const response = await apiService.get('/events/stats', {
        params: { period }
      });
      return handleResponse(response, 'fetching event statistics');
    } catch (error) {
      throw handleError(error, 'fetching event statistics', 'Failed to fetch event statistics');
    }
  },

  /**
   * Get user's own activity
   */
  getUserActivity: async (filters = {}) => {
    logger.info('Fetching user activity with filters:', filters);
    
    try {
      const response = await apiService.get('/events/my-activity', {
        params: filters
      });
      return handleResponse(response, 'fetching user activity');
    } catch (error) {
      throw handleError(error, 'fetching user activity', 'Failed to fetch user activity');
    }
  },

  /**
   * Get critical events (ERROR and CRITICAL severity)
   */
  getCriticalEvents: async (filters = {}) => {
    logger.info('Fetching critical events with filters:', filters);
    
    try {
      const response = await apiService.get('/events/critical', {
        params: filters
      });
      return handleResponse(response, 'fetching critical events');
    } catch (error) {
      throw handleError(error, 'fetching critical events', 'Failed to fetch critical events');
    }
  },

  /**
   * Get events by specific entity (purchase, shift, debtor, etc.)
   */
  getEventsByEntity: async (entityType, entityId, filters = {}) => {
    logger.info(`Fetching events for ${entityType}: ${entityId}`, filters);
    
    try {
      const response = await apiService.get(`/events/entity/${entityType}/${entityId}`, {
        params: filters
      });
      return handleResponse(response, `fetching ${entityType} events`);
    } catch (error) {
      throw handleError(error, `fetching ${entityType} events`, `Failed to fetch ${entityType} events`);
    }
  },

  // ==================== EVENT CREATION ====================

  /**
   * Create manual event log entry
   */
  createEvent: async (eventData) => {
    logger.info('Creating manual event:', eventData);
    
    try {
      const response = await apiService.post('/events', eventData);
      return handleResponse(response, 'creating event');
    } catch (error) {
      throw handleError(error, 'creating event', 'Failed to create event');
    }
  },

  // ==================== EVENT EXPORT ====================

  /**
   * Export events (admin only)
   */
  exportEvents: async (filters = {}, format = 'json') => {
    logger.info('Exporting events:', { filters, format });
    
    try {
      const response = await apiService.get('/events/export', {
        params: { ...filters, format },
        responseType: format === 'csv' ? 'blob' : 'json'
      });
      
      if (format === 'csv') {
        // Handle CSV blob response
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `events-export-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return { success: true, message: 'CSV export completed' };
      }
      
      return handleResponse(response, 'exporting events');
    } catch (error) {
      throw handleError(error, 'exporting events', 'Failed to export events');
    }
  },

  // ==================== EVENT MAINTENANCE ====================

  /**
   * Clean up old events (admin only)
   */
  cleanupEvents: async (olderThanDays = 365) => {
    logger.info('Cleaning up old events:', { olderThanDays });
    
    try {
      const response = await apiService.delete('/events/cleanup', {
        data: { olderThanDays }
      });
      return handleResponse(response, 'cleaning up events');
    } catch (error) {
      throw handleError(error, 'cleaning up events', 'Failed to cleanup events');
    }
  },

  // ==================== QUICK EVENT LOGGING UTILITIES ====================

  /**
   * Quick log user activity
   */
  logUserActivity: async (action, description, metadata = {}) => {
    logger.info('Logging user activity:', { action, description });
    
    try {
      const eventData = {
        eventType: 'PROFILE_UPDATED',
        action,
        description,
        metadata,
        severity: 'INFO'
      };
      
      const response = await apiService.post('/events', eventData);
      return handleResponse(response, 'logging user activity');
    } catch (error) {
      // Don't throw errors for logging failures to avoid breaking main operations
      logger.error('Failed to log user activity:', error);
      return null;
    }
  },

  /**
   * Quick log shift event
   */
  logShiftEvent: async (shiftId, eventType, action, description, metadata = {}) => {
    logger.info('Logging shift event:', { shiftId, eventType, action });
    
    try {
      const eventData = {
        eventType,
        action,
        description,
        shiftId,
        metadata,
        severity: 'INFO'
      };
      
      const response = await apiService.post('/events', eventData);
      return handleResponse(response, 'logging shift event');
    } catch (error) {
      logger.error('Failed to log shift event:', error);
      return null;
    }
  },

  /**
   * Quick log purchase event
   */
  logPurchaseEvent: async (purchaseId, eventType, action, description, metadata = {}) => {
    logger.info('Logging purchase event:', { purchaseId, eventType, action });
    
    try {
      const eventData = {
        eventType,
        action,
        description,
        purchaseId,
        metadata: {
          purchaseId,
          ...metadata
        },
        severity: eventType === 'PURCHASE_CANCELLED' ? 'WARNING' : 'INFO'
      };
      
      const response = await apiService.post('/events', eventData);
      return handleResponse(response, 'logging purchase event');
    } catch (error) {
      logger.error('Failed to log purchase event:', error);
      return null;
    }
  },

  /**
   * Quick log debtor event
   */
  logDebtorEvent: async (debtorId, eventType, action, description, metadata = {}) => {
    logger.info('Logging debtor event:', { debtorId, eventType, action });
    
    try {
      const eventData = {
        eventType,
        action,
        description,
        debtorId,
        metadata: {
          debtorId,
          ...metadata
        },
        severity: 'INFO'
      };
      
      const response = await apiService.post('/events', eventData);
      return handleResponse(response, 'logging debtor event');
    } catch (error) {
      logger.error('Failed to log debtor event:', error);
      return null;
    }
  },

  /**
   * Quick log sale event
   */
  logSaleEvent: async (saleId, eventType, action, description, metadata = {}) => {
    logger.info('Logging sale event:', { saleId, eventType, action });
    
    try {
      const eventData = {
        eventType,
        action,
        description,
        saleId,
        metadata: {
          saleId,
          ...metadata
        },
        severity: 'INFO'
      };
      
      const response = await apiService.post('/events', eventData);
      return handleResponse(response, 'logging sale event');
    } catch (error) {
      logger.error('Failed to log sale event:', error);
      return null;
    }
  },

  // ==================== ANALYTICS & INSIGHTS ====================

  /**
   * Calculate event metrics from response data
   */
  calculateEventMetrics: (eventsData) => {
    if (!eventsData || !eventsData.events) return null;

    const events = eventsData.events;
    const totalEvents = eventsData.pagination?.total || events.length;

    // Group by event type
    const eventsByType = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});

    // Group by severity
    const eventsBySeverity = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {});

    // Group by station
    const eventsByStation = events.reduce((acc, event) => {
      const stationName = event.station?.name || 'Company Level';
      acc[stationName] = (acc[stationName] || 0) + 1;
      return acc;
    }, {});

    // Timeline data (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const eventsByDay = events.reduce((acc, event) => {
      const day = event.createdAt.split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const timelineData = last7Days.map(day => ({
      date: day,
      count: eventsByDay[day] || 0
    }));

    // Top users
    const eventsByUser = events.reduce((acc, event) => {
      if (event.user) {
        const userName = `${event.user.firstName} ${event.user.lastName}`;
        acc[userName] = (acc[userName] || 0) + 1;
      }
      return acc;
    }, {});

    const topUsers = Object.entries(eventsByUser)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalEvents,
      eventsByType,
      eventsBySeverity,
      eventsByStation,
      timelineData,
      topUsers,
      criticalCount: eventsBySeverity.CRITICAL || 0,
      errorCount: eventsBySeverity.ERROR || 0,
      warningCount: eventsBySeverity.WARNING || 0,
      infoCount: eventsBySeverity.INFO || 0
    };
  },

  /**
   * Generate event insights and alerts
   */
  generateEventInsights: (eventsData, statsData = null) => {
    const metrics = eventLogService.calculateEventMetrics(eventsData);
    if (!metrics) return null;

    const insights = [];

    // High error rate insight
    const errorRate = metrics.totalEvents > 0 ? 
      ((metrics.errorCount + metrics.criticalCount) / metrics.totalEvents) * 100 : 0;
    
    if (errorRate > 10) {
      insights.push({
        type: 'HIGH_ERROR_RATE',
        title: 'High Error Rate',
        message: `${errorRate.toFixed(1)}% of events are errors or critical issues`,
        severity: 'warning',
        suggestion: 'Review system operations and error patterns'
      });
    }

    // Critical events insight
    if (metrics.criticalCount > 0) {
      insights.push({
        type: 'CRITICAL_EVENTS_PRESENT',
        title: 'Critical Events Detected',
        message: `${metrics.criticalCount} critical events require attention`,
        severity: 'critical',
        suggestion: 'Immediately review critical events'
      });
    }

    // Activity spike insight
    if (metrics.timelineData.length >= 2) {
      const recentDays = metrics.timelineData.slice(-2);
      const growth = recentDays[1].count - recentDays[0].count;
      const growthRate = recentDays[0].count > 0 ? (growth / recentDays[0].count) * 100 : 0;

      if (growthRate > 50) {
        insights.push({
          type: 'ACTIVITY_SPIKE',
          title: 'Event Activity Spike',
          message: `Event activity increased by ${growthRate.toFixed(1)}%`,
          severity: 'info',
          suggestion: 'Monitor for unusual activity patterns'
        });
      }
    }

    // Compare with historical stats if available
    if (statsData) {
      const currentPeriodEvents = metrics.totalEvents;
      const previousPeriodEvents = statsData.totalEvents || 0;
      
      if (previousPeriodEvents > 0) {
        const change = ((currentPeriodEvents - previousPeriodEvents) / previousPeriodEvents) * 100;
        
        if (Math.abs(change) > 30) {
          insights.push({
            type: 'SIGNIFICANT_CHANGE',
            title: 'Significant Activity Change',
            message: `Event count ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% compared to previous period`,
            severity: change > 0 ? 'info' : 'warning',
            suggestion: change > 0 ? 
              'Investigate increased activity' : 
              'Review potential system issues'
          });
        }
      }
    }

    return {
      insights,
      metrics,
      healthScore: Math.max(0, 100 - (errorRate * 2)), // Simple health score
      summary: {
        totalEvents: metrics.totalEvents,
        errorRate: errorRate,
        criticalEvents: metrics.criticalCount,
        topEventType: Object.entries(metrics.eventsByType).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
      }
    };
  },

  // ==================== CHART DATA FORMATTING ====================

  /**
   * Format event data for charts
   */
  formatEventDataForCharts: (eventsData, statsData = null) => {
    const metrics = eventLogService.calculateEventMetrics(eventsData);
    if (!metrics) return null;

    // Event type distribution chart
    const typeChartData = {
      labels: Object.keys(metrics.eventsByType),
      datasets: [
        {
          label: 'Events by Type',
          data: Object.values(metrics.eventsByType),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#7CFFB2', '#FF6384'
          ]
        }
      ]
    };

    // Severity distribution chart
    const severityChartData = {
      labels: Object.keys(metrics.eventsBySeverity),
      datasets: [
        {
          label: 'Events by Severity',
          data: Object.values(metrics.eventsBySeverity),
          backgroundColor: {
            'CRITICAL': '#FF6384',
            'ERROR': '#FF9F40',
            'WARNING': '#FFCE56',
            'INFO': '#36A2EB'
          }
        }
      ]
    };

    // Timeline chart
    const timelineChartData = {
      labels: metrics.timelineData.map(day => {
        const date = new Date(day);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Events per Day',
          data: metrics.timelineData.map(day => day.count),
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };

    // Station distribution chart
    const stationChartData = {
      labels: Object.keys(metrics.eventsByStation),
      datasets: [
        {
          label: 'Events by Station',
          data: Object.values(metrics.eventsByStation),
          backgroundColor: '#4BC0C0'
        }
      ]
    };

    return {
      typeChartData,
      severityChartData,
      timelineChartData,
      stationChartData,
      metrics
    };
  },

  // ==================== FILTER UTILITIES ====================

  /**
   * Build event filters from UI state
   */
  buildEventFilters: (filterState) => {
    const filters = {};

    if (filterState.eventType) filters.eventType = filterState.eventType;
    if (filterState.stationId) filters.stationId = filterState.stationId;
    if (filterState.userId) filters.userId = filterState.userId;
    if (filterState.severity) filters.severity = filterState.severity;
    if (filterState.search) filters.search = filterState.search;
    
    if (filterState.dateRange) {
      if (filterState.dateRange.startDate) filters.startDate = filterState.dateRange.startDate;
      if (filterState.dateRange.endDate) filters.endDate = filterState.dateRange.endDate;
    }

    if (filterState.page) filters.page = filterState.page;
    if (filterState.limit) filters.limit = filterState.limit;

    return filters;
  },

  /**
   * Validate event creation data
   */
  validateEventData: (eventData) => {
    const errors = [];

    if (!eventData.eventType) {
      errors.push('Event type is required');
    }
    if (!eventData.action) {
      errors.push('Action is required');
    }
    if (eventData.action && eventData.action.length > 200) {
      errors.push('Action cannot exceed 200 characters');
    }
    if (eventData.description && eventData.description.length > 500) {
      errors.push('Description cannot exceed 500 characters');
    }

    return errors;
  },

  // ==================== EXPORT UTILITIES ====================

  /**
   * Export events to CSV format
   */
  exportEventsToCSV: (eventsData) => {
    if (!eventsData || !eventsData.events) return '';

    const csvRows = [];

    // Header
    csvRows.push('Event Log Export');
    csvRows.push(`Generated,${new Date().toLocaleString()}`);
    csvRows.push(`Total Events,${eventsData.pagination?.total || eventsData.events.length}`);
    csvRows.push('');

    // Data headers
    csvRows.push('Date,Time,Event Type,Severity,Action,Description,User,Station,Related Entity');

    // Data rows
    eventsData.events.forEach(event => {
      const date = new Date(event.createdAt);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();
      
      const user = event.user ? `${event.user.firstName} ${event.user.lastName}` : 'System';
      const station = event.station?.name || 'Company Level';
      
      let relatedEntity = '';
      if (event.purchase) relatedEntity = `Purchase: ${event.purchase.purchaseNumber}`;
      else if (event.shift) relatedEntity = `Shift: ${event.shift.shiftNumber}`;
      else if (event.debtor) relatedEntity = `Debtor: ${event.debtor.name}`;
      else if (event.sale) relatedEntity = `Sale: ${event.sale.id.slice(-8)}`;

      csvRows.push([
        dateStr,
        timeStr,
        event.eventType,
        event.severity,
        `"${event.action}"`,
        `"${event.description || ''}"`,
        user,
        station,
        `"${relatedEntity}"`
      ].join(','));
    });

    return csvRows.join('\n');
  }
};

export default eventLogService;