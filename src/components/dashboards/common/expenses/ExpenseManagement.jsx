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
  FilterOutlined
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

  // Load expenses - FIXED: Use getExpensesByStation instead
  const loadExpenses = async () => {
    if (!userStationId) {
      message.warning('Please select a station first');
      return;
    }

    setLoading(true);
    try {
      // Use getExpensesByStation which automatically filters by station
      const result = await expenseService.getExpenses();
      
      console.log("management data ",result)
      // Handle the backend response structure { success, data, pagination }
      const expensesData = result || [];
      const paginationData = result.pagination || {
        total: result.total || 0,
        page: pagination.page,
        limit: pagination.limit
      };
      
      setExpenses(expensesData);


      setPagination(prev => ({
        ...prev,
        total: paginationData.total,
        page: paginationData.page || pagination.page,
        limit: paginationData.limit || pagination.limit
      }));
    } catch (error) {
      message.error('Failed to load expenses');
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userStationId) {
      loadExpenses();
    }
  }, [filters, pagination.page, pagination.limit, userStationId]);

  // Handle create modal
  const handleShowCreateModal = () => {
    setCreateModalVisible(true);
  };

  const handleCreateSuccess = () => {
    setCreateModalVisible(false);
    message.success('Expense created successfully');
    loadExpenses();
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

  // Table columns - FIXED: Added proper dataIndex and key for all columns
  const columns = [
    {
      title: 'Expense #',
      dataIndex: 'expenseNumber',
      key: 'expenseNumber',
      width: 120,
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
      )
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
      title: 'Context',
      key: 'context',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.shift && (
            <Text style={{ fontSize: '11px' }}>
              🕐 Shift: {record.shift.shiftNumber}
            </Text>
          )}
          {record.island && (
            <Text style={{ fontSize: '11px' }}>
              🏝️ Island: {record.island.code}
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
        <Text style={{ fontSize: '11px' }}>
          👤 {record.recordedBy?.firstName} {record.recordedBy?.lastName}
        </Text>
      )
    },
    {
      title: 'Date',
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      width: 120,
      render: (date) => expenseService.formatDate(date)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={expenseService.getStatusColor(status)}>
          {expenseService.getStatusDisplay(status)}
        </Tag>
      )
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
                <Button 
                  icon={<CheckCircleOutlined />} 
                  size="small"
                  type="primary"
                  onClick={() => handleApprove(record.id)}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button 
                  icon={<CloseCircleOutlined />} 
                  size="small"
                  danger
                  onClick={() => handleReject(record.id)}
                />
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
    
    return { 
      total, 
      pending, 
      approved, 
      rejected,
      draft,
      totalAmount, 
      pendingAmount,
      approvedAmount 
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

  // Handle table pagination change
  const handleTableChange = (page, pageSize) => {
    setPagination(prev => ({ 
      ...prev, 
      page: page || prev.page, 
      limit: pageSize || prev.limit 
    }));
  };

  // Handle search input
  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

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
        <Col xs={12} sm={6} md={6}>
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
        <Col xs={12} sm={6} md={6}>
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
          dataSource={expenses}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} expenses`,
            onChange: handleTableChange
          }}
          scroll={{ x: 1200 }}
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
        width={600}
      >
        {viewingExpense && (
          <div>
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
                <Text strong>Date:</Text>
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
              </Col>
              {viewingExpense.approvedBy && (
                <Col span={12}>
                  <Text strong>Approved By:</Text>
                  <br />
                  {viewingExpense.approvedBy?.firstName} {viewingExpense.approvedBy?.lastName}
                </Col>
              )}
            </Row>
          </div>
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