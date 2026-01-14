// src/pages/inventory/StockAdjustmentModal.jsx
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
  Col
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  SwapOutlined,
  ExclamationCircleOutlined,
  CalculatorOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

const StockAdjustmentModal = ({ item, warehouseId, visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState('ADD');
  const [newStockLevel, setNewStockLevel] = useState(0);
  const [adjustmentValue, setAdjustmentValue] = useState(0);

  useEffect(() => {
    if (item) {
      form.setFieldsValue({
        adjustmentType: 'ADD',
        quantity: 0,
        unitCost: item.avgUnitCost || 0,
        reason: '',
        notes: ''
      });
      setNewStockLevel(item.availableQty || 0);
      setAdjustmentValue(0);
    }
  }, [item, form]);

  const handleAdjustmentTypeChange = (type) => {
    setAdjustmentType(type);
    calculateNewStock(type, form.getFieldValue('quantity') || 0);
  };

  const handleQuantityChange = (quantity) => {
    calculateNewStock(adjustmentType, quantity);
  };

  const calculateNewStock = (type, quantity) => {
    if (!item) return;
    
    const currentStock = item.availableQty || 0;
    let newStock = currentStock;
    let adjustment = 0;

    switch (type) {
      case 'ADD':
        newStock = currentStock + quantity;
        adjustment = quantity;
        break;
      case 'REMOVE':
        if (quantity > currentStock) {
          message.warning('Cannot remove more than available stock');
          quantity = currentStock;
          form.setFieldsValue({ quantity: currentStock });
        }
        newStock = currentStock - quantity;
        adjustment = -quantity;
        break;
      case 'SET':
        newStock = quantity;
        adjustment = quantity - currentStock;
        break;
    }

    setNewStockLevel(newStock);
    setAdjustmentValue(adjustment);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Validate adjustment
      if (values.quantity <= 0 && values.adjustmentType !== 'SET') {
        message.error('Quantity must be greater than 0');
        return;
      }

      if (values.adjustmentType === 'REMOVE' && values.quantity > (item.availableQty || 0)) {
        message.error('Cannot remove more than available stock');
        return;
      }

      // Prepare adjustment data
      const adjustmentData = {
        productId: item.productId,
        warehouseId: warehouseId,
        batchNumber: item.batchNumber,
        adjustmentType: values.adjustmentType,
        quantity: values.quantity,
        unitCost: values.unitCost || item.avgUnitCost || 0,
        reason: values.reason,
        notes: values.notes,
        reference: values.reference || undefined
      };

      // Call API to adjust stock
      await onSuccess(item.id, adjustmentData);
      
      message.success('Stock adjusted successfully');
      form.resetFields();
      onClose();
    } catch (error) {
      message.error('Failed to adjust stock: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Modal
      title="Adjust Stock Level"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions title="Current Stock" size="small" column={2}>
          <Descriptions.Item label="Product">
            {item.productName}
          </Descriptions.Item>
          <Descriptions.Item label="Batch">
            {item.batchNumber || 'No batch'}
          </Descriptions.Item>
          <Descriptions.Item label="Current Stock">
            <Tag color="blue">{item.availableQty} {item.unit}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Unit Cost">
            <Tag color="green">KES {item.avgUnitCost?.toLocaleString()}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Alert
        message="Stock Adjustment"
        description="Adjusting stock levels will create an audit trail. Make sure to provide a valid reason for the adjustment."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="adjustmentType"
          label="Adjustment Type"
          rules={[{ required: true, message: 'Please select adjustment type' }]}
        >
          <Select
            placeholder="Select adjustment type"
            onChange={handleAdjustmentTypeChange}
            style={{ width: '100%' }}
          >
            <Option value="ADD">
              <Space>
                <PlusOutlined style={{ color: '#52c41a' }} />
                <span>Add Stock</span>
              </Space>
            </Option>
            <Option value="REMOVE">
              <Space>
                <MinusOutlined style={{ color: '#ff4d4f' }} />
                <span>Remove Stock</span>
              </Space>
            </Option>
            <Option value="SET">
              <Space>
                <SwapOutlined style={{ color: '#1890ff' }} />
                <span>Set Stock Level</span>
              </Space>
            </Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="quantity"
          label={adjustmentType === 'SET' ? 'New Stock Level' : 'Quantity'}
          rules={[
            { required: true, message: 'Please enter quantity' },
            { type: 'number', min: 0, message: 'Quantity must be positive' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            onChange={handleQuantityChange}
            placeholder={adjustmentType === 'SET' ? 'Enter new stock level' : 'Enter quantity'}
          />
        </Form.Item>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card size="small">
              <Statistic
                title="Adjustment"
                value={adjustmentValue}
                prefix={
                  adjustmentValue > 0 ? <PlusOutlined /> : 
                  adjustmentValue < 0 ? <MinusOutlined /> : 
                  <SwapOutlined />
                }
                valueStyle={{
                  color: adjustmentValue > 0 ? '#52c41a' : 
                         adjustmentValue < 0 ? '#ff4d4f' : '#1890ff'
                }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Statistic
                title="New Stock Level"
                value={newStockLevel}
                valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>

        {newStockLevel < (item.minStock || 0) && (
          <Alert
            message="Below Minimum Stock"
            description={`New stock level (${newStockLevel}) will be below minimum stock (${item.minStock}).`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          name="unitCost"
          label="Unit Cost (KES)"
          rules={[
            { required: true, message: 'Please enter unit cost' },
            { type: 'number', min: 0.01, message: 'Unit cost must be positive' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0.01}
            placeholder="Enter unit cost"
            prefix="KES"
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Reason for Adjustment"
          rules={[{ required: true, message: 'Please provide a reason' }]}
        >
          <Select
            placeholder="Select reason"
            style={{ width: '100%' }}
          >
            <Option value="PHYSICAL_COUNT">Physical Count Discrepancy</Option>
            <Option value="DAMAGED">Damaged Goods</Option>
            <Option value="EXPIRED">Expired Goods</Option>
            <Option value="THEFT">Theft/Loss</Option>
            <Option value="RETURN">Customer Return</Option>
            <Option value="SAMPLE">Sample/Test</Option>
            <Option value="OTHER">Other</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="reference"
          label="Reference Number"
          rules={[{ max: 50, message: 'Max 50 characters' }]}
        >
          <Input placeholder="e.g., PHY-COUNT-001, RETURN-123" />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Additional Notes"
          rules={[{ max: 500, message: 'Max 500 characters' }]}
        >
          <TextArea
            rows={3}
            placeholder="Provide additional details about this adjustment..."
          />
        </Form.Item>

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
              icon={<CalculatorOutlined />}
            >
              Adjust Stock
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StockAdjustmentModal;