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
  Badge
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
  InfoCircleOutlined
} from '@ant-design/icons';
import { staffAccountService } from '../../../../services/staffAccountService/staffAccountService';
import { userService } from '../../../../services/userService/userService';
import { stationService } from '../../../../services/stationService/stationService';
import { useApp } from '../../../../context/AppContext';

const { Option } = Select;

const StaffAccountManagement = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allStaffAccounts, setAllStaffAccounts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [modalVisible, setModalVisible] = useState({
    createShortage: false,
    createAdvance: false
  });
  const [forms, setForms] = useState({
    shortage: Form.useForm()[0],
    advance: Form.useForm()[0]
  });
  const [filters, setFilters] = useState({
    search: '',
    accountStatus: 'all', // 'all', 'has-account', 'no-account'
    role: ''
  });

  const currentUser = state?.currentUser;
  const isCompanyAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(currentUser?.role);
  const isStationManager = ['STATION_MANAGER'].includes(currentUser?.role);
  const currentStationId = state?.currentStation?.id;

  // Fetch stations
  const fetchStations = async () => {
    try {
      const response = await stationService.getCompanyStations();
      setStations(response || []);
    } catch (error) {
      console.error('Failed to fetch stations:', error);
    }
  };

  // Fetch all users
  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers();
      
      if (response && response.success && Array.isArray(response.data)) {
        // Filter only staff users and add basic info
        const staffUsers = response.data
          .filter(user => ['ATTENDANT', 'SUPERVISOR', 'STATION_MANAGER'].includes(user.role))
          .map(user => ({
            ...user,
            displayName: `${user.firstName} ${user.lastName}`,
            roleDisplay: getRoleDisplayName(user.role),
            roleColor: getRoleColor(user.role)
          }));
        
        setAllUsers(staffUsers);
        return staffUsers;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch users:', error);
      message.error('Failed to load staff users');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch staff accounts
  const fetchStaffAccounts = async () => {
    try {
      setLoading(true);
      const stationId = currentStationId;
      
      if (!stationId && !isCompanyAdmin) {
        console.log('No station ID available for non-admin user');
        setAllStaffAccounts([]);
        return [];
      }

      const result = await staffAccountService.getStaffAccountsByStation(stationId, {
        page: 1,
        limit: 100
      });

      const accounts = result || result.accounts || result.data || [];
      console.log('Fetched staff accounts:', accounts);
      
      setAllStaffAccounts(accounts);
      return accounts;
    } catch (error) {
      console.error('Error loading staff accounts:', error);
      setAllStaffAccounts([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Combine users and accounts data
  const getCombinedStaffData = () => {
    if (allUsers.length === 0) return [];

    // Create a map of user IDs to their accounts
    const accountsByUserId = new Map();
    allStaffAccounts.forEach(account => {
      if (account.userId) {
        accountsByUserId.set(account.userId, account);
      }
    });

    console.log('Accounts map size:', accountsByUserId.size);
    console.log('Total users:', allUsers.length);

    // Combine user data with account data
    return allUsers.map(user => {
      const account = accountsByUserId.get(user.id);
      
      return {
        // User info
        ...user,
        
        // Account info (if exists)
        hasAccount: !!account,
        account: account || null,
        
        // Display properties
        accountStatus: account ? (account.isActive ? 'active' : 'inactive') : 'no-account',
        accountStatusText: account ? (account.isActive ? 'Active Account' : 'Inactive Account') : 'No Account',
        accountStatusColor: account ? (account.isActive ? 'green' : 'red') : 'orange',
        accountStatusIcon: account ? (account.isActive ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />) : <WarningOutlined />,
        
        // Financial info
        currentBalance: account?.currentBalance || 0,
        creditLimit: account?.creditLimit || 0,
        salaryAmount: account?.salaryAmount || 0,
        
        // Action availability
        canActivate: !account,
        canRecordShortage: account?.isActive && !account?.isOnHold,
        canGiveAdvance: account?.isActive && !account?.isOnHold,
        canViewDetails: !!account
      };
    });
  };

  // Filter combined data
  const getFilteredStaffData = () => {
    let data = getCombinedStaffData();
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter(staff => 
        staff.displayName.toLowerCase().includes(searchLower) ||
        staff.email.toLowerCase().includes(searchLower) ||
        staff.role.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply account status filter
    if (filters.accountStatus !== 'all') {
      if (filters.accountStatus === 'has-account') {
        data = data.filter(staff => staff.hasAccount);
      } else if (filters.accountStatus === 'no-account') {
        data = data.filter(staff => !staff.hasAccount);
      }
    }
    
    // Apply role filter
    if (filters.role) {
      data = data.filter(staff => staff.role === filters.role);
    }
    
    return data;
  };

  // Handle activate account
  const handleActivateAccount = async (user) => {
    setSubmitting(true);
    
    try {
      let stationId = currentStationId;
      
      // If no current station or company admin, use user's first assignment
      if ((!stationId || isCompanyAdmin) && user.stationAssignments?.[0]?.stationId) {
        stationId = user.stationAssignments[0].stationId;
      }
      
      if (!stationId) {
        throw new Error('User is not assigned to any station');
      }

      const accountData = {
        userId: user.id,
        stationId: stationId,
        salaryAmount: 20000,
        creditLimit: 5000,
        payrollMethod: 'STATION_WALLET',
        paymentSchedule: 'MONTHLY',
        isActive: true
      };

      await staffAccountService.createStaffAccount(accountData);
      message.success(`Account activated for ${user.firstName} ${user.lastName}`);
      
      // Refresh data
      await refreshData();
      
    } catch (error) {
      console.error('Failed to activate account:', error);
      message.error(error.message || 'Failed to activate account');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle create shortage
  const handleCreateShortage = async (values) => {
    setSubmitting(true);
    
    try {
      const shortageData = {
        staffAccountId: values.staffAccountId,
        amount: parseFloat(values.amount),
        description: values.description?.trim() || 'Shortage recorded'
      };

      await staffAccountService.createShortage(shortageData);
      message.success('Shortage recorded successfully');
      
      setModalVisible(prev => ({ ...prev, createShortage: false }));
      forms.shortage.resetFields();
      await refreshData();
      
    } catch (error) {
      console.error('Failed to record shortage:', error);
      message.error(error.message || 'Failed to record shortage');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle create advance
  const handleCreateAdvance = async (values) => {
    setSubmitting(true);
    
    try {
      const transactionData = {
        staffAccountId: values.staffAccountId,
        type: 'ADVANCE',
        amount: parseFloat(values.amount),
        description: values.description?.trim() || 'Salary advance',
        paymentMethod: values.paymentMethod || 'STATION_WALLET'
      };

      await staffAccountService.createStaffTransaction(transactionData);
      message.success('Advance recorded successfully');
      
      setModalVisible(prev => ({ ...prev, createAdvance: false }));
      forms.advance.resetFields();
      await refreshData();
      
    } catch (error) {
      console.error('Failed to record advance:', error);
      message.error(error.message || 'Failed to record advance');
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
        fetchAllUsers(),
        fetchStaffAccounts()
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

  // Get role display name
  const getRoleDisplayName = (role) => {
    const roleMap = {
      'SUPER_ADMIN': 'Super Admin',
      'COMPANY_ADMIN': 'Company Admin',
      'STATION_MANAGER': 'Station Manager',
      'SUPERVISOR': 'Supervisor',
      'ATTENDANT': 'Attendant'
    };
    return roleMap[role] || role;
  };

  // Get role color
  const getRoleColor = (role) => {
    const colorMap = {
      'STATION_MANAGER': 'purple',
      'SUPERVISOR': 'blue',
      'ATTENDANT': 'cyan',
      'COMPANY_ADMIN': 'volcano',
      'SUPER_ADMIN': 'red'
    };
    return colorMap[role] || 'default';
  };

  // Get payment method icon
  const getPaymentMethodIcon = (method) => {
    const iconMap = {
      'STATION_WALLET': <WalletOutlined />,
      'BANK_TRANSFER': <BankOutlined />,
      'MOBILE_MONEY': <CreditCardOutlined />,
      'CASH': <DollarOutlined />
    };
    return iconMap[method] || <InfoCircleOutlined />;
  };

  // Initial load
  useEffect(() => {
    refreshData();
  }, []);

  // Table columns
  const staffColumns = [
    {
      title: 'Staff Member',
      key: 'staff',
      render: (record) => (
        <Space>
          <Avatar 
            style={{ backgroundColor: '#1890ff' }}
            icon={<UserOutlined />}
          >
            {record.firstName?.[0] || record.name?.[0] || 'U'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {record.firstName} {record.lastName}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.email}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              ID: {record.id.substring(0, 8)}...
            </div>
          </div>
        </Space>
      )
    },
    {
      title: 'Role',
      key: 'role',
      render: (record) => (
        <Tag color={record.roleColor}>
          {record.roleDisplay}
        </Tag>
      ),
      filters: [
        { text: 'Station Manager', value: 'STATION_MANAGER' },
        { text: 'Supervisor', value: 'SUPERVISOR' },
        { text: 'Attendant', value: 'ATTENDANT' }
      ],
      onFilter: (value, record) => record.role === value
    },
    {
      title: 'Account Status',
      key: 'accountStatus',
      render: (record) => (
        <Badge
          status={record.accountStatus}
          text={
            <Space>
              {record.accountStatusIcon}
              <span style={{ color: record.accountStatus === 'no-account' ? '#faad14' : 
                            record.accountStatus === 'active' ? '#52c41a' : '#ff4d4f' }}>
                {record.accountStatusText}
              </span>
              {record.account?.isOnHold && (
                <Tag color="orange">On Hold</Tag>
              )}
            </Space>
          }
        />
      ),
      filters: [
        { text: 'All', value: 'all' },
        { text: 'Has Account', value: 'has-account' },
        { text: 'No Account', value: 'no-account' }
      ],
      onFilter: (value, record) => {
        if (value === 'all') return true;
        if (value === 'has-account') return record.hasAccount;
        if (value === 'no-account') return !record.hasAccount;
        return true;
      }
    },
    {
      title: 'Financial Info',
      key: 'financial',
      render: (record) => {
        if (!record.hasAccount) {
          return <Tag color="default">No account</Tag>;
        }
        
        return (
          <Space direction="vertical" size={0}>
            <div style={{ fontWeight: 'bold', color: record.currentBalance < 0 ? '#ff4d4f' : '#52c41a' }}>
              {staffAccountService.formatCurrency(record.currentBalance)}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Credit: {staffAccountService.formatCurrency(record.creditLimit)}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              Salary: {staffAccountService.formatCurrency(record.salaryAmount)}
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Payment Method',
      key: 'paymentMethod',
      render: (record) => {
        if (!record.hasAccount) {
          return <Tag color="default">Not set</Tag>;
        }
        
        const method = record.account?.payrollMethod;
        return (
          <Space>
            {getPaymentMethodIcon(method)}
            <span>{method ? method.replace('_', ' ') : 'Not set'}</span>
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record) => {
        if (!record.hasAccount) {
          return (
            <Tooltip title="Activate staff account with default settings">
              <Button
                type="primary"
                size="small"
                onClick={() => handleActivateAccount(record)}
                disabled={submitting}
                loading={submitting}
                icon={<CheckCircleOutlined />}
              >
                Activate Account
              </Button>
            </Tooltip>
          );
        }
        
        return (
          <Space size="small">
            <Tooltip title="Record Shortage">
              <Button
                icon={<AccountBookOutlined />}
                size="small"
                onClick={() => {
                  forms.shortage.setFieldsValue({ staffAccountId: record.account.id });
                  setModalVisible(prev => ({ ...prev, createShortage: true }));
                }}
                disabled={!record.canRecordShortage}
              />
            </Tooltip>
            
            <Tooltip title="Give Advance">
              <Button
                icon={<MoneyCollectOutlined />}
                size="small"
                onClick={() => {
                  forms.advance.setFieldsValue({ staffAccountId: record.account.id });
                  setModalVisible(prev => ({ ...prev, createAdvance: true }));
                }}
                disabled={!record.canGiveAdvance}
              />
            </Tooltip>
            
            <Tooltip title="View Details">
              <Button
                icon={<EyeOutlined />}
                size="small"
                onClick={() => {
                  setSelectedAccount(record.account);
                  // You can implement a details modal here
                  message.info('View details feature coming soon');
                }}
              />
            </Tooltip>
          </Space>
        );
      }
    }
  ];

  const filteredData = getFilteredStaffData();
  const stats = {
    totalStaff: allUsers.length,
    withAccounts: allStaffAccounts.length,
    withoutAccounts: allUsers.length - allStaffAccounts.length,
    activeAccounts: allStaffAccounts.filter(acc => acc.isActive).length,
    totalShortages: allStaffAccounts.reduce((sum, acc) => sum + (acc.totalShortages || 0), 0),
    totalAdvances: allStaffAccounts.reduce((sum, acc) => sum + (acc.totalAdvances || 0), 0)
  };

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
                Manage all staff accounts, activate new accounts, record shortages and advances
              </p>
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
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Card size="small" className="shadow-sm">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8} md={4}>
            <Statistic
              title="Total Staff"
              value={stats.totalStaff}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Statistic
              title="With Accounts"
              value={stats.withAccounts}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Statistic
              title="Without Accounts"
              value={stats.withoutAccounts}
              valueStyle={{ color: stats.withoutAccounts > 0 ? '#faad14' : '#52c41a' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Statistic
              title="Active Accounts"
              value={stats.activeAccounts}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Statistic
              title="Total Shortages"
              value={stats.totalShortages}
              precision={2}
              formatter={value => staffAccountService.formatCurrency(value)}
              prefix={<AccountBookOutlined />}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Statistic
              title="Total Advances"
              value={stats.totalAdvances}
              precision={2}
              formatter={value => staffAccountService.formatCurrency(value)}
              prefix={<MoneyCollectOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      <Card size="small" className="shadow-sm">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search by name, email, or role..."
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
              value={filters.accountStatus}
              onChange={(value) => setFilters(prev => ({ ...prev, accountStatus: value }))}
            >
              <Option value="all">All Status</Option>
              <Option value="has-account">Has Account</Option>
              <Option value="no-account">No Account</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by Role"
              value={filters.role}
              onChange={(value) => setFilters(prev => ({ ...prev, role: value }))}
              allowClear
            >
              <Option value="STATION_MANAGER">Station Manager</Option>
              <Option value="SUPERVISOR">Supervisor</Option>
              <Option value="ATTENDANT">Attendant</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card className="shadow-sm">
        {filteredData.length === 0 ? (
          <Alert
            message="No Staff Members Found"
            description={allUsers.length === 0 ? 
              "No staff users are available. Please add staff members first." :
              "No staff members match your search criteria. Try different filters."
            }
            type="info"
            showIcon
          />
        ) : (
          <Table
            columns={staffColumns}
            dataSource={filteredData}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Showing ${filteredData.length} of ${total} staff members`
            }}
          />
        )}
      </Card>

      {/* Create Shortage Modal */}
      <Modal
        title="Record Shortage"
        open={modalVisible.createShortage}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, createShortage: false }));
          forms.shortage.resetFields();
        }}
        onOk={() => forms.shortage.submit()}
        okText="Record Shortage"
        cancelText="Cancel"
        width={500}
        confirmLoading={submitting}
      >
        <Form form={forms.shortage} layout="vertical" onFinish={handleCreateShortage}>
          <Form.Item
            name="staffAccountId"
            label="Staff Member"
            rules={[{ required: true, message: 'Please select staff member' }]}
          >
            <Select
              placeholder="Select staff with account"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {allStaffAccounts
                .filter(acc => acc.isActive)
                .map(account => (
                  <Option key={account.id} value={account.id}>
                    {account.user?.firstName} {account.user?.lastName}
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
        </Form>
      </Modal>

      {/* Create Advance Modal */}
      <Modal
        title="Give Advance"
        open={modalVisible.createAdvance}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, createAdvance: false }));
          forms.advance.resetFields();
        }}
        onOk={() => forms.advance.submit()}
        okText="Give Advance"
        cancelText="Cancel"
        width={500}
        confirmLoading={submitting}
      >
        <Form form={forms.advance} layout="vertical" onFinish={handleCreateAdvance}>
          <Form.Item
            name="staffAccountId"
            label="Staff Member"
            rules={[{ required: true, message: 'Please select staff member' }]}
          >
            <Select
              placeholder="Select staff with account"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {allStaffAccounts
                .filter(acc => acc.isActive)
                .map(account => (
                  <Option key={account.id} value={account.id}>
                    {account.user?.firstName} {account.user?.lastName}
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