// src/components/StaffAccounts/StaffAccountManagement.jsx
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
  Divider
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
  SettingOutlined
} from '@ant-design/icons';
import { staffAccountService } from '../../../../services/staff/staffAccountService';
import { userService } from '../../../../services/userService/userService';
import { stationService } from '../../../../services/stationService/stationService';
import { useApp } from '../../../../context/AppContext';

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
    createTransaction: false,
    accountActions: false
  });
  const [forms, setForms] = useState({
    createAccount: Form.useForm()[0],
    updateAccount: Form.useForm()[0],
    createTransaction: Form.useForm()[0]
  });
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
    }
  };

  // Fetch staff accounts
  const fetchStaffAccounts = async () => {
    try {
      setLoading(true);
      let accounts = [];
      
      if (isCompanyAdmin && currentCompanyId) {
        // Company admin can see all accounts in the company
        const result = await staffAccountService.getStaffAccountsByCompany(currentCompanyId, {
          page: 1,
          limit: 100,
          ...filters
        });
        accounts = result?.accounts || [];
      } else if (currentStationId) {
        // Station manager sees only accounts in their station
        const result = await staffAccountService.getStaffAccountsByStation(currentStationId, {
          page: 1,
          limit: 100,
          ...filters
        });
        accounts = result?.accounts || [];
      }
      
      // Format accounts for display
      const formattedAccounts = accounts.map(account => 
        staffAccountService.formatStaffAccount(account)
      );
      
      setStaffAccounts(formattedAccounts);
    } catch (error) {
      console.error('Error loading staff accounts:', error);
      message.error('Failed to load staff accounts');
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
        const formattedUsers = users.map(user => 
          staffAccountService.formatUserWithoutAccount(user)
        );
        setUsersWithoutAccounts(formattedUsers);
      }
    } catch (error) {
      console.error('Failed to fetch users without accounts:', error);
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
    }
  };

  // Handle create account
  const handleCreateAccount = async (values) => {
    setSubmitting(true);
    
    try {
      const validationErrors = staffAccountService.validateStaffAccount(values);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      const account = await staffAccountService.createStaffAccount(values);
      message.success('Staff account created successfully');
      
      setModalVisible(prev => ({ ...prev, createAccount: false }));
      forms.createAccount.resetFields();
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
      const updatedAccount = await staffAccountService.updateStaffAccount(selectedAccount.id, values);
      message.success('Staff account updated successfully');
      
      setModalVisible(prev => ({ ...prev, updateAccount: false }));
      forms.updateAccount.resetFields();
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
  const handleDeactivateAccount = async (accountId) => {
    setSubmitting(true);
    
    try {
      const account = await staffAccountService.deactivateStaffAccount(accountId);
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
  const handlePutOnHold = async (accountId) => {
    Modal.confirm({
      title: 'Put Account On Hold',
      content: (
        <div>
          <p>Are you sure you want to put this account on hold?</p>
          <TextArea 
            placeholder="Enter reason (optional)"
            rows={3}
            onChange={(e) => setHoldReason(e.target.value)}
          />
        </div>
      ),
      onOk: async () => {
        try {
          setSubmitting(true);
          const reason = document.querySelector('textarea')?.value || null;
          const account = await staffAccountService.putAccountOnHold(accountId, reason);
          message.success('Account put on hold successfully');
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
    setSubmitting(true);
    
    try {
      await staffAccountService.deleteStaffAccount(accountId);
      message.success('Staff account deleted successfully');
      await refreshData();
    } catch (error) {
      console.error('Failed to delete account:', error);
      message.error(error.message || 'Failed to delete staff account');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle create transaction
  const handleCreateTransaction = async (values) => {
    setSubmitting(true);
    
    try {
      const transaction = await staffAccountService.createStaffTransaction(values);
      message.success('Transaction recorded successfully');
      
      setModalVisible(prev => ({ ...prev, createTransaction: false }));
      forms.createTransaction.resetFields();
      await refreshData();
      
    } catch (error) {
      console.error('Failed to create transaction:', error);
      message.error(error.message || 'Failed to create transaction');
    } finally {
      setSubmitting(false);
    }
  };

  // Main refresh function
  const refreshData = async (showMessage = false) => {
    try {
      setLoading(true);
      
      await Promise.all([
        fetchStations(),
        fetchStaffAccounts(),
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

  // Apply filters
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchStaffAccounts();
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [filters.search, filters.isActive, filters.isOnHold, filters.payrollMethod]);

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
            {account.userDisplayName?.[0] || account.user?.firstName?.[0] || 'U'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {account.userDisplayName}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {account.userEmail}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {account.stationDisplayName}
            </div>
          </div>
        </Space>
      ),
      sorter: (a, b) => a.userDisplayName.localeCompare(b.userDisplayName)
    },
    {
      title: 'Status',
      key: 'status',
      render: (account) => (
        <Space direction="vertical" size={2}>
          <Badge 
            status={account.statusBadge} 
            text={account.statusText}
          />
          {account.isOnHold && (
            <Tag color="orange" icon={<LockOutlined />}>
              On Hold
            </Tag>
          )}
        </Space>
      ),
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
      render: (account) => (
        <Space direction="vertical" size={0}>
          <Text 
            strong 
            style={{ 
              color: account.currentBalanceColor,
              fontSize: '16px'
            }}
          >
            {account.currentBalanceDisplay}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {account.currentBalanceStatus}
          </Text>
        </Space>
      ),
      sorter: (a, b) => a.currentBalance - b.currentBalance
    },
    {
      title: 'Salary & Credit',
      key: 'salaryCredit',
      render: (account) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontSize: '12px' }}>
            <Text type="secondary">Salary: </Text>
            <Text strong>{account.salaryAmountDisplay}</Text>
          </div>
          <div style={{ fontSize: '12px' }}>
            <Text type="secondary">Credit Limit: </Text>
            <Text>{account.creditLimitDisplay}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Shortages & Advances',
      key: 'shortagesAdvances',
      render: (account) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontSize: '12px' }}>
            <Text type="secondary">Shortages: </Text>
            <Text strong style={{ color: account.totalShortages > 0 ? '#ff4d4f' : '#52c41a' }}>
              {account.totalShortagesDisplay}
            </Text>
          </div>
          <div style={{ fontSize: '12px' }}>
            <Text type="secondary">Advances: </Text>
            <Text>{account.totalAdvancesDisplay}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Payment Method',
      key: 'paymentMethod',
      render: (account) => (
        <Space>
          {account.payrollMethod === 'BANK_TRANSFER' ? <BankOutlined /> :
           account.payrollMethod === 'MOBILE_MONEY' ? <CreditCardOutlined /> :
           account.payrollMethod === 'CASH' ? <DollarOutlined /> :
           <WalletOutlined />}
          <span>{account.payrollMethodDisplay}</span>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {account.paymentScheduleDisplay}
          </Text>
        </Space>
      ),
      filters: [
        { text: 'Station Wallet', value: 'STATION_WALLET' },
        { text: 'Bank Transfer', value: 'BANK_TRANSFER' },
        { text: 'Mobile Money', value: 'MOBILE_MONEY' },
        { text: 'Cash', value: 'CASH' }
      ],
      onFilter: (value, account) => account.payrollMethod === value
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
              forms.updateAccount.setFieldsValue({
                creditLimit: account.creditLimit,
                salaryAmount: account.salaryAmount,
                payrollMethod: account.payrollMethod,
                paymentSchedule: account.paymentSchedule,
                bankAccountNumber: account.bankAccountNumber,
                bankName: account.bankName,
                mobileMoneyNumber: account.mobileMoneyNumber,
                nextPaymentDate: account.nextPaymentDate,
                notes: account.notes
              });
              setModalVisible(prev => ({ ...prev, updateAccount: true }));
            }
          },
          {
            key: 'transaction',
            label: 'Record Transaction',
            icon: <MoneyCollectOutlined />,
            onClick: () => {
              forms.createTransaction.setFieldsValue({ staffAccountId: account.id });
              setModalVisible(prev => ({ ...prev, createTransaction: true }));
            }
          },
          {
            type: 'divider'
          },
          {
            key: account.isActive ? 'deactivate' : 'activate',
            label: account.isActive ? 'Deactivate' : 'Activate',
            icon: account.isActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />,
            danger: account.isActive,
            onClick: () => {
              if (account.isActive) {
                handleDeactivateAccount(account.id);
              } else {
                handleActivateAccount(account.id);
              }
            }
          },
          {
            key: account.isOnHold ? 'removeHold' : 'putOnHold',
            label: account.isOnHold ? 'Remove from Hold' : 'Put on Hold',
            icon: account.isOnHold ? <UnlockOutlined /> : <LockOutlined />,
            onClick: () => {
              if (account.isOnHold) {
                handleRemoveFromHold(account.id);
              } else {
                handlePutOnHold(account.id);
              }
            }
          },
          {
            type: 'divider'
          },
          {
            key: 'delete',
            label: 'Delete Account',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: 'Delete Staff Account',
                content: 'Are you sure you want to delete this staff account? This action cannot be undone.',
                okText: 'Delete',
                okType: 'danger',
                onOk: () => handleDeleteAccount(account.id)
              });
            }
          }
        ];

        return (
          <Space size="small">
            <Tooltip title="Record Transaction">
              <Button
                icon={<MoneyCollectOutlined />}
                size="small"
                onClick={() => {
                  forms.createTransaction.setFieldsValue({ staffAccountId: account.id });
                  setModalVisible(prev => ({ ...prev, createTransaction: true }));
                }}
                disabled={!account.isActive || account.isOnHold}
              />
            </Tooltip>
            
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
            {user.firstName?.[0] || user.displayName?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {user.displayName}
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
        <Badge status={user.statusColor} text={user.status} />
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
          ))}
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
              setSelectedAccount({ userId: user.id });
              forms.createAccount.setFieldsValue({
                userId: user.id,
                stationId: user.stationAssignmentsDisplay?.[0]?.stationId || currentStationId,
                salaryAmount: 20000,
                creditLimit: 5000,
                payrollMethod: 'STATION_WALLET',
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

  const filteredAccounts = staffAccounts.filter(account => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        account.userDisplayName.toLowerCase().includes(searchLower) ||
        account.userEmail.toLowerCase().includes(searchLower) ||
        account.stationDisplayName.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

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
                    forms.createAccount.resetFields();
                    setModalVisible(prev => ({ ...prev, createAccount: true }));
                  }}
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
                prefix={<AccountBookOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Average Balance"
                value={accountSummary.totals?.averageBalanceDisplay || '$0'}
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
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              prefix={<UserOutlined />}
              allowClear
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Account Status"
              value={filters.isActive}
              onChange={(value) => setFilters(prev => ({ ...prev, isActive: value }))}
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
              onChange={(value) => setFilters(prev => ({ ...prev, isOnHold: value }))}
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
              onChange={(value) => setFilters(prev => ({ ...prev, payrollMethod: value }))}
              allowClear
            >
              <Option value="STATION_WALLET">Station Wallet</Option>
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
              onChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
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
            <span>Staff Accounts ({filteredAccounts.length})</span>
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
        {filteredAccounts.length === 0 ? (
          <Alert
            message="No Staff Accounts Found"
            description={
              staffAccounts.length === 0 ? 
                "No staff accounts have been created yet. Create your first staff account." :
                "No accounts match your search criteria. Try different filters."
            }
            type="info"
            showIcon
            action={
              <Button 
                type="primary" 
                size="small"
                onClick={() => {
                  forms.createAccount.resetFields();
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
            dataSource={filteredAccounts}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Showing ${Math.min(10, total)} of ${total} accounts`
            }}
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
                <Text>These accounts have exceeded 80% of their credit limit:</Text>
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
          forms.createAccount.resetFields();
        }}
        onOk={() => forms.createAccount.submit()}
        okText="Create Account"
        cancelText="Cancel"
        width={600}
        confirmLoading={submitting}
      >
        <Form form={forms.createAccount} layout="vertical" onFinish={handleCreateAccount}>
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
                    option.children.toLowerCase().includes(input.toLowerCase())
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
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
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
                initialValue="STATION_WALLET"
              >
                <Select>
                  <Option value="STATION_WALLET">Station Wallet</Option>
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
          forms.updateAccount.resetFields();
        }}
        onOk={() => forms.updateAccount.submit()}
        okText="Update Account"
        cancelText="Cancel"
        width={600}
        confirmLoading={submitting}
      >
        {selectedAccount && (
          <Form form={forms.updateAccount} layout="vertical" onFinish={handleUpdateAccount}>
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
                    <Option value="STATION_WALLET">Station Wallet</Option>
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
          <Button key="close" onClick={() => setModalVisible(prev => ({ ...prev, viewDetails: false }))}>
            Close
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => {
              setModalVisible(prev => ({ ...prev, viewDetails: false, updateAccount: true }));
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
                {selectedAccount.userDisplayName}
                <br />
                <Text type="secondary">{selectedAccount.userEmail}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Station">
                {selectedAccount.stationDisplayName}
              </Descriptions.Item>
              <Descriptions.Item label="Account Status">
                <Badge status={selectedAccount.statusBadge} text={selectedAccount.statusText} />
                {selectedAccount.isOnHold && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>On Hold</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {selectedAccount.createdAtDisplay}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="Financial Information" bordered size="small" column={2}>
              <Descriptions.Item label="Current Balance">
                <Text strong style={{ color: selectedAccount.currentBalanceColor }}>
                  {selectedAccount.currentBalanceDisplay}
                </Text>
                <br />
                <Text type="secondary">{selectedAccount.currentBalanceStatus}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Credit Limit">
                {selectedAccount.creditLimitDisplay}
              </Descriptions.Item>
              <Descriptions.Item label="Salary Amount">
                {selectedAccount.salaryAmountDisplay}
              </Descriptions.Item>
              <Descriptions.Item label="Last Payment">
                {selectedAccount.lastPaymentDateDisplay}
              </Descriptions.Item>
              <Descriptions.Item label="Total Shortages">
                {selectedAccount.totalShortagesDisplay}
              </Descriptions.Item>
              <Descriptions.Item label="Total Advances">
                {selectedAccount.totalAdvancesDisplay}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="Payroll Settings" bordered size="small" column={2}>
              <Descriptions.Item label="Payroll Method">
                {selectedAccount.payrollMethodDisplay}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Schedule">
                {selectedAccount.paymentScheduleDisplay}
              </Descriptions.Item>
              <Descriptions.Item label="Next Payment">
                {selectedAccount.nextPaymentDateDisplay}
              </Descriptions.Item>
              <Descriptions.Item label="Bank Account">
                {selectedAccount.bankAccountNumber || 'Not set'}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Create Transaction Modal */}
      <Modal
        title="Record Transaction"
        open={modalVisible.createTransaction}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, createTransaction: false }));
          forms.createTransaction.resetFields();
        }}
        onOk={() => forms.createTransaction.submit()}
        okText="Record Transaction"
        cancelText="Cancel"
        width={500}
        confirmLoading={submitting}
      >
        <Form form={forms.createTransaction} layout="vertical" onFinish={handleCreateTransaction}>
          <Form.Item
            name="type"
            label="Transaction Type"
            rules={[{ required: true, message: 'Please select transaction type' }]}
          >
            <Select placeholder="Select type">
              <Option value="ADVANCE">Advance</Option>
              <Option value="SHORTAGE">Shortage</Option>
              <Option value="BONUS">Bonus</Option>
              <Option value="FINE">Fine</Option>
              <Option value="ADJUSTMENT">Adjustment</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount"
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
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea
              placeholder="Enter transaction description"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="Payment Method"
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