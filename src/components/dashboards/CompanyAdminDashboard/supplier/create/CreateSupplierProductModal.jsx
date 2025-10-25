import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  Switch,
  Card,
  message,
  Spin,
  Tag,
  Row,
  Col,
  Divider
} from 'antd';
import {
  SearchOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { fuelService } from '../../../../../services/fuelService/fuelService';
import { supplierService } from '../../../../../services/supplierService/supplierService';

const { Option } = Select;

const CreateSupplierProductModal = ({ visible, supplier, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fetch available fuel products when modal opens
  useEffect(() => {
    if (visible) {
      fetchAvailableProducts();
      form.resetFields();
      setSelectedProduct(null);
    }
  }, [visible]);

  const fetchAvailableProducts = async (search = '') => {
    setProductsLoading(true);
    try {
      const productsData = await fuelService.getFuelProducts();
      const productsList = productsData?.products || productsData || [];
      
      if (search) {
        const filtered = productsList.filter(product => 
          product.name?.toLowerCase().includes(search.toLowerCase()) ||
          product.fuelCode?.toLowerCase().includes(search.toLowerCase())
        );
        setProducts(filtered);
      } else {
        setProducts(productsList);
      }
    } catch (error) {
      message.error('Failed to fetch products');
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleProductSelect = (productId) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product);
    
    if (product) {
      form.setFieldsValue({
        supplierProductName: product.name,
        supplierSku: `${supplier.code}-${product.fuelCode}`
      });
    }
  };

  const handleSearch = (value) => {
    fetchAvailableProducts(value);
  };

  const handleSubmit = async (values) => {
    if (!selectedProduct) {
      message.error('Please select a product');
      return;
    }

    setLoading(true);
    try {
      const supplierProductData = {
        // Core Relationships
        supplierId: supplier.id,
        productId: selectedProduct.id,
        
        // Supplier-Specific Product Info
        supplierSku: values.supplierSku,
        supplierProductName: values.supplierProductName || selectedProduct.name,
        
        // Pricing & Terms - Default to 0 instead of null
        costPrice: values.costPrice || 0,
        currency: values.currency || 'KES',
        minOrderQty: values.minOrderQty || 100,
        maxOrderQty: values.maxOrderQty || 1000,
        
        // Delivery & Availability - Default to 0 instead of null
        leadTime: values.leadTime || 0,
        isAvailable: values.isAvailable ?? true,
        stockStatus: values.stockStatus || 'IN_STOCK',
        
        // Supplier Priority - Default to 0 instead of null
        isPrimary: values.isPrimary ?? false,
        priority: values.priority || 0,
        
        // Quality Specifications
        qualitySpecifications: selectedProduct.qualitySpecifications || {
          octane: selectedProduct.octaneRating || 0.7,
          sulfurContent: selectedProduct.sulfurContent || 0.56,
          density: selectedProduct.density || 0.85
        },
        
        // Contract Terms
        contractStartDate: values.contractStartDate,
        contractEndDate: values.contractEndDate,
        
        // Status
        isActive: true
      };

      await supplierService.addSupplierProduct(supplierProductData);
      message.success('Product added to supplier successfully!');
      onSuccess();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Product info display when a product is selected
  const renderProductInfo = () => {
    if (!selectedProduct) return null;

    return (
      <Card 
        size="small" 
        title="Product Details" 
        className="mb-4"
        extra={<Tag color="blue">Selected</Tag>}
      >
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <strong>Name:</strong> {selectedProduct.name}
          </Col>
          <Col span={12}>
            <strong>Code:</strong> <Tag>{selectedProduct.fuelCode}</Tag>
          </Col>
          <Col span={12}>
            <strong>Category:</strong> {selectedProduct.fuelSubType?.category?.name || 'N/A'}
          </Col>
          <Col span={12}>
            <strong>Sub Type:</strong> {selectedProduct.fuelSubType?.name || 'N/A'}
          </Col>
          {selectedProduct.density && (
            <Col span={12}>
              <strong>Density:</strong> {selectedProduct.density} kg/L
            </Col>
          )}
          {selectedProduct.octaneRating && (
            <Col span={12}>
              <strong>Octane:</strong> RON {selectedProduct.octaneRating}
            </Col>
          )}
        </Row>
      </Card>
    );
  };

  return (
    <Modal
      title={
        <div>
          <InboxOutlined style={{ marginRight: 8 }} />
          Add Product to {supplier?.name}
        </div>
      }
      open={visible}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={loading}
      width={800}
      destroyOnClose
      okText="Add Product"
      cancelText="Cancel"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          currency: 'KES',
          isAvailable: true,
          isPrimary: false,
          stockStatus: 'IN_STOCK',
          // Set all numeric defaults to 0 instead of null
          costPrice: 0,
          minOrderQty: 0,
          maxOrderQty: 0,
          leadTime: 0,
          priority: 0
        }}
      >
        {/* Product Selection */}
        <Form.Item
          label="Select Product"
          name="productId"
          rules={[{ required: true, message: 'Please select a product' }]}
        >
          <Select
            showSearch
            placeholder="Search and select a product..."
            onSearch={handleSearch}
            onChange={handleProductSelect}
            filterOption={false}
            notFoundContent={productsLoading ? <Spin size="small" /> : null}
            loading={productsLoading}
          >
            {products.map(product => (
              <Option key={product.id} value={product.id}>
                <div className="flex justify-between items-center">
                  <span>{product.name}</span>
                  <Tag size="small">{product.fuelCode}</Tag>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Display selected product info */}
        {renderProductInfo()}

        <Divider>Supplier-Specific Details</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Supplier SKU"
              name="supplierSku"
              rules={[{ required: true, message: 'Please enter supplier SKU' }]}
            >
              <Input 
                placeholder="e.g., VIVO-PDL-001" 
                prefix={<InboxOutlined />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Supplier Product Name"
              name="supplierProductName"
              tooltip="Leave empty to use product's original name"
            >
              <Input placeholder="Optional custom name" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Cost Price"
              name="costPrice"
              rules={[{ required: true, message: 'Please enter cost price' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.00"
                min={0}
                step={0.01}
                precision={2}
                prefix={<DollarOutlined />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
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
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Min Order Qty (L)"
              name="minOrderQty"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0"
                min={0}
                step={100}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Max Order Qty (L)"
              name="maxOrderQty"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0"
                min={0}
                step={100}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Lead Time (days)"
              name="leadTime"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0"
                min={0}
                max={30}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Priority"
              name="priority"
              tooltip="0 = highest priority"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={10}
                placeholder="0 (highest)"
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
          <Col span={8}>
            <Form.Item
              label="Active"
              name="isActive"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Stock Status"
          name="stockStatus"
        >
          <Select>
            <Option value="IN_STOCK">In Stock</Option>
            <Option value="LOW_STOCK">Low Stock</Option>
            <Option value="OUT_OF_STOCK">Out of Stock</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateSupplierProductModal;