// src/components/collections/CashMovement.jsx
import React, { useState, useEffect, useMemo } from 'react';
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
  Progress,
  Timeline,
  Collapse,
  Popconfirm
} from 'antd';
import {
  DollarOutlined,
  ShopOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  CalendarOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  AuditOutlined,
  TransactionOutlined,
  DashboardOutlined,
  BankOutlined,
  TeamOutlined,
  UserOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MoneyCollectOutlined,
  SafetyOutlined,
  CalculatorOutlined,
  FieldNumberOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApp } from '../../../../context/AppContext';
import CollectionService from '../../../../services/collectionService/collectionService';
import { formatCurrency, formatDate } from '../../../../services/collectionService/collectionService';
import { operationsService } from '../../../../services/operationService/operationService';
import { stationService } from '../../../../services/stationService/stationService';
import AdvancedReportGenerator from '../downloadable/AdvancedReportGenerator';
import './CashMovement.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Panel } = Collapse;

const CashMovement = () => {
  const { state } = useApp();
  const userStationId = state.currentStation?.id;
  const currentUser = state.currentUser;
  const currentStation = state.currentStation;
  const [form] = Form.useForm();

  // State for all tabs
  const [activeTab, setActiveTab] = useState('island');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [tableData, setTableData] = useState([]);

  // State for dropdowns
  const [shifts, setShifts] = useState([]);
  const [stations, setStations] = useState([]);
  const [islands, setIslands] = useState([]);
  const [attendants, setAttendants] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // State for filters
  const [filters, setFilters] = useState({
    // Common filters
    startDate: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    stationId: userStationId,
    status: '',
    
    // Island Collections
    islandId: null,
    attendantId: null,
    islandGroupBy: 'day',
    includeDebtorTransactions: false,
    includeStaffTransactions: false,
    includeExpenses: false,
    includeDebts: false,
    
    // Shift Collections
    shiftId: null,
    shiftGroupBy: 'station',
    includeWalletTransactions: false,
    includeIslandCollections: false,
    
    // Reports
    reportDate: dayjs().format('YYYY-MM-DD'),
    reportGroupBy: 'station',
    reportPeriod: 'monthly',
    
    // Pagination
    page: 1,
    limit: 20,
    sortBy: 'countedAt',
    sortOrder: 'desc'
  });

  // Modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [moneyFlowModalVisible, setMoneyFlowModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [moneyFlowData, setMoneyFlowData] = useState(null);

  // Load dropdown data
  useEffect(() => {
    loadDropdownData();
  }, [userStationId]);

  // Initial fetch on component mount
  useEffect(() => {
    if (activeTab !== 'dashboard') {
      const timeoutId = setTimeout(() => {
        fetchData();
      }, 500); // Slightly longer timeout for initial load

      return () => clearTimeout(timeoutId);
    }
  }, []); // Empty dependency array for initial load

  const loadDropdownData = async () => {
    setLoadingDropdowns(true);
    try {
      const promises = [];

      // Load stations
      if (currentUser?.isSuperAdmin || currentUser?.isCompanyAdmin) {
        promises.push(
          stationService.getCompanyStations().then(stationsData => {
            const stationsArray = Array.isArray(stationsData) ? stationsData : [];
            setStations(stationsArray);
            return stationsArray;
          })
        );
      }

      // Load islands for current station
      if (userStationId) {
        promises.push(
          operationsService.getIslands({ stationId: userStationId }).then(islandsData => {
            const islandsArray = Array.isArray(islandsData) ? islandsData : [];
            setIslands(islandsArray);
            return islandsArray;
          })
        );
      }

      // Load shifts
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

      // Load attendants
      if (userStationId) {
        promises.push(
          operationsService.getStaff({ stationId: userStationId, role: 'ATTENDANT' }).then(attendantsData => {
            const attendantsArray = Array.isArray(attendantsData) ? attendantsData : [];
            setAttendants(attendantsArray);
            return attendantsArray;
          })
        );
      }

      await Promise.all(promises.map(p => p.catch(e => {
        console.error('Error loading dropdown:', e);
        return [];
      })));
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
        limit: filters.limit,
        stationId: filters.stationId,
        status: filters.status,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      console.log(`📡 Fetching ${activeTab} collections with filters:`, commonFilters);

      switch (activeTab) {
        case 'island':
          result = await CollectionService.getIslandCollections({
            ...commonFilters,
            islandId: filters.islandId,
            attendantId: filters.attendantId,
            includeDebtorTransactions: filters.includeDebtorTransactions,
            includeStaffTransactions: filters.includeStaffTransactions,
            includeExpenses: filters.includeExpenses,
            includeDebts: filters.includeDebts
          });
          break;

        case 'shift':
          result = await CollectionService.getShiftCollections({
            ...commonFilters,
            shiftId: filters.shiftId,
            includeWalletTransactions: filters.includeWalletTransactions,
            includeIslandCollections: filters.includeIslandCollections,
            includeDebtorTransactions: filters.includeDebtorTransactions,
            includeExpenses: true,
            includeDebts: true
          });
          break;

        case 'daily':
          result = await CollectionService.getDailyReport({
            date: filters.reportDate,
            stationId: filters.stationId,
            includeExpenses: true,
            includeDebts: true,
            includeAllDetails: true
          });
          break;

        case 'performance':
          result = await CollectionService.getPerformanceReport({
            startDate: filters.startDate,
            endDate: filters.endDate,
            stationId: filters.stationId,
            groupBy: filters.reportGroupBy,
            period: filters.reportPeriod,
            includeExpenses: true,
            includeDebts: true
          });
          break;

        case 'dashboard':
          result = await CollectionService.getDashboardSummary();
          break;

        default:
          throw new Error('Invalid tab selection');
      }

      console.log(`✅ ${activeTab} collections result:`, result);

      setData(result);
      setSummary(result?.summary || result?.data?.summary || null);
      setMeta(result?.meta || null);
      
      // Use tableData if available, otherwise use data array
      const dataArray = result?.tableData || result?.data || [];
      setTableData(dataArray);

      if (dataArray.length === 0) {
        message.info('No data found for the selected filters');
      }
    } catch (error) {
      console.error(`❌ Failed to fetch ${activeTab} collections:`, error);
      setError(error.message || 'Failed to fetch data');
      setData(null);
      setSummary(null);
      setMeta(null);
      setTableData([]);
      message.error(error.message || 'Failed to fetch collection data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch money flow
  const fetchMoneyFlow = async (collectionId) => {
    try {
      const result = await CollectionService.getMoneyFlow(collectionId);
      setMoneyFlowData(result.data);
      setMoneyFlowModalVisible(true);
    } catch (error) {
      console.error('Failed to fetch money flow:', error);
      message.error('Failed to fetch money flow data');
    }
  };

  // Auto-fetch when filters change
  useEffect(() => {
    const shouldFetch = activeTab !== 'dashboard';

    if (shouldFetch) {
      const timeoutId = setTimeout(() => {
        fetchData();
      }, 300);

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

  // Get status variant
  const getStatusVariant = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
      case 'VERIFIED':
      case 'COUNTED':
        return 'success';
      case 'REJECTED':
      case 'DISPUTED':
        return 'danger';
      case 'UNDER_REVIEW':
        return 'info';
      default:
        return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return <ClockCircleOutlined />;
      case 'APPROVED':
      case 'VERIFIED':
      case 'COUNTED':
        return <CheckCircleOutlined />;
      case 'REJECTED':
      case 'DISPUTED':
        return <CloseCircleOutlined />;
      case 'UNDER_REVIEW':
        return <ExclamationCircleOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  // Show item details modal
  const showItemDetails = (item, tabType) => {
    setSelectedItem({ ...item, tabType });
    setDetailModalVisible(true);
  };

  // Show collection details
  const showCollectionDetails = async (collection) => {
    try {
      const result = await CollectionService.getShiftCollectionById(collection.id, {
        includeAllDetails: true,
        includeExpenses: true,
        includeDebts: true
      });
      setSelectedCollection(result.data);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('Failed to fetch collection details:', error);
      message.error('Failed to fetch collection details');
    }
  };

  // Render summary cards
  const renderSummaryCards = () => {
    if (!summary && !data?.summary) return null;

    const summaryData = summary || data.summary;
    const isFormatted = summaryData.formatted;

    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Total Cash"
              value={isFormatted?.totalCash || summaryData.totalCash || 0}
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<DollarOutlined />}
            />
            <Text type="secondary">
              {isFormatted?.totalCash || formatCurrency(summaryData.totalCash)}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Collections"
              value={summaryData.totalCollections || tableData.length || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FileTextOutlined />}
            />
            <Text type="secondary">Total count</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Total Shortage"
              value={isFormatted?.totalShortage || summaryData.totalShortage || 0}
              precision={0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ArrowDownOutlined />}
            />
            <Text type="secondary">
              {isFormatted?.totalShortage || formatCurrency(summaryData.totalShortage)}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Total Overage"
              value={isFormatted?.totalOverage || summaryData.totalOverage || 0}
              precision={0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<ArrowUpOutlined />}
            />
            <Text type="secondary">
              {isFormatted?.totalOverage || formatCurrency(summaryData.totalOverage)}
            </Text>
          </Card>
        </Col>
      </Row>
    );
  };

  // Get column definitions for different report types
  const getColumnDefinitions = () => {
    const commonRenderers = {
      currency: (value) => formatCurrency(value),
      date: (value) => formatDate(value, 'short'),
      datetime: (value) => formatDate(value, 'datetime'),
      status: (value) => (
        <Tag color={getStatusVariant(value)} icon={getStatusIcon(value)}>
          {value}
        </Tag>
      ),
      boolean: (value) => value ? 'Yes' : 'No'
    };

    switch (activeTab) {
      case 'island':
        return [
          {
            title: 'Island',
            dataIndex: 'islandName',
            key: 'islandName',
            type: 'text',
            width: 120,
            render: (value, record) => (
              <Space direction="vertical" size={0}>
                <Text strong>{value || 'Unknown Island'}</Text>
                {record.islandCode && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Code: {record.islandCode}
                  </Text>
                )}
              </Space>
            )
          },
          {
            title: 'Attendant',
            dataIndex: 'attendantName',
            key: 'attendantName',
            type: 'text',
            width: 120
          },
          {
            title: 'Station',
            dataIndex: 'stationName',
            key: 'stationName',
            type: 'text',
            width: 140
          },
          {
            title: 'Cash Amount',
            dataIndex: 'cashAmount',
            key: 'cashAmount',
            type: 'currency',
            width: 120,
            render: commonRenderers.currency,
            sorter: (a, b) => (a.cashAmount || 0) - (b.cashAmount || 0)
          },
          {
            title: 'Cash Collected',
            dataIndex: 'totalCashCollected',
            key: 'totalCashCollected',
            type: 'currency',
            width: 140,
            render: commonRenderers.currency,
            sorter: (a, b) => (a.totalCashCollected || 0) - (b.totalCashCollected || 0)
          },
          {
            title: 'Shortage',
            dataIndex: 'shortageAmount',
            key: 'shortageAmount',
            type: 'currency',
            width: 100,
            render: (value) => <Text type="danger">{formatCurrency(value)}</Text>,
            sorter: (a, b) => (a.shortageAmount || 0) - (b.shortageAmount || 0)
          },
          {
            title: 'Overage',
            dataIndex: 'overageAmount',
            key: 'overageAmount',
            type: 'currency',
            width: 100,
            render: (value) => <Text type="success">{formatCurrency(value)}</Text>,
            sorter: (a, b) => (a.overageAmount || 0) - (b.overageAmount || 0)
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            type: 'status',
            width: 100,
            render: commonRenderers.status
          },
          {
            title: 'Counted At',
            dataIndex: 'countedAt',
            key: 'countedAt',
            type: 'datetime',
            width: 140,
            render: commonRenderers.datetime
          }
        ];

      case 'shift':
        return [
          {
            title: 'Shift',
            dataIndex: 'shiftNumber',
            key: 'shiftNumber',
            type: 'text',
            width: 80
          },
          {
            title: 'Station',
            dataIndex: 'stationName',
            key: 'stationName',
            type: 'text',
            width: 120
          },
          {
            title: 'Supervisor',
            dataIndex: 'supervisorName',
            key: 'supervisorName',
            type: 'text',
            width: 120
          },
          {
            title: 'Cash Amount',
            dataIndex: 'cashAmount',
            key: 'cashAmount',
            type: 'currency',
            width: 120,
            render: commonRenderers.currency,
            sorter: (a, b) => (a.cashAmount || 0) - (b.cashAmount || 0)
          },
          {
            title: 'Grand Total',
            dataIndex: 'grandTotal',
            key: 'grandTotal',
            type: 'currency',
            width: 120,
            render: commonRenderers.currency,
            sorter: (a, b) => (a.grandTotal || 0) - (b.grandTotal || 0)
          },
          {
            title: 'Variance',
            dataIndex: 'cashVariance',
            key: 'cashVariance',
            type: 'currency',
            width: 100,
            render: (value) => (
              <Tag color={value >= 0 ? 'success' : 'error'}>
                {formatCurrency(value)}
              </Tag>
            ),
            sorter: (a, b) => (a.cashVariance || 0) - (b.cashVariance || 0)
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            type: 'status',
            width: 100,
            render: commonRenderers.status
          },
          {
            title: 'Counted At',
            dataIndex: 'countedAt',
            key: 'countedAt',
            type: 'datetime',
            width: 140,
            render: commonRenderers.datetime
          }
        ];

      case 'daily':
        return [
          {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            type: 'date',
            width: 100,
            render: commonRenderers.date
          },
          {
            title: 'Station',
            dataIndex: 'stationName',
            key: 'stationName',
            type: 'text',
            width: 120
          },
          {
            title: 'Shift Collections',
            dataIndex: 'totalShiftCollections',
            key: 'totalShiftCollections',
            type: 'number',
            width: 100
          },
          {
            title: 'Total Cash',
            dataIndex: 'totalCash',
            key: 'totalCash',
            type: 'currency',
            width: 120,
            render: commonRenderers.currency
          },
          {
            title: 'Total Shortage',
            dataIndex: 'totalShortage',
            key: 'totalShortage',
            type: 'currency',
            width: 120,
            render: (value) => <Text type="danger">{formatCurrency(value)}</Text>
          },
          {
            title: 'Total Overage',
            dataIndex: 'totalOverage',
            key: 'totalOverage',
            type: 'currency',
            width: 120,
            render: (value) => <Text type="success">{formatCurrency(value)}</Text>
          },
          {
            title: 'Grand Total',
            dataIndex: 'grandTotal',
            key: 'grandTotal',
            type: 'currency',
            width: 120,
            render: commonRenderers.currency
          }
        ];

      case 'performance':
        return [
          {
            title: 'Rank',
            dataIndex: 'rank',
            key: 'rank',
            type: 'number',
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
            )
          },
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            type: 'text',
            width: 150
          },
          {
            title: 'Collections',
            dataIndex: 'shiftCount',
            key: 'shiftCount',
            type: 'number',
            width: 100
          },
          {
            title: 'Total Cash',
            dataIndex: 'totalCash',
            key: 'totalCash',
            type: 'currency',
            width: 120,
            render: commonRenderers.currency
          },
          {
            title: 'Total Debts',
            dataIndex: 'totalDebts',
            key: 'totalDebts',
            type: 'currency',
            width: 120,
            render: commonRenderers.currency
          },
          {
            title: 'Grand Total',
            dataIndex: 'totalGrandTotal',
            key: 'totalGrandTotal',
            type: 'currency',
            width: 120,
            render: commonRenderers.currency
          }
        ];

      default:
        return [];
    }
  };

  // Get table columns for display
  const getTableColumns = () => {
    const columns = getColumnDefinitions();
    
    // Add actions column for interactive tables
    if (activeTab === 'island' || activeTab === 'shift') {
      return [
        ...columns,
        {
          title: 'Actions',
          key: 'actions',
          width: activeTab === 'shift' ? 120 : 100,
          fixed: 'right',
          render: (_, record) => (
            <Space>
              <Tooltip title="View Details">
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => 
                    activeTab === 'island' 
                      ? showItemDetails(record, 'island')
                      : showCollectionDetails(record)
                  }
                  size="small"
                />
              </Tooltip>
              {activeTab === 'shift' && (
                <Tooltip title="Money Flow">
                  <Button
                    type="link"
                    icon={<TransactionOutlined />}
                    onClick={() => fetchMoneyFlow(record.id)}
                    size="small"
                  />
                </Tooltip>
              )}
            </Space>
          )
        }
      ];
    }
    
    return columns;
  };

  // Calculate summary data for reports
  const calculateSummaryData = () => {
    if (!tableData || tableData.length === 0) return null;

    const currencyColumns = getColumnDefinitions().filter(col => 
      col.type === 'currency'
    );

    const totals = {};
    currencyColumns.forEach(col => {
      if (col.dataIndex) {
        totals[col.dataIndex] = tableData.reduce((sum, record) => {
          const value = parseFloat(record[col.dataIndex]) || 0;
          return sum + value;
        }, 0);
      }
    });

    // Add record count
    totals.totalRecords = tableData.length;

    return totals;
  };

  // Render export button with AdvancedReportGenerator
  const renderExportButton = () => {
    if (!tableData || tableData.length === 0) {
      return (
        <Button icon={<DownloadOutlined />} disabled>
          Export
        </Button>
      );
    }

    const columnDefinitions = getColumnDefinitions();
    const summaryData = calculateSummaryData();
    
    // Get report title based on active tab
    const getReportTitle = () => {
      const tabNames = {
        island: 'Island Collections',
        shift: 'Shift Collections',
        daily: 'Daily Report',
        performance: 'Performance Report'
      };
      
      return `${tabNames[activeTab] || 'Collections'} Report - ${filters.startDate} to ${filters.endDate}`;
    };

    // Get file name
    const getFileName = () => {
      return `cash_movement_${activeTab}_${filters.startDate}_${filters.endDate}`;
    };

    // Get report type based on active tab
    const getReportType = () => {
      if (activeTab === 'island' || activeTab === 'shift' || activeTab === 'daily') {
        return 'finance';
      } else if (activeTab === 'performance') {
        return 'sales';
      }
      return 'default';
    };

    // Get station info
    const stationInfo = currentStation ? {
      name: currentStation.name,
      code: currentStation.code,
      address: currentStation.address
    } : null;

    return (
      <AdvancedReportGenerator
        dataSource={tableData}
        columns={columnDefinitions}
        summaryData={summaryData}
        title={getReportTitle()}
        fileName={getFileName()}
        reportType={getReportType()}
        companyName="Lynx Energy System"
        stationInfo={stationInfo}
        showFooter={true}
        footerText={`Generated from Lynx Energy System - ${new Date().toLocaleString()}`}
        enableCustomization={true}
        includeLogo={false}
      />
    );
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
        <Col xs={24} sm={12} md={6}>
          <Form.Item label="Station" style={{ marginBottom: 0 }}>
            <Select
              value={filters.stationId}
              onChange={(value) => handleFilterChange('stationId', value)}
              placeholder="Select Station"
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
        <Col xs={24} sm={12} md={4}>
          <Form.Item label="Status" style={{ marginBottom: 0 }}>
            <Select
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              placeholder="All Status"
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="PENDING">Pending</Option>
              <Option value="APPROVED">Approved</Option>
              <Option value="VERIFIED">Verified</Option>
              <Option value="COUNTED">Counted</Option>
              <Option value="REJECTED">Rejected</Option>
              <Option value="UNDER_REVIEW">Under Review</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
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
      case 'island':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Filter by Island" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.islandId}
                    onChange={(value) => handleFilterChange('islandId', value)}
                    placeholder="All Islands"
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {islands.map(island => (
                      <Option key={island.id} value={island.id}>
                        {island.name || island.code}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Filter by Attendant" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.attendantId}
                    onChange={(value) => handleFilterChange('attendantId', value)}
                    placeholder="All Attendants"
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {attendants.map(attendant => (
                      <Option key={attendant.id} value={attendant.id}>
                        {attendant.firstName} {attendant.lastName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Include Details" style={{ marginBottom: 0 }}>
                  <Space direction="vertical" size={0}>
                    <Checkbox
                      checked={filters.includeDebtorTransactions}
                      onChange={(e) => handleFilterChange('includeDebtorTransactions', e.target.checked)}
                    >
                      Debtor Transactions
                    </Checkbox>
                    <Checkbox
                      checked={filters.includeStaffTransactions}
                      onChange={(e) => handleFilterChange('includeStaffTransactions', e.target.checked)}
                    >
                      Staff Transactions
                    </Checkbox>
                    <Checkbox
                      checked={filters.includeExpenses}
                      onChange={(e) => handleFilterChange('includeExpenses', e.target.checked)}
                    >
                      Expenses
                    </Checkbox>
                    <Checkbox
                      checked={filters.includeDebts}
                      onChange={(e) => handleFilterChange('includeDebts', e.target.checked)}
                    >
                      Debts
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

      case 'shift':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Filter by Shift" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.shiftId}
                    onChange={(value) => handleFilterChange('shiftId', value)}
                    placeholder="All Shifts"
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {shifts.map(shift => (
                      <Option key={shift.id} value={shift.id}>
                        Shift {shift.shiftNumber} - {formatDate(shift.startTime, 'short')}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Include" style={{ marginBottom: 0 }}>
                  <Space direction="vertical" size={0}>
                    <Checkbox
                      checked={filters.includeWalletTransactions}
                      onChange={(e) => handleFilterChange('includeWalletTransactions', e.target.checked)}
                    >
                      Wallet Transactions
                    </Checkbox>
                    <Checkbox
                      checked={filters.includeIslandCollections}
                      onChange={(e) => handleFilterChange('includeIslandCollections', e.target.checked)}
                    >
                      Island Collections
                    </Checkbox>
                    <Checkbox
                      checked={filters.includeDebtorTransactions}
                      onChange={(e) => handleFilterChange('includeDebtorTransactions', e.target.checked)}
                    >
                      Debtor Transactions
                    </Checkbox>
                  </Space>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Sort By" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.sortBy}
                    onChange={(value) => handleFilterChange('sortBy', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="countedAt">Counted Date</Option>
                    <Option value="cashAmount">Cash Amount</Option>
                    <Option value="grandTotal">Grand Total</Option>
                    <Option value="createdAt">Created Date</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Order" style={{ marginBottom: 0 }}>
                  <Radio.Group
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  >
                    <Radio.Button value="desc">Descending</Radio.Button>
                    <Radio.Button value="asc">Ascending</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
            {commonFilters}
          </>
        );

      case 'daily':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Report Date" style={{ marginBottom: 0 }}>
                  <DatePicker
                    value={dayjs(filters.reportDate)}
                    onChange={(date, dateString) => handleFilterChange('reportDate', dateString)}
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Include" style={{ marginBottom: 0 }}>
                  <Space>
                    <Checkbox
                      checked={filters.includeExpenses}
                      onChange={(e) => handleFilterChange('includeExpenses', e.target.checked)}
                    >
                      Expenses
                    </Checkbox>
                    <Checkbox
                      checked={filters.includeDebts}
                      onChange={(e) => handleFilterChange('includeDebts', e.target.checked)}
                    >
                      Debts
                    </Checkbox>
                  </Space>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Button
                  type="primary"
                  onClick={fetchData}
                  loading={loading}
                  icon={<ReloadOutlined />}
                  style={{ width: '100%', marginTop: 24 }}
                >
                  Generate Report
                </Button>
              </Col>
            </Row>
          </>
        );

      case 'performance':
        return (
          <>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Period" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.reportPeriod}
                    onChange={(value) => handleFilterChange('reportPeriod', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="daily">Daily</Option>
                    <Option value="weekly">Weekly</Option>
                    <Option value="monthly">Monthly</Option>
                    <Option value="quarterly">Quarterly</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Group By" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.reportGroupBy}
                    onChange={(value) => handleFilterChange('reportGroupBy', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="station">By Station</Option>
                    <Option value="attendant">By Attendant</Option>
                    <Option value="debtorCategory">By Debtor Category</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Include" style={{ marginBottom: 0 }}>
                  <Space>
                    <Checkbox
                      checked={filters.includeExpenses}
                      onChange={(e) => handleFilterChange('includeExpenses', e.target.checked)}
                    >
                      Expenses
                    </Checkbox>
                    <Checkbox
                      checked={filters.includeDebts}
                      onChange={(e) => handleFilterChange('includeDebts', e.target.checked)}
                    >
                      Debts
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
                  Generate Report
                </Button>
              </Col>
            </Row>
            {commonFilters}
          </>
        );

      case 'dashboard':
        return (
          <Row gutter={[16, 16]} align="middle">
            <Col span={24}>
              <Button
                type="primary"
                onClick={fetchData}
                loading={loading}
                icon={<ReloadOutlined />}
              >
                Refresh Dashboard
              </Button>
            </Col>
          </Row>
        );

      default:
        return commonFilters;
    }
  };

  // Render data table
  const renderDataTable = () => {
    if (!tableData || tableData.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Paragraph>No collection data found</Paragraph>
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
        rowKey={(record) => record.id || Math.random()}
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
        summary={() => {
          if (activeTab === 'daily' || activeTab === 'performance') return null;
          
          const summaryData = calculateSummaryData();
          if (!summaryData) return null;

          return (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <Text strong>TOTAL</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text strong style={{ color: '#1890ff' }}>
                    {formatCurrency(summaryData.cashAmount || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong style={{ color: '#1890ff' }}>
                    {formatCurrency(summaryData.totalCashCollected || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong type="danger">
                    {formatCurrency(summaryData.shortageAmount || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text strong type="success">
                    {formatCurrency(summaryData.overageAmount || 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} colSpan={2}>
                  <Text type="secondary">
                    {summaryData.totalRecords} records
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    );
  };

  // Render dashboard
  const renderDashboard = () => {
    if (!data) return null;

    const dashboardData = data.data || {};

    return (
      <div className="dashboard-container">
        <Row gutter={[16, 16]}>
          {/* Summary Cards */}
          <Col xs={24}>
            <Row gutter={[16, 16]}>
              {dashboardData.companies !== undefined && (
                <Col xs={24} sm={8} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Total Companies"
                      value={dashboardData.companies}
                      prefix={<ShopOutlined />}
                    />
                  </Card>
                </Col>
              )}
              {dashboardData.stations !== undefined && (
                <Col xs={24} sm={8} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Total Stations"
                      value={dashboardData.stations}
                      prefix={<ShopOutlined />}
                    />
                  </Card>
                </Col>
              )}
              {dashboardData.todayCollections !== undefined && (
                <Col xs={24} sm={8} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Today's Collections"
                      value={dashboardData.todayCollections}
                      prefix={<FileTextOutlined />}
                    />
                  </Card>
                </Col>
              )}
              {dashboardData.totalCashCollected !== undefined && (
                <Col xs={24} sm={8} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Total Cash Collected"
                      value={dashboardData.formattedTotalCashCollected || formatCurrency(dashboardData.totalCashCollected)}
                      prefix={<DollarOutlined />}
                    />
                  </Card>
                </Col>
              )}
            </Row>
          </Col>

          {/* Recent Activity */}
          {dashboardData.recentCollections && (
            <Col xs={24}>
              <Card title="Recent Collections" size="small">
                <Table
                  dataSource={dashboardData.recentCollections}
                  columns={getTableColumns()}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          )}

          {/* Performance Summary */}
          {dashboardData.today && (
            <Col xs={24}>
              <Card title="Today's Summary" size="small">
                <Descriptions bordered size="small" column={4}>
                  <Descriptions.Item label="Total Cash">
                    {formatCurrency(dashboardData.today.totalCash)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Collections">
                    {dashboardData.today.totalShiftCollections}
                  </Descriptions.Item>
                  <Descriptions.Item label="Shortage">
                    {formatCurrency(dashboardData.today.totalShortage)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Overage">
                    {formatCurrency(dashboardData.today.totalOverage)}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          )}

          {/* Role-specific content */}
          {currentUser?.role === 'SUPERVISOR' && dashboardData.recentShifts && (
            <Col xs={24}>
              <Card title="Recent Shifts" size="small">
                <Table
                  dataSource={dashboardData.recentShifts}
                  columns={getTableColumns()}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          )}
        </Row>
      </div>
    );
  };

  // Detail modal
  const renderDetailModal = () => {
    const renderIslandDetails = () => {
      if (!selectedItem) return null;

      const columns = getColumnDefinitions();
      
      return (
        <Descriptions bordered column={2} size="small">
          {columns.map((col) => {
            if (!col.dataIndex) return null;
            
            const value = selectedItem[col.dataIndex];
            let content = value;
            
            if (col.type === 'currency' && typeof value === 'number') {
              content = formatCurrency(value);
            } else if (col.type === 'datetime' && value) {
              content = formatDate(value, 'datetime');
            } else if (col.type === 'date' && value) {
              content = formatDate(value, 'short');
            } else if (col.type === 'status') {
              content = (
                <Tag color={getStatusVariant(value)}>
                  {value}
                </Tag>
              );
            } else if (value === null || value === undefined) {
              content = '-';
            }

            return (
              <Descriptions.Item label={col.title} key={col.dataIndex}>
                {content}
              </Descriptions.Item>
            );
          })}
        </Descriptions>
      );
    };

    const renderShiftDetails = () => {
      if (!selectedCollection) return null;

      return (
        <div>
          <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
            {getColumnDefinitions().map((col) => {
              if (!col.dataIndex) return null;
              
              const value = selectedCollection[col.dataIndex];
              let content = value;
              
              if (col.type === 'currency' && typeof value === 'number') {
                content = formatCurrency(value);
              } else if (col.type === 'datetime' && value) {
                content = formatDate(value, 'datetime');
              } else if (col.type === 'status') {
                content = (
                  <Tag color={getStatusVariant(value)}>
                    {value}
                  </Tag>
                );
              } else if (value === null || value === undefined) {
                content = '-';
              }

              return (
                <Descriptions.Item label={col.title} key={col.dataIndex}>
                  {content}
                </Descriptions.Item>
              );
            })}
          </Descriptions>

          {/* Expenses Section */}
          {selectedCollection.expenses && selectedCollection.expenses.length > 0 && (
            <Collapse style={{ marginBottom: 16 }}>
              <Panel header="Expenses" key="expenses">
                <Table
                  dataSource={selectedCollection.expenses}
                  columns={[
                    { title: 'Description', dataIndex: 'description' },
                    { title: 'Amount', dataIndex: 'amount', render: formatCurrency },
                    { title: 'Category', dataIndex: 'category' },
                    { title: 'Date', dataIndex: 'date', render: formatDate }
                  ]}
                  size="small"
                  pagination={false}
                />
              </Panel>
            </Collapse>
          )}

          {/* Debts Section */}
          {selectedCollection.debts && selectedCollection.debts.length > 0 && (
            <Collapse style={{ marginBottom: 16 }}>
              <Panel header="Debts" key="debts">
                <Table
                  dataSource={selectedCollection.debts}
                  columns={[
                    { title: 'Debtor', dataIndex: 'debtorName' },
                    { title: 'Amount', dataIndex: 'amount', render: formatCurrency },
                    { title: 'Type', dataIndex: 'type' },
                    { title: 'Status', dataIndex: 'status' }
                  ]}
                  size="small"
                  pagination={false}
                />
              </Panel>
            </Collapse>
          )}

          {/* Island Collections */}
          {selectedCollection.islandCollections && selectedCollection.islandCollections.length > 0 && (
            <Collapse style={{ marginBottom: 16 }}>
              <Panel header="Island Collections" key="island-collections">
                <Table
                  dataSource={selectedCollection.islandCollections}
                  columns={[
                    { title: 'Island', dataIndex: ['island', 'name'] },
                    { title: 'Attendant', dataIndex: ['attendant', 'firstName'] },
                    { title: 'Cash', dataIndex: 'cashAmount', render: formatCurrency },
                    { title: 'Shortage', dataIndex: 'shortageAmount', render: formatCurrency },
                    { title: 'Overage', dataIndex: 'overageAmount', render: formatCurrency }
                  ]}
                  size="small"
                  pagination={false}
                />
              </Panel>
            </Collapse>
          )}
        </div>
      );
    };

    return (
      <Modal
        title={`Collection Details - ${selectedItem?.tabType === 'island' ? 'Island' : 'Shift'}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedItem(null);
          setSelectedCollection(null);
        }}
        footer={null}
        width={800}
      >
        {selectedItem?.tabType === 'island' ? renderIslandDetails() : renderShiftDetails()}
      </Modal>
    );
  };

  // Money flow modal
  const renderMoneyFlowModal = () => {
    if (!moneyFlowData) return null;

    const { moneyFlow, summary } = moneyFlowData;

    return (
      <Modal
        title="Money Flow Analysis"
        open={moneyFlowModalVisible}
        onCancel={() => setMoneyFlowModalVisible(false)}
        footer={null}
        width={1000}
      >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Money Flow Summary" size="small">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="Cash to Wallet"
                    value={summary?.totalCashMovedToWallet || 0}
                    prefix={<DollarOutlined />}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="Expenses Paid"
                    value={summary?.totalExpensesPaid || 0}
                    prefix={<ArrowDownOutlined />}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="New Debts"
                    value={summary?.totalNewDebtsRecorded || 0}
                    prefix={<FileTextOutlined />}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          <Col span={24}>
            <Collapse>
              <Panel header="Cash to Wallet Transactions" key="cash-to-wallet">
                <Table
                  dataSource={moneyFlow?.cashToWallet || []}
                  columns={[
                    { title: 'Description', dataIndex: 'description' },
                    { title: 'Amount', dataIndex: 'amount', render: formatCurrency },
                    { title: 'Date', dataIndex: 'transactionDate', render: formatDate }
                  ]}
                  size="small"
                  pagination={false}
                />
              </Panel>
              <Panel header="Expenses from Wallet" key="expenses">
                <Table
                  dataSource={moneyFlow?.expensesFromWallet || []}
                  columns={[
                    { title: 'Description', dataIndex: 'description' },
                    { title: 'Amount', dataIndex: 'amount', render: formatCurrency },
                    { title: 'Category', dataIndex: 'category' },
                    { title: 'Date', dataIndex: 'transactionDate', render: formatDate }
                  ]}
                  size="small"
                  pagination={false}
                />
              </Panel>
              <Panel header="Debt Transactions" key="debts">
                <Table
                  dataSource={moneyFlow?.debtsToDebtors || []}
                  columns={[
                    { title: 'Debtor', dataIndex: ['stationDebtorAccount', 'debtor', 'name'] },
                    { title: 'Amount', dataIndex: 'amount', render: formatCurrency },
                    { title: 'Type', dataIndex: 'type' },
                    { title: 'Status', dataIndex: 'status' }
                  ]}
                  size="small"
                  pagination={false}
                />
              </Panel>
            </Collapse>
          </Col>
        </Row>
      </Modal>
    );
  };

  // Render loading state
  if (loading && !data) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading collection data...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="cash-movement">
      <Card style={{ margin: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            <DollarOutlined /> Cash Movement & Collections
          </Title>
          <Text type="secondary">
            Track, analyze, and manage cash collections across islands, shifts, and stations
          </Text>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          tabBarExtraContent={
            activeTab !== 'dashboard' && (
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
            )
          }
        >
          <TabPane
            tab={
              <span>
                <ShopOutlined />
                Island Collections
              </span>
            }
            key="island"
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
              title="Island Collections"
              extra={
                <Text type="secondary">
                  Showing {tableData.length} collections
                  {data?.pagination?.total && ` of ${data.pagination.total}`}
                </Text>
              }
            >
              {renderDataTable()}
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <ClockCircleOutlined />
                Shift Collections
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
              />
            )}

            {renderSummaryCards()}

            <Card 
              title="Shift Collections"
              extra={
                <Text type="secondary">
                  Showing {tableData.length} collections
                  {data?.pagination?.total && ` of ${data.pagination.total}`}
                </Text>
              }
            >
              {renderDataTable()}
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <CalendarOutlined />
                Daily Report
              </span>
            }
            key="daily"
          >
            <Card
              title={
                <Space>
                  <FilterOutlined />
                  <span>Report Filters</span>
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

            {data?.data && (
              <Card title="Daily Collection Report">
                <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
                  <Descriptions.Item label="Date">
                    {data.data.formatted?.date || formatDate(data.data.date)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Collections">
                    {data.data.summary?.totalShiftCollections || data.data.totalCollections || 0}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Cash">
                    {data.data.formatted?.totalCash || formatCurrency(data.data.totalCash)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Shortage">
                    {data.data.formatted?.totalShortage || formatCurrency(data.data.totalShortage)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Overage">
                    {data.data.formatted?.totalOverage || formatCurrency(data.data.totalOverage)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Grand Total">
                    {data.data.formatted?.grandTotal || formatCurrency(data.data.grandTotal)}
                  </Descriptions.Item>
                </Descriptions>

                {data.data.shiftCollections && data.data.shiftCollections.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Title level={5} style={{ marginBottom: 8 }}>
                      Shift Collections
                    </Title>
                    <Table
                      dataSource={data.data.shiftCollections}
                      columns={getTableColumns()}
                      pagination={false}
                      size="small"
                      rowKey={(record) => record.id || Math.random()}
                    />
                  </div>
                )}
              </Card>
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <LineChartOutlined />
                Performance Report
              </span>
            }
            key="performance"
          >
            <Card
              title={
                <Space>
                  <FilterOutlined />
                  <span>Report Filters</span>
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

            {data?.data && (
              <Card title="Performance Report">
                <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
                  <Descriptions.Item label="Period">
                    {data.data.formatted?.period || filters.reportPeriod}
                  </Descriptions.Item>
                  <Descriptions.Item label="Date Range">
                    {data.data.formatted?.startDate || filters.startDate} to {data.data.formatted?.endDate || filters.endDate}
                  </Descriptions.Item>
                  <Descriptions.Item label="Group By">
                    {data.data.formatted?.groupBy || filters.reportGroupBy}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Collections">
                    {data.data.totalShiftCollections || data.data.totalCollections || 0}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Cash">
                    {data.data.formatted?.totalCash || formatCurrency(data.data.totalCash)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Grand Total">
                    {data.data.formatted?.totalGrandTotal || formatCurrency(data.data.totalGrandTotal)}
                  </Descriptions.Item>
                </Descriptions>

                {renderDataTable()}
              </Card>
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <DashboardOutlined />
                Dashboard
              </span>
            }
            key="dashboard"
          >
            <Card
              title={
                <Space>
                  <DashboardOutlined />
                  <span>Dashboard</span>
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              {renderFilterControls()}
            </Card>

            {renderDashboard()}
          </TabPane>
        </Tabs>

        {meta && (
          <div style={{ marginTop: 24, padding: 16, backgroundColor: '#fafafa', borderRadius: 4 }}>
            <Text type="secondary">
              Report Type: {meta.reportType || 'N/A'} | 
              Generated: {meta.generatedAt ? new Date(meta.generatedAt).toLocaleString() : 'N/A'} | 
              Filters Applied: {JSON.stringify(meta.filtersApplied || {})}
            </Text>
          </div>
        )}
      </Card>

      {renderDetailModal()}
      {renderMoneyFlowModal()}
    </div>
  );
};

export default CashMovement;