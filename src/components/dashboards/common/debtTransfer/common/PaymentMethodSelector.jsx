// src/components/dashboards/common/debtTransfer/components/common/PaymentMethodSelector.jsx
import React, { useState, useEffect } from 'react';
import {
  Select,
  Card,
  List,
  Avatar,
  Tag,
  Space,
  Empty,
  Spin,
  Alert
} from 'antd';
import {
  BankOutlined,
  MobileOutlined,
  CreditCardOutlined,
  CheckOutlined
} from '@ant-design/icons';

import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { useApp } from '../../../../../context/AppContext';

const { Option } = Select;

const PaymentMethodSelector = ({ value, onChange, disabled = false }) => {
  const { state } = useApp();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);

  const loadPaymentMethods = async () => {
    setLoading(true);
    try {
      const methods = await debtTransferService.getPaymentMethods(state.companyId);
      setPaymentMethods(methods.data || []);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    if (value && paymentMethods.length > 0) {
      const method = paymentMethods.find(m => m.id === value);
      setSelectedMethod(method);
    }
  }, [value, paymentMethods]);

  const handleChange = (methodId) => {
    const method = paymentMethods.find(m => m.id === methodId);
    setSelectedMethod(method);
    onChange?.(methodId);
  };

  const getMethodIcon = (category) => {
    const icons = {
      'M-Pesa': <MobileOutlined style={{ color: '#52c41a' }} />,
      'Bank Transfer': <BankOutlined style={{ color: '#1890ff' }} />,
      'Visa': <CreditCardOutlined style={{ color: '#722ed1' }} />,
      'Mastercard': <CreditCardOutlined style={{ color: '#ff4d4f' }} />
    };
    return icons[category] || <BankOutlined />;
  };

  const getMethodDescription = (method) => {
    if (method.totalDebt > 0) {
      return `KES ${method.totalDebt.toLocaleString()} outstanding across ${method.availableStations} stations`;
    }
    return method.description || `Electronic payments via ${method.name}`;
  };

  // Mock data for demonstration
  const mockMethods = [
    {
      id: '1',
      name: 'M-Pesa',
      code: 'MPESA',
      category: 'M-Pesa',
      categoryColor: '#52c41a',
      categoryIcon: 'mobile',
      description: 'Mobile money payments via M-Pesa',
      totalDebt: 0,
      availableStations: 5
    },
    {
      id: '2',
      name: 'Equity Bank',
      code: 'EQUITY',
      category: 'Bank Transfer',
      categoryColor: '#1890ff',
      categoryIcon: 'bank',
      description: 'Bank transfers to Equity Bank account',
      totalDebt: 0,
      availableStations: 3
    },
    {
      id: '3',
      name: 'Visa',
      code: 'VISA',
      category: 'Visa',
      categoryColor: '#722ed1',
      categoryIcon: 'credit-card',
      description: 'Credit card payments via Visa',
      totalDebt: 0,
      availableStations: 2
    }
  ];

  if (loading) {
    return (
      <Card size="small">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
          <div style={{ marginTop: 8 }}>Loading payment methods...</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Quick Select Dropdown */}
      <Select
        value={value}
        onChange={handleChange}
        placeholder="Select payment method..."
        style={{ width: '100%' }}
        disabled={disabled}
        allowClear
      >
        {mockMethods.map(method => (
          <Option key={method.id} value={method.id}>
            <Space>
              {getMethodIcon(method.category)}
              {method.name}
              <Tag color={method.categoryColor} size="small">
                {method.category}
              </Tag>
            </Space>
          </Option>
        ))}
      </Select>

      {/* Selected Method Details */}
      {selectedMethod && (
        <Card size="small" style={{ borderColor: '#1890ff' }}>
          <List.Item>
            <List.Item.Meta
              avatar={
                <Avatar 
                  size="large" 
                  style={{ backgroundColor: selectedMethod.categoryColor }}
                  icon={getMethodIcon(selectedMethod.category)}
                />
              }
              title={
                <Space>
                  <strong>{selectedMethod.name}</strong>
                  <Tag color={selectedMethod.categoryColor}>
                    {selectedMethod.category}
                  </Tag>
                  {selectedMethod.totalDebt === 0 && (
                    <Tag color="green" icon={<CheckOutlined />}>
                      Ready for Payments
                    </Tag>
                  )}
                </Space>
              }
              description={getMethodDescription(selectedMethod)}
            />
          </List.Item>
          
          {selectedMethod.totalDebt > 0 && (
            <Alert
              message="Method Has Outstanding Debt"
              description="This payment method has outstanding debt and cannot receive transfers until settled."
              type="warning"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </Card>
      )}

      {/* All Available Methods */}
      {!value && (
        <Card 
          title="Available Payment Methods" 
          size="small"
          style={{ marginTop: 8 }}
        >
          <List
            dataSource={mockMethods}
            renderItem={method => (
              <List.Item
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: selectedMethod?.id === method.id ? '#e6f7ff' : 'white',
                  padding: '12px'
                }}
                onClick={() => handleChange(method.id)}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      style={{ backgroundColor: method.categoryColor }}
                      icon={getMethodIcon(method.category)}
                    />
                  }
                  title={
                    <Space>
                      {method.name}
                      <Tag color={method.categoryColor} size="small">
                        {method.category}
                      </Tag>
                    </Space>
                  }
                  description={getMethodDescription(method)}
                />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {method.availableStations} stations
                  </div>
                  {method.totalDebt === 0 ? (
                    <Tag color="green">Available</Tag>
                  ) : (
                    <Tag color="orange">Has Debt</Tag>
                  )}
                </div>
              </List.Item>
            )}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No payment methods available"
                />
              )
            }}
          />
        </Card>
      )}

      {/* Help Text */}
      <Alert
        message="Payment Method Usage"
        description="Select a payment method that can receive electronic transfers. Only methods with zero outstanding debt can receive payments."
        type="info"
        showIcon
        style={{ fontSize: '12px' }}
      />
    </div>
  );
};

export default PaymentMethodSelector;