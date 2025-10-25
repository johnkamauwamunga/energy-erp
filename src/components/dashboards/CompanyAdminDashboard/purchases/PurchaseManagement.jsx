// src/components/purchases/PurchaseManagement.js
import React, { useState, useEffect } from 'react';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  DownloadOutlined,
  ShoppingOutlined
} from '@ant-design/icons';
import {
  Button,
  Input,
  Select,
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Modal,
  message,
  Tooltip
} from 'antd';
import { purchaseService } from '../../../../services/purchaseService/purchaseService';
import { supplierService } from '../../../../services/supplierService/supplierService';
import CreateEditPurchaseModal from './create/CreateEditPurchaseModal';

const { Option } = Select;
const { Search } = Input;

const PurchaseManagement = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    totalSpent: 0,
    totalTax: 0,
    totalDiscount: 0
  });

  const loadPurchases = async () => {
    try {
      setLoading(true);
      
      const filters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (supplierFilter !== 'all') filters.supplierId = supplierFilter;
      if (searchQuery) filters.search = searchQuery;

      const purchasesData = await purchaseService.getPurchases(filters);
      const purchasesArray = purchasesData.purchases || purchasesData.data || purchasesData || [];
      
      setPurchases(purchasesArray);
      calculateStats(purchasesArray);
    } catch (error) {
      console.error('Failed to load purchases:', error);
      message.error(error.message || 'Failed to load purchases');
      setPurchases([]);
      setStats({ total: 0, draft: 0, pending: 0, approved: 0, completed: 0, totalSpent: 0, totalTax: 0, totalDiscount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const suppliersData = await supplierService.getSuppliers(true);
      const suppliersArray = suppliersData.suppliers || suppliersData.data || suppliersData || [];
      setSuppliers(suppliersArray);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      message.error(error.message || 'Failed to load suppliers');
      setSuppliers([]);
    }
  };

  const calculateStats = (purchaseData) => {
    const total = purchaseData.length;
    const draft = purchaseData.filter(p => p.status === 'DRAFT').length;
    const pending = purchaseData.filter(p => p.status === 'PENDING_APPROVAL').length;
    const approved = purchaseData.filter(p => p.status === 'APPROVED').length;
    const completed = purchaseData.filter(p => p.status === 'COMPLETED').length;
    const totalSpent = purchaseData.reduce((sum, p) => sum + (p.netPayable || 0), 0);
    const totalTax = purchaseData.reduce((sum, p) => sum + (p.totalTaxAmount || 0), 0);
    const totalDiscount = purchaseData.reduce((sum, p) => sum + (p.discountAmount || 0), 0);

    setStats({ total, draft, pending, approved, completed, totalSpent, totalTax, totalDiscount });
  };

  useEffect(() => {
    loadPurchases();
    loadSuppliers();
  }, [statusFilter, typeFilter, supplierFilter]);

  const handleUpdateStatus = async (purchaseId, status) => {
    try {
      await purchaseService.updatePurchaseStatus(purchaseId, status);
      message.success('Purchase status updated successfully');
      loadPurchases();
    } catch (error) {
      message.error(error.message || 'Failed to update purchase status');
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this purchase?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await purchaseService.deletePurchase(purchaseId);
          message.success('Purchase deleted successfully');
          loadPurchases();
        } catch (error) {
          message.error(error.message || 'Failed to delete purchase');
        }
      }
    });
  };

  const handlePurchaseCreated = () => {
    loadPurchases();
    setIsCreateModalOpen(false);
    message.success('Purchase created successfully');
  };

  const handlePurchaseUpdated = () => {
    loadPurchases();
    setSelectedPurchase(null);
    message.success('Purchase updated successfully');
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      DRAFT: { color: 'default', label: 'Draft' },
      PENDING_APPROVAL: { color: 'orange', label: 'Pending Approval' },
      APPROVED: { color: 'blue', label: 'Approved' },
      ORDER_CONFIRMED: { color: 'purple', label: 'Order Confirmed' },
      IN_TRANSIT: { color: 'orange', label: 'In Transit' },
      ARRIVED_AT_SITE: { color: 'cyan', label: 'Arrived at Site' },
      QUALITY_CHECK: { color: 'gold', label: 'Quality Check' },
      PARTIALLY_RECEIVED: { color: 'geekblue', label: 'Partially Received' },
      COMPLETED: { color: 'green', label: 'Completed' },
      CANCELLED: { color: 'red', label: 'Cancelled' },
      REJECTED: { color: 'red', label: 'Rejected' },
      ON_HOLD: { color: 'default', label: 'On Hold' }
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const getTypeTag = (type) => {
    const typeConfig = {
      FUEL: { color: 'blue', label: 'Fuel' },
      NON_FUEL: { color: 'green', label: 'Non-Fuel' },
      MIXED: { color: 'purple', label: 'Mixed' }
    };

    const config = typeConfig[type] || typeConfig.FUEL;
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const getDeliveryTag = (status) => {
    const statusConfig = {
      PENDING: { color: 'default', label: 'Pending' },
      DISPATCHED: { color: 'blue', label: 'Dispatched' },
      IN_TRANSIT: { color: 'orange', label: 'In Transit' },
      ARRIVED: { color: 'cyan', label: 'Arrived' },
      UNLOADING: { color: 'purple', label: 'Unloading' },
      QUALITY_VERIFICATION: { color: 'gold', label: 'Quality Check' },
      PARTIALLY_ACCEPTED: { color: 'geekblue', label: 'Partially Accepted' },
      FULLY_ACCEPTED: { color: 'green', label: 'Fully Accepted' },
      REJECTED: { color: 'red', label: 'Rejected' },
      RETURNED: { color: 'red', label: 'Returned' }
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const formatCurrency = (amount) => {
    return `$${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleViewDetails = async (purchase) => {
    try {
      const purchaseDetails = await purchaseService.getPurchaseById(purchase.id);
      setSelectedPurchase(purchaseDetails);
      message.info('View details for ' + purchase.purchaseNumber);
    } catch (error) {
      message.error(error.message || 'Failed to load purchase details');
    }
  };

  const handleEditPurchase = (purchase) => {
    if (purchase.status !== 'DRAFT') {
      message.error('Only draft purchases can be edited');
      return;
    }
    setSelectedPurchase(purchase);
    setIsCreateModalOpen(true);
  };

  const canManagePurchases = () => true;
  const canApprovePurchases = () => true;

  const columns = [
    {
      title: 'Purchase #',
      dataIndex: 'purchaseNumber',
      key: 'purchaseNumber',
      width: 120,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.reference}</div>
        </div>
      )
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 150,
      render: (supplier) => (
        <div>
          <div style={{ fontWeight: 500 }}>{supplier?.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{supplier?.contactPerson}</div>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => getTypeTag(type)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Delivery',
      dataIndex: 'deliveryStatus',
      key: 'deliveryStatus',
      width: 130,
      render: (status) => getDeliveryTag(status)
    },
    {
      title: 'Gross Amount',
      dataIndex: 'grossAmount',
      key: 'grossAmount',
      width: 120,
      render: (amount) => <div style={{ fontWeight: 500 }}>{formatCurrency(amount)}</div>
    },
    {
      title: 'Tax Amount',
      dataIndex: 'totalTaxAmount',
      key: 'totalTaxAmount',
      width: 120,
      render: (amount) => <div style={{ color: '#666' }}>{formatCurrency(amount)}</div>
    },
    {
      title: 'Net Payable',
      dataIndex: 'netPayable',
      key: 'netPayable',
      width: 120,
      render: (amount) => <div style={{ fontWeight: 600, color: '#52c41a' }}>{formatCurrency(amount)}</div>
    },
    {
      title: 'Date',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      width: 150,
      render: (date) => <div>{new Date(date).toLocaleDateString()}</div>
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          
          {record.status === 'DRAFT' && canManagePurchases() && (
            <Tooltip title="Edit">
              <Button 
                icon={<EditOutlined />} 
                size="small"
                onClick={() => handleEditPurchase(record)}
              />
            </Tooltip>
          )}
          
          {record.status === 'PENDING_APPROVAL' && canApprovePurchases() && (
            <Tooltip title="Approve">
              <Button 
                icon={<CheckCircleOutlined />} 
                size="small"
                type="primary"
                onClick={() => handleUpdateStatus(record.id, 'APPROVED')}
              />
            </Tooltip>
          )}
          
          {record.status === 'DRAFT' && (
            <Tooltip title="Delete">
              <Button 
                icon={<DeleteOutlined />} 
                size="small"
                danger
                onClick={() => handleDeletePurchase(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '8px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Purchase Management</h2>
          <p style={{ color: '#666', margin: 0 }}>
            Manage purchase orders, track deliveries, and monitor supplier performance
          </p>
        </div>
        
        {canManagePurchases() && (
          <Space style={{ marginTop: '16px' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              New Purchase
            </Button>
            <Button icon={<DownloadOutlined />}>
              Export CSV
            </Button>
            <Button icon={<BarChartOutlined />}>
              Analytics
            </Button>
          </Space>
        )}
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Purchases"
              value={stats.total}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Spent"
              value={stats.totalSpent}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Tax"
              value={stats.totalTax}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Discount"
              value={stats.totalDiscount}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#666', fontSize: '14px' }}>Draft</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#666' }}>{stats.draft}</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#666', fontSize: '14px' }}>Pending</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>{stats.pending}</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#666', fontSize: '14px' }}>Approved</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>{stats.approved}</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#666', fontSize: '14px' }}>Completed</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>{stats.completed}</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder="Search purchases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={loadPurchases}
              enterButton
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="all">All Statuses</Option>
              <Option value="DRAFT">Draft</Option>
              <Option value="PENDING_APPROVAL">Pending Approval</Option>
              <Option value="APPROVED">Approved</Option>
              <Option value="COMPLETED">Completed</Option>
              <Option value="CANCELLED">Cancelled</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Type"
              value={typeFilter}
              onChange={setTypeFilter}
            >
              <Option value="all">All Types</Option>
              <Option value="FUEL">Fuel</Option>
              <Option value="NON_FUEL">Non-Fuel</Option>
              <Option value="MIXED">Mixed</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Supplier"
              value={supplierFilter}
              onChange={setSupplierFilter}
              loading={loading}
            >
              <Option value="all">All Suppliers</Option>
              {suppliers.map(supplier => (
                <Option key={supplier.id} value={supplier.id}>
                  {supplier.name} {supplier.code ? `(${supplier.code})` : ''}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadPurchases}
                loading={loading}
              >
                Refresh
              </Button>
              <Button icon={<FilterOutlined />}>
                More Filters
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={purchases}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} purchases`
          }}
          locale={{
            emptyText: searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || supplierFilter !== 'all'
              ? 'No purchases match your search criteria.' 
              : 'No purchases found. Create your first purchase order to get started.'
          }}
        />
      </Card>

      <CreateEditPurchaseModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
        onPurchaseCreated={handlePurchaseCreated}
        onPurchaseUpdated={handlePurchaseUpdated}
      />
    </div>
  );
};

export default PurchaseManagement;