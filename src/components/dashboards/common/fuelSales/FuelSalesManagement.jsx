// src/components/fuelSales/FuelSalesManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Tabs,
  Row,
  Col,
  Select,
  Button,
  DatePicker,
  Space,
  Statistic,
  Table,
  Alert,
  Spin,
  Typography,
  Tag,
  Badge,
  Divider,
  Input,
  Radio,
  Checkbox,
  Form,
  Tooltip,
  Empty,
  message,
  Modal
} from 'antd';
import {
  BarChartOutlined,
  ShopOutlined,
  ProductOutlined,
  LineChartOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  CalendarOutlined,
  DollarOutlined,
  FireOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApp } from '../../../../context/AppContext';
import FuelSalesService from '../../../../services/fuelSalesService/fuelSalesService';
import { 
  fuelSalesFilters, 
  fuelSalesCalculations, 
  fuelSalesFormatters 
} from '../../../../services/fuelSalesService/fuelSalesService';
import { operationsService } from '../../../../services/operationService/operationService';
import { fuelService } from '../../../../services/fuelService/fuelService';
import { stationService } from '../../../../services/stationService/stationService';
import AdvancedReportGenerator from '../downloadable/AdvancedReportGenerator';
import ReportGenerator from '../downloadable/ReportGenerator';
import './FuelSalesManagement.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const FuelSalesManagement = () => {
  const { state } = useApp();
  const userStationId = state.currentStation?.id;
  const currentUser = state.currentUser;
  const [form] = Form.useForm();

  // State for all tabs
  const [activeTab, setActiveTab] = useState('shift');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  // State for dropdowns
  const [shifts, setShifts] = useState([]);
  const [products, setProducts] = useState([]);
  const [stations, setStations] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // State for filters
  const [filters, setFilters] = useState({
    // Shift Sales
    shiftId: null,
    shiftGroupBy: 'product',
    shiftIncludeDetails: false,
    shiftIncludePercentages: true,

    // Station Sales
    stationId: userStationId,
    stationGroupBy: 'day',
    stationProductId: null,
    stationIncludePumpPerformance: false,
    stationIncludeProductMix: true,

    // Product Sales
    productId: null,
    productStationId: userStationId,
    productGroupBy: 'day',
    productIncludeStationBreakdown: false,
    productIncludeTrendAnalysis: true,

    // Performance
    performanceType: 'products', // products, stations, companies
    performanceRankingBy: 'revenue',
    performanceIncludeMetrics: true,
    performanceLimit: 10,

    // Common
    startDate: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    page: 1,
    limit: 20
  });

  // Modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Load dropdown data on mount
  useEffect(() => {
    loadDropdownData();
  }, [userStationId]);

  // Debug: Check data structure
  useEffect(() => {
    if (data) {
      console.log('📊 Current data structure:', {
        data: data.data,
        summary: data.summary,
        meta: data.meta,
        tableData: data.tableData,
        formatted: data.formatted
      });
    }
  }, [data]);

  const loadDropdownData = async () => {
    setLoadingDropdowns(true);
    try {
      const promises = [];

      // Load shifts if user has station
      if (userStationId) {
        promises.push(
          operationsService.getShifts({
            stationId: userStationId,
            limit: 100,
            status: 'CLOSED'
          }).then(shiftsData => {
            const shiftsArray = Array.isArray(shiftsData) ? shiftsData : (shiftsData?.shifts || []);
            setShifts(shiftsArray);
            return shiftsArray;
          })
        );
      }

      // Load products
      promises.push(
        fuelService.getFuelProducts().then(productsData => {
          let productsArray = [];
          if (productsData?.data && Array.isArray(productsData.data)) {
            productsArray = productsData.data;
          } else if (Array.isArray(productsData)) {
            productsArray = productsData;
          } else if (productsData?.products && Array.isArray(productsData.products)) {
            productsArray = productsData.products;
          }
          setProducts(productsArray);
          return productsArray;
        })
      );

      // Load stations for admins
      if (currentUser?.isSuperAdmin || currentUser?.isCompanyAdmin) {
        promises.push(
          stationService.getCompanyStations().then(stationsData => {
            const stationsArray = Array.isArray(stationsData) ? stationsData : [];
            setStations(stationsArray);
            return stationsArray;
          })
        );
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to load dropdown data:', error);
      message.error('Failed to load dropdown data');
    } finally {
      setLoadingDropdowns(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page on filter change
    }));
  };

  // Handle date range change
  const handleDateRangeChange = (dates, dateStrings) => {
    if (dates) {
      handleFilterChange('startDate', dateStrings[0]);
      handleFilterChange('endDate', dateStrings[1]);
    }
  };

  // Fetch data based on active tab
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      let result;
      const commonFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: filters.page,
        limit: filters.limit
      };

      console.log(`📡 Fetching ${activeTab} sales data with filters:`, commonFilters);

      switch (activeTab) {
        case 'shift':
          if (!filters.shiftId) {
            throw new Error('Please select a shift');
          }
          result = await FuelSalesService.getShiftSales(filters.shiftId, {
            ...commonFilters,
            groupBy: filters.shiftGroupBy,
            includeDetails: filters.shiftIncludeDetails,
            includePercentages: filters.shiftIncludePercentages
          });
          break;

        case 'station':
          if (!filters.stationId) {
            throw new Error('Station ID is required');
          }
          result = await FuelSalesService.getStationSales(filters.stationId, {
            ...commonFilters,
            groupBy: filters.stationGroupBy,
            productId: filters.stationProductId,
            includePumpPerformance: filters.stationIncludePumpPerformance,
            includeProductMix: filters.stationIncludeProductMix
          });
          break;

        case 'product':
          if (!filters.productId) {
            throw new Error('Please select a product');
          }
          result = await FuelSalesService.getProductSales(filters.productId, {
            ...commonFilters,
            stationId: filters.productStationId,
            groupBy: filters.productGroupBy,
            includeStationBreakdown: filters.productIncludeStationBreakdown,
            includeTrendAnalysis: filters.productIncludeTrendAnalysis
          });
          break;

        case 'performance':
          switch (filters.performanceType) {
            case 'products':
              result = await FuelSalesService.getProductPerformance({
                ...commonFilters,
                rankingBy: filters.performanceRankingBy,
                limit: filters.performanceLimit,
                includeMetrics: filters.performanceIncludeMetrics
              });
              break;
            case 'stations':
              result = await FuelSalesService.getStationPerformance({
                ...commonFilters,
                rankingBy: filters.performanceRankingBy,
                limit: filters.performanceLimit,
                stationIds: userStationId ? [userStationId] : []
              });
              break;
            case 'companies':
              if (!currentUser?.isSuperAdmin) {
                throw new Error('Only super admins can access company performance');
              }
              result = await FuelSalesService.getCompanyPerformance({
                ...commonFilters,
                rankingBy: filters.performanceRankingBy,
                limit: filters.performanceLimit
              });
              break;
          }
          break;

        default:
          throw new Error('Invalid tab selection');
      }

      console.log(`✅ ${activeTab} sales result:`, result);

      // Extract table data from the result
      const extractedTableData = result?.tableData || result?.data || [];
      
      setData(result);
      setSummary(result?.summary || null);
      setMeta(result?.meta || null);
      setTableData(extractedTableData);

      if (extractedTableData.length === 0) {
        message.info('No data found for the selected filters');
      }
    } catch (error) {
      console.error(`❌ Failed to fetch ${activeTab} sales data:`, error);
      setError(error.message || 'Failed to fetch data');
      setData(null);
      setSummary(null);
      setMeta(null);
      setTableData([]);
      message.error(error.message || 'Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when filters change
  useEffect(() => {
    const shouldFetch = 
      (activeTab === 'shift' && filters.shiftId) ||
      (activeTab === 'station' && filters.stationId) ||
      (activeTab === 'product' && filters.productId) ||
      (activeTab === 'performance');

    if (shouldFetch) {
      const timeoutId = setTimeout(() => {
        fetchData();
      }, 300); // Debounce for better UX

      return () => clearTimeout(timeoutId);
    }
  }, [filters, activeTab]);

  // Handle tab change
  const handleTabChange = (key) => {
    setActiveTab(key);
    setData(null);
    setSummary(null);
    setMeta(null);
    setTableData([]);
    setError(null);
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'Ksh 0.00';
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format volume
  const formatVolume = (liters) => {
    if (liters === null || liters === undefined) return '0 L';
    if (liters >= 1000) {
      return `${(liters / 1000).toFixed(1)}k L`;
    }
    return `${liters.toFixed(1)} L`;
  };

  // Format percentage
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '0%';
    return `${value.toFixed(1)}%`;
  };

  // Show item details modal
  const showItemDetails = (item) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
  };

  // Render summary cards
  const renderSummaryCards = () => {
    if (!summary) return null;

    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Total Liters"
              value={summary.totalLiters || 0}
              precision={1}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FireOutlined />}
              suffix="L"
            />
            <Text type="secondary">{formatVolume(summary.totalLiters)}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Total Revenue"
              value={summary.totalRevenue || 0}
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<DollarOutlined />}
            />
            <Text type="secondary">{formatCurrency(summary.totalRevenue)}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Avg Unit Price"
              value={summary.avgUnitPrice || 0}
              precision={2}
              valueStyle={{ color: '#fa8c16' }}
            />
            <Text type="secondary">{formatCurrency(summary.avgUnitPrice)}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Transactions"
              value={summary.totalTransactions || 0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<BarChartOutlined />}
            />
            <Text type="secondary">Total count</Text>
          </Card>
        </Col>
      </Row>
    );
  };

  // Get columns based on active tab
  const getColumns = () => {
    const baseColumns = [
      {
        title: 'Period',
        dataIndex: 'period',
        key: 'period',
        width: 120,
        render: (value) => value || 'N/A',
        sorter: (a, b) => (a.period || '').localeCompare(b.period || '')
      },
      {
        title: 'Product/Item',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        render: (value, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{value || record.productName || 'N/A'}</Text>
            {record.productCode && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.productCode}
              </Text>
            )}
          </Space>
        )
      },
      {
        title: 'Liters',
        dataIndex: 'totalLiters',
        key: 'liters',
        width: 100,
        render: (value) => formatVolume(value),
        sorter: (a, b) => (a.totalLiters || 0) - (b.totalLiters || 0)
      },
      {
        title: 'Revenue',
        dataIndex: 'totalRevenue',
        key: 'revenue',
        width: 120,
        render: (value) => formatCurrency(value),
        sorter: (a, b) => (a.totalRevenue || 0) - (b.totalRevenue || 0)
      },
      {
        title: 'Unit Price',
        dataIndex: 'avgUnitPrice',
        key: 'unitPrice',
        width: 100,
        render: (value) => formatCurrency(value),
        sorter: (a, b) => (a.avgUnitPrice || 0) - (b.avgUnitPrice || 0)
      },
      {
        title: 'Transactions',
        dataIndex: 'transactionCount',
        key: 'transactions',
        width: 100,
        render: (value) => value || 0,
        sorter: (a, b) => (a.transactionCount || 0) - (b.transactionCount || 0)
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 80,
        fixed: 'right',
        render: (_, record) => (
          <Tooltip title="View Details">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => showItemDetails(record)}
              size="small"
            />
          </Tooltip>
        )
      }
    ];

    switch (activeTab) {
      case 'shift':
        if (filters.shiftGroupBy === 'product') {
          return [
            ...baseColumns.filter(col => col.key !== 'period'),
            {
              title: 'Percentage',
              dataIndex: 'percentage',
              key: 'percentage',
              width: 100,
              render: (value) => value ? `${value.toFixed(1)}%` : '-',
              sorter: (a, b) => (a.percentage || 0) - (b.percentage || 0)
            }
          ];
        } else if (filters.shiftGroupBy === 'pump') {
          return [
            {
              title: 'Pump',
              dataIndex: 'name',
              key: 'pump',
              width: 120
            },
            {
              title: 'Island',
              dataIndex: 'islandCode',
              key: 'island',
              width: 80
            },
            ...baseColumns.filter(col => !['period', 'name'].includes(col.key))
          ];
        }
        break;

      case 'station':
        if (filters.stationGroupBy === 'product') {
          return [
            ...baseColumns.filter(col => col.key !== 'period'),
            {
              title: 'Mix %',
              dataIndex: 'percentage',
              key: 'percentage',
              width: 100,
              render: (value) => value ? `${value.toFixed(1)}%` : '-',
              sorter: (a, b) => (a.percentage || 0) - (b.percentage || 0)
            }
          ];
        } else if (filters.stationGroupBy === 'shift') {
          return [
            {
              title: 'Shift',
              dataIndex: 'shiftNumber',
              key: 'shift',
              width: 80
            },
            {
              title: 'Supervisor',
              dataIndex: 'supervisor',
              key: 'supervisor',
              width: 120
            },
            ...baseColumns.filter(col => col.key !== 'name')
          ];
        }
        break;

      case 'product':
        return baseColumns;

      case 'performance':
        if (filters.performanceType === 'products') {
          return [
            {
              title: 'Rank',
              dataIndex: 'rank',
              key: 'rank',
              width: 60,
              render: (value) => (
                <Badge
                  count={value}
                  style={{
                    backgroundColor: value <= 3 ? 
                      value === 1 ? '#f5222d' : 
                      value === 2 ? '#fa8c16' : 
                      '#52c41a' : '#d9d9d9'
                  }}
                />
              ),
              sorter: (a, b) => (a.rank || 0) - (b.rank || 0)
            },
            ...baseColumns.filter(col => col.key !== 'period'),
            {
              title: 'Market Share',
              dataIndex: 'marketShare',
              key: 'marketShare',
              width: 100,
              render: (value) => formatPercentage(value),
              sorter: (a, b) => (a.marketShare || 0) - (b.marketShare || 0)
            }
          ];
        } else if (filters.performanceType === 'stations') {
          return [
            {
              title: 'Rank',
              dataIndex: 'rank',
              key: 'rank',
              width: 60,
              sorter: (a, b) => (a.rank || 0) - (b.rank || 0)
            },
            ...baseColumns.filter(col => col.key !== 'period'),
            {
              title: 'Efficiency',
              dataIndex: 'efficiency',
              key: 'efficiency',
              width: 100,
              render: (value) => formatCurrency(value),
              sorter: (a, b) => (a.efficiency || 0) - (b.efficiency || 0),
              tooltip: 'Revenue per transaction'
            }
          ];
        } else if (filters.performanceType === 'companies') {
          return [
            {
              title: 'Rank',
              dataIndex: 'rank',
              key: 'rank',
              width: 60,
              sorter: (a, b) => (a.rank || 0) - (b.rank || 0)
            },
            {
              title: 'Company',
              dataIndex: 'name',
              key: 'company',
              width: 150
            },
            ...baseColumns.filter(col => !['period', 'name'].includes(col.key))
          ];
        }
        break;
    }

    return baseColumns;
  };

  // Render filter controls based on active tab
  const renderFilterControls = () => {
    const commonFilters = (
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Form.Item label="Date Range" style={{ marginBottom: 0 }}>
            <RangePicker
              value={[dayjs(filters.startDate), dayjs(filters.endDate)]}
              onChange={handleDateRangeChange}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item label="View Mode" style={{ marginBottom: 0 }}>
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="table">
                <BarChartOutlined /> Table
              </Radio.Button>
              <Radio.Button value="cards">
                <ShopOutlined /> Cards
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item label="Items per page" style={{ marginBottom: 0 }}>
            <Select
              value={filters.limit}
              onChange={(value) => handleFilterChange('limit', value)}
              style={{ width: '100%' }}
            >
              <Option value={10}>10 items</Option>
              <Option value={20}>20 items</Option>
              <Option value={50}>50 items</Option>
              <Option value={100}>100 items</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    );

    switch (activeTab) {
      case 'shift':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Select Shift" required style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.shiftId}
                    onChange={(value) => handleFilterChange('shiftId', value)}
                    placeholder="Select a shift"
                    loading={loadingDropdowns}
                    showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ width: '100%' }}
                    notFoundContent={
                      <div style={{ padding: 8, textAlign: 'center' }}>
                        <Spin size="small" /> Loading shifts...
                      </div>
                    }
                  >
                    {shifts.map(shift => (
                      <Option key={shift.id} value={shift.id}>
                        <Space direction="vertical" size={0}>
                          <Text strong>Shift {shift.shiftNumber}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(shift.startTime).format('DD/MM/YYYY HH:mm')}
                          </Text>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Group By" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.shiftGroupBy}
                    onChange={(value) => handleFilterChange('shiftGroupBy', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="product">By Product</Option>
                    <Option value="pump">By Pump</Option>
                    <Option value="island">By Island</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Options" style={{ marginBottom: 0 }}>
                  <Space direction="vertical" size={0}>
                    <Checkbox
                      checked={filters.shiftIncludeDetails}
                      onChange={(e) => handleFilterChange('shiftIncludeDetails', e.target.checked)}
                    >
                      Show Details
                    </Checkbox>
                    <Checkbox
                      checked={filters.shiftIncludePercentages}
                      onChange={(e) => handleFilterChange('shiftIncludePercentages', e.target.checked)}
                    >
                      Show Percentages
                    </Checkbox>
                  </Space>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button
                  type="primary"
                  onClick={fetchData}
                  loading={loading}
                  icon={<ReloadOutlined />}
                  style={{ width: '100%', marginTop: 24 }}
                >
                  Load Data
                </Button>
              </Col>
            </Row>
            {commonFilters}
          </>
        );

      case 'station':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Station" style={{ marginBottom: 0 }}>
                  <Input
                    value={state.currentStation?.name || 'Current Station'}
                    disabled
                    style={{ width: '100%' }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Station ID: {userStationId}
                  </Text>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Group By" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.stationGroupBy}
                    onChange={(value) => handleFilterChange('stationGroupBy', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="day">By Day</Option>
                    <Option value="product">By Product</Option>
                    <Option value="shift">By Shift</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Filter by Product" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.stationProductId}
                    onChange={(value) => handleFilterChange('stationProductId', value)}
                    allowClear
                    placeholder="All Products"
                    style={{ width: '100%' }}
                  >
                    {products.map(product => (
                      <Option key={product.id} value={product.id}>
                        {product.name} {product.fuelCode ? `(${product.fuelCode})` : ''}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Options" style={{ marginBottom: 0 }}>
                  <Space direction="vertical" size={0}>
                    <Checkbox
                      checked={filters.stationIncludeProductMix}
                      onChange={(e) => handleFilterChange('stationIncludeProductMix', e.target.checked)}
                    >
                      Show Product Mix
                    </Checkbox>
                    <Checkbox
                      checked={filters.stationIncludePumpPerformance}
                      onChange={(e) => handleFilterChange('stationIncludePumpPerformance', e.target.checked)}
                    >
                      Show Pump Performance
                    </Checkbox>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
            {commonFilters}
          </>
        );

      case 'product':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Select Product" required style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.productId}
                    onChange={(value) => handleFilterChange('productId', value)}
                    placeholder="Select a product"
                    loading={loadingDropdowns}
                    showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ width: '100%' }}
                  >
                    {products.map(product => (
                      <Option key={product.id} value={product.id}>
                        <Space direction="vertical" size={0}>
                          <Text strong>{product.name}</Text>
                          {product.fuelCode && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Code: {product.fuelCode}
                            </Text>
                          )}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Group By" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.productGroupBy}
                    onChange={(value) => handleFilterChange('productGroupBy', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="day">By Day</Option>
                    <Option value="shift">By Shift</Option>
                    <Option value="station">By Station</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Filter by Station" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.productStationId}
                    onChange={(value) => handleFilterChange('productStationId', value)}
                    allowClear
                    placeholder="All Stations"
                    style={{ width: '100%' }}
                    disabled={!currentUser?.isSuperAdmin && !currentUser?.isCompanyAdmin}
                  >
                    {stations.map(station => (
                      <Option key={station.id} value={station.id}>
                        {station.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Analysis Options" style={{ marginBottom: 0 }}>
                  <Space direction="vertical" size={0}>
                    <Checkbox
                      checked={filters.productIncludeStationBreakdown}
                      onChange={(e) => handleFilterChange('productIncludeStationBreakdown', e.target.checked)}
                    >
                      Station Breakdown
                    </Checkbox>
                    <Checkbox
                      checked={filters.productIncludeTrendAnalysis}
                      onChange={(e) => handleFilterChange('productIncludeTrendAnalysis', e.target.checked)}
                    >
                      Trend Analysis
                    </Checkbox>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
            {commonFilters}
          </>
        );

      case 'performance':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Performance Type" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.performanceType}
                    onChange={(value) => handleFilterChange('performanceType', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="products">Product Performance</Option>
                    <Option value="stations">Station Performance</Option>
                    {currentUser?.isSuperAdmin && (
                      <Option value="companies">Company Performance</Option>
                    )}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Rank By" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.performanceRankingBy}
                    onChange={(value) => handleFilterChange('performanceRankingBy', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="revenue">Revenue</Option>
                    <Option value="liters">Liters Sold</Option>
                    <Option value="growth">Growth</Option>
                    {filters.performanceType === 'stations' && (
                      <Option value="efficiency">Efficiency</Option>
                    )}
                    {filters.performanceType === 'companies' && (
                      <Option value="stationCount">Station Count</Option>
                    )}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Top N Results" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.performanceLimit}
                    onChange={(value) => handleFilterChange('performanceLimit', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value={5}>Top 5</Option>
                    <Option value={10}>Top 10</Option>
                    <Option value={20}>Top 20</Option>
                    <Option value={50}>Top 50</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Options" style={{ marginBottom: 0 }}>
                  <Space direction="vertical" size={0}>
                    <Checkbox
                      checked={filters.performanceIncludeMetrics}
                      onChange={(e) => handleFilterChange('performanceIncludeMetrics', e.target.checked)}
                    >
                      Show Detailed Metrics
                    </Checkbox>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
            {commonFilters}
          </>
        );

      default:
        return commonFilters;
    }
  };

  // Render export button
  const renderExportButton = () => {
    const columns = getColumns();
    const exportData = tableData || [];

    if (!exportData || exportData.length === 0) {
      return (
        <Button icon={<DownloadOutlined />} disabled>
          Export
        </Button>
      );
    }

    const exportTitle = `${activeTab.toUpperCase()} Sales Report - ${filters.startDate} to ${filters.endDate}`;
    const fileName = `fuel_sales_${activeTab}_${filters.startDate}_to_${filters.endDate}`;

    return (
      <AdvancedReportGenerator
        dataSource={exportData}
        columns={columns}
        title={exportTitle}
        fileName={fileName}
        showFooter={true}
        footerText={`Generated from Energy ERP System - ${new Date().toLocaleString()}`}
      />
    );
  };

  // Render data cards view
  const renderDataCards = () => {
    if (!tableData || tableData.length === 0) return null;

    return (
      <Row gutter={[16, 16]}>
        {tableData.slice(0, filters.limit).map((item, index) => (
          <Col xs={24} sm={12} md={8} lg={6} key={item.id || index}>
            <Card
              hoverable
              size="small"
              title={
                <Space>
                  <Text strong>{item.name || item.productName || `Item ${index + 1}`}</Text>
                  {item.rank && (
                    <Badge count={item.rank} style={{ backgroundColor: '#52c41a' }} />
                  )}
                </Space>
              }
              extra={
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => showItemDetails(item)}
                  size="small"
                />
              }
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {item.period && (
                  <div>
                    <Text type="secondary">Period: </Text>
                    <Text strong>{item.period}</Text>
                  </div>
                )}
                <div>
                  <Text type="secondary">Liters: </Text>
                  <Text strong style={{ color: '#1890ff' }}>
                    {formatVolume(item.totalLiters)}
                  </Text>
                </div>
                <div>
                  <Text type="secondary">Revenue: </Text>
                  <Text strong style={{ color: '#52c41a' }}>
                    {formatCurrency(item.totalRevenue)}
                  </Text>
                </div>
                <div>
                  <Text type="secondary">Unit Price: </Text>
                  <Text strong>{formatCurrency(item.avgUnitPrice)}</Text>
                </div>
                {item.transactionCount !== undefined && (
                  <div>
                    <Text type="secondary">Transactions: </Text>
                    <Text strong>{item.transactionCount}</Text>
                  </div>
                )}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  // Render data table view
  const renderDataTable = () => {
    if (!tableData || tableData.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Paragraph>No sales data found</Paragraph>
              <Text type="secondary">
                Try adjusting your filters or select different criteria
              </Text>
            </div>
          }
        />
      );
    }

    const columns = getColumns();

    return (
      <Table
        columns={columns}
        dataSource={tableData}
        rowKey={(record) => record.id || record.rank || Math.random()}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          total: data?.pagination?.total || tableData.length,
          onChange: (page, pageSize) => {
            handleFilterChange('page', page);
            handleFilterChange('limit', pageSize);
          },
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} items`
        }}
        size="middle"
        scroll={{ x: 'max-content' }}
        loading={loading}
        bordered
      />
    );
  };

  // Detail modal
  const renderDetailModal = () => (
    <Modal
      title="Sales Item Details"
      open={detailModalVisible}
      onCancel={() => setDetailModalVisible(false)}
      footer={null}
      width={600}
    >
      {selectedItem && (
        <div>
          <Descriptions bordered column={1} size="small">
            {selectedItem.name && (
              <Descriptions.Item label="Name">
                <Text strong>{selectedItem.name}</Text>
              </Descriptions.Item>
            )}
            {selectedItem.productName && (
              <Descriptions.Item label="Product">
                <Text strong>{selectedItem.productName}</Text>
                {selectedItem.productCode && (
                  <div>
                    <Text type="secondary">Code: {selectedItem.productCode}</Text>
                  </div>
                )}
              </Descriptions.Item>
            )}
            {selectedItem.period && (
              <Descriptions.Item label="Period">
                {selectedItem.period}
              </Descriptions.Item>
            )}
            {selectedItem.totalLiters !== undefined && (
              <Descriptions.Item label="Liters">
                <Text strong style={{ color: '#1890ff' }}>
                  {formatVolume(selectedItem.totalLiters)}
                </Text>
              </Descriptions.Item>
            )}
            {selectedItem.totalRevenue !== undefined && (
              <Descriptions.Item label="Revenue">
                <Text strong style={{ color: '#52c41a' }}>
                  {formatCurrency(selectedItem.totalRevenue)}
                </Text>
              </Descriptions.Item>
            )}
            {selectedItem.avgUnitPrice !== undefined && (
              <Descriptions.Item label="Unit Price">
                {formatCurrency(selectedItem.avgUnitPrice)}
              </Descriptions.Item>
            )}
            {selectedItem.transactionCount !== undefined && (
              <Descriptions.Item label="Transactions">
                {selectedItem.transactionCount}
              </Descriptions.Item>
            )}
            {selectedItem.percentage !== undefined && (
              <Descriptions.Item label="Percentage">
                {formatPercentage(selectedItem.percentage)}
              </Descriptions.Item>
            )}
            {selectedItem.marketShare !== undefined && (
              <Descriptions.Item label="Market Share">
                {formatPercentage(selectedItem.marketShare)}
              </Descriptions.Item>
            )}
            {selectedItem.rank !== undefined && (
              <Descriptions.Item label="Rank">
                <Badge count={selectedItem.rank} style={{ backgroundColor: '#52c41a' }} />
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>
      )}
    </Modal>
  );

  // Render loading state
  if (loading && !data) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading sales data...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="fuel-sales-management">
      <Card style={{ margin: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            <FireOutlined /> Fuel Sales Management
          </Title>
          <Text type="secondary">
            Analyze and manage fuel sales across shifts, stations, and products
          </Text>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          tabBarExtraContent={
            <Space style={{ marginRight: 8 }}>
              <Tooltip title="Refresh Data">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchData}
                  loading={loading}
                  type="text"
                />
              </Tooltip>
              {renderExportButton()}
            </Space>
          }
        >
          <TabPane
            tab={
              <span>
                <ClockCircleOutlined />
                Shift Sales
              </span>
            }
            key="shift"
          >
            <Card
              title={
                <Space>
                  <FilterOutlined />
                  <span>Filters</span>
                </Space>
              }
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Form form={form} layout="vertical">
                {renderFilterControls()}
              </Form>
            </Card>

            {error && (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
                action={
                  <Button size="small" type="text" onClick={() => setError(null)}>
                    Dismiss
                  </Button>
                }
              />
            )}

            {renderSummaryCards()}

            <Card
              title="Sales Data"
              extra={
                <Text type="secondary">
                  Showing {tableData.length} items
                  {data?.pagination?.total && ` of ${data.pagination.total}`}
                </Text>
              }
            >
              {viewMode === 'table' ? renderDataTable() : renderDataCards()}
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <ShopOutlined />
                Station Sales
              </span>
            }
            key="station"
          >
            <Card
              title={
                <Space>
                  <FilterOutlined />
                  <span>Filters</span>
                </Space>
              }
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Form form={form} layout="vertical">
                {renderFilterControls()}
              </Form>
            </Card>

            {error && (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            {renderSummaryCards()}

            <Card title="Station Sales Data">
              {viewMode === 'table' ? renderDataTable() : renderDataCards()}
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <ProductOutlined />
                Product Sales
              </span>
            }
            key="product"
          >
            <Card
              title={
                <Space>
                  <FilterOutlined />
                  <span>Filters</span>
                </Space>
              }
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Form form={form} layout="vertical">
                {renderFilterControls()}
              </Form>
            </Card>

            {error && (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            {renderSummaryCards()}

            <Card title="Product Sales Data">
              {viewMode === 'table' ? renderDataTable() : renderDataCards()}
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <TrophyOutlined />
                Performance
              </span>
            }
            key="performance"
          >
            <Card
              title={
                <Space>
                  <FilterOutlined />
                  <span>Filters</span>
                </Space>
              }
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Form form={form} layout="vertical">
                {renderFilterControls()}
              </Form>
            </Card>

            {error && (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            {renderSummaryCards()}

            <Card
              title={`${filters.performanceType.toUpperCase()} Performance Ranking`}
            >
              {viewMode === 'table' ? renderDataTable() : renderDataCards()}
            </Card>
          </TabPane>
        </Tabs>

        {meta && (
          <div style={{ marginTop: 24, padding: 16, backgroundColor: '#fafafa', borderRadius: 4 }}>
            <Text type="secondary">
              Report Type: {meta.reportType || 'N/A'} | 
              Group By: {meta.groupBy || 'N/A'} | 
              Generated: {meta.generatedAt ? new Date(meta.generatedAt).toLocaleString() : 'N/A'} | 
              Data Source: {meta.dataSource || 'N/A'}
              {meta.executionTime && ` | Execution: ${meta.executionTime}ms`}
            </Text>
          </div>
        )}
      </Card>

      {renderDetailModal()}
    </div>
  );
};

export default FuelSalesManagement;