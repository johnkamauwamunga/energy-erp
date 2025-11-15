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
  Divider,
  Descriptions,
  Switch,
  Popconfirm,
  DatePicker,
  Alert
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
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { bankingService } from '../../../../services/bankingService/bankingService';
import { bankService } from '../../../../services/bankService/bankService';
import { useApp } from '../../../../context/AppContext';

const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const AccountsManagement = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
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

  const currentUser = state.currentUser;
 
  const isCompanyLevel = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER'].includes(currentUser?.role);
  const isStationLevel = ['STATION_MANAGER', 'SUPERVISOR', 'ATTENDANT'].includes(currentUser?.role);

  // Load station wallet data
  const loadWalletData = async () => {
    setLoading(true);
    try {
      let wallet;
      if (isStationLevel) {
        wallet = await bankingService.getCurrentStationWallet();
      } else if (isCompanyLevel && currentUser.stationId) {
        wallet = await bankingService.getStationWallet(currentUser.stationId);
      }
      setWalletData(wallet);
    } catch (error) {
      message.error('Failed to load wallet data');
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  console.log("wallet info", walletData);

  // Load bank accounts
  const loadAccounts = async () => {
    setLoading(true);
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
    } catch (error) {
      message.error('Failed to load bank accounts');
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
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
    setLoading(true);
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
    } catch (error) {
      message.error('Failed to load bank transfers');
      console.error('Error loading transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const refreshAllData = async () => {
    await Promise.all([
      loadWalletData(),
      loadAccounts(),
      activeTab === 'transfers' && loadBankTransfers()
    ]);
  };

  useEffect(() => {
    loadWalletData();
    loadAccounts();
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

  // Handle deposit creation
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
      
      // Refresh all data
      await refreshAllData();
      
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
      loadBankTransfers();
    } catch (error) {
      message.error(error.message || 'Failed to create transfer');
    }
  };

  // Wallet Statistics
  const walletStats = useMemo(() => {
    if (!walletData) return null;

    const todayNetFlow = (walletData.todaysInflow || 0) - (walletData.todaysOutflow || 0);
    const balanceStatus = bankingService.getWalletBalanceStatus(walletData);

    return {
      currentBalance: walletData.currentBalance || 0,
      todaysInflow: walletData.todaysInflow || 0,
      todaysOutflow: walletData.todaysOutflow || 0,
      todayNetFlow,
      balanceStatus
    };
  }, [walletData]);

  // Format wallet data for display
  const formattedWallet = useMemo(() => {
    return walletData ? bankingService.formatStationWallet(walletData) : null;
  }, [walletData]);

  // Wallet Transactions Columns
  const walletColumns = [
    {
      title: 'Date & Time',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date, record) => record.formattedDate || bankingService.formatDateTime(date),
      sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeConfig = {
          'SHIFT_CASH_IN': { color: 'green', text: 'Shift Cash In' },
          'BANK_DEPOSIT': { color: 'blue', text: 'Bank Deposit' },
          'CASH_IN': { color: 'green', text: 'Cash In' },
          'CASH_OUT': { color: 'red', text: 'Cash Out' },
          'EXPENSE': { color: 'orange', text: 'Expense' },
          'ADJUSTMENT': { color: 'purple', text: 'Adjustment' }
        };
        const config = typeConfig[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description) => description || 'No description'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => (
        <span style={{ 
          color: amount >= 0 ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          {amount >= 0 ? '+' : '-'}{record.formattedAmount || bankingService.formatCurrency(Math.abs(amount))}
        </span>
      ),
      align: 'right'
    },
    {
      title: 'Previous Balance',
      key: 'previousBalance',
      render: (_, record) => (
        <span style={{ color: '#666' }}>
          {record.formattedPreviousBalance || bankingService.formatCurrency(record.previousBalance)}
        </span>
      ),
      align: 'right'
    },
    {
      title: 'New Balance',
      key: 'newBalance',
      render: (_, record) => (
        <span style={{ fontWeight: 'bold' }}>
          {record.formattedNewBalance || bankingService.formatCurrency(record.newBalance)}
        </span>
      ),
      align: 'right'
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <span>{record.recordedByDisplay}</span>
        </Space>
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
              onClick={() => handleViewTransaction(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Bank Transfers Columns
  const transferColumns = [
    {
      title: 'Transfer Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date, record) => record.formattedDate || bankingService.formatDateTime(date),
      sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    },
    {
      title: 'Reference',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      render: (ref) => ref ? <Tag color="blue">{ref}</Tag> : '-'
    },
    {
      title: 'Bank Account',
      key: 'bankAccount',
      render: (_, record) => 
        record.bankAccount ? 
          `${record.bankAccount.bank.name} - ${record.bankAccount.accountNumber}` : 
          'Unknown'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {record.formattedAmount || bankingService.formatCurrency(amount)}
        </span>
      ),
      align: 'right'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          COMPLETED: { color: 'green', text: 'Completed' },
          PENDING: { color: 'orange', text: 'Pending' },
          FAILED: { color: 'red', text: 'Failed' },
          CANCELLED: { color: 'default', text: 'Cancelled' }
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <span>{record.recordedByDisplay}</span>
        </Space>
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
              onClick={() => handleViewTransfer(record)}
            />
          </Tooltip>
          {record.status === 'PENDING' && (
            <Popconfirm
              title="Cancel Transfer"
              description="Are you sure you want to cancel this transfer?"
              onConfirm={() => handleCancelTransfer(record.id)}
            >
              <Button size="small" danger>
                Cancel
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  const handleViewTransaction = (transaction) => {
    Modal.info({
      title: 'Transaction Details',
      content: (
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Date & Time">
            {bankingService.formatDateTime(transaction.transactionDate)}
          </Descriptions.Item>
          <Descriptions.Item label="Type">
            <Tag color={
              transaction.type === 'SHIFT_CASH_IN' ? 'green' : 
              transaction.type === 'BANK_DEPOSIT' ? 'blue' : 'default'
            }>
              {transaction.type}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Amount">
            <span style={{ 
              color: transaction.amount >= 0 ? '#52c41a' : '#ff4d4f',
              fontWeight: 'bold'
            }}>
              {transaction.amount >= 0 ? '+' : '-'}{bankingService.formatCurrency(Math.abs(transaction.amount))}
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
            <Space>
              <UserOutlined />
              <span>
                {transaction.recordedBy ? 
                  `${transaction.recordedBy.firstName} ${transaction.recordedBy.lastName}` : 
                  'System'
                }
              </span>
            </Space>
          </Descriptions.Item>
          {transaction.shiftId && (
            <Descriptions.Item label="Shift ID">
              {transaction.shiftId}
            </Descriptions.Item>
          )}
        </Descriptions>
      ),
      width: 600
    });
  };

  const handleViewTransfer = (transfer) => {
    Modal.info({
      title: 'Transfer Details',
      content: (
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Transfer Date">
            {bankingService.formatDateTime(transfer.transactionDate)}
          </Descriptions.Item>
          <Descriptions.Item label="Reference">
            {transfer.referenceNumber || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Bank Account">
            {transfer.bankAccount ? 
              `${transfer.bankAccount.bank.name} - ${transfer.bankAccount.accountNumber}` : 
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
            {transfer.description}
          </Descriptions.Item>
          <Descriptions.Item label="Recorded By">
            <Space>
              <UserOutlined />
              <span>
                {transfer.recordedBy ? 
                  `${transfer.recordedBy.firstName} ${transfer.recordedBy.lastName}` : 
                  'System'
                }
              </span>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      ),
      width: 600
    });
  };

  const handleCancelTransfer = async (transferId) => {
    try {
      // await bankingService.cancelBankTransaction(transferId);
      message.success('Transfer cancelled successfully');
      loadBankTransfers();
    } catch (error) {
      message.error(error.message || 'Failed to cancel transfer');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>
                <WalletOutlined /> Station Banking Management
              </h2>
              <p style={{ margin: 0, color: '#666' }}>
                {isStationLevel ? 'Manage your station wallet and bank transfers' : 'Monitor station banking activities'}
              </p>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={refreshAllData}
                  loading={loading}
                >
                  Refresh
                </Button>
              </Col>
              {isStationLevel && (
                <Col>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setDepositModalVisible(true)}
                    disabled={!walletData || walletData.currentBalance <= 0}
                  >
                    Bank Deposit
                  </Button>
                </Col>
              )}
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Wallet Statistics */}
      {formattedWallet && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Current Balance"
                value={walletStats.currentBalance}
                formatter={value => bankingService.formatCurrency(value)}
                valueStyle={{ 
                  color: walletStats.balanceStatus.status === 'low' ? '#ff4d4f' : 
                         walletStats.balanceStatus.status === 'high' ? '#faad14' : '#52c41a'
                }}
                prefix={<WalletOutlined />}
              />
              {walletStats.balanceStatus.status !== 'normal' && (
                <div style={{ marginTop: 8, fontSize: '12px', color: '#ff4d4f' }}>
                  {walletStats.balanceStatus.message}
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Today's Inflow"
                value={walletStats.todaysInflow}
                formatter={value => bankingService.formatCurrency(value)}
                valueStyle={{ color: '#52c41a' }}
                prefix={<ArrowDownOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Today's Outflow"
                value={walletStats.todaysOutflow}
                formatter={value => bankingService.formatCurrency(value)}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<ArrowUpOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Net Flow Today"
                value={walletStats.todayNetFlow}
                formatter={value => bankingService.formatCurrency(value)}
                valueStyle={{ 
                  color: walletStats.todayNetFlow >= 0 ? '#52c41a' : '#ff4d4f'
                }}
                prefix={walletStats.todayNetFlow >= 0 ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Station Information */}
      {formattedWallet && (
        <Card size="small">
          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
            <Descriptions.Item label="Station">
              {formattedWallet.stationDisplay}
            </Descriptions.Item>
            <Descriptions.Item label="Opening Balance">
              {formattedWallet.openingBalanceDisplay}
            </Descriptions.Item>
            <Descriptions.Item label="Last Updated">
              {formattedWallet.lastUpdatedDisplay}
            </Descriptions.Item>
            {formattedWallet.minBalance && (
              <Descriptions.Item label="Minimum Balance">
                {formattedWallet.minBalanceDisplay}
              </Descriptions.Item>
            )}
            {formattedWallet.maxBalance && (
              <Descriptions.Item label="Maximum Balance">
                {formattedWallet.maxBalanceDisplay}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* Tabs Section */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'wallet',
              label: (
                <span>
                  <WalletOutlined />
                  Wallet Transactions ({transactions.length})
                </span>
              ),
              children: (
                <>
                  {/* Wallet Transactions Table */}
                  <Table
                    columns={walletColumns}
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
                </>
              )
            },
            {
              key: 'transfers',
              label: (
                <span>
                  <SwapOutlined />
                  Bank Transfers
                </span>
              ),
              children: (
                <>
                  {/* Filters */}
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <Row gutter={[8, 8]} align="middle">
                      <Col xs={24} sm={8} md={6}>
                        <Input
                          placeholder="Search transfers..."
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
                          <Option value="COMPLETED">Completed</Option>
                          <Option value="PENDING">Pending</Option>
                          <Option value="FAILED">Failed</Option>
                        </Select>
                      </Col>
                      <Col xs={12} sm={8} md={6}>
                        <RangePicker
                          style={{ width: '100%' }}
                          onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
                        />
                      </Col>
                    </Row>
                  </Card>

                  {/* Transfers Table */}
                  <Table
                    columns={transferColumns}
                    dataSource={transfers}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                      current: pagination.page,
                      pageSize: pagination.limit,
                      total: pagination.total,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => 
                        `Showing ${range[0]}-${range[1]} of ${total} transfers`,
                      onChange: (page, pageSize) => {
                        setPagination(prev => ({ ...prev, page, limit: pageSize }));
                      }
                    }}
                  />
                </>
              )
            }
          ]}
        />
      </Card>

      {/* Bank Deposit Modal */}
      <Modal
        title={
          <Space>
            <BankOutlined />
            Create Bank Deposit
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
        width={600}
        confirmLoading={submitting}
      >
        {formErrors.length > 0 && (
          <Alert
            message="Validation Error"
            description={
              <ul style={{ margin: 0, paddingLeft: '16px' }}>
                {formErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {walletData && (
          <Alert
            message="Available Balance"
            description={`You can deposit up to ${bankingService.formatCurrency(walletData.currentBalance)}`}
            type="info"
            showIcon
            icon={<ExclamationCircleOutlined />}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={depositForm}
          layout="vertical"
          onFinish={handleDepositSubmit}
          initialValues={{
            transactionMode: 'CASH'
          }}
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
              size="large"
              formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/KES\s?|(,*)/g, '')}
              onChange={handleAmountChange}
            />
          </Form.Item>

          <Form.Item
            name="bankAccountId"
            label="Bank Account"
            rules={[{ 
              required: true, 
              message: 'Please select bank account' 
            }]}
          >
            <Select 
              placeholder="Select bank account" 
              size="large"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {accounts.map(account => (
                <Option key={account.id} value={account.id}>
                  <Space>
                    <BankOutlined />
                    <span>
                      {account.bank?.name} - {account.accountNumber}
                      {account.accountName && ` (${account.accountName})`}
                    </span>
                    <Tag color="blue">
                      {bankingService.formatCurrency(account.currentBalance || 0)}
                    </Tag>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="transactionMode"
            label="Transaction Mode"
            rules={[{ required: true, message: 'Please select transaction mode' }]}
          >
            <Select placeholder="Select mode" size="large">
              <Option value="CASH">Cash</Option>
              <Option value="CHEQUE">Cheque</Option>
              <Option value="MPESA">M-Pesa</Option>
              <Option value="EFT">Electronic Fund Transfer (EFT)</Option>
              <Option value="RTGS">RTGS</Option>
              <Option value="INTERNAL_TRANSFER">Internal Transfer</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="referenceNumber"
            label="Reference Number (Optional)"
          >
            <Input
              placeholder="e.g., CHQ-001, MT-2024"
              size="large"
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (Optional)"
            rules={[
              { max: 500, message: 'Description cannot exceed 500 characters' }
            ]}
          >
            <Input.TextArea
              placeholder="Enter deposit description"
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Transfer Modal (if needed for other types of transfers) */}
      <Modal
        title={
          <Space>
            <SwapOutlined />
            Create Transfer
          </Space>
        }
        open={transferModalVisible}
        onCancel={() => {
          setTransferModalVisible(false);
          transferForm.resetFields();
        }}
        onOk={() => transferForm.submit()}
        okText="Create Transfer"
        cancelText="Cancel"
        width={500}
      >
        <Form
          form={transferForm}
          layout="vertical"
          onFinish={handleTransferSubmit}
        >
          {/* Transfer form fields would go here */}
        </Form>
      </Modal>
    </div>
  );
};

export default AccountsManagement;