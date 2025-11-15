// src/components/debtors/DebtorTransactions.jsx
import React, { useState, useEffect, useMemo } from 'react';
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
  Avatar,
  Tabs,
  DatePicker,
  Divider,
  List,
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
  UserOutlined,
  DollarOutlined,
  ReloadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TransactionOutlined,
  TeamOutlined,
  ShopOutlined,
  CreditCardOutlined
} from '@ant-design/icons';
import { debtorTransactionService } from '../../../../services/debtorTransactionService/debtorTransactionService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const DebtorTransactions = ({ stationId, debtorId, debtorName, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    startDate: dayjs().subtract(30, 'days'),
    endDate: dayjs()
  });
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');

  // Fetch debtor transactions
  const fetchDebtorTransactions = async () => {
    if (!stationId || !debtorId) {
      message.error('Station ID and Debtor ID are required');
      return;
    }

    setLoading(true);
    try {
      const result = await debtorTransactionService.getDebtorTransactions(
        stationId, 
        debtorId, 
        filters
      );
      
      console.log("Transactions data:", result);
      setData(result);
      setTransactions(result.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      message.error(error.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stationId && debtorId) {
      fetchDebtorTransactions();
    }
  }, [stationId, debtorId, filters]);

  // Handle settle transaction
  const handleSettleTransaction = async (values) => {
    try {
      await debtorTransactionService.settleDebtorTransaction(selectedTransaction.id, values);
      message.success('Transaction settled successfully');
      setSettleModalVisible(false);
      setSelectedTransaction(null);
      fetchDebtorTransactions();
    } catch (error) {
      message.error(error.message || 'Failed to settle transaction');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!data) return null;

    const outstandingTransactions = transactions.filter(t => t.status === 'OUTSTANDING');
    const totalOutstanding = outstandingTransactions.reduce((sum, t) => sum + t.amount, 0);
    const settledTransactions = transactions.filter(t => t.status === 'SETTLED');
    
    return {
      totalTransactions: transactions.length,
      outstandingCount: outstandingTransactions.length,
      settledCount: settledTransactions.length,
      totalOutstanding,
      totalSettled: settledTransactions.reduce((sum, t) => sum + t.amount, 0),
      averageTransaction: transactions.length > 0 
        ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length 
        : 0
    };
  }, [data, transactions]);

  // Transaction columns
  const transactionColumns = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color={type === 'DEBIT' ? 'red' : 'green'}>
          {type}
        </Tag>
      ),
      filters: [
        { text: 'Debit', value: 'DEBIT' },
        { text: 'Credit', value: 'CREDIT' }
      ],
      onFilter: (value, record) => record.type === value
    },
    {
      title: 'Shift',
      dataIndex: ['shift', 'shiftNumber'],
      key: 'shiftNumber',
      width: 120,
      render: (shiftNumber) => shiftNumber || 'N/A'
    },
    {
      title: 'Island',
      dataIndex: ['islandCollection', 'island', 'code'],
      key: 'islandCode',
      width: 120,
      render: (code) => code || 'N/A'
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
      render: (amount, record) => (
        <Text strong type={record.type === 'DEBIT' ? "danger" : "success"}>
          {formatCurrency(amount)}
        </Text>
      ),
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: 'Previous Balance',
      dataIndex: 'previousBalance',
      key: 'previousBalance',
      width: 140,
      render: (balance) => formatCurrency(balance)
    },
    {
      title: 'New Balance',
      dataIndex: 'newBalance',
      key: 'newBalance',
      width: 140,
      render: (balance) => formatCurrency(balance)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={
          status === 'SETTLED' ? 'green' :
          status === 'OUTSTANDING' ? 'orange' :
          status === 'OVERDUE' ? 'red' : 'default'
        }>
          {status}
        </Tag>
      ),
      filters: [
        { text: 'Outstanding', value: 'OUTSTANDING' },
        { text: 'Settled', value: 'SETTLED' },
        { text: 'Overdue', value: 'OVERDUE' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Recorded By',
      dataIndex: ['recordedBy', 'firstName'],
      key: 'recordedBy',
      width: 120,
      render: (firstName, record) => 
        `${firstName || ''} ${record.recordedBy?.lastName || ''}`.trim() || 'N/A'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => setSelectedTransaction(record)}
            />
          </Tooltip>
          {record.status === 'OUTSTANDING' && (
            <Tooltip title="Settle Transaction">
              <Button 
                icon={<CheckCircleOutlined />} 
                size="small"
                type="primary"
                onClick={() => {
                  setSelectedTransaction(record);
                  setSettleModalVisible(true);
                }}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  // Transaction Detail Modal
  const TransactionDetailModal = () => {
    if (!selectedTransaction) return null;

    return (
      <Modal
        title="Transaction Details"
        open={!!selectedTransaction && !settleModalVisible}
        onCancel={() => setSelectedTransaction(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedTransaction(null)}>
            Close
          </Button>
        ]}
        width={700}
      >
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Transaction Date">
            {dayjs(selectedTransaction.transactionDate).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Type">
            <Tag color={selectedTransaction.type === 'DEBIT' ? 'red' : 'green'}>
              {selectedTransaction.type}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Amount">
            <Text strong type={selectedTransaction.type === 'DEBIT' ? "danger" : "success"}>
              {formatCurrency(selectedTransaction.amount)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Previous Balance">
            {formatCurrency(selectedTransaction.previousBalance)}
          </Descriptions.Item>
          <Descriptions.Item label="New Balance">
            {formatCurrency(selectedTransaction.newBalance)}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={
              selectedTransaction.status === 'SETTLED' ? 'green' :
              selectedTransaction.status === 'OUTSTANDING' ? 'orange' : 'red'
            }>
              {selectedTransaction.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Description">
            {selectedTransaction.description}
          </Descriptions.Item>
          <Descriptions.Item label="Shift">
            {selectedTransaction.shift?.shiftNumber || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Island">
            {selectedTransaction.islandCollection?.island?.code || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Attendant">
            {selectedTransaction.islandCollection?.attendant 
              ? `${selectedTransaction.islandCollection.attendant.firstName} ${selectedTransaction.islandCollection.attendant.lastName}`
              : 'N/A'
            }
          </Descriptions.Item>
          <Descriptions.Item label="Recorded By">
            {selectedTransaction.recordedBy 
              ? `${selectedTransaction.recordedBy.firstName} ${selectedTransaction.recordedBy.lastName}`
              : 'N/A'
            }
          </Descriptions.Item>
          <Descriptions.Item label="Created At">
            {dayjs(selectedTransaction.createdAt).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    );
  };

  // Settle Transaction Modal
  const SettleTransactionModal = () => {
    const [form] = Form.useForm();

    return (
      <Modal
        title="Settle Transaction"
        open={settleModalVisible}
        onCancel={() => {
          setSettleModalVisible(false);
          setSelectedTransaction(null);
        }}
        footer={null}
        width={500}
      >
        {selectedTransaction && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSettleTransaction}
            initialValues={{
              paymentMethod: 'CASH',
              settlementDate: dayjs()
            }}
          >
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Debtor">
                {debtorName}
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <Text strong type="danger">
                  {formatCurrency(selectedTransaction.amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedTransaction.description}
              </Descriptions.Item>
              <Descriptions.Item label="Current Balance">
                {formatCurrency(selectedTransaction.newBalance)}
              </Descriptions.Item>
            </Descriptions>

            <Form.Item
              name="paymentMethod"
              label="Payment Method"
              rules={[{ required: true, message: 'Please select payment method' }]}
            >
              <Select placeholder="Select payment method">
                <Option value="CASH">Cash</Option>
                <Option value="MOBILE_MONEY">Mobile Money</Option>
                <Option value="BANK_TRANSFER">Bank Transfer</Option>
                <Option value="CHEQUE">Cheque</Option>
                <Option value="CREDIT_CARD">Credit Card</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="paymentReference"
              label="Payment Reference"
              rules={[{ required: true, message: 'Please enter payment reference' }]}
            >
              <Input placeholder="Reference number, transaction ID, etc." />
            </Form.Item>

            <Form.Item
              name="settlementDate"
              label="Settlement Date"
              rules={[{ required: true, message: 'Please select settlement date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notes"
            >
              <TextArea placeholder="Additional notes..." rows={3} />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Settle Transaction
                </Button>
                <Button onClick={() => {
                  setSettleModalVisible(false);
                  setSelectedTransaction(null);
                }}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    );
  };

  // Overview Tab
  const OverviewTab = () => {
    if (!data) return <Empty description="No data available" />;

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Transactions"
                value={summaryStats?.totalTransactions || 0}
                prefix={<TransactionOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Outstanding"
                value={summaryStats?.outstandingCount || 0}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Outstanding"
                value={summaryStats?.totalOutstanding || 0}
                valueStyle={{ color: '#cf1322' }}
                prefix={<DollarOutlined />}
                formatter={value => formatCurrency(value)}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Average Transaction"
                value={summaryStats?.averageTransaction || 0}
                prefix={<DollarOutlined />}
                formatter={value => formatCurrency(value)}
              />
            </Card>
          </Col>
        </Row>

        {/* Debtor Account Info */}
        <Card title="Debtor Account Information" size="small">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Debtor Name">
              <Text strong>{data.debtorAccount?.debtor?.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Current Debt">
              <Text strong type="danger">
                {formatCurrency(data.debtorAccount?.currentDebt)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Contact Person">
              {data.debtorAccount?.debtor?.contactPerson || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {data.debtorAccount?.debtor?.phone || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Credit Limit">
              {formatCurrency(data.debtorAccount?.debtor?.creditLimit)}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Terms">
              {data.debtorAccount?.debtor?.paymentTerms || 'N/A'} days
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Recent Transactions */}
        <Card title="Recent Transactions" size="small">
          <Table
            columns={transactionColumns}
            dataSource={transactions.slice(0, 5)}
            loading={loading}
            size="small"
            pagination={false}
          />
        </Card>
      </div>
    );
  };

  // Transactions Tab
  const TransactionsTab = () => {
    return (
      <div className="space-y-4">
        <Card
          title={`All Transactions (${transactions.length})`}
          extra={
            <Space>
              <Button 
                icon={<DownloadOutlined />}
                onClick={() => {
                  // Export functionality
                  message.info('Export feature coming soon');
                }}
              >
                Export
              </Button>
            </Space>
          }
        >
          <Table
            columns={transactionColumns}
            dataSource={transactions}
            loading={loading}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} transactions`
            }}
          />
        </Card>
      </div>
    );
  };

  if (!stationId || !debtorId) {
    return (
      <Alert
        message="Missing Information"
        description="Station ID and Debtor ID are required to view transactions."
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card size="small">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={0}>
              <Title level={4} style={{ margin: 0 }}>
                {debtorName} - Transactions
              </Title>
              <Text type="secondary">
                Station: {stationId.substring(0, 8)}... • 
                Current Debt: {data ? formatCurrency(data.debtorAccount?.currentDebt) : 'Loading...'}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchDebtorTransactions}
                loading={loading}
              >
                Refresh
              </Button>
              <Button onClick={onClose}>
                Close
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Select
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              placeholder="Filter by Status"
              allowClear
            >
              <Option value="OUTSTANDING">Outstanding</Option>
              <Option value="SETTLED">Settled</Option>
              <Option value="OVERDUE">Overdue</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              style={{ width: '100%' }}
              value={filters.type}
              onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              placeholder="Filter by Type"
              allowClear
            >
              <Option value="DEBIT">Debit</Option>
              <Option value="CREDIT">Credit</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={[filters.startDate, filters.endDate]}
              onChange={(dates) => setFilters(prev => ({
                ...prev,
                startDate: dates?.[0],
                endDate: dates?.[1]
              }))}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Button 
              icon={<FilterOutlined />}
              onClick={() => setFilters({
                search: '',
                status: '',
                type: '',
                startDate: dayjs().subtract(30, 'days'),
                endDate: dayjs()
              })}
              block
            >
              Reset Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Content */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: (
                <span>
                  <BarChartOutlined />
                  Overview
                </span>
              ),
              children: <OverviewTab />
            },
            {
              key: 'transactions',
              label: (
                <span>
                  <TransactionOutlined />
                  All Transactions
                </span>
              ),
              children: <TransactionsTab />
            }
          ]}
        />
      </Card>

      {/* Modals */}
      <TransactionDetailModal />
      <SettleTransactionModal />
    </div>
  );
};

export default DebtorTransactions;