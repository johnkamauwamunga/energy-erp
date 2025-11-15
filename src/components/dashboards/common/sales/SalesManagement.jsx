// src/components/sales/SalesManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Alert,
  Input,
  Select,
  Badge,
  Tooltip,
  Typography,
  Row,
  Col,
  Statistic,
  Modal,
  Descriptions,
  Popconfirm,
  message,
  Progress,
  Grid,
  Avatar,
  Switch,
  Tabs,
  DatePicker,
  Radio,
  Divider,
  List,
  Timeline,
  Empty
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
  ShopOutlined,
  ProductOutlined,
  DollarOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UserOutlined,
  CreditCardOutlined,
  WalletOutlined,
  AreaChartOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { 
  BarChart3, Activity, Clock, Users, FileText, 
  Flame, X, Menu, MapPin, DollarSign, Truck, Building2, Fuel, LogOut, User, Settings, TrendingUp
} from 'lucide-react';
import { productSalesService } from '../../../../services/productSalesService/productSalesService';
import { pumpSalesService } from '../../../../services/pumpSalesService/pumpSalesService';
import { useApp } from '../../../../context/AppContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const SalesManagement = () => {
  const { state } = useApp();
  const screens = useBreakpoint();
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(false);
  const [productsData, setProductsData] = useState({});
  const [pumpsData, setPumpsData] = useState({});
  const [filters, setFilters] = useState({
    period: 'month',
    startDate: dayjs().startOf('month'),
    endDate: dayjs().endOf('month'),
    stationId: '',
    productId: '',
    pumpId: ''
  });

  const currentCompany = state.currentUser?.companyId;
  const currentStation = state.currentUser?.stationId;

  // Fetch product sales data
  const fetchProductSales = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      let result;
      
      if (currentStation) {
        // Station-level data
        result = await productSalesService.getStationProductSalesDashboard(currentStation, filters);
      } else {
        // Company-level data
        result = await productSalesService.getProductSalesByPeriod(currentCompany, filters.period, filters);
      }
      
      setProductsData(result);
    } catch (error) {
      console.error('❌ Failed to fetch product sales data:', error);
      message.error('Failed to load product sales data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch pump sales data
  const fetchPumpSales = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      let result;
      
      if (currentStation) {
        // Station-level data
        result = await pumpSalesService.getPumpSalesInStation(currentStation, filters);
      } else {
        // Company-level data
        result = await pumpSalesService.getPumpSalesInCompany(currentCompany, filters);
      }
      
      setPumpsData(result);
    } catch (error) {
      console.error('❌ Failed to fetch pump sales data:', error);
      message.error('Failed to load pump sales data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    if (activeTab === 'products') {
      await fetchProductSales();
    } else if (activeTab === 'pumps') {
      await fetchPumpSales();
    } else if (activeTab === 'overview') {
      await Promise.all([fetchProductSales(), fetchPumpSales()]);
    }
  }, [activeTab, currentCompany, currentStation, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Format currency
  const formatCurrency = (amount) => productSalesService.formatCurrency(amount);
  const formatNumber = (number) => productSalesService.formatNumber(number);
  const formatPercentage = (number) => productSalesService.formatPercentage(number);

  // Tab configurations
  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <DashboardOutlined />
          {screens.xs ? '' : ' Overview'}
        </span>
      )
    },
    {
      key: 'products',
      label: (
        <span>
          <ProductOutlined />
          {screens.xs ? '' : ' Products'}
        </span>
      )
    },
    {
      key: 'pumps',
      label: (
        <span>
          <FireOutlined />
          {screens.xs ? '' : ' Pumps'}
        </span>
      )
    }
  ];

  // Overview Tab Content
  const OverviewTab = () => {
    const productSummary = productsData.summary || {};
    const pumpSummary = pumpsData.summary || {};
    
    return (
      <div className="space-y-4">
        {/* Key Metrics */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Total Revenue"
                value={(productSummary.totalSalesValue || 0) + (pumpSummary.totalSalesValue || 0)}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#1890ff' }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Total Liters"
                value={(productSummary.totalLiters || 0) + (pumpSummary.totalLiters || 0)}
                formatter={value => formatNumber(value)}
                valueStyle={{ color: '#52c41a' }}
                prefix={<AreaChartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Active Products"
                value={productSummary.totalProducts || 0}
                valueStyle={{ color: '#faad14' }}
                prefix={<ProductOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Active Pumps"
                value={pumpSummary.totalPumps || 0}
                valueStyle={{ color: '#722ed1' }}
                prefix={<FireOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Performance Overview */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card 
              title="Product Performance" 
              size="small" 
              loading={loading}
              extra={
                <Button 
                  type="link" 
                  onClick={() => setActiveTab('products')}
                  icon={<EyeOutlined />}
                >
                  View Details
                </Button>
              }
            >
              {productsData.products?.slice(0, 3).map((product, index) => (
                <div key={product.product?.id} className="mb-3 last:mb-0">
                  <div className="flex justify-between items-center">
                    <Text strong>{product.product?.name}</Text>
                    <Text>{formatCurrency(product.totalSalesValue)}</Text>
                  </div>
                  <Progress 
                    percent={Math.min((product.totalSalesValue / (productSummary.totalSalesValue || 1)) * 100, 100)} 
                    size="small" 
                    showInfo={false}
                  />
                </div>
              ))}
            </Card>
          </Col>
          
          <Col xs={24} sm={12}>
            <Card 
              title="Pump Performance" 
              size="small" 
              loading={loading}
              extra={
                <Button 
                  type="link" 
                  onClick={() => setActiveTab('pumps')}
                  icon={<EyeOutlined />}
                >
                  View Details
                </Button>
              }
            >
              {pumpsData.pumps?.slice(0, 3).map((pump, index) => (
                <div key={pump.pump?.id} className="mb-3 last:mb-0">
                  <div className="flex justify-between items-center">
                    <Text strong>{pump.pump?.asset?.name}</Text>
                    <Text>{formatCurrency(pump.totalSalesValue)}</Text>
                  </div>
                  <Progress 
                    percent={Math.min((pump.totalSalesValue / (pumpSummary.totalSalesValue || 1)) * 100, 100)} 
                    size="small" 
                    showInfo={false}
                  />
                </div>
              ))}
            </Card>
          </Col>
        </Row>

        {/* Recent Activity */}
        <Card title="Recent Activity" size="small" loading={loading}>
          <Timeline pending={loading}>
            <Timeline.Item color="green" dot={<CheckCircleOutlined />}>
              <Space direction="vertical" size={0}>
                <Text strong>Product Sales Updated</Text>
                <Text type="secondary">Latest data synchronized</Text>
              </Space>
            </Timeline.Item>
            <Timeline.Item color="blue" dot={<FireOutlined />}>
              <Space direction="vertical" size={0}>
                <Text strong>Pump Readings</Text>
                <Text type="secondary">All pump meters updated</Text>
              </Space>
            </Timeline.Item>
          </Timeline>
        </Card>
      </div>
    );
  };

  // Products Tab Content
  const ProductsTab = () => {
    const products = productsData.products || [];
    const summary = productsData.summary || {};
    
    const productColumns = [
      {
        title: 'Product',
        dataIndex: 'product',
        key: 'product',
        width: 150,
        render: (product) => (
          <Space>
            <div 
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: product?.colorCode ? `#${product.colorCode}` : '#666'
              }}
            />
            <Text strong>{product?.name}</Text>
          </Space>
        )
      },
      {
        title: 'Type',
        dataIndex: 'product',
        key: 'type',
        width: 100,
        render: (product) => (
          <Tag color={product?.type === 'FUEL' ? 'blue' : 'green'}>
            {product?.type}
          </Tag>
        )
      },
      {
        title: 'Total Liters',
        dataIndex: 'totalLiters',
        key: 'totalLiters',
        width: 120,
        render: (liters) => formatNumber(liters),
        sorter: (a, b) => a.totalLiters - b.totalLiters
      },
      {
        title: 'Sales Value',
        dataIndex: 'totalSalesValue',
        key: 'totalSalesValue',
        width: 130,
        render: (value) => (
          <Text strong>{formatCurrency(value)}</Text>
        ),
        sorter: (a, b) => a.totalSalesValue - b.totalSalesValue
      },
      {
        title: 'Avg Unit Price',
        dataIndex: 'avgUnitPrice',
        key: 'avgUnitPrice',
        width: 130,
        render: (price) => formatCurrency(price),
        sorter: (a, b) => a.avgUnitPrice - b.avgUnitPrice
      },
      {
        title: 'Performance',
        key: 'performance',
        width: 120,
        render: (_, record) => (
          <Badge 
            count={`#${record.performanceRank || 1}`} 
            style={{ backgroundColor: record.performanceRank <= 3 ? '#52c41a' : '#d9d9d9' }}
          />
        )
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 100,
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="View Details">
              <Button icon={<EyeOutlined />} size="small" />
            </Tooltip>
            <Tooltip title="Export Data">
              <Button icon={<DownloadOutlined />} size="small" />
            </Tooltip>
          </Space>
        )
      }
    ];

    return (
      <div className="space-y-4">
        {/* Product Summary Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Products"
                value={summary.totalProducts || products.length}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Revenue"
                value={summary.totalSalesValue || products.reduce((sum, p) => sum + p.totalSalesValue, 0)}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Liters"
                value={summary.totalLiters || products.reduce((sum, p) => sum + p.totalLiters, 0)}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Avg Efficiency"
                value={summary.avgEfficiency || 0}
                suffix="%"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Products Table */}
        <Card 
          title="Product Sales Performance"
          extra={
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => productSalesService.exportProductSalesToCSV(productsData, 'period')}
            >
              Export
            </Button>
          }
        >
          <Table
            columns={productColumns}
            dataSource={products}
            loading={loading}
            size="small"
            pagination={{ pageSize: 10 }}
            rowKey={(record) => record.product?.id}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No product sales data available"
                />
              )
            }}
          />
        </Card>
      </div>
    );
  };

  // Pumps Tab Content
  const PumpsTab = () => {
    const pumps = pumpsData.pumps || [];
    const summary = pumpsData.summary || {};
    
    const pumpColumns = [
      {
        title: 'Pump',
        dataIndex: 'pump',
        key: 'pump',
        width: 150,
        render: (pump) => (
          <Space>
            <FireOutlined style={{ color: '#ff4d4f' }} />
            <Text strong>{pump?.asset?.name}</Text>
          </Space>
        )
      },
      {
        title: 'Product',
        dataIndex: 'pump',
        key: 'product',
        width: 120,
        render: (pump) => pump?.product?.name || 'N/A'
      },
      {
        title: 'Island',
        dataIndex: 'pump',
        key: 'island',
        width: 100,
        render: (pump) => pump?.island?.name || 'N/A'
      },
      {
        title: 'Total Liters',
        dataIndex: 'totalLiters',
        key: 'totalLiters',
        width: 120,
        render: (liters) => formatNumber(liters),
        sorter: (a, b) => a.totalLiters - b.totalLiters
      },
      {
        title: 'Sales Value',
        dataIndex: 'totalSalesValue',
        key: 'totalSalesValue',
        width: 130,
        render: (value) => (
          <Text strong>{formatCurrency(value)}</Text>
        ),
        sorter: (a, b) => a.totalSalesValue - b.totalSalesValue
      },
      {
        title: 'Efficiency',
        dataIndex: 'efficiency',
        key: 'efficiency',
        width: 100,
        render: (efficiency) => (
          <Tag color={efficiency > 0.9 ? 'green' : efficiency > 0.8 ? 'orange' : 'red'}>
            {formatPercentage(efficiency * 100)}
          </Tag>
        )
      },
      {
        title: 'Status',
        dataIndex: 'pump',
        key: 'status',
        width: 100,
        render: (pump) => (
          <Tag color={pump?.connectionStatus === 'CONNECTED' ? 'green' : 'red'}>
            {pumpSalesService.formatConnectionStatus(pump?.connectionStatus)}
          </Tag>
        )
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 100,
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="View Details">
              <Button icon={<EyeOutlined />} size="small" />
            </Tooltip>
            <Tooltip title="Export Data">
              <Button icon={<DownloadOutlined />} size="small" />
            </Tooltip>
          </Space>
        )
      }
    ];

    return (
      <div className="space-y-4">
        {/* Pump Summary Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Pumps"
                value={summary.totalPumps || pumps.length}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Revenue"
                value={summary.totalSalesValue || pumps.reduce((sum, p) => sum + p.totalSalesValue, 0)}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Liters"
                value={summary.totalLiters || pumps.reduce((sum, p) => sum + p.totalLiters, 0)}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Avg Efficiency"
                value={summary.avgEfficiency || pumps.reduce((sum, p) => sum + (p.efficiency || 0), 0) / pumps.length}
                suffix="%"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Pumps Table */}
        <Card 
          title="Pump Sales Performance"
          extra={
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => pumpSalesService.exportPumpSalesToCSV(pumpsData, 'period')}
            >
              Export
            </Button>
          }
        >
          <Table
            columns={pumpColumns}
            dataSource={pumps}
            loading={loading}
            size="small"
            pagination={{ pageSize: 10 }}
            rowKey={(record) => record.pump?.id}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No pump sales data available"
                />
              )
            }}
          />
        </Card>
      </div>
    );
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'products':
        return <ProductsTab />;
      case 'pumps':
        return <PumpsTab />;
      default:
        return <OverviewTab />;
    }
  };

  if (!currentCompany) {
    return (
      <Alert
        message="No Company Context"
        description="Please ensure you are logged into a company account."
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <Title level={2} style={{ margin: 0, fontSize: screens.xs ? '20px' : '24px' }}>
                Sales Management
              </Title>
              <Text type="secondary" style={{ fontSize: screens.xs ? '12px' : '14px' }}>
                {currentStation ? 'Station' : 'Company'} sales analytics and performance tracking
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify={screens.md ? "end" : "start"}>
              <Col xs={12} sm={8}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchData}
                  loading={loading}
                  block={screens.xs}
                >
                  {screens.sm && 'Refresh'}
                </Button>
              </Col>
              <Col xs={12} sm={8}>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    if (activeTab === 'products') {
                      productSalesService.exportProductSalesToCSV(productsData, 'period');
                    } else if (activeTab === 'pumps') {
                      pumpSalesService.exportPumpSalesToCSV(pumpsData, 'period');
                    }
                  }}
                  block={screens.xs}
                >
                  {screens.sm && 'Export'}
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Select
              style={{ width: '100%' }}
              value={filters.period}
              onChange={(value) => handleFilterChange({ period: value })}
              size="large"
            >
              <Option value="day">Daily</Option>
              <Option value="week">Weekly</Option>
              <Option value="month">Monthly</Option>
              <Option value="quarter">Quarterly</Option>
              <Option value="year">Yearly</Option>
            </Select>
          </Col>
          
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={[filters.startDate, filters.endDate]}
              onChange={(dates) => handleFilterChange({ 
                startDate: dates?.[0], 
                endDate: dates?.[1] 
              })}
              size="large"
            />
          </Col>

          <Col xs={24} sm={8} md={6}>
            <Button 
              icon={<FilterOutlined />}
              onClick={() => {
                handleFilterChange({
                  period: 'month',
                  startDate: dayjs().startOf('month'),
                  endDate: dayjs().endOf('month'),
                  stationId: '',
                  productId: '',
                  pumpId: ''
                });
              }}
              size="large"
              block
            >
              Reset Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Content with Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          type={screens.xs ? "card" : "line"}
          size={screens.xs ? "small" : "middle"}
        />
        
        <div style={{ marginTop: 16 }}>
          {renderTabContent()}
        </div>
      </Card>
    </div>
  );
};

export default SalesManagement;