import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Tabs,
  Badge,
  Progress,
  Alert,
  List,
  Tag,
  Modal,
  Timeline,
  Table,
  Spin,
  message,
  notification,
  Popover
} from 'antd';
import {
  UserOutlined,
  ToolOutlined,
  TruckOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  BarChartOutlined,
  ShopOutlined,
  SafetyCertificateOutlined,
  StockOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
// import { dashboardService } from '../../../../services/dashboardService/dashboardService';
import { shiftService } from '../../../services/shiftService/shiftService';
import {dashboardService} from '../../../services/dashboardService/dashboardService'
import {useApp} from '../../../context/AppContext'

const { TabPane } = Tabs;

const StationDashboardOverview = () => {
  const {state} = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [alertPolling, setAlertPolling] = useState(null);

  // station state
  const [currentStation, setCurrentStation] = useState(state?.currentStation?.id || null);
  const stationId = currentStation;


  // Alert types and configurations
  const ALERT_TYPES = {
    SHIFT_OVERDUE: {
      icon: <ClockCircleOutlined />,
      color: '#ff4d4f',
      badge: 'error'
    },
    SHIFT_NOT_OPENED: {
      icon: <ExclamationCircleOutlined />,
      color: '#faad14',
      badge: 'warning'
    },
    DELIVERY_DELAYED: {
      icon: <TruckOutlined />,
      color: '#fa541c',
      badge: 'warning'
    },
    ASSET_DOWN: {
      icon: <ToolOutlined />,
      color: '#ff4d4f',
      badge: 'error'
    },
    LOW_STOCK: {
      icon: <AlertOutlined />,
      color: '#faad14',
      badge: 'warning'
    },
    VARIANCE_DETECTED: {
      icon: <WarningOutlined />,
      color: '#fa541c',
      badge: 'warning'
    },
    SYSTEM_ISSUE: {
      icon: <InfoCircleOutlined />,
      color: '#1890ff',
      badge: 'processing'
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await dashboardService.getStationDashboardData(stationId);
      setDashboardData(data);
      
      // Generate alerts based on the data
      const newAlerts = generateAlerts(data);
      setAlerts(prevAlerts => {
        const updatedAlerts = [...newAlerts, ...prevAlerts.slice(0, 10)]; // Keep last 10 alerts
        const unreadCount = updatedAlerts.filter(alert => !alert.read).length;
        setUnreadAlerts(unreadCount);
        return updatedAlerts;
      });

      if (isRefresh) {
        message.success('Dashboard data refreshed');
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Generate alerts based on dashboard data
  const generateAlerts = (data) => {
    const newAlerts = [];
    const now = new Date();

    // Check for shift-related alerts
    if (data._raw?.currentShift?.data === null) {
      // No open shift - check if we should have one based on time
      const currentHour = now.getHours();
      if (currentHour >= 6 && currentHour < 22) { // During operational hours
        newAlerts.push({
          id: `shift-not-opened-${now.getTime()}`,
          type: 'SHIFT_NOT_OPENED',
          title: 'No Open Shift',
          message: 'Station is operational but no shift has been opened',
          priority: 'high',
          timestamp: now.toISOString(),
          read: false,
          action: {
            label: 'Open Shift',
            onClick: () => window.open('/shifts', '_blank')
          }
        });
      }
    }

    // Check for overdue shifts
    if (data._raw?.currentShift?.data?.shift) {
      const shift = data._raw.currentShift.data.shift;
      const shiftStart = new Date(shift.startTime);
      const shiftDuration = (now - shiftStart) / (1000 * 60 * 60); // hours
      
      if (shiftDuration > 8) { // Shift open for more than 8 hours
        newAlerts.push({
          id: `shift-overdue-${shift.id}`,
          type: 'SHIFT_OVERDUE',
          title: 'Shift Overdue for Closure',
          message: `Shift ${shift.shiftNumber} has been open for ${Math.round(shiftDuration)} hours`,
          priority: 'high',
          timestamp: now.toISOString(),
          read: false,
          action: {
            label: 'Close Shift',
            onClick: () => window.open(`/shifts/${shift.id}`, '_blank')
          }
        });
      }
    }

    // Check for delayed deliveries
    data.expectedDeliveries.forEach(delivery => {
      const deliveryDate = new Date(delivery.expectedDate);
      if (deliveryDate < now && delivery.status !== 'delivered') {
        newAlerts.push({
          id: `delivery-delayed-${delivery.id}`,
          type: 'DELIVERY_DELAYED',
          title: 'Delivery Delayed',
          message: `${delivery.product} from ${delivery.supplier} is overdue`,
          priority: delivery.priority === 'high' ? 'high' : 'medium',
          timestamp: now.toISOString(),
          read: false,
          action: {
            label: 'Track Delivery',
            onClick: () => setSelectedDelivery(delivery)
          }
        });
      }
    });

    // Check for asset issues
    data.assetStatus.forEach(asset => {
      if (asset.status === 'maintenance') {
        newAlerts.push({
          id: `asset-down-${asset.id}`,
          type: 'ASSET_DOWN',
          title: 'Asset Under Maintenance',
          message: `${asset.name} is currently out of service`,
          priority: asset.type === 'pump' ? 'high' : 'medium',
          timestamp: now.toISOString(),
          read: false,
          action: {
            label: 'View Assets',
            onClick: () => setActiveTab('assets')
          }
        });
      }
    });

    // Check for low stock (simplified example)
    if (data.metrics.todaySales > data.metrics.yesterdaySales * 1.5) {
      newAlerts.push({
        id: `high-sales-${now.getTime()}`,
        type: 'LOW_STOCK',
        title: 'High Sales Activity',
        message: 'Sales are 50% higher than yesterday. Monitor stock levels.',
        priority: 'medium',
        timestamp: now.toISOString(),
        read: false
      });
    }

    return newAlerts;
  };

  // Real-time alert polling
  const startAlertPolling = useCallback(() => {
    if (alertPolling) {
      clearInterval(alertPolling);
    }

    const poll = setInterval(async () => {
      try {
        // Check for current shift status
        if (stationId) {
          const currentShift = await shiftService.getCurrentOpenShift(stationId);
          
          // If we have dashboard data, update alerts
          if (dashboardData) {
            const updatedData = {
              ...dashboardData,
              _raw: {
                ...dashboardData._raw,
                currentShift
              }
            };
            
            const newAlerts = generateAlerts(updatedData);
            if (newAlerts.length > 0) {
              setAlerts(prevAlerts => {
                const updatedAlerts = [...newAlerts, ...prevAlerts];
                const unreadCount = updatedAlerts.filter(alert => !alert.read).length;
                setUnreadAlerts(unreadCount);
                
                // Show notification for new high-priority alerts
                newAlerts.forEach(alert => {
                  if (alert.priority === 'high' && !alert.read) {
                    notification[ALERT_TYPES[alert.type].badge]({
                      message: alert.title,
                      description: alert.message,
                      placement: 'topRight',
                      duration: 5,
                      onClick: () => markAlertAsRead(alert.id)
                    });
                  }
                });
                
                return updatedAlerts;
              });
            }
          }
        }
      } catch (error) {
        console.error('Error in alert polling:', error);
      }
    }, 30000); // Poll every 30 seconds

    setAlertPolling(poll);
    return poll;
  }, [stationId, dashboardData]);

  // Mark alert as read
  const markAlertAsRead = (alertId) => {
    setAlerts(prevAlerts => {
      const updatedAlerts = prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      );
      const unreadCount = updatedAlerts.filter(alert => !alert.read).length;
      setUnreadAlerts(unreadCount);
      return updatedAlerts;
    });
  };

  // Mark all alerts as read
  const markAllAlertsAsRead = () => {
    setAlerts(prevAlerts => {
      const updatedAlerts = prevAlerts.map(alert => ({ ...alert, read: true }));
      setUnreadAlerts(0);
      return updatedAlerts;
    });
  };

  // Handle alert action
  const handleAlertAction = (alert) => {
    markAlertAsRead(alert.id);
    if (alert.action && alert.action.onClick) {
      alert.action.onClick();
    }
  };

  // Force refresh data
  const handleRefresh = async () => {
    await dashboardService.refreshStationData(stationId);
    fetchDashboardData(true);
  };

  // Initial data fetch and setup
  useEffect(() => {
    if (stationId) {
      fetchDashboardData();
    }
  }, [stationId]);

  // Start alert polling when component mounts and clean up on unmount
  useEffect(() => {
    const poll = startAlertPolling();
    return () => {
      if (poll) {
        clearInterval(poll);
      }
    };
  }, [startAlertPolling]);

  // Calculate derived metrics
  const metrics = useMemo(() => {
    if (!dashboardData?.metrics) return {};
    
    const { staffCount, activeStaff, totalAssets, operationalAssets, todaySales, monthlyTarget } = dashboardData.metrics;
    
    return {
      staffEfficiency: staffCount > 0 ? (activeStaff / staffCount) * 100 : 0,
      assetEfficiency: totalAssets > 0 ? (operationalAssets / totalAssets) * 100 : 0,
      salesProgress: monthlyTarget > 0 ? (todaySales / monthlyTarget) * 100 : 0
    };
  }, [dashboardData]);

  // Render alert badge
  const renderAlertBadge = () => {
    if (unreadAlerts === 0) return null;

    return (
      <Badge 
        count={unreadAlerts} 
        size="small" 
        style={{ 
          backgroundColor: alerts.find(a => !a.read && a.priority === 'high') ? '#ff4d4f' : '#faad14'
        }}
      />
    );
  };

  // Render alerts popover content
  const renderAlertsContent = () => (
    <div style={{ width: 350 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: '1px solid #f0f0f0'
      }}>
        <strong>System Alerts</strong>
        {unreadAlerts > 0 && (
          <Button type="link" size="small" onClick={markAllAlertsAsRead}>
            Mark all read
          </Button>
        )}
      </div>
      
      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          No alerts
        </div>
      ) : (
        <List
          size="small"
          dataSource={alerts.slice(0, 5)} // Show only 5 most recent
          renderItem={alert => (
            <List.Item
              style={{ 
                padding: '8px 0',
                border: 'none',
                opacity: alert.read ? 0.6 : 1
              }}
            >
              <List.Item.Meta
                avatar={
                  <div style={{ color: ALERT_TYPES[alert.type]?.color || '#999' }}>
                    {ALERT_TYPES[alert.type]?.icon || <InfoCircleOutlined />}
                  </div>
                }
                title={
                  <div style={{ fontSize: '13px', fontWeight: alert.read ? 'normal' : 'bold' }}>
                    {alert.title}
                  </div>
                }
                description={
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {alert.message}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: 4 }}>
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                    {alert.action && !alert.read && (
                      <Button 
                        type="link" 
                        size="small" 
                        style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                        onClick={() => handleAlertAction(alert)}
                      >
                        {alert.action.label}
                      </Button>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
      
      {alerts.length > 5 && (
        <div style={{ textAlign: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
          <Button type="link" size="small">
            View all alerts ({alerts.length})
          </Button>
        </div>
      )}
    </div>
  );

  // Render critical alerts banner
  const renderCriticalAlerts = () => {
    const criticalAlerts = alerts.filter(alert => 
      !alert.read && alert.priority === 'high'
    ).slice(0, 3); // Show max 3 critical alerts

    if (criticalAlerts.length === 0) return null;

    return (
      <div style={{ marginBottom: 16 }}>
        {criticalAlerts.map(alert => (
          <Alert
            key={alert.id}
            message={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <ExclamationCircleOutlined style={{ color: ALERT_TYPES[alert.type]?.color, marginRight: 8 }} />
                  <strong>{alert.title}:</strong> {alert.message}
                </span>
                <div>
                  {alert.action && (
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={() => handleAlertAction(alert)}
                      style={{ color: ALERT_TYPES[alert.type]?.color }}
                    >
                      {alert.action.label}
                    </Button>
                  )}
                  <Button 
                    type="text" 
                    size="small" 
                    onClick={() => markAlertAsRead(alert.id)}
                    style={{ marginLeft: 8 }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            }
            type="error"
            showIcon={false}
            closable
            onClose={() => markAlertAsRead(alert.id)}
            style={{ marginBottom: 8 }}
          />
        ))}
      </div>
    );
  };

  // Render loading state
  if (loading && !dashboardData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" tip="Loading dashboard data..." />
      </div>
    );
  }

  // Use dashboardData if available, otherwise use empty state
  const data = dashboardData || {
    name: 'Loading Station...',
    address: 'Loading address...',
    metrics: { 
      staffCount: 0, 
      activeStaff: 0, 
      totalAssets: 0, 
      operationalAssets: 0, 
      todaySales: 0,
      yesterdaySales: 0,
      salesTrend: 0,
      monthlyTarget: 0,
      monthlyProgress: 0,
      pendingDeliveries: 0,
      completedDeliveries: 0
    },
    assets: { pumps: 0, tanks: 0, posSystems: 0, vehicles: 0, other: 0 },
    expectedDeliveries: [],
    recentActivities: [],
    staffShifts: [],
    assetStatus: [],
    salesByProduct: []
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderStatsCards = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Active Staff"
            value={data.metrics.activeStaff}
            suffix={`/ ${data.metrics.staffCount}`}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
          <Progress 
            percent={Math.round(metrics.staffEfficiency || 0)} 
            size="small" 
            status="active"
            strokeColor="#1890ff"
          />
        </Card>
      </Col>
      
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Operational Assets"
            value={data.metrics.operationalAssets}
            suffix={`/ ${data.metrics.totalAssets}`}
            prefix={<ToolOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
          <Progress 
            percent={Math.round(metrics.assetEfficiency || 0)} 
            size="small" 
            status="active"
            strokeColor="#52c41a"
          />
        </Card>
      </Col>
      
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Today's Sales"
            value={data.metrics.todaySales}
            prefix={<DollarOutlined />}
            valueStyle={{ color: '#faad14' }}
            formatter={value => `KSH ${Number(value).toLocaleString()}`}
          />
          <div style={{ marginTop: 8 }}>
            {data.metrics.salesTrend > 0 ? (
              <span style={{ color: '#52c41a' }}>
                <RiseOutlined /> {data.metrics.salesTrend}%
              </span>
            ) : (
              <span style={{ color: '#ff4d4f' }}>
                <FallOutlined /> {Math.abs(data.metrics.salesTrend)}%
              </span>
            )}
            <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
              vs yesterday
            </span>
          </div>
        </Card>
      </Col>
      
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Pending Deliveries"
            value={data.metrics.pendingDeliveries}
            prefix={<TruckOutlined />}
            valueStyle={{ color: '#fa541c' }}
          />
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
            {data.metrics.completedDeliveries} completed this week
          </div>
        </Card>
      </Col>
    </Row>
  );

  const renderMonthlyProgress = () => (
    <Card style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 'bold' }}>Monthly Sales Progress</span>
        <span>{data.metrics.monthlyProgress}%</span>
      </div>
      <Progress 
        percent={data.metrics.monthlyProgress} 
        status="active" 
        strokeColor={{
          from: '#108ee9',
          to: '#87d068',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ color: '#666', fontSize: 12 }}>
          Target: KSH {data.metrics.monthlyTarget.toLocaleString()}
        </span>
        <span style={{ color: '#666', fontSize: 12 }}>
          Achieved: KSH {Math.round(data.metrics.monthlyTarget * data.metrics.monthlyProgress / 100).toLocaleString()}
        </span>
      </div>
    </Card>
  );

  const renderAssetBreakdown = () => (
    <Card 
      title={
        <span>
          <ToolOutlined /> Asset Breakdown
        </span>
      }
      extra={<Button type="link" icon={<EyeOutlined />}>View All</Button>}
      loading={refreshing}
    >
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={4}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
              {data.assets.pumps}
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>Pumps</div>
          </div>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              {data.assets.tanks}
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>Tanks</div>
          </div>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
              {data.assets.posSystems}
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>POS Systems</div>
          </div>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
              {data.assets.vehicles}
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>Vehicles</div>
          </div>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa541c' }}>
              {data.assets.other}
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>Other</div>
          </div>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#13c2c2' }}>
              {data.metrics.totalAssets}
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>Total</div>
          </div>
        </Col>
      </Row>
    </Card>
  );

  const renderExpectedDeliveries = () => (
    <Card 
      title={
        <span>
          <TruckOutlined /> Expected Deliveries
        </span>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} size="small">
          Track Delivery
        </Button>
      }
      loading={refreshing}
    >
      {data.expectedDeliveries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          No pending deliveries
        </div>
      ) : (
        <List
          dataSource={data.expectedDeliveries}
          renderItem={delivery => (
            <List.Item
              key={delivery.id}
              actions={[
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => setSelectedDelivery(delivery)}
                >
                  Details
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <div style={{
                    padding: 8,
                    borderRadius: 6,
                    backgroundColor: 
                      delivery.priority === 'high' ? '#fff2e8' :
                      delivery.priority === 'medium' ? '#f6ffed' : '#f0f5ff'
                  }}>
                    <TruckOutlined style={{
                      color: 
                        delivery.priority === 'high' ? '#fa541c' :
                        delivery.priority === 'medium' ? '#52c41a' : '#1890ff'
                    }} />
                  </div>
                }
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{delivery.product}</span>
                    <Tag color={
                      delivery.status === 'scheduled' ? 'blue' :
                      delivery.status === 'confirmed' ? 'green' : 'orange'
                    }>
                      {delivery.status}
                    </Tag>
                  </div>
                }
                description={
                  <div>
                    <div>Supplier: {delivery.supplier}</div>
                    <div>Quantity: {delivery.quantity}</div>
                    <div>
                      Expected: {new Date(delivery.expectedDate).toLocaleDateString()} at{' '}
                      {new Date(delivery.expectedDate).toLocaleTimeString()}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  const renderRecentActivities = () => {
    // Map icon strings to actual components
    const iconMap = {
      'ClockCircleOutlined': ClockCircleOutlined,
      'TruckOutlined': TruckOutlined,
      'AlertOutlined': AlertOutlined,
      'CheckCircleOutlined': CheckCircleOutlined
    };

    return (
      <Card 
        title={
          <span>
            <AlertOutlined /> Recent Activities
          </span>
        }
        extra={
          <Button 
            type="link" 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh
          </Button>
        }
        loading={refreshing}
      >
        {data.recentActivities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            No recent activities
          </div>
        ) : (
          <Timeline>
            {data.recentActivities.map(activity => {
              const IconComponent = iconMap[activity.icon] || ClockCircleOutlined;
              return (
                <Timeline.Item
                  key={activity.id}
                  color={activity.color}
                  dot={<IconComponent style={{ fontSize: '16px' }} />}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      {activity.title}
                    </div>
                    <div style={{ color: '#666', marginBottom: 4 }}>
                      {activity.description}
                    </div>
                    <div style={{ color: '#999', fontSize: 12 }}>
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                </Timeline.Item>
              );
            })}
          </Timeline>
        )}
      </Card>
    );
  };

  const renderStaffShifts = () => (
    <Card 
      title="Staff Shifts"
      loading={refreshing}
    >
      {data.staffShifts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          No shift data available
        </div>
      ) : (
        <List
          dataSource={data.staffShifts}
          renderItem={shift => (
            <List.Item
              key={shift.id}
              actions={[
                <Tag color={
                  shift.status === 'active' ? 'green' :
                  shift.status === 'upcoming' ? 'blue' : 'default'
                }>
                  {shift.status}
                </Tag>
              ]}
            >
              <List.Item.Meta
                avatar={<UserOutlined />}
                title={shift.name}
                description={
                  <div>
                    <div>Time: {shift.startTime} - {shift.endTime}</div>
                    <div>Staff: {shift.staffCount} attendants</div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  const renderSalesByProduct = () => (
    <Card 
      title="Sales by Product"
      loading={refreshing}
    >
      <Table
        dataSource={data.salesByProduct}
        pagination={false}
        size="small"
        rowKey="product"
        columns={[
          {
            title: 'Product',
            dataIndex: 'product',
            key: 'product',
          },
          {
            title: 'Sales (KSH)',
            dataIndex: 'sales',
            key: 'sales',
            render: (value) => value.toLocaleString(),
          },
          {
            title: 'Volume (L)',
            dataIndex: 'volume',
            key: 'volume',
            render: (value) => value?.toLocaleString() || '0',
          },
          {
            title: 'Trend',
            dataIndex: 'trend',
            key: 'trend',
            render: (value) => (
              <span style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f' }}>
                {value >= 0 ? <RiseOutlined /> : <FallOutlined />} {Math.abs(value)}%
              </span>
            ),
          },
        ]}
      />
    </Card>
  );

  const renderAssetStatus = () => (
    <Card 
      title="Asset Status"
      loading={refreshing}
    >
      {data.assetStatus.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          No asset data available
        </div>
      ) : (
        <List
          dataSource={data.assetStatus}
          renderItem={asset => (
            <List.Item
              key={asset.id}
              actions={[
                <Progress 
                  percent={asset.utilization} 
                  size="small" 
                  width={80}
                  status={asset.status === 'maintenance' ? 'exception' : 'active'}
                />
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Tag color={asset.status === 'operational' ? 'green' : 'orange'}>
                    {asset.status}
                  </Tag>
                }
                title={asset.name}
                description={`Last maintenance: ${asset.lastMaintenance}`}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <ShopOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 'bold' }}>
                  {data.name}
                </h1>
                <p style={{ margin: 0, color: '#666' }}>
                  <EnvironmentOutlined /> {data.address}
                </p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
              <Popover
                content={renderAlertsContent}
                title={null}
                trigger="click"
                placement="bottomRight"
                overlayStyle={{ width: 350 }}
              >
                <Button 
                  type="text" 
                  icon={<BellOutlined />}
                  style={{ position: 'relative' }}
                >
                  Alerts {renderAlertBadge()}
                </Button>
              </Popover>
              
              <div>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div style={{ color: '#666' }}>
                  {new Date().toLocaleTimeString()}
                </div>
                <Button 
                  type="link" 
                  icon={<ReloadOutlined />} 
                  onClick={handleRefresh}
                  loading={refreshing}
                  style={{ marginTop: 8 }}
                >
                  Refresh Data
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {renderCriticalAlerts()}

        {/* Monthly Progress */}
        {renderMonthlyProgress()}
      </div>

      {/* Stats Cards */}
      {renderStatsCards()}

      <div style={{ marginTop: 24 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarExtraContent={
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={refreshing}
              size="small"
            >
              Refresh
            </Button>
          }
        >
          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                Overview
              </span>
            } 
            key="overview"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                {renderAssetBreakdown()}
              </Col>
              <Col xs={24} lg={12}>
                {renderExpectedDeliveries()}
              </Col>
              <Col xs={24} lg={12}>
                {renderRecentActivities()}
              </Col>
              <Col xs={24} lg={12}>
                {renderStaffShifts()}
              </Col>
            </Row>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <StockOutlined />
                Sales Analytics
              </span>
            } 
            key="analytics"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                {renderSalesByProduct()}
              </Col>
              <Col xs={24} lg={12}>
                <Card title="Sales Performance">
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Progress 
                      type="circle" 
                      percent={data.metrics.monthlyProgress} 
                      format={percent => `${percent}%`}
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                    />
                    <div style={{ marginTop: 16 }}>
                      <Statistic
                        title="Monthly Target"
                        value={data.metrics.monthlyTarget}
                        prefix="KSH"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="Sales Trend">
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    {data.metrics.salesTrend > 0 ? (
                      <div>
                        <RiseOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                        <div style={{ marginTop: 16, fontSize: 18, color: '#52c41a' }}>
                          +{data.metrics.salesTrend}% Growth
                        </div>
                        <div style={{ color: '#666', marginTop: 8 }}>
                          Compared to yesterday
                        </div>
                      </div>
                    ) : (
                      <div>
                        <FallOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
                        <div style={{ marginTop: 16, fontSize: 18, color: '#ff4d4f' }}>
                          {data.metrics.salesTrend}% Decline
                        </div>
                        <div style={{ color: '#666', marginTop: 8 }}>
                          Compared to yesterday
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <SafetyCertificateOutlined />
                Assets & Maintenance
              </span>
            } 
            key="assets"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                {renderAssetStatus()}
              </Col>
              <Col xs={24} lg={12}>
                <Card title="Asset Efficiency">
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Progress 
                      type="circle" 
                      percent={Math.round(metrics.assetEfficiency)} 
                      format={percent => `${percent}%`}
                      strokeColor={{
                        '0%': '#ff4d4f',
                        '50%': '#faad14',
                        '100%': '#52c41a',
                      }}
                    />
                    <div style={{ marginTop: 16 }}>
                      <Statistic
                        title="Operational Assets"
                        value={data.metrics.operationalAssets}
                        suffix={`/ ${data.metrics.totalAssets}`}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="Staff Efficiency">
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Progress 
                      type="circle" 
                      percent={Math.round(metrics.staffEfficiency)} 
                      format={percent => `${percent}%`}
                      strokeColor={{
                        '0%': '#ff4d4f',
                        '50%': '#faad14',
                        '100%': '#52c41a',
                      }}
                    />
                    <div style={{ marginTop: 16 }}>
                      <Statistic
                        title="Active Staff"
                        value={data.metrics.activeStaff}
                        suffix={`/ ${data.metrics.staffCount}`}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </div>

      {/* Delivery Detail Modal */}
      <Modal
        title="Delivery Details"
        open={!!selectedDelivery}
        onCancel={() => setSelectedDelivery(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedDelivery(null)}>
            Close
          </Button>,
          <Button key="track" type="primary">
            Track Delivery
          </Button>
        ]}
      >
        {selectedDelivery && (
          <div>
            <p><strong>Product:</strong> {selectedDelivery.product}</p>
            <p><strong>Supplier:</strong> {selectedDelivery.supplier}</p>
            <p><strong>Quantity:</strong> {selectedDelivery.quantity}</p>
            <p><strong>Expected Date:</strong> {new Date(selectedDelivery.expectedDate).toLocaleString()}</p>
            <p><strong>Status:</strong> 
              <Tag color={
                selectedDelivery.status === 'scheduled' ? 'blue' :
                selectedDelivery.status === 'confirmed' ? 'green' : 'orange'
              } style={{ marginLeft: 8 }}>
                {selectedDelivery.status}
              </Tag>
            </p>
            <p><strong>Priority:</strong> 
              <Tag color={
                selectedDelivery.priority === 'high' ? 'red' :
                selectedDelivery.priority === 'medium' ? 'orange' : 'blue'
              } style={{ marginLeft: 8 }}>
                {selectedDelivery.priority}
              </Tag>
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StationDashboardOverview;