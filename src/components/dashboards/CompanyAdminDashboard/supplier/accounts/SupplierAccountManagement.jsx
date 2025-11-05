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
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  DollarOutlined,
  ShopOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  TransactionOutlined,
  CreditCardOutlined,
  BarChartOutlined,
  DownloadOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { supplierAccountService } from '../../../../../services/supplierAccountService/supplierAccountService';
import { useApp } from '../../../../../context/AppContext';
// import CreateSupplierModal from './modal/CreateSupplierModal';
// import EditSupplierModal from './modal/EditSupplierModal';
import CreateRepaymentModal from './modal/CreateRepaymentModal';
import GenerateReportModal from './modal/GenerateReportModal';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const SupplierAccountManagement = () => {
  const { state } = useApp();
  const screens = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  });
  const [activeTab, setActiveTab] = useState('suppliers');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierDetails, setSupplierDetails] = useState(null);
  const [supplierTransactions, setSupplierTransactions] = useState([]);
  const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showCreateRepaymentModal, setShowCreateRepaymentModal] = useState(false);
  const [showGenerateReportModal, setShowGenerateReportModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    minBalance: '',
    maxBalance: '',
    supplierType: '',
    page: 1,
    limit: 10,
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const [transactionFilters, setTransactionFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    status: '',
    page: 1,
    limit: 10
  });

  const currentCompany = state.currentUser?.companyId;

  // Fetch all suppliers
  const fetchSuppliers = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      console.log("🔄 Fetching suppliers with filters:", filters);
      
      const result = await supplierAccountService.getSuppliers({
        ...filters,
        includeStatistics: true
      });

      const supplierTransactions = await supplierAccountService.getSupplierTransactions();

      
      console.log("📦 Suppliers response:", result);
      console.log("supplier Transactions ",supplierTransactions);
      
      const suppliersData = result.suppliers || result.data || result || [];
      setSuppliers(suppliersData);
      
      setPagination({
        page: result.page || 1,
        limit: result.limit || 10,
        totalCount: result.totalCount || suppliersData.length,
        totalPages: result.totalPages || Math.ceil(suppliersData.length / 10)
      });
      
    } catch (error) {
      console.error('❌ Failed to fetch suppliers:', error);
      message.error('Failed to load suppliers');
      setSuppliers([]);
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

  // Fetch supplier transactions
  const fetchSupplierTransactions = async (supplierAccountId) => {
    if (!supplierAccountId) return;
    
    setTransactionLoading(true);
    try {
      const result = await supplierAccountService.getSupplierTransactions(
        supplierAccountId, 
        transactionFilters
      );
      
      const transactionsData = result.transactions || result.data || result || [];
      setSupplierTransactions(transactionsData);
      
    } catch (error) {
      console.error('❌ Failed to fetch supplier transactions:', error);
      message.error('Failed to load transactions');
      setSupplierTransactions([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  // Fetch supplier statistics
  const [statistics, setStatistics] = useState(null);
  const fetchStatistics = async () => {
    try {
      const stats = await supplierAccountService.calculateSupplierStatistics(suppliers);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchStatistics();
  }, [currentCompany, filters.page, filters.limit, filters.status]);

  useEffect(() => {
    if (selectedSupplier?.supplierAccount?.id) {
      fetchSupplierTransactions(selectedSupplier.supplierAccount.id);
    }
  }, [selectedSupplier, transactionFilters]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1
    }));
  }, []);

  const handleTransactionFilterChange = useCallback((newFilters) => {
    setTransactionFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1
    }));
  }, []);

  // Handle table pagination
  const handleTableChange = (newPagination) => {
    setFilters(prev => ({
      ...prev,
      page: newPagination.current,
      limit: newPagination.pageSize
    }));
  };

  const handleTransactionTableChange = (newPagination) => {
    setTransactionFilters(prev => ({
      ...prev,
      page: newPagination.current,
      limit: newPagination.pageSize
    }));
  };

  // Handle actions
  const handleEditSupplier = useCallback((supplier) => {
    setSelectedSupplier(supplier);
    setShowEditSupplierModal(true);
  }, []);

  const handleViewDetails = useCallback((supplier) => {
    setSupplierDetails(supplier);
    setShowDetailsModal(true);
  }, []);

  const handleViewTransactions = useCallback((supplier) => {
    setSelectedSupplier(supplier);
    setActiveTab('transactions');
  }, []);

  const handleCreateRepayment = useCallback((supplier) => {
    setSelectedSupplier(supplier);
    setShowCreateRepaymentModal(true);
  }, []);

  const handleToggleStatus = async (supplierId, currentStatus) => {
    try {
      // This would call an update supplier status endpoint
      // await supplierAccountService.updateSupplierStatus(supplierId, !currentStatus);
      message.success(`Supplier ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchSuppliers();
      fetchStatistics();
    } catch (error) {
      message.error('Failed to update supplier status');
    }
  };

  const handleDeleteSupplier = async (supplierId) => {
    try {
      // This would call a delete supplier endpoint
      // await supplierAccountService.deleteSupplier(supplierId);
      message.success('Supplier deleted successfully');
      fetchSuppliers();
      fetchStatistics();
    } catch (error) {
      message.error('Failed to delete supplier');
    }
  };

  // Status configurations
  const getSupplierStatusConfig = useCallback((supplier) => {
    const balance = supplier.supplierAccount?.currentBalance || 0;
    const creditLimit = supplier.supplierAccount?.creditLimit || 0;
    const isCreditHold = supplier.supplierAccount?.isCreditHold || false;

    if (!supplier.isActive) {
      return { color: 'red', label: 'Inactive', badge: 'error' };
    }
    
    if (isCreditHold) {
      return { color: 'red', label: 'Credit Hold', badge: 'error' };
    }
    
    if (creditLimit > 0 && balance > creditLimit) {
      return { color: 'red', label: 'Over Limit', badge: 'error' };
    } else if (balance > 0) {
      return { color: 'orange', label: 'Has Debt', badge: 'warning' };
    } else if (balance < 0) {
      return { color: 'green', label: 'Credit Balance', badge: 'success' };
    } else {
      return { color: 'blue', label: 'Settled', badge: 'processing' };
    }
  }, []);

  // Responsive columns configuration for suppliers
  const supplierColumns = useMemo(() => {
    const baseColumns = [
      {
        title: 'Supplier',
        dataIndex: 'name',
        key: 'name',
        width: screens.xs ? 140 : 200,
        render: (name, record) => (
          <Space>
            <Avatar 
              size={screens.xs ? 32 : 40} 
              icon={<UserOutlined />}
              style={{ backgroundColor: '#722ed1' }}
            />
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: screens.xs ? '14px' : '16px' }}>
                {name}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.code}
              </Text>
            </Space>
          </Space>
        ),
        fixed: screens.xs ? 'left' : false,
        sorter: (a, b) => a.name.localeCompare(b.name)
      },
      {
        title: 'Contact',
        key: 'contact',
        width: screens.xs ? 120 : 180,
        render: (_, record) => (
          <Space direction="vertical" size={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <PhoneOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
              <Text style={{ fontSize: '12px' }}>{record.phone}</Text>
            </div>
            {record.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MailOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
                <Text style={{ fontSize: '12px' }}>{record.email}</Text>
              </div>
            )}
          </Space>
        ),
        responsive: ['md']
      },
      {
        title: 'Current Balance',
        dataIndex: ['supplierAccount', 'currentBalance'],
        key: 'currentBalance',
        width: screens.xs ? 90 : 120,
        render: (amount, record) => {
          const balance = amount || 0;
          return (
            <Text strong type={balance > 0 ? "danger" : balance < 0 ? "success" : "secondary"}>
              {supplierAccountService.formatCurrency(balance)}
            </Text>
          );
        },
        sorter: (a, b) => (a.supplierAccount?.currentBalance || 0) - (b.supplierAccount?.currentBalance || 0)
      },
      {
        title: 'Credit Limit',
        dataIndex: ['supplierAccount', 'creditLimit'],
        key: 'creditLimit',
        width: screens.xs ? 90 : 120,
        render: (amount) => (
          <Text>
            {amount ? supplierAccountService.formatCurrency(amount) : 'No Limit'}
          </Text>
        ),
        responsive: ['lg'],
        sorter: (a, b) => (a.supplierAccount?.creditLimit || 0) - (b.supplierAccount?.creditLimit || 0)
      },
      {
        title: 'Available Credit',
        key: 'availableCredit',
        width: screens.xs ? 90 : 120,
        render: (_, record) => {
          const available = record.supplierAccount?.availableCredit;
          return (
            <Text type={available !== null && available < 0 ? "danger" : "success"}>
              {available !== null ? supplierAccountService.formatCurrency(available) : 'N/A'}
            </Text>
          );
        },
        responsive: ['xl']
      },
      {
        title: 'Status',
        key: 'status',
        width: screens.xs ? 90 : 130,
        render: (_, record) => {
          const config = getSupplierStatusConfig(record);
          return (
            <Space>
              <Switch
                size="small"
                checked={record.status === 'ACTIVE'}
                onChange={(checked) => handleToggleStatus(record.id, !checked)}
              />
              {screens.xs ? (
                <Badge status={config.badge} />
              ) : (
                <Badge status={config.badge} text={config.label} />
              )}
            </Space>
          );
        }
      },
      {
        title: 'Actions',
        key: 'actions',
        width: screens.xs ? 120 : 180,
        fixed: screens.xs ? 'right' : false,
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="View Details">
              <Button 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => handleViewDetails(record)}
              />
            </Tooltip>
            <Tooltip title="View Transactions">
              <Button 
                icon={<HistoryOutlined />} 
                size="small"
                type="dashed"
                onClick={() => handleViewTransactions(record)}
              />
            </Tooltip>
            <Tooltip title="Record Payment">
              <Button 
                icon={<CreditCardOutlined />} 
                size="small"
                type="primary"
                onClick={() => handleCreateRepayment(record)}
              />
            </Tooltip>
            <Tooltip title="Edit Supplier">
              <Button 
                icon={<EditOutlined />} 
                size="small"
                onClick={() => handleEditSupplier(record)}
              />
            </Tooltip>
            <Popconfirm
              title="Delete Supplier"
              description="Are you sure you want to delete this supplier? This action cannot be undone."
              onConfirm={() => handleDeleteSupplier(record.id)}
              okText="Yes"
              cancelText="No"
              okType="danger"
            >
              <Tooltip title="Delete">
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small"
                  danger
                  disabled={(record.supplierAccount?.currentBalance || 0) > 0}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      }
    ];

    return baseColumns;
  }, [screens, getSupplierStatusConfig, handleEditSupplier, handleViewDetails, handleViewTransactions, handleCreateRepayment, handleToggleStatus, handleDeleteSupplier]);

  // Columns for transactions table
  const transactionColumns = useMemo(() => [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 100,
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type) => {
        const typeConfig = {
          'PURCHASE_INVOICE': { color: 'orange', label: 'Invoice' },
          'PAYMENT_MADE': { color: 'green', label: 'Payment' },
          'CREDIT_NOTE': { color: 'blue', label: 'Credit Note' },
          'ADJUSTMENT': { color: 'purple', label: 'Adjustment' }
        };
        const config = typeConfig[type] || { color: 'default', label: type };
        return <Tag color={config.color}>{config.label}</Tag>;
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true
    },
    {
      title: 'Reference',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      width: 120,
      render: (ref) => ref || 'N/A'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount, record) => (
        <Text 
          strong 
          type={record.type === 'PAYMENT_MADE' || record.type === 'CREDIT_NOTE' ? 'success' : 'danger'}
        >
          {record.type === 'PAYMENT_MADE' || record.type === 'CREDIT_NOTE' ? '-' : '+'}
          {supplierAccountService.formatCurrency(Math.abs(amount))}
        </Text>
      )
    },
    {
      title: 'Balance After',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      width: 120,
      render: (balance) => (
        <Text strong type={balance > 0 ? 'danger' : balance < 0 ? 'success' : 'secondary'}>
          {supplierAccountService.formatCurrency(balance)}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusConfig = {
          'OUTSTANDING': { color: 'orange', label: 'Outstanding' },
          'PARTIAL': { color: 'blue', label: 'Partial' },
          'SETTLED': { color: 'green', label: 'Settled' },
          'OVERDUE': { color: 'red', label: 'Overdue' }
        };
        const config = statusConfig[status] || { color: 'default', label: status };
        return <Tag color={config.color}>{config.label}</Tag>;
      }
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 100,
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
    }
  ], []);

  // Format suppliers for display
  const formattedSuppliers = useMemo(() => 
    suppliers.map(supplier => ({
      ...supplier,
      key: supplier.id
    })), 
    [suppliers]
  );

  // Format transactions for display
  const formattedTransactions = useMemo(() => 
    supplierTransactions.map(transaction => ({
      ...transaction,
      key: transaction.id
    })), 
    [supplierTransactions]
  );

  // Statistics calculations
  const stats = useMemo(() => {
    const total = pagination.totalCount;
    const active = suppliers.filter(s => s.status === 'ACTIVE').length;
    const withDebt = suppliers.filter(s => (s.supplierAccount?.currentBalance || 0) > 0).length;
    const creditHold = suppliers.filter(s => s.supplierAccount?.isCreditHold).length;
    const totalOutstanding = suppliers.reduce((sum, supplier) => sum + (supplier.supplierAccount?.currentBalance || 0), 0);

    return { total, active, withDebt, creditHold, totalOutstanding };
  }, [suppliers, pagination.totalCount]);

  // Credit utilization analysis
  const creditUtilization = useMemo(() => {
    const suppliersWithLimit = suppliers.filter(s => s.supplierAccount?.creditLimit > 0);
    const overLimit = suppliersWithLimit.filter(s => (s.supplierAccount?.currentBalance || 0) > s.supplierAccount.creditLimit).length;
    const highUtilization = suppliersWithLimit.filter(s => {
      const utilization = (s.supplierAccount.currentBalance / s.supplierAccount.creditLimit) * 100;
      return utilization > 80 && utilization <= 100;
    }).length;
    const mediumUtilization = suppliersWithLimit.filter(s => {
      const utilization = (s.supplierAccount.currentBalance / s.supplierAccount.creditLimit) * 100;
      return utilization > 50 && utilization <= 80;
    }).length;
    const lowUtilization = suppliersWithLimit.filter(s => {
      const utilization = (s.supplierAccount.currentBalance / s.supplierAccount.creditLimit) * 100;
      return utilization <= 50;
    }).length;

    return { overLimit, highUtilization, mediumUtilization, lowUtilization, totalWithLimit: suppliersWithLimit.length };
  }, [suppliers]);

  // Export functionality
  const handleExportSuppliers = useCallback(() => {
    supplierAccountService.downloadSuppliersCSV(suppliers, `suppliers_export_${new Date().toISOString().split('T')[0]}.csv`);
    message.success('Suppliers exported successfully');
  }, [suppliers]);

  const handleExportTransactions = useCallback(() => {
    supplierAccountService.downloadTransactionsCSV(supplierTransactions, `supplier_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    message.success('Transactions exported successfully');
  }, [supplierTransactions]);

  // Supplier Details Modal
  const SupplierDetailsModal = ({ supplier, visible, onClose }) => {
    if (!supplier) return null;

    const statusConfig = getSupplierStatusConfig(supplier);
    const account = supplier.supplierAccount;

    return (
      <Modal
        title={`Supplier Details - ${supplier.name}`}
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
          <Button 
            key="transactions" 
            type="dashed"
            icon={<HistoryOutlined />}
            onClick={() => {
              onClose();
              handleViewTransactions(supplier);
            }}
          >
            View Transactions
          </Button>,
          <Button 
            key="repayment" 
            type="primary" 
            icon={<CreditCardOutlined />}
            onClick={() => {
              onClose();
              handleCreateRepayment(supplier);
            }}
          >
            Record Payment
          </Button>
        ]}
        width={screens.xs ? '90%' : 800}
      >
        <div className="space-y-4">
          {/* Basic Information */}
          <Card size="small" title="Basic Information">
            <Descriptions column={screens.xs ? 1 : 2} size="small">
              <Descriptions.Item label="Supplier Name">
                <Text strong>{supplier.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Supplier Code">
                <Text code>{supplier.code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Contact Person">
                {supplier.contactPerson || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Supplier Type">
                {supplier.supplierType || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                <Space>
                  <PhoneOutlined />
                  {supplier.phone}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <Space>
                  <MailOutlined />
                  {supplier.email || 'N/A'}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={statusConfig.badge} text={statusConfig.label} />
              </Descriptions.Item>
              <Descriptions.Item label="Active">
                {supplier.status === 'ACTIVE' ? (
                  <Tag icon={<CheckCircleOutlined />} color="green">Active</Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="red">Inactive</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Financial Summary */}
          <Card size="small" title="Financial Summary">
            <Row gutter={16}>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Current Balance"
                  value={account?.currentBalance || 0}
                  formatter={value => supplierAccountService.formatCurrency(value)}
                  valueStyle={{ 
                    color: (account?.currentBalance || 0) > 0 ? '#cf1322' : 
                           (account?.currentBalance || 0) < 0 ? '#52c41a' : '#8c8c8c',
                    fontSize: screens.xs ? '14px' : '16px'
                  }}
                  prefix={<DollarOutlined />}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Credit Limit"
                  value={account?.creditLimit || 0}
                  formatter={value => value > 0 ? supplierAccountService.formatCurrency(value) : 'No Limit'}
                  valueStyle={{ color: '#1890ff', fontSize: screens.xs ? '14px' : '16px' }}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Available Credit"
                  value={account?.availableCredit || 0}
                  formatter={value => value !== null ? supplierAccountService.formatCurrency(value) : 'N/A'}
                  valueStyle={{ 
                    color: (account?.availableCredit || 0) < 0 ? '#cf1322' : '#52c41a',
                    fontSize: screens.xs ? '14px' : '16px'
                  }}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Total Purchases"
                  value={account?.totalPurchases || 0}
                  formatter={value => supplierAccountService.formatCurrency(value)}
                  valueStyle={{ color: '#faad14', fontSize: screens.xs ? '14px' : '16px' }}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Total Payments"
                  value={account?.totalPayments || 0}
                  formatter={value => supplierAccountService.formatCurrency(value)}
                  valueStyle={{ color: '#52c41a', fontSize: screens.xs ? '14px' : '16px' }}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Credit Utilization"
                  value={account?.creditLimit ? ((account.currentBalance / account.creditLimit) * 100).toFixed(1) : 0}
                  suffix="%"
                  valueStyle={{ 
                    color: account?.creditLimit && (account.currentBalance / account.creditLimit) > 0.8 ? '#cf1322' : '#faad14',
                    fontSize: screens.xs ? '14px' : '16px'
                  }}
                />
              </Col>
            </Row>
          </Card>

          {/* Additional Information */}
          <Card size="small" title="Additional Information">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Payment Terms">
                {account?.paymentTerms || supplier.paymentTerms || 30} days
              </Descriptions.Item>
              <Descriptions.Item label="Last Purchase">
                {account?.lastPurchaseDate ? new Date(account.lastPurchaseDate).toLocaleDateString() : 'Never'}
              </Descriptions.Item>
              <Descriptions.Item label="Last Payment">
                {account?.lastPaymentDate ? new Date(account.lastPaymentDate).toLocaleDateString() : 'Never'}
              </Descriptions.Item>
              <Descriptions.Item label="Credit Hold">
                {account?.isCreditHold ? (
                  <Tag color="red">Yes</Tag>
                ) : (
                  <Tag color="green">No</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>
      </Modal>
    );
  };

  // Empty state component
  const EmptyState = ({ type = 'suppliers' }) => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <UserOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
      <div style={{ color: '#8c8c8c', fontSize: '16px', marginBottom: '8px' }}>
        {type === 'suppliers' ? 'No suppliers found' : 'No transactions found'}
      </div>
      <div style={{ color: '#bfbfbf', fontSize: '14px', marginBottom: '24px' }}>
        {filters.search || filters.status ? 
          'Try adjusting your filters to see more results' : 
          `Get started by creating your first ${type === 'suppliers' ? 'supplier' : 'transaction'}`
        }
      </div>
      {!(filters.search || filters.status) && type === 'suppliers' && (
        <Button 
          type="primary" 
          icon={<UserAddOutlined />}
          onClick={() => setShowCreateSupplierModal(true)}
          size="large"
        >
          Create First Supplier
        </Button>
      )}
    </div>
  );

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
      {/* Header with Actions */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <Title level={2} style={{ margin: 0, fontSize: screens.xs ? '20px' : '24px' }}>
                Supplier Account Management
              </Title>
              <Text type="secondary" style={{ fontSize: screens.xs ? '12px' : '14px' }}>
                Manage your suppliers and track their financial status
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify={screens.md ? "end" : "start"}>
              <Col xs={12} sm={6}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchSuppliers}
                  loading={loading}
                  block={screens.xs}
                >
                  {screens.sm && 'Refresh'}
                </Button>
              </Col>
              <Col xs={12} sm={6}>
                <Button
                  onClick={handleExportSuppliers}
                  disabled={suppliers.length === 0}
                  block={screens.xs}
                >
                  Export CSV
                </Button>
              </Col>
              <Col xs={12} sm={6}>
                <Button
                  icon={<BarChartOutlined />}
                  onClick={() => setShowGenerateReportModal(true)}
                  block={screens.xs}
                >
                  {screens.sm && 'Reports'}
                </Button>
              </Col>
              <Col xs={12} sm={6}>
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => setShowCreateSupplierModal(true)}
                  block
                  size={screens.xs ? "middle" : "large"}
                >
                  Add Supplier
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Total Suppliers"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Active"
              value={stats.active}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="With Debt"
              value={stats.withDebt}
              valueStyle={{ color: '#faad14' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Total Outstanding"
              value={supplierAccountService.formatCurrency(stats.totalOutstanding)}
              valueStyle={{ color: '#cf1322' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Credit Utilization */}
      <Card title="Credit Utilization Analysis" size="small">
        <Row gutter={[8, 8]}>
          <Col xs={12} sm={6}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #cf1322' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="Over Limit"
                value={creditUtilization.overLimit}
                valueStyle={{ color: '#cf1322', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #faad14' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="High (81-100%)"
                value={creditUtilization.highUtilization}
                valueStyle={{ color: '#faad14', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #1890ff' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="Medium (51-80%)"
                value={creditUtilization.mediumUtilization}
                valueStyle={{ color: '#1890ff', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #52c41a' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="Low (0-50%)"
                value={creditUtilization.lowUtilization}
                valueStyle={{ color: '#52c41a', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Main Content Tabs */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'suppliers',
              label: (
                <span>
                  <UserOutlined />
                  Suppliers ({pagination.totalCount})
                </span>
              ),
              children: (
                <div className="space-y-4">
                  {/* Filters */}
                  <Card size="small">
                    <Row gutter={[8, 8]} align="middle">
                      <Col xs={24} sm={12} md={6}>
                        <Input
                          placeholder="Search by name, code, contact..."
                          value={filters.search}
                          onChange={(e) => handleFilterChange({ search: e.target.value })}
                          prefix={<SearchOutlined />}
                          size="large"
                        />
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Select
                          style={{ width: '100%' }}
                          placeholder="Status"
                          value={filters.status}
                          onChange={(value) => handleFilterChange({ status: value })}
                          allowClear
                          size="large"
                        >
                          <Option value="active">Active</Option>
                          <Option value="inactive">Inactive</Option>
                          <Option value="with_debt">With Debt</Option>
                          <Option value="credit_hold">Credit Hold</Option>
                        </Select>
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Select
                          style={{ width: '100%' }}
                          placeholder="Supplier Type"
                          value={filters.supplierType}
                          onChange={(value) => handleFilterChange({ supplierType: value })}
                          allowClear
                          size="large"
                        >
                          <Option value="FUEL_WHOLESALER">Fuel Wholesaler</Option>
                          <Option value="FUEL_REFINERY">Fuel Refinery</Option>
                          <Option value="OIL_COMPANY">Oil Company</Option>
                          <Option value="DISTRIBUTOR">Distributor</Option>
                        </Select>
                      </Col>
                      <Col xs={24} sm={12} md={10}>
                        <Space>
                          <Button 
                            icon={<SearchOutlined />}
                            onClick={fetchSuppliers}
                            loading={loading}
                            type="primary"
                            size="large"
                            block={screens.xs}
                          >
                            {screens.sm && 'Search'}
                          </Button>
                          <Button 
                            icon={<FilterOutlined />}
                            onClick={() => {
                              handleFilterChange({
                                search: '',
                                status: '',
                                supplierType: '',
                                page: 1
                              });
                            }}
                            size="large"
                            block={screens.xs}
                          >
                            {screens.sm && 'Reset'}
                          </Button>
                        </Space>
                      </Col>
                    </Row>
                  </Card>

                  {/* Suppliers Table */}
                  <Table
                    columns={supplierColumns}
                    dataSource={formattedSuppliers}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                      current: pagination.page,
                      pageSize: pagination.limit,
                      total: pagination.totalCount,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => 
                        `Showing ${range[0]}-${range[1]} of ${total} suppliers`,
                      size: screens.xs ? 'small' : 'default',
                      pageSizeOptions: ['10', '20', '50', '100']
                    }}
                    onChange={handleTableChange}
                    scroll={{ x: screens.xs ? 800 : 1200 }}
                    locale={{ emptyText: <EmptyState type="suppliers" /> }}
                    size={screens.xs ? 'small' : 'middle'}
                  />
                </div>
              )
            },
            {
              key: 'transactions',
              label: (
                <span>
                  <TransactionOutlined />
                  Transactions {selectedSupplier && `- ${selectedSupplier.name}`}
                </span>
              ),
              children: selectedSupplier ? (
                <div className="space-y-4">
                  {/* Transaction Filters */}
                  <Card size="small">
                    <Row gutter={[8, 8]} align="middle">
                      <Col xs={24} sm={8} md={6}>
                        <RangePicker
                          style={{ width: '100%' }}
                          onChange={(dates, dateStrings) => {
                            handleTransactionFilterChange({
                              startDate: dateStrings[0],
                              endDate: dateStrings[1]
                            });
                          }}
                          size="large"
                        />
                      </Col>
                      <Col xs={12} sm={8} md={4}>
                        <Select
                          style={{ width: '100%' }}
                          placeholder="Transaction Type"
                          value={transactionFilters.type}
                          onChange={(value) => handleTransactionFilterChange({ type: value })}
                          allowClear
                          size="large"
                        >
                          <Option value="PURCHASE_INVOICE">Purchase Invoice</Option>
                          <Option value="PAYMENT_MADE">Payment</Option>
                          <Option value="CREDIT_NOTE">Credit Note</Option>
                          <Option value="ADJUSTMENT">Adjustment</Option>
                        </Select>
                      </Col>
                      <Col xs={12} sm={8} md={4}>
                        <Select
                          style={{ width: '100%' }}
                          placeholder="Status"
                          value={transactionFilters.status}
                          onChange={(value) => handleTransactionFilterChange({ status: value })}
                          allowClear
                          size="large"
                        >
                          <Option value="OUTSTANDING">Outstanding</Option>
                          <Option value="PARTIAL">Partial</Option>
                          <Option value="SETTLED">Settled</Option>
                          <Option value="OVERDUE">Overdue</Option>
                        </Select>
                      </Col>
                      <Col xs={24} sm={24} md={10}>
                        <Space>
                          <Button 
                            icon={<DownloadOutlined />}
                            onClick={handleExportTransactions}
                            disabled={supplierTransactions.length === 0}
                            size="large"
                          >
                            Export Transactions
                          </Button>
                          <Button 
                            type="primary"
                            icon={<CreditCardOutlined />}
                            onClick={() => handleCreateRepayment(selectedSupplier)}
                            size="large"
                          >
                            Record Payment
                          </Button>
                        </Space>
                      </Col>
                    </Row>
                  </Card>

                  {/* Supplier Account Summary */}
                  <Card size="small">
                    <Row gutter={16}>
                      <Col xs={12} sm={6}>
                        <Statistic
                          title="Current Balance"
                          value={selectedSupplier.supplierAccount?.currentBalance || 0}
                          formatter={value => supplierAccountService.formatCurrency(value)}
                          valueStyle={{ 
                            color: (selectedSupplier.supplierAccount?.currentBalance || 0) > 0 ? '#cf1322' : '#52c41a'
                          }}
                        />
                      </Col>
                      <Col xs={12} sm={6}>
                        <Statistic
                          title="Credit Limit"
                          value={selectedSupplier.supplierAccount?.creditLimit || 0}
                          formatter={value => value > 0 ? supplierAccountService.formatCurrency(value) : 'No Limit'}
                        />
                      </Col>
                      <Col xs={12} sm={6}>
                        <Statistic
                          title="Available Credit"
                          value={selectedSupplier.supplierAccount?.availableCredit || 0}
                          formatter={value => value !== null ? supplierAccountService.formatCurrency(value) : 'N/A'}
                          valueStyle={{ 
                            color: (selectedSupplier.supplierAccount?.availableCredit || 0) < 0 ? '#cf1322' : '#52c41a'
                          }}
                        />
                      </Col>
                      <Col xs={12} sm={6}>
                        <Statistic
                          title="Transactions"
                          value={supplierTransactions.length}
                        />
                      </Col>
                    </Row>
                  </Card>

                  {/* Transactions Table */}
                  <Table
                    columns={transactionColumns}
                    dataSource={formattedTransactions}
                    loading={transactionLoading}
                    rowKey="id"
                    pagination={{
                      current: transactionFilters.page,
                      pageSize: transactionFilters.limit,
                      total: supplierTransactions.length,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => 
                        `Showing ${range[0]}-${range[1]} of ${total} transactions`,
                      size: screens.xs ? 'small' : 'default',
                      pageSizeOptions: ['10', '20', '50', '100']
                    }}
                    onChange={handleTransactionTableChange}
                    scroll={{ x: screens.xs ? 800 : 1000 }}
                    locale={{ emptyText: <EmptyState type="transactions" /> }}
                    size={screens.xs ? 'small' : 'middle'}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <HistoryOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                  <div style={{ color: '#8c8c8c', fontSize: '16px', marginBottom: '8px' }}>
                    Select a supplier to view transactions
                  </div>
                  <div style={{ color: '#bfbfbf', fontSize: '14px', marginBottom: '24px' }}>
                    Choose a supplier from the Suppliers tab to see their transaction history
                  </div>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Modals */}
      {/* <CreateSupplierModal
        visible={showCreateSupplierModal}
        onClose={() => setShowCreateSupplierModal(false)}
        onSuccess={() => {
          setShowCreateSupplierModal(false);
          fetchSuppliers();
          fetchStatistics();
          message.success('Supplier created successfully');
        }}
      /> */}

      {/* <EditSupplierModal
        visible={showEditSupplierModal}
        onClose={() => {
          setShowEditSupplierModal(false);
          setSelectedSupplier(null);
        }}
        onSuccess={() => {
          setShowEditSupplierModal(false);
          setSelectedSupplier(null);
          fetchSuppliers();
          fetchStatistics();
          message.success('Supplier updated successfully');
        }}
        supplier={selectedSupplier}
      /> */}

      <CreateRepaymentModal
        visible={showCreateRepaymentModal}
        onClose={() => {
          setShowCreateRepaymentModal(false);
          setSelectedSupplier(null);
        }}
        onSuccess={() => {
          setShowCreateRepaymentModal(false);
          setSelectedSupplier(null);
          fetchSuppliers();
          fetchStatistics();
          if (selectedSupplier?.supplierAccount?.id) {
            fetchSupplierTransactions(selectedSupplier.supplierAccount.id);
          }
          message.success('Payment recorded successfully');
        }}
        supplier={selectedSupplier}
      />

      <GenerateReportModal
        visible={showGenerateReportModal}
        onClose={() => setShowGenerateReportModal(false)}
        suppliers={suppliers}
      />

      {/* Supplier Details Modal */}
      {supplierDetails && (
        <SupplierDetailsModal
          supplier={supplierDetails}
          visible={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSupplierDetails(null);
          }}
        />
      )}
    </div>
  );
};

export default SupplierAccountManagement;