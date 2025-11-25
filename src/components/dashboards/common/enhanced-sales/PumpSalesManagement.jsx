import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  DatePicker,
  Badge,
  Typography,
  Tabs,
  Progress,
  Divider,
  Empty
} from 'antd';
import {
  DollarOutlined,
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined,
  ShopOutlined,
  CalendarOutlined,
  BarChartOutlined,
  ProductOutlined,
  FireOutlined,
  DashboardOutlined,
  LineChartOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { enhancedSalesService, GROUPING_TYPES, PERIOD_TYPES } from '../../../../services/enhancedSalesService/enhancedSalesService';
import { useApp } from '../../../../context/AppContext';
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

const PumpSalesManagement = () => {
  const { state } = useApp();
  const userStationId = state.currentStation?.id;
  
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [productPerformance, setProductPerformance] = useState([]);
  const [shiftPerformance, setShiftPerformance] = useState([]);
  const [salesTrends, setSalesTrends] = useState({});
  const [activeTab, setActiveTab] = useState('pump-sales');
  
  const [filters, setFilters] = useState({
    search: '',
    groupBy: '',
    period: PERIOD_TYPES.DAILY,
    startDate: '',
    endDate: '',
    page: 1,
    limit: 10
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingRecord, setViewingRecord] = useState(null);

  // Load data based on active tab
  const loadData = useCallback(async () => {
    if (!userStationId) {
      message.warning('Please select a station first');
      return;
    }

    setLoading(true);
    try {
      const baseFilters = {
        stationId: userStationId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        groupBy: filters.groupBy,
        page: pagination.page,
        limit: pagination.limit
      };

      switch (activeTab) {
        case 'pump-sales':
          const pumpSalesResult = await enhancedSalesService.getCalculatedPumpSales(baseFilters);
          console.log("Enhanced sales service data:", pumpSalesResult);
          setSalesData(pumpSalesResult.data || []);
          setPagination(prev => ({
            ...prev,
            total: pumpSalesResult.pagination?.total || pumpSalesResult.data?.length || 0
          }));
          break;

        case 'product-sales':
          const productResult = await enhancedSalesService.getProductPerformance(baseFilters);
          console.log("Enhanced product-sales:", productResult);
          setProductPerformance(productResult.data || []);
          break;

        case 'shift-performance':
          const shiftResult = await enhancedSalesService.getShiftPerformance(baseFilters);
          console.log("Enhanced shift-performance:", shiftResult);
          setShiftPerformance(shiftResult.data || []);
          break;

        case 'sales-trends':
          const trendsResult = await enhancedSalesService.getSalesTrends(baseFilters);
          console.log("Enhanced sales-trends:", trendsResult);
          setSalesTrends(trendsResult.data || {});
          break;

        default:
          break;
      }
    } catch (error) {
      message.error(`Failed to load ${activeTab.replace('-', ' ')} data: ${error.message}`);
      console.error(`❌ Error loading ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  }, [userStationId, activeTab, filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle view details
  const handleViewDetails = (record) => {
    setViewingRecord(record);
    setViewModalVisible(true);
  };

  // Handle date range change
  const handleDateRangeChange = (dates, dateStrings) => {
    setFilters(prev => ({
      ...prev,
      startDate: dateStrings[0] || '',
      endDate: dateStrings[1] || '',
      page: 1
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      groupBy: '',
      period: PERIOD_TYPES.DAILY,
      startDate: '',
      endDate: '',
      page: 1,
      limit: 10
    });
    setPagination({
      page: 1,
      limit: 10,
      total: 0
    });
  };

  // Export data
  const handleExportData = () => {
    enhancedSalesService.exportToCSV(
      { data: salesData }, 
      `sales-data-${state.currentStation?.name}-${new Date().toISOString().split('T')[0]}`
    );
    message.success('Data exported successfully');
  };

// Statistics for dashboard - FIXED to handle different data structures
const stats = useMemo(() => {
  let dataSource = [];
  
  switch (activeTab) {
    case 'pump-sales':
      dataSource = salesData;
      break;
    case 'product-sales':
      dataSource = productPerformance;
      break;
    case 'shift-performance':
      dataSource = shiftPerformance;
      break;
    default:
      dataSource = salesData;
  }

  // Safe calculation with proper fallbacks
  const totalRevenue = dataSource.reduce((sum, item) => {
    // Handle different data structures
    if (item.type === 'product' || item.type === 'shift') {
      return sum + (item.metrics?.totalRevenue || 0);
    }
    return sum + (item.salesData?.salesValue || item.metrics?.totalRevenue || 0);
  }, 0);
  
  const totalLiters = dataSource.reduce((sum, item) => {
    // Handle different data structures
    if (item.type === 'product' || item.type === 'shift') {
      return sum + (item.metrics?.totalLiters || 0);
    }
    return sum + (item.salesData?.litersDispensed || item.metrics?.totalLiters || 0);
  }, 0);
  
  const uniquePumps = [...new Set(dataSource.map(item => {
    // Handle pump extraction from different structures
    const pump = item.pump || (item.sales?.[0]?.pump);
    return pump?.id;
  }).filter(Boolean))].length;

  const uniqueProducts = [...new Set(dataSource.map(item => {
    // Handle product extraction from different structures
    const product = item.product || (item.sales?.[0]?.product);
    return product?.id;
  }).filter(Boolean))].length;

  const uniqueShifts = [...new Set(dataSource.map(item => {
    // Handle shift extraction from different structures
    const shift = item.shift || (item.sales?.[0]?.shift);
    return shift?.id;
  }).filter(Boolean))].length;

  return {
    totalRevenue,
    totalLiters,
    uniquePumps,
    uniqueProducts,
    uniqueShifts,
    averagePrice: totalLiters > 0 ? totalRevenue / totalLiters : 0,
    recordCount: dataSource.length
  };
}, [salesData, productPerformance, shiftPerformance, activeTab]);

  // Product performance metrics - FIXED
  const productMetrics = useMemo(() => {
    if (!productPerformance.length) return { totalRevenue: 0, productCount: 0 };

    const totalRevenue = productPerformance.reduce((sum, product) => {
      return sum + (product.metrics?.totalRevenue || 0);
    }, 0);

    return {
      bestProduct: productPerformance[0],
      totalRevenue,
      productCount: productPerformance.length
    };
  }, [productPerformance]);

  // ==================== TABLE COLUMNS ====================

  const pumpSalesColumns = [
    {
      title: 'Pump Details',
      dataIndex: 'pump',
      key: 'pump',
      width: 200,
      fixed: 'left',
      render: (pump, record) => {
        // Get pump name from nested asset or direct property - FIXED
        const pumpName = pump?.asset?.name || pump?.name || 'Unknown Pump';
        const pumpLabel = pump?.asset?.stationLabel || pump?.label || 'No Label';
        const connectionStatus = pump?.connectionStatus || 'UNKNOWN';
        
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: '14px' }}>
              <FireOutlined style={{ marginRight: 4, color: '#ff4d4f' }} />
              {pumpName}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {pumpLabel}
            </Text>
            <Tag 
              color={connectionStatus === 'FULLY_CONNECTED' ? 'green' : 'orange'} 
              size="small"
            >
              {connectionStatus}
            </Tag>
          </Space>
        );
      }
    },
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
      width: 150,
      render: (product) => {
        const productName = product?.name || 'Unknown Product';
        const fuelCode = product?.fuelCode || 'N/A';
        const price = product?.minSellingPrice || product?.price || 0;
        
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: '12px' }}>
              {productName}
            </Text>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {fuelCode}
            </Text>
            <Text style={{ fontSize: '11px', color: '#52c41a' }}>
              {enhancedSalesService.formatCurrency(price)}/L
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Shift',
      dataIndex: 'shift',
      key: 'shift',
      width: 120,
      render: (shift) => {
        const shiftNumber = shift?.shiftNumber || 'No Shift';
        const startTime = shift?.startTime;
        
        return (
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: '11px' }}>
              🕐 {shiftNumber}
            </Text>
            {startTime && (
              <Text type="secondary" style={{ fontSize: '9px' }}>
                {enhancedSalesService.formatDate(startTime)}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Sales Data',
      key: 'salesData',
      width: 180,
      render: (_, record) => {
        const salesData = record.salesData || {};
        
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ color: '#cf1322', fontSize: '14px' }}>
              {enhancedSalesService.formatCurrency(salesData.salesValue || 0)}
            </Text>
            <Text style={{ fontSize: '12px' }}>
              {enhancedSalesService.formatVolume(salesData.litersDispensed || 0)}
            </Text>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {enhancedSalesService.formatCurrency(salesData.unitPrice || 0)}/L
            </Text>
            <Text type="secondary" style={{ fontSize: '9px' }}>
              Meters: {salesData.openingMeter || 0} → {salesData.closingMeter || 0}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Station',
      key: 'station',
      width: 150,
      render: (_, record) => {
        const stationName = record.station?.name || 'Unknown Station';
        const companyName = record.company?.name || 'Unknown Company';
        
        return (
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: '11px' }}>
              <ShopOutlined /> {stationName}
            </Text>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              🏢 {companyName}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Calculated',
      dataIndex: 'salesData',
      key: 'calculatedAt',
      width: 150,
      render: (salesData) => (
        <Text type="secondary" style={{ fontSize: '10px' }}>
          {enhancedSalesService.formatDate(salesData?.calculatedAt)}
        </Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="View Details">
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleViewDetails(record)}
          />
        </Tooltip>
      )
    }
  ];

const productPerformanceColumns = [
  {
    title: 'Product',
    dataIndex: 'product',
    key: 'product',
    width: 200,
    fixed: 'left',
    render: (product) => {
      const productName = product?.name || 'Unknown Product';
      const fuelCode = product?.fuelCode || 'N/A';
      const price = product?.minSellingPrice || 0;
      
      return (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: '14px' }}>
            <ProductOutlined style={{ marginRight: 4, color: '#1890ff' }} />
            {productName}
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Code: {fuelCode}
          </Text>
          <Text style={{ fontSize: '12px', color: '#52c41a' }}>
            Price: {enhancedSalesService.formatCurrency(price)}/L
          </Text>
        </Space>
      );
    }
  },
  {
    title: 'Performance Metrics',
    key: 'metrics',
    width: 250,
    render: (_, record) => {
      const metrics = record.metrics || {};
      
      return (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <div>
            <Text strong style={{ fontSize: '12px' }}>Revenue: </Text>
            <Text strong style={{ color: '#cf1322', fontSize: '12px' }}>
              {enhancedSalesService.formatCurrency(metrics.totalRevenue || 0)}
            </Text>
          </div>
          <div>
            <Text strong style={{ fontSize: '12px' }}>Volume: </Text>
            <Text style={{ fontSize: '12px' }}>
              {enhancedSalesService.formatVolume(metrics.totalLiters || 0)}
            </Text>
          </div>
          <div>
            <Text strong style={{ fontSize: '12px' }}>Avg Price: </Text>
            <Text style={{ fontSize: '12px', color: '#52c41a' }}>
              {enhancedSalesService.formatCurrency(metrics.averagePrice || 0)}/L
            </Text>
          </div>
        </Space>
      );
    }
  },
  {
    title: 'Distribution',
    key: 'distribution',
    width: 200,
    render: (_, record) => {
      const metrics = record.metrics || {};
      
      return (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <div>
            <Text style={{ fontSize: '11px' }}>Pumps: </Text>
            <Badge count={metrics.pumpCount || 0} showZero color="#1890ff" />
          </div>
          <div>
            <Text style={{ fontSize: '11px' }}>Shifts: </Text>
            <Badge count={metrics.shiftCount || 0} showZero color="#52c41a" />
          </div>
          <div>
            <Text style={{ fontSize: '11px' }}>Sales Records: </Text>
            <Badge count={record.sales?.length || 0} showZero color="#faad14" />
          </div>
        </Space>
      );
    }
  },
  {
    title: 'Market Share',
    key: 'marketshare',
    width: 150,
    render: (_, record) => {
      // Calculate market share using the productPerformance array directly
      const totalRevenue = productPerformance.reduce((sum, r) => sum + (r.metrics?.totalRevenue || 0), 0);
      const share = totalRevenue > 0 ? ((record.metrics?.totalRevenue || 0) / totalRevenue) * 100 : 0;
      
      return (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Progress 
            percent={Math.round(share)} 
            size="small" 
            strokeColor={record === productPerformance[0] ? '#52c41a' : '#1890ff'}
          />
          <Text type="secondary" style={{ fontSize: '10px' }}>
            {Math.round(share)}% of total
          </Text>
        </Space>
      );
    }
  }
];

  const shiftPerformanceColumns = [
    {
      title: 'Shift Details',
      dataIndex: 'shift',
      key: 'shift',
      width: 200,
      fixed: 'left',
      render: (shift) => {
        const shiftNumber = shift?.shiftNumber || 'Unknown Shift';
        const startTime = shift?.startTime;
        
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: '14px' }}>
              🕐 {shiftNumber}
            </Text>
            {startTime && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {enhancedSalesService.formatDate(startTime)}
              </Text>
            )}
            <Text type="secondary" style={{ fontSize: '10px' }}>
              Supervisor: {shift?.supervisor?.firstName} {shift?.supervisor?.lastName}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Performance Metrics',
      key: 'metrics',
      width: 250,
      render: (_, record) => {
        const metrics = record.metrics || {};
        
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <div>
              <Text strong style={{ fontSize: '10px' }}>Total Revenue: </Text>
              <Text strong style={{ color: '#2c1886ff', fontSize: '9px' }}>
                {enhancedSalesService.formatCurrency(metrics.totalRevenue || 0)}
              </Text>
            </div>
            <div>
              <Text strong style={{ fontSize: '10px' }}>Total Volume: </Text>
              <Text style={{ fontSize: '9px' }}>
                {enhancedSalesService.formatVolume(metrics.totalLiters || 0)}
              </Text>
            </div>
            <div>
              <Text strong style={{ fontSize: '10px' }}>Avg per Pump: </Text>
              <Text style={{ fontSize: '9px', color: '#52c41a' }}>
                {enhancedSalesService.formatCurrency(metrics.averageRevenuePerPump || 0)}
              </Text>
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Activity',
      key: 'activity',
      width: 180,
      render: (_, record) => {
        const metrics = record.metrics || {};
        
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <div>
              <Text style={{ fontSize: '11px' }}>Active Pumps: </Text>
              <Badge count={metrics.pumpCount || 0} showZero color="#1890ff" />
            </div>
            <div>
              <Text style={{ fontSize: '11px' }}>Products Sold: </Text>
              <Badge count={metrics.productCount || 0} showZero color="#52c41a" />
            </div>
            <div>
              <Text style={{ fontSize: '11px' }}>Sales Records: </Text>
              <Badge count={record.sales?.length || 0} showZero color="#faad14" />
            </div>
          </Space>
        );
      }
    }
  ];

  // ==================== CHART COMPONENTS ====================

  const ProductSalesChart = () => {
    if (!productPerformance.length) {
      return (
        <Card>
          <Empty description="No product performance data available" />
        </Card>
      );
    }

    return (
      <Card title="Product Sales Performance" extra={<BarChartOutlined />}>
        <Row gutter={[16, 16]}>
          {productPerformance.slice(0, 8).map((product, index) => {
            const metrics = product.metrics || {};
            const share = productMetrics.totalRevenue > 0 ? 
              ((metrics.totalRevenue || 0) / productMetrics.totalRevenue) * 100 : 0;
            
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={product.product?.id || index}>
                <Card size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong ellipsis={{ tooltip: product.product?.name }}>
                      {product.product?.name || 'Unknown Product'}
                    </Text>
                    <Progress 
                      percent={Math.min(100, share)} 
                      strokeColor={index === 0 ? '#52c41a' : '#1890ff'}
                    />
                    <Text strong style={{ color: '#cf1322' }}>
                      {enhancedSalesService.formatCurrency(metrics.totalRevenue || 0)}
                    </Text>
                    <Text type="secondary">
                      {enhancedSalesService.formatVolume(metrics.totalLiters || 0)}
                    </Text>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    );
  };

  const RevenueTrendsChart = () => {
    if (!salesTrends.dates || !salesTrends.series) {
      return (
        <Card>
          <Empty description="No sales trends data available" />
        </Card>
      );
    }

    return (
      <Card title="Revenue Trends Over Time" extra={<LineChartOutlined />}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
              <Text strong>Revenue Trends by Date</Text>
              <div style={{ marginTop: '10px' }}>
                {salesTrends.dates?.slice(0, 10).map((date, index) => (
                  <div key={date} style={{ 
                    marginBottom: '8px', 
                    padding: '8px', 
                    background: 'white', 
                    borderRadius: '4px',
                    border: '1px solid #f0f0f0'
                  }}>
                    <Space>
                      <CalendarOutlined />
                      <Text>{date}</Text>
                      <Text strong>
                        {enhancedSalesService.formatCurrency(
                          salesTrends.series?.[0]?.data?.[index] || 0
                        )}
                      </Text>
                    </Space>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  if (!userStationId) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <DashboardOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
          <Text type="secondary">
            Please select a station to view sales data
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <Title level={2} style={{ margin: 0 }}>
                <DashboardOutlined /> Sales Analytics Dashboard
              </Title>
              <Text type="secondary">
                Comprehensive sales analysis for {state.currentStation?.name}
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleExportData}
                  disabled={!salesData.length}
                >
                  Export
                </Button>
              </Col>
              <Col>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadData}
                  loading={loading}
                >
                  Refresh
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Total Revenue"
              value={stats.totalRevenue}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Total Volume"
              value={stats.totalLiters}
              precision={2}
              suffix="L"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Active Pumps"
              value={stats.uniquePumps}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Products Sold"
              value={stats.uniqueProducts}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Shifts Analyzed"
              value={stats.uniqueShifts}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Avg Price/L"
              value={stats.averagePrice}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search pumps, products..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Group By"
              value={filters.groupBy}
              onChange={(value) => handleFilterChange('groupBy', value)}
              allowClear
            >
              <Option value={GROUPING_TYPES.PRODUCT}>By Product</Option>
              <Option value={GROUPING_TYPES.SHIFT}>By Shift</Option>
              <Option value={GROUPING_TYPES.PRODUCT_SHIFT}>Product per Shift</Option>
              <Option value={GROUPING_TYPES.PUMP}>By Pump</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Period"
              value={filters.period}
              onChange={(value) => handleFilterChange('period', value)}
            >
              <Option value={PERIOD_TYPES.DAILY}>Daily</Option>
              <Option value={PERIOD_TYPES.WEEKLY}>Weekly</Option>
              <Option value={PERIOD_TYPES.MONTHLY}>Monthly</Option>
              <Option value={PERIOD_TYPES.QUARTERLY}>Quarterly</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
              onChange={handleDateRangeChange}
              format="YYYY-MM-DD"
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Space>
              <Button 
                icon={<FilterOutlined />}
                onClick={clearFilters}
                disabled={!filters.search && !filters.groupBy && !filters.startDate}
              >
                Clear Filters
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Content Tabs */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
        >
          <TabPane 
            tab={
              <span>
                <FireOutlined />
                Pump Sales
                {salesData.length > 0 && (
                  <Badge count={salesData.length} style={{ marginLeft: 8 }} />
                )}
              </span>
            } 
            key="pump-sales"
          >
            <Table
              columns={pumpSalesColumns}
              dataSource={salesData}
              loading={loading}
              rowKey="id"
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `Showing ${range[0]}-${range[1]} of ${total} sales records`,
                onChange: (page, pageSize) => {
                  setPagination(prev => ({ 
                    ...prev, 
                    page, 
                    limit: pageSize 
                  }));
                  handleFilterChange('page', page);
                  handleFilterChange('limit', pageSize);
                }
              }}
              scroll={{ x: 1500 }}
              size="middle"
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <ProductOutlined />
                Product Performance
                {productPerformance.length > 0 && (
                  <Badge count={productPerformance.length} style={{ marginLeft: 8 }} />
                )}
              </span>
            } 
            key="product-sales"
          >
            <Table
              columns={productPerformanceColumns}
              dataSource={productPerformance}
              loading={loading}
              rowKey={record => record.product?.id || record.id}
              pagination={false}
              scroll={{ x: 1200 }}
              size="middle"
            />
            
            <Divider />
            
            <ProductSalesChart />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <CalendarOutlined />
                Shift Performance
                {shiftPerformance.length > 0 && (
                  <Badge count={shiftPerformance.length} style={{ marginLeft: 8 }} />
                )}
              </span>
            } 
            key="shift-performance"
          >
            <Table
              columns={shiftPerformanceColumns}
              dataSource={shiftPerformance}
              loading={loading}
              rowKey={record => record.shift?.id || record.id}
              pagination={false}
              scroll={{ x: 1200 }}
              size="middle"
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                Analytics & Trends
              </span>
            } 
            key="sales-trends"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <ProductSalesChart />
              </Col>
              <Col xs={24} lg={12}>
                <RevenueTrendsChart />
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* View Details Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            Sales Record Details
          </Space>
        }
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingRecord(null);
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {viewingRecord ? (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Title level={4}>Pump Information</Title>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text strong>Pump Name:</Text>
                  <br />
                  <Text>{viewingRecord.pump?.asset?.name || viewingRecord.pump?.name || 'Unknown'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Connection Status:</Text>
                  <br />
                  <Tag color={viewingRecord.pump?.connectionStatus === 'FULLY_CONNECTED' ? 'green' : 'orange'}>
                    {viewingRecord.pump?.connectionStatus || 'UNKNOWN'}
                  </Tag>
                </Col>
              </Row>
            </Col>

            <Col span={24}>
              <Title level={4}>Product Information</Title>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text strong>Product Name:</Text>
                  <br />
                  <Text>{viewingRecord.product?.name || 'Unknown'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Fuel Code:</Text>
                  <br />
                  <Text>{viewingRecord.product?.fuelCode || 'N/A'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Unit Price:</Text>
                  <br />
                  <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
                    {enhancedSalesService.formatCurrency(viewingRecord.product?.minSellingPrice || 0)}/L
                  </Text>
                </Col>
              </Row>
            </Col>

            <Col span={24}>
              <Title level={4}>Sales Data</Title>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text strong>Total Revenue:</Text>
                  <br />
                  <Text strong style={{ color: '#cf1322', fontSize: '10px' }}>
                    {enhancedSalesService.formatCurrency(viewingRecord.salesData?.salesValue || 0)}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Liters Dispensed:</Text>
                  <br />
                  <Text style={{ fontSize: '16px' }}>
                    {enhancedSalesService.formatVolume(viewingRecord.salesData?.litersDispensed || 0)}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Unit Price:</Text>
                  <br />
                  <Text style={{ color: '#52c41a' }}>
                    {enhancedSalesService.formatCurrency(viewingRecord.salesData?.unitPrice || 0)}/L
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Meter Readings:</Text>
                  <br />
                  <Text>
                    {viewingRecord.salesData?.openingMeter || 0} → {viewingRecord.salesData?.closingMeter || 0}
                  </Text>
                </Col>
              </Row>
            </Col>

            <Col span={24}>
              <Title level={4}>Context Information</Title>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text strong>Shift:</Text>
                  <br />
                  <Text>{viewingRecord.shift?.shiftNumber || 'No Shift'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Station:</Text>
                  <br />
                  <Text>{viewingRecord.station?.name || 'Unknown'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Company:</Text>
                  <br />
                  <Text>{viewingRecord.company?.name || 'Unknown'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Calculated At:</Text>
                  <br />
                  <Text>{enhancedSalesService.formatDate(viewingRecord.salesData?.calculatedAt)}</Text>
                </Col>
              </Row>
            </Col>
          </Row>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Text type="secondary">Loading record details...</Text>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PumpSalesManagement;