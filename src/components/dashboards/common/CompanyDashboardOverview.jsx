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
  Alert,
  Table
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
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  NumberOutlined
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
    purchases: [],
    suppliers: [],
    debtors: [],
    allUsers: [],
    stations: []
  });
  const [error, setError] = useState(null);

  const companyId = state?.currentCompany?.id;
  const companyName = state?.currentCompany?.name || 'Loading...';

  // Load all data
  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        productsData,
        purchasesData,
        suppliersData,
        debtorsData,
        usersData,
        stationsData
      ] = await Promise.all([
        fuelService.getFuelProducts().catch(err => {
          console.error('Failed to load products:', err);
          return { data: [] };
        }),
        purchaseService.getPurchases().catch(err => {
          console.error('Failed to load purchases:', err);
          return [];
        }),
        supplierService.getSuppliers().catch(err => {
          console.error('Failed to load suppliers:', err);
          return [];
        }),
        debtorService.getDebtors().catch(err => {
          console.error('Failed to load debtors:', err);
          return [];
        }),
        userService.getUsers().catch(err => {
          console.error('Failed to load users:', err);
          return { data: [] };
        }),
        stationService.getCompanyStations().catch(err => {
          console.error('Failed to load stations:', err);
          return [];
        })
      ]);

      console.log("Dashboard data loaded:", {
        productsData,
        purchasesData,
        suppliersData,
        debtorsData,
        usersData,
        stationsData
      });

      setData({
        products: productsData?.data || productsData || [],
        purchases: purchasesData || [],
        suppliers: suppliersData || [],
        debtors: debtorsData || [],
        allUsers: usersData?.data || usersData || [],
        stations: stationsData || []
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
  }, [companyId]);

  // Calculate metrics based on actual data structure
  const metrics = useMemo(() => {
    // From your logs: purchases have netPayable, debtors might have currentBalance
    const totalPurchaseAmount = data.purchases.reduce((sum, purchase) => {
      return sum + (purchase.netPayable || purchase.grossAmount || purchase.totalAmount || 0);
    }, 0);
    
    const totalDebt = data.debtors.reduce((sum, debtor) => {
      return sum + (debtor.currentBalance || debtor.totalDebt || 0);
    }, 0);
    
    return {
      totalStations: data.stations.length,
      totalUsers: data.allUsers.length,
      totalProducts: data.products.length,
      totalPurchases: data.purchases.length,
      totalSuppliers: data.suppliers.length,
      totalDebtors: data.debtors.length,
      totalDebt,
      totalPurchaseAmount,
      // Count active users (from your logs, all users have status: 'ACTIVE')
      activeUsers: data.allUsers.filter(user => user.status === 'ACTIVE').length
    };
  }, [data]);

  // Get recent records (max 5) for tables
  const recentRecords = useMemo(() => ({
    stations: data.stations.slice(0, 5).map(station => ({
      key: station.id,
      name: station.name,
      location: station.location,
      createdAt: station.createdAt,
      status: 'ACTIVE'
    })),
    
    products: data.products.slice(0, 5).map(product => ({
      key: product.id,
      name: product.name,
      description: product.description,
      variantName: product.variantName,
      createdAt: product.createdAt
    })),
    
    purchases: data.purchases.slice(0, 5).map(purchase => ({
      key: purchase.id,
      purchaseNumber: purchase.purchaseNumber,
      supplierName: purchase.supplier?.name || 'N/A',
      netPayable: purchase.netPayable || 0,
      status: purchase.status,
      purchaseDate: purchase.purchaseDate || purchase.createdAt
    })),
    
    debtors: data.debtors.slice(0, 5).map(debtor => ({
      key: debtor.id,
      name: debtor.name,
      code: debtor.code,
      currentBalance: debtor.currentBalance || 0,
      contactPerson: debtor.contactPerson,
      createdAt: debtor.createdAt
    })),
    
    suppliers: data.suppliers.slice(0, 5).map(supplier => ({
      key: supplier.id,
      name: supplier.name,
      code: supplier.code,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      status: supplier.status,
      createdAt: supplier.createdAt
    })),
    
    users: data.allUsers.slice(0, 5).map(user => ({
      key: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    }))
  }), [data]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Table columns for each section
  const stationColumns = [
    {
      title: 'Station Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (text) => <Tag icon={<EnvironmentOutlined />}>{text || 'N/A'}</Tag>
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date)
    }
  ];

  const productColumns = [
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || 'No description'
    },
    {
      title: 'Variant',
      dataIndex: 'variantName',
      key: 'variantName',
      render: (text) => text || 'Standard'
    }
  ];

  const purchaseColumns = [
    {
      title: 'Purchase #',
      dataIndex: 'purchaseNumber',
      key: 'purchaseNumber',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Supplier',
      dataIndex: 'supplierName',
      key: 'supplierName'
    },
    {
      title: 'Amount',
      dataIndex: 'netPayable',
      key: 'netPayable',
      render: (amount) => formatCurrency(amount)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'APPROVED' || status === 'COMPLETED') color = 'success';
        if (status === 'PENDING' || status === 'DRAFT') color = 'warning';
        if (status === 'CANCELLED' || status === 'REJECTED') color = 'error';
        return <Tag color={color}>{status}</Tag>;
      }
    }
  ];

  const debtorColumns = [
    {
      title: 'Debtor Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <Tag>{text}</Tag>
    },
    {
      title: 'Current Balance',
      dataIndex: 'currentBalance',
      key: 'currentBalance',
      render: (amount) => <Text type="danger" strong>{formatCurrency(amount)}</Text>
    },
    {
      title: 'Contact',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      render: (text) => text || 'N/A'
    }
  ];

  const supplierColumns = [
    {
      title: 'Supplier Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <Tag icon={<NumberOutlined />}>{text}</Tag>
    },
    {
      title: 'Contact Person',
      dataIndex: 'contactPerson',
      key: 'contactPerson'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>{status}</Tag>
      )
    }
  ];

  const userColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => (
        <Space>
          <MailOutlined />
          {email}
        </Space>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => <Tag>{role || 'USER'}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'error'}>{status}</Tag>
      )
    }
  ];

  // Skeleton components
  const StatSkeleton = () => (
    <Card size="small">
      <Skeleton active paragraph={{ rows: 2 }} />
    </Card>
  );

  const TableSkeleton = () => (
    <Card size="small">
      <Skeleton active paragraph={{ rows: 5 }} />
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

    const statCards = [
      {
        title: 'Stations',
        value: metrics.totalStations,
        icon: <EnvironmentOutlined />,
        description: 'Service locations',
        color: '#1890ff'
      },
      {
        title: 'Staff',
        value: metrics.totalUsers,
        icon: <TeamOutlined />,
        description: `${metrics.activeUsers} active`,
        color: '#52c41a'
      },
      {
        title: 'Products',
        value: metrics.totalProducts,
        icon: <ExperimentOutlined />,
        description: 'Fuel products',
        color: '#fa8c16'
      },
      {
        title: 'Purchases',
        value: metrics.totalPurchases,
        icon: <ShoppingOutlined />,
        description: formatCurrency(metrics.totalPurchaseAmount),
        color: '#722ed1'
      },
      {
        title: 'Suppliers',
        value: metrics.totalSuppliers,
        icon: <ShopOutlined />,
        description: 'Active partners',
        color: '#eb2f96'
      },
      {
        title: 'Total Debt',
        value: metrics.totalDebt,
        icon: <DollarOutlined />,
        description: `${metrics.totalDebtors} debtors`,
        color: '#f5222d',
        formatter: (val) => formatCurrency(val)
      }
    ];

    return (
      <Row gutter={[16, 16]}>
        {statCards.map((stat, index) => (
          <Col key={index} xs={24} sm={12} lg={8} xl={6}>
            <Card 
              size="small"
              style={{ 
                borderLeft: `4px solid ${stat.color}`,
                height: '100%'
              }}
            >
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                formatter={stat.formatter ? (val) => stat.formatter(val) : undefined}
                valueStyle={{ color: stat.color }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: 4 }}>
                {stat.description}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  // Render a table card for each data type
  const renderTableCard = (title, icon, data, columns, emptyText = 'No data available') => {
    return (
      <Card 
        title={
          <Space>
            {icon}
            <Text strong>{title}</Text>
          </Space>
        }
        size="small"
        style={{ height: '100%' }}
        extra={
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            size="small"
            href={`#/dashboard/${title.toLowerCase()}`}
          >
            View All
          </Button>
        }
      >
        {loading ? (
          <TableSkeleton />
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            {emptyText}
          </div>
        ) : (
          <Table
            dataSource={data}
            columns={columns}
            size="small"
            pagination={false}
            scroll={{ y: 240 }}
            style={{ marginTop: -16 }}
          />
        )}
      </Card>
    );
  };

  return (
    <div style={{ padding: screens.xs ? '16px' : '24px', maxWidth: '100%', overflowX: 'hidden' }}>
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
            <Tag color="blue" icon={<ShopOutlined />}>
              {companyName}
            </Tag>
            <Button 
              icon={<SyncOutlined />} 
              onClick={loadAllData}
              loading={loading}
              size={screens.xs ? 'small' : 'middle'}
            >
              Refresh
            </Button>
          </Space>
        </Space>
        
        <Card 
          size="small" 
          style={{ 
            background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
            border: '1px solid #b7eb8f'
          }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={16}>
              <Text strong>Welcome to your Dashboard</Text>
              <br />
              <Text type="secondary">
                Here's an overview of your company's performance and recent activities.
                Last updated: {new Date().toLocaleTimeString()}
              </Text>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: screens.xs ? 'left' : 'right' }}>
              <Badge 
                status={loading ? 'processing' : error ? 'error' : 'success'} 
                text={
                  <Text strong>
                    {loading ? 'Loading data...' : error ? 'Connection Error' : 'All systems operational'}
                  </Text>
                } 
              />
            </Col>
          </Row>
        </Card>
      </Space>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error Loading Data"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={loadAllData}>
              Retry
            </Button>
          }
        />
      )}

      {/* Stats Cards Section */}
      <Card 
        title={
          <Space>
            <DashboardOutlined />
            <Text strong>Key Metrics</Text>
          </Space>
        }
        style={{ marginBottom: 24 }}
        size="small"
      >
        {renderStatsCards()}
      </Card>

      {/* Recent Records Section */}
      <Card 
        title={
          <Space>
            <CalendarOutlined />
            <Text strong>Recent Activities</Text>
          </Space>
        }
        size="small"
        style={{ marginBottom: 24 }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Showing up to 5 most recent records in each category
        </Text>
        
        <Row gutter={[16, 16]}>
          {/* First Row */}
          <Col xs={24} lg={12}>
            {renderTableCard(
              'Recent Stations',
              <EnvironmentOutlined />,
              recentRecords.stations,
              stationColumns,
              'No stations found'
            )}
          </Col>
          <Col xs={24} lg={12}>
            {renderTableCard(
              'Recent Products',
              <ExperimentOutlined />,
              recentRecords.products,
              productColumns,
              'No products found'
            )}
          </Col>
          
          {/* Second Row */}
          <Col xs={24} lg={12}>
            {renderTableCard(
              'Recent Purchases',
              <ShoppingOutlined />,
              recentRecords.purchases,
              purchaseColumns,
              'No purchases found'
            )}
          </Col>
          <Col xs={24} lg={12}>
            {renderTableCard(
              'Recent Debtors',
              <FileTextOutlined />,
              recentRecords.debtors,
              debtorColumns,
              'No debtors found'
            )}
          </Col>
          
          {/* Third Row */}
          <Col xs={24} lg={12}>
            {renderTableCard(
              'Recent Suppliers',
              <ShopOutlined />,
              recentRecords.suppliers,
              supplierColumns,
              'No suppliers found'
            )}
          </Col>
          <Col xs={24} lg={12}>
            {renderTableCard(
              'Recent Users',
              <UserOutlined />,
              recentRecords.users,
              userColumns,
              'No users found'
            )}
          </Col>
        </Row>
      </Card>

      {/* Summary Footer */}
      {!loading && (
        <Card size="small">
          <Row gutter={[16, 16]} justify="space-around" align="middle">
            <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
              <div>
                <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                  {metrics.totalStations}
                </Title>
                <Text type="secondary">Stations</Text>
              </div>
            </Col>
            <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
              <div>
                <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                  {metrics.totalUsers}
                </Title>
                <Text type="secondary">Total Users</Text>
              </div>
            </Col>
            <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
              <div>
                <Title level={3} style={{ margin: 0, color: '#722ed1' }}>
                  {formatCurrency(metrics.totalPurchaseAmount)}
                </Title>
                <Text type="secondary">Total Purchase Value</Text>
              </div>
            </Col>
          </Row>
          <Divider style={{ margin: '12px 0' }} />
          <Row justify="center">
            <Text type="secondary" style={{ textAlign: 'center' }}>
              Data as of {new Date().toLocaleDateString()} • 
              Last refresh: {new Date().toLocaleTimeString()}
            </Text>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default CompanyDashboardOverview;