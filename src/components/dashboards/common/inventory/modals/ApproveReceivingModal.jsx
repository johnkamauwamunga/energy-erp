// src/pages/inventory/ApproveReceivingModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Button,
  Space,
  message,
  Alert,
  Descriptions,
  Tag,
  Card,
  Divider,
  Input,
  Statistic,
  Row,
  Col,
  Table,
  List
} from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';

const { TextArea } = Input;

const ApproveReceivingModal = ({ receiving, visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (receiving) {
      calculateSummary();
      form.setFieldsValue({
        approvalNotes: ''
      });
    }
  }, [receiving, form]);

  const calculateSummary = () => {
    if (!receiving) return;

    const totalReceived = receiving.receivedTotalItems || 0;
    const totalDamaged = receiving.damagedItems || 0;
    const totalAccepted = receiving.acceptedItems || 0;
    const acceptanceRate = totalReceived > 0 ? (totalAccepted / totalReceived) * 100 : 0;

    // Calculate actual payable amount (based on accepted items only)
    const itemReceipts = receiving.itemReceipts || [];
    const actualPayableAmount = itemReceipts.reduce((sum, receipt) => {
      return sum + (receipt.acceptedQty * (receipt.unitCost || 0));
    }, 0);

    const originalInvoiceAmount = receiving.supplierInvoiceAmount || 0;
    const difference = originalInvoiceAmount - actualPayableAmount;

    setSummary({
      totalReceived,
      totalDamaged,
      totalAccepted,
      acceptanceRate,
      originalInvoiceAmount,
      actualPayableAmount,
      difference,
      itemReceipts
    });
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Validate that at least some items were accepted
      if (summary.totalAccepted === 0) {
        message.error('Cannot approve receiving with 0 accepted items');
        return;
      }

      // Call API to approve receiving
      await onSuccess(values.approvalNotes);
      
      message.success('Receiving approved successfully!');
      form.resetFields();
    } catch (error) {
      message.error('Failed to approve receiving: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!receiving || !summary) return null;

  return (
    <Modal
      title="Approve Receiving"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Alert
        message="Financial Implications"
        description="Approving this receiving will create supplier liability and update the purchase status to COMPLETED. This action cannot be undone."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions title="Receiving Summary" column={2}>
          <Descriptions.Item label="Receiving #">
            <Tag color="blue">{receiving.receivingNumber}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Purchase #">
            {receiving.purchaseNumber}
          </Descriptions.Item>
          <Descriptions.Item label="Supplier">
            {receiving.supplierName}
          </Descriptions.Item>
          <Descriptions.Item label="Driver">
            {receiving.driverName}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Received"
              value={summary.totalReceived}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Accepted"
              value={summary.totalAccepted}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Damaged"
              value={summary.totalDamaged}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Acceptance Rate"
              value={summary.acceptanceRate.toFixed(1)}
              suffix="%"
              valueStyle={{ 
                color: summary.acceptanceRate >= 95 ? '#52c41a' : 
                       summary.acceptanceRate >= 90 ? '#fa8c16' : '#ff4d4f' 
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions title="Financial Summary" column={2}>
          <Descriptions.Item label="Original Invoice">
            <Tag color="blue">
              KES {summary.originalInvoiceAmount.toLocaleString()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Actual Payable">
            <Tag color={summary.difference === 0 ? 'green' : 'orange'}>
              KES {summary.actualPayableAmount.toLocaleString()}
            </Tag>
          </Descriptions.Item>
          {summary.difference !== 0 && (
            <>
              <Descriptions.Item label="Difference">
                <Tag color={summary.difference > 0 ? 'red' : 'green'}>
                  KES {Math.abs(summary.difference).toLocaleString()} 
                  {summary.difference > 0 ? ' less' : ' more'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Reason">
                <Tag color="orange">Damaged items deducted</Tag>
              </Descriptions.Item>
            </>
          )}
        </Descriptions>
      </Card>

      {summary.difference > 0 && (
        <Alert
          message="Invoice Adjustment Required"
          description={`The payable amount (KES ${summary.actualPayableAmount.toLocaleString()}) is less than the original invoice (KES ${summary.originalInvoiceAmount.toLocaleString()}). Contact the supplier for a credit note.`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>Items Summary:</strong>
        </div>
        <Table
          dataSource={summary.itemReceipts}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            {
              title: 'Product',
              dataIndex: ['product', 'name'],
              key: 'product'
            },
            {
              title: 'Received',
              dataIndex: 'receivedQty',
              key: 'receivedQty'
            },
            {
              title: 'Accepted',
              dataIndex: 'acceptedQty',
              key: 'acceptedQty',
              render: (text, record) => (
                <Tag color={record.damagedQty > 0 ? 'orange' : 'green'}>
                  {text}
                </Tag>
              )
            },
            {
              title: 'Damaged',
              dataIndex: 'damagedQty',
              key: 'damagedQty',
              render: (text) => text > 0 ? <Tag color="red">{text}</Tag> : '0'
            },
            {
              title: 'Unit Cost',
              dataIndex: 'unitCost',
              key: 'unitCost',
              render: (text) => `KES ${text?.toLocaleString()}`
            },
            {
              title: 'Value',
              key: 'value',
              render: (_, record) => 
                `KES ${(record.acceptedQty * record.unitCost)?.toLocaleString()}`
            }
          ]}
        />
      </Card>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="approvalNotes"
          label="Approval Notes"
          rules={[{ required: true, message: 'Please provide approval notes' }]}
          extra="Explain the reason for approval and any notes about damages or discrepancies"
        >
          <TextArea
            rows={4}
            placeholder="Enter approval notes..."
          />
        </Form.Item>

        <Alert
          message="Supplier Liability"
          description={`Approving will create a supplier liability of KES ${summary.actualPayableAmount.toLocaleString()} for ${receiving.supplierName}.`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Divider />

        <Form.Item style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<CheckCircleOutlined />}
            >
              Approve Receiving
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ApproveReceivingModal;