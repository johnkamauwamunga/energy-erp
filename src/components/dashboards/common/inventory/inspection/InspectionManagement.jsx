// src/pages/inventory/inspection/InspectionManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Table,
  Tag,
  Progress,
  Statistic,
  Alert,
  Badge,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Descriptions,
  Timeline,
  Upload,
  Divider,
  message
} from 'antd';
import {
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  CameraOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  BarChartOutlined,
  WarningOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { nonFuelPurchaseService } from '../../../services/nonFuelPurchaseService';

const { Option } = Select;
const { Search } = Input;
const { TextArea } = Input;

const InspectionManagement = ({ filters, onRefresh }) => {
  const [receivings, setReceivings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReceiving, setSelectedReceiving] = useState(null);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionForm] = Form.useForm();
  const [inspectionStats, setInspectionStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReceivings();
  }, [filters]);

  useEffect(() => {
    calculateStats();
  }, [receivings]);

  const loadReceivings = async () => {
    setLoading(true);
    try {
      const result = await nonFuelPurchaseService.getReceivings({
        ...filters,
        status: 'INSPECTION_IN_PROGRESS',
        limit: 100
      });

      const formattedReceivings = result.data.map(r => 
        nonFuelPurchaseService.formatReceiving(r)
      );
      
      setReceivings(formattedReceivings);
    } catch (error) {
      console.error('Failed to load receivings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (receivings.length === 0) {
      setInspectionStats(null);
      return;
    }

    const stats = receivings.reduce((acc, receiving) => {
      const items = receiving.itemReceipts || [];
      const totalItems = items.length;
      const inspectedItems = items.filter(i => i.inspectionNotes).length;
      const damagedItems = items.filter(i => i.damagedQty > 0).length;
      
      acc.totalReceivings++;
      acc.totalItems += totalItems;
      acc.inspectedItems += inspectedItems;
      acc.damagedItems += damagedItems;
      acc.completionRate += (inspectedItems / totalItems) * 100;
      
      return acc;
    }, {
      totalReceivings: 0,
      totalItems: 0,
      inspectedItems: 0,
      damagedItems: 0,
      completionRate: 0
    });

    stats.averageCompletion = stats.totalReceivings > 0 ? 
      stats.completionRate / stats.totalReceivings : 0;
    stats.inspectionRate = stats.totalItems > 0 ? 
      (stats.inspectedItems / stats.totalItems) * 100 : 0;

    setInspectionStats(stats);
  };

  const handleStartInspection = (receiving) => {
    setSelectedReceiving(receiving);
    setShowInspectionModal(true);
  };

  const handleSubmitInspection = async (values) => {
    try {
      // In a real implementation, this would update the item receipt
      message.success('Inspection recorded successfully');
      inspectionForm.resetFields();
      setShowInspectionModal(false);
      loadReceivings();
      onRefresh?.();
    } catch (error) {
      message.error('Failed to record inspection: ' + error.message);
    }
  };

  const filteredReceivings = receivings.filter(receiving => {
    if (!searchTerm) return true;
    
    return (
      receiving.receivingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receiving.purchaseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receiving.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receiving.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="inspection-management">
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Quality Inspection</h3>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={loadReceivings}>
                  Refresh
                </Button>
                <Button type="primary" icon={<BarChartOutlined />}>
                  Reports
                </Button>
              </Space>
            </div>
          </Col>
          
          <Col span={24}>
            <Space wrap>
              <Search
                placeholder="Search receivings..."
                style={{ width: 300 }}
                allowClear
                onSearch={setSearchTerm}
              />
              
              <Select
                placeholder="Filter by status"
                style={{ width: 200 }}
                allowClear
              >
                <Option value="high_damage">High Damage Rate</Option>
                <Option value="low_completion">Low Completion</Option>
                <Option value="urgent">Urgent Inspection</Option>
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Inspection Statistics */}
      {inspectionStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Active Inspections"
                value={inspectionStats.totalReceivings}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Total Items"
                value={inspectionStats.totalItems}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Inspection Rate"
                value={inspectionStats.inspectionRate.toFixed(1)}
                suffix="%"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Damaged Items"
                value={inspectionStats.damagedItems}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {inspectionStats?.damagedItems > 0 && (
        <Alert
          message="Damaged Items Detected"
          description={`${inspectionStats.damagedItems} items have been marked as damaged during inspection. Review and take appropriate action.`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title={
        <Space>
          <span>Inspections in Progress ({filteredReceivings.length})</span>
          <Badge 
            count={filteredReceivings.filter(r => r.damageRate > 10).length} 
            style={{ backgroundColor: '#fa8c16' }}
            title="High Damage Rate"
          />
          <Badge 
            count={filteredReceivings.filter(r => r.inspectionProgress < 50).length} 
            style={{ backgroundColor: '#ff4d4f' }}
            title="Low Progress"
          />
        </Space>
      }>
        {filteredReceivings.length > 0 ? (
          <Table
            dataSource={filteredReceivings}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: 'Receiving #',
                dataIndex: 'receivingNumber',
                key: 'receivingNumber',
                render: (text, record) => (
                  <div>
                    <strong>{text}</strong>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Purchase: {record.purchaseNumber}
                    </div>
                  </div>
                )
              },
              {
                title: 'Supplier',
                dataIndex: 'supplierName',
                key: 'supplierName'
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
                title: 'Inspection Progress',
                key: 'progress',
                render: (_, record) => (
                  <Tooltip title={`${record.inspectionProgress}% inspected`}>
                    <Progress 
                      percent={record.inspectionProgress} 
                      size="small" 
                      status={record.inspectionProgress === 100 ? 'success' : 'active'}
                    />
                  </Tooltip>
                )
              },
              {
                title: 'Quality Status',
                key: 'quality',
                render: (_, record) => {
                  const damageRate = record.damageRate || 0;
                  let status = 'Good';
                  let color = 'green';
                  
                  if (damageRate > 20) {
                    status = 'Critical';
                    color = 'red';
                  } else if (damageRate > 10) {
                    status = 'Warning';
                    color = 'orange';
                  } else if (damageRate > 5) {
                    status = 'Acceptable';
                    color = 'blue';
                  }
                  
                  return (
                    <Tag color={color}>
                      {status} ({damageRate}% damage)
                    </Tag>
                  );
                }
              },
              {
                title: 'Driver',
                key: 'driver',
                render: (_, record) => (
                  <div>
                    <div>{record.driverName}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {record.deliveryVehiclePlate}
                    </div>
                  </div>
                )
              },
              {
                title: 'Actions',
                key: 'actions',
                fixed: 'right',
                render: (_, record) => (
                  <Space>
                    <Tooltip title="View Details">
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => {
                          // Navigate to receiving details
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Start Inspection">
                      <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleStartInspection(record)}
                      >
                        Inspect
                      </Button>
                    </Tooltip>
                    <Tooltip title="Inspection History">
                      <Button
                        type="text"
                        icon={<HistoryOutlined />}
                      />
                    </Tooltip>
                  </Space>
                )
              }
            ]}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
            <div style={{ marginTop: 16, fontSize: '16px', color: '#666' }}>
              No active inspections found
            </div>
            <div style={{ marginTop: 8, color: '#999' }}>
              All receivings have been inspected or are waiting for arrival
            </div>
          </div>
        )}
      </Card>

      {/* Inspection Modal */}
      <Modal
        title="Quality Inspection"
        open={showInspectionModal}
        onCancel={() => {
          setShowInspectionModal(false);
          inspectionForm.resetFields();
        }}
        width={800}
        footer={null}
      >
        {selectedReceiving && (
          <>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions title="Receiving Details" size="small" column={2}>
                <Descriptions.Item label="Receiving #">
                  {selectedReceiving.receivingNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Purchase #">
                  {selectedReceiving.purchaseNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Supplier">
                  {selectedReceiving.supplierName}
                </Descriptions.Item>
                <Descriptions.Item label="Driver">
                  {selectedReceiving.driverName}
                </Descriptions.Item>
                <Descriptions.Item label="Items Received">
                  {selectedReceiving.receivedTotalItems || 0} / {selectedReceiving.expectedTotalItems || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Current Damage">
                  {selectedReceiving.damageRate || 0}%
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Alert
              message="Inspection Guidelines"
              description="Inspect each item for quality, document any damages, and record your findings. Take photos of damaged items if possible."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form
              form={inspectionForm}
              layout="vertical"
              onFinish={handleSubmitInspection}
            >
              <Form.Item
                name="productId"
                label="Select Product"
                rules={[{ required: true, message: 'Please select a product' }]}
              >
                <Select
                  placeholder="Select product to inspect"
                  style={{ width: '100%' }}
                >
                  {selectedReceiving.itemReceipts?.map(item => (
                    <Option key={item.productId} value={item.productId}>
                      <Space>
                        <span>{item.product?.name}</span>
                        <Tag color="blue">Received: {item.receivedQty}</Tag>
                        {item.damagedQty > 0 && (
                          <Tag color="red">Damaged: {item.damagedQty}</Tag>
                        )}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="acceptedQty"
                    label="Accepted Quantity"
                    rules={[
                      { required: true, message: 'Please enter accepted quantity' },
                      { type: 'number', min: 0, message: 'Cannot be negative' }
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      placeholder="Quantity accepted"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="damagedQty"
                    label="Damaged Quantity"
                    initialValue={0}
                    rules={[
                      { type: 'number', min: 0, message: 'Cannot be negative' }
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      placeholder="Quantity damaged"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="inspectionNotes"
                label="Inspection Findings"
                rules={[{ required: true, message: 'Please provide inspection notes' }]}
                extra="Describe the quality issues, damages, or any other findings"
              >
                <TextArea
                  rows={4}
                  placeholder="Describe your inspection findings..."
                />
              </Form.Item>

              <Form.Item
                name="qualityStatus"
                label="Quality Status"
                rules={[{ required: true, message: 'Please select quality status' }]}
              >
                <Select
                  placeholder="Select quality status"
                  style={{ width: '100%' }}
                >
                  <Option value="GOOD">
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <span>Good - No issues</span>
                    </Space>
                  </Option>
                  <Option value="MINOR_DAMAGE">
                    <Space>
                      <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />
                      <span>Minor Damage - Acceptable</span>
                    </Space>
                  </Option>
                  <Option value="MAJOR_DAMAGE">
                    <Space>
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      <span>Major Damage - Reject</span>
                    </Space>
                  </Option>
                  <Option value="EXPIRED">
                    <Space>
                      <WarningOutlined style={{ color: '#ff4d4f' }} />
                      <span>Expired - Reject</span>
                    </Space>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="photos"
                label="Inspection Photos"
                extra="Upload photos of damaged items or quality issues"
              >
                <Upload
                  listType="picture-card"
                  maxCount={5}
                  beforeUpload={() => false} // Prevent auto upload
                >
                  <div>
                    <CameraOutlined />
                    <div style={{ marginTop: 8 }}>Upload</div>
                  </div>
                </Upload>
              </Form.Item>

              <Form.Item
                name="recommendation"
                label="Recommendation"
                rules={[{ required: true, message: 'Please provide recommendation' }]}
              >
                <Select
                  placeholder="Select recommendation"
                  style={{ width: '100%' }}
                >
                  <Option value="ACCEPT_ALL">Accept All Items</Option>
                  <Option value="ACCEPT_PARTIAL">Accept Partial (Return Damaged)</Option>
                  <Option value="REJECT_ALL">Reject All Items</Option>
                  <Option value="CONTACT_SUPPLIER">Contact Supplier</Option>
                </Select>
              </Form.Item>

              <Divider />

              <Form.Item style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => {
                    setShowInspectionModal(false);
                    inspectionForm.resetFields();
                  }}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                    Record Inspection
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default InspectionManagement;