// src/pages/inventory/receiving/AddReceivingItemModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Button,
  Row,
  Col,
  message,
  Alert,
  Space,
  Descriptions,
  Tag,
  Divider,
  Card,
  Table
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  BarcodeOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { nonFuelPurchaseService } from '../../../services/nonFuelPurchaseService';

const { TextArea } = Input;
const { Option } = Select;

const AddReceivingItemModal = ({ receiving, visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseItems, setPurchaseItems] = useState([]);

  useEffect(() => {
    if (receiving && receiving.purchase) {
      // Get products from purchase
      const items = receiving.purchase.items || [];
      setPurchaseItems(items);
      
      // Set initial form values
      if (items.length > 0) {
        const firstItem = items[0];
        setSelectedProduct(firstItem.productId);
        form.setFieldsValue({
          productId: firstItem.productId,
          expectedQty: firstItem.orderedQty,
          unitCost: firstItem.unitCost
        });
      }
    }
  }, [receiving, form]);

  const getProductInfo = (productId) => {
    return purchaseItems.find(item => item.productId === productId);
  };

  const handleProductChange = (productId) => {
    setSelectedProduct(productId);
    const productInfo = getProductInfo(productId);
    if (productInfo) {
      form.setFieldsValue({
        expectedQty: productInfo.orderedQty,
        unitCost: productInfo.unitCost
      });
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Validate data
      const validation = nonFuelPurchaseService.validateReceivingItem(values);
      if (!validation.isValid) {
        message.error('Please fix validation errors');
        return;
      }

      // Check if received quantity doesn't exceed ordered
      const productInfo = getProductInfo(values.productId);
      if (productInfo && values.receivedQty > productInfo.orderedQty) {
        message.error(`Cannot receive more than ordered quantity (${productInfo.orderedQty})`);
        return;
      }

      // Calculate accepted quantity
      const damagedQty = values.damagedQty || 0;
      const acceptedQty = values.receivedQty - damagedQty;
      
      if (damagedQty > values.receivedQty) {
        message.error('Damaged quantity cannot exceed received quantity');
        return;
      }

      const itemData = {
        ...values,
        acceptedQty,
        purchaseItemId: productInfo?.id
      };

      onSuccess(itemData);
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  if (!receiving) return null;

  return (
    <Modal
      title="Add Received Items"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Alert
        message="Item Receiving"
        description="Record the actual quantities received, including any damages or discrepancies."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {/* Product Selection */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Form.Item
            name="productId"
            label="Product"
            rules={[{ required: true, message: 'Please select a product' }]}
          >
            <Select
              placeholder="Select product"
              onChange={handleProductChange}
              style={{ width: '100%' }}
            >
              {purchaseItems.map((item) => (
                <Option key={item.productId} value={item.productId}>
                  <Space>
                    <span>{item.product?.name}</span>
                    <Tag color="blue">Ordered: {item.orderedQty}</Tag>
                    {item.receivedQty > 0 && (
                      <Tag color="green">Already received: {item.receivedQty}</Tag>
                    )}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedProduct && (
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="Unit">
                {getProductInfo(selectedProduct)?.product?.unit}
              </Descriptions.Item>
              <Descriptions.Item label="Unit Cost">
                KES {getProductInfo(selectedProduct)?.unitCost?.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Ordered">
                {getProductInfo(selectedProduct)?.orderedQty}
              </Descriptions.Item>
              <Descriptions.Item label="Already Received">
                {getProductInfo(selectedProduct)?.receivedQty || 0}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="receivedQty"
              label="Received Quantity"
              rules={[
                { required: true, message: 'Please enter received quantity' },
                { type: 'number', min: 1, message: 'Must be at least 1' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                placeholder="Enter received quantity"
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
                placeholder="Enter damaged quantity"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="unitCost"
              label="Actual Unit Cost (KES)"
              rules={[
                { type: 'number', min: 0.01, message: 'Must be positive' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.01}
                placeholder="Actual cost per unit"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="batchNumber"
              label="Batch Number"
              rules={[{ max: 100, message: 'Max 100 characters' }]}
            >
              <Input
                placeholder="Enter batch/lot number"
                prefix={<BarcodeOutlined />}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="expiryDate"
              label="Expiry Date"
            >
              <DatePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                placeholder="Select expiry date"
                suffixIcon={<CalendarOutlined />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="storageLocation"
              label="Storage Location"
              rules={[{ max: 200, message: 'Max 200 characters' }]}
            >
              <Input
                placeholder="e.g., Shelf A3, Zone 1"
                prefix={<EnvironmentOutlined />}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="inspectionNotes"
          label="Inspection Notes"
          rules={[{ max: 1000, message: 'Max 1000 characters' }]}
        >
          <TextArea
            rows={3}
            placeholder="Notes about quality, damages, or inspection findings..."
            prefix={<FileTextOutlined />}
          />
        </Form.Item>

        {/* Summary Card */}
        {form.getFieldValue('receivedQty') && (
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed' }}>
            <Descriptions title="Summary" size="small" column={2}>
              <Descriptions.Item label="Total Received">
                <Tag color="blue">{form.getFieldValue('receivedQty')}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Damaged">
                <Tag color="orange">{form.getFieldValue('damagedQty') || 0}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Accepted">
                <Tag color="green">
                  {(form.getFieldValue('receivedQty') || 0) - (form.getFieldValue('damagedQty') || 0)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Acceptance Rate">
                {form.getFieldValue('receivedQty') > 0 ? (
                  <Tag color={
                    ((form.getFieldValue('receivedQty') - (form.getFieldValue('damagedQty') || 0)) / 
                     form.getFieldValue('receivedQty')) >= 0.95 ? 'success' : 'warning'
                  }>
                    {Math.round(
                      ((form.getFieldValue('receivedQty') - (form.getFieldValue('damagedQty') || 0)) / 
                       form.getFieldValue('receivedQty')) * 100
                    )}%
                  </Tag>
                ) : 'N/A'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Divider />

        <Form.Item style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<CheckOutlined />}>
              Add Item
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddReceivingItemModal;