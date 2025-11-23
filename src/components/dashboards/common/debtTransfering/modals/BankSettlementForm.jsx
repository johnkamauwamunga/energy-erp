// src/components/dashboards/common/debtTransfer/forms/BankSettlementForm.jsx
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
  Divider
} from 'antd';
import {
  BankOutlined,
  DollarOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { debtorService } from '../../../../../services/debtorService/debtorService';
import {bankService} from '../../../../../services/bankService/bankService';
import {useApp} from '../../../../../context/AppContext'

const { Option } = Select;
const { TextArea } = Input;

const BankSettlementForm = ({ onSuccess, currentShift }) => {
  const [form] = Form.useForm();
  const {state}=useApp();
  const [loading, setLoading] = useState(false);
  const [debtors, setDebtors] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);

  const currentStation= state.currentStation?.id;
  const stationName=state.currentStation?.name;

  useEffect(() => {
   // loadFormData();
    loadDebtors();
    loadAccounts();
  }, []);

//   const loadFormData = async () => {
//     try {
//       // Load actual data from services
//       const [debtorsData, bankAccountsData] = await Promise.all([
//         debtTransferService.searchDebtors({ 
//           stationId: currentStation?.id,
//           includeZeroBalance: false 
//         }),
//         debtTransferService.getBankAccounts()
//       ]);
      
//       setDebtors(debtorsData?.data || []);
//       setBankAccounts(bankAccountsData?.data || []);
//     } catch (error) {
//       console.error('Failed to load form data:', error);
//       message.error('Failed to load form data');
//     }
//   };

  // Load bank accounts
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const result = await bankService.getBankAccounts();
      
      setBankAccounts(result.accounts || result || []);
    
    } catch (error) {
      message.error('Failed to load bank accounts');
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

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
  };

  const handleBankChange = (bankId) => {
    const bank = bankAccounts.find(b => b.id === bankId);
    setSelectedBank(bank);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const settlementData = {
        ...values,
        paymentType: 'BANK',
        shiftId: currentShift?.id, // ✅ REQUIRED
        stationId: currentStation, // ✅ REQUIRED
        // ✅ CORRECT FIELD NAMES:
        paymentReference: values.paymentReference, // not bankReference
        transactionMode: values.transactionMode // ✅ REQUIRED
      };
      
      const result = await debtTransferService.processBankSettlement(settlementData);
      
      message.success(
        `Bank settlement of KES ${values.amount.toLocaleString()} processed successfully! Transfer #: ${result.data?.transferNumber}`
      );
      
      form.resetFields();
      setSelectedDebtor(null);
      setSelectedBank(null);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(`Failed to process bank settlement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const validateAmount = (_, value) => {
    if (value && selectedDebtor && value > selectedDebtor.currentDebt) {
      return Promise.reject('Amount cannot exceed current debt');
    }
    return Promise.resolve();
  };

  return (
    <div className="space-y-4">
      <Alert
        message="Bank Settlement"
        description="Process debt settlements through bank transfers or direct deposits"
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
            {stationName|| 'N/A'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="debtorId"
              label="Select Debtor"
              rules={[{ required: true, message: 'Please select a debtor' }]}
            >
              <Select
                placeholder="Choose debtor"
                onChange={handleDebtorChange}
                showSearch
                optionFilterProp="children"
                loading={!debtors.length}
              >
                {debtors.map(debtor => (
                  <Option key={debtor.id} value={debtor.id}>
                    {debtor.name} (KES {debtor.currentDebt?.toLocaleString()})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {selectedDebtor && (
          <Alert
            message={`Current Debt: KES ${selectedDebtor.currentDebt?.toLocaleString()}`}
            type="info"
            showIcon
          />
        )}

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="bankAccountId"
              label="Bank Account"
              rules={[{ required: true, message: 'Please select bank account' }]}
            >
              <Select
                placeholder="Select bank account"
                onChange={handleBankChange}
                showSearch
                loading={!bankAccounts.length}
              >
                {bankAccounts.map(account => (
                  <Option key={account.id} value={account.id}>
                    <Space direction="vertical" size={0}>
                      <strong>{account.bankName}</strong>
                      <small>{account.accountNumber} • {account.accountName}</small>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {selectedBank && (
          <Card size="small" type="inner">
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Bank">{selectedBank.bankName}</Descriptions.Item>
              <Descriptions.Item label="Account">{selectedBank.accountNumber}</Descriptions.Item>
              <Descriptions.Item label="Account Name">{selectedBank.accountName}</Descriptions.Item>
              <Descriptions.Item label="Current Balance">
                KES {selectedBank.currentBalance?.toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item
              name="transactionMode"
              label="Transaction Mode"
              rules={[{ required: true, message: 'Please select transaction mode' }]}
            >
              <Select placeholder="Select mode">
                <Option value="EFT">Electronic Funds Transfer</Option>
                <Option value="RTGS">RTGS</Option>
                <Option value="MPESA">M-Pesa</Option>
                <Option value="CASH">Cash Deposit</Option>
                <Option value="CHEQUE">Cheque</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="amount"
              label="Settlement Amount"
              rules={[
                { required: true, message: 'Please enter amount' },
                { type: 'number', min: 1, message: 'Amount must be positive' },
                { validator: validateAmount }
              ]}
            >
              <InputNumber
                placeholder="Enter amount"
                style={{ width: '100%' }}
                prefix={<DollarOutlined />}
                min={1}
                max={selectedDebtor?.currentDebt}
                disabled={!selectedDebtor}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="paymentReference"
              label="Payment Reference"
              rules={[{ required: true, message: 'Please enter payment reference' }]}
            >
              <Input
                placeholder="Deposit slip number, transaction ID, etc."
                prefix={<SafetyCertificateOutlined />}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea
                placeholder="Additional notes about this bank settlement"
                rows={3}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<BankOutlined />}
            size="large"
            block
            disabled={!selectedDebtor || !currentStation }
          >
            Process Bank Settlement
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default BankSettlementForm;