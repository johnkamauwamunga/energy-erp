// src/components/dashboards/common/debtTransfer/components/modals/BankSettlementForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Input,
  Button,
  Space,
  Alert,
  Card,
  Statistic,
  Descriptions,
  message,
  Spin,
  Row,
  Col,
  Select
} from 'antd';
import {
  BankOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { bankingService } from '../../../../../services/bankingService/bankingService';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { useApp } from '../../../../../context/AppContext';

import DebtBreakdownPanel from '../common/DebtBreakdownPanel';

const { Option } = Select;
const { TextArea } = Input;

const BankSettlementForm = ({ visible, onClose, onSuccess, debtor }) => {
  const { state } = useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debtBreakdown, setDebtBreakdown] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Load debt breakdown and bank accounts
  const loadData = async () => {
    setLoading(true);
    try {
      const [breakdown, accounts] = await Promise.all([
        debtor ? debtTransferService.getDebtorDebtBreakdown(debtor.id, state.companyId) : null,
        bankingService.getBankAccounts(state.companyId)
      ]);
      
      setDebtBreakdown(breakdown);
      setBankAccounts(accounts.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && debtor) {
      loadData();
      form.resetFields();
      setSelectedAccount(null);
    }
  }, [visible, debtor]);

  // Handle form submission
  const handleSubmit = async (values) => {
    if (!debtor || !selectedAccount) {
      message.error('Please select both debtor and bank account');
      return;
    }

    setSubmitting(true);
    try {
      const settlementData = {
        debtorId: debtor.id,
        amount: values.amount,
        description: values.description || `Bank settlement for ${debtor.name}`,
        paymentReference: values.paymentReference,
        stationId: state.currentStation?.id,
        bankAccountId: selectedAccount,
        shiftId: state.currentShift?.id
      };

      const result = await debtTransferService.processBankSettlement(settlementData);
      
      message.success('Bank settlement processed successfully!');
      onSuccess();
      onClose();
      
    } catch (error) {
      message.error(error.message || 'Failed to process bank settlement');
    } finally {
      setSubmitting(false);
    }
  };

  // Validate amount
  const validateAmount = (_, value) => {
    if (!value || value <= 0) {
      return Promise.reject(new Error('Amount must be positive'));
    }
    
    // Check if debtor has sufficient debt at this station
    const stationDebt = debtBreakdown?.stationDebts?.find(
      debt => debt.stationId === state.currentStation?.id
    );
    
    if (!stationDebt) {
      return Promise.reject(new Error('Debtor has no debt at this station'));
    }
    
    if (value > stationDebt.currentDebt) {
      return Promise.reject(new Error(`Insufficient debt. Available: KES ${stationDebt.currentDebt.toLocaleString()}`));
    }
    
    return Promise.resolve();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  if (!debtor) {
    return (
      <Modal
        title="Bank Settlement"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
      >
        <Alert
          message="No Debtor Selected"
          description="Please select a debtor before processing bank settlement."
          type="warning"
          showIcon
        />
      </Modal>
    );
  }

  const stationDebt = debtBreakdown?.stationDebts?.find(
    debt => debt.stationId === state.currentStation?.id
  );

  return (
    <Modal
      title={
        <Space>
          <BankOutlined />
          Bank Deposit Debt Settlement
          <Tag color="purple">{debtor.name}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      style={{ top: 20 }}
    >
      <Spin spinning={loading}>
        <div className="space-y-4">
          <Alert
            message="Bank Settlement Process"
            description="Record a bank deposit made by the debtor. The debt will be settled at this station and the bank account balance will be updated."
            type="info"
            showIcon
          />

          <Row gutter={16}>
            <Col span={12}>
              {/* Settlement Form */}
              <Card title="Settlement Details" size="small">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                >
                  <Form.Item
                    name="bankAccountId"
                    label="Bank Account"
                    rules={[{ required: true, message: 'Please select bank account' }]}
                  >
                    <Select
                      placeholder="Select bank account for deposit"
                      onChange={setSelectedAccount}
                      size="large"
                    >
                      {bankAccounts.map(account => (
                        <Option key={account.id} value={account.id}>
                          <Space direction="vertical" size={0} style={{ width: '100%' }}>
                            <div>
                              <strong>{account.bankName}</strong>
                              {account.isPrimary && (
                                <Tag color="green" style={{ marginLeft: 8 }}>Primary</Tag>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              {account.accountNumber} • {account.accountName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#999' }}>
                              Balance: {formatCurrency(account.currentBalance)}
                            </div>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="amount"
                    label="Deposit Amount"
                    rules={[
                      { required: true, message: 'Please enter deposit amount' },
                      { validator: validateAmount }
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      max={stationDebt?.currentDebt || 0}
                      placeholder="Enter deposit amount"
                      size="large"
                      formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/KES\s?|(,*)/g, '')}
                    />
                  </Form.Item>

                  <Form.Item
                    name="paymentReference"
                    label="Bank Reference (Required)"
                    rules={[{ required: true, message: 'Please enter bank reference number' }]}
                    help="e.g., Deposit slip number, transaction ID"
                  >
                    <Input placeholder="Enter bank reference number" />
                  </Form.Item>

                  <Form.Item
                    name="description"
                    label="Description (Optional)"
                  >
                    <TextArea
                      placeholder="Enter settlement description"
                      rows={3}
                      maxLength={500}
                      showCount
                    />
                  </Form.Item>

                  {/* Context Information */}
                  <Card size="small" title="Settlement Context" style={{ marginBottom: 16 }}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Debtor">
                        <UserOutlined /> {debtor.name}
                      </Descriptions.Item>
                      <Descriptions.Item label="Current Station">
                        {state.currentStation?.name}
                      </Descriptions.Item>
                      <Descriptions.Item label="Available Debt at Station">
                        <Statistic
                          value={stationDebt?.currentDebt || 0}
                          prefix="KES"
                          valueStyle={{ 
                            color: (stationDebt?.currentDebt || 0) > 0 ? '#ff4d4f' : '#52c41a',
                            fontSize: '14px'
                          }}
                          formatter={value => value.toLocaleString()}
                        />
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<CheckCircleOutlined />}
                        loading={submitting}
                        disabled={!selectedAccount}
                        size="large"
                      >
                        Process Bank Settlement
                      </Button>
                      <Button
                        icon={<CloseCircleOutlined />}
                        onClick={onClose}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            <Col span={12}>
              {/* Debt Breakdown */}
              <DebtBreakdownPanel 
                debtorId={debtor.id}
                companyId={state.companyId}
              />

              {/* Selected Bank Account Info */}
              {selectedAccount && (
                <Card size="small" title="Selected Bank Account" style={{ marginTop: 16 }}>
                  {(() => {
                    const account = bankAccounts.find(acc => acc.id === selectedAccount);
                    return account ? (
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Bank">
                          <BankOutlined /> {account.bankName}
                        </Descriptions.Item>
                        <Descriptions.Item label="Account Number">
                          {account.accountNumber}
                        </Descriptions.Item>
                        <Descriptions.Item label="Account Name">
                          {account.accountName}
                        </Descriptions.Item>
                        <Descriptions.Item label="Current Balance">
                          <Statistic
                            value={account.currentBalance}
                            prefix="KES"
                            valueStyle={{ color: '#52c41a', fontSize: '14px' }}
                            formatter={value => value.toLocaleString()}
                          />
                        </Descriptions.Item>
                        <Descriptions.Item label="Branch">
                          {account.branch || 'Main Branch'}
                        </Descriptions.Item>
                      </Descriptions>
                    ) : null;
                  })()}
                </Card>
              )}

              {/* Authorization Notice */}
              <Alert
                message="Authorization Required"
                description="Bank settlements require managerial approval and are subject to bank reconciliation."
                type="warning"
                showIcon
                icon={<SafetyCertificateOutlined />}
                style={{ marginTop: 16 }}
              />
            </Col>
          </Row>
        </div>
      </Spin>
    </Modal>
  );
};

export default BankSettlementForm;