// src/components/StaffAccounts/modals/CreateShortageModal.jsx
import React from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Alert,
  DatePicker,
  Space
} from 'antd';
import { AccountBookOutlined, UserOutlined } from '@ant-design/icons';

const CreateShortageModal = ({ 
  visible, 
  onCancel, 
  onOk, 
  confirmLoading,
  form,
  staffAccounts,
  formErrors,
  onFinish
}) => {
  return (
    <Modal
      title={
        <Space>
          <AccountBookOutlined />
          Record Shortage
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
      okText="Record Shortage"
      cancelText="Cancel"
      width={500}
      confirmLoading={confirmLoading}
    >
      {formErrors.length > 0 && (
        <Alert
          message="Validation Error"
          description={
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              {formErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          }
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item
          name="staffAccountId"
          label="Staff Member"
          rules={[{ required: true, message: 'Please select staff member' }]}
        >
          <Select
            placeholder="Select staff"
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
            suffixIcon={<UserOutlined />}
          >
            {staffAccounts
              .filter(acc => acc.isActive)
              .map(account => (
                <Select.Option key={account.id} value={account.id}>
                  {account.userDisplayName} ({account.stationDisplayName})
                </Select.Option>
              ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="amount"
          label="Shortage Amount"
          rules={[
            { required: true, message: 'Please enter amount' },
            { type: 'number', min: 1, message: 'Amount must be positive' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="Enter amount"
            min={1}
            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/\$\s?|(,*)/g, '')}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Please enter description' }]}
        >
          <Input.TextArea
            placeholder="Enter shortage description"
            rows={3}
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Form.Item
          name="referenceNumber"
          label="Reference Number (Optional)"
        >
          <Input placeholder="e.g., SHIFT-001, COLLECTION-2024" />
        </Form.Item>

        <Form.Item
          name="dueDate"
          label="Due Date (Optional)"
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateShortageModal;