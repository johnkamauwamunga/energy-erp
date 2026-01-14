// src/pages/inventory/PurchaseDetailsModal.jsx
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
  Tabs
} from 'antd';
import {
  EyeOutlined,
  DownloadOutlined,
  PrinterOutlined,
  HistoryOutlined,
  FileTextOutlined,
  UserOutlined,
  ShopOutlined,
  HomeOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { nonFuelPurchaseService } from '../../../services/nonFuelPurchaseService';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const { TabPane } = Tabs;

const PurchaseDetailsModal = ({ purchase, visible, onClose, onStatusUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState(null);
  const [supplierTransactions, setSupplierTransactions] = useState([]);

  useEffect(() => {
    if (purchase) {
      loadPurchaseDetails();
    }
  }, [purchase]);

  const loadPurchaseDetails = async () => {
    setLoading(true);
    try {
      const details = await nonFuelPurchaseService.getPurchaseById(purchase.id);
      setPurchaseDetails(details);
      
      if (details.supplierTransactions) {
        setSupplierTransactions(details.supplierTransactions);
      }
    } catch (error) {
      console.error('Failed to load purchase details:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!purchaseDetails) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text('Purchase Order Details', 20, 20);
    
    // Purchase Information
    doc.setFontSize(10);
    doc.text(`Purchase Number: ${purchaseDetails.purchaseNumber}`, 20, 35);
    doc.text(`Date: ${new Date(purchaseDetails.purchaseDate).toLocaleDateString()}`, 20, 40);
    doc.text(`Supplier: ${purchaseDetails.supplier?.name}`, 20, 45);
    doc.text(`Status: ${purchaseDetails.status}`, 20, 50);
    
    // Financial Summary
    doc.setFontSize(12);
    doc.text('Financial Summary', 20, 65);
    doc.setFontSize(10);
    doc.text(`Gross Amount: KES ${purchaseDetails.grossAmount?.toLocaleString()}`, 20, 72);
    doc.text(`Tax Amount: KES ${purchaseDetails.totalTaxAmount?.toLocaleString()}`, 20, 77);
    doc.text(`Discount: KES ${purchaseDetails.discountAmount?.toLocaleString()}`, 20, 82);
    doc.text(`Net Payable: KES ${purchaseDetails.netPayable?.toLocaleString()}`, 20, 87);
    
    // Items Table
    const tableData = purchaseDetails.items?.map((item, index) => [
      index + 1,
      item.product?.name,
      item.orderedQty,
      item.product?.unit,
      `KES ${item.unitCost?.toLocaleString()}`,
      `KES ${(item.orderedQty * item.unitCost)?.toLocaleString()}`
    ]) || [];

    doc.autoTable({
      head: [['#', 'Product', 'Qty', 'Unit', 'Unit Cost', 'Total']],
      body: tableData,
      startY: 100,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 10
      );
    }

    doc.save(`purchase-${purchaseDetails.purchaseNumber}.pdf`);
  };

  if (!purchaseDetails) return null;

  const statusTimeline = [
    {
      status: 'DRAFT',
      color: purchaseDetails.status === 'DRAFT' ? 'green' : 'gray',
      time: purchaseDetails.createdAt
    },
    {
      status: 'APPROVED',
      color: ['APPROVED', 'ORDER_CONFIRMED', 'IN_TRANSIT', 'ARRIVED_AT_SITE', 'QUALITY_CHECK', 'PARTIALLY_RECEIVED', 'COMPLETED'].includes(purchaseDetails.status) ? 'green' : 'gray',
      time: purchaseDetails.approvedAt
    },
    {
      status: 'IN_TRANSIT',
      color: ['IN_TRANSIT', 'ARRIVED_AT_SITE', 'QUALITY_CHECK', 'PARTIALLY_RECEIVED', 'COMPLETED'].includes(purchaseDetails.status) ? 'green' : 'gray',
      time: purchaseDetails.statusUpdatedAt
    },
    {
      status: 'RECEIVED',
      color: ['ARRIVED_AT_SITE', 'QUALITY_CHECK', 'PARTIALLY_RECEIVED', 'COMPLETED'].includes(purchaseDetails.status) ? 'green' : 'gray',
      time: purchaseDetails.receivedDate
    },
    {
      status: 'COMPLETED',
      color: purchaseDetails.status === 'COMPLETED' ? 'green' : 'gray',
      time: purchaseDetails.completedAt
    }
  ];

  return (
    <Modal
      title="Purchase Details"
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
      destroyOnClose
    >
      <div style={{ minHeight: 500 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>{purchaseDetails.purchaseNumber}</h3>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={exportToPDF}>
              PDF
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              Print
            </Button>
            {onStatusUpdate && (
              <Button
                type="primary"
                onClick={() => {
                  onClose();
                  onStatusUpdate();
                }}
              >
                Update Status
              </Button>
            )}
          </Space>
        </Space>

        <Tabs defaultActiveKey="overview">
          <TabPane tab="Overview" key="overview">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card size="small">
                  <Descriptions title="Basic Information" column={3}>
                    <Descriptions.Item label="Purchase Number">
                      <Tag color="blue">{purchaseDetails.purchaseNumber}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Purchase Date">
                      {new Date(purchaseDetails.purchaseDate).toLocaleDateString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={nonFuelPurchaseService.formatPurchase(purchaseDetails).statusColor}>
                        {purchaseDetails.status.replace(/_/g, ' ')}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Supplier">
                      <Space>
                        <UserOutlined />
                        {purchaseDetails.supplier?.name}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Station">
                      <Space>
                        <ShopOutlined />
                        {purchaseDetails.station?.name}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Warehouse">
                      <Space>
                        <HomeOutlined />
                        {purchaseDetails.warehouse?.name}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Financial Summary">
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Statistic
                        title="Gross Amount"
                        value={purchaseDetails.grossAmount}
                        prefix="KES"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Tax Amount"
                        value={purchaseDetails.totalTaxAmount}
                        prefix="KES"
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Discount"
                        value={purchaseDetails.discountAmount}
                        prefix="KES"
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Net Payable"
                        value={purchaseDetails.netPayable}
                        prefix="KES"
                        valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Delivery Progress">
                  <Progress
                    percent={nonFuelPurchaseService.calculatePurchaseSummary(purchaseDetails).completionRate}
                    status="active"
                    format={(percent) => `${percent}% Received`}
                  />
                  <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col span={12}>
                      <Statistic
                        title="Total Items"
                        value={purchaseDetails.items?.length || 0}
                        prefix={<ShoppingCartOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Total Quantity"
                        value={purchaseDetails.items?.reduce((sum, item) => sum + item.orderedQty, 0) || 0}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Status Timeline">
                  <Timeline>
                    {statusTimeline.map((item, index) => (
                      <Timeline.Item
                        key={index}
                        color={item.color}
                        dot={item.color === 'green' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                      >
                        <Space>
                          <strong>{item.status}</strong>
                          {item.time && (
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              {new Date(item.time).toLocaleString()}
                            </span>
                          )}
                        </Space>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="Items" key="items">
            <Table
              dataSource={purchaseDetails.items || []}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Product',
                  dataIndex: ['product', 'name'],
                  key: 'product',
                  render: (text, record) => (
                    <div>
                      <strong>{text}</strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {record.product?.category?.name} • {record.product?.unit}
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Ordered',
                  dataIndex: 'orderedQty',
                  key: 'orderedQty',
                  render: (text) => <Tag color="blue">{text}</Tag>
                },
                {
                  title: 'Received',
                  dataIndex: 'receivedQty',
                  key: 'receivedQty',
                  render: (text, record) => (
                    <Tag color={text === record.orderedQty ? 'green' : 'orange'}>
                      {text || 0}
                    </Tag>
                  )
                },
                {
                  title: 'Pending',
                  key: 'pending',
                  render: (_, record) => (
                    <Tag color="red">
                      {record.orderedQty - (record.receivedQty || 0)}
                    </Tag>
                  )
                },
                {
                  title: 'Unit Cost',
                  dataIndex: 'unitCost',
                  key: 'unitCost',
                  render: (text) => `KES ${text?.toLocaleString()}`
                },
                {
                  title: 'Total Cost',
                  key: 'totalCost',
                  render: (_, record) => `KES ${(record.orderedQty * record.unitCost)?.toLocaleString()}`
                },
                {
                  title: 'Batch',
                  dataIndex: 'batchNumber',
                  key: 'batchNumber',
                  render: (text) => text || 'N/A'
                }
              ]}
            />
          </TabPane>

          <TabPane tab="Supplier Transactions" key="transactions">
            {supplierTransactions.length > 0 ? (
              <Table
                dataSource={supplierTransactions}
                rowKey="id"
                pagination={false}
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'transactionDate',
                    key: 'transactionDate',
                    render: (date) => new Date(date).toLocaleDateString()
                  },
                  {
                    title: 'Type',
                    dataIndex: 'type',
                    key: 'type',
                    render: (type) => (
                      <Tag color={type === 'PURCHASE_INVOICE' ? 'blue' : 'green'}>
                        {type.replace(/_/g, ' ')}
                      </Tag>
                    )
                  },
                  {
                    title: 'Amount',
                    dataIndex: 'amount',
                    key: 'amount',
                    render: (amount) => `KES ${amount?.toLocaleString()}`
                  },
                  {
                    title: 'Description',
                    dataIndex: 'description',
                    key: 'description'
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status) => (
                      <Tag color={status === 'PAID' ? 'green' : status === 'PARTIALLY_PAID' ? 'orange' : 'red'}>
                        {status}
                      </Tag>
                    )
                  }
                ]}
              />
            ) : (
              <Alert
                message="No Supplier Transactions"
                description="This purchase doesn't have any supplier transactions yet."
                type="info"
                showIcon
              />
            )}
          </TabPane>

          <TabPane tab="Receivings" key="receivings">
            {purchaseDetails.nonefuelPurchaseReceiving?.length > 0 ? (
              <Table
                dataSource={purchaseDetails.nonefuelPurchaseReceiving}
                rowKey="id"
                pagination={false}
                columns={[
                  {
                    title: 'Receiving #',
                    dataIndex: 'receivingNumber',
                    key: 'receivingNumber'
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status) => (
                      <Tag color={status === 'COMPLETED' ? 'green' : status === 'INSPECTION_IN_PROGRESS' ? 'orange' : 'blue'}>
                        {status.replace(/_/g, ' ')}
                      </Tag>
                    )
                  },
                  {
                    title: 'Invoice',
                    dataIndex: 'supplierInvoiceNumber',
                    key: 'supplierInvoiceNumber'
                  },
                  {
                    title: 'Items',
                    key: 'items',
                    render: (_, record) => (
                      <span>
                        {record.receivedTotalItems || 0} / {record.expectedTotalItems || 0}
                      </span>
                    )
                  },
                  {
                    title: 'Driver',
                    dataIndex: 'driverName',
                    key: 'driverName'
                  },
                  {
                    title: 'Date',
                    dataIndex: 'deliveryTime',
                    key: 'deliveryTime',
                    render: (date) => new Date(date).toLocaleDateString()
                  }
                ]}
              />
            ) : (
              <Alert
                message="No Receivings"
                description="This purchase doesn't have any receivings yet."
                type="info"
                showIcon
              />
            )}
          </TabPane>
        </Tabs>
      </div>
    </Modal>
  );
};

export default PurchaseDetailsModal;