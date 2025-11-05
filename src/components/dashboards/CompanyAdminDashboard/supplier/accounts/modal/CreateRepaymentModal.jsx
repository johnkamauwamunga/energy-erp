import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  message,
  Card,
  Descriptions,
  Row,
  Col,
  Statistic,
  Alert
} from 'antd';
import {
  DollarOutlined,
  CreditCardOutlined,
  UserOutlined
} from '@ant-design/icons';
import { supplierAccountService } from '../../../../../../services/supplierAccountService/supplierAccountService';


const { Option } = Select;
const { TextArea } = Input;

const CreateRepaymentModal = ({ visible, onClose, onSuccess, supplier }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [outstandingInvoices, setOutstandingInvoices] = useState([]);

  useEffect(() => {
    if (visible && supplier?.supplierAccount?.id) {
      fetchOutstandingInvoices();
      form.resetFields();
    }
  }, [visible, supplier]);

  const fetchOutstandingInvoices = async () => {
    try {
      const invoices = await supplierAccountService.getOutstandingInvoices(supplier.supplierAccount.id);
      setOutstandingInvoices(invoices);
    } catch (error) {
      console.error('Failed to fetch outstanding invoices:', error);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const paymentData = supplierAccountService.mapFormToSupplierPayment({
        ...values,
        supplierAccountId: supplier.supplierAccount.id
      });

      await supplierAccountService.recordSupplierPayment(paymentData);
      
      message.success('Payment recorded successfully');
      onSuccess();
    } catch (error) {
      message.error(error.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const validatePaymentAmount = (_, value) => {
    const currentBalance = supplier?.supplierAccount?.currentBalance || 0;
    if (value > currentBalance) {
      return Promise.reject(new Error('Payment amount cannot exceed current balance'));
    }
    return Promise.resolve();
  };

  if (!supplier) return null;

  const currentBalance = supplier.supplierAccount?.currentBalance || 0;
  const creditLimit = supplier.supplierAccount?.creditLimit || 0;
  const availableCredit = supplier.supplierAccount?.availableCredit || 0;

  return (
    <Modal
      title="Record Supplier Payment"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      <div className="space-y-4">
        {/* Supplier Summary */}
        <Card size="small">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Supplier">
              <strong>{supplier.name}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Code">
              {supplier.code}
            </Descriptions.Item>
            <Descriptions.Item label="Current Balance">
              <span style={{ 
                color: currentBalance > 0 ? '#cf1322' : 
                       currentBalance < 0 ? '#52c41a' : '#8c8c8c',
                fontWeight: 'bold'
              }}>
                {supplierAccountService.formatCurrency(currentBalance)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Available Credit">
              <span style={{ 
                color: availableCredit < 0 ? '#cf1322' : '#52c41a',
                fontWeight: 'bold'
              }}>
                {availableCredit !== null ? supplierAccountService.formatCurrency(availableCredit) : 'N/A'}
              </span>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Outstanding Invoices Alert */}
        {outstandingInvoices.length > 0 && (
          <Alert
            message={`${outstandingInvoices.length} outstanding invoices`}
            description="Consider allocating this payment to specific invoices after recording."
            type="info"
            showIcon
          />
        )}

        {/* Payment Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            paymentMethod: 'BANK_TRANSFER',
            transactionDate: new Date()
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Payment Amount"
                rules={[
                  { required: true, message: 'Please enter payment amount' },
                  { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
                  { validator: validatePaymentAmount }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter amount"
                  prefix={<DollarOutlined />}
                  min={0.01}
                  max={currentBalance}
                  step={0.01}
                  precision={2}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="paymentMethod"
                label="Payment Method"
                rules={[{ required: true, message: 'Please select payment method' }]}
              >
                <Select placeholder="Select payment method">
                  <Option value="CASH">Cash</Option>
                  <Option value="BANK_TRANSFER">Bank Transfer</Option>
                  <Option value="CHEQUE">Cheque</Option>
                  <Option value="MPESA">M-Pesa</Option>
                  <Option value="OTHER">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="paymentReference"
                label="Payment Reference"
                rules={[{ required: true, message: 'Please enter payment reference' }]}
              >
                <Input 
                  placeholder="e.g., Cheque number, transfer reference"
                  prefix={<CreditCardOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="transactionDate"
                label="Payment Date"
                rules={[{ required: true, message: 'Please select payment date' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="bankAccount"
            label="Bank Account (Optional)"
          >
            <Input placeholder="Bank account used for payment" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            initialValue={`Payment to ${supplier.name}`}
          >
            <TextArea
              rows={3}
              placeholder="Enter payment description"
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes (Optional)"
          >
            <TextArea
              rows={2}
              placeholder="Additional notes"
            />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ marginRight: 8 }}
              className="ant-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ant-btn ant-btn-primary"
              loading={loading}
            >
              Record Payment
            </button>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default CreateRepaymentModal;