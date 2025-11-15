// components/BankManagement/CreateBankAccountModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Space,
  Alert,
  Row,
  Col,
  Switch,
  InputNumber,
  Tag,
  Tooltip
} from 'antd';
import { 
  CreditCardOutlined,
  UserOutlined,
  BankOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeInvisibleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { bankService } from '../../../../../services/bankService/bankService';

const { Option } = Select;

const CreateBankAccountModal = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  useEffect(() => {
    if (visible) {
      loadBanks();
      form.resetFields();
      setError('');
      setSelectedBank(null);
    }
  }, [visible, form]);

  const loadBanks = async () => {
    try {
      const activeBanks = await bankService.getActiveBanks();
      setBanks(activeBanks);
    } catch (error) {
      console.error('Failed to load banks:', error);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      const accountData = {
        bankId: values.bankId,
        accountNumber: values.accountNumber,
        accountName: values.accountName.trim(),
        branch: values.branch?.trim() || null,
        currency: values.currency,
        openingBalance: values.openingBalance || 0,
        isPrimary: values.isPrimary || false
      };

      // Validate data
      const validationErrors = bankService.validateBankAccount(accountData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      await bankService.createBankAccount(accountData);
      onSuccess();
      form.resetFields();
      setSelectedBank(null);
    } catch (err) {
      setError(err.message || 'Failed to create bank account');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setError('');
    setSelectedBank(null);
    onClose();
  };

  const handleBankChange = (bankId) => {
    const bank = banks.find(b => b.id === bankId);
    setSelectedBank(bank);
  };

  // Currency options
  const currencies = [
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' }
  ];

  return (
    <Modal
      title={
        <Space>
          <CreditCardOutlined />
          Create Bank Account
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError('')}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          currency: 'KES',
          openingBalance: 0,
          isPrimary: false
        }}
      >
        {/* Bank Selection */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="bankId"
              label="Bank"
              rules={[
                { required: true, message: 'Please select a bank' }
              ]}
            >
              <Select 
                placeholder="Select bank" 
                size="large"
                onChange={handleBankChange}
                showSearch
                optionFilterProp="children"
                loading={banks.length === 0}
              >
                {banks.map(bank => (
                  <Option key={bank.id} value={bank.id}>
                    <Space>
                      <BankOutlined />
                      {bank.name}
                      {bank.code && (
                        <Tag color="blue" size="small">
                          {bank.code}
                        </Tag>
                      )}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="currency"
              label="Currency"
              rules={[
                { required: true, message: 'Please select currency' }
              ]}
            >
              <Select 
                placeholder="Select currency" 
                size="large"
              >
                {currencies.map(currency => (
                  <Option key={currency.code} value={currency.code}>
                    <Space>
                      {currency.symbol}
                      {currency.name}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Account Details */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="accountNumber"
              label="Account Number"
              rules={[
                { required: true, message: 'Please enter account number' },
                { min: 5, message: 'Account number must be at least 5 characters' },
                {
                  pattern: /^[0-9-]+$/,
                  message: 'Account number can only contain numbers and hyphens'
                }
              ]}
            >
              <Input 
                placeholder="1234567890" 
                prefix={<CreditCardOutlined />}
                size="large"
                type={showAccountNumber ? 'text' : 'password'}
                addonAfter={
                  <Tooltip title={showAccountNumber ? 'Hide' : 'Show'}>
                    <Button
                      type="text"
                      icon={showAccountNumber ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                    />
                  </Tooltip>
                }
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="branch"
              label="Branch"
            >
              <Input 
                placeholder="Branch location" 
                prefix={<EnvironmentOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="accountName"
          label="Account Name"
          rules={[
            { required: true, message: 'Please enter account name' },
            { min: 2, message: 'Account name must be at least 2 characters' }
          ]}
        >
          <Input 
            placeholder="Company Name Ltd - Main Account" 
            prefix={<UserOutlined />}
            size="large"
          />
        </Form.Item>

        {/* Financial Details */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="openingBalance"
              label="Opening Balance"
            >
              <InputNumber
                placeholder="0.00"
                prefix={<DollarOutlined />}
                style={{ width: '100%' }}
                size="large"
                min={-1000000}
                max={100000000}
                step={1000}
                formatter={value => `KSh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/KSh\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="isPrimary"
              label="Primary Account"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren={<CheckOutlined />} 
                unCheckedChildren={<CloseOutlined />}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button 
              onClick={handleCancel}
              size="large"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<CreditCardOutlined />}
              size="large"
            >
              Create Account
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateBankAccountModal;