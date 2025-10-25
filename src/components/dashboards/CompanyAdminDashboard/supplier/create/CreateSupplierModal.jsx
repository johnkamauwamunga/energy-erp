import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Row,
  Col,
  message
} from 'antd';
import { supplierService } from '../../../../../services/supplierService/supplierService';

const { Option } = Select;
const { TextArea } = Input;

const CreateSupplierModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Validate the data
      const validation = supplierService.validateSupplier(values);
      if (!validation.isValid) {
        message.error('Please fix the validation errors');
        return;
      }

      await supplierService.createSupplier(values);
      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Create New Supplier"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          country: 'Kenya',
          paymentTerms: 30,
          deliveryLeadTime: 2
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Supplier Name"
              name="name"
              rules={[
                { required: true, message: 'Please enter supplier name' },
                { min: 2, message: 'Supplier name must be at least 2 characters' }
              ]}
            >
              <Input placeholder="Enter supplier name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Supplier Code"
              name="code"
              rules={[{ required: true, message: 'Please enter supplier code' }]}
            >
              <Input placeholder="e.g., VIVO, TOTAL" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Contact Person"
              name="contactPerson"
            >
              <Input placeholder="Enter contact person name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Supplier Type"
              name="supplierType"
              rules={[{ required: true, message: 'Please select supplier type' }]}
            >
              <Select placeholder="Select supplier type">
                <Option value="FUEL_WHOLESALER">Fuel Wholesaler</Option>
                <Option value="FUEL_REFINERY">Refinery</Option>
                <Option value="OIL_COMPANY">Oil Company</Option>
                <Option value="DISTRIBUTOR">Distributor</Option>
                <Option value="RETAIL_SUPPLIER">Retail Supplier</Option>
                <Option value="EQUIPMENT_VENDOR">Equipment Vendor</Option>
                <Option value="SERVICE_PROVIDER">Service Provider</Option>
                <Option value="GENERAL_SUPPLIER">General Supplier</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ type: 'email', message: 'Please enter valid email' }]}
            >
              <Input placeholder="supplier@company.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Phone"
              name="phone"
            >
              <Input placeholder="+254712345678" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Alternate Phone"
              name="alternatePhone"
            >
              <Input placeholder="+254734567890" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Tax ID"
              name="taxId"
            >
              <Input placeholder="P051234567K" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Address"
          name="address"
        >
          <TextArea placeholder="Enter full address" rows={2} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="City"
              name="city"
            >
              <Input placeholder="Nairobi" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="State/County"
              name="state"
            >
              <Input placeholder="Nairobi County" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Country"
              name="country"
            >
              <Input placeholder="Kenya" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Payment Terms (Days)"
              name="paymentTerms"
            >
              <InputNumber
                min={0}
                max={365}
                style={{ width: '100%' }}
                placeholder="30"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Credit Limit (KES)"
              name="creditLimit"
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/KES\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Delivery Lead Time (Days)"
              name="deliveryLeadTime"
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="2"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Delivery Areas"
          name="deliveryAreas"
        >
          <TextArea 
            placeholder="Enter delivery areas e.g., Nairobi, Mombasa, Kisumu" 
            rows={2} 
          />
        </Form.Item>

        <Form.Item
          label="Business Registration Number"
          name="businessRegNumber"
        >
          <Input placeholder="CPT-2012-123456" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button style={{ marginRight: 8 }} onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Create Supplier
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateSupplierModal;