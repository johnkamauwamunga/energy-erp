import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  DatePicker,
  Alert,
  Badge,
  Divider,
  Typography,
  Dropdown
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  BankOutlined,
  WalletOutlined,
  HistoryOutlined,
  PlusOutlined,
  DownOutlined
} from '@ant-design/icons';
import { supplierPaymentService, paymentTransformers } from '../../../../../services/supplierPaymentService/supplierPaymentService';

import { useApp } from '../../../../../context/AppContext';
import CreateSupplierPaymentModal from './modal/CreateSupplierPaymentModal';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const SupplierAccountManagement = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [paymentJourney, setPaymentJourney] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [stationWallets, setStationWallets] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dateRange: []
  });
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('suppliers');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refreshIntervalRef = useRef(null);
  const currentUser = state.currentUser;

  const isCompanyLevel = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER'].includes(currentUser?.role);
  const isStationLevel = ['STATION_MANAGER', 'SUPERVISOR', 'ATTENDANT'].includes(currentUser?.role);

  const REFRESH_INTERVAL = 30000;

  // Load supplier accounts with outstanding invoices
  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await supplierPaymentService.getSupplierAccounts({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
        includePaidInvoices: false
      });
      
      console.log("Suppliers API Response:", response);
      
      const transformedSuppliers = response.data.map(paymentTransformers.transformSupplierAccount);
      setSuppliers(transformedSuppliers);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0
      }));
      return response;
    } catch (error) {
      console.error('Error loading suppliers:', error);
      message.error('Failed to load suppliers');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Load supplier payment journey
  const loadPaymentJourney = async (supplierAccountId) => {
    try {
      const response = await supplierPaymentService.getSupplierPaymentJourney(supplierAccountId);
      const transformed = paymentTransformers.transformPaymentJourney(response.data);
      setPaymentJourney(transformed);
      return transformed;
    } catch (error) {
      console.error('Error loading payment journey:', error);
      message.error('Failed to load payment history');
      throw error;
    }
  };

  // Load supplier transactions
  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await supplierPaymentService.getSupplierTransactions({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      
      console.log("Transactions API Response:", response);
      
      setTransactions(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0
      }));
      return response;
    } catch (error) {
      console.error('Error loading transactions:', error);
      message.error('Failed to load transactions');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Load payment methods
  const loadPaymentMethods = async () => {
    try {
      const response = await supplierPaymentService.getPaymentMethods();
      console.log("Payment Methods:", response);
      setPaymentMethods(response.data || []);
      return response;
    } catch (error) {
      console.error('Error loading payment methods:', error);
      throw error;
    }
  };

  // Load bank accounts
  const loadBankAccounts = async () => {
    try {
      const response = await supplierPaymentService.getBankAccounts();
      console.log("Bank Accounts:", response);
      setBankAccounts(response.data || []);
      return response;
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      throw error;
    }
  };

  // Load station wallets
  const loadStationWallets = async () => {
    try {
      const response = await supplierPaymentService.getStationWallets();
      console.log("Station Wallets:", response);
      setStationWallets(response.data || []);
      return response;
    } catch (error) {
      console.error('Error loading station wallets:', error);
      throw error;
    }
  };

  // Main refresh function
  const refreshAllData = async (showMessage = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const refreshPromises = [
        loadSuppliers(),
        loadPaymentMethods(),
        loadBankAccounts()
      ];

      if (isStationLevel) {
        refreshPromises.push(loadStationWallets());
      }

      if (activeTab === 'transactions') {
        refreshPromises.push(loadTransactions());
      }

      if (selectedSupplier) {
        refreshPromises.push(loadPaymentJourney(selectedSupplier.id));
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

  // Setup auto-refresh intervals
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        refreshAllData(false);
      }, REFRESH_INTERVAL);

      return () => {
        clearInterval(refreshIntervalRef.current);
      };
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }
  }, [autoRefresh]);

  // Initial load
  useEffect(() => {
    refreshAllData(false);
  }, []);

  // Reload when filters or pagination change
  useEffect(() => {
    if (activeTab === 'suppliers') {
      loadSuppliers();
    } else if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [filters, pagination.page, pagination.limit, activeTab]);

  // Manual refresh
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

  // Handle supplier selection
  const handleSelectSupplier = async (supplier) => {
    setSelectedSupplier(supplier);
    await loadPaymentJourney(supplier.id);
    setDetailsModalVisible(true);
  };

  // Handle payment success
  const handlePaymentSuccess = (result) => {
    message.success(`Payment processed successfully! Reference: ${result.data?.transferNumber}`);
    refreshAllData(false);
    setPaymentModalVisible(false);
  };

  // Handle make payment
  const handleMakePayment = (supplier) => {
    setSelectedSupplier(supplier);
    setPaymentModalVisible(true);
  };

  // Handle quick payment (without selecting specific supplier first)
  const handleQuickPayment = () => {
    if (suppliers.length === 0) {
      message.warning('No suppliers available for payment');
      return;
    }
    
    // Auto-select the first supplier with outstanding balance
    const supplierWithBalance = suppliers.find(s => s.currentBalance > 0);
    if (supplierWithBalance) {
      setSelectedSupplier(supplierWithBalance);
      setPaymentModalVisible(true);
    } else {
      message.info('No suppliers with outstanding balances found');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return paymentTransformers.formatCurrency(amount);
  };

  const formatDate = (date) => {
    return paymentTransformers.formatDate(date);
  };

  const formatDateTime = (date) => {
    return paymentTransformers.formatDateTime(date);
  };

  // Supplier Columns
  const supplierColumns = [
    {
      title: 'Supplier',
      dataIndex: 'supplierName',
      key: 'supplierName',
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <strong>{name}</strong>
          <small style={{ color: '#666' }}>{record.contactPerson}</small>
          <small style={{ color: '#666' }}>{record.phone}</small>
        </Space>
      )
    },
    {
      title: 'Balance',
      dataIndex: 'currentBalance',
      key: 'currentBalance',
      render: (balance, record) => (
        <Space direction="vertical" size={2}>
          <span style={{ 
            color: balance > 0 ? '#ff4d4f' : '#52c41a',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {formatCurrency(balance)}
          </span>
          {balance > 0 && (
            <Tag color="orange" size="small">
              Outstanding
            </Tag>
          )}
        </Space>
      ),
      align: 'right'
    },
    {
      title: 'Credit Limit',
      dataIndex: 'creditLimit',
      key: 'creditLimit',
      render: (limit) => limit ? formatCurrency(limit) : 'No Limit',
      align: 'right'
    },
    {
      title: 'Available Credit',
      dataIndex: 'availableCredit',
      key: 'availableCredit',
      render: (credit) => credit ? (
        <Tag color={credit > 0 ? 'green' : 'red'}>
          {formatCurrency(credit)}
        </Tag>
      ) : 'N/A',
      align: 'center'
    },
    {
      title: 'Outstanding Invoices',
      dataIndex: 'outstandingInvoices',
      key: 'outstandingInvoices',
      render: (invoices, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={invoices.length > 0 ? 'orange' : 'green'}>
            {invoices.length} invoices
          </Tag>
          {record.totalOutstanding > 0 && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {formatCurrency(record.totalOutstanding)}
            </Text>
          )}
        </Space>
      ),
      align: 'center'
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
      width: 200,
      render: (_, record) => (
        <Space size="small" direction="vertical">
          <Tooltip title="View Details & Payment History">
            <Button 
              type="primary"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleSelectSupplier(record)}
              block
            >
              View Details
            </Button>
          </Tooltip>
          <Tooltip title={record.currentBalance <= 0 ? "No outstanding balance" : "Make payment to this supplier"}>
            <Button 
              type="default"
              icon={<DollarOutlined />}
              size="small"
              onClick={() => handleMakePayment(record)}
              disabled={record.currentBalance <= 0}
              block
              style={{
                backgroundColor: record.currentBalance > 0 ? '#f6ffed' : '#f5f5f5',
                borderColor: record.currentBalance > 0 ? '#b7eb8f' : '#d9d9d9'
              }}
            >
              Pay Now
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ];

  // Transaction Columns (same as before)
  const transactionColumns = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date) => formatDateTime(date),
      sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeConfig = {
          'PURCHASE_INVOICE': { color: 'blue', text: 'Purchase Invoice', icon: <FileTextOutlined /> },
          'PAYMENT_MADE': { color: 'green', text: 'Payment', icon: <DollarOutlined /> },
          'CREDIT_NOTE': { color: 'orange', text: 'Credit Note', icon: <ClockCircleOutlined /> },
          'DEBIT_NOTE': { color: 'red', text: 'Debit Note', icon: <ExclamationCircleOutlined /> },
          'ADJUSTMENT': { color: 'purple', text: 'Adjustment', icon: <SyncOutlined /> }
        };
        const config = typeConfig[type] || { color: 'default', text: type, icon: <FileTextOutlined /> };
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => {
        const isNegative = record.type === 'PAYMENT_MADE' || amount < 0;
        const displayAmount = Math.abs(amount);
        return (
          <span style={{ 
            color: isNegative ? '#52c41a' : '#ff4d4f',
            fontWeight: 'bold'
          }}>
            {isNegative ? '-' : '+'}{formatCurrency(displayAmount)}
          </span>
        );
      },
      align: 'right'
    },
    {
      title: 'Balance Before',
      dataIndex: 'balanceBefore',
      key: 'balanceBefore',
      render: (balance) => formatCurrency(balance),
      align: 'right'
    },
    {
      title: 'Balance After',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      render: (balance) => formatCurrency(balance),
      align: 'right'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          'OUTSTANDING': { color: 'orange', icon: <ClockCircleOutlined /> },
          'PARTIALLY_PAID': { color: 'blue', icon: <SyncOutlined /> },
          'PAID': { color: 'green', icon: <CheckCircleOutlined /> },
          'OVERDUE': { color: 'red', icon: <ExclamationCircleOutlined /> }
        };
        const config = statusConfig[status] || { color: 'default', icon: <FileTextOutlined /> };
        return (
          <Tag color={config.color} icon={config.icon}>
            {status}
          </Tag>
        );
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    }
  ];

  // Last updated display
  const lastUpdatedDisplay = useMemo(() => {
    if (!lastUpdated) return 'Never';
    return lastUpdated.toLocaleTimeString();
  }, [lastUpdated]);

  // Create payment dropdown items
  const createPaymentItems = [
    {
      key: 'quick-payment',
      label: 'Quick Payment',
      icon: <DollarOutlined />,
      onClick: handleQuickPayment
    },
    {
      key: 'select-supplier',
      label: 'Select Supplier First',
      icon: <UserOutlined />,
      onClick: () => message.info('Select a supplier from the list below')
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>
                <UserOutlined /> Supplier Account Management
                {autoRefresh && (
                  <Badge 
                    dot 
                    style={{ 
                      backgroundColor: '#52c41a',
                      marginLeft: 8
                    }} 
                  />
                )}
              </h2>
              <p style={{ margin: 0, color: '#666' }}>
                Manage supplier accounts, outstanding invoices, and payments
                {lastUpdated && (
                  <span style={{ marginLeft: 8, fontSize: '12px', color: '#999' }}>
                    (Updated: {lastUpdatedDisplay})
                  </span>
                )}
              </p>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Space>
                  <Tooltip title="Auto Refresh">
                    <Switch
                      checked={autoRefresh}
                      onChange={handleAutoRefreshToggle}
                      checkedChildren="Auto ON"
                      unCheckedChildren="Auto OFF"
                    />
                  </Tooltip>
                  <Tooltip title={`Refresh (${refreshCount})`}>
                    <Button
                      icon={<SyncOutlined spin={loading} />}
                      onClick={handleManualRefresh}
                      loading={loading}
                    >
                      Refresh
                    </Button>
                  </Tooltip>
                  <Dropdown 
                    menu={{ items: createPaymentItems }}
                    placement="bottomRight"
                  >
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      style={{ 
                        backgroundColor: '#52c41a',
                        borderColor: '#52c41a'
                      }}
                    >
                      Create Payment <DownOutlined />
                    </Button>
                  </Dropdown>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Auto-refresh Status */}
      {autoRefresh && (
        <Alert
          message="Auto-refresh Enabled"
          description="Supplier data is automatically updated every 30 seconds."
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

      {/* Summary Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Suppliers"
              value={suppliers.length}
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Outstanding"
              value={suppliers.reduce((sum, supplier) => sum + supplier.totalOutstanding, 0)}
              formatter={value => formatCurrency(value)}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Overdue Invoices"
              value={suppliers.reduce((sum, supplier) => 
                sum + supplier.outstandingInvoices.filter(inv => inv.isOverdue).length, 0
              )}
              valueStyle={{ color: '#faad14' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Ready for Payment"
              value={suppliers.filter(s => s.currentBalance > 0).length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      {suppliers.filter(s => s.currentBalance > 0).length > 0 && (
        <Alert
          message="Quick Actions Available"
          description={
            <Space>
              <Text>
                {suppliers.filter(s => s.currentBalance > 0).length} suppliers have outstanding balances.
              </Text>
              <Button 
                type="link" 
                size="small" 
                onClick={handleQuickPayment}
                icon={<DollarOutlined />}
              >
                Pay All Outstanding
              </Button>
            </Space>
          }
          type="info"
          showIcon
        />
      )}

      {/* Tabs Section */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
        >
          <TabPane 
            tab={
              <Space>
                <UserOutlined />
                Suppliers ({suppliers.length})
                {suppliers.filter(s => s.currentBalance > 0).length > 0 && (
                  <Badge 
                    count={suppliers.filter(s => s.currentBalance > 0).length} 
                    style={{ backgroundColor: '#ff4d4f' }} 
                  />
                )}
              </Space>
            } 
            key="suppliers"
          >
            {/* Filters */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[8, 8]} align="middle">
                <Col xs={24} sm={8} md={6}>
                  <Input
                    placeholder="Search suppliers..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    prefix={<SearchOutlined />}
                  />
                </Col>
                <Col xs={12} sm={8} md={4}>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Status"
                    value={filters.status}
                    onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    allowClear
                  >
                    <Option value="ACTIVE">Active</Option>
                    <Option value="ON_HOLD">On Hold</Option>
                    <Option value="SUSPENDED">Suspended</Option>
                  </Select>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <RangePicker
                    style={{ width: '100%' }}
                    onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
                  />
                </Col>
                <Col xs={24} sm={8} md={8}>
                  <Space>
                    <Text type="secondary">Showing:</Text>
                    <Tag>{suppliers.length} suppliers</Tag>
                    <Tag color="orange">
                      {suppliers.filter(s => s.currentBalance > 0).length} with balance
                    </Tag>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Suppliers Table */}
            <Table
              columns={supplierColumns}
              dataSource={suppliers}
              loading={loading}
              rowKey="id"
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `Showing ${range[0]}-${range[1]} of ${total} suppliers`,
                onChange: (page, pageSize) => {
                  setPagination(prev => ({ ...prev, page, limit: pageSize }));
                }
              }}
              scroll={{ x: 1000 }}
            />
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <HistoryOutlined />
                All Transactions
              </span>
            } 
            key="transactions"
          >
            {/* Transactions Table */}
            <Table
              columns={transactionColumns}
              dataSource={transactions}
              loading={loading}
              rowKey="id"
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `Showing ${range[0]}-${range[1]} of ${total} transactions`,
                onChange: (page, pageSize) => {
                  setPagination(prev => ({ ...prev, page, limit: pageSize }));
                }
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Supplier Details Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            Supplier Details - {selectedSupplier?.supplierName}
          </Space>
        }
        open={detailsModalVisible}
        onCancel={() => {
          setDetailsModalVisible(false);
          setSelectedSupplier(null);
          setPaymentJourney(null);
        }}
        width={1000}
        footer={[
          <Button 
            key="pay"
            type="primary"
            icon={<DollarOutlined />}
            onClick={() => {
              setDetailsModalVisible(false);
              setPaymentModalVisible(true);
            }}
            disabled={!selectedSupplier || selectedSupplier.currentBalance <= 0}
          >
            Make Payment
          </Button>,
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        {selectedSupplier && paymentJourney && (
          <div>
            {/* Supplier Summary */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
                <Descriptions.Item label="Current Balance">
                  <span style={{ 
                    color: selectedSupplier.currentBalance > 0 ? '#ff4d4f' : '#52c41a',
                    fontWeight: 'bold'
                  }}>
                    {formatCurrency(selectedSupplier.currentBalance)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Credit Limit">
                  {selectedSupplier.creditLimit ? formatCurrency(selectedSupplier.creditLimit) : 'No Limit'}
                </Descriptions.Item>
                <Descriptions.Item label="Available Credit">
                  {selectedSupplier.availableCredit ? formatCurrency(selectedSupplier.availableCredit) : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Terms">
                  {selectedSupplier.paymentTerms ? `Net ${selectedSupplier.paymentTerms} days` : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Outstanding Invoices">
                  <Tag color="orange">{selectedSupplier.outstandingInvoices.length}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Total Outstanding">
                  {formatCurrency(selectedSupplier.totalOutstanding)}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Outstanding Invoices */}
            <Card title="Outstanding Invoices" size="small" style={{ marginBottom: 16 }}>
              {selectedSupplier.outstandingInvoices.length > 0 ? (
                <Table
                  size="small"
                  dataSource={selectedSupplier.outstandingInvoices}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: 'Invoice #',
                      dataIndex: 'invoiceNumber',
                      key: 'invoiceNumber'
                    },
                    {
                      title: 'Original Amount',
                      dataIndex: 'originalAmount',
                      key: 'originalAmount',
                      render: (amount) => formatCurrency(amount),
                      align: 'right'
                    },
                    {
                      title: 'Remaining',
                      dataIndex: 'remainingBalance',
                      key: 'remainingBalance',
                      render: (amount) => formatCurrency(amount),
                      align: 'right'
                    },
                    {
                      title: 'Due Date',
                      dataIndex: 'dueDate',
                      key: 'dueDate',
                      render: (date) => (
                        <Tag color={new Date(date) < new Date() ? 'red' : 'blue'}>
                          {formatDate(date)}
                        </Tag>
                      )
                    },
                    {
                      title: 'Status',
                      key: 'status',
                      render: (_, record) => (
                        <Tag color={record.isOverdue ? 'red' : 'orange'}>
                          {record.isOverdue ? 'OVERDUE' : 'OUTSTANDING'}
                        </Tag>
                      )
                    }
                  ]}
                />
              ) : (
                <Alert message="No outstanding invoices" type="success" showIcon />
              )}
            </Card>

            {/* Payment History */}
            <Card title="Payment History" size="small">
              {paymentJourney.transactions.length > 0 ? (
                <Table
                  size="small"
                  dataSource={paymentJourney.transactions}
                  rowKey="id"
                  pagination={false}
                  columns={transactionColumns.filter(col => 
                    ['Date', 'Type', 'Amount', 'Description'].includes(col.title)
                  )}
                />
              ) : (
                <Alert message="No payment history" type="info" showIcon />
              )}
            </Card>
          </div>
        )}
      </Modal>

      {/* Create Supplier Payment Modal */}
      <CreateSupplierPaymentModal
        visible={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        onSuccess={handlePaymentSuccess}
        supplier={selectedSupplier}
        stationWallets={stationWallets}
        bankAccounts={bankAccounts}
        paymentMethods={paymentMethods}
      />
    </div>
  );
};

export default SupplierAccountManagement;