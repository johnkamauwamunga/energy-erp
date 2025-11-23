// src/components/dashboards/common/debtTransfer/components/modals/CashSettlementForm.jsx
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
  DollarOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { bankingService } from '../../../../../services/bankingService/bankingService';
import { useApp } from '../../../../../context/AppContext';
import DebtBreakdownPanel from '../common/DebtBreakdownPanel';

const { Option } = Select;
const { TextArea } = Input;

const CashSettlementForm = ({ visible, onClose, onSuccess, debtor }) => {
  const { state } = useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [debtBreakdown, setDebtBreakdown] = useState(null);
  const [allocationMethod, setAllocationMethod] = useState('OLDEST_FIRST');

  // Load station wallet and debt breakdown
  const loadData = async () => {
    setLoading(true);
    try {
      const [wallet, breakdown] = await Promise.all([
        bankingService.getStationWallet(state.currentStation?.id),
        debtor ? debtTransferService.getDebtorDebtBreakdown(debtor.id, state.companyId) : null
      ]);
      
      setWalletData(wallet);
      setDebtBreakdown(breakdown);
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
      
      // Set default amount to total debt
      if (debtBreakdown?.totalDebt) {
        form.setFieldsValue({
          amount: debtBreakdown.totalDebt
        });
      }
    }
  }, [visible, debtor]);

  // Handle form submission
  const handleSubmit = async (values) => {
    if (!debtor) {
      message.error('No debtor selected');
      return;
    }

    setSubmitting(true);
    try {
      const settlementData = {
        debtorId: debtor.id,
        amount: values.amount,
        description: values.description || `Cash settlement for ${debtor.name}`,
        paymentReference: values.paymentReference,
        stationId: state.currentStation?.id,
        attendantId: state.currentUser?.id,
        shiftId: state.currentShift?.id,
        islandId: values.islandId
      };

      const result = await debtTransferService.processCashSettlement(settlementData);
      
      message.success('Cash settlement processed successfully!');
      onSuccess();
      onClose();
      
    } catch (error) {
      message.error(error.message || 'Failed to process cash settlement');
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  // Validate amount
  const validateAmount = (_, value) => {
    if (!value || value <= 0) {
      return Promise.reject(new Error('Amount must be positive'));
    }
    
    const maxAmount = Math.min(
      walletData?.currentBalance || 0,
      debtBreakdown?.totalDebt || 0
    );
    
    if (value > maxAmount) {
      return Promise.reject(new Error(`Amount exceeds available limit of ${formatCurrency(maxAmount)}`));
    }
    
    return Promise.resolve();
  };

  if (!debtor) {
    return (
      <Modal
        title="Cash Settlement"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
      >
        <Alert
          message="No Debtor Selected"
          description="Please select a debtor before processing cash settlement."
          type="warning"
          showIcon
        />
      </Modal>
    );
  }

  const maxAmount = Math.min(
    walletData?.currentBalance || 0,
    debtBreakdown?.totalDebt || 0
  );

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined />
          Cash Debt Settlement
          <Tag color="green">{debtor.name}</Tag>
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
          {/* Wallet Balance Info */}
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Station Wallet Balance">
                    <Statistic
                      value={walletData?.currentBalance || 0}
                      prefix={<WalletOutlined />}
                      valueStyle={{ 
                        color: (walletData?.currentBalance || 0) > 0 ? '#52c41a' : '#ff4d4f'
                      }}
                      formatter={value => formatCurrency(value)}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Available for Settlement">
                    <Statistic
                      value={maxAmount}
                      valueStyle={{ color: '#1890ff' }}
                      formatter={value => formatCurrency(value)}
                    />
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Debtor Total Debt">
                    <Statistic
                      value={debtBreakdown?.totalDebt || 0}
                      valueStyle={{ color: '#ff4d4f' }}
                      formatter={value => formatCurrency(value)}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Stations with Debt">
                    <Statistic
                      value={debtBreakdown?.stationDebts?.length || 0}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>

          {/* Low Balance Warning */}
          {walletData && walletData.currentBalance <= 0 && (
            <Alert
              message="Insufficient Wallet Balance"
              description="Station wallet has insufficient funds to process cash settlements."
              type="warning"
              showIcon
            />
          )}

          <Row gutter={16}>
            <Col span={12}>
              {/* Settlement Form */}
              <Card title="Settlement Details" size="small">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  initialValues={{
                    amount: debtBreakdown?.totalDebt || 0,
                    allocationMethod: 'OLDEST_FIRST'
                  }}
                >
                  <Form.Item
                    name="amount"
                    label="Settlement Amount"
                    rules={[
                      { required: true, message: 'Please enter settlement amount' },
                      { validator: validateAmount }
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      max={maxAmount}
                      placeholder="Enter amount to settle"
                      size="large"
                      formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/KES\s?|(,*)/g, '')}
                    />
                  </Form.Item>

                  <Form.Item
                    name="allocationMethod"
                    label="Allocation Method"
                  >
                    <Select onChange={setAllocationMethod}>
                      <Option value="OLDEST_FIRST">Pay Oldest Debts First</Option>
                      <Option value="HIGHEST_FIRST">Pay Highest Debts First</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="paymentReference"
                    label="Payment Reference (Optional)"
                    help="e.g., Receipt number, transaction ID"
                  >
                    <Input placeholder="Enter payment reference" />
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
                      <Descriptions.Item label="Current Station">
                        {state.currentStation?.name}
                      </Descriptions.Item>
                      <Descriptions.Item label="Attendant">
                        <UserOutlined /> {state.currentUser?.firstName} {state.currentUser?.lastName}
                      </Descriptions.Item>
                      <Descriptions.Item label="Allocation Method">
                        <Tag color="blue">{allocationMethod.replace('_', ' ')}</Tag>
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
                        disabled={!walletData || walletData.currentBalance <= 0}
                        size="large"
                      >
                        Process Cash Settlement
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
            </Col>
          </Row>

          {/* Processing Info */}
          <Alert
            message="Cash Settlement Process"
            description="Cash received will be added to the station wallet, and the payment will be automatically allocated across the debtor's station debts based on the selected method."
            type="info"
            showIcon
          />
        </div>
      </Spin>
    </Modal>
  );
};

export default CashSettlementForm;