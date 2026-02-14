import React, { useState, useEffect, useRef } from 'react';
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
  Switch,
  Tabs,
  Progress,
  Empty
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
  PhoneOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FilterOutlined,
  SearchOutlined,
  DownOutlined,
  CompressOutlined
} from '@ant-design/icons';
import { staffAccountService } from '../../../../services/staffAccountService/staffAccountService';
import { userService } from '../../../../services/userService/userService';
import { stationService } from '../../../../services/stationService/stationService';
import { useApp } from '../../../../context/AppContext';
import AdvancedReportGenerator from '../../../dashboards/common/downloadable/AdvancedReportGenerator';
import dayjs from 'dayjs';

const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

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
    viewDetails: false
  });
  const [holdReason, setHoldReason] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('');
  const [createForm] = Form.useForm();
  const [updateForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('all');
  
  // COMPACT FILTERS
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    station: ''
  });

  const [accountSummary, setAccountSummary] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Export state
  const [exportConfig, setExportConfig] = useState({
    visible: false,
    type: null,
    data: null,
    columns: null,
    title: '',
    fileName: ''
  });

  const currentUser = state?.currentUser;
  const isCompanyAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(currentUser?.role);
  const isStationManager = ['STATION_MANAGER'].includes(currentUser?.role);
  const currentStationId = state?.currentStation?.id;
  const currentCompanyId = currentUser?.companyId;

  // Currency formatter
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'Ksh 0';
    return `Ksh ${amount.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

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
        search: filters.search,
        status: filters.status !== '' ? filters.status : undefined,
        stationId: filters.station || undefined
      };

      if (isCompanyAdmin && currentCompanyId) {
        const result = await staffAccountService.getStaffAccountsByCompany(currentCompanyId, filterParams);
        accounts = result?.data || result?.accounts || [];
        total = result?.pagination?.total || 0;
      } else if (isStationManager && currentStationId) {
        const result = await staffAccountService.getStaffAccountsByStation(currentStationId, filterParams);
        accounts = result?.data || result?.accounts || [];
        total = result?.pagination?.total || 0;
      } else {
        const result = await staffAccountService.getAllStaffAccounts(filterParams);
        accounts = result?.data || result?.accounts || [];
        total = result?.pagination?.total || 0;
      }

      setStaffAccounts(accounts);
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize,
        total
      }));

      // Calculate summary after fetching
      calculateAccountSummary(accounts);

    } catch (error) {
      console.error('Error loading staff accounts:', error);
      message.error(error.message || 'Failed to load staff accounts');
      setStaffAccounts([]);
      setAccountSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // Calculate account summary
  const calculateAccountSummary = (accounts) => {
    if (!accounts || accounts.length === 0) {
      setAccountSummary(null);
      return;
    }

    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter(acc => acc.isActive).length;
    const onHoldAccounts = accounts.filter(acc => acc.isOnHold).length;
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    const totalPositive = accounts.filter(acc => acc.currentBalance > 0)
      .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    const totalNegative = accounts.filter(acc => acc.currentBalance < 0)
      .reduce((sum, acc) => sum + Math.abs(acc.currentBalance || 0), 0);
    const totalShortages = accounts.reduce((sum, acc) => sum + (acc.totalShortages || 0), 0);
    const totalAdvances = accounts.reduce((sum, acc) => sum + (acc.totalAdvances || 0), 0);
    const totalBonuses = accounts.reduce((sum, acc) => sum + (acc.totalBonuses || 0), 0);

    setAccountSummary({
      totalAccounts,
      activeAccounts,
      onHoldAccounts,
      totalBalance,
      totalPositive,
      totalNegative,
      totalShortages,
      totalAdvances,
      totalBonuses,
      averageBalance: totalAccounts > 0 ? totalBalance / totalAccounts : 0
    });
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

  // Main refresh function
  const refreshData = async (showMessage = false) => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStations(),
        fetchStaffAccounts(pagination.current, pagination.pageSize),
        fetchUsersWithoutAccounts()
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

  // Handle create account
  const handleCreateAccount = async (values) => {
    setSubmitting(true);
    
    try {
      const formattedValues = {
        userId: values.userId,
        stationId: values.stationId,
        creditLimit: values.creditLimit || 5000,
        salaryAmount: values.salaryAmount || 30000,
        payrollMethod: values.payrollMethod || 'STATION_WALLET',
        paymentSchedule: values.paymentSchedule || 'MONTHLY',
        bankAccountNumber: values.bankAccountNumber || '001110001100',
        bankName: values.bankName || 'Baclays Bank',
        mobileMoneyNumber: values.mobileMoneyNumber || '0712345678',
        nextPaymentDate: values.nextPaymentDate ? 
          values.nextPaymentDate.startOf('day').toISOString() : null,
        notes: values.notes || '',
        isActive: values.isActive !== undefined ? values.isActive : true
      };

      await staffAccountService.createStaffAccount(formattedValues);
      message.success('Staff account created successfully');

      setModalVisible(prev => ({ ...prev, createAccount: false }));
      createForm.resetFields();
      await refreshData();
      
    } catch (error) {
      console.error('Failed to create account:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.map(e => e.message).join(', ') || 
                          error.message || 
                          'Failed to create staff account';
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle update account
  const handleUpdateAccount = async (values) => {
    if (!selectedAccount) return;
    setSubmitting(true);

    try {
      const updateData = {};
      if (values.creditLimit !== undefined) updateData.creditLimit = values.creditLimit;
      if (values.salaryAmount !== undefined) updateData.salaryAmount = values.salaryAmount;
      if (values.payrollMethod) updateData.payrollMethod = values.payrollMethod;
      if (values.paymentSchedule) updateData.paymentSchedule = values.paymentSchedule;
      if (values.bankAccountNumber !== undefined) updateData.bankAccountNumber = values.bankAccountNumber;
      if (values.bankName !== undefined) updateData.bankName = values.bankName;
      if (values.mobileMoneyNumber !== undefined) updateData.mobileMoneyNumber = values.mobileMoneyNumber;
      if (values.nextPaymentDate) updateData.nextPaymentDate = values.nextPaymentDate.format('YYYY-MM-DD');
      if (values.notes !== undefined) updateData.notes = values.notes;
      if (values.isActive !== undefined) updateData.isActive = values.isActive;

      await staffAccountService.updateStaffAccount(selectedAccount.id, updateData);
      message.success('Staff account updated successfully');

      setModalVisible(prev => ({ ...prev, updateAccount: false }));
      updateForm.resetFields();
      setSelectedAccount(null);
      await refreshData();
      
    } catch (error) {
      console.error('Failed to update account:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.map(e => e.message).join(', ') || 
                          error.message || 
                          'Failed to update staff account';
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle activate account
  const handleActivateAccount = async (accountId) => {
    setSubmitting(true);
    try {
      await staffAccountService.activateStaffAccount(accountId);
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
      await staffAccountService.deactivateStaffAccount(accountId, reason);
      message.success('Staff account deactivated successfully');
      setDeactivateReason('');
      await refreshData();
    } catch (error) {
      console.error('Failed to deactivate account:', error);
      message.error(error.message || 'Failed to deactivate staff account');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle put on hold
  const handlePutOnHold = async (accountId, reason) => {
    setSubmitting(true);
    try {
      await staffAccountService.putAccountOnHold(accountId, reason);
      message.success('Account put on hold successfully');
      setHoldReason('');
      await refreshData();
    } catch (error) {
      console.error('Failed to put account on hold:', error);
      message.error(error.message || 'Failed to put account on hold');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle remove from hold
  const handleRemoveFromHold = async (accountId) => {
    setSubmitting(true);
    try {
      await staffAccountService.removeAccountFromHold(accountId);
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
  const handleDeleteAccount = async (accountId, reason) => {
    setSubmitting(true);
    try {
      await staffAccountService.deleteStaffAccount(accountId, reason);
      message.success('Staff account deleted successfully');
      setDeactivateReason('');
      await refreshData();
    } catch (error) {
      console.error('Failed to delete account:', error);
      message.error(error.message || 'Failed to delete staff account');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle table pagination
  const handleTableChange = (newPagination) => {
    fetchStaffAccounts(newPagination.current, newPagination.pageSize);
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Reset to page 1 when filters change
    fetchStaffAccounts(1, pagination.pageSize);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      station: ''
    });
    fetchStaffAccounts(1, pagination.pageSize);
  };

  // Apply filters with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchStaffAccounts(1, pagination.pageSize);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [filters.search, filters.status, filters.station]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, []);

  // ========== REPORT GENERATION FUNCTIONS ==========

  // Prepare data for ALL staff accounts report - SIMPLIFIED COLUMNS
  const prepareAllStaffAccountsExportData = () => {
    if (!staffAccounts || staffAccounts.length === 0) return [];
    
    return staffAccounts.map((account, index) => {
      return {
        '#': index + 1,
        'Staff Name': account.user ? `${account.user.firstName || ''} ${account.user.lastName || ''}`.trim() : 'Unknown User',
        'Email': account.user?.email || 'N/A',
        'Station': account.station?.name || 'Unknown Station',
        'Balance': account.currentBalance || 0,
        'Balance Status': account.currentBalance < 0 ? 'Owes Station' : 
                         account.currentBalance > 0 ? 'Station Owes' : 'Settled',
        'Salary': account.salaryAmount || 0,
        'Status': account.isActive ? 'Active' : 'Inactive',
        'On Hold': account.isOnHold ? 'Yes' : 'No',
        'Payment Method': getPayrollMethodLabel(account.payrollMethod)
      };
    });
  };

  // Prepare data for current tab report - SIMPLIFIED COLUMNS
  const prepareTabExportData = () => {
    const accounts = getFilteredAccounts();
    if (!accounts || accounts.length === 0) return [];
    
    return accounts.map((account, index) => {
      return {
        '#': index + 1,
        'Staff Name': account.user ? `${account.user.firstName || ''} ${account.user.lastName || ''}`.trim() : 'Unknown User',
        'Email': account.user?.email || 'N/A',
        'Station': account.station?.name || 'Unknown Station',
        'Balance': account.currentBalance || 0,
        'Balance Status': account.currentBalance < 0 ? 'Owes Station' : 
                         account.currentBalance > 0 ? 'Station Owes' : 'Settled',
        'Salary': account.salaryAmount || 0,
        'Status': account.isActive ? 'Active' : 'Inactive'
      };
    });
  };

  // Calculate summary data for reports
  const calculateSummaryData = (accounts, type) => {
    if (!accounts || accounts.length === 0) return null;

    const activeAccounts = accounts.filter(acc => acc.isActive).length;
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    const owingAccounts = accounts.filter(acc => (acc.currentBalance || 0) < 0).length;
    const creditAccounts = accounts.filter(acc => (acc.currentBalance || 0) > 0).length;

    const tabName = getTabDisplayName();

    return {
      'Report Type': type === 'all' ? 'All Staff Accounts' : `${tabName} Staff Accounts`,
      'Total Accounts': accounts.length,
      'Active Accounts': activeAccounts,
      'Owing Accounts': owingAccounts,
      'Credit Accounts': creditAccounts,
      'Total Balance': formatCurrency(totalBalance),
      'Generated Date': new Date().toLocaleDateString('en-KE'),
      'Generated Time': new Date().toLocaleTimeString('en-KE'),
      'Generated By': `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`,
      'Company': state?.currentCompany?.name || 'N/A'
    };
  };

  // Get columns for report - SIMPLIFIED as requested
  const getReportColumns = () => {
    return [
      { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
      { title: 'Staff Name', dataIndex: 'Staff Name', key: 'staffName', width: 150, type: 'text' },
      { title: 'Email', dataIndex: 'Email', key: 'email', width: 180, type: 'email' },
      { title: 'Station', dataIndex: 'Station', key: 'station', width: 120, type: 'text' },
      { title: 'Balance', dataIndex: 'Balance', key: 'balance', width: 120, type: 'currency' },
      { title: 'Balance Status', dataIndex: 'Balance Status', key: 'balanceStatus', width: 100, type: 'text' },
      { title: 'Salary', dataIndex: 'Salary', key: 'salary', width: 100, type: 'currency' },
      { title: 'Status', dataIndex: 'Status', key: 'status', width: 80, type: 'text' }
    ];
  };

  // Get filtered accounts based on active tab
  const getFilteredAccounts = () => {
    if (!staffAccounts || staffAccounts.length === 0) return [];
    
    let filtered = [...staffAccounts];
    
    // Filter by active tab
    if (activeTab === 'active') {
      filtered = filtered.filter(acc => acc.isActive);
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter(acc => !acc.isActive);
    } else if (activeTab === 'onHold') {
      filtered = filtered.filter(acc => acc.isOnHold);
    } else if (activeTab === 'owing') {
      filtered = filtered.filter(acc => (acc.currentBalance || 0) < 0);
    } else if (activeTab === 'credit') {
      filtered = filtered.filter(acc => (acc.currentBalance || 0) > 0);
    }
    
    return filtered;
  };

  // Get tab display name
  const getTabDisplayName = () => {
    const tabNames = {
      'all': 'All',
      'active': 'Active',
      'inactive': 'Inactive',
      'onHold': 'On Hold',
      'owing': 'Owing',
      'credit': 'Credit'
    };
    return tabNames[activeTab] || 'All';
  };

  // Get report title
  const getReportTitle = (type) => {
    const companyName = state?.currentCompany?.name || "Company";
    const currentDate = new Date().toLocaleDateString('en-KE');
    
    if (type === 'all') {
      return `Complete Staff Accounts Report - ${companyName} (${currentDate})`;
    } else {
      return `${getTabDisplayName()} Staff Accounts Report - ${companyName} (${currentDate})`;
    }
  };

  // Get file name
  const getFileName = (type) => {
    const companyCode = state?.currentCompany?.code ? `_${state.currentCompany.code}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    
    if (type === 'all') {
      return `complete_staff_accounts${companyCode}_${dateStr}`;
    } else {
      return `${activeTab}_staff_accounts${companyCode}_${dateStr}`;
    }
  };

  // Get footer text
  const getFooterText = () => {
    const generatedBy = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`;
    const timestamp = new Date().toLocaleString('en-KE');
    const company = state?.currentCompany?.name || 'Company';
    
    return `Generated from ${company} | User: ${generatedBy} | ${timestamp}`;
  };

  // Handle export action
  const handleExportAction = (type) => {
    let exportData = [];
    let exportColumns = [];
    let summaryData = null;
    let title = '';
    let fileName = '';

    if (type === 'all') {
      if (staffAccounts.length === 0) {
        message.warning('No staff accounts available to export');
        return;
      }
      exportData = prepareAllStaffAccountsExportData();
      exportColumns = getReportColumns();
      summaryData = calculateSummaryData(staffAccounts, 'all');
      title = getReportTitle('all');
      fileName = getFileName('all');
    } else {
      const filteredAccounts = getFilteredAccounts();
      if (filteredAccounts.length === 0) {
        message.warning(`No ${getTabDisplayName()} staff accounts available to export`);
        return;
      }
      exportData = prepareTabExportData();
      exportColumns = getReportColumns();
      summaryData = calculateSummaryData(filteredAccounts, 'tab');
      title = getReportTitle('tab');
      fileName = getFileName('tab');
    }

    setExportConfig({
      visible: true,
      type,
      data: exportData,
      columns: exportColumns,
      summaryData,
      title,
      fileName
    });
  };

  // Handle report completion
  const handleReportComplete = (format) => {
    console.log(`✅ Report generated as ${format}`);
    message.success(`Report generated successfully as ${format}`);
    setExportConfig({
      visible: false,
      type: null,
      data: null,
      columns: null,
      title: '',
      fileName: ''
    });
  };

  // Utility functions
  const getPayrollMethodLabel = (method) => {
    const labels = {
      'STATION_WALLET': 'Station Wallet',
      'BANK_TRANSFER': 'Bank Transfer',
      'MOBILE_MONEY': 'Mobile Money',
      'CASH': 'Cash'
    };
    return labels[method] || method;
  };

  const getPaymentScheduleLabel = (schedule) => {
    const labels = {
      'DAILY': 'Daily',
      'WEEKLY': 'Weekly',
      'BI_WEEKLY': 'Bi-Weekly',
      'MONTHLY': 'Monthly',
      'QUARTERLY': 'Quarterly'
    };
    return labels[schedule] || schedule;
  };

  const getStatusColor = (status) => {
    return status === 'Active' ? 'green' : 'red';
  };

  const getBalanceColor = (balance) => {
    if (balance < 0) return '#ff4d4f';
    if (balance > 0) return '#52c41a';
    return '#666';
  };

  // Render export buttons
  const renderExportButtons = () => {
    const exportMenuItems = [
      {
        key: 'all',
        label: 'Export All Staff Accounts',
        icon: <FileExcelOutlined />,
        disabled: staffAccounts.length === 0
      },
      {
        key: 'current',
        label: `Export Current Tab (${getTabDisplayName()})`,
        icon: <FilePdfOutlined />,
        disabled: getFilteredAccounts().length === 0
      }
    ];

    return (
      <Dropdown
        menu={{
          items: exportMenuItems,
          onClick: ({ key }) => handleExportAction(key)
        }}
        trigger={['click']}
      >
        <Button type="primary" icon={<DownloadOutlined />} size="small">
          Export <DownOutlined />
        </Button>
      </Dropdown>
    );
  };

  // Table columns - COMPACT design
  const accountColumns = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_, __, index) => {
        const page = pagination.current || 1;
        const pageSize = pagination.pageSize || 10;
        return ((page - 1) * pageSize) + index + 1;
      }
    },
    {
      title: 'Staff Member',
      key: 'staff',
      width: 200,
      render: (account) => (
        <Space size="small">
          <Avatar 
            size="small"
            style={{ backgroundColor: '#1890ff' }}
            icon={<UserOutlined />}
          />
          <div>
            <div style={{ fontWeight: 500, fontSize: '12px' }}>
              {account.user ? `${account.user.firstName || ''} ${account.user.lastName || ''}`.trim() : 'Unknown User'}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {account.user?.email || 'No email'}
            </div>
            <Tag size="small" style={{ fontSize: '10px', marginTop: '2px' }}>
              {account.station?.name || 'No station'}
            </Tag>
          </div>
        </Space>
      )
    },
    {
      title: 'Balance',
      key: 'balance',
      width: 120,
      render: (account) => {
        const balance = account.currentBalance || 0;
        const color = getBalanceColor(balance);
        const status = balance < 0 ? 'Owes' : balance > 0 ? 'Owed' : 'Settled';
        
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', color }}>
              {formatCurrency(balance)}
            </div>
            <Tag color={color} style={{ fontSize: '10px', marginTop: '2px' }}>
              {status}
            </Tag>
          </div>
        );
      }
    },
    {
      title: 'Salary',
      key: 'salary',
      width: 100,
      render: (account) => (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500 }}>
            {account.salaryAmount ? formatCurrency(account.salaryAmount) : 'Not Set'}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            {getPaymentScheduleLabel(account.paymentSchedule)}
          </div>
        </div>
      )
    },
    {
      title: 'Payment',
      key: 'paymentMethod',
      width: 120,
      render: (account) => {
        const method = account.payrollMethod || 'STATION_WALLET';
        const methodLabel = getPayrollMethodLabel(method);
        
        return (
          <div>
            <div style={{ fontSize: '11px' }}>
              {method === 'BANK_TRANSFER' ? <BankOutlined style={{ fontSize: '11px' }} /> :
               method === 'MOBILE_MONEY' ? <PhoneOutlined style={{ fontSize: '11px' }} /> :
               method === 'CASH' ? <DollarOutlined style={{ fontSize: '11px' }} /> :
               <WalletOutlined style={{ fontSize: '11px' }} />}
              <span style={{ marginLeft: 4 }}>{methodLabel}</span>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 80,
      render: (account) => {
        const statusColor = account.isActive ? 'success' : 'default';
        const statusText = account.isActive ? 'Active' : 'Inactive';
        
        return (
          <div>
            <Tag color={statusColor} style={{ fontSize: '10px' }}>
              {statusText}
            </Tag>
            {account.isOnHold && (
              <Tag color="warning" icon={<LockOutlined />} style={{ fontSize: '10px', marginTop: '2px' }}>
                Hold
              </Tag>
            )}
          </div>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      fixed: 'right',
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
                payrollMethod: account.payrollMethod || 'STATION_WALLET',
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
          { type: 'divider' },
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
            onClick: () => {
              Modal.confirm({
                title: 'Put Account On Hold',
                content: (
                  <div>
                    <p>Please provide a reason for putting this account on hold:</p>
                    <TextArea 
                      placeholder="Enter reason"
                      rows={3}
                      onChange={(e) => setHoldReason(e.target.value)}
                      value={holdReason}
                    />
                  </div>
                ),
                onOk: () => handlePutOnHold(account.id, holdReason)
              });
            }
          },
          { type: 'divider' },
          {
            key: 'delete',
            label: 'Delete Account',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
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
                onOk: () => handleDeleteAccount(account.id, deactivateReason)
              });
            }
          }
        ].filter(item => item);

        return (
          <Dropdown
            menu={{ items: actionItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              icon={<MoreOutlined />}
              size="small"
              type="text"
            />
          </Dropdown>
        );
      }
    }
  ];

  // Get tab items with counts
  const getTabItems = () => {
    const filteredAccounts = getFilteredAccounts();
    const activeAccounts = staffAccounts.filter(acc => acc.isActive);
    const inactiveAccounts = staffAccounts.filter(acc => !acc.isActive);
    const onHoldAccounts = staffAccounts.filter(acc => acc.isOnHold);
    const owingAccounts = staffAccounts.filter(acc => (acc.currentBalance || 0) < 0);
    const creditAccounts = staffAccounts.filter(acc => (acc.currentBalance || 0) > 0);
    
    return {
      items: [
        {
          key: 'all',
          label: (
            <Space size="small">
              <TeamOutlined />
              <span>All</span>
              <Badge count={staffAccounts.length} style={{ backgroundColor: '#1890ff', fontSize: '10px' }} />
            </Space>
          )
        },
        {
          key: 'active',
          label: (
            <Space size="small">
              <CheckCircleOutlined />
              <span>Active</span>
              <Badge count={activeAccounts.length} style={{ backgroundColor: '#52c41a', fontSize: '10px' }} />
            </Space>
          )
        },
        {
          key: 'inactive',
          label: (
            <Space size="small">
              <PauseCircleOutlined />
              <span>Inactive</span>
              <Badge count={inactiveAccounts.length} style={{ backgroundColor: '#ff4d4f', fontSize: '10px' }} />
            </Space>
          )
        },
        {
          key: 'onHold',
          label: (
            <Space size="small">
              <LockOutlined />
              <span>Hold</span>
              <Badge count={onHoldAccounts.length} style={{ backgroundColor: '#fa8c16', fontSize: '10px' }} />
            </Space>
          )
        },
        {
          key: 'owing',
          label: (
            <Space size="small">
              <AccountBookOutlined />
              <span>Owing</span>
              <Badge count={owingAccounts.length} style={{ backgroundColor: '#ff4d4f', fontSize: '10px' }} />
            </Space>
          )
        },
        {
          key: 'credit',
          label: (
            <Space size="small">
              <MoneyCollectOutlined />
              <span>Credit</span>
              <Badge count={creditAccounts.length} style={{ backgroundColor: '#52c41a', fontSize: '10px' }} />
            </Space>
          )
        }
      ]
    };
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <ShopOutlined /> Staff Accounts
          </Title>
        </Col>
        <Col>
          <Space size="small">
            <Button 
              icon={<SyncOutlined />}
              onClick={() => refreshData(true)}
              loading={loading}
              size="small"
            >
              Refresh
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                createForm.resetFields();
                setModalVisible(prev => ({ ...prev, createAccount: true }));
              }}
              disabled={usersWithoutAccounts.length === 0}
              size="small"
            >
              New Account
            </Button>
          </Space>
        </Col>
      </Row>

      {/* COMPACT STATISTICS */}
      {accountSummary && (
        <Row gutter={[8, 8]} style={{ marginBottom: '16px' }}>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" hoverable>
              <Statistic
                title="Total"
                value={accountSummary.totalAccounts}
                prefix={<TeamOutlined />}
                valueStyle={{ fontSize: '16px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" hoverable>
              <Statistic
                title="Active"
                value={accountSummary.activeAccounts}
                valueStyle={{ color: '#52c41a', fontSize: '16px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" hoverable>
              <Statistic
                title="On Hold"
                value={accountSummary.onHoldAccounts}
                valueStyle={{ color: '#fa8c16', fontSize: '16px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" hoverable>
              <Statistic
                title="Balance"
                value={formatCurrency(accountSummary.totalBalance)}
                valueStyle={{ 
                  color: accountSummary.totalBalance < 0 ? '#ff4d4f' : 
                         accountSummary.totalBalance > 0 ? '#52c41a' : '#666',
                  fontSize: '14px'
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" hoverable>
              <Statistic
                title="Owing"
                value={formatCurrency(accountSummary.totalNegative)}
                valueStyle={{ color: '#ff4d4f', fontSize: '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" hoverable>
              <Statistic
                title="Credit"
                value={formatCurrency(accountSummary.totalPositive)}
                valueStyle={{ color: '#52c41a', fontSize: '14px' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* COMPACT FILTERS */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by name, email..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
              size="small"
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
              size="small"
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="onHold">On Hold</Option>
              <Option value="owing">Owing</Option>
              <Option value="credit">Credit</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Station"
              value={filters.station}
              onChange={(value) => handleFilterChange('station', value)}
              allowClear
              size="small"
            >
              {stations.map(station => (
                <Option key={station.id} value={station.id}>
                  {station.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Button 
                icon={<FilterOutlined />}
                onClick={clearFilters}
                disabled={!filters.search && !filters.status && !filters.station}
                size="small"
              >
                Clear
              </Button>
              {renderExportButtons()}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Content with Tabs */}
      <Card size="small" bodyStyle={{ padding: '12px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={getTabItems().items}
          size="small"
          style={{ marginBottom: '12px' }}
        />

        {/* Accounts Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <SyncOutlined spin style={{ fontSize: '24px', color: '#1890ff' }} />
            <div style={{ marginTop: 8 }}>Loading staff accounts...</div>
          </div>
        ) : getFilteredAccounts().length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <Text>No staff accounts found</Text>
                <Button type="link" onClick={clearFilters} size="small">
                  Clear filters
                </Button>
              </Space>
            }
          />
        ) : (
          <Table
            columns={accountColumns}
            dataSource={getFilteredAccounts()}
            rowKey="id"
            size="small"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: getFilteredAccounts().length,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `${total} accounts`,
              pageSizeOptions: ['10', '20', '50', '100'],
              size: 'small'
            }}
            onChange={handleTableChange}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>

      {/* Users Without Accounts Alert */}
      {usersWithoutAccounts.length > 0 && (
        <Card size="small" style={{ marginTop: '16px' }}>
          <Alert
            message={`${usersWithoutAccounts.length} users need accounts`}
            description="These users are assigned to stations but don't have staff accounts yet."
            type="info"
            showIcon
            action={
              <Button 
                size="small" 
                type="primary"
                onClick={() => {
                  createForm.resetFields();
                  setModalVisible(prev => ({ ...prev, createAccount: true }));
                }}
              >
                Create
              </Button>
            }
          />
        </Card>
      )}

      {/* Export Report Modal */}
      {exportConfig.visible && (
        <Modal
          title="Generate Report"
          open={exportConfig.visible}
          onCancel={() => setExportConfig(prev => ({ ...prev, visible: false }))}
          footer={[
            <Button 
              key="cancel" 
              onClick={() => setExportConfig(prev => ({ ...prev, visible: false }))}
              size="small"
            >
              Cancel
            </Button>
          ]}
          width={800}
          style={{ top: 20 }}
          destroyOnClose
        >
          <AdvancedReportGenerator
            key={`report-${exportConfig.type}-${Date.now()}`}
            dataSource={exportConfig.data || []}
            columns={exportConfig.columns || []}
            summaryData={exportConfig.summaryData}
            title={exportConfig.title}
            fileName={exportConfig.fileName}
            reportType="finance"
            companyName={state?.currentCompany?.name || "Company"}
            stationInfo={state?.currentStation ? {
              name: state.currentStation.name,
              code: state.currentStation.code,
              address: state.currentStation.location
            } : null}
            showFooter={true}
            footerText={getFooterText()}
            enableCustomization={true}
            includeLogo={false}
            showGrandTotals={false}
            onReportGenerate={(format) => {
              handleReportComplete(format);
            }}
            onSettingsSave={(settings) => {
              console.log('Settings saved:', settings);
            }}
          />
        </Modal>
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
        okText="Create"
        cancelText="Cancel"
        width={600}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateAccount} preserve={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="userId" label="User" rules={[{ required: true }]}>
                <Select placeholder="Select user" showSearch size="small">
                  {usersWithoutAccounts.map(user => (
                    <Option key={user.id} value={user.id}>
                      {user.displayName || `${user.firstName} ${user.lastName}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stationId" label="Station" rules={[{ required: true }]}>
                <Select placeholder="Select station" showSearch size="small">
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
              <Form.Item name="salaryAmount" label="Salary" initialValue={30000}>
                <InputNumber style={{ width: '100%' }} size="small" min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="creditLimit" label="Credit Limit" initialValue={5000}>
                <InputNumber style={{ width: '100%' }} size="small" min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="payrollMethod" label="Pay Method" initialValue="STATION_WALLET">
                <Select size="small">
                  <Option value="STATION_WALLET">Station Wallet</Option>
                  <Option value="BANK_TRANSFER">Bank Transfer</Option>
                  <Option value="MOBILE_MONEY">Mobile Money</Option>
                  <Option value="CASH">Cash</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentSchedule" label="Schedule" initialValue="MONTHLY">
                <Select size="small">
                  <Option value="DAILY">Daily</Option>
                  <Option value="WEEKLY">Weekly</Option>
                  <Option value="MONTHLY">Monthly</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}>
            <Switch size="small" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Update Account Modal */}
      <Modal
        title="Update Staff Account"
        open={modalVisible.updateAccount}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, updateAccount: false }));
          updateForm.resetFields();
        }}
        onOk={() => updateForm.submit()}
        okText="Update"
        cancelText="Cancel"
        width={600}
        confirmLoading={submitting}
        destroyOnClose
      >
        {selectedAccount && (
          <Form form={updateForm} layout="vertical" onFinish={handleUpdateAccount} preserve={false}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="salaryAmount" label="Salary">
                  <InputNumber style={{ width: '100%' }} size="small" min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="creditLimit" label="Credit Limit">
                  <InputNumber style={{ width: '100%' }} size="small" min={0} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="payrollMethod" label="Pay Method">
                  <Select size="small">
                    <Option value="STATION_WALLET">Station Wallet</Option>
                    <Option value="BANK_TRANSFER">Bank Transfer</Option>
                    <Option value="MOBILE_MONEY">Mobile Money</Option>
                    <Option value="CASH">Cash</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="paymentSchedule" label="Schedule">
                  <Select size="small">
                    <Option value="DAILY">Daily</Option>
                    <Option value="WEEKLY">Weekly</Option>
                    <Option value="MONTHLY">Monthly</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch size="small" />
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
          <Button key="close" onClick={() => setModalVisible(prev => ({ ...prev, viewDetails: false }))} size="small">
            Close
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => {
              setModalVisible(prev => ({ ...prev, viewDetails: false, updateAccount: true }));
            }}
            size="small"
          >
            Edit
          </Button>
        ]}
        width={700}
      >
        {selectedAccount && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Staff Name" span={2}>
              <Space>
                <Avatar size="small" icon={<UserOutlined />} />
                <Text strong>
                  {selectedAccount.user ? 
                    `${selectedAccount.user.firstName || ''} ${selectedAccount.user.lastName || ''}`.trim() : 
                    'Unknown User'}
                </Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {selectedAccount.user?.email || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {selectedAccount.user?.phoneNumber || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Station">
              {selectedAccount.station?.name || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Space>
                <Tag color={selectedAccount.isActive ? 'success' : 'default'}>
                  {selectedAccount.isActive ? 'Active' : 'Inactive'}
                </Tag>
                {selectedAccount.isOnHold && (
                  <Tag color="warning">On Hold</Tag>
                )}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Balance">
              <Text style={{ color: getBalanceColor(selectedAccount.currentBalance) }}>
                {formatCurrency(selectedAccount.currentBalance || 0)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Salary">
              {formatCurrency(selectedAccount.salaryAmount || 0)}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Method">
              {getPayrollMethodLabel(selectedAccount.payrollMethod)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default StaffAccountManagement;