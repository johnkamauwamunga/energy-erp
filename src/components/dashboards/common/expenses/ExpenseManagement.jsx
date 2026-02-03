import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Typography,
  Alert,
  Divider
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
  UserOutlined,
  CalendarOutlined,
  TransactionOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  SortDescendingOutlined
} from '@ant-design/icons';
import { expenseService } from '../../../../services/expenseService/expenseService';
import { useApp } from '../../../../context/AppContext';
import CreateExpenseModal from './CreateExpenseModal';
import AdvancedReportGenerator from '../downloadable/AdvancedReportGenerator';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

// ==================== REUSABLE COMPONENTS ====================

// Filter Section Component
const FilterSection = ({ filters, onFilterChange, onClearFilters, expenseService, loading }) => (
  <Card size="small" style={{ marginBottom: 12 }}>
    <Row gutter={[8, 8]} align="middle">
      <Col xs={24} sm={12} md={6}>
        <Input
          placeholder="Search expenses..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          prefix={<SearchOutlined />}
          allowClear
          size="small"
        />
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Select
          style={{ width: '100%' }}
          placeholder="Category"
          value={filters.category}
          onChange={(value) => onFilterChange('category', value)}
          allowClear
          size="small"
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
          onChange={(value) => onFilterChange('status', value)}
          allowClear
          size="small"
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
          placeholder="Payment"
          value={filters.paymentSource}
          onChange={(value) => onFilterChange('paymentSource', value)}
          allowClear
          size="small"
        >
          {expenseService.getPaymentSourceOptions().map(source => (
            <Option key={source.value} value={source.value}>
              {source.label}
            </Option>
          ))}
        </Select>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <RangePicker
          style={{ width: '100%' }}
          placeholder={['Start Date', 'End Date']}
          onChange={(dates, dateStrings) => {
            onFilterChange('startDate', dateStrings[0] || '');
            onFilterChange('endDate', dateStrings[1] || '');
          }}
          size="small"
        />
      </Col>
      <Col xs={24} sm={12} md={4}>
        <Space>
          <Button 
            icon={<FilterOutlined />}
            onClick={onClearFilters}
            size="small"
            disabled={!filters.search && !filters.category && !filters.status && !filters.paymentSource && !filters.startDate}
          >
            Clear
          </Button>
        </Space>
      </Col>
    </Row>
  </Card>
);

// Statistics Cards Component
const StatisticsCards = ({ summaryStats }) => (
  <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
    <Col xs={12} sm={6} md={4}>
      <Card size="small">
        <Statistic
          title="Total"
          value={summaryStats.totalCount}
          valueStyle={{ color: '#1890ff', fontSize: '16px' }}
        />
      </Card>
    </Col>
    <Col xs={12} sm={6} md={4}>
      <Card size="small">
        <Statistic
          title="Pending"
          value={summaryStats.pendingCount}
          valueStyle={{ color: '#faad14', fontSize: '16px' }}
        />
      </Card>
    </Col>
    <Col xs={12} sm={6} md={4}>
      <Card size="small">
        <Statistic
          title="Approved"
          value={summaryStats.approvedCount}
          valueStyle={{ color: '#52c41a', fontSize: '16px' }}
        />
      </Card>
    </Col>
    <Col xs={12} sm={6} md={4}>
      <Card size="small">
        <Statistic
          title="Rejected"
          value={summaryStats.rejectedCount}
          valueStyle={{ color: '#ff4d4f', fontSize: '16px' }}
        />
      </Card>
    </Col>
    <Col xs={12} sm={6} md={4}>
      <Card size="small">
        <Statistic
          title="Total Amount"
          value={summaryStats.totalAmount}
          precision={0}
          prefix="KES"
          valueStyle={{ color: '#13c2c2', fontSize: '16px' }}
        />
      </Card>
    </Col>
    <Col xs={12} sm={6} md={4}>
      <Card size="small">
        <Statistic
          title="Pending Amount"
          value={summaryStats.pendingAmount}
          precision={0}
          prefix="KES"
          valueStyle={{ color: '#fa8c16', fontSize: '16px' }}
        />
      </Card>
    </Col>
  </Row>
);

// View Expense Modal Component
const ViewExpenseModal = ({ visible, expense, onClose, expenseService }) => {
  if (!expense) return null;

  return (
    <Modal
      title="Expense Details"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ]}
      width={700}
    >
      <Row gutter={[16, 12]}>
        <Col span={12}>
          <Text strong>Expense #:</Text>
          <br />
          <Text code>{expense.expenseNumber}</Text>
        </Col>
        <Col span={12}>
          <Text strong>Amount:</Text>
          <br />
          <Text style={{ color: '#cf1322', fontSize: '16px', fontWeight: 'bold' }}>
            {expenseService.formatCurrency(expense.amount)}
          </Text>
        </Col>
        <Col span={12}>
          <Text strong>Title:</Text>
          <br />
          <Text>{expense.title}</Text>
        </Col>
        <Col span={12}>
          <Text strong>Category:</Text>
          <br />
          <Tag color="blue">{expenseService.getCategoryDisplay(expense.category)}</Tag>
        </Col>
        <Col span={12}>
          <Text strong>Payment Source:</Text>
          <br />
          <Tag>{expenseService.getPaymentSourceDisplay(expense.paymentSource)}</Tag>
        </Col>
        <Col span={12}>
          <Text strong>Status:</Text>
          <br />
          <Tag color={expenseService.getStatusColor(expense.status)}>
            {expenseService.getStatusDisplay(expense.status)}
          </Tag>
        </Col>
        <Col span={12}>
          <Text strong>Expense Date:</Text>
          <br />
          {expenseService.formatDate(expense.expenseDate)}
        </Col>
        <Col span={12}>
          <Text strong>Created:</Text>
          <br />
          {expenseService.formatDate(expense.createdAt, true)}
        </Col>
        {expense.description && (
          <Col span={24}>
            <Text strong>Description:</Text>
            <br />
            <div style={{ 
              backgroundColor: '#fafafa', 
              padding: 8, 
              borderRadius: 4,
              marginTop: 4 
            }}>
              {expense.description}
            </div>
          </Col>
        )}
        <Col span={12}>
          <Text strong>Recorded By:</Text>
          <br />
          <Space direction="vertical" size={0}>
            <Text>{expense.recordedBy?.firstName} {expense.recordedBy?.lastName}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {expense.recordedBy?.email}
            </Text>
          </Space>
        </Col>
        {expense.approvedBy && (
          <Col span={12}>
            <Text strong>Approved By:</Text>
            <br />
            {expense.approvedBy?.firstName} {expense.approvedBy?.lastName}
          </Col>
        )}
        {expense.walletTransaction && (
          <Col span={24}>
            <Text strong>Wallet Transaction:</Text>
            <br />
            <Tag color="green">ID: {expense.walletTransaction.id}</Tag>
          </Col>
        )}
      </Row>
    </Modal>
  );
};

// ==================== MAIN COMPONENT ====================

const ExpenseManagement = () => {
  const { state } = useApp();
  const userStationId = state.currentStation?.id;
  const userRole = state.currentUser?.role;
  const currentStation = state.currentStation;
  const currentUser = state.currentUser;
  
  // State Management
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [sortOrder, setSortOrder] = useState({ field: 'createdAt', order: 'descend' });
  
  // Filter State
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    paymentSource: '',
    startDate: '',
    endDate: ''
  });
  
  // Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [editForm] = Form.useForm();

  // Load expenses
  const loadExpenses = useCallback(async () => {
    if (!userStationId) {
      message.warning('Please select a station first');
      return;
    }

    setLoading(true);
    try {
      const result = await expenseService.getExpenses();
      const stationExpenses = Array.isArray(result) 
        ? result.filter(expense => expense.stationId === userStationId)
        : [];
      
      setExpenses(stationExpenses);
      setPagination(prev => ({ ...prev, total: stationExpenses.length }));
      
    } catch (error) {
      message.error('Failed to load expenses');
      console.error('❌ Error loading expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [userStationId]);

  useEffect(() => {
    if (userStationId) {
      loadExpenses();
    }
  }, [loadExpenses, userStationId]);

  // Summary Statistics
  const summaryStats = useMemo(() => {
    if (!expenses.length) {
      return {
        totalAmount: 0,
        pendingAmount: 0,
        approvedAmount: 0,
        rejectedAmount: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        totalCount: 0
      };
    }

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
    
    const pendingCount = expenses.filter(e => e.status === 'PENDING_APPROVAL').length;
    const approvedCount = expenses.filter(e => e.status === 'APPROVED').length;
    const rejectedCount = expenses.filter(e => e.status === 'REJECTED').length;

    return { 
      totalAmount,
      pendingAmount,
      approvedAmount,
      rejectedAmount,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalCount: expenses.length
    };
  }, [expenses]);

  // Enhanced expenses data
  const enhancedExpenses = useMemo(() => 
    expenses.map((expense, index) => ({
      ...expense,
      sequence: index + 1,
      formattedDate: expenseService.formatDate(expense.expenseDate),
      formattedAmount: expenseService.formatCurrency(expense.amount),
      formattedCreatedAt: expenseService.formatDate(expense.createdAt, true),
      formattedStatus: expenseService.getStatusDisplay(expense.status),
      categoryDisplay: expenseService.getCategoryDisplay(expense.category),
      paymentSourceDisplay: expenseService.getPaymentSourceDisplay(expense.paymentSource),
      recordedByDisplay: expense.recordedBy ? 
        `${expense.recordedBy.firstName} ${expense.recordedBy.lastName}` : 
        'System',
      approvedByDisplay: expense.approvedBy ? 
        `${expense.approvedBy.firstName} ${expense.approvedBy.lastName}` : 
        'N/A'
    })),
  [expenses, currentStation, state.currentCompany]);

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let filtered = enhancedExpenses;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.title.toLowerCase().includes(searchLower) ||
        expense.description?.toLowerCase().includes(searchLower) ||
        expense.expenseNumber.toLowerCase().includes(searchLower) ||
        expense.recordedByDisplay.toLowerCase().includes(searchLower)
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
  }, [enhancedExpenses, filters]);

  const sortedExpenses = useMemo(() => {
    const sorted = [...filteredExpenses];
    
    if (sortOrder.field && sortOrder.order) {
      sorted.sort((a, b) => {
        let aValue = a[sortOrder.field];
        let bValue = b[sortOrder.field];
        
        if (sortOrder.field === 'expenseDate' || sortOrder.field === 'createdAt') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
        if (sortOrder.order === 'descend') {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });
    }
    
    return sorted;
  }, [filteredExpenses, sortOrder]);

  // Event Handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      category: '',
      status: '',
      paymentSource: '',
      startDate: '',
      endDate: ''
    });
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setSortOrder({
      field: sorter.field || 'createdAt',
      order: sorter.order || 'descend'
    });
  };

  const handleView = (expense) => {
    setViewingExpense(expense);
    setViewModalVisible(true);
  };

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

  // Table Columns - OPTIMIZED FOR SPACE (800px total width)
  const columns = useMemo(() => [
    {
      title: '#',
      key: 'sequence',
      width: 40,
      align: 'center',
      render: (_, __, index) => (
        <Text type="secondary" style={{ fontSize: '10px' }}>
          {index + 1}
        </Text>
      )
    },
    {
      title: 'Expense #',
      dataIndex: 'expenseNumber',
      key: 'expenseNumber',
      width: 80,
      render: (text) => (
        <Text strong style={{ fontSize: '11px' }}>{text}</Text>
      ),
      sorter: true
    },
    {
      title: 'Details',
      dataIndex: 'title',
      key: 'title',
      width: 120,
      render: (title, record) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '11px' }}>
            {title}
          </div>
          <div style={{ fontSize: '9px', color: '#666' }}>
            {record.categoryDisplay}
          </div>
        </div>
      ),
      sorter: true
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 80,
      align: 'right',
      render: (amount) => (
        <div style={{ fontWeight: '600', fontSize: '11px', color: '#cf1322' }}>
          {expenseService.formatCurrency(amount)}
        </div>
      ),
      sorter: true
    },
    {
      title: 'Payment',
      dataIndex: 'paymentSource',
      key: 'paymentSource',
      width: 80,
      render: (source) => (
        <Tag color="blue" style={{ fontSize: '9px', padding: '1px 4px' }}>
          {expenseService.getPaymentSourceDisplay(source)}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status, record) => (
        <div>
          <Tag 
            color={expenseService.getStatusColor(status)} 
            style={{ fontSize: '9px', padding: '1px 4px' }}
          >
            {expenseService.getStatusDisplay(status)}
          </Tag>
          {record.approvedBy && (
            <div style={{ fontSize: '8px', color: '#666', marginTop: 1 }}>
              By: {record.approvedBy.firstName}
            </div>
          )}
        </div>
      ),
      filters: [
        { text: 'Draft', value: 'DRAFT' },
        { text: 'Pending', value: 'PENDING_APPROVAL' },
        { text: 'Approved', value: 'APPROVED' },
        { text: 'Rejected', value: 'REJECTED' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Date',
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      width: 80,
      render: (date) => (
        <div style={{ fontSize: '9px' }}>
          {expenseService.formatDate(date, 'short')}
        </div>
      ),
      sorter: true
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      width: 100,
      render: (_, record) => (
        <div style={{ fontSize: '9px' }}>
          <div>{record.recordedBy?.firstName || 'System'}</div>
          <div style={{ color: '#666' }}>{record.recordedBy?.email || ''}</div>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size={[2, 2]} wrap>
          <Tooltip title="View">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleView(record)}
              type="text"
              style={{ padding: '0 2px' }}
            />
          </Tooltip>
          
          {(record.status === 'PENDING_APPROVAL' || record.status === 'DRAFT') && (
            <Tooltip title="Edit">
              <Button 
                icon={<EditOutlined />} 
                size="small"
                onClick={() => handleEdit(record)}
                type="text"
                style={{ padding: '0 2px' }}
              />
            </Tooltip>
          )}
          
          {['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER', 'STATION_MANAGER'].includes(userRole) && 
           record.status === 'PENDING_APPROVAL' && (
            <>
              <Tooltip title="Approve">
                <Popconfirm
                  title="Approve this expense?"
                  onConfirm={() => handleApprove(record.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button 
                    icon={<CheckCircleOutlined />} 
                    size="small"
                    type="text"
                    style={{ padding: '0 2px', color: '#52c41a' }}
                  />
                </Popconfirm>
              </Tooltip>
              <Tooltip title="Reject">
                <Popconfirm
                  title="Reject this expense?"
                  onConfirm={() => handleReject(record.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button 
                    icon={<CloseCircleOutlined />} 
                    size="small"
                    type="text"
                    style={{ padding: '0 2px' }}
                    danger
                  />
                </Popconfirm>
              </Tooltip>
            </>
          )}
          
          {(record.status === 'PENDING_APPROVAL' || record.status === 'DRAFT') && (
            <Popconfirm
              title="Delete this expense?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete">
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small"
                  type="text"
                  style={{ padding: '0 2px' }}
                  danger
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ], [userRole]);

  // Export columns and data
  const exportColumns = useMemo(() => [
    { title: '#', key: 'sequence', render: (_, __, index) => index + 1 },
    { title: 'Expense Number', dataIndex: 'expenseNumber' },
    { title: 'Title', dataIndex: 'title' },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Category', dataIndex: 'category', render: expenseService.getCategoryDisplay },
    { title: 'Amount', dataIndex: 'amount' },
    { title: 'Payment Source', dataIndex: 'paymentSource', render: expenseService.getPaymentSourceDisplay },
    { title: 'Status', dataIndex: 'status', render: expenseService.getStatusDisplay },
    { title: 'Expense Date', dataIndex: 'expenseDate', render: expenseService.formatDate },
    { title: 'Created At', dataIndex: 'createdAt', render: (date) => expenseService.formatDate(date, true) },
    { title: 'Company', key: 'company', render: (_, record) => record.company?.name || 'N/A' },
    { title: 'Station', key: 'station', render: (_, record) => record.station?.name || 'N/A' },
    { title: 'Recorded By', key: 'recordedBy', render: (_, record) => 
      record.recordedBy ? `${record.recordedBy.firstName} ${record.recordedBy.lastName}` : 'System' 
    }
  ], []);

  const summaryData = useMemo(() => ({
    'Total Expenses': summaryStats.totalCount,
    'Total Amount': expenseService.formatCurrency(summaryStats.totalAmount),
    'Pending Amount': expenseService.formatCurrency(summaryStats.pendingAmount),
    'Approved Amount': expenseService.formatCurrency(summaryStats.approvedAmount),
    'Rejected Amount': expenseService.formatCurrency(summaryStats.rejectedAmount),
    'Pending Count': summaryStats.pendingCount,
    'Approved Count': summaryStats.approvedCount,
    'Rejected Count': summaryStats.rejectedCount,
    'Average Expense': expenseService.formatCurrency(summaryStats.totalAmount / summaryStats.totalCount || 0)
  }), [summaryStats]);

  if (!userStationId) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <DollarOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
        <Text type="secondary">
          Please select a station to view expenses
        </Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      {/* Header */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12}>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                <DollarOutlined /> Expense Management
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Manage expenses for {state.currentStation?.name}
              </Text>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[6, 6]} justify="end">
              <Col>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadExpenses}
                  loading={loading}
                  size="small"
                >
                  Refresh
                </Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                  size="small"
                >
                  New Expense
                </Button>
              </Col>
              <Col>
                <AdvancedReportGenerator
                  dataSource={filteredExpenses}
                  columns={exportColumns}
                  title={`Expense Report - ${currentStation?.name}`}
                  fileName={`expenses_${currentStation?.code}_${new Date().toISOString().split('T')[0]}`}
                  summaryData={summaryData}
                  reportType="finance"
                  stationInfo={currentStation}
                  footerText={`Generated from Lynx Energy System - User: ${currentUser?.firstName} ${currentUser?.lastName}`}
                  showFooter={true}
                  enableCustomization={true}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <StatisticsCards summaryStats={summaryStats} />

      {/* Filters */}
      <FilterSection 
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        expenseService={expenseService}
        loading={loading}
      />

      {/* Data Status Alert - PROPERLY PLACED */}
      {loading ? (
        <Alert
          message="Loading expenses..."
          description="Please wait while we fetch your expense data."
          type="info"
          showIcon
          icon={<ClockCircleOutlined />}
          style={{ marginBottom: 12 }}
        />
      ) : filteredExpenses.length === 0 ? (
        <Alert
          message="No expenses found"
          description={
            expenses.length === 0 
              ? "No expenses have been recorded yet for this station. Click 'New Expense' to create one."
              : "Try adjusting your filters or clear them to see all expenses"
          }
          type={expenses.length === 0 ? "info" : "warning"}
          showIcon
          icon={expenses.length === 0 ? <InfoCircleOutlined /> : <WarningOutlined />}
          style={{ marginBottom: 12 }}
          action={
            expenses.length > 0 ? (
              <Button size="small" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button 
                size="small" 
                type="primary"
                onClick={() => setCreateModalVisible(true)}
                icon={<PlusOutlined />}
              >
                Create Expense
              </Button>
            )
          }
        />
      ) : null}

      {/* Main Table */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <div style={{ 
          backgroundColor: '#fafafa', 
          padding: '8px 12px', 
          borderBottom: '1px solid #f0f0f0',
          fontSize: '11px'
        }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space>
                <Text strong>Expense List</Text>
                <Text type="secondary">({filteredExpenses.length} records)</Text>
              </Space>
            </Col>
            <Col>
              <Space>
                <SortDescendingOutlined style={{ color: '#1890ff' }} />
                <Text type="secondary">
                  Sorted by: {sortOrder.field} ({sortOrder.order === 'descend' ? 'Desc' : 'Asc'})
                </Text>
              </Space>
            </Col>
          </Row>
        </div>
        
        <Table
          columns={columns}
          dataSource={sortedExpenses}
          rowKey="id"
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: filteredExpenses.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            size: 'small',
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          size="small"
          scroll={{ x: 800 }}
          style={{ marginTop: 0 }}
        />
        
        {/* Table Summary */}
        <div style={{ 
          backgroundColor: '#fafafa', 
          padding: '8px 12px', 
          borderTop: '1px solid #f0f0f0',
          fontSize: '11px'
        }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space>
                <Text strong>Total Amount:</Text>
                <Text strong style={{ color: '#13c2c2' }}>
                  KES {summaryStats.totalAmount.toLocaleString()}
                </Text>
              </Space>
            </Col>
            <Col>
              <Space>
                <Text type="secondary">
                  {summaryStats.pendingCount > 0 && `${summaryStats.pendingCount} pending`}
                  {summaryStats.approvedCount > 0 && `, ${summaryStats.approvedCount} approved`}
                  {summaryStats.rejectedCount > 0 && `, ${summaryStats.rejectedCount} rejected`}
                </Text>
              </Space>
            </Col>
          </Row>
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal
        title="Edit Expense"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingExpense(null);
        }}
        onOk={() => editForm.submit()}
        okText="Update"
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
            label="Title"
            rules={[
              { required: true, message: 'Enter expense title' },
              { min: 2, message: 'Minimum 2 characters' }
            ]}
          >
            <Input prefix={<FileTextOutlined />} />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} maxLength={1000} showCount />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Select category' }]}
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
                  { required: true, message: 'Enter amount' },
                  { type: 'number', min: 0.01, message: 'Must be > 0' }
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
            rules={[{ required: true, message: 'Select payment source' }]}
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
      <ViewExpenseModal
        visible={viewModalVisible}
        expense={viewingExpense}
        onClose={() => {
          setViewModalVisible(false);
          setViewingExpense(null);
        }}
        expenseService={expenseService}
      />

      {/* Create Modal */}
      <CreateExpenseModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => {
          loadExpenses();
          setCreateModalVisible(false);
        }}
      />
    </div>
  );
};

export default ExpenseManagement;