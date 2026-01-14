// src/pages/inventory/ReceivingDetailsModal.jsx
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
  Badge,
  List,
  Avatar
} from 'antd';
import {
  EyeOutlined,
  DownloadOutlined,
  PrinterOutlined,
  FileTextOutlined,
  UserOutlined,
  TruckOutlined,
  HomeOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  BarcodeOutlined
} from '@ant-design/icons';
import { nonFuelPurchaseService } from '../../../services/nonFuelPurchaseService';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const { TabPane } = Tabs;

const ReceivingDetailsModal = ({ receiving, visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [receivingDetails, setReceivingDetails] = useState(null);
  const [itemReceipts, setItemReceipts] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (receiving) {
      loadReceivingDetails();
    }
  }, [receiving]);

  const loadReceivingDetails = async () => {
    setLoading(true);
    try {
      const details = await nonFuelPurchaseService.getReceivingById(receiving.id);
      setReceivingDetails(details);
      
      if (details.itemReceipts) {
        setItemReceipts(details.itemReceipts);
      }
      
      if (details.documents) {
        setDocuments(details.documents);
      }
    } catch (error) {
      console.error('Failed to load receiving details:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!receivingDetails) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text('Receiving Details', 20, 20);
    
    // Receiving Information
    doc.setFontSize(10);
    doc.text(`Receiving Number: ${receivingDetails.receivingNumber}`, 20, 35);
    doc.text(`Purchase Number: ${receivingDetails.purchase?.purchaseNumber}`, 20, 40);
    doc.text(`Date: ${new Date(receivingDetails.deliveryTime).toLocaleDateString()}`, 20, 45);
    doc.text(`Status: ${receivingDetails.status}`, 20, 50);
    doc.text(`Driver: ${receivingDetails.driverName}`, 20, 55);
    doc.text(`Vehicle: ${receivingDetails.deliveryVehiclePlate}`, 20, 60);
    
    // Items Table
    const tableData = receivingDetails.itemReceipts?.map((item, index) => [
      index + 1,
      item.product?.name,
      item.expectedQty,
      item.receivedQty,
      item.acceptedQty,
      item.damagedQty || 0,
      `KES ${item.unitCost?.toLocaleString()}`,
      item.batchNumber || 'N/A'
    ]) || [];

    doc.autoTable({
      head: [['#', 'Product', 'Expected', 'Received', 'Accepted', 'Damaged', 'Unit Cost', 'Batch']],
      body: tableData,
      startY: 70,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Summary
    const totalReceived = receivingDetails.receivedTotalItems || 0;
    const totalDamaged = receivingDetails.damagedItems || 0;
    const totalAccepted = receivingDetails.acceptedItems || 0;
    const acceptanceRate = totalReceived > 0 ? (totalAccepted / totalReceived) * 100 : 0;

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Total Items: ${totalReceived}`, 20, finalY);
    doc.text(`Accepted: ${totalAccepted}`, 20, finalY + 5);
    doc.text(`Damaged: ${totalDamaged}`, 20, finalY + 10);
    doc.text(`Acceptance Rate: ${acceptanceRate.toFixed(1)}%`, 20, finalY + 15);
    doc.text(`Payable Amount: KES ${receivingDetails.payableAmount?.toLocaleString()}`, 20, finalY + 20);

    doc.save(`receiving-${receivingDetails.receivingNumber}.pdf`);
  };

  if (!receivingDetails) return null;

  const calculateInspectionProgress = () => {
    const expected = receivingDetails.expectedTotalItems || 0;
    const received = receivingDetails.receivedTotalItems || 0;
    return expected > 0 ? Math.round((received / expected) * 100) : 0;
  };

  return (
    <Modal
      title="Receiving Details"
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={null}
      destroyOnClose
    >
      <div style={{ minHeight: 600 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>
            {receivingDetails.receivingNumber}
            <span style={{ marginLeft: 16, fontSize: '14px', color: '#666' }}>
              for Purchase {receivingDetails.purchase?.purchaseNumber}
            </span>
          </h3>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={exportToPDF}>
              PDF
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              Print
            </Button>
          </Space>
        </Space>

        <Tabs defaultActiveKey="overview">
          <TabPane tab="Overview" key="overview">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card size="small">
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Descriptions title="Basic Information" column={1}>
                        <Descriptions.Item label="Receiving #">
                          <Tag color="blue">{receivingDetails.receivingNumber}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Purchase #">
                          {receivingDetails.purchase?.purchaseNumber}
                        </Descriptions.Item>
                        <Descriptions.Item label="Status">
                          <Tag color={receivingDetails.statusColor}>
                            {receivingDetails.status.replace(/_/g, ' ')}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Delivery Date">
                          {new Date(receivingDetails.deliveryTime).toLocaleString()}
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                    <Col span={8}>
                      <Descriptions title="Delivery Information" column={1}>
                        <Descriptions.Item label="Driver">
                          <Space>
                            <UserOutlined />
                            {receivingDetails.driverName}
                          </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Phone">
                          {receivingDetails.driverPhone || 'N/A'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Vehicle">
                          <Space>
                            <TruckOutlined />
                            {receivingDetails.deliveryVehiclePlate}
                          </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Delivery Company">
                          {receivingDetails.deliveryCompany || 'N/A'}
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                    <Col span={8}>
                      <Descriptions title="Financial" column={1}>
                        <Descriptions.Item label="Invoice #">
                          {receivingDetails.supplierInvoiceNumber}
                        </Descriptions.Item>
                        <Descriptions.Item label="Invoice Amount">
                          <Tag color="green">
                            KES {receivingDetails.supplierInvoiceAmount?.toLocaleString()}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Payable Amount">
                          <Tag color="blue">
                            KES {receivingDetails.payableAmount?.toLocaleString()}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Currency">
                          {receivingDetails.currency || 'KES'}
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Inspection Progress">
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Statistic
                        title="Expected Items"
                        value={receivingDetails.expectedTotalItems || 0}
                        prefix={<ShoppingCartOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Received Items"
                        value={receivingDetails.receivedTotalItems || 0}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Accepted Items"
                        value={receivingDetails.acceptedItems || 0}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Damaged Items"
                        value={receivingDetails.damagedItems || 0}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Col>
                  </Row>
                  <Progress
                    percent={calculateInspectionProgress()}
                    status="active"
                    format={(percent) => `${percent}% Inspected`}
                    style={{ marginTop: 16 }}
                  />
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Supplier Information">
                  <Descriptions column={3}>
                    <Descriptions.Item label="Supplier">
                      {receivingDetails.purchase?.supplier?.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Contact">
                      {receivingDetails.purchase?.supplier?.contactPerson}
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone">
                      {receivingDetails.purchase?.supplier?.phone}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              <Col span={24}>
                <Card size="small" title="Warehouse Information">
                  <Descriptions column={3}>
                    <Descriptions.Item label="Warehouse">
                      <Space>
                        <HomeOutlined />
                        {receivingDetails.warehouse?.name}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Station">
                      {receivingDetails.station?.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Location">
                      {receivingDetails.station?.location || 'N/A'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="Received Items" key="items">
            <Table
              dataSource={itemReceipts}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1200 }}
              columns={[
                {
                  title: 'Product',
                  dataIndex: ['product', 'name'],
                  key: 'product',
                  fixed: 'left',
                  width: 200,
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
                  title: 'Expected',
                  dataIndex: 'expectedQty',
                  key: 'expectedQty',
                  width: 100,
                  render: (text) => <Tag color="blue">{text}</Tag>
                },
                {
                  title: 'Received',
                  dataIndex: 'receivedQty',
                  key: 'receivedQty',
                  width: 100,
                  render: (text) => <Tag color="cyan">{text}</Tag>
                },
                {
                  title: 'Accepted',
                  dataIndex: 'acceptedQty',
                  key: 'acceptedQty',
                  width: 100,
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
                  width: 100,
                  render: (text) => text > 0 ? <Tag color="red">{text}</Tag> : '0'
                },
                {
                  title: 'Batch',
                  dataIndex: 'batchNumber',
                  key: 'batchNumber',
                  width: 150,
                  render: (text) => text ? (
                    <Space>
                      <BarcodeOutlined />
                      {text}
                    </Space>
                  ) : 'N/A'
                },
                {
                  title: 'Unit Cost',
                  dataIndex: 'unitCost',
                  key: 'unitCost',
                  width: 120,
                  render: (text) => `KES ${text?.toLocaleString()}`
                },
                {
                  title: 'Total Cost',
                  key: 'totalCost',
                  width: 120,
                  render: (_, record) => `KES ${(record.acceptedQty * record.unitCost)?.toLocaleString()}`
                },
                {
                  title: 'Expiry',
                  dataIndex: 'expiryDate',
                  key: 'expiryDate',
                  width: 120,
                  render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
                },
                {
                  title: 'Location',
                  dataIndex: 'storageLocation',
                  key: 'storageLocation',
                  width: 150,
                  render: (text) => text || 'N/A'
                },
                {
                  title: 'Status',
                  key: 'status',
                  width: 100,
                  fixed: 'right',
                  render: (_, record) => (
                    <Tag color={record.damagedQty > 0 ? 'orange' : 'green'}>
                      {record.damagedQty > 0 ? 'Damaged' : 'Accepted'}
                    </Tag>
                  )
                }
              ]}
            />
          </TabPane>

          <TabPane tab="Documents" key="documents">
            {documents.length > 0 ? (
              <List
                dataSource={documents}
                renderItem={(doc) => (
                  <List.Item
                    actions={[
                      <Button type="link" icon={<EyeOutlined />}>View</Button>,
                      <Button type="link" icon={<DownloadOutlined />}>Download</Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<FileTextOutlined />} />}
                      title={
                        <Space>
                          <strong>{doc.documentType.replace(/_/g, ' ')}</strong>
                          {doc.documentNumber && (
                            <Tag color="blue">{doc.documentNumber}</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <span>{doc.fileName}</span>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            Uploaded: {new Date(doc.uploadedAt).toLocaleString()} by {doc.uploadedBy?.firstName} {doc.uploadedBy?.lastName}
                          </span>
                          {doc.notes && (
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              Notes: {doc.notes}
                            </span>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Alert
                message="No Documents"
                description="No documents have been uploaded for this receiving yet."
                type="info"
                showIcon
              />
            )}
          </TabPane>

          <TabPane tab="Inspection Notes" key="notes">
            {receivingDetails.itemReceipts?.some(r => r.inspectionNotes) ? (
              <List
                dataSource={receivingDetails.itemReceipts.filter(r => r.inspectionNotes)}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<AppstoreOutlined />} />}
                      title={
                        <Space>
                          <strong>{item.product?.name}</strong>
                          <Tag color="blue">Batch: {item.batchNumber || 'N/A'}</Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <div>
                            <Tag color={item.damagedQty > 0 ? 'orange' : 'green'}>
                              {item.receivedQty} received, {item.damagedQty} damaged
                            </Tag>
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <strong>Inspection Notes:</strong>
                            <div style={{ marginTop: 4 }}>{item.inspectionNotes}</div>
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Alert
                message="No Inspection Notes"
                description="No inspection notes have been recorded for this receiving."
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

export default ReceivingDetailsModal;