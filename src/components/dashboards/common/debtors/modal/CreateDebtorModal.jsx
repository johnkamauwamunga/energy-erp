// src/components/debtor/CreateDebtorModal.jsx
import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Space,
  Alert,
  Row,
  Col
} from 'antd';
import { UserAddOutlined, PhoneOutlined, MailOutlined, ContactsOutlined } from '@ant-design/icons';
import { debtorService } from '../../../../../services/debtorService/debtorService';

const { Option } = Select;

const CreateDebtorModal = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      const debtorData = {
        name: values.name.trim(),
        phone: values.phone.trim(),
        contactPerson: values.contactPerson?.trim() || null,
        email: values.email?.trim() || null,
        isActive: values.isActive !== false
      };

      await debtorService.createDebtor(debtorData);
      onSuccess();
      form.resetFields();
    } catch (err) {
      setError(err.message || 'Failed to create debtor');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setError('');
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <UserAddOutlined />
          Add New Debtor
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
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          isActive: true
        }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="Debtor Name"
              rules={[
                { required: true, message: 'Please enter debtor name' },
                { max: 200, message: 'Name cannot exceed 200 characters' }
              ]}
            >
              <Input 
                placeholder="Enter debtor name" 
                prefix={<UserAddOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="phone"
              label="Phone Number"
              rules={[
                { required: true, message: 'Please enter phone number' },
                { max: 20, message: 'Phone number cannot exceed 20 characters' },
                { 
                  pattern: /^\+?[\d\s-()]+$/,
                  message: 'Please enter a valid phone number'
                }
              ]}
            >
              <Input 
                placeholder="254712345678" 
                prefix={<PhoneOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="contactPerson"
              label="Contact Person"
              rules={[
                { max: 100, message: 'Contact person cannot exceed 100 characters' }
              ]}
            >
              <Input 
                placeholder="Optional contact person" 
                prefix={<ContactsOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input 
                placeholder="debtor@example.com" 
                prefix={<MailOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="isActive"
          label="Status"
          style={{ marginBottom: 24 }}
        >
          <Select size="large">
            <Option value={true}>Active</Option>
            <Option value={false}>Inactive</Option>
          </Select>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Row gutter={16}>
            <Col xs={12} sm={8}>
              <Button 
                block 
                onClick={handleCancel}
                size="large"
              >
                Cancel
              </Button>
            </Col>
            <Col xs={12} sm={16}>
              <Button 
                block 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<UserAddOutlined />}
                size="large"
              >
                Create Debtor
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateDebtorModal;