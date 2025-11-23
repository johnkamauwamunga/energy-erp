// Modified ReversalForm.jsx - Using updateTransfer instead
import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  message,
  Card,
  Table,
  Space,
  Typography
} from 'antd';
import {
  UndoOutlined,
  SearchOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const ReversalForm = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  const searchTransfers = async () => {
    setSearching(true);
    try {
      // Search for pending transfers that can be updated
      const result = await debtTransferService.getAccountTransfers({
        status: 'PENDING' // Only pending transfers can be modified
      });
      setTransfers(result.transfers || []);
    } catch (error) {
      message.error('Failed to search transfers: ' + error.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (values) => {
    if (!selectedTransfer) {
      message.error('Please select a transfer to update');
      return;
    }

    setLoading(true);
    try {
      // Use updateTransfer endpoint instead of non-existent reverseSettlement
      const result = await debtTransferService.updateTransfer(selectedTransfer.id, {
        description: `REVERSED: ${values.reversalReason} - ${values.description || 'No additional details'}`,
        status: 'CANCELLED' // Update status to cancelled
      });

      message.success(`Transfer cancelled successfully!`);
      form.resetFields();
      setSelectedTransfer(null);
      setTransfers([]);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(`Failed to cancel transfer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const transferColumns = [
    {
      title: 'Transfer #',
      dataIndex: 'transferNumber',
      key: 'transferNumber',
    },
    {
      title: 'Date',
      dataIndex: 'transferDate',
      key: 'transferDate',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `KES ${amount?.toLocaleString()}`
    },
    {
      title: 'Category',
      dataIndex: 'transferCategory',
      key: 'transferCategory',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Text type={status === 'PENDING' ? 'warning' : 'success'}>
          {status}
        </Text>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => setSelectedTransfer(record)}
          size="small"
          disabled={record.status !== 'PENDING'}
        >
          Select
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <Alert 
        message="Transfer Cancellation" 
        description="Cancel pending transfers. Only transfers with PENDING status can be cancelled."
        type="warning"
        showIcon
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Transfer Search */}
        <Card title="Find Transfer to Cancel" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              icon={<SearchOutlined />}
              onClick={searchTransfers}
              loading={searching}
              block
            >
              Search Pending Transfers
            </Button>

            {transfers.length > 0 && (
              <Table
                dataSource={transfers}
                columns={transferColumns}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 5 }}
                style={{ marginTop: 16 }}
              />
            )}
          </Space>
        </Card>

        {/* Selected Transfer */}
        {selectedTransfer && (
          <Card title="Selected Transfer" size="small">
            <Space direction="vertical">
              <Text strong>Transfer #: {selectedTransfer.transferNumber}</Text>
              <Text>Amount: KES {selectedTransfer.amount?.toLocaleString()}</Text>
              <Text>Category: {selectedTransfer.transferCategory}</Text>
              <Text type="secondary">
                Date: {new Date(selectedTransfer.transferDate).toLocaleDateString()}
              </Text>
            </Space>
          </Card>
        )}

        {/* Cancellation Details */}
        <Form.Item
          name="reversalReason"
          label="Cancellation Reason"
          rules={[{ required: true, message: 'Please provide a reason for cancellation' }]}
        >
          <Select placeholder="Select cancellation reason">
            <Option value="DUPLICATE_PAYMENT">Duplicate Payment</Option>
            <Option value="WRONG_AMOUNT">Wrong Amount</Option>
            <Option value="WRONG_DEBTOR">Wrong Debtor</Option>
            <Option value="CUSTOMER_REQUEST">Customer Request</Option>
            <Option value="OTHER">Other</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="description"
          label="Additional Details"
        >
          <TextArea
            placeholder="Provide additional context for this cancellation"
            rows={3}
          />
        </Form.Item>

        {/* Submit */}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<UndoOutlined />}
            size="large"
            block
            disabled={!selectedTransfer}
            danger
          >
            Cancel Transfer
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ReversalForm;