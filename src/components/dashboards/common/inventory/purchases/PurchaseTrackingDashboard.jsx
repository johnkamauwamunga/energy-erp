// src/pages/inventory/purchases/PurchaseTrackingDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Statistic,
  Row,
  Col,
  Modal,
  Form,
  Steps,
  Descriptions,
  Timeline,
  Badge,
  Progress,
  Tooltip,
  Popconfirm,
  message,
  Alert,
  Tabs
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HourglassOutlined,
  TruckOutlined,
  InboxOutlined,
  CheckOutlined,
  SyncOutlined,
  HistoryOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { nonFuelPurchaseService } from '../../../services/nonFuelPurchaseService';
import CreateReceivingModal from '../receiving/CreateReceivingModal';
import UpdatePurchaseStatusModal from './UpdatePurchaseStatusModal';
import PurchaseDetailsModal from './PurchaseDetailsModal';
import { useAuth } from '../../../contexts/AuthContext';
import './PurchaseTrackingDashboard.css';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Step } = Steps;

const PurchaseTrackingDashboard = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    status: undefined,
    supplierId: undefined,
    stationId: undefined,
    startDate: undefined,
    endDate: undefined,
    type: 'NON_FUEL'
  });
  
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceivingModal, setShowReceivingModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const { user } = useAuth();

  // Fetch purchases
  const fetchPurchases = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await nonFuelPurchaseService.getPurchases({
        ...filters,
        page,
        limit: pagination.pageSize
      });

      setPurchases(result.data || []);
      setPagination({
        ...pagination,
        current: page,
        total: result.pagination?.total || result.data?.length || 0
      });
    } catch (error) {
      message.error('Failed to load purchases: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.pageSize]);

  useEffect(() => {
    fetchPurchases(1);
  }, [fetchPurchases]);

  // Status configuration
  const statusConfig = {
    DRAFT: { color: 'default', icon: <FileTextOutlined /> },
    PENDING_APPROVAL: { color: 'gold', icon: <HourglassOutlined /> },
    APPROVED: { color: 'blue', icon: <CheckCircleOutlined /> },
    ORDER_CONFIRMED: { color: 'cyan', icon: <SyncOutlined /> },
    IN_TRANSIT: { color: 'geekblue', icon: <TruckOutlined /> },
    ARRIVED_AT_SITE: { color: 'purple', icon: <InboxOutlined /> },
    QUALITY_CHECK: { color: 'orange', icon: <ExclamationCircleOutlined /> },
    PARTIALLY_RECEIVED: { color: 'lime', icon: <SyncOutlined spin /> },
    COMPLETED: { color: 'green', icon: <CheckOutlined /> },
    CANCELLED: { color: 'red', icon: <CloseCircleOutlined /> },
    REJECTED: { color: 'volcano', icon: <CloseCircleOutlined /> },
    ON_HOLD: { color: 'warning', icon: <HourglassOutlined /> }
  };

  // Delivery status configuration
  const deliveryStatusConfig = {
    PENDING: { color: 'default', text: 'Pending' },
    IN_TRANSIT: { color: 'processing', text: 'In Transit' },
    ARRIVED_AT_SITE: { color: 'success', text: 'Arrived' },
    PARTIALLY_ACCEPTED: { color: 'warning', text: 'Partially Accepted' },
    FULLY_ACCEPTED: { color: 'success', text: 'Fully Accepted' },
    REJECTED: { color: 'error', text: 'Rejected' }
  };

  // Handle status update
  const handleStatusUpdate = async (purchaseId, newStatus) => {
    try {
      await nonFuelPurchaseService.updatePurchaseStatus(purchaseId, newStatus);
      message.success(`Purchase status updated to ${newStatus}`);
      fetchPurchases(pagination.current);
    } catch (error) {
      message.error('Failed to update status: ' + error.message);
    }
  };

  // Handle create receiving
  const handleCreateReceiving = (purchase) => {
    setSelectedPurchase(purchase);
    setShowReceivingModal(true);
  };

  // View purchase details
  const handleViewDetails = (purchase) => {
    setSelectedPurchase(purchase);
    setShowDetailsModal(true);
  };

  // Calculate delivery progress
  const calculateDeliveryProgress = (purchase) => {
    const items = purchase.items || [];
    const totalOrdered = items.reduce((sum, item) => sum + (item.orderedQty || 0), 0);
    const totalReceived = items.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
    return totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
  };

  // Columns for the table
  const columns = [
    {
      title: 'Purchase #',
      dataIndex: 'purchaseNumber',
      key: 'purchaseNumber',
      fixed: 'left',
      render: (text, record) => (
        <Button 
          type="link" 
          onClick={() => handleViewDetails(record)}
          style={{ padding: 0 }}
        >
          {text}
        </Button>
      )
    },
    {
      title: 'Date',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_, record) => record.supplier?.name || 'N/A'
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, record) => {
        const items = record.items || [];
        const totalQty = items.reduce((sum, item) => sum + (item.orderedQty || 0), 0);
        return `${items.length} items (${totalQty} units)`;
      }
    },
    {
      title: 'Amount',
      dataIndex: 'netPayable',
      key: 'netPayable',
      render: (amount) => `KES ${amount?.toLocaleString() || '0'}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = statusConfig[status] || {};
        return (
          <Tag icon={config.icon} color={config.color}>
            {status.replace(/_/g, ' ')}
          </Tag>
        );
      }
    },
    {
      title: 'Delivery',
      dataIndex: 'deliveryStatus',
      key: 'deliveryStatus',
      render: (status) => {
        const config = deliveryStatusConfig[status] || {};
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (_, record) => {
        const progress = calculateDeliveryProgress(record);
        return (
          <Tooltip title={`${progress}% received`}>
            <Progress 
              percent={progress} 
              size="small" 
              status={progress === 100 ? 'success' : 'active'}
            />
          </Tooltip>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      render: (_, record) => {
        const canUpdateStatus = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(record.status);
        const canCreateReceiving = ['APPROVED', 'ORDER_CONFIRMED', 'IN_TRANSIT'].includes(record.status);
        const isCompleted = record.status === 'COMPLETED';
        
        return (
          <Space>
            <Tooltip title="View Details">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetails(record)}
              />
            </Tooltip>
            
            {canUpdateStatus && (
              <Tooltip title="Update Status">
                <Button
                  type="text"
                  icon={<SyncOutlined />}
                  onClick={() => {
                    setSelectedPurchase(record);
                    setShowStatusModal(true);
                  }}
                />
              </Tooltip>
            )}
            
            {canCreateReceiving && !isCompleted && (
              <Tooltip title="Create Receiving">
                <Button
                  type="text"
                  icon={<InboxOutlined />}
                  onClick={() => handleCreateReceiving(record)}
                />
              </Tooltip>
            )}
            
            {record.status === 'DRAFT' && (
              <Popconfirm
                title="Are you sure you want to delete this purchase?"
                onConfirm={async () => {
                  try {
                    await nonFuelPurchaseService.deletePurchase(record.id);
                    message.success('Purchase deleted successfully');
                    fetchPurchases(pagination.current);
                  } catch (error) {
                    message.error('Failed to delete purchase: ' + error.message);
                  }
                }}
              >
                <Tooltip title="Delete">
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      }
    }
  ];

  // Summary statistics
  const summaryStats = purchases.reduce((acc, purchase) => {
    acc.totalAmount += purchase.netPayable || 0;
    acc.totalItems += purchase.items?.length || 0;
    if (purchase.status === 'COMPLETED') acc.completedCount++;
    if (purchase.status === 'IN_TRANSIT') acc.inTransitCount++;
    if (purchase.deliveryStatus === 'FULLY_ACCEPTED') acc.fullyAcceptedCount++;
    return acc;
  }, {
    totalAmount: 0,
    totalItems: 0,
    completedCount: 0,
    inTransitCount: 0,
    fullyAcceptedCount: 0
  });

  return (
    <div className="purchase-tracking-dashboard">
      {/* Header with Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Non-Fuel Purchase Tracking</h3>
              <Space>
                <Button icon={<DownloadOutlined />}>Export</Button>
                <Button type="primary" icon={<BarChartOutlined />}>
                  Analytics
                </Button>
              </Space>
            </div>
          </Col>
          
          <Col xs={24} md={8}>
            <Search
              placeholder="Search by purchase #, supplier, item..."
              allowClear
              onSearch={(value) => setFilters(prev => ({ ...prev, search: value }))}
            />
          </Col>
          
          <Col xs={12} md={5}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              {Object.keys(statusConfig).map(status => (
                <Option key={status} value={status}>
                  {status.replace(/_/g, ' ')}
                </Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={12} md={5}>
            <Select
              placeholder="Delivery Status"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => setFilters(prev => ({ ...prev, deliveryStatus: value }))}
            >
              {Object.keys(deliveryStatusConfig).map(status => (
                <Option key={status} value={status}>
                  {deliveryStatusConfig[status].text}
                </Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={24} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(dates) => setFilters(prev => ({
                ...prev,
                startDate: dates?.[0]?.toISOString(),
                endDate: dates?.[1]?.toISOString()
              }))}
            />
          </Col>
        </Row>
      </Card>

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Purchases"
              value={pagination.total}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Amount"
              value={summaryStats.totalAmount}
              prefix="KES"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => value.toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="In Transit"
              value={summaryStats.inTransitCount}
              prefix={<TruckOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Completed"
              value={summaryStats.completedCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={`/ ${pagination.total}`}
            />
          </Card>
        </Col>
      </Row>

      {/* Purchases Table */}
      <Card title={`Non-Fuel Purchases (${pagination.total})`}>
        <Table
          columns={columns}
          dataSource={purchases}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page) => fetchPurchases(page),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} purchases`
          }}
          scroll={{ x: 1500 }}
          expandable={{
            expandedRowRender: (record) => (
              <PurchaseExpandedRow purchase={record} />
            ),
            rowExpandable: (record) => record.items?.length > 0
          }}
        />
      </Card>

      {/* Modals */}
      {selectedPurchase && (
        <>
          <PurchaseDetailsModal
            purchase={selectedPurchase}
            visible={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            onStatusUpdate={() => fetchPurchases(pagination.current)}
          />
          
          <CreateReceivingModal
            purchase={selectedPurchase}
            visible={showReceivingModal}
            onClose={() => {
              setShowReceivingModal(false);
              setSelectedPurchase(null);
            }}
            onSuccess={() => {
              message.success('Receiving created successfully');
              fetchPurchases(pagination.current);
            }}
          />
          
          <UpdatePurchaseStatusModal
            purchase={selectedPurchase}
            visible={showStatusModal}
            onClose={() => {
              setShowStatusModal(false);
              setSelectedPurchase(null);
            }}
            onSuccess={() => {
              message.success('Status updated successfully');
              fetchPurchases(pagination.current);
            }}
          />
        </>
      )}
    </div>
  );
};

// Expanded row component for purchase details
const PurchaseExpandedRow = ({ purchase }) => {
  const items = purchase.items || [];
  
  return (
    <div style={{ padding: '16px 0' }}>
      <Descriptions title="Purchase Items" bordered size="small" column={2}>
        {items.map((item, index) => (
          <Descriptions.Item 
            key={item.id || index} 
            label={
              <div>
                <strong>{item.product?.name || `Item ${index + 1}`}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {item.product?.category?.name} • {item.product?.unit}
                </div>
              </div>
            }
          >
            <Space direction="vertical" size="small">
              <div>
                <Tag color="blue">Ordered: {item.orderedQty}</Tag>
                <Tag color={item.receivedQty === item.orderedQty ? 'green' : 'orange'}>
                  Received: {item.receivedQty || 0}
                </Tag>
              </div>
              <div>
                <span>Unit Cost: KES {item.unitCost?.toLocaleString()}</span>
                <span style={{ marginLeft: 16 }}>
                  Total: KES {(item.orderedQty * item.unitCost)?.toLocaleString()}
                </span>
              </div>
              {item.batchNumber && (
                <Tag color="purple">Batch: {item.batchNumber}</Tag>
              )}
            </Space>
          </Descriptions.Item>
        ))}
      </Descriptions>
    </div>
  );
};

export default PurchaseTrackingDashboard;