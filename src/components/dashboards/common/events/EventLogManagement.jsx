import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Modal,
  Form,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Tabs,
  Descriptions,
  Switch,
  DatePicker,
  Alert,
  Badge
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  FilterOutlined,
  HistoryOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { eventLogService } from '../../../../services/eventLogService/eventLogService';
import { useApp } from '../../../../context/AppContext';

const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

// Date formatting utility function
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

// Format date for display in table (shorter version)
const formatDateForTable = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays} days ago`;
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

const EventLogManagement = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    eventType: '',
    severity: '',
    stationId: '',
    userId: '',
    dateRange: []
  });
  const [activeTab, setActiveTab] = useState('all');
  const [eventDetailModalVisible, setEventDetailModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refreshIntervalRef = useRef(null);
  const currentUser = state.currentUser;

  console.log("Current User:", currentUser);

  // Role-based access control
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';
  const isStationManager = currentUser?.role === 'STATION_MANAGER';
  const isLinesManager = currentUser?.role === 'LINES_MANAGER';
  
  const canSeeAllEvents = isSuperAdmin || isCompanyAdmin;
  const canSeeStationEvents = isStationManager || isLinesManager;
  const canSeeOwnEvents = !canSeeAllEvents && !canSeeStationEvents;

  // Auto-refresh configuration
  const REFRESH_INTERVAL = 30000; // 30 seconds for events

  // Load events with role-based filtering
  const loadEvents = async (showMessage = false) => {
    setLoading(true);
    try {
      const eventFilters = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };

      // Apply role-based restrictions
      if (canSeeStationEvents && currentUser.stationId) {
        eventFilters.stationId = currentUser.stationId;
      }

      const result = await eventLogService.getEvents(eventFilters);
      
      console.log("API Response:", result);
      
      const formattedEvents = (result.events || result.data?.events || result || []).map(event => ({
        ...event,
        key: event.id,
        formattedDate: formatDateTime(event.createdAt),
        tableDate: formatDateForTable(event.createdAt),
        userDisplay: event.user ? 
          `${event.user.firstName} ${event.user.lastName}` : 
          'System',
        stationDisplay: event.station?.name || 'Company Level',
        // Handle metadata for display
        metadataDisplay: event.metadata ? JSON.stringify(event.metadata, null, 2) : null
      }));

      setEvents(formattedEvents);
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.total || result.data?.pagination?.total || result.total || formattedEvents.length
      }));

      setLastUpdated(new Date());
      setRefreshCount(prev => prev + 1);

      if (showMessage) {
        message.success(`Loaded ${formattedEvents.length} events`);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      if (showMessage) {
        message.error('Failed to load events');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load event statistics
  const loadEventStats = async () => {
    try {
      const statsData = await eventLogService.getEventStats('30d');
      setStats(statsData);
    } catch (error) {
      console.error('Error loading event stats:', error);
    }
  };

  // Main refresh function
  const refreshAllData = async (showMessage = false) => {
    await Promise.all([
      loadEvents(showMessage),
      loadEventStats()
    ]);
  };

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        refreshAllData(false);
      }, REFRESH_INTERVAL);

      return () => {
        clearInterval(refreshIntervalRef.current);
      };
    }
  }, [autoRefresh]);

  // Initial load
  useEffect(() => {
    refreshAllData(false);
  }, []);

  // Reload when filters or pagination change
  useEffect(() => {
    loadEvents(false);
  }, [filters, pagination.page, pagination.limit]);

  // Reload when tab changes
  useEffect(() => {
    if (activeTab === 'critical') {
      setFilters(prev => ({ ...prev, severity: 'CRITICAL,ERROR' }));
    } else if (activeTab === 'my-activity') {
      setFilters(prev => ({ ...prev, userId: currentUser?.id }));
    } else {
      setFilters(prev => ({ ...prev, severity: '', userId: '' }));
    }
  }, [activeTab]);

  // Manual refresh
  const handleManualRefresh = async () => {
    await refreshAllData(true);
  };

  // Toggle auto-refresh
  const handleAutoRefreshToggle = (checked) => {
    setAutoRefresh(checked);
    if (checked) {
      message.success('Auto-refresh enabled');
    } else {
      message.info('Auto-refresh disabled');
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    setFilters(prev => ({ ...prev, dateRange: dates }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      search: '',
      eventType: '',
      severity: '',
      stationId: '',
      userId: '',
      dateRange: []
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // View event details
  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    setEventDetailModalVisible(true);
  };

  // Event type configuration with colors and icons
  const eventTypeConfig = {
    // Authentication Events
    LOGIN: { color: 'green', text: 'Login', icon: <SafetyCertificateOutlined /> },
    LOGOUT: { color: 'blue', text: 'Logout', icon: <SafetyCertificateOutlined /> },
    LOGIN_FAILED: { color: 'red', text: 'Login Failed', icon: <WarningOutlined /> },
    PASSWORD_CHANGED: { color: 'purple', text: 'Password Changed', icon: <SafetyCertificateOutlined /> },
    PROFILE_UPDATED: { color: 'cyan', text: 'Profile Updated', icon: <UserOutlined /> },

    // Shift Events
    SHIFT_CREATED: { color: 'green', text: 'Shift Created', icon: <CheckCircleOutlined /> },
    SHIFT_CLOSED: { color: 'blue', text: 'Shift Closed', icon: <CheckCircleOutlined /> },
    SHIFT_REOPENED: { color: 'orange', text: 'Shift Reopened', icon: <HistoryOutlined /> },
    SHIFT_APPROVED: { color: 'green', text: 'Shift Approved', icon: <CheckCircleOutlined /> },
    SHIFT_UNDER_REVIEW: { color: 'orange', text: 'Shift Under Review', icon: <WarningOutlined /> },

    // Purchase Events
    PURCHASE_CREATED: { color: 'green', text: 'Purchase Created', icon: <CheckCircleOutlined /> },
    PURCHASE_APPROVED: { color: 'blue', text: 'Purchase Approved', icon: <CheckCircleOutlined /> },
    PURCHASE_CANCELLED: { color: 'red', text: 'Purchase Cancelled', icon: <CloseCircleOutlined /> },
    PURCHASE_UPDATED: { color: 'orange', text: 'Purchase Updated', icon: <HistoryOutlined /> },
    PURCHASE_COMPLETED: { color: 'green', text: 'Purchase Completed', icon: <CheckCircleOutlined /> },

    // Sales Events
    SALE_RECORDED: { color: 'green', text: 'Sale Recorded', icon: <CheckCircleOutlined /> },
    SALE_VOIDED: { color: 'red', text: 'Sale Voided', icon: <CloseCircleOutlined /> },
    SALE_ADJUSTED: { color: 'orange', text: 'Sale Adjusted', icon: <HistoryOutlined /> },
    BULK_SALES_UPLOAD: { color: 'purple', text: 'Bulk Sales Upload', icon: <CheckCircleOutlined /> },

    // Fuel Management
    FUEL_OFFLOAD_RECORDED: { color: 'blue', text: 'Fuel Offload', icon: <CheckCircleOutlined /> },
    FUEL_OFFLOAD_VERIFIED: { color: 'green', text: 'Fuel Offload Verified', icon: <CheckCircleOutlined /> },
    FUEL_TRANSFER: { color: 'orange', text: 'Fuel Transfer', icon: <HistoryOutlined /> },
    FUEL_ADJUSTMENT: { color: 'red', text: 'Fuel Adjustment', icon: <WarningOutlined /> },

    // Debt Management
    DEBTOR_PAYMENT_RECEIVED: { color: 'green', text: 'Payment Received', icon: <CheckCircleOutlined /> },
    DEBT_TRANSFER_PROCESSED: { color: 'blue', text: 'Debt Transfer', icon: <HistoryOutlined /> },
    DEBTOR_ACCOUNT_SEARCHED: { color: 'cyan', text: 'Debtor Search', icon: <SearchOutlined /> },
    DEBT_RECONCILIATION: { color: 'purple', text: 'Debt Reconciliation', icon: <HistoryOutlined /> },
    CROSS_STATION_SETTLEMENT: { color: 'blue', text: 'Cross Station Settlement', icon: <HistoryOutlined /> },
    PAYMENT_ALLOCATED: { color: 'green', text: 'Payment Allocated', icon: <CheckCircleOutlined /> },
    OVERPAYMENT_HANDLED: { color: 'orange', text: 'Overpayment Handled', icon: <WarningOutlined /> },
    DEBT_WRITE_OFF: { color: 'red', text: 'Debt Write Off', icon: <CloseCircleOutlined /> },
    SETTLEMENT_ACTIVITY_REPORT: { color: 'purple', text: 'Settlement Report', icon: <HistoryOutlined /> },
    DEBT_AGING_REPORT: { color: 'blue', text: 'Debt Aging Report', icon: <HistoryOutlined /> },

    // Default
    DEFAULT: { color: 'default', text: 'Unknown Event', icon: <InfoCircleOutlined /> }
  };

  // Severity configuration
  const severityConfig = {
    CRITICAL: { color: 'red', text: 'Critical', icon: <ExclamationCircleOutlined /> },
    ERROR: { color: 'volcano', text: 'Error', icon: <CloseCircleOutlined /> },
    WARNING: { color: 'orange', text: 'Warning', icon: <WarningOutlined /> },
    INFO: { color: 'blue', text: 'Info', icon: <InfoCircleOutlined /> }
  };

  // Event Type options for filter
  const eventTypeOptions = [
    // Authentication
    { value: 'LOGIN', label: 'Login' },
    { value: 'LOGOUT', label: 'Logout' },
    { value: 'LOGIN_FAILED', label: 'Login Failed' },
    { value: 'PASSWORD_CHANGED', label: 'Password Changed' },
    { value: 'PROFILE_UPDATED', label: 'Profile Updated' },

    // Shift Events
    { value: 'SHIFT_CREATED', label: 'Shift Created' },
    { value: 'SHIFT_CLOSED', label: 'Shift Closed' },
    { value: 'SHIFT_REOPENED', label: 'Shift Reopened' },
    { value: 'SHIFT_APPROVED', label: 'Shift Approved' },
    { value: 'SHIFT_UNDER_REVIEW', label: 'Shift Under Review' },

    // Purchase Events
    { value: 'PURCHASE_CREATED', label: 'Purchase Created' },
    { value: 'PURCHASE_APPROVED', label: 'Purchase Approved' },
    { value: 'PURCHASE_CANCELLED', label: 'Purchase Cancelled' },
    { value: 'PURCHASE_UPDATED', label: 'Purchase Updated' },
    { value: 'PURCHASE_COMPLETED', label: 'Purchase Completed' },

    // Sales Events
    { value: 'SALE_RECORDED', label: 'Sale Recorded' },
    { value: 'SALE_VOIDED', label: 'Sale Voided' },
    { value: 'SALE_ADJUSTED', label: 'Sale Adjusted' },
    { value: 'BULK_SALES_UPLOAD', label: 'Bulk Sales Upload' },

    // Fuel Management
    { value: 'FUEL_OFFLOAD_RECORDED', label: 'Fuel Offload' },
    { value: 'FUEL_OFFLOAD_VERIFIED', label: 'Fuel Offload Verified' },
    { value: 'FUEL_TRANSFER', label: 'Fuel Transfer' },
    { value: 'FUEL_ADJUSTMENT', label: 'Fuel Adjustment' },

    // Debt Management
    { value: 'DEBTOR_PAYMENT_RECEIVED', label: 'Payment Received' },
    { value: 'DEBT_TRANSFER_PROCESSED', label: 'Debt Transfer' },
    { value: 'DEBTOR_ACCOUNT_SEARCHED', label: 'Debtor Search' },
    { value: 'DEBT_RECONCILIATION', label: 'Debt Reconciliation' },
    { value: 'CROSS_STATION_SETTLEMENT', label: 'Cross Station Settlement' },
    { value: 'PAYMENT_ALLOCATED', label: 'Payment Allocated' },
    { value: 'OVERPAYMENT_HANDLED', label: 'Overpayment Handled' },
    { value: 'DEBT_WRITE_OFF', label: 'Debt Write Off' },
    { value: 'SETTLEMENT_ACTIVITY_REPORT', label: 'Settlement Report' },
    { value: 'DEBT_AGING_REPORT', label: 'Debt Aging Report' }
  ];

  // Compact Event Table Columns
  const eventColumns = [
    {
      title: 'Date & Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date, record) => (
        <Tooltip title={record.formattedDate}>
          <span style={{ fontSize: '12px' }}>{record.tableDate}</span>
        </Tooltip>
      ),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      width: 120,
      fixed: 'left'
    },
    {
      title: 'Event Type',
      dataIndex: 'eventType',
      key: 'eventType',
      render: (eventType) => {
        const config = eventTypeConfig[eventType] || eventTypeConfig.DEFAULT;
        return (
          <Tag 
            color={config.color} 
            icon={config.icon}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '2px', 
              whiteSpace: 'nowrap',
              fontSize: '11px',
              padding: '1px 6px',
              lineHeight: '16px',
              margin: 0
            }}
          >
            {config.text}
          </Tag>
        );
      },
      width: 140,
      filters: eventTypeOptions.map(opt => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.eventType === value,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => {
        const config = severityConfig[severity] || { color: 'default', text: severity };
        return (
          <Tag 
            color={config.color} 
            icon={config.icon}
            style={{ 
              fontSize: '11px',
              padding: '1px 6px',
              lineHeight: '16px',
              margin: 0
            }}
          >
            {config.text}
          </Tag>
        );
      },
      width: 80,
      filters: [
        { text: 'Critical', value: 'CRITICAL' },
        { text: 'Error', value: 'ERROR' },
        { text: 'Warning', value: 'WARNING' },
        { text: 'Info', value: 'INFO' }
      ],
      onFilter: (value, record) => record.severity === value,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      ellipsis: true,
      width: 150,
      render: (action) => (
        <Tooltip title={action}>
          <span style={{ fontSize: '12px' }}>{action}</span>
        </Tooltip>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 200,
      render: (description) => (
        <Tooltip title={description}>
          <span style={{ fontSize: '12px' }}>{description || '-'}</span>
        </Tooltip>
      )
    },
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <Space size={2}>
          <UserOutlined style={{ fontSize: '11px' }} />
          <span style={{ fontSize: '12px' }}>{record.userDisplay}</span>
        </Space>
      ),
      width: 120
    },
    {
      title: 'Station',
      dataIndex: 'station',
      key: 'station',
      render: (_, record) => (
        <span style={{ fontSize: '12px' }}>{record.stationDisplay}</span>
      ),
      width: 120
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="View Details">
          <Button 
            icon={<EyeOutlined style={{ fontSize: '12px' }} />} 
            size="small"
            style={{ padding: '2px 6px', height: 'auto' }}
            onClick={() => handleViewEvent(record)}
          />
        </Tooltip>
      )
    }
  ];

  // Calculate statistics for display
  const displayStats = useMemo(() => {
    if (!stats) {
      // Calculate from current events if no stats available
      const criticalCount = events.filter(e => e.severity === 'CRITICAL').length;
      const errorCount = events.filter(e => e.severity === 'ERROR').length;
      const warningCount = events.filter(e => e.severity === 'WARNING').length;
      const infoCount = events.filter(e => e.severity === 'INFO').length;
      
      const eventTypeCounts = events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {});
      
      const topEventType = Object.entries(eventTypeCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

      return {
        totalEvents: events.length,
        criticalCount,
        errorCount,
        warningCount,
        infoCount,
        topEventType
      };
    }

    return {
      totalEvents: stats.totalEvents || 0,
      criticalCount: stats.bySeverity?.CRITICAL || 0,
      errorCount: stats.bySeverity?.ERROR || 0,
      warningCount: stats.bySeverity?.WARNING || 0,
      infoCount: stats.bySeverity?.INFO || 0,
      topEventType: Object.entries(stats.byEventType || {})
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
    };
  }, [stats, events]);

  // Format last updated time
  const lastUpdatedDisplay = useMemo(() => {
    if (!lastUpdated) return 'Never';
    return lastUpdated.toLocaleTimeString();
  }, [lastUpdated]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>
                <HistoryOutlined /> Event Log Management
                {autoRefresh && (
                  <Badge 
                    dot 
                    style={{ 
                      backgroundColor: '#52c41a',
                      marginLeft: 8
                    }} 
                  />
                )}
              </h2>
              <p style={{ margin: 0, color: '#666' }}>
                {canSeeAllEvents ? 'Monitor all system events' : 
                 canSeeStationEvents ? 'View station events and activities' : 
                 'View your activity history'}
                {lastUpdated && (
                  <span style={{ marginLeft: 8, fontSize: '12px', color: '#999' }}>
                    (Updated: {lastUpdatedDisplay})
                  </span>
                )}
              </p>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Space>
                  <Tooltip title="Auto Refresh">
                    <Switch
                      checked={autoRefresh}
                      onChange={handleAutoRefreshToggle}
                      checkedChildren="Auto ON"
                      unCheckedChildren="Auto OFF"
                    />
                  </Tooltip>
                  <Tooltip title={`Refresh (${refreshCount})`}>
                    <Button
                      icon={<SyncOutlined spin={loading} />}
                      onClick={handleManualRefresh}
                      loading={loading}
                    >
                      Refresh
                    </Button>
                  </Tooltip>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Auto-refresh Status */}
      {autoRefresh && (
        <Alert
          message="Auto-refresh Enabled"
          description="Event log is automatically updated every 30 seconds."
          type="info"
          showIcon
          icon={<SyncOutlined />}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => setAutoRefresh(false)}>
              Disable
            </Button>
          }
        />
      )}

      {/* Statistics */}
      {displayStats && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={4}>
            <Card size="small">
              <Statistic
                title="Total Events"
                value={displayStats.totalEvents}
                valueStyle={{ color: '#1890ff' }}
                prefix={<HistoryOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card size="small">
              <Statistic
                title="Critical"
                value={displayStats.criticalCount}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card size="small">
              <Statistic
                title="Errors"
                value={displayStats.errorCount}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card size="small">
              <Statistic
                title="Warnings"
                value={displayStats.warningCount}
                valueStyle={{ color: '#faad14' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card size="small">
              <Statistic
                title="Most Common Event"
                value={eventTypeConfig[displayStats.topEventType]?.text || displayStats.topEventType}
                valueStyle={{ color: '#52c41a', fontSize: '14px' }}
                formatter={value => (
                  <span style={{ 
                    textOverflow: 'ellipsis', 
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    display: 'block'
                  }}>
                    {value}
                  </span>
                )}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Access Level Info */}
      <Alert
        message={
          canSeeAllEvents ? "Full System Access - Viewing all events across all stations" :
          canSeeStationEvents ? "Station-Level Access - Viewing events for your assigned stations" :
          "Personal Access - Viewing only your own activity"
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* Tabs Section */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
        >
          <TabPane 
            tab={`All Events (${events.length})`}
            key="all"
          >
            {/* Filters */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[8, 8]} align="middle">
                <Col xs={24} sm={8} md={6}>
                  <Input
                    placeholder="Search events..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    prefix={<SearchOutlined />}
                  />
                </Col>
                <Col xs={12} sm={8} md={4}>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Event Type"
                    value={filters.eventType}
                    onChange={(value) => handleFilterChange('eventType', value)}
                    allowClear
                  >
                    {eventTypeOptions.map(opt => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={12} sm={8} md={4}>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Severity"
                    value={filters.severity}
                    onChange={(value) => handleFilterChange('severity', value)}
                    allowClear
                  >
                    <Option value="CRITICAL">Critical</Option>
                    <Option value="ERROR">Error</Option>
                    <Option value="WARNING">Warning</Option>
                    <Option value="INFO">Info</Option>
                  </Select>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <RangePicker
                    style={{ width: '100%' }}
                    onChange={handleDateRangeChange}
                    value={filters.dateRange}
                  />
                </Col>
                <Col xs={12} sm={8} md={4}>
                  <Space>
                    <Button
                      icon={<FilterOutlined />}
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Events Table */}
            <Table
              columns={eventColumns}
              dataSource={events}
              loading={loading}
              rowKey="id"
              scroll={{ x: 1000 }}
              size="small"
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `Showing ${range[0]}-${range[1]} of ${total} events`,
                onChange: (page, pageSize) => {
                  setPagination(prev => ({ ...prev, page, limit: pageSize }));
                }
              }}
              style={{ fontSize: '12px' }}
              className="compact-table"
            />
          </TabPane>
          
          <TabPane 
            tab={`Critical & Errors (${displayStats?.criticalCount + displayStats?.errorCount || 0})`}
            key="critical"
          >
            {/* Critical events will automatically filter by severity */}
            <Table
              columns={eventColumns}
              dataSource={events}
              loading={loading}
              rowKey="id"
              scroll={{ x: 1000 }}
              size="small"
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `Showing ${range[0]}-${range[1]} of ${total} critical events`,
                onChange: (page, pageSize) => {
                  setPagination(prev => ({ ...prev, page, limit: pageSize }));
                }
              }}
              style={{ fontSize: '12px' }}
              className="compact-table"
            />
          </TabPane>
          
          <TabPane 
            tab="My Activity"
            key="my-activity"
          >
            {/* My activity will automatically filter by current user */}
            <Table
              columns={eventColumns}
              dataSource={events}
              loading={loading}
              rowKey="id"
              scroll={{ x: 1000 }}
              size="small"
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `Showing ${range[0]}-${range[1]} of ${total} activities`,
                onChange: (page, pageSize) => {
                  setPagination(prev => ({ ...prev, page, limit: pageSize }));
                }
              }}
              style={{ fontSize: '12px' }}
              className="compact-table"
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Event Detail Modal */}
      <Modal
        title="Event Details"
        open={eventDetailModalVisible}
        onCancel={() => setEventDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setEventDetailModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedEvent && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Date & Time" span={1}>
              {selectedEvent.formattedDate}
            </Descriptions.Item>
            <Descriptions.Item label="Event Type" span={1}>
              <Tag 
                color={eventTypeConfig[selectedEvent.eventType]?.color || 'default'}
                icon={eventTypeConfig[selectedEvent.eventType]?.icon}
              >
                {eventTypeConfig[selectedEvent.eventType]?.text || selectedEvent.eventType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Severity" span={1}>
              <Tag color={severityConfig[selectedEvent.severity]?.color || 'default'}>
                {severityConfig[selectedEvent.severity]?.text || selectedEvent.severity}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Action" span={1}>
              {selectedEvent.action}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={1}>
              {selectedEvent.description || 'No description'}
            </Descriptions.Item>
            <Descriptions.Item label="User" span={1}>
              <Space>
                <UserOutlined />
                <span>{selectedEvent.userDisplay}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Station" span={1}>
              {selectedEvent.stationDisplay}
            </Descriptions.Item>
            {selectedEvent.shift && (
              <Descriptions.Item label="Shift" span={1}>
                {selectedEvent.shift.shiftNumber}
              </Descriptions.Item>
            )}
            {selectedEvent.purchase && (
              <Descriptions.Item label="Purchase" span={1}>
                {selectedEvent.purchase.purchaseNumber}
              </Descriptions.Item>
            )}
            {selectedEvent.metadata && (
              <Descriptions.Item label="Metadata" span={1}>
                <div style={{ 
                  maxHeight: '200px', 
                  overflow: 'auto',
                  backgroundColor: '#f5f5f5',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default EventLogManagement;