// pages/products/ProductManagement.jsx
import React, { useState } from 'react';
import { 
  Tabs, 
  Card, 
  Typography, 
  Row, 
  Col, 
  Space, 
  Grid, 
  Badge 
} from 'antd';
import { 
  FireOutlined, 
  ShoppingOutlined, 
  AppstoreOutlined,
  DollarOutlined,
  DatabaseOutlined,
  BarChartOutlined 
} from '@ant-design/icons';
import FuelManagement from './fuel/FuelManagement';
import NonFuelManagement from './nonfuel/NonFuelManagement';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid; // Only declare once here

const ProductManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const screens = useBreakpoint();

  // Define tabs
  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <AppstoreOutlined />,
      content: <ProductOverview onTabChange={setActiveTab} />
    },
    {
      key: 'fuel',
      label: 'Fuel Products',
      icon: <FireOutlined />,
      content: <FuelManagement />
    },
    {
      key: 'nonfuel',
      label: 'Non-Fuel Products',
      icon: <ShoppingOutlined />,
      content: <NonFuelManagement />
    }
  ];

  return (
    <div style={{ padding: screens.xs ? 16 : 24 }}>
      {/* Header */}
      {/* <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Product Management</Title>
          <Text type="secondary">
            Comprehensive management of all products - Fuel and Non-Fuel
          </Text>
        </Col>
      </Row> */}

      {/* Main Content with Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="line"
          size="large"
          items={tabs.map(tab => ({
            key: tab.key,
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {tab.icon}
                {!screens.xs && tab.label}
              </span>
            ),
            children: tab.content
          }))}
        />
      </Card>
    </div>
  );
};

// Optional: Overview Component showing combined stats
const ProductOverview = ({ onTabChange }) => {
  const screens = useBreakpoint();
  
  // These would come from API calls in real implementation
  const stats = {
    fuel: {
      total: 42,
      categories: 5,
      needsPricing: 3
    },
    nonfuel: {
      total: 156,
      categories: 8,
      needsPricing: 12
    },
    combined: {
      total: 198,
      lowStock: 7,
      outOfStock: 2
    }
  };

  return (
    <div>
      <Title level={4}>Product Dashboard</Title>
      <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        Overview of all products in your inventory. Select a section to manage.
      </Text>
      
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* Fuel Products Card */}
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable 
            onClick={() => onTabChange('fuel')}
            style={{ 
              textAlign: 'center',
              borderTop: '4px solid #fa8c16',
              cursor: 'pointer'
            }}
          >
            <Space direction="vertical" align="center" style={{ width: '100%' }}>
              <FireOutlined style={{ fontSize: 48, color: '#fa8c16' }} />
              <Title level={3} style={{ margin: '8px 0' }}>Fuel Products</Title>
              <Text strong>Manage petroleum products</Text>
              
              <Row gutter={[8, 8]} style={{ marginTop: 16, width: '100%' }}>
                <Col span={8}>
                  <StatisticCard 
                    title="Products" 
                    value={stats.fuel.total} 
                    color="#fa8c16"
                    icon={<DatabaseOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <StatisticCard 
                    title="Categories" 
                    value={stats.fuel.categories} 
                    color="#1890ff"
                    icon={<AppstoreOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <StatisticCard 
                    title="Needs Pricing" 
                    value={stats.fuel.needsPricing} 
                    color="#ff4d4f"
                    icon={<DollarOutlined />}
                  />
                </Col>
              </Row>
              
              <Text type="secondary" style={{ marginTop: 16, fontSize: '12px' }}>
                Gasoline, Diesel, Lubricants, etc.
              </Text>
            </Space>
          </Card>
        </Col>
        
        {/* Non-Fuel Products Card */}
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable 
            onClick={() => onTabChange('nonfuel')}
            style={{ 
              textAlign: 'center',
              borderTop: '4px solid #1890ff',
              cursor: 'pointer'
            }}
          >
            <Space direction="vertical" align="center" style={{ width: '100%' }}>
              <ShoppingOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              <Title level={3} style={{ margin: '8px 0' }}>Non-Fuel Products</Title>
              <Text strong>Manage convenience store items</Text>
              
              <Row gutter={[8, 8]} style={{ marginTop: 16, width: '100%' }}>
                <Col span={8}>
                  <StatisticCard 
                    title="Products" 
                    value={stats.nonfuel.total} 
                    color="#1890ff"
                    icon={<DatabaseOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <StatisticCard 
                    title="Categories" 
                    value={stats.nonfuel.categories} 
                    color="#52c41a"
                    icon={<AppstoreOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <StatisticCard 
                    title="Needs Pricing" 
                    value={stats.nonfuel.needsPricing} 
                    color="#ff4d4f"
                    icon={<DollarOutlined />}
                  />
                </Col>
              </Row>
              
              <Text type="secondary" style={{ marginTop: 16, fontSize: '12px' }}>
                Snacks, Drinks, Accessories, etc.
              </Text>
            </Space>
          </Card>
        </Col>
        
        {/* Combined Stats Card */}
        <Col xs={24} sm={12} md={8}>
          <Card 
            style={{ 
              textAlign: 'center',
              borderTop: '4px solid #52c41a'
            }}
          >
            <Space direction="vertical" align="center" style={{ width: '100%' }}>
              <AppstoreOutlined style={{ fontSize: 48, color: '#52c41a' }} />
              <Title level={3} style={{ margin: '8px 0' }}>All Products</Title>
              <Text strong>Combined inventory overview</Text>
              
              <Row gutter={[8, 8]} style={{ marginTop: 16, width: '100%' }}>
                <Col span={8}>
                  <StatisticCard 
                    title="Total" 
                    value={stats.combined.total} 
                    color="#722ed1"
                    icon={<DatabaseOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <StatisticCard 
                    title="Low Stock" 
                    value={stats.combined.lowStock} 
                    color="#fa8c16"
                    icon={<BarChartOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <StatisticCard 
                    title="Out of Stock" 
                    value={stats.combined.outOfStock} 
                    color="#ff4d4f"
                    icon={<BarChartOutlined />}
                  />
                </Col>
              </Row>
              
              <Text type="secondary" style={{ marginTop: 16, fontSize: '12px' }}>
                Combined inventory across all categories
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// Helper component for statistic cards
const StatisticCard = ({ title, value, color, icon }) => {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        fontSize: '20px', 
        fontWeight: 'bold',
        color: color 
      }}>
        {value}
      </div>
      <div style={{ 
        fontSize: '10px', 
        color: '#666',
        marginTop: 4 
      }}>
        {title}
      </div>
    </div>
  );
};

export default ProductManagement;