// src/components/analytics/fuel/StationFuelSales.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Typography,
  Tag,
  Badge,
  Radio,
  Checkbox,
  Form,
  Empty,
  message,
  Segmented,
  Tooltip,
  Progress,
  Modal,
  Input
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
  DashboardOutlined,
  AreaChartOutlined,
  RocketOutlined,
  HistoryOutlined,
  UserOutlined,
  BuildOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  ExportOutlined,
  TrophyOutlined,
  TeamOutlined,
  SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApp } from '../../../../context/AppContext';
import { 
  StationAnalyticsService,
  fuelAnalyticsUtils 
} from '../../../../services/fuelSalesService/FuelAnalyticsService';
import { fuelService } from '../../../../services/fuelService/fuelService';
import AdvancedReportGenerator from '../downloadable/AdvancedReportGenerator';
import './FuelSalesManagement.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ROLE = {
  STATION_MANAGER: 'STATION_MANAGER',
  SUPERVISOR: 'SUPERVISOR'
};

const TABS = {
  dashboard: {
    key: 'dashboard',
    label: 'Station Dashboard',
    icon: <DashboardOutlined />,
    description: 'Station overview and metrics',
    allowedRoles: [ROLE.STATION_MANAGER, ROLE.SUPERVISOR]
  },
  trends: {
    key: 'trends',
    label: 'Station Trends',
    icon: <AreaChartOutlined />,
    description: 'Time-based analysis for station',
    allowedRoles: [ROLE.STATION_MANAGER, ROLE.SUPERVISOR]
  },
  pump_performance: {
    key: 'pump_performance',
    label: 'Pump Performance',
    icon: <RocketOutlined />,
    description: 'Pump ranking and efficiency',
    allowedRoles: [ROLE.STATION_MANAGER, ROLE.SUPERVISOR]
  },
  products: {
    key: 'products',
    label: 'Products Overview',
    icon: <ProductOutlined />,
    description: 'Product performance at station',
    allowedRoles: [ROLE.STATION_MANAGER, ROLE.SUPERVISOR]
  },
  shifts: {
    key: 'shifts',
    label: 'Shifts Overview',
    icon: <HistoryOutlined />,
    description: 'Shift performance and history',
    allowedRoles: [ROLE.STATION_MANAGER, ROLE.SUPERVISOR]
  },
  quick_access: {
    key: 'quick_access',
    label: 'Quick Access',
    icon: <ClockCircleOutlined />,
    description: 'Today, yesterday, week, month views',
    allowedRoles: [ROLE.STATION_MANAGER, ROLE.SUPERVISOR]
  },
  real_time: {
    key: 'real_time',
    label: 'Real-Time',
    icon: <BuildOutlined />,
    description: 'Live sales data',
    allowedRoles: [ROLE.STATION_MANAGER, ROLE.SUPERVISOR]
  },
  export: {
    key: 'export',
    label: 'Export',
    icon: <ExportOutlined />,
    description: 'Export analytics data',
    allowedRoles: [ROLE.STATION_MANAGER]
  }
};

const StationFuelSales = () => {
  const { state } = useApp();
  const [form] = Form.useForm();
  
  // Memoize app state
  const currentUser = useMemo(() => state.currentUser, [state.currentUser]);
  const currentStation = useMemo(() => state.currentStation, [state.currentStation]);
  const userRole = useMemo(() => currentUser?.role, [currentUser]);
  const isStationManager = useMemo(() => userRole === ROLE.STATION_MANAGER, [userRole]);
  const isSupervisor = useMemo(() => userRole === ROLE.SUPERVISOR, [userRole]);
  
  // Refs to prevent infinite loops
  const initializedRef = useRef(false);
  const fetchTimeoutRef = useRef(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  
  // Data State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  
  // Dropdown Data
  const [products, setProducts] = useState([]);
  
  // Filters State
  const [filters, setFilters] = useState({
    stationId: null,
    productId: null,
    groupBy: 'product',
    metric: 'revenue',
    period: 'daily',
    granularity: 'day',
    rankingMetric: 'liters',
    includeDetails: false,
    includeForecast: false,
    startDate: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    shiftStatus: 'CLOSED',
    readingType: 'END',
    quickAccessType: 'today',
    lastHours: 24,
    updateInterval: 60,
    page: 1,
    limit: 20,
    sortBy: 'totalLiters',
    sortOrder: 'desc',
    minLiters: null,
    maxLiters: null
  });

  // ========== INITIALIZATION ==========
  useEffect(() => {
    if (initializedRef.current) return;
    
    const init = async () => {
      try {
        if (!currentStation?.id) {
          message.error('No station assigned to your account');
          return;
        }
        
        setLoadingDropdowns(true);
        initializedRef.current = true;
        
        // Set current station as filter
        setFilters(prev => ({ ...prev, stationId: currentStation.id }));
        
        // Load products for station
        await loadProducts();
      } catch (error) {
        console.error('Failed to initialize:', error);
        message.error('Failed to initialize station analytics');
        initializedRef.current = false;
      } finally {
        setLoadingDropdowns(false);
      }
    };
    
    init();
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [currentStation]);

  // ========== DATA LOADING ==========
  const loadProducts = async () => {
    try {
      const response = await fuelService.getFuelProducts();
      const productsArray = Array.isArray(response) ? response : 
                           response.success && Array.isArray(response.data) ? response.data : [];
      
      setProducts(productsArray);
    } catch (error) {
      console.error('Failed to load products:', error);
      throw error;
    }
  };

  // ========== FILTER HANDLERS ==========
  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value, page: 1 };
      
      // Handle dependent loads
      if (key === 'productId' && value === null) {
        // Reset related filters when product is cleared
        newFilters.minLiters = null;
        newFilters.maxLiters = null;
      }
      
      return newFilters;
    });
  };

  const handleDateRangeChange = (dates, dateStrings) => {
    if (dates) {
      setFilters(prev => ({
        ...prev,
        startDate: dateStrings[0],
        endDate: dateStrings[1],
        page: 1
      }));
    }
  };

  // ========== DATA FETCHING ==========
  const fetchAnalyticsData = async () => {
    if (!filters.stationId) {
      message.error('No station assigned to your account');
      return;
    }
    
    // Validate filters
    const validation = fuelAnalyticsUtils.validateDateRange(filters.startDate, filters.endDate);
    if (!validation.isValid) {
      message.error(validation.error);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let result;
      
      switch (activeTab) {
        case 'dashboard':
          result = await StationAnalyticsService.getDashboard(filters.stationId, {
            startDate: filters.startDate,
            endDate: filters.endDate,
            productIds: filters.productId ? [filters.productId] : undefined,
            shiftStatus: filters.shiftStatus,
            readingType: filters.readingType,
            page: filters.page,
            limit: filters.limit,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
            groupBy: filters.groupBy,
            includeDetails: filters.includeDetails,
            includeForecast: filters.includeForecast
          });
          break;
          
        case 'trends':
          result = await StationAnalyticsService.getTrends(filters.stationId, {
            startDate: filters.startDate,
            endDate: filters.endDate,
            productIds: filters.productId ? [filters.productId] : undefined,
            shiftStatus: filters.shiftStatus,
            readingType: filters.readingType,
            period: filters.period,
            granularity: filters.granularity,
            metric: filters.metric
          });
          break;
          
        case 'pump_performance':
          result = await StationAnalyticsService.getPumpPerformance(filters.stationId, {
            startDate: filters.startDate,
            endDate: filters.endDate,
            productIds: filters.productId ? [filters.productId] : undefined,
            shiftStatus: filters.shiftStatus,
            readingType: filters.readingType,
            page: filters.page,
            limit: filters.limit,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
            rankingMetric: filters.rankingMetric,
            minLiters: filters.minLiters,
            maxLiters: filters.maxLiters
          });
          break;
          
        case 'products':
          result = await StationAnalyticsService.getProducts(filters.stationId, {
            startDate: filters.startDate,
            endDate: filters.endDate,
            shiftStatus: filters.shiftStatus,
            readingType: filters.readingType,
            page: filters.page,
            limit: filters.limit,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder
          });
          break;
          
        case 'shifts':
          result = await StationAnalyticsService.getShifts(filters.stationId, {
            startDate: filters.startDate,
            endDate: filters.endDate,
            shiftStatus: filters.shiftStatus,
            readingType: filters.readingType,
            page: filters.page,
            limit: filters.limit,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder
          });
          break;
          
        case 'quick_access':
          switch (filters.quickAccessType) {
            case 'today':
              result = await StationAnalyticsService.getTodaySales(filters.stationId, {
                productIds: filters.productId ? [filters.productId] : undefined,
                shiftStatus: filters.shiftStatus,
                readingType: filters.readingType
              });
              break;
            case 'yesterday':
              result = await StationAnalyticsService.getYesterdaySales(filters.stationId, {
                productIds: filters.productId ? [filters.productId] : undefined,
                shiftStatus: filters.shiftStatus,
                readingType: filters.readingType
              });
              break;
            case 'week':
              result = await StationAnalyticsService.getThisWeekSales(filters.stationId, {
                productIds: filters.productId ? [filters.productId] : undefined,
                shiftStatus: filters.shiftStatus,
                readingType: filters.readingType
              });
              break;
            case 'month':
              result = await StationAnalyticsService.getThisMonthSales(filters.stationId, {
                productIds: filters.productId ? [filters.productId] : undefined,
                shiftStatus: filters.shiftStatus,
                readingType: filters.readingType
              });
              break;
            default:
              throw new Error('Invalid quick access type');
          }
          break;
          
        case 'real_time':
          result = await StationAnalyticsService.getRealTimeSales(filters.stationId, {
            productIds: filters.productId ? [filters.productId] : undefined,
            lastHours: filters.lastHours,
            updateInterval: filters.updateInterval,
            shiftStatus: filters.shiftStatus,
            readingType: filters.readingType
          });
          break;
          
        case 'export':
          // Export handled separately
          return;
          
        default:
          throw new Error(`Unsupported tab: ${activeTab}`);
      }
      
      setAnalyticsData(result);
      setSummary(result?.summary || null);
      setMeta(result?.meta || null);
      setTableData(result?.formattedData || result?.data || []);
      
      if ((result?.data || result?.formattedData)?.length === 0) {
        message.info('No data found for the selected filters');
      }
    } catch (error) {
      console.error(`Failed to fetch ${activeTab} data:`, error);
      setError(error.message || 'Failed to fetch analytics data');
      setAnalyticsData(null);
      setSummary(null);
      setMeta(null);
      setTableData([]);
      message.error(error.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on filter changes
  useEffect(() => {
    if (!initializedRef.current || !filters.stationId || activeTab === 'export') return;
    
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      fetchAnalyticsData();
    }, 500);
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [
    activeTab,
    filters.stationId,
    filters.productId,
    filters.startDate,
    filters.endDate,
    filters.page,
    filters.limit,
    filters.sortBy,
    filters.sortOrder,
    filters.groupBy,
    filters.metric,
    filters.period,
    filters.granularity,
    filters.rankingMetric,
    filters.quickAccessType,
    filters.lastHours,
    filters.shiftStatus,
    filters.readingType,
    filters.minLiters,
    filters.maxLiters
  ]);

  // ========== UI HANDLERS ==========
  const handleTabChange = (key) => {
    if (!canAccessTab(key)) {
      message.error(`You do not have permission to access ${TABS[key]?.label || key}`);
      return;
    }
    
    setActiveTab(key);
    setAnalyticsData(null);
    setSummary(null);
    setMeta(null);
    setTableData([]);
    setError(null);
  };

  const handleExport = async () => {
    if (!filters.stationId) {
      message.error('No station assigned to export data');
      return;
    }
    
    try {
      await StationAnalyticsService.exportData(filters.stationId, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        productIds: filters.productId ? [filters.productId] : undefined,
        format: 'excel',
        includeAllFields: true
      });
      message.success('Export started successfully');
    } catch (error) {
      console.error('Export failed:', error);
      message.error(error.message || 'Failed to export data');
    }
  };

  // ========== ACCESS CONTROL ==========
  const canAccessTab = (tabKey) => {
    const tabConfig = TABS[tabKey];
    return tabConfig?.allowedRoles.includes(userRole);
  };

  // ========== RENDER FUNCTIONS ==========
  const renderRoleInfo = () => {
    const roleColor = isStationManager ? 'orange' : 'green';
    const roleIcon = isStationManager ? <SettingOutlined /> : <TeamOutlined />;
    const roleName = isStationManager ? 'Station Manager' : 'Supervisor';

    return (
      <Space style={{ marginBottom: 16 }}>
        <Tag icon={roleIcon} color={roleColor}>
          {roleName}
        </Tag>
        {currentStation && (
          <Tag color="blue" icon={<ShopOutlined />}>
            {currentStation.name}
          </Tag>
        )}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {isStationManager ? 'Full station management access' : 'Supervisor access to assigned station'}
        </Text>
      </Space>
    );
  };

  const renderStationField = () => {
    return (
      <Form.Item label="Station" required style={{ marginBottom: 0 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            value={currentStation?.name || 'No station assigned'}
            readOnly
            prefix={<ShopOutlined />}
            style={{ backgroundColor: '#fafafa' }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Automatically assigned to your account
          </Text>
        </Space>
      </Form.Item>
    );
  };

  const renderFilterControls = () => {
    const commonFilters = (
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Form.Item label="Date Range" required style={{ marginBottom: 0 }}>
            <RangePicker
              value={[dayjs(filters.startDate), dayjs(filters.endDate)]}
              onChange={handleDateRangeChange}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </Form.Item>
        </Col>
        
        {activeTab !== 'quick_access' && activeTab !== 'real_time' && (
          <>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Shift Status" style={{ marginBottom: 0 }}>
                <Select
                  value={filters.shiftStatus}
                  onChange={(value) => handleFilterChange('shiftStatus', value)}
                  style={{ width: '100%' }}
                >
                  <Option value="CLOSED">Closed Shifts</Option>
                  <Option value="OPEN">Open Shifts</Option>
                  <Option value="ALL">All Shifts</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Reading Type" style={{ marginBottom: 0 }}>
                <Select
                  value={filters.readingType}
                  onChange={(value) => handleFilterChange('readingType', value)}
                  style={{ width: '100%' }}
                >
                  <Option value="END">End Readings</Option>
                  <Option value="START">Start Readings</Option>
                  <Option value="ALL">All Readings</Option>
                </Select>
              </Form.Item>
            </Col>
          </>
        )}
      </Row>
    );

    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                {renderStationField()}
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Filter by Product" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.productId}
                    onChange={(value) => handleFilterChange('productId', value)}
                    placeholder="All Products"
                    allowClear
                    style={{ width: '100%' }}
                    loading={loadingDropdowns}
                  >
                    {products.map(product => (
                      <Option key={product.id} value={product.id}>
                        {product.name} ({product.fuelCode || 'N/A'})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Group By" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.groupBy}
                    onChange={(value) => handleFilterChange('groupBy', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="product">By Product</Option>
                    <Option value="pump">By Pump</Option>
                    <Option value="shift">By Shift</Option>
                    <Option value="day">By Day</Option>
                    <Option value="hour">By Hour</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
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
                      <DashboardOutlined /> Cards
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
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Options" style={{ marginBottom: 0 }}>
                  <Space>
                    <Checkbox
                      checked={filters.includeDetails}
                      onChange={(e) => handleFilterChange('includeDetails', e.target.checked)}
                    >
                      Include Details
                    </Checkbox>
                    <Checkbox
                      checked={filters.includeForecast}
                      onChange={(e) => handleFilterChange('includeForecast', e.target.checked)}
                    >
                      Include Forecast
                    </Checkbox>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
            
            {commonFilters}
          </>
        );

      case 'trends':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                {renderStationField()}
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Period" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.period}
                    onChange={(value) => handleFilterChange('period', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="hourly">Hourly</Option>
                    <Option value="daily">Daily</Option>
                    <Option value="weekly">Weekly</Option>
                    <Option value="monthly">Monthly</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Granularity" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.granularity}
                    onChange={(value) => handleFilterChange('granularity', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="hour">Hour</Option>
                    <Option value="day">Day</Option>
                    <Option value="week">Week</Option>
                    <Option value="month">Month</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Filter by Product" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.productId}
                    onChange={(value) => handleFilterChange('productId', value)}
                    placeholder="All Products"
                    allowClear
                    style={{ width: '100%' }}
                    loading={loadingDropdowns}
                  >
                    {products.map(product => (
                      <Option key={product.id} value={product.id}>
                        {product.name} ({product.fuelCode || 'N/A'})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Metric" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.metric}
                    onChange={(value) => handleFilterChange('metric', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="revenue">Revenue</Option>
                    <Option value="liters">Liters</Option>
                    <Option value="transactions">Transactions</Option>
                    <Option value="unitPrice">Unit Price</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {commonFilters}
          </>
        );

      case 'pump_performance':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                {renderStationField()}
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Filter by Product" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.productId}
                    onChange={(value) => handleFilterChange('productId', value)}
                    placeholder="All Products"
                    allowClear
                    style={{ width: '100%' }}
                    loading={loadingDropdowns}
                  >
                    {products.map(product => (
                      <Option key={product.id} value={product.id}>
                        {product.name} ({product.fuelCode || 'N/A'})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Rank By" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.rankingMetric}
                    onChange={(value) => handleFilterChange('rankingMetric', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="liters">Liters</Option>
                    <Option value="revenue">Revenue</Option>
                    <Option value="efficiency">Efficiency</Option>
                    <Option value="utilization">Utilization</Option>
                    <Option value="transactions">Transactions</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Min Liters" style={{ marginBottom: 0 }}>
                  <Input
                    type="number"
                    value={filters.minLiters}
                    onChange={(e) => handleFilterChange('minLiters', e.target.value)}
                    placeholder="Minimum liters"
                    suffix="L"
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Max Liters" style={{ marginBottom: 0 }}>
                  <Input
                    type="number"
                    value={filters.maxLiters}
                    onChange={(e) => handleFilterChange('maxLiters', e.target.value)}
                    placeholder="Maximum liters"
                    suffix="L"
                  />
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
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {commonFilters}
          </>
        );

      case 'products':
      case 'shifts':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                {renderStationField()}
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Sort By" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.sortBy}
                    onChange={(value) => handleFilterChange('sortBy', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="totalLiters">Total Liters</Option>
                    <Option value="totalRevenue">Total Revenue</Option>
                    <Option value="transactionCount">Transaction Count</Option>
                    <Option value="avgUnitPrice">Average Unit Price</Option>
                    <Option value="marketShare">Market Share</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Sort Order" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.sortOrder}
                    onChange={(value) => handleFilterChange('sortOrder', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="desc">Descending</Option>
                    <Option value="asc">Ascending</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
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
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {commonFilters}
          </>
        );

      case 'quick_access':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                {renderStationField()}
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Quick View" style={{ marginBottom: 0 }}>
                  <Segmented
                    value={filters.quickAccessType}
                    onChange={(value) => handleFilterChange('quickAccessType', value)}
                    options={[
                      { label: 'Today', value: 'today' },
                      { label: 'Yesterday', value: 'yesterday' },
                      { label: 'This Week', value: 'week' },
                      { label: 'This Month', value: 'month' }
                    ]}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Filter by Product" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.productId}
                    onChange={(value) => handleFilterChange('productId', value)}
                    placeholder="All Products"
                    allowClear
                    style={{ width: '100%' }}
                    loading={loadingDropdowns}
                  >
                    {products.map(product => (
                      <Option key={product.id} value={product.id}>
                        {product.name} ({product.fuelCode || 'N/A'})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {commonFilters}
          </>
        );

      case 'real_time':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                {renderStationField()}
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Last Hours" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.lastHours}
                    onChange={(value) => handleFilterChange('lastHours', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value={1}>1 hour</Option>
                    <Option value={6}>6 hours</Option>
                    <Option value={12}>12 hours</Option>
                    <Option value={24}>24 hours</Option>
                    <Option value={48}>48 hours</Option>
                    <Option value={72}>72 hours</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Update Interval" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.updateInterval}
                    onChange={(value) => handleFilterChange('updateInterval', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value={10}>10 seconds</Option>
                    <Option value={30}>30 seconds</Option>
                    <Option value={60}>60 seconds</Option>
                    <Option value={300}>5 minutes</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Filter by Product" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.productId}
                    onChange={(value) => handleFilterChange('productId', value)}
                    placeholder="All Products"
                    allowClear
                    style={{ width: '100%' }}
                    loading={loadingDropdowns}
                  >
                    {products.map(product => (
                      <Option key={product.id} value={product.id}>
                        {product.name} ({product.fuelCode || 'N/A'})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </>
        );

      case 'export':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                {renderStationField()}
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Export Format" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.format}
                    onChange={(value) => handleFilterChange('format', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="excel">Excel (.xlsx)</Option>
                    <Option value="csv">CSV (.csv)</Option>
                    <Option value="json">JSON (.json)</Option>
                    <Option value="pdf">PDF (.pdf)</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Filter by Product" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.productId}
                    onChange={(value) => handleFilterChange('productId', value)}
                    placeholder="All Products"
                    allowClear
                    style={{ width: '100%' }}
                    loading={loadingDropdowns}
                  >
                    {products.map(product => (
                      <Option key={product.id} value={product.id}>
                        {product.name} ({product.fuelCode || 'N/A'})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {commonFilters}
            
            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Options" style={{ marginBottom: 0 }}>
                  <Space direction="vertical">
                    <Checkbox
                      checked={filters.includeAllFields}
                      onChange={(e) => handleFilterChange('includeAllFields', e.target.checked)}
                    >
                      Include All Fields
                    </Checkbox>
                    <Checkbox
                      checked={filters.compression}
                      onChange={(e) => handleFilterChange('compression', e.target.checked)}
                    >
                      Compress Export
                    </Checkbox>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </>
        );

      default:
        return commonFilters;
    }
  };

  const renderDataTable = () => {
    if (!tableData || tableData.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Paragraph>No analytics data found</Paragraph>
              <Text type="secondary">
                Try adjusting your filters or select different criteria
              </Text>
            </div>
          }
        />
      );
    }

    let columns = [];

    switch (activeTab) {
      case 'dashboard':
        columns = [
          {
            title: '#',
            key: 'index',
            render: (_, __, index) => index + 1,
            width: 50
          },
          {
            title: filters.groupBy === 'product' ? 'Product' : 
                   filters.groupBy === 'pump' ? 'Pump' : 
                   filters.groupBy === 'shift' ? 'Shift' : 'Name',
            dataIndex: 'name',
            key: 'name',
            width: 200,
            render: (value, record) => (
              <Space direction="vertical" size={0}>
                <Text strong>{value}</Text>
                {record.productCode && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Code: {record.productCode}
                  </Text>
                )}
                {record.stationLabel && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Station: {record.stationLabel}
                  </Text>
                )}
              </Space>
            )
          },
          {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (value) => (
              <Tag color={
                value === 'product' ? 'blue' : 
                value === 'pump' ? 'green' : 
                value === 'shift' ? 'orange' : 'default'
              }>
                {value?.toUpperCase()}
              </Tag>
            )
          },
          {
            title: 'Liters',
            dataIndex: 'totalLiters',
            key: 'liters',
            width: 120,
            render: (value) => fuelAnalyticsUtils.formatVolume(value),
            sorter: (a, b) => a.totalLiters - b.totalLiters
          },
          {
            title: 'Revenue',
            dataIndex: 'totalRevenue',
            key: 'revenue',
            width: 150,
            render: (value) => fuelAnalyticsUtils.formatCurrency(value),
            sorter: (a, b) => a.totalRevenue - b.totalRevenue
          },
          {
            title: 'Unit Price',
            dataIndex: 'avgUnitPrice',
            key: 'unitPrice',
            width: 120,
            render: (value) => fuelAnalyticsUtils.formatCurrency(value),
            sorter: (a, b) => a.avgUnitPrice - b.avgUnitPrice
          },
          {
            title: 'Transactions',
            dataIndex: 'transactionCount',
            key: 'transactions',
            width: 100,
            sorter: (a, b) => a.transactionCount - b.transactionCount
          },
          {
            title: 'Market Share',
            dataIndex: 'marketShare',
            key: 'marketShare',
            width: 120,
            render: (value) => (
              <Tooltip title={`${value?.toFixed(2)}%`}>
                <Progress percent={value || 0} size="small" />
              </Tooltip>
            ),
            sorter: (a, b) => (a.marketShare || 0) - (b.marketShare || 0)
          }
        ];
        break;

      case 'pump_performance':
        columns = [
          {
            title: '#',
            key: 'rank',
            dataIndex: 'rank',
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
            sorter: (a, b) => a.rank - b.rank
          },
          {
            title: 'Pump Name',
            dataIndex: 'pumpName',
            key: 'pumpName',
            width: 150
          },
          {
            title: 'Product',
            dataIndex: 'productName',
            key: 'productName',
            width: 120
          },
          {
            title: 'Liters',
            dataIndex: 'totalLiters',
            key: 'liters',
            width: 120,
            render: (value) => fuelAnalyticsUtils.formatVolume(value),
            sorter: (a, b) => a.totalLiters - b.totalLiters
          },
          {
            title: 'Revenue',
            dataIndex: 'totalRevenue',
            key: 'revenue',
            width: 150,
            render: (value) => fuelAnalyticsUtils.formatCurrency(value),
            sorter: (a, b) => a.totalRevenue - b.totalRevenue
          },
          {
            title: 'Transactions',
            dataIndex: 'transactionCount',
            key: 'transactions',
            width: 100,
            sorter: (a, b) => a.transactionCount - b.transactionCount
          },
          {
            title: 'Utilization',
            dataIndex: 'utilizationRate',
            key: 'utilization',
            width: 120,
            render: (value) => fuelAnalyticsUtils.formatPercentage(value || 0),
            sorter: (a, b) => (a.utilizationRate || 0) - (b.utilizationRate || 0)
          },
          {
            title: 'Efficiency',
            dataIndex: 'efficiencyScore',
            key: 'efficiency',
            width: 120,
            render: (value) => `${value?.toFixed(1)}%`,
            sorter: (a, b) => (a.efficiencyScore || 0) - (b.efficiencyScore || 0)
          }
        ];
        break;

      case 'products':
        columns = [
          {
            title: '#',
            key: 'index',
            render: (_, __, index) => index + 1,
            width: 50
          },
          {
            title: 'Product Name',
            dataIndex: 'name',
            key: 'name',
            width: 200
          },
          {
            title: 'Product Code',
            dataIndex: 'productCode',
            key: 'productCode',
            width: 120
          },
          {
            title: 'Liters',
            dataIndex: 'totalLiters',
            key: 'liters',
            width: 120,
            render: (value) => fuelAnalyticsUtils.formatVolume(value),
            sorter: (a, b) => a.totalLiters - b.totalLiters
          },
          {
            title: 'Revenue',
            dataIndex: 'totalRevenue',
            key: 'revenue',
            width: 150,
            render: (value) => fuelAnalyticsUtils.formatCurrency(value),
            sorter: (a, b) => a.totalRevenue - b.totalRevenue
          },
          {
            title: 'Unit Price',
            dataIndex: 'avgUnitPrice',
            key: 'unitPrice',
            width: 120,
            render: (value) => fuelAnalyticsUtils.formatCurrency(value),
            sorter: (a, b) => a.avgUnitPrice - b.avgUnitPrice
          },
          {
            title: 'Transactions',
            dataIndex: 'transactionCount',
            key: 'transactions',
            width: 100,
            sorter: (a, b) => a.transactionCount - b.transactionCount
          },
          {
            title: 'Market Share',
            dataIndex: 'marketShare',
            key: 'marketShare',
            width: 120,
            render: (value) => (
              <Tooltip title={`${value?.toFixed(2)}%`}>
                <Progress percent={value || 0} size="small" />
              </Tooltip>
            ),
            sorter: (a, b) => (a.marketShare || 0) - (b.marketShare || 0)
          }
        ];
        break;

      case 'shifts':
        columns = [
          {
            title: '#',
            key: 'index',
            render: (_, __, index) => index + 1,
            width: 50
          },
          {
            title: 'Shift',
            dataIndex: 'name',
            key: 'shift',
            width: 120,
            render: (value, record) => (
              <Space direction="vertical" size={0}>
                <Text strong>{record.shiftNumber ? `Shift ${record.shiftNumber}` : value}</Text>
                {record.supervisor && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Supervisor: {record.supervisor}
                  </Text>
                )}
              </Space>
            )
          },
          {
            title: 'Duration',
            dataIndex: 'duration',
            key: 'duration',
            width: 100
          },
          {
            title: 'Liters',
            dataIndex: 'totalLiters',
            key: 'liters',
            width: 120,
            render: (value) => fuelAnalyticsUtils.formatVolume(value),
            sorter: (a, b) => a.totalLiters - b.totalLiters
          },
          {
            title: 'Revenue',
            dataIndex: 'totalRevenue',
            key: 'revenue',
            width: 150,
            render: (value) => fuelAnalyticsUtils.formatCurrency(value),
            sorter: (a, b) => a.totalRevenue - b.totalRevenue
          },
          {
            title: 'Unit Price',
            dataIndex: 'avgUnitPrice',
            key: 'unitPrice',
            width: 120,
            render: (value) => fuelAnalyticsUtils.formatCurrency(value),
            sorter: (a, b) => a.avgUnitPrice - b.avgUnitPrice
          },
          {
            title: 'Transactions',
            dataIndex: 'transactionCount',
            key: 'transactions',
            width: 100,
            sorter: (a, b) => a.transactionCount - b.transactionCount
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (value) => (
              <Tag color={value === 'OPEN' ? 'green' : 'blue'}>
                {value || 'CLOSED'}
              </Tag>
            )
          }
        ];
        break;

      case 'trends':
        columns = [
          {
            title: 'Period',
            dataIndex: 'period',
            key: 'period',
            width: 150,
            render: (value) => {
              if (!value) return 'Unknown';
              if (filters.period === 'hourly') {
                return dayjs(value).format('MMM DD, HH:mm');
              } else if (filters.period === 'daily') {
                return dayjs(value).format('MMM DD, YYYY');
              } else if (filters.period === 'weekly') {
                return `Week ${dayjs(value).format('WW, YYYY')}`;
              } else {
                return dayjs(value).format('MMM YYYY');
              }
            }
          },
          {
            title: 'Liters',
            dataIndex: 'totalLiters',
            key: 'liters',
            width: 120,
            render: (value) => fuelAnalyticsUtils.formatVolume(value)
          },
          {
            title: 'Revenue',
            dataIndex: 'totalRevenue',
            key: 'revenue',
            width: 150,
            render: (value) => fuelAnalyticsUtils.formatCurrency(value)
          },
          {
            title: 'Transactions',
            dataIndex: 'transactionCount',
            key: 'transactions',
            width: 100
          },
          {
            title: 'Trend',
            key: 'trend',
            width: 100,
            render: (_, record, index, data) => {
              if (index === 0 || !data[index - 1]) return null;
              const prevValue = data[index - 1].totalRevenue;
              const currentValue = record.totalRevenue;
              const growth = fuelAnalyticsUtils.calculateGrowth(currentValue, prevValue);
              
              return (
                <Tag color={growth > 0 ? 'green' : growth < 0 ? 'red' : 'blue'}>
                  {growth > 0 ? '↑' : growth < 0 ? '↓' : '→'} {Math.abs(growth).toFixed(1)}%
                </Tag>
              );
            }
          }
        ];
        break;

      default:
        columns = [
          {
            title: '#',
            key: 'index',
            render: (_, __, index) => index + 1,
            width: 50
          },
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            width: 200
          },
          {
            title: 'Liters',
            dataIndex: 'totalLiters',
            key: 'liters',
            width: 120,
            render: (value) => fuelAnalyticsUtils.formatVolume(value)
          },
          {
            title: 'Revenue',
            dataIndex: 'totalRevenue',
            key: 'revenue',
            width: 150,
            render: (value) => fuelAnalyticsUtils.formatCurrency(value)
          }
        ];
    }

    return (
      <Table
        columns={columns}
        dataSource={tableData}
        rowKey={(record) => record.id || `row-${Math.random()}`}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          total: analyticsData?.pagination?.total || tableData.length,
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
            {summary.dailyAverage?.liters && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Daily: {fuelAnalyticsUtils.formatVolume(summary.dailyAverage.liters)}
              </Text>
            )}
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
            {summary.dailyAverage?.revenue && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Daily: {fuelAnalyticsUtils.formatCurrency(summary.dailyAverage.revenue)}
              </Text>
            )}
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
            <Text type="secondary" style={{ fontSize: 12 }}>
              Per Liter
            </Text>
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
            {summary.dailyAverage?.transactions && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Daily: {summary.dailyAverage.transactions}
              </Text>
            )}
          </Card>
        </Col>
      </Row>
    );
  };

  const renderExportButton = () => {
    if (activeTab === 'export') {
      return (
        <Button
          type="primary"
          onClick={handleExport}
          loading={loading}
          icon={<DownloadOutlined />}
          size="large"
        >
          Export Data
        </Button>
      );
    }

    if (!analyticsData) return null;

    const exportData = tableData.map((item, index) => ({
      '#': index + 1,
      'Name': item.name,
      'Type': item.type,
      'Liters': item.totalLiters || 0,
      'Revenue': item.totalRevenue || 0,
      'Unit Price': item.avgUnitPrice || 0,
      'Transactions': item.transactionCount || 0,
      'Station': currentStation?.name || 'Unknown',
      'Date Range': `${filters.startDate} to ${filters.endDate}`,
      'Generated At': new Date().toISOString()
    }));

    const exportTitle = `${TABS[activeTab].label} - ${currentStation?.name || 'Station'} Analytics`;
    const fileName = `station_analytics_${currentStation?.id || 'station'}_${activeTab}_${filters.startDate}_to_${filters.endDate}`;

    return (
      <AdvancedReportGenerator
        dataSource={exportData}
        title={exportTitle}
        fileName={fileName}
        summaryData={summary}
        reportType="station_analytics"
        stationInfo={currentStation}
        enableCustomization={isStationManager}
      />
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'export') {
      return (
        <Card
          title={
            <Space>
              <ExportOutlined />
              <span>Export Station Analytics Data</span>
            </Space>
          }
          extra={renderExportButton()}
        >
          <Form form={form} layout="vertical">
            {renderFilterControls()}
          </Form>
          
          <Alert
            message="Export Information"
            description={`Export analytics data for ${currentStation?.name || 'your station'}. The export will include all data matching your filters and can be used for further analysis or reporting.`}
            type="info"
            showIcon
            style={{ marginTop: 24 }}
          />
        </Card>
      );
    }

    return (
      <>
        <Card
          title={
            <Space>
              <FilterOutlined />
              <span>Filters</span>
              <Tag color="blue">{TABS[activeTab]?.description}</Tag>
            </Space>
          }
          size="small"
          style={{ marginBottom: 24 }}
          extra={
            <Button
              type="primary"
              onClick={fetchAnalyticsData}
              loading={loading}
              icon={<ReloadOutlined />}
            >
              Refresh
            </Button>
          }
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
          title={TABS[activeTab]?.label}
          extra={
            <Space>
              <Text type="secondary">
                Showing {tableData.length} items
                {analyticsData?.pagination?.total && ` of ${analyticsData.pagination.total}`}
              </Text>
              {renderExportButton()}
            </Space>
          }
        >
          {renderDataTable()}
        </Card>
      </>
    );
  };

  return (
    <div className="station-fuel-sales">
      <Card style={{ margin: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            <DashboardOutlined /> Station Fuel Analytics
          </Title>
          <Text type="secondary">
            Comprehensive station-level fuel analytics and reporting for {currentStation?.name || 'your station'}
          </Text>
          {renderRoleInfo()}
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          type="card"
          size="large"
        >
          {Object.values(TABS)
            .filter(tab => canAccessTab(tab.key))
            .map(tab => (
              <TabPane
                tab={
                  <span>
                    {tab.icon}
                    {tab.label}
                  </span>
                }
                key={tab.key}
              >
                {renderTabContent()}
              </TabPane>
            ))}
        </Tabs>

        {meta && (
          <div style={{ marginTop: 24, padding: 16, backgroundColor: '#fafafa', borderRadius: 4 }}>
            <Text type="secondary">
              <InfoCircleOutlined /> Report: {meta.reportType || 'N/A'} | 
              <CalendarOutlined /> Generated: {meta.generatedAt ? new Date(meta.generatedAt).toLocaleString() : 'N/A'} | 
              <EyeOutlined /> Data Points: {tableData.length}
              {meta.executionTime && ` | ⚡ Execution: ${meta.executionTime}ms`}
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StationFuelSales;