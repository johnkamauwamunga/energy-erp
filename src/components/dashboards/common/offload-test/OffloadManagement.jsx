// src/components/purchases/PurchaseManagement.jsx
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
  Progress
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  TruckOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { purchaseService } from '../../../../services/purchaseService/purchaseService';
import { useApp } from '../../../../context/AppContext';
import OffloadWizard from './create/OffloadWizard';

// Import report generators
import ReportGenerator from '../../common/downloadable/ReportGenerator';
import AdvancedReportGenerator from '../../common/downloadable/AdvancedReportGenerator';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Search } = Input;

const OffloadManagement = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  });
  const [showWizard, setShowWizard] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [selectedPurchaseForOffload, setSelectedPurchaseForOffload] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    productId: '',
    dateRange: null,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const currentStation = state.currentStation?.id;
  const currentUser = state.currentUser?.id;
  const currentStationName = state.currentStation?.name;

  // Fetch purchase records
  const fetchPurchases = async () => {
    if (!currentStation) return;
    
    setLoading(true);
    try {
      console.log("🔄 Fetching purchases with filters:", filters);
      
      const result = await purchaseService.getPurchasesByStation(currentStation, filters);
      
      console.log("📦 Purchases response:", result);
      
      const purchasesData = result || [];
      const paginationData = result.pagination || {};
      
      console.log(`✅ Retrieved ${purchasesData.length} purchases`);
      
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      setPagination({
        page: paginationData.page || 1,
        limit: paginationData.limit || 10,
        totalCount: paginationData.total || 0,
        totalPages: paginationData.pages || 0
      });

      // Extract unique products for filter
      if (purchasesData.length > 0) {
        const uniqueProducts = [];
        const productMap = new Map();
        
        purchasesData.forEach(purchase => {
          purchase.items?.forEach(item => {
            if (item.product && !productMap.has(item.product.id)) {
              productMap.set(item.product.id, item.product);
              uniqueProducts.push({
                id: item.product.id,
                name: item.product.name,
                fuelCode: item.product.fuelCode,
                type: item.product.type
              });
            }
          });
        });
        
        setProducts(uniqueProducts);
        console.log(`📊 Extracted ${uniqueProducts.length} unique products`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch purchases:', error);
      setPurchases([]);
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

  // Load data when filters update
  useEffect(() => {
    fetchPurchases();
  }, [currentStation, filters.page, filters.limit, filters.status, filters.type, filters.productId, filters.dateRange]);

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

  // Status configuration helpers
  const getPurchaseStatusConfig = (status) => {
    const config = {
      'DRAFT': { color: 'default', label: 'Draft', badge: 'default' },
      'PENDING_APPROVAL': { color: 'orange', label: 'Pending Approval', badge: 'processing' },
      'APPROVED': { color: 'blue', label: 'Approved', badge: 'processing' },
      'ORDER_CONFIRMED': { color: 'purple', label: 'Order Confirmed', badge: 'processing' },
      'IN_TRANSIT': { color: 'orange', label: 'In Transit', badge: 'processing' },
      'ARRIVED_AT_SITE': { color: 'cyan', label: 'Arrived at Site', badge: 'processing' },
      'QUALITY_CHECK': { color: 'gold', label: 'Quality Check', badge: 'processing' },
      'PARTIALLY_RECEIVED': { color: 'geekblue', label: 'Partially Received', badge: 'processing' },
      'COMPLETED': { color: 'green', label: 'Completed', badge: 'success' },
      'CANCELLED': { color: 'red', label: 'Cancelled', badge: 'error' },
      'REJECTED': { color: 'red', label: 'Rejected', badge: 'error' },
      'ON_HOLD': { color: 'gray', label: 'On Hold', badge: 'default' }
    };
    return config[status] || config.DRAFT;
  };

  // Check if purchase can be received/offloaded
  const canReceivePurchase = (purchase) => {
    return purchase && 
           purchase.type === 'FUEL' && 
           !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(purchase.status);
  };

  // Calculate received percentage
  const calculateReceivedPercentage = (purchase) => {
    if (!purchase.items || purchase.items.length === 0) return 0;
    
    const totalOrdered = purchase.items.reduce((sum, item) => sum + (item.orderedQty || 0), 0);
    const totalReceived = purchase.items.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
    
    return totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
  };

  // Enhanced purchases data for reporting
  const enhancedPurchases = purchases.map(purchase => {
    const formattedPurchase = purchaseService.formatPurchase(purchase);
    const receivedPercentage = calculateReceivedPercentage(purchase);
    const totalOrdered = purchase.items?.reduce((sum, item) => sum + (item.orderedQty || 0), 0) || 0;
    const totalReceived = purchase.items?.reduce((sum, item) => sum + (item.receivedQty || 0), 0) || 0;
    const remaining = totalOrdered - totalReceived;
    
    return {
      ...purchase,
      ...formattedPurchase,
      formattedStatus: getPurchaseStatusConfig(purchase.status).label,
      receivedPercentage: Math.round(receivedPercentage),
      totalOrdered,
      totalReceived,
      remaining,
      mainProduct: purchase.items?.[0]?.product?.name || 'N/A',
      productCode: purchase.items?.[0]?.product?.fuelCode || 'N/A',
      supplierName: purchase.supplier?.name || 'N/A',
      formattedPurchaseDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString() : 'N/A'
    };
  });

  // Export columns for reports
  const exportColumns = [
    {
      title: 'Purchase Number',
      dataIndex: 'purchaseNumber',
      key: 'purchaseNumber'
    },
    {
      title: 'Supplier',
      dataIndex: 'supplierName',
      key: 'supplierName'
    },
    {
      title: 'Product',
      dataIndex: 'mainProduct',
      key: 'mainProduct'
    },
    {
      title: 'Product Code',
      dataIndex: 'productCode',
      key: 'productCode'
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type'
    },
    {
      title: 'Ordered Quantity',
      dataIndex: 'totalOrdered',
      key: 'totalOrdered',
      render: (qty, record) => `${qty} ${record.type === 'FUEL' ? 'L' : 'units'}`
    },
    {
      title: 'Received Quantity',
      dataIndex: 'totalReceived',
      key: 'totalReceived',
      render: (qty, record) => `${qty} ${record.type === 'FUEL' ? 'L' : 'units'}`
    },
    {
      title: 'Remaining',
      dataIndex: 'remaining',
      key: 'remaining',
      render: (qty, record) => `${qty} ${record.type === 'FUEL' ? 'L' : 'units'}`
    },
    {
      title: 'Received %',
      dataIndex: 'receivedPercentage',
      key: 'receivedPercentage',
      render: (percent) => `${percent}%`
    },
    {
      title: 'Status',
      dataIndex: 'formattedStatus',
      key: 'formattedStatus'
    },
    {
      title: 'Net Payable',
      dataIndex: 'netPayable',
      key: 'netPayable',
      render: (amount) => amount ? `Ksh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'
    },
    {
      title: 'Purchase Date',
      dataIndex: 'formattedPurchaseDate',
      key: 'formattedPurchaseDate'
    }
  ];

  // Purchases Table Columns
  const purchaseColumns = [
    {
      title: 'Purchase #',
      dataIndex: 'purchaseNumber',
      key: 'purchaseNumber',
      width: 130,
      render: (purchaseNumber) => (
        <Text strong>{purchaseNumber || 'N/A'}</Text>
      )
    },
    {
      title: 'Supplier',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
      width: 150,
      render: (supplierName) => supplierName || 'N/A'
    },
    {
      title: 'Product',
      key: 'product',
      width: 180,
      render: (_, record) => {
        if (!record.items || record.items.length === 0) return 'N/A';
        
        const mainProduct = record.items[0];
        return (
          <div>
            <div><Text style={{fontSize:"10px", color:"blue"}}>{mainProduct.product?.name}</Text></div>
      
          </div>
        );
      }
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: 120,
      render: (_, record) => {
        if (!record.items || record.items.length === 0) return 'N/A';
        
        const totalOrdered = record.items.reduce((sum, item) => sum + (item.orderedQty || 0), 0);
        const totalReceived = record.items.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
        const remaining = totalOrdered - totalReceived;
        
        return (
          <div>
            <div><Text strong>{totalOrdered.toLocaleString()} L</Text></div>
            {totalReceived > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Received: {totalReceived.toLocaleString()} L
                </Text>
              </div>
            )}
            {/* {remaining > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px', color: '#ff4d4f' }}>
                  Remaining: {remaining.toLocaleString()} L
                </Text>
              </div>
            )} */}
          </div>
        );
      }
    },
    {
      title: 'Unit Cost',
      key: 'unitCost',
      width: 100,
      render: (_, record) => {
        if (!record.items || record.items.length === 0) return 'N/A';
        
        const mainItem = record.items[0];
        return mainItem.unitCost ? `Ksh ${mainItem.unitCost.toFixed(2)}` : 'N/A';
      }
    },
    {
      title: 'Tax Amount',
      dataIndex: 'totalTaxAmount',
      key: 'tax',
      width: 120,
      render: (taxAmount) => taxAmount ? `Ksh ${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'
    },
    {
      title: 'Net Payable',
      dataIndex: 'netPayable',
      key: 'netPayable',
      width: 130,
      render: (amount) => amount ? `Ksh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Ksh 0.00'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status, record) => {
        const config = getPurchaseStatusConfig(status);
        const receivedPercentage = calculateReceivedPercentage(record);
        
        return (
          <div>
            <Badge status={config.badge} text={config.label} />
            {receivedPercentage > 0 && (
              <div style={{ marginTop: 4 }}>
                <Progress 
                  percent={Math.round(receivedPercentage)} 
                  size="small" 
                  showInfo={false}
                />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {receivedPercentage.toFixed(1)}% Received
                </Text>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Purchase Date',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      width: 120,
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => setSelectedPurchase(record)}
            />
          </Tooltip>
          <Tooltip title={canReceivePurchase(record) ? "Receive/Offload Fuel" : "Cannot receive this purchase"}>
            <Button 
              icon={<TruckOutlined />} 
              size="small"
              type="primary"
              disabled={!canReceivePurchase(record)}
              onClick={() => {
                setSelectedPurchaseForOffload(record);
                setShowWizard(true);
              }}
            >
              Receive
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ];

  // Format purchases for display
  const formattedPurchases = purchases.map(purchase => {
    try {
      return purchaseService.formatPurchase(purchase);
    } catch (error) {
      console.error('Error formatting purchase:', error, purchase);
      return purchase;
    }
  });

  // Statistics
  const stats = {
    total: pagination.totalCount,
    pending: formattedPurchases.filter(p => p.status === 'PENDING_APPROVAL').length,
    approved: formattedPurchases.filter(p => p.status === 'APPROVED').length,
    inTransit: formattedPurchases.filter(p => p.deliveryStatus === 'IN_TRANSIT').length,
    completed: formattedPurchases.filter(p => p.status === 'COMPLETED').length,
    totalValue: formattedPurchases.reduce((sum, p) => sum + (p.netPayable || 0), 0),
    receivable: formattedPurchases.filter(p => canReceivePurchase(p)).length
  };

  // Purchase Details Modal Component
  const PurchaseDetailsModal = ({ purchase, visible, onClose }) => {
    if (!purchase) return null;

    const formattedPurchase = purchaseService.formatPurchase(purchase);
    const receivedPercentage = calculateReceivedPercentage(purchase);

    return (
      <Modal
        title={`Purchase Details - ${formattedPurchase.purchaseNumber}`}
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
          canReceivePurchase(purchase) && (
            <Button 
              key="receive"
              type="primary"
              icon={<TruckOutlined />}
              onClick={() => {
                onClose();
                setSelectedPurchaseForOffload(purchase);
                setShowWizard(true);
              }}
            >
              Receive/Offload Fuel
            </Button>
          )
        ]}
        width={900}
      >
        <div className="space-y-4">
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" title="Basic Information">
                <p><strong>Purchase #:</strong> {formattedPurchase.purchaseNumber}</p>
                <p><strong>Supplier:</strong> {formattedPurchase.supplierName}</p>
                <p><strong>Type:</strong> 
                  <Tag color={formattedPurchase.type === 'FUEL' ? 'blue' : 'green'} style={{ marginLeft: 8 }}>
                    {formattedPurchase.type}
                  </Tag>
                </p>
                <p><strong>Status:</strong> 
                  <Badge 
                    status={getPurchaseStatusConfig(purchase.status).badge} 
                    text={getPurchaseStatusConfig(purchase.status).label} 
                    style={{ marginLeft: 8 }}
                  />
                </p>
                <p><strong>Delivery Status:</strong> {formattedPurchase.deliveryStatus}</p>
                <p><strong>Purchase Date:</strong> {formattedPurchase.purchaseDate ? new Date(formattedPurchase.purchaseDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Expected Delivery:</strong> {purchase.expectedDate ? new Date(purchase.expectedDate).toLocaleDateString() : 'N/A'}</p>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Financial Information">
                <p><strong>Gross Amount:</strong> {formattedPurchase.grossAmountDisplay}</p>
                <p><strong>Tax Amount:</strong> {formattedPurchase.totalTaxAmountDisplay}</p>
                <p><strong>Discount:</strong> {formattedPurchase.discountAmountDisplay}</p>
                <p><strong>Net Payable:</strong> {formattedPurchase.netPayableDisplay}</p>
                <p><strong>Items:</strong> {formattedPurchase.itemCount}</p>
                <p><strong>Received Progress:</strong> 
                  <Progress 
                    percent={Math.round(receivedPercentage)} 
                    size="small" 
                    style={{ marginLeft: 8, width: '60%' }}
                  />
                </p>
              </Card>
            </Col>
          </Row>

          {/* Items Table */}
          {purchase.items && purchase.items.length > 0 && (
            <Card size="small" title="Purchase Items">
              <Table
                dataSource={purchase.items}
                pagination={false}
                size="small"
                columns={[
                  { 
                    title: 'Product', 
                    dataIndex: ['product', 'name'], 
                    key: 'product',
                    render: (name, record) => (
                      <div>
                        <div><strong>{name}</strong></div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {record.product?.fuelCode || 'N/A'}
                        </div>
                      </div>
                    )
                  },
                  { 
                    title: 'Ordered Qty', 
                    dataIndex: 'orderedQty', 
                    key: 'orderedQty', 
                    render: (qty, record) => `${qty} ${record.purchase?.type === 'FUEL' ? 'L' : 'units'}` 
                  },
                  { 
                    title: 'Received Qty', 
                    dataIndex: 'receivedQty', 
                    key: 'receivedQty', 
                    render: (qty, record) => `${qty || 0} ${record.purchase?.type === 'FUEL' ? 'L' : 'units'}` 
                  },
                  { 
                    title: 'Remaining', 
                    key: 'remaining',
                    render: (_, record) => {
                      const remaining = record.orderedQty - (record.receivedQty || 0);
                      return `${remaining} ${record.purchase?.type === 'FUEL' ? 'L' : 'units'}`;
                    }
                  },
                  { 
                    title: 'Unit Cost', 
                    dataIndex: 'unitCost', 
                    key: 'unitCost', 
                    render: cost => cost ? `Ksh ${cost.toFixed(2)}` : 'N/A' 
                  },
                  { 
                    title: 'Total Cost', 
                    dataIndex: 'grossAmount', 
                    key: 'grossAmount', 
                    render: amount => amount ? `Ksh ${amount.toFixed(2)}` : 'N/A' 
                  }
                ]}
              />
            </Card>
          )}
        </div>
      </Modal>
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      search: '',
      status: '',
      type: '',
      productId: '',
      dateRange: null,
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  if (!currentStation) {
    return (
      <Alert
        message="No Station Selected"
        description="Please select a station to manage purchases."
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
            <Title level={2} style={{ margin: 0 }}>Purchase Management</Title>
            <Text type="secondary">
              Manage fuel purchases and offloads for {state.currentStation?.name}
            </Text>
          </Col>
          <Col>
            <Space>
              {/* Export Button */}
              <AdvancedReportGenerator
                dataSource={enhancedPurchases}
                columns={exportColumns}
                title={`Purchase Management Report - ${currentStationName}`}
                fileName={`purchases_${new Date().toISOString().split('T')[0]}`}
                footerText={`Generated from Energy ERP System - Station: ${currentStationName} - User: ${state.currentUser?.firstName} ${state.currentUser?.lastName} - ${new Date().toLocaleDateString()}`}
                showFooter={true}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={() => {
                  // Navigate to create purchase
                  console.log('Navigate to create purchase form');
                }}
              >
                New Purchase
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={16}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Total Purchases"
              value={stats.total}
              valueStyle={{ color: '#1890ff',fontSize:"20px"  }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Pending Approval"
              value={stats.pending}
              valueStyle={{ color: '#fa8c16',fontSize:"20px"  }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Ready to Receive"
              value={stats.receivable}
              valueStyle={{ color: '#52c41a',fontSize:"20px"  }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="In Transit"
              value={stats.inTransit}
              valueStyle={{ color: '#722ed1', fontSize:"20px"  }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Completed"
              value={stats.completed}
              valueStyle={{ color: '#52c41a',fontSize:"20px"  }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Total Value"
              value={stats.totalValue}
              prefix="Ksh"
              valueStyle={{ color: '#faad14', fontSize:"20px" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col span={6}>
            <Search
              placeholder="Search by purchase # or supplier..."
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              onSearch={fetchPurchases}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange({ status: value })}
              allowClear
            >
              <Option value="DRAFT">Draft</Option>
              <Option value="PENDING_APPROVAL">Pending Approval</Option>
              <Option value="APPROVED">Approved</Option>
              <Option value="ORDER_CONFIRMED">Order Confirmed</Option>
              <Option value="IN_TRANSIT">In Transit</Option>
              <Option value="ARRIVED_AT_SITE">Arrived at Site</Option>
              <Option value="QUALITY_CHECK">Quality Check</Option>
              <Option value="PARTIALLY_RECEIVED">Partially Received</Option>
              <Option value="COMPLETED">Completed</Option>
              <Option value="CANCELLED">Cancelled</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Type"
              value={filters.type}
              onChange={(value) => handleFilterChange({ type: value })}
              allowClear
            >
              <Option value="FUEL">Fuel</Option>
              <Option value="NON_FUEL">Non-Fuel</Option>
              <Option value="MIXED">Mixed</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Product"
              value={filters.productId}
              onChange={(value) => handleFilterChange({ productId: value })}
              allowClear
              loading={loading}
            >
              {products.map(product => (
                <Option key={product.id} value={product.id}>
                  {product.name} {product.fuelCode ? `(${product.fuelCode})` : ''}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange({ dateRange: dates })}
              allowClear
            />
          </Col>
        </Row>
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Space>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchPurchases}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                icon={<FilterOutlined />}
                onClick={clearAllFilters}
                disabled={!filters.search && !filters.status && !filters.type && !filters.productId && !filters.dateRange}
              >
                Clear All Filters
              </Button>
              {/* Export Button in Filters */}
              <AdvancedReportGenerator
                dataSource={enhancedPurchases}
                columns={exportColumns}
                title={`Purchase Management Report - ${currentStationName}`}
                fileName={`purchases_${new Date().toISOString().split('T')[0]}`}
                footerText={`Generated from Energy ERP System - Station: ${currentStationName} - ${new Date().toLocaleDateString()}`}
                showFooter={true}
              />
              {(filters.search || filters.status || filters.type || filters.productId || filters.dateRange) && (
                <Text type="secondary">
                  Filtered by: 
                  {filters.search && ` Search: "${filters.search}"`}
                  {filters.status && ` Status: ${filters.status}`}
                  {filters.type && ` Type: ${filters.type}`}
                  {filters.productId && ` Product: ${products.find(p => p.id === filters.productId)?.name}`}
                  {filters.dateRange && ` Date: ${filters.dateRange[0]?.format('MMM DD, YYYY')} to ${filters.dateRange[1]?.format('MMM DD, YYYY')}`}
                </Text>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Purchases Table */}
      <Card>
        <Table
          columns={purchaseColumns}
          dataSource={formattedPurchases}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} purchase records`
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: loading ? 
              'Loading purchase records...' : 
              filters.search || filters.status || filters.type || filters.productId || filters.dateRange ? 
                'No purchases match your filters' : 
                'No purchase records found. Create a new purchase to get started.'
          }}
        />
      </Card>

      {/* Modals */}
      {selectedPurchase && (
        <PurchaseDetailsModal
          purchase={selectedPurchase}
          visible={!!selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
        />
      )}

      {/* Offload Wizard */}
      {showWizard && selectedPurchaseForOffload && (
        <OffloadWizard
          visible={showWizard}
          purchase={selectedPurchaseForOffload}
          onClose={() => {
            setShowWizard(false);
            setSelectedPurchaseForOffload(null);
          }}
          onComplete={(result) => {
            setShowWizard(false);
            setSelectedPurchaseForOffload(null);
            fetchPurchases(); // Refresh the list
          }}
          stationId={currentStation}
          userId={currentUser}
        />
      )}
    </div>
  );
};

export default OffloadManagement;