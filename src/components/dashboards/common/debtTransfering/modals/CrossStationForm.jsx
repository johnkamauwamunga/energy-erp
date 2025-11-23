// src/components/dashboards/common/debtTransfer/forms/CrossStationForm.jsx
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
  Table,
  Tag,
  Radio,
  Tooltip,
  Divider
} from 'antd';
import {
  SyncOutlined,
  DollarOutlined,
  CalculatorOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';

const { Option } = Select;
const { TextArea } = Input;

const CrossStationForm = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [debtors, setDebtors] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [debtBreakdown, setDebtBreakdown] = useState([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [allocationMethod, setAllocationMethod] = useState('PROPORTIONAL');

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      setDebtors([
        { id: '1', name: 'John Doe' },
        { id: '2', name: 'Jane Smith' },
        { id: '3', name: 'Acme Corporation' }
      ]);
      
      setStations([
        { id: '1', name: 'Nairobi Station' },
        { id: '2', name: 'Mombasa Station' },
        { id: '3', name: 'Kisumu Station' },
        { id: '4', name: 'Eldoret Station' }
      ]);

      // Mock debt breakdown data
      setDebtBreakdown([
        { stationId: '1', stationName: 'Nairobi Station', currentDebt: 5000 },
        { stationId: '2', stationName: 'Mombasa Station', currentDebt: 8000 },
        { stationId: '3', stationName: 'Kisumu Station', currentDebt: 3000 },
        { stationId: '4', stationName: 'Eldoret Station', currentDebt: 4000 }
      ]);
      
      setTotalDebt(20000);
    } catch (error) {
      console.error('Failed to load form data:', error);
    }
  };

  const handleDebtorChange = (debtorId) => {
    const debtor = debtors.find(d => d.id === debtorId);
    setSelectedDebtor(debtor);
  };

  const handleAllocationMethodChange = (method) => {
    setAllocationMethod(method);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const settlementData = {
        ...values,
        paymentType: 'CROSS_STATION',
        allocationMethod: allocationMethod,
        transactionDate: new Date().toISOString(),
        stationAllocations: debtBreakdown.map(station => ({
          stationId: station.stationId,
          allocatedAmount: calculateAllocation(values.amount, station, allocationMethod)
        }))
      };
      
      const result = await debtTransferService.processCrossStationSettlement(settlementData);
      
      message.success(
        `Cross-station settlement of KES ${values.amount.toLocaleString()} processed across ${debtBreakdown.length} stations!`
      );
      
      form.resetFields();
      setSelectedDebtor(null);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(`Failed to process cross-station settlement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateAllocation = (totalAmount, station, method) => {
    if (method === 'EQUAL') {
      return totalAmount / debtBreakdown.length;
    } else if (method === 'PROPORTIONAL') {
      const percentage = station.currentDebt / totalDebt;
      return totalAmount * percentage;
    } else if (method === 'HIGHEST_FIRST') {
      // Simplified: allocate to highest debt first
      const sorted = [...debtBreakdown].sort((a, b) => b.currentDebt - a.currentDebt);
      const stationIndex = sorted.findIndex(s => s.stationId === station.stationId);
      return stationIndex === 0 ? Math.min(totalAmount, station.currentDebt) : 0;
    }
    return 0;
  };

  const validateAmount = (_, value) => {
    if (value && value > totalDebt) {
      return Promise.reject('Amount cannot exceed total debt across all stations');
    }
    return Promise.resolve();
  };

  const allocationColumns = [
    {
      title: 'Station',
      dataIndex: 'stationName',
      key: 'stationName',
    },
    {
      title: 'Current Debt',
      dataIndex: 'currentDebt',
      key: 'currentDebt',
      render: (amount) => `KES ${amount?.toLocaleString() || 0}`
    },
    {
      title: 'Allocated Amount',
      key: 'allocated',
      render: (record) => {
        const amount = form.getFieldValue('amount');
        if (!amount) return '-';
        
        const allocated = calculateAllocation(amount, record, allocationMethod);
        return `KES ${allocated?.toFixed(2) || '0.00'}`;
      }
    }
  ];

  return (
    <div className="space-y-4">
      <Alert
        message="Cross-Station Settlement"
        description="Settle debt across multiple stations from a single payment"
        type="info"
        showIcon
      />

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
              >
                {debtors.map(debtor => (
                  <Option key={debtor.id} value={debtor.id}>
                    {debtor.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {selectedDebtor && (
          <>
            <Card size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Total Debt Across Stations:</strong> KES {totalDebt.toLocaleString()}
                </div>
                <div>
                  <strong>Stations Owed:</strong> {debtBreakdown.length}
                </div>
              </div>
            </Card>

            <Divider />

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Form.Item
                  name="amount"
                  label="Total Settlement Amount"
                  rules={[
                    { required: true, message: 'Please enter amount' },
                    { type: 'number', min: 1, message: 'Amount must be positive' },
                    { validator: validateAmount }
                  ]}
                >
                  <InputNumber
                    placeholder="Enter total amount"
                    style={{ width: '100%' }}
                    prefix={<DollarOutlined />}
                    min={1}
                    max={totalDebt}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Form.Item
                  name="allocationMethod"
                  label="Allocation Method"
                >
                  <Radio.Group 
                    onChange={(e) => handleAllocationMethodChange(e.target.value)}
                    value={allocationMethod}
                  >
                    <Tooltip title="Allocate proportionally based on debt amount">
                      <Radio value="PROPORTIONAL">Proportional</Radio>
                    </Tooltip>
                    <Tooltip title="Allocate equally across all stations">
                      <Radio value="EQUAL">Equal</Radio>
                    </Tooltip>
                    <Tooltip title="Allocate to station with highest debt first">
                      <Radio value="HIGHEST_FIRST">Highest First</Radio>
                    </Tooltip>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Form.Item
                  name="paymentStationId"
                  label="Payment Receiving Station"
                  rules={[{ required: true, message: 'Please select payment station' }]}
                >
                  <Select placeholder="Select station receiving the payment">
                    {stations.map(station => (
                      <Option key={station.id} value={station.id}>
                        {station.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {form.getFieldValue('amount') && (
              <Card 
                size="small" 
                type="inner" 
                title={
                  <Space>
                    <CalculatorOutlined />
                    Station Allocation Breakdown
                  </Space>
                }
              >
                <Table
                  dataSource={debtBreakdown}
                  columns={allocationColumns}
                  pagination={false}
                  size="small"
                  rowKey="stationId"
                />
              </Card>
            )}

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Form.Item
                  name="description"
                  label="Description"
                >
                  <TextArea
                    placeholder="Additional notes about this cross-station settlement"
                    rows={3}
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SyncOutlined />}
            size="large"
            block
            disabled={!selectedDebtor}
          >
            Process Cross-Station Settlement
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CrossStationForm;