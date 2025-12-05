// src/components/StaffAccounts/StaffAccountManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  InputNumber,
  Select,
  Modal,
  Form,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Tabs,
  Switch,
  DatePicker,
  Alert,
  Dropdown,
  Avatar,
  Menu,
  Radio,
  Badge,
  Typography,
  Divider,
  Popover
} from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  BankOutlined,
  WalletOutlined,
  HistoryOutlined,
  EyeOutlined,
  PlusOutlined,
  SyncOutlined,
  FilterOutlined,
  MoreOutlined,
  MoneyCollectOutlined,
  GiftOutlined,
  CreditCardOutlined,
  AccountBookOutlined,
  TeamOutlined,
  FileTextOutlined,
  TransactionOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { staffAccountService } from '../../../../services/staffAccountService/staffAccountService';
import { userService } from '../../../../services/userService/userService';
import { stationService } from '../../../../services/stationService/stationService';
import { useApp } from '../../../../context/AppContext';
import { formatDate } from '../../../../utils/helpers';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text } = Typography;
const { RangePicker } = DatePicker;

const StaffAccountManagement = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    hasShortages: '',
    isActive: '',
    stationId: '',
    role: ''
  });
  const [modalVisible, setModalVisible] = useState({
    createShortage: false,
    createAdvance: false,
    createPayment: false,
    createAccount: false,
    bulkPayment: false,
    accountDetails: false
  });
  const [forms, setForms] = useState({
    shortage: Form.useForm()[0],
    advance: Form.useForm()[0],
    payment: Form.useForm()[0],
    account: Form.useForm()[0],
    bulkPayment: Form.useForm()[0]
  });
  const [formErrors, setFormErrors] = useState([]);
  const [activeTab, setActiveTab] = useState('accounts');
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [usersWithoutAccounts, setUsersWithoutAccounts] = useState([]);
  const [shortageSummary, setShortageSummary] = useState(null);

  const currentUser = state.currentUser;
  const isCompanyAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(currentUser?.role);
  const isStationManager = ['STATION_MANAGER'].includes(currentUser?.role);
  const currentStationId = state.currentStation?.id;

  console.log("station account station id ",currentStationId);

  // Fetch stations
  const fetchStations = async () => {
    try {
      const response = await stationService.getCompanyStations();
      setStations(response || []);
    } catch (error) {
      console.error('Failed to fetch stations:', error);
      message.error('Failed to load stations');
    }
  };

  // Fetch all users
  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers();
      console.log("✅ Users loaded successfully:", response);
      
      if (response.success) {
        console.log("✅ Users loaded successfully:", response?.data);
        setAllUsers(response.data || []);
      } else {
        message.error('Failed to fetch users');
        setAllUsers([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      message.error('Failed to load users');
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Load staff accounts
  const loadStaffAccounts = async () => {
    try {
      setLoading(true);
      const stationId = currentStationId || filters.stationId;
      
      if (!stationId && !isCompanyAdmin) {
        return;
      }

      const result = await staffAccountService.getStaffAccountsByStation(stationId, {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });

      setStaffAccounts(result.accounts || []);
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.total || 0
      }));
      return result;
    } catch (error) {
      console.error('Error loading staff accounts:', error);
      message.error('Failed to load staff accounts');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Load account details
  const loadAccountDetails = async (accountId) => {
    try {
      setLoading(true);
      const [account, transactions] = await Promise.all([
        staffAccountService.getStaffAccount(accountId),
        staffAccountService.getStaffTransactions({ staffAccountId: accountId, limit: 20 })
      ]);

      setSelectedAccount(account);
      setAccountTransactions(transactions.transactions || []);
      
      return { account, transactions };
    } catch (error) {
      console.error('Error loading account details:', error);
      message.error('Failed to load account details');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Identify users without accounts
  const identifyUsersWithoutAccounts = () => {
    const usersWithAccounts = new Set(staffAccounts.map(account => account.userId));
    
    const usersWithoutAccs = allUsers.filter(user => {
      // Filter by role (only show staff roles)
      const isStaffRole = ['STATION_MANAGER', 'SUPERVISOR', 'ATTENDANT'].includes(user.role);
      if (!isStaffRole) return false;

      // Check if user has assignments
      const hasStationAssignment = user.stationAssignments?.length > 0;
      if (!hasStationAssignment) return false;

      // Check if user already has an account
      const hasAccount = usersWithAccounts.has(user.id);
      
      // For station managers, only show users from their station
      if (isStationManager) {
        const isInCurrentStation = user.stationAssignments?.some(
          assignment => assignment.stationId === currentStationId
        );
        return !hasAccount && isInCurrentStation;
      }

      return !hasAccount;
    });

    setUsersWithoutAccounts(usersWithoutAccs);
  };

  // Handle create account
  const handleCreateAccount = async (values) => {
    setSubmitting(true);
    setFormErrors([]);

    try {
      const accountData = {
        userId: values.userId,
        stationId: values.stationId || currentStationId,
        salaryAmount: values.salaryAmount ? parseFloat(values.salaryAmount) : null,
        creditLimit: values.creditLimit ? parseFloat(values.creditLimit) : 5000,
        payrollMethod: values.payrollMethod || 'STATION_WALLET',
        bankAccountNumber: values.bankAccountNumber,
        mobileMoneyNumber: values.mobileMoneyNumber,
        paymentSchedule: values.paymentSchedule || 'MONTHLY',
        isActive: true
      };

      const errors = staffAccountService.validateStaffAccount(accountData);
      if (errors.length > 0) {
        setFormErrors(errors);
        return;
      }

      await staffAccountService.createStaffAccount(accountData);
      message.success('Staff account created successfully');
      
      setModalVisible(prev => ({ ...prev, createAccount: false }));
      forms.account.resetFields();
      setFormErrors([]);
      
      await refreshData();
      
    } catch (error) {
      message.error(error.message || 'Failed to create staff account');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle create shortage
  const handleCreateShortage = async (values) => {
    setSubmitting(true);
    setFormErrors([]);

    try {
      const shortageData = {
        staffAccountId: values.staffAccountId,
        amount: parseFloat(values.amount),
        description: values.description?.trim() || `Shortage recorded`,
        referenceNumber: values.referenceNumber?.trim()
      };

      const errors = staffAccountService.validateShortage(shortageData);
      if (errors.length > 0) {
        setFormErrors(errors);
        return;
      }

      await staffAccountService.createShortage(shortageData);
      message.success('Shortage recorded successfully');
      
      setModalVisible(prev => ({ ...prev, createShortage: false }));
      forms.shortage.resetFields();
      setFormErrors([]);
      
      await refreshData();
      
    } catch (error) {
      message.error(error.message || 'Failed to record shortage');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle create advance
  const handleCreateAdvance = async (values) => {
    setSubmitting(true);
    setFormErrors([]);

    try {
      const transactionData = {
        staffAccountId: values.staffAccountId,
        type: 'ADVANCE',
        amount: parseFloat(values.amount),
        description: values.description?.trim() || `Salary advance`,
        paymentMethod: values.paymentMethod || 'STATION_WALLET',
        paymentSource: values.paymentSource || 'STATION_WALLET'
      };

      const errors = staffAccountService.validateStaffTransaction(transactionData);
      if (errors.length > 0) {
        setFormErrors(errors);
        return;
      }

      await staffAccountService.createStaffTransaction(transactionData);
      message.success('Advance recorded successfully');
      
      setModalVisible(prev => ({ ...prev, createAdvance: false }));
      forms.advance.resetFields();
      setFormErrors([]);
      
      await refreshData();
      
    } catch (error) {
      message.error(error.message || 'Failed to record advance');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle create payment
  const handleCreatePayment = async (values) => {
    setSubmitting(true);
    setFormErrors([]);

    try {
      const paymentData = {
        staffAccountId: values.staffAccountId,
        type: 'SALARY_PAYMENT',
        amount: parseFloat(values.amount),
        description: values.description?.trim() || `Salary payment`,
        paymentMethod: values.paymentMethod,
        paymentSource: values.paymentSource,
        deductShortages: values.deductShortages || false,
        deductAdvances: values.deductAdvances || false
      };

      const errors = staffAccountService.validateStaffTransaction(paymentData);
      if (errors.length > 0) {
        setFormErrors(errors);
        return;
      }

      await staffAccountService.createStaffTransaction(paymentData);
      message.success('Payment created successfully');
      
      setModalVisible(prev => ({ ...prev, createPayment: false }));
      forms.payment.resetFields();
      setFormErrors([]);
      
      await refreshData();
      
    } catch (error) {
      message.error(error.message || 'Failed to create payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Main refresh function
  const refreshData = async (showMessage = false) => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAllUsers(),
        fetchStations(),
        loadStaffAccounts()
      ]);
      
      identifyUsersWithoutAccounts();
      
      if (showMessage) {
        message.success('Data refreshed successfully');
      }
    } catch (error) {
      if (showMessage) {
        message.error('Failed to refresh data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    refreshData();
  }, []);

  // Refresh when filters change
  useEffect(() => {
    if (activeTab === 'accounts') {
      loadStaffAccounts();
    }
    identifyUsersWithoutAccounts();
  }, [filters, pagination.page, pagination.limit, activeTab]);

  // Staff accounts columns
  const staffAccountsColumns = [
    {
      title: 'Staff',
      dataIndex: 'userDisplayName',
      key: 'staff',
      render: (name, record) => (
        <Space>
          <Avatar 
            style={{ backgroundColor: '#1890ff' }}
            icon={<UserOutlined />}
          >
            {record.user?.firstName?.[0]}{record.user?.lastName?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>{name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.userEmail}
            </div>
          </div>
        </Space>
      ),
      sorter: (a, b) => a.userDisplayName.localeCompare(b.userDisplayName)
    },
    {
      title: 'Station',
      dataIndex: 'stationDisplayName',
      key: 'station',
      render: (text) => (
        <Tag color="blue">
          {text}
        </Tag>
      )
    },
    {
      title: 'Balance',
      dataIndex: 'currentBalanceDisplay',
      key: 'balance',
      render: (display, record) => (
        <Space direction="vertical" size={0}>
          <div style={{ 
            color: record.currentBalance < 0 ? '#ff4d4f' : '#52c41a',
            fontWeight: 'bold'
          }}>
            {display}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.currentBalance < 0 ? 'Owes Station' : 'Settled'}
          </div>
        </Space>
      ),
      align: 'right',
      sorter: (a, b) => a.currentBalance - b.currentBalance
    },
    {
      title: 'Salary',
      dataIndex: 'salaryAmountDisplay',
      key: 'salary',
      render: (display) => (
        <Tag color="green">
          {display}
        </Tag>
      ),
      align: 'right'
    },
    {
      title: 'Shortages',
      dataIndex: 'totalShortagesDisplay',
      key: 'shortages',
      render: (display, record) => (
        <Tag color={record.hasShortages ? 'red' : 'green'}>
          {display}
        </Tag>
      ),
      align: 'right'
    },
    {
      title: 'Advances',
      dataIndex: 'totalAdvancesDisplay',
      key: 'advances',
      render: (display) => (
        <Tag color="orange">
          {display}
        </Tag>
      ),
      align: 'right'
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive, record) => (
        <Space>
          <Tag color={isActive ? 'green' : 'red'}>
            {isActive ? 'Active' : 'Inactive'}
          </Tag>
          {record.isOnHold && (
            <Tag color="orange">On Hold</Tag>
          )}
        </Space>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false }
      ],
      onFilter: (value, record) => record.isActive === value
    },
    {
      title: 'Payment Method',
      dataIndex: 'payrollMethodDisplay',
      key: 'paymentMethod',
      render: (text) => (
        <Tag color="blue">
          {text}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewAccount(record)}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'create-shortage',
                  label: 'Record Shortage',
                  icon: <AccountBookOutlined />,
                  onClick: () => {
                    forms.shortage.setFieldsValue({ staffAccountId: record.id });
                    setModalVisible(prev => ({ ...prev, createShortage: true }));
                  }
                },
                {
                  key: 'create-advance',
                  label: 'Give Advance',
                  icon: <MoneyCollectOutlined />,
                  onClick: () => {
                    forms.advance.setFieldsValue({ staffAccountId: record.id });
                    setModalVisible(prev => ({ ...prev, createAdvance: true }));
                  }
                },
                {
                  key: 'create-payment',
                  label: 'Make Payment',
                  icon: <DollarOutlined />,
                  onClick: () => {
                    forms.payment.setFieldsValue({ staffAccountId: record.id });
                    setModalVisible(prev => ({ ...prev, createPayment: true }));
                  }
                }
              ]
            }}
            trigger={['click']}
          >
            <Button icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </Space>
      )
    }
  ];

  // Users without accounts columns
  const usersWithoutAccountsColumns = [
    {
      title: 'Staff',
      key: 'staff',
      render: (user) => (
        <Space>
          <Avatar 
            style={{ backgroundColor: '#1890ff' }}
            icon={<UserOutlined />}
          >
            {user.firstName?.[0]}{user.lastName?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {user.firstName} {user.lastName}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {user.role === 'STATION_MANAGER' ? 'Manager' : 
               user.role === 'SUPERVISOR' ? 'Supervisor' : 'Attendant'}
            </div>
          </div>
        </Space>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Station',
      key: 'station',
      render: (user) => {
        const stationNames = user.stationAssignments?.map(assignment => {
          const station = stations.find(s => s.id === assignment.stationId);
          return station ? `${station.code} - ${station.name}` : 'Unknown';
        }).join(', ') || 'Not assigned';
        
        return <Tag color="blue">{stationNames}</Tag>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (user) => (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            forms.account.setFieldsValue({ 
              userId: user.id,
              stationId: user.stationAssignments?.[0]?.stationId || currentStationId
            });
            setModalVisible(prev => ({ ...prev, createAccount: true }));
          }}
        >
          Create Account
        </Button>
      )
    }
  ];

  // Transaction columns
  const transactionColumns = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'date',
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'SHORTAGE' ? 'red' : 
                    type === 'ADVANCE' ? 'orange' : 
                    type === 'SALARY_PAYMENT' ? 'green' : 'blue'}>
          {type === 'SHORTAGE' ? 'Shortage' : 
           type === 'ADVANCE' ? 'Advance' : 
           type === 'SALARY_PAYMENT' ? 'Salary' : type}
        </Tag>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => (
        <div style={{ 
          color: ['SHORTAGE', 'ADVANCE'].includes(record.type) ? '#ff4d4f' : '#52c41a',
          fontWeight: 'bold'
        }}>
          {staffAccountService.formatCurrency(amount)}
        </div>
      ),
      align: 'right'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'SETTLED' ? 'green' : 
                    status === 'PENDING' ? 'orange' : 'default'}>
          {status}
        </Tag>
      )
    }
  ];

  // Handle view account
  const handleViewAccount = (account) => {
    setSelectedAccount(account);
    setViewMode('details');
    loadAccountDetails(account.id);
  };

  // Get role display name
  const getRoleDisplayName = (role) => {
    const roleMap = {
      'STATION_MANAGER': 'Station Manager',
      'SUPERVISOR': 'Supervisor',
      'ATTENDANT': 'Attendant'
    };
    return roleMap[role] || role;
  };

  // Create menu
  const createMenu = (
    <Menu>
      <Menu.Item 
        key="create-account" 
        icon={<UserOutlined />}
        onClick={() => setModalVisible(prev => ({ ...prev, createAccount: true }))}
      >
        Create Account
      </Menu.Item>
      <Menu.Item 
        key="shortage" 
        icon={<AccountBookOutlined />}
        onClick={() => setModalVisible(prev => ({ ...prev, createShortage: true }))}
      >
        Record Shortage
      </Menu.Item>
      <Menu.Item 
        key="advance" 
        icon={<MoneyCollectOutlined />}
        onClick={() => setModalVisible(prev => ({ ...prev, createAdvance: true }))}
      >
        Give Advance
      </Menu.Item>
      <Menu.Item 
        key="payment" 
        icon={<DollarOutlined />}
        onClick={() => setModalVisible(prev => ({ ...prev, createPayment: true }))}
      >
        Make Single Payment
      </Menu.Item>
    </Menu>
  );

  // Tab items
  const tabItems = [
    {
      key: 'accounts',
      label: (
        <span>
          <TeamOutlined />
          Staff Accounts ({staffAccounts.length})
        </span>
      )
    },
    {
      key: 'no-accounts',
      label: (
        <span>
          <ExclamationCircleOutlined />
          No Account ({usersWithoutAccounts.length})
        </span>
      )
    }
  ];

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <Card className="shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <h2 className="m-0 text-xl font-bold">
                <ShopOutlined className="mr-2" />
                Staff Account Management
              </h2>
              <p className="m-0 text-gray-500">
                Manage staff finances, shortages, advances, and payments
              </p>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Tooltip title="Refresh">
                  <Button
                    icon={<SyncOutlined spin={loading} />}
                    onClick={() => refreshData(true)}
                    loading={loading}
                  >
                    Refresh
                  </Button>
                </Tooltip>
              </Col>
              <Col>
                <Dropdown overlay={createMenu} trigger={['click']}>
                  <Button type="primary" icon={<PlusOutlined />}>
                    Create
                  </Button>
                </Dropdown>
              </Col>
              {viewMode === 'details' && (
                <Col>
                  <Button onClick={() => setViewMode('list')}>
                    Back to List
                  </Button>
                </Col>
              )}
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      {viewMode === 'list' && (
        <Card size="small" className="shadow-sm">
          <Row gutter={[8, 8]} align="middle">
            <Col xs={24} sm={8} md={6}>
              <Input
                placeholder="Search staff..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                prefix={<UserOutlined />}
              />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Select
                style={{ width: '100%' }}
                placeholder="Status"
                value={filters.isActive}
                onChange={(value) => setFilters(prev => ({ ...prev, isActive: value }))}
                allowClear
              >
                <Option value="true">Active</Option>
                <Option value="false">Inactive</Option>
              </Select>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Select
                style={{ width: '100%' }}
                placeholder="Shortages"
                value={filters.hasShortages}
                onChange={(value) => setFilters(prev => ({ ...prev, hasShortages: value }))}
                allowClear
              >
                <Option value="true">Has Shortages</Option>
                <Option value="false">No Shortages</Option>
              </Select>
            </Col>
            {isCompanyAdmin && (
              <Col xs={24} sm={8} md={6}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select Station"
                  value={filters.stationId}
                  onChange={(value) => setFilters(prev => ({ ...prev, stationId: value }))}
                  allowClear
                >
                  {stations.map(station => (
                    <Option key={station.id} value={station.id}>
                      {station.code} - {station.name}
                    </Option>
                  ))}
                </Select>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* Main Content */}
      {viewMode === 'list' ? (
        <>
          {/* Tabs */}
          <Card className="shadow-sm">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
            />
          </Card>

          {/* Content based on active tab */}
          {activeTab === 'accounts' ? (
            <>
              {/* Statistics */}
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="shadow-sm">
                    <Statistic
                      title="Total Accounts"
                      value={staffAccounts.length}
                      prefix={<TeamOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="shadow-sm">
                    <Statistic
                      title="Active Accounts"
                      value={staffAccounts.filter(a => a.isActive).length}
                      prefix={<CheckCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="shadow-sm">
                    <Statistic
                      title="Total Shortages"
                      value={staffAccounts.reduce((sum, acc) => sum + (acc.totalShortages || 0), 0)}
                      precision={2}
                      formatter={value => staffAccountService.formatCurrency(value)}
                      prefix={<AccountBookOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="shadow-sm">
                    <Statistic
                      title="Total Advances"
                      value={staffAccounts.reduce((sum, acc) => sum + (acc.totalAdvances || 0), 0)}
                      precision={2}
                      formatter={value => staffAccountService.formatCurrency(value)}
                      prefix={<MoneyCollectOutlined />}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Staff Accounts Table */}
              <Card className="shadow-sm">
                <Table
                  columns={staffAccountsColumns}
                  dataSource={staffAccounts}
                  loading={loading}
                  rowKey="id"
                  pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => 
                      `Showing ${range[0]}-${range[1]} of ${total} accounts`,
                    onChange: (page, pageSize) => {
                      setPagination(prev => ({ ...prev, page, limit: pageSize }));
                    }
                  }}
                />
              </Card>
            </>
          ) : (
            /* Users Without Accounts */
            <Card className="shadow-sm">
              <Alert
                message="Users Without Accounts"
                description="These staff members are registered in the system but don't have financial accounts. Create accounts to enable salary payments, advances, and shortage tracking."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              <Table
                columns={usersWithoutAccountsColumns}
                dataSource={usersWithoutAccounts}
                loading={loading}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true
                }}
                locale={{
                  emptyText: 'All staff members have accounts'
                }}
              />
            </Card>
          )}
        </>
      ) : (
        /* Account Details View */
        selectedAccount && (
          <div className="space-y-4">
            {/* Account Header */}
            <Card className="shadow-sm">
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Space>
                    <Avatar 
                      size={64} 
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#1890ff' }}
                    >
                      {selectedAccount.user?.firstName?.[0]}{selectedAccount.user?.lastName?.[0]}
                    </Avatar>
                    <Space direction="vertical" size={0}>
                      <h3 className="m-0 font-bold">{selectedAccount.userDisplayName}</h3>
                      <p className="m-0 text-gray-500">
                        {selectedAccount.userEmail}
                      </p>
                      <p className="m-0 text-gray-500">
                        {getRoleDisplayName(selectedAccount.user?.role)}
                      </p>
                    </Space>
                  </Space>
                </Col>
                <Col xs={24} md={8}>
                  <Space direction="vertical" size={2}>
                    <div>
                      <Tag color={selectedAccount.isActive ? 'green' : 'red'}>
                        {selectedAccount.isActive ? 'Active' : 'Inactive'}
                      </Tag>
                      {selectedAccount.isOnHold && (
                        <Tag color="orange">On Hold</Tag>
                      )}
                    </div>
                    <div className="text-gray-500">
                      Station: {selectedAccount.stationDisplayName}
                    </div>
                    <div className="text-gray-500">
                      Payment: {selectedAccount.payrollMethodDisplay}
                    </div>
                  </Space>
                </Col>
                <Col xs={24} md={8}>
                  <Space direction="vertical" size={2} className="text-right">
                    <div className="text-2xl font-bold" style={{ 
                      color: selectedAccount.currentBalance < 0 ? '#ff4d4f' : '#52c41a'
                    }}>
                      {selectedAccount.currentBalanceDisplay}
                    </div>
                    <div className="text-gray-500">
                      {selectedAccount.currentBalance < 0 ? 'Owes Station' : 'Settled'}
                    </div>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Financial Summary */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Card size="small" className="shadow-sm">
                  <Statistic
                    title="Salary"
                    value={selectedAccount.salaryAmountDisplay}
                    prefix={<DollarOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card size="small" className="shadow-sm">
                  <Statistic
                    title="Credit Limit"
                    value={selectedAccount.creditLimitDisplay}
                    prefix={<CreditCardOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card size="small" className="shadow-sm">
                  <Statistic
                    title="Shortages"
                    value={selectedAccount.totalShortagesDisplay}
                    prefix={<AccountBookOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {/* Transactions */}
            <Card
              className="shadow-sm"
              title={
                <Space>
                  <HistoryOutlined />
                  Recent Transactions
                </Space>
              }
            >
              <Table
                columns={transactionColumns}
                dataSource={accountTransactions}
                loading={loading}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </div>
        )
      )}

      {/* Create Account Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            Create Staff Account
          </Space>
        }
        open={modalVisible.createAccount}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, createAccount: false }));
          forms.account.resetFields();
          setFormErrors([]);
        }}
        onOk={() => forms.account.submit()}
        okText="Create Account"
        cancelText="Cancel"
        width={500}
        confirmLoading={submitting}
      >
        {formErrors.length > 0 && (
          <Alert
            message="Validation Error"
            description={
              <ul className="m-0 pl-4">
                {formErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            className="mb-4"
          />
        )}

        <Form
          form={forms.account}
          layout="vertical"
          onFinish={handleCreateAccount}
        >
          <Form.Item
            name="userId"
            label="Select Staff Member"
            rules={[{ required: true, message: 'Please select staff member' }]}
          >
            <Select
              placeholder="Select staff"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {usersWithoutAccounts.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} - {getRoleDisplayName(user.role)}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {isCompanyAdmin && (
            <Form.Item
              name="stationId"
              label="Station"
              rules={[{ required: true, message: 'Please select station' }]}
            >
              <Select placeholder="Select station">
                {stations.map(station => (
                  <Option key={station.id} value={station.id}>
                    {station.code} - {station.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="salaryAmount"
                label="Salary Amount"
                rules={[{ type: 'number', min: 0, message: 'Salary must be positive' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter salary"
                  min={0}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="creditLimit"
                label="Credit Limit"
                initialValue={5000}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Credit limit"
                  min={0}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="payrollMethod"
            label="Payment Method"
            initialValue="STATION_WALLET"
          >
            <Select placeholder="Select payment method">
              <Option value="STATION_WALLET">Station Wallet</Option>
              <Option value="BANK_TRANSFER">Bank Transfer</Option>
              <Option value="MOBILE_MONEY">Mobile Money</Option>
              <Option value="CASH">Cash</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="paymentSchedule"
            label="Payment Schedule"
            initialValue="MONTHLY"
          >
            <Select placeholder="Select payment schedule">
              <Option value="DAILY">Daily</Option>
              <Option value="WEEKLY">Weekly</Option>
              <Option value="BI_WEEKLY">Bi-Weekly</Option>
              <Option value="MONTHLY">Monthly</Option>
              <Option value="QUARTERLY">Quarterly</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Shortage Modal */}
      <Modal
        title={
          <Space>
            <AccountBookOutlined />
            Record Shortage
          </Space>
        }
        open={modalVisible.createShortage}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, createShortage: false }));
          forms.shortage.resetFields();
          setFormErrors([]);
        }}
        onOk={() => forms.shortage.submit()}
        okText="Record Shortage"
        cancelText="Cancel"
        width={500}
        confirmLoading={submitting}
      >
        {formErrors.length > 0 && (
          <Alert
            message="Validation Error"
            description={
              <ul className="m-0 pl-4">
                {formErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            className="mb-4"
          />
        )}

        <Form
          form={forms.shortage}
          layout="vertical"
          onFinish={handleCreateShortage}
        >
          <Form.Item
            name="staffAccountId"
            label="Staff Member"
            rules={[{ required: true, message: 'Please select staff member' }]}
          >
            <Select
              placeholder="Select staff"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {staffAccounts
                .filter(acc => acc.isActive)
                .map(account => (
                  <Option key={account.id} value={account.id}>
                    {account.userDisplayName}
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Shortage Amount"
            rules={[
              { required: true, message: 'Please enter amount' },
              { type: 'number', min: 1, message: 'Amount must be positive' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter amount"
              min={1}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea
              placeholder="Enter shortage description"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="referenceNumber"
            label="Reference Number (Optional)"
          >
            <Input placeholder="e.g., SHIFT-001, COLLECTION-2024" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Advance Modal */}
      <Modal
        title={
          <Space>
            <MoneyCollectOutlined />
            Give Advance
          </Space>
        }
        open={modalVisible.createAdvance}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, createAdvance: false }));
          forms.advance.resetFields();
          setFormErrors([]);
        }}
        onOk={() => forms.advance.submit()}
        okText="Give Advance"
        cancelText="Cancel"
        width={500}
        confirmLoading={submitting}
      >
        {formErrors.length > 0 && (
          <Alert
            message="Validation Error"
            description={
              <ul className="m-0 pl-4">
                {formErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            className="mb-4"
          />
        )}

        <Form
          form={forms.advance}
          layout="vertical"
          onFinish={handleCreateAdvance}
        >
          <Form.Item
            name="staffAccountId"
            label="Staff Member"
            rules={[{ required: true, message: 'Please select staff member' }]}
          >
            <Select
              placeholder="Select staff"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {staffAccounts
                .filter(acc => acc.isActive)
                .map(account => (
                  <Option key={account.id} value={account.id}>
                    {account.userDisplayName}
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Advance Amount"
            rules={[
              { required: true, message: 'Please enter amount' },
              { type: 'number', min: 1, message: 'Amount must be positive' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter amount"
              min={1}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea
              placeholder="Enter advance description"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="Payment Method"
            initialValue="STATION_WALLET"
          >
            <Select placeholder="Select payment method">
              <Option value="STATION_WALLET">Station Wallet</Option>
              <Option value="BANK_TRANSFER">Bank Transfer</Option>
              <Option value="MOBILE_MONEY">Mobile Money</Option>
              <Option value="CASH">Cash</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StaffAccountManagement;