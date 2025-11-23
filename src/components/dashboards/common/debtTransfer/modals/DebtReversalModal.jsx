// src/components/dashboards/common/debtTransfer/components/modals/DebtReversalModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Table,
  Space,
  Alert,
  message,
  Card,
  Descriptions,
  Tag,
  Row,
  Col
} from 'antd';
import {
  UndoOutlined,
  SearchOutlined,
  CloseOutlined,
  CheckOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { useApp } from '../../../../../context/AppContext';

const { Option } = Select;
const { TextArea } = Input;

const DebtReversalModal = ({ visible, onClose, onSuccess }) => {
  const { state } = useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Search for reversible transactions
  const searchReversibleTransactions = async () => {
    setSearching(true);
    try {
      // This would call your backend to get credit transactions that can be reversed
      const response = await debtTransferService.getReversibleTransactions({
        stationId: state.currentStation?.id,
        companyId: state.companyId
      });
      
      setTransactions(response.data || []);
    } catch (error) {
      message.error('Failed to load transactions: ' + error.message);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (visible) {
      searchReversibleTransactions();
      form.resetFields();
      setSelectedTransaction(null);
    }
  }, [visible]);

  const handleTransactionSelect = (transaction) => {
    setSelectedTransaction(transaction);
    form.setFieldsValue({
      reversalReason: '',
      description: `Reversal of transaction: ${transaction.description}`
    });
  };

  const handleSubmit = async (values) => {
    if (!selectedTransaction) {
      message.error('Please select a transaction to reverse');
      return;
    }

    setLoading(true);
    try {
      const reversalData = {
        debtorTransactionId: selectedTransaction.id,
        reversalReason: values.reversalReason,
        description: values.description
      };

      const result = await debtTransferService.reverseSettlement(reversalData);
      
      message.success('Transaction reversed successfully!');
      onSuccess();
      onClose();
      
    } catch (error) {
      message.error(error.message || 'Failed to reverse transaction');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type) => (
        <Tag color={type === 'CREDIT' ? 'green' : 'red'}>
          {type}
        </Tag>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount) => (
        <strong style={{ color: '#1890ff' }}>
          KES {Math.abs(amount).toLocaleString()}
        </strong>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Debtor',
      dataIndex: 'stationDebtorAccount',
      key: 'debtor',
      width: 120,
      render: (account) => account?.debtor?.name || 'N/A'
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          size="small"
          type={selectedTransaction?.id === record.id ? 'primary' : 'default'}
          onClick={() => handleTransactionSelect(record)}
        >
          Select
        </Button>
      )
    }
  ];

  // Mock data for demonstration
  const mockTransactions = [
    {
      id: '1',
      transactionDate: new Date().toISOString(),
      type: 'CREDIT',
      amount: -5000,
      description: 'Cash settlement - Receipt #123',
      stationDebtorAccount: {
        debtor: { name: 'John Doe' }
      }
    },
    {
      id: '2',
      transactionDate: new Date().toISOString(),
      type: 'CREDIT',
      amount: -10000,
      description: 'Bank payment - Ref #456',
      stationDebtorAccount: {
        debtor: { name: 'Jane Smith' }
      }
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <UndoOutlined />
          Reverse Debt Settlement
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      style={{ top: 20 }}
    >
      <div className="space-y-4">
        <Alert
          message="Reversal Guidelines"
          description="Only credit (settlement) transactions can be reversed. This action will restore the original debt balance and create an audit trail."
          type="info"
          showIcon
        />

        <Row gutter={16}>
          <Col span={12}>
            <Card 
              title="Select Transaction to Reverse" 
              size="small"
              extra={
                <Button
                  icon={<SearchOutlined />}
                  onClick={searchReversibleTransactions}
                  loading={searching}
                  size="small"
                >
                  Refresh
                </Button>
              }
            >
              <Table
                columns={columns}
                dataSource={mockTransactions}
                loading={searching}
                pagination={{ pageSize: 5 }}
                size="small"
                rowKey="id"
                onRow={(record) => ({
                  onClick: () => handleTransactionSelect(record),
                  style: {
                    cursor: 'pointer',
                    backgroundColor: selectedTransaction?.id === record.id ? '#e6f7ff' : 'white'
                  }
                })}
              />
            </Card>
          </Col>

          <Col span={12}>
            <Card 
              title="Reversal Details" 
              size="small"
              style={{ height: '100%' }}
            >
              {selectedTransaction ? (
                <>
                  <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="Selected Transaction">
                      <strong>{selectedTransaction.description}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Amount">
                      <Tag color="green">
                        KES {Math.abs(selectedTransaction.amount).toLocaleString()}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Date">
                      {new Date(selectedTransaction.transactionDate).toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Debtor">
                      {selectedTransaction.stationDebtorAccount?.debtor?.name}
                    </Descriptions.Item>
                  </Descriptions>

                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                  >
                    <Form.Item
                      name="reversalReason"
                      label="Reversal Reason"
                      rules={[
                        { required: true, message: 'Please provide a reason for reversal' },
                        { min: 10, message: 'Reason must be at least 10 characters' }
                      ]}
                    >
                      <TextArea
                        placeholder="Explain why this transaction is being reversed..."
                        rows={3}
                        maxLength={500}
                        showCount
                      />
                    </Form.Item>

                    <Form.Item
                      name="description"
                      label="Description (Optional)"
                    >
                      <TextArea
                        placeholder="Additional notes about this reversal..."
                        rows={2}
                        maxLength={500}
                        showCount
                      />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                      <Space>
                        <Button
                          type="primary"
                          danger
                          icon={<UndoOutlined />}
                          htmlType="submit"
                          loading={loading}
                        >
                          Confirm Reversal
                        </Button>
                        <Button
                          icon={<CloseOutlined />}
                          onClick={onClose}
                        >
                          Cancel
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 0',
                  color: '#999'
                }}>
                  <InfoCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                  <div>Please select a transaction to reverse</div>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Alert
          message="Important Notice"
          description="Reversing a settlement will restore the original debt balance and cannot be undone. This action is logged for audit purposes."
          type="warning"
          showIcon
        />
      </div>
    </Modal>
  );
};

export default DebtReversalModal;