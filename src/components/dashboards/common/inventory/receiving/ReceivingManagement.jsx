// src/pages/inventory/receiving/ReceivingManagement.jsx
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
  Dropdown,
  Menu,
  Modal,
  Form,
  Descriptions,
  Badge,
  Progress,
  Tooltip,
  Popconfirm,
  message,
  Alert,
  Row,
  Col,
  Steps,
  Timeline,
  Upload
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  InboxOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  PrinterOutlined,
  UploadOutlined,
  FileTextOutlined,
  HistoryOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { nonFuelPurchaseService } from '../../../services/nonFuelPurchaseService';
import AddReceivingItemModal from './AddReceivingItemModal';
import UpdateReceivingStatusModal from './UpdateReceivingStatusModal';
import ReceivingDetailsModal from './ReceivingDetailsModal';
import ApproveReceivingModal from './ApproveReceivingModal';
import { useAuth } from '../../../contexts/AuthContext';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Step } = Steps;

const ReceivingManagement = ({ filters, onRefresh }) => {
  const [receivings, setReceivings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [selectedReceiving, setSelectedReceiving] = useState(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const { user } = useAuth();

  // Status configuration
  const statusConfig = {
    PENDING: { color: 'default', icon: <InboxOutlined />, actions: ['ARRIVED'] },
    ARRIVED: { color: 'blue', icon: <InboxOutlined />, actions: ['INSPECTION_IN_PROGRESS', 'COMPLETED'] },
    INSPECTION_IN_PROGRESS: { color: 'orange', icon: <ExclamationCircleOutlined />, actions: ['COMPLETED'] },
    COMPLETED: { color: 'green', icon: <CheckCircleOutlined />, actions: [] }
  };

  // Fetch receivings
  const fetchReceivings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await nonFuelPurchaseService.getReceivings({
        ...filters,
        page,
        limit: pagination.pageSize
      });

      const formattedReceivings = result.data.map(r => 
        nonFuelPurchaseService.formatReceiving(r)
      );
      
      setReceivings(formattedReceivings);
      setPagination({
        ...pagination,
        current: page,
        total: result.pagination?.total || result.data?.length || 0
      });
    } catch (error) {
      message.error('Failed to load receivings: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.pageSize]);

  useEffect(() => {
    fetchReceivings(1);
  }, [fetchReceivings]);

  // Handle status update
  const handleStatusUpdate = async (receivingId, newStatus) => {
    try {
      await nonFuelPurchaseService.updateReceivingStatus(receivingId, newStatus);
      message.success(`Status updated to ${newStatus}`);
      fetchReceivings(pagination.current);
      onRefresh?.();
    } catch (error) {
      message.error('Failed to update status: ' + error.message);
    }
  };

  // Handle add item
  const handleAddItem = async (receivingId, itemData) => {
    try {
      await nonFuelPurchaseService.addReceivingItem(receivingId, itemData);
      message.success('Item added successfully');
      fetchReceivings(pagination.current);
      onRefresh?.();
    } catch (error) {
      message.error('Failed to add item: ' + error.message);
    }
  };

  // Handle approve receiving
  const handleApproveReceiving = async (receivingId, notes) => {
    try {
      await nonFuelPurchaseService.approveReceiving(receivingId, notes);
      message.success('Receiving approved and supplier liability created');
      fetchReceivings(pagination.current);
      onRefresh?.();
    } catch (error) {
      message.error('Failed to approve receiving: ' + error.message);
    }
  };

  // Calculate inspection progress
  const calculateInspectionProgress = (receiving) => {
    const expected = receiving.expectedTotalItems || 0;
    const received = receiving.receivedTotalItems || 0;
    return expected > 0 ? Math.round((received / expected) * 100) : 0;
  };

  // Columns for the table
  const columns = [
    {
      title: 'Receiving #',
      dataIndex: 'receivingNumber',
      key: 'receivingNumber',
      fixed: 'left',
      render: (text, record) => (
        <Button 
          type="link" 
          onClick={() => {
            setSelectedReceiving(record);
            setShowDetailsModal(true);
          }}
          style={{ padding: 0 }}
        >
          {text}
        </Button>
      )
    },
    {
      title: 'Purchase #',
      key: 'purchaseNumber',
      render: (_, record) => record.purchaseNumber
    },
    {
      title: 'Supplier',
      key: 'supplierName',
      render: (_, record) => record.supplierName
    },
    {
      title: 'Invoice',
      key: 'invoice',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontSize: '12px' }}>{record.supplierInvoiceNumber}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            KES {record.supplierInvoiceAmount?.toLocaleString()}
          </div>
        </Space>
      )
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <div>
            <Badge 
              count={record.receivedTotalItems || 0} 
              style={{ backgroundColor: '#1890ff' }}
              title="Received"
            />
            <span style={{ margin: '0 4px' }}>/</span>
            <Badge 
              count={record.expectedTotalItems || 0} 
              style={{ backgroundColor: '#52c41a' }}
              title="Expected"
            />
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            Accepted: {record.acceptedItems || 0}, Damaged: {record.damagedItems || 0}
          </div>
        </Space>
      )
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
      title: 'Inspection',
      key: 'inspection',
      render: (_, record) => {
        const progress = calculateInspectionProgress(record);
        return (
          <Tooltip title={`${progress}% inspected`}>
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
      title: 'Driver',
      key: 'driver',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <div>{record.driverName}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {record.deliveryVehiclePlate}
          </div>
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      render: (_, record) => {
        const config = statusConfig[record.status] || {};
        const canAddItems = ['ARRIVED', 'INSPECTION_IN_PROGRESS'].includes(record.status);
        const canUpdateStatus = config.actions.length > 0;
        const canApprove = record.status === 'COMPLETED';
        const hasDocuments = record.hasDocuments;
        
        return (
          <Space>
            {/* View Details */}
            <Tooltip title="View Details">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => {
                  setSelectedReceiving(record);
                  setShowDetailsModal(true);
                }}
              />
            </Tooltip>

            {/* Add Items */}
            {canAddItems && (
              <Tooltip title="Add Items">
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setSelectedReceiving(record);
                    setShowAddItemModal(true);
                  }}
                />
              </Tooltip>
            )}

            {/* Update Status */}
            {canUpdateStatus && (
              <Tooltip title="Update Status">
                <Button
                  type="text"
                  icon={<SyncOutlined />}
                  onClick={() => {
                    setSelectedReceiving(record);
                    setShowStatusModal(true);
                  }}
                />
              </Tooltip>
            )}

            {/* Approve */}
            {canApprove && (
              <Tooltip title="Approve Receiving">
                <Button
                  type="text"
                  icon={<CheckOutlined />}
                  onClick={() => {
                    setSelectedReceiving(record);
                    setShowApproveModal(true);
                  }}
                />
              </Tooltip>
            )}

            {/* Documents */}
            {hasDocuments && (
              <Tooltip title="View Documents">
                <Button
                  type="text"
                  icon={<FileTextOutlined />}
                  onClick={() => {
                    // Navigate to documents tab
                  }}
                />
              </Tooltip>
            )}
          </Space>
        );
      }
    }
  ];

  // Action menu for bulk operations
  const actionMenu = (
    <Menu>
      <Menu.Item key="export" icon={<DownloadOutlined />}>
        Export to Excel
      </Menu.Item>
      <Menu.Item key="print" icon={<PrinterOutlined />}>
        Print Selected
      </Menu.Item>
      <Menu.Item key="bulk_status" icon={<SyncOutlined />}>
        Bulk Status Update
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="receiving-management">
      {/* Filters Bar */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} justify="space-between" align="middle">
          <Col flex="auto">
            <Space wrap>
              <Search
                placeholder="Search receiving #, invoice, driver..."
                style={{ width: 300 }}
                allowClear
              />
              <Select
                placeholder="Status"
                style={{ width: 150 }}
                allowClear
              >
                {Object.keys(statusConfig).map(status => (
                  <Option key={status} value={status}>
                    {status.replace(/_/g, ' ')}
                  </Option>
                ))}
              </Select>
              <RangePicker />
            </Space>
          </Col>
          <Col>
            <Space>
              <Dropdown overlay={actionMenu}>
                <Button icon={<FilterOutlined />}>
                  Actions
                </Button>
              </Dropdown>
              <Button type="primary" icon={<DownloadOutlined />}>
                Export
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Receivings Table */}
      <Card title={`Receivings (${pagination.total})`}>
        <Table
          columns={columns}
          dataSource={receivings}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page) => fetchReceivings(page),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} receivings`
          }}
          scroll={{ x: 1500 }}
          expandable={{
            expandedRowRender: (record) => (
              <ReceivingExpandedRow receiving={record} />
            ),
            rowExpandable: (record) => record.itemReceipts?.length > 0
          }}
        />
      </Card>

      {/* Modals */}
      {selectedReceiving && (
        <>
          <AddReceivingItemModal
            receiving={selectedReceiving}
            visible={showAddItemModal}
            onClose={() => {
              setShowAddItemModal(false);
              setSelectedReceiving(null);
            }}
            onSuccess={(itemData) => handleAddItem(selectedReceiving.id, itemData)}
          />

          <UpdateReceivingStatusModal
            receiving={selectedReceiving}
            visible={showStatusModal}
            onClose={() => {
              setShowStatusModal(false);
              setSelectedReceiving(null);
            }}
            onSuccess={(newStatus) => handleStatusUpdate(selectedReceiving.id, newStatus)}
          />

          <ReceivingDetailsModal
            receiving={selectedReceiving}
            visible={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedReceiving(null);
            }}
          />

          <ApproveReceivingModal
            receiving={selectedReceiving}
            visible={showApproveModal}
            onClose={() => {
              setShowApproveModal(false);
              setSelectedReceiving(null);
            }}
            onSuccess={(notes) => handleApproveReceiving(selectedReceiving.id, notes)}
          />
        </>
      )}
    </div>
  );
};

// Expanded row component for receiving details
const ReceivingExpandedRow = ({ receiving }) => {
  const itemReceipts = receiving.itemReceipts || [];
  
  return (
    <div style={{ padding: '16px 0' }}>
      {itemReceipts.length > 0 ? (
        <Table
          dataSource={itemReceipts}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            {
              title: 'Product',
              dataIndex: ['product', 'name'],
              key: 'product'
            },
            {
              title: 'Expected',
              dataIndex: 'expectedQty',
              key: 'expectedQty'
            },
            {
              title: 'Received',
              dataIndex: 'receivedQty',
              key: 'receivedQty'
            },
            {
              title: 'Accepted',
              dataIndex: 'acceptedQty',
              key: 'acceptedQty'
            },
            {
              title: 'Damaged',
              dataIndex: 'damagedQty',
              key: 'damagedQty'
            },
            {
              title: 'Batch',
              dataIndex: 'batchNumber',
              key: 'batchNumber',
              render: (text) => text || 'N/A'
            },
            {
              title: 'Status',
              key: 'status',
              render: (_, record) => (
                <Tag color={record.damagedQty > 0 ? 'orange' : 'green'}>
                  {record.damagedQty > 0 ? 'Damaged' : 'Accepted'}
                </Tag>
              )
            }
          ]}
        />
      ) : (
        <Alert
          message="No Items Received Yet"
          description="Add items to this receiving by clicking the 'Add Items' action button."
          type="info"
          showIcon
        />
      )}
    </div>
  );
};

export default ReceivingManagement;