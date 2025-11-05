import React from 'react';
import {
  Card,
  Alert,
  Row,
  Col,
  Tag,
  Descriptions,
  Typography,
  Space,
  Statistic
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const PreClosingValidationStep = ({ currentShift, enhancedShiftOpeningCheck, closingData }) => {
  const getValidationStatus = () => {
    const issues = [];
    const warnings = [];

    if (!currentShift?.meterReadings?.length) {
      issues.push('No opening pump readings');
    }

    if (!currentShift?.dipReadings?.length) {
      issues.push('No opening tank readings');
    }

    const shiftStart = new Date(currentShift?.startTime);
    const now = new Date();
    const shiftDuration = (now - shiftStart) / (1000 * 60 * 60);

    if (shiftDuration < 1) {
      warnings.push('Shift < 1 hour');
    }

    if (shiftDuration > 24) {
      warnings.push('Shift > 24 hours');
    }

    return { issues, warnings, isValid: issues.length === 0 };
  };

  const { issues, warnings, isValid } = getValidationStatus();
  const shiftDuration = currentShift?.startTime ? 
    Math.round((new Date() - new Date(currentShift.startTime)) / (1000 * 60 * 60)) : 0;

  return (
    <div style={{ padding: 16 }}>
      {/* Header Alert */}
      <Alert
        message={isValid ? "Ready to Close Shift" : "Validation Required"}
        description={isValid ? 
          "All opening readings verified. Proceed to close shift." : 
          "Complete opening readings before closing."
        }
        type={isValid ? "success" : "error"}
        showIcon
        icon={isValid ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[12, 12]}>
        {/* Shift Overview */}
        <Col xs={24} sm={12} lg={8}>
          <Card size="small" bodyStyle={{ padding: 12 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Shift #{currentShift?.shiftNumber}</Text>
                <Tag color="green" size="small">OPEN</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Duration:</Text>
                <Text strong>{shiftDuration}h</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Started:</Text>
                <Text style={{ fontSize: 12 }}>
                  {currentShift?.startTime ? new Date(currentShift.startTime).toLocaleTimeString() : 'N/A'}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Opening Readings Stats */}
        <Col xs={12} sm={6} lg={4}>
          <Card size="small" bodyStyle={{ padding: 12, textAlign: 'center' }}>
            <ThunderboltOutlined style={{ fontSize: 16, color: '#1890ff', marginBottom: 4 }} />
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
              {currentShift?.meterReadings?.length || 0}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>Pumps</Text>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4}>
          <Card size="small" bodyStyle={{ padding: 12, textAlign: 'center' }}>
            <DashboardOutlined style={{ fontSize: 16, color: '#52c41a', marginBottom: 4 }} />
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>
              {currentShift?.dipReadings?.length || 0}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>Tanks</Text>
          </Card>
        </Col>

        {/* Cash Float */}
        {enhancedShiftOpeningCheck?.cashFloat && (
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" bodyStyle={{ padding: 12 }}>
              <Space direction="vertical" style={{ width: '100%' }} size={6}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SafetyCertificateOutlined style={{ color: '#faad14' }} />
                  <Text strong>Opening Float</Text>
                </div>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#faad14' }}>
                  KES {enhancedShiftOpeningCheck.cashFloat.toFixed(0)}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {enhancedShiftOpeningCheck.verifiedBy ? `Verified by ${enhancedShiftOpeningCheck.verifiedBy}` : 'Not verified'}
                </Text>
              </Space>
            </Card>
          </Col>
        )}
      </Row>

      {/* Issues & Warnings */}
      {(issues.length > 0 || warnings.length > 0) && (
        <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
          {/* Critical Issues */}
          {issues.length > 0 && (
            <Col xs={24} md={warnings.length > 0 ? 12 : 24}>
              <Card 
                size="small" 
                title={
                  <Space size={4}>
                    <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                    <Text>Critical Issues ({issues.length})</Text>
                  </Space>
                }
                bodyStyle={{ padding: '12px 16px' }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={6}>
                  {issues.map((issue, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: 8,
                      padding: '4px 0'
                    }}>
                      <div style={{
                        width: 6,
                        height: 6,
                        backgroundColor: '#ff4d4f',
                        borderRadius: '50%',
                        marginTop: 6,
                        flexShrink: 0
                      }} />
                      <Text style={{ fontSize: 13 }}>{issue}</Text>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <Col xs={24} md={issues.length > 0 ? 12 : 24}>
              <Card 
                size="small" 
                title={
                  <Space size={4}>
                    <ClockCircleOutlined style={{ color: '#faad14' }} />
                    <Text>Warnings ({warnings.length})</Text>
                  </Space>
                }
                bodyStyle={{ padding: '12px 16px' }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={6}>
                  {warnings.map((warning, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: 8,
                      padding: '4px 0'
                    }}>
                      <div style={{
                        width: 6,
                        height: 6,
                        backgroundColor: '#faad14',
                        borderRadius: '50%',
                        marginTop: 6,
                        flexShrink: 0
                      }} />
                      <Text style={{ fontSize: 13 }}>{warning}</Text>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
          )}
        </Row>
      )}

      {/* Price List Info */}
      {enhancedShiftOpeningCheck?.priceList && (
        <Card size="small" style={{ marginTop: 12 }} bodyStyle={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>Active Price List</Text>
            <Tag color="blue" size="small">
              {enhancedShiftOpeningCheck.priceList.name}
            </Tag>
          </div>
          {enhancedShiftOpeningCheck.priceList.effectiveDate && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              Effective: {new Date(enhancedShiftOpeningCheck.priceList.effectiveDate).toLocaleDateString()}
            </Text>
          )}
        </Card>
      )}

      {/* Validation Status Summary */}
      <Card size="small" style={{ marginTop: 12 }} bodyStyle={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>Validation Status</Text>
          <Tag 
            color={isValid ? 'green' : issues.length > 0 ? 'red' : 'orange'} 
            icon={isValid ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
          >
            {isValid ? 'Passed' : issues.length > 0 ? 'Failed' : 'Warning'}
          </Tag>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: 8,
          fontSize: 12 
        }}>
          <Text type={issues.length > 0 ? 'danger' : 'secondary'}>
            Issues: {issues.length}
          </Text>
          <Text type={warnings.length > 0 ? 'warning' : 'secondary'}>
            Warnings: {warnings.length}
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default PreClosingValidationStep;