// src/components/wallets/StationWallets.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Alert,
  Input,
  Select,
  Badge,
  Tooltip,
  Typography,
  Row,
  Col,
  Statistic,
  Modal,
  Descriptions,
  Popconfirm,
  message,
  Progress,
  Grid,
  Avatar,
  Switch,
  Tabs,
  DatePicker,
  Radio,
  Divider,
  List,
  Timeline,
  Empty,
  Form,
  InputNumber
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
  ShopOutlined,
  WalletOutlined,
  DollarOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UserOutlined,
  CreditCardOutlined,
  BankOutlined,
  AreaChartOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TransactionOutlined
} from '@ant-design/icons';
import { 
  TrendingUp, ArrowUpRight, ArrowDownLeft, 
  PiggyBank, Receipt, Coins 
} from 'lucide-react';
import { stationAccountService } from '../../../services/stationAccountService';
import { useApp } from '../../../context/AppContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;
const { TextArea } = Input;

const StationWallets = () => {
  const { state } = useApp();
  const screens = useBreakpoint();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({});
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [filters, setFilters] = useState({
    period: 'daily',
    stationId: '',
    startDate: dayjs().startOf('month'),
    endDate: dayjs().endOf('month'),
    transactionType: ''
  });

  const currentCompany = state.currentUser?.companyId;

  // Fetch data based on active tab
  const fetchData = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      let result;
      
      switch (activeTab) {
        case 'overview':
          result = await stationAccountService.getStationFinancialSummary(currentCompany, filters.period);
          break;
        case 'wallets':
          result = await stationAccountService.getStationWallet(currentCompany);
          break;
        case 'transactions':
          result = await stationAccountService.getWalletTransactions(currentCompany, filters);
          break;
        case 'analysis':
          result = await stationAccountService.getStationFinancialSummary(currentCompany, 'monthly');
          break;
        case 'reports':
          result = await stationAccountService.getWalletTransactions(currentCompany, {
            ...filters,
            limit: 50
          });
          break;
        default:
          result = await stationAccountService.getStationFinancialSummary(currentCompany, filters.period);
      }
      
      setData(prev => ({
        ...prev,
        [activeTab]: result
      }));
      
    } catch (error) {
      console.error(`❌ Failed to fetch ${activeTab} data:`, error);
      message.error(`Failed to load ${activeTab} data`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, currentCompany, filters.period]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Handle create transaction
  const handleCreateTransaction = async (values) => {
    try {
      await stationAccountService.createWalletTransaction(currentCompany, values);
      message.success('Transaction created successfully');
      setCreateModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('Failed to create transaction');
    }
  };

  // Tab configurations
  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <BarChartOutlined />
          {screens.xs ? '' : ' Overview'}
        </span>
      )
    },
    {
      key: 'wallets',
      label: (
        <span>
          <WalletOutlined />
          {screens.xs ? '' : ' Wallets'}
        </span>
      )
    },
    {
      key: 'transactions',
      label: (
        <span>
          <TransactionOutlined />
          {screens.xs ? '' : ' Transactions'}
        </span>
      )
    },
    {
      key: 'analysis',
      label: (
        <span>
          <AreaChartOutlined />
          {screens.xs ? '' : ' Analysis'}
        </span>
      )
    },
    {
      key: 'reports',
      label: (
        <span>
          <DownloadOutlined />
          {screens.xs ? '' : ' Reports'}
        </span>
      )
    }
  ];

  // Overview Tab Content
  const OverviewTab = () => {
    const overviewData = data.overview || {};
    const health = stationAccountService.analyzeFinancialHealth(overviewData);
    
    return (
      <div className="space-y-4">
        {/* Financial Health Status */}
        <Card title="Financial Health" loading={loading}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                  {health?.overallHealth === 'healthy' ? '✅' : 
                   health?.overallHealth === 'needs_attention' ? '⚠️' : '❌'}
                </div>
                <Text strong style={{ 
                  color: health?.overallHealth === 'healthy' ? '#52c41a' : 
                         health?.overallHealth === 'needs_attention' ? '#faad14' : '#cf1322'
                }}>
                  {health?.overallHealth?.toUpperCase()?.replace('_', ' ')}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={16}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {health?.cashFlow && (
                  <div className="flex justify-between">
                    <Text>Cash Flow</Text>
                    <Tag color={health.cashFlow.status === 'healthy' ? 'green' : 'orange'}>
                      {health.cashFlow.status}
                    </Tag>
                  </div>
                )}
                {health?.collections && (
                  <div className="flex justify-between">
                    <Text>Collections</Text>
                    <Tag color={
                      health.collections.status === 'excellent' ? 'green' :
                      health.collections.status === 'good' ? 'blue' :
                      health.collections.status === 'fair' ? 'orange' : 'red'
                    }>
                      {health.collections.status}
                    </Tag>
                  </div>
                )}
                {health?.debt && (
                  <div className="flex justify-between">
                    <Text>Debt Management</Text>
                    <Tag color={health.debt.status === 'healthy' ? 'green' : 
                               health.debt.status === 'moderate' ? 'orange' : 'red'}>
                      {health.debt.status}
                    </Tag>
                  </div>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Key Metrics */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Total Balance"
                value={overviewData.wallet?.currentBalance || 0}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#1890ff' }}
                prefix={<WalletOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Today's Inflow"
                value={overviewData.wallet?.todaysInflow || 0}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#52c41a' }}
                prefix={<ArrowUpRight style={{ width: 16 }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Today's Outflow"
                value={overviewData.wallet?.todaysOutflow || 0}
                formatter={value => formatCurrency(value)}
                valueStyle={{ color: '#faad14' }}
                prefix={<ArrowDownLeft style={{ width: 16 }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Net Flow"
                value={(overviewData.wallet?.todaysInflow || 0) - (overviewData.wallet?.todaysOutflow || 0)}
                formatter={value => formatCurrency(value)}
                valueStyle={{ 
                  color: ((overviewData.wallet?.todaysInflow || 0) - (overviewData.wallet?.todaysOutflow || 0)) >= 0 ? '#52c41a' : '#cf1322' 
                }}
                prefix={<TrendingUp style={{ width: 16 }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Cash Requirements */}
        <Card title="Cash Requirements" size="small" loading={loading}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Progress
                type="dashboard"
                percent={Math.min(100, ((overviewData.wallet?.currentBalance || 0) / (overviewData.wallet?.minBalance || 5000)) * 100)}
                format={percent => `${percent}%`}
                strokeColor={{
                  '0%': '#cf1322',
                  '50%': '#faad14',
                  '100%': '#52c41a',
                }}
              />
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Text type="secondary">
                  {formatCurrency(overviewData.wallet?.currentBalance || 0)} / {formatCurrency(overviewData.wallet?.minBalance || 5000)}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div className="flex justify-between">
                  <Text>Minimum Required</Text>
                  <Text strong>{formatCurrency(overviewData.wallet?.minBalance || 5000)}</Text>
                </div>
                <div className="flex justify-between">
                  <Text>Current Balance</Text>
                  <Text strong type={
                    (overviewData.wallet?.currentBalance || 0) >= (overviewData.wallet?.minBalance || 5000) ? 
                    "success" : "danger"
                  }>
                    {formatCurrency(overviewData.wallet?.currentBalance || 0)}
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text>Status</Text>
                  <Tag color={
                    (overviewData.wallet?.currentBalance || 0) >= (overviewData.wallet?.minBalance || 5000) ? 
                    "green" : "red"
                  }>
                    {(overviewData.wallet?.currentBalance || 0) >= (overviewData.wallet?.minBalance || 5000) ? 
                     "Adequate" : "Low"}
                  </Tag>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" size="small" loading={loading}>
          <Timeline>
            <Timeline.Item color="green" dot={<CheckCircleOutlined />}>
              <Space direction="vertical" size={0}>
                <Text strong>Cash Collection</Text>
                <Text type="secondary">Shift #123 - 8:00 PM</Text>
                <Text>Amount: {formatCurrency(12500)}</Text>
              </Space>
            </Timeline.Item>
            <Timeline.Item color="blue" dot={<BankOutlined />}>
              <Space direction="vertical" size={0}>
                <Text strong>Bank Deposit</Text>
                <Text type="secondary">4:30 PM</Text>
                <Text>Amount: {formatCurrency(8500)}</Text>
              </Space>
            </Timeline.Item>
            <Timeline.Item color="orange" dot={<ExclamationCircleOutlined />}>
              <Space direction="vertical" size={0}>
                <Text strong>Expense Payment</Text>
                <Text type="secondary">2:15 PM</Text>
                <Text>Amount: {formatCurrency(-250)}</Text>
              </Space>
            </Timeline.Item>
          </Timeline>
        </Card>
      </div>
    );
  };

  // Wallets Tab Content
  const WalletsTab = () => {
    const walletsData = data.wallets || {};
    
    return (
      <div className="space-y-4">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card 
              title="Station Wallet" 
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                >
                  New Transaction
                </Button>
              }
              loading={loading}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Current Balance">
                  <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                    {formatCurrency(walletsData.currentBalance || 0)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Opening Balance">
                  {formatCurrency(walletsData.openingBalance || 0)}
                </Descriptions.Item>
                <Descriptions.Item label="Today's Inflow">
                  <Text type="success">{formatCurrency(walletsData.todaysInflow || 0)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Today's Outflow">
                  <Text type="danger">{formatCurrency(walletsData.todaysOutflow || 0)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Minimum Balance">
                  {formatCurrency(walletsData.minBalance || 5000)}
                </Descriptions.Item>
                <Descriptions.Item label="Maximum Balance">
                  {formatCurrency(walletsData.maxBalance || 50000)}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          
          <Col xs={24} lg={12}>
            <Card title="Quick Actions" loading={loading}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  icon={<BankOutlined />} 
                  block 
                  size="large"
                  type="dashed"
                >
                  Bank Deposit
                </Button>
                <Button 
                  icon={<Coins style={{ width: 16 }} />} 
                  block 
                  size="large"
                  type="dashed"
                >
                  Petty Cash Replenishment
                </Button>
                <Button 
                  icon={<Receipt style={{ width: 16 }} />} 
                  block 
                  size="large"
                  type="dashed"
                >
                  Expense Payment
                </Button>
                <Button 
                  icon={<PiggyBank style={{ width: 16 }} />} 
                  block 
                  size="large"
                  type="dashed"
                >
                  Cash Transfer
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // Transactions Tab Content
  const TransactionsTab = () => {
    const transactionsData = data.transactions || {};
    
    const columns = [
      {
        title: 'Date',
        dataIndex: 'transactionDate',
        key: 'transactionDate',
        width: 120,
        render: (date) => dayjs(date).format('MMM DD, YYYY')
      },
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (type) => (
          <Tag color={
            type === 'COLLECTION' ? 'green' :
            type === 'BANK_DEPOSIT' ? 'blue' :
            type === 'EXPENSE_PAYMENT' ? 'orange' : 'default'
          }>
            {type?.replace('_', ' ')}
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
        width: 120,
        render: (amount) => (
          <Text strong type={amount >= 0 ? "success" : "danger"}>
            {formatCurrency(amount)}
          </Text>
        )
      },
      {
        title: 'Balance',
        dataIndex: 'newBalance',
        key: 'newBalance',
        width: 120,
        render: (balance) => formatCurrency(balance)
      },
      {
        title: 'Shift',
        dataIndex: 'shift',
        key: 'shift',
        width: 100,
        render: (shift) => shift?.shiftNumber ? `#${shift.shiftNumber}` : '-'
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 80,
        render: (_, record) => (
          <Tooltip title="View Details">
            <Button icon={<EyeOutlined />} size="small" />
          </Tooltip>
        )
      }
    ];

    return (
      <div className="space-y-4">
        <Card
          title="Wallet Transactions"
          extra={
            <Space>
              <Select
                placeholder="Filter by type"
                style={{ width: 150 }}
                value={filters.transactionType}
                onChange={(value) => handleFilterChange({ transactionType: value })}
                allowClear
              >
                <Option value="COLLECTION">Collection</Option>
                <Option value="BANK_DEPOSIT">Bank Deposit</Option>
                <Option value="EXPENSE_PAYMENT">Expense</Option>
                <Option value="CASH_TRANSFER_OUT">Transfer Out</Option>
                <Option value="CASH_TRANSFER_IN">Transfer In</Option>
              </Select>
              <Button 
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                New Transaction
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={transactionsData.transactions || []}
            loading={loading}
            size="small"
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No transactions found"
                />
              )
            }}
          />
        </Card>
      </div>
    );
  };

  // Analysis Tab Content
  const AnalysisTab = () => {
    const analysisData = data.analysis || {};
    const patterns = stationAccountService.analyzeTransactionPatterns(analysisData);
    
    return (
      <div className="space-y-4">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card title="Cash Flow Analysis" loading={loading}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div className="flex justify-between">
                  <Text>Total Inflow</Text>
                  <Text strong type="success">
                    {formatCurrency(patterns?.summary?.totalInflow || 0)}
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text>Total Outflow</Text>
                  <Text strong type="danger">
                    {formatCurrency(patterns?.summary?.totalOutflow || 0)}
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text>Net Flow</Text>
                  <Text strong type={
                    (patterns?.summary?.netFlow || 0) >= 0 ? "success" : "danger"
                  }>
                    {formatCurrency(patterns?.summary?.netFlow || 0)}
                  </Text>
                </div>
                <Divider />
                <div className="flex justify-between">
                  <Text>Average Transaction</Text>
                  <Text strong>
                    {formatCurrency(patterns?.summary?.averageTransaction || 0)}
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text>Transaction Count</Text>
                  <Text strong>{patterns?.summary?.totalTransactions || 0}</Text>
                </div>
              </Space>
            </Card>
          </Col>
          
          <Col xs={24} sm={12}>
            <Card title="Transaction Types" loading={loading}>
              {patterns?.byType ? (
                <List
                  size="small"
                  dataSource={Object.entries(patterns.byType)}
                  renderItem={([type, data]) => (
                    <List.Item>
                      <List.Item.Meta
                        title={type.replace('_', ' ')}
                        description={`${data.count} transactions • ${formatCurrency(data.total)}`}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  description="No transaction data available"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </Col>
        </Row>

        <Card title="Financial Alerts" loading={loading}>
          {stationAccountService.checkFinancialAlerts(analysisData).map((alert, index) => (
            <Alert
              key={index}
              message={alert.message}
              type={alert.severity === 'critical' ? 'error' : 'warning'}
              showIcon
              style={{ marginBottom: 8 }}
            />
          ))}
        </Card>
      </div>
    );
  };

  // Reports Tab Content
  const ReportsTab = () => {
    const reportsData = data.reports || {};
    
    return (
      <div className="space-y-4">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card 
              title="Daily Summary" 
              size="small"
              extra={
                <Button 
                  icon={<DownloadOutlined />} 
                  size="small"
                  onClick={() => {
                    const csvData = stationAccountService.exportFinancialDataToCSV(data.overview, data.transactions);
                    // Implement CSV download logic
                  }}
                />
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div className="flex justify-between">
                  <Text>Date</Text>
                  <Text strong>{dayjs().format('MMM DD, YYYY')}</Text>
                </div>
                <div className="flex justify-between">
                  <Text>Opening Balance</Text>
                  <Text strong>{formatCurrency(data.overview?.wallet?.openingBalance || 0)}</Text>
                </div>
                <div className="flex justify-between">
                  <Text>Closing Balance</Text>
                  <Text strong>{formatCurrency(data.overview?.wallet?.currentBalance || 0)}</Text>
                </div>
                <div className="flex justify-between">
                  <Text>Net Change</Text>
                  <Text strong type={
                    ((data.overview?.wallet?.currentBalance || 0) - (data.overview?.wallet?.openingBalance || 0)) >= 0 ? 
                    "success" : "danger"
                  }>
                    {formatCurrency((data.overview?.wallet?.currentBalance || 0) - (data.overview?.wallet?.openingBalance || 0))}
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <Card 
              title="Export Reports" 
              size="small"
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button icon={<DownloadOutlined />} block>
                  Daily Cash Report
                </Button>
                <Button icon={<DownloadOutlined />} block>
                  Monthly Summary
                </Button>
                <Button icon={<DownloadOutlined />} block>
                  Transaction History
                </Button>
                <Button icon={<DownloadOutlined />} block>
                  Financial Health Report
                </Button>
              </Space>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <Card 
              title="Report Settings" 
              size="small"
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div className="flex justify-between">
                  <Text>Auto-generate Reports</Text>
                  <Switch size="small" />
                </div>
                <div className="flex justify-between">
                  <Text>Email Notifications</Text>
                  <Switch size="small" defaultChecked />
                </div>
                <div className="flex justify-between">
                  <Text>Low Balance Alerts</Text>
                  <Switch size="small" defaultChecked />
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // Create Transaction Modal
  const CreateTransactionModal = () => {
    const [form] = Form.useForm();

    return (
      <Modal
        title="Create New Transaction"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTransaction}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="type"
                label="Transaction Type"
                rules={[{ required: true, message: 'Please select transaction type' }]}
              >
                <Select placeholder="Select type">
                  <Option value="COLLECTION">Cash Collection</Option>
                  <Option value="BANK_DEPOSIT">Bank Deposit</Option>
                  <Option value="EXPENSE_PAYMENT">Expense Payment</Option>
                  <Option value="CASH_TRANSFER_OUT">Cash Transfer Out</Option>
                  <Option value="CASH_TRANSFER_IN">Cash Transfer In</Option>
                  <Option value="ADJUSTMENT">Adjustment</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0.01}
                  step={0.01}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea
              placeholder="Enter transaction description..."
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="transactionDate"
                label="Transaction Date"
                initialValue={dayjs()}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="shiftId"
                label="Shift (Optional)"
              >
                <Select placeholder="Select shift">
                  {/* Shift options would be populated from API */}
                  <Option value="shift-1">Shift #123</Option>
                  <Option value="shift-2">Shift #124</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create Transaction
              </Button>
              <Button onClick={() => setCreateModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'wallets':
        return <WalletsTab />;
      case 'transactions':
        return <TransactionsTab />;
      case 'analysis':
        return <AnalysisTab />;
      case 'reports':
        return <ReportsTab />;
      default:
        return <OverviewTab />;
    }
  };

  if (!currentCompany) {
    return (
      <Alert
        message="No Company Context"
        description="Please ensure you are logged into a company account."
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <Title level={2} style={{ margin: 0, fontSize: screens.xs ? '20px' : '24px' }}>
                Station Wallets
              </Title>
              <Text type="secondary" style={{ fontSize: screens.xs ? '12px' : '14px' }}>
                Cash management and financial tracking
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify={screens.md ? "end" : "start"}>
              <Col xs={12} sm={8}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchData}
                  loading={loading}
                  block={screens.xs}
                >
                  {screens.sm && 'Refresh'}
                </Button>
              </Col>
              <Col xs={12} sm={8}>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const csvData = stationAccountService.exportFinancialDataToCSV(data.overview, data.transactions);
                    // Implement export logic
                  }}
                  block={screens.xs}
                >
                  {screens.sm && 'Export'}
                </Button>
              </Col>
              <Col xs={24} sm={8}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                  block={screens.xs}
                >
                  {screens.sm && 'New Transaction'}
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Select
              style={{ width: '100%' }}
              value={filters.period}
              onChange={(value) => handleFilterChange({ period: value })}
              size="large"
            >
              <Option value="daily">Daily</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="monthly">Monthly</Option>
            </Select>
          </Col>

          <Col xs={24} sm={8} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={[filters.startDate, filters.endDate]}
              onChange={(dates) => handleFilterChange({
                startDate: dates?.[0],
                endDate: dates?.[1]
              })}
              size="large"
            />
          </Col>

          <Col xs={24} sm={8} md={6}>
            <Button 
              icon={<FilterOutlined />}
              onClick={() => {
                handleFilterChange({
                  period: 'daily',
                  startDate: dayjs().startOf('month'),
                  endDate: dayjs().endOf('month'),
                  transactionType: ''
                });
              }}
              size="large"
              block
            >
              Reset Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Content with Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          type={screens.xs ? "card" : "line"}
          size={screens.xs ? "small" : "middle"}
        />
        
        <div style={{ marginTop: 16 }}>
          {renderTabContent()}
        </div>
      </Card>

      {/* Modals */}
      <CreateTransactionModal />
    </div>
  );
};

export default StationWallets;