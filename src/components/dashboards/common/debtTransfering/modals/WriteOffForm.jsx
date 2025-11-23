// src/components/dashboards/common/debtTransfer/modals/WriteOffForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  message,
  Card,
  Alert,
  Typography,
  Divider
} from 'antd';
import {
  FileTextOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const WriteOffForm = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [debtors, setDebtors] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);

  const loadFormData = async () => {
    try {
      // Mock data - replace with API calls
      setDebtors([
        { id: '1', name: 'John Doe', stationDebts: [
          { stationId: '1', currentDebt: 5000 },
          { stationId: '2', currentDebt: 10000 }
        ]},
        { id: '2', name: 'Defaulted Corp', stationDebts: [
          { stationId: '1', currentDebt: 25000 }
        ]}
      ]);

      setStations([
        { id: '1', name: 'Nairobi Station' },
        { id: '2', name: 'Mombasa Station' }
      ]);
    } catch (error) {
      console.error('Failed to load form data:', error);
    }
  };

  useEffect(() => {
    loadFormData();
  }, []);

  const handleDebtorChange = (debtorId) => {
    const debtor = debtors.find(d => d.id === debtorId);
    setSelectedDebtor(debtor);
    setSelectedStation(null);
    form.setFieldValue('stationId', null);
    form.setFieldValue('amount', null);
  };

  const handleStationChange = (stationId) => {
    const station = stations.find(s => s.id === stationId);
    setSelectedStation(station);
    
    // Set max amount based on debt at this station
    const stationDebt = selectedDebtor?.stationDebts?.find(
      sd => sd.stationId === stationId
    );
    if (stationDebt) {
      form.setFieldValue('maxAmount', stationDebt.currentDebt);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const result = await debtTransferService.writeOffDebt({
        debtorId: values.debtorId,
        stationId: values.stationId,
        amount: values.amount,
        writeOffReason: values.writeOffReason,
        description: values.description
      });

      message.success(`Debt write-off processed successfully!`);
      form.resetFields();
      setSelectedDebtor(null);
      setSelectedStation(null);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(`Failed to process write-off: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStationDebt = (stationId) => {
    return selectedDebtor?.stationDebts?.find(sd => sd.stationId === stationId)?.currentDebt || 0;
  };

  return (
    <div className="space-y-4">
      <Alert
        message="Important"
        description="Debt write-offs permanently remove debt from the system. This action should only be performed for unrecoverable debts and requires proper authorization."
        type="warning"
        showIcon
        icon={<ExclamationCircleOutlined />}
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Debtor Selection */}
        <Form.Item
          name="debtorId"
          label="Select Debtor"
          rules={[{ required: true, message: 'Please select a debtor' }]}
        >
          <Select
            placeholder="Choose debtor to write off"
            onChange={handleDebtorChange}
            showSearch
          >
            {debtors.map(debtor => (
              <Option key={debtor.id} value={debtor.id}>
                {debtor.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Station Selection */}
        <Form.Item
          name="stationId"
          label="Select Station"
          rules={[{ required: true, message: 'Please select a station' }]}
        >
          <Select
            placeholder="Choose station"
            onChange={handleStationChange}
            disabled={!selectedDebtor}
          >
            {stations.map(station => {
              const debt = getStationDebt(station.id);
              return (
                <Option key={station.id} value={station.id}>
                  {station.name} (KES {debt.toLocaleString()})
                </Option>
              );
            })}
          </Select>
        </Form.Item>

        {/* Amount */}
        {selectedStation && (
          <Form.Item
            name="amount"
            label="Write-off Amount"
            rules={[
              { required: true, message: 'Please enter amount' },
              { type: 'number', min: 1, message: 'Amount must be positive' }
            ]}
          >
            <InputNumber
              placeholder="Enter amount to write off"
              style={{ width: '100%' }}
              prefix="KES"
              min={1}
              max={getStationDebt(selectedStation.id)}
              formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/KES\s?|(,*)/g, '')}
            />
          </Form.Item>
        )}

        <Divider />

        {/* Write-off Reason */}
        <Form.Item
          name="writeOffReason"
          label="Write-off Reason"
          rules={[{ required: true, message: 'Please select a reason' }]}
        >
          <Select placeholder="Select reason for write-off">
            <Option value="BAD_DEBT">Bad Debt - Unrecoverable</Option>
            <Option value="CUSTOMER_BANKRUPTCY">Customer Bankruptcy</Option>
            <Option value="LEGAL_ISSUES">Legal Issues</Option>
            <Option value="CUSTOMER_DISPUTE">Customer Dispute</Option>
            <Option value="OTHER">Other</Option>
          </Select>
        </Form.Item>

        {/* Description */}
        <Form.Item
          name="description"
          label="Additional Details (Required)"
          rules={[{ required: true, message: 'Please provide details for audit purposes' }]}
        >
          <TextArea
            placeholder="Provide detailed explanation for this write-off..."
            rows={4}
          />
        </Form.Item>

        {/* Authorization Warning */}
        <Card size="small" type="inner">
          <Text type="warning">
            <ExclamationCircleOutlined /> This action requires proper authorization 
            and will be logged for audit purposes.
          </Text>
        </Card>

        {/* Submit */}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<FileTextOutlined />}
            size="large"
            block
            danger
          >
            Process Write-off
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default WriteOffForm;