// src/components/debtor/PaymentsManagement.jsx
import React, { useState, useEffect } from 'react';
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
  DatePicker,
  Modal,
  Descriptions,
  message
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { debtorService } from '../../../../services/debtorService/debtorService';
import { useApp } from '../../../../context/AppContext';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Search } = Input;

const PaymentsManagement = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  });
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    paymentMethod: '',
    status: '',
    debtorId: '',
    stationId: '',
    dateRange: null,
    page: 1,
    limit: 10,
    sortBy: 'transactionDate',
    sortOrder: 'desc'
  });

  const currentCompany = state.currentUser?.companyId;

  // Fetch all payment transactions
  const fetchPayments = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      console.log("🔄 Fetching payments with filters:", filters);
      
      // Get all debtors first, then aggregate their payment transactions
      const result = await debtorService.getDebtors({
        ...filters,
        includeTransactions: true
      });
      
      console.log("📦 Payments response:", result);
      
      // Extract all payment transactions from debtors
      const allPayments = [];
      const debtorsData = result.debtors || result.data || [];
      
      debtorsData.forEach(debtor => {
        if (debtor.transactions) {
          debtor.transactions.forEach(transaction => {
            if (transaction.type === 'PAYMENT_RECEIVED') {
              allPayments.push({
                ...transaction,
                debtor: debtor,
                station: transaction.stationDebtorAccount?.station
              });
            }
          });
        }
        
        // Also check station accounts for transactions
        if (debtor.stationAccounts) {
          debtor.stationAccounts.forEach(account => {
            if (account.transactions) {
              account.transactions.forEach(transaction => {
                if (transaction.type === 'PAYMENT_RECEIVED') {
                  allPayments.push({
                    ...transaction,
                    debtor: debtor,
                    station: account.station
                  });
                }
              });
            }
          });
        }
      });
      
      console.log(`✅ Retrieved ${allPayments.length} payment records`);
      
      // Apply additional filtering
      let filteredPayments = allPayments;
      
      if (filters.paymentMethod) {
        filteredPayments = filteredPayments.filter(payment => payment.paymentMethod === filters.paymentMethod);
      }
      
      if (filters.status) {
        filteredPayments = filteredPayments.filter(payment => payment.status === filters.status);
      }
      
      if (filters.dateRange) {
        filteredPayments = filteredPayments.filter(payment => {
          const paymentDate = new Date(payment.transactionDate);
          return paymentDate >= filters.dateRange[0] && paymentDate <= filters.dateRange[1];
        });
      }
      
      setPayments(filteredPayments);
      setPagination({
        page: 1,
        limit: 10,
        totalCount: filteredPayments.length,
        totalPages: Math.ceil(filteredPayments.length / 10)
      });
      
    } catch (error) {
      console.error('❌ Failed to fetch payments:', error);
      message.error('Failed to load payment records');
      setPayments([]);
      setPagination({
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch payment statistics
  const [statistics, setStatistics] = useState(null);
  const fetchStatistics = async () => {
    try {
      // This would call a dedicated payments statistics endpoint
      const stats = await debtorService.getDebtorStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchStatistics();
  }, [currentCompany, filters.page, filters.limit, filters.paymentMethod, filters.status, filters.dateRange]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1
    }));
  };

  // Handle table pagination
  const handleTableChange = (newPagination) => {
    setFilters(prev => ({
      ...prev,
      page: newPagination.current,
      limit: newPagination.pageSize
    }));
  };

  // Handle actions
  const handleViewDetails = (payment) => {
    setPaymentDetails(payment);
    setShowDetailsModal(true);
  };

  // Status configurations
  const getPaymentStatusConfig = (status) => {
    const config = {
      'SETTLED': { color: 'green', label: 'Completed', badge: 'success', icon: <CheckCircleOutlined /> },
      'PENDING': { color: 'orange', label: 'Pending', badge: 'processing', icon: <SyncOutlined spin /> },
      'CANCELLED': { color: 'red', label: 'Cancelled', badge: 'error', icon: <CloseCircleOutlined /> },
      'FAILED': { color: 'red', label: 'Failed', badge: 'error', icon: <CloseCircleOutlined /> }
    };
    return config[status] || config.PENDING;
  };

  const getPaymentMethodConfig = (method) => {
    const config = {
      'CASH': { color: 'green', label: 'Cash' },
      'MOBILE_MONEY': { color: 'blue', label: 'Mobile Money' },
      'BANK_TRANSFER': { color: 'purple', label: 'Bank Transfer' },
      'VISA': { color: 'orange', label: 'Visa' },
      'MASTERCARD': { color: 'red', label: 'Mastercard' },
      'CHEQUE': { color: 'cyan', label: 'Cheque' },
      'OTHER': { color: 'default', label: 'Other' }
    };
    return config[method] || config.OTHER;
  };

  // Table columns
  const columns = [
    {
      title: 'Debtor',
      dataIndex: ['debtor', 'name'],
      key: 'debtorName',
      width: 180,
      render: (name, record) => (
        <Space>
          <UserOutlined />
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.debtor?.phone}
          </Text>
        </Space>
      )
    },
    {
      title: 'Station',
      dataIndex: ['station', 'name'],
      key: 'station',
      width: 150,
      render: (name) => name || 'N/A'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => (
        <Text strong type="success">
          {debtorService.formatCurrency(amount)}
        </Text>
      ),
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 140,
      render: (method) => {
        const config = getPaymentMethodConfig(method);
        return <Tag color={config.color}>{config.label}</Tag>;
      }
    },
    {
      title: 'Reference',
      dataIndex: 'referenceNumber',
      key: 'reference',
      width: 150,
      render: (ref) => ref || 'N/A',
      ellipsis: true
    },
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'date',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const config = getPaymentStatusConfig(record.status);
        return (
          <Badge status={config.badge} text={config.label} />
        );
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (desc) => desc || 'N/A',
      ellipsis: true
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Format payments for display
  const formattedPayments = payments.map(payment => ({
    ...payment,
    key: payment.id
  }));

  // Statistics calculations
  const stats = {
    total: pagination.totalCount,
    totalAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
    completed: payments.filter(p => p.status === 'SETTLED').length,
    pending: payments.filter(p => p.status === 'PENDING').length
  };

  // Payment method breakdown
  const paymentMethodBreakdown = payments.reduce((acc, payment) => {
    const method = payment.paymentMethod || 'OTHER';
    if (!acc[method]) {
      acc[method] = { count: 0, amount: 0 };
    }
    acc[method].count++;
    acc[method].amount += payment.amount;
    return acc;
  }, {});

  // Payment Details Modal
  const PaymentDetailsModal = ({ payment, visible, onClose }) => {
    if (!payment) return null;

    const statusConfig = getPaymentStatusConfig(payment.status);
    const methodConfig = getPaymentMethodConfig(payment.paymentMethod);

    return (
      <Modal
        title={`Payment Details - ${payment.debtor?.name}`}
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>
        ]}
        width={600}
      >
        <div className="space-y-4">
          {/* Basic Information */}
          <Card size="small" title="Payment Information">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Debtor">{payment.debtor?.name}</Descriptions.Item>
              <Descriptions.Item label="Phone">{payment.debtor?.phone}</Descriptions.Item>
              <Descriptions.Item label="Station">{payment.station?.name || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Amount">
                <Text strong type="success">
                  {debtorService.formatCurrency(payment.amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                <Tag color={methodConfig.color}>{methodConfig.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={statusConfig.badge} text={statusConfig.label} />
              </Descriptions.Item>
              <Descriptions.Item label="Reference">
                {payment.referenceNumber || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Transaction Date">
                {new Date(payment.transactionDate).toLocaleDateString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Description & Notes */}
          {(payment.description || payment.notes) && (
            <Card size="small" title="Additional Information">
              <Space direction="vertical" style={{ width: '100%' }}>
                {payment.description && (
                  <div>
                    <Text strong>Description: </Text>
                    <Text>{payment.description}</Text>
                  </div>
                )}
                {payment.notes && (
                  <div>
                    <Text strong>Notes: </Text>
                    <Text>{payment.notes}</Text>
                  </div>
                )}
              </Space>
            </Card>
          )}

          {/* Balance Impact */}
          <Card size="small" title="Balance Impact">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Debt Before"
                  value={debtorService.formatCurrency(payment.debtBefore || 0)}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Debt After"
                  value={debtorService.formatCurrency(payment.debtAfter || 0)}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Text strong>Reduction: </Text>
              <Text type="success">
                {debtorService.formatCurrency((payment.debtBefore || 0) - (payment.debtAfter || 0))}
              </Text>
            </div>
          </Card>
        </div>
      </Modal>
    );
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
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Title level={2} style={{ margin: 0 }}>Payments Management</Title>
            <Text type="secondary">
              Track and manage all debtor payments and settlements
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Payments"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Collected"
              value={debtorService.formatCurrency(stats.totalAmount)}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CreditCardOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Completed"
              value={stats.completed}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Pending"
              value={stats.pending}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Payment Method Breakdown */}
      <Card title="Payment Method Breakdown">
        <Row gutter={16}>
          {Object.entries(paymentMethodBreakdown).map(([method, data]) => {
            const config = getPaymentMethodConfig(method);
            return (
              <Col span={4} key={method}>
                <Card 
                  size="small" 
                  style={{ borderLeft: `4px solid ${config.color === 'default' ? '#d9d9d9' : config.color}` }}
                >
                  <Statistic
                    title={config.label}
                    value={data.count}
                    valueStyle={{ color: config.color === 'default' ? '#000' : config.color }}
                    suffix={`(${debtorService.formatCurrency(data.amount)})`}
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* Recent Activity Trend */}
      {statistics && statistics.recentTransactions && (
        <Card title="Recent Payment Activity">
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Last 7 Days"
                value={debtorService.formatCurrency(
                  statistics.recentTransactions
                    .filter(t => t.type === 'PAYMENT_RECEIVED')
                    .slice(0, 7)
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Average Payment"
                value={debtorService.formatCurrency(stats.totalAmount / stats.total || 0)}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Success Rate"
                value={((stats.completed / stats.total) * 100).toFixed(1)}
                suffix="%"
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder="Search by debtor or reference..."
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              onSearch={fetchPayments}
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Payment Method"
              value={filters.paymentMethod}
              onChange={(value) => handleFilterChange({ paymentMethod: value })}
              allowClear
            >
              <Option value="CASH">Cash</Option>
              <Option value="MOBILE_MONEY">Mobile Money</Option>
              <Option value="BANK_TRANSFER">Bank Transfer</Option>
              <Option value="VISA">Visa</Option>
              <Option value="MASTERCARD">Mastercard</Option>
              <Option value="CHEQUE">Cheque</Option>
              <Option value="OTHER">Other</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange({ status: value })}
              allowClear
            >
              <Option value="SETTLED">Completed</Option>
              <Option value="PENDING">Pending</Option>
              <Option value="CANCELLED">Cancelled</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange({ dateRange: dates })}
            />
          </Col>
          <Col span={4}>
            <Space>
              <Button 
                icon={<SearchOutlined />}
                onClick={fetchPayments}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                icon={<FilterOutlined />}
                onClick={() => {
                  handleFilterChange({
                    search: '',
                    paymentMethod: '',
                    status: '',
                    dateRange: null,
                    page: 1
                  });
                }}
              >
                Clear
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Payments Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={formattedPayments}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} payment records`
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: loading ? 
              'Loading payment records...' : 
              filters.search || filters.paymentMethod ? 
                'No payments match your filters' : 
                'No payment records found. Record your first payment to get started.'
          }}
        />
      </Card>

      {/* Payment Details Modal */}
      {paymentDetails && (
        <PaymentDetailsModal
          payment={paymentDetails}
          visible={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setPaymentDetails(null);
          }}
        />
      )}
    </div>
  );
};

export default PaymentsManagement;