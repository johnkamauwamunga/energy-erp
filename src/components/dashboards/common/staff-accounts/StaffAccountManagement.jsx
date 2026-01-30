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
  DownOutlined
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
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    payrollMethod: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    station: ''
  });
  const [accountSummary, setAccountSummary] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
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
        ...filters
      };

      // Remove 'all' values from filters
      Object.keys(filterParams).forEach(key => {
        if (filterParams[key] === 'all') {
          delete filterParams[key];
        }
      });

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
  };

  // Apply filters with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchStaffAccounts(1, pagination.pageSize);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [filters]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, []);

  // ========== REPORT GENERATION FUNCTIONS ==========

  // Prepare data for ALL staff accounts report
  const prepareAllStaffAccountsExportData = () => {
    if (!staffAccounts || staffAccounts.length === 0) return [];
    
    return staffAccounts.map((account, index) => {
      // Calculate credit utilization
      const creditLimit = account.creditLimit || 5000;
      const currentBalance = Math.abs(account.currentBalance || 0);
      const utilization = creditLimit > 0 ? (currentBalance / creditLimit * 100) : 0;
      
      return {
        sequence: index + 1,
        staffId: account.user?.id?.substring(0, 8) || 'N/A',
        staffName: account.user ? `${account.user.firstName || ''} ${account.user.lastName || ''}`.trim() : 'Unknown User',
        email: account.user?.email || 'N/A',
        phone: account.user?.phoneNumber || 'N/A',
        role: account.user?.role || 'N/A',
        station: account.station?.name || 'Unknown Station',
        stationCode: account.station?.code || 'N/A',
        salary: account.salaryAmount || 0,
        balance: account.currentBalance || 0,
        creditLimit: creditLimit,
        creditUtilization: `${utilization.toFixed(1)}%`,
        balanceStatus: account.currentBalance < 0 ? 'Owes Station' : 
                      account.currentBalance > 0 ? 'Station Owes' : 'Settled',
        shortages: account.totalShortages || 0,
        advances: account.totalAdvances || 0,
        bonuses: account.totalBonuses || 0,
        status: account.isActive ? 'Active' : 'Inactive',
        onHold: account.isOnHold ? 'Yes' : 'No',
        holdReason: account.holdReason || 'N/A',
        paymentMethod: getPayrollMethodLabel(account.payrollMethod),
        paymentSchedule: getPaymentScheduleLabel(account.paymentSchedule),
        bankAccount: account.bankAccountNumber || 'N/A',
        bankName: account.bankName || 'N/A',
        mobileMoney: account.mobileMoneyNumber || 'N/A',
        lastPaymentDate: account.lastPaymentDate ? 
          dayjs(account.lastPaymentDate).format('YYYY-MM-DD') : 'Never',
        nextPaymentDate: account.nextPaymentDate ? 
          dayjs(account.nextPaymentDate).format('YYYY-MM-DD') : 'Not Set',
        createdAt: account.createdAt ? 
          dayjs(account.createdAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
        updatedAt: account.updatedAt ? 
          dayjs(account.updatedAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A'
      };
    });
  };

  // Prepare data for current tab report
  const prepareTabExportData = () => {
    const accounts = getFilteredAccounts();
    if (!accounts || accounts.length === 0) return [];
    
    return accounts.map((account, index) => {
      const creditLimit = account.creditLimit || 5000;
      const currentBalance = Math.abs(account.currentBalance || 0);
      const utilization = creditLimit > 0 ? (currentBalance / creditLimit * 100) : 0;
      
      return {
        sequence: index + 1,
        staffName: account.user ? `${account.user.firstName || ''} ${account.user.lastName || ''}`.trim() : 'Unknown User',
        email: account.user?.email || 'N/A',
        station: account.station?.name || 'Unknown Station',
        salary: account.salaryAmount || 0,
        balance: account.currentBalance || 0,
        balanceStatus: account.currentBalance < 0 ? 'Owes Station' : 
                      account.currentBalance > 0 ? 'Station Owes' : 'Settled',
        creditLimit: creditLimit,
        creditUtilization: `${utilization.toFixed(1)}%`,
        shortages: account.totalShortages || 0,
        advances: account.totalAdvances || 0,
        status: account.isActive ? 'Active' : 'Inactive',
        onHold: account.isOnHold ? 'Yes' : 'No',
        paymentMethod: getPayrollMethodLabel(account.payrollMethod),
        lastPaymentDate: account.lastPaymentDate ? 
          dayjs(account.lastPaymentDate).format('YYYY-MM-DD') : 'Never',
        createdAt: account.createdAt ? 
          dayjs(account.createdAt).format('YYYY-MM-DD') : 'N/A'
      };
    });
  };

  // Prepare summary report data
  const prepareSummaryExportData = () => {
    if (!accountSummary) return [];
    
    return [
      {
        category: 'Total Accounts',
        value: accountSummary.totalAccounts,
        amount: null
      },
      {
        category: 'Active Accounts',
        value: accountSummary.activeAccounts,
        amount: null
      },
      {
        category: 'Accounts on Hold',
        value: accountSummary.onHoldAccounts,
        amount: null
      },
      {
        category: 'Total Balance',
        value: null,
        amount: accountSummary.totalBalance
      },
      {
        category: 'Station Owes Staff',
        value: null,
        amount: accountSummary.totalPositive
      },
      {
        category: 'Staff Owes Station',
        value: null,
        amount: accountSummary.totalNegative
      },
      {
        category: 'Total Shortages',
        value: null,
        amount: accountSummary.totalShortages
      },
      {
        category: 'Total Advances',
        value: null,
        amount: accountSummary.totalAdvances
      },
      {
        category: 'Total Bonuses',
        value: null,
        amount: accountSummary.totalBonuses
      },
      {
        category: 'Average Balance',
        value: null,
        amount: accountSummary.averageBalance
      }
    ];
  };

  // Calculate summary data for reports
  const calculateAllStaffAccountsSummary = () => {
    if (!staffAccounts || staffAccounts.length === 0) return null;

    return {
      summaryInfo: {
        'Total Staff Accounts': staffAccounts.length,
        'Active Accounts': staffAccounts.filter(acc => acc.isActive).length,
        'Accounts on Hold': staffAccounts.filter(acc => acc.isOnHold).length,
        'Total Balance': formatCurrency(accountSummary?.totalBalance || 0),
        'Station Owes Staff': formatCurrency(accountSummary?.totalPositive || 0),
        'Staff Owes Station': formatCurrency(accountSummary?.totalNegative || 0),
        'Total Shortages': formatCurrency(accountSummary?.totalShortages || 0),
        'Total Advances': formatCurrency(accountSummary?.totalAdvances || 0),
        'Total Bonuses': formatCurrency(accountSummary?.totalBonuses || 0),
        'Average Balance': formatCurrency(accountSummary?.averageBalance || 0),
        'Company': state?.currentCompany?.name || 'N/A',
        'Station': state?.currentStation?.name || 'All Stations',
        'Report Date': new Date().toLocaleDateString('en-KE'),
        'Generated Time': new Date().toLocaleTimeString('en-KE'),
        'Generated By': `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`,
        'User Role': currentUser?.role || 'N/A'
      }
    };
  };

  const calculateTabSummaryData = () => {
    const accounts = getFilteredAccounts();
    if (!accounts || accounts.length === 0) return null;

    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    const activeAccounts = accounts.filter(acc => acc.isActive).length;
    const onHoldAccounts = accounts.filter(acc => acc.isOnHold).length;

    return {
      summaryInfo: {
        [`Total ${getTabDisplayName()} Accounts`]: accounts.length,
        'Active Accounts': activeAccounts,
        'Accounts on Hold': onHoldAccounts,
        'Total Balance': formatCurrency(totalBalance),
        'Average Balance': formatCurrency(accounts.length > 0 ? totalBalance / accounts.length : 0),
        'Report Type': `${getTabDisplayName()} Staff Accounts`,
        'Generated Date': new Date().toLocaleDateString('en-KE'),
        'Generated Time': new Date().toLocaleTimeString('en-KE'),
        'Generated By': `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`,
        'Company': state?.currentCompany?.name || 'N/A',
        'Current Station': state?.currentStation?.name || 'All Stations'
      }
    };
  };

  // Get columns for ALL staff accounts report
  const getAllStaffAccountsExportColumns = () => {
    return [
      {
        title: '#',
        dataIndex: 'sequence',
        key: 'sequence',
        width: 50,
        type: 'number'
      },
      {
        title: 'Staff Name',
        dataIndex: 'staffName',
        key: 'staffName',
        width: 150,
        type: 'text'
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        width: 180,
        type: 'text'
      },
      {
        title: 'Phone',
        dataIndex: 'phone',
        key: 'phone',
        width: 100,
        type: 'text'
      },
      {
        title: 'Role',
        dataIndex: 'role',
        key: 'role',
        width: 100,
        type: 'text'
      },
      {
        title: 'Salary',
        dataIndex: 'salary',
        key: 'salary',
        width: 100,
        type: 'currency'
      },
      {
        title: 'Balance',
        dataIndex: 'balance',
        key: 'balance',
        width: 120,
        type: 'currency'
      },
      {
        title: 'Shortages',
        dataIndex: 'shortages',
        key: 'shortages',
        width: 100,
        type: 'currency'
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 80,
        type: 'text'
      },
      {
        title: 'Next Payment',
        dataIndex: 'nextPaymentDate',
        key: 'nextPaymentDate',
        width: 100,
        type: 'date'
      },
    ];
  };

  // Get columns for current tab report
  const getTabExportColumns = () => {
    const baseColumns = [
      {
        title: '#',
        dataIndex: 'sequence',
        key: 'sequence',
        width: 60,
        type: 'number'
      },
      {
        title: 'Staff Name',
        dataIndex: 'staffName',
        key: 'staffName',
        width: 150,
        type: 'text'
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        width: 180,
        type: 'text'
      },
      {
        title: 'Station',
        dataIndex: 'station',
        key: 'station',
        width: 120,
        type: 'text'
      },
      {
        title: 'Salary',
        dataIndex: 'salary',
        key: 'salary',
        width: 100,
        type: 'currency'
      },
      {
        title: 'Balance',
        dataIndex: 'balance',
        key: 'balance',
        width: 120,
        type: 'currency'
      },
      {
        title: 'Shortages',
        dataIndex: 'shortages',
        key: 'shortages',
        width: 100,
        type: 'currency'
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 80,
        type: 'text'
      },
      {
        title: 'Last Payment',
        dataIndex: 'lastPaymentDate',
        key: 'lastPaymentDate',
        width: 100,
        type: 'date'
      }
    ];

    return baseColumns;
  };

  // Get columns for summary report
  const getSummaryExportColumns = () => {
    return [
      {
        title: 'Category',
        dataIndex: 'category',
        key: 'category',
        width: 180,
        type: 'text'
      },
      {
        title: 'Count/Value',
        dataIndex: 'value',
        key: 'value',
        width: 100,
        type: 'number',
        render: (value) => value !== null ? value : '-'
      },
      {
        title: 'Amount (Ksh)',
        dataIndex: 'amount',
        key: 'amount',
        width: 120,
        type: 'currency',
        render: (amount) => amount !== null ? formatCurrency(amount) : '-'
      }
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
    
    // Apply search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(acc => 
        (acc.user?.firstName && acc.user.firstName.toLowerCase().includes(query)) ||
        (acc.user?.lastName && acc.user.lastName.toLowerCase().includes(query)) ||
        (acc.user?.email && acc.user.email.toLowerCase().includes(query)) ||
        (acc.station?.name && acc.station.name.toLowerCase().includes(query)) ||
        (acc.user?.phoneNumber && acc.user.phoneNumber.includes(query))
      );
    }
    
    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'active') {
        filtered = filtered.filter(acc => acc.isActive);
      } else if (filters.status === 'inactive') {
        filtered = filtered.filter(acc => !acc.isActive);
      } else if (filters.status === 'onHold') {
        filtered = filtered.filter(acc => acc.isOnHold);
      }
    }
    
    // Apply payroll method filter
    if (filters.payrollMethod) {
      filtered = filtered.filter(acc => acc.payrollMethod === filters.payrollMethod);
    }
    
    // Apply station filter
    if (filters.station) {
      filtered = filtered.filter(acc => acc.stationId === filters.station);
    }
    
    // Sort filtered accounts
    filtered.sort((a, b) => {
      const aValue = a[filters.sortBy] || '';
      const bValue = b[filters.sortBy] || '';
      
      if (filters.sortBy === 'currentBalance' || filters.sortBy === 'salaryAmount' || filters.sortBy === 'creditLimit') {
        return filters.sortOrder === 'desc' ? (bValue - aValue) : (aValue - bValue);
      }
      
      if (filters.sortBy === 'createdAt' || filters.sortBy === 'updatedAt') {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        return filters.sortOrder === 'desc' ? (bDate - aDate) : (aDate - bDate);
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filters.sortOrder === 'desc' ? 
          bValue.localeCompare(aValue) : 
          aValue.localeCompare(bValue);
      }
      
      return 0;
    });
    
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
    } else if (type === 'current') {
      return `${getTabDisplayName()} Staff Accounts Report - ${companyName} (${currentDate})`;
    } else if (type === 'summary') {
      return `Staff Accounts Summary Report - ${companyName} (${currentDate})`;
    }
    return `Staff Accounts Report - ${companyName} (${currentDate})`;
  };

  // Get file name
  const getFileName = (type) => {
    const companyCode = state?.currentCompany?.code ? `_${state.currentCompany.code}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    
    if (type === 'all') {
      return `complete_staff_accounts${companyCode}_${dateStr}`;
    } else if (type === 'current') {
      return `${activeTab}_staff_accounts${companyCode}_${dateStr}`;
    } else if (type === 'summary') {
      return `staff_accounts_summary${companyCode}_${dateStr}`;
    }
    return `staff_accounts${companyCode}_${dateStr}`;
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
      exportColumns = getAllStaffAccountsExportColumns();
      summaryData = calculateAllStaffAccountsSummary();
      title = getReportTitle('all');
      fileName = getFileName('all');
    } else if (type === 'current') {
      const filteredAccounts = getFilteredAccounts();
      if (filteredAccounts.length === 0) {
        message.warning(`No ${activeTab} staff accounts available to export`);
        return;
      }
      exportData = prepareTabExportData();
      exportColumns = getTabExportColumns();
      summaryData = calculateTabSummaryData();
      title = getReportTitle('current');
      fileName = getFileName('current');
    } else if (type === 'summary') {
      if (!accountSummary) {
        message.warning('No summary data available to export');
        return;
      }
      exportData = prepareSummaryExportData();
      exportColumns = getSummaryExportColumns();
      summaryData = { summaryInfo: accountSummary };
      title = getReportTitle('summary');
      fileName = getFileName('summary');
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

  // Table columns
  const accountColumns = [
    {
      title: '#',
      key: 'index',
      width: 60,
      render: (_, __, index) => {
        const page = pagination.current || 1;
        const pageSize = pagination.pageSize || 10;
        return ((page - 1) * pageSize) + index + 1;
      }
    },
    {
      title: 'Staff Member',
      key: 'staff',
      render: (account) => (
        <Space>
          <Avatar 
            style={{ backgroundColor: '#1890ff' }}
            icon={<UserOutlined />}
          >
            {(account.user?.firstName?.[0] || 'U').toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {account.user ? `${account.user.firstName || ''} ${account.user.lastName || ''}`.trim() : 'Unknown User'}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {account.user?.email || 'No email'}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {account.station?.name || 'No station'}
            </div>
          </div>
        </Space>
      )
    },
    {
      title: 'Balance',
      key: 'balance',
      render: (account) => {
        const balance = account.currentBalance || 0;
        const color = getBalanceColor(balance);
        const status = balance < 0 ? 'Owes Station' : balance > 0 ? 'Station Owes' : 'Settled';
        
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ color, fontSize: '16px' }}>
              {formatCurrency(balance)}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {status}
            </Text>
            {account.creditLimit && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Limit: {formatCurrency(account.creditLimit)}
              </Text>
            )}
          </Space>
        );
      },
      sorter: true
    },
    {
      title: 'Salary',
      key: 'salary',
      render: (account) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontSize: '12px' }}>
            <Text strong>
              {account.salaryAmount ? formatCurrency(account.salaryAmount) : 'Not Set'}
            </Text>
          </div>
          <div style={{ fontSize: '12px' }}>
            <Text type="secondary">
              {getPaymentScheduleLabel(account.paymentSchedule)}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Payment Method',
      key: 'paymentMethod',
      render: (account) => {
        const method = account.payrollMethod || 'STATION_WALLET';
        const methodLabel = getPayrollMethodLabel(method);
        
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
      }
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

  // Get tab items with counts
  const getTabItems = () => {
    const filteredAccounts = getFilteredAccounts();
    const activeAccounts = staffAccounts.filter(acc => acc.isActive);
    const inactiveAccounts = staffAccounts.filter(acc => !acc.isActive);
    const onHoldAccounts = staffAccounts.filter(acc => acc.isOnHold);
    const owingAccounts = staffAccounts.filter(acc => (acc.currentBalance || 0) < 0);
    const creditAccounts = staffAccounts.filter(acc => (acc.currentBalance || 0) > 0);
    
    return [
      {
        key: 'all',
        label: (
          <Space>
            <TeamOutlined />
            <span>All Accounts</span>
            <Badge 
              count={staffAccounts.length} 
              style={{ backgroundColor: '#1890ff' }}
              overflowCount={999}
            />
          </Space>
        )
      },
      {
        key: 'active',
        label: (
          <Space>
            <CheckCircleOutlined />
            <span>Active</span>
            <Badge 
              count={activeAccounts.length} 
              style={{ backgroundColor: '#52c41a' }}
              overflowCount={999}
            />
          </Space>
        )
      },
      {
        key: 'inactive',
        label: (
          <Space>
            <PauseCircleOutlined />
            <span>Inactive</span>
            <Badge 
              count={inactiveAccounts.length} 
              style={{ backgroundColor: '#ff4d4f' }}
              overflowCount={999}
            />
          </Space>
        )
      },
      {
        key: 'onHold',
        label: (
          <Space>
            <LockOutlined />
            <span>On Hold</span>
            <Badge 
              count={onHoldAccounts.length} 
              style={{ backgroundColor: '#fa8c16' }}
              overflowCount={999}
            />
          </Space>
        )
      },
      {
        key: 'owing',
        label: (
          <Space>
            <AccountBookOutlined />
            <span>Owing</span>
            <Badge 
              count={owingAccounts.length} 
              style={{ backgroundColor: '#ff4d4f' }}
              overflowCount={999}
            />
          </Space>
        )
      },
      {
        key: 'credit',
        label: (
          <Space>
            <MoneyCollectOutlined />
            <span>Credit</span>
            <Badge 
              count={creditAccounts.length} 
              style={{ backgroundColor: '#52c41a' }}
              overflowCount={999}
            />
          </Space>
        )
      }
    ];
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
      },
      {
        key: 'summary',
        label: 'Export Summary Report',
        icon: <BarChartOutlined />,
        disabled: !accountSummary
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
        <Button type="primary" icon={<DownloadOutlined />}>
          Export Reports <DownOutlined />
        </Button>
      </Dropdown>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header Section */}
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={2} style={{ margin: 0 }}>
          <ShopOutlined /> Staff Account Management
        </Title>
        <Text type="secondary">
          Manage staff financial accounts, payroll settings, and financial transactions
        </Text>
      </Space>

      {/* Action Buttons */}
      <Space style={{ margin: '24px 0' }} wrap>
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
        
        {renderExportButtons()}
        
        <Button 
          icon={<SyncOutlined />}
          onClick={() => refreshData(true)}
          loading={loading}
        >
          Refresh
        </Button>
      </Space>

      {/* Summary Statistics */}
      {accountSummary && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" hoverable>
              <Statistic
                title="Total Accounts"
                value={accountSummary.totalAccounts}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" hoverable>
              <Statistic
                title="Active Accounts"
                value={accountSummary.activeAccounts}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
              <Progress 
                percent={((accountSummary.activeAccounts / accountSummary.totalAccounts) * 100) || 0} 
                size="small" 
                status="active"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" hoverable>
              <Statistic
                title="Total Balance"
                value={formatCurrency(accountSummary.totalBalance)}
                prefix={<DollarOutlined />}
                valueStyle={{ 
                  color: accountSummary.totalBalance < 0 ? '#ff4d4f' : 
                         accountSummary.totalBalance > 0 ? '#52c41a' : '#666'
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" hoverable>
              <Statistic
                title="Staff Owes Station"
                value={formatCurrency(accountSummary.totalNegative)}
                prefix={<AccountBookOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }} size="small">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search by name, email, or station..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
              onPressEnter={() => fetchStaffAccounts(1, pagination.pageSize)}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="onHold">On Hold</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Payment Method"
              value={filters.payrollMethod}
              onChange={(value) => handleFilterChange('payrollMethod', value)}
              allowClear
            >
              <Option value="STATION_WALLET">Station Wallet</Option>
              <Option value="BANK_TRANSFER">Bank Transfer</Option>
              <Option value="MOBILE_MONEY">Mobile Money</Option>
              <Option value="CASH">Cash</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Station"
              value={filters.station}
              onChange={(value) => handleFilterChange('station', value)}
              allowClear
            >
              {stations.map(station => (
                <Option key={station.id} value={station.id}>
                  {station.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Sort By"
              value={filters.sortBy}
              onChange={(value) => handleFilterChange('sortBy', value)}
            >
              <Option value="createdAt">Created Date</Option>
              <Option value="currentBalance">Balance</Option>
              <Option value="salaryAmount">Salary</Option>
              <Option value="updatedAt">Last Updated</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Main Content with Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={getTabItems()}
          style={{ marginBottom: '16px' }}
        />

        {/* Accounts Table */}
        <div style={{ marginTop: '16px' }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '48px' 
            }}>
              <SyncOutlined spin style={{ fontSize: '24px', color: '#1890ff' }} />
              <span style={{ marginLeft: '8px', color: '#666' }}>
                Loading staff accounts...
              </span>
            </div>
          ) : getFilteredAccounts().length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical">
                  <Text>
                    {filters.search || filters.status || filters.payrollMethod
                      ? 'No staff accounts match your search criteria'
                      : `No ${activeTab} staff accounts found`}
                  </Text>
                  <Button type="link" onClick={() => {
                    setFilters({
                      search: '',
                      status: 'all',
                      payrollMethod: '',
                      sortBy: 'createdAt',
                      sortOrder: 'desc',
                      station: ''
                    });
                  }}>
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
              loading={loading}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: getFilteredAccounts().length,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} accounts (${getTabDisplayName()})`
              }}
              onChange={(pagination, filters, sorter) => {
                if (sorter.field) {
                  handleFilterChange('sortBy', sorter.field);
                  handleFilterChange('sortOrder', sorter.order === 'ascend' ? 'asc' : 'desc');
                }
                if (pagination.current !== pagination.current) {
                  handleTableChange(pagination);
                }
              }}
              scroll={{ x: 1200 }}
            />
          )}
        </div>
      </Card>

      {/* Users Without Accounts Section */}
      {usersWithoutAccounts.length > 0 && (
        <Card 
          title={
            <Space>
              <WarningOutlined />
              <span>Users Without Accounts ({usersWithoutAccounts.length})</span>
            </Space>
          }
          style={{ marginTop: '24px' }}
          size="small"
        >
          <Alert
            message="Quick Account Creation"
            description={`${usersWithoutAccounts.length} users are assigned to stations but don't have staff accounts yet. Click "Create Account" to add them.`}
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
                Create Accounts
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
            >
              Cancel
            </Button>
          ]}
          width={800}
          style={{ top: 20 }}
          destroyOnClose
        >
          <AdvancedReportGenerator
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
        okText="Create Account"
        cancelText="Cancel"
        width={600}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form 
          form={createForm} 
          layout="vertical" 
          onFinish={handleCreateAccount}
          preserve={false}
        >
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
                      {user.displayName || `${user.firstName} ${user.lastName}`} ({user.email})
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
                initialValue={30000}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter salary amount"
                  min={0}
                  max={500000}
                  step={1000}
                  formatter={value => `Ksh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/Ksh\s?|,/g, '')}
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
                  step={1000}
                  formatter={value => `Ksh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/Ksh\s?|,/g, '')}
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
                <Select placeholder="Select payroll method">
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
                <Select placeholder="Select payment schedule">
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
                name="bankName"
                label="Bank Name"
                initialValue="Baclays Bank"
              >
                <Input placeholder="Enter bank name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="bankAccountNumber"
                label="Bank Account Number"
                initialValue="001110001100"
              >
                <Input placeholder="Enter bank account number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="mobileMoneyNumber"
                label="Mobile Money Number"
                initialValue="0712345678"
              >
                <Input placeholder="Enter mobile money number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="nextPaymentDate"
                label="Next Payment Date"
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  placeholder="Select next payment date"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="isActive"
            label="Account Status"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" defaultChecked />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea placeholder="Additional notes (optional)" rows={3} />
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
        okText="Update Account"
        cancelText="Cancel"
        width={600}
        confirmLoading={submitting}
        destroyOnClose
      >
        {selectedAccount && (
          <Form 
            form={updateForm} 
            layout="vertical" 
            onFinish={handleUpdateAccount}
            preserve={false}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="creditLimit" label="Credit Limit">
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter credit limit"
                    min={0}
                    max={100000}
                    step={1000}
                    formatter={value => `Ksh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/Ksh\s?|,/g, '')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="salaryAmount" label="Salary Amount">
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter salary amount"
                    min={0}
                    max={500000}
                    step={1000}
                    formatter={value => `Ksh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/Ksh\s?|,/g, '')}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="payrollMethod" label="Payroll Method">
                  <Select placeholder="Select payroll method">
                    <Option value="STATION_WALLET">Station Wallet</Option>
                    <Option value="BANK_TRANSFER">Bank Transfer</Option>
                    <Option value="MOBILE_MONEY">Mobile Money</Option>
                    <Option value="CASH">Cash</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="paymentSchedule" label="Payment Schedule">
                  <Select placeholder="Select payment schedule">
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
                <Form.Item name="bankName" label="Bank Name">
                  <Input placeholder="Enter bank name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="bankAccountNumber" label="Bank Account Number">
                  <Input placeholder="Enter bank account number" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="mobileMoneyNumber" label="Mobile Money Number">
                  <Input placeholder="Enter mobile money number" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="nextPaymentDate" label="Next Payment Date">
                  <DatePicker 
                    style={{ width: '100%' }} 
                    placeholder="Select next payment date"
                    format="YYYY-MM-DD"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="isActive" label="Account Status" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>

            <Form.Item name="notes" label="Notes">
              <TextArea placeholder="Additional notes" rows={3} />
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
                  <Text strong>
                    {selectedAccount.user ? 
                      `${selectedAccount.user.firstName || ''} ${selectedAccount.user.lastName || ''}`.trim() : 
                      'Unknown User'}
                  </Text>
                  <Text type="secondary">{selectedAccount.user?.email}</Text>
                  <Text type="secondary">ID: {selectedAccount.user?.id?.substring(0, 8)}...</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Station">
                <Space direction="vertical" size={0}>
                  <Text strong>{selectedAccount.station?.name}</Text>
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
                {selectedAccount.createdAt ? 
                  new Date(selectedAccount.createdAt).toLocaleDateString() : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Account ID">
                <Text copyable>{selectedAccount.id?.substring(0, 12)}...</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {selectedAccount.updatedAt ? 
                  new Date(selectedAccount.updatedAt).toLocaleDateString() : 'N/A'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="Financial Information" bordered size="small" column={2}>
              <Descriptions.Item label="Current Balance">
                <Space direction="vertical" size={0}>
                  <Text 
                    strong 
                    style={{ 
                      color: getBalanceColor(selectedAccount.currentBalance),
                      fontSize: '18px'
                    }}
                  >
                    {formatCurrency(selectedAccount.currentBalance || 0)}
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
                    {formatCurrency(selectedAccount.creditLimit || 5000)}
                  </Text>
                  <Text type="secondary">
                    Available: {formatCurrency(
                      (selectedAccount.creditLimit || 5000) + 
                      Math.min(selectedAccount.currentBalance || 0, 0)
                    )}
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Salary Amount">
                {selectedAccount.salaryAmount ? 
                  formatCurrency(selectedAccount.salaryAmount) : 'Not Set'}
              </Descriptions.Item>
              <Descriptions.Item label="Next Payment Date">
                {selectedAccount.nextPaymentDate ? 
                  new Date(selectedAccount.nextPaymentDate).toLocaleDateString() : 'Not Set'}
              </Descriptions.Item>
              <Descriptions.Item label="Total Shortages">
                {formatCurrency(selectedAccount.totalShortages || 0)}
              </Descriptions.Item>
              <Descriptions.Item label="Total Advances">
                {formatCurrency(selectedAccount.totalAdvances || 0)}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="Payroll Settings" bordered size="small" column={2}>
              <Descriptions.Item label="Payroll Method">
                {getPayrollMethodLabel(selectedAccount.payrollMethod)}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Schedule">
                {getPaymentScheduleLabel(selectedAccount.paymentSchedule)}
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
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StaffAccountManagement;