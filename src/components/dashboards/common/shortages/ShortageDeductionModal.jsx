// src/components/Shortages/ShortageDeductionModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Input,
  DatePicker,
  Row,
  Col,
  Typography,
  Space,
  Alert,
  Statistic,
  Card,
  Descriptions,
  Tag,
  message
} from 'antd';
import {
  DollarOutlined,
  CalendarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { shortageService } from '../../../../services/shortageService/shortageService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ShortageDeductionModal = ({
  visible,
  onCancel,
  onSuccess,
  shortage,
  currentUser,
  title = "Record Deduction"
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [shortageDetails, setShortageDetails] = useState(null);

  // Load shortage details
  useEffect(() => {
    if (shortage && visible) {
      if (typeof shortage === 'string') {
        // If it's an ID, fetch details
        fetchShortageDetails(shortage);
      } else {
        // If it's already an object, use it
        setShortageDetails(shortage);
      }
    }
  }, [shortage, visible]);

  const fetchShortageDetails = async (shortageId) => {
    try {
      const details = await shortageService.getShortage(shortageId);
      setShortageDetails(details);
    } catch (error) {
      console.error('Error fetching shortage details:', error);
      message.error('Failed to load shortage details');
      onCancel();
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      if (!shortageDetails?.id) {
        throw new Error('No shortage selected');
      }

      // Validate amount doesn't exceed remaining
      const deductionAmount = values.amount;
      const remaining = shortageDetails.amountRemaining;
      
      if (deductionAmount > remaining) {
        message.error(`Amount cannot exceed remaining balance (Ksh ${remaining})`);
        return;
      }

      const deductionData = {
        amount: deductionAmount,
        deductionDate: values.deductionDate ? values.deductionDate.toISOString() : new Date().toISOString(),
        description: values.description || `Deduction for shortage: ${shortageDetails.description}`,
        comments: values.comments
      };

      const result = await shortageService.createDeduction(shortageDetails.id, deductionData);
      
      message.success('Deduction recorded successfully!');
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      form.resetFields();
      onCancel();
      
    } catch (error) {
      console.error('Error creating deduction:', error);
      message.error(error.message || 'Failed to record deduction');
    } finally {
      setSubmitting(false);
    }
  };

  const currencyFormatter = (value) => {
    if (!value) return '';
    return `Ksh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  if (!shortageDetails) {
    return null;
  }

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined />
          <span>{title}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Record Deduction"
      cancelText="Cancel"
      width={600}
      confirmLoading={submitting}
      destroyOnClose
    >
      {/* Shortage Summary */}
      <Card size="small" className="mb-4">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Staff">
            {shortageDetails.staffDisplayName || shortageDetails.staffName}
          </Descriptions.Item>
          <Descriptions.Item label="Original Amount">
            {currencyFormatter(shortageDetails.amount)}
          </Descriptions.Item>
          <Descriptions.Item label="Amount Remaining">
            <Text strong style={{ color: '#ff4d4f' }}>
              {currencyFormatter(shortageDetails.amountRemaining)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Description">
            {shortageDetails.description}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Alert
        message={`Maximum deduction amount: ${currencyFormatter(shortageDetails.amountRemaining)}`}
        type="info"
        showIcon
        className="mb-4"
      />

      {/* Deduction Form */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          deductionDate: dayjs(),
          amount: Math.min(shortageDetails.amountRemaining, 1000)
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="amount"
              label="Deduction Amount"
              rules={[
                { required: true, message: 'Amount is required' },
                { type: 'number', min: 1, message: 'Amount must be at least 1' },
                () => ({
                  validator(_, value) {
                    if (!value || value <= shortageDetails.amountRemaining) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(`Cannot exceed ${currencyFormatter(shortageDetails.amountRemaining)}`));
                  }
                })
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter amount"
                min={1}
                max={shortageDetails.amountRemaining}
                step={100}
                prefix="Ksh"
                formatter={currencyFormatter}
                parser={value => value.replace(/Ksh\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="deductionDate"
              label="Deduction Date"
              rules={[{ required: true, message: 'Date is required' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                disabledDate={(current) => {
                  return current && current > dayjs().endOf('day');
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="description"
              label="Description (Optional)"
            >
              <Input
                placeholder="Describe this deduction"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="comments"
              label="Comments (Optional)"
            >
              <TextArea
                placeholder="Additional comments"
                rows={3}
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default ShortageDeductionModal;