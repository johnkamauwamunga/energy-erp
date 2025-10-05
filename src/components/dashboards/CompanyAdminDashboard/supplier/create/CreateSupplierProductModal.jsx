import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Button,
  Row,
  Col,
  Switch,
  message,
  Divider
} from 'antd';
import { supplierService } from '../../../services/supplierService';
import { fuelService } from '../../../services/fuelService';

const { Option } = Select;
const { TextArea } = Input;

const CreateSupplierProductModal = ({ visible, supplier, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [existingProductIds, setExistingProductIds] = useState(new Set());

  // Fetch available products and existing supplier products
  const fetchData = async () => {
    if (!supplier) return;

    try {
      const [fuelProducts, supplierProducts] = await Promise.all([
        fuelService.getFuels(),
        supplierService.getSupplierProducts({ supplierId: supplier.id })
      ]);

      setProducts(fuelProducts);
      
      // Track existing product IDs to prevent duplicates
      const existingIds = new Set(supplierProducts.map(sp => sp.productId));
      setExistingProductIds(existingIds);
    } catch (error) {
      message.error('Failed to load products');
    }
  };

  useEffect(() => {
    if (visible) {
      fetchData();
      form.resetFields();
      form.setFieldsValue({
        supplierId: supplier?.id,
        currency: 'KES',
        isAvailable: true,
        isPrimary: false,
        priority: 0
      });
    }
  }, [visible, supplier]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Check if product already exists for this supplier
      if (existingProductIds.has(values.productId)) {
        message.error('This product is already associated with the supplier');
        return;
      }

      const validation = supplierService.validateSupplierProduct(values);
      if (!validation.isValid) {
        message.error('Please fix the validation errors');
        return;
      }

      await supplierService.addSupplierProduct(values);
      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (productId) => {
    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct) {
      form.setFieldsValue({
        supplierProductName: selectedProduct.name
      });
    }
  };

  return (
    <Modal
      title={`Add Product to ${supplier?.name}`}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item name="supplierId" hidden>
          <Input />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Product"
              name="productId"
              rules={[{ required: true, message: 'Please select a product' }]}
            >
              <Select
                placeholder="Select product"
                onChange={handleProductChange}
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {products.map(product => (
                  <Option 
                    key={product.id} 
                    value={product.id}
                    disabled={existingProductIds.has(product.id)}
                  >
                    {product.name} ({product.fuelCode})
                    {existingProductIds.has(product.id) && ' - Already added'}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Supplier SKU"
              name="supplierSku"
            >
              <Input placeholder="Supplier product code" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Supplier Product Name"
          name="supplierProductName"
        >
          <Input placeholder="Product name as known by supplier" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Cost Price"
              name="costPrice"
              rules={[{ required: true, message: 'Please enter cost price' }]}
            >
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: '100%' }}
                formatter={value => `KES ${value}`}
                parser={value => value.replace('KES ', '')}
                placeholder="0.00"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Currency"
              name="currency"
            >
              <Select>
                <Option value="KES">KES</Option>
                <Option value="USD">USD</Option>
                <Option value="EUR">EUR</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Lead Time (Days)"
              name="leadTime"
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="0"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Min Order Qty"
              name="minOrderQty"
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="0"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Max Order Qty"
              name="maxOrderQty"
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="0"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Priority"
              name="priority"
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="0"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Available"
              name="isAvailable"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Primary Supplier"
              name="isPrimary"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Certification"
          name="certification"
        >
          <Input placeholder="e.g., KEBS Certified, ISO Certified" />
        </Form.Item>

        <Form.Item
          label="Quality Specifications"
          name="qualitySpecifications"
        >
          <TextArea
            rows={3}
            placeholder="Enter quality specifications JSON or notes"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Contract Start Date"
              name="contractStartDate"
            >
              <Input type="datetime-local" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Contract End Date"
              name="contractEndDate"
            >
              <Input type="datetime-local" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button style={{ marginRight: 8 }} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Add Product
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateSupplierProductModal;