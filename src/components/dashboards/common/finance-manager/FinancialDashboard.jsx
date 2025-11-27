import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
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
  Progress,
  Empty,
  Spin,
  Divider,
  List,
  Avatar,
  Typography,
  Grid
} from 'antd';
import {
  BankOutlined,
  WalletOutlined,
  ShopOutlined,
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
  FilterOutlined,
  DownloadOutlined,
  SettingOutlined,
  DollarOutlined,
  CreditCardOutlined,
  TeamOutlined,
  BarChartOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { financeService } from '../../../../services/financeService/financeService';
import { useApp } from '../../../../context/AppContext';
import './FinancialDashboard.css';

const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const FinancialDashboard = () => {
  const { state } = useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  const [loading, setLoading] = useState({
    overview: false,
    wallets: false,
    banks: false,
    suppliers: false,
    transactions: false
  });
  const [data, setData] = useState({
    overview: null,
    stationWallets: [],
    bankAccounts: [],
    supplierAccounts: [],
    walletTransactions: [],
    bankTransactions: [],
    supplierTransactions: []
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState(null);
  const [selectedSupplierAccount, setSelectedSupplierAccount] = useState(null);
  const [modalVisible, setModalVisible] = useState({
    wallet: false,
    bank: false,
    supplier: false,
    transactions: false
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dateRange: []
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const currentUser = state.currentUser;
  const companyId = state?.currentCompany?.id;
  const isCompanyLevel = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER'].includes(currentUser?.role);

  // Debug logging function
  const debugLog = (message, data = null, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const styles = {
      info: 'color: blue; font-weight: bold;',
      success: 'color: green; font-weight: bold;',
      error: 'color: red; font-weight: bold;',
      warning: 'color: orange; font-weight: bold;',
      data: 'color: purple; font-weight: bold;'
    };
    
    console.log(`%c[Finance Dashboard ${timestamp}] ${message}`, styles[type]);
    if (data) {
      console.log('📊 Data:', data);
    }
  };

  // Load all financial data
  const loadFinancialData = useCallback(async (showMessage = false) => {
    if (!companyId) {
      debugLog('No company selected - cannot load data', null, 'error');
      message.error('No company selected');
      return;
    }

    debugLog(`Starting to load financial data for company: ${companyId}`, null, 'info');

    try {
      setLoading(prev => ({ ...prev, overview: true }));
      
      debugLog('Making parallel API calls for all financial data...', null, 'info');
      
      const [overviewRes, walletsRes, banksRes, suppliersRes] = await Promise.all([
        financeService.getCompanyFinancialOverview(companyId),
        financeService.getCompanyStationWallets(companyId),
        financeService.getCompanyBankAccounts(companyId),
        financeService.getCompanySupplierAccounts(companyId)
      ]);

      debugLog('✅ All API calls completed successfully', null, 'success');
      
      // Log each response in detail
      debugLog('Financial Overview Response:', overviewRes, 'data');
      debugLog('Station Wallets Response:', walletsRes, 'data');
      debugLog('Bank Accounts Response:', banksRes, 'data');
      debugLog('Supplier Accounts Response:', suppliersRes, 'data');

      const newData = {
        overview: overviewRes.data,
        stationWallets: walletsRes.data || [],
        bankAccounts: banksRes.data || [],
        supplierAccounts: suppliersRes.data || [],
        walletTransactions: data.walletTransactions,
        bankTransactions: data.bankTransactions,
        supplierTransactions: data.supplierTransactions
      };

      debugLog('Setting new data state with:', {
        overviewRecords: newData.overview ? 'Yes' : 'No',
        stationWalletsCount: newData.stationWallets.length,
        bankAccountsCount: newData.bankAccounts.length,
        supplierAccountsCount: newData.supplierAccounts.length
      }, 'data');

      setData(newData);
      setLastUpdated(new Date());
      
      if (showMessage) {
        message.success('Financial data updated');
      }

      debugLog('✅ Financial data loaded and state updated successfully', null, 'success');
      
    } catch (error) {
      debugLog('❌ Error loading financial data:', error, 'error');
      console.error('Full error details:', error);
      message.error('Failed to load financial data');
    } finally {
      setLoading(prev => ({ ...prev, overview: false }));
      debugLog('Loading state reset', null, 'info');
    }
  }, [companyId]);

  // Load transactions for drill-down
  const loadWalletTransactions = async (walletId) => {
    debugLog(`Loading wallet transactions for wallet: ${walletId}`, null, 'info');
    
    try {
      setLoading(prev => ({ ...prev, transactions: true }));
      const response = await financeService.getWalletTransactions(walletId);
      
      debugLog('✅ Wallet transactions response:', response, 'data');
      debugLog(`Found ${response.data?.length || 0} transactions`, null, 'success');
      
      setData(prev => ({ ...prev, walletTransactions: response.data || [] }));
    } catch (error) {
      debugLog('❌ Error loading wallet transactions:', error, 'error');
      message.error('Failed to load wallet transactions');
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  };

  const loadBankTransactions = async (accountId) => {
    debugLog(`Loading bank transactions for account: ${accountId}`, null, 'info');
    
    try {
      setLoading(prev => ({ ...prev, transactions: true }));
      const response = await financeService.getBankAccountTransactions(accountId);
      
      debugLog('✅ Bank transactions response:', response, 'data');
      debugLog(`Found ${response.data?.length || 0} transactions`, null, 'success');
      
      setData(prev => ({ ...prev, bankTransactions: response.data || [] }));
    } catch (error) {
      debugLog('❌ Error loading bank transactions:', error, 'error');
      message.error('Failed to load bank transactions');
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  };

  const loadSupplierTransactions = async (accountId) => {
    debugLog(`Loading supplier transactions for account: ${accountId}`, null, 'info');
    
    try {
      setLoading(prev => ({ ...prev, transactions: true }));
      const response = await financeService.getSupplierAccountTransactions(accountId);
      
      debugLog('✅ Supplier transactions response:', response, 'data');
      debugLog(`Found ${response.data?.length || 0} transactions`, null, 'success');
      
      setData(prev => ({ ...prev, supplierTransactions: response.data || [] }));
    } catch (error) {
      debugLog('❌ Error loading supplier transactions:', error, 'error');
      message.error('Failed to load supplier transactions');
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  };

  // Auto-refresh
  useEffect(() => {
    debugLog('Component mounted - checking company ID', { companyId }, 'info');
    
    if (companyId) {
      debugLog('Company ID found, loading financial data...', null, 'info');
      loadFinancialData();
    } else {
      debugLog('No company ID available', null, 'warning');
    }
  }, [companyId, loadFinancialData]);

  useEffect(() => {
    debugLog('Auto-refresh effect running', { autoRefresh, companyId }, 'info');
    
    let interval;
    if (autoRefresh && companyId) {
      debugLog('Setting up auto-refresh interval (30 seconds)', null, 'info');
      interval = setInterval(() => {
        debugLog('Auto-refresh triggered', null, 'info');
        loadFinancialData();
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (interval) {
        debugLog('Cleaning up auto-refresh interval', null, 'info');
        clearInterval(interval);
      }
    };
  }, [autoRefresh, companyId, loadFinancialData]);

  // Log when active tab changes
  useEffect(() => {
    debugLog(`Active tab changed to: ${activeTab}`, null, 'info');
  }, [activeTab]);

  // Log when modal states change
  useEffect(() => {
    debugLog('Modal visibility changed:', modalVisible, 'info');
  }, [modalVisible]);

  // Handlers
  const handleWalletClick = async (wallet) => {
    debugLog('Wallet clicked:', wallet, 'info');
    setSelectedWallet(wallet);
    setModalVisible(prev => ({ ...prev, wallet: true }));
    await loadWalletTransactions(wallet.id);
  };

  const handleBankAccountClick = async (account) => {
    debugLog('Bank account clicked:', account, 'info');
    setSelectedBankAccount(account);
    setModalVisible(prev => ({ ...prev, bank: true }));
    await loadBankTransactions(account.id);
  };

  const handleSupplierAccountClick = async (supplier) => {
    debugLog('Supplier account clicked:', supplier, 'info');
    setSelectedSupplierAccount(supplier);
    setModalVisible(prev => ({ ...prev, supplier: true }));
    await loadSupplierTransactions(supplier.id);
  };

  const handleRefresh = () => {
    debugLog('Manual refresh triggered', null, 'info');
    loadFinancialData(true);
  };

  const handleAutoRefreshToggle = (checked) => {
    debugLog(`Auto-refresh toggled: ${checked}`, null, 'info');
    setAutoRefresh(checked);
    message.info(checked ? 'Auto-refresh enabled' : 'Auto-refresh disabled');
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Status helpers
  const getBalanceStatus = (balance, min, max) => {
    if (balance < (min || 0)) return { status: 'low', color: '#ff4d4f', text: 'Low' };
    if (balance > (max || Infinity)) return { status: 'high', color: '#faad14', text: 'High' };
    return { status: 'normal', color: '#52c41a', text: 'Normal' };
  };

  const getCreditUtilization = (balance, limit) => {
    if (!limit) return null;
    const utilization = (balance / limit) * 100;
    if (utilization >= 90) return { color: '#ff4d4f', status: 'Critical' };
    if (utilization >= 75) return { color: '#faad14', status: 'High' };
    return { color: '#52c41a', status: 'Good' };
  };

  // Memoized computed values with debug logging
  const financialSummary = useMemo(() => {
    debugLog('Computing financial summary from overview data', data.overview, 'info');
    
    if (!data.overview) {
      debugLog('No overview data available for summary computation', null, 'warning');
      return null;
    }

    const cashSummary = data.overview.cashSummary || {};
    const accountsPayable = data.overview.accountsPayable || {};

    const summary = {
      totalCash: cashSummary.totalCashPosition || 0,
      stationWalletsTotal: cashSummary.totalStationWallets || 0,
      bankAccountsTotal: cashSummary.totalBankAccounts || 0,
      supplierDebt: accountsPayable.totalSupplierDebt || 0,
      overdueAmount: accountsPayable.overdueAmount || 0,
      stationCount: cashSummary.stationCount || 0,
      supplierCount: accountsPayable.supplierCount || 0
    };

    debugLog('Computed financial summary:', summary, 'data');
    return summary;
  }, [data.overview]);

  const recentActivity = useMemo(() => {
    const activity = data.overview?.recentActivity?.slice(0, 5) || [];
    debugLog(`Computed recent activity: ${activity.length} items`, activity, 'info');
    return activity;
  }, [data.overview]);

  // Log when data changes significantly
  useEffect(() => {
    debugLog('Data state updated:', {
      overview: data.overview ? 'Yes' : 'No',
      stationWallets: data.stationWallets.length,
      bankAccounts: data.bankAccounts.length,
      supplierAccounts: data.supplierAccounts.length,
      walletTransactions: data.walletTransactions.length,
      bankTransactions: data.bankTransactions.length,
      supplierTransactions: data.supplierTransactions.length
    }, 'data');
  }, [data]);

  // Render components for each section
  const renderFinancialOverview = () => {
    debugLog('Rendering financial overview tab', null, 'info');
    
    return (
      <div className="financial-overview">
        {/* Summary Cards */}
        <Row gutter={[16, 16]} className="summary-cards">
          <Col xs={24} sm={12} lg={6}>
            <Card className="summary-card" size="small">
              <Statistic
                title="Total Cash Position"
                value={financialSummary?.totalCash}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#52c41a' }}
                prefix={<DollarOutlined />}
              />
              <div className="card-subtitle">
                {formatCurrency(financialSummary?.stationWalletsTotal)} in wallets
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="summary-card" size="small">
              <Statistic
                title="Accounts Payable"
                value={financialSummary?.supplierDebt}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#faad14' }}
                prefix={<CreditCardOutlined />}
              />
              <div className="card-subtitle">
                {formatCurrency(financialSummary?.overdueAmount)} overdue
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="summary-card" size="small">
              <Statistic
                title="Active Stations"
                value={financialSummary?.stationCount}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ShopOutlined />}
              />
              <div className="card-subtitle">
                {data.stationWallets.length} with wallets
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="summary-card" size="small">
              <Statistic
                title="Supplier Accounts"
                value={financialSummary?.supplierCount}
                valueStyle={{ color: '#722ed1' }}
                prefix={<TeamOutlined />}
              />
              <div className="card-subtitle">
                {data.supplierAccounts.filter(s => s.currentBalance > 0).length} with balances
              </div>
            </Card>
          </Col>
        </Row>

        {/* Quick Stats Grid */}
        <Row gutter={[16, 16]} className="quick-stats">
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <WalletOutlined />
                  Station Wallets Overview
                </Space>
              }
              className="stats-card"
            >
              {isMobile ? (
                <List
                  dataSource={data.stationWallets.slice(0, 5)}
                  renderItem={wallet => (
                    <List.Item 
                      className="clickable-item"
                      onClick={() => handleWalletClick(wallet)}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<ShopOutlined />} />}
                        title={wallet.station?.name}
                        description={
                          <Space direction="vertical" size={0}>
                            <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                              {formatCurrency(wallet.currentBalance)}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Today: +{formatCurrency(wallet.todaysInflow)} / -{formatCurrency(wallet.todaysOutflow)}
                            </Text>
                          </Space>
                        }
                      />
                      <Tag color={getBalanceStatus(wallet.currentBalance, wallet.minBalance, wallet.maxBalance).color}>
                        {getBalanceStatus(wallet.currentBalance, wallet.minBalance, wallet.maxBalance).text}
                      </Tag>
                    </List.Item>
                  )}
                  locale={{ emptyText: 'No station wallets found' }}
                />
              ) : (
                <Table
                  dataSource={data.stationWallets}
                  pagination={false}
                  size="small"
                  onRow={(record) => ({
                    onClick: () => handleWalletClick(record),
                    className: 'clickable-row'
                  })}
                  columns={[
                    {
                      title: 'Station',
                      dataIndex: ['station', 'name'],
                      key: 'stationName'
                    },
                    {
                      title: 'Balance',
                      dataIndex: 'currentBalance',
                      key: 'balance',
                      render: (value) => (
                        <Text strong style={{ color: '#1890ff' }}>
                          {formatCurrency(value)}
                        </Text>
                      ),
                      align: 'right'
                    },
                    {
                      title: 'Today In/Out',
                      key: 'dailyFlow',
                      render: (_, record) => (
                        <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
                          <Text type="success" style={{ fontSize: '12px' }}>
                            +{formatCurrency(record.todaysInflow)}
                          </Text>
                          <Text type="danger" style={{ fontSize: '12px' }}>
                            -{formatCurrency(record.todaysOutflow)}
                          </Text>
                        </Space>
                      ),
                      align: 'right'
                    },
                    {
                      title: 'Status',
                      key: 'status',
                      render: (_, record) => {
                        const status = getBalanceStatus(record.currentBalance, record.minBalance, record.maxBalance);
                        return <Tag color={status.color}>{status.text}</Tag>;
                      }
                    }
                  ]}
                />
              )}
              {data.stationWallets.length > 5 && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Button type="link" onClick={() => setActiveTab('wallets')}>
                    View All {data.stationWallets.length} Wallets
                  </Button>
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <BankOutlined />
                  Bank Accounts Summary
                </Space>
              }
              className="stats-card"
            >
              {isMobile ? (
                <List
                  dataSource={data.bankAccounts.slice(0, 5)}
                  renderItem={account => (
                    <List.Item 
                      className="clickable-item"
                      onClick={() => handleBankAccountClick(account)}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<BankOutlined />} />}
                        title={
                          <Space direction="vertical" size={0}>
                            <Text>{account.bank?.name}</Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {account.accountNumber}
                            </Text>
                          </Space>
                        }
                        description={
                          <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                            {formatCurrency(account.currentBalance)}
                          </Text>
                        }
                      />
                      {account.isPrimary && <Tag color="blue">Primary</Tag>}
                      {!account.isActive && <Tag color="red">Inactive</Tag>}
                    </List.Item>
                  )}
                  locale={{ emptyText: 'No bank accounts found' }}
                />
              ) : (
                <Table
                  dataSource={data.bankAccounts}
                  pagination={false}
                  size="small"
                  onRow={(record) => ({
                    onClick: () => handleBankAccountClick(record),
                    className: 'clickable-row'
                  })}
                  columns={[
                    {
                      title: 'Bank',
                      dataIndex: ['bank', 'name'],
                      key: 'bankName'
                    },
                    {
                      title: 'Account Number',
                      dataIndex: 'accountNumber',
                      key: 'accountNumber'
                    },
                    {
                      title: 'Balance',
                      dataIndex: 'currentBalance',
                      key: 'balance',
                      render: (value) => (
                        <Text strong style={{ color: '#52c41a' }}>
                          {formatCurrency(value)}
                        </Text>
                      ),
                      align: 'right'
                    },
                    {
                      title: 'Status',
                      key: 'status',
                      render: (_, record) => (
                        <Space>
                          {record.isPrimary && <Tag color="blue">Primary</Tag>}
                          {record.isActive ? (
                            <Tag color="green">Active</Tag>
                          ) : (
                            <Tag color="red">Inactive</Tag>
                          )}
                        </Space>
                      )
                    }
                  ]}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* Supplier Accounts & Recent Activity */}
        <Row gutter={[16, 16]} className="bottom-section">
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <TeamOutlined />
                  Supplier Accounts
                </Space>
              }
              className="stats-card"
            >
              {data.supplierAccounts.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No supplier accounts" />
              ) : (
                <List
                  dataSource={data.supplierAccounts.slice(0, 5)}
                  renderItem={supplier => (
                    <List.Item 
                      className="clickable-item"
                      onClick={() => handleSupplierAccountClick(supplier)}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<TeamOutlined />} />}
                        title={supplier.supplier?.name}
                        description={
                          <Space direction="vertical" size={0}>
                            <Text strong style={{ color: '#faad14' }}>
                              {formatCurrency(supplier.currentBalance)}
                            </Text>
                            {supplier.creditLimit && (
                              <Progress 
                                percent={Math.min((supplier.currentBalance / supplier.creditLimit) * 100, 100)}
                                size="small"
                                strokeColor={getCreditUtilization(supplier.currentBalance, supplier.creditLimit)?.color}
                                showInfo={false}
                              />
                            )}
                          </Space>
                        }
                      />
                      <Tag color={
                        supplier.currentBalance > 0 ? 'orange' : 'green'
                      }>
                        {supplier.currentBalance > 0 ? 'Owes' : 'Paid'}
                      </Tag>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <HistoryOutlined />
                  Recent Activity
                </Space>
              }
              className="stats-card"
            >
              {recentActivity.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recent activity" />
              ) : (
                <List
                  dataSource={recentActivity}
                  renderItem={(activity, index) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            size="small"
                            style={{ 
                              backgroundColor: activity.amount > 0 ? '#52c41a' : '#ff4d4f' 
                            }}
                            icon={activity.amount > 0 ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                          />
                        }
                        title={
                          <Text ellipsis={{ tooltip: activity.description }}>
                            {activity.description}
                          </Text>
                        }
                        description={
                          <Space direction="vertical" size={0}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {formatDateTime(activity.date)}
                            </Text>
                            <Text strong style={{ 
                              color: activity.amount > 0 ? '#52c41a' : '#ff4d4f',
                              fontSize: '14px'
                            }}>
                              {activity.amount > 0 ? '+' : ''}{formatCurrency(activity.amount)}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  const renderStationWalletsTab = () => {
    debugLog('Rendering station wallets tab', { count: data.stationWallets.length }, 'info');
    
    return (
      <div className="tab-content">
        <Card>
          <Table
            dataSource={data.stationWallets}
            loading={loading.wallets}
            rowKey="id"
            onRow={(record) => ({
              onClick: () => handleWalletClick(record),
              className: 'clickable-row'
            })}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: data.stationWallets.length,
              showSizeChanger: true,
              showQuickJumper: !isMobile
            }}
            columns={[
              {
                title: 'Station',
                dataIndex: ['station', 'name'],
                key: 'stationName',
                sorter: (a, b) => a.station?.name?.localeCompare(b.station?.name)
              },
              {
                title: 'Current Balance',
                dataIndex: 'currentBalance',
                key: 'currentBalance',
                render: (value, record) => (
                  <Space direction="vertical" size={2}>
                    <Text strong style={{ 
                      fontSize: isMobile ? '14px' : '16px',
                      color: '#1890ff'
                    }}>
                      {formatCurrency(value)}
                    </Text>
                    {record.minBalance && record.maxBalance && (
                      <Progress 
                        percent={Math.min((value / record.maxBalance) * 100, 100)}
                        size="small"
                        strokeColor={getBalanceStatus(value, record.minBalance, record.maxBalance).color}
                        showInfo={false}
                      />
                    )}
                  </Space>
                ),
                align: 'right',
                sorter: (a, b) => a.currentBalance - b.currentBalance
              },
              {
                title: 'Today Inflow',
                dataIndex: 'todaysInflow',
                key: 'todaysInflow',
                render: (value) => (
                  <Text type="success" strong>
                    +{formatCurrency(value)}
                  </Text>
                ),
                align: 'right'
              },
              {
                title: 'Today Outflow',
                dataIndex: 'todaysOutflow',
                key: 'todaysOutflow',
                render: (value) => (
                  <Text type="danger" strong>
                    -{formatCurrency(value)}
                  </Text>
                ),
                align: 'right'
              },
              {
                title: 'Status',
                key: 'status',
                render: (_, record) => {
                  const status = getBalanceStatus(record.currentBalance, record.minBalance, record.maxBalance);
                  return (
                    <Tag color={status.color}>
                      {status.text}
                    </Tag>
                  );
                }
              },
              {
                title: 'Last Updated',
                dataIndex: 'lastUpdated',
                key: 'lastUpdated',
                render: (date) => formatDateTime(date),
                sorter: (a, b) => new Date(a.lastUpdated) - new Date(b.lastUpdated),
                responsive: ['md']
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => (
                  <Button 
                    type="link" 
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      debugLog('View wallet action clicked:', record, 'info');
                      handleWalletClick(record);
                    }}
                  >
                    {isMobile ? '' : 'View'}
                  </Button>
                )
              }
            ]}
          />
        </Card>
      </div>
    );
  };

  const renderBankAccountsTab = () => {
    debugLog('Rendering bank accounts tab', { count: data.bankAccounts.length }, 'info');
    
    return (
      <div className="tab-content">
        <Card>
          <Table
            dataSource={data.bankAccounts}
            loading={loading.banks}
            rowKey="id"
            onRow={(record) => ({
              onClick: () => handleBankAccountClick(record),
              className: 'clickable-row'
            })}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: data.bankAccounts.length,
              showSizeChanger: true,
              showQuickJumper: !isMobile
            }}
            columns={[
              {
                title: 'Bank',
                dataIndex: ['bank', 'name'],
                key: 'bankName',
                sorter: (a, b) => a.bank?.name?.localeCompare(b.bank?.name)
              },
              {
                title: 'Account Details',
                key: 'accountDetails',
                render: (_, record) => (
                  <Space direction="vertical" size={2}>
                    <Text strong>{record.accountNumber}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {record.accountName}
                    </Text>
                    {record.branch && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {record.branch}
                      </Text>
                    )}
                  </Space>
                ),
                responsive: ['sm']
              },
              {
                title: 'Balance',
                dataIndex: 'currentBalance',
                key: 'balance',
                render: (value) => (
                  <Text strong style={{ color: '#52c41a', fontSize: isMobile ? '14px' : '16px' }}>
                    {formatCurrency(value)}
                  </Text>
                ),
                align: 'right',
                sorter: (a, b) => a.currentBalance - b.currentBalance
              },
              {
                title: 'Status',
                key: 'status',
                render: (_, record) => (
                  <Space direction={isMobile ? "vertical" : "horizontal"} size={4}>
                    {record.isPrimary && (
                      <Tag color="blue" style={{ margin: 0 }}>Primary</Tag>
                    )}
                    <Tag color={record.isActive ? 'green' : 'red'}>
                      {record.isActive ? 'Active' : 'Inactive'}
                    </Tag>
                  </Space>
                )
              },
              {
                title: 'Currency',
                dataIndex: 'currency',
                key: 'currency',
                responsive: ['lg']
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => (
                  <Button 
                    type="link" 
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      debugLog('View bank account action clicked:', record, 'info');
                      handleBankAccountClick(record);
                    }}
                  >
                    {isMobile ? '' : 'View'}
                  </Button>
                )
              }
            ]}
          />
        </Card>
      </div>
    );
  };

  const renderSupplierAccountsTab = () => {
    debugLog('Rendering supplier accounts tab', { count: data.supplierAccounts.length }, 'info');
    
    return (
      <div className="tab-content">
        <Card>
          <Table
            dataSource={data.supplierAccounts}
            loading={loading.suppliers}
            rowKey="id"
            onRow={(record) => ({
              onClick: () => handleSupplierAccountClick(record),
              className: 'clickable-row'
            })}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: data.supplierAccounts.length,
              showSizeChanger: true,
              showQuickJumper: !isMobile
            }}
            columns={[
              {
                title: 'Supplier',
                dataIndex: ['supplier', 'name'],
                key: 'supplierName',
                sorter: (a, b) => a.supplier?.name?.localeCompare(b.supplier?.name)
              },
              {
                title: 'Contact',
                key: 'contact',
                render: (_, record) => (
                  <Space direction="vertical" size={2}>
                    <Text>{record.supplier?.contactPerson || 'N/A'}</Text>
                    {record.supplier?.phone && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <PhoneOutlined /> {record.supplier.phone}
                      </Text>
                    )}
                  </Space>
                ),
                responsive: ['md']
              },
              {
                title: 'Balance',
                dataIndex: 'currentBalance',
                key: 'balance',
                render: (value, record) => (
                  <Space direction="vertical" size={2}>
                    <Text strong style={{ 
                      color: value > 0 ? '#faad14' : '#52c41a',
                      fontSize: isMobile ? '14px' : '16px'
                    }}>
                      {formatCurrency(value)}
                    </Text>
                    {record.creditLimit && (
                      <Progress 
                        percent={Math.min((value / record.creditLimit) * 100, 100)}
                        size="small"
                        strokeColor={getCreditUtilization(value, record.creditLimit)?.color}
                        showInfo={false}
                      />
                    )}
                  </Space>
                ),
                align: 'right',
                sorter: (a, b) => a.currentBalance - b.currentBalance
              },
              {
                title: 'Credit Limit',
                dataIndex: 'creditLimit',
                key: 'creditLimit',
                render: (value) => value ? formatCurrency(value) : 'N/A',
                align: 'right',
                responsive: ['lg']
              },
              {
                title: 'Terms',
                dataIndex: 'paymentTerms',
                key: 'paymentTerms',
                render: (terms) => terms ? `Net ${terms} days` : 'N/A',
                responsive: ['md']
              },
              {
                title: 'Status',
                key: 'status',
                render: (_, record) => (
                  <Tag color={
                    record.isCreditHold ? 'red' : 
                    record.status === 'ACTIVE' ? 'green' : 'default'
                  }>
                    {record.isCreditHold ? 'Credit Hold' : record.status}
                  </Tag>
                )
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => (
                  <Button 
                    type="link" 
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      debugLog('View supplier account action clicked:', record, 'info');
                      handleSupplierAccountClick(record);
                    }}
                  >
                    {isMobile ? '' : 'View'}
                  </Button>
                )
              }
            ]}
          />
        </Card>
      </div>
    );
  };

  // Modal components
  const renderWalletModal = () => {
    debugLog('Rendering wallet modal', { visible: modalVisible.wallet, selectedWallet }, 'info');
    
    return (
      <Modal
        title={
          <Space>
            <WalletOutlined />
            {selectedWallet?.station?.name} - Wallet Details
          </Space>
        }
        open={modalVisible.wallet}
        onCancel={() => {
          debugLog('Closing wallet modal', null, 'info');
          setModalVisible(prev => ({ ...prev, wallet: false }));
        }}
        footer={[
          <Button key="close" onClick={() => {
            debugLog('Close button clicked in wallet modal', null, 'info');
            setModalVisible(prev => ({ ...prev, wallet: false }));
          }}>
            Close
          </Button>
        ]}
        width={isMobile ? '95%' : 800}
      >
        {selectedWallet && (
          <div className="modal-content">
            <Descriptions column={isMobile ? 1 : 2} bordered size="small">
              <Descriptions.Item label="Station">
                {selectedWallet.station?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Current Balance">
                <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                  {formatCurrency(selectedWallet.currentBalance)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Today's Inflow">
                <Text type="success">
                  +{formatCurrency(selectedWallet.todaysInflow)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Today's Outflow">
                <Text type="danger">
                  -{formatCurrency(selectedWallet.todaysOutflow)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Opening Balance">
                {formatCurrency(selectedWallet.openingBalance)}
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {formatDateTime(selectedWallet.lastUpdated)}
              </Descriptions.Item>
              {selectedWallet.minBalance && (
                <Descriptions.Item label="Minimum Balance">
                  {formatCurrency(selectedWallet.minBalance)}
                </Descriptions.Item>
              )}
              {selectedWallet.maxBalance && (
                <Descriptions.Item label="Maximum Balance">
                  {formatCurrency(selectedWallet.maxBalance)}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider>Recent Transactions</Divider>
            
            {loading.transactions ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin />
              </div>
            ) : data.walletTransactions.length === 0 ? (
              <Empty description="No transactions found" />
            ) : (
              <List
                dataSource={data.walletTransactions.slice(0, 10)}
                renderItem={transaction => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size="small"
                          style={{ 
                            backgroundColor: transaction.amount > 0 ? '#52c41a' : '#ff4d4f' 
                          }}
                          icon={transaction.amount > 0 ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                        />
                      }
                      title={transaction.description}
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {formatDateTime(transaction.transactionDate)}
                          </Text>
                          <Text strong style={{ 
                            color: transaction.amount > 0 ? '#52c41a' : '#ff4d4f'
                          }}>
                            {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                          </Text>
                        </Space>
                      }
                    />
                    <Text type="secondary">
                      {formatCurrency(transaction.newBalance)}
                    </Text>
                  </List.Item>
                )}
              />
            )}
          </div>
        )}
      </Modal>
    );
  };

  const renderBankAccountModal = () => {
    debugLog('Rendering bank account modal', { visible: modalVisible.bank, selectedBankAccount }, 'info');
    
    return (
      <Modal
        title={
          <Space>
            <BankOutlined />
            Bank Account Details
          </Space>
        }
        open={modalVisible.bank}
        onCancel={() => {
          debugLog('Closing bank account modal', null, 'info');
          setModalVisible(prev => ({ ...prev, bank: false }));
        }}
        footer={[
          <Button key="close" onClick={() => {
            debugLog('Close button clicked in bank account modal', null, 'info');
            setModalVisible(prev => ({ ...prev, bank: false }));
          }}>
            Close
          </Button>
        ]}
        width={isMobile ? '95%' : 800}
      >
        {selectedBankAccount && (
          <div className="modal-content">
            <Descriptions column={isMobile ? 1 : 2} bordered size="small">
              <Descriptions.Item label="Bank">
                {selectedBankAccount.bank?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Account Number">
                {selectedBankAccount.accountNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Account Name">
                {selectedBankAccount.accountName}
              </Descriptions.Item>
              <Descriptions.Item label="Current Balance">
                <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                  {formatCurrency(selectedBankAccount.currentBalance)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Branch">
                {selectedBankAccount.branch || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Currency">
                {selectedBankAccount.currency}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Space>
                  {selectedBankAccount.isPrimary && <Tag color="blue">Primary</Tag>}
                  <Tag color={selectedBankAccount.isActive ? 'green' : 'red'}>
                    {selectedBankAccount.isActive ? 'Active' : 'Inactive'}
                  </Tag>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Total Deposits">
                {formatCurrency(selectedBankAccount.totalDeposits)}
              </Descriptions.Item>
              <Descriptions.Item label="Total Withdrawals">
                {formatCurrency(selectedBankAccount.totalWithdrawals)}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Recent Transactions</Divider>
            
            {loading.transactions ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin />
              </div>
            ) : data.bankTransactions.length === 0 ? (
              <Empty description="No transactions found" />
            ) : (
              <List
                dataSource={data.bankTransactions.slice(0, 10)}
                renderItem={transaction => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size="small"
                          style={{ backgroundColor: '#1890ff' }}
                          icon={<SwapOutlined />}
                        />
                      }
                      title={
                        <Space>
                          <Text>{transaction.transactionType}</Text>
                          {transaction.referenceNumber && (
                            <Tag color="blue">{transaction.referenceNumber}</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {formatDateTime(transaction.transactionDate)}
                          </Text>
                          <Text strong style={{ color: '#1890ff' }}>
                            {formatCurrency(transaction.amount)}
                          </Text>
                        </Space>
                      }
                    />
                    <Tag color={
                      transaction.status === 'COMPLETED' ? 'green' : 
                      transaction.status === 'PENDING' ? 'orange' : 'red'
                    }>
                      {transaction.status}
                    </Tag>
                  </List.Item>
                )}
              />
            )}
          </div>
        )}
      </Modal>
    );
  };

  const renderSupplierAccountModal = () => {
    debugLog('Rendering supplier account modal', { visible: modalVisible.supplier, selectedSupplierAccount }, 'info');
    
    return (
      <Modal
        title={
          <Space>
            <TeamOutlined />
            Supplier Account Details
          </Space>
        }
        open={modalVisible.supplier}
        onCancel={() => {
          debugLog('Closing supplier account modal', null, 'info');
          setModalVisible(prev => ({ ...prev, supplier: false }));
        }}
        footer={[
          <Button key="close" onClick={() => {
            debugLog('Close button clicked in supplier account modal', null, 'info');
            setModalVisible(prev => ({ ...prev, supplier: false }));
          }}>
            Close
          </Button>
        ]}
        width={isMobile ? '95%' : 800}
      >
        {selectedSupplierAccount && (
          <div className="modal-content">
            <Descriptions column={isMobile ? 1 : 2} bordered size="small">
              <Descriptions.Item label="Supplier">
                {selectedSupplierAccount.supplier?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Current Balance">
                <Text strong style={{ 
                  color: selectedSupplierAccount.currentBalance > 0 ? '#faad14' : '#52c41a',
                  fontSize: '16px'
                }}>
                  {formatCurrency(selectedSupplierAccount.currentBalance)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Contact Person">
                {selectedSupplierAccount.supplier?.contactPerson || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Credit Limit">
                {selectedSupplierAccount.creditLimit ? 
                  formatCurrency(selectedSupplierAccount.creditLimit) : 'N/A'
                }
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {selectedSupplierAccount.supplier?.phone || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Available Credit">
                {selectedSupplierAccount.availableCredit ? 
                  formatCurrency(selectedSupplierAccount.availableCredit) : 'N/A'
                }
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedSupplierAccount.supplier?.email || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Terms">
                {selectedSupplierAccount.paymentTerms ? 
                  `Net ${selectedSupplierAccount.paymentTerms} days` : 'N/A'
                }
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={
                  selectedSupplierAccount.isCreditHold ? 'red' : 
                  selectedSupplierAccount.status === 'ACTIVE' ? 'green' : 'default'
                }>
                  {selectedSupplierAccount.isCreditHold ? 'Credit Hold' : selectedSupplierAccount.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Last Payment">
                {selectedSupplierAccount.lastPaymentDate ? 
                  formatDate(selectedSupplierAccount.lastPaymentDate) : 'Never'
                }
              </Descriptions.Item>
            </Descriptions>

            <Divider>Recent Transactions</Divider>
            
            {loading.transactions ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin />
              </div>
            ) : data.supplierTransactions.length === 0 ? (
              <Empty description="No transactions found" />
            ) : (
              <List
                dataSource={data.supplierTransactions.slice(0, 10)}
                renderItem={transaction => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size="small"
                          style={{ 
                            backgroundColor: transaction.type === 'PURCHASE_INVOICE' ? '#faad14' : '#52c41a'
                          }}
                          icon={transaction.type === 'PURCHASE_INVOICE' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        />
                      }
                      title={transaction.description}
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {formatDateTime(transaction.transactionDate)}
                            {transaction.dueDate && ` • Due: ${formatDate(transaction.dueDate)}`}
                          </Text>
                          <Text strong style={{ 
                            color: transaction.type === 'PURCHASE_INVOICE' ? '#faad14' : '#52c41a'
                          }}>
                            {formatCurrency(transaction.amount)}
                          </Text>
                        </Space>
                      }
                    />
                    <Tag color={
                      transaction.status === 'OUTSTANDING' ? 'orange' :
                      transaction.status === 'SETTLED' ? 'green' : 'default'
                    }>
                      {transaction.status}
                    </Tag>
                  </List.Item>
                )}
              />
            )}
          </div>
        )}
      </Modal>
    );
  };

  if (!companyId) {
    debugLog('Rendering empty state - no company selected', null, 'warning');
    
    return (
      <Card>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Please select a company to view financial data"
        />
      </Card>
    );
  }

  debugLog('Rendering main dashboard component', {
    companyId,
    activeTab,
    loadingStates: loading,
    dataCounts: {
      stationWallets: data.stationWallets.length,
      bankAccounts: data.bankAccounts.length,
      supplierAccounts: data.supplierAccounts.length
    }
  }, 'info');

  return (
    <div className="financial-dashboard">
      {/* Header */}
      <Card className="dashboard-header">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <Title level={2} style={{ margin: 0 }}>
                <BarChartOutlined /> Financial Dashboard
              </Title>
              <Text type="secondary">
                {state.currentCompany?.name} • Complete financial overview
                {lastUpdated && (
                  <span style={{ marginLeft: 8 }}>
                    • Updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify={isMobile ? "start" : "end"}>
              <Col>
                <Space>
                  <Tooltip title="Auto Refresh">
                    <Switch
                      checked={autoRefresh}
                      onChange={handleAutoRefreshToggle}
                      checkedChildren="Auto"
                      unCheckedChildren="Manual"
                      size={isMobile ? "small" : "default"}
                    />
                  </Tooltip>
                  <Tooltip title="Refresh Data">
                    <Button
                      icon={<SyncOutlined spin={loading.overview} />}
                      onClick={handleRefresh}
                      loading={loading.overview}
                      size={isMobile ? "small" : "default"}
                    >
                      {isMobile ? '' : 'Refresh'}
                    </Button>
                  </Tooltip>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Auto-refresh Alert */}
      {autoRefresh && (
        <Alert
          message="Auto-refresh Enabled"
          description="Financial data is automatically updated every 30 seconds"
          type="info"
          showIcon
          icon={<SyncOutlined />}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => setAutoRefresh(false)}>
              Disable
            </Button>
          }
        />
      )}

      {/* Main Content */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type={isMobile ? "card" : "line"}
          items={[
            {
              key: 'overview',
              label: (
                <Space>
                  <BarChartOutlined />
                  {isMobile ? 'Overview' : 'Financial Overview'}
                </Space>
              ),
              children: renderFinancialOverview()
            },
            {
              key: 'wallets',
              label: (
                <Space>
                  <WalletOutlined />
                  {isMobile ? 'Wallets' : 'Station Wallets'}
                  <Badge 
                    count={data.stationWallets.length} 
                    size="small" 
                    style={{ backgroundColor: '#1890ff' }} 
                  />
                </Space>
              ),
              children: renderStationWalletsTab()
            },
            {
              key: 'banks',
              label: (
                <Space>
                  <BankOutlined />
                  {isMobile ? 'Banks' : 'Bank Accounts'}
                  <Badge 
                    count={data.bankAccounts.length} 
                    size="small" 
                    style={{ backgroundColor: '#52c41a' }} 
                  />
                </Space>
              ),
              children: renderBankAccountsTab()
            },
            {
              key: 'suppliers',
              label: (
                <Space>
                  <TeamOutlined />
                  {isMobile ? 'Suppliers' : 'Supplier Accounts'}
                  <Badge 
                    count={data.supplierAccounts.length} 
                    size="small" 
                    style={{ backgroundColor: '#faad14' }} 
                  />
                </Space>
              ),
              children: renderSupplierAccountsTab()
            }
          ]}
        />
      </Card>

      {/* Modals */}
      {renderWalletModal()}
      {renderBankAccountModal()}
      {renderSupplierAccountModal()}
    </div>
  );
};

export default FinancialDashboard;