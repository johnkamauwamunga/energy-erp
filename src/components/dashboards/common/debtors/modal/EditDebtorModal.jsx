// src/components/debtor/modal/EditDebtorModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  message,
  Switch,
  Typography
} from 'antd';
import { debtorService } from '../../../../../services/debtorService/debtorService';

const { Text } = Typography;

const EditDebtorModal = ({ visible, onClose, onSuccess, debtor }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (debtor && visible) {
      form.setFieldsValue({
        name: debtor.name,
        contactPerson: debtor.contactPerson,
        phone: debtor.phone,
        email: debtor.email,
        isActive: debtor.isActive
      });
    }
  }, [debtor, visible, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await debtorService.updateDebtor(debtor.id, values);
      onSuccess();
    } catch (error) {
      console.error('Failed to update debtor:', error);
      message.error('Failed to update debtor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Edit Debtor"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={loading}
      >
        <Form.Item
          name="name"
          label="Debtor Name"
          rules={[{ required: true, message: 'Please enter debtor name' }]}
        >
          <Input placeholder="Enter debtor name" />
        </Form.Item>

        <Form.Item
          name="contactPerson"
          label="Contact Person"
        >
          <Input placeholder="Enter contact person name" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Phone Number"
          rules={[{ required: true, message: 'Please enter phone number' }]}
        >
          <Input placeholder="Enter phone number" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[{ type: 'email', message: 'Please enter a valid email' }]}
        >
          <Input placeholder="Enter email address" />
        </Form.Item>

        <Form.Item
          name="isActive"
          label="Status"
          valuePropName="checked"
        >
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Debtor
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditDebtorModal;