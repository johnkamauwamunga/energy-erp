// components/BankManagement/CreateBankModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Space,
  Alert,
  Row,
  Col,
  Switch,
  Tag
} from 'antd';
import { 
  BankOutlined, 
  BarcodeOutlined,
  CheckOutlined,
  CloseOutlined 
} from '@ant-design/icons';
import { bankService } from '../../../../../services/bankService/bankService';

const { Option } = Select;

const CreateBankModal = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setError('');
    }
  }, [visible, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      const bankData = {
        name: values.name.trim(),
        code: values.code?.trim() || null,
        country: values.country || 'Kenya',
        isActive: values.isActive !== false
      };

      // Validate data
      const validationErrors = bankService.validateBank(bankData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      await bankService.createBank(bankData);
      onSuccess();
      form.resetFields();
    } catch (err) {
      setError(err.message || 'Failed to create bank');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setError('');
    onClose();
  };

  // Common countries
  const countries = [
    'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Ethiopia', 'South Africa',
    'Nigeria', 'Ghana'
  ];

  // Popular Kenyan bank codes
  const commonBankCodes = [
    { code: 'KCBL', name: 'KCB Bank' },
    { code: 'EQBL', name: 'Equity Bank' },
    { code: 'COOP', name: 'Cooperative Bank' },
    { code: 'SCBL', name: 'Standard Chartered' },
    { code: 'ABSA', name: 'Absa Bank' },
    { code: 'NCBA', name: 'NCBA Bank' }
  ];

  return (
    <Modal
      title={
        <Space>
          <BankOutlined />
          Create New Bank
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
      destroyOnClose
    >
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError('')}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          country: 'Kenya',
          isActive: true
        }}
      >
        <Form.Item
          name="name"
          label="Bank Name"
          rules={[
            { required: true, message: 'Please enter bank name' },
            { min: 2, message: 'Bank name must be at least 2 characters' }
          ]}
        >
          <Input 
            placeholder="Enter bank name" 
            prefix={<BankOutlined />}
            size="large"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="code"
              label="Bank Code"
              rules={[
                {
                  pattern: /^[A-Z0-9-]+$/,
                  message: 'Bank code can only contain uppercase letters, numbers and hyphens'
                }
              ]}
            >
              <Input 
                placeholder="KCBL" 
                prefix={<BarcodeOutlined />}
                size="large"
                style={{ textTransform: 'uppercase' }}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="country"
              label="Country"
              rules={[
                { required: true, message: 'Please select country' }
              ]}
            >
              <Select 
                placeholder="Select country" 
                size="large"
                showSearch
              >
                {countries.map(country => (
                  <Option key={country} value={country}>
                    {country}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="isActive"
          label="Status"
          valuePropName="checked"
        >
          <Switch 
            checkedChildren={<CheckOutlined />} 
            unCheckedChildren={<CloseOutlined />}
          />
        </Form.Item>

        {/* Bank Code Suggestions */}
        <Form.Item label="Common Bank Codes">
          <Space size={[8, 8]} wrap>
            {commonBankCodes.map(bank => (
              <Tag
                key={bank.code}
                color="blue"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  form.setFieldsValue({
                    code: bank.code
                  });
                }}
              >
                {bank.code}
              </Tag>
            ))}
          </Space>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button 
              onClick={handleCancel}
              size="large"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<BankOutlined />}
              size="large"
            >
              Create Bank
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateBankModal;