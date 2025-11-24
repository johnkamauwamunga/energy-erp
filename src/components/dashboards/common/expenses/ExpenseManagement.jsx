import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Popconfirm,
  Modal,
  Form,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  DatePicker,
  InputNumber,
  Badge,
  Typography
} from 'antd';
import {
  DollarOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  FilterOutlined,
  ShopOutlined,
  UserOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  TransactionOutlined
} from '@ant-design/icons';
import { expenseService } from '../../../../services/expenseService/expenseService';
import { useApp } from '../../../../context/AppContext';
import CreateExpenseModal from './CreateExpenseModal';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

const ExpenseManagement = () => {
  const { state } = useApp();
  const userStationId = state.currentStation?.id;
  const userRole = state.currentUser?.role;
  
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    paymentSource: '',
    startDate: '',
    endDate: ''
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editForm] = Form.useForm();
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Load expenses using getExpenses()
  const loadExpenses = async () => {
    if (!userStationId) {
      message.warning('Please select a station first');
      return;
    }

    setLoading(true);
    try {
      const result = await expenseService.getExpenses();
      
      console.log("📊 Management data loaded:", result);
      
      // Filter expenses by current station if needed
      const stationExpenses = Array.isArray(result) 
        ? result.filter(expense => expense.stationId === userStationId)
        : [];
      
      setExpenses(stationExpenses);
      setPagination(prev => ({
        ...prev,
        total: stationExpenses.length
      }));
      
    } catch (error) {
      message.error('Failed to load expenses');
      console.error('❌ Error loading expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userStationId) {
      loadExpenses();
    }
  }, [userStationId]);

  // Handle create modal
  const handleShowCreateModal = () => {
    setCreateModalVisible(true);
  };

  const handleCreateSuccess = () => {
    console.log("✅ Expense created successfully, refreshing data...");
    loadExpenses(); // Refresh the data
    setCreateModalVisible(false); // Close the create modal
  };

  const handleCreateCancel = () => {
    setCreateModalVisible(false);
  };

  // Handle edit
  const handleEdit = (expense) => {
    setEditingExpense(expense);
    editForm.setFieldsValue({
      title: expense.title,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      paymentSource: expense.paymentSource
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async (values) => {
    setLoading(true);
    try {
      const result = await expenseService.updateExpense(editingExpense.id, values);
      if (result.success) {
        message.success('Expense updated successfully');
        setEditModalVisible(false);
        setEditingExpense(null);
        loadExpenses();
      } else {
        message.error(result.message || 'Failed to update expense');
      }
    } catch (error) {
      message.error(error.message || 'Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (expenseId) => {
    try {
      const result = await expenseService.deleteExpense(expenseId);
      if (result.success) {
        message.success('Expense deleted successfully');
        loadExpenses();
      } else {
        message.error(result.message || 'Failed to delete expense');
      }
    } catch (error) {
      message.error(error.message || 'Failed to delete expense');
    }
  };

  // Handle approve
  const handleApprove = async (expenseId) => {
    try {
      const result = await expenseService.approveExpense(expenseId);
      if (result.success) {
        message.success('Expense approved successfully');
        loadExpenses();
      } else {
        message.error(result.message || 'Failed to approve expense');
      }
    } catch (error) {
      message.error(error.message || 'Failed to approve expense');
    }
  };

  // Handle reject
  const handleReject = async (expenseId) => {
    try {
      const result = await expenseService.rejectExpense(expenseId, 'Rejected by manager');
      if (result.success) {
        message.success('Expense rejected successfully');
        loadExpenses();
      } else {
        message.error(result.message || 'Failed to reject expense');
      }
    } catch (error) {
      message.error(error.message || 'Failed to reject expense');
    }
  };

  // Handle view
  const handleView = (expense) => {
    setViewingExpense(expense);
    setViewModalVisible(true);
  };

  // Table columns with additional fields
  const columns = [
    {
      title: 'Expense #',
      dataIndex: 'expenseNumber',
      key: 'expenseNumber',
      width: 120,
      fixed: 'left',
      render: (expenseNumber) => (
        <Text strong style={{ fontSize: '12px' }}>
          {expenseNumber}
        </Text>
      )
    },
    {
      title: 'Expense Details',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (title, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: '14px' }}>
            <DollarOutlined style={{ marginRight: 4 }} />
            {title}
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {expenseService.getCategoryDisplay(record.category)}
          </Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: '10px' }} ellipsis>
              {record.description}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => (
        <Text strong style={{ color: '#cf1322', fontSize: '14px' }}>
          {expenseService.formatCurrency(amount)}
        </Text>
      ),
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: 'Payment Source',
      dataIndex: 'paymentSource',
      key: 'paymentSource',
      width: 140,
      render: (source) => (
        <Tag color="blue">
          {expenseService.getPaymentSourceDisplay(source)}
        </Tag>
      )
    },
    {
      title: 'Shift Context',
      key: 'context',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.shift && (
            <Text style={{ fontSize: '11px' }}>
              🕐 {record.shift.shiftNumber}
            </Text>
          )}
          {record.island && (
            <Text style={{ fontSize: '11px' }}>
              🏝️ {record.island.code}
            </Text>
          )}
          {!record.shift && !record.island && (
            <Text type="secondary" style={{ fontSize: '10px' }}>
              General Expense
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      width: 140,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: '11px' }}>
            <UserOutlined /> {record.recordedBy?.firstName} {record.recordedBy?.lastName}
          </Text>
          <Text type="secondary" style={{ fontSize: '9px' }}>
            {record.recordedBy?.email}
          </Text>
        </Space>
      )
    },
    {
      title: 'Wallet Transaction',
      key: 'walletTransaction',
      width: 120,
      render: (_, record) => (
        record.walletTransaction ? (
          <Tag color="green" icon={<TransactionOutlined />}>
            Paid
          </Tag>
        ) : (
          <Tag color="default">No Transaction</Tag>
        )
      )
    },
    {
      title: 'Expense Date',
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      width: 150,
      render: (date) => (
        <Space direction="vertical" size={1}>
          <Text style={{ fontSize: '11px' }}>
            <CalendarOutlined /> {expenseService.formatDate(date)}
          </Text>
        </Space>
      ),
      sorter: (a, b) => new Date(a.expenseDate) - new Date(b.expenseDate)
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => (
        <Text type="secondary" style={{ fontSize: '10px' }}>
          {expenseService.formatDate(date)}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={expenseService.getStatusColor(status)}>
            {expenseService.getStatusDisplay(status)}
          </Tag>
          {record.approvedBy && (
            <Text type="secondary" style={{ fontSize: '9px' }}>
              By: {record.approvedBy?.firstName}
            </Text>
          )}
        </Space>
      ),
      filters: [
        { text: 'Draft', value: 'DRAFT' },
        { text: 'Pending Approval', value: 'PENDING_APPROVAL' },
        { text: 'Approved', value: 'APPROVED' },
        { text: 'Rejected', value: 'REJECTED' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>
          
          {/* Edit - Only for pending expenses or by original recorder */}
          {(record.status === 'PENDING_APPROVAL' || record.status === 'DRAFT') && (
            <Tooltip title="Edit">
              <Button 
                icon={<EditOutlined />} 
                size="small"
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
          )}
          
          {/* Approve/Reject - Only for managers and pending expenses */}
          {['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER', 'STATION_MANAGER'].includes(userRole) && 
           record.status === 'PENDING_APPROVAL' && (
            <>
              <Tooltip title="Approve">
                <Popconfirm
                  title="Approve Expense"
                  description="Are you sure you want to approve this expense?"
                  onConfirm={() => handleApprove(record.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button 
                    icon={<CheckCircleOutlined />} 
                    size="small"
                    type="primary"
                  />
                </Popconfirm>
              </Tooltip>
              <Tooltip title="Reject">
                <Popconfirm
                  title="Reject Expense"
                  description="Are you sure you want to reject this expense?"
                  onConfirm={() => handleReject(record.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button 
                    icon={<CloseCircleOutlined />} 
                    size="small"
                    danger
                  />
                </Popconfirm>
              </Tooltip>
            </>
          )}
          
          {/* Delete - Only for pending/draft expenses */}
          {(record.status === 'PENDING_APPROVAL' || record.status === 'DRAFT') && (
            <Popconfirm
              title="Delete Expense"
              description="Are you sure you want to delete this expense?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete">
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small"
                  danger
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  // Statistics
  const stats = useMemo(() => {
    const total = expenses.length;
    const pending = expenses.filter(e => e.status === 'PENDING_APPROVAL').length;
    const approved = expenses.filter(e => e.status === 'APPROVED').length;
    const rejected = expenses.filter(e => e.status === 'REJECTED').length;
    const draft = expenses.filter(e => e.status === 'DRAFT').length;
    
    const totalAmount = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const pendingAmount = expenses
      .filter(e => e.status === 'PENDING_APPROVAL')
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const approvedAmount = expenses
      .filter(e => e.status === 'APPROVED')
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const rejectedAmount = expenses
      .filter(e => e.status === 'REJECTED')
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    return { 
      total, 
      pending, 
      approved, 
      rejected,
      draft,
      totalAmount, 
      pendingAmount,
      approvedAmount,
      rejectedAmount
    };
  }, [expenses]);

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    setFilters(prev => ({
      ...prev,
      startDate: dates?.[0]?.toISOString() || '',
      endDate: dates?.[1]?.toISOString() || ''
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      status: '',
      paymentSource: '',
      startDate: '',
      endDate: ''
    });
  };

  // Handle search input
  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  // Filter expenses based on filters
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.title.toLowerCase().includes(searchLower) ||
        expense.description?.toLowerCase().includes(searchLower) ||
        expense.expenseNumber.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category) {
      filtered = filtered.filter(expense => expense.category === filters.category);
    }

    if (filters.status) {
      filtered = filtered.filter(expense => expense.status === filters.status);
    }

    if (filters.paymentSource) {
      filtered = filtered.filter(expense => expense.paymentSource === filters.paymentSource);
    }

    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.expenseDate);
        return expenseDate >= new Date(filters.startDate) && expenseDate <= new Date(filters.endDate);
      });
    }

    return filtered;
  }, [expenses, filters]);

  if (!userStationId) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <DollarOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
          <Text type="secondary">
            Please select a station to view expenses
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>
                <DollarOutlined /> Expense Management
              </h2>
              <p style={{ margin: 0, color: '#666' }}>
                Track and manage station expenses for {state.currentStation?.name}
              </p>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadExpenses}
                  loading={loading}
                >
                  Refresh
                </Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleShowCreateModal}
                >
                  New Expense
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Total Expenses"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Pending Approval"
              value={stats.pending}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Approved"
              value={stats.approved}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Rejected"
              value={stats.rejected}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Total Amount"
              value={stats.totalAmount}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Pending Amount"
              value={stats.pendingAmount}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search expenses..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Category"
              value={filters.category}
              onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              allowClear
            >
              {expenseService.getCategoryOptions().map(category => (
                <Option key={category.value} value={category.value}>
                  {category.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              allowClear
            >
              {expenseService.getStatusOptions().map(status => (
                <Option key={status.value} value={status.value}>
                  {status.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Payment Source"
              value={filters.paymentSource}
              onChange={(value) => setFilters(prev => ({ ...prev, paymentSource: value }))}
              allowClear
            >
              {expenseService.getPaymentSourceOptions().map(source => (
                <Option key={source.value} value={source.value}>
                  {source.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
              onChange={handleDateRangeChange}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Space>
              <Button 
                icon={<FilterOutlined />}
                onClick={clearFilters}
              >
                Clear
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Expenses Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredExpenses}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: filteredExpenses.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} expenses`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ 
                ...prev, 
                page, 
                limit: pageSize 
              }));
            }
          }}
          scroll={{ x: 1800 }}
          size="middle"
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            Edit Expense
          </Space>
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingExpense(null);
        }}
        onOk={() => editForm.submit()}
        okText="Update Expense"
        cancelText="Cancel"
        confirmLoading={loading}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Form.Item
            name="title"
            label="Expense Title"
            rules={[
              { required: true, message: 'Please enter expense title' },
              { min: 2, message: 'Title must be at least 2 characters' }
            ]}
          >
            <Input prefix={<FileTextOutlined />} />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} maxLength={1000} showCount />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select>
                  {expenseService.getCategoryOptions().map(category => (
                    <Option key={category.value} value={category.value}>
                      {category.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[
                  { required: true, message: 'Please enter amount' },
                  { type: 'number', min: 0.01, message: 'Amount must be greater than 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="KES"
                  min={0.01}
                  step={0.01}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="paymentSource"
            label="Payment Source"
            rules={[{ required: true, message: 'Please select payment source' }]}
          >
            <Select>
              {expenseService.getPaymentSourceOptions().map(source => (
                <Option key={source.value} value={source.value}>
                  {source.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            Expense Details
          </Space>
        }
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingExpense(null);
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {viewingExpense && (
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Text strong>Expense Number:</Text>
              <br />
              <Text code>{viewingExpense.expenseNumber}</Text>
            </Col>
            <Col span={12}>
              <Text strong>Amount:</Text>
              <br />
              <Text style={{ color: '#cf1322', fontSize: '16px', fontWeight: 'bold' }}>
                {expenseService.formatCurrency(viewingExpense.amount)}
              </Text>
            </Col>
            <Col span={12}>
              <Text strong>Title:</Text>
              <br />
              {viewingExpense.title}
            </Col>
            <Col span={12}>
              <Text strong>Category:</Text>
              <br />
              <Tag color="blue">
                {expenseService.getCategoryDisplay(viewingExpense.category)}
              </Tag>
            </Col>
            <Col span={12}>
              <Text strong>Payment Source:</Text>
              <br />
              <Tag>
                {expenseService.getPaymentSourceDisplay(viewingExpense.paymentSource)}
              </Tag>
            </Col>
            <Col span={12}>
              <Text strong>Status:</Text>
              <br />
              <Tag color={expenseService.getStatusColor(viewingExpense.status)}>
                {expenseService.getStatusDisplay(viewingExpense.status)}
              </Tag>
            </Col>
            <Col span={12}>
              <Text strong>Company:</Text>
              <br />
              {viewingExpense.company?.name}
            </Col>
            <Col span={12}>
              <Text strong>Station:</Text>
              <br />
              {viewingExpense.station?.name}
            </Col>
            <Col span={12}>
              <Text strong>Expense Date:</Text>
              <br />
              {expenseService.formatDate(viewingExpense.expenseDate)}
            </Col>
            <Col span={12}>
              <Text strong>Created:</Text>
              <br />
              {expenseService.formatDate(viewingExpense.createdAt)}
            </Col>
            {viewingExpense.description && (
              <Col span={24}>
                <Text strong>Description:</Text>
                <br />
                {viewingExpense.description}
              </Col>
            )}
            {viewingExpense.shift && (
              <Col span={12}>
                <Text strong>Shift:</Text>
                <br />
                {viewingExpense.shift.shiftNumber}
              </Col>
            )}
            {viewingExpense.island && (
              <Col span={12}>
                <Text strong>Island:</Text>
                <br />
                {viewingExpense.island.name} ({viewingExpense.island.code})
              </Col>
            )}
            <Col span={12}>
              <Text strong>Recorded By:</Text>
              <br />
              {viewingExpense.recordedBy?.firstName} {viewingExpense.recordedBy?.lastName}
              <br />
              <Text type="secondary">{viewingExpense.recordedBy?.email}</Text>
            </Col>
            {viewingExpense.approvedBy && (
              <Col span={12}>
                <Text strong>Approved By:</Text>
                <br />
                {viewingExpense.approvedBy?.firstName} {viewingExpense.approvedBy?.lastName}
              </Col>
            )}
            {viewingExpense.walletTransaction && (
              <Col span={24}>
                <Text strong>Wallet Transaction:</Text>
                <br />
                <Tag color="green">Transaction ID: {viewingExpense.walletTransaction.id}</Tag>
              </Col>
            )}
          </Row>
        )}
      </Modal>

      {/* Create Expense Modal */}
      <CreateExpenseModal
        visible={createModalVisible}
        onClose={handleCreateCancel}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default ExpenseManagement;