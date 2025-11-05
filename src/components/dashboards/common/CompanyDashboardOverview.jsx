import React, { useState, useEffect, useMemo } from 'react';
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
  EyeOutlined
} from '@ant-design/icons';
import { stationService } from '../../../services/stationService/stationService';
import { userService } from '../../../services/userService/userService';
import { supplierService } from '../../../services/supplierService/supplierService';
import { debtorService } from '../../../services/debtorService/debtorService';
import { purchaseService } from '../../../services/purchaseService/purchaseService';
import { fuelService } from '../../../services/fuelService/fuelService';
import { useApp } from '../../../context/AppContext';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const CompanyDashboardOverview = () => {
  const { state } = useApp();
  const screens = useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    products: [],
    categories: [],
    subTypes: [],
    purchases: [],
    suppliers: [],
    debts: [],
    debtors: [],
    allUsers: [],
    stations: []
  });
  const [error, setError] = useState(null);

  const companyId = state?.currentCompany?.id;
  const companyName =state?.currentCompany?.name

  // Load all data
  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        productsData,
        categoriesData,
        subTypesData,
        purchasesData,
        suppliersData,
        debtorsData,
        usersData,
        stationsData
      ] = await Promise.all([
        fuelService.getFuelProducts().catch(err => {
          console.error('Failed to load products:', err);
          return [];
        }),
        fuelService.getFuelCategories().catch(err => {
          console.error('Failed to load categories:', err);
          return [];
        }),
        fuelService.getFuelSubTypes().catch(err => {
          console.error('Failed to load subtypes:', err);
          return [];
        }),
        purchaseService.getPurchases().catch(err => {
          console.error('Failed to load purchases:', err);
          return [];
        }),
        supplierService.getSuppliers(true).catch(err => {
          console.error('Failed to load suppliers:', err);
          return [];
        }),
        debtorService.getDebtors().catch(err => {
          console.error('Failed to load debtors:', err);
          return [];
        }),
        userService.getUsers().catch(err => {
          console.error('Failed to load users:', err);
          return [];
        }),
        stationService.getCompanyStations().catch(err => {
          console.error('Failed to load stations:', err);
          return [];
        })
      ]);

      setData({
        products: productsData?.products || productsData || [],
        categories: categoriesData || [],
        subTypes: subTypesData || [],
        purchases: purchasesData?.purchases || purchasesData?.data || purchasesData || [],
        suppliers: suppliersData?.suppliers || suppliersData?.data || suppliersData || [],
        debtors: debtorsData?.debtors || debtorsData?.data || debtorsData || [],
        allUsers: usersData || [],
        stations: stationsData?.stations || stationsData?.data || stationsData || []
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalDebt = data.debtors.reduce((sum, debtor) => sum + (debtor.totalDebt || 0), 0);
    const totalPurchaseAmount = data.purchases.reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0);
    
    return {
      totalStations: data.stations.length,
      totalUsers: data.allUsers.length,
      totalProducts: data.products.length,
      totalPurchases: data.purchases.length,
      totalSuppliers: data.suppliers.length,
      totalDebtors: data.debtors.length,
      totalDebt,
      totalPurchaseAmount,
      categoriesCount: data.categories.length,
      subTypesCount: data.subTypes.length
    };
  }, [data]);

  // Get recent records (max 5)
  const recentRecords = useMemo(() => ({
    stations: data.stations.slice(0, 5),
    products: data.products.slice(0, 5),
    purchases: data.purchases.slice(0, 5),
    debtors: data.debtors.slice(0, 5),
    suppliers: data.suppliers.slice(0, 5)
  }), [data]);

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
              title="Stations"
              value={metrics.totalStations}
              prefix={<EnvironmentOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Service locations
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card size="small">
            <Statistic
              title="Staff"
              value={metrics.totalUsers}
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
              title="Products"
              value={metrics.totalProducts}
              prefix={<ExperimentOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {metrics.categoriesCount} categories
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
              title="Suppliers"
              value={metrics.totalSuppliers}
              prefix={<ShopOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Active partners
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
              {metrics.totalDebtors} debtors
            </Text>
          </Card>
        </Col>
      </Row>
    );
  };

  // Recent Stations with Skeleton
  const renderRecentStations = () => (
    <Card 
      title={
        <Space>
          <EnvironmentOutlined />
          Recent Stations
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
          dataSource={recentRecords.stations}
          renderItem={(station) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<EnvironmentOutlined />} />}
                title={<Text strong>{station.name}</Text>}
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">{station.location || 'No location'}</Text>
                    {station.contactEmail && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {station.contactEmail}
                      </Text>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No stations found' }}
        />
      )}
    </Card>
  );

  // Recent Products with Skeleton
  const renderRecentProducts = () => (
    <Card 
      title={
        <Space>
          <ExperimentOutlined />
          Recent Products
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
          dataSource={recentRecords.products}
          renderItem={(product) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<ExperimentOutlined />} />}
                title={<Text strong>{product.name}</Text>}
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">
                      Category: {product.category || 'N/A'} • Price: {formatCurrency(product.price)}
                    </Text>
                    {product.description && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {product.description}
                      </Text>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No products found' }}
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
                      }>
                        {purchase.status || 'unknown'}
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
                title={<Text strong>{debtor.name}</Text>}
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">
                      📞 {debtor.phone} • 📧 {debtor.email || 'No email'}
                    </Text>
                    <Space>
                      <Text type="danger" strong>
                        Debt: {formatCurrency(debtor.totalDebt)}
                      </Text>
                      <Text type="secondary">
                        Transactions: {debtor.totalOutstandingTransactions || 0}
                      </Text>
                    </Space>
                    {debtor.contactPerson && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Contact: {debtor.contactPerson}
                      </Text>
                    )}
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

  // Recent Suppliers with Skeleton
  const renderRecentSuppliers = () => (
    <Card 
      title={
        <Space>
          <ShopOutlined />
          Recent Suppliers
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
          dataSource={recentRecords.suppliers}
          renderItem={(supplier) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<ShopOutlined />} />}
                title={<Text strong>{supplier.name}</Text>}
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">
                      📞 {supplier.phone} • 📧 {supplier.email || 'No email'}
                    </Text>
                    {supplier.contactPerson && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Contact: {supplier.contactPerson}
                      </Text>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No suppliers found' }}
        />
      )}
    </Card>
  );

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
            <Title level={2} style={{ margin: 0 }}>
              Company Overview
            </Title>
          </Space>
          <Space>
            <Text type="secondary">
            {companyName|| 'Coming Soon ...'}
            </Text>
            <Button 
              icon={<SyncOutlined />} 
              onClick={loadAllData}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </Space>
        
        <Card size="small" style={{ background: 'linear-gradient(135deg, #f5f7ff 0%, #e3eeff 100%)' }}>
          <Space 
            direction={screens.xs ? 'vertical' : 'horizontal'} 
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <div>
              <Text strong>System Status</Text>
              <br />
              <Text type="secondary">
                Last updated: {new Date().toLocaleString()}
              </Text>
            </div>
            <Badge 
              status={loading ? 'processing' : error ? 'error' : 'success'} 
              text={loading ? 'Loading...' : error ? 'Error' : 'All Systems Operational'} 
            />
          </Space>
        </Card>
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
          {renderRecentStations()}
        </Col>
        <Col xs={24} lg={12} xl={8}>
          {renderRecentProducts()}
        </Col>
        <Col xs={24} lg={12} xl={8}>
          {renderRecentPurchases()}
        </Col>
        <Col xs={24} lg={12} xl={8}>
          {renderRecentDebtors()}
        </Col>
        <Col xs={24} lg={12} xl={8}>
          {renderRecentSuppliers()}
        </Col>
      </Row>

      {/* Quick Stats Footer */}
      {!loading && (
        <Card size="small" style={{ marginTop: 24 }}>
          <Row gutter={[16, 16]} justify="space-around">
            <Col xs={12} sm={6} style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                {metrics.categoriesCount}
              </Title>
              <Text type="secondary">Categories</Text>
            </Col>
            <Col xs={12} sm={6} style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                {metrics.subTypesCount}
              </Title>
              <Text type="secondary">Sub Types</Text>
            </Col>
            <Col xs={12} sm={6} style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#fa8c16' }}>
                {metrics.totalDebtors}
              </Title>
              <Text type="secondary">Active Debtors</Text>
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

export default CompanyDashboardOverview;