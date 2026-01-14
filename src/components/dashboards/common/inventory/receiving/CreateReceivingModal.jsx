// src/pages/inventory/receiving/CreateReceivingModal.jsx
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
  Divider
} from 'antd';
import {
  TruckOutlined,
  UserOutlined,
  PhoneOutlined,
  FileTextOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { nonFuelPurchaseService } from '../../../services/nonFuelPurchaseService';
import moment from 'moment';

const { TextArea } = Input;
const { Option } = Select;

const CreateReceivingModal = ({ purchase, visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState(null);
  const [expectedItems, setExpectedItems] = useState([]);

  useEffect(() => {
    if (purchase) {
      setPurchaseDetails(nonFuelPurchaseService.formatPurchase(purchase));
      setExpectedItems(purchase.items || []);
      
      form.setFieldsValue({
        purchaseId: purchase.id,
        supplierInvoiceNumber: '',
        supplierInvoiceDate: moment(),
        supplierInvoiceAmount: purchase.netPayable,
        currency: 'KES'
      });
    }
  }, [purchase, form]);

  const calculateTotalOrdered = () => {
    return expectedItems.reduce((sum, item) => sum + (item.orderedQty || 0), 0);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Validate data
      const validation = nonFuelPurchaseService.validateReceiving(values);
      if (!validation.isValid) {
        message.error('Please fix validation errors');
        return;
      }

      // Format dates
      const formattedValues = {
        ...values,
        supplierInvoiceDate: values.supplierInvoiceDate.toISOString(),
        purchaseId: purchase.id
      };

      // Create receiving
      const result = await nonFuelPurchaseService.createReceiving(formattedValues);
      
      message.success('Receiving created successfully!');
      form.resetFields();
      onSuccess(result);
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

  if (!purchaseDetails) return null;

  return (
    <Modal
      title="Create Receiving"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      {/* Purchase Summary */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions title="Purchase Details" size="small" column={2}>
          <Descriptions.Item label="Purchase Number">
            {purchaseDetails.purchaseNumber}
          </Descriptions.Item>
          <Descriptions.Item label="Supplier">
            {purchaseDetails.supplierName}
          </Descriptions.Item>
          <Descriptions.Item label="Station">
            {purchaseDetails.stationName}
          </Descriptions.Item>
          <Descriptions.Item label="Warehouse">
            {purchaseDetails.warehouseName}
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            <Tag color="green">
              KES {purchaseDetails.netPayable?.toLocaleString()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Total Items">
            <Tag color="blue">{calculateTotalOrdered()} units</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Alert
        message="Receiving Information"
        description="Enter the details for the goods being received. This will create a receiving record where you can add items and perform inspections."
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
              name="supplierInvoiceNumber"
              label="Supplier Invoice Number"
              rules={[
                { required: true, message: 'Please enter invoice number' },
                { max: 100, message: 'Max 100 characters' }
              ]}
            >
              <Input 
                placeholder="e.g., INV-2024-00123" 
                prefix={<FileTextOutlined />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="supplierInvoiceDate"
              label="Invoice Date"
              rules={[{ required: true, message: 'Please select invoice date' }]}
            >
              <DatePicker 
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="supplierInvoiceAmount"
              label="Invoice Amount (KES)"
              rules={[
                { required: true, message: 'Please enter invoice amount' },
                { type: 'number', min: 0.01, message: 'Amount must be positive' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.01}
                prefix={<DollarOutlined />}
                formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/KES\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="currency"
              label="Currency"
              initialValue="KES"
            >
              <Select disabled>
                <Option value="KES">Kenya Shilling (KES)</Option>
                <Option value="USD">US Dollar (USD)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Delivery Information</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="driverName"
              label="Driver Name"
              rules={[
                { required: true, message: 'Please enter driver name' },
                { max: 100, message: 'Max 100 characters' }
              ]}
            >
              <Input 
                placeholder="Driver's full name" 
                prefix={<UserOutlined />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="driverPhone"
              label="Driver Phone"
              rules={[
                { max: 20, message: 'Max 20 characters' }
              ]}
            >
              <Input 
                placeholder="+254712345678" 
                prefix={<PhoneOutlined />}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="deliveryVehiclePlate"
              label="Vehicle Plate"
              rules={[
                { required: true, message: 'Please enter vehicle plate' },
                { max: 20, message: 'Max 20 characters' }
              ]}
            >
              <Input 
                placeholder="e.g., KCB 123A" 
                prefix={<TruckOutlined />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="deliveryCompany"
              label="Delivery Company"
              rules={[{ max: 100, message: 'Max 100 characters' }]}
            >
              <Input placeholder="Logistics company name" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="deliveryNoteNumber"
              label="Delivery Note #"
              rules={[{ max: 100, message: 'Max 100 characters' }]}
            >
              <Input placeholder="e.g., DN-2024-001" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="waybillNumber"
              label="Waybill #"
              rules={[{ max: 100, message: 'Max 100 characters' }]}
            >
              <Input placeholder="e.g., WB-789012" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="notes"
          label="Delivery Notes"
        >
          <TextArea 
            rows={3} 
            placeholder="Any additional notes about the delivery..." 
          />
        </Form.Item>

        <Divider />

        <Form.Item style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create Receiving
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateReceivingModal;