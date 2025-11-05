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
  ClockCircleOutlined
} from '@ant-design/icons';
import { 
  BarChart3, Activity, Clock, Users, FileText, 
  Flame, X, Menu, MapPin, DollarSign, Truck, Building2, Fuel, LogOut, User, Settings,TrendingUp // Added Settings import

} from 'lucide-react';
import { salesAnalyticsService } from '../../../../services/salesAnalyticsService/salesAnalyticsService';
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
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({});
  const [filters, setFilters] = useState({
    period: new Date(),
    periodType: 'DAILY',
    stationId: '',
    productId: '',
    startDate: dayjs().startOf('month'),
    endDate: dayjs().endOf('month'),
    compareWith: 'PREVIOUS_PERIOD'
  });

  const currentCompany = state.currentUser?.companyId;

  // Fetch data based on active tab
  const fetchData = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      let result;
      
      switch (activeTab) {
        case 'overview':
          result = await salesAnalyticsService.getCompanySales(filters.period, filters.periodType);
          break;
        case 'shifts':
          result = await salesAnalyticsService.getSalesTrends({
            periodType: filters.periodType,
            dataPoints: 7
          });
          break;
        case 'stations':
          result = await salesAnalyticsService.getCompanySales(filters.period, filters.periodType);
          break;
        case 'products':
          result = await salesAnalyticsService.getCompanySales(filters.period, filters.periodType);
          break;
        case 'payments':
          result = await salesAnalyticsService.getPaymentAnalysis(filters.period, filters.periodType);
          break;
        case 'comparison':
          result = await salesAnalyticsService.getSalesComparison({
            periodType: filters.periodType,
            compareWith: filters.compareWith
          });
          break;
        case 'trends':
          result = await salesAnalyticsService.getSalesTrends({
            periodType: filters.periodType,
            dataPoints: 12
          });
          break;
        default:
          result = await salesAnalyticsService.getCompanySales(filters.period, filters.periodType);
      }
      
      setData(prev => ({
        ...prev,
        [activeTab]: result
      }));
      
    } catch (error) {
      console.error(`❌ Failed to fetch ${activeTab} data:`, error);
      message.error(`Failed to load ${activeTab} data`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, currentCompany, filters.period, filters.periodType, filters.compareWith]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Format currency
  const formatCurrency = (amount) => salesAnalyticsService.formatCurrency(amount);

  // Tab configurations
  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <BarChartOutlined />
          {screens.xs ? '' : ' Overview'}
        </span>
      )
    },
    {
      key: 'shifts',
      label: (
        <span>
          <ClockCircleOutlined />
          {screens.xs ? '' : ' Shifts'}
        </span>
      )
    },
    {
      key: 'stations',
      label: (
        <span>
          <ShopOutlined />
          {screens.xs ? '' : ' Stations'}
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
      key: 'payments',
      label: (
        <span>
          <CreditCardOutlined />
          {screens.xs ? '' : ' Payments'}
        </span>
      )
    },
    {
      key: 'comparison',
      label: (
        <span>
          <PlusOutlined />
          {screens.xs ? '' : ' Comparison'}
        </span>
      )
    },
    {
      key: 'trends',
      label: (
        <span>
          <TrendingUp />
          {screens.xs ? '' : ' Trends'}
        </span>
      )
    }
  ];

  // Overview Tab Content
  const OverviewTab = () => {
    const overviewData = data.overview || {};
    
    return (
      <div className="space-y-4">
        {/* Key Metrics */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Total Revenue"
                value={overviewData.totalRevenue || 0}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#1890ff' }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Fuel Sales"
                value={overviewData.fuelRevenue || 0}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#52c41a' }}
                prefix={<AreaChartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Non-Fuel Sales"
                value={overviewData.nonFuelRevenue || 0}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#faad14' }}
                prefix={<ProductOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Growth Rate"
                value={overviewData.growthRate || 0}
                suffix="%"
                valueStyle={{ 
                  color: (overviewData.growthRate || 0) >= 0 ? '#52c41a' : '#cf1322' 
                }}
                prefix={<TrendingUp />}
              />
            </Card>
          </Col>
        </Row>

        {/* Performance Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card 
              title="Sales Performance" 
              size="small" 
              loading={loading}
              extra={<Text type="secondary">This Period</Text>}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div className="flex justify-between">
                  <Text>Target Achievement</Text>
                  <Text strong>85%</Text>
                </div>
                <Progress percent={85} status="active" />
                
                <div className="flex justify-between">
                  <Text>Daily Average</Text>
                  <Text strong>{formatCurrency(overviewData.avgDailySales || 0)}</Text>
                </div>
                
                <div className="flex justify-between">
                  <Text>Best Performing Station</Text>
                  <Text strong type="success">Station Alpha</Text>
                </div>
              </Space>
            </Card>
          </Col>
          
          <Col xs={24} sm={12}>
            <Card 
              title="Quick Insights" 
              size="small" 
              loading={loading}
            >
              <List
                size="small"
                dataSource={[
                  'Fuel sales up by 12% this week',
                  'Electronic payments increased by 8%',
                  'Station Beta exceeding targets',
                  'Premium fuel performing well'
                ]}
                renderItem={(item, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size="small" 
                          icon={<CheckCircleOutlined />}
                          style={{ backgroundColor: '#52c41a' }}
                        />
                      }
                      title={<Text style={{ fontSize: '12px' }}>{item}</Text>}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* Recent Activity */}
        <Card title="Recent Activity" size="small" loading={loading}>
          <Timeline>
            <Timeline.Item color="green" dot={<CheckCircleOutlined />}>
              <Space direction="vertical" size={0}>
                <Text strong>Shift Completed</Text>
                <Text type="secondary">Station Alpha - 8:00 PM</Text>
                <Text>Total Sales: {formatCurrency(12500)}</Text>
              </Space>
            </Timeline.Item>
            <Timeline.Item color="blue" dot={<DollarOutlined />}>
              <Space direction="vertical" size={0}>
                <Text strong>Bank Deposit</Text>
                <Text type="secondary">Station Beta - 4:30 PM</Text>
                <Text>Amount: {formatCurrency(8500)}</Text>
              </Space>
            </Timeline.Item>
            <Timeline.Item color="orange" dot={<ExclamationCircleOutlined />}>
              <Space direction="vertical" size={0}>
                <Text strong>Variance Alert</Text>
                <Text type="secondary">Station Gamma - 2:15 PM</Text>
                <Text>Variance: {formatCurrency(-250)}</Text>
              </Space>
            </Timeline.Item>
          </Timeline>
        </Card>
      </div>
    );
  };

  // Shifts Tab Content
  const ShiftsTab = () => {
    const shiftsData = data.shifts || {};
    
    const columns = [
      {
        title: 'Shift',
        dataIndex: 'shiftNumber',
        key: 'shiftNumber',
        width: 80,
        render: (number) => <Tag color="blue">#{number}</Tag>
      },
      {
        title: 'Station',
        dataIndex: 'stationName',
        key: 'stationName',
        width: 120
      },
      {
        title: 'Supervisor',
        dataIndex: 'supervisor',
        key: 'supervisor',
        width: 120,
        render: (supervisor) => (
          <Space>
            <UserOutlined />
            {supervisor}
          </Space>
        )
      },
      {
        title: 'Sales',
        dataIndex: 'totalSales',
        key: 'totalSales',
        width: 100,
        render: (amount) => (
          <Text strong>{formatCurrency(amount)}</Text>
        )
      },
      {
        title: 'Collections',
        dataIndex: 'totalCollections',
        key: 'totalCollections',
        width: 100,
        render: (amount) => (
          <Text strong type={amount > 0 ? "success" : "default"}>
            {formatCurrency(amount)}
          </Text>
        )
      },
      {
        title: 'Variance',
        dataIndex: 'variance',
        key: 'variance',
        width: 100,
        render: (variance) => (
          <Badge 
            count={formatCurrency(variance)} 
            style={{ 
              backgroundColor: variance >= 0 ? '#52c41a' : '#cf1322' 
            }}
          />
        )
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status) => (
          <Tag color={status === 'CLOSED' ? 'green' : 'orange'}>
            {status}
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
            <Tooltip title="Export Report">
              <Button icon={<DownloadOutlined />} size="small" />
            </Tooltip>
          </Space>
        )
      }
    ];

    return (
      <div className="space-y-4">
        <Card>
          <Table
            columns={columns}
            dataSource={[]} // Would be shiftsData.shifts or similar
            loading={loading}
            size="small"
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No shift data available"
                />
              )
            }}
          />
        </Card>
      </div>
    );
  };

  // Stations Tab Content
  const StationsTab = () => {
    const stationsData = data.stations || {};
    
    return (
      <div className="space-y-4">
        <Row gutter={[16, 16]}>
          {(stationsData.stationPerformance || []).slice(0, 6).map((station, index) => (
            <Col xs={24} sm={12} md={8} key={station.stationId}>
              <Card 
                size="small"
                title={station.stationName}
                extra={<Tag color="blue">{station.performance}</Tag>}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Statistic
                    title="Total Revenue"
                    value={station.totalRevenue}
                    formatter={value => formatCurrency(value)}
                    valueStyle={{ color: '#1890ff', fontSize: '16px' }}
                  />
                  <div className="flex justify-between">
                    <Text type="secondary">Fuel Sales</Text>
                    <Text strong>{formatCurrency(station.fuelRevenue)}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text type="secondary">Non-Fuel</Text>
                    <Text strong>{formatCurrency(station.nonFuelRevenue)}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text type="secondary">Growth</Text>
                    <Text strong type={station.growthRate >= 0 ? "success" : "danger"}>
                      {station.growthRate}%
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  // Products Tab Content
  const ProductsTab = () => {
    const productsData = data.products || {};
    
    return (
      <div className="space-y-4">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Top Products" size="small" loading={loading}>
              <List
                dataSource={productsData.topProducts || []}
                renderItem={(product, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          style={{ 
                            backgroundColor: index < 3 ? '#1890ff' : '#d9d9d9' 
                          }}
                        >
                          {index + 1}
                        </Avatar>
                      }
                      title={product.productName}
                      description={`${formatCurrency(product.totalRevenue)} • ${product.totalQuantity} units`}
                    />
                    <Tag color={product.productType === 'FUEL' ? 'blue' : 'green'}>
                      {product.productType}
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          
          <Col xs={24} lg={12}>
            <Card title="Product Performance" size="small" loading={loading}>
              {/* Product performance metrics would go here */}
              <Empty
                description="Product performance chart will be displayed here"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // Payments Tab Content
  const PaymentsTab = () => {
    const paymentsData = data.payments || {};
    const summary = paymentsData.summary || {};
    
    return (
      <div className="space-y-4">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Cash"
                value={summary.cash?.amount || 0}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#52c41a' }}
                prefix={<WalletOutlined />}
              />
              <Text type="secondary">{summary.cash?.percentage || 0}% of total</Text>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Electronic"
                value={summary.electronic?.amount || 0}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#1890ff' }}
                prefix={<CreditCardOutlined />}
              />
              <Text type="secondary">{summary.electronic?.percentage || 0}% of total</Text>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Mobile Money"
                value={summary.electronic?.breakdown?.mobileMoney?.amount || 0}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#722ed1' }}
                prefix={<CreditCardOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Debt"
                value={summary.debt?.amount || 0}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#faad14' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Payment Trends" size="small">
          <Empty
            description="Payment trends chart will be displayed here"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      </div>
    );
  };

  // Comparison Tab Content
  const ComparisonTab = () => {
    const comparisonData = data.comparison || {};
    
    return (
      <div className="space-y-4">
        {comparisonData.currentPeriod && comparisonData.previousPeriod && (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Card title="Current Period" size="small">
                  <Statistic
                    title="Total Revenue"
                    value={comparisonData.currentPeriod.totalRevenue}
                    formatter={value => formatCurrency(value)}
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Divider />
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div className="flex justify-between">
                      <Text>Fuel Sales</Text>
                      <Text strong>{formatCurrency(comparisonData.currentPeriod.fuelRevenue)}</Text>
                    </div>
                    <div className="flex justify-between">
                      <Text>Non-Fuel Sales</Text>
                      <Text strong>{formatCurrency(comparisonData.currentPeriod.nonFuelRevenue)}</Text>
                    </div>
                    <div className="flex justify-between">
                      <Text>Transactions</Text>
                      <Text strong>{comparisonData.currentPeriod.transactionCount}</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
              
              <Col xs={24} sm={12}>
                <Card title="Previous Period" size="small">
                  <Statistic
                    title="Total Revenue"
                    value={comparisonData.previousPeriod.totalRevenue}
                    formatter={value => formatCurrency(value)}
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Divider />
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div className="flex justify-between">
                      <Text>Fuel Sales</Text>
                      <Text strong>{formatCurrency(comparisonData.previousPeriod.fuelRevenue)}</Text>
                    </div>
                    <div className="flex justify-between">
                      <Text>Non-Fuel Sales</Text>
                      <Text strong>{formatCurrency(comparisonData.previousPeriod.nonFuelRevenue)}</Text>
                    </div>
                    <div className="flex justify-between">
                      <Text>Transactions</Text>
                      <Text strong>{comparisonData.previousPeriod.transactionCount}</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>

            <Card title="Growth Analysis" size="small">
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Revenue Growth"
                    value={comparisonData.growth?.percentage || 0}
                    suffix="%"
                    valueStyle={{ 
                      color: (comparisonData.growth?.percentage || 0) >= 0 ? '#52c41a' : '#cf1322' 
                    }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Absolute Growth"
                    value={comparisonData.growth?.amount || 0}
                    formatter={value => formatCurrency(value)}
                    valueStyle={{ 
                      color: (comparisonData.growth?.amount || 0) >= 0 ? '#52c41a' : '#cf1322' 
                    }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Trend"
                    value={comparisonData.growth?.trend === 'UP' ? 'Growing' : 'Declining'}
                    valueStyle={{ 
                      color: comparisonData.growth?.trend === 'UP' ? '#52c41a' : '#cf1322' 
                    }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Significance"
                    value={comparisonData.growth?.significance || 'STABLE'}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
              </Row>
            </Card>
          </>
        )}
      </div>
    );
  };

  // Trends Tab Content
  const TrendsTab = () => {
    const trendsData = data.trends || {};
    
    return (
      <div className="space-y-4">
        <Card title="Sales Trends" loading={loading}>
          <Empty
            description="Sales trends chart will be displayed here"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
        
        <Card title="Trend Analysis" size="small">
          {trendsData.analysis ? (
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Overall Trend">
                <Tag color={
                  trendsData.analysis.overallTrend === 'STRONG_GROWTH' ? 'green' :
                  trendsData.analysis.overallTrend === 'MODERATE_GROWTH' ? 'blue' :
                  trendsData.analysis.overallTrend === 'STABLE' ? 'orange' : 'red'
                }>
                  {trendsData.analysis.overallTrend}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Consistency">
                <Tag color={
                  trendsData.analysis.consistency === 'HIGH' ? 'green' :
                  trendsData.analysis.consistency === 'MODERATE' ? 'orange' : 'red'
                }>
                  {trendsData.analysis.consistency}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Growth Rate">
                {trendsData.analysis.growthRate}%
              </Descriptions.Item>
              <Descriptions.Item label="Seasonality">
                {trendsData.analysis.seasonality}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Empty
              description="No trend analysis available"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      </div>
    );
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'shifts':
        return <ShiftsTab />;
      case 'stations':
        return <StationsTab />;
      case 'products':
        return <ProductsTab />;
      case 'payments':
        return <PaymentsTab />;
      case 'comparison':
        return <ComparisonTab />;
      case 'trends':
        return <TrendsTab />;
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
                Comprehensive sales analytics and performance tracking
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
                  onClick={() => salesAnalyticsService.exportSalesReport(filters)}
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
              value={filters.periodType}
              onChange={(value) => handleFilterChange({ periodType: value })}
              size="large"
            >
              <Option value="DAILY">Daily</Option>
              <Option value="WEEKLY">Weekly</Option>
              <Option value="MONTHLY">Monthly</Option>
              <Option value="QUARTERLY">Quarterly</Option>
              <Option value="YEARLY">Yearly</Option>
            </Select>
          </Col>
          
          {activeTab === 'comparison' && (
            <Col xs={24} sm={8} md={6}>
              <Select
                style={{ width: '100%' }}
                value={filters.compareWith}
                onChange={(value) => handleFilterChange({ compareWith: value })}
                size="large"
              >
                <Option value="PREVIOUS_PERIOD">Previous Period</Option>
                <Option value="YEAR_AGO">Same Period Last Year</Option>
                <Option value="CUSTOM">Custom Range</Option>
              </Select>
            </Col>
          )}

          <Col xs={24} sm={8} md={6}>
            <DatePicker
              style={{ width: '100%' }}
              value={dayjs(filters.period)}
              onChange={(date) => handleFilterChange({ period: date ? date.toDate() : new Date() })}
              picker={filters.periodType.toLowerCase()}
              size="large"
            />
          </Col>

          <Col xs={24} sm={8} md={6}>
            <Button 
              icon={<FilterOutlined />}
              onClick={() => {
                handleFilterChange({
                  period: new Date(),
                  periodType: 'DAILY',
                  compareWith: 'PREVIOUS_PERIOD'
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