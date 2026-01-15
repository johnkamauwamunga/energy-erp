// src/components/collections/CashMovement.jsx
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
  ArrowDownOutlined
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
  const [form] = Form.useForm();

  // State for all tabs
  const [activeTab, setActiveTab] = useState('island');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [viewMode, setViewMode] = useState('table');

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
            includeStaffTransactions: filters.includeStaffTransactions
          });
          break;

        case 'shift':
          result = await CollectionService.getShiftCollections({
            ...commonFilters,
            shiftId: filters.shiftId,
            includeWalletTransactions: filters.includeWalletTransactions,
            includeIslandCollections: filters.includeIslandCollections,
            includeDebtorTransactions: filters.includeDebtorTransactions
          });
          break;

        case 'daily':
          result = await CollectionService.getDailyReport({
            date: filters.reportDate,
            stationId: filters.stationId
          });
          break;

        case 'performance':
          result = await CollectionService.getPerformanceReport({
            startDate: filters.startDate,
            endDate: filters.endDate,
            stationId: filters.stationId,
            groupBy: filters.reportGroupBy,
            period: filters.reportPeriod
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
      setTableData(result?.tableData || result?.data || []);

      if ((result?.tableData || result?.data || []).length === 0) {
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
        includeAllDetails: true
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
    if (!summary) return null;

    const isFormatted = summary.formatted;

    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Total Cash"
              value={isFormatted?.totalCash || summary.totalCash || 0}
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<DollarOutlined />}
            />
            <Text type="secondary">
              {isFormatted?.totalCash || formatCurrency(summary.totalCash)}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Collections"
              value={summary.totalCollections || 0}
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
              value={isFormatted?.totalShortage || summary.totalShortage || 0}
              precision={0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ArrowDownOutlined />}
            />
            <Text type="secondary">
              {isFormatted?.totalShortage || formatCurrency(summary.totalShortage)}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Total Overage"
              value={isFormatted?.totalOverage || summary.totalOverage || 0}
              precision={0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<ArrowUpOutlined />}
            />
            <Text type="secondary">
              {isFormatted?.totalOverage || formatCurrency(summary.totalOverage)}
            </Text>
          </Card>
        </Col>
      </Row>
    );
  };

  // Get columns based on active tab
  const getColumns = () => {
    const baseColumns = {
      island: [
        {
          title: 'Island',
          dataIndex: 'islandName',
          key: 'islandName',
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
          width: 120,
          render: (value) => value || 'Unknown'
        },
        {
          title: 'Cash Collected',
          dataIndex: 'totalCashCollected',
          key: 'cashCollected',
          width: 120,
          render: (value) => formatCurrency(value),
          sorter: (a, b) => (a.totalCashCollected || 0) - (b.totalCashCollected || 0)
        },
        {
          title: 'Shortage',
          dataIndex: 'shortageAmount',
          key: 'shortage',
          width: 100,
          render: (value) => (
            <Text type="danger">
              {formatCurrency(value)}
            </Text>
          ),
          sorter: (a, b) => (a.shortageAmount || 0) - (b.shortageAmount || 0)
        },
        {
          title: 'Overage',
          dataIndex: 'overageAmount',
          key: 'overage',
          width: 100,
          render: (value) => (
            <Text type="success">
              {formatCurrency(value)}
            </Text>
          ),
          sorter: (a, b) => (a.overageAmount || 0) - (b.overageAmount || 0)
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          width: 100,
          render: (value) => (
            <Tag color={getStatusVariant(value)} icon={getStatusIcon(value)}>
              {value}
            </Tag>
          )
        },
        {
          title: 'Counted At',
          dataIndex: 'countedAt',
          key: 'countedAt',
          width: 140,
          render: (value) => formatDate(value, 'datetime')
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 100,
          fixed: 'right',
          render: (_, record) => (
            <Space>
              <Tooltip title="View Details">
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => showItemDetails(record, 'island')}
                  size="small"
                />
              </Tooltip>
            </Space>
          )
        }
      ],
      shift: [
        {
          title: 'Shift',
          dataIndex: 'shiftNumber',
          key: 'shiftNumber',
          width: 80,
          render: (value) => value || 'N/A'
        },
        {
          title: 'Station',
          dataIndex: 'stationName',
          key: 'station',
          width: 120,
          render: (value) => value || 'Unknown Station'
        },
        {
          title: 'Supervisor',
          dataIndex: 'supervisorName',
          key: 'supervisor',
          width: 120,
          render: (value) => value || 'Unknown'
        },
        {
          title: 'Cash Amount',
          dataIndex: 'cashAmount',
          key: 'cashAmount',
          width: 120,
          render: (value) => formatCurrency(value),
          sorter: (a, b) => (a.cashAmount || 0) - (b.cashAmount || 0)
        },
        {
          title: 'Grand Total',
          dataIndex: 'grandTotal',
          key: 'grandTotal',
          width: 120,
          render: (value) => formatCurrency(value),
          sorter: (a, b) => (a.grandTotal || 0) - (b.grandTotal || 0)
        },
        {
          title: 'Variance',
          dataIndex: 'cashVariance',
          key: 'variance',
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
          width: 100,
          render: (value) => (
            <Tag color={getStatusVariant(value)} icon={getStatusIcon(value)}>
              {value}
            </Tag>
          )
        },
        {
          title: 'Counted At',
          dataIndex: 'countedAt',
          key: 'countedAt',
          width: 140,
          render: (value) => formatDate(value, 'datetime')
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 120,
          fixed: 'right',
          render: (_, record) => (
            <Space>
              <Tooltip title="View Details">
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => showCollectionDetails(record)}
                  size="small"
                />
              </Tooltip>
              <Tooltip title="Money Flow">
                <Button
                  type="link"
                  icon={<TransactionOutlined />}
                  onClick={() => fetchMoneyFlow(record.id)}
                  size="small"
                />
              </Tooltip>
            </Space>
          )
        }
      ],
      daily: [
        {
          title: 'Date',
          dataIndex: 'date',
          key: 'date',
          width: 100,
          render: (value) => formatDate(value, 'short')
        },
        {
          title: 'Station',
          dataIndex: 'station',
          key: 'station',
          width: 120
        },
        {
          title: 'Shift Collections',
          dataIndex: 'totalShiftCollections',
          key: 'collections',
          width: 100,
          render: (value) => value || 0
        },
        {
          title: 'Total Cash',
          dataIndex: 'totalCash',
          key: 'totalCash',
          width: 120,
          render: (value) => formatCurrency(value)
        },
        {
          title: 'Total Shortage',
          dataIndex: 'totalShortage',
          key: 'totalShortage',
          width: 120,
          render: (value) => formatCurrency(value)
        },
        {
          title: 'Total Overage',
          dataIndex: 'totalOverage',
          key: 'totalOverage',
          width: 120,
          render: (value) => formatCurrency(value)
        },
        {
          title: 'Grand Total',
          dataIndex: 'grandTotal',
          key: 'grandTotal',
          width: 120,
          render: (value) => formatCurrency(value)
        }
      ],
      performance: [
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
          )
        },
        {
          title: 'Name',
          dataIndex: 'name',
          key: 'name',
          width: 150
        },
        {
          title: 'Collections',
          dataIndex: 'shiftCount',
          key: 'collections',
          width: 100,
          render: (value) => value || 0
        },
        {
          title: 'Total Cash',
          dataIndex: 'totalCash',
          key: 'totalCash',
          width: 120,
          render: (value) => formatCurrency(value)
        },
        {
          title: 'Total Debts',
          dataIndex: 'totalDebts',
          key: 'totalDebts',
          width: 120,
          render: (value) => formatCurrency(value)
        },
        {
          title: 'Grand Total',
          dataIndex: 'totalGrandTotal',
          key: 'grandTotal',
          width: 120,
          render: (value) => formatCurrency(value)
        }
      ]
    };

    return baseColumns[activeTab] || baseColumns.island;
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
                <Form.Item label="Group By" style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.reportGroupBy}
                    onChange={(value) => handleFilterChange('reportGroupBy', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="station">By Station</Option>
                    <Option value="shift">By Shift</Option>
                    <Option value="attendant">By Attendant</Option>
                  </Select>
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

    const exportTitle = `${activeTab.toUpperCase()} Collections Report - ${filters.startDate} to ${filters.endDate}`;
    const fileName = `collections_${activeTab}_${filters.startDate}_to_${filters.endDate}`;

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

    const columns = getColumns();

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
                  columns={[
                    {
                      title: 'Shift',
                      dataIndex: 'shiftNumber',
                      key: 'shift'
                    },
                    {
                      title: 'Station',
                      dataIndex: ['station', 'name'],
                      key: 'station'
                    },
                    {
                      title: 'Amount',
                      dataIndex: 'cashAmount',
                      key: 'amount',
                      render: formatCurrency
                    },
                    {
                      title: 'Date',
                      dataIndex: 'countedAt',
                      key: 'date',
                      render: (value) => formatDate(value, 'short')
                    }
                  ]}
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
                  columns={[
                    {
                      title: 'Shift',
                      dataIndex: 'shiftNumber',
                      key: 'shift'
                    },
                    {
                      title: 'Station',
                      dataIndex: ['station', 'name'],
                      key: 'station'
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (value) => (
                        <Tag color={getStatusVariant(value)}>
                          {value}
                        </Tag>
                      )
                    },
                    {
                      title: 'Start Time',
                      dataIndex: 'startTime',
                      key: 'startTime',
                      render: formatDate
                    }
                  ]}
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
    const renderIslandDetails = () => (
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="Island" span={2}>
          <Text strong>{selectedItem?.islandName}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Attendant">
          {selectedItem?.attendantName}
        </Descriptions.Item>
        <Descriptions.Item label="Station">
          {selectedItem?.stationName}
        </Descriptions.Item>
        <Descriptions.Item label="Cash Amount">
          {formatCurrency(selectedItem?.cashAmount)}
        </Descriptions.Item>
        <Descriptions.Item label="Cash Collected">
          {formatCurrency(selectedItem?.totalCashCollected)}
        </Descriptions.Item>
        <Descriptions.Item label="Shortage">
          <Text type="danger">{formatCurrency(selectedItem?.shortageAmount)}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Overage">
          <Text type="success">{formatCurrency(selectedItem?.overageAmount)}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Status" span={2}>
          <Tag color={getStatusVariant(selectedItem?.status)}>
            {selectedItem?.status}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Counted At">
          {formatDate(selectedItem?.countedAt, 'datetime')}
        </Descriptions.Item>
        <Descriptions.Item label="Verified At">
          {selectedItem?.verifiedAt ? 
            formatDate(selectedItem.verifiedAt, 'datetime') : 'Not Verified'}
        </Descriptions.Item>
      </Descriptions>
    );

    const renderShiftDetails = () => {
      if (!selectedCollection) return null;

      return (
        <div>
          <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Shift" span={2}>
              <Text strong>Shift {selectedCollection.shiftInfo?.shiftNumber}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Station">
              {selectedCollection.stationInfo?.name}
            </Descriptions.Item>
            <Descriptions.Item label="Supervisor">
              {selectedCollection.shiftInfo?.supervisor}
            </Descriptions.Item>
            <Descriptions.Item label="Cash Amount">
              {selectedCollection.formatted?.cashAmount}
            </Descriptions.Item>
            <Descriptions.Item label="Grand Total">
              {selectedCollection.formatted?.grandTotal}
            </Descriptions.Item>
            <Descriptions.Item label="Cash Variance">
              {selectedCollection.formatted?.cashVariance}
            </Descriptions.Item>
            <Descriptions.Item label="Counted By">
              {selectedCollection.countedByInfo}
            </Descriptions.Item>
            <Descriptions.Item label="Status" span={2}>
              <Tag color={getStatusVariant(selectedCollection.status)}>
                {selectedCollection.status}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          {selectedCollection.islandCollections && (
            <Collapse style={{ marginBottom: 16 }}>
              <Panel header="Island Collections" key="island-collections">
                <Table
                  dataSource={selectedCollection.islandCollections}
                  columns={[
                    { title: 'Island', dataIndex: ['island', 'name'] },
                    { title: 'Attendant', dataIndex: ['attendant', 'firstName'] },
                    { title: 'Cash', dataIndex: 'cashAmount', render: formatCurrency },
                    { title: 'Shortage', dataIndex: 'shortageAmount', render: formatCurrency }
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

            <Card title="Shift Collections">
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
      {data.data.formatted?.date}
    </Descriptions.Item>
    <Descriptions.Item label="Total Collections">
      {data.data.summary?.totalShiftCollections}
    </Descriptions.Item>
    <Descriptions.Item label="Total Cash">
      {data.data.formatted?.totalCash}
    </Descriptions.Item>
    <Descriptions.Item label="Total Shortage">
      {data.data.formatted?.totalShortage}
    </Descriptions.Item>
    <Descriptions.Item label="Total Overage">
      {data.data.formatted?.totalOverage}
    </Descriptions.Item>
    <Descriptions.Item label="Grand Total">
      {data.data.formatted?.grandTotal}
    </Descriptions.Item>
  </Descriptions>

  {data?.data?.shiftCollections && data.data.shiftCollections.length > 0 && (
    <div style={{ marginTop: 16 }}>
      <Title level={5} style={{ marginBottom: 8 }}>
        Shift Collections
      </Title>
      <Table
        dataSource={data.data.shiftCollections}
        columns={getColumns()}
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
                    {data.data.formatted?.period}
                  </Descriptions.Item>
                  <Descriptions.Item label="Date Range">
                    {data.data.formatted?.startDate} to {data.data.formatted?.endDate}
                  </Descriptions.Item>
                  <Descriptions.Item label="Group By">
                    {data.data.formatted?.groupBy}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Collections">
                    {data.data.totalShiftCollections}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Cash">
                    {data.data.formatted?.totalCash}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Grand Total">
                    {data.data.formatted?.totalGrandTotal}
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