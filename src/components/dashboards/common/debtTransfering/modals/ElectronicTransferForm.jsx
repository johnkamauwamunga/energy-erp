// src/components/dashboards/common/debtTransfer/forms/ElectronicTransferForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  message,
  Space,
  Card,
  Alert,
  Row,
  Col,
  Descriptions,
  Tag
} from 'antd';
import {
  SwapOutlined,
  DollarOutlined,
  CreditCardOutlined,
  MobileOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { debtorService } from '../../../../../services/debtorService/debtorService';
import {useApp} from '../../../../../context/AppContext'

const { Option } = Select;
const { TextArea } = Input;

// ✅ ELECTRONIC PAYMENT METHODS ONLY (matches backend enum exactly)
const ELECTRONIC_PAYMENT_METHODS = [
  {
    id: 'MOBILE_MONEY',
    name: 'Mobile Money',
    description: 'M-Pesa, Airtel Money, T-Kash, etc.',
    icon: <MobileOutlined />,
    category: 'ELECTRONIC'
  },
  {
    id: 'VISA',
    name: 'Visa Card',
    description: 'Visa credit/debit cards',
    icon: <CreditCardOutlined />,
    category: 'CARD'
  },
  {
    id: 'MASTERCARD',
    name: 'MasterCard',
    description: 'MasterCard credit/debit cards', 
    icon: <CreditCardOutlined />,
    category: 'CARD'
  },
  {
    id: 'OTHER',
    name: 'Other Electronic',
    description: 'Other electronic payment methods',
    icon: <CreditCardOutlined />,
    category: 'ELECTRONIC'
  },
  {
    id: 'MIXED_ELECTRONIC',
    name: 'Mixed Electronic',
    description: 'Combination of electronic payment methods',
    icon: <CreditCardOutlined />,
    category: 'ELECTRONIC'
  }
];

const ElectronicTransferForm = ({ onSuccess, currentShift }) => {
  const [form] = Form.useForm();
  const {state}=useApp();
  const [loading, setLoading] = useState(false);
  const [debtors, setDebtors] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [stationDebt, setStationDebt] = useState(0);

  const currentStation= state.currentStation?.id;
  const stationName=state.currentStation?.name;


  useEffect(() => {
    loadDebtors();
  }, [currentStation]);

  const loadDebtors = async () => {
    try {
      const debtorsData = await debtorService.getDebtors();
      
      // Filter debtors who have debt at current station
      const filteredDebtors = (debtorsData?.data || debtorsData || []).filter(debtor => {
        if (!currentStation) return true;
        
        const stationAccount = debtor.stationDebtorAccount?.find(
          account => account.stationId === currentStation
        );
        return stationAccount && stationAccount.currentDebt > 0;
      });
      
      setDebtors(filteredDebtors);
    } catch (error) {
      console.error('Failed to load debtors:', error);
      message.error('Failed to load debtors data');
    }
  };

  const handleDebtorChange = (debtorId) => {
    const debtor = debtors.find(d => d.id === debtorId);
    setSelectedDebtor(debtor);
    
    if (debtor && currentStation) {
      const stationAccount = debtor.stationDebtorAccount?.find(
        account => account.stationId === currentStation.id
      );
      setStationDebt(stationAccount?.currentDebt || 0);
    } else {
      setStationDebt(debtor?.currentDebt || 0);
    }
  };

  const handleMethodChange = (methodId) => {
    const method = ELECTRONIC_PAYMENT_METHODS.find(m => m.id === methodId);
    setSelectedMethod(method);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const transferData = {
        debtorId: values.debtorId,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        paymentReference: values.paymentReference,
        description: values.description,
        phoneNumber: values.phoneNumber,
        paymentType: 'ELECTRONIC',
        shiftId: currentShift?.id,
        stationId: currentStation?.id
      };

      console.log('Submitting electronic transfer:', transferData);
      
      const result = await debtTransferService.processElectronicTransfer(transferData);
      
      message.success(
        `Electronic transfer processed successfully! Transfer #: ${result.transferNumber || result.data?.transferNumber}`
      );
      
      form.resetFields();
      setSelectedDebtor(null);
      setSelectedMethod(null);
      setStationDebt(0);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Electronic transfer error:', error);
      message.error(`Failed to process electronic transfer: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const validateAmount = (_, value) => {
    if (!value) {
      return Promise.reject('Please enter amount');
    }
    if (value <= 0) {
      return Promise.reject('Amount must be greater than 0');
    }
    if (value > stationDebt) {
      return Promise.reject(`Amount cannot exceed current debt of KES ${stationDebt.toLocaleString()}`);
    }
    return Promise.resolve();
  };

  // Format debtor display
  const renderDebtorOption = (debtor) => {
    const stationAccount = currentStation 
      ? debtor.stationDebtorAccount?.find(acc => acc.stationId === currentStation.id)
      : null;
    
    const displayDebt = stationAccount?.currentDebt || debtor.currentDebt || 0;
    
    return (
      <Option key={debtor.id} value={debtor.id}>
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <div>
            <strong>{debtor.name}</strong>
            {debtor.code && <Tag size="small" style={{ marginLeft: 8 }}>{debtor.code}</Tag>}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            KES {displayDebt.toLocaleString()} • {debtor.category?.name || 'No Category'}
          </div>
        </Space>
      </Option>
    );
  };

  // Format payment method display
  const renderPaymentMethodOption = (method) => {
    return (
      <Option key={method.id} value={method.id}>
        <Space>
          {method.icon}
          <span>
            <strong>{method.name}</strong>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {method.description}
            </div>
          </span>
        </Space>
      </Option>
    );
  };

  return (
    <div className="space-y-4">
      <Alert
        message="Electronic Transfer"
        description="Process electronic payments from debtors (Mobile Money, Cards, etc.)"
        type="info"
        showIcon
      />

      {/* Shift & Station Context */}
      <Card size="small">
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="Current Shift">
            {currentShift?.shiftNumber || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Station">
            {stationName || 'All Stations'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Form 
        form={form} 
        layout="vertical" 
        onFinish={handleSubmit}
        initialValues={{
          description: 'Electronic payment settlement'
        }}
      >
        {/* Payer Debtor Selection */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="debtorId"
              label="Select Payer Debtor"
              rules={[{ required: true, message: 'Please select a debtor' }]}
            >
              <Select
                placeholder="Choose debtor making payment"
                onChange={handleDebtorChange}
                showSearch
                filterOption={(input, option) =>
                  option.children[0].props.children[0].props.children
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                loading={!debtors.length}
                notFoundContent="No debtors with outstanding debt found"
              >
                {debtors.map(renderDebtorOption)}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {selectedDebtor && (
          <Card size="small" type="inner">
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="Payer" span={2}>
                <strong>{selectedDebtor.name}</strong>
                {selectedDebtor.code && (
                  <Tag style={{ marginLeft: 8 }}>{selectedDebtor.code}</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Current Debt">
                <span style={{ 
                  color: stationDebt > 0 ? '#ff4d4f' : '#52c41a',
                  fontWeight: 'bold'
                }}>
                  KES {stationDebt.toLocaleString()}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                {selectedDebtor.category?.name || 'No Category'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* Payment Method Selection */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="paymentMethod"
              label="Payment Method"
              rules={[{ required: true, message: 'Please select payment method' }]}
            >
              <Select
                placeholder="Select electronic payment method"
                onChange={handleMethodChange}
                showSearch
                filterOption={(input, option) =>
                  option.children[0].props.children[1].props.children[0].props.children
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {ELECTRONIC_PAYMENT_METHODS.map(renderPaymentMethodOption)}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {selectedMethod && (
          <Card size="small" type="inner">
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Payment Method">
                <Space>
                  {selectedMethod.icon}
                  <strong>{selectedMethod.name}</strong>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedMethod.description}
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                <Tag color="blue">{selectedMethod.category}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* Amount */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="amount"
              label="Transfer Amount (KES)"
              rules={[
                { required: true, message: 'Please enter amount' },
                { validator: validateAmount }
              ]}
            >
              <InputNumber
                placeholder="Enter amount in KES"
                style={{ width: '100%' }}
                prefix={<DollarOutlined />}
                min={1}
                max={stationDebt}
                disabled={!selectedDebtor || stationDebt === 0}
                formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/KES\s?|(,*)/g, '')}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Payment Reference */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="paymentReference"
              label="Payment Reference"
              rules={[{ required: true, message: 'Please enter payment reference' }]}
            >
              <Input 
                placeholder={
                  selectedMethod?.id === 'MOBILE_MONEY' 
                    ? 'M-Pesa transaction code (e.g., RLX8G5H2)' 
                    : selectedMethod?.id === 'VISA' || selectedMethod?.id === 'MASTERCARD'
                    ? 'Card transaction ID or authorization code'
                    : 'Transaction reference number'
                }
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Phone Number (for mobile money) */}
        {selectedMethod?.id === 'MOBILE_MONEY' && (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item
                name="phoneNumber"
                label="Phone Number"
                rules={[
                  { required: true, message: 'Phone number is required for mobile money' },
                  { 
                    pattern: /^(254|0)(1|7)\d{8}$/, 
                    message: 'Enter valid Kenyan phone number (2547... or 07...)' 
                  }
                ]}
              >
                <Input 
                  placeholder="254712345678 or 0712345678" 
                  prefix={<MobileOutlined />}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* Description */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="description"
              label="Description / Notes"
            >
              <TextArea
                placeholder="Additional notes about this electronic transfer"
                rows={3}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SwapOutlined />}
            size="large"
            block
           disabled={!selectedDebtor || !currentStation }
            style={{ height: '50px', fontSize: '16px' }}
          >
            {loading ? 'Processing Electronic Transfer...' : 'Process Electronic Transfer'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ElectronicTransferForm;