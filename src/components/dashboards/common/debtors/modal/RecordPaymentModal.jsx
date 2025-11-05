// src/components/debtor/RecordPaymentModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Space,
  Alert,
  InputNumber,
  Descriptions
} from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { debtorService } from '../../../../../services/debtorService/debtorService';

const { Option } = Select;
const { TextArea } = Input;

const RecordPaymentModal = ({ visible, onClose, onSuccess, selectedDebtor }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [stationAccounts, setStationAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && selectedDebtor) {
      setStationAccounts(selectedDebtor.stationAccounts || []);
      form.resetFields();
      setError('');
    }
  }, [visible, selectedDebtor, form]);

  const handleAccountChange = (accountId) => {
    const account = stationAccounts.find(acc => acc.id === accountId);
    setSelectedAccount(account);
    
    if (account) {
      form.setFieldsValue({
        amount: account.currentDebt // Pre-fill with full debt amount
      });
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      const paymentData = {
        stationDebtorAccountId: values.stationDebtorAccountId,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        referenceNumber: values.referenceNumber?.trim() || null,
        notes: values.notes?.trim() || null
      };

      await debtorService.recordDebtPayment(paymentData);
      onSuccess();
      form.resetFields();
      setSelectedAccount(null);
    } catch (err) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedAccount(null);
    setError('');
    onClose();
  };

  const paymentMethods = [
    { value: 'CASH', label: 'Cash' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'VISA', label: 'Visa' },
    { value: 'MASTERCARD', label: 'Mastercard' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'OTHER', label: 'Other' }
  ];

  return (
    <Modal
      title={
        <Space>
          <CreditCardOutlined />
          {selectedDebtor ? `Record Payment - ${selectedDebtor.name}` : 'Record Payment'}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {selectedDebtor && (
        <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Debtor">
            {selectedDebtor.name} ({selectedDebtor.phone})
          </Descriptions.Item>
          <Descriptions.Item label="Total Outstanding">
            <span style={{ color: '#cf1322', fontWeight: 'bold' }}>
              {debtorService.formatCurrency(
                selectedDebtor.totalDebt || 
                selectedDebtor.stationAccounts?.reduce((sum, acc) => sum + acc.currentDebt, 0) || 0
              )}
            </span>
          </Descriptions.Item>
        </Descriptions>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          paymentMethod: 'CASH'
        }}
      >
        <Form.Item
          name="stationDebtorAccountId"
          label="Station Account"
          rules={[
            { required: true, message: 'Please select station account' }
          ]}
        >
          <Select 
            placeholder="Select station account"
            onChange={handleAccountChange}
          >
            {stationAccounts.map(account => (
              <Option key={account.id} value={account.id}>
                {account.station?.name || 'Unknown Station'} - {debtorService.formatCurrency(account.currentDebt)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {selectedAccount && (
          <Alert
            message={`Current debt at ${selectedAccount.station?.name}: ${debtorService.formatCurrency(selectedAccount.currentDebt)}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          name="amount"
          label="Payment Amount (KES)"
          rules={[
            { required: true, message: 'Please enter payment amount' },
            { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || !selectedAccount) return Promise.resolve();
                if (value > selectedAccount.currentDebt) {
                  return Promise.reject(new Error(`Amount cannot exceed current debt of ${debtorService.formatCurrency(selectedAccount.currentDebt)}`));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="0.00"
            min={0.01}
            max={selectedAccount?.currentDebt}
            step={0.01}
            precision={2}
          />
        </Form.Item>

        <Form.Item
          name="paymentMethod"
          label="Payment Method"
          rules={[
            { required: true, message: 'Please select payment method' }
          ]}
        >
          <Select placeholder="Select payment method">
            {paymentMethods.map(method => (
              <Option key={method.value} value={method.value}>
                {method.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="referenceNumber"
          label="Reference Number"
        >
          <Input placeholder="Payment reference (optional)" />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Notes"
        >
          <TextArea 
            placeholder="Additional notes (optional)"
            rows={3}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<CreditCardOutlined />}
            >
              Record Payment
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RecordPaymentModal;