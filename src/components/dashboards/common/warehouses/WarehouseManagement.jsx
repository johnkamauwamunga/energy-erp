// pages/warehouse/WarehouseManagement.jsx
import React, { useState } from 'react';
import { 
  Tabs, 
  Card, 
  Typography, 
  Row, 
  Col, 
  Space, 
  Grid, 
  Badge,
  Statistic
} from 'antd';
import { 
  ShopOutlined, 
  HomeOutlined, 
  AppstoreOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  StockOutlined,
  SettingOutlined,
  TeamOutlined
} from '@ant-design/icons';
import WarehouseOverview from './WarehouseOverview';
import WarehouseList from './WarehouseList';
import WarehouseStock from './WarehouseStock';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const WarehouseManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const screens = useBreakpoint();

  // Define tabs
  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <AppstoreOutlined />,
      content: <WarehouseOverview onTabChange={setActiveTab} />
    },
    {
      key: 'warehouses',
      label: 'Warehouses',
      icon: <ShopOutlined />,
      content: <WarehouseList />
    },
    {
      key: 'stock',
      label: 'Stock',
      icon: <StockOutlined />,
      content: <WarehouseStock />
    }
  ];

  return (
    <div style={{ padding: screens.xs ? 16 : 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Warehouse Management</Title>
          <Text type="secondary">
            Manage your warehouses, inventory, and stock levels
          </Text>
        </Col>
      </Row>

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

export default WarehouseManagement;