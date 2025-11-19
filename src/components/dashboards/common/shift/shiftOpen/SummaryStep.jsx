import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Table, 
  Descriptions, 
  Tag, 
  Space, 
  Alert, 
  Row, 
  Col,
  Statistic,
  Divider,
  Button,
  notification,
  Typography,
  Progress,
  Tooltip
} from 'antd';
import { 
  Users, 
  Gauge, 
  Fuel, 
  UserCheck, 
  MapPin,
  CheckCircle,
  AlertTriangle,
  Play,
  FileText,
  Zap,
  Droplets
} from 'lucide-react';
import { shiftService } from '../../../../../services/shiftService/shiftService';

const { Text, Title } = Typography;

const SummaryStep = ({ 
  wizardData,
  onOpenShift,
  onPrevStep,
  loading,
  canOpenShift
}) => {
  const [submissionError, setSubmissionError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log('📋 SummaryStep received wizardData:', wizardData);

  // Memoized data processing to prevent unnecessary recalculations
  const processedData = useMemo(() => {
    const { personnel, readings, shiftInfo } = wizardData;

    // Helper function to safely format numbers
    const formatNumber = (value, decimals = 3) => {
      if (value === null || value === undefined || value === '') return '0.000';
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(numValue) ? '0.000' : numValue.toFixed(decimals);
    };

    const formatCurrency = (value, decimals = 2) => {
      if (value === null || value === undefined || value === '') return '0.00';
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(numValue) ? '0.00' : numValue.toFixed(decimals);
    };

    // Prepare personnel data for table
    const personnelData = [
      // Supervisor
      ...(personnel.supervisorId ? [{
        id: personnel.supervisorId,
        role: 'Supervisor',
        firstName: 'Supervisor',
        lastName: 'User',
        email: 'supervisor@station.com'
      }] : []),
      // Attendants
      ...(personnel.attendants || []).map(attendant => ({
        ...attendant,
        role: 'Attendant'
      }))
    ];

    // Enhanced pump data with readings
    const pumpData = (readings.allPumps || []).map(pump => {
      const reading = readings.pumpReadings?.find(r => r.pumpId === pump.id);
      return {
        ...pump,
        reading: reading || {},
        formattedElectricMeter: formatNumber(reading?.electricMeter),
        formattedManualMeter: formatNumber(reading?.manualMeter),
        formattedCashMeter: formatNumber(reading?.cashMeter),
        formattedUnitPrice: formatCurrency(reading?.unitPrice)
      };
    });

    // Enhanced tank data with readings
    const tankData = (readings.allTanks || []).map(tank => {
      const reading = readings.tankReadings?.find(r => r.tankId === tank.id);
      return {
        ...tank,
        reading: reading || {},
        formattedVolume: formatNumber(reading?.volume),
        formattedCurrentVolume: formatNumber(reading?.currentVolume),
        formattedTemperature: formatNumber(reading?.temperature, 1),
        formattedWaterLevel: formatNumber(reading?.waterLevel, 2),
        formattedDipValue: formatNumber(reading?.dipValue, 2)
      };
    });

    // Calculate totals and statistics
    const totals = {
      pumps: pumpData.length,
      tanks: tankData.length,
      personnel: personnelData.length,
      islandAssignments: personnel.islandAssignments?.length || 0,
      totalVolume: tankData.reduce((sum, tank) => sum + (parseFloat(tank.reading.volume) || 0), 0),
      totalCurrentVolume: tankData.reduce((sum, tank) => sum + (parseFloat(tank.reading.currentVolume) || 0), 0)
    };

    return {
      personnelData,
      pumpData,
      tankData,
      totals,
      formatNumber,
      formatCurrency
    };
  }, [wizardData]);

  const handleStartShift = async () => {
    try {
      setIsSubmitting(true);
      setSubmissionError(null);
      console.log('🎯 Starting shift opening process...');

      // Validate all required data
      if (!canOpenShift) {
        throw new Error('Please complete all steps before starting shift');
      }

      // Prepare the final payload with ALL required data
      const openShiftPayload = {
        shiftId: wizardData.shiftInfo.shiftId,
        recordedById: wizardData.personnel.supervisorId,
        
        // Personnel data
        islandAssignments: wizardData.personnel.islandAssignments.map(assignment => ({
          attendantId: assignment.attendantId,
          islandId: assignment.islandId,
          assignmentType: assignment.assignmentType || 'PRIMARY'
        })),
        
        // Pump readings data - ensure proper data types
        pumpReadings: wizardData.readings.pumpReadings.map(reading => ({
          pumpId: reading.pumpId,
          electricMeter: parseFloat(reading.electricMeter) || 0,
          manualMeter: parseFloat(reading.manualMeter) || 0,
          cashMeter: parseFloat(reading.cashMeter) || 0,
          unitPrice: parseFloat(reading.unitPrice) || 0,
          // Note: readingType is handled by backend based on shift opening
        })),
        
        // Tank readings data - ensure proper data types and include currentVolume
        tankReadings: wizardData.readings.tankReadings.map(reading => ({
          tankId: reading.tankId,
          dipValue: parseFloat(reading.dipValue) || 0,
          volume: parseFloat(reading.volume) || 0,
          currentVolume: parseFloat(reading.currentVolume) || parseFloat(reading.volume) || 0, // CRITICAL
          temperature: parseFloat(reading.temperature) || 25,
          waterLevel: parseFloat(reading.waterLevel) || 0,
          density: parseFloat(reading.density) || 0.8,
          // Note: readingType is handled by backend based on shift opening
        }))
      };

      console.log('📤 Final payload for shift opening:', openShiftPayload);

      // Call the shift opening service
      const result = await onOpenShift(openShiftPayload);
      
      console.log('✅ Shift opened successfully:', result);

      notification.success({
        message: 'Shift Started Successfully',
        description: `Shift ${wizardData.shiftInfo.shiftNumber} is now open and ready for operations.`,
        duration: 4.5,
      });

    } catch (error) {
      console.error('❌ Failed to open shift:', error);
      setSubmissionError(error.message || 'Failed to start shift');
      notification.error({
        message: 'Failed to Start Shift',
        description: error.message || 'Please check all data and try again',
        duration: 6,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const personnelColumns = [
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'Supervisor' ? 'blue' : 'green'} style={{ fontWeight: 'bold' }}>
          {role}
        </Tag>
      )
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <Space>
          <UserCheck size={14} />
          {`${record.firstName} ${record.lastName}`}
        </Space>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Assigned Islands',
      key: 'islands',
      render: (_, record) => {
        if (record.role === 'Supervisor') {
          return <Tag color="blue">All Islands</Tag>;
        }
        
        const assignedIslands = wizardData.personnel.islandAssignments
          .filter(assignment => assignment.attendantId === record.id)
          .map(assignment => {
            const island = wizardData.personnel.topologyIslands?.find(i => i.id === assignment.islandId);
            return island ? island.name : `Island ${assignment.islandId}`;
          });
        
        return (
          <Space wrap>
            {assignedIslands.map((island, index) => (
              <Tag key={index} color="green">
                {island}
              </Tag>
            ))}
            {assignedIslands.length === 0 && (
              <Tag color="orange">No islands assigned</Tag>
            )}
          </Space>
        );
      }
    }
  ];

  const pumpColumns = [
    {
      title: 'Pump',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Zap size={14} color="#faad14" />
          <div>
            <div style={{ fontWeight: 'bold' }}>{text}</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {record.product?.name || 'No Product'}
            </div>
          </div>
        </Space>
      )
    },
    {
      title: 'Electric Meter',
      key: 'electricMeter',
      render: (_, record) => (
        <Text strong>{record.formattedElectricMeter}</Text>
      )
    },
    {
      title: 'Manual Meter',
      key: 'manualMeter',
      render: (_, record) => (
        <Text>{record.formattedManualMeter}</Text>
      )
    },
    {
      title: 'Cash Meter',
      key: 'cashMeter',
      render: (_, record) => (
        <Text>{record.formattedCashMeter}</Text>
      )
    },
    {
      title: 'Unit Price',
      key: 'unitPrice',
      render: (_, record) => (
        <Text type="secondary">{record.formattedUnitPrice}</Text>
      )
    },
    {
      title: 'Source',
      key: 'source',
      render: (_, record) => (
        <Tag color={record.reading.source === 'PREVIOUS_SHIFT' ? 'blue' : 'green'}>
          {record.reading.source || 'MANUAL'}
        </Tag>
      )
    }
  ];

  const tankColumns = [
    {
      title: 'Tank',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Droplets size={14} color="#1890ff" />
          <div>
            <div style={{ fontWeight: 'bold' }}>{text}</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {record.product?.name || 'No Product'}
            </div>
          </div>
        </Space>
      )
    },
    {
      title: 'Volume (L)',
      key: 'volume',
      render: (_, record) => (
        <Text strong>{record.formattedVolume}</Text>
      )
    },
    {
      title: 'Current Volume (L)',
      key: 'currentVolume',
      render: (_, record) => (
        <Text strong>{record.formattedCurrentVolume}</Text>
      )
    },
    {
      title: 'Temperature (°C)',
      key: 'temperature',
      render: (_, record) => (
        <Text>{record.formattedTemperature}</Text>
      )
    },
    {
      title: 'Water Level',
      key: 'waterLevel',
      render: (_, record) => (
        <Text>{record.formattedWaterLevel}</Text>
      )
    },
    {
      title: 'Capacity (L)',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (capacity) => capacity?.toLocaleString() || '0'
    }
  ];

  const { personnelData, pumpData, tankData, totals } = processedData;

  // Calculate completion percentage
  const completionPercentage = canOpenShift ? 100 : Math.round(
    ((personnelData.length > 0 ? 1 : 0) +
     (wizardData.personnel.islandAssignments?.length > 0 ? 1 : 0) +
     (pumpData.length > 0 ? 1 : 0) +
     (tankData.length > 0 ? 1 : 0)) / 4 * 100
  );

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Error Display */}
      {submissionError && (
        <Alert
          message="Failed to Start Shift"
          description={submissionError}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={() => setSubmissionError(null)}
        />
      )}

      {/* Completion Progress */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Text strong>Shift Setup Progress</Text>
            </Col>
            <Col>
              <Text strong>{completionPercentage}%</Text>
            </Col>
          </Row>
          <Progress 
            percent={completionPercentage} 
            status={completionPercentage === 100 ? 'success' : 'active'}
            strokeColor={completionPercentage === 100 ? '#52c41a' : '#1890ff'}
          />
        </Space>
      </Card>

      {/* Summary Header */}
      <Alert
        message={canOpenShift ? "✅ Shift Ready to Start" : "⚠️ Incomplete Configuration"}
        description={
          canOpenShift 
            ? "All required data has been configured. Review the information below before starting the shift."
            : "Please complete all required steps before starting the shift."
        }
        type={canOpenShift ? "success" : "warning"}
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={3}>
          <Card size="small">
            <Statistic
              title="Supervisor"
              value={wizardData.personnel.supervisorId ? 1 : 0}
              prefix={<UserCheck size={16} />}
              valueStyle={{ color: wizardData.personnel.supervisorId ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small">
            <Statistic
              title="Attendants"
              value={wizardData.personnel.attendants?.length || 0}
              prefix={<Users size={16} />}
              valueStyle={{ color: (wizardData.personnel.attendants?.length || 0) > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small">
            <Statistic
              title="Islands"
              value={totals.islandAssignments}
              prefix={<MapPin size={16} />}
              valueStyle={{ color: totals.islandAssignments > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small">
            <Statistic
              title="Pumps"
              value={totals.pumps}
              prefix={<Gauge size={16} />}
              valueStyle={{ color: totals.pumps > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small">
            <Statistic
              title="Tanks"
              value={totals.tanks}
              prefix={<Fuel size={16} />}
              valueStyle={{ color: totals.tanks > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small">
            <Statistic
              title="Total Volume"
              value={totals.totalVolume}
              suffix="L"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small">
            <Statistic
              title="Current Volume"
              value={totals.totalCurrentVolume}
              suffix="L"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small">
            <Statistic
              title="Total Assets"
              value={totals.pumps + totals.tanks}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Shift Information */}
      <Card title={
        <Space>
          <FileText size={16} />
          Shift Information
        </Space>
      } size="small" style={{ marginBottom: 16 }}>
        <Descriptions size="small" column={2} bordered>
          <Descriptions.Item label="Shift ID" span={1}>
            <Tag color="blue">{wizardData.shiftInfo.shiftId}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Shift Number" span={1}>
            <Tag color="green">{wizardData.shiftInfo.shiftNumber || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Station ID" span={1}>
            <Tag>{wizardData.shiftInfo.stationId}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Status" span={1}>
            <Tag color="orange">Pending Start</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Supervisor ID" span={2}>
            <code>{wizardData.personnel.supervisorId || 'Not Set'}</code>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Personnel Summary */}
      <Card 
        title={
          <Space>
            <Users size={16} />
            Personnel Summary
            <Tag>{personnelData.length} people</Tag>
          </Space>
        } 
        size="small" 
        style={{ marginBottom: 16 }}
      >
        <Table
          columns={personnelColumns}
          dataSource={personnelData}
          pagination={false}
          size="small"
          rowKey="id"
          locale={{ emptyText: 'No personnel assigned' }}
        />
      </Card>

      <Row gutter={[16, 16]}>
        {/* Pump Readings Summary */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <Gauge size={16} />
                Pump Meter Readings
                <Tag>{totals.pumps} pumps</Tag>
              </Space>
            } 
            size="small"
          >
            <Table
              columns={pumpColumns}
              dataSource={pumpData}
              pagination={false}
              size="small"
              rowKey="id"
              locale={{ emptyText: 'No pump readings configured' }}
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>

        {/* Tank Readings Summary */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <Fuel size={16} />
                Tank Volume Readings
                <Tag>{totals.tanks} tanks</Tag>
              </Space>
            } 
            size="small"
          >
            <Table
              columns={tankColumns}
              dataSource={tankData}
              pagination={false}
              size="small"
              rowKey="id"
              locale={{ emptyText: 'No tank readings configured' }}
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Data Validation Summary */}
      <Card size="small" style={{ marginTop: 16 }}>
        <Row gutter={[16, 8]}>
          <Col span={8}>
            <Space>
              <CheckCircle size={16} color={wizardData.shiftInfo.shiftId ? '#52c41a' : '#d9d9d9'} />
              <Text>Shift Created</Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <CheckCircle size={16} color={wizardData.personnel.supervisorId ? '#52c41a' : '#d9d9d9'} />
              <Text>Supervisor Assigned</Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <CheckCircle size={16} color={totals.islandAssignments > 0 ? '#52c41a' : '#d9d9d9'} />
              <Text>Island Assignments</Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <CheckCircle size={16} color={totals.pumps > 0 ? '#52c41a' : '#d9d9d9'} />
              <Text>Pump Readings</Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <CheckCircle size={16} color={totals.tanks > 0 ? '#52c41a' : '#d9d9d9'} />
              <Text>Tank Readings</Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <CheckCircle size={16} color={canOpenShift ? '#52c41a' : '#d9d9d9'} />
              <Text strong>Ready to Start</Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Action Buttons */}
      <Divider />
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <Space>
          <Button 
            size="large" 
            onClick={onPrevStep}
            disabled={isSubmitting}
          >
            Back to Readings
          </Button>
          <Button 
            type="primary" 
            size="large"
            icon={<Play size={16} />}
            onClick={handleStartShift}
            loading={isSubmitting}
            disabled={!canOpenShift}
            style={{ minWidth: 140 }}
          >
            {isSubmitting ? 'Starting...' : 'Start Shift'}
          </Button>
        </Space>
      </div>

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <Alert
          message="Debug Information"
          description={
            <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              <div><strong>Shift ID:</strong> {wizardData.shiftInfo.shiftId || 'None'}</div>
              <div><strong>Supervisor:</strong> {wizardData.personnel.supervisorId || 'None'}</div>
              <div><strong>Attendants:</strong> {wizardData.personnel.attendants?.length || 0}</div>
              <div><strong>Island Assignments:</strong> {wizardData.personnel.islandAssignments?.length || 0}</div>
              <div><strong>Pump Readings:</strong> {wizardData.readings.pumpReadings?.length || 0}</div>
              <div><strong>Tank Readings:</strong> {wizardData.readings.tankReadings?.length || 0}</div>
              <div><strong>All Pumps:</strong> {wizardData.readings.allPumps?.length || 0}</div>
              <div><strong>All Tanks:</strong> {wizardData.readings.allTanks?.length || 0}</div>
              <div><strong>Can Open Shift:</strong> {canOpenShift?.toString() || 'false'}</div>
              <div><strong>Payload Sample:</strong> 
                Pump: {wizardData.readings.pumpReadings?.[0]?.pumpId} - 
                Electric: {wizardData.readings.pumpReadings?.[0]?.electricMeter} (type: {typeof wizardData.readings.pumpReadings?.[0]?.electricMeter})
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default SummaryStep;