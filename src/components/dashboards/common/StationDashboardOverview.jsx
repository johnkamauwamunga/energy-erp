import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Button,
  Row,
  Col,
  Statistic,
  Progress,
  Tag,
  List,
  Avatar,
  Space,
  Typography,
  Divider,
  Badge,
  Grid,
  Skeleton,
  Alert
} from 'antd';
import {
  ShoppingOutlined,
  FileTextOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  UserOutlined,
  ShopOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  SyncOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { Fuel } from 'lucide-react';
import { stationService } from '../../../services/stationService/stationService';
import { userService } from '../../../services/userService/userService';
import { debtorService } from '../../../services/debtorService/debtorService';
import { purchaseService } from '../../../services/purchaseService/purchaseService';
import { assetService } from '../../../services/assetService/assetService';
import { fuelOffloadService } from '../../../services/offloadService/offloadService';
import { useApp } from '../../../context/AppContext';
import { useShiftAssets } from './shift/shiftClose/hooks/useShiftAssets';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const StationDashboardOverview = () => {
  const { state } = useApp();
  const screens = useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stationData, setStationData] = useState({
    assets: [],
    debtors: [],
    offloads: [],
    users: [],
    purchases: []
  });

  const companyId = state?.currentCompany?.id;
  const stationId = state?.currentStation?.id;
  const currentStation = state?.currentStation?.name;

  // Use shift hook
  const {
    currentShift,
    loading: shiftLoading
  } = useShiftAssets(stationId);

  console.log("current shift ",currentShift)
  const shiftId = currentShift?.id;
  const shiftNumber = currentShift?.shiftNumber

  // Helper function to safely get string value
  const getSafeString = (value, defaultValue = 'N/A') => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'object') {
      if (value.name) return value.name;
      if (value.id) return String(value.id);
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Load station-specific data
  const loadStationData = async () => {
    if (!stationId) {
      console.log("No station ID available, skipping data load");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [
        debtorsData,
        offloadsData,
        usersData,
        purchasesData
      ] = await Promise.all([
        debtorService.getDebtors({ stationId }).catch(err => {
          console.error('Failed to load station debtors:', err);
          return { debtors: [] };
        }),
        fuelOffloadService.getOffloadsByStation({ stationId }).catch(err => {
          console.error('Failed to load station offloads:', err);
          return { offloads: [] };
        }),
        userService.getUsers({ stationId }).catch(err => {
          console.error('Failed to load station users:', err);
          return { users: [] };
        }),
        purchaseService.getPurchases({ stationId }).catch(err => {
          console.error('Failed to load station purchases:', err);
          return { purchases: [] };
        })
      ]);

      // For assets, handle the 403 error
      let assetsData = { assets: [] };
      try {
        const allAssets = await assetService.getAssets();
        assetsData.assets = Array.isArray(allAssets) ? allAssets : 
                           allAssets?.data || allAssets?.assets || [];
        
        if (assetsData.assets.length > 0) {
          assetsData.assets = assetsData.assets.filter(asset => 
            asset.stationId === stationId
          );
        }
      } catch (assetsError) {
        console.warn('Could not load station assets:', assetsError.message);
        assetsData.assets = [];
      }

      setStationData({
        assets: assetsData?.assets || [],
        debtors: debtorsData?.debtors || debtorsData?.data || debtorsData || [],
        offloads: offloadsData?.offloads || offloadsData?.data || offloadsData || [],
        users: usersData?.users || usersData?.data || usersData || [],
        purchases: purchasesData?.purchases || purchasesData?.data || purchasesData || []
      });

    } catch (error) {
      console.error('Failed to load station data:', error);
      setError('Failed to load station data');
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    if (stationId) {
      await loadStationData();
    }
  };

  useEffect(() => {
    if (stationId) {
      loadStationData();
    } else {
      setStationData({
        assets: [],
        debtors: [],
        offloads: [],
        users: [],
        purchases: []
      });
      setLoading(false);
    }
  }, [stationId]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalDebt = stationData.debtors.reduce((sum, debtor) => sum + (debtor.totalDebt || 0), 0);
    const totalPurchaseAmount = stationData.purchases.reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0);
    const totalOffloadQuantity = stationData.offloads.reduce((sum, offload) => sum + (offload.quantity || 0), 0);
    
    return {
      totalAssets: stationData.assets.length,
      totalDebtors: stationData.debtors.length,
      totalOffloads: stationData.offloads.length,
      totalStaff: stationData.users.length,
      totalPurchases: stationData.purchases.length,
      totalDebt,
      totalPurchaseAmount,
      totalOffloadQuantity
    };
  }, [stationData]);

  // Get recent records (max 5)
  const recentRecords = useMemo(() => ({
    assets: stationData.assets.slice(0, 5),
    debtors: stationData.debtors.slice(0, 5),
    offloads: stationData.offloads.slice(0, 5),
    staff: stationData.users.slice(0, 5),
    purchases: stationData.purchases.slice(0, 5)
  }), [stationData]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  // Skeleton components
  const StatSkeleton = () => (
    <Card size="small">
      <Skeleton active paragraph={{ rows: 2 }} />
    </Card>
  );

  const ListSkeleton = () => (
    <Card size="small">
      <Skeleton active paragraph={{ rows: 4 }} />
    </Card>
  );

  // Stats Cards with Skeletons
  const renderStatsCards = () => {
    if (loading) {
      return (
        <Row gutter={[16, 16]}>
          {[...Array(6)].map((_, index) => (
            <Col key={index} xs={24} sm={12} lg={8} xl={6}>
              <StatSkeleton />
            </Col>
          ))}
        </Row>
      );
    }

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card size="small">
            <Statistic
              title="Assets"
              value={metrics.totalAssets}
              prefix={<ToolOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Station equipment
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card size="small">
            <Statistic
              title="Staff"
              value={metrics.totalStaff}
              prefix={<TeamOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Team members
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card size="small">
            <Statistic
              title="Offloads"
              value={metrics.totalOffloads}
              prefix={<Fuel />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {metrics.totalOffloadQuantity}L total
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card size="small">
            <Statistic
              title="Purchases"
              value={metrics.totalPurchases}
              prefix={<ShoppingOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {formatCurrency(metrics.totalPurchaseAmount)}
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card size="small">
            <Statistic
              title="Debtors"
              value={metrics.totalDebtors}
              prefix={<FileTextOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Active accounts
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card size="small">
            <Statistic
              title="Total Debt"
              value={metrics.totalDebt}
              prefix={<DollarOutlined />}
              formatter={value => formatCurrency(value)}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Outstanding
            </Text>
          </Card>
        </Col>
      </Row>
    );
  };

  // Current Shift Card with color coding
  const renderShiftCard = () => {
    if (shiftLoading) {
      return (
        <Card size="small">
          <Skeleton active paragraph={{ rows: 1 }} />
        </Card>
      );
    }

    const shiftStatus = shiftId ? 'OPEN' : 'NO_SHIFT';
    const statusConfig = {
      OPEN: {
        color: 'green',
        bgColor: '#f6ffed',
        borderColor: '#b7eb8f',
        textColor: '#52c41a',
        badge: 'success',
        label: 'Shift Active'
      },
      NO_SHIFT: {
        color: 'orange',
        bgColor: '#fff7e6',
        borderColor: '#ffd591',
        textColor: '#fa8c16',
        badge: 'warning',
        label: 'No Active Shift'
      }
    };

    const config = statusConfig[shiftStatus];

    return (
      <Card 
        size="small"
        style={{ 
          background: config.bgColor,
          border: `1px solid ${config.borderColor}`
        }}
      >
        <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <ClockCircleOutlined style={{ fontSize: '20px', color: config.textColor }} />
            <div>
              <Text strong style={{ color: config.textColor }}>Current Shift</Text>
              <br />
              {shiftId ? (
                <Space direction="vertical" size={0}>
                  <Text>ReF#: {currentShift?.shiftNumber}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Started: {currentShift.startTime ? new Date(currentShift.startTime).toLocaleString() : 'N/A'}
                  </Text>
                </Space>
              ) : (
                <Text style={{ color: config.textColor }}>No shift currently active</Text>
              )}
            </div>
          </Space>
          <Badge 
            status={config.badge} 
            text={config.label} 
          />
        </Space>
      </Card>
    );
  };

  // Recent Debtors with Skeleton
  const renderRecentDebtors = () => (
    <Card 
      title={
        <Space>
          <FileTextOutlined />
          Recent Debtors
        </Space>
      }
      size="small"
      extra={
        <Button type="link" icon={<EyeOutlined />} size="small">
          View All
        </Button>
      }
    >
      {loading ? (
        <ListSkeleton />
      ) : (
        <List
          size="small"
          dataSource={recentRecords.debtors}
          renderItem={(debtor) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={<Text strong>{getSafeString(debtor.name)}</Text>}
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">
                      📞 {getSafeString(debtor.phone)} • 📧 {getSafeString(debtor.email, 'No email')}
                    </Text>
                    <Space>
                      <Text type="danger" strong>
                        Debt: {formatCurrency(debtor.totalDebt)}
                      </Text>
                      <Text type="secondary">
                        Transactions: {debtor.totalOutstandingTransactions || 0}
                      </Text>
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No debtors found' }}
        />
      )}
    </Card>
  );

  // Recent Offloads with Skeleton
  const renderRecentOffloads = () => (
    <Card 
      title={
        <Space>
          <Fuel />
          Recent Offloads
        </Space>
      }
      size="small"
      extra={
        <Button type="link" icon={<EyeOutlined />} size="small">
          View All
        </Button>
      }
    >
      {loading ? (
        <ListSkeleton />
      ) : (
        <List
          size="small"
          dataSource={recentRecords.offloads}
          renderItem={(offload) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<Fuel />} />}
                title={
                  <Text strong>
                    Offload #{offload.id?.slice(-8) || 'N/A'}
                  </Text>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">
                      Product: {getSafeString(offload.product)} • Quantity: {offload.quantity || 0}L
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatDate(offload.createdAt)}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No offloads found' }}
        />
      )}
    </Card>
  );

  // Recent Staff with Skeleton
  const renderRecentStaff = () => (
    <Card 
      title={
        <Space>
          <TeamOutlined />
          Recent Staff
        </Space>
      }
      size="small"
      extra={
        <Button type="link" icon={<EyeOutlined />} size="small">
          View All
        </Button>
      }
    >
      {loading ? (
        <ListSkeleton />
      ) : (
        <List
          size="small"
          dataSource={recentRecords.staff}
          renderItem={(user) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={<Text strong>{getSafeString(user.name || user.username)}</Text>}
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">
                      📧 {getSafeString(user.email)} • 📞 {getSafeString(user.phone, 'No phone')}
                    </Text>
                    <Space>
                      <Tag color={user.isActive ? 'green' : 'red'} size="small">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {getSafeString(user.role)}
                      </Text>
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No staff found' }}
        />
      )}
    </Card>
  );

  // Recent Purchases with Skeleton
  const renderRecentPurchases = () => (
    <Card 
      title={
        <Space>
          <ShoppingOutlined />
          Recent Purchases
        </Space>
      }
      size="small"
      extra={
        <Button type="link" icon={<EyeOutlined />} size="small">
          View All
        </Button>
      }
    >
      {loading ? (
        <ListSkeleton />
      ) : (
        <List
          size="small"
          dataSource={recentRecords.purchases}
          renderItem={(purchase) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<ShoppingOutlined />} />}
                title={
                  <Text strong>
                    Purchase #{purchase.id?.slice(-8) || 'N/A'}
                  </Text>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">
                      Amount: {formatCurrency(purchase.totalAmount)}
                    </Text>
                    <Space>
                      <Tag color={
                        purchase.status === 'completed' ? 'green' : 
                        purchase.status === 'pending' ? 'orange' : 'default'
                      } size="small">
                        {getSafeString(purchase.status, 'unknown')}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatDate(purchase.createdAt)}
                      </Text>
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No purchases found' }}
        />
      )}
    </Card>
  );

  if (!stationId) {
    return (
      <div style={{ padding: screens.xs ? '16px' : '24px' }}>
        <Alert
          message="No Station Selected"
          description="Please select a station from the main navigation to view the dashboard."
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: screens.xs ? '16px' : '24px' }}>
      {/* Header */}
      <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 24 }}>
        <Space 
          direction={screens.xs ? 'vertical' : 'horizontal'} 
          style={{ 
            width: '100%', 
            justifyContent: 'space-between',
            alignItems: screens.xs ? 'flex-start' : 'center'
          }}
        >
          <Space>
            <DashboardOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={5} style={{ margin: 0 }}>
              Station Overview - {currentStation}
            </Title>
          </Space>
          <Space>
            <Text type="secondary">
              {currentStation}
            </Text>
            <Button 
              icon={<SyncOutlined />} 
              onClick={refreshAll}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </Space>
        
        {/* Shift Status Card */}
        {renderShiftCard()}
      </Space>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Stats Cards */}
      {renderStatsCards()}

      <Divider />

      {/* Recent Records Grid */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12} xl={8}>
          {renderRecentDebtors()}
        </Col>
        <Col xs={24} lg={12} xl={8}>
          {renderRecentOffloads()}
        </Col>
        <Col xs={24} lg={12} xl={8}>
          {renderRecentStaff()}
        </Col>
        <Col xs={24} lg={12} xl={8}>
          {renderRecentPurchases()}
        </Col>
      </Row>

      {/* Quick Stats Footer */}
      {!loading && (
        <Card size="small" style={{ marginTop: 24 }}>
          <Row gutter={[16, 16]} justify="space-around">
            <Col xs={12} sm={6} style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                {metrics.totalAssets}
              </Title>
              <Text type="secondary">Total Assets</Text>
            </Col>
            <Col xs={12} sm={6} style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                {metrics.totalDebtors}
              </Title>
              <Text type="secondary">Active Debtors</Text>
            </Col>
            <Col xs={12} sm={6} style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#fa8c16' }}>
                {metrics.totalOffloads}
              </Title>
              <Text type="secondary">Fuel Offloads</Text>
            </Col>
            <Col xs={12} sm={6} style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#722ed1' }}>
                {metrics.totalPurchases}
              </Title>
              <Text type="secondary">Total Purchases</Text>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default StationDashboardOverview;