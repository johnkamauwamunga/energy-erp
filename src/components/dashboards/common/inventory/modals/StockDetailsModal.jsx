// src/pages/inventory/StockDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Descriptions,
  Tag,
  Button,
  Space,
  Table,
  Timeline,
  Card,
  Divider,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Tabs,
  List,
  Avatar,
  Badge
} from 'antd';
import {
  EyeOutlined,
  DownloadOutlined,
  HistoryOutlined,
  BarcodeOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  StockOutlined,
  AppstoreOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { nonFuelPurchaseService } from '../../../services/nonFuelPurchaseService';

const { TabPane } = Tabs;

const StockDetailsModal = ({ item, warehouseId, visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [stockDetails, setStockDetails] = useState(null);
  const [receiptHistory, setReceiptHistory] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);

  useEffect(() => {
    if (item && warehouseId) {
      loadStockDetails();
    }
  }, [item, warehouseId]);

  const loadStockDetails = async () => {
    setLoading(true);
    try {
      const details = await nonFuelPurchaseService.getProductStock(warehouseId, item.productId);
      setStockDetails(details);
      
      if (details.stock?.[0]?.itemReceipts) {
        setReceiptHistory(details.stock[0].itemReceipts);
      }
      
      if (details.stock?.[0]?.transferItems) {
        setTransferHistory(details.stock[0].transferItems);
      }
    } catch (error) {
      console.error('Failed to load stock details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!stockDetails) return null;

  const mainStockItem = stockDetails.stock?.[0];
  const product = stockDetails.product;

  return (
    <Modal
      title="Stock Item Details"
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
      destroyOnClose
    >
      <div style={{ minHeight: 500 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>
            {product?.name}
            <span style={{ marginLeft: 16, fontSize: '14px', color: '#666' }}>
              {product?.category?.name} • {product?.unit}
            </span>
          </h3>
          <Button icon={<DownloadOutlined />}>
            Export
          </Button>
        </Space>

        <Tabs defaultActiveKey="overview">
          <TabPane tab="Overview" key="overview">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card size="small">
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Descriptions title="Product Information" column={1}>
                        <Descriptions.Item label="Product">
                          <strong>{product?.name}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Category">
                          {product?.category?.name} → {product?.subCategory?.name}
                        </Descriptions.Item>
                        <Descriptions.Item label="Unit">
                          <Tag color="blue">{product?.unit}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Product Code">
                          {product?.code || 'N/A'}
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                    <Col span={8}>
                      <Descriptions title="Stock Information" column={1}>
                        <Descriptions.Item label="Batch">
                          <Space>
                            <BarcodeOutlined />
                            {mainStockItem?.batchNumber || 'No batch'}
                          </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Available">
                          <Tag color={
                            mainStockItem?.availableQty <= (mainStockItem?.reorderPoint || 0) ? 'red' :
                            mainStockItem?.availableQty <= (mainStockItem?.minStock || 0) ? 'orange' : 'green'
                          }>
                            {mainStockItem?.availableQty || 0}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Physical">
                          <Tag color="blue">{mainStockItem?.physicalQty || 0}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Reserved">
                          <Tag color="orange">{mainStockItem?.reservedQty || 0}</Tag>
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                    <Col span={8}>
                      <Descriptions title="Location & Dates" column={1}>
                        <Descriptions.Item label="Warehouse">
                          {mainStockItem?.warehouse?.name}
                        </Descriptions.Item>
                        <Descriptions.Item label="Storage Location">
                          <Space>
                            <EnvironmentOutlined />
                            {mainStockItem?.storageLocation || 'Not specified'}
                          </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Expiry Date">
                          <Space>
                            <CalendarOutlined />
                            {mainStockItem?.expiryDate ? (
                              <Tag color={new Date(mainStockItem.expiryDate) < new Date() ? 'red' : '#108ee9'}>
                                {new Date(mainStockItem.expiryDate).toLocaleDateString()}
                              </Tag>
                            ) : 'No expiry'}
                          </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Last Receipt">
                          {mainStockItem?.lastReceiptDate ? 
                            new Date(mainStockItem.lastReceiptDate).toLocaleDateString() : 'N/A'
                          }
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Stock Levels">
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Statistic
                        title="Min Stock"
                        value={mainStockItem?.minStock || 0}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Reorder Point"
                        value={mainStockItem?.reorderPoint || 0}
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Max Stock"
                        value={mainStockItem?.maxStock || '∞'}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Current Level"
                        value={`${Math.round((mainStockItem?.availableQty || 0) / (mainStockItem?.maxStock || 100) * 100)}%`}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                  </Row>
                  <Progress
                    percent={Math.min((mainStockItem?.availableQty || 0) / (mainStockItem?.maxStock || 100) * 100, 100)}
                    status={
                      mainStockItem?.availableQty <= (mainStockItem?.reorderPoint || 0) ? 'exception' :
                      mainStockItem?.availableQty <= (mainStockItem?.minStock || 0) ? 'active' : 'normal'
                    }
                    style={{ marginTop: 16 }}
                  />
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Financial Information">
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Statistic
                        title="Unit Cost"
                        value={mainStockItem?.avgUnitCost || 0}
                        prefix="KES"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Last Cost Price"
                        value={mainStockItem?.lastCostPrice || 0}
                        prefix="KES"
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Stock Value"
                        value={(mainStockItem?.availableQty || 0) * (mainStockItem?.avgUnitCost || 0)}
                        prefix="KES"
                        valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>

              {stockDetails.stock && stockDetails.stock.length > 1 && (
                <Col span={24}>
                  <Card size="small" title="Other Batches">
                    <Table
                      dataSource={stockDetails.stock.slice(1)}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: 'Batch',
                          dataIndex: 'batchNumber',
                          key: 'batchNumber',
                          render: (text) => text || 'No batch'
                        },
                        {
                          title: 'Available',
                          dataIndex: 'availableQty',
                          key: 'availableQty'
                        },
                        {
                          title: 'Expiry',
                          dataIndex: 'expiryDate',
                          key: 'expiryDate',
                          render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
                        },
                        {
                          title: 'Unit Cost',
                          dataIndex: 'avgUnitCost',
                          key: 'avgUnitCost',
                          render: (cost) => `KES ${cost?.toLocaleString()}`
                        },
                        {
                          title: 'Value',
                          key: 'value',
                          render: (_, record) => 
                            `KES ${((record.availableQty || 0) * (record.avgUnitCost || 0)).toLocaleString()}`
                        }
                      ]}
                    />
                  </Card>
                </Col>
              )}
            </Row>
          </TabPane>

          <TabPane tab="Receipt History" key="receipts">
            {receiptHistory.length > 0 ? (
              <Table
                dataSource={receiptHistory}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'receivedAt',
                    key: 'receivedAt',
                    render: (date) => new Date(date).toLocaleDateString()
                  },
                  {
                    title: 'Receiving #',
                    dataIndex: ['purchaseReceiving', 'receivingNumber'],
                    key: 'receivingNumber'
                  },
                  {
                    title: 'Purchase #',
                    dataIndex: ['purchaseReceiving', 'purchase', 'purchaseNumber'],
                    key: 'purchaseNumber'
                  },
                  {
                    title: 'Received Qty',
                    dataIndex: 'receivedQty',
                    key: 'receivedQty'
                  },
                  {
                    title: 'Accepted Qty',
                    dataIndex: 'acceptedQty',
                    key: 'acceptedQty',
                    render: (text, record) => (
                      <Tag color={record.damagedQty > 0 ? 'orange' : 'green'}>
                        {text}
                      </Tag>
                    )
                  },
                  {
                    title: 'Damaged',
                    dataIndex: 'damagedQty',
                    key: 'damagedQty',
                    render: (text) => text > 0 ? <Tag color="red">{text}</Tag> : '0'
                  },
                  {
                    title: 'Unit Cost',
                    dataIndex: 'unitCost',
                    key: 'unitCost',
                    render: (text) => `KES ${text?.toLocaleString()}`
                  },
                  {
                    title: 'Batch',
                    dataIndex: 'batchNumber',
                    key: 'batchNumber',
                    render: (text) => text || 'N/A'
                  }
                ]}
              />
            ) : (
              <Alert
                message="No Receipt History"
                description="No receipt history found for this product."
                type="info"
                showIcon
              />
            )}
          </TabPane>

          <TabPane tab="Transfer History" key="transfers">
            {transferHistory.length > 0 ? (
              <Table
                dataSource={transferHistory}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'createdAt',
                    key: 'createdAt',
                    render: (date) => new Date(date).toLocaleDateString()
                  },
                  {
                    title: 'Transfer #',
                    dataIndex: ['transferRequest', 'transferNumber'],
                    key: 'transferNumber'
                  },
                  {
                    title: 'From/To',
                    key: 'location',
                    render: (_, record) => (
                      <Space>
                        <Tag color="blue">{record.transferRequest?.sourceIsland?.name}</Tag>
                        <span>→</span>
                        <Tag color="green">{record.transferRequest?.destinationIsland?.name}</Tag>
                      </Space>
                    )
                  },
                  {
                    title: 'Quantity',
                    dataIndex: 'quantity',
                    key: 'quantity'
                  },
                  {
                    title: 'Status',
                    dataIndex: ['transferRequest', 'status'],
                    key: 'status',
                    render: (status) => (
                      <Tag color={
                        status === 'COMPLETED' ? 'green' :
                        status === 'IN_TRANSIT' ? 'blue' :
                        status === 'PENDING' ? 'orange' : 'default'
                      }>
                        {status}
                      </Tag>
                    )
                  },
                  {
                    title: 'Notes',
                    dataIndex: 'notes',
                    key: 'notes',
                    render: (text) => text || 'N/A'
                  }
                ]}
              />
            ) : (
              <Alert
                message="No Transfer History"
                description="No transfer history found for this product."
                type="info"
                showIcon
              />
            )}
          </TabPane>

          <TabPane tab="Stock Alerts" key="alerts">
            <List
              dataSource={[
                ...(mainStockItem?.availableQty <= (mainStockItem?.reorderPoint || 0) ? [{
                  type: 'CRITICAL',
                  message: `Stock level (${mainStockItem?.availableQty}) is below reorder point (${mainStockItem?.reorderPoint})`,
                  icon: <WarningOutlined />
                }] : []),
                ...(mainStockItem?.availableQty <= (mainStockItem?.minStock || 0) ? [{
                  type: 'WARNING',
                  message: `Stock level (${mainStockItem?.availableQty}) is below minimum stock (${mainStockItem?.minStock})`,
                  icon: <WarningOutlined />
                }] : []),
                ...(mainStockItem?.expiryDate && new Date(mainStockItem.expiryDate) < new Date() ? [{
                  type: 'CRITICAL',
                  message: `Product expired on ${new Date(mainStockItem.expiryDate).toLocaleDateString()}`,
                  icon: <CloseCircleOutlined />
                }] : []),
                ...(mainStockItem?.expiryDate && 
                    new Date(mainStockItem.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? [{
                  type: 'WARNING',
                  message: `Product expiring soon on ${new Date(mainStockItem.expiryDate).toLocaleDateString()}`,
                  icon: <WarningOutlined />
                }] : [])
              ]}
              renderItem={(alert) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={alert.icon} 
                        style={{ 
                          backgroundColor: alert.type === 'CRITICAL' ? '#ff4d4f' : '#fa8c16' 
                        }}
                      />
                    }
                    title={
                      <Space>
                        <Tag color={alert.type === 'CRITICAL' ? 'red' : 'orange'}>
                          {alert.type}
                        </Tag>
                        <span>{alert.message}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{
                emptyText: (
                  <Alert
                    message="No Active Alerts"
                    description="This product has no active stock alerts."
                    type="success"
                    showIcon
                  />
                )
              }}
            />
          </TabPane>
        </Tabs>
      </div>
    </Modal>
  );
};

export default StockDetailsModal;