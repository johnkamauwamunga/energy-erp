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
  Typography,
  Alert
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
  TransactionOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  SortDescendingOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { expenseService } from '../../../../services/expenseService/expenseService';
import { useApp } from '../../../../context/AppContext';
import CreateExpenseModal from './CreateExpenseModal';
import AdvancedReportGenerator from '../downloadable/AdvancedReportGenerator';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const ExpenseManagement = () => {
  const { state } = useApp();
  const userStationId = state.currentStation?.id;
  const userRole = state.currentUser?.role;
  const currentStation = state.currentStation;
  const currentUser = state.currentUser;
  
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
  const [sortOrder, setSortOrder] = useState({
    field: 'createdAt',
    order: 'descend'
  });

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

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!expenses.length) {
      return {
        totalAmount: 0,
        pendingAmount: 0,
        approvedAmount: 0,
        rejectedAmount: 0,
        draftAmount: 0,
        averageAmount: 0,
        maxAmount: 0,
        minAmount: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        draftCount: 0,
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
    const draftAmount = expenses
      .filter(e => e.status === 'DRAFT')
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    const pendingCount = expenses.filter(e => e.status === 'PENDING_APPROVAL').length;
    const approvedCount = expenses.filter(e => e.status === 'APPROVED').length;
    const rejectedCount = expenses.filter(e => e.status === 'REJECTED').length;
    const draftCount = expenses.filter(e => e.status === 'DRAFT').length;

    const amounts = expenses.map(e => e.amount || 0).filter(amount => amount > 0);
    const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;
    const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;

    return { 
      totalAmount,
      pendingAmount,
      approvedAmount,
      rejectedAmount,
      draftAmount,
      pendingCount,
      approvedCount,
      rejectedCount,
      draftCount,
      totalCount: expenses.length,
      averageAmount: expenses.length > 0 ? totalAmount / expenses.length : 0,
      maxAmount,
      minAmount
    };
  }, [expenses]);

  // Enhanced expenses data for reporting WITH SEQUENTIAL NUMBERING
  const enhancedExpenses = useMemo(() => 
    expenses.map((expense, index) => ({
      ...expense,
      // Add sequential number instead of ID
      sequentialNumber: index + 1,
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
        'N/A',
      stationName: expense.station?.name || currentStation?.name || 'N/A',
      companyName: expense.company?.name || state.currentCompany?.name || 'N/A',
      shiftNumber: expense.shift?.shiftNumber || 'N/A',
      islandCode: expense.island?.code || 'N/A',
      hasWalletTransaction: !!expense.walletTransaction,
      walletTransactionId: expense.walletTransaction?.id || 'N/A',
      timestamp: new Date(expense.createdAt).getTime()
    })),
  [expenses, currentStation, state.currentCompany]);

  // Filter expenses based on filters
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

  // Sort expenses based on current sort order
  const sortedExpenses = useMemo(() => {
    const sorted = [...filteredExpenses];
    
    if (sortOrder.field && sortOrder.order) {
      sorted.sort((a, b) => {
        let aValue = a[sortOrder.field];
        let bValue = b[sortOrder.field];
        
        // Handle nested properties
        if (sortOrder.field === 'recordedByDisplay') {
          aValue = a.recordedByDisplay;
          bValue = b.recordedByDisplay;
        }
        
        if (sortOrder.field === 'expenseDate') {
          aValue = new Date(a.expenseDate).getTime();
          bValue = new Date(b.expenseDate).getTime();
        }
        
        if (sortOrder.field === 'amount') {
          aValue = a.amount || 0;
          bValue = b.amount || 0;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          if (sortOrder.order === 'descend') {
            return bValue.localeCompare(aValue);
          } else {
            return aValue.localeCompare(bValue);
          }
        }
        
        if (sortOrder.order === 'descend') {
          return bValue - aValue;
        } else {
          return aValue - aValue;
        }
      });
    }
    
    return sorted;
  }, [filteredExpenses, sortOrder]);

  // Handle table sort change
  const handleTableChange = (pagination, filters, sorter) => {
    setSortOrder({
      field: sorter.field,
      order: sorter.order
    });
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

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    setFilters(prev => ({
      ...prev,
      startDate: dates?.[0]?.toISOString() || '',
      endDate: dates?.[1]?.toISOString() || ''
    }));
  };

  // Table columns with SEQUENTIAL NUMBERING
  const columns = [
    {
      title: '#',
      key: 'sequence',
      render: (_, __, index) => (
        <Text type="secondary" style={{ fontSize: '11px' }}>
          {index + 1}
        </Text>
      ),
      width: 50,
      fixed: 'left'
    },
    {
      title: 'Expense #',
      dataIndex: 'expenseNumber',
      key: 'expenseNumber',
      width: 120,
      render: (expenseNumber) => (
        <Text strong style={{ fontSize: '12px' }}>
          {expenseNumber}
        </Text>
      ),
      sorter: (a, b) => (b.expenseNumber || '').localeCompare(a.expenseNumber || ''),
      defaultSortOrder: 'descend'
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
              {record.description.substring(0, 50)}...
            </Text>
          )}
        </Space>
      ),
      sorter: (a, b) => (b.title || '').localeCompare(a.title || ''),
      defaultSortOrder: 'descend'
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
      sorter: (a, b) => (b.amount || 0) - (a.amount || 0),
      defaultSortOrder: 'descend',
      sortDirections: ['descend', 'ascend']
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
      ),
      filters: [
        { text: 'Cash', value: 'CASH' },
        { text: 'Mobile Money', value: 'MOBILE_MONEY' },
        { text: 'Bank Transfer', value: 'BANK_TRANSFER' },
        { text: 'Credit Card', value: 'CREDIT_CARD' },
        { text: 'Petty Cash', value: 'PETTY_CASH' }
      ],
      onFilter: (value, record) => record.paymentSource === value
    },
    {
      title: 'Shift Context',
      key: 'context',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.shift && (
            <Badge 
              count={`Shift ${record.shift.shiftNumber}`}
              style={{ backgroundColor: '#1890ff', fontSize: '11px' }}
            />
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
      ),
      sorter: (a, b) => {
        const aShift = a.shift?.shiftNumber || '';
        const bShift = b.shift?.shiftNumber || '';
        return bShift.localeCompare(aShift);
      },
      defaultSortOrder: 'descend'
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
      ),
      sorter: (a, b) => {
        const aName = (a.recordedBy ? `${a.recordedBy.firstName} ${a.recordedBy.lastName}` : '').toLowerCase();
        const bName = (b.recordedBy ? `${b.recordedBy.firstName} ${b.recordedBy.lastName}` : '').toLowerCase();
        return bName.localeCompare(aName);
      },
      defaultSortOrder: 'descend'
    },
    {
      title: 'Wallet Trans',
      key: 'walletTransaction',
      width: 100,
      render: (_, record) => (
        record.walletTransaction ? (
          <Tag color="green" icon={<TransactionOutlined />}>
            Paid
          </Tag>
        ) : (
          <Tag color="default">Pending</Tag>
        )
      ),
      filters: [
        { text: 'Paid', value: 'PAID' },
        { text: 'Pending', value: 'PENDING' }
      ],
      onFilter: (value, record) => 
        (value === 'PAID' && !!record.walletTransaction) || 
        (value === 'PENDING' && !record.walletTransaction)
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
      sorter: (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime(),
      defaultSortOrder: 'descend',
      sortDirections: ['descend', 'ascend']
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => (
        <Text type="secondary" style={{ fontSize: '10px' }}>
          {expenseService.formatDate(date, true)}
        </Text>
      ),
      sorter: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      defaultSortOrder: 'descend',
      sortDirections: ['descend', 'ascend']
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
      onFilter: (value, record) => record.status === value,
      sorter: (a, b) => (b.status || '').localeCompare(a.status || ''),
      defaultSortOrder: 'descend'
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

  // Columns for export (optimized for reports) - WITH SEQUENTIAL NUMBERING
  const exportColumns = [
    {
      title: '#',
      key: 'sequence',
      render: (_, record, index) => index + 1,
      type: 'number',
      width: 50
    },
    {
      title: 'Expense Number',
      dataIndex: 'expenseNumber',
      key: 'expenseNumber',
      type: 'text'
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      type: 'text'
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || 'N/A',
      type: 'text'
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => expenseService.getCategoryDisplay(category),
      type: 'text'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      type: 'currency'
    },
    {
      title: 'Payment Source',
      dataIndex: 'paymentSource',
      key: 'paymentSource',
      render: (source) => expenseService.getPaymentSourceDisplay(source),
      type: 'text'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => expenseService.getStatusDisplay(status),
      type: 'status'
    },
    {
      title: 'Expense Date',
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      render: (date) => expenseService.formatDate(date),
      type: 'date'
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => expenseService.formatDate(date, true),
      type: 'datetime'
    },
    {
      title: 'Company',
      key: 'company',
      render: (_, record) => record.company?.name || state.currentCompany?.name || 'N/A',
      type: 'text'
    },
    {
      title: 'Station',
      key: 'station',
      render: (_, record) => record.station?.name || currentStation?.name || 'N/A',
      type: 'text'
    },
    {
      title: 'Shift Number',
      key: 'shift',
      render: (_, record) => record.shift?.shiftNumber || 'N/A',
      type: 'text'
    },
    {
      title: 'Island',
      key: 'island',
      render: (_, record) => record.island?.name || record.island?.code || 'N/A',
      type: 'text'
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      render: (_, record) => 
        record.recordedBy ? 
          `${record.recordedBy.firstName} ${record.recordedBy.lastName}` : 
          'System',
      type: 'text'
    },
    {
      title: 'Approved By',
      key: 'approvedBy',
      render: (_, record) => 
        record.approvedBy ? 
          `${record.approvedBy.firstName} ${record.approvedBy.lastName}` : 
          'N/A',
      type: 'text'
    },
    {
      title: 'Wallet Transaction',
      key: 'walletTransaction',
      render: (_, record) => record.walletTransaction ? 'Yes' : 'No',
      type: 'boolean'
    },
    {
      title: 'Transaction ID',
      key: 'walletTransactionId',
      render: (_, record) => record.walletTransaction?.id || 'N/A',
      type: 'text'
    },
    {
      title: 'Approval Date',
      dataIndex: 'approvedAt',
      key: 'approvedAt',
      render: (date) => date ? expenseService.formatDate(date, true) : 'N/A',
      type: 'datetime'
    },
    {
      title: 'Rejection Reason',
      dataIndex: 'rejectionReason',
      key: 'rejectionReason',
      render: (reason) => reason || 'N/A',
      type: 'text'
    }
  ];

  // Summary data for report header
  const summaryData = {
    'Total Expenses': summaryStats.totalCount,
    'Total Amount': expenseService.formatCurrency(summaryStats.totalAmount),
    'Pending Amount': expenseService.formatCurrency(summaryStats.pendingAmount),
    'Approved Amount': expenseService.formatCurrency(summaryStats.approvedAmount),
    'Rejected Amount': expenseService.formatCurrency(summaryStats.rejectedAmount),
    'Draft Amount': expenseService.formatCurrency(summaryStats.draftAmount),
    'Pending Count': summaryStats.pendingCount,
    'Approved Count': summaryStats.approvedCount,
    'Rejected Count': summaryStats.rejectedCount,
    'Draft Count': summaryStats.draftCount,
    'Average Expense': expenseService.formatCurrency(summaryStats.averageAmount),
    'Largest Expense': expenseService.formatCurrency(summaryStats.maxAmount),
    'Smallest Expense': expenseService.formatCurrency(summaryStats.minAmount)
  };

  // Main export handler
  const handleExport = (format) => {
    console.log(`Exporting ${filteredExpenses.length} expenses as ${format}`);
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
              <Col>
                {/* Main Export Button */}
                <AdvancedReportGenerator
                  dataSource={filteredExpenses}
                  columns={exportColumns}
                  title={`Expense Management Report - ${currentStation?.name || 'Company'} Level`}
                  fileName={`expenses_${currentStation?.code || 'company'}_${new Date().toISOString().split('T')[0]}`}
                  summaryData={summaryData}
                  reportType="finance"
                  stationInfo={currentStation}
                  footerText={`Generated from Lynx Energy System - ${currentUser ? `User: ${currentUser.firstName} ${currentUser.lastName}` : ''} - ${new Date().toLocaleDateString()}`}
                  showFooter={true}
                  enableCustomization={true}
                  onReportGenerate={handleExport}
                />
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
              value={summaryStats.totalCount}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Pending Approval"
              value={summaryStats.pendingCount}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Approved"
              value={summaryStats.approvedCount}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Rejected"
              value={summaryStats.rejectedCount}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="Total Amount"
              value={summaryStats.totalAmount}
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
              value={summaryStats.pendingAmount}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters & Export */}
      <Card size="small" title="Filters & Export">
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

      {/* Data Info Alert */}
      {filteredExpenses.length === 0 && !loading && (
        <Alert
          message="No Expenses Found"
          description="There are no expenses matching your current filters."
          type="info"
          showIcon
          action={
            <Button size="small" onClick={clearFilters}>
              Clear Filters
            </Button>
          }
        />
      )}

      {/* Expenses Table */}
      <Card size="small">
        <Table
          columns={columns}
          dataSource={sortedExpenses}
          rowKey="sequentialNumber"
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: filteredExpenses.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} expenses`,
            defaultPageSize: 10,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          size="small"
          scroll={{ x: 1800 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6}>
                  <Space>
                    <SortDescendingOutlined style={{ color: '#1890ff' }} />
                    <Text strong>Sorted by: {sortOrder.field}</Text>
                    <Text type="secondary">({sortOrder.order === 'descend' ? 'Descending' : 'Ascending'})</Text>
                  </Space>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong>
                    Total: {expenseService.formatCurrency(summaryStats.totalAmount)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={4}>
                  <Text type="secondary">
                    Showing {filteredExpenses.length} expenses 
                    ({summaryStats.pendingCount > 0 ? `${summaryStats.pendingCount} pending` : ''} 
                    {summaryStats.approvedCount > 0 ? `, ${summaryStats.approvedCount} approved` : ''} 
                    {summaryStats.rejectedCount > 0 ? `, ${summaryStats.rejectedCount} rejected` : ''})
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  {/* Secondary Export Button */}
                  <AdvancedReportGenerator
                    dataSource={filteredExpenses}
                    columns={exportColumns}
                    title={`Detailed Expense Report - ${currentStation?.name || 'Company'}`}
                    fileName={`detailed_expenses_${new Date().toISOString().split('T')[0]}`}
                    summaryData={summaryData}
                    reportType="finance"
                    showFooter={true}
                    customStyles={{
                      fontSize: 8,
                      rowHeight: 5,
                      alternateRowColors: true
                    }}
                    enableCustomization={false}
                  />
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
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