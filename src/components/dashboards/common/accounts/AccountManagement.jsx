import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Descriptions,
  Switch,
  Popconfirm,
  DatePicker,
  Alert,
  Badge,
  Divider
} from 'antd';
import {
  BankOutlined,
  WalletOutlined,
  SwapOutlined,
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HistoryOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  FileTextOutlined,
  FilterOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { bankingService } from '../../../../services/bankingService/bankingService';
import { bankService } from '../../../../services/bankService/bankService';
import { useApp } from '../../../../context/AppContext';
import AdvancedReportGenerator from '../downloadable/AdvancedReportGenerator';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const AccountsManagement = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  
  // Report Generation State
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportConfig, setReportConfig] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: '',
    dateRange: []
  });
  
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('wallet');
  const [depositForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [formErrors, setFormErrors] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refreshIntervalRef = useRef(null);
  const currentUser = state.currentUser;
 
  const isCompanyLevel = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER'].includes(currentUser?.role);
  const isStationLevel = ['STATION_MANAGER', 'SUPERVISOR', 'ATTENDANT'].includes(currentUser?.role);

  // Auto-refresh configuration
  const REFRESH_INTERVAL = 15000; // 15 seconds
  const QUICK_REFRESH_INTERVAL = 5000; // 5 seconds for quick updates

  // Load station wallet data
  const loadWalletData = async () => {
    try {
      let wallet;
      if (isStationLevel) {
        wallet = await bankingService.getCurrentStationWallet();
      } else if (isCompanyLevel && currentUser.stationId) {
        wallet = await bankingService.getStationWallet(currentUser.stationId);
      }
      setWalletData(wallet);
      return wallet;
    } catch (error) {
      console.error('Error loading wallet:', error);
      throw error;
    }
  };

  // Load bank accounts
  const loadAccounts = async () => {
    try {
      const result = await bankService.getBankAccounts({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      
      setAccounts(result.accounts || result || []);
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.total || result.total || 0
      }));
      return result;
    } catch (error) {
      console.error('Error loading accounts:', error);
      throw error;
    }
  };

  // Load wallet transactions from wallet data
  const loadWalletTransactions = () => {
    if (walletData && walletData.transactions) {
      const formattedTransactions = walletData.transactions.map(transaction => ({
        ...transaction,
        key: transaction.id,
        formattedDate: bankingService.formatDateTime(transaction.transactionDate),
        formattedAmount: bankingService.formatCurrency(Math.abs(transaction.amount)),
        formattedPreviousBalance: bankingService.formatCurrency(transaction.previousBalance),
        formattedNewBalance: bankingService.formatCurrency(transaction.newBalance),
        recordedByDisplay: transaction.recordedBy ? 
          `${transaction.recordedBy.firstName} ${transaction.recordedBy.lastName}` : 
          'System'
      }));
      setTransactions(formattedTransactions);
      setPagination(prev => ({
        ...prev,
        total: formattedTransactions.length
      }));
    }
  };

  // Load bank transfers (bank deposits)
  const loadBankTransfers = async () => {
    try {
      const result = await bankingService.getBankTransactions({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
        transactionType: 'DEPOSIT'
      });
      
      const formattedTransfers = (result.transactions || result || []).map(transfer => ({
        ...transfer,
        key: transfer.id,
        formattedDate: bankingService.formatDateTime(transfer.transactionDate),
        formattedAmount: bankingService.formatCurrency(transfer.amount),
        recordedByDisplay: transfer.recordedBy ? 
          `${transfer.recordedBy.firstName} ${transfer.recordedBy.lastName}` : 
          'System'
      }));
      
      setTransfers(formattedTransfers);
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.total || result.total || 0
      }));
      return result;
    } catch (error) {
      console.error('Error loading transfers:', error);
      throw error;
    }
  };

  // Main refresh function
  const refreshAllData = async (showMessage = false) => {
    if (loading) return; // Prevent multiple simultaneous refreshes
    
    setLoading(true);
    try {
      const refreshPromises = [loadWalletData(), loadAccounts()];
      
      if (activeTab === 'transfers') {
        refreshPromises.push(loadBankTransfers());
      }

      await Promise.all(refreshPromises);
      
      setLastUpdated(new Date());
      setRefreshCount(prev => prev + 1);
      
      if (showMessage) {
        message.success('Data refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      if (showMessage) {
        message.error('Failed to refresh data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick refresh - only updates wallet data (faster)
  const quickRefresh = async () => {
    try {
      await loadWalletData();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Quick refresh failed:', error);
    }
  };

  // Setup auto-refresh intervals
  useEffect(() => {
    if (autoRefresh) {
      // Main refresh interval
      refreshIntervalRef.current = setInterval(() => {
        refreshAllData(false);
      }, REFRESH_INTERVAL);

      // Quick refresh interval for wallet data only
      const quickRefreshInterval = setInterval(() => {
        quickRefresh();
      }, QUICK_REFRESH_INTERVAL);

      return () => {
        clearInterval(refreshIntervalRef.current);
        clearInterval(quickRefreshInterval);
      };
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }
  }, [autoRefresh]);

  // Initial load and reload when dependencies change
  useEffect(() => {
    refreshAllData(false);
  }, []);

  useEffect(() => {
    if (walletData) {
      loadWalletTransactions();
    }
  }, [walletData]);

  useEffect(() => {
    if (activeTab === 'transfers') {
      loadBankTransfers();
    }
  }, [activeTab, filters, pagination.page, pagination.limit]);

  // Handle page visibility changes (refresh when tab becomes active)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && autoRefresh) {
        // Page became visible, refresh data
        refreshAllData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh]);

  // Manual refresh with visual feedback
  const handleManualRefresh = async () => {
    await refreshAllData(true);
  };

  // Toggle auto-refresh
  const handleAutoRefreshToggle = (checked) => {
    setAutoRefresh(checked);
    if (checked) {
      message.success('Auto-refresh enabled');
    } else {
      message.info('Auto-refresh disabled');
    }
  };

  // Handle deposit creation with immediate refresh
  const handleDepositSubmit = async (values) => {
    setSubmitting(true);
    setFormErrors([]);

    try {
      console.log('Form values:', values);
      
      const depositData = {
        amount: parseFloat(values.amount),
        bankAccountId: values.bankAccountId,
        description: values.description?.trim() || `Bank deposit from ${walletData?.station?.name || 'Station'}`,
        referenceNumber: values.referenceNumber?.trim() || undefined,
        transactionMode: values.transactionMode,
        stationId: currentUser.stationId
      };

      console.log('Parsed deposit data:', depositData);

      // Validate deposit amount
      const validationErrors = validateDepositAmount(depositData.amount);
      if (validationErrors.length > 0) {
        setFormErrors(validationErrors);
        setSubmitting(false);
        return;
      }

      await bankingService.createBankDeposit(depositData);
      message.success('Bank deposit created successfully!');
      
      // Close modal and reset form
      setDepositModalVisible(false);
      depositForm.resetFields();
      setFormErrors([]);
      
      // Immediate refresh after deposit - refresh ALL data
      await refreshAllData(false);
      
    } catch (error) {
      console.error('Deposit error:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        message.error(error.message || 'Failed to create deposit');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Enhanced deposit amount validation
  const validateDepositAmount = (amount) => {
    const errors = [];
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount)) {
      errors.push('Please enter a valid number');
      return errors;
    }

    if (numAmount <= 0) {
      errors.push('Amount must be positive');
    }

    if (numAmount < 100) {
      errors.push('Minimum deposit amount is KES 100');
    }

    if (walletData && numAmount > walletData.currentBalance) {
      errors.push(`Insufficient funds. Available: ${bankingService.formatCurrency(walletData.currentBalance)}`);
    }

    return errors;
  };

  // Real-time amount validation
  const handleAmountChange = (value) => {
    const errors = validateDepositAmount(value);
    setFormErrors(errors);
  };

  // Handle transfer creation
  const handleTransferSubmit = async (values) => {
    try {
      // This would be your transfer service call
      // await transferService.createTransfer(values);
      message.success('Transfer initiated successfully');
      setTransferModalVisible(false);
      transferForm.resetFields();
      await loadBankTransfers();
    } catch (error) {
      message.error(error.message || 'Failed to create transfer');
    }
  };

  // ==================== REPORT GENERATION ====================

  // Prepare wallet transactions report data - SIMPLIFIED COLUMNS
  const prepareWalletReportData = (data) => {
    return data.map((item, index) => ({
      '#': index + 1,
      'Date': bankingService.formatDateTime(item.transactionDate),
      'Type': item.type,
      'Description': item.description || 'No description',
      'Amount': Math.abs(item.amount),
      'Direction': item.amount < 0 ? 'Outflow' : 'Inflow',
      'Previous Balance': item.previousBalance,
      'New Balance': item.newBalance,
      'Recorded By': item.recordedByDisplay
    }));
  };

  // Prepare bank transfers report data - SIMPLIFIED COLUMNS
  const prepareTransferReportData = (data) => {
    return data.map((item, index) => ({
      '#': index + 1,
      'Date': bankingService.formatDateTime(item.transactionDate),
      'Reference': item.referenceNumber || 'N/A',
      'Bank Account': item.bankAccount ? 
        `${item.bankAccount.bank?.name || ''} ${item.bankAccount.accountNumber || ''}`.trim() : 
        'Unknown',
      'Amount': item.amount,
      'Status': item.status,
      'Description': item.description || 'No description',
      'Recorded By': item.recordedByDisplay
    }));
  };

  // Get wallet report columns - SIMPLIFIED
  const getWalletReportColumns = () => [
    { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
    { title: 'Date', dataIndex: 'Date', key: 'date', width: 150, type: 'datetime' },
    { title: 'Type', dataIndex: 'Type', key: 'type', width: 100, type: 'text' },
    { title: 'Description', dataIndex: 'Description', key: 'description', width: 200, type: 'text' },
    { title: 'Amount (KES)', dataIndex: 'Amount', key: 'amount', width: 120, type: 'currency' },
    { title: 'Direction', dataIndex: 'Direction', key: 'direction', width: 80, type: 'text' },
    { title: 'Previous Balance', dataIndex: 'Previous Balance', key: 'prevBalance', width: 120, type: 'currency' },
    { title: 'New Balance', dataIndex: 'New Balance', key: 'newBalance', width: 120, type: 'currency' },
    { title: 'Recorded By', dataIndex: 'Recorded By', key: 'recordedBy', width: 150, type: 'text' }
  ];

  // Get transfer report columns - SIMPLIFIED
  const getTransferReportColumns = () => [
    { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
    { title: 'Date', dataIndex: 'Date', key: 'date', width: 150, type: 'datetime' },
    { title: 'Reference', dataIndex: 'Reference', key: 'reference', width: 100, type: 'text' },
    { title: 'Bank Account', dataIndex: 'Bank Account', key: 'bankAccount', width: 150, type: 'text' },
    { title: 'Amount (KES)', dataIndex: 'Amount', key: 'amount', width: 120, type: 'currency' },
    { title: 'Status', dataIndex: 'Status', key: 'status', width: 100, type: 'text' },
    { title: 'Description', dataIndex: 'Description', key: 'description', width: 200, type: 'text' },
    { title: 'Recorded By', dataIndex: 'Recorded By', key: 'recordedBy', width: 150, type: 'text' }
  ];

  // Calculate wallet report summary
  const calculateWalletSummary = (data) => {
    const totalInflow = data.filter(item => item.amount > 0)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const totalOutflow = data.filter(item => item.amount < 0)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
    return {
      'Report Type': 'Wallet Transactions Report',
      'Total Transactions': data.length,
      'Total Inflow': bankingService.formatCurrency(totalInflow),
      'Total Outflow': bankingService.formatCurrency(totalOutflow),
      'Net Flow': bankingService.formatCurrency(totalInflow - totalOutflow),
      'Generated Date': new Date().toLocaleDateString('en-KE'),
      'Generated Time': new Date().toLocaleTimeString('en-KE')
    };
  };

  // Calculate transfer report summary
  const calculateTransferSummary = (data) => {
    const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
    const completedCount = data.filter(item => item.status === 'COMPLETED').length;
    
    return {
      'Report Type': 'Bank Transfers Report',
      'Total Transfers': data.length,
      'Completed Transfers': completedCount,
      'Pending Transfers': data.filter(item => item.status === 'PENDING').length,
      'Total Amount': bankingService.formatCurrency(totalAmount),
      'Generated Date': new Date().toLocaleDateString('en-KE'),
      'Generated Time': new Date().toLocaleTimeString('en-KE')
    };
  };

  // Handle generate report for current tab
  const handleGenerateReport = () => {
    let reportData = [];
    let reportColumns = [];
    let summaryData = null;
    let title = '';
    let fileName = '';
    
    if (activeTab === 'wallet') {
      if (transactions.length === 0) {
        message.warning('No wallet transactions to export');
        return;
      }
      reportData = prepareWalletReportData(transactions);
      reportColumns = getWalletReportColumns();
      summaryData = calculateWalletSummary(transactions);
      title = `Wallet Transactions Report - ${formattedWallet?.stationDisplay || 'Station'}`;
      fileName = `wallet_transactions_${new Date().toISOString().split('T')[0]}`;
    } else {
      if (transfers.length === 0) {
        message.warning('No bank transfers to export');
        return;
      }
      reportData = prepareTransferReportData(transfers);
      reportColumns = getTransferReportColumns();
      summaryData = calculateTransferSummary(transfers);
      title = `Bank Transfers Report - ${formattedWallet?.stationDisplay || 'Station'}`;
      fileName = `bank_transfers_${new Date().toISOString().split('T')[0]}`;
    }
    
    const config = {
      dataSource: reportData,
      columns: reportColumns,
      summaryData: summaryData,
      title: title,
      fileName: fileName,
      reportType: 'finance',
      companyName: state.currentCompany?.name || "Lynx Energy System",
      stationInfo: state.currentStation ? {
        name: state.currentStation.name,
        code: state.currentStation.code,
        address: state.currentStation.address
      } : null,
      showFooter: true,
      footerText: `Generated from Lynx Energy | User: ${currentUser?.firstName || ''} ${currentUser?.lastName || ''} | ${new Date().toLocaleString('en-KE')}`,
      enableCustomization: true,
      showGrandTotals: false
    };
    
    setReportConfig(config);
    setReportTitle(title);
    setReportModalVisible(true);
  };

  const handleReportComplete = (format) => {
    message.success(`${reportTitle} generated successfully as ${format.toUpperCase()}!`);
    setReportModalVisible(false);
    setReportConfig(null);
  };

  // Wallet Statistics
  const walletStats = useMemo(() => {
    if (!walletData) return null;

    const latestNetFlow = (walletData.todaysInflow || 0) - (walletData.todaysOutflow || 0);
    const balanceStatus = bankingService.getWalletBalanceStatus(walletData);

    return {
      currentBalance: walletData.currentBalance || 0,
      latestInflow: walletData.todaysInflow || 0,
      latestOutflow: walletData.todaysOutflow || 0,
      latestNetFlow,
      balanceStatus
    };
  }, [walletData]);

  // Format wallet data for display
  const formattedWallet = useMemo(() => {
    return walletData ? bankingService.formatStationWallet(walletData) : null;
  }, [walletData]);

  // Format last updated time
  const lastUpdatedDisplay = useMemo(() => {
    if (!lastUpdated) return 'Never';
    return lastUpdated.toLocaleTimeString();
  }, [lastUpdated]);

  // Determine if transaction is negative (outflow)
  const isNegativeTransaction = (type, amount) => {
    // Negative transactions (outflows)
    const negativeTypes = [
      'EXPENSE_PAYMENT',
      'CASH_OUT', 
      'BANK_DEPOSIT', // Bank deposit moves money out of wallet
      'EXPENSE',
      'WITHDRAWAL',
      'TRANSFER_OUT'
    ];
    
    return negativeTypes.includes(type) || amount < 0;
  };

  // Wallet Transactions Columns - COMPACT
  const walletColumns = [
    {
      title: '#',
      key: 'sequence',
      width: 40,
      align: 'center',
      render: (_, __, index) => (
        <span style={{ fontSize: '10px', color: '#666' }}>{index + 1}</span>
      )
    },
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
      render: (date, record) => (
        <span style={{ fontSize: '10px' }}>{record.formattedDate || bankingService.formatDateTime(date)}</span>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type) => {
        const typeConfig = {
          'SHIFT_CASH_IN': { color: 'green', text: 'Cash In' },
          'BANK_DEPOSIT': { color: 'blue', text: 'Deposit' },
          'CASH_IN': { color: 'green', text: 'Cash In' },
          'CASH_OUT': { color: 'red', text: 'Cash Out' },
          'EXPENSE': { color: 'red', text: 'Expense' }
        };
        const config = typeConfig[type] || { color: 'default', text: type };
        return <Tag color={config.color} style={{ fontSize: '9px' }}>{config.text}</Tag>;
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      ellipsis: true,
      render: (description) => <span style={{ fontSize: '10px' }}>{description || 'No description'}</span>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right',
      render: (amount, record) => {
        const isNegative = isNegativeTransaction(record.type, amount);
        const displayAmount = Math.abs(amount);
        
        return (
          <span style={{ 
            color: isNegative ? '#ff4d4f' : '#52c41a',
            fontWeight: '500',
            fontSize: '11px'
          }}>
            {isNegative ? '-' : '+'}{bankingService.formatCurrency(displayAmount)}
          </span>
        );
      }
    },
    {
      title: 'Balance',
      key: 'balance',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <span style={{ fontSize: '10px', color: '#1890ff' }}>
          {record.formattedNewBalance || bankingService.formatCurrency(record.newBalance)}
        </span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Button 
          icon={<EyeOutlined />} 
          size="small"
          type="text"
          onClick={() => handleViewTransaction(record)}
          style={{ padding: '0 2px' }}
        />
      )
    }
  ];

  // Bank Transfers Columns - COMPACT
  const transferColumns = [
    {
      title: '#',
      key: 'sequence',
      width: 40,
      align: 'center',
      render: (_, __, index) => (
        <span style={{ fontSize: '10px', color: '#666' }}>{index + 1}</span>
      )
    },
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
      render: (date, record) => (
        <span style={{ fontSize: '10px' }}>{record.formattedDate || bankingService.formatDateTime(date)}</span>
      )
    },
    {
      title: 'Reference',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      width: 80,
      render: (ref) => ref ? <Tag color="blue" style={{ fontSize: '9px' }}>{ref}</Tag> : '-'
    },
    {
      title: 'Bank Account',
      key: 'bankAccount',
      width: 120,
      render: (_, record) => (
        <span style={{ fontSize: '10px' }}>
          {record.bankAccount ? 
            `${record.bankAccount.bank?.name || ''}`.substring(0, 10) : 
            'Unknown'}
        </span>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right',
      render: (amount, record) => (
        <span style={{ fontWeight: '500', fontSize: '11px', color: '#1890ff' }}>
          {record.formattedAmount || bankingService.formatCurrency(amount)}
        </span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => {
        const statusConfig = {
          COMPLETED: { color: 'green', text: 'Done' },
          PENDING: { color: 'orange', text: 'Pend' },
          FAILED: { color: 'red', text: 'Fail' }
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color} style={{ fontSize: '9px' }}>{config.text}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Button 
          icon={<EyeOutlined />} 
          size="small"
          type="text"
          onClick={() => handleViewTransfer(record)}
          style={{ padding: '0 2px' }}
        />
      )
    }
  ];

  const handleViewTransaction = (transaction) => {
    const isNegative = isNegativeTransaction(transaction.type, transaction.amount);
    
    Modal.info({
      title: 'Transaction Details',
      content: (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Date">
            {bankingService.formatDateTime(transaction.transactionDate)}
          </Descriptions.Item>
          <Descriptions.Item label="Type">
            <Tag color={isNegative ? 'red' : transaction.type === 'BANK_DEPOSIT' ? 'blue' : 'green'}>
              {transaction.type}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Amount">
            <span style={{ 
              color: isNegative ? '#ff4d4f' : '#52c41a',
              fontWeight: 'bold'
            }}>
              {isNegative ? '-' : '+'}{bankingService.formatCurrency(Math.abs(transaction.amount))}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Previous Balance">
            {bankingService.formatCurrency(transaction.previousBalance)}
          </Descriptions.Item>
          <Descriptions.Item label="New Balance">
            {bankingService.formatCurrency(transaction.newBalance)}
          </Descriptions.Item>
          <Descriptions.Item label="Description">
            {transaction.description || 'No description'}
          </Descriptions.Item>
          <Descriptions.Item label="Recorded By">
            <Space size="small">
              <UserOutlined style={{ fontSize: '12px' }} />
              <span style={{ fontSize: '12px' }}>
                {transaction.recordedBy ? 
                  `${transaction.recordedBy.firstName} ${transaction.recordedBy.lastName}` : 
                  'System'
                }
              </span>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      ),
      width: 500,
      okText: 'Close'
    });
  };

  const handleViewTransfer = (transfer) => {
    Modal.info({
      title: 'Transfer Details',
      content: (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Transfer Date">
            {bankingService.formatDateTime(transfer.transactionDate)}
          </Descriptions.Item>
          <Descriptions.Item label="Reference">
            {transfer.referenceNumber || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Bank Account">
            {transfer.bankAccount ? 
              `${transfer.bankAccount.bank?.name || ''} ${transfer.bankAccount.accountNumber || ''}` : 
              'N/A'
            }
          </Descriptions.Item>
          <Descriptions.Item label="Amount">
            {bankingService.formatCurrency(transfer.amount)}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={transfer.status === 'COMPLETED' ? 'green' : 'orange'}>
              {transfer.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Description">
            {transfer.description || 'No description'}
          </Descriptions.Item>
          <Descriptions.Item label="Recorded By">
            <Space size="small">
              <UserOutlined style={{ fontSize: '12px' }} />
              <span style={{ fontSize: '12px' }}>
                {transfer.recordedBy ? 
                  `${transfer.recordedBy.firstName} ${transfer.recordedBy.lastName}` : 
                  'System'
                }
              </span>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      ),
      width: 500,
      okText: 'Close'
    });
  };

  const handleCancelTransfer = async (transferId) => {
    try {
      // await bankingService.cancelBankTransaction(transferId);
      message.success('Transfer cancelled successfully');
      await loadBankTransfers();
    } catch (error) {
      message.error(error.message || 'Failed to cancel transfer');
    }
  };

  // Define tab items for antd v5 (replaces TabPane)
  const tabItems = [
    {
      key: 'wallet',
      label: (
        <span style={{ fontSize: '12px' }}>
          <WalletOutlined style={{ fontSize: '12px' }} />
          Wallet ({transactions.length})
        </span>
      ),
      children: (
        <>
          {transactions.length === 0 && !loading ? (
            <Alert
              message="No wallet transactions"
              description="No transactions have been recorded for this station."
              type="info"
              showIcon
              style={{ marginTop: 12 }}
            />
          ) : (
            <Table
              columns={walletColumns}
              dataSource={transactions}
              loading={loading}
              rowKey="id"
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: transactions.length,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                size: 'small'
              }}
              size="small"
              scroll={{ x: 800 }}
            />
          )}
        </>
      )
    },
    {
      key: 'transfers',
      label: (
        <span style={{ fontSize: '12px' }}>
          <SwapOutlined style={{ fontSize: '12px' }} />
          Transfers ({transfers.length})
        </span>
      ),
      children: (
        <>
          {/* Filters - COMPACT */}
          <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: '8px' }}>
            <Row gutter={[8, 8]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="Search transfers..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  prefix={<SearchOutlined style={{ fontSize: '12px' }} />}
                  size="small"
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Status"
                  value={filters.status}
                  onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  allowClear
                  size="small"
                >
                  <Option value="COMPLETED">Completed</Option>
                  <Option value="PENDING">Pending</Option>
                  <Option value="FAILED">Failed</Option>
                </Select>
              </Col>
              <Col xs={12} sm={6} md={6}>
                <Button
                  icon={<FilterOutlined style={{ fontSize: '12px' }} />}
                  onClick={() => setFilters({ search: '', status: '', dateRange: [] })}
                  size="small"
                >
                  Clear
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Transfers Table */}
          {transfers.length === 0 && !loading ? (
            <Alert
              message="No bank transfers"
              description="No transfers have been recorded for this station."
              type="info"
              showIcon
              style={{ marginTop: 12 }}
            />
          ) : (
            <Table
              columns={transferColumns}
              dataSource={transfers}
              loading={loading}
              rowKey="id"
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: transfers.length,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                size: 'small'
              }}
              size="small"
              scroll={{ x: 800 }}
            />
          )}
        </>
      )
    }
  ];

  return (
    <div style={{ padding: '12px' }}>
      {/* Header */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>
                <WalletOutlined /> Station Banking
                {autoRefresh && (
                  <Badge 
                    dot 
                    style={{ 
                      backgroundColor: '#52c41a',
                      marginLeft: 8
                    }} 
                  />
                )}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                {isStationLevel ? 'Manage wallet and bank transfers' : 'Monitor banking activities'}
                {lastUpdated && (
                  <span style={{ marginLeft: 8, fontSize: '11px', color: '#999' }}>
                    Updated: {lastUpdatedDisplay}
                  </span>
                )}
              </p>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[6, 6]} justify="end">
              <Col>
                <Space size="small">
                  <Tooltip title="Auto Refresh">
                    <Switch
                      checked={autoRefresh}
                      onChange={handleAutoRefreshToggle}
                      checkedChildren="Auto"
                      unCheckedChildren="Manual"
                      size="small"
                    />
                  </Tooltip>
                  <Tooltip title={`Refresh (${refreshCount})`}>
                    <Button
                      icon={<SyncOutlined spin={loading} />}
                      onClick={handleManualRefresh}
                      loading={loading}
                      size="small"
                    >
                      Refresh
                    </Button>
                  </Tooltip>
                </Space>
              </Col>
              <Col>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={handleGenerateReport}
                  disabled={activeTab === 'wallet' ? transactions.length === 0 : transfers.length === 0}
                  size="small"
                >
                  Report
                </Button>
              </Col>
              {isStationLevel && (
                <Col>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setDepositModalVisible(true)}
                    disabled={!walletData || walletData.currentBalance <= 0}
                    size="small"
                  >
                    Deposit
                  </Button>
                </Col>
              )}
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Auto-refresh Status */}
      {autoRefresh && (
        <Alert
          message="Auto-refresh Enabled"
          description="Data updates every 15 seconds"
          type="info"
          showIcon
          icon={<SyncOutlined />}
          style={{ marginBottom: 12, fontSize: '12px', padding: '8px 12px' }}
          action={
            <Button size="small" onClick={() => setAutoRefresh(false)}>
              Disable
            </Button>
          }
        />
      )}

      {/* Wallet Statistics - COMPACT */}
      {formattedWallet && (
        <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" bodyStyle={{ padding: '8px' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Balance</span>}
                value={walletStats.currentBalance}
                formatter={value => bankingService.formatCurrency(value)}
                valueStyle={{ 
                  color: walletStats.balanceStatus.status === 'low' ? '#ff4d4f' : 
                         walletStats.balanceStatus.status === 'high' ? '#faad14' : '#52c41a',
                  fontSize: '14px'
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" bodyStyle={{ padding: '8px' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Inflow</span>}
                value={walletStats.latestInflow}
                formatter={value => bankingService.formatCurrency(value)}
                valueStyle={{ color: '#52c41a', fontSize: '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" bodyStyle={{ padding: '8px' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Outflow</span>}
                value={walletStats.latestOutflow}
                formatter={value => bankingService.formatCurrency(value)}
                valueStyle={{ color: '#ff4d4f', fontSize: '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" bodyStyle={{ padding: '8px' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Net Flow</span>}
                value={walletStats.latestNetFlow}
                formatter={value => bankingService.formatCurrency(value)}
                valueStyle={{ 
                  color: walletStats.latestNetFlow >= 0 ? '#52c41a' : '#ff4d4f',
                  fontSize: '14px'
                }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Station Information - COMPACT */}
      {formattedWallet && (
        <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: '8px 12px' }}>
          <Row gutter={[8, 8]}>
            <Col span={8}>
              <span style={{ fontSize: '11px', color: '#666' }}>Station:</span>
              <div style={{ fontSize: '12px', fontWeight: '500' }}>{formattedWallet.stationDisplay}</div>
            </Col>
            <Col span={8}>
              <span style={{ fontSize: '11px', color: '#666' }}>Opening Balance:</span>
              <div style={{ fontSize: '12px' }}>{formattedWallet.openingBalanceDisplay}</div>
            </Col>
            <Col span={8}>
              <span style={{ fontSize: '11px', color: '#666' }}>Last Updated:</span>
              <div style={{ fontSize: '12px' }}>{formattedWallet.lastUpdatedDisplay}</div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Tabs Section - Using items prop instead of TabPane */}
      <Card size="small" bodyStyle={{ padding: '12px' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="small"
          items={tabItems}
          tabBarExtraContent={
            <span style={{ fontSize: '11px', color: '#666' }}>
              {activeTab === 'wallet' ? transactions.length : transfers.length} records
            </span>
          }
        />
      </Card>

      {/* Bank Deposit Modal */}
      <Modal
        title={
          <Space size="small">
            <BankOutlined />
            <span>Create Bank Deposit</span>
          </Space>
        }
        open={depositModalVisible}
        onCancel={() => {
          setDepositModalVisible(false);
          depositForm.resetFields();
          setFormErrors([]);
        }}
        onOk={() => depositForm.submit()}
        okText="Create Deposit"
        cancelText="Cancel"
        width={500}
        confirmLoading={submitting}
      >
        {formErrors.length > 0 && (
          <Alert
            message="Validation Error"
            description={
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px' }}>
                {formErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
          />
        )}

        {walletData && (
          <Alert
            message={`Available Balance: ${bankingService.formatCurrency(walletData.currentBalance)}`}
            type="info"
            showIcon
            icon={<ExclamationCircleOutlined />}
            style={{ marginBottom: 12, fontSize: '12px', padding: '8px 12px' }}
          />
        )}

        <Form
          form={depositForm}
          layout="vertical"
          onFinish={handleDepositSubmit}
          initialValues={{
            transactionMode: 'CASH'
          }}
          size="small"
        >
          <Form.Item
            name="amount"
            label="Deposit Amount"
            rules={[
              { 
                required: true, 
                message: 'Please enter deposit amount' 
              },
              { 
                validator: (_, value) => {
                  const errors = validateDepositAmount(value);
                  if (errors.length > 0) {
                    return Promise.reject(new Error(errors[0]));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={walletData?.currentBalance || 1000000}
              placeholder="Enter amount"
              formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/KES\s?|(,*)/g, '')}
              onChange={handleAmountChange}
              size="small"
            />
          </Form.Item>

          <Form.Item
            name="bankAccountId"
            label="Bank Account"
            rules={[{ required: true, message: 'Please select bank account' }]}
          >
            <Select 
              placeholder="Select bank account" 
              showSearch
              optionFilterProp="children"
              size="small"
            >
              {accounts.map(account => (
                <Option key={account.id} value={account.id}>
                  <Space size="small">
                    <BankOutlined style={{ fontSize: '12px' }} />
                    <span style={{ fontSize: '12px' }}>
                      {account.bank?.name} - {account.accountNumber}
                    </span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="transactionMode"
            label="Transaction Mode"
            rules={[{ required: true, message: 'Please select mode' }]}
          >
            <Select placeholder="Select mode" size="small">
              <Option value="CASH">Cash</Option>
              <Option value="CHEQUE">Cheque</Option>
              <Option value="MPESA">M-Pesa</Option>
              <Option value="EFT">EFT</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="referenceNumber"
            label="Reference (Optional)"
          >
            <Input placeholder="e.g., CHQ-001" size="small" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea placeholder="Enter description" rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Report Generator Modal */}
      <Modal
        title={
          <Space size="small">
            <FileTextOutlined />
            <span>{reportTitle}</span>
            <Tag color="blue">{reportConfig?.dataSource?.length || 0} records</Tag>
          </Space>
        }
        open={reportModalVisible}
        onCancel={() => {
          setReportModalVisible(false);
          setReportConfig(null);
        }}
        width="90%"
        style={{ top: 20 }}
        footer={null}
        destroyOnClose
      >
        {reportConfig && (
          <div style={{ padding: '20px 0' }}>
            <AdvancedReportGenerator
              key={`banking-report-${Date.now()}`}
              {...reportConfig}
              onReportGenerate={handleReportComplete}
              onSettingsSave={(settings) => {
                console.log('Settings saved:', settings);
                message.success('Report settings saved!');
              }}
            />
            
            <Divider />
            
            <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button 
                onClick={() => {
                  setReportModalVisible(false);
                  setReportConfig(null);
                }}
                size="small"
              >
                Close
              </Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AccountsManagement;