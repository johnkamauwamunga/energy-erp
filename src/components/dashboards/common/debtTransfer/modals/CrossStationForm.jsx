// src/components/dashboards/common/debtTransfer/components/modals/CrossStationForm.jsx
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
  Select,
  Table,
  Tag
} from 'antd';
import {
  SyncOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShopOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { bankingService } from '../../../../../services/bankingService/bankingService';
import { useApp } from '../../../../../context/AppContext';
import DebtBreakdownPanel from '../common/DebtBreakdownPanel';

const { Option } = Select;
const { TextArea } = Input;

const CrossStationForm = ({ visible, onClose, onSuccess, debtor }) => {
  const { state } = useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debtBreakdown, setDebtBreakdown] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [stations, setStations] = useState([]);
  const [allocationMethod, setAllocationMethod] = useState('OLDEST_FIRST');
  const [manualAllocations, setManualAllocations] = useState([]);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [breakdown, wallet, stationsData] = await Promise.all([
        debtor ? debtTransferService.getDebtorDebtBreakdown(debtor.id, state.companyId) : null,
        bankingService.getStationWallet(state.currentStation?.id),
        // This would be a service to get company stations
        Promise.resolve({ data: [] })
      ]);
      
      setDebtBreakdown(breakdown);
      setWalletData(wallet);
      setStations(stationsData.data || []);
      
      // Initialize manual allocations
      if (breakdown?.stationDebts) {
        setManualAllocations(
          breakdown.stationDebts.map(debt => ({
            stationId: debt.stationId,
            stationName: debt.stationName,
            amount: 0,
            maxAmount: debt.currentDebt
          }))
        );
      }
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
        description: values.description || `Cross-station settlement for ${debtor.name}`,
        paymentReference: values.paymentReference,
        paymentStationId: state.currentStation?.id,
        allocationMethod: allocationMethod,
        shiftId: state.currentShift?.id
      };

      // Add manual allocations if method is MANUAL
      if (allocationMethod === 'MANUAL') {
        settlementData.manualAllocations = manualAllocations
          .filter(allocation => allocation.amount > 0)
          .map(({ stationId, amount }) => ({ stationId, amount }));
      }

      const result = await debtTransferService.processCrossStationSettlement(settlementData);
      
      message.success('Cross-station settlement processed successfully!');
      onSuccess();
      onClose();
      
    } catch (error) {
      message.error(error.message || 'Failed to process cross-station settlement');
    } finally {
      setSubmitting(false);
    }
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
      return Promise.reject(new Error(`Amount exceeds available limit of KES ${maxAmount.toLocaleString()}`));
    }
    
    return Promise.resolve();
  };

  const handleManualAllocationChange = (stationId, amount) => {
    setManualAllocations(prev => 
      prev.map(allocation => 
        allocation.stationId === stationId 
          ? { ...allocation, amount: Math.min(amount, allocation.maxAmount) }
          : allocation
      )
    );
  };

  const calculateTotalAllocated = () => {
    return manualAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  const allocationColumns = [
    {
      title: 'Station',
      dataIndex: 'stationName',
      key: 'stationName',
      width: 150,
      render: (text) => (
        <Space>
          <ShopOutlined />
          {text}
        </Space>
      )
    },
    {
      title: 'Current Debt',
      dataIndex: 'maxAmount',
      key: 'maxAmount',
      width: 120,
      render: (amount) => (
        <span style={{ color: '#ff4d4f' }}>
          KES {amount?.toLocaleString()}
        </span>
      )
    },
    {
      title: 'Allocate Amount',
      key: 'amount',
      width: 150,
      render: (_, record) => (
        <InputNumber
          min={0}
          max={record.maxAmount}
          value={record.amount}
          onChange={(value) => handleManualAllocationChange(record.stationId, value || 0)}
          formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => value.replace(/KES\s?|(,*)/g, '')}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Remaining',
      key: 'remaining',
      width: 120,
      render: (_, record) => (
        <span style={{ color: '#666' }}>
          KES {(record.maxAmount - record.amount).toLocaleString()}
        </span>
      )
    }
  ];

  if (!debtor) {
    return (
      <Modal
        title="Cross-Station Settlement"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
      >
        <Alert
          message="No Debtor Selected"
          description="Please select a debtor before processing cross-station settlement."
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
          <SyncOutlined />
          Cross-Station Debt Settlement
          <Tag color="orange">{debtor.name}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      style={{ top: 20 }}
    >
      <Spin spinning={loading}>
        <div className="space-y-4">
          <Alert
            message="Cross-Station Settlement"
            description="Debtor pays at one station, and the payment is allocated across multiple stations where they have outstanding debt."
            type="info"
            showIcon
          />

          {/* Summary Cards */}
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Payment Station Wallet"
                  value={walletData?.currentBalance || 0}
                  prefix="KES"
                  valueStyle={{ color: '#52c41a' }}
                  formatter={value => value.toLocaleString()}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Outstanding Debt"
                  value={debtBreakdown?.totalDebt || 0}
                  prefix="KES"
                  valueStyle={{ color: '#ff4d4f' }}
                  formatter={value => value.toLocaleString()}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Stations with Debt"
                  value={debtBreakdown?.stationDebts?.length || 0}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Max Payment"
                  value={maxAmount}
                  prefix="KES"
                  valueStyle={{ color: '#faad14' }}
                  formatter={value => value.toLocaleString()}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              {/* Settlement Form */}
              <Card title="Payment Details" size="small">
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
                    label="Payment Amount"
                    rules={[
                      { required: true, message: 'Please enter payment amount' },
                      { validator: validateAmount }
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      max={maxAmount}
                      placeholder="Enter payment amount"
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
                      <Option value="MANUAL">Manual Allocation</Option>
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
                  <Card size="small" title="Payment Context" style={{ marginBottom: 16 }}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Payment Station">
                        <ShopOutlined /> {state.currentStation?.name}
                      </Descriptions.Item>
                      <Descriptions.Item label="Debtor">
                        <UserOutlined /> {debtor.name}
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
                        Process Settlement
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

            <Col span={6}>
              {/* Debt Breakdown */}
              <DebtBreakdownPanel 
                debtorId={debtor.id}
                companyId={state.companyId}
              />
            </Col>

            <Col span={12}>
              {/* Manual Allocation */}
              {allocationMethod === 'MANUAL' && (
                <Card 
                  title="Manual Allocation" 
                  size="small"
                  extra={
                    <Statistic
                      title="Total Allocated"
                      value={calculateTotalAllocated()}
                      prefix="KES"
                      valueStyle={{ 
                        color: calculateTotalAllocated() > 0 ? '#52c41a' : '#666',
                        fontSize: '14px'
                      }}
                      formatter={value => value.toLocaleString()}
                    />
                  }
                >
                  <Table
                    columns={allocationColumns}
                    dataSource={manualAllocations}
                    pagination={false}
                    size="small"
                    rowKey="stationId"
                    summary={() => (
                      <Table.Summary>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0}>
                            <strong>Total</strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1}>
                            <strong>
                              KES {debtBreakdown?.totalDebt?.toLocaleString() || 0}
                            </strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2}>
                            <strong>
                              KES {calculateTotalAllocated().toLocaleString()}
                            </strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3}>
                            <strong>
                              KES {(debtBreakdown?.totalDebt - calculateTotalAllocated()).toLocaleString()}
                            </strong>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )}
                  />
                  
                  {calculateTotalAllocated() > 0 && (
                    <Alert
                      message="Allocation Summary"
                      description={`Payment will be distributed across ${manualAllocations.filter(a => a.amount > 0).length} stations as specified.`}
                      type="info"
                      showIcon
                      style={{ marginTop: 16 }}
                    />
                  )}
                </Card>
              )}

              {/* Auto Allocation Preview */}
              {allocationMethod !== 'MANUAL' && (
                <Card title="Allocation Preview" size="small">
                  <Alert
                    message={`Automatic Allocation: ${allocationMethod.replace('_', ' ')}`}
                    description="The system will automatically allocate the payment across stations based on the selected method."
                    type="info"
                    showIcon
                  />
                  
                  <div style={{ marginTop: 16, textAlign: 'center', color: '#666' }}>
                    <DollarOutlined style={{ fontSize: 48, marginBottom: 8 }} />
                    <div>Payment will be automatically distributed</div>
                    <div style={{ fontSize: '12px' }}>
                      Using {allocationMethod.replace('_', ' ').toLowerCase()} priority
                    </div>
                  </div>
                </Card>
              )}
            </Col>
          </Row>
        </div>
      </Spin>
    </Modal>
  );
};

export default CrossStationForm;