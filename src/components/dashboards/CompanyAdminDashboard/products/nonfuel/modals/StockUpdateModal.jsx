// components/nonfuel/product/StockUpdateModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Button, Space, Alert, Row, Col, message } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import { nonFuelService } from '../../../../../../services/nonFuelService/nonFuelService';
const StockUpdateModal = ({ isOpen, onClose, product, onStockUpdated, companyId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && product) {
      form.setFieldsValue({
        minStockLevel: product.minStockLevel,
        reorderPoint: product.reorderPoint,
        maxStockLevel: product.maxStockLevel
      });
    }
  }, [isOpen, product, form]);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError('');

      // Validate stock levels
      if (values.reorderPoint && values.minStockLevel) {
        if (values.reorderPoint > values.minStockLevel) {
          throw new Error('Reorder point cannot exceed minimum stock level');
        }
      }
      if (values.maxStockLevel && values.minStockLevel) {
        if (values.maxStockLevel < values.minStockLevel) {
          throw new Error('Maximum stock level cannot be less than minimum stock level');
        }
      }

      const stockData = {
        productId: product.id,
        companyId,
        ...values
      };

      await nonFuelService.updateProductStockLevels(stockData);
      message.success('Stock levels updated successfully');
      onStockUpdated();
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to update stock levels');
      message.error(error.message || 'Failed to update stock levels');
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Modal
      title={
        <div className="flex items-center">
          <DatabaseOutlined className="mr-2" />
          Update Stock Levels - {product.name}
          {product.variantName && ` (${product.variantName})`}
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800">
          <strong>Current Product:</strong> {product.name}
          {product.variantName && ` - ${product.variantName}`}
        </p>
        <p className="text-blue-600 text-sm mt-1">Unit: {product.unit || 'PIECE'}</p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="minStockLevel"
              label="Minimum Stock Level"
              rules={[
                { type: 'number', min: 0, message: 'Must be non-negative' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0"
                min={0}
                step={1}
              />
            </Form.Item>
            <p className="text-gray-500 text-xs">Alert when stock falls below this level</p>
          </Col>
          <Col span={8}>
            <Form.Item
              name="reorderPoint"
              label="Reorder Point"
              rules={[
                { type: 'number', min: 0, message: 'Must be non-negative' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0"
                min={0}
                step={1}
              />
            </Form.Item>
            <p className="text-gray-500 text-xs">Trigger reorder when stock reaches this level</p>
          </Col>
          <Col span={8}>
            <Form.Item
              name="maxStockLevel"
              label="Maximum Stock Level"
              rules={[
                { type: 'number', min: 0, message: 'Must be positive' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0"
                min={0}
                step={1}
              />
            </Form.Item>
            <p className="text-gray-500 text-xs">Maximum allowed stock in warehouse</p>
          </Col>
        </Row>

        <div className="mb-6 p-3 bg-gray-50 border rounded">
          <p className="text-gray-600 text-sm">
            <strong>Stock Level Hierarchy:</strong> Reorder Point ≤ Minimum Stock Level ≤ Maximum Stock Level
          </p>
        </div>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Stock Levels
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StockUpdateModal;