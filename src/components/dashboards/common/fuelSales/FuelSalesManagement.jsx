// src/components/analytics/fuel/FuelAnalyticsManagement.jsx
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
  Modal,
  Descriptions,
  InputNumber,
  Segmented
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
  SettingOutlined,
  AreaChartOutlined,
  PercentageOutlined,
  SortDescendingOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  CrownOutlined,
  TeamOutlined,
  UserOutlined,
  DatabaseOutlined,
  DashboardOutlined,
  HistoryOutlined,
  RocketOutlined,
  BuildOutlined,
  SafetyOutlined,
  BulbOutlined,
  ApiOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApp } from '../../../../context/AppContext';
import FuelAnalyticsService from '../../../../services/fuelSalesService/FuelAnalyticsService';
import { stationService } from '../../../../services/stationService/stationService';
import { companyService } from '../../../../services/companyService/companyService';
import { fuelService } from '../../../../services/fuelService/fuelService';
import AdvancedReportGenerator from '../downloadable/AdvancedReportGenerator';
import './FuelSalesManagement.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Role constants from backend
const ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  LINES_MANAGER: 'LINES_MANAGER',
  STATION_MANAGER: 'STATION_MANAGER',
  SUPERVISOR: 'SUPERVISOR',
  ATTENDANT: 'ATTENDANT'
};

// Role-based access configuration matching backend middleware
const ROLE_ACCESS = {
  // Super Admin - Access to everything
  [ROLE.SUPER_ADMIN]: {
    name: 'Super Admin',
    level: 'system',
    canAccessCompanyLevel: true,
    canAccessStationLevel: true,
    canAccessShiftLevel: true,
    canAccessProductLevel: true,
    canAccessPumpLevel: true,
    canExport: true,
    canClearCache: true,
    canViewRealTime: true,
    allowedTabs: [
      'company_dashboard', 'company_trends', 'company_comparison',
      'station_dashboard', 'station_trends', 'pump_performance',
      'station_products', 'station_shifts', 'shift_details',
      'product_performance', 'pump_details', 'quick_access',
      'real_time', 'export', 'system'
    ],
    defaultTab: 'company_dashboard',
    description: 'Full system access across all companies'
  },

  // Company Admin - Access to their company and stations
  [ROLE.COMPANY_ADMIN]: {
    name: 'Company Admin',
    level: 'company',
    canAccessCompanyLevel: true,
    canAccessStationLevel: true,
    canAccessShiftLevel: true,
    canAccessProductLevel: true,
    canAccessPumpLevel: true,
    canExport: true,
    canClearCache: true,
    canViewRealTime: true,
    allowedTabs: [
      'company_dashboard', 'company_trends', 'company_comparison',
      'station_dashboard', 'station_trends', 'pump_performance',
      'station_products', 'station_shifts', 'shift_details',
      'product_performance', 'pump_details', 'quick_access',
      'real_time'
    ],
    defaultTab: 'company_dashboard',
    description: 'Full access within assigned company'
  },

  // Lines Manager - Similar to Company Admin
  [ROLE.LINES_MANAGER]: {
    name: 'Lines Manager',
    level: 'company',
    canAccessCompanyLevel: true,
    canAccessStationLevel: true,
    canAccessShiftLevel: true,
    canAccessProductLevel: true,
    canAccessPumpLevel: true,
    canExport: true,
    canClearCache: false,
    canViewRealTime: true,
    allowedTabs: [
      'company_dashboard', 'company_trends',
      'station_dashboard', 'station_trends', 'pump_performance',
      'station_products', 'station_shifts', 'shift_details',
      'product_performance', 'pump_details', 'quick_access',
      'real_time'
    ],
    defaultTab: 'company_dashboard',
    description: 'Analytics access within company'
  },

  // Station Manager - Access to their station(s)
  [ROLE.STATION_MANAGER]: {
    name: 'Station Manager',
    level: 'station',
    canAccessCompanyLevel: false,
    canAccessStationLevel: true,
    canAccessShiftLevel: true,
    canAccessProductLevel: true,
    canAccessPumpLevel: true,
    canExport: true,
    canClearCache: false,
    canViewRealTime: true,
    allowedTabs: [
      'station_dashboard', 'station_trends', 'pump_performance',
      'station_products', 'station_shifts', 'shift_details',
      'product_performance', 'pump_details', 'quick_access',
      'real_time'
    ],
    defaultTab: 'station_dashboard',
    description: 'Access to assigned station(s)'
  },

  // Supervisor - Access to assigned stations/shifts
  [ROLE.SUPERVISOR]: {
    name: 'Supervisor',
    level: 'station',
    canAccessCompanyLevel: false,
    canAccessStationLevel: true,
    canAccessShiftLevel: true,
    canAccessProductLevel: true,
    canAccessPumpLevel: false,
    canExport: false,
    canClearCache: false,
    canViewRealTime: true,
    allowedTabs: [
      'station_dashboard', 'station_trends',
      'station_products', 'station_shifts', 'shift_details',
      'product_performance', 'quick_access'
    ],
    defaultTab: 'station_dashboard',
    description: 'Access to assigned shifts and stations'
  },

  // Attendant - Limited access
  [ROLE.ATTENDANT]: {
    name: 'Attendant',
    level: 'shift',
    canAccessCompanyLevel: false,
    canAccessStationLevel: false,
    canAccessShiftLevel: true,
    canAccessProductLevel: false,
    canAccessPumpLevel: false,
    canExport: false,
    canClearCache: false,
    canViewRealTime: false,
    allowedTabs: ['shift_details', 'quick_access'],
    defaultTab: 'shift_details',
    description: 'Limited shift-level access'
  }
};

// Tab configuration
const TABS = {
  company_dashboard: {
    key: 'company_dashboard',
    label: 'Company Dashboard',
    icon: <DashboardOutlined />,
    level: 'company',
    description: 'Company-wide overview and metrics'
  },
  company_trends: {
    key: 'company_trends',
    label: 'Company Trends',
    icon: <LineChartOutlined />,
    level: 'company',
    description: 'Time-based analysis for company'
  },
  company_comparison: {
    key: 'company_comparison',
    label: 'Company Comparison',
    icon: <BarChartOutlined />,
    level: 'company',
    description: 'Compare stations/products'
  },
  station_dashboard: {
    key: 'station_dashboard',
    label: 'Station Dashboard',
    icon: <ShopOutlined />,
    level: 'station',
    description: 'Station overview and performance'
  },
  station_trends: {
    key: 'station_trends',
    label: 'Station Trends',
    icon: <AreaChartOutlined />,
    level: 'station',
    description: 'Time-based station analysis'
  },
  pump_performance: {
    key: 'pump_performance',
    label: 'Pump Performance',
    icon: <RocketOutlined />,
    level: 'station',
    description: 'Pump ranking and efficiency'
  },
  station_products: {
    key: 'station_products',
    label: 'Station Products',
    icon: <ProductOutlined />,
    level: 'station',
    description: 'Product performance at station'
  },
  station_shifts: {
    key: 'station_shifts',
    label: 'Station Shifts',
    icon: <HistoryOutlined />,
    level: 'station',
    description: 'All shifts for this station'
  },
  shift_details: {
    key: 'shift_details',
    label: 'Shift Details',
    icon: <ClockCircleOutlined />,
    level: 'shift',
    description: 'Detailed shift breakdown'
  },
  product_performance: {
    key: 'product_performance',
    label: 'Product Performance',
    icon: <BulbOutlined />,
    level: 'product',
    description: 'Product performance across stations'
  },
  pump_details: {
    key: 'pump_details',
    label: 'Pump Details',
    icon: <BuildOutlined />,
    level: 'pump',
    description: 'Individual pump performance'
  },
  quick_access: {
    key: 'quick_access',
    label: 'Quick Access',
    icon: <SafetyOutlined />,
    level: 'mixed',
    description: 'Today, yesterday, week, month views'
  },
  real_time: {
    key: 'real_time',
    label: 'Real-Time',
    icon: <ApiOutlined />,
    level: 'mixed',
    description: 'Live sales data'
  },
  export: {
    key: 'export',
    label: 'Export',
    icon: <DownloadOutlined />,
    level: 'mixed',
    description: 'Export analytics data'
  },
  system: {
    key: 'system',
    label: 'System',
    icon: <DatabaseOutlined />,
    level: 'system',
    description: 'System status and cache'
  }
};

const FuelSalesManagement = () => {
  const { state } = useApp();
  const [form] = Form.useForm();
  
  // Use refs to track initialization and prevent loops
  const initializedRef = useRef(false);
  const filtersChangedRef = useRef(false);
  const fetchTimeoutRef = useRef(null);
  
  // Memoize user context to prevent unnecessary re-renders
  const currentUser = useMemo(() => state.currentUser, [state.currentUser]);
  const currentStation = useMemo(() => state.currentStation, [state.currentStation]);
  const currentCompany = useMemo(() => state.currentCompany, [state.currentCompany]);
  
  // Memoize role-based calculations
  const userRole = useMemo(() => currentUser?.role || ROLE.ATTENDANT, [currentUser]);
  const userAccess = useMemo(() => ROLE_ACCESS[userRole] || ROLE_ACCESS[ROLE.ATTENDANT], [userRole]);
  const isSuperAdmin = useMemo(() => userRole === ROLE.SUPER_ADMIN, [userRole]);
  const isCompanyAdmin = useMemo(() => userRole === ROLE.COMPANY_ADMIN || userRole === ROLE.LINES_MANAGER, [userRole]);
  const isStationManager = useMemo(() => userRole === ROLE.STATION_MANAGER, [userRole]);
  const isSupervisor = useMemo(() => userRole === ROLE.SUPERVISOR, [userRole]);
  
  // State for UI
  const [activeTab, setActiveTab] = useState(userAccess.defaultTab);
  const [loading, setLoading] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  
  // Data states
  const [analyticsData, setAnalyticsData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [tableData, setTableData] = useState([]);
  
  // Dropdown data states
  const [companies, setCompanies] = useState([]);
  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [userStations, setUserStations] = useState([]);
  
  // Initial filters - created once
  const initialFilters = useMemo(() => ({
    // Company Level
    companyId: null,
    companyGroupBy: 'station',
    companyIncludeTrends: true,
    companyMetric: 'revenue',
    
    // Station Level
    stationId: null,
    stationGroupBy: 'product',
    stationIncludeDetails: false,
    stationPeriod: 'daily',
    
    // Pump Level
    pumpId: null,
    rankingMetric: 'liters',
    includeHistory: true,
    
    // Shift Level
    shiftId: null,
    includePumpDetails: true,
    includeProductSummary: true,
    
    // Product Level
    productId: null,
    includeStationBreakdown: false,
    compareAcross: 'stations',
    
    // Quick Access
    quickAccessType: 'today',
    
    // Real-time
    lastHours: 24,
    updateInterval: 60,
    
    // Common
    startDate: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    stationIds: [],
    productIds: [],
    pumpIds: [],
    shiftIds: [],
    shiftStatus: 'CLOSED',
    readingType: 'END',
    
    // Pagination
    page: 1,
    limit: 20,
    sortBy: 'recordedAt',
    sortOrder: 'desc'
  }), []);
  
  const [filters, setFilters] = useState(initialFilters);

  // ========== INITIALIZATION ==========
  
  useEffect(() => {
    if (initializedRef.current) return;
    
    const init = async () => {
      try {
        setLoadingDropdowns(true);
        initializedRef.current = true;
        
        // Set initial values based on user role
        let companyId = null;
        let stationId = null;
        
        if (isSuperAdmin) {
          await loadCompanies();
        } else if (isCompanyAdmin && currentCompany?.id) {
          companyId = currentCompany.id;
          await loadStations(companyId);
        } else if ((isStationManager || isSupervisor) && currentStation?.id) {
          stationId = currentStation.id;
        }
        
        // Set initial filters
        setFilters(prev => ({
          ...prev,
          companyId,
          stationId
        }));
        
        // Load additional data
        if (userAccess.canAccessProductLevel) {
          await loadProducts();
        }
        
        if (userAccess.canAccessShiftLevel) {
          await loadShifts();
        }
        
        if (!isSuperAdmin && currentUser?.id) {
          await loadUserStations();
        }
        
      } catch (error) {
        console.error('Failed to initialize user context:', error);
        message.error('Failed to initialize analytics context');
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
  }, [isSuperAdmin, isCompanyAdmin, isStationManager, isSupervisor, currentCompany?.id, currentStation?.id, currentUser?.id, userAccess]);

  // ========== DATA LOADING FUNCTIONS ==========
  
  const loadCompanies = useCallback(async () => {
    try {
      const response = await companyService.getCompanies();
      let companiesArray = [];
      
      if (Array.isArray(response)) {
        companiesArray = response;
      } else if (response.success && Array.isArray(response.data)) {
        companiesArray = response.data;
      }
      
      setCompanies(companiesArray);
      
      // Auto-select first company if only one exists
      if (companiesArray.length === 1) {
        setFilters(prev => ({ ...prev, companyId: companiesArray[0].id }));
        await loadStations(companiesArray[0].id);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
      throw error;
    }
  }, []);

  const loadStations = useCallback(async (companyId) => {
    try {
      const response = await stationService.getCompanyStations(companyId);
      let stationsArray = [];
      
      if (Array.isArray(response)) {
        stationsArray = response;
      } else if (response.success && Array.isArray(response.data)) {
        stationsArray = response.data;
      } else if (response.data && Array.isArray(response.data.stations)) {
        stationsArray = response.data.stations;
      }
      
      setStations(stationsArray);
      
    } catch (error) {
      console.error('Failed to load stations:', error);
      throw error;
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const response = await fuelService.getFuelProducts();
      let productsArray = [];
      
      if (Array.isArray(response)) {
        productsArray = response;
      } else if (response.success && Array.isArray(response.data)) {
        productsArray = response.data;
      } else if (response.data && Array.isArray(response.data.products)) {
        productsArray = response.data.products;
      }
      
      setProducts(productsArray);
    } catch (error) {
      console.error('Failed to load products:', error);
      throw error;
    }
  }, []);

  const loadShifts = useCallback(async () => {
    try {
      const stationIds = userAccess.canAccessStationLevel ? 
        (filters.stationId ? [filters.stationId] : []) : [];
      
      if (stationIds.length > 0) {
        // TODO: Implement shifts service
        // const response = await shiftsService.getShifts({ stationIds });
        // setShifts(response);
      }
    } catch (error) {
      console.error('Failed to load shifts:', error);
      throw error;
    }
  }, [filters.stationId, userAccess]);

  const loadUserStations = useCallback(async () => {
    try {
      if (currentStation?.id) {
        setUserStations([currentStation]);
      }
    } catch (error) {
      console.error('Failed to load user stations:', error);
      throw error;
    }
  }, [currentStation]);

  // ========== FILTER HANDLERS ==========
  
  const handleFilterChange = useCallback((key, value) => {
    filtersChangedRef.current = true;
    
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // Reset page when filters change
      if (key !== 'page' && key !== 'limit') {
        newFilters.page = 1;
      }
      
      return newFilters;
    });
    
    // Handle dependent loads
    if (key === 'companyId' && value) {
      setTimeout(() => loadStations(value), 100);
    }
  }, [loadStations]);

  const handleDateRangeChange = useCallback((dates, dateStrings) => {
    if (dates) {
      filtersChangedRef.current = true;
      setFilters(prev => ({
        ...prev,
        startDate: dateStrings[0],
        endDate: dateStrings[1],
        page: 1
      }));
    }
  }, []);

  // ========== ACCESS CONTROL ==========
  
  const canAccessTab = useCallback((tabKey) => {
    return userAccess.allowedTabs.includes(tabKey);
  }, [userAccess]);

  const canAccessCompany = useCallback((companyId) => {
    if (isSuperAdmin) return true;
    if (isCompanyAdmin && currentCompany?.id === companyId) return true;
    return false;
  }, [isSuperAdmin, isCompanyAdmin, currentCompany?.id]);

  const canAccessStation = useCallback((stationId) => {
    if (isSuperAdmin) return true;
    if (isCompanyAdmin && stations.some(s => s.id === stationId)) return true;
    if ((isStationManager || isSupervisor) && currentStation?.id === stationId) return true;
    return false;
  }, [isSuperAdmin, isCompanyAdmin, isStationManager, isSupervisor, currentStation?.id, stations]);

  // ========== DATA FETCHING ==========
  
  const fetchAnalyticsData = useCallback(async () => {
    if (!validateAccess()) {
      message.error('You do not have permission to access this data');
      return;
    }
    
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let result;
      const baseFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };
      
      console.log(`📡 Fetching ${activeTab} for user ${currentUser?.id} (${userRole})`);
      
      switch (activeTab) {
        case 'company_dashboard':
          if (!filters.companyId) {
            throw new Error('Please select a company');
          }
          result = await FuelAnalyticsService.getCompanyDashboard(filters.companyId, {
            ...baseFilters,
            groupBy: filters.companyGroupBy,
            includeTrends: filters.companyIncludeTrends
          });
          break;
          
        case 'company_trends':
          if (!filters.companyId) {
            throw new Error('Please select a company');
          }
          result = await FuelAnalyticsService.getCompanyTrends(filters.companyId, {
            ...baseFilters,
            period: 'monthly',
            metric: filters.companyMetric
          });
          break;
          
        case 'company_comparison':
          if (!filters.companyId) {
            throw new Error('Please select a company');
          }
          result = await FuelAnalyticsService.getCompanyComparison(filters.companyId, {
            ...baseFilters,
            metric: filters.companyMetric
          });
          break;
          
        case 'station_dashboard':
          if (!filters.stationId) {
            throw new Error('Please select a station');
          }
          result = await FuelAnalyticsService.getStationDashboard(filters.stationId, {
            ...baseFilters,
            groupBy: filters.stationGroupBy,
            includeDetails: filters.stationIncludeDetails
          });
          break;
          
        case 'station_trends':
          if (!filters.stationId) {
            throw new Error('Please select a station');
          }
          result = await FuelAnalyticsService.getStationTrends(filters.stationId, {
            ...baseFilters,
            period: filters.stationPeriod,
            metric: filters.companyMetric
          });
          break;
          
        case 'pump_performance':
          if (!filters.stationId) {
            throw new Error('Please select a station');
          }
          result = await FuelAnalyticsService.getPumpPerformance(filters.stationId, {
            ...baseFilters,
            rankingMetric: filters.rankingMetric
          });
          break;
          
        case 'station_products':
          if (!filters.stationId) {
            throw new Error('Please select a station');
          }
          result = await FuelAnalyticsService.getStationProducts(filters.stationId, baseFilters);
          break;
          
        case 'station_shifts':
          if (!filters.stationId) {
            throw new Error('Please select a station');
          }
          result = await FuelAnalyticsService.getStationShifts(filters.stationId, baseFilters);
          break;
          
        case 'shift_details':
          if (!filters.shiftId) {
            throw new Error('Please select a shift');
          }
          result = await FuelAnalyticsService.getShiftDetails(filters.shiftId, {
            includePumpDetails: filters.includePumpDetails,
            includeProductSummary: filters.includeProductSummary
          });
          break;
          
        case 'product_performance':
          if (!filters.productId) {
            throw new Error('Please select a product');
          }
          result = await FuelAnalyticsService.getProductPerformance(filters.productId, {
            ...baseFilters,
            includeStationBreakdown: filters.includeStationBreakdown,
            compareAcross: filters.compareAcross
          });
          break;
          
        case 'pump_details':
          if (!filters.pumpId) {
            throw new Error('Please select a pump');
          }
          result = await FuelAnalyticsService.getPumpDetails(filters.pumpId, {
            includeHistory: filters.includeHistory
          });
          break;
          
        case 'quick_access':
          result = await handleQuickAccess();
          break;
          
        case 'real_time':
          result = await FuelAnalyticsService.getRealTimeSales({
            ...baseFilters,
            lastHours: filters.lastHours,
            updateInterval: filters.updateInterval,
            companyId: isSuperAdmin ? filters.companyId : null,
            stationId: filters.stationId
          });
          break;
          
        default:
          throw new Error(`Unsupported tab: ${activeTab}`);
      }
      
      console.log(`✅ ${activeTab} result:`, result);
      
      setAnalyticsData(result);
      setSummary(result?.summary || null);
      setMeta(result?.meta || null);
      setTableData(result?.formattedData || result?.data || []);
      
      if (result?.formattedData?.length === 0) {
        message.info('No data found for the selected filters');
      }
    } catch (error) {
      console.error(`❌ Failed to fetch ${activeTab} data:`, error);
      setError(error.message || 'Failed to fetch analytics data');
      setAnalyticsData(null);
      setSummary(null);
      setMeta(null);
      setTableData([]);
      message.error(error.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
      filtersChangedRef.current = false;
    }
  }, [
    activeTab,
    filters,
    loading,
    isSuperAdmin,
    currentUser?.id,
    userRole,
    validateAccess
  ]);

  const validateAccess = useCallback(() => {
    switch (activeTab) {
      case 'company_dashboard':
      case 'company_trends':
      case 'company_comparison':
        if (!userAccess.canAccessCompanyLevel) return false;
        if (filters.companyId && !canAccessCompany(filters.companyId)) return false;
        break;
        
      case 'station_dashboard':
      case 'station_trends':
      case 'pump_performance':
      case 'station_products':
      case 'station_shifts':
        if (!userAccess.canAccessStationLevel) return false;
        if (filters.stationId && !canAccessStation(filters.stationId)) return false;
        break;
        
      case 'shift_details':
        if (!userAccess.canAccessShiftLevel) return false;
        break;
        
      case 'product_performance':
        if (!userAccess.canAccessProductLevel) return false;
        break;
        
      case 'pump_details':
        if (!userAccess.canAccessPumpLevel) return false;
        break;
        
      case 'real_time':
        if (!userAccess.canViewRealTime) return false;
        break;
    }
    return true;
  }, [activeTab, filters.companyId, filters.stationId, userAccess, canAccessCompany, canAccessStation]);

  const handleQuickAccess = useCallback(async () => {
    switch (filters.quickAccessType) {
      case 'today':
        return await FuelAnalyticsService.getTodaySales();
      case 'yesterday':
        return await FuelAnalyticsService.getYesterdaySales({
          companyId: isSuperAdmin ? filters.companyId : null,
          stationId: filters.stationId
        });
      case 'week':
        return await FuelAnalyticsService.getThisWeekSales();
      case 'month':
        return await FuelAnalyticsService.getThisMonthSales();
      default:
        throw new Error('Invalid quick access type');
    }
  }, [filters.quickAccessType, filters.companyId, filters.stationId, isSuperAdmin]);

  // ========== AUTO-FETCH LOGIC ==========
  
  const shouldFetchData = useCallback(() => {
    if (!initializedRef.current) return false;
    
    switch (activeTab) {
      case 'company_dashboard':
      case 'company_trends':
      case 'company_comparison':
        return !!filters.companyId;
      case 'station_dashboard':
      case 'station_trends':
      case 'pump_performance':
      case 'station_products':
      case 'station_shifts':
        return !!filters.stationId;
      case 'shift_details':
        return !!filters.shiftId;
      case 'product_performance':
        return !!filters.productId;
      case 'pump_details':
        return !!filters.pumpId;
      case 'quick_access':
      case 'real_time':
        return true;
      default:
        return false;
    }
  }, [activeTab, filters]);

  useEffect(() => {
    if (!shouldFetchData()) return;
    
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      if (filtersChangedRef.current) {
        fetchAnalyticsData();
      }
    }, 500);
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [
    filters.companyId,
    filters.stationId,
    filters.productId,
    filters.shiftId,
    filters.pumpId,
    filters.startDate,
    filters.endDate,
    filters.page,
    filters.limit,
    filters.sortBy,
    filters.sortOrder,
    activeTab,
    shouldFetchData,
    fetchAnalyticsData
  ]);

  // ========== UI HANDLERS ==========
  
  const handleTabChange = useCallback((key) => {
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
    filtersChangedRef.current = true;
  }, [canAccessTab]);

  // ========== FORMATTING FUNCTIONS ==========
  
  const formatCurrency = useCallback((amount) => {
    if (amount === null || amount === undefined) return 'KSh 0.00';
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }, []);

  const formatVolume = useCallback((liters) => {
    if (liters === null || liters === undefined) return '0 L';
    if (liters >= 1000000) {
      return `${(liters / 1000000).toFixed(2)}M L`;
    } else if (liters >= 1000) {
      return `${(liters / 1000).toFixed(1)}k L`;
    }
    return `${liters.toFixed(1)} L`;
  }, []);

  const formatPercentage = useCallback((value) => {
    if (value === null || value === undefined) return '0%';
    return `${value.toFixed(1)}%`;
  }, []);

  // ========== RENDER FUNCTIONS ==========
  
  const renderRoleInfo = useCallback(() => {
    const roleColor = isSuperAdmin ? 'red' : 
                     isCompanyAdmin ? 'blue' : 
                     isStationManager ? 'orange' : 
                     isSupervisor ? 'green' : 'default';
    
    const roleIcon = isSuperAdmin ? <CrownOutlined /> :
                     isCompanyAdmin ? <TeamOutlined /> :
                     isStationManager ? <ShopOutlined /> :
                     <UserOutlined />;

    return (
      <Space style={{ marginBottom: 16 }}>
        <Tag icon={roleIcon} color={roleColor}>
          {userAccess.name}
        </Tag>
        {currentStation && (
          <Tag color="blue" icon={<ShopOutlined />}>
            {currentStation.name}
          </Tag>
        )}
        {currentCompany && (
          <Tag color="green" icon={<TeamOutlined />}>
            {currentCompany.name}
          </Tag>
        )}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {userAccess.description}
        </Text>
      </Space>
    );
  }, [isSuperAdmin, isCompanyAdmin, isStationManager, isSupervisor, userAccess, currentStation, currentCompany]);

  // ========== FILTER CONTROLS ==========
  
  const renderStationDropdown = useCallback(() => {
    // Show station dropdown only for users who need it
    const showStationDropdown = isSuperAdmin || isCompanyAdmin;
    
    if (!showStationDropdown) {
      // Station-level users see their station as read-only
      if (currentStation?.name) {
        return (
          <Form.Item label="Station" style={{ marginBottom: 0 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                value={currentStation.name}
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
      }
      return null;
    }
    
    // Admin users see the dropdown
    return (
      <Form.Item label="Select Station" required style={{ marginBottom: 0 }}>
        <Select
          value={filters.stationId}
          onChange={(value) => handleFilterChange('stationId', value)}
          placeholder="Select a station"
          loading={loadingDropdowns}
          style={{ width: '100%' }}
          allowClear={isSuperAdmin}
        >
          {stations.map(station => (
            <Option key={station.id} value={station.id}>
              {typeof station === 'string' ? station : station.name || `Station ${station.id.substring(0, 8)}`}
            </Option>
          ))}
        </Select>
      </Form.Item>
    );
  }, [isSuperAdmin, isCompanyAdmin, currentStation, filters.stationId, loadingDropdowns, stations, handleFilterChange]);

  const renderFilterControls = useCallback(() => {
    const commonFilters = (
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Form.Item label="Date Range" style={{ marginBottom: 0 }}>
            <RangePicker
              value={[dayjs(filters.startDate), dayjs(filters.endDate)]}
              onChange={handleDateRangeChange}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabledDate={(current) => current && current > dayjs().endOf('day')}
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
              <Radio.Button value="charts">
                <LineChartOutlined /> Charts
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
      case 'company_dashboard':
      case 'company_trends':
      case 'company_comparison':
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
                <Form.Item label="Group By" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.companyGroupBy}
                    onChange={(value) => handleFilterChange('companyGroupBy', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="station">By Station</Option>
                    <Option value="product">By Product</Option>
                    <Option value="day">By Day</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Metric" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.companyMetric}
                    onChange={(value) => handleFilterChange('companyMetric', value)}
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

      case 'station_dashboard':
      case 'station_trends':
      case 'pump_performance':
      case 'station_products':
      case 'station_shifts':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                {renderStationDropdown()}
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Group By" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.stationGroupBy}
                    onChange={(value) => handleFilterChange('stationGroupBy', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="product">By Product</Option>
                    <Option value="pump">By Pump</Option>
                    <Option value="shift">By Shift</Option>
                    <Option value="day">By Day</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Options" style={{ marginBottom: 0 }}>
                  <Checkbox
                    checked={filters.stationIncludeDetails}
                    onChange={(e) => handleFilterChange('stationIncludeDetails', e.target.checked)}
                  >
                    Include Details
                  </Checkbox>
                </Form.Item>
              </Col>
            </Row>
            {commonFilters}
          </>
        );

      case 'shift_details':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Select Shift" required style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.shiftId}
                    onChange={(value) => handleFilterChange('shiftId', value)}
                    placeholder="Select a shift"
                    loading={loadingDropdowns}
                    style={{ width: '100%' }}
                  >
                    {shifts.map(shift => (
                      <Option key={shift.id} value={shift.id}>
                        Shift {shift.shiftNumber} - {dayjs(shift.startTime).format('DD/MM/YYYY')}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Options" style={{ marginBottom: 0 }}>
                  <Space direction="vertical">
                    <Checkbox
                      checked={filters.includePumpDetails}
                      onChange={(e) => handleFilterChange('includePumpDetails', e.target.checked)}
                    >
                      Show Pump Details
                    </Checkbox>
                    <Checkbox
                      checked={filters.includeProductSummary}
                      onChange={(e) => handleFilterChange('includeProductSummary', e.target.checked)}
                    >
                      Show Product Summary
                    </Checkbox>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </>
        );

      case 'product_performance':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Select Product" required style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.productId}
                    onChange={(value) => handleFilterChange('productId', value)}
                    placeholder="Select a product"
                    loading={loadingDropdowns}
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
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Filter by Station" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.stationId}
                    onChange={(value) => handleFilterChange('stationId', value)}
                    placeholder="All Stations"
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {stations.map(station => (
                      <Option key={station.id} value={station.id}>
                        {typeof station === 'string' ? station : station.name}
                      </Option>
                    ))}
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
              {isSuperAdmin && filters.quickAccessType === 'yesterday' && (
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Select Company" style={{ marginBottom: 0 }}>
                    <Select
                      value={filters.companyId}
                      onChange={(value) => handleFilterChange('companyId', value)}
                      placeholder="Select company"
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
            </Row>
          </>
        );

      case 'real_time':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Last (hours)" style={{ marginBottom: 0 }}>
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
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Update (seconds)" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.updateInterval}
                    onChange={(value) => handleFilterChange('updateInterval', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value={10}>10s</Option>
                    <Option value={30}>30s</Option>
                    <Option value={60}>60s</Option>
                    <Option value={300}>5m</Option>
                  </Select>
                </Form.Item>
              </Col>
              {isSuperAdmin && (
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Select Company" style={{ marginBottom: 0 }}>
                    <Select
                      value={filters.companyId}
                      onChange={(value) => handleFilterChange('companyId', value)}
                      placeholder="All Companies"
                      allowClear
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
              {filters.companyId && (
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Select Station" style={{ marginBottom: 0 }}>
                    <Select
                      value={filters.stationId}
                      onChange={(value) => handleFilterChange('stationId', value)}
                      placeholder="All Stations"
                      allowClear
                      style={{ width: '100%' }}
                    >
                      {stations.map(station => (
                        <Option key={station.id} value={station.id}>
                          {typeof station === 'string' ? station : station.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
            </Row>
          </>
        );

      default:
        return commonFilters;
    }
  }, [
    activeTab,
    filters,
    viewMode,
    loadingDropdowns,
    companies,
    stations,
    products,
    shifts,
    isSuperAdmin,
    isCompanyAdmin,
    currentStation,
    handleFilterChange,
    handleDateRangeChange,
    renderStationDropdown
  ]);

  // ========== DATA TABLE RENDERING ==========
  
  const getTableColumns = useCallback(() => {
    const baseColumns = [
      {
        title: '#',
        key: 'index',
        render: (_, __, index) => index + 1,
        width: 50,
        fixed: 'left'
      },
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        render: (value, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{value}</Text>
            {record.productCode && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.productCode}
              </Text>
            )}
          </Space>
        )
      }
    ];

    switch (activeTab) {
      case 'company_dashboard':
      case 'company_comparison':
        return [
          ...baseColumns,
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
            width: 100,
            render: (value) => formatVolume(value)
          },
          {
            title: 'Revenue',
            dataIndex: 'totalRevenue',
            key: 'revenue',
            width: 120,
            render: (value) => formatCurrency(value)
          },
          {
            title: 'Unit Price',
            dataIndex: 'avgUnitPrice',
            key: 'unitPrice',
            width: 100,
            render: (value) => formatCurrency(value)
          },
          {
            title: 'Transactions',
            dataIndex: 'transactionCount',
            key: 'transactions',
            width: 100,
            render: (value) => value || 0
          }
        ];

      case 'pump_performance':
        return [
          {
            title: '#',
            key: 'rank',
            dataIndex: 'rank',
            width: 60,
            fixed: 'left',
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
            )
          },
          ...baseColumns,
          {
            title: 'Station Label',
            dataIndex: 'stationLabel',
            key: 'stationLabel',
            width: 120
          },
          {
            title: 'Liters',
            dataIndex: 'totalLiters',
            key: 'liters',
            width: 100,
            render: (value) => formatVolume(value)
          },
          {
            title: 'Efficiency',
            dataIndex: 'efficiencyScore',
            key: 'efficiency',
            width: 100,
            render: (value) => `${value?.toFixed(1)}%`
          },
          {
            title: 'Utilization',
            dataIndex: 'utilizationRate',
            key: 'utilization',
            width: 100,
            render: (value) => formatPercentage(value)
          }
        ];

      case 'shift_details':
        if (analyticsData?.data?.pumpSales) {
          return [
            ...baseColumns,
            {
              title: 'Pump',
              dataIndex: 'pumpName',
              key: 'pump',
              width: 120
            },
            {
              title: 'Island',
              dataIndex: 'islandCode',
              key: 'island',
              width: 80
            },
            {
              title: 'Liters',
              dataIndex: 'totalLiters',
              key: 'liters',
              width: 100,
              render: (value) => formatVolume(value)
            },
            {
              title: 'Revenue',
              dataIndex: 'totalRevenue',
              key: 'revenue',
              width: 120,
              render: (value) => formatCurrency(value)
            }
          ];
        } else {
          return [
            ...baseColumns,
            {
              title: 'Product Code',
              dataIndex: 'productCode',
              key: 'productCode',
              width: 100
            },
            {
              title: 'Liters',
              dataIndex: 'totalLiters',
              key: 'liters',
              width: 100,
              render: (value) => formatVolume(value)
            },
            {
              title: 'Revenue',
              dataIndex: 'totalRevenue',
              key: 'revenue',
              width: 120,
              render: (value) => formatCurrency(value)
            },
            {
              title: 'Pumps',
              dataIndex: 'pumpCount',
              key: 'pumps',
              width: 80
            }
          ];
        }

      default:
        return [
          ...baseColumns,
          {
            title: 'Liters',
            dataIndex: 'totalLiters',
            key: 'liters',
            width: 100,
            render: (value) => formatVolume(value)
          },
          {
            title: 'Revenue',
            dataIndex: 'totalRevenue',
            key: 'revenue',
            width: 120,
            render: (value) => formatCurrency(value)
          },
          {
            title: 'Unit Price',
            dataIndex: 'avgUnitPrice',
            key: 'unitPrice',
            width: 100,
            render: (value) => formatCurrency(value)
          }
        ];
    }
  }, [activeTab, analyticsData, formatVolume, formatCurrency, formatPercentage]);

  const renderTableSummary = useCallback(() => {
    const totalLiters = tableData.reduce((sum, item) => sum + (item.totalLiters || 0), 0);
    const totalRevenue = tableData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
    const totalTransactions = tableData.reduce((sum, item) => sum + (item.transactionCount || 0), 0);
    const avgUnitPrice = totalLiters > 0 ? totalRevenue / totalLiters : 0;

    return (
      <Table.Summary fixed>
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} colSpan={2}>
            <Space>
              <Text strong>Totals:</Text>
              <Text type="secondary">{tableData.length} items</Text>
            </Space>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={1}>
            <Text strong>{formatVolume(totalLiters)}</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={2}>
            <Text strong>{formatCurrency(totalRevenue)}</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={3}>
            <Text strong>{formatCurrency(avgUnitPrice)}</Text>
          </Table.Summary.Cell>
          {activeTab.includes('company') && (
            <Table.Summary.Cell index={4}>
              <Text strong>{totalTransactions}</Text>
            </Table.Summary.Cell>
          )}
        </Table.Summary.Row>
      </Table.Summary>
    );
  }, [tableData, activeTab, formatVolume, formatCurrency]);

  const renderDataTable = useCallback(() => {
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

    const columns = getTableColumns();

    return (
      <Table
        columns={columns}
        dataSource={tableData}
        rowKey={(record) => record.id || Math.random().toString()}
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
        summary={() => renderTableSummary()}
      />
    );
  }, [tableData, getTableColumns, filters, analyticsData, loading, handleFilterChange, renderTableSummary]);

  // ========== SUMMARY CARDS ==========
  
  const renderSummaryCards = useCallback(() => {
    if (!analyticsData?.summary) return null;

    const summary = analyticsData.summary;

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
                Daily: {formatVolume(summary.dailyAverage.liters)}
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
                Daily: {formatCurrency(summary.dailyAverage.revenue)}
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
  }, [analyticsData, formatVolume, formatCurrency]);

  // ========== EXPORT BUTTON ==========
  
  const renderExportButton = useCallback(() => {
    if (!userAccess.canExport || !analyticsData) {
      return null;
    }

    const tabInfo = TABS[activeTab];
    const fileName = `fuel_analytics_${activeTab}_${filters.startDate}_to_${filters.endDate}`;
    const exportTitle = `${tabInfo.label} - Fuel Analytics Report`;

    const exportData = tableData.map((item, index) => ({
      '#': index + 1,
      Name: item.name,
      'Product Code': item.productCode || 'N/A',
      Liters: item.totalLiters || 0,
      Revenue: item.totalRevenue || 0,
      'Unit Price': item.avgUnitPrice || 0,
      Transactions: item.transactionCount || 0,
      Efficiency: item.efficiencyScore || 'N/A',
      Utilization: item.utilizationRate || 'N/A',
      'Generated By': currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System',
      'User Role': userRole,
      'Date Range': `${filters.startDate} to ${filters.endDate}`
    }));

    const summaryData = {
      'Total Records': tableData.length,
      'Total Liters': formatVolume(analyticsData.summary?.totalLiters || 0),
      'Total Revenue': formatCurrency(analyticsData.summary?.totalRevenue || 0),
      'Average Unit Price': formatCurrency(analyticsData.summary?.avgUnitPrice || 0),
      'Total Transactions': analyticsData.summary?.totalTransactions || 0,
      'Date Range': `${filters.startDate} to ${filters.endDate}`,
      'Report Type': tabInfo.label,
      'Generated By': currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System',
      'User Role': userRole,
      'Access Level': userAccess.level
    };

    return (
      <AdvancedReportGenerator
        dataSource={exportData}
        title={exportTitle}
        fileName={fileName}
        summaryData={summaryData}
        reportType="analytics"
        stationInfo={currentStation}
        companyInfo={currentCompany}
        footerText={`Generated from Lynx Energy System | User: ${userAccess.name} | ${new Date().toLocaleDateString()}`}
        showFooter={true}
        enableCustomization={true}
      />
    );
  }, [userAccess, analyticsData, activeTab, filters, tableData, currentUser, userRole, currentStation, currentCompany, formatVolume, formatCurrency]);

  // ========== TABS RENDERING ==========
  
  const renderTabs = useCallback(() => {
    const tabItems = [];

    Object.values(TABS).forEach(tab => {
      if (canAccessTab(tab.key)) {
        tabItems.push(
          <TabPane
            tab={
              <span>
                {tab.icon}
                {tab.label}
              </span>
            }
            key={tab.key}
          >
            <Card
              title={
                <Space>
                  <FilterOutlined />
                  <span>Filters</span>
                  <Tag color="blue">{tab.description}</Tag>
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
              title={tab.label}
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
          </TabPane>
        );
      }
    });

    return tabItems;
  }, [
    canAccessTab,
    error,
    loading,
    analyticsData,
    tableData,
    fetchAnalyticsData,
    renderFilterControls,
    renderSummaryCards,
    renderExportButton,
    renderDataTable
  ]);

  // ========== MAIN RENDER ==========
  
  if (!userAccess.allowedTabs.length) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Alert
          message="Access Denied"
          description="You do not have permission to access fuel analytics. Please contact your administrator."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="fuel-analytics-management">
      <Card style={{ margin: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            <DashboardOutlined /> Fuel Analytics Dashboard
          </Title>
          <Text type="secondary">
            Comprehensive fuel analytics with role-based access control
          </Text>
          
          {/* User Role Information */}
          {renderRoleInfo()}
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          type="card"
          size="large"
        >
          {renderTabs()}
        </Tabs>

        {meta && (
          <div style={{ marginTop: 24, padding: 16, backgroundColor: '#fafafa', borderRadius: 4 }}>
            <Text type="secondary">
              <DatabaseOutlined /> Report: {meta.reportType || 'N/A'} | 
              <CalendarOutlined /> Generated: {meta.generatedAt ? new Date(meta.generatedAt).toLocaleString() : 'N/A'} | 
              <UserOutlined /> Role: {userRole}
              {meta.executionTime && ` | ⚡ Execution: ${meta.executionTime}ms`}
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
};

export default FuelSalesManagement;