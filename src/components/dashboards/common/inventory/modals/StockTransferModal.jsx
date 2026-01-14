// src/pages/inventory/StockTransferModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Button,
  Space,
  message,
  Alert,
  Descriptions,
  Tag,
  Card,
  Divider,
  Input,
  Statistic,
  Row,
  Col,
  DatePicker
} from 'antd';
import {
  SwapOutlined,
  TruckOutlined,
  HomeOutlined,
  CalculatorOutlined,
  UserOutlined,
  FileTextOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

const StockTransferModal = ({ item, warehouseId, visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [destinationWarehouses, setDestinationWarehouses] = useState([]);
  const [availableQuantity, setAvailableQuantity] = useState(0);

  useEffect(() => {
    if (item) {
      setAvailableQuantity(item.availableQty || 0);
      
      // In a real app, this would fetch available warehouses
      setDestinationWarehouses([
        { id: 'wh-001', name: 'Main Warehouse', location: 'Nairobi' },
        { id: 'wh-002', name: 'Mombasa Depot', location: 'Mombasa' },
        { id: 'wh-003', name: 'Kisumu Branch', location: 'Kisumu' }
      ]);
      
      form.setFieldsValue({
        quantity: 1,
        destinationWarehouseId: undefined,
        transferDate: null,
        reason: '',
        notes: ''
      });
    }
  }, [item, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Validate transfer quantity
      if (values.quantity <= 0) {
        message.error('Quantity must be greater than 0');
        return;
      }

      if (values.quantity > availableQuantity) {
        message.error(`Cannot transfer more than available quantity (${availableQuantity})`);
        return;
      }

      // Prepare transfer data
      const transferData = {
        productId: item.productId,
        sourceWarehouseId: warehouseId,
        destinationWarehouseId: values.destinationWarehouseId,
        batchNumber: item.batchNumber,
        quantity: values.quantity,
        unitCost: item.avgUnitCost || 0,
        transferDate: values.transferDate?.toISOString(),
        reason: values.reason,
        notes: values.notes,
        preparedBy: values.preparedBy,
        approvedBy: values.approvedBy
      };

      // Call API to create transfer
      await onSuccess(transferData);
      
      message.success('Transfer request created successfully');
      form.resetFields();
      onClose();
    } catch (error) {
      message.error('Failed to create transfer: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  const selectedDestination = form.getFieldValue('destinationWarehouseId');
  const destinationWarehouse = destinationWarehouses.find(w => w.id === selectedDestination);

  return (
    <Modal
      title="Transfer Stock"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions title="Transfer Details" size="small" column={2}>
          <Descriptions.Item label="Product">
            {item.productName}
          </Descriptions.Item>
          <Descriptions.Item label="Batch">
            {item.batchNumber || 'No batch'}
          </Descriptions.Item>
          <Descriptions.Item label="Available Quantity">
            <Tag color="blue">{availableQuantity} {item.unit}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Source Warehouse">
            {item.warehouseName}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Alert
        message="Stock Transfer"
        description="Transferring stock between warehouses will create a transfer request that needs approval. The stock will be reserved until the transfer is completed."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="destinationWarehouseId"
              label="Destination Warehouse"
              rules={[{ required: true, message: 'Please select destination warehouse' }]}
            >
              <Select
                placeholder="Select destination warehouse"
                style={{ width: '100%' }}
              >
                {destinationWarehouses
                  .filter(w => w.id !== warehouseId)
                  .map(warehouse => (
                    <Option key={warehouse.id} value={warehouse.id}>
                      <Space>
                        <HomeOutlined />
                        <span>{warehouse.name}</span>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          ({warehouse.location})
                        </span>
                      </Space>
                    </Option>
                  ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="quantity"
              label="Transfer Quantity"
              rules={[
                { required: true, message: 'Please enter quantity' },
                { type: 'number', min: 1, max: availableQuantity, 
                  message: `Must be between 1 and ${availableQuantity}` }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={availableQuantity}
                placeholder="Enter quantity"
              />
            </Form.Item>
          </Col>
        </Row>

        {destinationWarehouse && (
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed' }}>
            <Descriptions title="Destination Information" size="small" column={2}>
              <Descriptions.Item label="Warehouse">
                {destinationWarehouse.name}
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {destinationWarehouse.location}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="transferDate"
              label="Transfer Date"
            >
              <DatePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                placeholder="Select transfer date"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="reason"
              label="Transfer Reason"
              rules={[{ required: true, message: 'Please select a reason' }]}
            >
              <Select
                placeholder="Select reason"
                style={{ width: '100%' }}
              >
                <Option value="STOCK_REPLENISHMENT">Stock Replenishment</Option>
                <Option value="SALES_ORDER">Sales Order Fulfillment</Option>
                <Option value="EMERGENCY">Emergency Transfer</Option>
                <Option value="STORAGE_OPTIMIZATION">Storage Optimization</Option>
                <Option value="QUALITY_ISSUE">Quality Issue</Option>
                <Option value="OTHER">Other</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="preparedBy"
              label="Prepared By"
              rules={[{ required: true, message: 'Please enter preparer name' }]}
            >
              <Input
                placeholder="Person preparing transfer"
                prefix={<UserOutlined />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="approvedBy"
              label="Approved By"
            >
              <Input
                placeholder="Person approving transfer"
                prefix={<UserOutlined />}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="reference"
          label="Reference Number"
          rules={[{ max: 50, message: 'Max 50 characters' }]}
        >
          <Input
            placeholder="e.g., TRANSFER-2024-001"
            prefix={<FileTextOutlined />}
          />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Transfer Notes"
          rules={[{ max: 500, message: 'Max 500 characters' }]}
        >
          <TextArea
            rows={3}
            placeholder="Provide additional details about this transfer..."
          />
        </Form.Item>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card size="small">
              <Statistic
                title="Transfer Value"
                value={(form.getFieldValue('quantity') || 0) * (item.avgUnitCost || 0)}
                prefix="KES"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Statistic
                title="Remaining Stock"
                value={availableQuantity - (form.getFieldValue('quantity') || 0)}
                valueStyle={{ 
                  color: (availableQuantity - (form.getFieldValue('quantity') || 0)) <= (item.reorderPoint || 0) 
                    ? '#ff4d4f' : '#52c41a'
                }}
              />
            </Card>
          </Col>
        </Row>

        {form.getFieldValue('quantity') && 
         (availableQuantity - form.getFieldValue('quantity')) <= (item.reorderPoint || 0) && (
          <Alert
            message="Low Stock Warning"
            description={`After transfer, stock level (${availableQuantity - form.getFieldValue('quantity')}) will be at or below reorder point (${item.reorderPoint}).`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Divider />

        <Form.Item style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SwapOutlined />}
            >
              Create Transfer
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StockTransferModal;