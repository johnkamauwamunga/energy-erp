// src/components/analytics/fuel/CompanyFuelSales.jsx
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
  DashboardOutlined,
  AreaChartOutlined,
  RocketOutlined,
  HistoryOutlined,
  CrownOutlined,
  TeamOutlined,
  BarChartOutlined as ChartOutlined,
  CompareOutlined,
  ExportOutlined,
  EyeOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApp } from '../../../../context/AppContext';
import { 
  CompanyAnalyticsService,
  fuelAnalyticsUtils,
  fuelAnalyticsFilters 
} from '../../../../services/fuelSalesService/FuelAnalyticsService';
import { stationService } from '../../../../services/stationService/stationService';
import { companyService } from '../../../../services/companyService/companyService';
import { fuelService } from '../../../../services/fuelService/fuelService';
import AdvancedReportGenerator from '../downloadable/AdvancedReportGenerator';
import './FuelSalesManagement.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  LINES_MANAGER: 'LINES_MANAGER'
};

const TABS = {
  dashboard: {
    key: 'dashboard',
    label: 'Company Dashboard',
    icon: <DashboardOutlined />,
    description: 'Company-wide overview and metrics',
    allowedRoles: [ROLE.SUPER_ADMIN, ROLE.COMPANY_ADMIN, ROLE.LINES_MANAGER]
  },
  trends: {
    key: 'trends',
    label: 'Company Trends',
    icon: <AreaChartOutlined />,
    description: 'Time-based analysis for company',
    allowedRoles: [ROLE.SUPER_ADMIN, ROLE.COMPANY_ADMIN, ROLE.LINES_MANAGER]
  },
  comparison: {
    key: 'comparison',
    label: 'Company Comparison',
    icon: <CompareOutlined />,
    description: 'Compare stations/products',
    allowedRoles: [ROLE.SUPER_ADMIN, ROLE.COMPANY_ADMIN, ROLE.LINES_MANAGER]
  },
  stations: {
    key: 'stations',
    label: 'Stations Overview',
    icon: <ShopOutlined />,
    description: 'Detailed station performance',
    allowedRoles: [ROLE.SUPER_ADMIN, ROLE.COMPANY_ADMIN, ROLE.LINES_MANAGER]
  },
  products: {
    key: 'products',
    label: 'Products Overview',
    icon: <ProductOutlined />,
    description: 'Product performance across stations',
    allowedRoles: [ROLE.SUPER_ADMIN, ROLE.COMPANY_ADMIN, ROLE.LINES_MANAGER]
  },
  quick_access: {
    key: 'quick_access',
    label: 'Quick Access',
    icon: <ClockCircleOutlined />,
    description: 'Today, yesterday, week, month views',
    allowedRoles: [ROLE.SUPER_ADMIN, ROLE.COMPANY_ADMIN, ROLE.LINES_MANAGER]
  },
  real_time: {
    key: 'real_time',
    label: 'Real-Time',
    icon: <RocketOutlined />,
    description: 'Live sales data',
    allowedRoles: [ROLE.SUPER_ADMIN, ROLE.COMPANY_ADMIN, ROLE.LINES_MANAGER]
  },
  export: {
    key: 'export',
    label: 'Export',
    icon: <ExportOutlined />,
    description: 'Export analytics data',
    allowedRoles: [ROLE.SUPER_ADMIN, ROLE.COMPANY_ADMIN]
  }
};

const CompanyFuelSales = () => {
  const { state } = useApp();
  const [form] = Form.useForm();
  
  // Memoize app state
  const currentUser = useMemo(() => state.currentUser, [state.currentUser]);
  const currentCompany = useMemo(() => state.currentCompany, [state.currentCompany]);
  const userRole = useMemo(() => currentUser?.role, [currentUser]);
  const isSuperAdmin = useMemo(() => userRole === ROLE.SUPER_ADMIN, [userRole]);
  const isCompanyAdmin = useMemo(() => userRole === ROLE.COMPANY_ADMIN, [userRole]);
  const isLinesManager = useMemo(() => userRole === ROLE.LINES_MANAGER, [userRole]);
  
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
  const [companies, setCompanies] = useState([]);
  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Filters State
  const [filters, setFilters] = useState({
    companyId: null,
    stationId: null,
    productId: null,
    groupBy: 'station',
    metric: 'revenue',
    period: 'monthly',
    dataPoints: 30,
    chartType: 'line',
    compareWith: 'previous_period',
    compareStations: [],
    compareProducts: [],
    includeTrends: true,
    includeComparison: false,
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
    sortOrder: 'desc'
  });

  // ========== INITIALIZATION ==========
  useEffect(() => {
    if (initializedRef.current) return;
    
    const init = async () => {
      try {
        setLoadingDropdowns(true);
        initializedRef.current = true;
        
        // Load companies for super admin
        if (isSuperAdmin) {
          await loadCompanies();
        } else if (currentCompany?.id) {
          // Company Admin/Lines Manager - auto-select their company
          setFilters(prev => ({ ...prev, companyId: currentCompany.id }));
          await loadStations(currentCompany.id);
          await loadProducts();
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
        message.error('Failed to initialize analytics');
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
  }, [isSuperAdmin, currentCompany]);

  // ========== DATA LOADING ==========
  const loadCompanies = async () => {
    try {
      const response = await companyService.getCompanies();
      const companiesArray = Array.isArray(response) ? response : 
                           response.success && Array.isArray(response.data) ? response.data : [];
      
      setCompanies(companiesArray);
      
      // Auto-select first company if only one exists
      if (companiesArray.length === 1) {
        setFilters(prev => ({ ...prev, companyId: companiesArray[0].id }));
        await loadStations(companiesArray[0].id);
        await loadProducts();
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
      throw error;
    }
  };

  const loadStations = async (companyId) => {
    try {
      const response = await stationService.getCompanyStations(companyId);
      const stationsArray = Array.isArray(response) ? response : 
                           response.success && Array.isArray(response.data) ? response.data : [];
      
      setStations(stationsArray);
    } catch (error) {
      console.error('Failed to load stations:', error);
      throw error;
    }
  };

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
      if (key === 'companyId' && value) {
        loadStations(value);
        loadProducts();
        newFilters.stationId = null;
        newFilters.productId = null;
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
    if (!filters.companyId) {
      message.error('Please select a company');
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
          result = await CompanyAnalyticsService.getDashboard(filters.companyId, {
            startDate: filters.startDate,
            endDate: filters.endDate,
            stationIds: filters.stationId ? [filters.stationId] : undefined,
            productIds: filters.productId ? [filters.productId] : undefined,
            shiftStatus: filters.shiftStatus,
            readingType: filters.readingType,
            page: filters.page,
            limit: filters.limit,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
            groupBy: filters.groupBy,
            includeTrends: filters.includeTrends,
            includeComparison: filters.includeComparison
          });
          break;
          
        case 'trends':
          result = await CompanyAnalyticsService.getTrends(filters.companyId, {
            startDate: filters.startDate,
            endDate: filters.endDate,
            stationIds: filters.stationId ? [filters.stationId] : undefined,
            productIds: filters.productId ? [filters.productId] : undefined,
            period: filters.period,
            dataPoints: filters.dataPoints,
            metric: filters.metric,
            chartType: filters.chartType
          });
          break;
          
        case 'comparison':
          result = await CompanyAnalyticsService.getComparison(filters.companyId, {
            startDate: filters.startDate,
            endDate: filters.endDate,
            stationIds: filters.stationId ? [filters.stationId] : undefined,
            productIds: filters.productId ? [filters.productId] : undefined,
            metric: filters.metric,
            compareWith: filters.compareWith,
            compareStations: filters.compareStations,
            compareProducts: filters.compareProducts
          });
          break;
          
        case 'stations':
          result = await CompanyAnalyticsService.getStationsOverview(filters.companyId, {
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
          
        case 'products':
          result = await CompanyAnalyticsService.getProductsOverview(filters.companyId, {
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
              result = await CompanyAnalyticsService.getTodaySales(filters.companyId, {
                stationIds: filters.stationId ? [filters.stationId] : undefined,
                productIds: filters.productId ? [filters.productId] : undefined
              });
              break;
            case 'yesterday':
              result = await CompanyAnalyticsService.getYesterdaySales(filters.companyId, {
                stationIds: filters.stationId ? [filters.stationId] : undefined,
                productIds: filters.productId ? [filters.productId] : undefined
              });
              break;
            case 'week':
              result = await CompanyAnalyticsService.getThisWeekSales(filters.companyId, {
                stationIds: filters.stationId ? [filters.stationId] : undefined,
                productIds: filters.productId ? [filters.productId] : undefined
              });
              break;
            case 'month':
              result = await CompanyAnalyticsService.getThisMonthSales(filters.companyId, {
                stationIds: filters.stationId ? [filters.stationId] : undefined,
                productIds: filters.productId ? [filters.productId] : undefined
              });
              break;
            default:
              throw new Error('Invalid quick access type');
          }
          break;
          
        case 'real_time':
          result = await CompanyAnalyticsService.getRealTimeSales(filters.companyId, {
            stationIds: filters.stationId ? [filters.stationId] : undefined,
            productIds: filters.productId ? [filters.productId] : undefined,
            lastHours: filters.lastHours,
            updateInterval: filters.updateInterval
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
    if (!initializedRef.current || !filters.companyId || activeTab === 'export') return;
    
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
    filters.companyId,
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
    filters.quickAccessType,
    filters.lastHours,
    filters.shiftStatus,
    filters.readingType
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
    if (!filters.companyId) {
      message.error('Please select a company to export data');
      return;
    }
    
    try {
      await CompanyAnalyticsService.exportData(filters.companyId, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        stationIds: filters.stationId ? [filters.stationId] : undefined,
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
    const roleColor = isSuperAdmin ? 'red' : isCompanyAdmin ? 'blue' : 'orange';
    const roleIcon = isSuperAdmin ? <CrownOutlined /> : isCompanyAdmin ? <TeamOutlined /> : <ChartOutlined />;
    const roleName = isSuperAdmin ? 'Super Admin' : isCompanyAdmin ? 'Company Admin' : 'Lines Manager';

    return (
      <Space style={{ marginBottom: 16 }}>
        <Tag icon={roleIcon} color={roleColor}>
          {roleName}
        </Tag>
        {currentCompany && (
          <Tag color="green" icon={<TeamOutlined />}>
            {currentCompany.name}
          </Tag>
        )}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {isSuperAdmin ? 'Full system access' : 
           isCompanyAdmin ? 'Full company access' : 'Analytics access within company'}
        </Text>
      </Space>
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
              {isSuperAdmin && (
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Select Company" required style={{ marginBottom: 0 }}>
                    <Select
                      value={filters.companyId}
                      onChange={(value) => handleFilterChange('companyId', value)}
                      placeholder="Select a company"
                      loading={loadingDropdowns}
                      style={{ width: '100%' }}
                    >
                      {companies.map(company => (
                        <Option key={company.id} value={company.id}>
                          {company.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Filter by Station" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.stationId}
                    onChange={(value) => handleFilterChange('stationId', value)}
                    placeholder="All Stations"
                    allowClear
                    style={{ width: '100%' }}
                    loading={loadingDropdowns}
                  >
                    {stations.map(station => (
                      <Option key={station.id} value={station.id}>
                        {station.name}
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
                    <Option value="station">By Station</Option>
                    <Option value="product">By Product</Option>
                    <Option value="day">By Day</Option>
                    <Option value="week">By Week</Option>
                    <Option value="month">By Month</Option>
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
                    <Option value={100}>100 items</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Options" style={{ marginBottom: 0 }}>
                  <Space>
                    <Checkbox
                      checked={filters.includeTrends}
                      onChange={(e) => handleFilterChange('includeTrends', e.target.checked)}
                    >
                      Include Trends
                    </Checkbox>
                    <Checkbox
                      checked={filters.includeComparison}
                      onChange={(e) => handleFilterChange('includeComparison', e.target.checked)}
                    >
                      Include Comparison
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
              {isSuperAdmin && (
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Select Company" required style={{ marginBottom: 0 }}>
                    <Select
                      value={filters.companyId}
                      onChange={(value) => handleFilterChange('companyId', value)}
                      placeholder="Select a company"
                      loading={loadingDropdowns}
                      style={{ width: '100%' }}
                    >
                      {companies.map(company => (
                        <Option key={company.id} value={company.id}>
                          {company.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Period" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.period}
                    onChange={(value) => handleFilterChange('period', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="daily">Daily</Option>
                    <Option value="weekly">Weekly</Option>
                    <Option value="monthly">Monthly</Option>
                    <Option value="quarterly">Quarterly</Option>
                    <Option value="yearly">Yearly</Option>
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
            
            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Data Points" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.dataPoints}
                    onChange={(value) => handleFilterChange('dataPoints', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value={7}>7 days</Option>
                    <Option value={30}>30 days</Option>
                    <Option value={90}>90 days</Option>
                    <Option value={180}>180 days</Option>
                    <Option value={365}>1 year</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Chart Type" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.chartType}
                    onChange={(value) => handleFilterChange('chartType', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="line">Line Chart</Option>
                    <Option value="bar">Bar Chart</Option>
                    <Option value="area">Area Chart</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {commonFilters}
          </>
        );

      case 'comparison':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              {isSuperAdmin && (
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Select Company" required style={{ marginBottom: 0 }}>
                    <Select
                      value={filters.companyId}
                      onChange={(value) => handleFilterChange('companyId', value)}
                      placeholder="Select a company"
                      loading={loadingDropdowns}
                      style={{ width: '100%' }}
                    >
                      {companies.map(company => (
                        <Option key={company.id} value={company.id}>
                          {company.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Compare With" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.compareWith}
                    onChange={(value) => handleFilterChange('compareWith', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="previous_period">Previous Period</Option>
                    <Option value="same_period_last_year">Same Period Last Year</Option>
                    <Option value="budget">Budget</Option>
                    <Option value="stations">Between Stations</Option>
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
                    <Option value="growth">Growth %</Option>
                    <Option value="efficiency">Efficiency</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {filters.compareWith === 'stations' && (
              <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                <Col xs={24} sm={12} md={12}>
                  <Form.Item label="Compare Stations" style={{ marginBottom: 0 }}>
                    <Select
                      mode="multiple"
                      value={filters.compareStations}
                      onChange={(value) => handleFilterChange('compareStations', value)}
                      placeholder="Select stations to compare"
                      style={{ width: '100%' }}
                      loading={loadingDropdowns}
                    >
                      {stations.map(station => (
                        <Option key={station.id} value={station.id}>
                          {station.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col xs={24} sm={12} md={12}>
                  <Form.Item label="Compare Products" style={{ marginBottom: 0 }}>
                    <Select
                      mode="multiple"
                      value={filters.compareProducts}
                      onChange={(value) => handleFilterChange('compareProducts', value)}
                      placeholder="Select products to compare"
                      style={{ width: '100%' }}
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
            )}
            
            {commonFilters}
          </>
        );

      case 'stations':
      case 'products':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              {isSuperAdmin && (
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Select Company" required style={{ marginBottom: 0 }}>
                    <Select
                      value={filters.companyId}
                      onChange={(value) => handleFilterChange('companyId', value)}
                      placeholder="Select a company"
                      loading={loadingDropdowns}
                      style={{ width: '100%' }}
                    >
                      {companies.map(company => (
                        <Option key={company.id} value={company.id}>
                          {company.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
              
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
                    <Option value={100}>100 items</Option>
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
              {isSuperAdmin && (
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Select Company" required style={{ marginBottom: 0 }}>
                    <Select
                      value={filters.companyId}
                      onChange={(value) => handleFilterChange('companyId', value)}
                      placeholder="Select a company"
                      loading={loadingDropdowns}
                      style={{ width: '100%' }}
                    >
                      {companies.map(company => (
                        <Option key={company.id} value={company.id}>
                          {company.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
              
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
                <Form.Item label="Filter by Station" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.stationId}
                    onChange={(value) => handleFilterChange('stationId', value)}
                    placeholder="All Stations"
                    allowClear
                    style={{ width: '100%' }}
                    loading={loadingDropdowns}
                  >
                    {stations.map(station => (
                      <Option key={station.id} value={station.id}>
                        {station.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </>
        );

      case 'real_time':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              {isSuperAdmin && (
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Select Company" required style={{ marginBottom: 0 }}>
                    <Select
                      value={filters.companyId}
                      onChange={(value) => handleFilterChange('companyId', value)}
                      placeholder="Select a company"
                      loading={loadingDropdowns}
                      style={{ width: '100%' }}
                    >
                      {companies.map(company => (
                        <Option key={company.id} value={company.id}>
                          {company.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
              
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
          </>
        );

      case 'export':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              {isSuperAdmin && (
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Select Company" required style={{ marginBottom: 0 }}>
                    <Select
                      value={filters.companyId}
                      onChange={(value) => handleFilterChange('companyId', value)}
                      placeholder="Select a company"
                      loading={loadingDropdowns}
                      style={{ width: '100%' }}
                    >
                      {companies.map(company => (
                        <Option key={company.id} value={company.id}>
                          {company.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
              
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
                <Form.Item label="Filter by Station" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.stationId}
                    onChange={(value) => handleFilterChange('stationId', value)}
                    placeholder="All Stations"
                    allowClear
                    style={{ width: '100%' }}
                    loading={loadingDropdowns}
                  >
                    {stations.map(station => (
                      <Option key={station.id} value={station.id}>
                        {station.name}
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
      case 'stations':
        columns = [
          {
            title: '#',
            key: 'index',
            render: (_, __, index) => index + 1,
            width: 50
          },
          {
            title: 'Station Name',
            dataIndex: 'name',
            key: 'name',
            width: 200,
            render: (value, record) => (
              <Space direction="vertical" size={0}>
                <Text strong>{value}</Text>
                {record.location && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {record.location}
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
              <Tag color={value === 'station' ? 'blue' : 'green'}>
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
            title: 'Shifts',
            dataIndex: 'shiftCount',
            key: 'shifts',
            width: 80,
            render: (value) => value || 0
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

      case 'trends':
        columns = [
          {
            title: 'Period',
            dataIndex: 'period',
            key: 'period',
            width: 150,
            render: (value) => dayjs(value).format('MMM DD, YYYY')
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

      case 'comparison':
        columns = [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            width: 200
          },
          {
            title: 'Current Period',
            dataIndex: 'totalRevenue',
            key: 'current',
            width: 150,
            render: (value) => fuelAnalyticsUtils.formatCurrency(value)
          },
          {
            title: 'Previous Period',
            dataIndex: 'previousRevenue',
            key: 'previous',
            width: 150,
            render: (value) => fuelAnalyticsUtils.formatCurrency(value || 0)
          },
          {
            title: 'Growth',
            key: 'growth',
            width: 120,
            render: (record) => {
              const growth = fuelAnalyticsUtils.calculateGrowth(
                record.totalRevenue,
                record.previousRevenue || 0
              );
              
              return (
                <Tag color={growth > 0 ? 'green' : growth < 0 ? 'red' : 'blue'}>
                  {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                </Tag>
              );
            }
          },
          {
            title: 'Difference',
            key: 'difference',
            width: 150,
            render: (record) => {
              const difference = record.totalRevenue - (record.previousRevenue || 0);
              return (
                <Text type={difference > 0 ? 'success' : difference < 0 ? 'danger' : 'secondary'}>
                  {difference > 0 ? '+' : ''}{fuelAnalyticsUtils.formatCurrency(difference)}
                </Text>
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
      'Date Range': `${filters.startDate} to ${filters.endDate}`,
      'Generated At': new Date().toISOString()
    }));

    const exportTitle = `${TABS[activeTab].label} - ${currentCompany?.name || 'Company'} Analytics`;
    const fileName = `company_analytics_${activeTab}_${filters.startDate}_to_${filters.endDate}`;

    return (
      <AdvancedReportGenerator
        dataSource={exportData}
        title={exportTitle}
        fileName={fileName}
        summaryData={summary}
        reportType="analytics"
        companyInfo={currentCompany}
        enableCustomization={true}
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
              <span>Export Analytics Data</span>
            </Space>
          }
          extra={renderExportButton()}
        >
          <Form form={form} layout="vertical">
            {renderFilterControls()}
          </Form>
          
          <Alert
            message="Export Information"
            description="Select your export preferences and click 'Export Data' to download the analytics report. The export will include all data matching your filters."
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
    <div className="company-fuel-sales">
      <Card style={{ margin: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            <DashboardOutlined /> Company Fuel Analytics
          </Title>
          <Text type="secondary">
            Comprehensive company-wide fuel analytics and reporting
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

export default CompanyFuelSales;