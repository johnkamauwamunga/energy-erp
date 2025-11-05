// src/components/debtor/RecordDebtModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Space,
  Alert,
  InputNumber
} from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { debtorService } from '../../../../../services/debtorService/debtorService';
import { stationService } from '../../../../../services/stationService/stationService';

const { Option } = Select;
const { TextArea } = Input;

const RecordDebtModal = ({ visible, onClose, onSuccess, selectedDebtor }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStations = async () => {
      try {
        const response = await stationService.getCompanyStations();
        setStations(response || []);
      } catch (err) {
        console.error('Failed to load stations:', err);
      }
    };

    if (visible) {
      loadStations();
      
      if (selectedDebtor) {
        form.setFieldsValue({
          debtorPhone: selectedDebtor.phone,
          debtorName: selectedDebtor.name
        });
      } else {
        form.resetFields();
      }
      setError('');
    }
  }, [visible, selectedDebtor, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      const debtData = {
        debtorPhone: values.debtorPhone.trim(),
        debtorName: values.debtorName.trim(),
        stationId: values.stationId,
        shiftId: values.shiftId,
        amount: values.amount,
        vehiclePlate: values.vehiclePlate.trim(),
        vehicleModel: values.vehicleModel?.trim() || null,
        description: values.description?.trim() || `Fuel for ${values.vehiclePlate}`
      };

      await debtorService.recordFuelDebt(debtData);
      onSuccess();
      form.resetFields();
    } catch (err) {
      setError(err.message || 'Failed to record debt');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setError('');
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined />
          {selectedDebtor ? `Record Debt - ${selectedDebtor.name}` : 'Record Fuel Debt'}
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

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {!selectedDebtor && (
          <>
            <Form.Item
              name="debtorPhone"
              label="Debtor Phone"
              rules={[
                { required: true, message: 'Please enter debtor phone' }
              ]}
            >
              <Input placeholder="+254712345678" />
            </Form.Item>

            <Form.Item
              name="debtorName"
              label="Debtor Name"
              rules={[
                { required: true, message: 'Please enter debtor name' }
              ]}
            >
              <Input placeholder="Enter debtor name" />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="stationId"
          label="Station"
          rules={[
            { required: true, message: 'Please select station' }
          ]}
        >
          <Select placeholder="Select station">
            {stations.map(station => (
              <Option key={station.id} value={station.id}>
                {station.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="shiftId"
          label="Shift Reference"
          rules={[
            { required: true, message: 'Please enter shift reference' }
          ]}
        >
          <Input placeholder="Enter shift ID or reference" />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount (KES)"
          rules={[
            { required: true, message: 'Please enter amount' },
            { type: 'number', min: 0.01, message: 'Amount must be greater than 0' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="0.00"
            min={0.01}
            step={0.01}
            precision={2}
          />
        </Form.Item>

        <Form.Item
          name="vehiclePlate"
          label="Vehicle Plate"
          rules={[
            { required: true, message: 'Please enter vehicle plate' }
          ]}
        >
          <Input placeholder="KCA 123A" />
        </Form.Item>

        <Form.Item
          name="vehicleModel"
          label="Vehicle Model"
        >
          <Input placeholder="Toyota Hilux (optional)" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea 
            placeholder="Fuel purchase details (optional)"
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
              icon={<DollarOutlined />}
            >
              Record Debt
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RecordDebtModal;