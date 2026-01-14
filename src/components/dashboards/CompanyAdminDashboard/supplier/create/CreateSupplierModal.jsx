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
  message,
  Alert
} from 'antd';
import { supplierService } from '../../../../../services/supplierService/supplierService';

const { Option } = Select;
const { TextArea } = Input;

const CreateSupplierModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Validate the data
      const validation = supplierService.validateSupplier(values);
      if (!validation.isValid) {
        message.error('Please fix the validation errors');
        return;
      }

      // If auto-generate code is selected, remove the code field
      const submitData = autoGenerateCode 
        ? { ...values, code: undefined } 
        : values;

      await supplierService.createSupplier(submitData);
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
    setAutoGenerateCode(true);
    onCancel();
  };

  const handleCodeGenerationChange = (checked) => {
    setAutoGenerateCode(checked);
    if (checked) {
      form.setFieldsValue({ code: undefined });
    }
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
      <Alert
        message="Supplier Code"
        description="Supplier codes must be unique within your company. If you don't provide a code, one will be automatically generated."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          country: 'Kenya',
          paymentTerms: 30,
          deliveryLeadTime: 2,
          status: 'ACTIVE'
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Supplier Name"
              name="name"
              rules={[
                { required: true, message: 'Please enter supplier name' },
                { min: 2, message: 'Supplier name must be at least 2 characters' },
                { max: 200, message: 'Supplier name must be less than 200 characters' }
              ]}
            >
              <Input placeholder="Enter supplier name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Supplier Code"
              name="code"
              rules={[
                { max: 20, message: 'Supplier code must be less than 20 characters' }
              ]}
              extra="Leave blank to auto-generate"
            >
              <Input 
                placeholder="e.g., VIVO, TOTAL" 
                disabled={autoGenerateCode}
                addonBefore={
                  <Select 
                    value={autoGenerateCode ? 'auto' : 'manual'} 
                    onChange={handleCodeGenerationChange}
                    style={{ width: 100 }}
                  >
                    <Option value="auto">Auto</Option>
                    <Option value="manual">Manual</Option>
                  </Select>
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Contact Person"
              name="contactPerson"
              rules={[
                { max: 100, message: 'Contact person name must be less than 100 characters' }
              ]}
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
              rules={[
                { type: 'email', message: 'Please enter valid email' },
                { max: 255, message: 'Email must be less than 255 characters' }
              ]}
            >
              <Input placeholder="supplier@company.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Phone"
              name="phone"
              rules={[
                { max: 20, message: 'Phone number must be less than 20 characters' }
              ]}
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
              rules={[
                { max: 20, message: 'Alternate phone must be less than 20 characters' }
              ]}
            >
              <Input placeholder="+254734567890" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Tax ID"
              name="taxId"
              rules={[
                { max: 50, message: 'Tax ID must be less than 50 characters' }
              ]}
            >
              <Input placeholder="P051234567K" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Address"
          name="address"
          rules={[
            { max: 500, message: 'Address must be less than 500 characters' }
          ]}
        >
          <TextArea placeholder="Enter full address" rows={2} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="City"
              name="city"
              rules={[
                { max: 100, message: 'City name must be less than 100 characters' }
              ]}
            >
              <Input placeholder="Nairobi" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="State/County"
              name="state"
              rules={[
                { max: 100, message: 'State name must be less than 100 characters' }
              ]}
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
              rules={[
                { type: 'number', min: 0, max: 365, message: 'Payment terms must be between 0 and 365 days' }
              ]}
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
          rules={[
            { max: 500, message: 'Delivery areas must be less than 500 characters' }
          ]}
        >
          <TextArea 
            placeholder="Enter delivery areas e.g., Nairobi, Mombasa, Kisumu" 
            rows={2} 
          />
        </Form.Item>

        <Form.Item
          label="Business Registration Number"
          name="businessRegNumber"
          rules={[
            { max: 50, message: 'Business registration number must be less than 50 characters' }
          ]}
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