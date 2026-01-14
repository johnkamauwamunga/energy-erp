// src/pages/inventory/UpdateReceivingStatusModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Button,
  Space,
  message,
  Alert,
  Descriptions,
  Tag,
  Timeline,
  Card,
  Divider,
  Input
} from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

const UpdateReceivingStatusModal = ({ receiving, visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState([]);

  useEffect(() => {
    if (receiving) {
      loadAvailableStatuses(receiving.status);
      form.setFieldsValue({
        status: undefined,
        notes: ''
      });
    }
  }, [receiving, form]);

  const statusFlow = {
    PENDING: ['ARRIVED', 'CANCELLED'],
    ARRIVED: ['INSPECTION_IN_PROGRESS', 'CANCELLED'],
    INSPECTION_IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: []
  };

  const statusDescriptions = {
    PENDING: 'Receiving created, goods not yet arrived',
    ARRIVED: 'Goods have arrived at site',
    INSPECTION_IN_PROGRESS: 'Quality inspection in progress',
    COMPLETED: 'Receiving completed and approved',
    CANCELLED: 'Receiving cancelled'
  };

  const loadAvailableStatuses = (currentStatus) => {
    const nextStatuses = statusFlow[currentStatus] || [];
    setAvailableStatuses(nextStatuses);
  };

  const handleSubmit = async (values) => {
    if (!values.status) {
      message.error('Please select a status');
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, this would call the API
      // await nonFuelPurchaseService.updateReceivingStatus(receiving.id, values.status);
      
      message.success(`Receiving status updated to ${values.status}`);
      form.resetFields();
      onSuccess(values.status);
    } catch (error) {
      message.error('Failed to update status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!receiving) return null;

  return (
    <Modal
      title="Update Receiving Status"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions title="Receiving Information" size="small" column={2}>
          <Descriptions.Item label="Receiving #">
            {receiving.receivingNumber}
          </Descriptions.Item>
          <Descriptions.Item label="Purchase #">
            {receiving.purchaseNumber}
          </Descriptions.Item>
          <Descriptions.Item label="Current Status">
            <Tag color={receiving.statusColor}>
              {receiving.status.replace(/_/g, ' ')}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Items">
            {receiving.receivedTotalItems || 0} / {receiving.expectedTotalItems || 0}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Alert
        message="Status Update"
        description="Updating receiving status will affect the inspection workflow and may trigger notifications."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="status"
          label="Select New Status"
          rules={[{ required: true, message: 'Please select a status' }]}
        >
          <Select
            placeholder="Select status"
            style={{ width: '100%' }}
          >
            {availableStatuses.map(status => (
              <Option key={status} value={status}>
                <Space>
                  {status === 'ARRIVED' && <InboxOutlined />}
                  {status === 'INSPECTION_IN_PROGRESS' && <ExclamationCircleOutlined />}
                  {status === 'COMPLETED' && <CheckCircleOutlined />}
                  {status === 'CANCELLED' && <ClockCircleOutlined />}
                  <span>{status.replace(/_/g, ' ')}</span>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {form.getFieldValue('status') && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Descriptions title="Status Information" size="small" column={1}>
              <Descriptions.Item label="Description">
                {statusDescriptions[form.getFieldValue('status')]}
              </Descriptions.Item>
              <Descriptions.Item label="Current Status">
                {receiving.status.replace(/_/g, ' ')}
              </Descriptions.Item>
              <Descriptions.Item label="New Status">
                {form.getFieldValue('status').replace(/_/g, ' ')}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {form.getFieldValue('status') && (
          <Form.Item
            name="notes"
            label="Status Notes"
            rules={[{ max: 500, message: 'Maximum 500 characters' }]}
          >
            <TextArea
              rows={3}
              placeholder="Add notes about the status change..."
            />
          </Form.Item>
        )}

        {form.getFieldValue('status') === 'COMPLETED' && (
          <Alert
            message="Important Notice"
            description="Completing the receiving will update purchase status and create supplier liability. Make sure all items have been properly inspected."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Divider />

        <Timeline style={{ marginBottom: 16 }}>
          <Timeline.Item color="green" dot={<CheckCircleOutlined />}>
            Current: {receiving.status.replace(/_/g, ' ')}
          </Timeline.Item>
          {form.getFieldValue('status') && (
            <Timeline.Item color="blue" dot={<SyncOutlined />}>
              New: {form.getFieldValue('status').replace(/_/g, ' ')}
            </Timeline.Item>
          )}
        </Timeline>

        <Form.Item style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SyncOutlined />}
            >
              Update Status
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UpdateReceivingStatusModal;