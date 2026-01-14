// components/nonfuel/product/PriceUpdateModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Button, Space, Alert, Row, Col, message } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { nonFuelService } from '../../../../../../services/nonFuelService/nonFuelService';
const PriceUpdateModal = ({ isOpen, onClose, product, onPriceUpdated, companyId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && product) {
      form.setFieldsValue({
        baseCostPrice: product.baseCostPrice,
        minSellingPrice: product.minSellingPrice,
        maxSellingPrice: product.maxSellingPrice
      });
    }
  }, [isOpen, product, form]);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError('');

      // Validate price hierarchy
      if (values.baseCostPrice && values.minSellingPrice && values.maxSellingPrice) {
        if (values.baseCostPrice > values.minSellingPrice) {
          throw new Error('Base cost cannot exceed minimum selling price');
        }
        if (values.minSellingPrice > values.maxSellingPrice) {
          throw new Error('Minimum selling price cannot exceed maximum selling price');
        }
      }

      const priceData = {
        productId: product.id,
        companyId,
        ...values
      };

      await nonFuelService.updateProductPrices(priceData);
      message.success('Prices updated successfully');
      onPriceUpdated();
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to update prices');
      message.error(error.message || 'Failed to update prices');
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Modal
      title={
        <div className="flex items-center">
          <DollarOutlined className="mr-2" />
          Update Prices - {product.name}
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
        {product.sku && <p className="text-blue-600 text-sm mt-1">SKU: {product.sku}</p>}
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="baseCostPrice"
              label="Base Cost"
              rules={[
                { type: 'number', min: 0, message: 'Cost must be positive' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.00"
                min={0}
                step={0.01}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="minSellingPrice"
              label="Min Price"
              rules={[
                { type: 'number', min: 0, message: 'Price must be positive' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.00"
                min={0}
                step={0.01}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="maxSellingPrice"
              label="Max Price"
              rules={[
                { type: 'number', min: 0, message: 'Price must be positive' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.00"
                min={0}
                step={0.01}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
        </Row>

        <div className="mb-6 p-3 bg-gray-50 border rounded">
          <p className="text-gray-600 text-sm">
            <strong>Price Hierarchy:</strong> Base Cost ≤ Min Price ≤ Max Price
          </p>
        </div>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Prices
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PriceUpdateModal;