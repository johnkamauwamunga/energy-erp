// pages/warehouse/warehouse/WarehouseOverview.jsx
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Row, 
  Col, 
  Space, 
  Grid, 
  Button,
  Progress,
  Badge,
  Statistic,
  Empty,
  Spin
} from 'antd';
import { 
  ShopOutlined, 
  HomeOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { warehouseService } from '../../../../services/warehouseService/warehouseService';
import WarehouseForm from './forms/WarehouseForm';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const WarehouseOverview = ({ onTabChange }) => {
  const screens = useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // These would come from API calls
  const fetchStats = async () => {
    try {
      setLoading(true);
      // Fetch warehouses and calculate stats
      const warehouses = await warehouseService.getWarehouses();
      
      // Calculate statistics
      const calculatedStats = {
        total: warehouses.length || 0,
        withStock: warehouses.filter(w => w.hasStock).length || 0,
        assigned: warehouses.filter(w => w.isAssignedToStation).length || 0,
        lowStock: warehouses.filter(w => w.lowStockItems > 0).length || 0,
        critical: warehouses.filter(w => w.criticalItems > 0).length || 0,
        recentWarehouses: warehouses.slice(0, 5) // Last 5 warehouses
      };
      
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error fetching warehouse stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleWarehouseCreated = () => {
    fetchStats();
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Header with Action Buttons */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={4}>Warehouse Dashboard</Title>
          <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
            Overview of all warehouses and their status. Create new warehouses or manage existing ones.
          </Text>
        </Col>
        <Col>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
          >
            New Warehouse
          </Button>
        </Col>
      </Row>
      
      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <StatisticCard 
            title="Total Warehouses" 
            value={stats?.total || 0} 
            color="#1890ff"
            icon={<ShopOutlined />}
            onClick={() => onTabChange('warehouses')}
            hoverable
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatisticCard 
            title="With Stock" 
            value={stats?.withStock || 0} 
            color="#52c41a"
            icon={<DatabaseOutlined />}
            description="Active warehouses"
            trend={stats ? `${Math.round((stats.withStock / stats.total) * 100)}%` : '0%'}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatisticCard 
            title="Assigned to Stations" 
            value={stats?.assigned || 0} 
            color="#722ed1"
            icon={<HomeOutlined />}
            description="Linked to stations"
            trend={stats ? `${Math.round((stats.assigned / stats.total) * 100)}%` : '0%'}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatisticCard 
            title="Need Attention" 
            value={stats?.critical || 0} 
            color="#fa541c"
            icon={<AlertOutlined />}
            description="Critical stock levels"
            badgeColor="error"
          />
        </Col>
      </Row>
      
      {/* Recent Warehouses */}
      <Card 
        title={
          <Space>
            <ShopOutlined />
            <span>Recent Warehouses</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {stats?.recentWarehouses && stats.recentWarehouses.length > 0 ? (
          <Row gutter={[16, 16]}>
            {stats.recentWarehouses.map(warehouse => (
              <Col xs={24} sm={12} md={8} lg={6} key={warehouse.id}>
                <WarehouseCard 
                  warehouse={warehouse}
                  onClick={() => onTabChange('warehouses')}
                />
              </Col>
            ))}
          </Row>
        ) : (
          <Empty 
            description="No warehouses yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>
      
      {/* Stock Status Overview */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card 
            title={
              <Space>
                <BarChartOutlined />
                <span>Stock Status</span>
              </Space>
            }
          >
            <StockStatusOverview stats={stats} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card 
            title={
              <Space>
                <EnvironmentOutlined />
                <span>Quick Actions</span>
              </Space>
            }
          >
            <QuickActions onTabChange={onTabChange} />
          </Card>
        </Col>
      </Row>
      
      {/* Create Warehouse Modal */}
      <WarehouseForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onWarehouseCreated={handleWarehouseCreated}
      />
    </div>
  );
};

// Statistic Card Component
const StatisticCard = ({ 
  title, 
  value, 
  color, 
  icon, 
  description, 
  trend, 
  badgeColor,
  onClick,
  hoverable 
}) => {
  const CardComponent = hoverable ? Card : Card;
  
  return (
    <CardComponent 
      hoverable={hoverable}
      onClick={onClick}
      style={hoverable ? { cursor: 'pointer' } : {}}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {React.cloneElement(icon, { style: { color, fontSize: 24 } })}
              <Text style={{ fontSize: 12, color: '#666' }}>{title}</Text>
            </div>
          </Col>
          {badgeColor && (
            <Col>
              <Badge color={badgeColor} />
            </Col>
          )}
        </Row>
        <Statistic 
          value={value} 
          valueStyle={{ 
            fontSize: 28, 
            fontWeight: 'bold', 
            color 
          }}
        />
        {(description || trend) && (
          <Row justify="space-between">
            <Col>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {description}
              </Text>
            </Col>
            {trend && (
              <Col>
                <Text strong style={{ fontSize: 12, color }}>
                  {trend}
                </Text>
              </Col>
            )}
          </Row>
        )}
      </Space>
    </CardComponent>
  );
};

// Warehouse Card Component
const WarehouseCard = ({ warehouse, onClick }) => {
  const getStatusColor = () => {
    if (warehouse.criticalItems > 0) return '#ff4d4f';
    if (warehouse.lowStockItems > 0) return '#fa8c16';
    if (warehouse.hasStock) return '#52c41a';
    return '#d9d9d9';
  };

  return (
    <Card 
      hoverable
      onClick={onClick}
      size="small"
      style={{ height: '100%' }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Text strong style={{ fontSize: 14 }}>{warehouse.displayName}</Text>
          </Col>
          <Col>
            <Badge color={getStatusColor()} />
          </Col>
        </Row>
        
        <Text type="secondary" style={{ fontSize: 12 }}>
          {warehouse.locationDisplay}
        </Text>
        
        <Row gutter={8} style={{ marginTop: 8 }}>
          <Col span={12}>
            <Statistic 
              value={warehouse.totalStock || 0}
              prefix={<DatabaseOutlined style={{ fontSize: 12 }} />}
              valueStyle={{ fontSize: 14 }}
              suffix="units"
            />
          </Col>
          <Col span={12}>
            <Statistic 
              value={warehouse.lowStockItems || 0}
              prefix={<WarningOutlined style={{ fontSize: 12, color: '#fa8c16' }} />}
              valueStyle={{ fontSize: 14, color: '#fa8c16' }}
            />
          </Col>
        </Row>
      </Space>
    </Card>
  );
};

// Stock Status Overview Component
const StockStatusOverview = ({ stats }) => {
  const stockData = [
    { label: 'Good Stock', value: stats?.withStock || 0, color: '#52c41a' },
    { label: 'Low Stock', value: stats?.lowStock || 0, color: '#fa8c16' },
    { label: 'Critical', value: stats?.critical || 0, color: '#ff4d4f' },
    { label: 'Empty', value: (stats?.total || 0) - (stats?.withStock || 0), color: '#d9d9d9' }
  ].filter(item => item.value > 0);

  const total = stockData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {stockData.map((item, index) => (
        <div key={index}>
          <Row justify="space-between" style={{ marginBottom: 4 }}>
            <Col>
              <Text style={{ fontSize: 12 }}>{item.label}</Text>
            </Col>
            <Col>
              <Text strong style={{ fontSize: 12 }}>
                {item.value} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
              </Text>
            </Col>
          </Row>
          <Progress 
            percent={total > 0 ? Math.round((item.value / total) * 100) : 0}
            strokeColor={item.color}
            size="small"
            showInfo={false}
          />
        </div>
      ))}
    </Space>
  );
};

// Quick Actions Component
const QuickActions = ({ onTabChange }) => {
  const actions = [
    {
      label: 'View All Warehouses',
      description: 'Browse and manage all warehouses',
      icon: <ShopOutlined />,
      color: '#1890ff',
      onClick: () => onTabChange('warehouses')
    },
    {
      label: 'Manage Stock',
      description: 'Update stock levels and track inventory',
      icon: <DatabaseOutlined />,
      color: '#52c41a',
      onClick: () => onTabChange('stock')
    },
    {
      label: 'Assign to Station',
      description: 'Link warehouses to stations',
      icon: <HomeOutlined />,
      color: '#722ed1',
      onClick: () => onTabChange('warehouses')
    },
    {
      label: 'Stock Reports',
      description: 'Generate inventory reports',
      icon: <BarChartOutlined />,
      color: '#fa8c16',
      onClick: () => onTabChange('stock')
    }
  ];

  return (
    <Row gutter={[12, 12]}>
      {actions.map((action, index) => (
        <Col span={12} key={index}>
          <Card 
            hoverable
            onClick={action.onClick}
            size="small"
            style={{ 
              borderLeft: `4px solid ${action.color}`,
              height: '100%'
            }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {React.cloneElement(action.icon, { style: { color: action.color } })}
                <Text strong style={{ fontSize: 12 }}>{action.label}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 10 }}>
                {action.description}
              </Text>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default WarehouseOverview;