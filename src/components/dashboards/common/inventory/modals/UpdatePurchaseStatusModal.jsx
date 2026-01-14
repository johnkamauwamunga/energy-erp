// src/pages/inventory/UpdatePurchaseStatusModal.jsx
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
  Divider
} from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { nonFuelPurchaseService } from '../../../services/nonFuelPurchaseService';

const { Option } = Select;

const UpdatePurchaseStatusModal = ({ purchase, visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [statusValidation, setStatusValidation] = useState(null);

  useEffect(() => {
    if (purchase) {
      loadAvailableStatuses(purchase.status);
      form.setFieldsValue({ status: undefined });
      setStatusValidation(null);
    }
  }, [purchase, form]);

  const statusFlow = {
    DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
    PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED', 'ON_HOLD'],
    APPROVED: ['ORDER_CONFIRMED', 'CANCELLED', 'ON_HOLD'],
    ORDER_CONFIRMED: ['IN_TRANSIT', 'CANCELLED', 'ON_HOLD'],
    IN_TRANSIT: ['ARRIVED_AT_SITE', 'CANCELLED'],
    ARRIVED_AT_SITE: ['QUALITY_CHECK', 'CANCELLED'],
    QUALITY_CHECK: ['PARTIALLY_RECEIVED', 'COMPLETED', 'REJECTED', 'CANCELLED'],
    PARTIALLY_RECEIVED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
    REJECTED: [],
    ON_HOLD: ['APPROVED', 'ORDER_CONFIRMED', 'CANCELLED']
  };

  const statusDescriptions = {
    DRAFT: 'Initial state, can be edited',
    PENDING_APPROVAL: 'Waiting for manager approval',
    APPROVED: 'Purchase approved, ready for ordering',
    ORDER_CONFIRMED: 'Supplier confirmed the order',
    IN_TRANSIT: 'Goods are being transported',
    ARRIVED_AT_SITE: 'Goods arrived at station',
    QUALITY_CHECK: 'Quality inspection in progress',
    PARTIALLY_RECEIVED: 'Some items have been received',
    COMPLETED: 'All items received and accepted',
    CANCELLED: 'Purchase cancelled',
    REJECTED: 'Purchase rejected',
    ON_HOLD: 'Purchase temporarily on hold'
  };

  const loadAvailableStatuses = (currentStatus) => {
    const nextStatuses = statusFlow[currentStatus] || [];
    setAvailableStatuses(nextStatuses);
  };

  const validateStatusChange = async (newStatus) => {
    if (!purchase) return;
    
    try {
      // Check if purchase can be updated
      if (purchase.status === 'COMPLETED' || purchase.status === 'CANCELLED' || purchase.status === 'REJECTED') {
        return {
          isValid: false,
          message: 'Cannot update a completed, cancelled, or rejected purchase'
        };
      }

      // Check for specific validations
      if (newStatus === 'APPROVED') {
        // Check supplier account status
        if (purchase.supplier?.supplierAccount?.status === 'INACTIVE') {
          return {
            isValid: false,
            message: 'Supplier account is inactive'
          };
        }

        // Check credit limit
        if (purchase.supplier?.supplierAccount?.creditLimit) {
          const currentBalance = purchase.supplier.supplierAccount.currentBalance || 0;
          const newBalance = currentBalance + purchase.netPayable;
          const creditLimit = purchase.supplier.supplierAccount.creditLimit;

          if (newBalance > creditLimit) {
            return {
              isValid: false,
              message: `Credit limit will be exceeded. Current balance: ${currentBalance}, Purchase amount: ${purchase.netPayable}, Limit: ${creditLimit}`
            };
          }
        }
      }

      return {
        isValid: true,
        message: null
      };
    } catch (error) {
      return {
        isValid: false,
        message: error.message
      };
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!newStatus) {
      setStatusValidation(null);
      return;
    }

    const validation = await validateStatusChange(newStatus);
    setStatusValidation(validation);
  };

  const handleSubmit = async (values) => {
    if (!values.status) {
      message.error('Please select a status');
      return;
    }

    setLoading(true);
    try {
      await nonFuelPurchaseService.updatePurchaseStatus(purchase.id, values.status);
      
      message.success(`Purchase status updated to ${values.status}`);
      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error('Failed to update status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!purchase) return null;

  const purchaseInfo = nonFuelPurchaseService.formatPurchase(purchase);

  return (
    <Modal
      title="Update Purchase Status"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions title="Purchase Information" size="small" column={2}>
          <Descriptions.Item label="Purchase #">
            {purchaseInfo.purchaseNumber}
          </Descriptions.Item>
          <Descriptions.Item label="Supplier">
            {purchaseInfo.supplierName}
          </Descriptions.Item>
          <Descriptions.Item label="Current Status">
            <Tag color={purchaseInfo.statusColor}>
              {purchase.status.replace(/_/g, ' ')}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Amount">
            <Tag color="green">
              KES {purchaseInfo.netPayable?.toLocaleString()}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Alert
        message="Status Update"
        description="Changing the purchase status will trigger different workflow actions. Some status changes may have financial implications."
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
            onChange={handleStatusChange}
            style={{ width: '100%' }}
          >
            {availableStatuses.map(status => (
              <Option key={status} value={status}>
                <Space>
                  <span>{status.replace(/_/g, ' ')}</span>
                  {status === 'APPROVED' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  {status === 'CANCELLED' && <WarningOutlined style={{ color: '#ff4d4f' }} />}
                  {status === 'ON_HOLD' && <ClockCircleOutlined style={{ color: '#fa8c16' }} />}
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
                {purchase.status.replace(/_/g, ' ')}
              </Descriptions.Item>
              <Descriptions.Item label="New Status">
                {form.getFieldValue('status').replace(/_/g, ' ')}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {statusValidation && !statusValidation.isValid && (
          <Alert
            message="Status Change Validation"
            description={statusValidation.message}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {form.getFieldValue('status') && form.getFieldValue('status') === 'APPROVED' && (
          <Alert
            message="Financial Implications"
            description="Approving this purchase will create a supplier liability and may affect the supplier's credit utilization."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Divider />

        <Timeline style={{ marginBottom: 16 }}>
          <Timeline.Item color="green" dot={<CheckCircleOutlined />}>
            Current: {purchase.status.replace(/_/g, ' ')}
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
              disabled={statusValidation && !statusValidation.isValid}
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

export default UpdatePurchaseStatusModal;