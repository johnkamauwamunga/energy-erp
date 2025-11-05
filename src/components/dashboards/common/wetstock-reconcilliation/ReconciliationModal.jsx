// src/components/shift/ReconciliationModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Steps,
  Button,
  Card,
  Alert,
  Table,
  Tag,
  Statistic,
  Row,
  Col,
  Progress,
  Space,
  message
} from 'antd';
import {
  CalculatorOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { wetStockService } from '../../../services/wetStockService';

const { Step } = Steps;

const ReconciliationModal = ({ shift, visible, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reconciliation, setReconciliation] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (visible && shift) {
      if (shift.reconciliation) {
        setReconciliation(shift.reconciliation);
        setCurrentStep(2); // Jump to summary if reconciliation exists
      } else {
        setReconciliation(null);
        setCurrentStep(0);
      }
    }
  }, [visible, shift]);

  const steps = [
    { title: 'Calculate', description: 'Perform wet stock calculation' },
    { title: 'Review', description: 'Analyze reconciliation results' },
    { title: 'Complete', description: 'Finalize reconciliation' }
  ];

  const handleCalculate = async () => {
    if (!shift) return;
    
    setCalculating(true);
    try {
      const result = await wetStockService.calculateWetStockReconciliation(
        shift.id,
        'current-user-id' // This should come from auth context
      );
      
      setReconciliation(result.data);
      setCurrentStep(1);
      message.success('Reconciliation calculated successfully');
    } catch (error) {
      console.error('Failed to calculate reconciliation:', error);
      message.error(error.message || 'Failed to calculate reconciliation');
    } finally {
      setCalculating(false);
    }
  };

  const handleResolve = async () => {
    if (!reconciliation) return;
    
    setLoading(true);
    try {
      await wetStockService.resolveWetStockReconciliation(
        shift.id,
        'current-user-id',
        'Reconciliation reviewed and resolved'
      );
      
      message.success('Reconciliation resolved successfully');
      setCurrentStep(2);
      onComplete?.();
    } catch (error) {
      message.error('Failed to resolve reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const formatVolume = (liters) => {
    return `${new Intl.NumberFormat('en-US').format(liters || 0)}L`;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'CRITICAL': 'red',
      'WARNING': 'orange',
      'NORMAL': 'green'
    };
    return colors[severity] || 'default';
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <Alert
              message="Wet Stock Reconciliation"
              description="This will calculate the variance between pump dispensed volumes and tank inventory changes for the shift."
              type="info"
              showIcon
            />
            
            <Card title="Shift Information" size="small">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="Shift Number" value={shift.shiftNumber} />
                </Col>
                <Col span={8}>
                  <Statistic title="Station" value={shift.stationName} />
                </Col>
                <Col span={8}>
                  <Statistic title="Supervisor" value={shift.supervisorName} />
                </Col>
              </Row>
            </Card>

            <Card title="Calculation Details" size="small">
              <ul>
                <li>Compare pump meter readings vs tank dip readings</li>
                <li>Account for fuel deliveries during shift</li>
                <li>Calculate temperature corrections</li>
                <li>Identify variances and discrepancies</li>
                <li>Generate comprehensive reconciliation report</li>
              </ul>
            </Card>
          </div>
        );

      case 1:
        if (!reconciliation) return null;
        
        return (
          <div className="space-y-4">
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Pump Dispensed"
                    value={reconciliation.totalPumpDispensed}
                    formatter={value => formatVolume(value)}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Tank Reduction"
                    value={reconciliation.totalTankReduction}
                    formatter={value => formatVolume(value)}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Variance"
                    value={reconciliation.totalVariance}
                    formatter={value => formatVolume(value)}
                    valueStyle={{ 
                      color: Math.abs(reconciliation.totalVariance) < 10 ? '#52c41a' : '#ff4d4f' 
                    }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Variance %"
                    value={reconciliation.variancePercentage}
                    suffix="%"
                    valueStyle={{ 
                      color: Math.abs(reconciliation.variancePercentage) < 1 ? '#52c41a' : 
                             Math.abs(reconciliation.variancePercentage) < 3 ? '#faad14' : '#ff4d4f' 
                    }}
                  />
                </Card>
              </Col>
            </Row>

            <Alert
              message={`Reconciliation Status: ${reconciliation.status}`}
              description={reconciliation.notes}
              type={
                reconciliation.severity === 'CRITICAL' ? 'error' : 
                reconciliation.severity === 'WARNING' ? 'warning' : 'success'
              }
              showIcon
            />

            {reconciliation.tankReconciliations?.length > 0 && (
              <Card title="Tank-Level Reconciliations" size="small">
                <Table
                  dataSource={reconciliation.tankReconciliations}
                  pagination={false}
                  size="small"
                  columns={[
                    { 
                      title: 'Tank', 
                      key: 'tank',
                      render: (_, rec) => rec.tank?.asset?.name || 'Unknown'
                    },
                    { 
                      title: 'Product', 
                      key: 'product',
                      render: (_, rec) => rec.tank?.product?.name || 'Unknown'
                    },
                    { 
                      title: 'Pump Dispensed', 
                      dataIndex: 'totalPumpDispensed',
                      render: value => formatVolume(value)
                    },
                    { 
                      title: 'Tank Reduction', 
                      dataIndex: 'adjustedReduction',
                      render: value => formatVolume(value)
                    },
                    { 
                      title: 'Variance', 
                      dataIndex: 'variance',
                      render: value => formatVolume(Math.abs(value))
                    },
                    { 
                      title: 'Variance %', 
                      dataIndex: 'variancePercentage',
                      render: value => `${value?.toFixed(2)}%`
                    },
                    { 
                      title: 'Status', 
                      dataIndex: 'severity',
                      render: severity => (
                        <Tag color={getSeverityColor(severity)}>
                          {severity}
                        </Tag>
                      )
                    }
                  ]}
                />
              </Card>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Alert
              message="Reconciliation Completed"
              description="The wet stock reconciliation has been successfully completed and recorded."
              type="success"
              showIcon
            />
            
            {reconciliation && (
              <Card title="Final Summary" size="small">
                <Descriptions column={2}>
                  <Descriptions.Item label="Status">
                    <Tag color="green">COMPLETED</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Overall Variance">
                    {formatVolume(reconciliation.totalVariance)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Variance Percentage">
                    {reconciliation.variancePercentage?.toFixed(2)}%
                  </Descriptions.Item>
                  <Descriptions.Item label="Severity">
                    <Tag color={getSeverityColor(reconciliation.severity)}>
                      {reconciliation.severity}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Completed At" span={2}>
                    {new Date(reconciliation.recordedAt).toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title={`Wet Stock Reconciliation - Shift #${shift?.shiftNumber}`}
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        currentStep === 0 && (
          <Button
            key="calculate"
            type="primary"
            icon={<CalculatorOutlined />}
            loading={calculating}
            onClick={handleCalculate}
          >
            Calculate Reconciliation
          </Button>
        ),
        currentStep === 1 && (
          <Button
            key="resolve"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={loading}
            onClick={handleResolve}
          >
            Resolve Reconciliation
          </Button>
        ),
        currentStep === 2 && (
          <Button
            key="complete"
            type="primary"
            onClick={onClose}
          >
            Complete
          </Button>
        )
      ]}
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map(step => (
          <Step key={step.title} title={step.title} description={step.description} />
        ))}
      </Steps>

      {renderStepContent()}
    </Modal>
  );
};

export default ReconciliationModal;