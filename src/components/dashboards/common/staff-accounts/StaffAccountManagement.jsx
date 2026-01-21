import React, { useState, useEffect } from 'react';
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
  Alert,
  Avatar,
  Badge,
  Popconfirm,
  Dropdown,
  Typography,
  Descriptions,
  Divider,
  DatePicker,
  Switch
} from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  EyeOutlined,
  PlusOutlined,
  SyncOutlined,
  MoreOutlined,
  MoneyCollectOutlined,
  CreditCardOutlined,
  AccountBookOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  BankOutlined,
  WalletOutlined,
  ShopOutlined,
  InfoCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  LockOutlined,
  UnlockOutlined,
  ReloadOutlined,
  BarChartOutlined,
  HistoryOutlined,
  SettingOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import { staffAccountService } from '../../../../services/staffAccountService/staffAccountService';
import { userService } from '../../../../services/userService/userService';
import { stationService } from '../../../../services/stationService/stationService';
import { useApp } from '../../../../context/AppContext';
import dayjs from 'dayjs';

const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

const StaffAccountManagement = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [usersWithoutAccounts, setUsersWithoutAccounts] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [modalVisible, setModalVisible] = useState({
    createAccount: false,
    updateAccount: false,
    viewDetails: false,
    accountActions: false
  });
  const [holdReason, setHoldReason] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('');
  const [forms] = Form.useForm();
  const [createForm] = Form.useForm();
  const [updateForm] = Form.useForm();
  const [filters, setFilters] = useState({
    search: '',
    isActive: 'all', // 'all', 'active', 'inactive'
    isOnHold: 'all', // 'all', 'onHold', 'notOnHold'
    payrollMethod: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    includeTransactions: false,
    includeShortages: false
  });
  const [accountSummary, setAccountSummary] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const currentUser = state?.currentUser;
  const isCompanyAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(currentUser?.role);
  const isStationManager = ['STATION_MANAGER'].includes(currentUser?.role);
  const currentStationId = state?.currentStation?.id;
  const currentCompanyId = currentUser?.companyId;

  // Fetch stations
  const fetchStations = async () => {
    try {
      const response = await stationService.getCompanyStations();
      setStations(response || []);
    } catch (error) {
      console.error('Failed to fetch stations:', error);
      message.error('Failed to fetch stations');
    }
  };

  // Fetch staff accounts
  const fetchStaffAccounts = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      let accounts = [];
      let total = 0;
      
      const filterParams = {
        page,
        limit: pageSize,
        ...filters
      };
      
      // Remove 'all' values from filters
      Object.keys(filterParams).forEach(key => {
        if (filterParams[key] === 'all') {
          delete filterParams[key];
        }
      });
      
      if (isCompanyAdmin && currentCompanyId) {
        // Company admin can see all accounts in the company
        const result = await staffAccountService.getStaffAccountsByCompany(currentCompanyId, filterParams);
        accounts = result?.accounts || [];
        total = result?.pagination?.total || 0;
      } else if (isStationManager && currentStationId) {
        // Station manager sees only accounts in their station
        const result = await staffAccountService.getStaffAccountsByStation(currentStationId, filterParams);
        accounts = result?.accounts || [];
        total = result?.pagination?.total || 0;
      } else {
        // Fallback to all accounts with proper permissions
        const result = await staffAccountService.getAllStaffAccounts(filterParams);
        accounts = result?.accounts || [];
        total = result?.pagination?.total || 0;
      }
      
      setStaffAccounts(accounts);
      setPagination({
        current: page,
        pageSize,
        total
      });
      
    } catch (error) {
      console.error('Error loading staff accounts:', error);
      message.error(error.message || 'Failed to load staff accounts');
      setStaffAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users without accounts
  const fetchUsersWithoutAccounts = async () => {
    try {
      if (currentCompanyId) {
        const stationId = isStationManager ? currentStationId : null;
        const users = await staffAccountService.getUsersWithoutAccounts(currentCompanyId, stationId);
        setUsersWithoutAccounts(users);
      }
    } catch (error) {
      console.error('Failed to fetch users without accounts:', error);
      message.error('Failed to fetch users without accounts');
    }
  };

  // Fetch account summary
  const fetchAccountSummary = async () => {
    try {
      const stationId = isStationManager ? currentStationId : null;
      const companyId = isCompanyAdmin ? currentCompanyId : null;
      const summary = await staffAccountService.getStaffAccountSummary(stationId, companyId);
      setAccountSummary(summary);
    } catch (error) {
      console.error('Failed to fetch account summary:', error);
      message.error('Failed to fetch account summary');
    }
  };

  // Handle create account
  const handleCreateAccount = async (values) => {
    setSubmitting(true);
    
    try {
      // Fix payroll method if STATION_WALLET is selected (should be STAFF_WALLET)
      if (values.payrollMethod === 'STATION_WALLET') {
        values.payrollMethod = 'STAFF_WALLET';
      }
      
      // Validate using service
      const validationErrors = staffAccountService.validateStaffAccount(values);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      const account = await staffAccountService.createStaffAccount(values);
      message.success('Staff account created successfully');
      
      setModalVisible(prev => ({ ...prev, createAccount: false }));
      createForm.resetFields();
      await refreshData();
      
    } catch (error) {
      console.error('Failed to create account:', error);
      message.error(error.message || 'Failed to create staff account');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle update account
  const handleUpdateAccount = async (values) => {
    if (!selectedAccount) return;
    
    setSubmitting(true);
    
    try {
      // Fix payroll method if STATION_WALLET is selected (should be STAFF_WALLET)
      if (values.payrollMethod === 'STATION_WALLET') {
        values.payrollMethod = 'STAFF_WALLET';
      }
      
      const updatedAccount = await staffAccountService.updateStaffAccount(selectedAccount.id, values);
      message.success('Staff account updated successfully');
      
      setModalVisible(prev => ({ ...prev, updateAccount: false }));
      updateForm.resetFields();
      setSelectedAccount(null);
      await refreshData();
      
    } catch (error) {
      console.error('Failed to update account:', error);
      message.error(error.message || 'Failed to update staff account');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle activate account
  const handleActivateAccount = async (accountId) => {
    setSubmitting(true);
    
    try {
      const account = await staffAccountService.activateStaffAccount(accountId);
      message.success('Staff account activated successfully');
      await refreshData();
    } catch (error) {
      console.error('Failed to activate account:', error);
      message.error(error.message || 'Failed to activate staff account');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle deactivate account
  const handleDeactivateAccount = async (accountId, reason) => {
    setSubmitting(true);
    
    try {
      const account = await staffAccountService.deactivateStaffAccount(accountId, reason);
      message.success('Staff account deactivated successfully');
      await refreshData();
    } catch (error) {
      console.error('Failed to deactivate account:', error);
      message.error(error.message || 'Failed to deactivate staff account');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle put account on hold
  const handlePutOnHold = (accountId) => {
    Modal.confirm({
      title: 'Put Account On Hold',
      content: (
        <div>
          <p>Please provide a reason for putting this account on hold:</p>
          <TextArea 
            placeholder="Enter reason (required)"
            rows={3}
            onChange={(e) => setHoldReason(e.target.value)}
            value={holdReason}
          />
        </div>
      ),
      onOk: async () => {
        if (!holdReason.trim()) {
          message.error('Reason is required when putting account on hold');
          return;
        }
        
        try {
          setSubmitting(true);
          const account = await staffAccountService.putAccountOnHold(accountId, holdReason);
          message.success('Account put on hold successfully');
          setHoldReason('');
          await refreshData();
        } catch (error) {
          console.error('Failed to put account on hold:', error);
          message.error(error.message || 'Failed to put account on hold');
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  // Handle remove from hold
  const handleRemoveFromHold = async (accountId) => {
    setSubmitting(true);
    
    try {
      const account = await staffAccountService.removeAccountFromHold(accountId);
      message.success('Account removed from hold successfully');
      await refreshData();
    } catch (error) {
      console.error('Failed to remove account from hold:', error);
      message.error(error.message || 'Failed to remove account from hold');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async (accountId) => {
    Modal.confirm({
      title: 'Delete Staff Account',
      content: (
        <div>
          <Alert
            message="Warning"
            description="This action will permanently delete the staff account. Please confirm with a reason:"
            type="warning"
            showIcon
          />
          <TextArea 
            placeholder="Enter reason for deletion"
            rows={3}
            style={{ marginTop: 16 }}
            onChange={(e) => setDeactivateReason(e.target.value)}
            value={deactivateReason}
          />
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        setSubmitting(true);
        try {
          await staffAccountService.deleteStaffAccount(accountId, deactivateReason);
          message.success('Staff account deleted successfully');
          setDeactivateReason('');
          await refreshData();
        } catch (error) {
          console.error('Failed to delete account:', error);
          message.error(error.message || 'Failed to delete staff account');
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  // Main refresh function
  const refreshData = async (showMessage = false) => {
    try {
      setLoading(true);
      
      await Promise.all([
        fetchStations(),
        fetchStaffAccounts(pagination.current, pagination.pageSize),
        fetchUsersWithoutAccounts(),
        fetchAccountSummary()
      ]);
      
      if (showMessage) {
        message.success('Data refreshed successfully');
      }
    } catch (error) {
      console.error('Error during refresh:', error);
      if (showMessage) {
        message.error('Failed to refresh data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle table pagination
  const handleTableChange = (newPagination) => {
    fetchStaffAccounts(newPagination.current, newPagination.pageSize);
  };

  // Apply filters
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchStaffAccounts(1, pagination.pageSize);
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  }, [filters]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, []);

  // Table columns
  const accountColumns = [
    {
      title: 'Staff Member',
      key: 'staff',
      render: (account) => (
        <Space>
          <Avatar 
            style={{ backgroundColor: '#1890ff' }}
            icon={<UserOutlined />}
          >
            {(account.user?.firstName?.[0] || account.userDisplayName?.[0] || 'U').toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {account.userDisplayName || `${account.user?.firstName} ${account.user?.lastName}`}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {account.userEmail || account.user?.email || 'No email'}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {account.stationDisplayName || account.station?.name || 'No station'}
            </div>
          </div>
        </Space>
      ),
      sorter: (a, b) => (a.userDisplayName || '').localeCompare(b.userDisplayName || '')
    },
    {
      title: 'Status',
      key: 'status',
      render: (account) => {
        const statusColor = account.isActive ? 'success' : 'default';
        const statusText = account.isActive ? 'Active' : 'Inactive';
        const holdColor = account.isOnHold ? 'warning' : 'default';
        const holdText = account.isOnHold ? 'On Hold' : 'Normal';
        
        return (
          <Space direction="vertical" size={2}>
            <Tag color={statusColor}>
              {statusText}
            </Tag>
            {account.isOnHold && (
              <Tag color={holdColor} icon={<LockOutlined />}>
                {holdText}
              </Tag>
            )}
          </Space>
        );
      },
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
        { text: 'On Hold', value: 'onHold' }
      ],
      onFilter: (value, account) => {
        if (value === 'active') return account.isActive;
        if (value === 'inactive') return !account.isActive;
        if (value === 'onHold') return account.isOnHold;
        return true;
      }
    },
    {
      title: 'Balance',
      key: 'balance',
      render: (account) => {
        const balance = account.currentBalance || 0;
        const color = balance < 0 ? '#ff4d4f' : balance > 0 ? '#52c41a' : '#666';
        const status = balance < 0 ? 'Owes' : balance > 0 ? 'Credit' : 'Zero';
        
        return (
          <Space direction="vertical" size={0}>
            <Text 
              strong 
              style={{ 
                color,
                fontSize: '16px'
              }}
            >
              {staffAccountService.formatCurrency(balance)}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {status}
            </Text>
            {account.creditLimit && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Limit: {staffAccountService.formatCurrency(account.creditLimit)}
              </Text>
            )}
          </Space>
        );
      },
      sorter: (a, b) => (a.currentBalance || 0) - (b.currentBalance || 0)
    },
    {
      title: 'Salary',
      key: 'salary',
      render: (account) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontSize: '12px' }}>
            <Text strong>
              {account.salaryAmount ? staffAccountService.formatCurrency(account.salaryAmount) : 'Not Set'}
            </Text>
          </div>
          <div style={{ fontSize: '12px' }}>
            <Text type="secondary">
              {account.paymentSchedule ? staffAccountService.getPaymentScheduleLabel(account.paymentSchedule) : 'Monthly'}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Payment Method',
      key: 'paymentMethod',
      render: (account) => {
        const method = account.payrollMethod || 'STAFF_WALLET';
        const methodLabel = staffAccountService.getPayrollMethodLabel(method);
        
        return (
          <Space direction="vertical" size={0}>
            <div>
              {method === 'BANK_TRANSFER' ? <BankOutlined /> :
               method === 'MOBILE_MONEY' ? <PhoneOutlined /> :
               method === 'CASH' ? <DollarOutlined /> :
               <WalletOutlined />}
              <span style={{ marginLeft: 8 }}>{methodLabel}</span>
            </div>
            {method === 'BANK_TRANSFER' && account.bankAccountNumber && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {account.bankAccountNumber}
              </Text>
            )}
            {method === 'MOBILE_MONEY' && account.mobileMoneyNumber && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {account.mobileMoneyNumber}
              </Text>
            )}
          </Space>
        );
      },
      filters: [
        { text: 'Staff Wallet', value: 'STAFF_WALLET' },
        { text: 'Bank Transfer', value: 'BANK_TRANSFER' },
        { text: 'Mobile Money', value: 'MOBILE_MONEY' },
        { text: 'Cash', value: 'CASH' }
      ],
      onFilter: (value, account) => account.payrollMethod === value
    },
    {
      title: 'Shortages',
      key: 'shortages',
      render: (account) => {
        const shortages = account.totalShortages || 0;
        const shortagesDisplay = shortages > 0 ? 
          staffAccountService.formatCurrency(shortages) : 'None';
        
        return (
          <Text 
            style={{ 
              color: shortages > 0 ? '#ff4d4f' : '#52c41a',
              fontWeight: shortages > 0 ? 'bold' : 'normal'
            }}
          >
            {shortagesDisplay}
          </Text>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (account) => {
        const actionItems = [
          {
            key: 'view',
            label: 'View Details',
            icon: <EyeOutlined />,
            onClick: () => {
              setSelectedAccount(account);
              setModalVisible(prev => ({ ...prev, viewDetails: true }));
            }
          },
          {
            key: 'edit',
            label: 'Edit Account',
            icon: <EditOutlined />,
            onClick: () => {
              setSelectedAccount(account);
              updateForm.setFieldsValue({
                creditLimit: account.creditLimit,
                salaryAmount: account.salaryAmount,
                payrollMethod: account.payrollMethod || 'STAFF_WALLET',
                paymentSchedule: account.paymentSchedule || 'MONTHLY',
                bankAccountNumber: account.bankAccountNumber,
                bankName: account.bankName,
                mobileMoneyNumber: account.mobileMoneyNumber,
                nextPaymentDate: account.nextPaymentDate ? dayjs(account.nextPaymentDate) : null,
                isActive: account.isActive,
                notes: account.notes
              });
              setModalVisible(prev => ({ ...prev, updateAccount: true }));
            }
          },
          {
            type: 'divider'
          },
          account.isActive ? {
            key: 'deactivate',
            label: 'Deactivate',
            icon: <PauseCircleOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: 'Deactivate Account',
                content: (
                  <div>
                    <p>Please provide a reason for deactivating this account:</p>
                    <TextArea 
                      placeholder="Enter reason"
                      rows={3}
                      onChange={(e) => setDeactivateReason(e.target.value)}
                      value={deactivateReason}
                    />
                  </div>
                ),
                onOk: () => handleDeactivateAccount(account.id, deactivateReason)
              });
            }
          } : {
            key: 'activate',
            label: 'Activate',
            icon: <PlayCircleOutlined />,
            onClick: () => handleActivateAccount(account.id)
          },
          account.isOnHold ? {
            key: 'removeHold',
            label: 'Remove from Hold',
            icon: <UnlockOutlined />,
            onClick: () => handleRemoveFromHold(account.id)
          } : {
            key: 'putOnHold',
            label: 'Put on Hold',
            icon: <LockOutlined />,
            onClick: () => handlePutOnHold(account.id)
          },
          {
            type: 'divider'
          },
          {
            key: 'delete',
            label: 'Delete Account',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDeleteAccount(account.id)
          }
        ].filter(item => item); // Remove null items

        return (
          <Space size="small">
            <Dropdown
              menu={{ items: actionItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                icon={<MoreOutlined />}
                size="small"
              />
            </Dropdown>
          </Space>
        );
      }
    }
  ];

  // Users without accounts columns
  const usersWithoutAccountsColumns = [
    {
      title: 'User',
      key: 'user',
      render: (user) => (
        <Space>
          <Avatar icon={<UserOutlined />}>
            {(user.firstName?.[0] || user.displayName?.[0] || 'U').toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {user.displayName || `${user.firstName} ${user.lastName}`}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {user.email}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {user.companyName}
            </div>
          </div>
        </Space>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (user) => (
        <Tag color={user.statusColor || 'default'}>
          {user.status || 'Unknown'}
        </Tag>
      )
    },
    {
      title: 'Assigned Stations',
      key: 'stations',
      render: (user) => (
        <Space direction="vertical" size={2}>
          {user.stationAssignmentsDisplay?.map((assignment, index) => (
            <Tag key={index} color="blue">
              {assignment.stationName} ({assignment.role})
            </Tag>
          )) || <Text type="secondary">No assignments</Text>}
        </Space>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (user) => (
        <Tooltip title="Create Staff Account">
          <Button
            type="primary"
            size="small"
            onClick={() => {
              createForm.setFieldsValue({
                userId: user.id,
                stationId: user.stationAssignmentsDisplay?.[0]?.stationId || currentStationId,
                salaryAmount: 20000,
                creditLimit: 5000,
                payrollMethod: 'STAFF_WALLET',
                paymentSchedule: 'MONTHLY',
                isActive: true
              });
              setModalVisible(prev => ({ ...prev, createAccount: true }));
            }}
            disabled={!user.canCreateAccount}
            icon={<PlusOutlined />}
          >
            Create Account
          </Button>
        </Tooltip>
      )
    }
  ];

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card className="shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <Title level={2} className="m-0">
                <ShopOutlined className="mr-2" />
                Staff Account Management
              </Title>
              <Text type="secondary">
                Manage staff financial accounts, payroll settings, and transactions
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Tooltip title="Refresh all data">
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
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    createForm.resetFields();
                    setModalVisible(prev => ({ ...prev, createAccount: true }));
                  }}
                  disabled={usersWithoutAccounts.length === 0}
                >
                  Create Account
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Summary Statistics */}
      {accountSummary && (
        <Card size="small" className="shadow-sm">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Total Accounts"
                value={accountSummary.totals?.totalAccounts || 0}
                prefix={<TeamOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Active Accounts"
                value={accountSummary.totals?.activeAccounts || 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Accounts on Hold"
                value={accountSummary.totals?.accountsOnHold || 0}
                valueStyle={{ color: '#faad14' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Positive Balance"
                value={accountSummary.totals?.totalPositiveBalanceDisplay || '$0'}
                prefix={<DollarOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Negative Balance"
                value={accountSummary.totals?.totalNegativeBalanceDisplay || '$0'}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<AccountBookOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Credit Utilization"
                value={accountSummary.totals?.creditUtilizationDisplay || '0%'}
                prefix={<BarChartOutlined />}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Filters */}
      <Card size="small" className="shadow-sm">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search by name, email, or station..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              prefix={<UserOutlined />}
              allowClear
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Account Status"
              value={filters.isActive}
              onChange={(value) => handleFilterChange('isActive', value)}
            >
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Hold Status"
              value={filters.isOnHold}
              onChange={(value) => handleFilterChange('isOnHold', value)}
            >
              <Option value="all">All</Option>
              <Option value="onHold">On Hold</Option>
              <Option value="notOnHold">Not On Hold</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Payment Method"
              value={filters.payrollMethod}
              onChange={(value) => handleFilterChange('payrollMethod', value)}
              allowClear
            >
              <Option value="STAFF_WALLET">Staff Wallet</Option>
              <Option value="BANK_TRANSFER">Bank Transfer</Option>
              <Option value="MOBILE_MONEY">Mobile Money</Option>
              <Option value="CASH">Cash</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Sort By"
              value={filters.sortBy}
              onChange={(value) => handleFilterChange('sortBy', value)}
            >
              <Option value="createdAt">Created Date</Option>
              <Option value="currentBalance">Balance</Option>
              <Option value="lastPaymentDate">Last Payment</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Accounts Table */}
      <Card 
        title={
          <Space>
            <TeamOutlined />
            <span>Staff Accounts ({staffAccounts.length})</span>
          </Space>
        }
        className="shadow-sm"
        extra={
          <Space>
            <Tooltip title="View Account Summary">
              <Button
                icon={<BarChartOutlined />}
                onClick={() => fetchAccountSummary()}
              >
                Summary
              </Button>
            </Tooltip>
          </Space>
        }
      >
        {staffAccounts.length === 0 ? (
          <Alert
            message="No Staff Accounts Found"
            description={
              loading ? 
                "Loading accounts..." :
                "No staff accounts have been created yet. Create your first staff account."
            }
            type={loading ? "info" : "warning"}
            showIcon
            action={
              <Button 
                type="primary" 
                size="small"
                onClick={() => {
                  createForm.resetFields();
                  setModalVisible(prev => ({ ...prev, createAccount: true }));
                }}
              >
                Create Account
              </Button>
            }
          />
        ) : (
          <Table
            columns={accountColumns}
            dataSource={staffAccounts}
            loading={loading}
            rowKey="id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `Showing ${range[0]}-${range[1]} of ${total} accounts`
            }}
            onChange={handleTableChange}
          />
        )}
      </Card>

      {/* Users Without Accounts */}
      {usersWithoutAccounts.length > 0 && (
        <Card 
          title={
            <Space>
              <WarningOutlined />
              <span>Users Without Accounts ({usersWithoutAccounts.length})</span>
            </Space>
          }
          className="shadow-sm"
          size="small"
        >
          <Table
            columns={usersWithoutAccountsColumns}
            dataSource={usersWithoutAccounts}
            rowKey="id"
            pagination={{
              pageSize: 5,
              hideOnSinglePage: true
            }}
            size="small"
          />
        </Card>
      )}

      {/* High Risk Accounts Warning */}
      {accountSummary?.highRiskAccounts && accountSummary.highRiskAccounts.length > 0 && (
        <Card size="small" className="shadow-sm border-l-4 border-l-red-500">
          <Alert
            message="High Risk Accounts Detected"
            description={
              <Space direction="vertical" size={2}>
                <Text>These accounts have exceeded 70% of their credit limit:</Text>
                {accountSummary.highRiskAccounts.slice(0, 3).map(account => (
                  <Text key={account.id}>
                    • {account.name}: {account.balanceDisplay} ({account.utilizationDisplay})
                  </Text>
                ))}
                {accountSummary.highRiskAccounts.length > 3 && (
                  <Text type="secondary">
                    And {accountSummary.highRiskAccounts.length - 3} more...
                  </Text>
                )}
              </Space>
            }
            type="warning"
            showIcon
          />
        </Card>
      )}

      {/* Create Account Modal */}
      <Modal
        title="Create Staff Account"
        open={modalVisible.createAccount}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, createAccount: false }));
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        okText="Create Account"
        cancelText="Cancel"
        width={600}
        confirmLoading={submitting}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateAccount}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="userId"
                label="User"
                rules={[{ required: true, message: 'Please select a user' }]}
              >
                <Select
                  placeholder="Select user"
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children || '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {usersWithoutAccounts.map(user => (
                    <Option key={user.id} value={user.id}>
                      {user.displayName} ({user.email})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="stationId"
                label="Station"
                rules={[{ required: true, message: 'Please select a station' }]}
              >
                <Select
                  placeholder="Select station"
                  showSearch
                  optionFilterProp="children"
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="salaryAmount"
                label="Salary Amount"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter salary amount"
                  min={0}
                  max={500000}
                  formatter={value => `Ksh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
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
                  placeholder="Enter credit limit"
                  min={0}
                  max={100000}
                  formatter={value => `Ksh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="payrollMethod"
                label="Payroll Method"
                initialValue="STAFF_WALLET"
              >
                <Select>
                  <Option value="STAFF_WALLET">Staff Wallet</Option>
                  <Option value="BANK_TRANSFER">Bank Transfer</Option>
                  <Option value="MOBILE_MONEY">Mobile Money</Option>
                  <Option value="CASH">Cash</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="paymentSchedule"
                label="Payment Schedule"
                initialValue="MONTHLY"
              >
                <Select>
                  <Option value="DAILY">Daily</Option>
                  <Option value="WEEKLY">Weekly</Option>
                  <Option value="BI_WEEKLY">Bi-Weekly</Option>
                  <Option value="MONTHLY">Monthly</Option>
                  <Option value="QUARTERLY">Quarterly</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="bankAccountNumber"
                label="Bank Account (if bank transfer)"
              >
                <Input placeholder="Enter bank account number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="mobileMoneyNumber"
                label="Mobile Money (if mobile money)"
              >
                <Input placeholder="Enter mobile money number" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="nextPaymentDate"
            label="Next Payment Date"
          >
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder="Select next payment date"
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <TextArea
              placeholder="Additional notes (optional)"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Update Account Modal */}
      <Modal
        title="Update Staff Account"
        open={modalVisible.updateAccount}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, updateAccount: false }));
          setSelectedAccount(null);
          updateForm.resetFields();
        }}
        onOk={() => updateForm.submit()}
        okText="Update Account"
        cancelText="Cancel"
        width={600}
        confirmLoading={submitting}
      >
        {selectedAccount && (
          <Form form={updateForm} layout="vertical" onFinish={handleUpdateAccount}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="creditLimit"
                  label="Credit Limit"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter credit limit"
                    min={0}
                    max={100000}
                    formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="salaryAmount"
                  label="Salary Amount"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter salary amount"
                    min={0}
                    max={500000}
                    formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="payrollMethod"
                  label="Payroll Method"
                >
                  <Select>
                    <Option value="STAFF_WALLET">Staff Wallet</Option>
                    <Option value="BANK_TRANSFER">Bank Transfer</Option>
                    <Option value="MOBILE_MONEY">Mobile Money</Option>
                    <Option value="CASH">Cash</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="paymentSchedule"
                  label="Payment Schedule"
                >
                  <Select>
                    <Option value="DAILY">Daily</Option>
                    <Option value="WEEKLY">Weekly</Option>
                    <Option value="BI_WEEKLY">Bi-Weekly</Option>
                    <Option value="MONTHLY">Monthly</Option>
                    <Option value="QUARTERLY">Quarterly</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="bankAccountNumber"
                  label="Bank Account Number"
                >
                  <Input placeholder="Enter bank account number" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="mobileMoneyNumber"
                  label="Mobile Money Number"
                >
                  <Input placeholder="Enter mobile money number" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="nextPaymentDate"
              label="Next Payment Date"
            >
              <DatePicker 
                style={{ width: '100%' }} 
                placeholder="Select next payment date"
              />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notes"
            >
              <TextArea
                placeholder="Additional notes"
                rows={3}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* View Account Details Modal */}
      <Modal
        title="Staff Account Details"
        open={modalVisible.viewDetails}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, viewDetails: false }));
          setSelectedAccount(null);
        }}
        footer={[
          <Button 
            key="close" 
            onClick={() => setModalVisible(prev => ({ ...prev, viewDetails: false }))}
          >
            Close
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => {
              setModalVisible(prev => ({ 
                ...prev, 
                viewDetails: false, 
                updateAccount: true 
              }));
            }}
          >
            Edit Account
          </Button>
        ]}
        width={800}
      >
        {selectedAccount && (
          <div>
            <Descriptions title="Account Information" bordered size="small" column={2}>
              <Descriptions.Item label="Staff Member">
                <Space direction="vertical" size={0}>
                  <Text strong>{selectedAccount.userDisplayName}</Text>
                  <Text type="secondary">{selectedAccount.userEmail}</Text>
                  <Text type="secondary">ID: {selectedAccount.user?.id?.substring(0, 8)}...</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Station">
                <Space direction="vertical" size={0}>
                  <Text strong>{selectedAccount.stationDisplayName}</Text>
                  <Text type="secondary">{selectedAccount.station?.location || 'No location'}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Account Status">
                <Space>
                  <Tag color={selectedAccount.isActive ? 'success' : 'default'}>
                    {selectedAccount.isActive ? 'Active' : 'Inactive'}
                  </Tag>
                  {selectedAccount.isOnHold && (
                    <Tag color="orange" icon={<LockOutlined />}>
                      On Hold
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {staffAccountService.formatDateTime(selectedAccount.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Account ID">
                <Text copyable>{selectedAccount.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {staffAccountService.formatDateTime(selectedAccount.updatedAt)}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="Financial Information" bordered size="small" column={2}>
              <Descriptions.Item label="Current Balance">
                <Space direction="vertical" size={0}>
                  <Text 
                    strong 
                    style={{ 
                      color: selectedAccount.currentBalance < 0 ? '#ff4d4f' : 
                             selectedAccount.currentBalance > 0 ? '#52c41a' : '#666',
                      fontSize: '18px'
                    }}
                  >
                    {staffAccountService.formatCurrency(selectedAccount.currentBalance)}
                  </Text>
                  <Text type="secondary">
                    {selectedAccount.currentBalance < 0 ? 'Owes Station' : 
                     selectedAccount.currentBalance > 0 ? 'Station Owes' : 'Settled'}
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Credit Limit">
                <Space direction="vertical" size={0}>
                  <Text strong>
                    {staffAccountService.formatCurrency(selectedAccount.creditLimit || 5000)}
                  </Text>
                  <Text type="secondary">
                    Available: {staffAccountService.formatCurrency(
                      (selectedAccount.creditLimit || 5000) + 
                      Math.min(selectedAccount.currentBalance, 0)
                    )}
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Salary Amount">
                {selectedAccount.salaryAmount ? 
                  staffAccountService.formatCurrency(selectedAccount.salaryAmount) : 
                  'Not Set'}
              </Descriptions.Item>
              <Descriptions.Item label="Next Payment Date">
                {selectedAccount.nextPaymentDate ? 
                  staffAccountService.formatDate(selectedAccount.nextPaymentDate) : 
                  'Not Set'}
              </Descriptions.Item>
              <Descriptions.Item label="Total Shortages">
                {staffAccountService.formatCurrency(selectedAccount.totalShortages || 0)}
              </Descriptions.Item>
              <Descriptions.Item label="Total Advances">
                {staffAccountService.formatCurrency(selectedAccount.totalAdvances || 0)}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="Payroll Settings" bordered size="small" column={2}>
              <Descriptions.Item label="Payroll Method">
                {staffAccountService.getPayrollMethodLabel(selectedAccount.payrollMethod)}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Schedule">
                {staffAccountService.getPaymentScheduleLabel(selectedAccount.paymentSchedule)}
              </Descriptions.Item>
              <Descriptions.Item label="Bank Account" span={2}>
                {selectedAccount.bankAccountNumber ? (
                  <Space direction="vertical" size={0}>
                    <Text>{selectedAccount.bankAccountNumber}</Text>
                    {selectedAccount.bankName && (
                      <Text type="secondary">{selectedAccount.bankName}</Text>
                    )}
                  </Space>
                ) : 'Not set'}
              </Descriptions.Item>
              <Descriptions.Item label="Mobile Money" span={2}>
                {selectedAccount.mobileMoneyNumber || 'Not set'}
              </Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>
                {selectedAccount.notes || 'No notes'}
              </Descriptions.Item>
            </Descriptions>

            {selectedAccount.shortageLedger && (
              <>
                <Divider />
                <Descriptions title="Shortage Ledger" bordered size="small" column={2}>
                  <Descriptions.Item label="Net Outstanding">
                    {staffAccountService.formatCurrency(selectedAccount.shortageLedger.netOutstanding || 0)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Deducted">
                    {staffAccountService.formatCurrency(selectedAccount.shortageLedger.totalDeductedAmount || 0)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Shortages Recorded">
                    {selectedAccount.shortageLedger.totalShortagesRecorded || 0}
                  </Descriptions.Item>
                  <Descriptions.Item label="Deductions Made">
                    {selectedAccount.shortageLedger.totalDeductionsMade || 0}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StaffAccountManagement;