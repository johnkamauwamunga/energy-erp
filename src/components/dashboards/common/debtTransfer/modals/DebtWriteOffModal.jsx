// src/components/dashboards/common/debtTransfer/components/modals/DebtWriteOffModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  InputNumber,
  Select,
  Alert,
  message,
  Card,
  Descriptions,
  Statistic,
  Row,
  Col,
  Space,
  Tag,
  Table,
  Progress
} from 'antd';
import {
  FileExclamationOutlined,
  CloseOutlined,
  CheckOutlined,
  WarningOutlined,
  ShopOutlined,
  DollarOutlined,
  UserOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { useApp } from '../../../../../context/AppContext';

const { Option } = Select;
const { TextArea } = Input;

const DebtWriteOffModal = ({ visible, onClose, onSuccess, debtor }) => {
  const { state } = useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [debtBreakdown, setDebtBreakdown] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [writeOffAmount, setWriteOffAmount] = useState(0);

  // Load debtor debt breakdown
  const loadDebtBreakdown = async () => {
    if (!debtor?.id) return;
    
    setLoading(true);
    try {
      const breakdown = await debtTransferService.getDebtorDebtBreakdown(
        debtor.id,
        state.companyId
      );
      setDebtBreakdown(breakdown);
    } catch (error) {
      console.error('Failed to load debt breakdown:', error);
      message.error('Failed to load debt information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && debtor) {
      loadDebtBreakdown();
      form.resetFields();
      setSelectedStation(null);
      setWriteOffAmount(0);
    }
  }, [visible, debtor]);

  const handleStationSelect = (stationId) => {
    const station = debtBreakdown?.stationDebts.find(s => s.stationId === stationId);
    setSelectedStation(station);
    
    if (station) {
      setWriteOffAmount(station.currentDebt);
      form.setFieldsValue({
        stationId: stationId,
        amount: station.currentDebt,
        writeOffReason: '',
        description: `Write-off of KES ${station.currentDebt.toLocaleString()} from ${station.stationName}`
      });
    }
  };

  const handleAmountChange = (amount) => {
    setWriteOffAmount(amount || 0);
  };

  const handleSubmit = async (values) => {
    if (!debtor) {
      message.error('No debtor selected');
      return;
    }

    if (!selectedStation) {
      message.error('Please select a station');
      return;
    }

    setSubmitting(true);
    try {
      const writeOffData = {
        debtorId: debtor.id,
        stationId: values.stationId,
        amount: values.amount,
        writeOffReason: values.writeOffReason,
        description: values.description
      };

      const result = await debtTransferService.writeOffDebt(writeOffData);
      
      message.success('Debt written off successfully!');
      onSuccess();
      onClose();
      
    } catch (error) {
      message.error(error.message || 'Failed to write off debt');
    } finally {
      setSubmitting(false);
    }
  };

  const validateAmount = (_, value) => {
    if (!value || value <= 0) {
      return Promise.reject(new Error('Amount must be positive'));
    }
    if (selectedStation && value > selectedStation.currentDebt) {
      return Promise.reject(new Error(`Amount exceeds station debt of KES ${selectedStation.currentDebt.toLocaleString()}`));
    }
    return Promise.resolve();
  };

  const writeOffReasons = [
    'Debtor bankruptcy or insolvency',
    'Debtor cannot be located after reasonable efforts',
    'Statute of limitations has expired',
    'Cost of collection exceeds debt amount',
    'Debtor deceased with no estate',
    'Business closure or cessation of operations',
    'Mutual agreement with debtor',
    'Legal impediment to collection',
    'Debt is too small to justify collection costs',
    'Debtor has moved out of jurisdiction',
    'Other (specify in description)'
  ];

  const getRiskLevel = (debtAmount, ageInDays) => {
    if (ageInDays > 180 || debtAmount > 50000) return 'high';
    if (ageInDays > 90 || debtAmount > 20000) return 'medium';
    return 'low';
  };

  const getRiskColor = (riskLevel) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'green'
    };
    return colors[riskLevel] || 'default';
  };

  const stationColumns = [
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
      dataIndex: 'currentDebt',
      key: 'currentDebt',
      width: 120,
      render: (amount) => (
        <strong style={{ color: '#ff4d4f' }}>
          KES {amount?.toLocaleString()}
        </strong>
      )
    },
    {
      title: 'Age',
      dataIndex: 'oldestTransactionDate',
      key: 'age',
      width: 100,
      render: (date) => {
        const ageInDays = date ? Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24)) : 0;
        return (
          <Tag color={ageInDays > 90 ? 'red' : ageInDays > 60 ? 'orange' : 'blue'}>
            {ageInDays} days
          </Tag>
        );
      }
    },
    {
      title: 'Risk Level',
      key: 'risk',
      width: 100,
      render: (_, record) => {
        const ageInDays = record.oldestTransactionDate ? 
          Math.floor((new Date() - new Date(record.oldestTransactionDate)) / (1000 * 60 * 60 * 24)) : 0;
        const riskLevel = getRiskLevel(record.currentDebt, ageInDays);
        return (
          <Tag color={getRiskColor(riskLevel)}>
            {riskLevel.toUpperCase()}
          </Tag>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          size="small"
          type={selectedStation?.stationId === record.stationId ? 'primary' : 'default'}
          onClick={() => handleStationSelect(record.stationId)}
        >
          {selectedStation?.stationId === record.stationId ? 'Selected' : 'Select'}
        </Button>
      )
    }
  ];

  // Mock data for demonstration
  const mockBreakdown = {
    debtorId: '1',
    debtorName: 'John Doe',
    debtorCode: 'D001',
    totalDebt: 85000,
    hasMultipleStations: true,
    stationDebts: [
      {
        stationId: '1',
        stationName: 'Nairobi Station',
        currentDebt: 35000,
        oldestTransactionDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        transactionCount: 8
      },
      {
        stationId: '2',
        stationName: 'Mombasa Station',
        currentDebt: 30000,
        oldestTransactionDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
        transactionCount: 5
      },
      {
        stationId: '3',
        stationName: 'Kisumu Station',
        currentDebt: 20000,
        oldestTransactionDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        transactionCount: 3
      }
    ]
  };

  const displayData = debtBreakdown || mockBreakdown;

  if (!debtor) {
    return (
      <Modal
        title="Write Off Debt"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
      >
        <Alert
          message="No Debtor Selected"
          description="Please select a debtor before attempting to write off debt."
          type="warning"
          showIcon
        />
      </Modal>
    );
  }

  const totalDebt = displayData.totalDebt;
  const remainingDebt = selectedStation ? totalDebt - writeOffAmount : totalDebt;

  return (
    <Modal
      title={
        <Space>
          <FileExclamationOutlined />
          Write Off Debt
          <Tag color="red">IRREVERSIBLE ACTION</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      style={{ top: 20 }}
    >
      <div className="space-y-4">
        <Alert
          message="Debt Write-Off Warning"
          description="Writing off debt permanently removes it from accounts receivable. This action requires managerial approval and creates a permanent audit trail. This action cannot be undone."
          type="error"
          showIcon
          icon={<WarningOutlined />}
        />

        {/* Debtor Information */}
        <Card size="small" title="Debtor Information">
          <Row gutter={16}>
            <Col span={12}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Debtor Name">
                  <Space>
                    <UserOutlined />
                    <strong>{debtor.name}</strong>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Debtor Code">
                  {debtor.code}
                </Descriptions.Item>
                <Descriptions.Item label="Contact">
                  {debtor.phone || 'N/A'} {debtor.email || ''}
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col span={12}>
              <Row gutter={8}>
                <Col span={12}>
                  <Statistic
                    title="Total Outstanding Debt"
                    value={totalDebt}
                    prefix="KES"
                    valueStyle={{ color: '#ff4d4f' }}
                    formatter={value => value.toLocaleString()}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Stations with Debt"
                    value={displayData.stationDebts?.length || 0}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        <Row gutter={16}>
          <Col span={12}>
            {/* Station Selection */}
            <Card 
              title="Select Debt to Write Off" 
              size="small"
              loading={loading}
            >
              <Table
                columns={stationColumns}
                dataSource={displayData.stationDebts}
                pagination={false}
                size="small"
                rowKey="stationId"
                onRow={(record) => ({
                  onClick: () => handleStationSelect(record.stationId),
                  style: {
                    cursor: 'pointer',
                    backgroundColor: selectedStation?.stationId === record.stationId ? '#fff2f0' : 'white'
                  }
                })}
              />
            </Card>

            {/* Write-Off Impact */}
            {selectedStation && (
              <Card size="small" title="Write-Off Impact" style={{ marginTop: 16 }}>
                <Row gutter={8}>
                  <Col span={12}>
                    <Statistic
                      title="Before Write-Off"
                      value={totalDebt}
                      prefix="KES"
                      valueStyle={{ color: '#ff4d4f' }}
                      formatter={value => value.toLocaleString()}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="After Write-Off"
                      value={remainingDebt}
                      prefix="KES"
                      valueStyle={{ color: remainingDebt > 0 ? '#faad14' : '#52c41a' }}
                      formatter={value => value.toLocaleString()}
                    />
                  </Col>
                </Row>
                <Progress
                  percent={Math.round((writeOffAmount / totalDebt) * 100)}
                  strokeColor="#ff4d4f"
                  format={percent => `${percent}% of total debt`}
                  style={{ marginTop: 8 }}
                />
              </Card>
            )}
          </Col>

          <Col span={12}>
            {/* Write-Off Form */}
            <Card 
              title="Write-Off Details" 
              size="small"
              style={{ height: '100%' }}
            >
              {selectedStation ? (
                <>
                  {/* Selected Station Info */}
                  <Card size="small" type="inner" style={{ marginBottom: 16, borderColor: '#ff4d4f' }}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Selected Station">
                        <Space>
                          <ShopOutlined />
                          <strong>{selectedStation.stationName}</strong>
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="Current Debt">
                        <Tag color="red">
                          KES {selectedStation.currentDebt.toLocaleString()}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Debt Age">
                        {selectedStation.oldestTransactionDate ? 
                          Math.floor((new Date() - new Date(selectedStation.oldestTransactionDate)) / (1000 * 60 * 60 * 24)) + ' days' : 
                          'N/A'
                        }
                      </Descriptions.Item>
                      <Descriptions.Item label="Transaction Records">
                        {selectedStation.transactionCount} entries
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                  >
                    <Form.Item
                      name="stationId"
                      hidden
                    >
                      <Input type="hidden" />
                    </Form.Item>

                    <Form.Item
                      name="amount"
                      label="Write-Off Amount"
                      rules={[
                        { required: true, message: 'Please enter write-off amount' },
                        { validator: validateAmount }
                      ]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        max={selectedStation.currentDebt}
                        placeholder="Enter amount to write off"
                        size="large"
                        onChange={handleAmountChange}
                        formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/KES\s?|(,*)/g, '')}
                      />
                    </Form.Item>

                    <Form.Item
                      name="writeOffReason"
                      label="Write-Off Reason"
                      rules={[
                        { required: true, message: 'Please select a write-off reason' },
                        { min: 5, message: 'Reason must be at least 5 characters' }
                      ]}
                    >
                      <Select
                        placeholder="Select reason for writing off debt"
                        allowClear
                        size="large"
                      >
                        {writeOffReasons.map(reason => (
                          <Option key={reason} value={reason}>
                            {reason}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="description"
                      label="Additional Details & Justification"
                      rules={[
                        { required: true, message: 'Please provide additional details' },
                        { min: 20, message: 'Please provide more detailed justification (minimum 20 characters)' }
                      ]}
                    >
                      <TextArea
                        placeholder="Provide detailed justification for this write-off, including any collection efforts made..."
                        rows={4}
                        maxLength={1000}
                        showCount
                      />
                    </Form.Item>

                    {/* Authorization Notice */}
                    <Alert
                      message="Authorization Required"
                      description={
                        <div>
                          <div><strong>Recorded By:</strong> {state.currentUser?.firstName} {state.currentUser?.lastName}</div>
                          <div><strong>Station:</strong> {state.currentStation?.name}</div>
                          <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                        </div>
                      }
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />

                    {/* Final Warning */}
                    <Alert
                      message="Final Confirmation Required"
                      description="This action will permanently remove the debt from the system and cannot be reversed. Please ensure all collection efforts have been exhausted."
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />

                    <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
                      <Space>
                        <Button
                          type="primary"
                          danger
                          icon={<FileExclamationOutlined />}
                          htmlType="submit"
                          loading={submitting}
                          size="large"
                        >
                          Confirm Write-Off
                        </Button>
                        <Button
                          icon={<CloseOutlined />}
                          onClick={onClose}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 0',
                  color: '#999'
                }}>
                  <FileExclamationOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div>Please select a station debt to write off</div>
                  <div style={{ fontSize: '12px', marginTop: 8 }}>
                    Choose from the list on the left
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Risk Assessment */}
        {selectedStation && (
          <Card size="small" title="Risk Assessment & Compliance">
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', color: '#ff4d4f', marginBottom: 8 }}>
                    <WarningOutlined />
                  </div>
                  <div style={{ fontWeight: 'bold' }}>High Impact</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Permanent debt removal
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', color: '#faad14', marginBottom: 8 }}>
                    <FileExclamationOutlined />
                  </div>
                  <div style={{ fontWeight: 'bold' }}>Audit Trail</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Permanent record created
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', color: '#1890ff', marginBottom: 8 }}>
                    <UserOutlined />
                  </div>
                  <div style={{ fontWeight: 'bold' }}>Manager Approval</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Required for this action
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default DebtWriteOffModal;